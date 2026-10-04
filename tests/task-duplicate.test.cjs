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

function boot(input = saved(), language = 'en') {
  const nodes = new Map(), all = [];
  let stored = JSON.stringify(input), nextId = 0, now = 100000, toast = null;
  class Element {
    constructor() { this.value = ''; this.checked = false; this.hidden = false; this.open = false; this.dataset = {}; this.style = {}; this.listeners = {}; this.textContent = ''; this.selectionStart = 0; this.selectionEnd = 0; const classes = new Set(); this.classList = { toggle: (key, on) => on ? classes.add(key) : classes.delete(key), add: (...keys) => keys.forEach(key => classes.add(key)), remove: (...keys) => keys.forEach(key => classes.delete(key)), contains: key => classes.has(key) }; }
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
    const id = tag.match(/\bid="([^"]+)"/); if (id) nodes.set(id[1], el);
    for (const attr of tag.matchAll(/data-([\w-]+)="([^"]+)"/g)) el.dataset[attr[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = attr[2];
    if (/\bhidden(?:\s|>)/.test(tag)) el.hidden = true;
    all.push(el);
  }
  const document = { activeElement: null };
  const $ = selector => { const el = selector === '#sizePresets .size-preset[data-custom]' ? all.find(el => el.dataset.custom) : nodes.get(selector.slice(1)); assert.ok(el, `Missing DOM node ${selector}`); return el; };
  const $$ = selector => all.filter(el => selector.includes('.size-preset') && (selector.includes('[data-w]') ? el.dataset.w : selector.includes('[data-custom]') ? el.dataset.custom : el.dataset.w || el.dataset.custom));
  const context = vm.createContext({ $, $$, document, Date: class extends Date { static now() { return ++now; } }, crypto: { randomUUID: () => `copy-${++nextId}` }, requestAnimationFrame: fn => fn(), window: { matchMedia: () => ({ matches: false }) }, localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } }, AppConfirm: { ask: async () => true }, showToast: (message, options = {}) => { toast = { message, ...options }; }, renderAll() {}, renderMiniBoard() {}, resetDragState() {}, setBulkMode() {}, AppToast: { dismiss() { toast=null; } }, location: { hash: '' }, clearBackupHash() {}, supportsCompressedUrlBackup: () => true, decodeBackupPayload: async () => ({}), console });
  const functions = ['t','readStorage','writeStorage','sampleBlueprintIndex','migrateLegacySamples','normalizeState','clampInt','saveState','snapshot','restoreSnapshot','uid','isPlaced','getTask','area','occupancy','canPlace','sanitizePlacements','getDetailTask','openTaskDetail','closeTaskDetail','renderTaskDetail','escapeHtml','isPresetSize','setCustomSizeVisible','openTaskDialog','closeTaskDialog','updateSizePresetState','submitTask','completeTask','restoreCompletedTask','hasSampleData','clearSampleData','backupData','importBackup','duplicateTask','undoMiniCompletion','validateBackup','applyBackupState','restoreBackupFromUrl'];
  const lines = html.split('\n');
  const source = functions.map(name => lines.find(line => new RegExp(`^      (?:async )?function ${name}\\(`).test(line)) || '').join('\n');
  const translations = html.slice(html.indexOf('const translations='), html.indexOf('const $='));
  vm.runInContext(`${translations}\nlet language=${JSON.stringify(language)},state=${JSON.stringify(input)},editingTaskId=null,detailTaskId=null,detailSource='task',detailOpenedAt=0,lastMiniCompletedId=null,lastMiniCompletedTask=null,bulkSelectedIds=new Set(),backupRestoreGeneration=0;const storageKey='task-packing:state-v1';\n${source}\nstate=normalizeState(state);`, context);
  for (const line of lines.filter(line => line.trimStart().startsWith("$('#addTaskButton').addEventListener") || line.trimStart().startsWith("$('#taskForm').addEventListener") || line.trimStart().startsWith("$('#taskDetailClose').addEventListener") || line.trimStart().startsWith("$('#taskDetailDuplicate').addEventListener") || line.trimStart().startsWith("$('#taskDialog').addEventListener"))) vm.runInContext(line, context);
  const run = code => vm.runInContext(code, context);
  return { el: id => nodes.get(id), document, run, state: () => plain(run('state')), stored: () => JSON.parse(stored), toast: () => toast,
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
