// Painted map backgrounds (assets/maps/chNN.png) and the marks that show where the rules' tiles are.
//
// A painted map is a redrawing of the code-drawn map (design/map-guides/chNN-guide.png) with the same layout. It is
// stretched over the whole map (columns × rows tiles), so tile (x, y) of the rules is always the same rectangle of the
// picture. Tiles that change during a chapter (6章の柵, 8章の崩落, 9章の城門) are covered with the code-drawn tile.
import { TERRAIN } from '../data';
import { T, type C2D } from './common';

/**
 * The terrain layer from a painted map: the picture stretched over cols × rows tiles at `scale` backing pixels per
 * map pixel, then each tile in `changed` copied from `auto` (the code-drawn layer of the current map, same size).
 */
export function paintedLayer(img: CanvasImageSource, cols: number, rows: number, scale: number, auto: HTMLCanvasElement | null, changed: [number, number][]) {
  const c = document.createElement('canvas');
  c.width = Math.round(cols * T * scale); c.height = Math.round(rows * T * scale);
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  if (auto) for (const [x, y] of changed) {
    const s = T * scale, px = Math.round(x * s), py = Math.round(y * s), w = Math.round((x + 1) * s) - px, h = Math.round((y + 1) * s) - py;
    g.drawImage(auto, px, py, w, h, px, py, w, h);
  }
  return c;
}

/** Tiles whose terrain differs between two maps of the same size (the chapter's start and now). */
export function changedTiles(from: string[], now: string[]): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < now.length; y++) for (let x = 0; x < now[y].length; x++) if (from[y]?.[x] !== now[y][x]) out.push([x, y]);
  return out;
}

/**
 * Thin tile lines over the map (map pixels; the caller's transform maps them to the screen), for the tiles
 * x0..x1 × y0..y1 (inclusive). A dark line with a light edge, so it reads on grass, water and stone alike.
 */
export function drawGrid(c: C2D, x0: number, y0: number, x1: number, y1: number, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  const path = new Path2D();
  for (let x = x0; x <= x1 + 1; x++) { path.moveTo(x * T, y0 * T); path.lineTo(x * T, (y1 + 1) * T); }
  for (let y = y0; y <= y1 + 1; y++) { path.moveTo(x0 * T, y * T); path.lineTo((x1 + 1) * T, y * T); }
  c.lineWidth = 2.4; c.strokeStyle = 'rgba(20,16,26,.34)'; c.stroke(path);
  c.translate(1.2, 1.2); c.lineWidth = 1; c.strokeStyle = 'rgba(255,248,226,.2)'; c.stroke(path);
  c.restore();
}

/** Terrain that blocks walking (川・崖・城壁・柵・岩壁). Matches logic's moveCost for foot units. */
export const BLOCKING = 'WXZLQ';

/**
 * The check sheet's marks (design/map-guides/chNN-grid.png): the grid, each tile's terrain letter and name, and a
 * red hatch on tiles nobody can walk through. Map pixels, like drawTerrain.
 */
export function drawGuideMarks(c: C2D, map: string[]) {
  const rows = map.length, cols = map[0].length;
  c.save();
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const ch = map[y][x], px = x * T, py = y * T;
    if (BLOCKING.includes(ch)) {
      c.save(); c.beginPath(); c.rect(px, py, T, T); c.clip();
      c.strokeStyle = 'rgba(214,40,40,.55)'; c.lineWidth = 5;
      for (let d = -T; d < T; d += 22) { c.beginPath(); c.moveTo(px + d, py + T); c.lineTo(px + d + T, py); c.stroke(); }
      c.restore();
    }
  }
  drawGrid(c, 0, 0, cols - 1, rows - 1);
  c.lineJoin = 'round'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const ch = map[y][x], px = x * T, py = y * T, name = TERRAIN[ch]?.name ?? '?';
    c.font = 'bold 40px sans-serif'; c.lineWidth = 7; c.strokeStyle = 'rgba(16,12,20,.85)'; c.fillStyle = BLOCKING.includes(ch) ? '#ffb4a8' : '#fff6dc';
    c.strokeText(ch, px + T / 2, py + T * 0.4); c.fillText(ch, px + T / 2, py + T * 0.4);
    c.font = 'bold 21px sans-serif'; c.lineWidth = 5;
    c.strokeText(name, px + T / 2, py + T * 0.78); c.fillText(name, px + T / 2, py + T * 0.78);
  }
  // column / row numbers along the top and left edges, to talk about tiles as (x, y)
  c.font = 'bold 17px sans-serif'; c.lineWidth = 4; c.fillStyle = '#ffe28a';
  for (let x = 0; x < cols; x++) { c.strokeText(String(x), x * T + 14, 12); c.fillText(String(x), x * T + 14, 12); }
  for (let y = 1; y < rows; y++) { c.strokeText(String(y), 14, y * T + 12); c.fillText(String(y), 14, y * T + 12); }
  c.restore();
}
