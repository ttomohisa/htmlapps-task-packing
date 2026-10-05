// Dependency-free tests exercise the real task/detail/form/storage functions and wiring.
// This small DOM adapter does not verify native dialogs, layout, or browser focus behavior.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const html = readFileSync(resolve(__dirname, process.env.TASK_PACKING_HTML || '../src/index.template.html'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const task = (overrides = {}) => ({ id: 'original', title: '週次レビュー', note: 'Review <draft> & next steps\n確認', w: 2, h: 1, row: 0, col: 0, important: true, sample: false, createdAt: 1000, ...overrides });
const saved = (tasks = [task()], history = []) => ({ version: 1, board: { rows: 9, cols: 9 }, tasks, history });

function boot(input = saved(), language = 'en', { lists = false, mobile = false } = {}) {
  const nodes = new Map(), all = [];
  let stored = JSON.stringify(input), nextId = 0, now = 100000, toast = null;
  class Element {
    constructor() { this.children = []; this.attributes = {}; this.className = ''; this.value = ''; this.checked = false; this.hidden = false; this.open = false; this.dataset = {}; this.style = { setProperty(key, value) { this[key] = value; } }; this.listeners = {}; this.textContent = ''; this.selectionStart = 0; this.selectionEnd = 0; const classes = new Set(); this.classList = { toggle: (key, on) => on ? classes.add(key) : classes.delete(key), add: (...keys) => keys.forEach(key => classes.add(key)), remove: (...keys) => keys.forEach(key => classes.delete(key)), contains: key => classes.has(key) }; }
    querySelector(selector) { assert.ok(selector.startsWith('.') && this.innerHTML?.includes(selector.slice(1)), `Missing child ${selector}`); return new Element(); }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key]; }
    replaceChildren() { this.children = []; }
    append(child) { this.children.push(child); }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    dispatch(type, extra = {}) { const event = { target: this, currentTarget: this, preventDefault() { this.defaultPrevented = true; }, ...extra }; for (const fn of this.listeners[type] || []) fn(event); if (type === 'cancel' && !event.defaultPrevented) this.close(); }
    showModal() { assert.equal(nodes.get('taskDialog')?.open || nodes.get('taskDetailDialog')?.open, false, 'Only one task dialog may be open'); this.open = true; }
    close() { this.open = false; this.dispatch('close'); }
    focus() { document.activeElement = this; }
    select() { this.focus(); this.selectionStart = 0; this.selectionEnd = String(this.value).length; }
    getBoundingClientRect() { return { left: 10, right: 500, top: 10, bottom: 500 }; }
  }
  for (const match of html.matchAll(/<[^!\/][^>]*>/g)) {
    const tag = match[0], el = new Element();
    const className = tag.match(/\bclass="([^"]+)"/); if (className) { el.className = className[1]; el.classList.add(...className[1].split(/\s+/)); }
    for (const attr of tag.matchAll(/(aria-[\w-]+)="([^"]+)"/g)) el.setAttribute(attr[1], attr[2]);
    const id = tag.match(/\bid="([^"]+)"/); if (id) nodes.set(id[1], el);
    for (const attr of tag.matchAll(/data-([\w-]+)="([^"]+)"/g)) el.dataset[attr[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = attr[2];
    if (/\bhidden(?:\s|>)/.test(tag)) el.hidden = true;
    all.push(el);
  }
  const document = { activeElement: null, body: new Element(), documentElement: {}, createElement: () => new Element(), querySelectorAll: selector => $$(selector) };
  const $ = selector => { const el = selector === '#sizePresets .size-preset[data-custom]' ? all.find(el => el.dataset.custom) : nodes.get(selector.slice(1)); assert.ok(el, `Missing DOM node ${selector}`); return el; };
  const $$ = selector => all.filter(el => { if (selector.includes('.size-preset')) return selector.includes('[data-w]') ? el.dataset.w : selector.includes('[data-custom]') ? el.dataset.custom : el.dataset.w || el.dataset.custom; if (selector.startsWith('.filter-chip')) return el.classList.contains('filter-chip') && (!selector.includes('[data-filter]') || el.dataset.filter); if (selector === '.task-view-button') return el.classList.contains('task-view-button'); const attr = selector.match(/^\[data-([\w-]+)\]$/); return attr ? el.dataset[attr[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase())] !== undefined : false; });
  const context = vm.createContext({ $, $$, document, Date: class extends Date { static now() { return ++now; } }, crypto: { randomUUID: () => `copy-${++nextId}` }, requestAnimationFrame: fn => fn(), window: { matchMedia: () => ({ matches: mobile }) }, localStorage: { getItem: key => key === 'task-packing:state-v1' ? stored : null, setItem: (key, value) => { if (key === 'task-packing:state-v1') stored = value; } }, AppConfirm: { ask: async () => true }, showToast: (message, options = {}) => { toast = { message, ...options }; }, APP_CONFIG: { name: 'Task Packing', nameJa: 'Task Packing' }, renderAll() {}, renderTaskList() {}, renderMiniBoard() {}, renderMiniBoardButton() {}, renderHistory() {}, renderBoard() {}, renderSettings() {}, renderPanelCollapse() {}, renderBulkControls() {}, endDrag() {}, detectLanguage: () => language, resetDragState() {}, setBulkMode() {}, AppToast: { dismiss() { toast=null; } }, location: { hash: '' }, clearBackupHash() {}, supportsCompressedUrlBackup: () => true, decodeBackupPayload: async () => ({}), console });
  const functions = ['t','readStorage','writeStorage','sampleBlueprintIndex','migrateLegacySamples','normalizeState','clampInt','saveState','snapshot','restoreSnapshot','uid','isPlaced','getTask','area','occupancy','canPlace','sanitizePlacements','getDetailTask','openTaskDetail','closeTaskDetail','renderTaskDetail','escapeHtml','isPresetSize','setCustomSizeVisible','openTaskDialog','closeTaskDialog','updateSizePresetState','submitTask','completeTask','restoreCompletedTask','hasSampleData','clearSampleData','backupData','importBackup','duplicateTask','undoMiniCompletion','validateBackup','applyBackupState','restoreBackupFromUrl','resetAll','reorderTask','moveTaskToEnd'];
  if (lists) functions.push('renderBoard','largestFreeRectangle','renderTaskList','renderTaskFilters','renderAll','renderBulkControls','setBulkMode','toggleBulkTask','setTaskViewMode','applyLanguage');
  const lines = html.split('\n');
  const source = functions.map(name => { const start = lines.findIndex(line => new RegExp(`^      (?:async )?function ${name}\\(`).test(line)); if (start < 0) return ''; let end = start + 1; if (name === 'renderTaskList' || name === 'renderBoard') while (end < lines.length && !/^      (?:async )?function /.test(lines[end])) end++; return lines.slice(start, end).join('\n'); }).join('\n');
  const translations = html.slice(html.indexOf('const translations='), html.indexOf('const $='));
  vm.runInContext(`${translations}\nlet language=${JSON.stringify(language)},state=${JSON.stringify(input)},editingTaskId=null,detailTaskId=null,detailSource='task',detailOpenedAt=0,lastMiniCompletedId=null,lastMiniCompletedTask=null,bulkSelectedIds=new Set(),backupRestoreGeneration=0;const storageKey='task-packing:state-v1',languageKey='task-packing:language',taskViewKey='task-packing:task-list-view';\n${lines.find(line => line.startsWith('      const initialState='))}\n${source}\n${lines.filter(line => /^      let (?:filter|importantOnly|taskViewMode|bulkMode|lastMiniCompletedIndex)=/.test(line)).join('\n')}\nstate=normalizeState(state);`, context);
  for (const line of lines.filter(line => line.trimStart().startsWith("$('#addTaskButton').addEventListener") || line.trimStart().startsWith("$('#taskForm').addEventListener") || line.trimStart().startsWith("$('#taskDetailClose').addEventListener") || line.trimStart().startsWith("$('#taskDetailDuplicate').addEventListener") || line.trimStart().startsWith("$('#taskDialog').addEventListener"))) vm.runInContext(line, context);
  const run = code => vm.runInContext(code, context);
  if (lists) {
    for (const line of lines.filter(line => line.trimStart().startsWith("$('#taskSearch').addEventListener") || line.trimStart().startsWith("$('#importantFilterButton').addEventListener"))) run(line);
    run('renderAll()');
  }
  return { el: id => nodes.get(id), document, run, chips: () => all.filter(el => el.dataset.filter), visible: () => nodes.get('taskList').children.filter(el => el.dataset.taskId).map(el => el.dataset.taskId), state: () => plain(run('state')), stored: () => JSON.parse(stored), toast: () => toast,
    duplicate(id = 'original', source = 'task') { run(`openTaskDetail(${JSON.stringify(id)},${JSON.stringify(source)})`); const button = nodes.get('taskDetailDuplicate'); assert.ok(button, 'Details must contain a Duplicate button'); button.dispatch('click'); },
    submit() { nodes.get('taskForm').dispatch('submit'); }, undo() { assert.equal(typeof toast?.onAction, 'function'); toast.onAction(); },
  };
}

