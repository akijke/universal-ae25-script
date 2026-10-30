// =============================================================================
//  UTIL — утилиты монтажа
// =============================================================================
(function () {

    /** Пресеты «на выделение целиком»: выполняем один раз (на первом слое). */
    function once(c) { return c.i === 0; }
    function sortByIndexDesc(layers) {
        var a = layers.slice();
        a.sort(function (x, y) { return y.index - x.index; });
        return a;
    }
    function rect(layer, t) {
        try {
            var r = layer.sourceRectAtTime(t, false);
            if (r.width > 0 && r.height > 0) return r;
        } catch (e) {}
        return { left: 0, top: 0, width: layer.width || 100, height: layer.height || 100 };
    }
    function transformProps(layer) {
        var tr = layer.property('ADBE Transform Group'), r = [];
        for (var i = 1; i <= tr.numProperties; i++) {
            var p = tr.property(i);
            if (p && p.propertyType === PropertyType.PROPERTY) r.push(p);
        }
        return r;
    }

    // -------------------------------------------------------------- timing
    UK.add({
        id: 'util.stagger', cat: 'util', name: 'Stagger Layers · Сдвиг слоёв каскадом',
        desc: 'Каждый следующий выделенный слой (по порядку входа) сдвигается на «Шаг, с».',
        tags: 'stagger offset каскад сдвиг слои',
        apply: function (c) {
            if (!once(c)) return;
            var stg = Number(c.opts.stagger) || 0.1;
            var ls = UK.sortByIn(c.layers);
            for (var i = 0; i < ls.length; i++) ls[i].startTime += stg * i;
        }
    });
    UK.add({
        id: 'util.sequence', cat: 'util', name: 'Sequence Layers · Встык друг за другом',
        desc: 'Выделенные слои расставляются последовательно встык (по порядку входа).',
        tags: 'sequence встык последовательно слои',
        apply: function (c) {
            if (!once(c)) return;
            var ls = UK.sortByIn(c.layers);
            for (var i = 1; i < ls.length; i++) {
                var shift = ls[i - 1].outPoint - ls[i].inPoint;
                ls[i].startTime += shift;
                ls[i].inPoint += shift;
                ls[i].outPoint += shift;
            }
        }
    });
    UK.add({
        id: 'util.trimToPlayhead', cat: 'util', name: 'Trim to Playhead · Обрезать по курсору',
        desc: 'Обрезает ближайшую границу слоя по курсору (вход или выход).',
        tags: 'trim cut обрезать курсор',
        apply: function (c) {
            var t = c.comp.time, L = c.layer;
            if (t <= L.inPoint || t >= L.outPoint) return;
            var mid = (L.inPoint + L.outPoint) / 2;
            if (t < mid) L.inPoint = t; else L.outPoint = t;
        }
    });
    UK.add({
        id: 'util.autoFade', cat: 'util', name: 'Auto Fade In/Out · Фейды на концах',
        desc: 'Ключи прозрачности на входе и выходе слоя длительностью «Длит.».',
        tags: 'fade in out auto фейд прозрачность',
        apply: function (c) {
            var L = c.layer, op = L.transform.opacity;
            var d = Math.min(c.dur, (L.outPoint - L.inPoint) / 2 - c.fd);
            if (d <= 0) return;
            var v = op.valueAtTime(L.inPoint + d, false);
            UK.keys(op, [[L.inPoint, 0], [L.inPoint + d, v], [L.outPoint - d, v], [L.outPoint, 0]], 'smooth');
        }
    });
    UK.add({
        id: 'util.freeze', cat: 'util', name: 'Freeze Frame · Стоп-кадр на курсоре',
        desc: 'Включает Time Remap и замораживает кадр, на котором стоит курсор.',
        tags: 'freeze frame стоп кадр time remap',
        apply: function (c) {
            var L = c.layer;
            if (!L.canSetTimeRemapEnabled) throw new Error('Слой не поддерживает Time Remap');
            L.timeRemapEnabled = true;
            var tr = L.property('ADBE Time Remapping');
            var t = UK.clamp(c.comp.time, L.inPoint, L.outPoint);
            var v = tr.valueAtTime(t, false);
            UK.clearKeys(tr);
            var k = UK.key(tr, t, v);
            UK.setHold(tr, k);
        }
    });
    UK.add({
        id: 'util.reverse', cat: 'util', name: 'Reverse Layer · Реверс',
        desc: 'Воспроизведение задом наперёд через Time Remap.',
        tags: 'reverse backwards реверс обратно',
        apply: function (c) {
            var L = c.layer;
            if (!L.canSetTimeRemapEnabled) throw new Error('Слой не поддерживает Time Remap');
            L.timeRemapEnabled = true;
            var tr = L.property('ADBE Time Remapping');
            var a = 0, b = 0;
            if (tr.numKeys >= 2) { a = tr.keyValue(1); b = tr.keyValue(tr.numKeys); }
            else { b = (L.source && L.source.duration) ? L.source.duration : (L.outPoint - L.inPoint); }
            UK.clearKeys(tr);
            var k1 = UK.key(tr, L.inPoint, b), k2 = UK.key(tr, L.outPoint, a);
            UK.setLinear(tr, k1); UK.setLinear(tr, k2);
        }
    });
    UK.add({
        id: 'util.loopCycle', cat: 'util', name: 'Loop Keyframes (cycle) · Зациклить ключи',
        desc: 'loopOut("cycle") на все анимированные свойства Transform.',
        tags: 'loop cycle зациклить ключи выражение',
        apply: function (c) {
            var ps = transformProps(c.layer);
            for (var i = 0; i < ps.length; i++) if (ps[i].numKeys > 1) ps[i].expression = UK.EXPR.loopOut('cycle');
        }
    });
    UK.add({
        id: 'util.loopPingPong', cat: 'util', name: 'Loop Keyframes (pingpong) · Туда-обратно',
        desc: 'loopOut("pingpong") на все анимированные свойства Transform.',
        tags: 'loop pingpong зациклить туда обратно',
        apply: function (c) {
            var ps = transformProps(c.layer);
            for (var i = 0; i < ps.length; i++) if (ps[i].numKeys > 1) ps[i].expression = UK.EXPR.loopOut('pingpong');
        }
    });
    UK.add({
        id: 'util.bakeExpr', cat: 'util', name: 'Bake Expressions · Запечь выражения в ключи',
        desc: 'Конвертирует выражения Transform в ключи (Convert Expression to Keyframes).',
        tags: 'bake convert expression keyframes запечь выражения',
        apply: function (c) {
            var ps = transformProps(c.layer), any = false;
            for (var i = 0; i < ps.length; i++) {
                try { ps[i].selected = !!(ps[i].expression && ps[i].expressionEnabled); if (ps[i].selected) any = true; } catch (e) {}
            }
            if (!any) return;
            try { app.executeCommand(app.findMenuCommandId('Convert Expression to Keyframes')); } catch (e2) {}
        }
    });

    // -------------------------------------------------------------- geometry
    UK.add({
        id: 'util.centerAnchor', cat: 'util', name: 'Center Anchor Point · Якорь в центр',
        desc: 'Переносит опорную точку в центр содержимого без смещения слоя.',
        tags: 'anchor center якорь центр опорная точка',
        apply: function (c) {
            var L = c.layer, r = rect(L, c.comp.time);
            var ap = L.transform.anchorPoint, pos = L.transform.position, sc = L.transform.scale;
            var a = ap.value, p = pos.value, s = sc.value;
            var na = [r.left + r.width / 2, r.top + r.height / 2];
            var dx = na[0] - a[0], dy = na[1] - a[1];
            var newA = [], newP = [];
            for (var i = 0; i < a.length; i++) newA.push(i < 2 ? na[i] : a[i]);
            for (var j = 0; j < p.length; j++) newP.push(j === 0 ? p[0] + dx * s[0] / 100 : (j === 1 ? p[1] + dy * s[1] / 100 : p[j]));
            ap.setValue(newA);
            pos.setValue(newP);
        }
    });
    UK.add({
        id: 'util.fitToComp', cat: 'util', name: 'Fit to Comp · Вписать в композицию',
        desc: 'Масштабирует слой так, чтобы он целиком вписался в кадр, и центрирует его.',
        tags: 'fit comp scale вписать центр',
        apply: function (c) {
            var L = c.layer, r = rect(L, c.comp.time);
            var k = Math.min(c.comp.width / r.width, c.comp.height / r.height) * 100;
            var sc = L.transform.scale, s = sc.value, ns = [];
            for (var i = 0; i < s.length; i++) ns.push(i < 2 ? k : s[i]);
            sc.setValue(ns);
            L.transform.anchorPoint.setValue(s.length > 2 ? [r.left + r.width / 2, r.top + r.height / 2, 0] : [r.left + r.width / 2, r.top + r.height / 2]);
            var p = L.transform.position.value, np = [c.comp.width / 2, c.comp.height / 2];
            if (p.length > 2) np.push(p[2]);
            L.transform.position.setValue(np);
        }
    });
    UK.add({
        id: 'util.adjOver', cat: 'util', name: 'Adjustment Layer Over · Корр. слой над выделением',
        desc: 'Создаёт корректирующий слой над выделенными слоями на их общую длительность.',
        tags: 'adjustment layer корректирующий слой',
        apply: function (c) {
            if (!once(c)) return;
            var tIn = c.layers[0].inPoint, tOut = c.layers[0].outPoint, top = c.layers[0];
            for (var i = 1; i < c.layers.length; i++) {
                tIn = Math.min(tIn, c.layers[i].inPoint); tOut = Math.max(tOut, c.layers[i].outPoint);
                if (c.layers[i].index < top.index) top = c.layers[i];
            }
            var adj = UK.adjLayer(c.comp, tIn, tOut, 'Adjustment');
            adj.moveBefore(top);
        }
    });
    UK.add({
        id: 'util.parentNull', cat: 'util', name: 'Parent to Null · Привязать к нуль-объекту',
        desc: 'Создаёт Null в центре композиции и делает его родителем всех выделенных слоёв.',
        tags: 'null parent родитель нуль объект',
        apply: function (c) {
            if (!once(c)) return;
            var n = UK.nullLayer(c.comp, 'Control');
            n.transform.position.setValue(UK.center(c.comp));
            var top = c.layers[0];
            for (var i = 0; i < c.layers.length; i++) {
                if (c.layers[i].index < top.index) top = c.layers[i];
                if (c.layers[i] !== n && !c.layers[i].parent) c.layers[i].parent = n;
            }
            n.moveBefore(top);
        }
    });
    UK.add({
        id: 'util.precomposeEach', cat: 'util', name: 'Precompose Each · Прекомпоз каждого',
        desc: 'Каждый выделенный слой — в отдельную прекомпозицию (с переносом атрибутов).',
        tags: 'precompose прекомпоз каждый',
        apply: function (c) {
            if (!once(c)) return;
            var ls = sortByIndexDesc(c.layers);
            for (var i = 0; i < ls.length; i++) {
                c.comp.layers.precompose([ls[i].index], ls[i].name + ' [pre]', true);
            }
        }
    });

    // -------------------------------------------------------------- toggles
    UK.add({
        id: 'util.motionBlur', cat: 'util', name: 'Toggle Motion Blur · Motion Blur вкл/выкл',
        desc: 'Переключает motion blur слоя и включает его в композиции.',
        tags: 'motion blur toggle размытие движения',
        apply: function (c) {
            c.layer.motionBlur = !c.layer.motionBlur;
            try { c.comp.motionBlur = true; } catch (e) {}
        }
    });
    UK.add({
        id: 'util.toggle3D', cat: 'util', name: 'Toggle 3D · 3D-слой вкл/выкл',
        desc: 'Переключает 3D у выделенных слоёв.',
        tags: '3d toggle слой',
        apply: function (c) { c.layer.threeDLayer = !c.layer.threeDLayer; }
    });
    UK.add({
        id: 'util.solo', cat: 'util', name: 'Toggle Solo · Соло вкл/выкл',
        desc: 'Переключает соло у выделенных слоёв.',
        tags: 'solo соло',
        apply: function (c) { c.layer.solo = !c.layer.solo; }
    });
    UK.add({
        id: 'util.removeAllFx', cat: 'util', name: 'Remove All Effects · Удалить все эффекты',
        desc: 'Удаляет ВСЕ эффекты со слоя (не только UniKit).',
        tags: 'remove effects удалить все эффекты очистить',
        apply: function (c) {
            var fxs = c.layer.property('ADBE Effect Parade');
            for (var i = fxs.numProperties; i >= 1; i--) fxs.property(i).remove();
        }
    });
    UK.add({
        id: 'util.marker', cat: 'util', name: 'Marker at Playhead · Маркер на курсоре',
        desc: 'Ставит маркер слоя в позиции курсора.',
        tags: 'marker маркер курсор',
        apply: function (c) {
            c.layer.property('ADBE Marker').setValueAtTime(c.comp.time, new MarkerValue('UK'));
        }
    });

})();
