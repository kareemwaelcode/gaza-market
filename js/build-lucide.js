/**
 * Gaza Market - build a trimmed lucide.min.js containing only the icons the dashboards use.
 *
 * Usage (from the project root):
 *   npm i --no-save lucide@1.45.0 esbuild
 *   node tools/build-lucide.js
 *
 * It scans dashboard-users/**, js/usere-dashboard.js, js/store-type-config.js and
 * js/clinic-appointments.js for every quoted string that is a real Lucide icon name,
 * then writes js/vendor/lucide.min.js (same filename, same window.lucide.createIcons() API).
 * Re-run it whenever you add a new icon name anywhere in those files.
 */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = process.cwd();
const L = require(path.join(root, 'node_modules/lucide'));
const toPascal = s => s.replace(/(^\w|-\w)/g, m => m.replace('-', '').toUpperCase());

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f), st = fs.statSync(p);
    if (st.isDirectory()) { if (['.git', 'test', 'vendor', 'node_modules', 'tools'].includes(f)) continue; walk(p); }
    else if (/\.(html|js)$/.test(f) && /dashboard-users|usere-dashboard|js[\\/]dashboard[\\/]|store-type-config|clinic-appointments/.test(p)) files.push(p);
  }
})(root);

const used = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/["'`]([a-z][a-z0-9]*(?:-[a-z0-9]+)*)["'`]/g)) if (L[toPascal(m[1])]) used.add(toPascal(m[1]));
  for (const m of s.matchAll(/data-lucide=\\?["']([a-z0-9-]+)["']/g)) {
    if (L[toPascal(m[1])]) used.add(toPascal(m[1]));
    else console.warn('WARNING: unknown icon name', m[1], 'in', path.relative(root, f));
  }
  for (const m of s.matchAll(/["']([a-z]+-)["']\s*\+/g))
    console.warn('WARNING: icon name may be built dynamically:', m[1] + '…', 'in', path.relative(root, f));
}
const names = [...used].sort();
const entry = path.join(root, 'tools/.lucide-entry.js');
fs.writeFileSync(entry,
  `import { createIcons as _c, ${names.join(', ')} } from 'lucide';\n` +
  `const icons = { ${names.join(', ')} };\n` +
  `const createIcons = (o) => _c(Object.assign({ icons }, o));\n` +
  `export { createIcons, icons };\n`);
execFileSync(path.join(root, 'node_modules/.bin/esbuild'), [
  entry, '--bundle', '--minify', '--format=iife', '--global-name=lucide', '--legal-comments=none',
  '--banner:js=/** @license lucide v1.45.0 - ISC | custom subset build for Gaza Market (dashboard icons only) */',
  '--outfile=' + path.join(root, 'js/vendor/lucide.min.js'),
], { stdio: 'inherit' });
fs.unlinkSync(entry);
console.log(`Done: ${names.length} icons -> js/vendor/lucide.min.js`);