import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({entryPoints:['src/audio/map-track.ts'],bundle:true,format:'esm',write:false});
const {chooseMapTrack: track, openingTrack, engagedBoss, restoresMapTrack} = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
// A surviving boss must not lock the enemy phase to its theme.
assert.deepEqual(['blue','red','blue'].map(p=>track(9,p,true)),['boss','map_enemy','boss']);
assert.equal(track(9,'blue',false),'map_final'); // defeat/retreat clears caller's engaged flag
// Stage-specific choices survive phase changes, including the final chapter's two parts.
const hold={blue:'orsted',red:'map_enemy',boss:'orsted'};
assert.deepEqual(['blue','red'].map(p=>track(10,p,false,hold)),['orsted','map_enemy']);
const final={blue:'map_final',boss:'final_boss'};
assert.deepEqual(['blue','red','blue'].map(p=>track(10,p,true,final)),['final_boss','map_enemy','final_boss']);
assert.equal(track(5,'red',true,{red:'crisis',boss:'boss'}),'crisis');
for(const [chapter,expected] of [[1,'map_dawn'],[3,'map_dawn'],[4,'map_resolve'],[7,'map_resolve'],[8,'map_final'],[10,'map_final']]) assert.equal(track(chapter,'blue',false),expected);
// Conversation openings request one track only: the scene's cue, or the fallback when it has none (never both).
assert.equal(openingTrack('comedy','daily'),'comedy'); // 炊き出し当番: camp → comedy, not camp → daily → comedy
assert.equal(openingTrack('camp','daily'),'camp'); // 決戦前夜: camp stays camp (the engine skips a same-track request)
assert.equal(openingTrack(undefined,'romance'),'romance');
assert.equal(openingTrack('none','daily'),null);
// 第6章オーベール: no bossFight talk; after reloading a mid-chapter save the page's engaged set is empty, but the saved intro flag counts.
const aubert={uid:31,team:'red',boss:'オーベール',hp:20,left:false};
assert.equal(engagedBoss([aubert],{},new Set()),false);
assert.equal(engagedBoss([aubert],{'intro:31':true},new Set()),true);
assert.equal(track(6,'blue',engagedBoss([aubert],{'intro:31':true},new Set())),'boss');
assert.equal(engagedBoss([{...aubert,hp:0}],{'intro:31':true},new Set()),false); // a fallen boss gives the map its track back
assert.equal(engagedBoss([{...aubert,left:true}],{'intro:31':true},new Set()),false);
assert.equal(engagedBoss([aubert],{},new Set([31])),true);
assert.equal(engagedBoss([aubert],{},new Set(),()=>true),true);
// 第10章 使徒: a defeat talk that decides the battle (win) does not bring the map track back before the victory jingle.
assert.equal(restoresMapTrack('win'),false); assert.equal(restoresMapTrack('lose'),false);
assert.equal(restoresMapTrack(null),true); assert.equal(restoresMapTrack('stage'),true);
console.log('PASS: conversation opening (one request), reloaded boss engagement, no map track after a deciding talk');
console.log('PASS: boss phase transitions, defeat fallback, stage overrides, custom enemy theme, chapter boundaries (static selection, not listening)');
