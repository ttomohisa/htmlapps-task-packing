// Real navigation handler with controlled layout geometry; native scrolling needs browser QA.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const html = readFileSync(resolve(__dirname, process.env.TASK_PACKING_HTML || '../src/index.template.html'), 'utf8');
const mobileCss = html.slice(html.indexOf('@media (max-width:600px) {'), html.indexOf('@media (prefers-reduced-motion'));

test('Japanese headline is concise in initial markup and translation', () => {
  assert.match(html, /data-i18n="introTitle">やることをキャパの中に収める<\/h2>/);
  assert.match(html, /introTitle:'やることをキャパの中に収める'/);
  assert.doesNotMatch(html, /やることを、キャパの中に収める。/);
});

test('Help removes language and dismissal boilerplate in both languages', () => {
  assert.doesNotMatch(html, /helpLanguage|helpDialogScroll/);
  assert.match(html, /data-i18n="helpPrivacyBody"/);
  assert.match(html, /data-i18n="helpNoteStorage"/);
});

test('mobile hides the app footer and exposes a Board Add button', () => {
  assert.match(mobileCss, /(?:^|\n)\s*footer\s*\{\s*display:none;\s*\}/);
  const board = html.slice(html.indexOf('id="boardPage"'), html.indexOf('id="settingsPage"'));
  assert.match(board, /id="boardAddTaskButton"[^>]*type="button"/);
  assert.match(html, /\.mobile-board-add\s*\{\s*display:none;/);
  assert.match(mobileCss, /\.mobile-board-add\s*\{\s*display:inline-flex;/);
  assert.match(board, /data-i18n="addTask"/);
});

test('short mobile pages use the current viewport height, including collapsed browser chrome', () => {
  assert.match(mobileCss, /\.app-mobile-page\s*\{[^}]*min-height:calc\(100dvh - var\(--header-height\) - var\(--mobile-bar-height\) - env\(safe-area-inset-bottom\) - 24px\);/);
});

function boot({ mobile = true, reducedMotion = false, scrollY = 460, headerHeight = 67 } = {}) {
  const pages = ['tasksPage', 'boardPage', 'historyPage', 'settingsPage'].map((id, index) => {
    const classes = new Set(['app-mobile-page', ...(index === 0 ? ['is-mobile-active'] : [])]);
    return { id, classList: { contains: key => classes.has(key), toggle(key, enabled) { if (enabled) classes.add(key); else classes.delete(key); } }, getBoundingClientRect: () => ({ top: 174 - window.scrollY }) };
  });
  const buttons = pages.map(page => ({ dataset: { page: page.id }, classList: { toggle() {} } }));
  const calls = [];
  const window = { scrollY, matchMedia: query => ({ matches: query.includes('max-width') ? mobile : reducedMotion }), scrollTo(options) { calls.push({ ...options }); this.scrollY = options.top; } };
  const $ = selector => selector === '.app-header' ? { getBoundingClientRect: () => ({ height: headerHeight }) } : pages.find(page => `#${page.id}` === selector);
  const $$ = selector => selector === '.app-mobile-page' ? pages : buttons;
  const context = vm.createContext({ window, $, $$, renderBulkControls() {} });
  const source = html.split('\n').find(line => line.startsWith('      function showMobilePage('));
  assert.ok(source);
  vm.runInContext(source, context);
  return { pages, calls, show: id => vm.runInContext(`showMobilePage(${JSON.stringify(id)})`, context) };
}

for (const reducedMotion of [false, true]) test(`mobile tabs target the active frame below the measured header (reduced motion: ${reducedMotion})`, () => {
  const app = boot({ reducedMotion });
  for (const id of ['boardPage', 'historyPage', 'settingsPage', 'tasksPage', 'boardPage']) {
    app.show(id);
    assert.deepEqual(app.pages.filter(page => page.classList.contains('is-mobile-active')).map(page => page.id), [id]);
    assert.deepEqual(app.calls.at(-1), { top: 99, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
});

test('mobile target adapts to a taller header and clamps at zero', () => {
  const app = boot({ headerHeight: 100 }); app.show('boardPage'); assert.equal(app.calls[0].top, 66);
  const tall = boot({ headerHeight: 190 }); tall.show('boardPage'); assert.equal(tall.calls[0].top, 0);
});

test('desktop keeps its layout and does not scroll for mobile navigation', () => {
  const app = boot({ mobile: false }); app.show('boardPage');
  assert.equal(app.calls.length, 0);
  assert.equal(app.pages[0].classList.contains('is-mobile-active'), true);
});

test('locale changes keep declared title sizing and allow normal zoom', () => {
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.match(css, /html\s*\{[^}]*-webkit-text-size-adjust:100%;[^}]*text-size-adjust:100%;/);
  assert.match(html, /<h1 class="brand-name" lang="en">/);
  assert.match(css, /\.brand-name\s*\{[^}]*font-size:17px;[^}]*line-height:1\.2;/);
  assert.match(mobileCss, /\.brand-name\s*\{\s*font-size:15px;/);
  assert.match(mobileCss, /\.page-intro h2\s*\{\s*font-size:20px;/);
  const viewport = html.match(/<meta name="viewport"[^>]*>/)[0];
  assert.doesNotMatch(viewport, /user-scalable\s*=\s*(?:no|0)|maximum-scale|minimum-scale/);
  assert.doesNotMatch(css, /text-size-adjust:\s*none/);
  assert.doesNotMatch(css, /(?:\[lang[^\]]*\]|:lang\([^)]*\))[^{}]*\{[^}]*font-size/);
});

test('Help leads with three concise add/place/complete steps in both languages', () => {
  const help = html.match(/<!-- APP:HELP:BEGIN -->([\s\S]*?)<!-- APP:HELP:END -->/)[1];
  const steps = help.match(/<ol class="help-steps">([\s\S]*?)<\/ol>/);
  assert.ok(steps, 'Help needs a short, clearly separated primary flow');
  assert.equal([...steps[1].matchAll(/<li>/g)].length, 3);
  const context = vm.createContext({});
  vm.runInContext(html.slice(html.indexOf('const translations='), html.indexOf('const $=')) + '\nglobalThis.copy=translations;', context);
  for (const language of ['ja', 'en']) {
    const copy = context.copy[language];
    for (let index = 1; index <= 3; index++) {
      assert.ok(copy[`helpStep${index}Title`]);
      assert.ok(copy[`helpStep${index}`].length <= (language === 'ja' ? 50 : 100), `${language} step ${index} should be readable at a glance`);
    }
    assert.match(copy.helpStep3, language === 'ja' ? /✓.*元に戻す/ : /✓.*Undo/);
    assert.match(copy.helpStep2, language === 'ja' ? /タスク一覧.*まとめて配置/ : /Place multiple.*task list/);
    assert.match(copy.helpNoteCapacity, language === 'ja' ? /収まらないタスク/ : /tasks that no longer fit/);
    assert.match(copy.helpNoteStorage, /JSON/);
    assert.match(copy.helpNoteUrl, language === 'ja' ? /暗号化されません/ : /not encrypted/);
    assert.match(copy.helpNoteDestructive, language === 'ja' ? /元に戻せません/ : /cannot be undone/);
    assert.match(copy.helpTaskLimit, /500/);
    const visible = [...help.matchAll(/data-i18n="([^"]+)"/g)].map(([, key]) => copy[key]).join(' ');
    assert.ok(visible.length < (language === 'ja' ? 620 : 1350), 'Do not move the old prose into another wall of text');
    assert.doesNotMatch(visible, /CSP|schema|stale|世代|ID重複|古い読み込み結果/);
  }
});
