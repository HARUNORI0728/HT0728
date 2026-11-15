
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import {build} from 'esbuild';
const source = `
import { CAST, CLASSES, TERRAIN, WEAPONS, chapterDef, moveCost } from './src/data';
import * as L from './src/logic';
import { SCENES } from './src/script/scenes';
export { CAST, CLASSES, TERRAIN, WEAPONS, chapterDef, moveCost, L, SCENES };
`;
const out = await build({ bundle: true, write: false, platform: 'node', format: 'esm', stdin: { contents: source, resolveDir: process.cwd() } });
const {CAST, CLASSES, TERRAIN, WEAPONS, chapterDef, moveCost, L, SCENES} = await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
const rng = seed => () => ((seed = (Math.imul(seed,1664525)+1013904223) >>> 0) / 2**32);
function checkLayout(index) {
  const c = chapterDef(index);
  assert.equal(c.map.length,16);
  assert(c.map.every(r=>r.length===24 && [...r].every(t=>TERRAIN[t])));
  const groups = [
    [...c.players, ...c.slots, ...c.enemies],
    ...c.reinforce.map(r=>r.units),
    [...c.stages[0].allies,...c.stages[0].enemies],
    ...(c.stages[0].reinforce ?? []).map(r=>r.units),
  ];
  for(const group of groups) {
    assert.equal(new Set(group.map(u=>L.key(u.x,u.y))).size,group.length);
    for(const d of group) {
      const u = d.cls ? L.makeEnemy(d,1) : L.makeUnit(d.id ?? 'rudeus');
      const s = L.newChapter(index); s.units = [u];
      u.x = d.x; u.y = d.y;
      assert(Number.isFinite(moveCost(s.map[u.y]?.[u.x],CLASSES[u.cls].mtype)),JSON.stringify(d));
      const x = c.players[0].x, y = c.players[0].y;
      assert(L.reachable(s,u,99,true).cost.has(L.key(x,y)), JSON.stringify(d));
      if (d.wps) for (const wid of d.wps) assert(L.usable(u).includes(wid) || L.staves(u).includes(wid), wid);
    }
  }
  for (const id of [c.intro,c.outro,c.interlude,...c.talks.map(t=>t.scene)].filter(Boolean)) assert(SCENES[id],id);
}
function roster(level, rnd) {
  return Object.keys(CAST).filter(id=>id!=='perugius').map(id=>{
    const u=L.makeUnit(id);
    while(L.effLv(u)<level && u.lv<20) L.addExp(u,100,rnd);
    return u;
  });
}
const pts=k=>{const [x,y]=k.split(',').map(Number);return {x,y};};
const pick=['zanoba','cliff','paul','ruijerd','sylphiette','ghislaine','roxy','perugius'];
function simulate(index, party, rnd, dedicatedFirst=false, bonds) {
  const c=chapterDef(index), picks=index===8 ? pick : ['zanoba','cliff','perugius','ruijerd','ghislaine','roxy','paul'];
  const s=L.newChapter(index,party,bonds,'casual',picks);
  const seen=[], stages=[], stg = ()=>L.stageOf(s);
  const mark=evs=>{for(const e of evs){s.flags[L.talkKey(e.scene)]=true; seen.push(e.scene);}};
  const talk=match=>mark(L.dueTalks(s,match));
  const strike=(u,v,w)=>{
    const skip=[];
    const ts=L.fightTalks(s,u,v,skip);
    for(const e of skip)s.flags[L.talkKey(e.scene)]=true;
    mark(ts);
    const strikes=L.fight(s,u,w,v,rnd);
    const me=u.team==='blue'?u:v, foe=me===u?v:u;
    if(me.hp>0){ L.addExp(me,L.expGain(me,foe,strikes),rnd); L.gainBonds(s,[u,v]); }
    for(const a of [u,v]){
      if(a.hp<=0 || a.retreated) talk(w=>w.type==='bossDefeat' && w.boss===L.bossId(a));
    }
  };
  const fort=team=>{
    for(const u of L.alive(s,team)) if (L.terrainAt(s,u.x,u.y).heal) u.hp=Math.min(u.st.hp,u.hp+Math.ceil(u.st.hp*.2));
  };
  function decide(u) {
    const foes=L.alive(s,'red'), friends=L.alive(s,'blue');
    const defend=index===8 && !stg(), survive=index===9 && !stg();
    const goal=stg() ? (index===8 ? {x:12,y:0}:{x:16,y:2}) : defend ? {x:12,y:13} : {x:8,y:6};
    const orsted=foes.find(v=>L.bossId(v)==='orsted');
    const campGuard=defend && u.id==='zanoba';
    const danger=foes.filter(v=>!v.tag).map(v=>[v,L.threatTiles(s,v)]);
    const assigned=survive && (u.id==='rudeus'||u.id==='eris');
    const bossPartner=index===8?'eris':'rudeus', pendingSpecial=!s.flags[L.talkKey('ch'+(index+1)+'.battle9')];
    const blueRanks= new Map(friends.map(friend=>[friend, friend.hp*0.55 + friend.st.def]));
    let best={score:-Infinity};
    for(const k of L.stopTiles(s,u)) {
      const p=pts(k), terrain=L.terrainAt(s,p.x,p.y); if(index===8 && stg() && u.id!=='rudeus' && L.dist(p,goal)===0)continue;
      if(campGuard && L.dist(u,goal)===0 && L.dist(p,goal)!==0)continue;
      if(defend && !campGuard && u.id!=='ariel' && L.dist(p,goal)===0)continue;
      let risk=0;
      for(const [v,tiles] of danger) {
        if(!tiles.has(k)) continue;
        const w=L.usable(v)[0];
        if(!w)continue;
        const f=L.forecast(s,v,w,{...u,...p});
        const d=f.a.dmg*(f.a.double?2:1)*f.a.hit/100 * (1+f.a.crit/50);
        risk += d*(v===orsted?1.65:.69);
      }
      const isFragile=['ariel','rudeus','sylphiette','eris'].includes(u.id)||u.guest;
      let score=terrain.avo*.07-risk*(isFragile?2.3:.72)-(risk>u.hp*.64 ? (isFragile?43:26):0);
      const nearing=L.dist(u,goal)-L.dist(p,goal);
      if(stg())score+=nearing*(u.id==='ariel'?0:u.id==='rudeus'&&index===8?3.0:2.1);
      else if(campGuard)score+=nearing*5;
      else if(defend)score+= (u.id==='ariel' ? -Math.max(0,14-p.y)*4 : -Math.abs(L.dist(p,goal)-3)*1.1);
      else score+=(u.id==='zanoba' ? (4-Math.abs(L.dist(p,{x:7,y:12})-1))*4 : (4-Math.abs(L.dist(p,{x:5,y:13})-2))*2);
      function update(value,action={}) { if(value>best.score)best={...p,...action,score:value}; }
      update(score);
      if(u.potions && u.hp <= u.st.hp-8)update(score+(u.hp < u.st.hp*.55 ? 19 : 6),{potion:true});
      for(const w of L.staves(u))for(const t of L.healTargets(s,u,w,p)) {
        const h=L.healAmount(u,w,t);
        update(score+Math.max(0,h-5)*(t.hp < t.st.hp*.5 ? 1.9:1.1),{heal:t,wid:w});
      }
      for(const t of foes)for(const w of L.usable(u)) {
        if(!L.inRange(WEAPONS[w],L.dist(p,t)))continue;
        const id=L.bossId(t);
        const special=id=== (index===8?'gall':'orsted') && u.id===bossPartner && pendingSpecial;
        const f=L.forecast(s,u,w,t,p);
        const dmg=f.a.dmg*(f.a.double?2:1), dealt=Math.min(t.hp,dmg)*f.a.hit/100;
        const returnDmg=f.d ? f.d.dmg*(f.d.double?2:1)*f.d.hit/100 : 0;
        const lethal=f.d && f.d.dmg*(f.d.double?2:1)>=u.hp;
        let value=dealt-returnDmg*.75-(lethal?35:0)+(dmg>=t.hp?15:0);
        if(t===orsted)value= (special?38:(!s.flags[L.talkKey('ch10.battle2')]?22:0)) - returnDmg - (lethal?55:0);
        if(id==='gall'&&special) value+=22; if(u.id==='ariel') value-=8;
        if(dedicatedFirst && ["gall","orsted"].includes(id) && pendingSpecial && !special) value-=50;
        if(t.tag)value+=10;
        if(id==='apostle' || id==='darius')value+=7;
        if(u.id==='eris' && !s.flags[L.talkKey('ch'+(index+1)+'.battle'+(index===8?'2':'3'))])value+=8;
        update(score+value,{target:t,wid:w});
      }
      if(index===8 && stg() && u.id==='rudeus' && L.dist(p,goal)===0)update(score+1000,{seize:true});
    }
    return best;
  }
  while(s.turn<=28) {
    fort('blue');
    talk(w=>w.type==='turn'&&w.turn===s.turn&&w.phase==='blue');
    for(const u of L.alive(s,'blue').sort((a,b)=>{
      const priority=v=>v.id==='zanoba' ? 4: v.id==='eris' ? 3: v.guest ? 2:0;
      return priority(b)-priority(a);
    })) {
      if(!L.onMap(u))continue;
      const p=decide(u);
      if(!Number.isFinite(p.score))continue;
      u.x=p.x;u.y=p.y;
      if(p.seize && L.canSeize(s,u))s.flags[L.seizeFlag(s)]=true;
      else if(p.target)strike(u,p.target,p.wid);
      else if(p.heal)L.addExp(u,L.healExp(L.heal(u,p.wid,p.heal)),rnd);
      else if(p.potion){u.potions--;u.hp=Math.min(u.st.hp,u.hp+L.POTION_HEAL);}
      const result=L.outcome(s); if(result && result!=='stage')return {result,s,seen,stages};
    }
    s.phase='red'; fort('red'); L.applyAiSwitch(s);
    const reds=L.alive(s,'red'), waves=[];
    L.spawnReinforcements(s,waves);
    talk(w=>w.type==='reinforce'&&(w.stage??0)===stg()&&[w.wave].flat().some(n=>waves.includes(n)));
    for(const u of reds) {
      if(!L.onMap(u))continue;
      const p=L.planEnemy(s,u);
      u.x=p.x;u.y=p.y;
      if(p.target)strike(u,p.target,p.wid);
      else if(p.heal)L.heal(u,p.wid,p.heal);
      else if(p.potion){u.potions--;u.hp=Math.min(u.st.hp,u.hp+L.POTION_HEAL);}
      const result=L.outcome(s); if(result && result!=='stage')return {result,s,seen,stages};
    }
    s.turn++;s.phase='blue';
    const result=L.outcome(s);
    if(result==='stage'){
      stages.push(s.turn);
      L.advanceStage(s);
      talk(w=>w.type==='stageStart' && w.stage===stg());
    } else if(result)return {result,s,seen,stages};
  }
  return {result:'timeout',s,seen,stages};
}
for(const i of [8,9])checkLayout(i);
const n=Number(process.argv[2] ?? 12);
const report = { seeds: n, method: 'Rule-level simulation; normal addExp growth to scenario entry levels; not a chapter 1–10 campaign or UI playthrough', chapters: [], linked: [] };
for(const i of [8,9]) {
  const counts={}, seen=new Set(), turns=[], falls={};
  for(let seed=1;seed<=n;seed++){
    const r=rng(seed*101);
    const sim=simulate(i,roster(process.argv[3]==='base'?0:i===8?13:15,r),r);
    const {result,s,stages}=sim; counts[result]=(counts[result]??0)+1;
    if(result==='win') turns.push(s.turn);
    sim.seen.forEach(scene=>seen.add(scene));
    const loss=s.units.filter(u=>u.team==='blue'&&u.hp<=0).map(u=>u.id);
    for (const unit of loss) falls[unit]=(falls[unit]??0)+1;
    if(result==='win') assert.deepEqual(stages,[7]);
  }
  console.log(i+1, counts, turns.sort((a,b)=>a-b), [...seen].sort(), falls);
  for (const t of chapterDef(i).talks) assert(seen.has(t.scene), 'Uncovered battle scene: '+t.scene);
  report.chapters.push({ chapter: i+1, counts, winningTurns: turns, triggeredBattleScenes: [...seen].sort(), falls });
}
for (let seed=1; seed<=6; seed++) {
  const r=rng(seed*101), first=simulate(8,roster(13,r),r);
  if(first.result !== 'win') { report.linked.push({seed, chapter9:first.result}); continue; }
  const second=simulate(9,L.rosterOf(first.s),r,false,first.s.bonds);
  report.linked.push({seed,chapter9:'win',chapter10:second.result,turns:[first.s.turn,second.s.turn]});
}
assert(report.linked.some(r=>r.chapter10==='win'), 'No linked chapter 9→10 clear');
writeFileSync('design/review-board/q01-simulation-results.json',JSON.stringify(report,null,2)+'\n');
console.log('Linked chapter 9→10:',report.linked);