for (const source of ['placed', 'unplaced', 'history']) test(`Duplicate ${source} opens a selected, prefilled Add draft without mutations`, () => {
  const original = source === 'history' ? task({ row: undefined, col: undefined, completedAt: 5000 }) : task({ row: source === 'placed' ? 0 : null, col: source === 'placed' ? 0 : null });
  const app = boot(source === 'history' ? saved([], [original]) : saved([original])); const before = app.state(), storageBefore = app.stored();
  app.duplicate('original', source === 'history' ? 'history' : 'task');
  assert.equal(app.el('taskDetailDialog').open, false); assert.equal(app.el('taskDialog').open, true);
  assert.equal(app.el('taskDialogTitle').textContent, 'Add task');
  assert.equal(app.el('taskTitleInput').value, original.title); assert.equal(app.el('taskNoteInput').value, original.note);
  assert.equal(Number(app.el('taskWidthInput').value), original.w); assert.equal(Number(app.el('taskHeightInput').value), original.h); assert.equal(app.el('taskImportantInput').checked, true);
  assert.equal(app.document.activeElement, app.el('taskTitleInput')); assert.equal(app.el('taskTitleInput').selectionEnd, original.title.length);
  assert.deepEqual(app.state(), before); assert.deepEqual(app.stored(), storageBefore);
  app.submit(); const after = app.state(), copy = after.tasks.at(-1);
  assert.notEqual(copy.id, original.id); assert.ok(copy.createdAt > original.createdAt); assert.equal(copy.row, null); assert.equal(copy.col, null); assert.equal(copy.sample, false); assert.equal(copy.completedAt, undefined);
  for (const key of ['title','note','w','h','important']) assert.equal(copy[key], original[key]);
  assert.deepEqual(after.history, before.history); assert.deepEqual(after.tasks.slice(0,-1), before.tasks);
  assert.deepEqual(app.stored(), after); assert.deepEqual(boot(app.stored()).state(), after);
  app.undo(); assert.deepEqual(app.state(), before);
});

