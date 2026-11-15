import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({entryPoints:['src/audio/map-track.ts'],bundle:true,format:'esm',write:false});
const {chooseMapTrack: track} = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
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
console.log('PASS: boss phase transitions, defeat fallback, stage overrides, custom enemy theme, chapter boundaries (static selection, not listening)');
