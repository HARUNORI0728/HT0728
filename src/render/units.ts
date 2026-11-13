// Map units: the delivered sprites (assets/units/<ID>.png, via render/art.ts) or vector chibi figures, cached per look.
//
// drawUnit() is the single entry point for putting a unit on the map. It asks figureFor(), which uses a
// registered picture for the unit (setUnitImage) when one is loaded, and the vector chibi otherwise. Either way
// the result is rendered once into an offscreen canvas (plus a desaturated copy for units that have acted),
// so a frame only does drawImage calls.
import { CLASSES, WEAPONS } from '../data';
import { UNIT_ART } from '../art-manifest';
import { OUT, RES, T, canvas, shade, type C2D } from './common';
import { idForName } from './who';

/** What drawUnit needs to know about a unit (a logic Unit fits; so does a CharDef plus team). */
export interface UnitLike { id: string; name?: string; cls: string; team: string; hair?: string; boss?: boolean; wps?: string[]; uid?: number }

type Weapon = 'sword' | 'rapier' | 'great' | 'spear' | 'axe' | 'bow' | 'staff' | 'heal' | 'book' | 'claw' | 'dagger' | 'none';
/** Everything that decides how a figure looks. Also the cache key. */
interface Look {
  kind: 'human' | 'wolf';
  weapon: Weapon; skin: string; hair: string; eye: string; cloth: string; pants: string; trim?: string;
  cape?: string; robe?: boolean; dress?: boolean; hat?: string; hood?: string; helm?: 'full' | 'open'; band?: string; tiara?: boolean; circlet?: boolean;
  armor?: boolean; shield?: 'round' | 'kite'; pauldron?: boolean; scarf?: string; quiver?: boolean; collar?: string; gauntlet?: boolean; sleeveless?: boolean; rune?: boolean;
  ears?: boolean; tail?: boolean; long?: boolean; pony?: boolean; spiky?: boolean; patch?: boolean; gem?: boolean; fierce?: boolean;
  bulk?: number; big?: number; mounted?: boolean; horse?: string; boss?: boolean; spearCol?: string; orb?: string;
}

// ---------- looks ----------
/** Features from the art sample (art-samples/hires.html) and data.ts (beast-kin = 獣族). */
const NAMED: Record<string, Partial<Look>> = {
  rudeus: { skin: '#fbdcc0', cloth: '#6b6f7c', eye: '#3f9a5a', robe: true, trim: '#e8c56a', cape: '#4a4e5c', hat: undefined },
  eris: { cloth: '#2a2630', pony: true, fierce: true, trim: '#d2302e', eye: '#c8323a' },
  ruijerd: { skin: '#f0dccc', cloth: '#e6e2d6', long: true, gem: true, fierce: true, band: '#f4f1e6', eye: '#c8323a', spearCol: '#f4f1e6' },
  ghislaine: { skin: '#9a6a4a', cloth: '#4a3a34', ears: true, tail: true, patch: true, fierce: true, eye: '#e0b030' },
  linia: { ears: true, tail: true, eye: '#3f9a5a' },
  pursena: { ears: true, tail: true, eye: '#c8a030' },
  ariel: { long: true },
  perugius: { long: true },
};
/** Base look per sprite key (allied colours; enemies get faction colours on top). */
function baseLook(sp: string): Partial<Look> {
  switch (sp) {
    case 'lancer': return { cloth: '#2f7a8a', band: '#e8c56a' };
    case 'cavalier': return { cloth: '#2f6a9a', helm: 'open' };
    case 'axe': return { cloth: '#6a5a8a', sleeveless: true, bulk: 1.08 };
    case 'archer': return { cloth: '#3f7a4a', hood: '#4f6a3a', quiver: true };
    case 'mage': return { cloth: '#4b4f8f', robe: true, hat: '#4b4f8f', trim: '#e8c56a' };
    case 'healer': return { cloth: '#eef0f6', robe: true, trim: '#5aa7ff', cape: '#b8c8e8' };
    case 'priest': return { cloth: '#f2eee0', robe: true, trim: '#e8c56a', collar: '#e8c56a' };
    case 'armor': return { cloth: '#3d5fa8', armor: true, helm: 'full', shield: 'kite', bulk: 1.15 };
    case 'thief': return { cloth: '#4a4560', scarf: '#8a3a4a', band: '#8a3a4a' };
    case 'shield': return { cloth: '#2f5f8f', shield: 'round', trim: '#e8c56a' };
    case 'merc': return { cloth: '#5a4a3a', pauldron: true, scarf: '#3d6fd6' };
    case 'brute': return { cloth: '#6b5a4a', gauntlet: true, bulk: 1.28, big: 1.06 };
    case 'beast': return { cloth: '#7a5a3a', ears: true, tail: true, collar: '#e8dcc0' };
    case 'fang': return { cloth: '#6a4a3a', ears: true, tail: true, spiky: true, collar: '#e8dcc0', bulk: 1.1 };
    case 'princess': return { cloth: '#f4f0ff', dress: true, trim: '#e8c56a', tiara: true };
    case 'summoner': return { cloth: '#e8e8f4', robe: true, trim: '#e8c56a', collar: '#6a5ab0', circlet: true, rune: true };
    case 'dragon': return { cloth: '#f2f2f6', robe: true, trim: '#9aa4b8', cape: '#d8dce4', big: 1.12, fierce: true };
    default: return { cloth: '#3b5ba5', trim: '#e8c56a' };
  }
}
function weaponOf(u: UnitLike, sp: string): Weapon {
  const c = CLASSES[u.cls];
  const w = u.wps?.map(id => WEAPONS[id]).find(Boolean);
  const t = w?.type ?? (c?.wtypes.includes('fang') ? 'fang' : c?.wtypes[0]);
  switch (t) {
    case 'sword': return sp === 'princess' || sp === 'shield' ? 'rapier' : sp === 'merc' ? 'great' : 'sword';
    case 'lance': return 'spear';
    case 'axe': return 'axe';
    case 'bow': return 'bow';
    case 'anima': return sp === 'summoner' || sp === 'dragon' ? 'none' : 'staff';
    case 'light': case 'dark': return 'book';
    case 'staff': return 'heal';
    case 'fang': return 'claw';
    default: return 'none';
  }
}
const BANDIT_HAIR = ['#3a3030', '#5a3a2a', '#2a2a30', '#7a4a2a', '#4a3a30'];
function lookOf(u: UnitLike): Look {
  const c = CLASSES[u.cls], sp = c?.sprite ?? 'sword';
  if (sp === 'monster') return { kind: 'wolf', weapon: 'none', skin: '#5a3a7a', hair: '#3a2650', eye: '#ffe36a', cloth: '#5a3a7a', pants: '#3a2650', boss: u.boss };
  const L: Look = {
    kind: 'human', weapon: weaponOf(u, sp), skin: '#fbdcc0', hair: u.hair ?? '#5a4a3a', eye: '#3a6fb8', cloth: '#3b5ba5', pants: '#3a3350',
    ...baseLook(sp),
  };
  L.mounted = c?.mtype === 'horse' || sp === 'cavalier';
  if (L.mounted) { L.horse = '#8a5a34'; delete L.hood; }
  if (u.team === 'red') {
    const guard = u.name?.startsWith('私兵の');
    const merc = !guard && u.cls === 'mercenary';
    const n = (u.uid ?? 0) + u.cls.length;
    Object.assign(L, { skin: '#e8b890', eye: '#6a3a2a', fierce: true, hair: BANDIT_HAIR[(Math.abs(n) || 0) % BANDIT_HAIR.length] });
    if (guard) Object.assign(L, { cloth: L.armor ? '#3a4a7a' : '#2c3a66', trim: '#cfd6e6', pants: '#262a40', helm: L.helm ?? 'open', band: undefined, horse: '#5a3a26' });
    else if (merc) Object.assign(L, { cloth: '#4a4a52', scarf: '#c8323a', pauldron: true, trim: undefined, weapon: L.weapon === 'sword' ? 'great' : L.weapon });
    else Object.assign(L, { cloth: L.armor ? '#8a2a2a' : sp === 'axe' ? '#a0442e' : '#b03a32', pants: '#3a2a2a', trim: undefined, hood: L.hood ? '#6a2a24' : undefined });
    if (L.robe && L.hat) L.hat = L.cloth;
  } else if (NAMED[u.id]) Object.assign(L, NAMED[u.id]);
  if (u.boss) L.boss = true;
  return L;
}

