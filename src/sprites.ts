// Pixel-art sprites and terrain tiles, drawn procedurally on canvas.

const TEAM: Record<string, { c: string; d: string }> = {
  blue: { c: '#3d6fd6', d: '#24418c' },
  red: { c: '#d2483e', d: '#8a2420' },
  gray: { c: '#7d7d8c', d: '#55555f' },
};
const BASE: Record<string, string> = { k: '#17131f', s: '#f6cfa6', w: '#dfe6ee', g: '#8d97a8', b: '#6b4426', y: '#e8c56a', p: '#8e5fc9', o: '#f1e9d2' };

interface Sprite { hair: string; rows: string[] }
export const SPR: Record<string, Sprite> = {
  sword: { hair: '#cfd6e6', rows: [
    '................', '.....kkkkk....k.', '....khhhhhk..kwk', '...khhhhhhhk.kwk', '...khssssshk.kwk', '...khskssksk.kwk',
    '....ksssssk..kwk', '...kkcccckk.kyyk', '..kcccccccckkbk.', '..kcdccccdcsskk.', '..kskcyyckkk....', '..kkkcdddck.....',
    '....kcckcck.....', '....kbbkbbk.....', '...kbbbkbbbk....', '...kkkk.kkkk....'] },
  lancer: { hair: '#5a4a3a', rows: [
    '.............w..', '.....kkkkk..kwk.', '....khhhhhk.kwk.', '...khhhhhhhk.b..', '...khssssshk.b..', '...khskssksk.b..',
    '....ksssssk..b..', '...kkcccckk..b..', '..kcccccccckkb..', '..kcdccccdcssb..', '..kskcyyckkk.b..', '..kkkcdddck..b..',
    '....kcckcck..b..', '....kbbkbbk..b..', '...kbbbkbbbk....', '...kkkk.kkkk....'] },
  axe: { hair: '#3a3a3a', rows: [
    '................', '.....kkkkk.kkk..', '....khhhhhkgggk.', '...khhhhhhhkbggk', '...khssssshkbgk.', '...khskssksk.b..',
    '....ksssssk..b..', '...kkcccckk..b..', '..kcccccccckkb..', '..kcdccccdcssb..', '..kskcbbckkk.b..', '..kkkcdddck.....',
    '....kcckcck.....', '....kbbkbbk.....', '...kbbbkbbbk....', '...kkkk.kkkk....'] },
  mage: { hair: '#e58a4f', rows: [
    '......kk........', '.....kppk....kk.', '....kppppk..kyyk', '...kppppppk.kyyk', '..kkkkkkkkkk.kk.', '...khssssk...kb.',
    '...kskssksk..kb.', '....kssssk...kb.', '...kccccccksskb.', '..kccdccdcckkkb.', '..kskcccckk..kb.', '..kkkccccck..kb.',
    '...kccdcccck.kb.', '...kcccdcccck...', '..kcccccccccck..', '..kkkkkkkkkkkk..'] },
  armor: { hair: '#444', rows: [
    '..kwk...........', '..kwk..kkkkk....', '..kwk.kgggggk...', '..kwk.kgkkkgk...', '..kbk.kgsssgk...', '..kbkkkgggggkkk.',
    '..kskccccccccwwk', '..kkkcdcccdcwcwk', '..kbkccccccwcccw', '..kbkgcdddcwcccw', '..kbkgccccckwcwk', '..kbkkgggggkkwk.',
    '..kbk.kggkggk...', '..kbk.kggkggk...', '.....kgggkgggk..', '.....kkkk.kkkk..'] },
  archer: { hair: '#5b8f4a', rows: [
    '................', '.....kkkkk..kk..', '....khhhhhk.kbk.', '...khhhhhhhk.kbk', '...khsssshk..okb', '...kskssksk..okb',
    '....kssssk...okb', '...kkcccckkssokb', '..kcccccccckkokb', '..kcdcccdck..okb', '..kskccccck..okb', '..kkkbbbbk..kbk.',
    '....kcckcck.kk..', '....kbbkbbk.....', '...kbbbkbbbk....', '...kkkk.kkkk....'] },
  cavalier: { hair: '#7a4a2a', rows: [
    '..............w.', '.....kkkkk...kwk', '....khhhhhk..kb.', '...khhhhhhhk..b.', '...khssssshk..b.', '...khskssksk..b.',
    '....ksssssk...b.', '...kkcccckk...b.', '..kcccccccckkkb.', '...kkcddckk.kkb.', '..kbbbbbbbbhhhk.', '.kbbbbbbbbbbhbbk',
    '.kbbbbbbbbbbbkbk', '.kbbbbbbbbbbkbbk', '..kbk..kbk.kbkkk', '..kkk..kkk.kkk..'] },
  healer: { hair: '#c0703a', rows: [
    '.............kk.', '.....kkkkk..kyyk', '....khhhhhk.kyyk', '...khhhhhhhk.kk.', '...khssssshk.kb.', '...khskssksk.kb.',
    '....ksssssk..kb.', '...kkcccckk..kb.', '..kcccccccckskb.', '..kcdccccdckkkb.', '..kskcyyckk..kb.', '..kkkccccck..kb.',
    '...kccdcccck.kb.', '...kcccdcccck...', '..kcwcwcwcwcck..', '..kkkkkkkkkkkk..'] },
  priest: { hair: '#9a9aa8', rows: [
    '................', '.....kkkkk......', '....khhhhhk.....', '...khhhhhhhk....', '...khssssshk....', '...khskssksk....',
    '....ksssssk.....', '...kkoyyyokk....', '..kooooyoooookk.', '..koooooyoooyskk', '..koyoooyoooybbk', '..kooyooyooykbyk',
    '...koooyooookbk.', '...kooyoooyook..', '..kooooyoooyook.', '..kkkkkkkkkkkkk.'] },
  thief: { hair: '#2e2e3a', rows: [
    '................', '.....kkkkk......', '....khhhhhkk....', '...khhhhhhhhk...', '...khssssshk....', '...khskssksk....',
    '....kcccccck....', '...kccccdckk..w.', '...kcddddck.kwk.', '...kskddddksskk.', '...kkkddddkkk...', '....kdddddk.....',
    '....kdkkdk......', '....kbbkbbk.....', '...kbbbkbbbk....', '...kkkk.kkkk....'] },
  shield: { hair: '#8a5a2a', rows: [
    '................', '.....kkkkk....w.', '....khhhhhk...w.', '...khhhhhhhk..w.', '...khssssshk..w.', '...khskssksk..w.',
    '....ksssssk...w.', '.kkkkcccckk..kyk', 'kggggkccccckkkbk', 'kgwgwgkcdccsskk.', 'kggyggkckcckk...', 'kgwgwgkkcdck....',
    '.kgggk.kcck.....', '..kkk..kbbkbk...', '......kbbbkbbk..', '......kkkk.kkk..'] },
  merc: { hair: '#6b3a1e', rows: [
    '..............kk', '.....kkkkk...kwk', '....khhhhhk.kwk.', '...khhhhhhhkkwk.', '...khssssshkwk..', '...khskssksskk..',
    '....kssssskwk...', '...kkcccckkwk...', '..kcccccckkwk...', '..kcdcbbcckk....', '..kskcbbcckk....', '..kkkcdddck.....',
    '....kcckcck.....', '....kbbkbbk.....', '...kbbbkbbbk....', '...kkkk.kkkk....'] },
  brute: { hair: '#3a2a22', rows: [
    '................', '.....kkkkk......', '....kggggggk....', '....kgsssssk....', '....kgkssksk....', '....kgsssssk....',
    '...kkkgggggkkk..', '.kkgggkccckgggkk', 'kgggggkcdckggggk', 'kgkgggkcccckgggk', 'kskgggcdddcgggsk', 'kkk.kkccccckk.kk',
    '....kccdddck....', '....kggkkggk....', '...kgggkkgggk...', '...kkkkk.kkkk...'] },
  beast: { hair: '#c98a3a', rows: [
    '................', '...kk.....kk....', '..khhk...khhk...', '..khhhkkkkhhk...', '...khhhhhhhk....', '...khssssshk....',
    '...khskssksk....', '....kssksssk....', '...kkcccckkk....', '..kccccccccck...', '.wkcdccccdckwk..', 'wskkccccckkskw..',
    'w.kkkcdddck.w...', '....kcckcck.....', '...kbbbkbbbk....', '...kkkk.kkkk....'] },
  monster: { hair: '#555', rows: [
    '................', '................', '...........k.k..', '..........kdkdk.', '.k.......kccccck', 'kck.....kcccyckk', '.kdkkkkkkccccckk', '.kdddcccccccckw.', '..kdcdcdcdcdck..', '..kdddcccdcddk..', '..kdcddkddcdk...', '..kdkk.kdkdk....', '..kdk..kdk.kdk..', '..kdk..kdk.kdk..', '.kddk.kddk.kddk.', '.kkkk.kkkk.kkkk.' ] },
};