test('duplicate draft edits and repeated copies remain independent of their source', () => {
  const app = boot(); const original = app.state().tasks[0]; app.duplicate();
  app.el('taskTitleInput').value = 'Changed'; app.el('taskNoteInput').value = 'New note'; app.el('taskWidthInput').value = '8'; app.el('taskHeightInput').value = '8'; app.el('taskImportantInput').checked = false;
  app.submit(); const first = app.state().tasks[1]; assert.equal(first.title, 'Changed'); assert.equal(first.note, 'New note'); assert.equal(first.w, 8); assert.equal(first.h, 8); assert.equal(first.important, false); assert.deepEqual(app.state().tasks[0], original);
  app.duplicate(); app.submit(); const second = app.state().tasks[2]; assert.notEqual(first.id, second.id); assert.ok(second.createdAt > first.createdAt); assert.equal(second.title, original.title);
  app.undo(); assert.deepEqual(app.state().tasks, [original, first]);
});

for (const close of ['cancelTaskButton','closeTaskDialog','Escape']) test(`${close} discards duplicate draft and a subsequent Add is blank`, () => {
  const app = boot(); const before = app.state(); app.duplicate(); app.el('taskTitleInput').value = 'Discard';
  if (close === 'Escape') app.el('taskDialog').dispatch('cancel'); else app.el(close).dispatch('click');
  assert.equal(app.el('taskDialog').open, false); assert.deepEqual(app.state(), before); assert.equal(app.toast(), null);
  app.el('addTaskButton').dispatch('click'); assert.equal(app.el('taskTitleInput').value, ''); assert.equal(app.el('taskNoteInput').value, ''); assert.equal(Number(app.el('taskWidthInput').value), 2); assert.equal(Number(app.el('taskHeightInput').value), 1); assert.equal(app.el('taskImportantInput').checked, false);
});

for (const original of [task({ w:8,h:8,row:null,col:null, note:'', important:true }),task({title:'界'.repeat(120),note:'文'.repeat(400)}), task({title:'😀 café 日本語',note:'📝\n<&>"',important:false})]) test(`copy preserves boundary fields: ${original.title.slice(0,15)}`, () => {
  const app=boot(saved([original])); app.duplicate(); if(original.w===8)assert.equal(app.el('customSizeFields').hidden,false); app.submit();
  for(const key of ['title','note','w','h','important'])assert.equal(app.state().tasks[1][key],original[key]);
});

test('blank duplicate title keeps the draft open and creates nothing', () => { const app=boot(); app.duplicate(); app.el('taskTitleInput').value='  '; app.submit(); assert.equal(app.state().tasks.length,1); assert.equal(app.el('taskDialog').open,true); });

for(const language of ['en','ja']) test(`${language}: 499→500 succeeds, further new tasks are rejected without losing the draft`,()=>{
  const tasks=Array.from({length:499},(_,i)=>task({id:`t-${i}`,row:null,col:null})); const app=boot(saved(tasks),language);
  app.duplicate('t-0'); app.submit(); assert.equal(app.state().tasks.length,500); const atLimit=app.state();
  app.duplicate('t-0'); app.el('taskTitleInput').value='Keep this draft'; app.submit(); assert.deepEqual(app.state(),atLimit); assert.deepEqual(app.stored(),atLimit); assert.equal(app.el('taskDialog').open,true); assert.equal(app.el('taskTitleInput').value,'Keep this draft'); assert.ok(app.el('taskFormError'),'The modal needs its own visible error'); assert.equal(app.el('taskFormError').hidden,false); assert.match(app.el('taskFormError').textContent,/500/); assert.match(app.toast().message,/500/); assert.match(app.toast().message,language==='ja'?/タスク/:/task/);
  app.el('cancelTaskButton').dispatch('click'); app.el('addTaskButton').dispatch('click'); app.el('taskTitleInput').value='Also blocked'; app.submit(); assert.deepEqual(app.state(),atLimit);
  app.el('cancelTaskButton').dispatch('click'); app.run("openTaskDialog('t-0')"); app.el('taskTitleInput').value='Edit still works'; app.submit(); assert.equal(app.state().tasks[0].title,'Edit still works'); assert.equal(app.state().tasks.length,500);
  app.undo(); assert.deepEqual(app.state(),atLimit);
});

