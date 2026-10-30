// =============================================================================
//  Переходы (cat: 'trans', needs: 'trans')
//  Два типа: на корректирующем слое над склейкой (c.adj) и «честные» на слоях A/B.
// =============================================================================
(function () {

    // ------------------------------------------------------------ helpers
    function F(x) { return String(UK.fmt(x, 4)); }
    function isArr(v) { return v !== null && typeof v === 'object' && typeof v.length === 'number'; }
    function V(v) { return isArr(v) ? '[' + v.join(', ') + ']' : String(UK.fmt(v, 4)); }
    function add(a, b) { return isArr(a) ? UK.vecAdd(a, b) : a + b; }
    function horiz(c) { return c.dirV[0] !== 0; }
    function sgn(c) { return horiz(c) ? c.dirV[0] : c.dirV[1]; }
    function need(c) { if (!c.A && !c.B) throw new Error('Выделите слой(и) на склейке (2 соседних слоя или 1 слой + курсор).'); }
    function center(c) { return UK.center(c.comp); }
    /** размер слоя (ширина/высота источника) с фолбэком на композицию */
    function lsz(L, c) {
        var w = c.comp.width, h = c.comp.height;
        try { if (L.width > 0 && L.height > 0) { w = L.width; h = L.height; } } catch (e) {}
        return [w, h];
    }
    function lcenter(L, c) { var s = lsz(L, c); return [s[0] / 2, s[1] / 2]; }
    /** интервалы анимации для слоёв B (входящий) и A (исходящий) */
    function tB(c) { return (c.B && c.B.inPoint < c.cut - c.fd / 2) ? [c.t0, c.t1] : [c.cut, c.t1]; }
    function tA(c) { return (c.A && c.A.outPoint > c.cut + c.fd / 2) ? [c.t0, c.t1] : [c.t0, c.cut]; }

    /**
     * Симметричная огибающая вокруг склейки: base → base+delta (на cut) → base.
     * При контролах — слайдер «nick» (%) + выражение, иначе ключи.
     */
    function sym(c, prop, base, delta, nick, ease) {
        if (c.opts.controls) {
            var ref = UK.cv(c, nick, 100);
            prop.expression =
                'var amp = ' + ref + ' / 100;\n' +
                'var e = (time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', 0, 1) : ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', 1, 0);\n' +
                V(base) + ' + ' + V(delta) + ' * amp * e';
        } else {
            UK.keys(prop, [[c.t0, base], [c.cut, add(base, delta)], [c.t1, base]], ease || 'expoInOut');
        }
    }
    /**
     * «Прыжок» на склейке: base → base+dA (ускоряясь к cut), затем base+dB → base (замедляясь).
     */
    function jump(c, prop, base, dA, dB, nick) {
        if (c.opts.controls) {
            var ref = UK.cv(c, nick, 100);
            prop.expression =
                'var amp = ' + ref + ' / 100;\n' +
                '(time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', ' + V(base) + ', ' + V(base) + ' + ' + V(dA) + ' * amp) : ' +
                'ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', ' + V(base) + ' + ' + V(dB) + ' * amp, ' + V(base) + ')';
        } else {
            UK.key2(prop, c.t0, base, c.cut, add(base, dA), 'expoIn');
            UK.key2(prop, Math.min(c.cut + c.fd, c.t1), add(base, dB), c.t1, base, 'expoOut');
        }
    }
    /** Корр. слой + (опц.) Motion Tile 300% mirror + Transform с motion blur. */
    function adjTT(c, name, withTile) {
        var adj = c.adj(name), r = { adj: adj };
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
    /** Пара «wipe»-эффектов на слоях B (100→0) и A (0→100). setup(fx, layer) — донастройка. */
    function wipePair(c, match, nick, compProp, setup) {
        need(c);
        var s, fx, p;
        if (c.B) {
            fx = UK.addFx(c.B, match, nick);
            if (setup) setup(fx, c.B);
            p = UK.p(fx, compProp);
            s = tB(c);
            UK.key2(p, s[0], 100, s[1], 0, c.ease);
        }
        if (c.A) {
            fx = UK.addFx(c.A, match, nick);
            if (setup) setup(fx, c.A);
            p = UK.p(fx, compProp);
            s = tA(c);
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
    /** Белый/чёрный солид с огибающей прозрачности. */
    function dipSolid(c, color, name, peakOp, ease) {
        var sol = UK.solid(c.comp, color, name, c.t0, c.t1);
        c.layer = sol;
        var op = sol.transform.opacity;
        sym(c, op, 0, UK.clamp(peakOp, 0, 100), 'Opacity', ease || 'expoInOut');
        return sol;
    }

    // ============================================================ ТИП 1: корр. слой
    UK.add({
        id: 'trans.zoomIn', cat: 'trans', needs: 'trans', name: 'Zoom In · Зум внутрь',
        desc: 'Непрерывный зум внутрь через склейку с радиальным размытием. Сила — глубина зума.',
        tags: 'zoom in push переход зум',
        apply: function (c) {
            var r = adjTT(c, 'Zoom In', true), sc = uniScale(r.tf);
            var z = 150 * c.strength;
            jump(c, sc, 100, z, -100 + 10000 / (100 + z), 'Zoom');
            radialZoom(c, r.adj, 45 * c.strength);
        }
    });
    UK.add({
        id: 'trans.zoomOut', cat: 'trans', needs: 'trans', name: 'Zoom Out · Зум наружу',
        desc: 'Непрерывный зум наружу через склейку (края зеркалятся Motion Tile). Сила — глубина.',
        tags: 'zoom out pull переход зум',
        apply: function (c) {
            var r = adjTT(c, 'Zoom Out', true), sc = uniScale(r.tf);
            var lo = Math.max(36, 100 / (1 + 1.5 * c.strength));
            jump(c, sc, 100, lo - 100, 10000 / lo - 100, 'Zoom');
            radialZoom(c, r.adj, 45 * c.strength);
        }
    });
    UK.add({
        id: 'trans.zoomPunch', cat: 'trans', needs: 'trans', name: 'Zoom Punch · Зум-удар',
        desc: 'Симметричный зум туда-обратно с размытием. Сила — амплитуда.',
        tags: 'zoom punch bump зум удар',
        apply: function (c) {
            var r = adjTT(c, 'Zoom Punch', true), sc = uniScale(r.tf);
            sym(c, sc, 100, 60 * c.strength, 'Zoom', c.ease);
            radialZoom(c, r.adj, 35 * c.strength);
        }
    });
    UK.add({
        id: 'trans.spin', cat: 'trans', needs: 'trans', name: 'Spin · Вращение',
        desc: 'Кадр раскручивается до склейки и докручивается после (направление задаёт сторону).',
        tags: 'spin rotate rotation вращение',
        apply: function (c) {
            var r = adjTT(c, 'Spin', true);
            var rot = UK.p(r.tf, 'ADBE Geometry2-0008');
            var a = 90 * c.strength * (sgn(c) < 0 ? -1 : 1);
            jump(c, rot, 0, a, -a, 'Angle');
            var sc = uniScale(r.tf);
            sym(c, sc, 100, 45, 'Zoom', 'smooth');
            var rb = UK.addFx(r.adj, 'ADBE Radial Blur', 'Spin Blur');
            UK.set(rb, 'ADBE Radial Blur-0002', center(c));
            UK.set(rb, 'ADBE Radial Blur-0003', 1);
            UK.set(rb, 'ADBE Radial Blur-0004', 2);
            sym(c, UK.p(rb, 'ADBE Radial Blur-0001'), 0, 40 * c.strength, 'Spin Blur', 'smooth');
        }
    });
    UK.add({
        id: 'trans.zoomSpin', cat: 'trans', needs: 'trans', name: 'Zoom Spin · Зум с вращением',
        desc: 'Комбинация зума и поворота через склейку.',
        tags: 'zoom spin rotate зум вращение',
        apply: function (c) {
            var r = adjTT(c, 'Zoom Spin', true);
            var sc = uniScale(r.tf);
            sym(c, sc, 100, 80 * c.strength, 'Zoom', 'expoInOut');
            var a = 45 * c.strength * (sgn(c) < 0 ? -1 : 1);
            jump(c, UK.p(r.tf, 'ADBE Geometry2-0008'), 0, a, -a, 'Angle');
            radialZoom(c, r.adj, 30 * c.strength);
        }
    });
    UK.add({
        id: 'trans.whipPan', cat: 'trans', needs: 'trans', name: 'Whip Pan · Вжух-панорама',
        desc: 'Резкая панорама по направлению с направленным размытием. Сила — дистанция.',
        tags: 'whip pan swish панорама вжух',
        apply: function (c) {
            var r = adjTT(c, 'Whip Pan', true);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002');
            var base = pos.value;
            var dist = (horiz(c) ? c.comp.width : c.comp.height) * c.strength;
            var d = UK.vecMul(c.dirV, dist);
            jump(c, pos, base, d, UK.vecMul(d, -1), 'Distance');
            dirBlur(c, r.adj, 200 * c.strength);
        }
    });
    UK.add({
        id: 'trans.roll', cat: 'trans', needs: 'trans', name: 'Roll · Прокрутка',
        desc: 'Вертикальная прокрутка кадра через склейку (как барабан). Направление ↑/↓.',
        tags: 'roll scroll vertical прокрутка барабан',
        apply: function (c) {
            var r = adjTT(c, 'Roll', true);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002');
            var base = pos.value;
            var s = (c.dirV[1] !== 0) ? c.dirV[1] : 1;
            var d = [0, c.comp.height * s * c.strength];
            jump(c, pos, base, d, UK.vecMul(d, -1), 'Distance');
            dirBlur(c, r.adj, 200 * c.strength, 0);
        }
    });
    UK.add({
        id: 'trans.offsetPan', cat: 'trans', needs: 'trans', name: 'Offset Wrap · Панорама с заворотом',
        desc: 'Кадр заворачивается сам на себя (эффект Offset) по направлению с размытием.',
        tags: 'offset wrap pan заворот',
        apply: function (c) {
            var adj = c.adj('Offset Wrap');
            var off = UK.addFx(adj, 'ADBE Offset', 'Offset');
            var p = UK.p(off, 'ADBE Offset-0001');
            var base = center(c);
            var dist = (horiz(c) ? c.comp.width : c.comp.height);
            var d = UK.vecMul(c.dirV, dist);
            if (c.opts.controls) {
                var ref = UK.cv(c, 'Distance', 100);
                p.expression = V(base) + ' + ' + V(d) + ' * (' + ref + ' / 100) * ease(time, ' + F(c.t0) + ', ' + F(c.t1) + ', 0, 1)';
            } else {
                UK.key2(p, c.t0, base, c.t1, UK.vecAdd(base, d), 'expoInOut');
            }
            dirBlur(c, adj, 180 * c.strength);
            UK.motionBlur(adj, c.comp);
        }
    });
    UK.add({
        id: 'trans.dirBlur', cat: 'trans', needs: 'trans', name: 'Directional Blur · Направленное размытие',
        desc: 'Размытие по направлению нарастает к склейке и спадает. Сила — длина размытия.',
        tags: 'blur directional motion размытие',
        apply: function (c) {
            var adj = c.adj('Directional Blur');
            dirBlur(c, adj, 250 * c.strength);
        }
    });
    UK.add({
        id: 'trans.gaussBlur', cat: 'trans', needs: 'trans', name: 'Blur Dissolve · Размытие',
        desc: 'Гауссово размытие к склейке и обратно.',
        tags: 'blur gaussian dissolve размытие',
        apply: function (c) {
            var adj = c.adj('Blur Dissolve');
            var g = UK.addFx(adj, 'ADBE Gaussian Blur 2', 'Blur');
            UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
            sym(c, UK.p(g, 'ADBE Gaussian Blur 2-0001'), 0, 120 * c.strength, 'Blur', c.ease);
        }
    });
    UK.add({
        id: 'trans.glitch', cat: 'trans', needs: 'trans', name: 'Glitch · Глитч',
        desc: 'Случайные рывки, мозаика и мерцание вокруг склейки. Сила — амплитуда.',
        tags: 'glitch digital error глитч',
        apply: function (c) {
            var r = adjTT(c, 'Glitch', true);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002'), base = pos.value;
            var op = UK.p(r.tf, 'ADBE Geometry2-0009');
            var mos = UK.addFx(r.adj, 'ADBE Mosaic', 'Mosaic');
            UK.set(mos, 'ADBE Mosaic-0003', 1);
            var bh = UK.p(mos, 'ADBE Mosaic-0001'), bv = UK.p(mos, 'ADBE Mosaic-0002');
            var mb = UK.addFx(r.adj, 'ADBE Motion Blur', 'Blur');
            UK.set(mb, 'ADBE Motion Blur-0001', 90);
            var bl = UK.p(mb, 'ADBE Motion Blur-0002');
            var ratio = c.comp.height / c.comp.width;
            var k, t, env, step = c.fd * 2;
            for (t = c.t0; t < c.t1; t += step) {
                env = 1 - Math.abs(t - c.cut) / c.half;
                env = UK.clamp(env, 0, 1);
                var hit = Math.random() < 0.35 + 0.6 * env;
                var amp = 70 * c.strength * env;
                k = UK.key(pos, t, hit ? UK.vecAdd(base, [UK.rnd(-amp, amp), UK.rnd(-amp * 0.3, amp * 0.3)]) : base); UK.setHold(pos, k);
                var blocks = hit ? Math.max(3, Math.round(UK.lerp(400, 18, env * Math.random()))) : 2000;
                k = UK.key(bh, t, blocks); UK.setHold(bh, k);
                k = UK.key(bv, t, Math.max(2, Math.round(blocks * ratio))); UK.setHold(bv, k);
                k = UK.key(op, t, hit && Math.random() < 0.3 ? UK.rnd(55, 90) : 100); UK.setHold(op, k);
                k = UK.key(bl, t, hit ? UK.rnd(0, 90 * c.strength * env) : 0); UK.setHold(bl, k);
            }
            k = UK.key(pos, c.t1, base); UK.setHold(pos, k);
            k = UK.key(bh, c.t1, 2000); UK.setHold(bh, k);
            k = UK.key(bv, c.t1, 2000); UK.setHold(bv, k);
            k = UK.key(op, c.t1, 100); UK.setHold(op, k);
            k = UK.key(bl, c.t1, 0); UK.setHold(bl, k);
        }
    });
    UK.add({
        id: 'trans.rgbSplit', cat: 'trans', needs: 'trans', name: 'RGB Split · Расслоение каналов',
        desc: 'Красный и синий каналы расползаются по направлению к склейке (Channel Blur).',
        tags: 'rgb split chromatic aberration каналы',
        apply: function (c) {
            var r = adjTT(c, 'RGB Split', true);
            var cb = UK.addFx(r.adj, 'ADBE Channel Blur', 'Channel Blur');
            UK.set(cb, 'ADBE Channel Blur-0005', 1);
            UK.set(cb, 'ADBE Channel Blur-0006', horiz(c) ? 2 : 3);
            sym(c, UK.p(cb, 'ADBE Channel Blur-0001'), 0, 120 * c.strength, 'Red Split', c.ease);
            sym(c, UK.p(cb, 'ADBE Channel Blur-0003'), 0, 120 * c.strength, 'Blue Split', c.ease);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002');
            sym(c, pos, pos.value, UK.vecMul(c.dirV, 30 * c.strength), 'Shift', c.ease);
        }
    });
    UK.add({
        id: 'trans.chromaZoom', cat: 'trans', needs: 'trans', name: 'Chromatic Zoom · Хроматический зум',
        desc: 'Зум с расслоением RGB и радиальным размытием.',
        tags: 'chromatic zoom rgb aberration зум',
        apply: function (c) {
            var r = adjTT(c, 'Chromatic Zoom', true), sc = uniScale(r.tf);
            sym(c, sc, 100, 50 * c.strength, 'Zoom', 'expoInOut');
            var cb = UK.addFx(r.adj, 'ADBE Channel Blur', 'Channel Blur');
            UK.set(cb, 'ADBE Channel Blur-0005', 1);
            sym(c, UK.p(cb, 'ADBE Channel Blur-0001'), 0, 60 * c.strength, 'Red Split', 'smooth');
            sym(c, UK.p(cb, 'ADBE Channel Blur-0003'), 0, 60 * c.strength, 'Blue Split', 'smooth');
            radialZoom(c, r.adj, 30 * c.strength);
        }
    });
    UK.add({
        id: 'trans.pixelate', cat: 'trans', needs: 'trans', name: 'Pixelate · Пикселизация',
        desc: 'Кадр рассыпается на крупные пиксели к склейке и собирается обратно.',
        tags: 'pixel mosaic 8bit пиксели мозаика',
        apply: function (c) {
            var adj = c.adj('Pixelate');
            var mos = UK.addFx(adj, 'ADBE Mosaic', 'Mosaic');
            UK.set(mos, 'ADBE Mosaic-0003', 1);
            var minB = Math.max(2, Math.round(12 / c.strength));
            var ratio = c.comp.height / c.comp.width;
            sym(c, UK.p(mos, 'ADBE Mosaic-0001'), 1200, minB - 1200, 'Blocks', 'expoInOut');
            sym(c, UK.p(mos, 'ADBE Mosaic-0002'), Math.round(1200 * ratio), Math.max(2, Math.round(minB * ratio)) - Math.round(1200 * ratio), 'Blocks V', 'expoInOut');
        }
    });
    UK.add({
        id: 'trans.twist', cat: 'trans', needs: 'trans', name: 'Twist · Скручивание',
        desc: 'Кадр закручивается в спираль к склейке (Twirl).',
        tags: 'twist twirl spiral скручивание',
        apply: function (c) {
            var adj = c.adj('Twist');
            var tw = UK.addFx(adj, 'ADBE Twirl', 'Twirl');
            UK.set(tw, 'ADBE Twirl-0002', 75);
            UK.set(tw, 'ADBE Twirl-0003', center(c));
            var a = 180 * c.strength * (sgn(c) < 0 ? -1 : 1);
            sym(c, UK.p(tw, 'ADBE Twirl-0001'), 0, a, 'Angle', c.ease);
            var rb = UK.addFx(adj, 'ADBE Radial Blur', 'Spin Blur');
            UK.set(rb, 'ADBE Radial Blur-0002', center(c));
            UK.set(rb, 'ADBE Radial Blur-0003', 1);
            sym(c, UK.p(rb, 'ADBE Radial Blur-0001'), 0, 20 * c.strength, 'Blur', 'smooth');
        }
    });
    UK.add({
        id: 'trans.ripple', cat: 'trans', needs: 'trans', name: 'Ripple · Круги по воде',
        desc: 'Волновое искажение от центра, пик на склейке.',
        tags: 'ripple wave water волны',
        apply: function (c) {
            var adj = c.adj('Ripple');
            var rp = UK.addFx(adj, 'ADBE Ripple', 'Ripple');
            UK.set(rp, 'ADBE Ripple-0002', center(c));
            UK.set(rp, 'ADBE Ripple-0004', 1.5);
            UK.set(rp, 'ADBE Ripple-0005', 60);
            UK.set(rp, 'ADBE Ripple-0006', UK.clamp(50 * c.strength, 5, 100));
            sym(c, UK.p(rp, 'ADBE Ripple-0001'), 0, 100, 'Radius', c.ease);
        }
    });
    UK.add({
        id: 'trans.bulge', cat: 'trans', needs: 'trans', name: 'Bulge · Выпуклость',
        desc: 'Кадр выдувается линзой к склейке и возвращается.',
        tags: 'bulge lens выпуклость линза',
        apply: function (c) {
            var adj = c.adj('Bulge');
            var b = UK.addFx(adj, 'ADBE Bulge', 'Bulge');
            UK.set(b, 'ADBE Bulge-0001', c.comp.width * 0.65);
            UK.set(b, 'ADBE Bulge-0002', c.comp.width * 0.65);
            UK.set(b, 'ADBE Bulge-0003', center(c));
            UK.set(b, 'ADBE Bulge-0007', 1);
            sym(c, UK.p(b, 'ADBE Bulge-0004'), 0, UK.clamp(2.2 * c.strength, -4, 4), 'Height', c.ease);
        }
    });
    UK.add({
        id: 'trans.lensDistort', cat: 'trans', needs: 'trans', name: 'Lens Distortion · Дисторсия',
        desc: 'Оптическое искажение (Optics Compensation) с зумом, пик на склейке.',
        tags: 'lens distortion optics дисторсия',
        apply: function (c) {
            var r = adjTT(c, 'Lens Distortion', true);
            var oc = UK.addFx(r.adj, 'ADBE Optics Compensation', 'Optics');
            UK.set(oc, 'ADBE Optics Compensation-0002', 1);
            sym(c, UK.p(oc, 'ADBE Optics Compensation-0001'), 0, UK.clamp(90 * c.strength, 0, 150), 'FOV', c.ease);
            sym(c, uniScale(r.tf), 100, 25 * c.strength, 'Zoom', 'smooth');
            radialZoom(c, r.adj, 20 * c.strength);
        }
    });
    UK.add({
        id: 'trans.fisheye', cat: 'trans', needs: 'trans', name: 'Fisheye Zoom · Рыбий глаз',
        desc: 'Зум с «рыбьим глазом» — кадр выпучивается и уходит в следующий.',
        tags: 'fisheye zoom lens рыбий глаз',
        apply: function (c) {
            var r = adjTT(c, 'Fisheye', true);
            var oc = UK.addFx(r.adj, 'ADBE Optics Compensation', 'Optics');
            UK.set(oc, 'ADBE Optics Compensation-0002', 0);
            sym(c, UK.p(oc, 'ADBE Optics Compensation-0001'), 0, UK.clamp(110 * c.strength, 0, 160), 'FOV', c.ease);
            var z = 120 * c.strength;
            jump(c, uniScale(r.tf), 100, z, -100 + 10000 / (100 + z), 'Zoom');
            radialZoom(c, r.adj, 25 * c.strength);
        }
    });
    UK.add({
        id: 'trans.mirrorSplit', cat: 'trans', needs: 'trans', name: 'Mirror Split · Зеркало',
        desc: 'Ось зеркала наезжает от края к центру и уходит обратно, плюс лёгкий зум.',
        tags: 'mirror split reflection зеркало',
        apply: function (c) {
            var r = adjTT(c, 'Mirror Split', true);
            var m = UK.addFx(r.adj, 'ADBE Mirror', 'Mirror');
            var w = c.comp.width, h = c.comp.height;
            var edge, delta, ang;
            if (horiz(c)) { edge = [c.dirV[0] < 0 ? w : 0, h / 2]; delta = [(w / 2 - edge[0]) * UK.clamp(c.strength, 0.2, 1), 0]; ang = c.dirV[0] < 0 ? 0 : 180; }
            else { edge = [w / 2, c.dirV[1] < 0 ? h : 0]; delta = [0, (h / 2 - edge[1]) * UK.clamp(c.strength, 0.2, 1)]; ang = c.dirV[1] < 0 ? 90 : 270; }
            UK.set(m, 'ADBE Mirror-0002', ang);
            sym(c, UK.p(m, 'ADBE Mirror-0001'), edge, delta, 'Axis', c.ease);
            sym(c, uniScale(r.tf), 100, 30, 'Zoom', 'smooth');
        }
    });
    UK.add({
        id: 'trans.kaleida', cat: 'trans', needs: 'trans', name: 'Kaleidoscope · Калейдоскоп',
        desc: 'Кадр складывается в калейдоскоп на склейке (CC Kaleida).',
        tags: 'kaleidoscope kaleida mirror калейдоскоп',
        apply: function (c) {
            var adj = c.adj('Kaleidoscope');
            var k = UK.addFx(adj, 'CC Kaleida', 'Kaleida');
            UK.set(k, 'CC Kaleida-0001', center(c));
            UK.set(k, 'CC Kaleida-0003', 7);
            sym(c, UK.p(k, 'CC Kaleida-0002'), 320, -320 + Math.max(40, 120 / c.strength), 'Size', c.ease);
            sym(c, UK.p(k, 'CC Kaleida-0004'), 0, 90 * (sgn(c) < 0 ? -1 : 1), 'Rotation', c.ease);
            sym(c, adj.transform.opacity, 0, 100, 'Opacity', 'expoOut');
            UK.motionBlur(adj, c.comp);
        }
    });
    UK.add({
        id: 'trans.warpStretch', cat: 'trans', needs: 'trans', name: 'Warp Stretch · Растяжение',
        desc: 'Кадр растягивается по одной оси (по направлению) к склейке.',
        tags: 'stretch warp scale растяжение',
        apply: function (c) {
            var r = adjTT(c, 'Warp Stretch', true);
            UK.set(r.tf, 'ADBE Geometry2-0003', 0);
            var p = UK.p(r.tf, horiz(c) ? 'ADBE Geometry2-0005' : 'ADBE Geometry2-0004');
            sym(c, p, 100, 180 * c.strength, 'Stretch', c.ease);
            dirBlur(c, r.adj, 120 * c.strength);
        }
    });
    UK.add({
        id: 'trans.shake', cat: 'trans', needs: 'trans', name: 'Shake · Тряска',
        desc: 'Тряска кадра с огибающей вокруг склейки (wiggle). Сила — амплитуда.',
        tags: 'shake wiggle camera тряска',
        apply: function (c) {
            var r = adjTT(c, 'Shake', true);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002');
            var amp = UK.cv(c, 'Shake Amount', UK.fmt(60 * c.strength));
            var freq = UK.cv(c, 'Shake Freq', 14);
            pos.expression =
                'var amp = ' + amp + ', fr = ' + freq + ';\n' +
                'var e = (time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', 0, 1) : ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', 1, 0);\n' +
                'value + (wiggle(fr, amp) - value) * e';
            var rot = UK.p(r.tf, 'ADBE Geometry2-0008');
            rot.expression =
                'var e = (time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', 0, 1) : ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', 1, 0);\n' +
                'value + (wiggle(' + freq + ', ' + F(2 * c.strength) + ') - value) * e';
            sym(c, uniScale(r.tf), 100, 12 * c.strength, 'Zoom', 'smooth');
        }
    });
    UK.add({
        id: 'trans.punch', cat: 'trans', needs: 'trans', name: 'Impact Punch · Удар',
        desc: 'Резкий короткий толчок масштаба на склейке с размытием.',
        tags: 'punch impact hit bump удар',
        apply: function (c) {
            var r = adjTT(c, 'Punch', true), sc = uniScale(r.tf);
            var pk = 100 + 18 * c.strength;
            UK.keys(sc, [[Math.max(c.t0, c.cut - 2 * c.fd), 100], [c.cut, pk], [c.t1, 100]], 'expoOut');
            radialZoom(c, r.adj, 25 * c.strength);
        }
    });
    UK.add({
        id: 'trans.bounceZoom', cat: 'trans', needs: 'trans', name: 'Bounce Zoom · Пружинный зум',
        desc: 'Зум к склейке с отскоком обратно (выражение bounce).',
        tags: 'bounce zoom elastic пружина',
        apply: function (c) {
            var r = adjTT(c, 'Bounce Zoom', true), sc = uniScale(r.tf);
            UK.keys(sc, [[c.t0, 100], [c.cut, 100 + 35 * c.strength], [c.t1, 100]], 'expoInOut');
            UK.applyEaseExpr(sc, 'bounce', c);
            radialZoom(c, r.adj, 20 * c.strength);
        }
    });
    UK.add({
        id: 'trans.flash', cat: 'trans', needs: 'trans', name: 'Flash · Белая вспышка',
        desc: 'Белый солид вспыхивает на склейке. Сила — яркость.',
        tags: 'flash white luma вспышка',
        apply: function (c) {
            var sol = dipSolid(c, [1, 1, 1], 'Flash', 100 * c.strength, 'expoIn');
            sol.blendingMode = BlendingMode.ADD;
        }
    });
    UK.add({
        id: 'trans.dipBlack', cat: 'trans', needs: 'trans', name: 'Dip to Black · Затемнение',
        desc: 'Уход в чёрное и выход из него вокруг склейки.',
        tags: 'dip black fade затемнение',
        apply: function (c) { dipSolid(c, [0, 0, 0], 'Dip to Black', 100, 'smooth'); }
    });
    UK.add({
        id: 'trans.dipColor', cat: 'trans', needs: 'trans', name: 'Dip to Color · Цветная заливка',
        desc: 'Уход в цвет (по умолчанию тёмно-синий, меняется у солида) и выход.',
        tags: 'dip color fade заливка цвет',
        apply: function (c) { dipSolid(c, [0.07, 0.1, 0.25], 'Dip to Color', 100, 'smooth'); }
    });
    UK.add({
        id: 'trans.negFlash', cat: 'trans', needs: 'trans', name: 'Negative Flash · Негатив',
        desc: 'Короткий инверсный импульс на склейке.',
        tags: 'invert negative flash негатив',
        apply: function (c) {
            var adj = c.adj('Negative Flash');
            UK.addFx(adj, 'ADBE Invert', 'Invert');
            var op = adj.transform.opacity;
            var a = Math.max(c.t0, c.cut - 3 * c.fd), b = Math.min(c.t1, c.cut + 3 * c.fd);
            var k = UK.key(op, a, 0); UK.setHold(op, k);
            k = UK.key(op, Math.max(a, c.cut - c.fd), 100); UK.setHold(op, k);
            k = UK.key(op, Math.min(b, c.cut + c.fd), 100); UK.setHold(op, k);
            k = UK.key(op, b, 0); UK.setHold(op, k);
        }
    });
    UK.add({
        id: 'trans.lightLeak', cat: 'trans', needs: 'trans', name: 'Light Leak · Засветка',
        desc: 'Тёплая плёночная засветка (Fractal Noise + Tint, режим Add) накрывает склейку.',
        tags: 'light leak film warm засветка плёнка',
        apply: function (c) {
            var sol = UK.solid(c.comp, [1, 1, 1], 'Light Leak', c.t0, c.t1);
            c.layer = sol;
            var fn = UK.addFx(sol, 'ADBE Fractal Noise', 'Noise');
            UK.set(fn, ['ADBE Fractal Noise-0004', 'Contrast'], 160);
            UK.set(fn, ['ADBE Fractal Noise-0005', 'Brightness'], -10);
            UK.set(fn, ['ADBE Fractal Noise-0009', 'Uniform Scaling'], 0);
            UK.set(fn, ['ADBE Fractal Noise-0011', 'Scale Width'], 900);
            UK.set(fn, ['ADBE Fractal Noise-0012', 'Scale Height'], 350);
            UK.set(fn, ['ADBE Fractal Noise-0015', 'Complexity'], 2);
            UK.expr(fn, ['ADBE Fractal Noise-0022', 'Evolution'], 'time * 90');
            UK.expr(fn, ['ADBE Fractal Noise-0013', 'Offset Turbulence'], 'value + [time * 250, time * 40]');
            var tint = UK.addFx(sol, 'ADBE Tint', 'Tint');
            UK.set(tint, 'ADBE Tint-0001', [0.75, 0.15, 0.05, 1]);
            UK.set(tint, 'ADBE Tint-0002', [1, 0.85, 0.55, 1]);
            var g = UK.addFx(sol, 'ADBE Gaussian Blur 2', 'Soften');
            UK.set(g, 'ADBE Gaussian Blur 2-0001', 60);
            UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
            sol.blendingMode = BlendingMode.ADD;
            sym(c, sol.transform.opacity, 0, UK.clamp(85 * c.strength, 0, 100), 'Opacity', 'smooth');
        }
    });
    UK.add({
        id: 'trans.filmBurn', cat: 'trans', needs: 'trans', name: 'Film Burn · Прожиг плёнки',
        desc: 'Исходящий кадр прогорает, входящий проявляется из прожига (CC Burn Film).',
        tags: 'film burn плёнка прожиг',
        apply: function (c) {
            need(c);
            var fx, s;
            if (c.A) {
                fx = UK.addFx(c.A, 'CC Burn Film', 'Burn');
                UK.set(fx, 'CC Burn Film-0002', lcenter(c.A, c));
                s = tA(c);
                UK.key2(UK.p(fx, 'CC Burn Film-0001'), s[0], 0, s[1], 100, c.ease, true);
            }
            if (c.B) {
                fx = UK.addFx(c.B, 'CC Burn Film', 'Burn');
                UK.set(fx, 'CC Burn Film-0002', lcenter(c.B, c));
                UK.set(fx, 'CC Burn Film-0003', 7);
                s = tB(c);
                UK.key2(UK.p(fx, 'CC Burn Film-0001'), s[0], 100, s[1], 0, c.ease);
            }
            var sol = UK.solid(c.comp, [1, 0.6, 0.2], 'Burn Glow', c.t0, c.t1);
            sol.blendingMode = BlendingMode.ADD;
            UK.keys(sol.transform.opacity, [[c.t0, 0], [c.cut, UK.clamp(45 * c.strength, 0, 100)], [c.t1, 0]], 'smooth');
        }
    });
    UK.add({
        id: 'trans.wave', cat: 'trans', needs: 'trans', name: 'Wave Warp · Волна',
        desc: 'Волновое искажение по направлению с пиком на склейке.',
        tags: 'wave warp волна',
        apply: function (c) {
            var adj = c.adj('Wave');
            var w = UK.addFx(adj, 'ADBE Wave Warp', 'Wave');
            UK.set(w, 'ADBE Wave Warp-0001', 1);
            UK.set(w, 'ADBE Wave Warp-0003', 220);
            UK.set(w, 'ADBE Wave Warp-0004', horiz(c) ? 90 : 0);
            UK.set(w, 'ADBE Wave Warp-0005', 2);
            UK.set(w, 'ADBE Wave Warp-0008', 2);
            sym(c, UK.p(w, 'ADBE Wave Warp-0002'), 0, 90 * c.strength, 'Height', c.ease);
        }
    });
    UK.add({
        id: 'trans.turbulent', cat: 'trans', needs: 'trans', name: 'Turbulent Melt · Турбулентность',
        desc: 'Кадр «плавится» турбулентным смещением на склейке.',
        tags: 'turbulent displace melt liquid плавление',
        apply: function (c) {
            var adj = c.adj('Turbulent');
            var td = UK.addFx(adj, 'ADBE Turbulent Displace', 'Turbulent');
            UK.set(td, 'ADBE Turbulent Displace-0003', 140);
            UK.set(td, 'ADBE Turbulent Displace-0005', 3);
            UK.expr(td, ['ADBE Turbulent Displace-0006', 'Evolution'], 'time * 240');
            sym(c, UK.p(td, 'ADBE Turbulent Displace-0002'), 0, 160 * c.strength, 'Amount', c.ease);
            var g = UK.addFx(adj, 'ADBE Gaussian Blur 2', 'Blur');
            UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
            sym(c, UK.p(g, 'ADBE Gaussian Blur 2-0001'), 0, 20 * c.strength, 'Blur', 'smooth');
        }
    });
    UK.add({
        id: 'trans.spherize', cat: 'trans', needs: 'trans', name: 'Sphere Pop · Сфера',
        desc: 'Кадр надувается сферой к склейке.',
        tags: 'sphere spherize bulge сфера',
        apply: function (c) {
            var adj = c.adj('Sphere');
            var sp = UK.addFx(adj, 'ADBE Spherize', 'Spherize');
            UK.set(sp, 'ADBE Spherize-0002', center(c));
            sym(c, UK.p(sp, 'ADBE Spherize-0001'), 0, c.comp.width * 0.55 * UK.clamp(c.strength, 0.3, 1.8), 'Radius', c.ease);
        }
    });

    // ============================================================ ТИП 2: слои A/B
    UK.add({
        id: 'trans.push', cat: 'trans', needs: 'trans', name: 'Push · Сдвиг',
        desc: 'Исходящий кадр выталкивается за край, входящий въезжает следом (по направлению).',
        tags: 'push slide move сдвиг',
        apply: function (c) {
            need(c);
            var s, pos, base;
            if (c.A) {
                pos = c.A.transform.position; base = pos.valueAtTime(c.cut, false); s = tA(c);
                UK.key2(pos, s[0], base, s[1], UK.vecAdd(base, UK.vecMul(c.dirV, UK.exitDistance(c.A, c.comp, c.dirV, c.cut))), c.ease, true);
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                pos = c.B.transform.position; base = pos.valueAtTime(c.t1, false); s = tB(c);
                var back = UK.vecMul(c.dirV, -1);
                UK.key2(pos, s[0], UK.vecAdd(base, UK.vecMul(back, UK.exitDistance(c.B, c.comp, back, c.cut))), s[1], base, c.ease);
                UK.applyEaseExpr(pos, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.slideCover', cat: 'trans', needs: 'trans', name: 'Slide Cover · Наезд сверху',
        desc: 'Входящий кадр наезжает и накрывает исходящий.',
        tags: 'slide cover over наезд',
        apply: function (c) {
            need(c);
            if (!c.B) { c.B = c.A; }
            var pos = c.B.transform.position, base = pos.valueAtTime(c.t1, false), s = tB(c);
            var back = UK.vecMul(c.dirV, -1);
            UK.key2(pos, s[0], UK.vecAdd(base, UK.vecMul(back, UK.exitDistance(c.B, c.comp, back, c.cut))), s[1], base, c.ease);
            UK.applyEaseExpr(pos, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
            UK.motionBlur(c.B, c.comp);
        }
    });
    UK.add({
        id: 'trans.slideReveal', cat: 'trans', needs: 'trans', name: 'Slide Reveal · Уход в сторону',
        desc: 'Исходящий кадр уезжает за край, открывая входящий.',
        tags: 'slide reveal uncover уход',
        apply: function (c) {
            need(c);
            if (!c.A) { c.A = c.B; }
            var pos = c.A.transform.position, base = pos.valueAtTime(c.cut, false), s = tA(c);
            UK.key2(pos, s[0], base, s[1], UK.vecAdd(base, UK.vecMul(c.dirV, UK.exitDistance(c.A, c.comp, c.dirV, c.cut))), c.ease, true);
            UK.motionBlur(c.A, c.comp);
        }
    });
    UK.add({
        id: 'trans.flip3D', cat: 'trans', needs: 'trans', name: '3D Flip · Переворот',
        desc: 'Кадры переворачиваются как карточка (3D). Направление задаёт ось и сторону.',
        tags: '3d flip card rotate переворот',
        apply: function (c) {
            need(c);
            var sg = sgn(c), s, rp;
            if (c.A) {
                UK.to3D(c.A); s = tA(c);
                rp = horiz(c) ? c.A.transform.yRotation : c.A.transform.xRotation;
                UK.key2(rp, s[0], rp.valueAtTime(s[0], false), s[1], rp.valueAtTime(s[0], false) + 90 * sg, c.ease, true);
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                UK.to3D(c.B); s = tB(c);
                rp = horiz(c) ? c.B.transform.yRotation : c.B.transform.xRotation;
                var end = rp.valueAtTime(s[1], false);
                UK.key2(rp, s[0], end - 90 * sg, s[1], end, c.ease);
                UK.applyEaseExpr(rp, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.scaleSwap', cat: 'trans', needs: 'trans', name: 'Scale Swap · Смена масштабом',
        desc: 'Исходящий уменьшается и тает, входящий вырастает из центра.',
        tags: 'scale swap grow shrink масштаб',
        apply: function (c) {
            need(c);
            var s, sc, base;
            if (c.A) {
                sc = c.A.transform.scale; base = sc.valueAtTime(c.cut, false); s = tA(c);
                UK.key2(sc, s[0], base, s[1], UK.vecMul(base, UK.clamp(1 - 0.6 * c.strength, 0, 1)), c.ease, true);
                fadeOutA(c);
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                sc = c.B.transform.scale; base = sc.valueAtTime(c.t1, false); s = tB(c);
                UK.key2(sc, s[0], UK.vecMul(base, UK.clamp(1 - 0.8 * c.strength, 0, 1)), s[1], base, c.ease);
                UK.applyEaseExpr(sc, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                fadeInB(c, s[0] + (s[1] - s[0]) * 0.5);
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.rotateSwap', cat: 'trans', needs: 'trans', name: 'Rotate Swap · Смена поворотом',
        desc: 'Исходящий уходит с поворотом и уменьшением, входящий вкручивается.',
        tags: 'rotate swap spin поворот',
        apply: function (c) {
            need(c);
            var sg = sgn(c), s, rot, sc, base;
            if (c.A) {
                s = tA(c); rot = c.A.transform.rotation; sc = c.A.transform.scale; base = sc.valueAtTime(c.cut, false);
                UK.key2(rot, s[0], rot.valueAtTime(s[0], false), s[1], rot.valueAtTime(s[0], false) + 90 * sg * c.strength, c.ease, true);
                UK.key2(sc, s[0], base, s[1], UK.vecMul(base, 0.4), c.ease, true);
                fadeOutA(c);
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                s = tB(c); rot = c.B.transform.rotation; sc = c.B.transform.scale; base = sc.valueAtTime(c.t1, false);
                var endR = rot.valueAtTime(s[1], false);
                UK.key2(rot, s[0], endR - 90 * sg * c.strength, s[1], endR, c.ease);
                UK.key2(sc, s[0], UK.vecMul(base, 0.4), s[1], base, c.ease);
                UK.applyEaseExpr(rot, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                fadeInB(c, s[0] + (s[1] - s[0]) * 0.4);
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.crossfade', cat: 'trans', needs: 'trans', name: 'Crossfade · Наплыв',
        desc: 'Классический наплыв по прозрачности.',
        tags: 'crossfade dissolve opacity наплыв',
        apply: function (c) {
            need(c);
            var s, op;
            if (c.B) { s = tB(c); op = c.B.transform.opacity; UK.key2(op, s[0], 0, s[1], op.valueAtTime(s[1], false), c.ease); }
            if (c.A) { s = tA(c); op = c.A.transform.opacity; UK.key2(op, s[0], op.valueAtTime(s[0], false), s[1], 0, c.ease, true); }
        }
    });
    UK.add({
        id: 'trans.blurFade', cat: 'trans', needs: 'trans', name: 'Blur Fade · Наплыв с размытием',
        desc: 'Наплыв, при котором кадры расфокусируются.',
        tags: 'blur fade dissolve focus размытие наплыв',
        apply: function (c) {
            need(c);
            var s, g, op;
            if (c.B) {
                s = tB(c); g = UK.addFx(c.B, 'ADBE Gaussian Blur 2', 'Blur'); UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
                UK.key2(UK.p(g, 'ADBE Gaussian Blur 2-0001'), s[0], 80 * c.strength, s[1], 0, c.ease);
                op = c.B.transform.opacity; UK.key2(op, s[0], 0, s[1], op.valueAtTime(s[1], false), c.ease);
            }
            if (c.A) {
                s = tA(c); g = UK.addFx(c.A, 'ADBE Gaussian Blur 2', 'Blur'); UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
                UK.key2(UK.p(g, 'ADBE Gaussian Blur 2-0001'), s[0], 0, s[1], 80 * c.strength, c.ease, true);
                op = c.A.transform.opacity; UK.key2(op, s[0], op.valueAtTime(s[0], false), s[1], 0, c.ease, true);
            }
        }
    });
    UK.add({
        id: 'trans.zoomThrough', cat: 'trans', needs: 'trans', name: 'Zoom Through · Сквозной зум',
        desc: 'Входящий кадр прилетает из глубины (масштаб 300→100 с размытием), исходящий уходит вглубь.',
        tags: 'zoom through fly дальний зум',
        apply: function (c) {
            need(c);
            var s, sc, base, g;
            if (c.B) {
                s = tB(c); sc = c.B.transform.scale; base = sc.valueAtTime(c.t1, false);
                UK.key2(sc, s[0], UK.vecMul(base, 1 + 2 * c.strength), s[1], base, c.ease);
                UK.applyEaseExpr(sc, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                g = UK.addFx(c.B, 'ADBE Gaussian Blur 2', 'Blur'); UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
                UK.key2(UK.p(g, 'ADBE Gaussian Blur 2-0001'), s[0], 60 * c.strength, s[1], 0, 'expoOut');
                fadeInB(c, s[0] + (s[1] - s[0]) * 0.35);
                UK.motionBlur(c.B, c.comp);
            }
            if (c.A) {
                s = tA(c); sc = c.A.transform.scale; base = sc.valueAtTime(c.cut, false);
                UK.key2(sc, s[0], base, s[1], UK.vecMul(base, UK.clamp(1 - 0.7 * c.strength, 0.05, 1)), c.ease, true);
                g = UK.addFx(c.A, 'ADBE Gaussian Blur 2', 'Blur'); UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
                UK.key2(UK.p(g, 'ADBE Gaussian Blur 2-0001'), s[0], 0, s[1], 40 * c.strength, 'expoIn');
                fadeOutA(c, s[0] + (s[1] - s[0]) * 0.5);
                UK.motionBlur(c.A, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.squeeze', cat: 'trans', needs: 'trans', name: 'Squeeze · Сжатие',
        desc: 'Исходящий сжимается в полоску по направлению, входящий разжимается из неё.',
        tags: 'squeeze squash stretch сжатие',
        apply: function (c) {
            need(c);
            var s, sc, base, idx = horiz(c) ? 0 : 1, v;
            if (c.A) {
                s = tA(c); sc = c.A.transform.scale; base = sc.valueAtTime(c.cut, false);
                v = base.slice(); v[idx] = 0;
                UK.key2(sc, s[0], base, s[1], v, 'expoIn');
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                s = tB(c); sc = c.B.transform.scale; base = sc.valueAtTime(c.t1, false);
                v = base.slice(); v[idx] = 0;
                UK.key2(sc, s[0], v, s[1], base, 'expoOut');
                UK.applyEaseExpr(sc, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.linearWipe', cat: 'trans', needs: 'trans', name: 'Linear Wipe · Шторка',
        desc: 'Линейная шторка по направлению с мягким краем.',
        tags: 'wipe linear шторка',
        apply: function (c) {
            var ang = { L: 90, R: 270, U: 0, D: 180 }[c.dirId];
            wipePair(c, 'ADBE Linear Wipe', 'Wipe', 'ADBE Linear Wipe-0001', function (fx) {
                UK.set(fx, 'ADBE Linear Wipe-0002', ang);
                UK.set(fx, 'ADBE Linear Wipe-0003', 40 * c.strength);
            });
        }
    });
    UK.add({
        id: 'trans.radialWipe', cat: 'trans', needs: 'trans', name: 'Radial Wipe · Часы',
        desc: 'Радиальная шторка «часами» от центра.',
        tags: 'wipe radial clock часы',
        apply: function (c) {
            wipePair(c, 'ADBE Radial Wipe', 'Radial Wipe', 'ADBE Radial Wipe-0001', function (fx, L) {
                UK.set(fx, 'ADBE Radial Wipe-0003', lcenter(L, c));
                UK.set(fx, 'ADBE Radial Wipe-0004', sgn(c) < 0 ? 2 : 1);
                UK.set(fx, 'ADBE Radial Wipe-0005', 30 * c.strength);
            });
        }
    });
    UK.add({
        id: 'trans.blinds', cat: 'trans', needs: 'trans', name: 'Venetian Blinds · Жалюзи',
        desc: 'Жалюзи по направлению; Сила — ширина полос.',
        tags: 'blinds venetian stripes жалюзи',
        apply: function (c) {
            wipePair(c, 'ADBE Venetian Blinds', 'Blinds', 'ADBE Venetian Blinds-0001', function (fx) {
                UK.set(fx, 'ADBE Venetian Blinds-0002', horiz(c) ? 90 : 0);
                UK.set(fx, 'ADBE Venetian Blinds-0003', Math.max(10, 80 * c.strength));
                UK.set(fx, 'ADBE Venetian Blinds-0004', 6);
            });
        }
    });
    UK.add({
        id: 'trans.blockDissolve', cat: 'trans', needs: 'trans', name: 'Block Dissolve · Блоки',
        desc: 'Растворение квадратными блоками; Сила — размер блока.',
        tags: 'block dissolve pixel блоки',
        apply: function (c) {
            wipePair(c, 'ADBE Block Dissolve', 'Blocks', 'ADBE Block Dissolve-0001', function (fx) {
                var b = Math.max(4, 60 * c.strength);
                UK.set(fx, 'ADBE Block Dissolve-0002', b);
                UK.set(fx, 'ADBE Block Dissolve-0003', b);
                UK.set(fx, 'ADBE Block Dissolve-0004', 0);
                UK.set(fx, 'ADBE Block Dissolve-0005', 0);
            });
        }
    });
    UK.add({
        id: 'trans.irisWipe', cat: 'trans', needs: 'trans', name: 'Iris Wipe · Диафрагма',
        desc: 'Круглая диафрагма раскрывается из центра (и закрывается на исходящем).',
        tags: 'iris circle wipe диафрагма круг',
        apply: function (c) {
            need(c);
            var fx, s, sz, R;
            if (c.B) {
                sz = lsz(c.B, c); R = Math.sqrt(sz[0] * sz[0] + sz[1] * sz[1]) / 2 * 1.05;
                fx = UK.addFx(c.B, 'ADBE Iris Wipe', 'Iris');
                UK.set(fx, 'ADBE Iris Wipe-0001', lcenter(c.B, c));
                UK.set(fx, 'ADBE Iris Wipe-0002', 32);
                UK.set(fx, 'ADBE Iris Wipe-0007', 40 * c.strength);
                s = tB(c);
                UK.key2(UK.p(fx, 'ADBE Iris Wipe-0003'), s[0], 0, s[1], R, c.ease);
            }
            if (c.A) {
                sz = lsz(c.A, c); R = Math.sqrt(sz[0] * sz[0] + sz[1] * sz[1]) / 2 * 1.05;
                fx = UK.addFx(c.A, 'ADBE Iris Wipe', 'Iris');
                UK.set(fx, 'ADBE Iris Wipe-0001', lcenter(c.A, c));
                UK.set(fx, 'ADBE Iris Wipe-0002', 32);
                UK.set(fx, 'ADBE Iris Wipe-0007', 40 * c.strength);
                s = tA(c);
                UK.key2(UK.p(fx, 'ADBE Iris Wipe-0003'), s[0], R, s[1], 0, c.ease, true);
            }
        }
    });
    UK.add({
        id: 'trans.gridWipe', cat: 'trans', needs: 'trans', name: 'Grid Wipe · Сетка',
        desc: 'Плитки сетки раскрываются (CC Grid Wipe). Сила — размер плиток.',
        tags: 'grid wipe tiles сетка плитки',
        apply: function (c) {
            wipePair(c, 'CC Grid Wipe', 'Grid Wipe', 'CC Grid Wipe-0001', function (fx, L) {
                UK.set(fx, 'CC Grid Wipe-0002', lcenter(L, c));
                UK.set(fx, 'CC Grid Wipe-0005', Math.max(4, Math.round(12 / UK.clamp(c.strength, 0.3, 3))));
                UK.set(fx, 'CC Grid Wipe-0006', 2);
            });
        }
    });
    UK.add({
        id: 'trans.jaws', cat: 'trans', needs: 'trans', name: 'Jaws · Зубья',
        desc: 'Зубчатые челюсти смыкаются/размыкаются (CC Jaws).',
        tags: 'jaws teeth zigzag зубья',
        apply: function (c) {
            wipePair(c, 'CC Jaws', 'Jaws', 'CC Jaws-0001', function (fx, L) {
                UK.set(fx, 'CC Jaws-0002', lcenter(L, c));
                UK.set(fx, 'CC Jaws-0003', horiz(c) ? 90 : 0);
                UK.set(fx, 'CC Jaws-0004', 20 * c.strength);
                UK.set(fx, 'CC Jaws-0005', 15 * c.strength);
                UK.set(fx, 'CC Jaws-0006', 3);
            });
        }
    });
    UK.add({
        id: 'trans.lightWipe', cat: 'trans', needs: 'trans', name: 'Light Wipe · Световая шторка',
        desc: 'Светящаяся шторка (CC Light Wipe) с засветкой по краю.',
        tags: 'light wipe glow световая шторка',
        apply: function (c) {
            wipePair(c, 'CC Light Wipe', 'Light Wipe', 'CC Light Wipe-0001', function (fx, L) {
                UK.set(fx, 'CC Light Wipe-0002', lcenter(L, c));
                UK.set(fx, 'CC Light Wipe-0003', 80 * c.strength);
                UK.set(fx, 'CC Light Wipe-0004', 2);
                UK.set(fx, 'CC Light Wipe-0005', horiz(c) ? 90 : 0);
                UK.set(fx, 'CC Light Wipe-0007', [1, 1, 1, 1]);
            });
        }
    });
    UK.add({
        id: 'trans.lineSweep', cat: 'trans', needs: 'trans', name: 'Line Sweep · Линейная шторка',
        desc: 'Шторка с наклоном и ступеньками (CC Line Sweep).',
        tags: 'line sweep wipe шторка наклон',
        apply: function (c) {
            wipePair(c, 'CC Line Sweep', 'Line Sweep', ['Completion', 'CC Line Sweep-0001'], function (fx) {
                UK.set(fx, 'CC Line Sweep-0002', { L: 90, R: 270, U: 0, D: 180 }[c.dirId]);
                UK.set(fx, 'CC Line Sweep-0003', Math.max(5, 40 * c.strength));
                UK.set(fx, 'CC Line Sweep-0004', 30);
            });
        }
    });
    UK.add({
        id: 'trans.radialScaleWipe', cat: 'trans', needs: 'trans', name: 'Radial Scale Wipe · Воронка',
        desc: 'Кадр втягивается в воронку / выходит из неё (CC Radial ScaleWipe).',
        tags: 'radial scale wipe vortex воронка',
        apply: function (c) {
            wipePair(c, 'CC Radial ScaleWipe', 'Radial Scale', 'CC Radial ScaleWipe-0001', function (fx, L) {
                UK.set(fx, 'CC Radial ScaleWipe-0002', lcenter(L, c));
            });
        }
    });
    UK.add({
        id: 'trans.scaleWipe', cat: 'trans', needs: 'trans', name: 'Scale Wipe · Растяжка за край',
        desc: 'Кадр растягивается за край по направлению (CC Scale Wipe) и тает.',
        tags: 'scale wipe stretch растяжка',
        apply: function (c) {
            need(c);
            var fx, s, dirDeg = { L: 270, R: 90, U: 0, D: 180 }[c.dirId];
            if (c.A) {
                fx = UK.addFx(c.A, 'CC Scale Wipe', 'Scale Wipe');
                UK.set(fx, 'CC Scale Wipe-0002', lcenter(c.A, c));
                UK.set(fx, 'CC Scale Wipe-0003', dirDeg);
                s = tA(c);
                UK.key2(UK.p(fx, 'CC Scale Wipe-0001'), s[0], 0, s[1], 30 * c.strength, 'expoIn');
                fadeOutA(c, s[0] + (s[1] - s[0]) * 0.5);
            }
            if (c.B) {
                fx = UK.addFx(c.B, 'CC Scale Wipe', 'Scale Wipe');
                UK.set(fx, 'CC Scale Wipe-0002', lcenter(c.B, c));
                UK.set(fx, 'CC Scale Wipe-0003', (dirDeg + 180) % 360);
                s = tB(c);
                UK.key2(UK.p(fx, 'CC Scale Wipe-0001'), s[0], 30 * c.strength, s[1], 0, 'expoOut');
                fadeInB(c, s[0] + (s[1] - s[0]) * 0.5);
            }
        }
    });
    UK.add({
        id: 'trans.twister', cat: 'trans', needs: 'trans', name: 'Twister · Скрутка',
        desc: 'Кадр скручивается в жгут и раскручивается (CC Twister).',
        tags: 'twister twist roll скрутка',
        apply: function (c) {
            wipePair(c, 'CC Twister', 'Twister', 'CC Twister-0005', function (fx, L) {
                UK.set(fx, 'CC Twister-0002', 1);
                UK.set(fx, 'CC Twister-0003', lcenter(L, c));
                UK.set(fx, 'CC Twister-0004', horiz(c) ? 0 : 90);
            });
        }
    });
    UK.add({
        id: 'trans.slideBlur', cat: 'trans', needs: 'trans', name: 'Slide Blur · Сдвиг с размытием',
        desc: 'Push-сдвиг слоёв с направленным размытием на каждом слое.',
        tags: 'slide blur push сдвиг размытие',
        apply: function (c) {
            need(c);
            var s, pos, base, mb, dd = horiz(c) ? 90 : 0;
            if (c.A) {
                pos = c.A.transform.position; base = pos.valueAtTime(c.cut, false); s = tA(c);
                UK.key2(pos, s[0], base, s[1], UK.vecAdd(base, UK.vecMul(c.dirV, UK.exitDistance(c.A, c.comp, c.dirV, c.cut))), 'expoIn');
                mb = UK.addFx(c.A, 'ADBE Motion Blur', 'Blur'); UK.set(mb, 'ADBE Motion Blur-0001', dd);
                UK.key2(UK.p(mb, 'ADBE Motion Blur-0002'), s[0], 0, s[1], 150 * c.strength, 'expoIn');
            }
            if (c.B) {
                pos = c.B.transform.position; base = pos.valueAtTime(c.t1, false); s = tB(c);
                var back = UK.vecMul(c.dirV, -1);
                UK.key2(pos, s[0], UK.vecAdd(base, UK.vecMul(back, UK.exitDistance(c.B, c.comp, back, c.cut))), s[1], base, 'expoOut');
                mb = UK.addFx(c.B, 'ADBE Motion Blur', 'Blur'); UK.set(mb, 'ADBE Motion Blur-0001', dd);
                UK.key2(UK.p(mb, 'ADBE Motion Blur-0002'), s[0], 150 * c.strength, s[1], 0, 'expoOut');
            }
        }
    });
    UK.add({
        id: 'trans.stripes', cat: 'trans', needs: 'trans', name: 'Stripe Slide · Полосы',
        desc: 'Корр. слой: кадр разрезается на полосы Venetian Blinds с размытием и сдвигом по направлению.',
        tags: 'stripes blinds slide полосы',
        apply: function (c) {
            var r = adjTT(c, 'Stripes', true);
            var vb = UK.addFx(r.adj, 'ADBE Venetian Blinds', 'Blinds');
            UK.set(vb, 'ADBE Venetian Blinds-0002', horiz(c) ? 0 : 90);
            UK.set(vb, 'ADBE Venetian Blinds-0003', Math.max(20, c.comp.height / 8));
            UK.set(vb, 'ADBE Venetian Blinds-0004', 4);
            sym(c, UK.p(vb, 'ADBE Venetian Blinds-0001'), 0, UK.clamp(55 * c.strength, 0, 95), 'Blinds', c.ease);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002');
            sym(c, pos, pos.value, UK.vecMul(c.dirV, 120 * c.strength), 'Shift', c.ease);
            dirBlur(c, r.adj, 80 * c.strength);
        }
    });

})();
