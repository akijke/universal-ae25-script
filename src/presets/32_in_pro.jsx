// =============================================================================
//  PRO-анимации появления (In) — многослойные, «дизайнерские».
//  Определения общие для In/Out: UK.P.defs; 33_out_pro.jsx регистрирует зеркала.
// =============================================================================
(function () {
    var A = UK.A;

    // ---------------------------------------------------------------- хелперы
    var P = UK.P = {
        defs: [],
        /** Контекст для вспомогательного слоя (overshoot-выражения, контролы) */
        sub: function (c, L) { return { opts: c.opts, strength: c.strength, layer: L, comp: c.comp }; },
        /** hidden→visible (in) или visible→hidden (out) двумя ключами */
        anim: function (c, prop, hidden, visible, ta, tb, ease) {
            ease = ease || c.ease;
            if (c.isOut) return UK.key2(prop, ta, visible, tb, hidden, ease, true);
            return UK.key2(prop, ta, hidden, tb, visible, ease);
        },
        /** Три ключа: hidden → mid → visible (для out — в обратном порядке) */
        anim3: function (c, prop, hidden, mid, visible, ta, tb, ease, midFrac) {
            midFrac = midFrac == null ? 0.6 : midFrac;
            ease = ease || c.ease;
            var tm = c.isOut ? ta + (tb - ta) * (1 - midFrac) : ta + (tb - ta) * midFrac;
            if (c.isOut) return UK.keys(prop, [[ta, visible], [tm, mid], [tb, hidden]], ease, true);
            return UK.keys(prop, [[ta, hidden], [tm, mid], [tb, visible]], ease);
        },
        /** Интервал для i-го из n элементов с долей длительности frac (каскад внутри c.dur) */
        seg: function (c, i, n, frac) {
            frac = frac == null ? 0.65 : frac;
            var span = c.dur * frac, step = n > 1 ? (c.dur - span) / (n - 1) : 0;
            var ta = c.t0 + i * step;
            return [ta, ta + span];
        },
        /** Fade по opacity на [ta,tb] (учитывает in/out) */
        fade: function (c, L, ta, tb, ease) {
            var op = L.transform.opacity, vis = op.valueAtTime(c.isOut ? c.t0 : c.t1, false);
            P.anim(c, op, 0, vis, ta, tb, ease || 'expoOut');
            return op;
        },
        /**
         * Разрезать слой на n полос дублями с масками (полосы перпендикулярны направлению).
         * Возвращает [{layer, mask, i, cx, cy}] — cx/cy центр полосы в координатах слоя.
         */
        slices: function (c, n, perpendicular) {
            var L = c.layer, r = A.rect(L, c.isOut ? c.t0 : c.t1), pad = 6, res = [], i;
            var horizMove = A.horiz(c);
            if (perpendicular) horizMove = !horizMove;
            var layers = [L];
            for (i = 1; i < n; i++) {
                var d = L.duplicate();
                d.name = UK.PREFIX + L.name + ' ' + (i + 1);
                layers.push(d);
            }
            for (i = 0; i < n; i++) {
                var m = A.addMask(layers[i], 'Slice ' + (i + 1)), sh, cx, cy;
                if (horizMove) {
                    var y0 = r.t + r.h * i / n, y1 = r.t + r.h * (i + 1) / n;
                    sh = A.rectShape(r.l - pad, y0 - (i === 0 ? pad : 0), r.l + r.w + pad, y1 + (i === n - 1 ? pad : 0));
                    cx = r.l + r.w / 2; cy = (y0 + y1) / 2;
                } else {
                    var x0 = r.l + r.w * i / n, x1 = r.l + r.w * (i + 1) / n;
                    sh = A.rectShape(x0 - (i === 0 ? pad : 0), r.t - pad, x1 + (i === n - 1 ? pad : 0), r.t + r.h + pad);
                    cx = (x0 + x1) / 2; cy = r.t + r.h / 2;
                }
                m.property('ADBE Mask Shape').setValue(sh);
                res.push({ layer: layers[i], mask: m, i: i, cx: cx, cy: cy, r: r });
            }
            return res;
        },
        /** Эллиптическая маска-форма (cx,cy,rx,ry) */
        ellipse: function (cx, cy, rx, ry) {
            var k = 0.5523, s = new Shape();
            s.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
            s.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];
            s.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];
            s.closed = true;
            return s;
        },
        /** Регистрация всех определений как in или out */
        register: function (mode) {
            var out = mode === 'out';
            for (var i = 0; i < P.defs.length; i++) {
                (function (d) {
                    UK.add({
                        id: (out ? 'out.' : 'in.') + d.key,
                        cat: out ? 'out' : 'in',
                        name: out ? d.nameOut : d.nameIn,
                        desc: (out ? d.descOut || d.descIn : d.descIn) + ' [PRO]',
                        tags: d.tags + ' pro premium',
                        preview: out ? (d.previewOut || d.preview) : d.preview,
                        apply: function (c) { d.build(c); }
                    });
                })(P.defs[i]);
            }
        }
    };
    function def(d) { P.defs.push(d); }
    function tr(c, m) { return c.layer.transform.property(m); }
    function vis(c, prop) { return prop.valueAtTime(c.isOut ? c.t0 : c.t1, false); }

    // ================================================================ определения

    def({
        key: 'proSlice', preview: 'slideIn', previewOut: 'slideOut',
        nameIn: 'Slice Reveal · Полосы-слайсы', nameOut: 'Slice Hide · Уход полосами',
        descIn: 'Слой режется на 4 полосы (дубли с масками); полосы влетают по направлению каскадом с направленным размытием.',
        descOut: 'Слой режется на 4 полосы; полосы разлетаются по направлению каскадом с размытием.',
        tags: 'slice strips split полосы слайс',
        build: function (c) {
            var n = 4, sl = P.slices(c, n), i;
            for (i = 0; i < n; i++) {
                var L = sl[i].layer, pos = L.transform.position, v = vis(c, pos);
                var dist = UK.exitDistance(L, c.comp, c.dirV, c.t0) * (0.6 + 0.4 * c.strength);
                var dir = (i % 2 === 0) ? c.dirV : UK.vecMul(c.dirV, 1); // все с одной стороны, разный тайминг
                var s = P.seg(c, c.isOut ? n - 1 - i : i, n, 0.6);
                P.anim(c, pos, UK.vecAdd(v, UK.vecMul(dir, dist)), v, s[0], s[1]);
                UK.applyEaseExpr(pos, c.ease, P.sub(c, L));
                var mb = UK.addFx(L, 'ADBE Motion Blur', 'Slice Blur');
                UK.set(mb, 'ADBE Motion Blur-0001', A.blurDir(c));
                P.anim(c, UK.p(mb, 'ADBE Motion Blur-0002'), 80 * c.strength, 0, s[0], s[1], 'expoOut');
                UK.motionBlur(L, c.comp);
            }
        }
    });

    def({
        key: 'proSplit', preview: 'push', previewOut: 'push',
        nameIn: 'Split Reveal · Схождение половин', nameOut: 'Split Hide · Расхождение половин',
        descIn: 'Слой делится на две половины поперёк направления; половины съезжаются с противоположных сторон.',
        descOut: 'Две половины разъезжаются в противоположные стороны и исчезают.',
        tags: 'split half halves половины разрез',
        build: function (c) {
            var sl = P.slices(c, 2, true), i;
            for (i = 0; i < 2; i++) {
                var L = sl[i].layer, pos = L.transform.position, v = vis(c, pos);
                // половины двигаются вдоль разреза (перпендикулярно направлению пользователя)
                var mv = A.horiz(c) ? [0, i === 0 ? -1 : 1] : [i === 0 ? -1 : 1, 0];
                var dist = UK.exitDistance(L, c.comp, mv, c.t0) * (0.5 + 0.5 * c.strength);
                P.anim(c, pos, UK.vecAdd(v, UK.vecMul(mv, dist)), v, c.t0, c.t1);
                UK.applyEaseExpr(pos, c.ease, P.sub(c, L));
                UK.motionBlur(L, c.comp);
            }
        }
    });

    def({
        key: 'proBlinds3D', preview: 'flip', previewOut: 'flip',
        nameIn: 'Blinds 3D · 3D-жалюзи', nameOut: 'Blinds 3D Out · 3D-жалюзи уход',
        descIn: 'Слой режется на 5 полос, каждая — 3D и поворачивается вокруг своей оси с каскадной задержкой.',
        tags: 'blinds 3d rotate жалюзи полосы',
        build: function (c) {
            var n = 5, sl = P.slices(c, n), i, horizMove = A.horiz(c);
            for (i = 0; i < n; i++) {
                var L = sl[i].layer;
                UK.to3D(L);
                A.moveAnchor(L, sl[i].cx, sl[i].cy, c.t0);
                var rp = horizMove ? L.transform.xRotation : L.transform.yRotation;
                var v = vis(c, rp), s = P.seg(c, i, n, 0.7);
                P.anim(c, rp, v + 90 * (c.dirV[0] || c.dirV[1] || 1), v, s[0], s[1]);
                UK.applyEaseExpr(rp, c.ease, P.sub(c, L));
                P.fade(c, L, s[0], s[0] + (s[1] - s[0]) * 0.3);
                UK.motionBlur(L, c.comp);
            }
        }
    });

    def({
        key: 'proStrokeWipe', preview: 'wipe',
        nameIn: 'Soft Mask Wipe · Мягкая шторка', nameOut: 'Soft Mask Hide · Мягкое закрытие',
        descIn: 'Прямоугольная маска растёт по направлению с растушёвкой края и затухающим направленным смазом.',
        tags: 'mask wipe feather soft маска шторка',
        build: function (c) {
            var mp = A.maskPair(c.layer, c, c.t0), m = A.addMask(c.layer, 'Soft Wipe');
            P.anim(c, m.property('ADBE Mask Shape'), mp.empty, mp.full, c.t0, c.t1);
            var f = 40 * c.strength;
            m.property('ADBE Mask Feather').setValue(A.horiz(c) ? [f, 0] : [0, f]);
            var mb = UK.addFx(c.layer, 'ADBE Motion Blur', 'Wipe Blur');
            UK.set(mb, 'ADBE Motion Blur-0001', A.blurDir(c));
            P.anim(c, UK.p(mb, 'ADBE Motion Blur-0002'), 40 * c.strength, 0, c.t0, c.t1, 'expoOut');
        }
    });

    def({
        key: 'proBrush', preview: 'wipe',
        nameIn: 'Brush Reveal · Мазок кисти', nameOut: 'Brush Hide · Стирание мазком',
        descIn: 'Linear Wipe с рваным краем (Roughen Edges) и лёгкой турбулентностью — как мазок кисти по направлению.',
        tags: 'brush paint stroke roughen мазок кисть',
        build: function (c) {
            var L = c.layer;
            var w = UK.addFx(L, 'ADBE Linear Wipe', 'Brush Wipe');
            UK.set(w, 'ADBE Linear Wipe-0002', A.wipeAngle(c));
            UK.set(w, 'ADBE Linear Wipe-0003', 20);
            P.anim(c, UK.p(w, 'ADBE Linear Wipe-0001'), 100, 0, c.t0, c.t1);
            var re = UK.addFx(L, 'ADBE Roughen Edges', 'Brush Edges');
            UK.set(re, 'ADBE Roughen Edges-0001', 1);
            UK.set(re, 'ADBE Roughen Edges-0003', 60 * c.strength);
            UK.set(re, 'ADBE Roughen Edges-0004', 0.6);
            UK.set(re, 'ADBE Roughen Edges-0006', 150);
            UK.set(re, 'ADBE Roughen Edges-0009', 3);
            UK.expr(re, ['ADBE Roughen Edges-0010', 'Evolution'], 'time * 90');
            // края рваные только во время анимации
            P.anim(c, UK.p(re, 'ADBE Roughen Edges-0003'), 60 * c.strength, 0, c.isOut ? c.t0 : c.t1 - c.fd * 3, c.isOut ? c.t0 + c.fd * 3 : c.t1, 'linear');
        }
    });

    def({
        key: 'proInk', preview: 'iris',
        nameIn: 'Ink Reveal · Чернильная клякса', nameOut: 'Ink Hide · Клякса закрывает',
        descIn: 'Эллиптическая маска растёт из центра как клякса: рваный край (Roughen Edges) + турбулентность.',
        tags: 'ink blob splash клякса чернила',
        build: function (c) {
            var L = c.layer, r = A.rect(L, c.t0);
            var cx = r.l + r.w / 2, cy = r.t + r.h / 2, R = Math.sqrt(r.w * r.w + r.h * r.h) * 0.75;
            var m = A.addMask(L, 'Ink');
            P.anim(c, m.property('ADBE Mask Shape'), P.ellipse(cx, cy, 2, 2), P.ellipse(cx, cy, R, R), c.t0, c.t1, c.ease);
            m.property('ADBE Mask Feather').setValue([10, 10]);
            var re = UK.addFx(L, 'ADBE Roughen Edges', 'Ink Edges');
            UK.set(re, 'ADBE Roughen Edges-0001', 1);
            UK.set(re, 'ADBE Roughen Edges-0003', 80 * c.strength);
            UK.set(re, 'ADBE Roughen Edges-0004', 0.3);
            UK.set(re, 'ADBE Roughen Edges-0006', 220);
            UK.set(re, 'ADBE Roughen Edges-0009', 4);
            UK.expr(re, ['ADBE Roughen Edges-0010', 'Evolution'], 'time * 60');
            var td = UK.addFx(L, 'ADBE Turbulent Displace', 'Ink Turb');
            UK.set(td, 'ADBE Turbulent Displace-0003', 60);
            UK.set(td, 'ADBE Turbulent Displace-0005', 2);
            UK.expr(td, ['ADBE Turbulent Displace-0006', 'Evolution'], 'time * 80');
            P.anim(c, UK.p(td, 'ADBE Turbulent Displace-0002'), 40 * c.strength, 0, c.t0, c.t1, 'expoOut');
        }
    });

    def({
        key: 'proLiquid', preview: 'liquid',
        nameIn: 'Liquid Wipe · Жидкая шторка', nameOut: 'Liquid Hide · Жидкое стекание',
        descIn: 'Linear Wipe с мягким краем + Wave Warp + Turbulent Displace: край шторки «течёт» по направлению.',
        tags: 'liquid wave fluid жидкость волна',
        build: function (c) {
            var L = c.layer;
            var w = UK.addFx(L, 'ADBE Linear Wipe', 'Liquid Wipe');
            UK.set(w, 'ADBE Linear Wipe-0002', A.wipeAngle(c));
            UK.set(w, 'ADBE Linear Wipe-0003', 60);
            P.anim(c, UK.p(w, 'ADBE Linear Wipe-0001'), 100, 0, c.t0, c.t1);
            var ww = UK.addFx(L, 'ADBE Wave Warp', 'Liquid Wave');
            UK.set(ww, 'ADBE Wave Warp-0001', 1);
            UK.set(ww, 'ADBE Wave Warp-0003', 160);
            UK.set(ww, 'ADBE Wave Warp-0004', A.horiz(c) ? 90 : 0);
            UK.set(ww, 'ADBE Wave Warp-0005', 1.2);
            UK.set(ww, 'ADBE Wave Warp-0006', 1);
            P.anim(c, UK.p(ww, 'ADBE Wave Warp-0002'), 40 * c.strength, 0, c.t0, c.t1, 'expoOut');
            var td = UK.addFx(L, 'ADBE Turbulent Displace', 'Liquid Turb');
            UK.set(td, 'ADBE Turbulent Displace-0003', 90);
            UK.expr(td, ['ADBE Turbulent Displace-0006', 'Evolution'], 'time * 120');
            P.anim(c, UK.p(td, 'ADBE Turbulent Displace-0002'), 50 * c.strength, 0, c.t0, c.t1, 'expoOut');
        }
    });

    def({
        key: 'proLight', preview: 'glow',
        nameIn: 'Light Reveal · Из света', nameOut: 'Light Burn Out · Выгорание в свет',
        descIn: 'Слой проявляется из яркого свечения: Glow + Exposure падают, масштаб 110 → 100 %.',
        descOut: 'Слой пересвечивается и растворяется в свечении.',
        tags: 'light glow exposure bright свет свечение',
        build: function (c) {
            var L = c.layer, sc = tr(c, 'ADBE Scale'), v = vis(c, sc);
            P.anim(c, sc, A.scaleXY(v, 1 + 0.1 * c.strength, 1 + 0.1 * c.strength), v, c.t0, c.t1);
            var g = UK.addFx(L, 'ADBE Glo2', 'Light Glow');
            UK.set(g, 'ADBE Glo2-0002', 30); UK.set(g, 'ADBE Glo2-0003', 200);
            P.anim(c, UK.p(g, 'ADBE Glo2-0004'), 4 * c.strength, 0, c.t0, c.t1, 'expoOut');
            var ex = UK.addFx(L, 'ADBE Exposure2', 'Light Exposure');
            P.anim(c, UK.p(ex, ['ADBE Exposure2-0003', 'Exposure']), 3 * c.strength, 0, c.t0, c.t1, 'expoOut');
            P.fade(c, L, c.t0, c.t0 + c.dur * 0.35);
        }
    });

    def({
        key: 'proLens', preview: 'bulge',
        nameIn: 'Lens Reveal · Через линзу', nameOut: 'Lens Hide · Уход в линзу',
        descIn: 'Optics Compensation (FOV 120 → 0) + масштаб + размытие: слой «выпрямляется» из линзового искажения.',
        tags: 'lens optics fisheye линза',
        build: function (c) {
            var L = c.layer, sc = tr(c, 'ADBE Scale'), v = vis(c, sc);
            var oc = UK.addFx(L, 'ADBE Optics Compensation', 'Lens');
            UK.set(oc, 'ADBE Optics Compensation-0002', 1);
            P.anim(c, UK.p(oc, 'ADBE Optics Compensation-0001'), 120 * UK.clamp(c.strength, 0.3, 1.4), 0, c.t0, c.t1);
            P.anim(c, sc, A.scaleXY(v, 1.3, 1.3), v, c.t0, c.t1);
            var b = UK.addFx(L, 'ADBE Gaussian Blur 2', 'Lens Blur');
            UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
            P.anim(c, UK.p(b, 'ADBE Gaussian Blur 2-0001'), 30 * c.strength, 0, c.t0, c.t1, 'expoOut');
            P.fade(c, L, c.t0, c.t0 + c.dur * 0.4);
        }
    });

    def({
        key: 'proDepth', preview: 'blurIn', previewOut: 'blurOut',
        nameIn: 'Depth Push · Из глубины', nameOut: 'Depth Pull · В глубину',
        descIn: 'Масштаб 60 → 100 % с Gaussian Blur 30 → 0 (размытие отстаёт) и проявлением — ощущение глубины резкости.',
        tags: 'depth focus blur scale глубина резкость',
        build: function (c) {
            var L = c.layer, sc = tr(c, 'ADBE Scale'), v = vis(c, sc);
            var k = 1 - 0.4 * UK.clamp(c.strength, 0.2, 2);
            P.anim(c, sc, A.scaleXY(v, k, k), v, c.t0, c.t1);
            UK.applyEaseExpr(sc, c.ease, c);
            var b = UK.addFx(L, 'ADBE Gaussian Blur 2', 'Depth Blur');
            UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
            var bt = c.isOut ? [c.t0 + c.dur * 0.3, c.t1] : [c.t0, c.t1 - c.dur * 0.15];
            P.anim(c, UK.p(b, 'ADBE Gaussian Blur 2-0001'), 30 * c.strength, 0, bt[0], bt[1], 'expoOut');
            P.fade(c, L, c.t0, c.t0 + c.dur * 0.5);
        }
    });

    def({
        key: 'proParallax', preview: 'slideIn', previewOut: 'slideOut',
        nameIn: 'Parallax Layers · Параллакс по слоям', nameOut: 'Parallax Out · Параллакс-уход',
        descIn: 'Для нескольких выделенных слоёв: глубина по порядку — верхние слои едут дальше и быстрее, нижние — меньше. С одним слоем = мягкий slide.',
        tags: 'parallax depth layers multi параллакс',
        build: function (c) {
            var n = c.layers.length || 1, depth = (c.i + 1) / n; // 1 = самый «близкий»
            var pos = tr(c, 'ADBE Position'), v = vis(c, pos);
            var dist = UK.exitDistance(c.layer, c.comp, c.dirV, c.t0) * (0.25 + 0.75 * depth) * c.strength;
            var span = c.dur * (0.6 + 0.4 * (1 - depth));
            var ta = c.isOut ? c.t1 - span : c.t0, tb = c.isOut ? c.t1 : c.t0 + span;
            P.anim(c, pos, UK.vecAdd(v, UK.vecMul(c.dirV, dist)), v, ta, tb);
            UK.applyEaseExpr(pos, c.ease, c);
            P.fade(c, c.layer, ta, ta + span * 0.5);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    def({
        key: 'proZoomThrough', preview: 'zoom',
        nameIn: 'Zoom Through · Пролёт сквозь', nameOut: 'Zoom Through Out · Пролёт мимо камеры',
        descIn: 'Масштаб 160 → 100 % с радиальным зум-размытием и проявлением — слой «прилетает» из камеры.',
        tags: 'zoom through radial blur пролёт зум',
        build: function (c) {
            var L = c.layer, sc = tr(c, 'ADBE Scale'), v = vis(c, sc), k = 1 + 0.6 * c.strength;
            P.anim(c, sc, A.scaleXY(v, k, k), v, c.t0, c.t1);
            UK.applyEaseExpr(sc, c.ease, c);
            var rb = UK.addFx(L, 'CC Radial Fast Blur', 'Zoom Blur');
            UK.set(rb, 'CC Radial Fast Blur-0003', 2);
            var r = A.rect(L, c.t0);
            UK.set(rb, 'CC Radial Fast Blur-0001', [r.l + r.w / 2, r.t + r.h / 2]);
            P.anim(c, UK.p(rb, 'CC Radial Fast Blur-0002'), 70 * UK.clamp(c.strength, 0.2, 1.3), 0, c.t0, c.t1, 'expoOut');
            P.fade(c, L, c.t0, c.t0 + c.dur * 0.4);
        }
    });

    def({
        key: 'proKinetic', preview: 'slideIn', previewOut: 'slideOut',
        nameIn: 'Kinetic Slide · Кинетический слайд', nameOut: 'Kinetic Slide Out · Кинетический уход',
        descIn: 'Slide по направлению с наклоном (skew) в сторону движения, перелётом и лёгким squash по оси движения.',
        tags: 'kinetic skew slide squash кинетика наклон',
        build: function (c) {
            var L = c.layer, pos = tr(c, 'ADBE Position'), v = vis(c, pos), sg = A.sign(c);
            var dist = UK.exitDistance(L, c.comp, c.dirV, c.t0) * (0.4 + 0.6 * c.strength);
            P.anim(c, pos, UK.vecAdd(v, UK.vecMul(c.dirV, dist)), v, c.t0, c.t1, 'expoOut');
            A.force(pos, 'back', c);
            var tf = UK.addFx(L, 'ADBE Geometry2', 'Kinetic Skew');
            UK.set(tf, 'ADBE Geometry2-0007', A.horiz(c) ? 0 : 90);
            UK.set(tf, 'ADBE Geometry2-0010', 0); UK.set(tf, 'ADBE Geometry2-0011', 360);
            P.anim3(c, UK.p(tf, 'ADBE Geometry2-0006'), -25 * sg * c.strength, 8 * sg * c.strength, 0, c.t0, c.t1, 'smooth', 0.7);
            var sc = tr(c, 'ADBE Scale'), sv = vis(c, sc);
            var sq = A.horiz(c) ? A.scaleXY(sv, 1.25, 0.85) : A.scaleXY(sv, 0.85, 1.25);
            P.anim3(c, sc, sq, A.scaleXY(sv, 1.0, 1.0), sv, c.t0, c.t1, 'smooth', 0.75);
            UK.motionBlur(L, c.comp);
        }
    });

    def({
        key: 'proElasticDrop', preview: 'bounce',
        nameIn: 'Elastic Drop · Падение с отскоком', nameOut: 'Elastic Lift · Подскок и улёт',
        descIn: 'Падение сверху (или по направлению) с bounce-выражением и squash по вертикали в момент приземления.',
        tags: 'drop bounce squash elastic падение отскок',
        build: function (c) {
            var L = c.layer, pos = tr(c, 'ADBE Position'), v = vis(c, pos);
            var dir = c.dirV[1] !== 0 ? c.dirV : [0, -1];
            var dist = UK.exitDistance(L, c.comp, dir, c.t0) * UK.clamp(c.strength, 0.3, 1.5);
            P.anim(c, pos, UK.vecAdd(v, UK.vecMul(dir, dist)), v, c.t0, c.t1, 'expoOut');
            A.force(pos, 'bounce', c);
            var sc = tr(c, 'ADBE Scale'), sv = vis(c, sc);
            var tHit = c.isOut ? c.t0 : c.t1;
            var k = UK.keys(sc, [[tHit - c.fd * 2, sv], [tHit, A.scaleXY(sv, 1.15, 0.85)], [tHit + c.fd * 4, sv]], 'smooth');
            UK.motionBlur(L, c.comp);
        }
    });

    def({
        key: 'proSpinPop', preview: 'spin',
        nameIn: 'Spin Pop · Вращение с ростом', nameOut: 'Spin Pop Out · Вращение в ноль',
        descIn: 'Rotation 180° → 0 (сторона по направлению) + масштаб 0 → 100 % с перелётом и motion blur.',
        tags: 'spin rotate pop scale вращение',
        build: function (c) {
            var L = c.layer, rot = tr(c, 'ADBE Rotate Z'), rv = vis(c, rot), sg = A.sign(c);
            P.anim(c, rot, rv - 180 * sg * UK.clamp(c.strength, 0.25, 2), rv, c.t0, c.t1);
            var sc = tr(c, 'ADBE Scale'), sv = vis(c, sc);
            P.anim(c, sc, UK.vecMul(sv, 0), sv, c.t0, c.t1);
            A.force(sc, 'back', c);
            UK.motionBlur(L, c.comp);
        }
    });

    def({
        key: 'proFlipShadow', preview: 'flip',
        nameIn: 'Flip 3D + Shadow · Переворот с тенью', nameOut: 'Flip 3D + Shadow Out · Уход переворотом',
        descIn: '3D-переворот вокруг оси (по направлению) с растущей тенью (Drop Shadow) и лёгким масштабом.',
        tags: 'flip 3d shadow card переворот тень',
        build: function (c) {
            var L = c.layer; UK.to3D(L);
            var rp = A.horiz(c) ? L.transform.yRotation : L.transform.xRotation, rv = vis(c, rp), sg = A.sign(c);
            P.anim(c, rp, rv - 90 * sg, rv, c.t0, c.t1);
            UK.applyEaseExpr(rp, c.ease, c);
            var ds = UK.addFx(L, 'ADBE Drop Shadow', 'Flip Shadow');
            UK.set(ds, 'ADBE Drop Shadow-0001', [0, 0, 0, 1]);
            UK.set(ds, 'ADBE Drop Shadow-0003', 135);
            UK.set(ds, 'ADBE Drop Shadow-0005', 40);
            P.anim(c, UK.p(ds, 'ADBE Drop Shadow-0002'), 0, 128 * UK.clamp(c.strength, 0, 1.5), c.t0, c.t1, 'smooth');
            P.anim(c, UK.p(ds, 'ADBE Drop Shadow-0004'), 60, 14, c.t0, c.t1, 'smooth');
            var sc = tr(c, 'ADBE Scale'), sv = vis(c, sc);
            P.anim(c, sc, A.scaleXY(sv, 0.9, 0.9), sv, c.t0, c.t1);
            UK.motionBlur(L, c.comp);
        }
    });

    def({
        key: 'proCardFlip', preview: 'flip',
        nameIn: 'Card Flip · Карточка', nameOut: 'Card Flip Out · Карточка уходит',
        descIn: 'Переворот на 180° (3D) с провалом масштаба в середине (эффект глубины) и проявлением на первой трети.',
        tags: 'card flip 3d карточка',
        build: function (c) {
            var L = c.layer; UK.to3D(L);
            var rp = A.horiz(c) ? L.transform.yRotation : L.transform.xRotation, rv = vis(c, rp), sg = A.sign(c);
            P.anim(c, rp, rv - 180 * sg, rv, c.t0, c.t1);
            UK.applyEaseExpr(rp, c.ease, c);
            var sc = tr(c, 'ADBE Scale'), sv = vis(c, sc);
            var mid = c.t0 + c.dur * 0.5;
            UK.keys(sc, [[c.t0, c.isOut ? sv : A.scaleXY(sv, 0.9, 0.9)], [mid, A.scaleXY(sv, 0.75, 0.75)], [c.t1, c.isOut ? A.scaleXY(sv, 0.9, 0.9) : sv]], 'smooth');
            P.fade(c, L, c.t0, c.t0 + c.dur * 0.3);
            UK.motionBlur(L, c.comp);
        }
    });

    def({
        key: 'proPixelSort', preview: 'pixel',
        nameIn: 'Pixel Sort · Пиксельное растяжение', nameOut: 'Pixel Sort Out · Распад в пиксели',
        descIn: 'Mosaic + Minimax (вытягивание пикселей по оси направления) + wipe: слой «собирается» из пиксельных полос.',
        tags: 'pixel sort mosaic minimax stretch пиксели',
        build: function (c) {
            var L = c.layer, r = A.rect(L, c.t0);
            var mm = UK.addFx(L, 'ADBE Minimax', 'Pixel Stretch');
            UK.set(mm, 'ADBE Minimax-0001', 2);
            UK.set(mm, 'ADBE Minimax-0003', 1);
            UK.set(mm, 'ADBE Minimax-0004', A.horiz(c) ? 2 : 3);
            P.anim(c, UK.p(mm, 'ADBE Minimax-0002'), Math.round(60 * c.strength), 0, c.t0, c.t1, 'expoOut');
            var mos = UK.addFx(L, 'ADBE Mosaic', 'Pixel Blocks');
            UK.set(mos, 'ADBE Mosaic-0003', 1);
            var maxB = Math.max(64, Math.round(Math.max(r.w, r.h)));
            P.anim(c, UK.p(mos, 'ADBE Mosaic-0001'), A.horiz(c) ? 6 : Math.round(maxB / 4), maxB, c.t0, c.t1, 'expoOut');
            P.anim(c, UK.p(mos, 'ADBE Mosaic-0002'), A.horiz(c) ? Math.round(maxB / 4) : 6, maxB, c.t0, c.t1, 'expoOut');
            var w = UK.addFx(L, 'ADBE Linear Wipe', 'Pixel Wipe');
            UK.set(w, 'ADBE Linear Wipe-0002', A.wipeAngle(c));
            UK.set(w, 'ADBE Linear Wipe-0003', 120);
            P.anim(c, UK.p(w, 'ADBE Linear Wipe-0001'), 100, 0, c.t0, c.t0 + c.dur * 0.8);
        }
    });

    def({
        key: 'proGlitchSlices', preview: 'glitch',
        nameIn: 'Glitch Slices · Глитч-полосы', nameOut: 'Glitch Slices Out · Глитч-распад',
        descIn: 'Слой режется на 6 полос; каждая случайно дёргается hold-ключами со сдвигом каналов (Shift Channels на дублях), затухая к концу.',
        tags: 'glitch slices rgb digital глитч полосы',
        build: function (c) {
            var n = 6, sl = P.slices(c, n), i, j;
            var steps = Math.max(4, Math.round(c.dur / c.fd / 2)), step = c.dur / steps;
            for (i = 0; i < n; i++) {
                var L = sl[i].layer, pos = L.transform.position, v = vis(c, pos);
                var amp = (40 + 60 * Math.random()) * c.strength;
                for (j = 0; j <= steps; j++) {
                    var t = c.t0 + j * step, k = c.isOut ? j / steps : 1 - j / steps;
                    var p = v.slice();
                    if (k > 0 && Math.random() < 0.7) {
                        p[0] = v[0] + UK.rnd(-amp, amp) * k * (A.horiz(c) ? 1 : 0.3);
                        p[1] = v[1] + UK.rnd(-amp, amp) * k * (A.horiz(c) ? 0.3 : 1);
                    }
                    UK.setHold(pos, UK.key(pos, t, p));
                }
                if (i % 3 !== 0) {
                    // сдвиг каналов на части полос: во время глитча — только красный или синий, в конце — норма
                    var sh = UK.addFx(L, 'ADBE Shift Channels', 'Glitch RGB');
                    var shifted = i % 3 === 1 ? [1, 10, 10] : [10, 10, 3], normal = [1, 2, 3];
                    var tShift = c.isOut ? c.t0 + c.fd * 2 : c.t0, tNorm = c.isOut ? c.t0 : c.t1 - c.fd;
                    var chans = ['ADBE Shift Channels-0002', 'ADBE Shift Channels-0003', 'ADBE Shift Channels-0004'];
                    for (j = 0; j < 3; j++) {
                        var cp = UK.p(sh, chans[j]);
                        UK.setHold(cp, UK.key(cp, tShift, shifted[j]));
                        UK.setHold(cp, UK.key(cp, tNorm, normal[j]));
                    }
                }
            }
            P.fade(c, sl[0].layer, c.t0, c.t0 + c.fd * 2, 'linear');
        }
    });

    def({
        key: 'proChromaPop', preview: 'rgb',
        nameIn: 'Chromatic Pop · Pop с хроматикой', nameOut: 'Chromatic Pop Out · Хроматический уход',
        descIn: 'Scale pop с перелётом; два дубля (красный и синий каналы, Add) разъезжаются и гаснут — хроматическая аберрация в момент появления.',
        tags: 'chromatic rgb pop aberration хроматика',
        build: function (c) {
            var L = c.layer, sc = tr(c, 'ADBE Scale'), sv = vis(c, sc);
            P.anim(c, sc, A.scaleXY(sv, 0.6, 0.6), sv, c.t0, c.t1);
            A.force(sc, 'back', c);
            P.fade(c, L, c.t0, c.t0 + c.dur * 0.3);
            var off = 30 * c.strength, defs = [[1, 10, 10, [-off, 0]], [10, 10, 3, [off, 0]]], i;
            for (i = 0; i < 2; i++) {
                var d = L.duplicate();
                d.name = UK.PREFIX + L.name + (i === 0 ? ' R' : ' B');
                d.blendingMode = BlendingMode.ADD;
                var sh = UK.addFx(d, 'ADBE Shift Channels', 'Chroma');
                UK.set(sh, 'ADBE Shift Channels-0002', defs[i][0]);
                UK.set(sh, 'ADBE Shift Channels-0003', defs[i][1]);
                UK.set(sh, 'ADBE Shift Channels-0004', defs[i][2]);
                var pos = d.transform.position, pv = vis(c, pos);
                var o = A.horiz(c) ? defs[i][3] : [0, defs[i][3][0]];
                P.anim(c, pos, UK.vecAdd(pv, o), pv, c.t0, c.t1, 'expoOut');
                var op = d.transform.opacity;
                if (c.isOut) UK.key2(op, c.t0, 0, c.t1, 80, 'expoIn');
                else UK.key2(op, c.t0, 80, c.t1, 0, 'expoOut');
            }
        }
    });

    def({
        key: 'proBlocks', preview: 'typewriter',
        nameIn: 'Block Wipe · Блочное появление', nameOut: 'Block Hide · Блочное исчезновение',
        descIn: 'Linear Wipe hold-ключами по 8 шагам — «цифровое», ступенчатое открытие по направлению (как печать блоками).',
        tags: 'block step wipe digital блоки ступени',
        build: function (c) {
            var w = UK.addFx(c.layer, 'ADBE Linear Wipe', 'Block Wipe');
            UK.set(w, 'ADBE Linear Wipe-0002', A.wipeAngle(c));
            UK.set(w, 'ADBE Linear Wipe-0003', 0);
            var p = UK.p(w, 'ADBE Linear Wipe-0001'), n = Math.max(3, Math.round(8 * UK.clamp(c.strength, 0.4, 2))), i;
            for (i = 0; i <= n; i++) {
                var t = c.t0 + c.dur * i / n, k = i / n;
                var val = c.isOut ? 100 * k : 100 * (1 - k);
                UK.setHold(p, UK.key(p, t, val));
            }
        }
    });

    def({
        key: 'proShutter', preview: 'blinds',
        nameIn: 'Shutter · Жалюзи с размытием', nameOut: 'Shutter Out · Жалюзи закрываются',
        descIn: 'Venetian Blinds (направление по настройке) с растушёвкой + направленный смаз, затухающий к концу.',
        tags: 'shutter blinds blur жалюзи',
        build: function (c) {
            var L = c.layer;
            var vb = UK.addFx(L, 'ADBE Venetian Blinds', 'Shutter');
            UK.set(vb, 'ADBE Venetian Blinds-0002', A.horiz(c) ? 90 : 0);
            UK.set(vb, 'ADBE Venetian Blinds-0003', Math.round(40 + 60 * c.strength));
            UK.set(vb, 'ADBE Venetian Blinds-0004', 12);
            P.anim(c, UK.p(vb, 'ADBE Venetian Blinds-0001'), 100, 0, c.t0, c.t1);
            var mb = UK.addFx(L, 'ADBE Motion Blur', 'Shutter Blur');
            UK.set(mb, 'ADBE Motion Blur-0001', A.blurDir(c));
            P.anim(c, UK.p(mb, 'ADBE Motion Blur-0002'), 60 * c.strength, 0, c.t0, c.t1, 'expoOut');
        }
    });

    def({
        key: 'proClock', preview: 'iris',
        nameIn: 'Clock Wipe Soft · Мягкая часовая шторка', nameOut: 'Clock Wipe Soft Out · Часовая шторка закрывает',
        descIn: 'Radial Wipe с широкой растушёвкой и свечением края (Glow). Направление задаёт сторону вращения.',
        tags: 'clock radial wipe glow часовая шторка',
        build: function (c) {
            var L = c.layer, r = A.rect(L, c.t0);
            var rw = UK.addFx(L, 'ADBE Radial Wipe', 'Clock');
            UK.set(rw, 'ADBE Radial Wipe-0002', A.horiz(c) ? 0 : 180);
            UK.set(rw, 'ADBE Radial Wipe-0003', [r.l + r.w / 2, r.t + r.h / 2]);
            UK.set(rw, 'ADBE Radial Wipe-0004', A.sign(c) > 0 ? 1 : 2);
            UK.set(rw, 'ADBE Radial Wipe-0005', 80 * c.strength);
            P.anim(c, UK.p(rw, 'ADBE Radial Wipe-0001'), 100, 0, c.t0, c.t1);
            var g = UK.addFx(L, 'ADBE Glo2', 'Clock Glow');
            UK.set(g, 'ADBE Glo2-0001', 2); // alpha
            UK.set(g, 'ADBE Glo2-0003', 40);
            P.anim(c, UK.p(g, 'ADBE Glo2-0004'), 1.5 * c.strength, 0, c.isOut ? c.t0 : c.t1 - c.dur * 0.3, c.isOut ? c.t0 + c.dur * 0.3 : c.t1, 'smooth');
        }
    });

    def({
        key: 'proIrisGlow', preview: 'iris',
        nameIn: 'Iris Glow · Диафрагма со свечением', nameOut: 'Iris Glow Out · Диафрагма закрывается',
        descIn: 'Iris Wipe (круг из центра) с мягким краем и свечением альфы по контуру.',
        tags: 'iris circle glow диафрагма круг',
        build: function (c) {
            var L = c.layer, r = A.rect(L, c.t0), R = Math.sqrt(r.w * r.w + r.h * r.h) * 0.55;
            var iw = UK.addFx(L, 'ADBE Iris Wipe', 'Iris');
            UK.set(iw, 'ADBE Iris Wipe-0001', [r.l + r.w / 2, r.t + r.h / 2]);
            UK.set(iw, 'ADBE Iris Wipe-0002', 32);
            UK.set(iw, 'ADBE Iris Wipe-0007', 60 * c.strength);
            P.anim(c, UK.p(iw, 'ADBE Iris Wipe-0003'), 0, R, c.t0, c.t1);
            var g = UK.addFx(L, 'ADBE Glo2', 'Iris Glow');
            UK.set(g, 'ADBE Glo2-0001', 2);
            UK.set(g, 'ADBE Glo2-0003', 60);
            P.anim(c, UK.p(g, 'ADBE Glo2-0004'), 2 * c.strength, 0, c.t0, c.t1, 'smooth');
        }
    });

    def({
        key: 'proSoftFocus', preview: 'blurIn', previewOut: 'blurOut',
        nameIn: 'Soft Focus In · Из расфокуса', nameOut: 'Soft Focus Out · В расфокус',
        descIn: 'Gaussian Blur 40 → 0 с пересветом (Brightness +40 → 0) и проявлением — «наведение резкости» с лёгким свечением.',
        tags: 'focus blur soft bright расфокус',
        build: function (c) {
            var L = c.layer;
            var b = UK.addFx(L, 'ADBE Gaussian Blur 2', 'Focus Blur');
            UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
            P.anim(c, UK.p(b, 'ADBE Gaussian Blur 2-0001'), 40 * c.strength, 0, c.t0, c.t1, 'expoOut');
            var bc = UK.addFx(L, 'ADBE Brightness & Contrast 2', 'Focus Bright');
            P.anim(c, UK.p(bc, 'ADBE Brightness & Contrast 2-0001'), 40 * c.strength, 0, c.t0, c.t1, 'expoOut');
            P.fade(c, L, c.t0, c.t0 + c.dur * 0.5);
        }
    });

    def({
        key: 'proStretchSnap', preview: 'stretch',
        nameIn: 'Stretch Snap · Растяжение с щелчком', nameOut: 'Stretch Snap Out · Схлопывание',
        descIn: 'Масштаб по оси направления 0 → 130 → 100 % (перпендикулярная ось 100 → 90 → 100): резкое, «резиновое» появление.',
        tags: 'stretch snap scale rubber растяжение',
        build: function (c) {
            var sc = tr(c, 'ADBE Scale'), sv = vis(c, sc), k = 1 + 0.3 * c.strength;
            var hidden = A.horiz(c) ? A.scaleXY(sv, 0, 1) : A.scaleXY(sv, 1, 0);
            var mid = A.horiz(c) ? A.scaleXY(sv, k, 0.9) : A.scaleXY(sv, 0.9, k);
            P.anim3(c, sc, hidden, mid, sv, c.t0, c.t1, 'smooth', 0.6);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    def({
        key: 'proWave', preview: 'wave',
        nameIn: 'Wave In · Волной', nameOut: 'Wave Out · Волна уносит',
        descIn: 'Wave Warp (высота 60 → 0) + проявление: слой «успокаивается» из волны. Направление задаёт ось волны.',
        tags: 'wave warp волна',
        build: function (c) {
            var L = c.layer;
            var ww = UK.addFx(L, 'ADBE Wave Warp', 'Wave');
            UK.set(ww, 'ADBE Wave Warp-0003', 120);
            UK.set(ww, 'ADBE Wave Warp-0004', A.horiz(c) ? 0 : 90);
            UK.set(ww, 'ADBE Wave Warp-0005', 1.5);
            UK.set(ww, 'ADBE Wave Warp-0006', 1);
            P.anim(c, UK.p(ww, 'ADBE Wave Warp-0002'), 60 * c.strength, 0, c.t0, c.t1, 'expoOut');
            P.fade(c, L, c.t0, c.t0 + c.dur * 0.5);
        }
    });

    def({
        key: 'proSwingDoor', preview: 'swing',
        nameIn: 'Swing Door · Дверь', nameOut: 'Swing Door Out · Дверь закрывается',
        descIn: 'Якорь переносится на край слоя по направлению; 3D-поворот -100° → 0 с перелётом — как открывающаяся дверь.',
        tags: 'door swing hinge 3d дверь петля',
        build: function (c) {
            var L = c.layer, r = A.rect(L, c.t0); UK.to3D(L);
            var ax = r.l + (c.dirId === 'R' ? r.w : (c.dirId === 'L' ? 0 : r.w / 2));
            var ay = r.t + (c.dirId === 'D' ? r.h : (c.dirId === 'U' ? 0 : r.h / 2));
            A.moveAnchor(L, ax, ay, c.t0);
            var rp = A.horiz(c) ? L.transform.yRotation : L.transform.xRotation, rv = vis(c, rp);
            var sg = c.dirId === 'R' || c.dirId === 'U' ? -1 : 1;
            P.anim(c, rp, rv + 100 * sg * UK.clamp(c.strength, 0.3, 1.5), rv, c.t0, c.t1);
            A.force(rp, 'back', c);
            UK.motionBlur(L, c.comp);
        }
    });

    def({
        key: 'proUnroll', preview: 'roll',
        nameIn: 'Unroll · Разворачивание', nameOut: 'Roll Up · Сворачивание',
        descIn: 'Якорь на краю по направлению; масштаб по оси 0 → 100 % со skew-«заломом» (Transform) — разворачивается как лист.',
        tags: 'unroll roll paper scroll разворот свиток',
        build: function (c) {
            var L = c.layer, r = A.rect(L, c.t0), sg = A.sign(c);
            var ax = r.l + (c.dirId === 'R' ? 0 : (c.dirId === 'L' ? r.w : r.w / 2));
            var ay = r.t + (c.dirId === 'D' ? 0 : (c.dirId === 'U' ? r.h : r.h / 2));
            A.moveAnchor(L, ax, ay, c.t0);
            var sc = tr(c, 'ADBE Scale'), sv = vis(c, sc);
            P.anim(c, sc, A.horiz(c) ? A.scaleXY(sv, 0, 1) : A.scaleXY(sv, 1, 0), sv, c.t0, c.t1);
            var tf = UK.addFx(L, 'ADBE Geometry2', 'Unroll Skew');
            UK.set(tf, 'ADBE Geometry2-0007', A.horiz(c) ? 90 : 0);
            UK.set(tf, 'ADBE Geometry2-0010', 0); UK.set(tf, 'ADBE Geometry2-0011', 360);
            P.anim3(c, UK.p(tf, 'ADBE Geometry2-0006'), 35 * sg * c.strength, -6 * sg * c.strength, 0, c.t0, c.t1, 'smooth', 0.7);
            UK.motionBlur(L, c.comp);
        }
    });

    def({
        key: 'proZoomRotate', preview: 'zoom',
        nameIn: 'Zoom Rotate Blur · Зум с вращением', nameOut: 'Zoom Rotate Blur Out · Улёт с вращением',
        descIn: 'Масштаб 0 → 100 % + поворот 90° → 0 + радиальное размытие (spin) с перелётом — энергичное появление.',
        tags: 'zoom rotate spin radial blur зум вращение',
        build: function (c) {
            var L = c.layer, sc = tr(c, 'ADBE Scale'), sv = vis(c, sc), rot = tr(c, 'ADBE Rotate Z'), rv = vis(c, rot), sg = A.sign(c);
            P.anim(c, sc, UK.vecMul(sv, 0), sv, c.t0, c.t1);
            A.force(sc, 'back', c);
            P.anim(c, rot, rv + 90 * sg * c.strength, rv, c.t0, c.t1);
            var rb = UK.addFx(L, 'ADBE Radial Blur', 'Spin Blur');
            UK.set(rb, 'ADBE Radial Blur-0003', 1);
            var r = A.rect(L, c.t0);
            UK.set(rb, 'ADBE Radial Blur-0002', [r.l + r.w / 2, r.t + r.h / 2]);
            P.anim(c, UK.p(rb, 'ADBE Radial Blur-0001'), 40 * c.strength, 0, c.t0, c.t1, 'expoOut');
            UK.motionBlur(L, c.comp);
        }
    });

    P.register('in');
})();