const blueprints=()=>[task({id:'s1',title:'Update README',note:'Review usage and screenshots before release',sample:true}), task({id:'s2',title:'Build the new feature',note:'Finish the smallest useful scope first',w:3,h:2,important:false,row:null,col:null,sample:true}),task({id:'s3',title:'Reply to email',note:'',w:1,h:1,important:false,row:null,col:null,sample:true})];

test('copied samples survive sample clearing, reload, JSON restore and Undo', async()=>{
  const app=boot(saved(blueprints())); for(const original of blueprints()){app.duplicate(original.id);app.submit();}
  await app.run('clearSampleData()'); const copies=app.state(); assert.equal(copies.tasks.length,3); assert.ok(copies.tasks.every(x=>x.sample===false));
  const reloaded=boot(app.stored()); assert.deepEqual(reloaded.state(),copies);
  const backup=plain(app.run('backupData()')); assert.equal(backup.schemaVersion,1);
  const restored=boot(saved()); restored.run(`globalThis.backup=${JSON.stringify(backup)}`); await restored.run('importBackup({text:async()=>JSON.stringify(backup)})'); assert.deepEqual(restored.state(),copies);
  await restored.run('clearSampleData()'); assert.deepEqual(restored.state(),copies);
  app.undo(); assert.equal(app.state().tasks.length,6); assert.equal(app.state().tasks.filter(x=>x.sample).length,3);
});

test('legacy missing sample flags still migrate, while explicit false never becomes sample',()=>{
  const legacy=blueprints().map(({sample,...item})=>item); assert.ok(boot(saved(legacy)).state().tasks.every(x=>x.sample===true));
  const normal=blueprints().map(x=>({...x,sample:false})); assert.ok(boot(saved(normal)).state().tasks.every(x=>x.sample===false));
  const mixed=[...legacy,...normal.map(x=>({...x,id:`user-${x.id}`}))]; const normalized=boot(saved(mixed)).state(); assert.ok(normalized.tasks.slice(0,3).every(x=>x.sample===true)); assert.ok(normalized.tasks.slice(3).every(x=>x.sample===false));
  const history=normal.map(({row,col,...x})=>({...x,completedAt:9000})); assert.ok(boot(saved([],history)).state().history.every(x=>x.sample===false));
});

test('ordinary Add, Edit, Complete and Restore retain their semantics',()=>{
  const app=boot(); app.el('addTaskButton').dispatch('click'); app.el('taskTitleInput').value='Added'; app.submit(); const added=app.state().tasks.at(-1); assert.equal(added.row,null); assert.equal(added.sample,false);
  app.run("openTaskDialog('original')"); app.el('taskTitleInput').value='Edited'; app.submit(); const edited=app.state().tasks[0]; assert.equal(edited.id,'original'); assert.equal(edited.createdAt,1000); assert.equal(edited.row,0);
  app.run("completeTask('original')"); assert.equal(app.state().history.length,1); app.run("restoreCompletedTask('original')"); const restored=app.state().tasks.at(-1); assert.equal(restored.id,'original'); assert.equal(restored.createdAt,1000); assert.equal(restored.row,null); assert.equal(app.state().history.length,0);
});


const backup = state => ({app:'task-packing',schemaVersion:1,state});
async function importData(app,data){app.run(`globalThis.importData=${JSON.stringify(data)}`);await app.run('importBackup({text:async()=>JSON.stringify(importData)})');}

test('Restore at 500 retains history, while 499 accepts a persistent 500th task',()=>{
  const tasks=Array.from({length:500},(_,i)=>task({id:`a${i}`,row:null,col:null}));
  for(const count of [499,500]){const app=boot(saved(tasks.slice(0,count),[task({id:'completed',completedAt:4000})]));const before=app.state();const result=app.run("restoreCompletedTask('completed')");if(count===500){assert.equal(result,false);assert.deepEqual(app.state(),before);assert.match(app.toast().message,/500/);}else{assert.equal(result,true);assert.equal(app.state().tasks.length,500);assert.equal(app.state().history.length,0);assert.deepEqual(boot(app.stored()).state(),app.state());}}
});

test('Mini board Undo at active capacity preserves its history and can retry after space is freed',()=>{
  const tasks=Array.from({length:500},(_,i)=>task({id:`a${i}`,row:null,col:null}));const app=boot(saved(tasks));app.run("completeTask('a0',{source:'mini'})");app.el('addTaskButton').dispatch('click');app.el('taskTitleInput').value='Replacement';app.submit();const before=app.state();
  assert.equal(app.run('undoMiniCompletion()'),false);assert.deepEqual(app.state(),before);assert.match(app.toast().message,/500/);
  app.run("completeTask('a1')");assert.equal(app.run('undoMiniCompletion()'),true);assert.equal(app.state().tasks.length,500);assert.ok(app.state().tasks.some(x=>x.id==='a0'));assert.equal(app.state().history.length,1);assert.deepEqual(boot(app.stored()).state(),app.state());
});

for(const source of ['main','mini'])test(`${source} completion at full history preserves all data`,()=>{
  const history=Array.from({length:500},(_,i)=>task({id:`h${i}`,completedAt:5000}));const app=boot(saved([task()],history));const before=app.state();app.run(`completeTask('original',{source:'${source}'})`);assert.deepEqual(app.state(),before);assert.match(app.toast().message,/500/);assert.deepEqual(boot(app.stored()).state(),before);
});

