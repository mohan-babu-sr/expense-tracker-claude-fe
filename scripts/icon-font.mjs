// Builds the Material Symbols Rounded <link> in src/index.html with ONLY the icons the app uses (R21 AC10,
// design §13.2). The full font is ~550 kB; a subset of the app's ~150 icons is a few kB.
//
//   npm run icons            → rewrite the link between the icons:start / icons:end markers
//
// How it finds the names: every quoted 'snake_case' word and every <mat-icon>word</mat-icon> in src/app, kept
// only if it is a real Material Symbols name (Google's official codepoints list). Over-including a few words that
// happen to be icon names (e.g. 'search') costs bytes, never correctness. Run it after adding a new icon name.
// Dev-time only — needs internet for the codepoints list.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src', 'app');
const INDEX = path.join(root, 'src', 'index.html');
const CODEPOINTS =
  'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/' +
  'MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints';
// opsz 24, weight 400, grade 0; FILL 0..1 so the active nav item can show the filled icon.
const AXES = 'opsz,wght,FILL,GRAD@24,400,0..1,0';

const valid = new Set(
  (await (await fetch(CODEPOINTS)).text())
    .split('\n')
    .map((l) => l.split(' ')[0])
    .filter(Boolean),
);
if (valid.size < 1000) throw new Error(`Codepoints list looks wrong (${valid.size} names)`);

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|html)$/.test(e.name)) files.push(p);
  }
})(SRC);

const used = new Set();
const unknownInMatIcon = new Set();
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, ''); // examples in comments don't count
  for (const m of text.matchAll(/'([a-z0-9][a-z0-9_]*)'/g)) if (valid.has(m[1])) used.add(m[1]);
  // Static icon inputs in templates: icon="savings", fontIcon="add", emptyIcon="…"
  for (const m of text.matchAll(/\b\w*[iI]con="([a-z0-9_]+)"/g)) if (valid.has(m[1])) used.add(m[1]);
  if (!f.endsWith('.html')) continue; // <mat-icon> tags live in templates (TS comments may quote examples)
  // `<\/mat-icon\s*>`: Prettier sometimes wraps the closing tag as "</mat-icon\n  >" (e.g. icons with a badge).
  for (const m of text.matchAll(/<mat-icon[^>]*>\s*([a-z0-9_]+)\s*<\/mat-icon\s*>/g)) {
    if (valid.has(m[1])) used.add(m[1]);
    else unknownInMatIcon.add(`${m[1]}  (${path.relative(root, f)})`);
  }
}
if (unknownInMatIcon.size) {
  console.error('Not a Material Symbols name — rename these:\n  ' + [...unknownInMatIcon].join('\n  '));
  process.exit(1);
}

const names = [...used].sort(); // Google requires the list sorted
const href =
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:${AXES}` +
  `&icon_names=${names.join(',')}&display=block`;
const html = fs.readFileSync(INDEX, 'utf8');
const re = /(<!-- icons:start[^>]*-->)[\s\S]*?(<!-- icons:end -->)/;
if (!re.test(html)) throw new Error('icons:start / icons:end markers not found in index.html');
const eol = html.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(INDEX, html.replace(re, `$1${eol}    <link rel="stylesheet" href="${href}" />${eol}    $2`));
console.log(`${names.length} icons → index.html`);
