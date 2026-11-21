"""オフィス風背景（F案）のイラストSVGを生成し、zoom-backgrounds.html の <!--OFFICE--> 部分に差し込む。
写真素材は使わず、図形だけで「ぼかした室内」を描く。  使い方: python3 brand/zoom/office_scene.py"""
import random, re, pathlib

P = {
 'day': dict(wall1='#f1ece3', wall2='#e4dccd', sky1='#d9e6ef', sky2='#f3efe6', bld1='#c4cfd9', bld2='#d6dee5',
             lit=None, frame='#2b2f38', slat='#c09366', slatgap='#93704a', floor1='#cfae86', floor2='#b28e66',
             shelf='#1f2a44', shelfin='#27324f', board='#efe9de', boardtop='#d8cdbb', leaf='#5f7a5c', leaf2='#7d9875',
             pot='#e9e2d6', led=None, lamp=None),
 'eve': dict(wall1='#2c3243', wall2='#1e2230', sky1='#172241', sky2='#4a4a66', bld1='#0e1424', bld2='#1a2238',
             lit='#f1d39a', frame='#11131a', slat='#6e5136', slatgap='#4a3523', floor1='#4f3a29', floor2='#3a2a1e',
             shelf='#151c30', shelfin='#1b2340', board='#3a3a44', boardtop='#4a4852', leaf='#2f4232', leaf2='#3d5540',
             pot='#5a5660', led='#f5cf8a', lamp='#ffd9a0'),
}
BOOKS = {'day': ['#efe6d2', '#b8954f', '#3a4a70', '#9aa0ab', '#a8705a', '#8f9e88', '#d9cdb4', '#6b7183'],
         'eve': ['#c9bfa8', '#a8833a', '#4a5a85', '#7d8290', '#8e5e4c', '#70806b', '#b0a68e', '#59607a']}

