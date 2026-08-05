/**
 * Nest in City — zero-dependency static site builder.
 *
 * Assembles the four pages from src/pages/*.html + src/partials/*.html so that
 * shared components (header, footer, buttons, cards, forms) live in exactly one
 * place. Output is plain static HTML in dist/ — a real multi-page website.
 *
 *   node build.js          build once
 *   node build.js --watch  rebuild on change
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const PAGES = [
  { file: 'index.html', page: 'home', title: 'Nest in City' },
  { file: 'workshop.html', page: 'workshop', title: 'Workshop · Nest in City' },
  { file: 'shop.html', page: 'shop', title: 'Shop · Nest in City' },
  { file: 'contact.html', page: 'contact', title: 'Contact · Nest in City' },
];

const partial = (name) =>
  fs.readFileSync(path.join(SRC, 'partials', `${name}.html`), 'utf8');

/** {{> name key="value" }} includes, {{ key }} substitution, {{#if key}}…{{/if}} blocks. */
function render(tpl, vars, depth = 0) {
  if (depth > 10) throw new Error('partial recursion too deep');

  // includes, with inline attribute overrides
  tpl = tpl.replace(/{{>\s*([\w-]+)([^}]*)}}/g, (_, name, attrs) => {
    const local = { ...vars };
    for (const m of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) local[m[1]] = m[2];
    return render(partial(name), local, depth + 1);
  });

  // {{#if key}} … {{else}} … {{/if}}
  tpl = tpl.replace(
    /{{#if\s+([\w-]+)}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g,
    (_, key, yes, no) => (vars[key] ? yes : no || '')
  );

  // {{ key }}
  tpl = tpl.replace(/{{\s*([\w-]+)\s*}}/g, (m, key) =>
    key in vars ? String(vars[key]) : ''
  );

  return tpl;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  for (const p of PAGES) {
    const tpl = fs.readFileSync(path.join(SRC, 'pages', p.file), 'utf8');
    const vars = { ...p };
    for (const q of PAGES) vars[`is_${q.page}`] = q.page === p.page ? '1' : '';
    fs.writeFileSync(path.join(DIST, p.file), render(tpl, vars), 'utf8');
  }

  copyDir(path.join(SRC, 'styles'), path.join(DIST, 'styles'));
  copyDir(path.join(SRC, 'js'), path.join(DIST, 'js'));
  copyDir(path.join(ROOT, 'public', 'assets'), path.join(DIST, 'assets'));

  console.log(`built ${PAGES.length} pages → dist/`);
}

build();

if (process.argv.includes('--watch')) {
  let timer = null;
  for (const dir of [path.join(SRC), path.join(ROOT, 'public')]) {
    fs.watch(dir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          build();
        } catch (e) {
          console.error(e.message);
        }
      }, 80);
    });
  }
  console.log('watching src/ and public/ …');
}
