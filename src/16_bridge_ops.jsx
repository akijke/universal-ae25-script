// =============================================================================
//  Bridge ops — undo / redo / полный сброс слоя / изинг на выделенные ключи
// =============================================================================
UK.undoJSON = function () {
    try { app.executeCommand(16); UK._previewActive = false; return UK.json({ ok: true }); }
    catch (e) { return UK.json({ ok: false, error: e.toString() }); }
};
UK.redoJSON = function () {
    try { app.executeCommand(17); return UK.json({ ok: true }); }
    catch (e) { return UK.json({ ok: false, error: e.toString() }); }
};

/**
 * Полный сброс изменений UniKit на слое: эффекты и контролы UK, аниматоры/маски с префиксом UK,
 * выражения, ссылающиеся на контролы UK, ключи и выражения на Transform (значение фиксируется
 * по середине слоя). Вспомогательные слои «UK · …» среди выделенных удаляются.
 */
UK.resetLayer = function (layer) {
    var n = 0, i, p;
    n += UK.removeFx(layer);
    try {
        var anims = layer.property('ADBE Text Properties').property('ADBE Text Animators');
        for (i = anims.numProperties; i >= 1; i--) if (anims.property(i).name.indexOf(UK.PREFIX) === 0) { anims.property(i).remove(); n++; }
    } catch (e1) {}
    try {
        var masks = layer.property('ADBE Mask Parade');
        for (i = masks.numProperties; i >= 1; i--) if (masks.property(i).name.indexOf('UK') === 0) { masks.property(i).remove(); n++; }
    } catch (e2) {}
    var tr = layer.property('ADBE Transform Group');
    var mid = (layer.inPoint + layer.outPoint) / 2;
    for (i = 1; i <= tr.numProperties; i++) {
        p = tr.property(i);
        if (!p || p.propertyType !== PropertyType.PROPERTY) continue;
        var touched = false;
        try { if (p.expression) { p.expression = ''; touched = true; } } catch (e3) {}
        try {
            if (p.numKeys > 0) {
                var v = p.valueAtTime(mid, false);
                UK.clearKeys(p);
                try { p.setValue(v); } catch (e4) {}
                touched = true;
            }
        } catch (e5) {}
        if (touched) n++;
    }
    try {
        var fxs = layer.property('ADBE Effect Parade');
        for (i = 1; i <= fxs.numProperties; i++) {
            var fx = fxs.property(i);
            for (var j = 1; j <= fx.numProperties; j++) {
                var q = fx.property(j);
                try { if (q.expression && q.expression.indexOf(UK.CTRL_PREFIX) >= 0) { q.expression = ''; n++; } } catch (e6) {}
            }
        }
    } catch (e7) {}
    return n;
};
UK.resetJSON = function () {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return UK.json({ ok: false, error: 'Откройте композицию' });
    var ls = UK.selectedLayers(comp);
    if (!ls.length) return UK.json({ ok: false, error: 'Выделите слой' });
    app.beginUndoGroup(UK.NAME + ': сброс');
    var n = 0, removed = 0, i;
    for (i = ls.length - 1; i >= 0; i--) {
        if (ls[i].name.indexOf(UK.PREFIX) === 0) { ls[i].remove(); removed++; }
        else n += UK.resetLayer(ls[i]);
    }
    app.endUndoGroup();
    return UK.json({ ok: true, changes: n, removedLayers: removed });
};

/** Применить кривую к выделенным ключам таймлайна (как Flow). bezJSON = '[x1,y1,x2,y2]'. */
UK.applyEaseKeysJSON = function (bezJSON) {
    var bez;
    try { bez = eval('(' + bezJSON + ')'); } catch (e) { bez = null; }
    if (!UK.isArr(bez) || bez.length !== 4) return UK.json({ ok: false, error: 'Некорректная кривая' });
    try {
        app.beginUndoGroup(UK.NAME + ': изинг ключей');
        var n = UK.applyBezToSelectedKeys(bez);
        app.endUndoGroup();
        if (!n) return UK.json({ ok: false, error: 'Выделите минимум 2 соседних ключа на свойстве' });
        return UK.json({ ok: true, pairs: n });
    } catch (e2) { try { app.endUndoGroup(); } catch (e3) {} return UK.json({ ok: false, error: e2.toString() }); }
};
