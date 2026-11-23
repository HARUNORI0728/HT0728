import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const dialogue = read('../src/ui/dialogue.ts').replace(/^import .+$/gm, '').replace(/^export /gm, '');
const main = ts.createSourceFile('main.ts', read('../src/main.ts'), ts.ScriptTarget.Latest, true);
const names = new Set(['btn', 'replay', 'replaying']);
const gallery = main.statements.filter(statement => names.has(statement.name?.text ?? statement.declarationList?.declarations[0]?.name?.text));
assert.equal(gallery.length, names.size);
const script = ts.transpile([dialogue, ...gallery.map(statement => statement.getText(main))].join('\n'));

class Element {
  hidden = false;
  inert = false;
  onclick = null;
  scrollTop = 0;
  dataset = {};
  classList = { toggle() {}, remove() {}, add() {}, contains() { return false; } };
  children = new Map();

  querySelector(selector) {
    if (!this.children.has(selector)) this.children.set(selector, new Element());
    return this.children.get(selector);
  }

  contains(element) { return [...this.children.values()].includes(element); }
  removeAttribute() {}
  focus(options) { document.activeElement = this; this.lastFocusOptions = options; }
}

const elements = new Map();
const document = {
  activeElement: null,
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  },
  createElement: () => new Element(),
};
const screen = document.getElementById('camp'), dlg = document.getElementById('dlg');
const bgm = [];
const context = createContext({
  document, HTMLElement: Element, galleryMode: true, CHARS: {}, window: {},
  audio: { sfx() {}, bgm(track) { bgm.push(track); } },
  idForName: () => null, preloadPortrait() {}, portraitUrl: () => null, eventUrl: () => null,
});
runInContext(script, context);

let starts = 0, finishes = 0;
const pending = [];
const button = context.btn('鑑賞', () => pending.push(context.replay(async () => {
  starts++;
  await context.play([{ who: '', text: 'first' }, { who: '', text: 'second' }]);
  finishes++;
})));
screen.children.set('button', button);
button.focus();
screen.scrollTop = 80;

// Approximate the focused button's native Enter action, including the inert ancestor check.
const enter = () => { if (document.activeElement === button && !screen.inert) button.onclick(); };
enter();
assert.equal(screen.inert, true);
const advance = dlg.onclick;
enter();
assert.equal(pending.length, 1);
// A programmatic activation still needs the runtime guard.
button.onclick();
await pending[1];
assert.equal(starts, 1);
assert.equal(dlg.onclick, advance);
screen.scrollTop = 100;
document.activeElement = dlg;
dlg.onclick();
assert.equal(document.getElementById('dlgText').textContent, 'second');
dlg.onclick();
await pending[0];
assert.equal(finishes, 1);
assert.equal(screen.inert, false);
assert.equal(screen.scrollTop, 80);
assert.equal(document.activeElement, button);
assert.equal(button.lastFocusOptions.preventScroll, true);
assert.deepEqual(bgm, ['title']);

await assert.rejects(context.replay(async () => {
  screen.scrollTop = 10;
  document.activeElement = dlg;
  throw new Error('playback failed');
}), /playback failed/);
assert.equal(screen.inert, false);
assert.equal(screen.scrollTop, 80);
assert.equal(document.activeElement, button);

context.galleryMode = false;
enter();
assert.equal(starts, 2);
dlg.onclick();
dlg.onclick();
await pending[2];
assert.equal(finishes, 2);
assert.deepEqual(bgm, ['title', 'title', 'camp']);

screen.inert = true;
await context.replay(async () => {});
assert.equal(screen.inert, true);
console.log('Gallery replay re-entry and cleanup checks passed.');
