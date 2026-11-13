// Bundles src/main.ts and inlines it into a single self-contained play/index.html.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Screenplay → src/script/scenes.ts (fails the build when the screenplay has a formatting error).
const script = spawnSync(process.execPath, ['tools/build-script.mjs'], { stdio: 'inherit' });
if (script.status !== 0) process.exit(script.status ?? 1);

// Character art: shrink assets/ into play/assets/ (skips outputs newer than their source) and refresh
// src/art-manifest.ts. Without Python/Pillow the committed play/assets and manifest are used as they are.
const art = spawnSync(process.env.PYTHON || 'python3', ['tools/optimize_art.py'], { stdio: 'inherit' });
if (art.error || art.status !== 0) console.warn('optimize_art skipped:', art.error?.message ?? `exit ${art.status}`);

// Music: copy delivered tracks into play/assets/audio/bgm and refresh src/audio-manifest.ts (placeholder synth otherwise).
const music = spawnSync(process.execPath, ['tools/build-audio.mjs'], { stdio: 'inherit' });
if (music.status !== 0) process.exit(music.status ?? 1);

const out = await build({ entryPoints: ['src/main.ts'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = readFileSync('src/index.html', 'utf8').replace('<!--SCRIPT-->', () => `<script>${js}</script>`);
// src/index.html is a body fragment (the form the hosted preview expects); wrap it for standalone use.
const page = `<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n${html}</body>\n</html>\n`;
mkdirSync('play', { recursive: true });
writeFileSync('play/index.html', page);
if (process.env.FRAGMENT_OUT) writeFileSync(process.env.FRAGMENT_OUT, html);
console.log('built play/index.html', (html.length / 1024).toFixed(1) + 'KB');
