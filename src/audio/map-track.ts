/** Enemy phases keep their own theme even after a boss has been engaged. */
export function chooseMapTrack(chapter: number, phase: string, bossEngaged: boolean,
  bgm: { blue?: string; red?: string; boss?: string } = {}): string {
  if (phase === 'red') return bgm.red ?? 'map_enemy';
  if (bossEngaged) return bgm.boss ?? 'boss';
  return bgm.blue ?? (chapter <= 3 ? 'map_dawn' : chapter <= 7 ? 'map_resolve' : 'map_final');
}
