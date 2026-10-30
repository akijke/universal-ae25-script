// =============================================================================
//  LIGHT — лайтсвипы, лучи, блики, световые утечки, вспышки
// =============================================================================
(function () {

    // ---- локальные хелперы
    function rect(layer, t) {
        try {
            var r = layer.sourceRectAtTime(t, false);
            if (r.width > 0 && r.height > 0) return r;
        } catch (e) {}
        return { left: 0, top: 0, width: layer.width || 1920, height: layer.height || 1080 };
    }
    /** Траектория центра свипа по направлению: {from:[x,y], to:[x,y], w, h, cx, cy} в координатах слоя. */
    function sweepPath(c, pad) {
        var r = rect(c.layer, c.t0);
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        pad = pad == null ? 0.7 : pad;
        var dx = r.width * (0.5 + pad), dy = r.height * (0.5 + pad);
        var from, to;
        if (c.dirV[0] !== 0) { // горизонтально: из-за края ПО направлению движения
            from = [cx - c.dirV[0] * dx, cy]; to = [cx + c.dirV[0] * dx, cy];
        } else {
            from = [cx, cy - c.dirV[1] * dy]; to = [cx, cy + c.dirV[1] * dy];
        }
        return { from: from, to: to, w: r.width, h: r.height, cx: cx, cy: cy, r: r };
    }
    /** Угол линии свипа: горизонтальный проход — наклонная линия, вертикальный — горизонтальная. */
    function sweepDir(c, tilt) {
        tilt = tilt == null ? 30 : tilt;
        return c.dirV[0] !== 0 ? tilt : 90 + (c.dirId === 'U' ? -tilt : tilt) * 0.3;
    }
    function addSweep(c, nick, o) {
        var sp = sweepPath(c, o.pad);
        var fx = UK.addFx(c.layer, 'CC Light Sweep', nick || 'Light Sweep');
        UK.set(fx, 'CC Light Sweep-0002', o.dir != null ? o.dir : sweepDir(c));
        UK.set(fx, 'CC Light Sweep-0003', o.shape || 2);
        UK.set(fx, 'CC Light Sweep-0004', Math.max(4, o.width));
        UK.set(fx, 'CC Light Sweep-0005', o.sweep);
        UK.set(fx, 'CC Light Sweep-0006', o.edge);
        UK.set(fx, 'CC Light Sweep-0007', o.thick == null ? 4 : o.thick);
        UK.set(fx, 'CC Light Sweep-0009', 1);
        if (o.color) UK.set(fx, 'CC Light Sweep-0008', o.color);
        var t0 = c.t0 + (o.delay || 0), t1 = t0 + c.dur;
        var center = UK.p(fx, 'CC Light Sweep-0001');
        UK.key2(center, t0, sp.from, t1, sp.to, o.ease || c.ease);
        return fx;
    }
    function ellipse(cx, cy, rx, ry) {
        var k = 0.5523, sh = new Shape();
        sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
        sh.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];
        sh.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];
        sh.closed = true;
        return sh;
    }
    /** Солид над слоем на его длительности. Возвращает {solid, cs} где cs — контекст для UK.cv на солиде. */
    function overlaySolid(c, color, name, t0, t1) {
        var s = UK.solid(c.comp, color, name, t0 == null ? c.layer.inPoint : t0, t1 == null ? c.layer.outPoint : t1);
        s.moveBefore(c.layer);
        return { solid: s, cs: { opts: c.opts, layer: s, strength: c.strength } };
    }
    function layerPos(layer) {
        var p = layer.transform.position.value;
        return [p[0], p[1]];
    }

    // -------------------------------------------------------------- Light Sweep
    UK.add({
        id: 'light.sweepSoft', cat: 'light', name: 'Light Sweep Soft · Мягкий блик',
        desc: 'Широкий мягкий световой блик проходит по слою за длительность. Направление — из настроек, сила — яркость.',
        tags: 'light sweep shine блик свип логотип',
        apply: function (c) {
            var sp = sweepPath(c);
            addSweep(c, 'Sweep Soft', { shape: 2, width: sp.w * 0.45, sweep: 55 * c.strength, edge: 35 * c.strength, thick: 3 });
        }
    });
    UK.add({
        id: 'light.sweepSharp', cat: 'light', name: 'Light Sweep Sharp · Резкий блик',
        desc: 'Узкая яркая полоса света с чёткими краями.',
        tags: 'light sweep sharp блик резкий полоса',
        apply: function (c) {
            var sp = sweepPath(c);
            addSweep(c, 'Sweep Sharp', { shape: 3, width: sp.w * 0.08, sweep: 95 * c.strength, edge: 70 * c.strength, thick: 2 });
        }
    });
    UK.add({
        id: 'light.sweepDiag', cat: 'light', name: 'Light Sweep Diagonal · Диагональный блик',
        desc: 'Блик под углом 45° по выбранному направлению.',
        tags: 'light sweep diagonal блик диагональ',
        apply: function (c) {
            var sp = sweepPath(c);
            var ang = (c.dirId === 'L' || c.dirId === 'U') ? -45 : 45;
            addSweep(c, 'Sweep Diagonal', { shape: 2, width: sp.w * 0.25, sweep: 70 * c.strength, edge: 50 * c.strength, dir: ang, thick: 3 });
        }
    });
    UK.add({
        id: 'light.sweepDouble', cat: 'light', name: 'Double Sweep · Двойной блик',
        desc: 'Широкий мягкий блик и следом узкий яркий — классический «премиум» проход.',
        tags: 'light sweep double двойной блик',
        apply: function (c) {
            var sp = sweepPath(c);
            addSweep(c, 'Sweep Wide', { shape: 2, width: sp.w * 0.4, sweep: 40 * c.strength, edge: 25 * c.strength, thick: 3 });
            addSweep(c, 'Sweep Thin', { shape: 3, width: sp.w * 0.06, sweep: 90 * c.strength, edge: 60 * c.strength, thick: 2, delay: c.dur * 0.25 });
        }
    });
    UK.add({
        id: 'light.sweepLoop', cat: 'light', name: 'Loop Sweep · Циклический блик',
        desc: 'Блик проходит по слою бесконечно с заданным периодом (слайдер «Period»).',
        tags: 'light sweep loop цикл блик бесконечный',
        apply: function (c) {
            var sp = sweepPath(c);
            var fx = UK.addFx(c.layer, 'CC Light Sweep', 'Sweep Loop');
            UK.set(fx, 'CC Light Sweep-0002', sweepDir(c));
            UK.set(fx, 'CC Light Sweep-0003', 2);
            UK.set(fx, 'CC Light Sweep-0004', Math.max(4, sp.w * 0.2));
            UK.set(fx, 'CC Light Sweep-0005', 60 * c.strength);
            UK.set(fx, 'CC Light Sweep-0006', 40 * c.strength);
            UK.set(fx, 'CC Light Sweep-0007', 3);
            var period = UK.cv(c, 'Sweep Period', Math.max(0.5, c.dur * 3));
            var ex = 'var p = Math.max(0.05, ' + period + ');\n' +
                'var ph = (((time - inPoint) % p) + p) % p / p;\n' +
                'var a = [' + UK.fmt(sp.from[0]) + ', ' + UK.fmt(sp.from[1]) + '], b = [' + UK.fmt(sp.to[0]) + ', ' + UK.fmt(sp.to[1]) + '];\n' +
                '[a[0] + (b[0] - a[0]) * ph, a[1] + (b[1] - a[1]) * ph]';
            UK.expr(fx, 'CC Light Sweep-0001', ex);
        }
    });
    UK.add({
        id: 'light.sweepColor', cat: 'light', name: 'Colored Sweep · Цветной блик',
        desc: 'Блик с цветом света (по умолчанию тёплое золото). Цвет — через контрол «Sweep Color».',
        tags: 'light sweep color gold цветной золотой блик',
        apply: function (c) {
            var sp = sweepPath(c);
            var fx = addSweep(c, 'Sweep Color', { shape: 2, width: sp.w * 0.3, sweep: 75 * c.strength, edge: 45 * c.strength, thick: 3, color: [1, 0.82, 0.45, 1] });
            if (c.opts.controls) UK.expr(fx, 'CC Light Sweep-0008', UK.cv(c, 'Sweep Color', [1, 0.82, 0.45, 1], 'color'));
        }
    });
    UK.add({
        id: 'light.sweepEdge', cat: 'light', name: 'Edge Sweep · Блик по контуру',
        desc: 'Светится только кромка (edge) слоя — проход по контуру логотипа/текста.',
        tags: 'light sweep edge контур кромка',
        apply: function (c) {
            var sp = sweepPath(c);
            addSweep(c, 'Sweep Edge', { shape: 2, width: sp.w * 0.3, sweep: 0, edge: 100 * c.strength, thick: 6 });
        }
    });
    UK.add({
        id: 'light.shine', cat: 'light', name: 'Shine · Блик + свечение',
        desc: 'Лайтсвип и мягкое свечение вместе — для логотипов и заголовков.',
        tags: 'shine glow sweep логотип свечение блик',
        apply: function (c) {
            var sp = sweepPath(c);
            addSweep(c, 'Shine Sweep', { shape: 2, width: sp.w * 0.3, sweep: 70 * c.strength, edge: 50 * c.strength, thick: 3 });
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Shine Glow');
            UK.set(g, 'ADBE Glo2-0002', 55);
            UK.set(g, 'ADBE Glo2-0003', 60);
            UK.set(g, 'ADBE Glo2-0004', 0.8 * c.strength);
            if (c.opts.controls) UK.expr(g, 'ADBE Glo2-0004', UK.cv(c, 'Shine Glow', 0.8 * c.strength));
        }
    });

    // -------------------------------------------------------------- Rays / Burst / Flare
    UK.add({
        id: 'light.godRays', cat: 'light', name: 'God Rays · Лучи света',
        desc: 'Объёмные лучи от яркой точки (по умолчанию сверху). Центр и интенсивность — контролы.',
        tags: 'god rays light rays лучи волюметрик',
        apply: function (c) {
            var r = rect(c.layer, c.t0);
            var fx = UK.addFx(c.layer, 'CC Light Rays', 'God Rays');
            var cx = r.left + r.width / 2, cy = r.top + r.height * (c.dirId === 'D' ? 0.9 : 0.1);
            UK.set(fx, 'CC Light Rays-0001', 120 * c.strength);
            UK.set(fx, 'CC Light Rays-0002', [cx, cy]);
            UK.set(fx, 'CC Light Rays-0003', Math.max(r.width, r.height) * 0.15);
            UK.set(fx, 'CC Light Rays-0004', 60);
            UK.set(fx, 'CC Light Rays-0007', 1);
            UK.set(fx, 'CC Light Rays-0008', 0);
            if (c.opts.controls) {
                UK.expr(fx, 'CC Light Rays-0001', UK.cv(c, 'Rays Intensity', 120 * c.strength));
                UK.expr(fx, 'CC Light Rays-0002', UK.cv(c, 'Rays Center', [cx, cy], 'point'));
            }
        }
    });
    UK.add({
        id: 'light.rayBurst', cat: 'light', name: 'Light Burst Pulse · Вспышка лучей',
        desc: 'Радиальная вспышка лучей из центра слоя — нарастает и гаснет за длительность.',
        tags: 'light burst pulse вспышка лучи радиальная',
        apply: function (c) {
            var r = rect(c.layer, c.t0);
            var fx = UK.addFx(c.layer, 'CC Light Burst 2.5', 'Light Burst');
            UK.set(fx, 'CC Light Burst 2.5-0001', [r.left + r.width / 2, r.top + r.height / 2]);
            UK.set(fx, 'CC Light Burst 2.5-0003', 60 * c.strength);
            UK.set(fx, 'CC Light Burst 2.5-0004', 2);
            var p = UK.p(fx, ['Intensity', 'CC Light Burst 2.5-0002']);
            UK.keys(p, [[c.t0, 0], [c.tMid, 150 * c.strength], [c.t1, 0]], 'smooth');
        }
    });
    UK.add({
        id: 'light.flarePass', cat: 'light', name: 'Lens Flare Pass · Пролёт блика',
        desc: 'Блик объектива пролетает через слой по направлению, разгораясь в середине.',
        tags: 'lens flare блик объектив пролёт',
        apply: function (c) {
            var sp = sweepPath(c, 0.3);
            var fx = UK.addFx(c.layer, 'ADBE Lens Flare', 'Lens Flare');
            UK.set(fx, 'ADBE Lens Flare-0003', 1);
            UK.key2(UK.p(fx, 'ADBE Lens Flare-0001'), c.t0, sp.from, c.t1, sp.to, 'smooth');
            var br = UK.p(fx, 'ADBE Lens Flare-0002');
            UK.keys(br, [[c.t0, 0], [c.tMid, 130 * c.strength], [c.t1, 0]], 'smooth');
        }
    });

    // -------------------------------------------------------------- Leaks / Glow / Flicker
    UK.add({
        id: 'light.leak', cat: 'light', name: 'Light Leak · Световая утечка',
        desc: 'Тёплая плывущая засветка (Fractal Noise + Tint, режим Add) поверх слоя. Прозрачность и скорость — контролы.',
        tags: 'light leak утечка засветка плёнка warm',
        apply: function (c) {
            var o = overlaySolid(c, [1, 0.6, 0.3], 'Light Leak');
            var s = o.solid;
            var fn = UK.addFx(s, 'ADBE Fractal Noise', 'Leak Noise');
            UK.set(fn, ['ADBE Fractal Noise-0001', 'Fractal Type'], 1);
            UK.set(fn, ['ADBE Fractal Noise-0002', 'Noise Type'], 3);
            UK.set(fn, ['ADBE Fractal Noise-0004', 'Contrast'], 70);
            UK.set(fn, ['ADBE Fractal Noise-0005', 'Brightness'], -25);
            UK.set(fn, ['ADBE Fractal Noise-0009', 'Uniform Scaling'], 0);
            UK.set(fn, ['ADBE Fractal Noise-0011', 'Scale Width'], 900);
            UK.set(fn, ['ADBE Fractal Noise-0012', 'Scale Height'], 350);
            UK.set(fn, ['ADBE Fractal Noise-0015', 'Complexity'], 2);
            var speed = UK.cv(o.cs, 'Leak Speed', 40);
            UK.expr(fn, ['ADBE Fractal Noise-0022', 'Evolution'], 'time * ' + speed);
            UK.expr(fn, ['ADBE Fractal Noise-0013', 'Offset Turbulence'], 'value + [time * ' + speed + ' * 2, 0]');
            var tint = UK.addFx(s, 'ADBE Tint', 'Leak Tint');
            UK.set(tint, 'ADBE Tint-0001', [0.35, 0.04, 0.0, 1]);
            UK.set(tint, 'ADBE Tint-0002', [1, 0.72, 0.35, 1]);
            if (c.opts.controls) UK.expr(tint, 'ADBE Tint-0002', UK.cv(o.cs, 'Leak Color', [1, 0.72, 0.35, 1], 'color'));
            s.blendingMode = BlendingMode.ADD;
            var op = UK.cv(o.cs, 'Leak Opacity', 70 * c.strength);
            s.transform.opacity.expression = 'Math.min(100, ' + op + ')';
        }
    });
    UK.add({
        id: 'light.glowPulse', cat: 'light', name: 'Glow Pulse · Пульсирующее свечение',
        desc: 'Свечение, дышащее по синусоиде. Частота, база и амплитуда — контролы.',
        tags: 'glow pulse пульс свечение неон',
        apply: function (c) {
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Glow Pulse');
            UK.set(g, 'ADBE Glo2-0002', 50);
            UK.set(g, 'ADBE Glo2-0003', 70);
            var base = UK.cv(c, 'Glow Base', 0.6 * c.strength), amp = UK.cv(c, 'Glow Amp', 1.2 * c.strength), fr = UK.cv(c, 'Glow Freq', 1 / Math.max(0.2, c.dur));
            UK.expr(g, 'ADBE Glo2-0004', 'var b = ' + base + ', a = ' + amp + ', f = ' + fr + ';\nb + a * (0.5 + 0.5 * Math.sin((time - inPoint) * f * 2 * Math.PI))');
        }
    });
    UK.add({
        id: 'light.neonFlicker', cat: 'light', name: 'Neon Flicker · Мерцание неона',
        desc: 'Случайные провалы яркости как у неоновой вывески. Частота, вероятность и глубина — контролы.',
        tags: 'neon flicker мерцание неон вывеска',
        apply: function (c) {
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Neon Glow');
            UK.set(g, 'ADBE Glo2-0002', 45);
            UK.set(g, 'ADBE Glo2-0003', 40);
            UK.set(g, 'ADBE Glo2-0004', 1.0 * c.strength);
            var f = UK.cv(c, 'Flicker Rate', 14), pr = UK.cv(c, 'Flicker Chance', 15), mn = UK.cv(c, 'Flicker Min', Math.max(0, 60 - 40 * c.strength));
            c.layer.transform.opacity.expression = 'var f = ' + f + ', p = ' + pr + ', mn = ' + mn + ';\n' +
                'posterizeTime(f);\nseedRandom(index, false);\n' +
                '(random() < p / 100) ? value * mn / 100 : value';
        }
    });
    UK.add({
        id: 'light.strobe', cat: 'light', name: 'Strobe Light · Стробоскоп',
        desc: 'Белые вспышки с заданным периодом (эффект Strobe). Сила — частота.',
        tags: 'strobe стробоскоп вспышки клуб',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Strobe', 'Strobe');
            UK.set(fx, 'ADBE Strobe-0001', [1, 1, 1, 1]);
            UK.set(fx, 'ADBE Strobe-0002', 0);
            UK.set(fx, 'ADBE Strobe-0003', 0.06);
            UK.set(fx, 'ADBE Strobe-0004', Math.max(0.1, 0.5 / c.strength));
            UK.set(fx, 'ADBE Strobe-0005', 0);
            UK.set(fx, 'ADBE Strobe-0006', 2);
            if (c.opts.controls) UK.expr(fx, 'ADBE Strobe-0004', 'Math.max(0.04, ' + UK.cv(c, 'Strobe Period', Math.max(0.1, 0.5 / c.strength)) + ')');
        }
    });
    UK.add({
        id: 'light.flashHit', cat: 'light', name: 'Flash Hit · Белая вспышка',
        desc: 'Короткая белая вспышка (Add) над слоем в точке старта — акцент под бит.',
        tags: 'flash hit вспышка белая бит акцент',
        apply: function (c) {
            var d = Math.max(c.fd * 3, c.dur * 0.5);
            var o = overlaySolid(c, [1, 1, 1], 'Flash', c.t0, c.t0 + d);
            var s = o.solid;
            s.blendingMode = BlendingMode.ADD;
            UK.keys(s.transform.opacity, [[c.t0, 0], [c.t0 + c.fd, Math.min(100, 100 * c.strength)], [c.t0 + d, 0]], 'expoOut');
        }
    });

    // -------------------------------------------------------------- Spot / Flashlight / Bokeh / Rim
    UK.add({
        id: 'light.spotlight', cat: 'light', name: 'Spotlight · Прожектор',
        desc: 'Затемнение всего кадра кроме мягкого овала вокруг слоя. Прозрачность — контрол «Spot Darkness».',
        tags: 'spotlight прожектор виньетка затемнение пятно',
        apply: function (c) {
            var o = overlaySolid(c, [0, 0, 0], 'Spotlight');
            var s = o.solid;
            var p = layerPos(c.layer), sz = UK.layerSize(c.layer, c.t0);
            var rx = Math.max(120, sz[0] * 0.75 * c.strength), ry = Math.max(120, sz[1] * 0.9 * c.strength);
            var m = s.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
            m.name = 'Spot';
            m.property('ADBE Mask Shape').setValue(ellipse(p[0], p[1], rx, ry));
            m.inverted = true;
            m.property('ADBE Mask Feather').setValue([rx * 0.6, ry * 0.6]);
            var dk = UK.cv(o.cs, 'Spot Darkness', 85);
            s.transform.opacity.expression = 'Math.min(100, ' + dk + ')';
        }
    });
    UK.add({
        id: 'light.flashlight', cat: 'light', name: 'Flashlight Pan · Луч фонаря',
        desc: 'Тёмный кадр и пятно света, проходящее по направлению за длительность.',
        tags: 'flashlight фонарь луч пятно пан',
        apply: function (c) {
            var o = overlaySolid(c, [0, 0, 0], 'Flashlight');
            var s = o.solid;
            var cw = c.comp.width, ch = c.comp.height;
            var r = Math.max(100, Math.min(cw, ch) * 0.22 * c.strength);
            var cx = cw / 2, cy = ch / 2;
            var from = [cx - c.dirV[0] * (cw / 2 + r), cy - c.dirV[1] * (ch / 2 + r)];
            var to = [cx + c.dirV[0] * (cw / 2 + r), cy + c.dirV[1] * (ch / 2 + r)];
            var m = s.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
            m.name = 'Beam';
            m.inverted = true;
            var sh = m.property('ADBE Mask Shape');
            sh.setValueAtTime(c.t0, ellipse(from[0], from[1], r, r));
            sh.setValueAtTime(c.t1, ellipse(to[0], to[1], r, r));
            m.property('ADBE Mask Feather').setValue([r * 0.5, r * 0.5]);
            var dk = UK.cv(o.cs, 'Beam Darkness', 90);
            s.transform.opacity.expression = 'Math.min(100, ' + dk + ')';
        }
    });
    UK.add({
        id: 'light.bokehGlow', cat: 'light', name: 'Bokeh Glow · Мягкое сияние',
        desc: 'Дубликат слоя с сильным размытием и свечением в режиме Screen — «дрим»-ореол.',
        tags: 'bokeh glow dream ореол сияние screen',
        apply: function (c) {
            var d = c.layer.duplicate();
            d.name = UK.PREFIX + 'Bokeh ' + c.layer.name;
            d.blendingMode = BlendingMode.SCREEN;
            var b = UK.addFx(d, 'ADBE Gaussian Blur 2', 'Bokeh Blur');
            UK.set(b, 'ADBE Gaussian Blur 2-0001', 45 * c.strength);
            UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
            var g = UK.addFx(d, 'ADBE Glo2', 'Bokeh Glow');
            UK.set(g, 'ADBE Glo2-0002', 40);
            UK.set(g, 'ADBE Glo2-0003', 120);
            UK.set(g, 'ADBE Glo2-0004', 1.2 * c.strength);
            var cs = { opts: c.opts, layer: d };
            var op = UK.cv(cs, 'Bokeh Opacity', 70);
            d.transform.opacity.expression = 'Math.min(100, ' + op + ')';
            if (c.opts.controls) UK.expr(b, 'ADBE Gaussian Blur 2-0001', UK.cv(cs, 'Bokeh Blur', 45 * c.strength));
        }
    });
    UK.add({
        id: 'light.rimLight', cat: 'light', name: 'Rim Light · Контровой свет',
        desc: 'Тонкая светлая кромка по альфа-каналу (Bevel Alpha). Угол — по направлению.',
        tags: 'rim light bevel контровой кромка объём',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Bevel Alpha', 'Rim Light');
            var ang = c.dirId === 'L' ? 180 : (c.dirId === 'R' ? 0 : (c.dirId === 'U' ? -90 : 90));
            UK.set(fx, 'ADBE Bevel Alpha-0001', 2.5 * c.strength);
            UK.set(fx, 'ADBE Bevel Alpha-0002', ang);
            UK.set(fx, 'ADBE Bevel Alpha-0003', [1, 1, 1, 1]);
            UK.set(fx, 'ADBE Bevel Alpha-0004', 0.6 * c.strength);
            if (c.opts.controls) {
                UK.expr(fx, 'ADBE Bevel Alpha-0004', UK.cv(c, 'Rim Intensity', 0.6 * c.strength));
                UK.expr(fx, 'ADBE Bevel Alpha-0002', UK.cv(c, 'Rim Angle', ang, 'angle'));
            }
        }
    });

})();
