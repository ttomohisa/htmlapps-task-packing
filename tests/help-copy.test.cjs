const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const removed = ["ダイアログを開いている間は背景がスクロールせず、内容をダイアログ内でスクロールできます。", "While a dialog is open, the background stays still and content scrolls inside the dialog. "];
for (const file of ['src/index.template.html', 'task-packing.html']) {
  test(`${file}: user help omits implementation commentary`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const text of removed) assert.ok(!html.includes(text), `Remove implementation copy from ${file}`);
  });
}
