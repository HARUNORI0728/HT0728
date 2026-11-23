import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';

// Run the game's persistence and ending functions with fresh page state on each reload.
const source = ts.createSourceFile(
  'main.ts', readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true,
);
const names = new Set([
  'save', 'normalize', 'load', 'loadClear', 'recordClear', 'newEndingId', 'fin', 'runStats',
  'validDiff', 'validStash', 'validUnit', 'markSeen', 'playEnding', 'pendingFinale', 'goNext',
]);
const functions = source.statements.filter(statement => (
  names.has(statement.name?.text ?? statement.declarationList?.declarations[0]?.name?.text)
));
assert.equal(functions.length, names.size);
const { outputText } = ts.transpileModule(functions.map(statement => statement.getText(source)).join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
});

const SAVE = 'fittoa-save-v6';
const CLEAR_KEY = 'fittoa-clear';
const fixture = {
  v: 6,
  battle: null,
  camp: { next: 10, cleared: 10, roster: [], bonds: {}, difficulty: 'casual', gold: 123, stash: ['sword'] },
  seen: ['outro'],
};
const seenAfterEnding = ['outro', 'ending', 'after.one'];

function setup(camp = fixture.camp, clear) {
  const storage = new Map([[SAVE, JSON.stringify({ ...fixture, camp })]]);
  if (clear) storage.set(CLEAR_KEY, JSON.stringify(clear));
  let nextId = 0;
  const visits = [];

  function reload({ credits = async () => {}, rejectWrite = () => false } = {}) {
    const page = createContext({
      SAVE, SAVE_V5: 'v5', SAVE_V4: 'v4', SAVE_V3: 'v3', SAVE_V2: 'v2', SAVE_V1: 'v1', CLEAR_KEY,
      crypto: { getRandomValues(words) { words[0] = ++nextId; return words; } },
      localStorage: {
        getItem(key) { return storage.get(key) ?? null; },
        setItem(key, value) {
          if (rejectWrite(key, JSON.parse(value))) throw new Error('Storage write failed');
          storage.set(key, value);
        },
      },
      SCHOOLS: [], CANDIDATES: [], WEAPONS: { sword: {} }, ITEMS: {},
      camp: null, inBattle: false, seen: [], endingLog: [],
      chapterDef: index => index === 9 ? { ending: true, outro: 'outro' } : undefined,
      ensureMarried() {}, initBonds: bonds => bonds, marriedTo: () => [], validTent() {},
      endingSequence: () => [{ id: 'ending' }, { id: 'after.one', title: 'One' }],
      async play() {}, async banner() {}, cueBgm() {}, credits,
      showTitle() {}, $: () => ({}),
      async playScene() { visits.push('outro'); },
      async supportTalks() { visits.push('supports'); },
    });
    runInContext(outputText + `
      const restored = load();
      camp = restored.camp;
      seen = restored.seen;
      globalThis.isPending = pendingFinale;
    `, page);
    return page;
  }

  return {
    reload,
    visits,
    save: () => JSON.parse(storage.get(SAVE)),
    clear: () => JSON.parse(storage.get(CLEAR_KEY) ?? 'null'),
  };
}

// Reload during credits, then fail the camp write after the clear record is committed.
{
  const game = setup();
  let markCreditsOpened;
  const arrivedAtCredits = new Promise(resolve => { markCreditsOpened = resolve; });
  const firstPage = game.reload({
    credits() {
      markCreditsOpened();
      return new Promise(() => {}); // The old page is abandoned when credits open.
    },
  });
  const ending = firstPage.playEnding(true);
  await Promise.race([arrivedAtCredits, ending.then(() => assert.fail('Ending finished before opening credits'))]);
  const pending = game.save();
  assert.ok(pending.camp.endingId);
  assert.equal(pending.camp.ended, undefined);
  assert.deepEqual(pending.seen, seenAfterEnding);
  assert.equal(game.clear(), null);

  const retry = game.reload({ rejectWrite: (key, value) => key === SAVE && value.camp.ended });
  assert.equal(retry.isPending(), true);
  await retry.goNext();
  assert.deepEqual(game.visits, []);
  assert.equal(game.save().camp.ended, undefined);
  const clear = game.clear();
  assert.equal(clear.runs.length, 1);
  assert.equal(clear.runs[0].endingId, pending.camp.endingId);
  assert.deepEqual(clear.seen, seenAfterEnding);
  assert.equal(clear.gold, 123);
  assert.deepEqual(clear.stash, ['sword']);

  const restored = game.reload();
  assert.equal(restored.isPending(), false);
  assert.equal(restored.camp.ended, true);
  await restored.playEnding(false);
  await restored.playEnding(true);
  assert.deepEqual(game.clear(), clear);
  assert.equal(game.save().camp.ended, true);
}

// An existing v1 record has no ending ID. Keep it and the legacy camp intact.
const legacyCamp = { ...fixture.camp, ended: true };
{
  const history = {
    v: 1,
    runs: [{ date: '2026-11-01', married: [], difficulty: 'casual', hard: false, turns: 20, falls: 0, round: 1 }],
    seen: ['ending'],
    gold: 456,
    stash: [],
  };
  const game = setup(legacyCamp, history);
  assert.equal(game.reload().isPending(), false);
  assert.deepEqual(game.clear(), history);
}

// Recover an unambiguous old interruption, including a failed attempt to write the clear record.
{
  const game = setup(legacyCamp);
  const retry = game.reload({ rejectWrite: key => key === CLEAR_KEY });
  assert.equal(retry.isPending(), true);
  await retry.goNext();
  assert.equal(game.save().camp.ended, undefined);
  assert.equal(game.clear(), null);
  await game.reload().goNext();
  assert.deepEqual(game.visits, []);
  assert.equal(game.clear().runs.length, 1);
  assert.equal(game.save().camp.ended, true);
}

console.log('Ending persistence regression checks passed.');
