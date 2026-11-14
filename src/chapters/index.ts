// The story's chapters, one file each (src/chapters/chNN.ts). How to write one: src/chapters/README.md.
import type { Chapter } from '../data';
import { ch01 } from './ch01';
import { ch02 } from './ch02';
import { ch03 } from './ch03';
import { ch04 } from './ch04';
import { ch05 } from './ch05';
import { ch06 } from './ch06';
import { ch07 } from './ch07';
import { ch08 } from './ch08';
import { ch09 } from './ch09';
import { ch10 } from './ch10';
import { DEV_A, DEV_B } from './dev';

/** Every story chapter slot in order; null = not written yet. */
export const CHAPTER_SLOTS: (Chapter | null)[] = [ch01, ch02, ch03, ch04, ch05, ch06, ch07, ch08, ch09, ch10];
const firstGap = CHAPTER_SLOTS.indexOf(null);
/**
 * The playable story: CHAPTERS[i] = 第 i+1 章, up to the first chapter not written yet (the camp then says
 * 「制作中」). A later chapter written before an earlier one can still be tried with __game.startChapter(n).
 */
export const CHAPTERS: Chapter[] = (firstGap < 0 ? CHAPTER_SLOTS : CHAPTER_SLOTS.slice(0, firstGap)) as Chapter[];
/** Test chapters (never in the story). Entered only from window.__game.devChapter(…). */
export const DEV_CHAPTERS: Record<number, Chapter> = { 90: DEV_A, 91: DEV_B };
/** The chapter for a State / Camp index: story chapters, story slots written out of order, then test chapters. */
export function chapterDef(i: number): Chapter {
  return CHAPTERS[i] ?? CHAPTER_SLOTS[i] ?? DEV_CHAPTERS[i];
}
/** Whether a chapter index exists (story, out-of-order slot, or test). */
export const hasChapter = (i: number) => !!(CHAPTERS[i] ?? CHAPTER_SLOTS[i] ?? DEV_CHAPTERS[i]);