// ---------- figure drawing (sample units: a 72px tile, feet at the origin) ----------
function S(c: C2D, fill: string | CanvasGradient, lw = 2.2) { c.fillStyle = fill; c.strokeStyle = OUT; c.lineWidth = lw; }
function grad(c: C2D, a: string, b: string, x0: number, x1: number) { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function vgrad(c: C2D, a: string, b: string, y0: number, y1: number) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function pole(c: C2D, x0: number, y0: number, x1: number, y1: number, col: string, w = 2.6) {
  c.strokeStyle = OUT; c.lineWidth = w + 2.8; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
}
function orb(c: C2D, x: number, y: number, r: number, mid: string, glow: string) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, '#f4ffff'); g.addColorStop(0.5, mid); g.addColorStop(1, shade(mid, -70));
  S(c, g, 2); c.save(); c.shadowColor = glow; c.shadowBlur = 12; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore();
  c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
}

function drawHorse(c: C2D, o: Look) {
  const h = o.horse ?? '#8a5a34';
  const body = grad(c, shade(h, 30), shade(h, -30), -30, 30);
  // far legs
  S(c, shade(h, -35)); for (const lx of [-18, 16]) { c.beginPath(); c.roundRect(lx, -22, 7, 22, 3); c.fill(); c.stroke(); }
  // tail
  S(c, '#3a2a22'); c.beginPath(); c.moveTo(-28, -34); c.quadraticCurveTo(-44, -30, -40, -10); c.quadraticCurveTo(-34, -20, -26, -26); c.closePath(); c.fill(); c.stroke();
  // body
  S(c, body); c.beginPath(); c.ellipse(-2, -30, 30, 13, 0, 0, 7); c.fill(); c.stroke();
  // near legs
  S(c, shade(h, -10)); for (const lx of [-24, 10]) { c.beginPath(); c.roundRect(lx, -24, 8, 24, 3); c.fill(); c.stroke(); }
  S(c, '#2a2026'); for (const lx of [-24, 10, -18, 16]) { c.beginPath(); c.roundRect(lx - 0.5, -4, lx === -18 || lx === 16 ? 8 : 9, 5, 2); c.fill(); }
  // neck and head (facing right)
  S(c, body); c.beginPath(); c.moveTo(16, -38); c.quadraticCurveTo(26, -56, 30, -62); c.lineTo(42, -54); c.quadraticCurveTo(46, -50, 43, -46); c.lineTo(32, -46); c.quadraticCurveTo(30, -36, 24, -26); c.closePath(); c.fill(); c.stroke();
  S(c, shade(h, -5)); c.beginPath(); c.moveTo(29, -60); c.lineTo(30, -70); c.lineTo(35, -61); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#1c1420'; c.beginPath(); c.arc(36, -55, 1.8, 0, 7); c.fill();
  // mane
  S(c, '#3a2a22', 1.8); c.beginPath(); c.moveTo(28, -62); c.quadraticCurveTo(18, -54, 14, -38); c.quadraticCurveTo(20, -46, 26, -50); c.closePath(); c.fill(); c.stroke();
  // saddle cloth
  S(c, grad(c, shade(o.cloth, 20), shade(o.cloth, -30), -14, 10)); c.beginPath(); c.roundRect(-14, -42, 22, 18, 4); c.fill(); c.stroke();
  if (o.trim) { c.strokeStyle = o.trim; c.lineWidth = 2; c.beginPath(); c.moveTo(-13, -28); c.lineTo(7, -28); c.stroke(); }
}