test('the 500th history entry is saved and survives reload',()=>{const history=Array.from({length:499},(_,i)=>task({id:`h${i}`,completedAt:5000}));const app=boot(saved([task()],history));app.run("completeTask('original')");assert.equal(app.state().history.length,500);assert.deepEqual(boot(app.stored()).state(),app.state());});

for(const invalid of [{},null,{board:{rows:5,cols:5},tasks:[],history:{}},saved([null]),saved([task(),task()]),saved([task()],[task({completedAt:5000})]),saved(Array.from({length:501},(_,i)=>task({id:`a${i}`}))),saved([],[...Array.from({length:501},(_,i)=>task({id:`h${i}`,completedAt:5000}))]),{...saved(),board:{rows:100,cols:5}},saved([task({title:''})]),saved([task({w:NaN})])])test(`invalid backup is atomic: ${JSON.stringify(invalid)?.slice(0,50)}`,async()=>{
  const app=boot();const before=app.state(),stored=app.stored();await importData(app,backup(invalid));assert.deepEqual(app.state(),before);assert.deepEqual(app.stored(),stored);assert.equal(app.toast().message,'This backup cannot be loaded');
});

test('a late earlier import cannot overwrite the latest selection or its toast',async()=>{
  const app=boot();app.run('globalThis.pendingText=new Promise(resolve=>globalThis.finish=resolve)');const first=app.run('importBackup({text:()=>pendingText})');const newer=saved([task({id:'newer',title:'Newer'})]);await importData(app,backup(newer));const toast=app.toast().message;app.run(`finish(${JSON.stringify(JSON.stringify(backup(saved([task({id:'older'})]))))})`);await first;assert.deepEqual(app.state(),newer);assert.equal(app.toast().message,toast);
});

test('editing while a file import is pending keeps the newer edit',async()=>{
  const app=boot();app.run('globalThis.pendingText=new Promise(resolve=>globalThis.finish=resolve)');const pending=app.run('importBackup({text:()=>pendingText})');app.run("openTaskDialog('original')");app.el('taskTitleInput').value='Newer edit';app.submit();app.run(`finish(${JSON.stringify(JSON.stringify(backup(saved([]))))})`);await pending;assert.equal(app.state().tasks[0].title,'Newer edit');
});

test('successful JSON restore dismisses stale task drafts, details, and Mini Undo',async()=>{
  const app=boot();app.run("completeTask('original',{source:'mini'})");app.duplicate('original','history');const replacement=saved([],[task({title:'Imported replacement',completedAt:9000,row:undefined,col:undefined})]);await importData(app,backup(replacement));assert.equal(app.el('taskDialog').open,false);assert.equal(app.el('taskDetailDialog').open,false);assert.equal(app.run('undoMiniCompletion()'),false);assert.equal(app.toast().onAction,undefined);assert.deepEqual(app.state(),plain(replacement));
});

test('board Enter/Space opens details only when the tile itself has focus',()=>{
  const line=html.split('\n').find(line=>line.includes("block.addEventListener('keydown'"));let handler,opened=0;const block={addEventListener(type,fn){handler=fn}};vm.runInNewContext(line,{block,task:{id:'tile'},openTaskDetail(){opened++}});
  for(const key of ['Enter',' ']){const nested={key,target:{},currentTarget:block,preventDefault(){this.defaultPrevented=true}};handler(nested);assert.equal(nested.defaultPrevented,undefined);assert.equal(opened,0);const direct={key,target:block,currentTarget:block,preventDefault(){this.defaultPrevented=true}};handler(direct);assert.equal(direct.defaultPrevented,true);assert.equal(opened,1);opened=0;}
});

test('Mini Undo dismisses an older main toast snapshot rather than replaying it over newer state',()=>{
  const app=boot(saved([task({id:'a'}),task({id:'b',row:null,col:null})]));app.run("completeTask('a',{source:'mini'})");app.run("completeTask('b')");assert.equal(typeof app.toast().onAction,'function');app.run('undoMiniCompletion()');assert.ok(app.state().tasks.some(x=>x.id==='a'));assert.equal(app.toast(),null);
});


for(const input of [saved([],[]),saved(blueprints().map(({sample,...item})=>item))])test('valid schema-1 empty and legacy backups remain importable',async()=>{const app=boot();await importData(app,backup(input));assert.equal(app.toast().message,'Backup restored');assert.equal(app.state().tasks.length,input.tasks.length);});

test('URL restore shares validation and refuses malformed data before confirmation',async()=>{const app=boot();const before=app.state();app.run("location.hash='#tp-backup=test';decodeBackupPayload=async()=>({app:'task-packing',schemaVersion:1,state:{}});AppConfirm.ask=async()=>{throw Error('Invalid backup must not ask for confirmation')}");await app.run('restoreBackupFromUrl()');assert.deepEqual(app.state(),before);assert.equal(app.toast().message,app.run("t('urlBackupInvalid')"));});

