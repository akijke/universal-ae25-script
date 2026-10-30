// =============================================================================
//  Bridge — API для CEP-панели: JSON, применение пресета к конкретному слою,
//  комбинации (готовые решения), предпросмотр на футаже
// =============================================================================

// ------------------------------------------------------------------ JSON (ExtendScript без JSON)
UK.jsonStr = function (s) {
    s = String(s);
    var out = '"', i, ch, code;
    for (i = 0; i < s.length; i++) {
        ch = s.charAt(i); code = s.charCodeAt(i);
        if (ch === '"') out += '\\"';
        else if (ch === '\\') out += '\\\\';
        else if (ch === '\n') out += '\\n';
        else if (ch === '\r') out += '\\r';
        else if (ch === '\t') out += '\\t';
        else if (code < 32) out += '\\u' + ('000' + code.toString(16)).slice(-4);
        else out += ch;
    }
    return out + '"';
};
UK.json = function (v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number') return isFinite(v) ? String(v) : 'null';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'string') return UK.jsonStr(v);
    if (UK.isArr(v)) {
        var a = [];
        for (var i = 0; i < v.length; i++) a.push(UK.json(v[i]));
        return '[' + a.join(',') + ']';
    }
    if (typeof v === 'object') {
        var o = [];
        for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k) && typeof v[k] !== 'function') o.push(UK.jsonStr(k) + ':' + UK.json(v[k]));
        return '{' + o.join(',') + '}';
    }
    return 'null';
};
/** Очень простой парсер опций из панели: {"dur":0.8,"ease":"expoOut"} и т.д. — через eval. */
UK.parseOpts = function (s) {
    if (!s) return UK.defaultOpts();
    if (typeof s === 'object') return s;
    var o;
    try { o = eval('(' + s + ')'); } catch (e) { o = null; }
    var d = UK.defaultOpts();
    if (!o) return d;
    for (var k in d) if (o[k] !== undefined) d[k] = o[k];
    return d;
};

// ------------------------------------------------------------------ каталог для панели
/** Ключ CSS-превью для пресета (UK.PREVIEW заполняется в 28_previews.jsx). */
UK.PREVIEW = UK.PREVIEW || {};
UK.previewKey = function (p) {
    if (p.preview) return p.preview;
    if (UK.PREVIEW[p.id]) return UK.PREVIEW[p.id];
    var guess = { 'in': 'fadeIn', out: 'fadeOut', trans: 'dissolve', fx: 'grade', distort: 'wave', light: 'sweep', text: 'textUp', cam: 'camera', util: 'tool', combo: 'combo' };
    return guess[p.cat] || 'fadeIn';
};
UK.catalogJSON = function () {
    var items = [], i, p;
    for (i = 0; i < UK.presets.length; i++) {
        p = UK.presets[i];
        items.push({ id: p.id, cat: p.cat, name: p.name, desc: p.desc, tags: p.tags, needs: p.needs, preview: UK.previewKey(p), fav: UK.isFav(p.id) });
    }
    return UK.json({
        version: UK.VERSION,
        cats: UK.CATS,
        eases: UK.EASES.map(function (e) { return { id: e.id, name: e.name }; }),
        dirs: UK.DIRS.map(function (d) { return { id: d.id, name: d.name }; }),
        presets: items,
        favs: UK.favs(),
        settings: {
            dur: UK.settings.get('dur', '0.8'), ease: UK.settings.get('ease', 'expoOut'), strength: UK.settings.get('strength', '100'),
            dir: UK.settings.get('dir', 'L'), startMode: UK.settings.get('startMode', 'in'), stagger: UK.settings.get('stagger', '0.1'),
            controls: UK.settings.get('controls', 'true'), adj: UK.settings.get('adj', 'false'), cat: UK.settings.get('cat', 'in')
        }
    });
};
UK.saveOpts = function (o) {
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) UK.settings.set(k, o[k]);
};

// ------------------------------------------------------------------ состояние выделения (для панели)
UK.selectionJSON = function () {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return UK.json({ comp: false });
    var ls = UK.selectedLayers(comp), names = [], hasText = false, i;
    for (i = 0; i < ls.length; i++) { names.push(ls[i].name); if (UK.isText(ls[i])) hasText = true; }
    return UK.json({ comp: true, compName: comp.name, time: comp.time, count: ls.length, names: names, hasText: hasText });
};

// ------------------------------------------------------------------ запуск с захватом ошибок (для панели)
/** Возвращает JSON {ok:true} или {ok:false, error:'...'}; alert'ы ядра перехватываются. */
UK.runJSON = function (presetId, optsJSON) {
    var opts = UK.parseOpts(optsJSON);
    UK.saveOpts(opts);
    var msgs = [], realAlert = $.global.alert;
    $.global.alert = function (s) { msgs.push(String(s)); };
    try { UK.run(presetId, opts); }
    catch (e) { msgs.push(e.toString()); }
    $.global.alert = realAlert;
    return UK.json(msgs.length ? { ok: false, error: msgs.join('\n') } : { ok: true });
};
UK.toggleFavJSON = function (id) { return UK.json({ fav: UK.toggleFav(id), favs: UK.favs() }); };
UK.cleanJSON = function () {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return UK.json({ ok: false, error: 'Нет композиции' });
    app.beginUndoGroup(UK.NAME + ': удалить');
    var ls = UK.selectedLayers(comp), n = 0;
    for (var i = 0; i < ls.length; i++) n += UK.removeFx(ls[i]);
    app.endUndoGroup();
    return UK.json({ ok: true, removed: n });
};