function drawWolf(c: C2D, o: Look) {
  const f = o.cloth;
  S(c, shade(f, -30)); for (const lx of [-16, 12]) { c.beginPath(); c.roundRect(lx, -18, 7, 18, 3); c.fill(); c.stroke(); }
  S(c, grad(c, shade(f, 10), shade(f, -40), -20, 20));
  c.beginPath(); c.moveTo(-26, -30); c.quadraticCurveTo(-40, -44, -36, -22); c.quadraticCurveTo(-32, -28, -24, -24); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(-2, -26, 25, 12, 0, 0, 7); c.fill(); c.stroke();
  // spiky mane
  S(c, shade(f, -20)); c.beginPath(); c.moveTo(-6, -36); for (let i = 0; i < 5; i++) { c.lineTo(-2 + i * 5, -46 - (i % 2) * 5); c.lineTo(1 + i * 5, -36); } c.closePath(); c.fill(); c.stroke();
  S(c, shade(f, -8)); for (const lx of [-20, 8]) { c.beginPath(); c.roundRect(lx, -20, 8, 20, 3); c.fill(); c.stroke(); }
  // head
  S(c, grad(c, shade(f, 18), shade(f, -30), 10, 40)); c.beginPath(); c.moveTo(14, -40); c.quadraticCurveTo(26, -48, 34, -40); c.lineTo(46, -32); c.quadraticCurveTo(46, -26, 40, -25); c.lineTo(26, -24); c.quadraticCurveTo(14, -26, 14, -40); c.closePath(); c.fill(); c.stroke();
  for (const ex of [18, 27]) { c.beginPath(); c.moveTo(ex, -42); c.lineTo(ex + 3, -54); c.lineTo(ex + 7, -43); c.closePath(); c.fill(); c.stroke(); }
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(36, -26); c.lineTo(38, -21); c.lineTo(40, -26); c.closePath(); c.fill();
  c.save(); c.fillStyle = o.eye; c.shadowColor = o.eye; c.shadowBlur = 8; c.beginPath(); c.ellipse(32, -36, 3, 2, -0.3, 0, 7); c.fill(); c.restore();
  c.fillStyle = '#1c1420'; c.beginPath(); c.arc(46, -31, 2, 0, 7); c.fill();
  if (o.boss) crown(c, 24, -54);
}

function crown(c: C2D, x: number, y: number) {
  S(c, '#e8c56a', 1.5); c.beginPath(); c.moveTo(x - 9, y + 10); c.lineTo(x - 9, y); c.lineTo(x - 4, y + 5); c.lineTo(x, y - 2); c.lineTo(x + 4, y + 5); c.lineTo(x + 9, y); c.lineTo(x + 9, y + 10); c.closePath(); c.fill(); c.stroke();
}

