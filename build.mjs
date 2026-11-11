// Bundles src/main.ts and inlines it into a single self-contained play/index.html.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const out = await build({ entryPoints: ['src/main.ts'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = readFileSync('src/index.html', 'utf8').replace('<!--SCRIPT-->', () => `<script>${js}</script>`);
// src/index.html is a body fragment (the form the hosted preview expects); wrap it for standalone use.
const page = `<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n${html}</body>\n</html>\n`;
mkdirSync('play', { recursive: true });
writeFileSync('play/index.html', page);
if (process.env.FRAGMENT_OUT) writeFileSync(process.env.FRAGMENT_OUT, html);
console.log('built play/index.html', (html.length / 1024).toFixed(1) + 'KB');
