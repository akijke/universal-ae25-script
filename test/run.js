// Прогон всех пресетов через мок AE: node test/run.js [filter]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('./mock_ae.js');

const code = fs.readFileSync(path.join(__dirname, '..', 'dist', 'UniKit.jsx'), 'utf8').replace(/^﻿/, '');
const ctx = Object.assign({ console }, M);
vm.createContext(ctx);
// в ExtendScript $.global — это глобальный объект; в vm им становится сам контекст
ctx.$ = Object.assign({}, M.$, { global: ctx });
ctx.UK_HEADLESS = true;
try {
    vm.runInContext(code, ctx, { filename: 'UniKit.jsx' });
} catch (e) {
    console.error('LOAD ERROR:', e.stack || e);
    process.exit(1);
}
const UK = ctx.$.global.UK;
if (!UK) { console.error('UK not exported (headless flag?)'); process.exit(1); }

const filter = process.argv[2] || '';
const { app, log, TextLayer } = M;

function freshComp() {
    const c = app.project.items.addComp('Test', 1920, 1080, 1, 10, 30);
    const a = c.layers.addSolid([1, 0, 0], 'A', 1920, 1080, 1, 10); a.inPoint = 0; a.outPoint = 5;
    const b = c.layers.addSolid([0, 1, 0], 'B', 1920, 1080, 1, 10); b.inPoint = 5; b.outPoint = 10;
    const t = c.layers.addText('Hello World'); t.inPoint = 1; t.outPoint = 8;
    const s = c.layers.addShape(); s.inPoint = 0; s.outPoint = 10;
    c.time = 5;
    app.project.activeItem = c;
    return { c, a, b, t, s };
}
function select(objs, which) {
    Object.values(objs).forEach(l => { if (l.selected !== undefined) l.selected = false; });
    which.forEach(l => l.selected = true);
}

const optsList = [
    Object.assign(UK.defaultOpts(), { controls: true, adj: false, ease: 'expoOut' }),
    Object.assign(UK.defaultOpts(), { controls: false, adj: false, ease: 'back', dir: 'U', startMode: 'playhead' }),
    Object.assign(UK.defaultOpts(), { controls: true, adj: true, ease: 'bounce', dir: 'D', dur: 0.1, strength: 250 })
];