function drawHuman(c: C2D, o: Look) {
  const B = o.bulk ?? 1, hx = 17 * B; // right hand x
  const robeDrop = o.robe || o.dress ? 8 : 0;
  // --- behind the body ---
  if (o.cape) { S(c, grad(c, o.cape, shade(o.cape, -35), -16, 16)); c.beginPath(); c.moveTo(-13 * B, -34); c.quadraticCurveTo(-22 * B, -14, -18 * B, -2); c.lineTo(18 * B, -2); c.quadraticCurveTo(22 * B, -14, 13 * B, -34); c.closePath(); c.fill(); c.stroke(); }
  if (o.tail) { S(c, grad(c, shade(o.hair, 10), shade(o.hair, -35), -30, -10)); c.beginPath(); c.moveTo(-10, -14); c.quadraticCurveTo(-30, -14, -30, -32); c.quadraticCurveTo(-29, -42, -24, -40); c.quadraticCurveTo(-24, -24, -8, -20); c.closePath(); c.fill(); c.stroke(); c.fillStyle = shade(o.hair, 40); c.beginPath(); c.ellipse(-27, -36, 3, 4, 0.3, 0, 7); c.fill(); }
  if (o.quiver) { S(c, grad(c, '#8a5a30', '#5a3820', -18, -6)); c.save(); c.translate(-12, -30); c.rotate(-0.35); c.beginPath(); c.roundRect(-4, -14, 9, 24, 3); c.fill(); c.stroke(); c.strokeStyle = '#f1e9d2'; c.lineWidth = 1.5; for (const ax of [-2, 1, 4]) { c.beginPath(); c.moveTo(ax, -14); c.lineTo(ax, -20); c.stroke(); } c.restore(); }
  if (o.long) { S(c, grad(c, o.hair, shade(o.hair, -30), -18, 18)); c.beginPath(); c.moveTo(-17, -48); c.quadraticCurveTo(-24, -24, -16, -10); c.lineTo(16, -10); c.quadraticCurveTo(24, -24, 17, -48); c.closePath(); c.fill(); c.stroke(); }
  if (o.pony) { S(c, grad(c, o.hair, shade(o.hair, -30), 8, 30)); c.beginPath(); c.moveTo(10, -56); c.quadraticCurveTo(34, -58, 30, -30); c.quadraticCurveTo(28, -18, 20, -14); c.quadraticCurveTo(24, -34, 8, -46); c.closePath(); c.fill(); c.stroke(); }
  // --- weapons held behind ---
  if (o.weapon === 'spear') {
    pole(c, hx + 2, 0, hx + 2, -66, o.spearCol ?? '#a87a4a', 2.4);
    S(c, vgrad(c, '#ffffff', '#a8b4c8', -84, -66)); c.beginPath(); c.moveTo(hx + 2, -84); c.lineTo(hx + 8, -66); c.lineTo(hx - 4, -66); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(hx - 6, -76); c.lineTo(hx - 3, -64); c.moveTo(hx + 10, -76); c.lineTo(hx + 7, -64); c.stroke();
  }
  if (o.weapon === 'staff') { pole(c, hx + 3, 0, hx + 3, -58, '#8a5a30'); orb(c, hx + 3, -66, 8, '#4fd0d8', '#7ff'); }
  if (o.weapon === 'heal') { pole(c, hx + 3, 0, hx + 3, -56, '#e8dcc0'); S(c, '#e8c56a', 2); c.beginPath(); c.arc(hx + 3, -64, 8, 0, 7); c.stroke(); c.strokeStyle = OUT; orb(c, hx + 3, -64, 5.5, '#8fe0a0', '#bfffc8'); }
  // --- legs / skirt ---
  if (!o.mounted) {
    if (o.robe || o.dress) {
      S(c, '#4a3222'); for (const lx of [-9, 1]) { c.beginPath(); c.roundRect(lx, -5, 9, 6, 3); c.fill(); c.stroke(); }
    } else {
      S(c, o.armor ? grad(c, '#c8d0dc', '#6f7a8c', -10, 10) : o.pants);
      for (const lx of [-9 * B, 1 * B]) { c.beginPath(); c.roundRect(lx, -14, 8 * B, 13, 3); c.fill(); c.stroke(); }
      S(c, o.armor ? '#5a6272' : '#4a3222'); for (const lx of [-10 * B, 1 * B]) { c.beginPath(); c.roundRect(lx, -5, 9 * B, 6, 3); c.fill(); c.stroke(); }
    }
  }
  // --- body ---
  const bodyFill = o.armor ? grad(c, '#dfe5ee', '#6f7a8c', -13 * B, 13 * B) : grad(c, shade(o.cloth, 18), shade(o.cloth, -28), -13 * B, 13 * B);
  S(c, bodyFill);
  const hem = -10 + robeDrop;
  c.beginPath(); c.moveTo(-11 * B, -33);
  if (o.dress) { c.quadraticCurveTo(-13, -22, -19, hem + 1); c.quadraticCurveTo(0, hem + 5, 19, hem + 1); c.quadraticCurveTo(13, -22, 11 * B, -33); }
  else { c.quadraticCurveTo(-15 * B, -20, -13 * B, hem); c.lineTo(13 * B, hem); c.quadraticCurveTo(15 * B, -20, 11 * B, -33); }
  c.quadraticCurveTo(0, -37, -11 * B, -33); c.closePath(); c.fill(); c.stroke();
  if (o.armor) { // tabard in team colour over the plate
    S(c, grad(c, shade(o.cloth, 20), shade(o.cloth, -25), -7, 7)); c.beginPath(); c.moveTo(-7, -30); c.lineTo(7, -30); c.lineTo(6, hem + 1); c.lineTo(0, hem + 4); c.lineTo(-6, hem + 1); c.closePath(); c.fill(); c.stroke();
    S(c, '#e8c56a', 1.5); c.beginPath(); c.arc(0, -22, 2.6, 0, 7); c.fill(); c.stroke();
  } else if (o.trim) {
    c.strokeStyle = o.trim; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -34); c.lineTo(0, hem); c.stroke(); c.beginPath(); c.moveTo(-12 * B, -17); c.lineTo(12 * B, -17); c.stroke();
    if (o.dress) { c.beginPath(); c.moveTo(-17, hem - 1); c.quadraticCurveTo(0, hem + 3, 17, hem - 1); c.stroke(); }
  } else {
    c.strokeStyle = '#4a3222'; c.lineWidth = 3; c.beginPath(); c.moveTo(-13 * B, -17); c.lineTo(13 * B, -17); c.stroke();
    S(c, '#e8c56a'); c.beginPath(); c.rect(-3, -20, 6, 6); c.fill(); c.stroke();
  }
  if (o.weapon === 'heal' && o.robe) { c.strokeStyle = o.trim ?? '#5aa7ff'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-7, -27); c.lineTo(-7, -19); c.moveTo(-10.5, -23); c.lineTo(-3.5, -23); c.stroke(); }
  if (o.collar) { S(c, o.collar, 2); c.beginPath(); c.moveTo(-12, -34); c.quadraticCurveTo(0, -26, 12, -34); c.quadraticCurveTo(0, -38, -12, -34); c.closePath(); c.fill(); c.stroke(); }
  if (o.scarf) { S(c, grad(c, shade(o.scarf, 20), shade(o.scarf, -25), -12, 12), 2); c.beginPath(); c.moveTo(-11, -35); c.quadraticCurveTo(0, -29, 11, -35); c.lineTo(10, -30); c.quadraticCurveTo(0, -25, -10, -30); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-8, -30); c.quadraticCurveTo(-14, -22, -11, -16); c.lineTo(-6, -18); c.quadraticCurveTo(-7, -24, -4, -29); c.closePath(); c.fill(); c.stroke(); }
  // --- arms ---
  const armFill = o.armor || o.gauntlet ? grad(c, '#dfe5ee', '#6f7a8c', -18 * B, -8 * B) : o.sleeveless ? grad(c, shade(o.skin, 6), shade(o.skin, -26), -18 * B, -8 * B) : grad(c, shade(o.cloth, 10), shade(o.cloth, -30), -18 * B, -8 * B);
  S(c, armFill); c.beginPath(); c.roundRect(-18 * B, -32, 8 * B, 15, 4); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(11 * B, -32, 8 * B, 15, 4); c.fill(); c.stroke();
  if (o.pauldron) { S(c, grad(c, '#e8eef6', '#7d8798', -20, -6)); c.beginPath(); c.ellipse(-14 * B, -31, 7, 5, -0.3, 0, 7); c.fill(); c.stroke(); }
  if (o.armor) { S(c, grad(c, '#e8eef6', '#7d8798', -20, 20)); for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 14 * B, -31, 7, 5, sx * 0.3, 0, 7); c.fill(); c.stroke(); } }
  const handR = o.gauntlet ? 5.6 : 4.2;
  S(c, o.gauntlet || o.armor ? '#a8b2c2' : o.weapon === 'claw' ? shade(o.skin, -6) : o.skin);
  c.beginPath(); c.arc(-14 * B, -16, handR, 0, 7); c.fill(); c.stroke();
  const rhx = o.weapon === 'sword' || o.weapon === 'rapier' || o.weapon === 'dagger' || o.weapon === 'great' ? hx : hx + 2;
  c.beginPath(); c.arc(rhx, -17, handR, 0, 7); c.fill(); c.stroke();
  // --- front weapons ---
  if (o.weapon === 'sword' || o.weapon === 'rapier' || o.weapon === 'dagger' || o.weapon === 'great') {
    const len = o.weapon === 'dagger' ? 18 : o.weapon === 'great' ? 46 : 38, wd = o.weapon === 'rapier' ? 1.8 : o.weapon === 'great' ? 4.6 : 3;
    c.save(); c.translate(hx, -17); c.rotate(o.weapon === 'great' ? 0.32 : 0.5); S(c, grad(c, '#ffffff', '#9fb0c8', -wd, wd));
    c.beginPath(); c.moveTo(-wd, -4); c.lineTo(-wd, -len); c.lineTo(0, -len - 8); c.lineTo(wd, -len); c.lineTo(wd, -4); c.closePath(); c.fill(); c.stroke();
    S(c, '#e8c56a'); if (o.weapon === 'rapier') { c.beginPath(); c.arc(0, -4, 5, Math.PI, 0); c.stroke(); } c.beginPath(); c.roundRect(-8, -6, 16, 4, 2); c.fill(); c.stroke();
    S(c, '#6b4426'); c.beginPath(); c.roundRect(-2, -2, 4, 9, 2); c.fill(); c.stroke(); c.restore();
  }
  if (o.weapon === 'axe') { c.save(); c.translate(hx + 1, -17); c.rotate(0.25); pole(c, 0, 8, 0, -40, '#8a5a30'); S(c, grad(c, '#e8eef6', '#8d97a8', 0, 16)); c.beginPath(); c.moveTo(1, -42); c.quadraticCurveTo(20, -46, 18, -24); c.quadraticCurveTo(10, -30, 1, -28); c.closePath(); c.fill(); c.stroke(); c.restore(); }
  if (o.weapon === 'bow') { c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(hx + 1, -46); c.quadraticCurveTo(hx + 17, -18, hx + 1, 8); c.stroke(); c.strokeStyle = '#a87040'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(hx + 1, -46); c.quadraticCurveTo(hx + 17, -18, hx + 1, 8); c.stroke(); c.strokeStyle = '#f1e9d2'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(hx + 1, -46); c.lineTo(hx + 1, 8); c.stroke(); }
  if (o.weapon === 'book') {
    c.save(); c.translate(-15, -19); c.rotate(-0.2);
    S(c, grad(c, '#7a2a3a', '#4a1a26', -8, 8)); c.beginPath(); c.roundRect(-8, -7, 16, 12, 2); c.fill(); c.stroke();
    c.fillStyle = '#f4ecd8'; c.fillRect(-6.5, -8.5, 13, 3); S(c, '#e8c56a', 1.2); c.beginPath(); c.arc(0, -1, 2.4, 0, 7); c.fill(); c.stroke(); c.restore();
    c.save(); c.fillStyle = 'rgba(255,240,170,.9)'; c.shadowColor = '#ffe36a'; c.shadowBlur = 12; c.beginPath(); c.arc(hx + 4, -26, 4, 0, 7); c.fill(); c.restore();
  }
  if (o.weapon === 'claw') { c.strokeStyle = '#f4f1e6'; c.lineWidth = 2; for (const [x0, s] of [[-14 * B, -1], [rhx, 1]] as [number, number][]) for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x0 + i * 2.6, -20); c.lineTo(x0 + i * 3.4 + s * 2, -27); c.stroke(); } }
  if (o.rune) { // summoner: magic circle floating over the open hand
    c.save(); c.translate(hx + 8, -30); c.shadowColor = '#b7a6ff'; c.shadowBlur = 10; c.strokeStyle = '#d9d0ff'; c.lineWidth = 1.8;
    c.beginPath(); c.ellipse(0, 0, 11, 11, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(0, 0, 6.5, 6.5, 0, 0, 7); c.stroke();
    c.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; c.moveTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5); c.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); } c.stroke(); c.restore();
  }
  if (o.shield === 'round') { S(c, grad(c, shade(o.cloth, 30), shade(o.cloth, -25), -26, -6)); c.beginPath(); c.arc(-15 * B, -20, 10, 0, 7); c.fill(); c.stroke(); S(c, '#e8c56a', 1.6); c.beginPath(); c.arc(-15 * B, -20, 3.4, 0, 7); c.fill(); c.stroke(); c.strokeStyle = 'rgba(232,197,106,.8)'; c.lineWidth = 1.6; c.beginPath(); c.arc(-15 * B, -20, 7.5, 0, 7); c.stroke(); }
  if (o.shield === 'kite') { const sx = -16 * B; S(c, grad(c, shade(o.cloth, 30), shade(o.cloth, -30), sx - 10, sx + 10)); c.beginPath(); c.moveTo(sx - 10, -32); c.lineTo(sx + 10, -32); c.lineTo(sx + 9, -16); c.quadraticCurveTo(sx + 4, -6, sx, -2); c.quadraticCurveTo(sx - 4, -6, sx - 9, -16); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#e8c56a'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx, -30); c.lineTo(sx, -6); c.moveTo(sx - 8, -24); c.lineTo(sx + 8, -24); c.stroke(); }
  // --- head ---
  const hg = c.createRadialGradient(-5, -52, 2, 0, -47, 18); hg.addColorStop(0, shade(o.skin, 14)); hg.addColorStop(1, shade(o.skin, -16)); S(c, hg);
  c.beginPath(); c.ellipse(0, -47, 16.5, 15.5, 0, 0, 7); c.fill(); c.stroke();
  const earsUp = o.ears && o.helm !== 'full' && !o.hood;
  if (earsUp) { for (const sx of [-1, 1]) { S(c, o.hair); c.beginPath(); c.moveTo(sx * 6, -60); c.lineTo(sx * 15, -74); c.lineTo(sx * 17, -56); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#f4b6b6'; c.beginPath(); c.moveTo(sx * 9, -61); c.lineTo(sx * 14, -69); c.lineTo(sx * 15, -59); c.closePath(); c.fill(); } }
  if (o.helm !== 'full') {
    for (const ex of [-6.5, 6.5]) {
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, -45, 3.8, 5, 0, 0, 7); c.fill();
      c.fillStyle = o.eye; c.beginPath(); c.ellipse(ex, -44.4, 3, 4.3, 0, 0, 7); c.fill(); c.fillStyle = '#1c1420'; c.beginPath(); c.ellipse(ex, -44, 1.6, 2.6, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex - 1, -46.4, 1.2, 0, 7); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath(); c.moveTo(ex - 4.2, -48.6 + (o.fierce ? (ex < 0 ? -1.4 : 1.4) : 0)); c.quadraticCurveTo(ex, -51, ex + 4.2, -48.6 + (o.fierce ? (ex < 0 ? 1.4 : -1.4) : 0)); c.stroke();
    }
    c.fillStyle = 'rgba(255,120,130,.4)'; for (const ex of [-11, 11]) { c.beginPath(); c.ellipse(ex, -40, 3, 1.8, 0, 0, 7); c.fill(); }
    c.strokeStyle = '#8a4250'; c.lineWidth = 1.5; c.beginPath(); if (o.fierce) { c.moveTo(-3, -37.5); c.lineTo(3, -37.5); } else { c.moveTo(-3, -38); c.quadraticCurveTo(0, -35.5, 3, -38); } c.stroke();
    if (o.patch) { c.fillStyle = '#1c1420'; c.beginPath(); c.ellipse(6.5, -45, 4.6, 5.4, 0, 0, 7); c.fill(); c.strokeStyle = '#1c1420'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-15, -52); c.lineTo(16, -48); c.stroke(); }
    if (o.gem) { S(c, '#e03a3a', 1.2); c.beginPath(); c.arc(0, -55, 2.4, 0, 7); c.fill(); c.stroke(); }
  }
  // --- hair and headwear ---
  if (o.helm === 'full') {
    S(c, grad(c, '#dfe5ee', '#6f7a8c', -17, 17)); c.beginPath(); c.moveTo(-17.5, -40); c.quadraticCurveTo(-20, -67, 0, -67); c.quadraticCurveTo(20, -67, 17.5, -40); c.quadraticCurveTo(0, -33, -17.5, -40); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#1c1420'; c.beginPath(); c.roundRect(-11, -49, 22, 4.5, 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, -61); c.quadraticCurveTo(-2, -64, 6, -62); c.stroke();
    S(c, o.cloth, 1.8); c.beginPath(); c.moveTo(0, -67); c.quadraticCurveTo(-6, -76, -14, -74); c.quadraticCurveTo(-6, -70, -2, -64); c.closePath(); c.fill(); c.stroke();
  } else if (o.hood) {
    S(c, grad(c, shade(o.hood, 20), shade(o.hood, -25), -18, 18)); c.beginPath(); c.moveTo(-18, -38); c.quadraticCurveTo(-22, -68, 0, -68); c.quadraticCurveTo(22, -68, 18, -38); c.quadraticCurveTo(15, -52, 8, -56); c.quadraticCurveTo(0, -52, -8, -56); c.quadraticCurveTo(-15, -52, -18, -38); c.closePath(); c.fill(); c.stroke();
    S(c, grad(c, shade(o.hair, 20), shade(o.hair, -18), -10, 10), 1.6); c.beginPath(); c.moveTo(-8, -56); c.quadraticCurveTo(0, -52, 8, -56); c.lineTo(4, -50); c.lineTo(0, -54); c.lineTo(-4, -50); c.closePath(); c.fill(); c.stroke();
  } else {
    const g = c.createLinearGradient(0, -66, 0, -44); g.addColorStop(0, shade(o.hair, 28)); g.addColorStop(1, shade(o.hair, -18)); S(c, g);
    c.beginPath(); c.moveTo(-17, -44); c.quadraticCurveTo(-20, -66, 0, -65); c.quadraticCurveTo(20, -66, 17, -44);
    c.quadraticCurveTo(15, -52, 10, -55); c.lineTo(7, -49); c.lineTo(3, -56); c.lineTo(-1, -49.5); c.lineTo(-5, -56); c.lineTo(-9, -50); c.quadraticCurveTo(-14, -52, -17, -44); c.closePath(); c.fill(); c.stroke();
    if (o.spiky) { c.beginPath(); c.moveTo(-14, -60); c.lineTo(-22, -64); c.lineTo(-12, -66); c.lineTo(-10, -74); c.lineTo(-2, -66); c.lineTo(4, -75); c.lineTo(8, -65); c.lineTo(18, -68); c.lineTo(14, -58); c.closePath(); c.fill(); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, -61); c.quadraticCurveTo(-2, -64, 6, -62); c.stroke();
    if (o.helm === 'open') { S(c, grad(c, '#dfe5ee', '#6f7a8c', -16, 16)); c.beginPath(); c.moveTo(-17, -50); c.quadraticCurveTo(-19, -68, 0, -68); c.quadraticCurveTo(19, -68, 17, -50); c.lineTo(11, -54); c.lineTo(-11, -54); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, -63); c.quadraticCurveTo(-1, -66, 6, -64); c.stroke(); }
  }
  if (o.hat) { S(c, grad(c, shade(o.hat, 15), shade(o.hat, -30), -22, 22)); c.beginPath(); c.ellipse(0, -57, 25, 6.5, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-13, -58); c.quadraticCurveTo(-4, -80, 10, -88); c.quadraticCurveTo(8, -70, 13, -58); c.closePath(); c.fill(); c.stroke(); if (o.trim) { c.strokeStyle = o.trim; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-12, -60); c.quadraticCurveTo(0, -63, 12, -60); c.stroke(); } }
  if (o.band) { c.strokeStyle = o.band; c.lineWidth = 4; c.beginPath(); c.moveTo(-16, -55); c.quadraticCurveTo(0, -60, 16, -55); c.stroke(); }
  if (o.tiara || o.circlet) { S(c, '#e8c56a', 1.4); c.beginPath(); c.moveTo(-10, -59); c.quadraticCurveTo(0, -62, 10, -59); c.lineTo(8, -61.5); c.lineTo(4, -60); c.lineTo(0, -67); c.lineTo(-4, -60); c.lineTo(-8, -61.5); c.closePath(); c.fill(); c.stroke(); c.fillStyle = o.tiara ? '#5aa7ff' : '#b06ad0'; c.beginPath(); c.arc(0, -62, 1.8, 0, 7); c.fill(); }
  if (o.boss) crown(c, 0, o.hat ? -100 : o.helm === 'full' ? -86 : -82);
}

