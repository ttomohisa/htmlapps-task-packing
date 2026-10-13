// Static source/artifact and handler contracts; native layout/focus need browser QA.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.resolve(__dirname, process.env.TASK_PACKING_HTML || '../src/index.template.html'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\/\*[\s\S]*?\*\//g, '');

test('native modal state locks both document scroll containers', () => {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const selector of ['html:has(dialog:modal)', 'body:has(dialog:modal)']) {
    const declarations = rules.filter(([, selectors]) => selectors.split(',').some(value => value.trim() === selector))
      .map(([, , body]) => body).join(';');
    assert.match(declarations, /(?:^|;)\s*overflow\s*:\s*hidden\s*(?:;|$)/, `${selector} must prevent background wheel scrolling only while modal`);
  }
});

test('dialogs preserve their bounded scrolling card and sticky header', () => {
  assert.match(css, /\.dialog-card\s*\{[^}]*max-height:\s*min\(760px,\s*calc\(100vh - 34px\)\);[^}]*overflow:\s*auto;/);
  assert.match(css, /\.dialog-head\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/);
  for (const id of ['helpDialog', 'taskDialog', 'taskDetailDialog', 'appConfirmDialog']) assert.match(html, new RegExp(`<dialog id="${id}" aria-labelledby=`));
});

test('initial version labels match release configuration', () => {
  assert.equal(html.match(/id="versionBadge">([^<]+)/)[1], `v${config.version}`);
  assert.equal(html.match(/id="buildVersion">([^<]+)/)[1], config.version);
});

test('Help omits implementation commentary and retains user instructions', () => {
  const help = html.match(/<!-- APP:HELP:BEGIN -->([\s\S]*?)<!-- APP:HELP:END -->/)[1];
  assert.match(help, /data-i18n="helpStep1"/);
  assert.doesNotMatch(help, /data-i18n="(?:helpLanguage|helpDialogScroll)"/);
  assert.doesNotMatch(html, /helpDialogScroll:'[^']*背景[^']*スクロール[^']*'/);
  assert.doesNotMatch(html, /helpDialogScroll:'[^']*background[^']*scroll[^']*'/);
});

test('local-processing badge keeps its existing shield', () => {
  const badge = html.match(/<span class="local-badge">([\s\S]*?)<\/svg>/)[1];
  assert.match(badge, /<path d="M12 3 5 6v5c0 4\.6 2\.8 8\.1 7 10 4\.2-1\.9 7-5\.4 7-10V6z"/);
});

function confirmation() {
  const nodes = new Map();
  class Element {
    constructor() { this.listeners = {}; this.open = false; this.isConnected = true; this.classList = { toggle() {} }; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    click(extra = {}) { for (const fn of this.listeners.click || []) fn({ target: this, currentTarget: this, clientX: 0, clientY: 0, detail: 0, ...extra }); }
    showModal() { this.open = true; }
    close() { this.open = false; }
    focus() { document.activeElement = this; }
    getBoundingClientRect() { return { left: 10, right: 500, top: 10, bottom: 500 }; }
  }
  const document = { activeElement: new Element() };
  const $ = selector => { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); };
  const context = vm.createContext({ $, document, HTMLElement: Element, requestAnimationFrame: fn => fn(), t: key => key });
  const production = html.split('\n').find(line => line.startsWith('      const AppConfirm='));
  assert.ok(production, 'Production confirmation component is present');
  vm.runInContext(production + '\nglobalThis.ask = AppConfirm.ask;', context);
  return { $, ask: context.ask };
}

for (const [id, expected] of [['#appConfirmOk', true], ['#appConfirmCancel', false], ['#appConfirmClose', false]]) {
  test(`keyboard activation of ${id} keeps its result after the click bubbles`, async () => {
    const app = confirmation(), result = app.ask(), child = app.$(id), dialog = app.$('#appConfirmDialog');
    child.click();
    dialog.click({ target: child });
    assert.equal(await result, expected);
    assert.equal(dialog.open, false);
  });
}

test('a direct outside click still cancels confirmation', async () => {
  const app = confirmation(), result = app.ask();
  app.$('#appConfirmDialog').click({ detail: 1 });
  assert.equal(await result, false);
});
