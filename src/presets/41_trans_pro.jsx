// =============================================================================
//  PRO-переходы (cat: 'trans', needs: 'trans') — многослойные, «дизайнерские».
//  Все работают при A+B / только B / только A.
// =============================================================================
(function () {
    var A = UK.A;

    // ------------------------------------------------------------ helpers (локальные копии)
    function F(x) { return String(UK.fmt(x, 4)); }
    function isArr(v) { return v !== null && typeof v === 'object' && typeof v.length === 'number'; }
    function V(v) { return isArr(v) ? '[' + v.join(', ') + ']' : String(UK.fmt(v, 4)); }
    function addv(a, b) { return isArr(a) ? UK.vecAdd(a, b) : a + b; }
    function horiz(c) { return c.dirV[0] !== 0; }
    function sgn(c) { return horiz(c) ? c.dirV[0] : c.dirV[1]; }
    function need(c) { if (!c.A && !c.B) throw new Error('Выделите слой(и) на склейке (2 соседних слоя или 1 слой + курсор).'); }
    function center(c) { return UK.center(c.comp); }
    function sub(c, L) { return { opts: c.opts, strength: c.strength, layer: L, comp: c.comp }; }
    function tB(c) { return (c.B && c.B.inPoint < c.cut - c.fd / 2) ? [c.t0, c.t1] : [c.cut, c.t1]; }
    function tA(c) { return (c.A && c.A.outPoint > c.cut + c.fd / 2) ? [c.t0, c.t1] : [c.t0, c.cut]; }
    function lrect(L, c) {
        var r;
        try { r = L.sourceRectAtTime(c.cut, false); r = { l: r.left, t: r.top, w: r.width, h: r.height }; } catch (e) { r = null; }
        if (!r || !(r.w > 0) || !(r.h > 0)) r = { l: 0, t: 0, w: L.width || c.comp.width, h: L.height || c.comp.height };
        return r;
    }
    /** base → base+delta (cut) → base; при контролах — слайдер + выражение */
    function sym(c, prop, base, delta, nick, ease) {
        if (c.opts.controls) {
            var ref = UK.cv(c, nick, 100);
            prop.expression =
                'var amp = ' + ref + ' / 100;\n' +
                'var e = (time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', 0, 1) : ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', 1, 0);\n' +
                V(base) + ' + ' + V(delta) + ' * amp * e';
        } else {
            UK.keys(prop, [[c.t0, base], [c.cut, addv(base, delta)], [c.t1, base]], ease || 'expoInOut');
        }
    }
    /** прыжок: base→base+dA (к cut), затем base+dB→base */
    function jump(c, prop, base, dA, dB, nick) {
        if (c.opts.controls) {
            var ref = UK.cv(c, nick, 100);
            prop.expression =
                'var amp = ' + ref + ' / 100;\n' +
                '(time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', ' + V(base) + ', ' + V(base) + ' + ' + V(dA) + ' * amp) : ' +
                'ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', ' + V(base) + ' + ' + V(dB) + ' * amp, ' + V(base) + ')';
        } else {
            UK.key2(prop, c.t0, base, c.cut, addv(base, dA), 'expoIn');
            UK.key2(prop, Math.min(c.cut + c.fd, c.t1), addv(base, dB), c.t1, base, 'expoOut');
        }
    }
    /** корр. слой + (опц.) Motion Tile 300% mirror + Transform (shutter 360) */
    function adjTT(c, name, withTile, layer) {
        var adj = layer || c.adj(name), r = { adj: adj };
        if (withTile) {
            r.tile = UK.addFx(adj, 'ADBE Tile', 'Tile');
            UK.set(r.tile, 'ADBE Tile-0004', 300);
            UK.set(r.tile, 'ADBE Tile-0005', 300);
            UK.set(r.tile, 'ADBE Tile-0006', 1);
        }
        r.tf = UK.addFx(adj, 'ADBE Geometry2', 'Transform');
        UK.set(r.tf, 'ADBE Geometry2-0010', 0);
        UK.set(r.tf, 'ADBE Geometry2-0011', 360);
        UK.motionBlur(adj, c.comp);
        return r;
    }
    function uniScale(tf) { UK.set(tf, 'ADBE Geometry2-0003', 1); return UK.p(tf, 'ADBE Geometry2-0004'); }
    function radialZoom(c, adj, peak) {
        var rb = UK.addFx(adj, 'CC Radial Fast Blur', 'Radial Blur');
        UK.set(rb, 'CC Radial Fast Blur-0001', center(c));
        UK.set(rb, 'CC Radial Fast Blur-0003', 2);
        sym(c, UK.p(rb, 'CC Radial Fast Blur-0002'), 0, UK.clamp(peak, 0, 95), 'Radial Blur', 'smooth');
        return rb;
    }
    function dirBlur(c, adj, peak, dirDeg) {
        var mb = UK.addFx(adj, 'ADBE Motion Blur', 'Directional Blur');
        UK.set(mb, 'ADBE Motion Blur-0001', dirDeg == null ? (horiz(c) ? 90 : 0) : dirDeg);
        sym(c, UK.p(mb, 'ADBE Motion Blur-0002'), 0, peak, 'Blur', 'smooth');
        return mb;
    }
    /** пара wipe-эффектов: B 100→0, A 0→100 */
    function wipePair(c, match, nick, compProp, setup) {
        need(c);
        var s, fx, p;
        if (c.B) {
            fx = UK.addFx(c.B, match, nick);
            if (setup) setup(fx, c.B, false);
            p = UK.p(fx, compProp); s = tB(c);
            UK.key2(p, s[0], 100, s[1], 0, c.ease);
        }
        if (c.A) {
            fx = UK.addFx(c.A, match, nick);
            if (setup) setup(fx, c.A, true);
            p = UK.p(fx, compProp); s = tA(c);
            UK.key2(p, s[0], 0, s[1], 100, c.ease, true);
        }
    }
    function fadeOutA(c, from) {
        if (!c.A) return;
        var s = tA(c), op = c.A.transform.opacity;
        UK.key2(op, from == null ? s[0] : from, op.valueAtTime(s[0], false), s[1], 0, 'expoIn');
    }
    function fadeInB(c, to) {
        if (!c.B) return;
        var s = tB(c), op = c.B.transform.opacity;
        UK.key2(op, s[0], 0, to == null ? s[1] : to, op.valueAtTime(s[1], false), 'expoOut');
    }
    function dipSolid(c, color, name, peakOp, ease) {
        var sol = UK.solid(c.comp, color, name, c.t0, c.t1);
        sym(c, sol.transform.opacity, 0, UK.clamp(peakOp, 0, 100), 'Opacity', ease || 'expoInOut');
        return sol;
    }
    /** Скрытый солид с Fractal Noise (карта для displacement/gradient wipe) */
    function noiseSolid(c, name, scale, contrast) {
        var sol = UK.solid(c.comp, [0.5, 0.5, 0.5], name, c.t0, c.t1);
        var fn = UK.addFx(sol, 'ADBE Fractal Noise', 'Noise');
        UK.set(fn, ['ADBE Fractal Noise-0004', 'Contrast'], contrast || 120);
        UK.set(fn, ['ADBE Fractal Noise-0009', 'Uniform Scaling'], 1);
        UK.set(fn, ['ADBE Fractal Noise-0010', 'Scale'], scale || 250);
        UK.set(fn, ['ADBE Fractal Noise-0015', 'Complexity'], 3);
        UK.expr(fn, ['ADBE Fractal Noise-0022', 'Evolution'], 'time * 120');
        sol.enabled = false;
        return sol;
    }
    /** Маска-полоса в координатах композиции на слое */
    function stripMask(L, c, i, n, horizStrips, name) {
        var W = c.comp.width, H = c.comp.height, pad = 2, sh;
        if (horizStrips) sh = A.rectShape(-pad, H * i / n - pad, W + pad, H * (i + 1) / n + pad);
        else sh = A.rectShape(W * i / n - pad, -pad, W * (i + 1) / n + pad, H + pad);
        var m = A.addMask(L, name || ('Strip ' + (i + 1)));
        m.property('ADBE Mask Shape').setValue(sh);
        return m;
    }
    function T(d) { d.cat = 'trans'; d.needs = 'trans'; d.desc = d.desc + ' [PRO]'; d.tags = d.tags + ' pro premium переход'; UK.add(d); }

    // ============================================================ переходы

    T({
        id: 'trans.proSlice', name: 'Slice Transition · Полосы-слайсы', preview: 'push',
        desc: '5 корректирующих полос над склейкой: каждая полоса сдвигает изображение по направлению с каскадной задержкой и направленным размытием (Motion Tile закрывает края).',
        tags: 'slice strips полосы слайс',
        apply: function (c) {
            var n = 5, i, W = c.comp.width, H = c.comp.height;
            var dist = (horiz(c) ? W : H) * UK.clamp(c.strength, 0.3, 1.5);
            for (i = 0; i < n; i++) {
                var delay = (i / n) * c.dur * 0.35;
                var adj = UK.adjLayer(c.comp, c.t0 + delay * 0.5, c.t1, 'Slice ' + (i + 1));
                stripMask(adj, c, i, n, horiz(c));
                var r = adjTT(c, null, true, adj);
                var pos = UK.p(r.tf, 'ADBE Geometry2-0002'), base = pos.valueAtTime(c.cut, false);
                var cc = { comp: c.comp, fd: c.fd, cut: c.cut + delay * 0.5, t0: c.t0 + delay * 0.5, t1: c.t1 - (c.dur * 0.35 - delay) * 0.5, opts: c.opts, layer: adj };
                jump(cc, pos, base, UK.vecMul(c.dirV, -dist), UK.vecMul(c.dirV, dist), 'Slice Shift');
                var mb = UK.addFx(adj, 'ADBE Motion Blur', 'Slice Blur');
                UK.set(mb, 'ADBE Motion Blur-0001', horiz(c) ? 90 : 0);
                sym(cc, UK.p(mb, 'ADBE Motion Blur-0002'), 0, 120 * c.strength, 'Slice Blur', 'smooth');
            }
            c.layer = c.B || c.A;
        }
    });

    T({
        id: 'trans.proSplitSlide', name: 'Split Slide · Разъезд половин', preview: 'push',
        desc: 'Исходящий кадр делится на две половины (дубль + маски), половины разъезжаются в стороны, открывая входящий. Без A — половины входящего съезжаются.',
        tags: 'split halves slide половины разъезд',
        apply: function (c) {
            need(c);
            var L = c.A || c.B, isA = !!c.A, s = isA ? tA(c) : tB(c), i;
            var r = lrect(L, c), pad = 6;
            var d = L.duplicate(); d.name = UK.PREFIX + L.name + ' half';
            var halves = [L, d];
            for (i = 0; i < 2; i++) {
                var m = A.addMask(halves[i], 'Half ' + (i + 1)), sh;
                if (horiz(c)) sh = A.rectShape(r.l - pad, r.t + r.h * i / 2 - (i === 0 ? pad : 0), r.l + r.w + pad, r.t + r.h * (i + 1) / 2 + (i === 1 ? pad : 0));
                else sh = A.rectShape(r.l + r.w * i / 2 - (i === 0 ? pad : 0), r.t - pad, r.l + r.w * (i + 1) / 2 + (i === 1 ? pad : 0), r.t + r.h + pad);
                m.property('ADBE Mask Shape').setValue(sh);
                var pos = halves[i].transform.position, base = pos.valueAtTime(c.cut, false);
                var dv = UK.vecMul(c.dirV, i === 0 ? 1 : -1);
                var far = UK.vecAdd(base, UK.vecMul(dv, UK.exitDistance(halves[i], c.comp, dv, c.cut) * UK.clamp(c.strength, 0.5, 1.5)));
                if (isA) UK.key2(pos, s[0], base, s[1], far, c.ease, true);
                else { UK.key2(pos, s[0], far, s[1], base, c.ease); UK.applyEaseExpr(pos, c.ease, sub(c, halves[i])); }
                UK.motionBlur(halves[i], c.comp);
            }
            if (isA && c.B) fadeInB(c, c.cut + c.fd * 2);
        }
    });

    T({
        id: 'trans.proInk', name: 'Ink Transition · Чернильный переход', preview: 'wipe',
        desc: 'Входящий кадр проявляется Linear Wipe с рваным краем (Roughen Edges) и турбулентностью; исходящий — зеркально.',
        tags: 'ink brush paint roughen чернила кисть',
        apply: function (c) {
            wipePair(c, 'ADBE Linear Wipe', 'Ink Wipe', 'ADBE Linear Wipe-0001', function (fx, L, isA) {
                UK.set(fx, 'ADBE Linear Wipe-0002', A.wipeAngle(c) + (isA ? 180 : 0));
                UK.set(fx, 'ADBE Linear Wipe-0003', 30);
                var re = UK.addFx(L, 'ADBE Roughen Edges', 'Ink Edges');
                UK.set(re, 'ADBE Roughen Edges-0001', 1);
                UK.set(re, 'ADBE Roughen Edges-0003', 90 * c.strength);
                UK.set(re, 'ADBE Roughen Edges-0004', 0.4);
                UK.set(re, 'ADBE Roughen Edges-0006', 200);
                UK.set(re, 'ADBE Roughen Edges-0009', 4);
                UK.expr(re, ['ADBE Roughen Edges-0010', 'Evolution'], 'time * 70');
                var s = isA ? tA(c) : tB(c);
                var b = UK.p(re, 'ADBE Roughen Edges-0003');
                if (isA) UK.key2(b, s[0], 0, s[0] + c.fd * 3, 90 * c.strength, 'linear');
                else UK.key2(b, s[1] - c.fd * 3, 90 * c.strength, s[1], 0, 'linear');
            });
        }
    });

    T({
        id: 'trans.proLiquid', name: 'Liquid Transition · Жидкий переход', preview: 'liquid',
        desc: 'Wipe-шторка с мягким краем + Wave Warp + Turbulent Displace на входящем (и исходящем) кадре — край «течёт».',
        tags: 'liquid wave fluid жидкость',
        apply: function (c) {
            wipePair(c, 'ADBE Linear Wipe', 'Liquid Wipe', 'ADBE Linear Wipe-0001', function (fx, L, isA) {
                UK.set(fx, 'ADBE Linear Wipe-0002', A.wipeAngle(c) + (isA ? 180 : 0));
                UK.set(fx, 'ADBE Linear Wipe-0003', 70);
                var s = isA ? tA(c) : tB(c);
                var ww = UK.addFx(L, 'ADBE Wave Warp', 'Liquid Wave');
                UK.set(ww, 'ADBE Wave Warp-0003', 180);
                UK.set(ww, 'ADBE Wave Warp-0004', horiz(c) ? 90 : 0);
                UK.set(ww, 'ADBE Wave Warp-0005', 1.3);
                UK.set(ww, 'ADBE Wave Warp-0006', 1);
                var h = UK.p(ww, 'ADBE Wave Warp-0002');
                if (isA) UK.key2(h, s[0], 0, s[1], 45 * c.strength, 'expoIn'); else UK.key2(h, s[0], 45 * c.strength, s[1], 0, 'expoOut');
                var td = UK.addFx(L, 'ADBE Turbulent Displace', 'Liquid Turb');
                UK.set(td, 'ADBE Turbulent Displace-0003', 100);
                UK.expr(td, ['ADBE Turbulent Displace-0006', 'Evolution'], 'time * 100');
                var a = UK.p(td, 'ADBE Turbulent Displace-0002');
                if (isA) UK.key2(a, s[0], 0, s[1], 60 * c.strength, 'expoIn'); else UK.key2(a, s[0], 60 * c.strength, s[1], 0, 'expoOut');
            });
        }
    });

    T({
        id: 'trans.proLightFlash', name: 'Light Flash Zoom · Световой зум', preview: 'flash',
        desc: 'Корр. слой: зум + пик экспозиции и свечения на склейке — кадр «выгорает» в свет и возвращается.',
        tags: 'light flash exposure glow zoom свет вспышка',
        apply: function (c) {
            var r = adjTT(c, 'Light Flash', true), sc = uniScale(r.tf);
            sym(c, sc, 100, 25 * c.strength, 'Zoom');
            var ex = UK.addFx(r.adj, 'ADBE Exposure2', 'Exposure');
            sym(c, UK.p(ex, ['ADBE Exposure2-0003', 'Exposure']), 0, 3.5 * c.strength, 'Exposure', 'expoInOut');
            var g = UK.addFx(r.adj, 'ADBE Glo2', 'Glow');
            UK.set(g, 'ADBE Glo2-0002', 40); UK.set(g, 'ADBE Glo2-0003', 150);
            sym(c, UK.p(g, 'ADBE Glo2-0004'), 0, 2.5 * c.strength, 'Glow', 'expoInOut');
            radialZoom(c, r.adj, 30 * c.strength);
        }
    });

    T({
        id: 'trans.proFlare', name: 'Lens Flare Pass · Пролёт блика', preview: 'sweep',
        desc: 'Корр. слой: Lens Flare пролетает через кадр по направлению, яркость пикует на склейке; лёгкий зум и пересвет.',
        tags: 'lens flare light pass блик пролёт',
        apply: function (c) {
            var r = adjTT(c, 'Flare', true), sc = uniScale(r.tf);
            sym(c, sc, 100, 10 * c.strength, 'Zoom');
            var lf = UK.addFx(r.adj, 'ADBE Lens Flare', 'Flare');
            UK.set(lf, 'ADBE Lens Flare-0003', 1);
            var W = c.comp.width, H = c.comp.height, cen = center(c);
            var from = horiz(c) ? [c.dirV[0] < 0 ? W * 1.2 : -W * 0.2, H * 0.4] : [W * 0.6, c.dirV[1] < 0 ? H * 1.2 : -H * 0.2];
            var to = horiz(c) ? [c.dirV[0] < 0 ? -W * 0.2 : W * 1.2, H * 0.6] : [W * 0.4, c.dirV[1] < 0 ? -H * 0.2 : H * 1.2];
            UK.key2(UK.p(lf, 'ADBE Lens Flare-0001'), c.t0, from, c.t1, to, 'smooth');
            sym(c, UK.p(lf, 'ADBE Lens Flare-0002'), 0, 160 * UK.clamp(c.strength, 0.2, 1.5), 'Flare Brightness', 'smooth');
            var ex = UK.addFx(r.adj, 'ADBE Exposure2', 'Exposure');
            sym(c, UK.p(ex, ['ADBE Exposure2-0003', 'Exposure']), 0, 1.2 * c.strength, 'Exposure', 'smooth');
        }
    });

    T({
        id: 'trans.proGlass', name: 'Glass Refraction · Преломление', preview: 'liquid',
        desc: 'Скрытый солид с Fractal Noise служит картой Displacement Map на корр. слое: кадр «преломляется» через стекло на склейке.',
        tags: 'glass refraction displacement стекло преломление',
        apply: function (c) {
            var adj = c.adj('Glass');
            var map = noiseSolid(c, 'Glass Map', 300, 150);
            var dm = UK.addFx(adj, 'ADBE Displacement Map', 'Refract');
            UK.set(dm, 'ADBE Displacement Map-0001', map.index);
            UK.set(dm, 'ADBE Displacement Map-0002', 1); UK.set(dm, 'ADBE Displacement Map-0004', 2);
            UK.set(dm, 'ADBE Displacement Map-0007', 2);
            sym(c, UK.p(dm, 'ADBE Displacement Map-0003'), 0, 150 * c.strength, 'Refraction', 'expoInOut');
            sym(c, UK.p(dm, 'ADBE Displacement Map-0005'), 0, 150 * c.strength, 'Refraction Y', 'expoInOut');
            var b = UK.addFx(adj, 'ADBE Gaussian Blur 2', 'Glass Blur');
            UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
            sym(c, UK.p(b, 'ADBE Gaussian Blur 2-0001'), 0, 12 * c.strength, 'Glass Blur', 'smooth');
            c.layer = adj;
        }
    });

    T({
        id: 'trans.proSmear', name: 'Smear Stretch · Смаз-растяжение', preview: 'stretch',
        desc: 'Корр. слой: масштаб по оси направления 100 → 400 → 100 % с Motion Tile и направленным размытием — кадр «размазывается» через склейку.',
        tags: 'smear stretch scale смаз растяжение',
        apply: function (c) {
            var r = adjTT(c, 'Smear', true);
            UK.set(r.tf, 'ADBE Geometry2-0003', 0);
            var p = UK.p(r.tf, horiz(c) ? 'ADBE Geometry2-0005' : 'ADBE Geometry2-0004');
            sym(c, p, 100, 300 * UK.clamp(c.strength, 0.3, 1.5), 'Stretch');
            dirBlur(c, r.adj, 200 * c.strength);
        }
    });

    T({
        id: 'trans.proSpinBlur', name: 'Spin Blur 3D · Вращение с размытием', preview: 'spin',
        desc: 'Корр. слой: поворот ±90° прыжком на склейке + Radial Blur (spin) + зум — вращательный переход.',
        tags: 'spin rotate radial blur вращение',
        apply: function (c) {
            var r = adjTT(c, 'Spin Blur', true), sg = sgn(c);
            jump(c, UK.p(r.tf, 'ADBE Geometry2-0008'), 0, -90 * sg * UK.clamp(c.strength, 0.3, 2), 90 * sg * UK.clamp(c.strength, 0.3, 2), 'Spin');
            sym(c, uniScale(r.tf), 100, 40 * c.strength, 'Zoom');
            var rb = UK.addFx(r.adj, 'ADBE Radial Blur', 'Spin Radial');
            UK.set(rb, 'ADBE Radial Blur-0003', 1);
            UK.set(rb, 'ADBE Radial Blur-0002', center(c));
            sym(c, UK.p(rb, 'ADBE Radial Blur-0001'), 0, 60 * c.strength, 'Spin Blur', 'smooth');
        }
    });

    T({
        id: 'trans.proCube', name: 'Cube Rotate · Куб', preview: 'orbit',
        desc: 'Кадры — грани куба (3D): исходящий поворачивается на 90° и уезжает, входящий приезжает с противоположной грани.',
        tags: 'cube 3d rotate куб',
        apply: function (c) {
            need(c);
            var sg = sgn(c), s, rp, pos, base, W = c.comp.width, H = c.comp.height;
            var shift = horiz(c) ? [W * 0.5 * c.dirV[0], 0] : [0, H * 0.5 * c.dirV[1]];
            if (c.A) {
                UK.to3D(c.A); s = tA(c);
                rp = horiz(c) ? c.A.transform.yRotation : c.A.transform.xRotation;
                var rv = rp.valueAtTime(s[0], false);
                UK.key2(rp, s[0], rv, s[1], rv + 90 * sg * (horiz(c) ? -1 : 1), c.ease, true);
                pos = c.A.transform.position; base = pos.valueAtTime(s[0], false);
                UK.key2(pos, s[0], base, s[1], UK.vecAdd(base, shift), c.ease, true);
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                UK.to3D(c.B); s = tB(c);
                rp = horiz(c) ? c.B.transform.yRotation : c.B.transform.xRotation;
                var ev = rp.valueAtTime(s[1], false);
                UK.key2(rp, s[0], ev - 90 * sg * (horiz(c) ? -1 : 1), s[1], ev, c.ease);
                pos = c.B.transform.position; base = pos.valueAtTime(s[1], false);
                UK.key2(pos, s[0], UK.vecAdd(base, UK.vecMul(shift, -1)), s[1], base, c.ease);
                UK.applyEaseExpr(pos, c.ease, sub(c, c.B));
                UK.motionBlur(c.B, c.comp);
            }
        }
    });

    T({
        id: 'trans.proPageTurn', name: 'Page Turn · Перелистывание', preview: 'flip',
        desc: 'CC Page Turn на исходящем кадре: страница заворачивается по направлению, открывая входящий. Без A — входящий «разворачивается».',
        tags: 'page turn paper перелистывание страница',
        apply: function (c) {
            need(c);
            var L = c.A || c.B, isA = !!c.A, s = isA ? tA(c) : tB(c);
            var pt = UK.addFx(L, 'CC Page Turn', 'Page Turn');
            var W = L.width || c.comp.width, H = L.height || c.comp.height;
            var start = horiz(c) ? [c.dirV[0] < 0 ? W * 1.1 : -W * 0.1, H / 2] : [W / 2, c.dirV[1] < 0 ? H * 1.1 : -H * 0.1];
            var end = horiz(c) ? [c.dirV[0] < 0 ? -W * 0.6 : W * 1.6, H / 2] : [W / 2, c.dirV[1] < 0 ? -H * 0.6 : H * 1.6];
            var fp = UK.p(pt, ['Fold Position', 'CC Page Turn-0001']);
            if (isA) UK.key2(fp, s[0], start, s[1], end, c.ease); else UK.key2(fp, s[0], end, s[1], start, c.ease);
            UK.set(pt, ['Fold Direction', 'CC Page Turn-0002'], horiz(c) ? (c.dirV[0] < 0 ? 0 : 180) : (c.dirV[1] < 0 ? 90 : 270));
            UK.set(pt, ['Fold Radius', 'CC Page Turn-0003'], 120 * UK.clamp(c.strength, 0.3, 2));
            UK.set(pt, ['Back Opacity', 'CC Page Turn-0007'], 80);
            if (isA && c.B) fadeInB(c, c.cut + c.fd);
        }
    });

    T({
        id: 'trans.proPixelBlock', name: 'Pixel Block · Пиксельный распад', preview: 'pixel',
        desc: 'Корр. слой: Mosaic прыжком (мелко → крупно → мелко) + Posterize Time 8 fps — цифровой «распад» кадра на склейке.',
        tags: 'pixel mosaic block posterize пиксели',
        apply: function (c) {
            var adj = c.adj('Pixel Block');
            var mos = UK.addFx(adj, 'ADBE Mosaic', 'Blocks');
            UK.set(mos, 'ADBE Mosaic-0003', 1);
            var maxB = Math.round(c.comp.width / 2), minB = Math.max(4, Math.round(12 / UK.clamp(c.strength, 0.2, 3)));
            var hb = UK.p(mos, 'ADBE Mosaic-0001'), vb = UK.p(mos, 'ADBE Mosaic-0002');
            var ratio = c.comp.height / c.comp.width;
            UK.keys(hb, [[c.t0, maxB], [c.cut, minB], [c.t1, maxB]], 'expoInOut');
            UK.keys(vb, [[c.t0, Math.round(maxB * ratio)], [c.cut, Math.max(2, Math.round(minB * ratio))], [c.t1, Math.round(maxB * ratio)]], 'expoInOut');
            var pt = UK.addFx(adj, 'ADBE Posterize Time', 'Stutter');
            UK.set(pt, 'ADBE Posterize Time-0001', 8);
            c.layer = adj;
        }
    });

    T({
        id: 'trans.proFreezeHit', name: 'Freeze Hit · Стоп-кадр с ударом', preview: 'shake',
        desc: 'Корр. слой: Posterize Time 4 fps (рваное движение) + удар масштаба + белая вспышка + дрожание камеры с огибающей.',
        tags: 'freeze hit punch flash shake стоп-кадр удар',
        apply: function (c) {
            var r = adjTT(c, 'Freeze Hit', true), sc = uniScale(r.tf);
            sym(c, sc, 100, 18 * c.strength, 'Punch', 'expoInOut');
            var pt = UK.addFx(r.adj, 'ADBE Posterize Time', 'Stutter');
            UK.set(pt, 'ADBE Posterize Time-0001', 4);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002'), base = pos.valueAtTime(c.cut, false);
            var amp = UK.cv(c, 'Shake', 40 * c.strength);
            pos.expression =
                'var e = (time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', 0, 1) : ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', 1, 0);\n' +
                V(base) + ' + wiggle(14, ' + amp + ') * e - value * e';
            dipSolid(c, [1, 1, 1], 'Flash', 90 * UK.clamp(c.strength, 0, 1.1), 'expoInOut');
            c.layer = r.adj;
        }
    });

    T({
        id: 'trans.proSlideStack', name: 'Slide Stack · Наезд с тенью', preview: 'push',
        desc: 'Входящий кадр въезжает поверх с перелётом и падающей тенью (Drop Shadow); исходящий медленно уезжает и затемняется.',
        tags: 'slide stack shadow overlap наезд тень',
        apply: function (c) {
            need(c);
            var s, pos, base;
            if (c.A) {
                s = tA(c); pos = c.A.transform.position; base = pos.valueAtTime(s[0], false);
                UK.key2(pos, s[0], base, s[1], UK.vecAdd(base, UK.vecMul(c.dirV, UK.exitDistance(c.A, c.comp, c.dirV, c.cut) * 0.3)), 'smooth');
                var bc = UK.addFx(c.A, 'ADBE Brightness & Contrast 2', 'Darken');
                UK.key2(UK.p(bc, 'ADBE Brightness & Contrast 2-0001'), s[0], 0, s[1], -50 * c.strength, 'smooth');
            }
            if (c.B) {
                s = tB(c); pos = c.B.transform.position; base = pos.valueAtTime(s[1], false);
                var back = UK.vecMul(c.dirV, -1);
                UK.key2(pos, s[0], UK.vecAdd(base, UK.vecMul(back, UK.exitDistance(c.B, c.comp, back, c.cut))), s[1], base, 'expoOut');
                UK.applyEaseExpr(pos, UK.easeById('back'), sub(c, c.B));
                var ds = UK.addFx(c.B, 'ADBE Drop Shadow', 'Stack Shadow');
                UK.set(ds, 'ADBE Drop Shadow-0001', [0, 0, 0, 1]);
                UK.set(ds, 'ADBE Drop Shadow-0002', 180);
                UK.set(ds, 'ADBE Drop Shadow-0003', horiz(c) ? (c.dirV[0] < 0 ? 90 : 270) : (c.dirV[1] < 0 ? 180 : 0));
                UK.set(ds, 'ADBE Drop Shadow-0004', 30 * c.strength);
                UK.set(ds, 'ADBE Drop Shadow-0005', 80);
                UK.motionBlur(c.B, c.comp);
            }
        }
    });

    T({
        id: 'trans.proParallaxPush', name: 'Parallax Push · Параллакс-сдвиг', preview: 'push',
        desc: 'Исходящий уезжает на 40 % расстояния с затуханием, входящий проходит полный путь поверх — ощущение глубины.',
        tags: 'parallax push depth параллакс',
        apply: function (c) {
            need(c);
            var s, pos, base;
            if (c.A) {
                s = tA(c); pos = c.A.transform.position; base = pos.valueAtTime(s[0], false);
                UK.key2(pos, s[0], base, s[1], UK.vecAdd(base, UK.vecMul(c.dirV, UK.exitDistance(c.A, c.comp, c.dirV, c.cut) * 0.4 * c.strength)), c.ease, true);
                fadeOutA(c, s[0] + (s[1] - s[0]) * 0.4);
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                s = tB(c); pos = c.B.transform.position; base = pos.valueAtTime(s[1], false);
                var back = UK.vecMul(c.dirV, -1);
                UK.key2(pos, s[0], UK.vecAdd(base, UK.vecMul(back, UK.exitDistance(c.B, c.comp, back, c.cut))), s[1], base, c.ease);
                UK.applyEaseExpr(pos, c.ease, sub(c, c.B));
                UK.motionBlur(c.B, c.comp);
            }
        }
    });

    T({
        id: 'trans.proLuma', name: 'Luma Dissolve · Градиентный диссолв', preview: 'dissolve',
        desc: 'Скрытый солид с Gradient Ramp (по направлению) служит картой для Gradient Wipe: кадры сменяются мягкой световой волной.',
        tags: 'luma gradient wipe dissolve диссолв градиент',
        apply: function (c) {
            need(c);
            var sol = UK.solid(c.comp, [0.5, 0.5, 0.5], 'Luma Map', c.t0, c.t1);
            var ramp = UK.addFx(sol, 'ADBE Ramp', 'Ramp');
            var W = c.comp.width, H = c.comp.height;
            var st = horiz(c) ? [c.dirV[0] < 0 ? W : 0, H / 2] : [W / 2, c.dirV[1] < 0 ? H : 0];
            var en = horiz(c) ? [c.dirV[0] < 0 ? 0 : W, H / 2] : [W / 2, c.dirV[1] < 0 ? 0 : H];
            UK.set(ramp, 'ADBE Ramp-0001', st); UK.set(ramp, 'ADBE Ramp-0003', en);
            UK.set(ramp, 'ADBE Ramp-0002', [0, 0, 0, 1]); UK.set(ramp, 'ADBE Ramp-0004', [1, 1, 1, 1]);
            sol.enabled = false;
            var soft = 40 * UK.clamp(c.strength, 0.2, 2.4);
            wipePair(c, 'ADBE Gradient Wipe', 'Luma Wipe', 'ADBE Gradient Wipe-0001', function (fx, L, isA) {
                UK.set(fx, 'ADBE Gradient Wipe-0002', soft);
                UK.set(fx, 'ADBE Gradient Wipe-0003', sol.index);
                UK.set(fx, 'ADBE Gradient Wipe-0004', 2);
                UK.set(fx, 'ADBE Gradient Wipe-0005', isA ? 1 : 0);
            });
        }
    });

    T({
        id: 'trans.proMorphBlur', name: 'Morph Blur · Морф-размытие', preview: 'bulge',
        desc: 'Корр. слой: Gaussian Blur + CC Lens (сходимость) пикуют на склейке — кадр «сплющивается» в линзу и выходит из неё.',
        tags: 'morph lens blur морф линза',
        apply: function (c) {
            var adj = c.adj('Morph');
            var b = UK.addFx(adj, 'ADBE Gaussian Blur 2', 'Blur');
            UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
            sym(c, UK.p(b, 'ADBE Gaussian Blur 2-0001'), 0, 60 * c.strength, 'Blur', 'smooth');
            var ln = UK.addFx(adj, 'CC Lens', 'Lens');
            UK.set(ln, 'CC Lens-0001', center(c));
            UK.set(ln, 'CC Lens-0002', 500);
            sym(c, UK.p(ln, 'CC Lens-0003'), 0, 60 * UK.clamp(c.strength, 0.2, 1.6), 'Convergence', 'expoInOut');
            c.layer = adj;
        }
    });

    T({
        id: 'trans.proVortex', name: 'Twirl Vortex · Воронка', preview: 'twist',
        desc: 'Корр. слой: Twirl 0 → ±360° прыжком через склейку + зум с радиальным размытием — кадр закручивается в воронку.',
        tags: 'twirl vortex spin воронка закручивание',
        apply: function (c) {
            var r = adjTT(c, 'Vortex', true), sg = sgn(c);
            var tw = UK.addFx(r.adj, 'ADBE Twirl', 'Twirl');
            UK.set(tw, 'ADBE Twirl-0002', 70);
            UK.set(tw, 'ADBE Twirl-0003', center(c));
            jump(c, UK.p(tw, 'ADBE Twirl-0001'), 0, -360 * sg * UK.clamp(c.strength, 0.25, 2), 360 * sg * UK.clamp(c.strength, 0.25, 2), 'Twirl');
            sym(c, uniScale(r.tf), 100, 30 * c.strength, 'Zoom');
            radialZoom(c, r.adj, 25 * c.strength);
        }
    });

    T({
        id: 'trans.proKaleido', name: 'Kaleido Spin · Калейдоскоп', preview: 'kaleido',
        desc: 'Корр. слой с CC Kaleida проявляется к склейке и гаснет после, сегменты вращаются; плюс лёгкий зум.',
        tags: 'kaleidoscope mirror spin калейдоскоп',
        apply: function (c) {
            var r = adjTT(c, 'Kaleido', false);
            var k = UK.addFx(r.adj, 'CC Kaleida', 'Kaleida');
            UK.set(k, 'CC Kaleida-0001', center(c));
            UK.set(k, 'CC Kaleida-0002', 160);
            UK.set(k, 'CC Kaleida-0003', 7);
            UK.expr(k, 'CC Kaleida-0004', 'time * ' + F(90 * c.strength));
            sym(c, r.adj.transform.opacity, 0, 100, 'Kaleido Opacity', 'expoInOut');
            sym(c, uniScale(r.tf), 100, 15 * c.strength, 'Zoom');
        }
    });

    T({
        id: 'trans.proChromaWhip', name: 'Chromatic Whip · Хроматический вип', preview: 'rgb',
        desc: 'Корр. слой: whip-сдвиг по направлению (Motion Tile) + направленное размытие + Channel Blur красного и синего каналов — RGB-расслоение на пике.',
        tags: 'whip chromatic rgb pan вип хроматика',
        apply: function (c) {
            var r = adjTT(c, 'Chroma Whip', true);
            var dist = (horiz(c) ? c.comp.width : c.comp.height) * UK.clamp(c.strength, 0.3, 1.5);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002'), base = pos.valueAtTime(c.cut, false);
            jump(c, pos, base, UK.vecMul(c.dirV, -dist), UK.vecMul(c.dirV, dist), 'Whip');
            dirBlur(c, r.adj, 180 * c.strength);
            var cb = UK.addFx(r.adj, 'ADBE Channel Blur', 'Chroma');
            UK.set(cb, 'ADBE Channel Blur-0005', 1);
            UK.set(cb, 'ADBE Channel Blur-0006', horiz(c) ? 2 : 3);
            sym(c, UK.p(cb, 'ADBE Channel Blur-0001'), 0, 120 * c.strength, 'Chroma Red', 'smooth');
            sym(c, UK.p(cb, 'ADBE Channel Blur-0003'), 0, 70 * c.strength, 'Chroma Blue', 'smooth');
        }
    });

    T({
        id: 'trans.proBlinds3D', name: 'Shutter Blinds 3D · 3D-жалюзи', preview: 'blinds',
        desc: 'Venetian Blinds на входящем/исходящем кадре с наклоном (skew) через Transform — жалюзи «поворачиваются» при открытии.',
        tags: 'blinds shutter skew 3d жалюзи',
        apply: function (c) {
            wipePair(c, 'ADBE Venetian Blinds', 'Blinds', 'ADBE Venetian Blinds-0001', function (fx, L, isA) {
                UK.set(fx, 'ADBE Venetian Blinds-0002', horiz(c) ? 90 : 0);
                UK.set(fx, 'ADBE Venetian Blinds-0003', Math.round(60 + 60 * c.strength));
                UK.set(fx, 'ADBE Venetian Blinds-0004', 8);
                var tf = UK.addFx(L, 'ADBE Geometry2', 'Blinds Skew');
                UK.set(tf, 'ADBE Geometry2-0007', horiz(c) ? 0 : 90);
                UK.set(tf, 'ADBE Geometry2-0010', 0); UK.set(tf, 'ADBE Geometry2-0011', 360);
                var s = isA ? tA(c) : tB(c), sk = UK.p(tf, 'ADBE Geometry2-0006'), v = 20 * sgn(c) * c.strength;
                if (isA) UK.key2(sk, s[0], 0, s[1], v, 'expoIn'); else UK.key2(sk, s[0], -v, s[1], 0, 'expoOut');
                UK.motionBlur(L, c.comp);
            });
        }
    });

    T({
        id: 'trans.proStrobe', name: 'Strobe Cut · Строб-склейка', preview: 'strobe',
        desc: 'Белый солид с тремя hold-вспышками вокруг склейки + зум корр. слоя — клубный строб-переход.',
        tags: 'strobe flash club строб вспышка',
        apply: function (c) {
            var r = adjTT(c, 'Strobe Zoom', true);
            sym(c, uniScale(r.tf), 100, 20 * c.strength, 'Zoom');
            var sol = UK.solid(c.comp, [1, 1, 1], 'Strobe', c.t0, c.t1);
            var op = sol.transform.opacity, n = 3, i, peak = 100 * UK.clamp(c.strength, 0.3, 1);
            var gap = Math.max(c.fd * 2, c.half / (n + 1));
            UK.setHold(op, UK.key(op, c.t0, 0));
            for (i = 0; i < n; i++) {
                var t = c.cut - gap * (n - 1) / 2 + i * gap;
                UK.setHold(op, UK.key(op, t, peak));
                UK.setHold(op, UK.key(op, t + c.fd * (i === n - 1 ? 2 : 1), 0));
            }
            c.layer = r.adj;
        }
    });

    T({
        id: 'trans.proDipColor', name: 'Dip to Color Blur · Затемнение цветом', preview: 'dissolve',
        desc: 'Солид выбранного цвета (контрол UK: Dip Color) проявляется к склейке; корр. слой размывает кадр на пике.',
        tags: 'dip color fade blur затемнение цвет',
        apply: function (c) {
            var adj = c.adj('Dip Blur');
            var b = UK.addFx(adj, 'ADBE Gaussian Blur 2', 'Blur');
            UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
            sym(c, UK.p(b, 'ADBE Gaussian Blur 2-0001'), 0, 40 * c.strength, 'Blur', 'smooth');
            var sol = UK.solid(c.comp, [0.05, 0.05, 0.08], 'Dip', c.t0, c.t1);
            if (c.opts.controls) {
                var ref = UK.cv({ opts: c.opts, layer: sol }, 'Dip Color', [0.05, 0.05, 0.08, 1], 'color');
                var fill = UK.addFx(sol, 'ADBE Fill', 'Dip Fill');
                UK.expr(fill, 'ADBE Fill-0003', ref);
            }
            var cc = { comp: c.comp, fd: c.fd, cut: c.cut, t0: c.t0, t1: c.t1, opts: c.opts, layer: sol };
            sym(cc, sol.transform.opacity, 0, 100, 'Dip Opacity', 'expoInOut');
            c.layer = adj;
        }
    });

    T({
        id: 'trans.proFilmRoll', name: 'Film Roll · Прокрутка плёнки', preview: 'roll',
        desc: 'Корр. слой: Motion Tile (повтор кадров) + сдвиг на высоту кадра прыжком + вертикальный смаз — плёнка «проскакивает» в проекторе.',
        tags: 'film roll projector frame плёнка прокрутка',
        apply: function (c) {
            var r = adjTT(c, 'Film Roll', true);
            UK.set(r.tile, 'ADBE Tile-0006', 0);
            var vertical = !horiz(c) || true; // плёнка всегда вертикальная, направление — знак
            var sg = c.dirV[1] !== 0 ? c.dirV[1] : (c.dirV[0] || 1);
            var H = c.comp.height * UK.clamp(c.strength, 0.5, 2);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002'), base = pos.valueAtTime(c.cut, false);
            jump(c, pos, base, [0, -H * sg], [0, H * sg], 'Roll');
            dirBlur(c, r.adj, 150 * c.strength, 0);
            var bc = UK.addFx(r.adj, 'ADBE Brightness & Contrast 2', 'Flicker');
            sym(c, UK.p(bc, 'ADBE Brightness & Contrast 2-0001'), 0, -30 * c.strength, 'Darken', 'smooth');
        }
    });

    T({
        id: 'trans.proPunch', name: 'Punch Through · Пробой из центра', preview: 'zoom',
        desc: 'Входящий кадр вырастает из центра поверх (0 → 100 % с перелётом); исходящий увеличивается до 130 % и размывается.',
        tags: 'punch zoom center scale пробой',
        apply: function (c) {
            need(c);
            var s, sc, sv;
            if (c.A) {
                s = tA(c); sc = c.A.transform.scale; sv = sc.valueAtTime(s[0], false);
                UK.key2(sc, s[0], sv, s[1], A.scaleXY(sv, 1.3, 1.3), 'expoIn');
                var b = UK.addFx(c.A, 'ADBE Gaussian Blur 2', 'Punch Blur');
                UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
                UK.key2(UK.p(b, 'ADBE Gaussian Blur 2-0001'), s[0], 0, s[1], 40 * c.strength, 'expoIn');
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                s = tB(c); sc = c.B.transform.scale; sv = sc.valueAtTime(s[1], false);
                UK.key2(sc, s[0], UK.vecMul(sv, 0), s[1], sv, 'expoOut');
                UK.applyEaseExpr(sc, UK.easeById('back'), sub(c, c.B));
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
})();
