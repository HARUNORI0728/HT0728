// Writes the under-drawings for painting the maps (design/map-paint-prompts.md):
//   design/map-guides/chNN-guide.png  the chapter's code-drawn map at its start, 64px per tile, no units or marks
//   design/map-guides/chNN-grid.png   the same with the grid, terrain letters / names and impassable hatching
// The pictures come from the game itself (play/index.html, window.__game.mapGuide), so they match what it draws.
// The canvas PNGs (2–3MB each) are shrunk to 256-colour PNGs with Pillow when it is available (about 0.3–0.5MB);
// that is plenty for an image-to-image input and for checking by eye.
// Run `npm run build` first when the maps or the terrain drawing changed.   Usage: npm run map-guides [-- 1 8]
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'design', 'map-guides');
const TILE = 64;
const only = process.argv.slice(2).map(Number).filter(Boolean);
const chapters = only.length ? only : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

mkdirSync(out, { recursive: true });
const written = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(root, 'play', 'index.html')).href);
  await page.waitForFunction(() => !!window.__game?.mapGuide);
  for (const n of chapters) {
    const nn = String(n).padStart(2, '0');
    for (const [suffix, marks] of [['guide', false], ['grid', true]]) {
      const url = await page.evaluate(([n, px, marks]) => window.__game.mapGuide(n, px, marks), [n, TILE, marks]);
      const file = path.join(out, `ch${nn}-${suffix}.png`);
      writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      written.push(file);
      console.log('wrote', path.relative(root, file));
    }
  }
} finally {
  await browser.close();
}

const shrink = `
import sys
from PIL import Image
for f in sys.argv[1:]:
    with Image.open(f) as im:
        q = im.convert('RGB').quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    q.save(f, optimize=True)
`;
const py = spawnSync(process.env.PYTHON || 'python3', ['-c', shrink, ...written], { stdio: 'inherit' });
if (py.error || py.status !== 0) console.warn('map-guides: Pillow not available, PNGs left at full size');