test('pending URL confirmation cannot overwrite a newer JSON import',async()=>{const app=boot();app.run(`location.hash='#tp-backup=test';decodeBackupPayload=async()=>(${JSON.stringify(backup(saved([])))});AppConfirm.ask=()=>new Promise(resolve=>globalThis.confirmRestore=resolve)`);const pending=app.run('restoreBackupFromUrl()');await Promise.resolve();await importData(app,backup(saved([task({id:'newer'})])));app.run('confirmRestore(true)');await pending;assert.equal(app.state().tasks[0].id,'newer');});

for(const fields of [{sample:'false'},{important:'false'},{createdAt:'Infinity'},{createdAt:Infinity},{createdAt:-1},{createdAt:8640000000000001},{row:'0'},{col:{}},{row:1.5},{completedAt:'yesterday'}])test(`malformed field types cannot replace data: ${JSON.stringify(fields)}`,async()=>{const app=boot();const before=app.state(),stored=app.stored();await importData(app,backup(saved([task(fields)])));assert.deepEqual(app.state(),before);assert.deepEqual(app.stored(),stored);assert.equal(app.toast().message,'This backup cannot be loaded');});

test('legacy optional flags and timestamps may be missing without changing the schema',async()=>{const app=boot();const item={id:'legacy',title:'Legacy',w:1,h:1};await importData(app,backup(saved([item])));assert.equal(app.toast().message,'Backup restored');const restored=app.state().tasks[0];assert.equal(restored.id,'legacy');assert.equal(restored.sample,false);assert.equal(restored.important,false);assert.ok(Number.isFinite(restored.createdAt));assert.equal(restored.row,null);});

const filterFixture = () => saved([
  task({ id: 'a', title: 'ALPHA task', note: 'first', row: 0, col: 0 }),
  task({ id: 'b', title: 'ordinary', note: 'alpha note', row: null, col: null, important: false }),
  task({ id: 'c', title: 'other', note: 'ALPHA note', row: null, col: null }),
  task({ id: 'd', title: 'alpha ordinary', note: '', row: 3, col: 0, important: false }),
  task({ id: 'e', title: '確認', note: '日本語メモ', row: 5, col: 0 }),
]);
function toggleImportant(app) { const button = app.el('importantFilterButton'); assert.ok(button, 'Task filters include an independent Important only button'); button.dispatch('click'); }
function chooseStatus(app, status) { const chip = app.chips().find(button => button.dataset.filter === status); assert.ok(chip); chip.dispatch('click'); }
function searchTasks(app, query) { app.el('taskSearch').value = query; app.el('taskSearch').dispatch('input'); }

for (const language of ['ja', 'en']) for (const view of ['card', 'row']) for (const status of ['all', 'unplaced', 'placed']) {
  test(`Important filter intersects ${status} and title/note search in ${language} ${view} view`, () => {
    const input = filterFixture(), app = boot(input, language, { lists: true });
    app.run(`setTaskViewMode('${view}')`); chooseStatus(app, status); toggleImportant(app);
    assert.equal(app.run('filter'), status); assert.equal(app.el('importantFilterButton').getAttribute('aria-pressed'), 'true');
    const eligible = input.tasks.filter(item => item.important && (status === 'all' || (status === 'placed') === Number.isInteger(item.row)));
    assert.deepEqual(app.visible(), eligible.map(item => item.id));
    for (const query of ['  alpha  ', 'FIRST', '日本語メモ', 'nothing matches']) {
      searchTasks(app, query);
      assert.deepEqual(app.visible(), eligible.filter(item => `${item.title} ${item.note}`.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language))).map(item => item.id));
    }
    searchTasks(app, ''); toggleImportant(app);
    assert.equal(app.el('importantFilterButton').getAttribute('aria-pressed'), 'false');
    assert.deepEqual(app.visible(), input.tasks.filter(item => status === 'all' || (status === 'placed') === Number.isInteger(item.row)).map(item => item.id));
    assert.equal(app.el('taskList').classList.contains('is-row-view'), view === 'row');
    assert.deepEqual(app.state(), input); assert.deepEqual(app.stored(), input); assert.deepEqual(plain(app.run('backupData().state')), input);
  });
}

for (const language of ['ja', 'en']) test(`Important filter labels, empty results, and language changes remain consistent (${language})`, () => {
  const app = boot(filterFixture(), language, { lists: true }); toggleImportant(app); app.run('applyLanguage()');
  assert.equal(app.el('importantFilterButton').textContent, language === 'ja' ? '重要のみ' : 'Important only');
  searchTasks(app, 'no matches'); assert.equal(app.visible().length, 0); assert.match(app.el('taskList').children[0].innerHTML, new RegExp(app.run("t('noMatchesTitle')")));
  app.run(`language='${language === 'ja' ? 'en' : 'ja'}';applyLanguage()`);
  assert.equal(app.el('importantFilterButton').textContent, language === 'ja' ? 'Important only' : '重要のみ');
  assert.equal(app.el('importantFilterButton').getAttribute('aria-pressed'), 'true');
  searchTasks(app, ''); assert.deepEqual(app.visible(), ['a','c','e']);
  const empty = boot(saved([]), language, { lists: true }); toggleImportant(empty); assert.match(empty.el('taskList').children[0].innerHTML, new RegExp(empty.run("t('noTasksTitle')")));
});