function drawFigure(c: C2D, o: Look) {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  if (o.big) c.scale(o.big, o.big);
  if (o.kind === 'wolf') drawWolf(c, o);
  else {
    if (o.mounted) { drawHorse(c, o); c.translate(-4, -26); c.scale(0.92, 0.92); }
    drawHuman(c, o);
  }
  c.restore();
}

// ---------- cache & images ----------
/** Pictures registered for a unit key (see imageKey); render/art.ts loads assets/units/<key> into here. */
const unitImages = new Map<string, HTMLImageElement>();
export function setUnitImage(key: string, img: HTMLImageElement) { unitImages.set(key, img); figCache.clear(); }
/**
 * File key for a unit's picture: the cast id for allies, the character id for named enemies (bosses, by name),
 * enemy_<faction>_<role> for generic enemies.
 */
export function imageKey(u: UnitLike) {
  if (u.team !== 'red' || !CLASSES[u.id]) return u.id;
  if (u.boss) { const id = idForName(u.name); if (id && UNIT_ART[id]) return id; }
  const role: Record<string, string> = { soldier: 'soldier', fighter: 'fighter', archer: 'archer', knight: 'knight', myrmidon: 'sword', cavalier: 'cavalier', mage: 'mage', healer: 'healer', mercenary: 'mercenary' };
  if (u.cls === 'mercenary' && !u.name?.startsWith('私兵の')) return 'enemy_mercenary';
  return `enemy_${u.name?.startsWith('私兵の') ? 'guard' : 'bandit'}_${role[u.cls] ?? u.cls}`;
}

