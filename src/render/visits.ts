// 宝箱・訪問マス（M13）のマーカー。地形（描いた絵・自動の地形）の上に重ねる小さな絵。
// 未開封は足もとに金の光がゆっくり明滅し、開けた後は光が消えて開いた絵になる。原点 = マスの左上、1マス = T。
import { OUT, T, type C2D } from './common';

const K = (T / 96) * 1.3; // 描いた地図の上でも埋もれない大きさ

function glow(c: C2D, cx: number, cy: number, a: number) {
  const g = c.createRadialGradient(cx, cy, 2 * K, cx, cy, 40 * K);
  g.addColorStop(0, `rgba(255,226,140,${0.55 * a})`);
  g.addColorStop(1, 'rgba(255,226,140,0)');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(cx, cy, 42 * K, 24 * K, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = `rgba(255,236,170,${0.8 * a})`; c.lineWidth = 2.5 * K;
  c.beginPath(); c.ellipse(cx, cy, 30 * K, 14 * K, 0, 0, Math.PI * 2); c.stroke();
}

function chest(c: C2D, cx: number, by: number, open: boolean) {
  const w = 44 * K, h = 26 * K, x = cx - w / 2, y = by - h;
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx, by + 2 * K, w * 0.6, 6 * K, 0, 0, Math.PI * 2); c.fill();
  c.lineWidth = 2.5 * K; c.strokeStyle = OUT;
  // 箱
  c.fillStyle = '#8a5326'; c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h);
  c.fillStyle = '#a8692f'; c.fillRect(x + 2 * K, y + 2 * K, w - 4 * K, 5 * K);
  if (open) {
    // 中（暗がりと金の照り返し）と、後ろへ開いた蓋
    c.fillStyle = '#2b1810'; c.fillRect(x + 3 * K, y - 1 * K, w - 6 * K, 6 * K);
    c.fillStyle = '#7a4520'; c.beginPath();
    c.moveTo(x, y); c.lineTo(x + 4 * K, y - 18 * K); c.lineTo(x + w - 4 * K, y - 18 * K); c.lineTo(x + w, y); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#d9b25a'; c.lineWidth = 3 * K;
    c.beginPath(); c.moveTo(x + 2 * K, y - 9 * K); c.lineTo(x + w - 2 * K, y - 9 * K); c.stroke();
  } else {
    // 丸い蓋
    c.fillStyle = '#9b5d2a'; c.beginPath();
    c.moveTo(x, y); c.quadraticCurveTo(cx, y - 22 * K, x + w, y); c.closePath(); c.fill(); c.stroke();
    // 金具と錠
    c.strokeStyle = '#e2bd5e'; c.lineWidth = 3.5 * K;
    for (const fx of [x + 9 * K, x + w - 9 * K]) { c.beginPath(); c.moveTo(fx, y - 8 * K); c.lineTo(fx, by - 1 * K); c.stroke(); }
    c.fillStyle = '#f1d27a'; c.strokeStyle = OUT; c.lineWidth = 2 * K;
    c.fillRect(cx - 5 * K, y - 4 * K, 10 * K, 11 * K); c.strokeRect(cx - 5 * K, y - 4 * K, 10 * K, 11 * K);
    c.fillStyle = OUT; c.fillRect(cx - 1.2 * K, y, 2.4 * K, 4 * K);
  }
}

function cage(c: C2D, cx: number, by: number, open: boolean) {
  const w = 46 * K, h = 40 * K, x = cx - w / 2, y = by - h;
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx, by + 2 * K, w * 0.6, 6 * K, 0, 0, Math.PI * 2); c.fill();
  c.lineWidth = 2.5 * K; c.strokeStyle = OUT;
  // 床板と屋根の梁
  c.fillStyle = '#6e4a2a'; c.fillRect(x - 2 * K, by - 7 * K, w + 4 * K, 7 * K); c.strokeRect(x - 2 * K, by - 7 * K, w + 4 * K, 7 * K);
  c.fillRect(x - 2 * K, y, w + 4 * K, 6 * K); c.strokeRect(x - 2 * K, y, w + 4 * K, 6 * K);
  if (!open) { // 中の小さな影（子ども）
    c.fillStyle = 'rgba(40,28,36,.75)';
    c.beginPath(); c.ellipse(cx, by - 14 * K, 8 * K, 9 * K, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx, by - 26 * K, 6 * K, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(cx - 6 * K, by - 30 * K); c.lineTo(cx - 3 * K, by - 37 * K); c.lineTo(cx - 1 * K, by - 30 * K); c.fill();
    c.beginPath(); c.moveTo(cx + 6 * K, by - 30 * K); c.lineTo(cx + 3 * K, by - 37 * K); c.lineTo(cx + 1 * K, by - 30 * K); c.fill();
  }
  // 鉄格子（開いた後は手前の扉が横へ開く）
  const bars = (x0: number, x1: number, n: number) => {
    for (let i = 0; i <= n; i++) {
      const bx = x0 + ((x1 - x0) * i) / n;
      c.strokeStyle = OUT; c.lineWidth = 4.5 * K; c.beginPath(); c.moveTo(bx, y + 6 * K); c.lineTo(bx, by - 7 * K); c.stroke();
      c.strokeStyle = '#a7aab4'; c.lineWidth = 2.2 * K; c.beginPath(); c.moveTo(bx, y + 6 * K); c.lineTo(bx, by - 7 * K); c.stroke();
    }
  };
  if (open) {
    bars(x, x + 10 * K, 1); bars(x + w - 10 * K, x + w, 1);
    // 開いた扉（斜めに）
    c.save(); c.translate(x + w, by - 7 * K); c.transform(0.45, 0.2, 0, 1, 0, 0);
    for (let i = 0; i <= 3; i++) {
      const bx = (i * 26 * K) / 3;
      c.strokeStyle = OUT; c.lineWidth = 4 * K; c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx, -(h - 13 * K)); c.stroke();
      c.strokeStyle = '#a7aab4'; c.lineWidth = 2 * K; c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx, -(h - 13 * K)); c.stroke();
    }
    c.restore();
  } else {
    bars(x, x + w, 5);
    c.fillStyle = '#e2bd5e'; c.strokeStyle = OUT; c.lineWidth = 2 * K;
    c.fillRect(cx - 4 * K, by - 24 * K, 8 * K, 9 * K); c.strokeRect(cx - 4 * K, by - 24 * K, 8 * K, 9 * K);
  }
}

/** 宝箱・檻（村）のマーカーを (tx, ty) のマスに描く。sec = 経過秒（未開封の光の明滅）。 */
export function drawVisit(c: C2D, kind: 'chest' | 'village', tx: number, ty: number, open: boolean, sec: number) {
  const cx = (tx + 0.5) * T, by = (ty + 0.86) * T;
  if (!open) glow(c, cx, by - 4 * K, 0.7 + 0.3 * Math.sin(sec * 2.4));
  if (kind === 'chest') chest(c, cx, by, open);
  else cage(c, cx, by, open);
}