let fails = 0, ok = 0, total = 0;
const counts = {};
for (const p of UK.presets) {
    counts[p.cat] = (counts[p.cat] || 0) + 1;
    if (filter && p.id.indexOf(filter) < 0) continue;
    total++;
    let presetFailed = false;
    for (const opts of optsList) {
        // сценарии выделения
        const scenarios = [];
        const o1 = freshComp();
        if (p.needs === 'text') scenarios.push([o1, [o1.t]]);
        else if (p.needs === 'trans') { scenarios.push([o1, [o1.a, o1.b]]); const o2 = freshComp(); o2.c.time = 5; scenarios.push([o2, [o2.b]]); const o3 = freshComp(); o3.c.time = 3; scenarios.push([o3, [o3.a]]); }
        else if (p.needs === 'none' || p.needs === 'comp') { scenarios.push([o1, []]); const o2 = freshComp(); scenarios.push([o2, [o2.a]]); }
        else { scenarios.push([o1, [o1.a]]); const o2 = freshComp(); scenarios.push([o2, [o2.a, o2.b, o2.t, o2.s]]); }
        for (const [objs, sel] of scenarios) {
            app.project.activeItem = objs.c;
            select(objs, sel);
            const before = log.alerts.length;
            try {
                UK.run(p.id, opts);
            } catch (e) {
                log.alerts.push('THROWN: ' + (e.stack || e));
            }
            if (app._undo !== 0) { log.alerts.push('undo group not closed'); app._undo = 0; }
            if (log.alerts.length > before) {
                presetFailed = true;
                console.log('FAIL', p.id, '[' + p.cat + ']', 'opts=' + JSON.stringify({ controls: opts.controls, adj: opts.adj, ease: opts.ease }), 'sel=' + sel.map(l => l.name).join(','));
                for (const a of log.alerts.slice(before)) console.log('     ', a.split('\n').join(' | ').slice(0, 400));
            }
        }
    }
    if (presetFailed) fails++; else ok++;
}
// --- bridge API (CEP)
{
    const o = freshComp(); app.project.activeItem = o.c; select(o, [o.a]);
    const cat = JSON.parse(UK.catalogJSON());
    if (!cat.presets || cat.presets.length !== UK.presets.length) { console.log('FAIL catalogJSON'); fails++; }
    const sel = JSON.parse(UK.selectionJSON());
    if (!sel.comp || sel.count !== 1) { console.log('FAIL selectionJSON', sel); fails++; }
    const r = JSON.parse(UK.runJSON('in.fade', '{"dur":0.5,"ease":"back","controls":true}'));
    if (!r.ok) { console.log('FAIL runJSON', r); fails++; }
    const bad = JSON.parse(UK.runJSON('nope.x', '{}'));
    if (bad.ok) { console.log('FAIL runJSON should fail for unknown id'); fails++; }
    select(o, [o.a, o.b]);
    const pv = JSON.parse(UK.previewJSON('trans.zoomBlur', '{"dur":1}'));
    if (!pv.ok) { console.log('FAIL previewJSON', pv); fails++; }
    const un = JSON.parse(UK.previewUndoJSON());
    if (!un.ok || !un.undone) { console.log('FAIL previewUndoJSON', un); fails++; }
    const fv = JSON.parse(UK.toggleFavJSON('in.fade'));
    if (fv.fav !== true) { console.log('FAIL toggleFavJSON', fv); fails++; }
    UK.toggleFav('in.fade');
    // custom bezier ease + ease on selected keys + undo/redo/reset
    select(o, [o.a]);
    const rb = JSON.parse(UK.runJSON('in.slide', '{"dur":0.5,"ease":"custom","bez":[0.6,-0.28,0.735,0.045]}'));
    if (!rb.ok) { console.log('FAIL runJSON custom bez', rb); fails++; }
    const rc = JSON.parse(UK.runJSON('in.scalePop', '{"dur":0.5,"ease":"backOut"}'));
    if (!rc.ok) { console.log('FAIL runJSON curve id', rc); fails++; }
    const pos = o.a.position; pos.selectedKeys = [1, 2]; o.c.selectedProperties = [pos];
    const ek = JSON.parse(UK.applyEaseKeysJSON('[0.25,0.1,0.25,1]'));
    if (!ek.ok || ek.pairs !== 1) { console.log('FAIL applyEaseKeysJSON', ek); fails++; }
    const ru = JSON.parse(UK.undoJSON()); if (!ru.ok) { console.log('FAIL undoJSON', ru); fails++; }
    const rr = JSON.parse(UK.redoJSON()); if (!rr.ok) { console.log('FAIL redoJSON', rr); fails++; }
    const rs = JSON.parse(UK.resetJSON());
    if (!rs.ok || o.a.position.numKeys !== 0 || o.a.property('ADBE Effect Parade').numProperties !== 0) { console.log('FAIL resetJSON', rs, o.a.position.numKeys); fails++; }
    const missing = UK.presets.filter(p => !UK.PREVIEW[p.id] && !p.preview).map(p => p.id);
    if (missing.length) console.log('presets without preview key (' + missing.length + '):', missing.slice(0, 30).join(', '), missing.length > 30 ? '…' : '');
}
console.log('\n=== presets: ' + UK.presets.length + ' total; tested ' + total + '; ok ' + ok + '; FAIL ' + fails);
console.log('by category:', JSON.stringify(counts));
if (log.unknownFx.size) console.log('\nUNKNOWN effect matchNames (проверить!):\n  ' + [...log.unknownFx].join('\n  '));
const warn = [...new Set(log.warnings)];
if (warn.length) { console.log('\nWARNINGS (' + warn.length + '):'); warn.slice(0, 80).forEach(w => console.log('  ' + w)); }
// дубликаты id
const ids = {}; UK.presets.forEach(p => { ids[p.id] = (ids[p.id] || 0) + 1; });
Object.entries(ids).filter(([, n]) => n > 1).forEach(([id, n]) => console.log('DUPLICATE id:', id, n));
process.exit(fails ? 1 : 0);