/** Figure canvases are FW×FH with the feet at (FAX, FAY). */
const FW = Math.ceil(T * 1.8), FH = Math.ceil(T * 1.95), FAX = FW / 2, FAY = Math.ceil(T * 1.65);
/** Sample units → pixels (the sample used 72px tiles). */
const K = T / 72;
/**
 * Map sprites (square, feet at SPRITE_FEET of the height, head top near SPRITE_TOP) are drawn SPRITE_SIZE wide:
 * the figure is about 1.26 tiles tall, so the head reaches into the tile above.
 * Figure canvases are RES times the map size (drawn back at map size, i.e. 1:1 on the main canvas).
 */
const SPRITE_SIZE = Math.round(T * 1.4), SPRITE_FEET = 974 / 1024, SPRITE_TOP = 54 / 1024;
const figCache = new Map<string, HTMLCanvasElement>();

/** Shrinks a picture in halving steps (smooth, no shimmer on thin outlines), returning a canvas of w×h. */
export function shrinkImage(img: CanvasImageSource & { width: number; height: number }, w: number, h: number): HTMLCanvasElement {
  let src: CanvasImageSource = img, sw = (img as HTMLImageElement).naturalWidth || img.width, sh = (img as HTMLImageElement).naturalHeight || img.height;
  while (sw >= w * 2 && sh >= h * 2) {
    const nw = Math.round(sw / 2), nh = Math.round(sh / 2), step = canvas(nw, nh), c = step.getContext('2d')!;
    c.imageSmoothingQuality = 'high'; c.drawImage(src, 0, 0, sw, sh, 0, 0, nw, nh);
    src = step; sw = nw; sh = nh;
  }
  const out = canvas(w, h), c = out.getContext('2d')!;
  c.imageSmoothingQuality = 'high'; c.drawImage(src, 0, 0, sw, sh, 0, 0, w, h);
  return out;
}

