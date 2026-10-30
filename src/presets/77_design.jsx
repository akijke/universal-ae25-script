// =============================================================================
//  Дизайн (графика) — shape-элементы: плашки, линии, рамки, бейджи, фоны, callout'ы
// =============================================================================
(function () {

    // ------------------------------------------------------------ хелперы UK.D
    var D = UK.D = {
        PAL: {
            accent: [1, 0.478, 0.102, 1],      // #FF7A1A
            white:  [1, 1, 1, 1],
            dark:   [0.067, 0.075, 0.094, 1]   // #111318
        },

        /** Интервал существования графики: по выделенному слою или от курсора. */
        span: function (c) {
            var comp = c.comp, L = c.layer, tIn, tOut;
            if (L) { tIn = L.inPoint; tOut = L.outPoint; }
            else { tIn = comp.time; tOut = Math.min(comp.duration, tIn + Math.max(3, 4 * c.dur)); }
            if (L && c.opts.startMode === 'playhead' && comp.time > tIn && comp.time < tOut) tIn = comp.time;
            if (tOut - tIn < comp.frameDuration * 4) tOut = Math.min(comp.duration, tIn + Math.max(3, 4 * c.dur));
            var d = Math.min(c.dur, (tOut - tIn) / 2.5);
            return { tIn: tIn, tOut: tOut, dur: tOut - tIn, d: d, dOut: d * 0.8, hasOut: (tOut - tIn) > 2.2 * d };
        },

        /** Новый shape-слой. below=true — под выделенным слоем. */
        layer: function (c, name, sp, below) {
            var s = c.comp.layers.addShape();
            s.name = UK.PREFIX + name;
            s.inPoint = sp.tIn;
            s.outPoint = sp.tOut;
            if (c.layer) { if (below) s.moveAfter(c.layer); else s.moveBefore(c.layer); }
            s.label = 9; // green
            UK.motionBlur(s, c.comp);
            return s;
        },
        /** Контекст для UK.applyEaseExpr со слоем-графикой (слайдеры лягут на него). */
        ctx: function (c, layer) { return { strength: c.strength, opts: c.opts, layer: layer, comp: c.comp }; },

        /** Группа: { g, cont (contents), tr (transform) } */
        group: function (layer, name) {
            var g = layer.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
            if (name) g.name = name;
            return { g: g, cont: g.property('ADBE Vectors Group'), tr: g.property('ADBE Vector Transform Group') };
        },
        rect: function (cont, w, h, pos, round) {
            var r = cont.addProperty('ADBE Vector Shape - Rect');
            UK.set(r, 'ADBE Vector Rect Size', [w, h]);
            UK.set(r, 'ADBE Vector Rect Position', pos || [0, 0]);
            if (round != null) UK.set(r, 'ADBE Vector Rect Roundness', round);
            return r;
        },
        ellipse: function (cont, w, h, pos) {
            var e = cont.addProperty('ADBE Vector Shape - Ellipse');
            UK.set(e, 'ADBE Vector Ellipse Size', [w, h]);
            UK.set(e, 'ADBE Vector Ellipse Position', pos || [0, 0]);
            return e;
        },
        star: function (cont, o) {
            var s = cont.addProperty('ADBE Vector Shape - Star');
            UK.set(s, 'ADBE Vector Star Type', o.polygon ? 2 : 1);
            UK.set(s, 'ADBE Vector Star Points', o.points || 5);
            UK.set(s, 'ADBE Vector Star Outer Radius', o.outer || 100);
            if (!o.polygon) UK.set(s, 'ADBE Vector Star Inner Radius', o.inner || 50);
            UK.set(s, 'ADBE Vector Star Rotation', o.rotation || 0);
            UK.set(s, 'ADBE Vector Star Position', o.pos || [0, 0]);
            return s;
        },
        /** Произвольный путь. verts [[x,y]] и т.д., inT/outT — тангенты (или null), closed. */
        path: function (cont, verts, inT, outT, closed) {
            var p = cont.addProperty('ADBE Vector Shape - Group');
            var sh = new Shape();
            sh.vertices = verts;
            var z = [], i;
            for (i = 0; i < verts.length; i++) z.push([0, 0]);
            sh.inTangents = inT || z;
            sh.outTangents = outT || z;
            sh.closed = !!closed;
            UK.set(p, 'ADBE Vector Shape', sh);
            return p;
        },
        /** Цвет: {val, expr}. С контролами — Color Control на слое. */
        col: function (c, layer, name, def) {
            var r = { val: def, expr: null };
            if (c.opts.controls) {
                UK.color(layer, name, def);
                r.expr = UK.ref(name, 'color');
            }
            return r;
        },
        setCol: function (prop, col) {
            if (!prop) return;
            try { prop.setValue(col.val); } catch (e) {}
            if (col.expr) { try { prop.expression = col.expr; } catch (e2) {} }
        },
        fill: function (cont, col, opacity) {
            var f = cont.addProperty('ADBE Vector Graphic - Fill');
            D.setCol(UK.findProp(f, 'ADBE Vector Fill Color'), col);
            if (opacity != null) UK.set(f, 'ADBE Vector Fill Opacity', opacity);
            return f;
        },
        stroke: function (cont, col, width, cap, join) {
            var s = cont.addProperty('ADBE Vector Graphic - Stroke');
            D.setCol(UK.findProp(s, 'ADBE Vector Stroke Color'), col);
            UK.set(s, 'ADBE Vector Stroke Width', width || 4);
            UK.set(s, 'ADBE Vector Stroke Line Cap', cap || 2);
            UK.set(s, 'ADBE Vector Stroke Line Join', join || 2);
            return s;
        },
        /** Пунктир (может быть недоступен в моке — тихо). */
        dashes: function (stroke, dash, gap) {
            try {
                var dg = stroke.property('ADBE Vector Stroke Dashes');
                var d1 = dg.addProperty('ADBE Vector Stroke Dash 1');
                d1.setValue(dash);
                var g1 = dg.addProperty('ADBE Vector Stroke Gap 1');
                g1.setValue(gap);
            } catch (e) {}
        },
        gfill: function (cont, start, end, radial) {
            var g = cont.addProperty('ADBE Vector Graphic - G-Fill');
            UK.set(g, 'ADBE Vector Grad Type', radial ? 2 : 1);
            UK.set(g, 'ADBE Vector Grad Start Pt', start);
            UK.set(g, 'ADBE Vector Grad End Pt', end);
            return g;
        },
        trim: function (cont, start, end, offset) {
            var t = cont.addProperty('ADBE Vector Filter - Trim');
            if (start != null) UK.set(t, 'ADBE Vector Trim Start', start);
            if (end != null) UK.set(t, 'ADBE Vector Trim End', end);
            if (offset != null) UK.set(t, 'ADBE Vector Trim Offset', offset);
            return t;
        },
        repeater: function (cont, copies, pos, rot, scale, op1, op2) {
            var r = cont.addProperty('ADBE Vector Filter - Repeater');
            UK.set(r, 'ADBE Vector Repeater Copies', copies);
            var tr = null;
            try { tr = r.property('ADBE Vector Repeater Transform'); } catch (e) {}
            if (tr) {
                if (pos) UK.set(tr, 'ADBE Vector Repeater Position', pos);
                if (rot != null) UK.set(tr, 'ADBE Vector Repeater Rotation', rot);
                if (scale) UK.set(tr, 'ADBE Vector Repeater Scale', scale);
                if (op1 != null) UK.set(tr, ['ADBE Vector Repeater Opacity 1', 'Start Opacity'], op1);
                if (op2 != null) UK.set(tr, ['ADBE Vector Repeater Opacity 2', 'End Opacity'], op2);
            }
            return r;
        },
        roundCorners: function (cont, radius) {
            var r = cont.addProperty('ADBE Vector Filter - RC');
            UK.set(r, 'ADBE Vector RoundCorner Radius', radius);
            return r;
        },
        offsetPath: function (cont, amount) {
            var o = cont.addProperty('ADBE Vector Filter - Offset');
            UK.set(o, 'ADBE Vector Offset Amount', amount);
            return o;
        },
        wiggle: function (cont, size, detail, freq) {
            var w = cont.addProperty('ADBE Vector Filter - Roughen');
            UK.set(w, 'ADBE Vector Roughen Size', size);
            UK.set(w, 'ADBE Vector Roughen Detail', detail);
            UK.set(w, 'ADBE Vector Temporal Freq', freq);
            return w;
        },

        /** Прямоугольник слоя в координатах композиции: {cx, cy, w, h}. */
        rectOf: function (layer, t) {
            var r, a = [0, 0], p = [0, 0], sc = [100, 100];
            try { r = layer.sourceRectAtTime(t, false); } catch (e) { r = { left: -50, top: -50, width: 100, height: 100 }; }
            try { a = layer.transform.anchorPoint.value; p = layer.transform.position.value; sc = layer.transform.scale.value; } catch (e2) {}
            return {
                cx: p[0] + (r.left + r.width / 2 - a[0]) * sc[0] / 100,
                cy: p[1] + (r.top + r.height / 2 - a[1]) * sc[1] / 100,
                w: Math.abs(r.width * sc[0] / 100), h: Math.abs(r.height * sc[1] / 100)
            };
        },
        /** Поставить слой-графику в точку и, если есть целевой слой, припарентить. */
        place: function (c, s, pt, parentTo) {
            s.transform.position.setValue(pt);
            if (parentTo && c.layer) { try { s.setParentWithJump(c.layer); } catch (e) {} }
        },

        // ---- анимации
        /** Появление + (если есть место) уход для свойства. vIn → vShow → vOut */
        inOut: function (c, prop, vIn, vShow, vOut, sp, easeExpr, layer) {
            UK.key2(prop, sp.tIn, vIn, sp.tIn + sp.d, vShow, c.ease);
            if (easeExpr) UK.applyEaseExpr(prop, c.ease, D.ctx(c, layer));
            if (sp.hasOut && vOut != null) UK.key2(prop, sp.tOut - sp.dOut, vShow, sp.tOut, vOut, c.ease, true);
        },
        /** Trim End 0→100 (рисование) и обратно через Trim Start. */
        draw: function (c, trim, sp, fromEnd) {
            var end = UK.findProp(trim, 'ADBE Vector Trim End'), start = UK.findProp(trim, 'ADBE Vector Trim Start');
            if (fromEnd) {
                UK.key2(start, sp.tIn, 100, sp.tIn + sp.d, 0, c.ease);
                if (sp.hasOut) UK.key2(end, sp.tOut - sp.dOut, 100, sp.tOut, 0, c.ease, true);
            } else {
                UK.key2(end, sp.tIn, 0, sp.tIn + sp.d, 100, c.ease);
                if (sp.hasOut) UK.key2(start, sp.tOut - sp.dOut, 0, sp.tOut, 100, c.ease, true);
            }
        },
        /** Масштаб группы: от оси (X / Y / обе). */
        scaleIn: function (c, tr, axis, sp, layer) {
            var sc = UK.findProp(tr, 'ADBE Vector Scale');
            var vIn = axis === 'x' ? [0, 100] : (axis === 'y' ? [100, 0] : [0, 0]);
            D.inOut(c, sc, vIn, [100, 100], vIn, sp, true, layer);
        },
        fadeIn: function (c, prop, sp, show) {
            D.inOut(c, prop, 0, show == null ? 100 : show, 0, sp, false);
        },
        slideIn: function (c, tr, dist, sp, layer) {
            var pos = UK.findProp(tr, 'ADBE Vector Position');
            var off = UK.vecMul(c.dirV, dist);
            D.inOut(c, pos, off, [0, 0], off, sp, true, layer);
        },
        /** Слайдер (контрол или константа) — удобная обёртка UK.cv на слое-графике. */
        cv: function (c, layer, name, val) { return UK.cv({ opts: c.opts, layer: layer }, name, val); },
        /** Точка на краю композиции по направлению, с отступом. */
        edgePoint: function (comp, dirV, margin) {
            var cx = comp.width / 2, cy = comp.height / 2;
            return [cx + dirV[0] * (comp.width / 2 - margin), cy + dirV[1] * (comp.height / 2 - margin)];
        },
        add: function (p) { if (!p.needs) p.needs = 'none'; p.cat = 'design'; UK.add(p); }
    };

    // ============================================================ ПЛАШКИ / ТИТРЫ
    D.add({
        id: 'design.lowerThirdBar', name: 'Lower Third Bar · Титр-плашка',
        desc: 'Тёмная плашка с акцентной полоской внизу слева: полоска вырастает, плашка раскрывается по ширине. Цвета и скругление — контролы.',
        tags: 'lower third плашка титр bar нижняя треть', preview: 'bar',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Lower Third', sp, true);
            var w = Math.round(comp.width * 0.3), h = Math.round(comp.height * 0.085);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), dark = D.col(c, s, 'Color 2', D.PAL.dark);
            var round = D.cv(c, s, 'Roundness', 6);
            var side = c.dirId === 'R' ? 1 : -1; // справа только при «→», иначе слева
            var x = side < 0 ? comp.width * 0.08 : comp.width * 0.92;
            var y = comp.height * 0.8;
            D.place(c, s, [x, y], false);
            // плашка (раскрывается от стороны)
            var bar = D.group(s, 'Bar');
            var r = D.rect(bar.cont, w, h, [side * (w / 2 + 14), 0], 6);
            UK.expr(r, 'ADBE Vector Rect Roundness', round);
            D.fill(bar.cont, dark, 92);
            D.scaleIn(c, bar.tr, 'x', sp, s);
            // акцентная полоска (растёт по высоте)
            var ac = D.group(s, 'Accent');
            D.rect(ac.cont, 10, h, [side * 5, 0], 3);
            D.fill(ac.cont, acc);
            D.scaleIn(c, ac.tr, 'y', sp, s);
        }
    });

    D.add({
        id: 'design.lowerThirdLine', name: 'Lower Third Line · Минимальный титр',
        desc: 'Тонкая акцентная линия рисуется слева направо, под ней полупрозрачная подложка проявляется. Минималистичный титр.',
        tags: 'lower third line минимал титр линия', preview: 'line',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Lower Third Line', sp, true);
            var w = Math.round(comp.width * 0.26);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), dark = D.col(c, s, 'Color 2', D.PAL.dark);
            D.place(c, s, [comp.width * 0.08, comp.height * 0.78], false);
            var back = D.group(s, 'Backing');
            D.rect(back.cont, w, comp.height * 0.1, [w / 2, comp.height * 0.05 + 8], 4);
            D.fill(back.cont, dark, 55);
            D.fadeIn(c, UK.findProp(back.tr, 'ADBE Vector Group Opacity'), sp, 100);
            var ln = D.group(s, 'Line');
            D.path(ln.cont, [[0, 0], [w, 0]]);
            D.stroke(ln.cont, acc, 5, 1);
            var tr = D.trim(ln.cont, 0, 100, 0);
            D.draw(c, tr, sp, false);
        }
    });

    D.add({
        id: 'design.titleUnderline', name: 'Title Underline · Подчёркивание', needs: 'layer',
        desc: 'Линия под выделенным слоем (текстом) рисуется по ширине его содержимого, следует за слоем. Толщина и цвет — контролы.',
        tags: 'underline подчёркивание линия текст title', preview: 'line',
        apply: function (c) {
            var sp = D.span(c), s = D.layer(c, 'Underline', sp, true);
            var R = D.rectOf(c.layer, sp.tIn + sp.d);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent);
            var thick = D.cv(c, s, 'Thickness', Math.max(3, Math.round(R.h * 0.08)));
            D.place(c, s, [R.cx, R.cy + R.h / 2 + Math.max(10, R.h * 0.18)], true);
            var g = D.group(s, 'Line');
            var fromRight = c.dirId === 'R';
            D.path(g.cont, fromRight ? [[R.w / 2, 0], [-R.w / 2, 0]] : [[-R.w / 2, 0], [R.w / 2, 0]]);
            var st = D.stroke(g.cont, acc, 6, 1);
            UK.expr(st, 'ADBE Vector Stroke Width', thick);
            D.draw(c, D.trim(g.cont, 0, 100, 0), sp, false);
        }
    });

    D.add({
        id: 'design.textBacking', name: 'Text Box Backing · Подложка под текст', needs: 'layer',
        desc: 'Скруглённая плашка за слоем с отступами по его размеру; раскрывается по ширине с перелётом. Скругление, отступ и цвет — контролы.',
        tags: 'backing box плашка подложка текст rect', preview: 'bar',
        apply: function (c) {
            var sp = D.span(c), s = D.layer(c, 'Backing', sp, true);
            var R = D.rectOf(c.layer, sp.tIn + sp.d);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var pad = Math.round(Math.max(R.h * 0.35, 18));
            var round = D.cv(c, s, 'Roundness', Math.round(R.h * 0.25));
            D.place(c, s, [R.cx, R.cy], true);
            var g = D.group(s, 'Box');
            var r = D.rect(g.cont, R.w + pad * 2, R.h + pad * 1.2, [0, 0], 12);
            UK.expr(r, 'ADBE Vector Rect Roundness', round);
            D.fill(g.cont, col);
            D.scaleIn(c, g.tr, 'x', sp, s);
        }
    });

    D.add({
        id: 'design.highlightMarker', name: 'Highlight Marker · Маркер за текстом', needs: 'layer',
        desc: 'Маркерная заливка за текстом с лёгким наклоном, закрашивается слева направо как фломастером.',
        tags: 'highlight marker маркер выделение текст', preview: 'wipe',
        apply: function (c) {
            var sp = D.span(c), s = D.layer(c, 'Marker', sp, true);
            var R = D.rectOf(c.layer, sp.tIn + sp.d);
            var col = D.col(c, s, 'Color 1', [1, 0.86, 0.2, 1]);
            D.place(c, s, [R.cx, R.cy + R.h * 0.12], true);
            var g = D.group(s, 'Marker');
            var w = R.w + 24, h = R.h * 0.62;
            var dir = c.dirId === 'R' ? -1 : 1;
            D.rect(g.cont, w, h, [dir * w / 2, 0], 4);
            D.fill(g.cont, col, 85);
            UK.set(g.tr, 'ADBE Vector Position', [-dir * w / 2, 0]);
            UK.set(g.tr, 'ADBE Vector Rotation', -1.2);
            var sc = UK.findProp(g.tr, 'ADBE Vector Scale');
            UK.key2(sc, sp.tIn, [0, 100], sp.tIn + sp.d, [100, 100], 'expoInOut');
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut, [100, 0], c.ease, true);
            s.blendingMode = BlendingMode.MULTIPLY;
        }
    });

    D.add({
        id: 'design.pillTag', name: 'Pill Tag · Тег-капсула',
        desc: 'Капсула-тег влетает по направлению с перелётом и уходит обратно. Для подписей, хештегов, категорий.',
        tags: 'pill tag капсула хештег badge label', preview: 'slideIn',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Pill Tag', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var w = comp.width * 0.16, h = comp.height * 0.07;
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy - R.h / 2 - h]; })() : [comp.width * 0.18, comp.height * 0.2];
            D.place(c, s, pt, !!c.layer);
            var g = D.group(s, 'Pill');
            D.rect(g.cont, w, h, [0, 0], h / 2);
            D.fill(g.cont, col);
            D.slideIn(c, g.tr, Math.max(comp.width, comp.height) * 0.25 * c.strength, sp, s);
            D.fadeIn(c, UK.findProp(g.tr, 'ADBE Vector Group Opacity'), sp, 100);
        }
    });

    D.add({
        id: 'design.ribbonBanner', name: 'Ribbon Banner · Лента',
        desc: 'Лента-баннер с уголками по бокам: раскрывается по ширине, хвосты выезжают следом.',
        tags: 'ribbon banner лента баннер', preview: 'bar',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Ribbon', sp, false);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), dark = D.col(c, s, 'Color 2', [0.75, 0.3, 0.05, 1]);
            var w = comp.width * 0.34, h = comp.height * 0.09, t = h * 0.75;
            D.place(c, s, [comp.width / 2, comp.height * 0.22], false);
            var tails = D.group(s, 'Tails');
            D.path(tails.cont, [[-w / 2 - t, -h / 2 + h * 0.2], [-w / 2 + 2, -h / 2 + h * 0.2], [-w / 2 + 2, h / 2 + h * 0.2], [-w / 2 - t, h / 2 + h * 0.2], [-w / 2 - t * 0.55, h * 0.2]], null, null, true);
            D.path(tails.cont, [[w / 2 + t, -h / 2 + h * 0.2], [w / 2 - 2, -h / 2 + h * 0.2], [w / 2 - 2, h / 2 + h * 0.2], [w / 2 + t, h / 2 + h * 0.2], [w / 2 + t * 0.55, h * 0.2]], null, null, true);
            D.fill(tails.cont, dark);
            D.scaleIn(c, tails.tr, 'x', sp, s);
            var main = D.group(s, 'Ribbon');
            D.rect(main.cont, w, h, [0, 0], 0);
            D.fill(main.cont, acc);
            D.scaleIn(c, main.tr, 'x', sp, s);
        }
    });

    // ============================================================ РАМКИ
    D.add({
        id: 'design.frameBorder', name: 'Frame Border · Рамка по кадру',
        desc: 'Обводка по периметру композиции рисуется по часовой стрелке (trim). Отступ, толщина и цвет — контролы.',
        tags: 'frame border рамка обводка кадр', preview: 'frame',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Frame', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var m = Math.round(comp.height * 0.05), hw = comp.width / 2 - m, hh = comp.height / 2 - m;
            var thick = D.cv(c, s, 'Thickness', Math.max(4, Math.round(comp.height * 0.008)));
            var g = D.group(s, 'Border');
            D.path(g.cont, [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]], null, null, true);
            var st = D.stroke(g.cont, col, 8, 1, 1);
            UK.expr(st, 'ADBE Vector Stroke Width', thick);
            D.draw(c, D.trim(g.cont, 0, 100, 0), sp, false);
        }
    });

    D.add({
        id: 'design.frameCorners', name: 'Frame Corners · Уголки кадра',
        desc: 'Четыре уголка-скобки по углам композиции: съезжаются из-за краёв и дорисовываются. Как видоискатель/HUD.',
        tags: 'corners уголки рамка hud viewfinder', preview: 'frame',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Corners', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var m = comp.height * 0.06, L = comp.height * 0.08, hw = comp.width / 2 - m, hh = comp.height / 2 - m;
            var thick = D.cv(c, s, 'Thickness', Math.max(4, Math.round(comp.height * 0.007)));
            var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
            for (var i = 0; i < 4; i++) {
                var sx = corners[i][0], sy = corners[i][1];
                var g = D.group(s, 'Corner ' + (i + 1));
                D.path(g.cont, [[sx * hw, sy * (hh - L)], [sx * hw, sy * hh], [sx * (hw - L), sy * hh]]);
                var st = D.stroke(g.cont, col, 6, 1, 1);
                UK.expr(st, 'ADBE Vector Stroke Width', thick);
                D.draw(c, D.trim(g.cont, 0, 100, 0), sp, false);
                var pos = UK.findProp(g.tr, 'ADBE Vector Position');
                var off = [sx * 60 * c.strength, sy * 60 * c.strength];
                D.inOut(c, pos, off, [0, 0], off, sp, true, s);
            }
        }
    });

    D.add({
        id: 'design.roundedFrame', name: 'Rounded Frame · Скруглённая рамка',
        desc: 'Толстая скруглённая рамка-обводка с небольшим отступом внутрь кадра, мягко проявляется с масштаба 104 %.',
        tags: 'rounded frame рамка скруглённая', preview: 'frame',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Rounded Frame', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var m = comp.height * 0.04;
            var thick = D.cv(c, s, 'Thickness', Math.round(comp.height * 0.02));
            var round = D.cv(c, s, 'Roundness', Math.round(comp.height * 0.04));
            var g = D.group(s, 'Frame');
            var r = D.rect(g.cont, comp.width - m * 2, comp.height - m * 2, [0, 0], 40);
            UK.expr(r, 'ADBE Vector Rect Roundness', round);
            var st = D.stroke(g.cont, col, 20, 1, 2);
            UK.expr(st, 'ADBE Vector Stroke Width', thick);
            D.inOut(c, UK.findProp(g.tr, 'ADBE Vector Scale'), [104, 104], [100, 100], [104, 104], sp, false);
            D.fadeIn(c, UK.findProp(g.tr, 'ADBE Vector Group Opacity'), sp, 100);
        }
    });

    D.add({
        id: 'design.brackets', name: 'Brackets · Скобки вокруг слоя', needs: 'layer',
        desc: 'Две квадратные скобки по бокам выделенного слоя: съезжаются снаружи и проявляются, следуют за слоем.',
        tags: 'brackets скобки рамка текст', preview: 'frame',
        apply: function (c) {
            var sp = D.span(c), s = D.layer(c, 'Brackets', sp, false);
            var R = D.rectOf(c.layer, sp.tIn + sp.d);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var thick = D.cv(c, s, 'Thickness', Math.max(3, Math.round(R.h * 0.06)));
            var pad = Math.max(16, R.h * 0.3), hw = R.w / 2 + pad, hh = R.h / 2 + pad * 0.6, L = Math.max(12, R.h * 0.25);
            D.place(c, s, [R.cx, R.cy], true);
            var sides = [-1, 1];
            for (var i = 0; i < 2; i++) {
                var sx = sides[i];
                var g = D.group(s, sx < 0 ? 'Left' : 'Right');
                D.path(g.cont, [[sx * (hw - L), -hh], [sx * hw, -hh], [sx * hw, hh], [sx * (hw - L), hh]]);
                var st = D.stroke(g.cont, col, 5, 1, 1);
                UK.expr(st, 'ADBE Vector Stroke Width', thick);
                var pos = UK.findProp(g.tr, 'ADBE Vector Position');
                var off = [sx * 80 * c.strength, 0];
                D.inOut(c, pos, off, [0, 0], off, sp, true, s);
                D.fadeIn(c, UK.findProp(g.tr, 'ADBE Vector Group Opacity'), sp, 100);
            }
        }
    });

    D.add({
        id: 'design.recFrame', name: 'REC Frame · Рамка записи',
        desc: 'Уголки видоискателя + мигающая красная точка и плашка REC в углу. Как запись с камеры.',
        tags: 'rec recording камера видоискатель hud frame', preview: 'frame',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'REC Frame', sp, false);
            var white = D.col(c, s, 'Color 1', D.PAL.white), red = D.col(c, s, 'Color 2', [0.95, 0.15, 0.15, 1]);
            var m = comp.height * 0.07, L = comp.height * 0.07, hw = comp.width / 2 - m, hh = comp.height / 2 - m;
            var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
            for (var i = 0; i < 4; i++) {
                var sx = corners[i][0], sy = corners[i][1];
                var g = D.group(s, 'Corner ' + (i + 1));
                D.path(g.cont, [[sx * hw, sy * (hh - L)], [sx * hw, sy * hh], [sx * (hw - L), sy * hh]]);
                D.stroke(g.cont, white, Math.max(4, comp.height * 0.006), 1, 1);
                D.draw(c, D.trim(g.cont, 0, 100, 0), sp, false);
            }
            var dot = D.group(s, 'REC dot');
            var dr = comp.height * 0.014;
            D.ellipse(dot.cont, dr * 2, dr * 2, [-hw + L + dr, -hh + L * 0.5]);
            D.fill(dot.cont, red);
            UK.expr(dot.tr, 'ADBE Vector Group Opacity', 'Math.floor((time - inPoint) * 2) % 2 == 0 ? 100 : 15');
            var bar = D.group(s, 'REC bar');
            D.rect(bar.cont, comp.height * 0.07, comp.height * 0.03, [-hw + L + dr * 2 + comp.height * 0.05, -hh + L * 0.5], 4);
            D.fill(bar.cont, white, 85);
            D.fadeIn(c, UK.findProp(bar.tr, 'ADBE Vector Group Opacity'), sp, 85);
        }
    });

    // ============================================================ СПЛИТЫ / ФОНЫ
    function splitScreen(n) {
        return function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Split ' + n, sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var thick = D.cv(c, s, 'Thickness', Math.max(4, Math.round(comp.height * 0.008)));
            var vertical = !(c.dirId === 'U' || c.dirId === 'D');
            for (var i = 1; i < n; i++) {
                var g = D.group(s, 'Divider ' + i);
                if (vertical) {
                    var x = -comp.width / 2 + comp.width * i / n;
                    D.path(g.cont, [[x, 0], [x, -comp.height / 2]]);
                    D.path(g.cont, [[x, 0], [x, comp.height / 2]]);
                } else {
                    var y = -comp.height / 2 + comp.height * i / n;
                    D.path(g.cont, [[0, y], [-comp.width / 2, y]]);
                    D.path(g.cont, [[0, y], [comp.width / 2, y]]);
                }
                var st = D.stroke(g.cont, col, 8, 1, 1);
                UK.expr(st, 'ADBE Vector Stroke Width', thick);
                D.draw(c, D.trim(g.cont, 0, 100, 0), sp, false);
            }
        };
    }
    D.add({ id: 'design.split2', name: 'Split Screen 2 · Разделитель ×2', desc: 'Линия-разделитель пополам расходится из центра. Направление ↑/↓ — горизонтальный сплит.', tags: 'split screen сплит разделитель 2', preview: 'grid', apply: splitScreen(2) });
    D.add({ id: 'design.split3', name: 'Split Screen 3 · Разделитель ×3', desc: 'Две линии делят кадр на три части, рисуются из центра.', tags: 'split screen сплит разделитель 3', preview: 'grid', apply: splitScreen(3) });
    D.add({ id: 'design.split4', name: 'Split Screen 4 · Разделитель ×4', desc: 'Три линии делят кадр на четыре части, рисуются из центра.', tags: 'split screen сплит разделитель 4', preview: 'grid', apply: splitScreen(4) });

    D.add({
        id: 'design.dotsGrid', name: 'Dots Grid · Сетка точек',
        desc: 'Фоновая сетка точек через два репитера, плавно проявляется и медленно дрейфует. Размер/шаг — контролы.',
        tags: 'dots grid сетка точки фон background pattern', preview: 'grid',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Dots Grid', sp, true);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var step = comp.width / 16, nx = 18, ny = Math.ceil(comp.height / step) + 2;
            var g = D.group(s, 'Dots');
            var e = D.ellipse(g.cont, 6, 6, [0, 0]);
            UK.expr(e, 'ADBE Vector Ellipse Size', '[1,1] * ' + D.cv(c, s, 'Dot Size', 6));
            D.fill(g.cont, col, 35);
            D.repeater(g.cont, nx, [step, 0], 0, [100, 100], 100, 100);
            D.repeater(g.cont, ny, [0, step], 0, [100, 100], 100, 100);
            UK.set(g.tr, 'ADBE Vector Position', [-step * (nx - 1) / 2, -step * (ny - 1) / 2]);
            UK.expr(g.tr, 'ADBE Vector Position', 'value + [Math.sin(time * 0.4) * 10, Math.cos(time * 0.3) * 10]');
            D.fadeIn(c, s.transform.opacity, sp, 100);
        }
    });

    D.add({
        id: 'design.stripesBg', name: 'Stripes Background · Полосы',
        desc: 'Диагональные полосы движутся бесконечно (выражение), проявляются по прозрачности. Скорость и толщина — контролы.',
        tags: 'stripes полосы фон background diagonal', preview: 'grid',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Stripes', sp, true);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var period = comp.width / 12, n = 40, L = Math.max(comp.width, comp.height) * 2.2;
            var speed = D.cv(c, s, 'Speed', 60);
            var g = D.group(s, 'Stripes');
            var r = D.rect(g.cont, period * 0.45, L, [0, 0], 0);
            UK.expr(r, 'ADBE Vector Rect Size', '[' + D.cv(c, s, 'Stripe Width', Math.round(period * 0.45)) + ', ' + Math.round(L) + ']');
            D.fill(g.cont, col, 18);
            D.repeater(g.cont, n, [period, 0], 0, [100, 100], 100, 100);
            UK.set(g.tr, 'ADBE Vector Rotation', 35);
            UK.set(g.tr, 'ADBE Vector Position', [-period * n / 2, 0]);
            UK.expr(g.tr, 'ADBE Vector Position', 'var p = ' + period + '; var sh = ((time - inPoint) * ' + speed + ') % p; value + [sh * Math.cos(degreesToRadians(35)), sh * Math.sin(degreesToRadians(35))]');
            D.fadeIn(c, s.transform.opacity, sp, 100);
        }
    });

    D.add({
        id: 'design.gradientBg', name: 'Gradient Background · Градиент',
        desc: 'Фон с радиальным градиентом (Gradient Fill) на весь кадр, мягко проявляется. Цвета градиента правятся в Gradient Fill.',
        tags: 'gradient градиент фон background', preview: 'fadeIn',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Gradient BG', sp, true);
            var g = D.group(s, 'Gradient');
            D.rect(g.cont, comp.width, comp.height, [0, 0], 0);
            D.gfill(g.cont, [0, 0], [comp.width * 0.6, comp.height * 0.6], true);
            UK.expr(g.tr, 'ADBE Vector Scale', 'value + [1,1] * Math.sin(time * 0.5) * 3');
            D.fadeIn(c, s.transform.opacity, sp, 100);
        }
    });

    D.add({
        id: 'design.animatedGrid', name: 'Animated Grid · Сетка линий',
        desc: 'Линии сетки рисуются по горизонтали и вертикали (trim), уходят обратно. Фон для tech/UI-стилистики.',
        tags: 'grid сетка линии tech фон', preview: 'grid',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Grid', sp, true);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var step = comp.height / 8, nx = Math.ceil(comp.width / step) + 1, ny = 9;
            var h = D.group(s, 'Horizontal');
            D.path(h.cont, [[-comp.width / 2, 0], [comp.width / 2, 0]]);
            D.stroke(h.cont, col, 2, 1);
            D.trim(h.cont, 0, 100, 0);
            D.draw(c, UK.findProp(h.cont, 'ADBE Vector Filter - Trim'), sp, false);
            D.repeater(h.cont, ny, [0, step], 0, [100, 100], 100, 100);
            UK.set(h.tr, 'ADBE Vector Position', [0, -step * (ny - 1) / 2]);
            var v = D.group(s, 'Vertical');
            D.path(v.cont, [[0, -comp.height / 2], [0, comp.height / 2]]);
            D.stroke(v.cont, col, 2, 1);
            D.draw(c, D.trim(v.cont, 0, 100, 0), sp, false);
            D.repeater(v.cont, nx, [step, 0], 0, [100, 100], 100, 100);
            UK.set(v.tr, 'ADBE Vector Position', [-step * (nx - 1) / 2, 0]);
            s.transform.opacity.setValue(30);
        }
    });

    D.add({
        id: 'design.geoPattern', name: 'Geometric Pattern · Квадраты',
        desc: 'Сетка квадратов с поворотом и масштабом вырастает с перелётом, затем сжимается. Фон или reveal-подложка.',
        tags: 'pattern geometric squares квадраты фон reveal', preview: 'grid',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Geo Pattern', sp, true);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var step = comp.height / 6, nx = Math.ceil(comp.width / step) + 2, ny = 8;
            var g = D.group(s, 'Cells');
            D.rect(g.cont, step * 0.82, step * 0.82, [0, 0], 8);
            D.fill(g.cont, col, 70);
            D.repeater(g.cont, nx, [step, 0], 0, [100, 100], 100, 100);
            D.repeater(g.cont, ny, [0, step], 0, [100, 100], 100, 100);
            UK.set(g.tr, 'ADBE Vector Position', [-step * (nx - 1) / 2, -step * (ny - 1) / 2]);
            UK.set(g.tr, 'ADBE Vector Anchor', [0, 0]);
            // масштаб и поворот всего поля
            var sc = s.transform.scale, rot = s.transform.rotation;
            UK.key2(sc, sp.tIn, [0, 0, 100], sp.tIn + sp.d, [100, 100, 100], c.ease);
            UK.applyEaseExpr(sc, c.ease, D.ctx(c, s));
            UK.key2(rot, sp.tIn, 45 * c.strength, sp.tIn + sp.d, 0, c.ease);
            if (sp.hasOut) { UK.key2(sc, sp.tOut - sp.dOut, [100, 100, 100], sp.tOut, [0, 0, 100], c.ease, true); UK.key2(rot, sp.tOut - sp.dOut, 0, sp.tOut, -45 * c.strength, c.ease, true); }
        }
    });

    D.add({
        id: 'design.softBlob', name: 'Soft Blob · Мягкое пятно',
        desc: 'Органичное пятно (эллипс + Wiggle Paths + свечение) медленно живёт и вращается, проявляется из нуля. Фоновый акцент.',
        tags: 'blob пятно органика фон glow liquid', preview: 'liquid',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Blob', sp, true);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var g = D.group(s, 'Blob');
            D.ellipse(g.cont, comp.height * 0.55, comp.height * 0.45, [0, 0]);
            D.fill(g.cont, col, 80);
            D.wiggle(g.cont, 60 * c.strength, 4, 0.4);
            UK.expr(g.tr, 'ADBE Vector Rotation', 'time * 8');
            var glow = UK.addFx(s, 'ADBE Glo2', 'Blob Glow');
            UK.set(glow, 'ADBE Glo2-0002', 30); UK.set(glow, 'ADBE Glo2-0003', 120); UK.set(glow, 'ADBE Glo2-0004', 0.8);
            var sc = s.transform.scale;
            UK.key2(sc, sp.tIn, [0, 0, 100], sp.tIn + sp.d, [100, 100, 100], c.ease);
            UK.applyEaseExpr(sc, c.ease, D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100, 100], sp.tOut, [0, 0, 100], c.ease, true);
        }
    });

    D.add({
        id: 'design.letterboxShapes', name: 'Letterbox Bars · Кинополосы',
        desc: 'Две чёрные плашки выезжают сверху и снизу (кинематографические полосы), высота — контрол.',
        tags: 'letterbox cinematic bars полосы кино', preview: 'letterbox',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Letterbox', sp, false);
            var col = D.col(c, s, 'Color 1', [0, 0, 0, 1]);
            var hExpr = D.cv(c, s, 'Bar Height', Math.round(comp.height * 0.12));
            var sides = [-1, 1];
            for (var i = 0; i < 2; i++) {
                var sy = sides[i];
                var g = D.group(s, sy < 0 ? 'Top' : 'Bottom');
                var r = D.rect(g.cont, comp.width + 4, comp.height * 0.12, [0, sy * (comp.height / 2 - comp.height * 0.06)], 0);
                UK.expr(r, 'ADBE Vector Rect Size', '[' + (comp.width + 4) + ', ' + hExpr + ']');
                UK.expr(r, 'ADBE Vector Rect Position', '[0, ' + sy + ' * (' + (comp.height / 2) + ' - ' + hExpr + ' / 2)]');
                D.fill(g.cont, col);
                var pos = UK.findProp(g.tr, 'ADBE Vector Position');
                var off = [0, sy * comp.height * 0.14];
                D.inOut(c, pos, off, [0, 0], off, sp, false);
            }
        }
    });

    // ============================================================ ВСПЫШКИ / ЧАСТИЦЫ
    D.add({
        id: 'design.circleBurst', name: 'Circle Burst · Кольца',
        desc: 'Три концентрических кольца расходятся из точки и растворяются. Акцент на появление объекта/клика.',
        tags: 'burst кольца circle ring pop клик', preview: 'burst',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Circle Burst', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy]; })() : UK.center(comp);
            D.place(c, s, pt, false);
            var size = comp.height * 0.5 * c.strength;
            var g = D.group(s, 'Rings');
            D.ellipse(g.cont, size, size, [0, 0]);
            var st = D.stroke(g.cont, col, 10, 1);
            D.repeater(g.cont, 3, [0, 0], 0, [70, 70], 100, 30);
            var sc = UK.findProp(g.tr, 'ADBE Vector Scale'), op = UK.findProp(g.tr, 'ADBE Vector Group Opacity');
            var d = Math.min(sp.d * 1.6, sp.dur);
            UK.key2(sc, sp.tIn, [0, 0], sp.tIn + d, [100, 100], 'expoOut');
            UK.keys(op, [[sp.tIn, 100], [sp.tIn + d * 0.5, 100], [sp.tIn + d, 0]], 'smooth');
            var w = UK.findProp(st, 'ADBE Vector Stroke Width');
            UK.key2(w, sp.tIn, 24, sp.tIn + d, 2, 'expoOut');
            s.outPoint = Math.min(sp.tOut, sp.tIn + d + c.fd);
        }
    });

    D.add({
        id: 'design.lineBurst', name: 'Line Burst · Лучи',
        desc: 'Двенадцать коротких лучей вылетают из центра и укорачиваются (trim) — классический cartoon-акцент.',
        tags: 'burst лучи lines rays cartoon pop', preview: 'burst',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Line Burst', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy]; })() : UK.center(comp);
            D.place(c, s, pt, false);
            var r0 = comp.height * 0.12, r1 = comp.height * 0.3 * c.strength;
            var g = D.group(s, 'Rays');
            D.path(g.cont, [[0, -r0], [0, -r1]]);
            D.stroke(g.cont, col, 8, 2);
            var tr = D.trim(g.cont, 0, 100, 0);
            D.repeater(g.cont, 12, [0, 0], 30, [100, 100], 100, 100);
            var d = Math.min(sp.d * 1.3, sp.dur);
            var end = UK.findProp(tr, 'ADBE Vector Trim End'), start = UK.findProp(tr, 'ADBE Vector Trim Start');
            UK.key2(end, sp.tIn, 0, sp.tIn + d * 0.55, 100, 'expoOut');
            UK.key2(start, sp.tIn + d * 0.25, 0, sp.tIn + d, 100, 'expoIn');
            UK.key2(UK.findProp(g.tr, 'ADBE Vector Scale'), sp.tIn, [60, 60], sp.tIn + d, [120, 120], 'expoOut');
            s.outPoint = Math.min(sp.tOut, sp.tIn + d + c.fd);
        }
    });

    D.add({
        id: 'design.confettiPop', name: 'Confetti Pop · Конфетти',
        desc: 'Разлёт конфетти: прямоугольники с репитером и случайным вращением выстреливают из точки и падают.',
        tags: 'confetti конфетти праздник celebration pop particles', preview: 'burst',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Confetti', sp, false);
            var c1 = D.col(c, s, 'Color 1', D.PAL.accent), c2 = D.col(c, s, 'Color 2', [0.2, 0.75, 1, 1]), c3 = D.col(c, s, 'Color 3', [1, 0.85, 0.2, 1]);
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy]; })() : UK.center(comp);
            D.place(c, s, pt, false);
            var cols = [c1, c2, c3], d = Math.min(sp.d * 2, sp.dur);
            for (var k = 0; k < 3; k++) {
                var g = D.group(s, 'Confetti ' + (k + 1));
                D.rect(g.cont, 14, 22, [comp.height * 0.06, 0], 2);
                D.fill(g.cont, cols[k]);
                D.repeater(g.cont, 7, [0, 0], 360 / 7, [100, 100], 100, 100);
                UK.set(g.tr, 'ADBE Vector Rotation', k * 17);
                // разлёт: масштаб группы + позиция падения
                var sc = UK.findProp(g.tr, 'ADBE Vector Scale'), pos = UK.findProp(g.tr, 'ADBE Vector Position'), op = UK.findProp(g.tr, 'ADBE Vector Group Opacity');
                UK.key2(sc, sp.tIn, [10, 10], sp.tIn + d * 0.6, [(260 + k * 60) * c.strength, (260 + k * 60) * c.strength], 'expoOut');
                UK.key2(pos, sp.tIn, [0, 0], sp.tIn + d, [0, comp.height * 0.25 * (1 + k * 0.3)], 'expoIn');
                UK.keys(op, [[sp.tIn, 100], [sp.tIn + d * 0.7, 100], [sp.tIn + d, 0]], 'smooth');
                UK.expr(g.tr, 'ADBE Vector Rotation', 'value + (time - inPoint) * ' + (120 + k * 70) + ' * ' + (k % 2 ? -1 : 1));
            }
            s.outPoint = Math.min(sp.tOut, sp.tIn + d + c.fd);
        }
    });

    D.add({
        id: 'design.sparkleStars', name: 'Sparkle Stars · Блёстки',
        desc: 'Четырёхлучевые звёздочки вспыхивают по очереди вокруг точки/слоя (масштаб с перелётом, вращение).',
        tags: 'sparkle stars блёстки звёздочки shine', preview: 'burst',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Sparkles', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var R = c.layer ? D.rectOf(c.layer, sp.tIn) : { cx: comp.width / 2, cy: comp.height / 2, w: comp.height * 0.4, h: comp.height * 0.3 };
            D.place(c, s, [R.cx, R.cy], !!c.layer);
            var pts = [[-0.55, -0.6], [0.6, -0.45], [0.5, 0.6], [-0.6, 0.5], [0, -0.85]];
            var d = Math.min(sp.d, sp.dur / 3);
            for (var i = 0; i < pts.length; i++) {
                var g = D.group(s, 'Star ' + (i + 1));
                var r = comp.height * (0.02 + (i % 3) * 0.008) * c.strength;
                D.star(g.cont, { points: 4, outer: r, inner: r * 0.28, rotation: 0, pos: [0, 0] });
                D.fill(g.cont, col);
                UK.set(g.tr, 'ADBE Vector Position', [pts[i][0] * R.w / 2 * 1.3, pts[i][1] * R.h / 2 * 1.3]);
                var t0 = sp.tIn + d * 0.3 * i, sc = UK.findProp(g.tr, 'ADBE Vector Scale');
                UK.keys(sc, [[t0, [0, 0]], [t0 + d * 0.5, [130, 130]], [t0 + d * 1.1, [0, 0]]], 'smooth');
                UK.expr(g.tr, 'ADBE Vector Rotation', '(time - inPoint) * 90');
            }
        }
    });

    // ============================================================ ПРОГРЕСС / ДАННЫЕ
    D.add({
        id: 'design.progressBar', name: 'Progress Bar · Полоса прогресса',
        desc: 'Трек + заполнение, растущее до заданного процента (контрол). Скруглённые концы, текст-процент не нужен.',
        tags: 'progress bar прогресс загрузка полоса', preview: 'progress',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Progress Bar', sp, false);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), trackC = D.col(c, s, 'Color 2', [1, 1, 1, 1]);
            var w = comp.width * 0.4, th = comp.height * 0.022;
            var pct = D.cv(c, s, 'Percent', 75);
            D.place(c, s, [comp.width / 2, comp.height / 2], false);
            var track = D.group(s, 'Track');
            D.path(track.cont, [[-w / 2, 0], [w / 2, 0]]);
            D.stroke(track.cont, trackC, th, 2);
            UK.set(UK.findProp(track.cont, 'ADBE Vector Graphic - Stroke'), 'ADBE Vector Stroke Opacity', 25);
            var fill = D.group(s, 'Fill');
            D.path(fill.cont, [[-w / 2, 0], [w / 2, 0]]);
            D.stroke(fill.cont, acc, th, 2);
            var tr = D.trim(fill.cont, 0, 0, 0);
            var end = UK.findProp(tr, 'ADBE Vector Trim End');
            UK.key2(end, sp.tIn + sp.d * 0.3, 0, sp.tIn + sp.d * 1.8, 75, 'expoOut');
            UK.expr(tr, 'ADBE Vector Trim End', 'value / 75 * ' + pct);
            D.scaleIn(c, track.tr, 'x', sp, s);
            D.fadeIn(c, s.transform.opacity, sp, 100);
        }
    });

    D.add({
        id: 'design.circularProgress', name: 'Circular Progress · Кольцо прогресса',
        desc: 'Кольцо-трек и дуга, заполняющаяся по часовой до процента (контрол), старт сверху.',
        tags: 'circular progress кольцо прогресс ring', preview: 'progress',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Circular Progress', sp, false);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), trackC = D.col(c, s, 'Color 2', [1, 1, 1, 1]);
            var size = comp.height * 0.3, th = comp.height * 0.022;
            var pct = D.cv(c, s, 'Percent', 70);
            D.place(c, s, [comp.width / 2, comp.height / 2], false);
            var track = D.group(s, 'Track');
            D.ellipse(track.cont, size, size, [0, 0]);
            D.stroke(track.cont, trackC, th, 1);
            UK.set(UK.findProp(track.cont, 'ADBE Vector Graphic - Stroke'), 'ADBE Vector Stroke Opacity', 22);
            var arc = D.group(s, 'Arc');
            D.ellipse(arc.cont, size, size, [0, 0]);
            D.stroke(arc.cont, acc, th, 2);
            var tr = D.trim(arc.cont, 0, 0, -90);
            var end = UK.findProp(tr, 'ADBE Vector Trim End');
            UK.key2(end, sp.tIn + sp.d * 0.2, 0, sp.tIn + sp.d * 1.8, 70, 'expoOut');
            UK.expr(tr, 'ADBE Vector Trim End', 'value / 70 * ' + pct);
            var sc = s.transform.scale;
            UK.key2(sc, sp.tIn, [0, 0, 100], sp.tIn + sp.d, [100, 100, 100], c.ease);
            UK.applyEaseExpr(sc, c.ease, D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100, 100], sp.tOut, [0, 0, 100], c.ease, true);
        }
    });

    D.add({
        id: 'design.counterBadge', name: 'Counter Badge · Счётчик в круге',
        desc: 'Круглый бейдж с числом, считающим от и до (контролы From/To/Duration) — подписчики, проценты, суммы.',
        tags: 'counter badge счётчик число круг number', preview: 'counter',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Counter Badge', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var size = comp.height * 0.28;
            D.place(c, s, [comp.width / 2, comp.height / 2], false);
            var g = D.group(s, 'Circle');
            D.ellipse(g.cont, size, size, [0, 0]);
            D.fill(g.cont, col);
            var sc = s.transform.scale;
            UK.key2(sc, sp.tIn, [0, 0, 100], sp.tIn + sp.d, [100, 100, 100], c.ease);
            UK.applyEaseExpr(sc, c.ease, D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100, 100], sp.tOut, [0, 0, 100], c.ease, true);
            // число
            var txt = comp.layers.addText('0');
            txt.name = UK.PREFIX + 'Counter';
            txt.inPoint = sp.tIn; txt.outPoint = sp.tOut;
            txt.transform.position.setValue([comp.width / 2, comp.height / 2 + size * 0.14]);
            try {
                var doc = txt.property('ADBE Text Properties').property('ADBE Text Document');
                var td = doc.value;
                td.fontSize = Math.round(size * 0.4); td.fillColor = [1, 1, 1]; td.justification = ParagraphJustification.CENTER_JUSTIFY;
                doc.setValue(td);
                var from = UK.cv({ opts: c.opts, layer: txt }, 'From', 0), to = UK.cv({ opts: c.opts, layer: txt }, 'To', 100), dd = UK.cv({ opts: c.opts, layer: txt }, 'Count Duration', UK.fmt(sp.d * 2));
                doc.expression = 'var v = ease(time, inPoint + ' + UK.fmt(sp.d * 0.3) + ', inPoint + ' + UK.fmt(sp.d * 0.3) + ' + ' + dd + ', ' + from + ', ' + to + ');\nMath.round(v).toString()';
            } catch (e) {}
            try { txt.setParentWithJump(s); } catch (e2) {}
            txt.moveBefore(s);
        }
    });

    D.add({
        id: 'design.spinner', name: 'Loading Spinner · Спиннер',
        desc: 'Дуга-четверть бесконечно вращается (выражение), проявляется и уходит. Скорость — контрол.',
        tags: 'spinner loading загрузка спиннер loader', preview: 'spinner',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Spinner', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var size = comp.height * 0.16, speed = D.cv(c, s, 'Speed', 360);
            D.place(c, s, [comp.width / 2, comp.height / 2], false);
            var g = D.group(s, 'Arc');
            D.ellipse(g.cont, size, size, [0, 0]);
            D.stroke(g.cont, col, comp.height * 0.014, 2);
            var tr = D.trim(g.cont, 0, 28, 0);
            UK.expr(tr, 'ADBE Vector Trim Offset', '(time - inPoint) * ' + speed);
            UK.expr(tr, 'ADBE Vector Trim End', '28 + Math.sin((time - inPoint) * 3) * 14');
            D.inOut(c, UK.findProp(g.tr, 'ADBE Vector Scale'), [0, 0], [100, 100], [0, 0], sp, true, s);
        }
    });

    // ============================================================ CALLOUT'Ы / ЛИНИИ
    D.add({
        id: 'design.arrowCallout', name: 'Arrow Callout · Стрелка',
        desc: 'Линия рисуется по направлению, на конце выскакивает наконечник. От точки (курсор/центр слоя) наружу.',
        tags: 'arrow стрелка callout указатель line', preview: 'line',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Arrow', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy]; })() : UK.center(comp);
            D.place(c, s, pt, false);
            var len = comp.height * 0.28 * c.strength, th = Math.max(4, comp.height * 0.008);
            var dx = c.dirV[0], dy = c.dirV[1];
            var ang = Math.atan2(dy, dx) * 180 / Math.PI;
            var g = D.group(s, 'Arrow');
            D.path(g.cont, [[0, 0], [len, 0]]);
            D.stroke(g.cont, col, th, 2);
            D.draw(c, D.trim(g.cont, 0, 100, 0), sp, false);
            UK.set(g.tr, 'ADBE Vector Rotation', ang);
            var head = D.group(s, 'Head');
            var hs = th * 3.2;
            D.path(head.cont, [[len + hs * 0.9, 0], [len - hs * 0.6, -hs], [len - hs * 0.6, hs]], null, null, true);
            D.fill(head.cont, col);
            UK.set(head.tr, 'ADBE Vector Rotation', ang);
            var sc = UK.findProp(head.tr, 'ADBE Vector Scale');
            UK.set(head.tr, 'ADBE Vector Anchor', [len * Math.cos(ang * Math.PI / 180), len * Math.sin(ang * Math.PI / 180)]);
            UK.set(head.tr, 'ADBE Vector Position', [len * Math.cos(ang * Math.PI / 180), len * Math.sin(ang * Math.PI / 180)]);
            UK.key2(sc, sp.tIn + sp.d * 0.7, [0, 0], sp.tIn + sp.d * 1.1, [100, 100], 'back');
            UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut - sp.dOut * 0.6, [0, 0], c.ease, true);
        }
    });

    D.add({
        id: 'design.pointerCallout', name: 'Pointer Callout · Указатель с подписью',
        desc: 'Точка пульсирует, от неё рисуется ломаная линия к плашке-подписи, которая раскрывается. Как в product-видео.',
        tags: 'pointer callout указатель подпись product line dot', preview: 'line',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Pointer', sp, false);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), dark = D.col(c, s, 'Color 2', D.PAL.dark);
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy]; })() : UK.center(comp);
            D.place(c, s, pt, false);
            var sx = c.dirId === 'L' ? -1 : 1, sy = c.dirId === 'D' ? 1 : -1;
            var L1 = comp.height * 0.12, L2 = comp.height * 0.16, r = comp.height * 0.012;
            var dot = D.group(s, 'Dot');
            D.ellipse(dot.cont, r * 2, r * 2, [0, 0]);
            D.fill(dot.cont, acc);
            var ring = D.group(s, 'Ring');
            D.ellipse(ring.cont, r * 2, r * 2, [0, 0]);
            D.stroke(ring.cont, acc, 3, 1);
            UK.expr(ring.tr, 'ADBE Vector Scale', 'var t = (time - inPoint) % 1.2; [1,1] * (100 + t * 180)');
            UK.expr(ring.tr, 'ADBE Vector Group Opacity', 'var t = (time - inPoint) % 1.2; linear(t, 0, 1.2, 100, 0)');
            D.inOut(c, UK.findProp(dot.tr, 'ADBE Vector Scale'), [0, 0], [100, 100], [0, 0], sp, true, s);
            var ln = D.group(s, 'Line');
            var p1 = [sx * L1, sy * L1], p2 = [sx * (L1 + L2), sy * L1];
            D.path(ln.cont, [[0, 0], p1, p2]);
            D.stroke(ln.cont, acc, Math.max(3, comp.height * 0.004), 2, 2);
            var tr = D.trim(ln.cont, 0, 100, 0);
            var end = UK.findProp(tr, 'ADBE Vector Trim End'), start = UK.findProp(tr, 'ADBE Vector Trim Start');
            UK.key2(end, sp.tIn + sp.d * 0.3, 0, sp.tIn + sp.d, 100, c.ease);
            if (sp.hasOut) UK.key2(start, sp.tOut - sp.dOut, 0, sp.tOut, 100, c.ease, true);
            var box = D.group(s, 'Label');
            var bw = comp.height * 0.22, bh = comp.height * 0.07;
            D.rect(box.cont, bw, bh, [sx * bw / 2, 0], 8);
            D.fill(box.cont, dark, 92);
            UK.set(box.tr, 'ADBE Vector Position', [p2[0], p2[1] + sy * bh * 0.55]);
            var sc = UK.findProp(box.tr, 'ADBE Vector Scale');
            UK.key2(sc, sp.tIn + sp.d * 0.8, [0, 100], sp.tIn + sp.d * 1.4, [100, 100], c.ease);
            UK.applyEaseExpr(sc, c.ease, D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut - sp.dOut * 0.4, [0, 100], c.ease, true);
        }
    });

    D.add({
        id: 'design.speechBubble', name: 'Speech Bubble · Облачко',
        desc: 'Скруглённое облачко с хвостиком выскакивает с перелётом из хвостика и сдувается в конце.',
        tags: 'speech bubble облачко реплика comment', preview: 'popIn',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Bubble', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var w = comp.height * 0.36, h = comp.height * 0.16, tail = h * 0.35;
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy - R.h / 2 - tail]; })() : [comp.width / 2, comp.height * 0.42];
            D.place(c, s, pt, !!c.layer);
            var g = D.group(s, 'Bubble');
            D.rect(g.cont, w, h, [0, -tail - h / 2], h * 0.3);
            D.path(g.cont, [[-w * 0.12, -tail - 2], [w * 0.08, -tail - 2], [-w * 0.02, 0]], null, null, true);
            D.fill(g.cont, col);
            var sc = UK.findProp(g.tr, 'ADBE Vector Scale');
            UK.key2(sc, sp.tIn, [0, 0], sp.tIn + sp.d, [100, 100], 'back');
            UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut, [0, 0], c.ease, true);
            var sh = UK.addFx(s, 'ADBE Drop Shadow', 'Shadow');
            UK.set(sh, 'ADBE Drop Shadow-0002', 90); UK.set(sh, 'ADBE Drop Shadow-0004', 10); UK.set(sh, 'ADBE Drop Shadow-0005', 24);
        }
    });

    D.add({
        id: 'design.checkmarkDraw', name: 'Checkmark Draw · Галочка',
        desc: 'Круг рисуется обводкой, затем внутри прорисовывается галочка — «готово / выполнено».',
        tags: 'check галочка done success круг draw', preview: 'line',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Checkmark', sp, false);
            var col = D.col(c, s, 'Color 1', [0.25, 0.85, 0.45, 1]);
            var size = comp.height * 0.26, th = comp.height * 0.018;
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy]; })() : UK.center(comp);
            D.place(c, s, pt, false);
            var ring = D.group(s, 'Ring');
            D.ellipse(ring.cont, size, size, [0, 0]);
            D.stroke(ring.cont, col, th, 2);
            var tr1 = D.trim(ring.cont, 0, 100, -90);
            UK.key2(UK.findProp(tr1, 'ADBE Vector Trim End'), sp.tIn, 0, sp.tIn + sp.d * 0.8, 100, 'expoInOut');
            var chk = D.group(s, 'Check');
            D.path(chk.cont, [[-size * 0.22, 0], [-size * 0.06, size * 0.16], [size * 0.25, -size * 0.17]]);
            D.stroke(chk.cont, col, th, 2, 2);
            var tr2 = D.trim(chk.cont, 0, 100, 0);
            UK.key2(UK.findProp(tr2, 'ADBE Vector Trim End'), sp.tIn + sp.d * 0.6, 0, sp.tIn + sp.d * 1.2, 100, 'expoOut');
            var sc = s.transform.scale;
            UK.keys(sc, [[sp.tIn + sp.d * 1.1, [100, 100, 100]], [sp.tIn + sp.d * 1.3, [112, 112, 100]], [sp.tIn + sp.d * 1.55, [100, 100, 100]]], 'smooth');
            if (sp.hasOut) UK.key2(s.transform.opacity, sp.tOut - sp.dOut, 100, sp.tOut, 0, c.ease, true);
        }
    });

    D.add({
        id: 'design.playButton', name: 'Play Button · Кнопка Play',
        desc: 'Круг с треугольником Play выскакивает с перелётом, кольцо-пульс расходится. Для превью видео и курсов.',
        tags: 'play кнопка button video круг треугольник', preview: 'popIn',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Play', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white), acc = D.col(c, s, 'Color 2', D.PAL.accent);
            var size = comp.height * 0.24;
            D.place(c, s, UK.center(comp), false);
            var ring = D.group(s, 'Pulse');
            D.ellipse(ring.cont, size, size, [0, 0]);
            D.stroke(ring.cont, acc, 4, 1);
            UK.expr(ring.tr, 'ADBE Vector Scale', 'var t = (time - inPoint) % 1.6; [1,1] * (100 + t * 60)');
            UK.expr(ring.tr, 'ADBE Vector Group Opacity', 'var t = (time - inPoint) % 1.6; linear(t, 0, 1.6, 80, 0)');
            var g = D.group(s, 'Button');
            D.ellipse(g.cont, size, size, [0, 0]);
            D.fill(g.cont, acc);
            var tri = D.group(s, 'Triangle');
            var r = size * 0.22;
            D.path(tri.cont, [[-r * 0.8, -r], [r * 1.1, 0], [-r * 0.8, r]], null, null, true);
            D.fill(tri.cont, col);
            D.roundCorners(tri.cont, r * 0.15);
            var sc = s.transform.scale;
            UK.key2(sc, sp.tIn, [0, 0, 100], sp.tIn + sp.d, [100, 100, 100], 'back');
            UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100, 100], sp.tOut, [0, 0, 100], c.ease, true);
        }
    });

    D.add({
        id: 'design.subscribeButton', name: 'Subscribe Button · Кнопка подписки',
        desc: 'Красная скруглённая кнопка выскакивает, рядом колокольчик, который покачивается после появления.',
        tags: 'subscribe подписка кнопка youtube bell колокольчик', preview: 'popIn',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Subscribe', sp, false);
            var red = D.col(c, s, 'Color 1', [0.9, 0.1, 0.1, 1]), white = D.col(c, s, 'Color 2', D.PAL.white);
            var w = comp.height * 0.3, h = comp.height * 0.085;
            D.place(c, s, [comp.width / 2, comp.height * 0.78], false);
            var btn = D.group(s, 'Button');
            D.rect(btn.cont, w, h, [-h * 0.45, 0], h * 0.18);
            D.fill(btn.cont, red);
            var sc = UK.findProp(btn.tr, 'ADBE Vector Scale');
            UK.key2(sc, sp.tIn, [0, 0], sp.tIn + sp.d, [100, 100], 'back');
            UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut, [0, 0], c.ease, true);
            var bell = D.group(s, 'Bell');
            var bx = w / 2 + h * 0.35, br = h * 0.26;
            D.ellipse(bell.cont, br * 1.6, br * 1.6, [0, -br * 0.1]);
            D.rect(bell.cont, br * 2.1, br * 0.5, [0, br * 0.75], br * 0.1);
            D.ellipse(bell.cont, br * 0.7, br * 0.5, [0, br * 1.15]);
            D.fill(bell.cont, white);
            UK.set(bell.tr, 'ADBE Vector Position', [bx, 0]);
            UK.set(bell.tr, 'ADBE Vector Anchor', [0, -br]);
            var bsc = UK.findProp(bell.tr, 'ADBE Vector Scale');
            UK.key2(bsc, sp.tIn + sp.d * 0.5, [0, 0], sp.tIn + sp.d * 1.1, [100, 100], 'back');
            UK.applyEaseExpr(bsc, 'back', D.ctx(c, s));
            if (sp.hasOut) UK.key2(bsc, sp.tOut - sp.dOut, [100, 100], sp.tOut, [0, 0], c.ease, true);
            UK.expr(bell.tr, 'ADBE Vector Rotation', 'var t = time - inPoint - ' + UK.fmt(sp.d * 1.1) + '; t > 0 ? Math.sin(t * 14) * 18 / Math.exp(t * 2.2) : 0');
        }
    });

    D.add({
        id: 'design.heartPop', name: 'Like Heart Pop · Сердечко',
        desc: 'Сердце выскакивает с пружиной и даёт двойной «удар» как лайк; вокруг разлетаются точки.',
        tags: 'heart сердце like лайк pop love', preview: 'elastic',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Heart', sp, false);
            var col = D.col(c, s, 'Color 1', [1, 0.25, 0.35, 1]);
            var r = comp.height * 0.11 * c.strength;
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx + R.w / 2, R.cy - R.h / 2]; })() : UK.center(comp);
            D.place(c, s, pt, !!c.layer);
            var g = D.group(s, 'Heart');
            var k = 0.55 * r;
            D.path(g.cont,
                [[0, r], [-r, -r * 0.15], [-r * 0.5, -r], [0, -r * 0.45], [r * 0.5, -r], [r, -r * 0.15]],
                [[-k * 0.6, k * 0.9], [0, k * 0.9], [-k * 0.5, 0], [-k * 0.4, -k * 0.4], [-k * 0.5, 0], [0, -k * 0.6]],
                [[k * 0.6, k * 0.9], [0, -k * 0.6], [k * 0.4, 0], [k * 0.4, -k * 0.4], [k * 0.5, 0], [0, k * 0.9]], true);
            D.fill(g.cont, col);
            var sc = UK.findProp(g.tr, 'ADBE Vector Scale');
            UK.keys(sc, [[sp.tIn, [0, 0]], [sp.tIn + sp.d * 0.6, [115, 115]], [sp.tIn + sp.d * 0.8, [92, 92]], [sp.tIn + sp.d, [100, 100]]], 'smooth');
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut, [0, 0], c.ease, true);
            var dots = D.group(s, 'Dots');
            D.ellipse(dots.cont, r * 0.14, r * 0.14, [r * 1.1, 0]);
            D.fill(dots.cont, col);
            D.repeater(dots.cont, 8, [0, 0], 45, [100, 100], 100, 100);
            var dsc = UK.findProp(dots.tr, 'ADBE Vector Scale'), dop = UK.findProp(dots.tr, 'ADBE Vector Group Opacity');
            UK.key2(dsc, sp.tIn + sp.d * 0.4, [40, 40], sp.tIn + sp.d * 1.2, [170, 170], 'expoOut');
            UK.keys(dop, [[sp.tIn + sp.d * 0.4, 100], [sp.tIn + sp.d * 0.9, 100], [sp.tIn + sp.d * 1.2, 0]], 'smooth');
        }
    });

    D.add({
        id: 'design.quoteMarks', name: 'Quote Marks · Кавычки',
        desc: 'Две крупные декоративные кавычки по диагонали вокруг слоя/центра выскакивают с перелётом и уходят.',
        tags: 'quote кавычки цитата decor', preview: 'popIn',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Quotes', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var R = c.layer ? D.rectOf(c.layer, sp.tIn + sp.d) : { cx: comp.width / 2, cy: comp.height / 2, w: comp.width * 0.4, h: comp.height * 0.2 };
            D.place(c, s, [R.cx, R.cy], !!c.layer);
            var q = Math.max(24, R.h * 0.5);
            function quote(cont, x, y, flip) {
                var f = flip ? -1 : 1;
                for (var i = 0; i < 2; i++) {
                    var ox = x + i * q * 0.55 * f;
                    D.ellipse(cont, q * 0.42, q * 0.42, [ox, y]);
                    // хвостик кавычки: вниз-влево у открывающей, вверх-вправо у закрывающей
                    D.path(cont, [[ox - q * 0.21 * f, y], [ox + q * 0.21 * f, y], [ox - q * 0.15 * f, y + q * 0.55 * f]], null, null, true);
                }
            }
            var g1 = D.group(s, 'Open');
            quote(g1.cont, -R.w / 2 - q * 0.9, -R.h / 2 - q * 0.2, false);
            D.fill(g1.cont, col);
            var g2 = D.group(s, 'Close');
            quote(g2.cont, R.w / 2 + q * 0.9, R.h / 2 + q * 0.2, true);
            D.fill(g2.cont, col);
            var gs = [g1, g2];
            for (var i = 0; i < 2; i++) {
                var sc = UK.findProp(gs[i].tr, 'ADBE Vector Scale');
                UK.key2(sc, sp.tIn + i * sp.d * 0.15, [0, 0], sp.tIn + sp.d + i * sp.d * 0.15, [100, 100], 'back');
                UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
                if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut, [0, 0], c.ease, true);
            }
        }
    });

    D.add({
        id: 'design.dividerCenter', name: 'Divider Line · Линия из центра',
        desc: 'Горизонтальная линия расходится из центра в обе стороны и схлопывается обратно. Разделитель секций/титров.',
        tags: 'divider линия разделитель center line', preview: 'line',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Divider', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var w = comp.width * 0.36 * c.strength, th = Math.max(3, comp.height * 0.005);
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy + R.h / 2 + Math.max(14, R.h * 0.25)]; })() : UK.center(comp);
            D.place(c, s, pt, !!c.layer);
            var vertical = c.dirId === 'U' || c.dirId === 'D';
            var g = D.group(s, 'Line');
            D.path(g.cont, vertical ? [[0, -w / 2], [0, w / 2]] : [[-w / 2, 0], [w / 2, 0]]);
            D.stroke(g.cont, col, th, 2);
            var tr = D.trim(g.cont, 50, 50, 0);
            var st = UK.findProp(tr, 'ADBE Vector Trim Start'), en = UK.findProp(tr, 'ADBE Vector Trim End');
            UK.key2(st, sp.tIn, 50, sp.tIn + sp.d, 0, c.ease);
            UK.key2(en, sp.tIn, 50, sp.tIn + sp.d, 100, c.ease);
            if (sp.hasOut) { UK.key2(st, sp.tOut - sp.dOut, 0, sp.tOut, 50, c.ease, true); UK.key2(en, sp.tOut - sp.dOut, 100, sp.tOut, 50, c.ease, true); }
        }
    });

    D.add({
        id: 'design.dashedLine', name: 'Dashed Line · Пунктир',
        desc: 'Пунктирная линия по направлению рисуется и бежит (offset пунктира выражением). Схемы, маршруты.',
        tags: 'dashed пунктир линия route path', preview: 'line',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Dashed Line', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var len = comp.width * 0.4 * c.strength, th = Math.max(3, comp.height * 0.006);
            D.place(c, s, UK.center(comp), false);
            var g = D.group(s, 'Dash');
            var dx = c.dirV[0], dy = c.dirV[1];
            D.path(g.cont, [[-dx * len / 2, -dy * len / 2], [dx * len / 2, dy * len / 2]]);
            var st = D.stroke(g.cont, col, th, 2);
            D.dashes(st, th * 3, th * 2.2);
            try { UK.expr(st.property('ADBE Vector Stroke Dashes'), 'ADBE Vector Stroke Offset', '-time * ' + th * 8); } catch (e) {}
            D.draw(c, D.trim(g.cont, 0, 100, 0), sp, false);
        }
    });

    D.add({
        id: 'design.zigzagLine', name: 'Zigzag Line · Зигзаг',
        desc: 'Зигзагообразная линия рисуется по направлению и стирается в конце. Декор для динамичных титров.',
        tags: 'zigzag зигзаг линия decor', preview: 'line',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Zigzag', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var len = comp.width * 0.3 * c.strength, amp = comp.height * 0.025, n = 12, th = Math.max(3, comp.height * 0.006);
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy + R.h / 2 + Math.max(14, R.h * 0.3)]; })() : UK.center(comp);
            D.place(c, s, pt, !!c.layer);
            var verts = [], vertical = c.dirId === 'U' || c.dirId === 'D';
            for (var i = 0; i <= n; i++) {
                var a = -len / 2 + len * i / n, b = (i % 2 ? amp : -amp);
                verts.push(vertical ? [b, a] : [a, b]);
            }
            var g = D.group(s, 'Zigzag');
            D.path(g.cont, verts);
            D.stroke(g.cont, col, th, 2, 2);
            D.draw(c, D.trim(g.cont, 0, 100, 0), sp, c.dirId === 'R' || c.dirId === 'D');
        }
    });

    D.add({
        id: 'design.wavyLine', name: 'Wavy Line · Волна',
        desc: 'Плавная синусоидальная линия рисуется и бежит (фаза — выражение). Подчёркивание/декор.',
        tags: 'wavy волна линия sine underline decor', preview: 'line',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Wavy Line', sp, false);
            var col = D.col(c, s, 'Color 1', D.PAL.accent);
            var len = comp.width * 0.3 * c.strength, amp = comp.height * 0.02, n = 8, th = Math.max(3, comp.height * 0.006);
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy + R.h / 2 + Math.max(14, R.h * 0.3)]; })() : UK.center(comp);
            D.place(c, s, pt, !!c.layer);
            var verts = [], inT = [], outT = [], seg = len / n;
            for (var i = 0; i <= n; i++) {
                verts.push([-len / 2 + seg * i, (i % 2 ? amp : -amp)]);
                inT.push([-seg * 0.4, 0]); outT.push([seg * 0.4, 0]);
            }
            var g = D.group(s, 'Wave');
            D.path(g.cont, verts, inT, outT, false);
            D.stroke(g.cont, col, th, 2, 2);
            UK.expr(g.tr, 'ADBE Vector Position', '[((time - inPoint) * ' + Math.round(seg * 2) + ') % ' + Math.round(seg * 2) + ' - ' + Math.round(seg) + ', 0]');
            D.draw(c, D.trim(g.cont, 0, 100, 0), sp, false);
            UK.set(g.tr, 'ADBE Vector Group Opacity', 100);
        }
    });

    D.add({
        id: 'design.cornerBadge', name: 'Corner Badge · Бейдж в углу',
        desc: 'Круглый бейдж с кольцом в углу кадра (угол — по направлению): выскакивает, кольцо расходится. Под логотип/иконку.',
        tags: 'badge бейдж угол logo circle ring', preview: 'badge',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Corner Badge', sp, false);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), white = D.col(c, s, 'Color 2', D.PAL.white);
            var size = comp.height * 0.14, m = comp.height * 0.08;
            var sx = c.dirId === 'L' ? -1 : 1, sy = c.dirId === 'D' ? 1 : -1;
            D.place(c, s, [comp.width / 2 + sx * (comp.width / 2 - m - size / 2), comp.height / 2 + sy * (comp.height / 2 - m - size / 2)], false);
            var ring = D.group(s, 'Ring');
            D.ellipse(ring.cont, size, size, [0, 0]);
            D.stroke(ring.cont, white, 4, 1);
            var rsc = UK.findProp(ring.tr, 'ADBE Vector Scale'), rop = UK.findProp(ring.tr, 'ADBE Vector Group Opacity');
            UK.key2(rsc, sp.tIn + sp.d * 0.3, [60, 60], sp.tIn + sp.d * 1.4, [150, 150], 'expoOut');
            UK.keys(rop, [[sp.tIn + sp.d * 0.3, 100], [sp.tIn + sp.d, 60], [sp.tIn + sp.d * 1.4, 0]], 'smooth');
            var g = D.group(s, 'Badge');
            D.ellipse(g.cont, size, size, [0, 0]);
            D.fill(g.cont, acc);
            var sc = UK.findProp(g.tr, 'ADBE Vector Scale');
            UK.key2(sc, sp.tIn, [0, 0], sp.tIn + sp.d, [100, 100], 'back');
            UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut, [0, 0], c.ease, true);
        }
    });

    D.add({
        id: 'design.neonOutline', name: 'Neon Rect Outline · Неоновая рамка',
        desc: 'Скруглённая неоновая обводка со свечением рисуется по контуру и слегка мерцает. Вокруг слоя или по центру.',
        tags: 'neon неон рамка glow outline', preview: 'glow',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Neon', sp, false);
            var col = D.col(c, s, 'Color 1', [0.3, 0.9, 1, 1]);
            var R = c.layer ? D.rectOf(c.layer, sp.tIn + sp.d) : { cx: comp.width / 2, cy: comp.height / 2, w: comp.width * 0.4, h: comp.height * 0.3 };
            var pad = Math.max(20, R.h * 0.3);
            D.place(c, s, [R.cx, R.cy], !!c.layer);
            var g = D.group(s, 'Outline');
            D.rect(g.cont, R.w + pad * 2, R.h + pad * 1.4, [0, 0], Math.max(12, R.h * 0.2));
            D.stroke(g.cont, col, Math.max(4, comp.height * 0.006), 2, 2);
            D.draw(c, D.trim(g.cont, 0, 100, 0), sp, false);
            var glow = UK.addFx(s, 'ADBE Glo2', 'Neon Glow');
            UK.set(glow, 'ADBE Glo2-0001', 2); UK.set(glow, 'ADBE Glo2-0002', 20); UK.set(glow, 'ADBE Glo2-0003', 60); UK.set(glow, 'ADBE Glo2-0004', 1.6);
            UK.expr(glow, 'ADBE Glo2-0004', 'value * (0.85 + 0.15 * Math.sin(time * 9) + (random() < 0.05 ? -0.4 : 0))');
            var glow2 = UK.addFx(s, 'ADBE Glo2', 'Neon Glow Wide');
            UK.set(glow2, 'ADBE Glo2-0001', 2); UK.set(glow2, 'ADBE Glo2-0002', 10); UK.set(glow2, 'ADBE Glo2-0003', 220); UK.set(glow2, 'ADBE Glo2-0004', 0.6);
        }
    });

    D.add({
        id: 'design.stickerCard', name: 'Sticker Card · Карточка-стикер',
        desc: 'Скруглённая карточка с тенью и лёгким наклоном выскакивает с перелётом и сдувается в конце. Подложка под фото/текст.',
        tags: 'sticker card карточка стикер shadow тень', preview: 'shadow',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Sticker Card', sp, true);
            var col = D.col(c, s, 'Color 1', D.PAL.white);
            var R = c.layer ? D.rectOf(c.layer, sp.tIn + sp.d) : { cx: comp.width / 2, cy: comp.height / 2, w: comp.width * 0.3, h: comp.height * 0.3 };
            var pad = Math.max(24, R.h * 0.15);
            D.place(c, s, [R.cx, R.cy], !!c.layer);
            var g = D.group(s, 'Card');
            D.rect(g.cont, R.w + pad * 2, R.h + pad * 2, [0, 0], Math.max(16, R.h * 0.08));
            D.fill(g.cont, col);
            s.transform.rotation.setValue(-4 * c.strength);
            var sh = UK.addFx(s, 'ADBE Drop Shadow', 'Shadow');
            UK.set(sh, 'ADBE Drop Shadow-0002', 110); UK.set(sh, 'ADBE Drop Shadow-0003', 135); UK.set(sh, 'ADBE Drop Shadow-0004', 18); UK.set(sh, 'ADBE Drop Shadow-0005', 40);
            var sc = s.transform.scale;
            UK.key2(sc, sp.tIn, [0, 0, 100], sp.tIn + sp.d, [100, 100, 100], 'back');
            UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100, 100], sp.tOut, [0, 0, 100], c.ease, true);
            var rot = s.transform.rotation;
            UK.key2(rot, sp.tIn, -4 * c.strength - 25, sp.tIn + sp.d, -4 * c.strength, 'back');
        }
    });

    D.add({
        id: 'design.locationPin', name: 'Location Pin · Метка на карте',
        desc: 'Пин-метка падает сверху с отскоком, под ним пульсирует кольцо. Для карт и указания места.',
        tags: 'pin метка карта location map marker', preview: 'bounce',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Pin', sp, false);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), white = D.col(c, s, 'Color 2', D.PAL.white);
            var r = comp.height * 0.045 * c.strength;
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy]; })() : UK.center(comp);
            D.place(c, s, pt, false);
            var ring = D.group(s, 'Pulse');
            D.ellipse(ring.cont, r * 1.6, r * 0.6, [0, 0]);
            D.stroke(ring.cont, acc, 3, 1);
            UK.expr(ring.tr, 'ADBE Vector Scale', 'var t = (time - inPoint) % 1.4; [1,1] * (60 + t * 120)');
            UK.expr(ring.tr, 'ADBE Vector Group Opacity', 'var t = (time - inPoint) % 1.4; linear(t, 0, 1.4, 90, 0)');
            var pin = D.group(s, 'Pin');
            D.ellipse(pin.cont, r * 2, r * 2, [0, -r * 2.2]);
            D.path(pin.cont, [[-r * 0.95, -r * 1.9], [r * 0.95, -r * 1.9], [0, 0]], null, null, true);
            D.fill(pin.cont, acc);
            var hole = D.group(s, 'Hole');
            D.ellipse(hole.cont, r * 0.8, r * 0.8, [0, -r * 2.2]);
            D.fill(hole.cont, white);
            var pos = s.transform.position, drop = comp.height * 0.5;
            UK.key2(pos, sp.tIn, [pt[0], pt[1] - drop], sp.tIn + sp.d, pt, 'bounce');
            UK.applyEaseExpr(pos, 'bounce', D.ctx(c, s));
            if (sp.hasOut) UK.key2(pos, sp.tOut - sp.dOut, pt, sp.tOut, [pt[0], pt[1] - drop], c.ease, true);
            UK.key2(s.transform.opacity, sp.tIn, 0, sp.tIn + sp.d * 0.3, 100, 'linear');
        }
    });

    D.add({
        id: 'design.timelineDots', name: 'Timeline Dots · Таймлайн',
        desc: 'Горизонтальная линия рисуется, на ней по очереди выскакивают точки-вехи с перелётом. Для этапов/шагов.',
        tags: 'timeline таймлайн этапы шаги steps dots line', preview: 'line',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Timeline', sp, false);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), white = D.col(c, s, 'Color 2', D.PAL.white);
            var w = comp.width * 0.6, n = 5, r = comp.height * 0.02;
            D.place(c, s, UK.center(comp), false);
            var ln = D.group(s, 'Line');
            D.path(ln.cont, [[-w / 2, 0], [w / 2, 0]]);
            D.stroke(ln.cont, white, Math.max(3, comp.height * 0.005), 2);
            D.draw(c, D.trim(ln.cont, 0, 100, 0), sp, false);
            for (var i = 0; i < n; i++) {
                var g = D.group(s, 'Dot ' + (i + 1));
                D.ellipse(g.cont, r * 2, r * 2, [0, 0]);
                D.fill(g.cont, acc);
                var ring = D.ellipse(g.cont, r * 3, r * 3, [0, 0]);
                var st = D.stroke(g.cont, white, 3, 1);
                UK.set(g.tr, 'ADBE Vector Position', [-w / 2 + w * i / (n - 1), 0]);
                var sc = UK.findProp(g.tr, 'ADBE Vector Scale');
                var t0 = sp.tIn + sp.d * (0.2 + 0.8 * i / (n - 1));
                UK.key2(sc, t0, [0, 0], t0 + sp.d * 0.5, [100, 100], 'back');
                UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
                if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut, [0, 0], c.ease, true);
            }
        }
    });

    D.add({
        id: 'design.iconCircle', name: 'Icon Circle Backing · Круг под иконку', needs: 'layer',
        desc: 'Круглая подложка под выделенный слой (иконку/лого) с тонким кольцом: выскакивает с перелётом, кольцо расходится.',
        tags: 'icon круг подложка иконка logo backing', preview: 'badge',
        apply: function (c) {
            var sp = D.span(c), s = D.layer(c, 'Icon Circle', sp, true);
            var R = D.rectOf(c.layer, sp.tIn + sp.d);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), white = D.col(c, s, 'Color 2', D.PAL.white);
            var size = Math.max(R.w, R.h) * 1.5;
            D.place(c, s, [R.cx, R.cy], true);
            var ring = D.group(s, 'Ring');
            D.ellipse(ring.cont, size, size, [0, 0]);
            D.stroke(ring.cont, white, 3, 1);
            var rsc = UK.findProp(ring.tr, 'ADBE Vector Scale'), rop = UK.findProp(ring.tr, 'ADBE Vector Group Opacity');
            UK.key2(rsc, sp.tIn + sp.d * 0.4, [80, 80], sp.tIn + sp.d * 1.5, [140, 140], 'expoOut');
            UK.keys(rop, [[sp.tIn + sp.d * 0.4, 100], [sp.tIn + sp.d * 1.5, 0]], 'smooth');
            var g = D.group(s, 'Circle');
            D.ellipse(g.cont, size, size, [0, 0]);
            D.fill(g.cont, acc);
            var sc = UK.findProp(g.tr, 'ADBE Vector Scale');
            UK.key2(sc, sp.tIn, [0, 0], sp.tIn + sp.d, [100, 100], 'back');
            UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
            if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut, [0, 0], c.ease, true);
        }
    });

    D.add({
        id: 'design.hexBadge', name: 'Hex Badge · Шестиугольник',
        desc: 'Шестиугольный бейдж с обводкой: заливка выскакивает с поворотом, контур дорисовывается. Tech/gaming стиль.',
        tags: 'hexagon шестиугольник badge tech gaming', preview: 'badge',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Hex Badge', sp, false);
            var acc = D.col(c, s, 'Color 1', D.PAL.accent), white = D.col(c, s, 'Color 2', D.PAL.white);
            var r = comp.height * 0.13 * c.strength;
            var pt = c.layer ? (function () { var R = D.rectOf(c.layer, sp.tIn); return [R.cx, R.cy]; })() : UK.center(comp);
            D.place(c, s, pt, !!c.layer);
            var g = D.group(s, 'Hex');
            D.star(g.cont, { polygon: true, points: 6, outer: r, rotation: 30 });
            D.fill(g.cont, acc, 90);
            var sc = UK.findProp(g.tr, 'ADBE Vector Scale'), rot = UK.findProp(g.tr, 'ADBE Vector Rotation');
            UK.key2(sc, sp.tIn, [0, 0], sp.tIn + sp.d, [100, 100], 'back');
            UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
            UK.key2(rot, sp.tIn, -60, sp.tIn + sp.d, 0, c.ease);
            if (sp.hasOut) { UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut, [0, 0], c.ease, true); UK.key2(rot, sp.tOut - sp.dOut, 0, sp.tOut, 60, c.ease, true); }
            var o = D.group(s, 'Outline');
            D.star(o.cont, { polygon: true, points: 6, outer: r * 1.25, rotation: 30 });
            D.stroke(o.cont, white, Math.max(3, comp.height * 0.005), 1, 2);
            D.draw(c, D.trim(o.cont, 0, 100, 0), sp, false);
        }
    });

    D.add({
        id: 'design.socialBar', name: 'Social Bar · Соцсети плашка',
        desc: 'Плашка с тремя круглыми слотами под иконки соцсетей: плашка раскрывается, кружки выскакивают по очереди.',
        tags: 'social соцсети плашка icons bar', preview: 'bar',
        apply: function (c) {
            var sp = D.span(c), comp = c.comp, s = D.layer(c, 'Social Bar', sp, false);
            var dark = D.col(c, s, 'Color 1', D.PAL.dark), acc = D.col(c, s, 'Color 2', D.PAL.accent);
            var h = comp.height * 0.08, w = h * 4.6, r = h * 0.32;
            D.place(c, s, [comp.width * 0.5, comp.height * 0.88], false);
            var bar = D.group(s, 'Bar');
            D.rect(bar.cont, w, h, [0, 0], h / 2);
            D.fill(bar.cont, dark, 92);
            D.scaleIn(c, bar.tr, 'x', sp, s);
            for (var i = 0; i < 3; i++) {
                var g = D.group(s, 'Slot ' + (i + 1));
                D.ellipse(g.cont, r * 2, r * 2, [0, 0]);
                D.fill(g.cont, acc);
                UK.set(g.tr, 'ADBE Vector Position', [-w / 2 + h * 0.75 + i * h * 1.55, 0]);
                var sc = UK.findProp(g.tr, 'ADBE Vector Scale');
                var t0 = sp.tIn + sp.d * (0.5 + i * 0.15);
                UK.key2(sc, t0, [0, 0], t0 + sp.d * 0.5, [100, 100], 'back');
                UK.applyEaseExpr(sc, 'back', D.ctx(c, s));
                if (sp.hasOut) UK.key2(sc, sp.tOut - sp.dOut, [100, 100], sp.tOut - sp.dOut * 0.5, [0, 0], c.ease, true);
            }
        }
    });

})();