// ------------------------------------------------------------------ применение к конкретному слою (для комбо)
/**
 * Применить пресет напрямую к слою (без обработки выделения).
 * over — переопределения опций ({dur:0.5, ease:'back', ...}); cat можно переопределить (напр. 'out').
 */
UK.applyTo = function (presetId, layer, baseOpts, over, i) {
    var p = UK.byId[presetId];
    if (!p) throw new Error('Пресет не найден: ' + presetId);
    var opts = UK.mergeOpts(baseOpts, over);
    var comp = layer.containingComp;
    var ctx = UK.ctxFor(comp, layer, [layer], i || 0, opts, p.cat);
    p.apply(ctx);
    return ctx;
};
/** Применить переход напрямую к слоям (A, B могут быть null). */
UK.applyTrans = function (presetId, comp, layers, baseOpts, over) {
    var p = UK.byId[presetId];
    if (!p) throw new Error('Пресет не найден: ' + presetId);
    var opts = UK.mergeOpts(baseOpts, over);
    var ctx = UK.transCtx(comp, layers, opts);
    p.apply(ctx);
    return ctx;
};
UK.mergeOpts = function (base, over) {
    var o = {}, k;
    base = base || UK.defaultOpts();
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) o[k] = base[k];
    if (over) for (k in over) if (Object.prototype.hasOwnProperty.call(over, k)) o[k] = over[k];
    return o;
};

// ------------------------------------------------------------------ предпросмотр на футаже
/**
 * Применяет пресет в отдельной undo-группе, ставит рабочую область на анимацию
 * и запускает предпросмотр. Отмена — UK.previewUndo().
 */
UK.PREVIEW_GROUP = UK.NAME + ' Preview';
UK.previewJSON = function (presetId, optsJSON) {
    var opts = UK.parseOpts(optsJSON);
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return UK.json({ ok: false, error: 'Откройте композицию' });
    var p = UK.byId[presetId];
    if (!p) return UK.json({ ok: false, error: 'Пресет не найден' });
    var layers = UK.selectedLayers(comp);
    var msgs = [], realAlert = $.global.alert;
    $.global.alert = function (s) { msgs.push(String(s)); };
    try {
        // UK.run сам открывает undo-группу с именем пресета — оборачиваем в свою, чтобы отменять одним шагом
        app.beginUndoGroup(UK.PREVIEW_GROUP);
        UK.run(presetId, opts);
        // рабочая область
        var dur = Math.max(comp.frameDuration, Number(opts.dur) || 0.8), t0, t1;
        if (p.needs === 'trans') {
            var tc = UK.transCtx(comp, layers, opts); t0 = tc.t0 - 0.3; t1 = tc.t1 + 0.3;
        } else if (layers.length) {
            var L = UK.sortByIn(layers)[0];
            if (p.cat === 'out') { t1 = (opts.startMode === 'playhead' ? comp.time : L.outPoint) + 0.2; t0 = t1 - dur - 0.6; }
            else { t0 = (opts.startMode === 'playhead' ? comp.time : L.inPoint) - 0.2; t1 = t0 + Math.max(dur, 1.5) + 0.6; }
        } else { t0 = comp.time - 0.5; t1 = comp.time + 1.5; }
        t0 = Math.max(0, t0); t1 = Math.min(comp.duration, Math.max(t1, t0 + comp.frameDuration * 2));
        comp.workAreaStart = t0;
        comp.workAreaDuration = t1 - t0;
        comp.time = t0;
        app.endUndoGroup();
        UK._previewActive = true;
        // запуск предпросмотра (разные версии AE — разные названия команды)
        var ids = ['Preview', 'RAM Preview', 'Play Current Preview'], started = false;
        for (var i = 0; i < ids.length && !started; i++) {
            try { var cid = app.findMenuCommandId(ids[i]); if (cid) { app.executeCommand(cid); started = true; } } catch (e) {}
        }
        if (!started) { try { app.executeCommand(2131); started = true; } catch (e2) {} } // RAM Preview (старый id)
    } catch (e3) { msgs.push(e3.toString()); try { app.endUndoGroup(); } catch (e4) {} }
    $.global.alert = realAlert;
    return UK.json(msgs.length ? { ok: false, error: msgs.join('\n') } : { ok: true, active: true });
};
/** Отменить последний предпросмотр (Undo). */
UK.previewUndoJSON = function () {
    if (!UK._previewActive) return UK.json({ ok: true, undone: false });
    try { app.executeCommand(16); } catch (e) { return UK.json({ ok: false, error: e.toString() }); } // 16 = Undo
    UK._previewActive = false;
    return UK.json({ ok: true, undone: true });
};
/** Оставить предпросмотр как результат. */
UK.previewKeepJSON = function () { UK._previewActive = false; return UK.json({ ok: true }); };