const GRAY = 'saturate(18%) brightness(78%)';
let canFilter: boolean | null = null;
function desaturate(src: HTMLCanvasElement) {
  const out = canvas(src.width, src.height), c = out.getContext('2d')!;
  // ctx.filter where supported (pictures loaded from file:// taint the canvas, so pixel access may be refused).
  if (canFilter === null) { c.filter = GRAY; canFilter = c.filter === GRAY; c.filter = 'none'; }
  if (canFilter) { c.filter = GRAY; c.drawImage(src, 0, 0); c.filter = 'none'; return out; }
  c.drawImage(src, 0, 0);
  try {
    const d = c.getImageData(0, 0, out.width, out.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const l = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11;
      p[i] = (l + (p[i] - l) * 0.18) * 0.78; p[i + 1] = (l + (p[i + 1] - l) * 0.18) * 0.78; p[i + 2] = (l + (p[i + 2] - l) * 0.18) * 0.84;
    }
    c.putImageData(d, 0, 0);
  } catch { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(60,60,80,.55)'; c.fillRect(0, 0, out.width, out.height); }
  return out;
}
/** Whether a unit is drawn from its picture (loaded) rather than the vector figure. */
export function hasUnitImage(u: UnitLike) { const img = unitImages.get(imageKey(u)); return !!img && img.complete && img.naturalWidth > 0; }
function figureFor(u: UnitLike, gray: boolean): HTMLCanvasElement {
  const img = unitImages.get(imageKey(u));
  const useImg = !!img && img.complete && img.naturalWidth > 0;
  // Pictures face right (lower right); the enemy army faces left.
  const flip = u.team === 'red';
  const look = useImg ? null : lookOf(u);
  const key = useImg ? `img:${imageKey(u)}:${flip ? 'L' : 'R'}${u.boss ? ':boss' : ''}` : JSON.stringify(look);
  let base = figCache.get(key);
  if (!base) {
    base = canvas(FW * RES, FH * RES);
    const c = base.getContext('2d')!;
    c.scale(RES, RES); c.translate(FAX, FAY);
    if (useImg) {
      const D = SPRITE_SIZE, pic = shrinkImage(img!, Math.round(D * RES), Math.round(D * RES));
      c.save(); if (flip) c.scale(-1, 1);
      c.drawImage(pic, -D / 2, -D * SPRITE_FEET, D, D);
      c.restore();
      if (u.boss) { c.scale(K, K); crown(c, 0, -D * (SPRITE_FEET - SPRITE_TOP) / K - 8); }
    } else { c.scale(K, K); drawFigure(c, look!); }
    figCache.set(key, base);
  }
  if (!gray) return base;
  let g = figCache.get(key + '|gray');
  if (!g) { g = desaturate(base); figCache.set(key + '|gray', g); }
  return g;
}

const ringCache = new Map<string, HTMLCanvasElement>();
function ring(team: string) {
  let r = ringCache.get(team);
  if (!r) {
    r = canvas(T * 0.9 * RES, T * 0.42 * RES);
    const c = r.getContext('2d')!, cx = T * 0.45, cy = T * 0.21;
    c.scale(RES, RES);
    const col = team === 'red' ? ['#ff6f61', 'rgba(255,90,80,.35)'] : ['#5aa7ff', 'rgba(80,150,255,.35)'];
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx, cy + 2 * K, 25 * K, 8.5 * K, 0, 0, 7); c.fill();
    c.save(); c.shadowColor = col[0]; c.shadowBlur = 8 * K;
    c.strokeStyle = col[0]; c.fillStyle = col[1]; c.lineWidth = 2.5 * K; c.beginPath(); c.ellipse(cx, cy, 22 * K, 7 * K, 0, 0, 7); c.fill(); c.stroke(); c.restore();
    ringCache.set(team, r);
  }
  return r;
}

