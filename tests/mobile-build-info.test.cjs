const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
test('build metadata is unique and the final Help content',()=>{
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
 const help=html.match(/<dialog id="helpDialog"[^>]*>([\s\S]*?)<\/dialog>/)[1];
 assert.doesNotMatch(main,/id="buildVersion"/);
 const body=help.match(/<div class="dialog-body">([\s\S]*?)<\/div>/)[1];
 assert.match(body, /id="buildVersion"/);
 assert.ok(help.includes("<p style=\"margin-top:12px\"><span data-i18n=\"buildInfo\">Version</span> <strong id=\"buildVersion\">1.0.5</strong> · <span id=\"builtAt\">—</span></p>"));
 const tail=help.slice(help.indexOf("<p style=\"margin-top:12px\"><span data-i18n=\"buildInfo\">Version</span> <strong id=\"buildVersion\">1.0.5</strong> · <span id=\"builtAt\">—</span></p>")+"<p style=\"margin-top:12px\"><span data-i18n=\"buildInfo\">Version</span> <strong id=\"buildVersion\">1.0.5</strong> · <span id=\"builtAt\">—</span></p>".length);
 assert.match(tail,/^\s*(?:<!--[^]*?-->\s*)?<\/div>\s*<\/div>\s*$/);
 for(const id of ["buildVersion", "builtAt"])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
});

test('English footer uses the exact local-processing translation',()=>{
 assert.match(html,/footer:'Fully local processing'/);
 assert.doesNotMatch(html,/footer:'Fully local'/);
});
