/* Run from the theme root: node tools/index-cleaning-guides.cjs PATH_TO_PUBLISHED_PDFS
   Set PDFTOTEXT to the Poppler/Xpdf executable if it is outside PATH. */
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const folder = process.argv[2];
if (!folder) throw Error('Provide the published PDF folder.');
const source = fs.readFileSync('assets/cfs2-cleaning-kollege-index.js','utf8');
const guides = JSON.parse(source.slice(source.indexOf('['),source.lastIndexOf(']')+1));
const output = {};
const missing = [];
for (const guide of guides) {
  const name = decodeURIComponent(new URL(guide.url).pathname.split('/').pop());
  const candidates = [name,guide.title+'.pdf'];
  const local = candidates.find(file => path.basename(file)===file && fs.existsSync(path.join(folder,file)));
  if (!local) {missing.push(guide.title);continue;}
  const text = execFileSync(process.env.PDFTOTEXT || 'pdftotext',['-raw','-enc','UTF-8',path.join(folder,local),'-'],{encoding:'utf8'});
  const pages = text.split('\f').map(page => page.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).join('\n'));
  while(pages.length && !pages.at(-1)) pages.pop();
  if (pages.some(Boolean)) output[guide.url] = pages;
  else missing.push(guide.title);
}
fs.writeFileSync('assets/cfs-guide-pages.json',JSON.stringify(output));
console.log(Object.keys(output).length+' linked guides; '+Object.values(output).flat().filter(Boolean).length+' text pages. Metadata only: '+missing.join(', '));