test('Reset all synchronizes the status highlight with the all-task list', async () => {
  const app = boot(filterFixture(), 'en', { lists: true }); chooseStatus(app, 'placed');
  await app.run('resetAll()');
  assert.equal(app.run('filter'), 'all'); assert.equal(app.visible().length, 3);
  assert.deepEqual(app.chips().filter(button => button.classList.contains('is-active')).map(button => button.dataset.filter), ['all']);
  for (const chip of app.chips()) assert.equal(chip.getAttribute('aria-pressed'), String(chip.dataset.filter === 'all'));
});

test('Reset clears Important and search, while canceled Reset preserves them', async () => {
  const app = boot(filterFixture(), 'en', { lists: true }); chooseStatus(app, 'placed'); toggleImportant(app); searchTasks(app, 'alpha');
  app.run('AppConfirm.ask=async()=>false'); await app.run('resetAll()'); assert.deepEqual(app.visible(), ['a']);
  app.run('AppConfirm.ask=async()=>true'); await app.run('resetAll()');
  assert.equal(app.el('importantFilterButton').getAttribute('aria-pressed'), 'false'); assert.equal(app.el('taskSearch').value, ''); assert.equal(app.visible().length, 3);
  assert.deepEqual(app.chips().filter(button => button.classList.contains('is-active')).map(button => button.dataset.filter), ['all']);
});

test('Important-only is session state and never changes the full board, backup, or stored state', () => {
  const app = boot(filterFixture(), 'en', { lists: true }); const before = app.state();
  const board = () => app.el('board').children.filter(el => el.dataset.taskId).map(el => ({ id: el.dataset.taskId, row: el.style.gridRow, col: el.style.gridColumn }));
  const boardBefore = board(), cellsBefore = app.el('capacityCells').textContent;
  assert.deepEqual(boardBefore.map(item => item.id), ['a','d','e']);
  toggleImportant(app); chooseStatus(app, 'unplaced'); searchTasks(app, 'ALPHA'); assert.deepEqual(app.visible(), ['c']);
  app.run('renderAll()'); assert.deepEqual(board(), boardBefore); assert.equal(app.el('capacityCells').textContent, cellsBefore);
  assert.deepEqual(app.state(), before); assert.deepEqual(app.stored(), before); assert.deepEqual(plain(app.run('backupData().state')), before);
  const reloaded = boot(app.stored(), 'en', { lists: true }); assert.deepEqual(reloaded.visible(), before.tasks.map(item => item.id)); assert.equal(reloaded.el('importantFilterButton').getAttribute('aria-pressed'), 'false');
});

test('Editing importance and completion Undo immediately update filtered membership without changing task order', () => {
  const app = boot(filterFixture(), 'en', { lists: true }); toggleImportant(app);
  app.run("openTaskDialog('c')"); app.el('taskImportantInput').checked = false; app.submit(); assert.deepEqual(app.visible(), ['a','e']);
  app.undo(); assert.deepEqual(app.visible(), ['a','c','e']);
  app.run("completeTask('a')"); assert.deepEqual(app.visible(), ['c','e']); app.undo(); assert.deepEqual(app.visible(), ['a','c','e']);
  app.run("completeTask('c',{source:'mini'})"); assert.deepEqual(app.visible(), ['a','e']); assert.equal(app.run('undoMiniCompletion()'), true); assert.deepEqual(app.visible(), ['a','c','e']);
  assert.deepEqual(app.state(), filterFixture());
});

test('Bulk selection stays keyed by ID when Important, search, status, and view hide selected tasks', () => {
  const app = boot(filterFixture(), 'en', { lists: true, mobile: true }); app.run("setBulkMode(true);toggleBulkTask('b');toggleBulkTask('c')");
  assert.deepEqual(plain(app.run('[...bulkSelectedIds]')), ['b','c']); toggleImportant(app); assert.deepEqual(app.visible(), ['c']);
  searchTasks(app, 'nothing'); chooseStatus(app, 'placed'); app.run("setTaskViewMode('row')");
  assert.deepEqual(plain(app.run('[...bulkSelectedIds]')), ['b','c']); assert.equal(app.el('mobileBulkCount').textContent, '2 selected');
  searchTasks(app, ''); chooseStatus(app, 'unplaced'); toggleImportant(app); assert.deepEqual(app.visible(), ['b','c']);
  for (const card of app.el('taskList').children) assert.match(card.className, /is-bulk-selected/);
});

for (const completed of ['a','b','c']) test(`Mini Undo restores ${completed} at its original index and persists/export/reloads every field`, () => {
  const input = saved([task({id:'a',row:0,col:0}), task({id:'b',row:2,col:1}), task({id:'c',row:4,col:2})]); const app = boot(input);
  app.run(`completeTask('${completed}',{source:'mini'})`); assert.equal(app.run('undoMiniCompletion()'), true);
  assert.deepEqual(app.state(), input); assert.deepEqual(app.stored(), input); assert.deepEqual(plain(app.run('backupData().state')), input); assert.deepEqual(boot(app.stored()).state(), input);
  assert.equal(app.run('undoMiniCompletion()'), false);
});

