// Character art: which picture belongs to whom, and loading it.
//
// Pictures live next to play/index.html (play/assets/…) and are listed in art-manifest.ts, so the game never asks
// for a file that does not exist. They are loaded with Image elements (works from file:// and static hosting).
// Until a picture has loaded, or if it fails, callers get null and keep drawing the vector figure.
import { PORTRAIT_ART, UNIT_ART, type Face } from '../art-manifest';
import { CAST, CHARS } from '../data';
import { idForName } from './who';
import { imageKey, setUnitImage, type UnitLike } from './units';

export type { Face };

const images = new Map<string, HTMLImageElement>();
const failed = new Set<string>();
/** Starts loading a picture once; `ready` reports whether it decoded. */
function load(url: string, done?: (img: HTMLImageElement) => void) {
  let img = images.get(url);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.onload = () => done?.(img!);
    img.onerror = () => { failed.add(url); };
    img.src = url;
    images.set(url, img);
  } else if (done && img.complete && img.naturalWidth > 0) done(img);
  return img;
}
const ready = (img: HTMLImageElement | undefined) => !!img && img.complete && img.naturalWidth > 0;

/** Loads every map sprite (about 0.7MB). Each one replaces its vector figure as soon as it arrives. */
export function loadUnitArt() {
  for (const [k, url] of Object.entries(UNIT_ART)) load(url, img => setUnitImage(k, img));
}

// ---------- who is who ----------
export { idForName };
/** Character id behind a map unit: cast members by id, named enemies (bosses) by name. */
export function idForUnit(u: UnitLike): string | null {
  if (u.team !== 'red' && (CHARS[u.id] || CAST[u.id])) return u.id;
  return u.boss || u.team !== 'red' ? idForName(u.name) ?? (PORTRAIT_ART[u.id] ? u.id : null) : null;
}

// ---------- portraits ----------
/** URL of a portrait, falling back to the normal face; null when the character has none. */
export function portraitUrl(id: string | null, face: Face = 'normal'): string | null {
  const p = id ? PORTRAIT_ART[id] : undefined;
  return p?.[face] ?? p?.normal ?? null;
}
export const hasPortrait = (id: string | null) => !!portraitUrl(id);
/** Starts loading portraits ahead of time (a conversation's speakers) so face changes do not flicker. */
export function preloadPortrait(id: string | null, face: Face = 'normal') { const u = portraitUrl(id, face); if (u) load(u); }
/** The portrait as a decoded image, or null while loading / after a failure. */
export function portraitImage(id: string | null, face: Face = 'normal'): HTMLImageElement | null {
  const u = portraitUrl(id, face); if (!u) return null;
  const img = load(u); return ready(img) ? img : null;
}
export const portraitFailed = (id: string | null, face: Face = 'normal') => { const u = portraitUrl(id, face); return !u || failed.has(u); };

/** The map sprite URL for a unit (for HTML panels), or null. */
export function spriteUrl(u: UnitLike): string | null { return UNIT_ART[imageKey(u)] ?? null; }

/**
 * Where the face sits in each portrait (fractions of width / height): the point between the eyes and the mouth.
 * Measured on the normal faces; the other expressions share the framing.
 */
const FACE_AT: Record<string, [number, number]> = {
  apostle: [0.47, 0.345], ariel: [0.5, 0.365], cliff: [0.48, 0.365], dolgan: [0.5, 0.335], elinalise: [0.5, 0.325],
  eris: [0.53, 0.365], gaz: [0.5, 0.315], ghislaine: [0.52, 0.365], isolde: [0.53, 0.325], linia: [0.5, 0.415],
  lotta: [0.5, 0.345], luke: [0.5, 0.335], mercboss: [0.5, 0.365], orsted: [0.5, 0.335], paul: [0.48, 0.335],
  perugius: [0.5, 0.335], pursena: [0.5, 0.395], roxy: [0.52, 0.415], rudeus: [0.5, 0.365], ruijerd: [0.52, 0.335],
  sara: [0.5, 0.365], sylphiette: [0.5, 0.375], zanoba: [0.5, 0.335],
};
const esc = (t: string) => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
/**
 * A face badge for HTML panels: the portrait cropped around the face, or (generic enemies) the upper body of the
 * map sprite. Empty string when there is no art; a picture that fails to load removes itself.
 */
export function faceHtml(u: UnitLike, cls = '', face: Face = 'normal'): string {
  const id = idForUnit(u);
  let url = portraitUrl(id, face);
  if (url) { load(url); if (failed.has(url)) url = null; } // known-missing files are not asked for again
  const team = u.team === 'red' ? 'red' : 'blue';
  if (url) {
    const [fx, fy] = FACE_AT[id!] ?? [0.5, 0.36];
    return `<span class="face ${team} ${cls}" style="--fx:${fx};--fy:${fy}"><img src="${esc(url)}" alt="" onerror="this.parentNode.classList.add('none');this.remove()"></span>`;
  }
  const sp = spriteUrl(u);
  if (sp && !failed.has(sp)) return `<span class="face sprite ${team} ${cls}"><img src="${esc(sp)}" alt="" onerror="this.parentNode.classList.add('none');this.remove()"></span>`;
  return '';
}