/** Feet position of a unit inside its tile (fraction of T from the tile's top). */
export const FEET = 0.78;
/**
 * Draws one unit standing on the tile whose top-left is (px, py): shadow and team ring, the figure
 * (desaturated when `gray`), and the HP bar (`hp` = 0..1; omit to skip).
 */
export function drawUnit(c: C2D, u: UnitLike, px: number, py: number, gray = false, hp?: number) {
  const fx = px + T / 2, fy = py + T * FEET;
  const r = ring(u.team);
  c.globalAlpha = gray ? 0.55 : 1;
  c.drawImage(r, fx - T * 0.45, fy - T * 0.21, T * 0.9, T * 0.42);
  c.globalAlpha = 1;
  c.drawImage(figureFor(u, gray), fx - FAX, fy - FAY, FW, FH);
  if (hp !== undefined) hpBar(c, fx, fy + 7 * K, hp, u.team);
}
export function hpBar(c: C2D, cx: number, y: number, frac: number, team: string) {
  const w = 38 * K, h = 6.5 * K, f = Math.max(0, Math.min(1, frac));
  c.fillStyle = 'rgba(20,14,22,.85)'; c.beginPath(); c.roundRect(cx - w / 2, y, w, h, h / 2); c.fill();
  if (f > 0) {
    const iw = (w - 3 * K) * f, col = f <= 0.3 ? '#ffb24a' : team === 'red' ? '#ff6f61' : '#5aa7ff';
    c.fillStyle = col; c.beginPath(); c.roundRect(cx - w / 2 + 1.5 * K, y + 1.5 * K, Math.max(iw, h - 3 * K), h - 3 * K, (h - 3 * K) / 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(cx - w / 2 + 3 * K, y + 1.8 * K, Math.max(0, iw - 3 * K), 1.2 * K);
  }
}

/** Head-and-shoulders picture for the dialogue box (square canvas). */
export function drawPortrait(cv: HTMLCanvasElement, u: UnitLike) {
  const c = cv.getContext('2d')!, s = cv.width / 66;
  c.clearRect(0, 0, cv.width, cv.height);
  const look = { ...lookOf(u), mounted: false, boss: false };
  c.save(); c.translate(cv.width / 2 - 2 * s, cv.height + 6 * s); c.scale(s, s);
  drawFigure(c, look);
  c.restore();
}
/** Whole figure fitted into a small square canvas (camp cards). */
export function drawIcon(cv: HTMLCanvasElement, u: UnitLike) {
  const c = cv.getContext('2d')!, f = figureFor(u, false), side = T * 1.22, sx = FAX - side / 2, sy = FAY - side + T * 0.1;
  c.clearRect(0, 0, cv.width, cv.height);
  c.drawImage(f, sx * RES, sy * RES, side * RES, side * RES, 0, 0, cv.width, cv.height);
}
