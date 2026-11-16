/** Enemy phases keep their own theme even after a boss has been engaged. */
export function chooseMapTrack(chapter: number, phase: string, bossEngaged: boolean,
  bgm: { blue?: string; red?: string; boss?: string } = {}): string {
  if (phase === 'red') return bgm.red ?? 'map_enemy';
  if (bossEngaged) return bgm.boss ?? 'boss';
  return bgm.blue ?? (chapter <= 3 ? 'map_dawn' : chapter <= 7 ? 'map_resolve' : 'map_final');
}

/**
 * A conversation's opening track: the scene's own cue when it has one ('none' = silence → null), else the fallback.
 * Only one of them is requested, so the fallback never starts (or restarts the current track) right before the cue.
 */
export function openingTrack(cue: string | undefined, fallback: string): string | null {
  if (!cue) return fallback;
  return cue === 'none' ? null : cue;
}

/** What engagedBoss needs to know about a unit. */
export interface BossLike { uid: number; team: string; boss?: unknown; unkillable?: unknown; hp: number; left?: unknown }
/**
 * Whether an enemy boss is engaged (keeps its theme in allied phases): fought on this page (`engaged`), or its first
 * clash recorded in the saved flags — the `intro:<uid>` flag every boss gets, or its first-clash talk (`talked`) — so a
 * boss without a bossFight talk (第6章オーベール) is still engaged after reloading a mid-chapter save.
 */
export function engagedBoss(units: BossLike[], flags: Record<string, unknown>, engaged: Set<number>, talked: (u: BossLike) => boolean = () => false): boolean {
  return units.some(u => u.team === 'red' && !!u.boss && !u.unkillable && u.hp > 0 && !u.left
    && (engaged.has(u.uid) || !!flags[`intro:${u.uid}`] || talked(u)));
}

/**
 * Whether the map's track comes back after a talk / at the end of a fight. Not when the battle is decided (win or
 * defeat): the victory or defeat jingle follows, and a silent talk (第10章 使徒の撃破) stays silent until then.
 */
export const restoresMapTrack = (outcome: 'win' | 'lose' | 'stage' | null) => outcome !== 'win' && outcome !== 'lose';