def scene(t):
    c = P[t]; r = random.Random(7); s = []
    a = s.append
    a(f'<defs><linearGradient id="wall{t}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c["wall1"]}"/><stop offset="1" stop-color="{c["wall2"]}"/></linearGradient>'
      f'<linearGradient id="sky{t}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c["sky1"]}"/><stop offset="1" stop-color="{c["sky2"]}"/></linearGradient>'
      f'<linearGradient id="flo{t}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c["floor1"]}"/><stop offset="1" stop-color="{c["floor2"]}"/></linearGradient>'
      f'<radialGradient id="glow{t}"><stop offset="0" stop-color="{c["lamp"] or "#fff"}" stop-opacity=".75"/><stop offset="1" stop-color="{c["lamp"] or "#fff"}" stop-opacity="0"/></radialGradient></defs>')
    a(f'<rect width="1920" height="1080" fill="url(#wall{t})"/>')
    # 窓（右）と街並み（特定の場所ではない架空のシルエット）
    a(f'<rect x="1250" y="60" width="700" height="800" fill="url(#sky{t})"/>')
    x = 1250
    while x < 1940:
        w = r.randint(50, 110); h = r.randint(120, 330)
        a(f'<rect x="{x}" y="{860-h-60}" width="{w}" height="{h+60}" fill="{c["bld2"]}"/>'); x += w + r.randint(0, 20)
    x = 1240
    while x < 1940:
        w = r.randint(60, 140); h = r.randint(60, 230); y0 = 860 - h
        a(f'<rect x="{x}" y="{y0}" width="{w}" height="{h}" fill="{c["bld1"]}"/>')
        if c['lit']:
            for yy in range(y0 + 14, 850, 22):
                for xx in range(x + 10, x + w - 8, 18):
                    if r.random() < .35: a(f'<rect x="{xx}" y="{yy}" width="7" height="9" fill="{c["lit"]}" opacity=".85"/>')
        x += w + r.randint(4, 24)
    for vx in (1250, 1475, 1700, 1920): a(f'<rect x="{vx-9}" y="60" width="18" height="800" fill="{c["frame"]}"/>')
    for hy in (60, 330, 600): a(f'<rect x="1241" y="{hy-8}" width="700" height="16" fill="{c["frame"]}"/>')
    # 中央の木のルーバー壁
    a(f'<rect x="640" y="0" width="560" height="860" fill="{c["slatgap"]}"/>')
    for sx in range(646, 1196, 26): a(f'<rect x="{sx}" y="0" width="18" height="860" fill="{c["slat"]}"/>')
    # 床
    a(f'<rect x="0" y="860" width="1920" height="220" fill="url(#flo{t})"/>')
    a(f'<rect x="0" y="856" width="1920" height="8" fill="{c["frame"]}" opacity=".35"/>')
    for fy in (905, 965, 1040): a(f'<rect x="0" y="{fy}" width="1920" height="2" fill="#000" opacity=".07"/>')
    # 左の造作棚（紺）と本
    a(f'<rect x="60" y="350" width="520" height="510" fill="{c["shelf"]}"/>')
    tops = [370, 490, 610, 730]
    for ty in tops:
        a(f'<rect x="78" y="{ty}" width="484" height="104" fill="{c["shelfin"]}"/>')
        if c['led']: a(f'<rect x="78" y="{ty}" width="484" height="40" fill="{c["led"]}" opacity=".16"/><rect x="78" y="{ty}" width="484" height="3" fill="{c["led"]}" opacity=".7"/>')
        x = 92 + r.randint(0, 40); end = 548
        while x < end - 20:
            if r.random() < .14:                      # 余白・小物
                kind = r.random()
                if kind < .5:
                    a(f'<ellipse cx="{x+22}" cy="{ty+92}" rx="20" ry="12" fill="{c["pot"]}"/><rect x="{x+6}" y="{ty+56}" width="32" height="36" rx="10" fill="{c["pot"]}"/>')
                else:
                    a(f'<circle cx="{x+20}" cy="{ty+82}" r="18" fill="none" stroke="#b8954f" stroke-width="4"/>')
                x += 70; continue
            n = r.randint(3, 8)
            for _ in range(n):
                if x > end - 20: break
                bw = r.randint(12, 24); bh = r.randint(66, 96)
                a(f'<rect x="{x}" y="{ty+104-bh}" width="{bw}" height="{bh}" fill="{r.choice(BOOKS[t])}"/>'); x += bw + 1
            x += r.randint(14, 40)
    # 低いサイドボード（人物の後ろでほぼ隠れる）
    a(f'<rect x="700" y="735" width="560" height="22" fill="{c["boardtop"]}"/><rect x="712" y="757" width="536" height="103" fill="{c["board"]}"/>')
    for bx in (890, 1070): a(f'<rect x="{bx}" y="765" width="2" height="88" fill="#000" opacity=".12"/>')
    if c['lamp']:
        a(f'<circle cx="1180" cy="640" r="230" fill="url(#glow{t})"/>')
    a(f'<rect x="1176" y="660" width="8" height="75" fill="#b8954f"/><path d="M1140 662 L1220 662 L1200 610 L1160 610 Z" fill="{c["lamp"] or "#f3ede2"}"/>')
    # 観葉植物（窓際）
    a(f'<path d="M1300 860 L1290 790 L1400 790 L1390 860 Z" fill="{c["pot"]}"/>')
    for ang, ln, col in [(-60, 300, 'leaf'), (-80, 360, 'leaf2'), (-100, 330, 'leaf'), (-120, 280, 'leaf2'), (-40, 240, 'leaf2'), (-140, 230, 'leaf'), (-70, 250, 'leaf')]:
        a(f'<g transform="translate(1345 795) rotate({ang})"><path d="M0 0 C {ln*.35} -{ln*.16}, {ln*.75} -{ln*.14}, {ln} 0 C {ln*.75} {ln*.14}, {ln*.35} {ln*.16}, 0 0 Z" fill="{c[col]}"/></g>')
    return ''.join(s)

f = pathlib.Path(__file__).with_name('zoom-backgrounds.html')
html = f.read_text()
block = ''.join(f'<template id="scene-{t}"><svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">{scene(t)}</svg></template>' for t in P)
html = re.sub(r'<!--OFFICE-->.*?<!--/OFFICE-->', lambda m: f'<!--OFFICE-->{block}<!--/OFFICE-->', html, flags=re.S)
f.write_text(html)
print('ok', len(block))
