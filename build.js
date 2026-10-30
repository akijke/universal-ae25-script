// Сборка src/*.jsx -> dist/UniKit.jsx  (node build.js)
const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');
const outDir = path.join(root, 'dist');
const out = path.join(outDir, 'UniKit.jsx');

function collect(dir) {
    let files = [];
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) files = files.concat(collect(p));
        else if (f.endsWith('.jsx')) files.push(p);
    }
    return files;
}

// порядок: по имени файла (префикс NN_), вложенные папки сортируются тем же ключом
const files = collect(srcDir).sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
let code = '';
for (const f of files) {
    code += '\n// ---- ' + path.relative(root, f).replace(/\\/g, '/') + '\n';
    code += fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '') + '\n';
}
fs.mkdirSync(outDir, { recursive: true });
// ExtendScript читает UTF-8 с BOM корректно (нужно для кириллицы в UI)
fs.writeFileSync(out, '\uFEFF' + code, 'utf8');
console.log('built', path.relative(root, out), files.length, 'files,', code.split('\n').length, 'lines');

// --- проверка на не-ES3 синтаксис
const bad = [
    [/=>/, 'arrow function'],
    [/\bconst\s/, 'const'],
    [/\blet\s/, 'let'],
    [/`/, 'template literal'],
    [/\bJSON\./, 'JSON'],
    [/\bArray\.isArray\b/, 'Array.isArray'],
    [/,\s*[\]\}]/, 'trailing comma'],
    [/\bclass\s+\w+/, 'class'],
    [/\.\.\./, 'spread']
];
let problems = 0;
const lines = code.split('\n');
let inBlockComment = false;
lines.forEach((ln, i) => {
    // грубое исключение комментариев
    let s = ln;
    if (inBlockComment) { if (s.indexOf('*/') >= 0) { inBlockComment = false; s = s.slice(s.indexOf('*/') + 2); } else return; }
    if (s.indexOf('/*') >= 0 && s.indexOf('*/') < 0) { inBlockComment = true; s = s.slice(0, s.indexOf('/*')); }
    s = s.replace(/\/\/.*$/, '');
    // убрать строковые литералы, чтобы не ловить ложные срабатывания
    const noStr = s.replace(/'(?:\\.|[^'\\])*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""');
    for (const [re, name] of bad) {
        if (re.test(noStr)) { console.log('  ES3 warning (' + name + ') line ' + (i + 1) + ': ' + ln.trim().slice(0, 100)); problems++; }
    }
});
if (problems) console.log(problems + ' ES3 warning(s)');