test('Mini Undo preserves intervening task edits, additions, reordering, and history mutations', () => {
  const input = saved([task({id:'a',row:0,col:0}), task({id:'b',row:2,col:1}), task({id:'c',row:4,col:2})]); const app = boot(input);
  app.run("completeTask('b',{source:'mini'});openTaskDialog('a')"); app.el('taskTitleInput').value='Edited after completion'; app.el('taskNoteInput').value='Keep newer note'; app.submit();
  app.duplicate('a'); app.submit(); const copy = app.state().tasks.at(-1);
  // Reordering uses the real operation; unrelated task order must not be reset by Mini Undo.
  app.run("moveTaskToEnd('a');completeTask('c')"); const before = app.state();
  assert.equal(app.run('undoMiniCompletion()'), true);
  assert.deepEqual(app.state().tasks.map(item=>item.id), [copy.id,'b','a']);
  assert.deepEqual(app.state().tasks[0], copy); assert.deepEqual(app.state().tasks[1], input.tasks[1]); assert.deepEqual(app.state().tasks[2], before.tasks[1]);
  assert.deepEqual(app.state().history, before.history.filter(item=>item.id!=='b')); assert.equal(app.toast(), null);
  assert.deepEqual(app.stored(), app.state()); assert.deepEqual(boot(app.stored()).state(), app.state());
});

test('Mini Undo clamps the saved index after other tasks disappear', () => {
  const app = boot(saved([task({id:'a'}),task({id:'b',row:2}),task({id:'c',row:4})]));
  app.run("completeTask('c',{source:'mini'});completeTask('a');completeTask('b')"); assert.equal(app.run('undoMiniCompletion()'), true); assert.deepEqual(app.state().tasks.map(item=>item.id), ['c']);
});

for (const blocked of ['occupied', 'smaller board']) test(`Mini Undo keeps original order but restores unplaced when ${blocked}`, () => {
  const input=saved([task({id:'a',row:0,col:0}),task({id:'b',row:4,col:4}),task({id:'c',row:7,col:0})]);const app=boot(input);
  app.run("completeTask('b',{source:'mini'})");
  if (blocked==='occupied') { app.run("openTaskDialog('a')"); app.el('taskTitleInput').value='Edited';app.submit();app.run('state.tasks[0].row=4;state.tasks[0].col=4;saveState()'); }
  else app.run('state.board={rows:3,cols:3};sanitizePlacements(state);saveState()');
  const before=app.state();assert.equal(app.run('undoMiniCompletion()'),true);const restored=app.state();
  assert.deepEqual(restored.tasks.map(item=>item.id),['a','b','c']);assert.equal(restored.tasks[1].row,null);assert.equal(restored.tasks[1].col,null);
  assert.deepEqual(restored.tasks[0],before.tasks[0]);assert.deepEqual(restored.tasks[2],before.tasks[1]);assert.deepEqual(restored.board,before.board);
});


test('Marking a hidden ordinary task Important inserts it into filtered manual order, and Undo hides it again', () => {
  const app=boot(filterFixture(),'en',{lists:true});toggleImportant(app);app.run("openTaskDialog('b')");app.el('taskImportantInput').checked=true;app.submit();
  assert.deepEqual(app.visible(),['a','b','c','e']);assert.equal(app.state().tasks[1].important,true);
  app.undo();assert.deepEqual(app.visible(),['a','c','e']);assert.equal(app.state().tasks[1].important,false);
});

test('Repeated Mini completions remember only the latest completed task and its index', () => {
  const input=saved([task({id:'a',row:0}),task({id:'b',row:2}),task({id:'c',row:4})]);const app=boot(input);
  app.run("completeTask('b',{source:'mini'});completeTask('a',{source:'mini'})");assert.equal(app.run('undoMiniCompletion()'),true);
  assert.deepEqual(app.state().tasks,[input.tasks[0],input.tasks[2]]);assert.deepEqual(app.state().history.map(item=>item.id),['b']);assert.equal(app.run('undoMiniCompletion()'),false);
});

test('Manual order survives hiding, reordering, and revealing ordinary tasks', () => {
  const app=boot(filterFixture(),'en',{lists:true});
  toggleImportant(app); app.run("reorderTask('e','a','before')");
  assert.deepEqual(app.visible(),['e','a','c']);
  toggleImportant(app); assert.deepEqual(app.visible(),['e','a','b','c','d']);
  assert.deepEqual(app.state().tasks.map(t=>t.id),['e','a','b','c','d']);
  assert.deepEqual(boot(app.stored(),'en',{lists:true}).visible(),['e','a','b','c','d']);
});

test('Entering bulk mode keeps Important and search but synchronizes status chips', () => {
  const app=boot(filterFixture(),'en',{lists:true,mobile:true});
  chooseStatus(app,'placed');toggleImportant(app);searchTasks(app,'ALPHA');
  app.run('setBulkMode(true)');
  assert.equal(app.run('filter'),'unplaced');assert.deepEqual(app.visible(),['c']);
  assert.equal(app.el('importantFilterButton').getAttribute('aria-pressed'),'true');
  assert.deepEqual(app.chips().filter(x=>x.classList.contains('is-active')).map(x=>x.dataset.filter),['unplaced']);
});