export function drawSprite(ctx: CanvasRenderingContext2D, name: string, team: string, x: number, y: number, s: number, hair?: string) {
  const sp = SPR[name] ?? SPR.sword, t = TEAM[team];
  sp.rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '.') continue;
      ctx.fillStyle = ch === 'h' ? (team === 'gray' ? '#888' : hair ?? sp.hair) : ch === 'c' ? t.c : ch === 'd' ? t.d : BASE[ch];
      ctx.fillRect(x + i * s, y + j * s, s, s);
    }
  });
}

/** Draws the whole terrain layer once (16px tiles scaled by s). */
export function drawTerrain(c: CanvasRenderingContext2D, map: string[], s: number) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const px = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x * s, y * s, w * s, h * s); };
  map.forEach((row, ty) => [...row].forEach((ch, tx) => {
    const X = tx * 16, Y = ty * 16;
    px(X, Y, 16, 16, (tx + ty) % 2 ? '#5fa052' : '#66a858');
    for (let i = 0; i < 5; i++) px(X + ((rnd() * 15) | 0), Y + ((rnd() * 15) | 0), 1, 1, '#7fc06a');
    if (ch === 'F') [[1, 1], [8, 2], [4, 8]].forEach(([a, b]) => { px(X + a + 2, Y + b + 4, 2, 3, '#5a3a1e'); px(X + a, Y + b + 1, 6, 4, '#2f6b34'); px(X + a + 1, Y + b, 4, 2, '#3d8442'); px(X + a + 1, Y + b + 1, 2, 1, '#5aa85a'); });
    if (ch === 'M') { px(X, Y, 16, 16, '#7a8a5a'); for (let i = 0; i < 7; i++) px(X + 8 - i, Y + 2 + i * 2, i * 2 + 1, 2, '#8c7b6a'); px(X + 7, Y + 2, 2, 3, '#f2f2f2'); px(X + 6, Y + 5, 2, 1, '#f2f2f2'); for (let i = 2; i < 7; i++) px(X + 8, Y + 2 + i * 2, i, 2, '#6c5d50'); }
    if (ch === 'W') { px(X, Y, 16, 16, '#3b78c4'); for (let i = 0; i < 3; i++) px(X + ((rnd() * 11) | 0), Y + 2 + i * 5, 4, 1, '#7fb3ea'); }
    if (ch === 'R') { px(X, Y, 16, 16, '#c9ad7a'); for (let i = 0; i < 5; i++) px(X + ((rnd() * 15) | 0), Y + ((rnd() * 15) | 0), 1, 1, '#a88d5e'); }
    if (ch === 'B') { px(X, Y, 16, 16, '#3b78c4'); px(X, Y + 3, 16, 10, '#8a5a30'); for (let i = 0; i < 4; i++) px(X + i * 4, Y + 3, 1, 10, '#5e3b1c'); px(X, Y + 2, 16, 1, '#3a2412'); px(X, Y + 13, 16, 1, '#3a2412'); }
    if (ch === 'C') { px(X + 2, Y + 5, 12, 10, '#b9b3c4'); px(X + 2, Y + 3, 3, 3, '#b9b3c4'); px(X + 7, Y + 3, 3, 3, '#b9b3c4'); px(X + 11, Y + 3, 3, 3, '#b9b3c4'); px(X + 6, Y + 10, 4, 5, '#3a2412'); px(X + 8, Y, 1, 3, '#3a2412'); px(X + 9, Y, 4, 2, '#d2483e'); px(X + 2, Y + 14, 12, 1, '#7d778a'); }
  }));
}
