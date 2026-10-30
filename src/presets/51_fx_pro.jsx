// =============================================================================
//  Библиотека PRO: дизайнерские луки и оверлеи (cat: 'fx' / 'light')
//  Плёночные эмуляции, halation, анаморфные блики, боке, пыль, рамки, CRT/VHS pro,
//  градиентные оверлеи, погодные и световые оверлеи. Все параметры — через UK.cv.
// =============================================================================
(function () {

    // ---------------------------------------------------------------- хелперы
    function isAV(l) { return l instanceof AVLayer; }
    function col(r, g, b) { return [r, g, b, 1]; }
    /** Контекст контролов на вспомогательном слое (слайдеры живут на нём же). */
    function cs(c, layer) { return { opts: c.opts, layer: layer, strength: c.strength }; }
    /** Солид-оверлей на время слоя, поверх него. */
    function overlay(c, color, name) {
        var s = UK.solid(c.comp, color, name, c.layer.inPoint, c.layer.outPoint);
        s.moveBefore(c.layer);
        s.label = 9; // зелёный — оверлеи
        return s;
    }
    /** Значение + (опционально) слайдер, масштабирующий через выражение. */
    function drive(c, fx, prop, name, value) {
        UK.set(fx, prop, value);
        if (c.opts.controls) UK.expr(fx, prop, UK.cv(c, name, value));
    }
    function driveColor(c, fx, prop, name, value) {
        UK.set(fx, prop, value);
        if (c.opts.controls) UK.expr(fx, prop, UK.cv(c, name, value, 'color'));
    }
    /** Общий слайдер Amount (0–100) для лука: look(fx, prop, v) даёт v * Amount/100. */
    function amount(c, name) { return c.opts.controls ? UK.cv(c, name, 100) : null; }
    function look(fx, prop, value, amt) {
        UK.set(fx, prop, value);
        if (amt) UK.expr(fx, prop, UK.fmt(value, 3) + ' * ' + amt + ' / 100');
    }
    /** Прозрачность слоя через контрол. */
    function opacity(ctx, layer, name, value) {
        var ref = UK.cv(ctx, name, value);
        layer.transform.opacity.expression = 'Math.max(0, Math.min(100, ' + ref + '))';
    }
    /** Эллипс как Shape маски (bezier). */
    function ellipseShape(cx, cy, rx, ry) {
        var k = 0.5523, sh = new Shape();
        sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
        sh.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];
        sh.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];
        sh.closed = true;
        return sh;
    }
    /** Выражение createPath эллипса: cRef — строка-точка [x,y], rxRef/ryRef — строки. */
    function ellipseExpr(cRef, rxRef, ryRef) {
        return 'var c = ' + cRef + ', rx = ' + rxRef + ', ry = ' + ryRef + ', k = 0.5523;\n' +
            'var v = [[c[0], c[1] - ry], [c[0] + rx, c[1]], [c[0], c[1] + ry], [c[0] - rx, c[1]]];\n' +
            'var it = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];\n' +
            'var ot = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];\n' +
            'createPath(v, it, ot, true);';
    }
    function addMask(layer, shape, name) {
        var m = layer.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
        m.property('ADBE Mask Shape').setValue(shape);
        m.name = UK.PREFIX + (name || 'Mask');
        return m;
    }
    /** Fractal Noise с удобными параметрами. */
    function fractal(layer, nick, o) {
        var fn = UK.addFx(layer, 'ADBE Fractal Noise', nick);
        if (o.type != null) UK.set(fn, ['ADBE Fractal Noise-0001', 'Fractal Type'], o.type);
        if (o.noise != null) UK.set(fn, ['ADBE Fractal Noise-0002', 'Noise Type'], o.noise);
        if (o.invert != null) UK.set(fn, ['ADBE Fractal Noise-0003', 'Invert'], o.invert);
        if (o.contrast != null) UK.set(fn, ['ADBE Fractal Noise-0004', 'Contrast'], o.contrast);
        if (o.brightness != null) UK.set(fn, ['ADBE Fractal Noise-0005', 'Brightness'], o.brightness);
        if (o.overflow != null) UK.set(fn, ['ADBE Fractal Noise-0006', 'Overflow'], o.overflow);
        if (o.sw != null || o.sh != null) {
            UK.set(fn, ['ADBE Fractal Noise-0009', 'Uniform Scaling'], 0);
            if (o.sw != null) UK.set(fn, ['ADBE Fractal Noise-0011', 'Scale Width'], o.sw);
            if (o.sh != null) UK.set(fn, ['ADBE Fractal Noise-0012', 'Scale Height'], o.sh);
        } else if (o.scale != null) UK.set(fn, ['ADBE Fractal Noise-0010', 'Scale'], o.scale);
        if (o.complexity != null) UK.set(fn, ['ADBE Fractal Noise-0015', 'Complexity'], o.complexity);
        if (o.evo) UK.expr(fn, ['ADBE Fractal Noise-0022', 'Evolution'], o.evo);
        if (o.offset) UK.expr(fn, ['ADBE Fractal Noise-0013', 'Offset Turbulence'], o.offset);
        if (o.opacity != null) UK.set(fn, ['ADBE Fractal Noise-0027', 'Opacity'], o.opacity);
        return fn;
    }
    function glow(layer, nick, thr, rad, inten) {
        var g = UK.addFx(layer, 'ADBE Glo2', nick);
        UK.set(g, 'ADBE Glo2-0002', thr); UK.set(g, 'ADBE Glo2-0003', rad); UK.set(g, 'ADBE Glo2-0004', inten);
        return g;
    }
    function gauss(layer, nick, v) {
        var b = UK.addFx(layer, 'ADBE Gaussian Blur 2', nick);
        UK.set(b, 'ADBE Gaussian Blur 2-0001', v); UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
        return b;
    }
    function colorBalance(layer, nick, v) { // v = [sR,sG,sB, mR,mG,mB, hR,hG,hB]
        var cb = UK.addFx(layer, 'ADBE Color Balance 2', nick);
        for (var i = 0; i < 9; i++) UK.set(cb, 'ADBE Color Balance 2-000' + (i + 1), v[i]);
        UK.set(cb, 'ADBE Color Balance 2-0010', 1);
        return cb;
    }
    function cbLook(cb, v, amt) { for (var i = 0; i < 9; i++) look(cb, 'ADBE Color Balance 2-000' + (i + 1), v[i], amt); }
    function tritone(layer, nick, hi, mid, sh, blend) {
        var t = UK.addFx(layer, 'ADBE Tritone', nick);
        UK.set(t, 'ADBE Tritone-0001', hi); UK.set(t, 'ADBE Tritone-0002', mid); UK.set(t, 'ADBE Tritone-0003', sh);
        UK.set(t, 'ADBE Tritone-0004', blend);
        return t;
    }

    // ================================================================ ПЛЁНОЧНЫЕ ЭМУЛЯЦИИ
    UK.add({
        id: 'fx.proKodak', cat: 'fx', name: 'Film Kodak-like · Тёплая плёнка', preview: 'grade',
        desc: 'Тёплые кремовые света, глубокие чуть бирюзовые тени, сочность и мелкое зерно. Слайдер Amount.',
        tags: 'film kodak portra emulation плёнка эмуляция тёплая cinematic pro',
        apply: function (c) {
            var amt = amount(c, 'Kodak Amount'), k = c.strength;
            var cb = colorBalance(c.layer, 'Kodak Balance', [0, 0, 0, 0, 0, 0, 0, 0, 0]);
            cbLook(cb, [-10 * k, 2 * k, 14 * k, 6 * k, 2 * k, -4 * k, 16 * k, 8 * k, -14 * k], amt);
            var tt = tritone(c.layer, 'Kodak Tone', col(1, 0.95, 0.86), col(0.55, 0.5, 0.46), col(0.08, 0.1, 0.13), 100);
            UK.set(tt, 'ADBE Tritone-0004', 100 - 28 * k);
            if (amt) UK.expr(tt, 'ADBE Tritone-0004', '100 - ' + UK.fmt(28 * k) + ' * ' + amt + ' / 100');
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'Kodak Vibrance');
            look(vb, 'ADBE Vibrance-0001', 18 * k, amt); look(vb, 'ADBE Vibrance-0002', 4 * k, amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Kodak Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0002', 10 * k, amt); UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'Kodak Grain');
            look(nz, 'ADBE Noise2-0001', 4 * k, amt); UK.set(nz, 'ADBE Noise2-0002', 0); UK.set(nz, 'ADBE Noise2-0003', 1);
        }
    });

    UK.add({
        id: 'fx.proFuji', cat: 'fx', name: 'Film Fuji-like · Зелёная плёнка', preview: 'grade',
        desc: 'Зеленоватые тени, cyan в светах, мягкий контраст — лук в духе Fuji. Слайдер Amount.',
        tags: 'film fuji pro400h emulation плёнка зелёная cyan pro',
        apply: function (c) {
            var amt = amount(c, 'Fuji Amount'), k = c.strength;
            var cb = colorBalance(c.layer, 'Fuji Balance', [0, 0, 0, 0, 0, 0, 0, 0, 0]);
            cbLook(cb, [-6 * k, 14 * k, 4 * k, -4 * k, 8 * k, 2 * k, -12 * k, 6 * k, 14 * k], amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Fuji Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0001', 4 * k, amt); look(bc, 'ADBE Brightness & Contrast 2-0002', -8 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'Fuji Vibrance');
            look(vb, 'ADBE Vibrance-0001', 12 * k, amt); look(vb, 'ADBE Vibrance-0002', -6 * k, amt);
            var tt = tritone(c.layer, 'Fuji Tone', col(0.92, 0.98, 1), col(0.5, 0.54, 0.5), col(0.07, 0.11, 0.1), 100);
            UK.set(tt, 'ADBE Tritone-0004', 100 - 22 * k);
            if (amt) UK.expr(tt, 'ADBE Tritone-0004', '100 - ' + UK.fmt(22 * k) + ' * ' + amt + ' / 100');
        }
    });

    UK.add({
        id: 'fx.proBleach', cat: 'fx', name: 'Bleach Bypass Pro · Серебро', preview: 'grade',
        desc: 'Сильно сниженная насыщенность, жёсткий контраст и лёгкое серебристое свечение светов.',
        tags: 'bleach bypass silver retention контраст desaturate pro',
        apply: function (c) {
            var amt = amount(c, 'Bleach Amount'), k = c.strength;
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'Bleach Desat');
            look(hs, 'ADBE HUE SATURATION-0004', -50 * k, amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Bleach Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0002', 38 * k, amt); look(bc, 'ADBE Brightness & Contrast 2-0001', -4 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var g = glow(c.layer, 'Bleach Silver', 78, 60, 0.35 * k);
            if (amt) UK.expr(g, 'ADBE Glo2-0004', UK.fmt(0.35 * k, 3) + ' * ' + amt + ' / 100');
            var tt = tritone(c.layer, 'Bleach Tone', col(0.96, 0.96, 0.98), col(0.5, 0.5, 0.52), col(0.05, 0.05, 0.07), 100);
            UK.set(tt, 'ADBE Tritone-0004', 100 - 35 * k);
            if (amt) UK.expr(tt, 'ADBE Tritone-0004', '100 - ' + UK.fmt(35 * k) + ' * ' + amt + ' / 100');
        }
    });

    UK.add({
        id: 'fx.proTealOrange', cat: 'fx', name: 'Teal & Orange Pro · Блокбастер', preview: 'grade',
        desc: 'Разделение тонов: бирюза в тенях, оранжевый в светах через Tritone-смесь + Color Balance + Vibrance.',
        tags: 'teal orange blockbuster hollywood split toning кино pro',
        apply: function (c) {
            var amt = amount(c, 'T&O Amount'), k = c.strength;
            var tt = tritone(c.layer, 'T&O Split', col(1, 0.72, 0.42), col(0.5, 0.5, 0.5), col(0.02, 0.2, 0.26), 100);
            UK.set(tt, 'ADBE Tritone-0004', 100 - 45 * k);
            if (amt) UK.expr(tt, 'ADBE Tritone-0004', '100 - ' + UK.fmt(45 * k) + ' * ' + amt + ' / 100');
            if (c.opts.controls) {
                driveColor(c, tt, 'ADBE Tritone-0001', 'T&O Highlights', col(1, 0.72, 0.42));
                driveColor(c, tt, 'ADBE Tritone-0003', 'T&O Shadows', col(0.02, 0.2, 0.26));
            }
            var cb = colorBalance(c.layer, 'T&O Balance', [0, 0, 0, 0, 0, 0, 0, 0, 0]);
            cbLook(cb, [-18 * k, 6 * k, 26 * k, 4 * k, 0, -6 * k, 24 * k, 8 * k, -22 * k], amt);
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'T&O Vibrance');
            look(vb, 'ADBE Vibrance-0001', 30 * k, amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'T&O Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0002', 14 * k, amt); UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.proMoody', cat: 'fx', name: 'Moody Dark · Мрачный', preview: 'vignette',
        desc: 'Приглушённый тёмный лук: ниже яркость, выше контраст, меньше насыщенность, тяжёлая виньетка.',
        tags: 'moody dark cinematic desaturated vignette мрачный pro',
        apply: function (c) {
            var amt = amount(c, 'Moody Amount'), k = c.strength;
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Moody Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0001', -12 * k, amt); look(bc, 'ADBE Brightness & Contrast 2-0002', 24 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'Moody Desat');
            look(hs, 'ADBE HUE SATURATION-0004', -28 * k, amt);
            var cb = colorBalance(c.layer, 'Moody Balance', [0, 0, 0, 0, 0, 0, 0, 0, 0]);
            cbLook(cb, [-8 * k, 0, 12 * k, -4 * k, 0, 4 * k, 0, 0, 0], amt);
            var vg = UK.addFx(c.layer, 'CC Vignette', 'Moody Vignette');
            look(vg, 'CC Vignette-0001', 70 * k, amt); UK.set(vg, 'CC Vignette-0002', 55); UK.set(vg, 'CC Vignette-0004', 0);
        }
    });

    UK.add({
        id: 'fx.proGoldenHour', cat: 'fx', name: 'Golden Hour · Золотой час', preview: 'leak',
        desc: 'Тёплый фильтр, янтарные света, мягкое свечение бликов — свет заходящего солнца.',
        tags: 'golden hour sunset warm amber glow закат тёплый pro',
        apply: function (c) {
            var amt = amount(c, 'Golden Amount'), k = c.strength;
            var pf = UK.addFx(c.layer, 'ADBE Photo Filter', 'Golden Filter');
            UK.set(pf, 'ADBE Photo Filter-0001', 1);
            UK.set(pf, 'ADBE Photo Filter-0002', col(0.98, 0.62, 0.2));
            look(pf, 'ADBE Photo Filter-0003', 32 * k, amt); UK.set(pf, 'ADBE Photo Filter-0004', 1);
            if (c.opts.controls) driveColor(c, pf, 'ADBE Photo Filter-0002', 'Golden Color', col(0.98, 0.62, 0.2));
            var cb = colorBalance(c.layer, 'Golden Balance', [0, 0, 0, 0, 0, 0, 0, 0, 0]);
            cbLook(cb, [4 * k, 0, -6 * k, 8 * k, 2 * k, -8 * k, 18 * k, 10 * k, -16 * k], amt);
            var g = glow(c.layer, 'Golden Glow', 72, 120, 0.45 * k);
            if (amt) UK.expr(g, 'ADBE Glo2-0004', UK.fmt(0.45 * k, 3) + ' * ' + amt + ' / 100');
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'Golden Vibrance');
            look(vb, 'ADBE Vibrance-0001', 12 * k, amt);
        }
    });

    UK.add({
        id: 'fx.proMatte', cat: 'fx', name: 'Matte Fade · Приподнятые тени', preview: 'grade',
        desc: 'Лифт теней (матовые чёрные), чуть ниже контраст, серая примесь и мягкая сочность — модный «faded» лук.',
        tags: 'matte fade lifted blacks faded instagram матовый pro',
        apply: function (c) {
            var amt = amount(c, 'Matte Amount'), k = c.strength;
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Matte Lift');
            look(bc, 'ADBE Brightness & Contrast 2-0001', 9 * k, amt); look(bc, 'ADBE Brightness & Contrast 2-0002', -14 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var tn = UK.addFx(c.layer, 'ADBE Tint', 'Matte Tint');
            UK.set(tn, 'ADBE Tint-0001', col(0.12, 0.12, 0.14)); UK.set(tn, 'ADBE Tint-0002', col(0.95, 0.94, 0.92));
            look(tn, 'ADBE Tint-0003', 22 * k, amt);
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'Matte Vibrance');
            look(vb, 'ADBE Vibrance-0001', 14 * k, amt); look(vb, 'ADBE Vibrance-0002', -8 * k, amt);
        }
    });

    UK.add({
        id: 'fx.proPastelDream', cat: 'fx', name: 'Pastel Dream · Пастельный сон', preview: 'glow',
        desc: 'Светлый, малонасыщенный лук с розовым фильтром и широким мягким свечением.',
        tags: 'pastel dream soft pink airy light пастель pro',
        apply: function (c) {
            var amt = amount(c, 'Pastel Amount'), k = c.strength;
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'Pastel HSL');
            look(hs, 'ADBE HUE SATURATION-0004', -18 * k, amt); look(hs, 'ADBE HUE SATURATION-0005', 10 * k, amt);
            var pf = UK.addFx(c.layer, 'ADBE Photo Filter', 'Pastel Filter');
            UK.set(pf, 'ADBE Photo Filter-0002', col(1, 0.72, 0.82)); look(pf, 'ADBE Photo Filter-0003', 18 * k, amt); UK.set(pf, 'ADBE Photo Filter-0004', 1);
            if (c.opts.controls) driveColor(c, pf, 'ADBE Photo Filter-0002', 'Pastel Color', col(1, 0.72, 0.82));
            var g = glow(c.layer, 'Pastel Glow', 55, 220, 0.4 * k);
            if (amt) UK.expr(g, 'ADBE Glo2-0004', UK.fmt(0.4 * k, 3) + ' * ' + amt + ' / 100');
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Pastel Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0002', -12 * k, amt); UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.proInfrared', cat: 'fx', name: 'Infrared · Инфракрасный', preview: 'grade',
        desc: 'Channel Mixer: зелень уходит в розово-белое, небо темнеет — эффект ИК-плёнки (Aerochrome).',
        tags: 'infrared aerochrome channel mixer ик сюрреализм pro',
        apply: function (c) {
            var amt = amount(c, 'IR Amount'), k = c.strength;
            var cm = UK.addFx(c.layer, 'ADBE CHANNEL MIXER', 'IR Mixer');
            // Red <- Green, Green <- Red (частично), Blue <- Blue приглушён
            look(cm, 'ADBE CHANNEL MIXER-0001', 100 - 110 * k, amt); look(cm, 'ADBE CHANNEL MIXER-0002', 170 * k, amt);
            look(cm, 'ADBE CHANNEL MIXER-0005', 60 * k, amt); look(cm, 'ADBE CHANNEL MIXER-0006', 100 - 50 * k, amt);
            look(cm, 'ADBE CHANNEL MIXER-0011', 100 - 20 * k, amt); look(cm, 'ADBE CHANNEL MIXER-0010', 20 * k, amt);
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'IR Vibrance');
            look(vb, 'ADBE Vibrance-0001', 20 * k, amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'IR Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0002', 12 * k, amt); UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.proNoir', cat: 'fx', name: 'Noir · Нуар', preview: 'vignette',
        desc: 'Ч/б с плотными тенями, зерном и тяжёлой виньеткой. Red-фильтр для драматичного неба.',
        tags: 'noir black white film grain vignette нуар чб pro',
        apply: function (c) {
            var amt = amount(c, 'Noir Amount'), k = c.strength;
            var bw = UK.addFx(c.layer, 'ADBE Black&White', 'Noir B&W');
            UK.set(bw, 'ADBE Black&White-0001', 70); UK.set(bw, 'ADBE Black&White-0002', 60); UK.set(bw, 'ADBE Black&White-0003', 30);
            UK.set(bw, 'ADBE Black&White-0004', 20); UK.set(bw, 'ADBE Black&White-0005', 10); UK.set(bw, 'ADBE Black&White-0006', 60);
            UK.set(bw, 'ADBE Black&White-0007', 0);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Noir Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0002', 40 * k, amt); look(bc, 'ADBE Brightness & Contrast 2-0001', -6 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'Noir Grain');
            look(nz, 'ADBE Noise2-0001', 9 * k, amt); UK.set(nz, 'ADBE Noise2-0002', 0); UK.set(nz, 'ADBE Noise2-0003', 1);
            var vg = UK.addFx(c.layer, 'CC Vignette', 'Noir Vignette');
            look(vg, 'CC Vignette-0001', 85 * k, amt); UK.set(vg, 'CC Vignette-0002', 50); UK.set(vg, 'CC Vignette-0004', 0);
        }
    });

    UK.add({
        id: 'fx.proDuotoneMap', cat: 'fx', name: 'Duotone Gradient Map · Карта градиента', preview: 'grade',
        desc: 'Изображение переводится в два цвета (тени → света) как gradient map. Цвета — Color Control.',
        tags: 'duotone gradient map two color spotify дуотон pro',
        apply: function (c) {
            var sh = col(0.08, 0.02, 0.35), hi = col(1, 0.55, 0.2);
            var tn = UK.addFx(c.layer, 'ADBE Tint', 'Duotone Desat');
            UK.set(tn, 'ADBE Tint-0003', 100);
            var tt = tritone(c.layer, 'Duotone Map', hi, col(0.52, 0.28, 0.3), sh, 0);
            driveColor(c, tt, 'ADBE Tritone-0001', 'Duotone Highlights', hi);
            driveColor(c, tt, 'ADBE Tritone-0003', 'Duotone Shadows', sh);
            if (c.opts.controls) UK.expr(tt, 'ADBE Tritone-0002', 'var a = ' + UK.ref('Duotone Highlights', 'color') + ', b = ' + UK.ref('Duotone Shadows', 'color') + ';\n(a + b) / 2');
            drive(c, tt, 'ADBE Tritone-0004', 'Duotone Blend', Math.max(0, 100 - 100 * c.strength));
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Duotone Contrast');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0002', 15); UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            bc.moveTo(1);
        }
    });

    UK.add({
        id: 'fx.proTritonePoster', cat: 'fx', name: 'Tritone Poster · Постер', preview: 'grade',
        desc: 'Постеризация до 5 уровней + три ярких цвета — плакатный поп-арт.',
        tags: 'poster tritone posterize pop art warhol плакат pro',
        apply: function (c) {
            var ps = UK.addFx(c.layer, 'ADBE Posterize', 'Poster Levels');
            drive(c, ps, 'ADBE Posterize-0001', 'Poster Levels', Math.max(2, Math.round(6 - 2 * c.strength)));
            var tt = tritone(c.layer, 'Poster Tone', col(1, 0.9, 0.2), col(0.9, 0.2, 0.45), col(0.1, 0.1, 0.4), 0);
            driveColor(c, tt, 'ADBE Tritone-0001', 'Poster Highlights', col(1, 0.9, 0.2));
            driveColor(c, tt, 'ADBE Tritone-0002', 'Poster Midtones', col(0.9, 0.2, 0.45));
            driveColor(c, tt, 'ADBE Tritone-0003', 'Poster Shadows', col(0.1, 0.1, 0.4));
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Poster Contrast');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0002', 25); UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            bc.moveTo(1);
        }
    });

    // ================================================================ ОПТИКА: HALATION / FLARE / BOKEH / MIST
    UK.add({
        id: 'fx.proHalation', cat: 'fx', name: 'Halation · Красное гало', preview: 'glow',
        desc: 'Плёночная засветка: копия слоя в Add, только красный канал, размыт и светится — красноватое гало вокруг ярких областей.',
        tags: 'halation film red glow bloom гало плёнка pro',
        apply: function (c) {
            if (!isAV(c.layer)) {
                var g0 = glow(c.layer, 'Halation', 72, 90, 0.6 * c.strength);
                UK.set(g0, 'ADBE Glo2-0007', 2); UK.set(g0, 'ADBE Glo2-0012', col(1, 0.25, 0.1)); UK.set(g0, 'ADBE Glo2-0013', col(1, 0.6, 0.3));
                drive(c, g0, 'ADBE Glo2-0004', 'Halation Intensity', 0.6 * c.strength);
                return;
            }
            var d = c.layer.duplicate();
            d.name = UK.PREFIX + 'Halation ' + c.layer.name;
            d.blendingMode = BlendingMode.ADD;
            var k = cs(c, d);
            var sc = UK.addFx(d, 'ADBE Shift Channels', 'Halation Red');
            UK.set(sc, 'ADBE Shift Channels-0002', 1); UK.set(sc, 'ADBE Shift Channels-0003', 10); UK.set(sc, 'ADBE Shift Channels-0004', 10);
            var g = glow(d, 'Halation Glow', 70, 80, 1.2 * c.strength);
            if (c.opts.controls) UK.expr(g, 'ADBE Glo2-0002', UK.cv(k, 'Halation Threshold', 70));
            var b = gauss(d, 'Halation Blur', 18 * c.strength);
            if (c.opts.controls) UK.expr(b, 'ADBE Gaussian Blur 2-0001', UK.cv(k, 'Halation Spread', 18 * c.strength));
            opacity(k, d, 'Halation Opacity', 45 * c.strength);
        }
    });

    UK.add({
        id: 'light.proAnamorphic', cat: 'light', name: 'Anamorphic Streak · Анаморфный блик', preview: 'flash',
        desc: 'Горизонтальная синяя полоса-блик (Ellipse + Directional Blur, Add). Позиция, цвет, длина и яркость — контролы на слое блика.',
        tags: 'anamorphic flare streak lens blue horizontal анаморф блик pro',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height;
            var s = overlay(c, [0, 0, 0], 'Anamorphic Streak');
            var k = cs(c, s);
            s.blendingMode = BlendingMode.ADD;
            var el = UK.addFx(s, 'ADBE Ellipse', 'Streak Core');
            UK.set(el, 'ADBE Ellipse-0001', [W / 2, H / 2]);
            UK.set(el, 'ADBE Ellipse-0002', W * 0.35); UK.set(el, 'ADBE Ellipse-0003', 6);
            UK.set(el, 'ADBE Ellipse-0004', 60);
            UK.set(el, 'ADBE Ellipse-0005', col(0.45, 0.7, 1)); UK.set(el, 'ADBE Ellipse-0006', col(0, 0, 0));
            UK.set(el, 'ADBE Ellipse-0007', 0);
            if (c.opts.controls) {
                UK.expr(el, 'ADBE Ellipse-0001', UK.cv(k, 'Streak Position', [W / 2, H / 2], 'point'));
                UK.expr(el, 'ADBE Ellipse-0002', UK.cv(k, 'Streak Length', W * 0.35));
                UK.expr(el, 'ADBE Ellipse-0005', UK.cv(k, 'Streak Color', col(0.45, 0.7, 1), 'color'));
            }
            var db = UK.addFx(s, 'ADBE Motion Blur', 'Streak Blur');
            UK.set(db, 'ADBE Motion Blur-0001', 90); UK.set(db, 'ADBE Motion Blur-0002', 260 * c.strength);
            if (c.opts.controls) UK.expr(db, 'ADBE Motion Blur-0002', UK.cv(k, 'Streak Softness', 260 * c.strength));
            var g = glow(s, 'Streak Glow', 20, 120, 1.5);
            opacity(k, s, 'Streak Opacity', 80 * c.strength);
        }
    });

    UK.add({
        id: 'light.proBokeh', cat: 'light', name: 'Bokeh Overlay · Боке', preview: 'glow',
        desc: 'Плывущие размытые круги света (Cell Pattern Bubbles + Blur + Glow, режим Add). Цвет, размер, скорость, прозрачность — контролы.',
        tags: 'bokeh lights overlay particles blur боке огни pro',
        apply: function (c) {
            var s = overlay(c, [0, 0, 0], 'Bokeh');
            var k = cs(c, s);
            s.blendingMode = BlendingMode.ADD;
            var cp = UK.addFx(s, 'ADBE Cell Pattern', 'Bokeh Cells');
            UK.set(cp, 'ADBE Cell Pattern-0001', 1);     // Bubbles
            UK.set(cp, 'ADBE Cell Pattern-0003', 320);   // Contrast
            UK.set(cp, 'ADBE Cell Pattern-0004', 1);     // Overflow: Clip
            UK.set(cp, 'ADBE Cell Pattern-0005', 1.1);   // Disperse
            UK.set(cp, 'ADBE Cell Pattern-0006', 140 * c.strength);
            var speed = UK.cv(k, 'Bokeh Speed', 6);
            UK.expr(cp, ['ADBE Cell Pattern-0012', 'Evolution'], 'time * ' + speed);
            UK.expr(cp, 'ADBE Cell Pattern-0007', 'value + [0, -time * ' + speed + ' * 3]');
            if (c.opts.controls) UK.expr(cp, 'ADBE Cell Pattern-0006', UK.cv(k, 'Bokeh Size', 140 * c.strength));
            gauss(s, 'Bokeh Blur', 22);
            var tn = UK.addFx(s, 'ADBE Tint', 'Bokeh Color');
            UK.set(tn, 'ADBE Tint-0001', col(0, 0, 0)); UK.set(tn, 'ADBE Tint-0002', col(1, 0.8, 0.5));
            if (c.opts.controls) UK.expr(tn, 'ADBE Tint-0002', UK.cv(k, 'Bokeh Color', col(1, 0.8, 0.5), 'color'));
            glow(s, 'Bokeh Glow', 40, 80, 1.2);
            opacity(k, s, 'Bokeh Opacity', 55 * c.strength);
        }
    });

    UK.add({
        id: 'fx.proMist', cat: 'fx', name: 'Pro-Mist · Диффузионный фильтр', preview: 'glow',
        desc: 'Имитация Black Pro-Mist: размытая копия в Screen + лёгкое свечение, света расплываются.',
        tags: 'pro mist diffusion filter bloom halo дымка фильтр pro',
        apply: function (c) {
            if (!isAV(c.layer)) {
                var g0 = glow(c.layer, 'Pro-Mist', 50, 180, 0.5 * c.strength);
                drive(c, g0, 'ADBE Glo2-0004', 'Mist Intensity', 0.5 * c.strength);
                return;
            }
            var d = c.layer.duplicate();
            d.name = UK.PREFIX + 'Pro-Mist ' + c.layer.name;
            d.blendingMode = BlendingMode.SCREEN;
            var k = cs(c, d);
            var b = gauss(d, 'Mist Blur', 40 * c.strength);
            if (c.opts.controls) UK.expr(b, 'ADBE Gaussian Blur 2-0001', UK.cv(k, 'Mist Blur', 40 * c.strength));
            var bc = UK.addFx(d, 'ADBE Brightness & Contrast 2', 'Mist Levels');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0001', -20); UK.set(bc, 'ADBE Brightness & Contrast 2-0002', 30);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            opacity(k, d, 'Mist Opacity', 40 * c.strength);
        }
    });

    UK.add({
        id: 'fx.proBeauty', cat: 'fx', name: 'Soft Skin · Бьюти-смягчение', preview: 'blurIn',
        desc: 'Мягкая копия слоя в режиме Lighten с низкой прозрачностью — сглаживает кожу, сохраняя детали.',
        tags: 'beauty soft skin smooth retouch бьюти кожа pro',
        apply: function (c) {
            if (!isAV(c.layer)) {
                var bl = UK.addFx(c.layer, 'ADBE Bilateral', 'Soft Skin');
                UK.set(bl, ['ADBE Bilateral-0001', 'Radius'], 8 * c.strength);
                UK.set(bl, ['ADBE Bilateral-0002', 'Threshold'], 12);
                return;
            }
            var d = c.layer.duplicate();
            d.name = UK.PREFIX + 'Soft Skin ' + c.layer.name;
            d.blendingMode = BlendingMode.LIGHTEN;
            var k = cs(c, d);
            var b = gauss(d, 'Skin Blur', 14 * c.strength);
            if (c.opts.controls) UK.expr(b, 'ADBE Gaussian Blur 2-0001', UK.cv(k, 'Skin Blur', 14 * c.strength));
            opacity(k, d, 'Skin Opacity', 45 * c.strength);
        }
    });

    UK.add({
        id: 'fx.proSharpen', cat: 'fx', name: 'Sharpen Pro · Резкость + микроблеск', preview: 'grade',
        desc: 'Unsharp Mask с малым радиусом + едва заметное свечение светов — хрустящая, но не «цифровая» резкость.',
        tags: 'sharpen crisp detail unsharp резкость pro',
        apply: function (c) {
            var um = UK.addFx(c.layer, 'ADBE Unsharp Mask2', 'Sharpen');
            drive(c, um, 'ADBE Unsharp Mask2-0001', 'Sharpen Amount', 70 * c.strength);
            UK.set(um, 'ADBE Unsharp Mask2-0002', 1.6); UK.set(um, 'ADBE Unsharp Mask2-0003', 2);
            var g = glow(c.layer, 'Sharpen Shine', 85, 12, 0.18 * c.strength);
        }
    });

    UK.add({
        id: 'fx.proClarity', cat: 'fx', name: 'Clarity · Локальный контраст', preview: 'grade',
        desc: 'Unsharp Mask с большим радиусом и малой силой — «Clarity» как в Lightroom, плюс немного Vibrance.',
        tags: 'clarity local contrast structure midtone детализация pro',
        apply: function (c) {
            var um = UK.addFx(c.layer, 'ADBE Unsharp Mask2', 'Clarity');
            drive(c, um, 'ADBE Unsharp Mask2-0001', 'Clarity Amount', 28 * c.strength);
            UK.set(um, 'ADBE Unsharp Mask2-0002', 60); UK.set(um, 'ADBE Unsharp Mask2-0003', 0);
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'Clarity Vibrance');
            UK.set(vb, 'ADBE Vibrance-0001', 10 * c.strength);
        }
    });

    // ================================================================ ТЕКСТУРЫ / ОВЕРЛЕИ
    UK.add({
        id: 'fx.proDust', cat: 'fx', name: 'Dust & Scratches · Пыль и царапины', preview: 'grain',
        desc: 'Оверлей: редкие белые пылинки (случайные по кадрам) и тонкие вертикальные царапины, режим Screen.',
        tags: 'dust scratches film overlay old пыль царапины плёнка pro',
        apply: function (c) {
            var s = overlay(c, [0, 0, 0], 'Dust & Scratches');
            var k = cs(c, s);
            s.blendingMode = BlendingMode.SCREEN;
            // пылинки
            fractal(s, 'Dust', { type: 1, noise: 1, contrast: 420, brightness: -230, overflow: 1, scale: 14, complexity: 2,
                evo: 'posterizeTime(' + UK.fmt(Math.max(2, 10 * c.strength)) + '); random() * 3000' });
            // царапины — второй Fractal Noise в режиме Screen
            var sc = fractal(s, 'Scratches', { type: 1, noise: 1, contrast: 600, brightness: -300, overflow: 1, sw: 3, sh: 6000, complexity: 1,
                evo: 'posterizeTime(3); random() * 500', offset: 'posterizeTime(3); [random() * 2000, 0]' });
            UK.set(sc, ['ADBE Fractal Noise-0028', 'Blending Mode'], 5); // Screen
            var d = UK.cv(k, 'Dust Amount', 100 * c.strength);
            var nz = UK.addFx(s, 'ADBE Noise2', 'Dust Fine');
            UK.set(nz, 'ADBE Noise2-0001', 6); UK.set(nz, 'ADBE Noise2-0002', 0); UK.set(nz, 'ADBE Noise2-0003', 1);
            s.transform.opacity.expression = 'Math.max(0, Math.min(100, ' + d + ' * 0.7))';
        }
    });

    UK.add({
        id: 'light.proLeakPro', cat: 'light', name: 'Light Leak Pro · Двойная засветка', preview: 'leak',
        desc: 'Два слоя плывущих засветок разных цветов (тёплый + пурпурно-бирюзовый) в режиме Add с медленным дрейфом.',
        tags: 'light leak pro double warm magenta teal засветка плёнка pro',
        apply: function (c) {
            function leak(name, color, sw, sh, speed, op, seedOff) {
                var s = overlay(c, [0, 0, 0], name);
                var k = cs(c, s);
                s.blendingMode = BlendingMode.ADD;
                var sp = UK.cv(k, name + ' Speed', speed);
                fractal(s, name + ' Noise', { type: 1, noise: 3, contrast: 80, brightness: -30, sw: sw, sh: sh, complexity: 2,
                    evo: UK.fmt(seedOff) + ' + time * ' + sp, offset: 'value + [time * ' + sp + ' * 3, time * ' + sp + ']' });
                var tn = UK.addFx(s, 'ADBE Tint', name + ' Color');
                UK.set(tn, 'ADBE Tint-0001', col(0, 0, 0)); UK.set(tn, 'ADBE Tint-0002', color);
                if (c.opts.controls) UK.expr(tn, 'ADBE Tint-0002', UK.cv(k, name + ' Color', color, 'color'));
                gauss(s, name + ' Soft', 60);
                opacity(k, s, name + ' Opacity', op * c.strength);
            }
            leak('Leak Warm', col(1, 0.62, 0.25), 1100, 400, 30, 60, 0);
            leak('Leak Cool', col(0.85, 0.25, 0.7), 700, 900, 18, 35, 400);
        }
    });

    UK.add({
        id: 'fx.proFilmBorder', cat: 'fx', name: 'Film Frame 8mm · Рамка плёнки', preview: 'letterbox',
        desc: 'Чёрная рамка с рваными краями (Roughen Edges) и лёгким дрожанием — кадр Super 8.',
        tags: 'film frame 8mm 16mm border roughen edges рамка плёнка pro',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height;
            var s = overlay(c, [0, 0, 0], 'Film Frame');
            var k = cs(c, s);
            var ins = Math.round(Math.min(W, H) * 0.05 * c.strength);
            var sh = new Shape();
            sh.vertices = [[ins, ins], [W - ins, ins], [W - ins, H - ins], [ins, H - ins]];
            sh.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]]; sh.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.closed = true;
            var m = addMask(s, sh, 'Frame Cutout');
            m.inverted = true;
            m.property('ADBE Mask Feather').setValue([3, 3]);
            if (c.opts.controls) {
                var ref = UK.cv(k, 'Frame Inset', ins);
                m.property('ADBE Mask Shape').expression = 'var i = ' + ref + ', w = thisLayer.width, h = thisLayer.height;\n' +
                    'createPath([[i, i], [w - i, i], [w - i, h - i], [i, h - i]], [], [], true);';
            }
            var re = UK.addFx(s, 'ADBE Roughen Edges', 'Frame Roughen');
            UK.set(re, 'ADBE Roughen Edges-0001', 1);
            UK.set(re, 'ADBE Roughen Edges-0003', 22 * c.strength);
            UK.set(re, 'ADBE Roughen Edges-0004', 1.2);
            UK.set(re, 'ADBE Roughen Edges-0006', 60);
            UK.expr(re, 'ADBE Roughen Edges-0010', 'posterizeTime(8); time * 300');
            var wig = UK.cv(k, 'Frame Weave', 3 * c.strength);
            s.transform.position.expression = 'wiggle(6, ' + wig + ')';
        }
    });

    UK.add({
        id: 'fx.proGateWeave', cat: 'fx', name: 'Gate Weave · Дрожание кинопроектора', preview: 'shake',
        desc: 'Мелкое плавание кадра по позиции и повороту, как у кинопроектора. Амплитуда и частота — контролы.',
        tags: 'gate weave projector jitter film wobble дрожание проектор pro',
        apply: function (c) {
            var amp = UK.cv(c, 'Weave Amount', 3 * c.strength), fr = UK.cv(c, 'Weave Freq', 2.5);
            c.layer.transform.position.expression = 'wiggle(' + fr + ', ' + amp + ')';
            c.layer.transform.rotation.expression = 'wiggle(' + fr + ', ' + amp + ' * 0.05)';
            var sc = c.layer.transform.scale;
            sc.expression = 'var w = wiggle(' + fr + ', ' + amp + ' * 0.08);\n[value[0] + (w[0] - value[0]), value[1] + (w[0] - value[0])]';
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'fx.proFlickerExposure', cat: 'fx', name: 'Exposure Flicker · Мерцание экспозиции', preview: 'strobe',
        desc: 'Случайное колебание экспозиции (Exposure wiggle) — плёночное мерцание. Амплитуда и частота — контролы.',
        tags: 'flicker exposure film frame мерцание экспозиция pro',
        apply: function (c) {
            var ex = UK.addFx(c.layer, 'ADBE Exposure2', 'Exposure Flicker');
            var amp = UK.cv(c, 'Flicker Amount', 0.18 * c.strength), fr = UK.cv(c, 'Flicker Freq', 9);
            UK.set(ex, ['ADBE Exposure2-0003', 'Exposure'], 0);
            UK.expr(ex, ['ADBE Exposure2-0003', 'Exposure'], 'wiggle(' + fr + ', ' + amp + ')[0] - 0');
        }
    });

    UK.add({
        id: 'fx.proCRT', cat: 'fx', name: 'CRT Monitor · Кинескоп', preview: 'rgb',
        desc: 'Тонкие строки развёртки (Grid), бочкообразное искажение, RGB-разделение по краям, виньетка и лёгкое свечение.',
        tags: 'crt monitor tv scanlines bulge rgb retro кинескоп pro',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height, k = c.strength;
            var gr = UK.addFx(c.layer, 'ADBE Grid', 'CRT Scanlines');
            UK.set(gr, 'ADBE Grid-0001', [0, 0]);
            UK.set(gr, 'ADBE Grid-0002', 3);
            UK.set(gr, 'ADBE Grid-0004', W * 4); UK.set(gr, 'ADBE Grid-0005', 3);
            UK.set(gr, 'ADBE Grid-0006', 1.2);
            UK.set(gr, 'ADBE Grid-0011', col(0, 0, 0));
            drive(c, gr, 'ADBE Grid-0012', 'CRT Lines Opacity', 38 * k);
            UK.set(gr, 'ADBE Grid-0013', 2);
            var cbl = UK.addFx(c.layer, 'ADBE Channel Blur', 'CRT Fringe');
            drive(c, cbl, 'ADBE Channel Blur-0001', 'CRT Fringe', 3 * k);
            UK.set(cbl, 'ADBE Channel Blur-0003', 2 * k); UK.set(cbl, 'ADBE Channel Blur-0005', 1); UK.set(cbl, 'ADBE Channel Blur-0006', 2);
            var bg = UK.addFx(c.layer, 'ADBE Bulge', 'CRT Curve');
            UK.set(bg, 'ADBE Bulge-0001', W * 0.78); UK.set(bg, 'ADBE Bulge-0002', H * 0.78);
            UK.set(bg, 'ADBE Bulge-0003', [W / 2, H / 2]);
            drive(c, bg, 'ADBE Bulge-0004', 'CRT Curvature', 0.35 * k);
            UK.set(bg, 'ADBE Bulge-0007', 1);
            var vg = UK.addFx(c.layer, 'CC Vignette', 'CRT Vignette');
            UK.set(vg, 'CC Vignette-0001', 55 * k); UK.set(vg, 'CC Vignette-0002', 60); UK.set(vg, 'CC Vignette-0004', 0);
            glow(c.layer, 'CRT Phosphor', 70, 25, 0.25 * k);
        }
    });

    UK.add({
        id: 'fx.proVHS', cat: 'fx', name: 'VHS Pro · Кассета с трекингом', preview: 'glitch',
        desc: 'Тонкая волна, хроматический смаз по горизонтали, цветной шум HLS и бегущая полоса трекинга (отдельный слой).',
        tags: 'vhs pro tracking tape noise retro кассета полоса pro',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height, k = c.strength;
            var ww = UK.addFx(c.layer, 'ADBE Wave Warp', 'VHS Wave');
            UK.set(ww, 'ADBE Wave Warp-0001', 1);
            drive(c, ww, 'ADBE Wave Warp-0002', 'VHS Wave', 2.5 * k);
            UK.set(ww, 'ADBE Wave Warp-0003', 600); UK.set(ww, 'ADBE Wave Warp-0004', 90); UK.set(ww, 'ADBE Wave Warp-0005', 0.4);
            UK.set(ww, 'ADBE Wave Warp-0006', 1); UK.set(ww, 'ADBE Wave Warp-0008', 1);
            var cbl = UK.addFx(c.layer, 'ADBE Channel Blur', 'VHS Chroma');
            drive(c, cbl, 'ADBE Channel Blur-0001', 'VHS Chroma Smear', 6 * k);
            UK.set(cbl, 'ADBE Channel Blur-0003', 6 * k); UK.set(cbl, 'ADBE Channel Blur-0005', 1); UK.set(cbl, 'ADBE Channel Blur-0006', 2);
            var nh = UK.addFx(c.layer, 'ADBE Noise HLS2', 'VHS Noise');
            UK.set(nh, 'ADBE Noise HLS2-0001', 1);
            drive(c, nh, 'ADBE Noise HLS2-0003', 'VHS Noise', 14 * k);
            UK.set(nh, 'ADBE Noise HLS2-0004', 10 * k); UK.set(nh, 'ADBE Noise HLS2-0005', 2);
            UK.expr(nh, 'ADBE Noise HLS2-0006', 'time * 900');
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'VHS Desat');
            UK.set(hs, 'ADBE HUE SATURATION-0004', -12 * k);
            // полоса трекинга
            var s = overlay(c, [1, 1, 1], 'VHS Tracking Bar');
            var kk = cs(c, s);
            s.blendingMode = BlendingMode.SCREEN;
            var bh = Math.round(H * 0.04);
            var sh = new Shape();
            sh.vertices = [[0, 0], [W, 0], [W, bh], [0, bh]];
            sh.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]]; sh.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.closed = true;
            var m = addMask(s, sh, 'Tracking Strip');
            m.property('ADBE Mask Feather').setValue([0, 12]);
            var nz = UK.addFx(s, 'ADBE Noise2', 'Tracking Noise');
            UK.set(nz, 'ADBE Noise2-0001', 60); UK.set(nz, 'ADBE Noise2-0002', 0); UK.set(nz, 'ADBE Noise2-0003', 1);
            var sp = UK.cv(kk, 'Tracking Speed', 0.35), per = UK.cv(kk, 'Tracking Period', 4);
            s.transform.position.expression = 'var p = ' + per + ', s = ' + sp + ';\nvar t = (time * s) % p;\n' +
                'var y = linear(t, 0, Math.min(p, 1.2), thisComp.height + 60, -60);\n[value[0], value[1] - thisComp.height / 2 + y]';
            opacity(kk, s, 'Tracking Opacity', 22 * k);
        }
    });

    UK.add({
        id: 'fx.proGlitchTexture', cat: 'fx', name: 'Glitch Texture · Постоянный лёгкий глитч', preview: 'glitch',
        desc: 'Скрытая карта (Fractal Noise Block, ступенчатая по времени) смещает слой по горизонтали — живая цифровая текстура.',
        tags: 'glitch texture displacement datamosh digital постоянный глитч pro',
        apply: function (c) {
            var map = UK.solid(c.comp, [0.5, 0.5, 0.5], 'Glitch Map ' + c.layer.name, c.layer.inPoint, c.layer.outPoint);
            map.moveBefore(c.layer);
            map.enabled = false;
            fractal(map, 'Glitch Blocks', { type: 1, noise: 1, contrast: 260, brightness: 0, overflow: 1, sw: 2600, sh: 26, complexity: 1,
                evo: 'posterizeTime(' + UK.fmt(Math.max(2, 6 * c.strength)) + '); random() * 4000', offset: 'posterizeTime(6); [random() * 3000, random() * 3000]' });
            var dm = UK.addFx(c.layer, 'ADBE Displacement Map', 'Glitch Displace');
            UK.set(dm, 'ADBE Displacement Map-0001', map.index);
            UK.set(dm, 'ADBE Displacement Map-0002', 5);
            drive(c, dm, 'ADBE Displacement Map-0003', 'Glitch Amount', 22 * c.strength);
            UK.set(dm, 'ADBE Displacement Map-0004', 10);
            UK.set(dm, 'ADBE Displacement Map-0005', 0);
            UK.set(dm, 'ADBE Displacement Map-0006', 2);
            UK.set(dm, 'ADBE Displacement Map-0007', 2);
            var cbl = UK.addFx(c.layer, 'ADBE Channel Blur', 'Glitch Fringe');
            UK.set(cbl, 'ADBE Channel Blur-0001', 2 * c.strength); UK.set(cbl, 'ADBE Channel Blur-0003', 2 * c.strength);
            UK.set(cbl, 'ADBE Channel Blur-0005', 1); UK.set(cbl, 'ADBE Channel Blur-0006', 2);
        }
    });

    UK.add({
        id: 'fx.proGradientOverlay', cat: 'fx', name: 'Gradient Overlay · Цветной градиент', preview: 'grade',
        desc: 'Двухцветный градиент поверх (Overlay). Цвета, направление и прозрачность — контролы на слое градиента.',
        tags: 'gradient overlay duotone color wash instagram градиент pro',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height;
            var s = overlay(c, [0, 0, 0], 'Gradient Overlay');
            var k = cs(c, s);
            s.blendingMode = BlendingMode.OVERLAY;
            var rp = UK.addFx(s, 'ADBE Ramp', 'Gradient');
            var a = col(0.95, 0.35, 0.25), b = col(0.2, 0.3, 0.95);
            var p0 = c.dirV[0] !== 0 ? [c.dirV[0] < 0 ? 0 : W, H / 2] : [W / 2, c.dirV[1] < 0 ? 0 : H];
            var p1 = [W - p0[0], H - p0[1]];
            UK.set(rp, 'ADBE Ramp-0001', p0); UK.set(rp, 'ADBE Ramp-0003', p1);
            UK.set(rp, 'ADBE Ramp-0002', a); UK.set(rp, 'ADBE Ramp-0004', b);
            UK.set(rp, 'ADBE Ramp-0005', 1); UK.set(rp, 'ADBE Ramp-0006', 10);
            if (c.opts.controls) {
                UK.expr(rp, 'ADBE Ramp-0002', UK.cv(k, 'Gradient Color A', a, 'color'));
                UK.expr(rp, 'ADBE Ramp-0004', UK.cv(k, 'Gradient Color B', b, 'color'));
                UK.expr(rp, 'ADBE Ramp-0001', UK.cv(k, 'Gradient Start', p0, 'point'));
                UK.expr(rp, 'ADBE Ramp-0003', UK.cv(k, 'Gradient End', p1, 'point'));
            }
            opacity(k, s, 'Gradient Opacity', 55 * c.strength);
        }
    });

    UK.add({
        id: 'fx.proColorVignette', cat: 'fx', name: 'Color Vignette · Цветная виньетка', preview: 'vignette',
        desc: 'Радиальный градиент (Multiply): светлый центр, цветные края. Цвет края, радиус и прозрачность — контролы.',
        tags: 'color vignette radial multiply tint edges виньетка цветная pro',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height;
            var s = overlay(c, [1, 1, 1], 'Color Vignette');
            var k = cs(c, s);
            s.blendingMode = BlendingMode.MULTIPLY;
            var rp = UK.addFx(s, 'ADBE Ramp', 'Vignette Ramp');
            var edge = col(0.35, 0.1, 0.25);
            UK.set(rp, 'ADBE Ramp-0001', [W / 2, H / 2]); UK.set(rp, 'ADBE Ramp-0003', [W, H]);
            UK.set(rp, 'ADBE Ramp-0002', col(1, 1, 1)); UK.set(rp, 'ADBE Ramp-0004', edge);
            UK.set(rp, 'ADBE Ramp-0005', 2); UK.set(rp, 'ADBE Ramp-0006', 15);
            if (c.opts.controls) {
                UK.expr(rp, 'ADBE Ramp-0004', UK.cv(k, 'Vignette Color', edge, 'color'));
                var r = UK.cv(k, 'Vignette Radius', 100);
                UK.expr(rp, 'ADBE Ramp-0003', 'var r = ' + r + ' / 100;\n[thisComp.width / 2 + thisComp.width / 2 * r, thisComp.height / 2 + thisComp.height / 2 * r]');
            }
            opacity(k, s, 'Vignette Opacity', 70 * c.strength);
        }
    });

    UK.add({
        id: 'light.proSpotMove', cat: 'light', name: 'Moving Spotlight · Прожектор за точкой', preview: 'sweep',
        desc: 'Затемняющий слой с мягким эллиптическим «окном», которое следует за Point Control (анимируйте точку).',
        tags: 'spotlight moving point follow dark mask прожектор pro',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height;
            var s = overlay(c, [0, 0, 0], 'Spotlight');
            var k = cs(c, s);
            var rx = W * 0.22 * c.strength, ry = H * 0.3 * c.strength;
            var m = addMask(s, ellipseShape(W / 2, H / 2, rx, ry), 'Spot Window');
            m.inverted = true;
            m.property('ADBE Mask Feather').setValue([Math.round(rx * 0.6), Math.round(rx * 0.6)]);
            if (c.opts.controls) {
                var cref = UK.cv(k, 'Spot Center', [W / 2, H / 2], 'point');
                var rref = UK.cv(k, 'Spot Radius', rx);
                m.property('ADBE Mask Shape').expression = ellipseExpr(cref, rref, rref + ' * ' + UK.fmt(ry / rx, 3));
                m.property('ADBE Mask Feather').expression = 'var f = ' + UK.cv(k, 'Spot Feather', Math.round(rx * 0.6)) + ';\n[f, f]';
            }
            opacity(k, s, 'Spot Darkness', 75 * c.strength);
        }
    });

    UK.add({
        id: 'fx.proLensDirt', cat: 'fx', name: 'Lens Dirt · Грязь на объективе', preview: 'grain',
        desc: 'Размытые пятна и крошки на стекле (Cell Pattern + Blur, Screen) с низкой прозрачностью — проявляются на светлом.',
        tags: 'lens dirt dust glass overlay bokeh грязь объектив pro',
        apply: function (c) {
            var s = overlay(c, [0, 0, 0], 'Lens Dirt');
            var k = cs(c, s);
            s.blendingMode = BlendingMode.SCREEN;
            var cp = UK.addFx(s, 'ADBE Cell Pattern', 'Dirt Cells');
            UK.set(cp, 'ADBE Cell Pattern-0001', 3);
            UK.set(cp, 'ADBE Cell Pattern-0003', 180); UK.set(cp, 'ADBE Cell Pattern-0004', 1);
            UK.set(cp, 'ADBE Cell Pattern-0005', 1.3); UK.set(cp, 'ADBE Cell Pattern-0006', 55);
            var bc = UK.addFx(s, 'ADBE Brightness & Contrast 2', 'Dirt Levels');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0001', -40); UK.set(bc, 'ADBE Brightness & Contrast 2-0002', 60);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            gauss(s, 'Dirt Blur', 18);
            glow(s, 'Dirt Glow', 30, 60, 0.8);
            opacity(k, s, 'Dirt Opacity', 20 * c.strength);
        }
    });

    UK.add({
        id: 'fx.proSpeedLines', cat: 'fx', name: 'Speed Lines · Манга-линии', preview: 'rays',
        desc: 'Радиальные линии скорости от центра (Fractal Noise → Polar), центр открыт мягкой маской, режим Add. Для аниме/комикс-ударов.',
        tags: 'speed lines manga anime radial action линии скорости pro',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height;
            var s = overlay(c, [0, 0, 0], 'Speed Lines');
            var k = cs(c, s);
            s.blendingMode = BlendingMode.ADD;
            fractal(s, 'Lines Noise', { type: 1, noise: 1, contrast: 380, brightness: -120, overflow: 1, sw: 6, sh: 9000, complexity: 1,
                evo: 'posterizeTime(12); random() * 2000', offset: 'posterizeTime(12); [random() * 4000, 0]' });
            var pc = UK.addFx(s, 'ADBE Polar Coordinates', 'Lines Polar');
            UK.set(pc, 'ADBE Polar Coordinates-0001', 100); UK.set(pc, 'ADBE Polar Coordinates-0002', 2);
            var r = Math.min(W, H) * 0.3;
            var m = addMask(s, ellipseShape(W / 2, H / 2, r, r * 0.8), 'Lines Hole');
            m.inverted = true;
            m.property('ADBE Mask Feather').setValue([r * 0.9, r * 0.9]);
            if (c.opts.controls) {
                var cref = UK.cv(k, 'Lines Center', [W / 2, H / 2], 'point'), rref = UK.cv(k, 'Lines Hole', r);
                m.property('ADBE Mask Shape').expression = ellipseExpr(cref, rref, rref + ' * 0.8');
            }
            var tn = UK.addFx(s, 'ADBE Tint', 'Lines Color');
            UK.set(tn, 'ADBE Tint-0001', col(0, 0, 0)); UK.set(tn, 'ADBE Tint-0002', col(1, 1, 1));
            if (c.opts.controls) UK.expr(tn, 'ADBE Tint-0002', UK.cv(k, 'Lines Color', col(1, 1, 1), 'color'));
            opacity(k, s, 'Lines Opacity', 80 * c.strength);
        }
    });

    UK.add({
        id: 'light.proRain', cat: 'light', name: 'Rain Overlay · Дождь', preview: 'liquid',
        desc: 'Слой CC Rainfall поверх в режиме Add. Плотность, скорость и прозрачность — контролы на слое дождя.',
        tags: 'rain overlay weather drops cc rainfall дождь погода pro',
        apply: function (c) {
            var s = overlay(c, [0, 0, 0], 'Rain');
            var k = cs(c, s);
            s.blendingMode = BlendingMode.ADD;
            var rf = UK.addFx(s, 'CC Rainfall', 'Rainfall');
            UK.set(rf, ['CC Rainfall-0001', 'Drops'], 3000 * c.strength);
            UK.set(rf, ['CC Rainfall-0002', 'Size'], 3);
            UK.set(rf, ['CC Rainfall-0004', 'Speed'], 6000);
            UK.set(rf, ['CC Rainfall-0005', 'Wind'], 300);
            if (c.opts.controls) {
                UK.expr(rf, ['CC Rainfall-0001', 'Drops'], UK.cv(k, 'Rain Drops', 3000 * c.strength));
                UK.expr(rf, ['CC Rainfall-0005', 'Wind'], UK.cv(k, 'Rain Wind', 300));
            }
            opacity(k, s, 'Rain Opacity', 70 * c.strength);
        }
    });

    UK.add({
        id: 'light.proSnow', cat: 'light', name: 'Snow Overlay · Снег', preview: 'grain',
        desc: 'Слой CC Snowfall поверх в режиме Screen с мягким свечением. Количество и размер — контролы.',
        tags: 'snow overlay winter flakes cc snowfall снег зима pro',
        apply: function (c) {
            var s = overlay(c, [0, 0, 0], 'Snow');
            var k = cs(c, s);
            s.blendingMode = BlendingMode.SCREEN;
            var sf = UK.addFx(s, 'CC Snowfall', 'Snowfall');
            UK.set(sf, ['CC Snowfall-0001', 'Flakes'], 5000 * c.strength);
            UK.set(sf, ['CC Snowfall-0002', 'Size'], 7);
            UK.set(sf, ['CC Snowfall-0004', 'Speed'], 350);
            UK.set(sf, ['CC Snowfall-0005', 'Wind'], 60);
            if (c.opts.controls) {
                UK.expr(sf, ['CC Snowfall-0001', 'Flakes'], UK.cv(k, 'Snow Flakes', 5000 * c.strength));
                UK.expr(sf, ['CC Snowfall-0002', 'Size'], UK.cv(k, 'Snow Size', 7));
            }
            glow(s, 'Snow Glow', 40, 20, 0.6);
            opacity(k, s, 'Snow Opacity', 85 * c.strength);
        }
    });

    UK.add({
        id: 'light.proSparkles', cat: 'light', name: 'Sparkles · Искры', preview: 'glow',
        desc: 'Мелкие мерцающие искорки (Cell Pattern Plates + Glow, Add), мерцание через ступенчатую эволюцию.',
        tags: 'sparkles glitter twinkle magic искры блёстки pro',
        apply: function (c) {
            var s = overlay(c, [0, 0, 0], 'Sparkles');
            var k = cs(c, s);
            s.blendingMode = BlendingMode.ADD;
            var cp = UK.addFx(s, 'ADBE Cell Pattern', 'Sparkle Cells');
            UK.set(cp, 'ADBE Cell Pattern-0001', 3);
            UK.set(cp, 'ADBE Cell Pattern-0003', 450); UK.set(cp, 'ADBE Cell Pattern-0004', 1);
            UK.set(cp, 'ADBE Cell Pattern-0005', 1.4); UK.set(cp, 'ADBE Cell Pattern-0006', 22 * c.strength);
            var sp = UK.cv(k, 'Sparkle Speed', 8);
            UK.expr(cp, ['ADBE Cell Pattern-0012', 'Evolution'], 'posterizeTime(' + sp + '); random() * 1000');
            var bc = UK.addFx(s, 'ADBE Brightness & Contrast 2', 'Sparkle Levels');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0001', -85); UK.set(bc, 'ADBE Brightness & Contrast 2-0002', 80);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var g = glow(s, 'Sparkle Glow', 20, 14, 2);
            UK.set(g, 'ADBE Glo2-0007', 2); UK.set(g, 'ADBE Glo2-0012', col(1, 1, 1)); UK.set(g, 'ADBE Glo2-0013', col(1, 0.85, 0.5));
            if (c.opts.controls) UK.expr(g, 'ADBE Glo2-0013', UK.cv(k, 'Sparkle Color', col(1, 0.85, 0.5), 'color'));
            opacity(k, s, 'Sparkle Opacity', 70 * c.strength);
        }
    });

    UK.add({
        id: 'fx.proSplitTone', cat: 'fx', name: 'Split Toning · Раздельное тонирование', preview: 'grade',
        desc: 'Отдельные цвета для теней и светов (Tritone с нейтральными полутонами) с контролем баланса.',
        tags: 'split toning shadows highlights color grade тонирование pro',
        apply: function (c) {
            var sh = col(0.2, 0.3, 0.5), hi = col(1, 0.9, 0.7);
            var tt = tritone(c.layer, 'Split Tone', hi, col(0.5, 0.5, 0.5), sh, 100 - 40 * c.strength);
            driveColor(c, tt, 'ADBE Tritone-0001', 'Highlights Tone', hi);
            driveColor(c, tt, 'ADBE Tritone-0003', 'Shadows Tone', sh);
            drive(c, tt, 'ADBE Tritone-0004', 'Split Balance', 100 - 40 * c.strength);
        }
    });

    UK.add({
        id: 'fx.proFilmFade', cat: 'fx', name: 'Faded Film · Выцветшая плёнка 70-х', preview: 'grain',
        desc: 'Жёлто-зелёный сдвиг, низкий контраст, лифт теней, зерно и лёгкое размытие — старая выцветшая плёнка.',
        tags: 'faded film 70s retro vintage yellow выцветшая плёнка pro',
        apply: function (c) {
            var amt = amount(c, 'Faded Amount'), k = c.strength;
            var cb = colorBalance(c.layer, 'Faded Balance', [0, 0, 0, 0, 0, 0, 0, 0, 0]);
            cbLook(cb, [6 * k, 10 * k, -14 * k, 8 * k, 8 * k, -12 * k, 14 * k, 10 * k, -20 * k], amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Faded Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0001', 10 * k, amt); look(bc, 'ADBE Brightness & Contrast 2-0002', -20 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'Faded Desat');
            look(hs, 'ADBE HUE SATURATION-0004', -22 * k, amt);
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'Faded Grain');
            look(nz, 'ADBE Noise2-0001', 10 * k, amt); UK.set(nz, 'ADBE Noise2-0002', 1); UK.set(nz, 'ADBE Noise2-0003', 1);
            var b = gauss(c.layer, 'Faded Soft', 0.8 * k);
            var vg = UK.addFx(c.layer, 'CC Vignette', 'Faded Vignette');
            look(vg, 'CC Vignette-0001', 35 * k, amt); UK.set(vg, 'CC Vignette-0004', 0);
        }
    });

})();
