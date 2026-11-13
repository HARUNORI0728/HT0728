// Names → character ids (for portraits and map sprites of named characters).
import { CAST, CHARS, SPEAKER_IDS } from '../data';

const byName = new Map<string, string>();
for (const c of Object.values(CHARS)) byName.set(c.name, c.id);
for (const [id, c] of Object.entries(CAST)) byName.set(c.name, id);
const all = () => [...byName, ...Object.entries(SPEAKER_IDS)];
/**
 * Character id for a speaker or unit name: cast names first, then SPEAKER_IDS (exact, then the longest entry the
 * name ends with, so 「野盗頭ガズ」 finds ガズ). Unknown names (一般兵, narration) give null.
 */
export function idForName(name: string | undefined): string | null {
  if (!name) return null;
  const hit = byName.get(name) ?? SPEAKER_IDS[name];
  if (hit) return hit;
  let best: string | null = null, len = 0;
  for (const [k, id] of all()) if (k.length > len && name.endsWith(k)) { best = id; len = k.length; }
  return best;
}
