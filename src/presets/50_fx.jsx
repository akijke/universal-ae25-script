// =============================================================================
//  Библиотека: Эффекты и луки (cat: 'fx')
// =============================================================================
(function () {

    // ---------------------------------------------------------------- хелперы
    function col(r, g, b) { return [r, g, b, 1]; }
    function hexc(s) { var c = UK.hex(s); return [c[0], c[1], c[2], 1]; }
    function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
    function layerRef(l) { return 'thisComp.layer("' + esc(l.name) + '")'; }
    function isAV(l) { return l instanceof AVLayer; }
    function lw(c) {
        var w = 0, h = 0;
        try { w = c.layer.width; h = c.layer.height; } catch (e) {}
        if (!w || !h) { w = c.comp.width; h = c.comp.height; }
        return [w, h];
    }
    /** Слайдер «Amount» лука: ссылка либо null (если контролы выключены). */
    function amtRef(c, name) { return c.opts.controls ? UK.cv(c, name, 100) : null; }
    /** Значение параметра лука, масштабируемое слайдером Amount. */
    function look(fx, prop, value, amt) {
        UK.set(fx, prop, value);
        if (amt) UK.expr(fx, prop, UK.fmt(value, 3) + ' * ' + amt + ' / 100');
    }
    /** Параметр под своим слайдером. */
    function drive(c, fx, prop, name, value) {
        UK.set(fx, prop, value);
        if (c.opts.controls) UK.expr(fx, prop, UK.cv(c, name, value));
    }
    function driveColor(c, fx, prop, name, value) {
        UK.set(fx, prop, value);
        if (c.opts.controls) { UK.color(c.layer, name, value); UK.expr(fx, prop, UK.ref(name, 'color')); }
    }
    function drivePoint(c, fx, prop, name, value) {
        UK.set(fx, prop, value);
        if (c.opts.controls) { UK.point(c.layer, name, value); UK.expr(fx, prop, UK.ref(name, 'point')); }
    }
    /** Слайдер на произвольном слое (для дублей и карт). */
    function cvOn(c, layer, name, value) {
        if (c.opts.controls) { UK.slider(layer, name, value); return UK.ref(name); }
        return String(UK.fmt(value, 4));
    }
    function dirAngle(c) { return { L: 270, R: 90, U: 0, D: 180 }[c.dirId] || 0; }

    // ================================================================ ЛУКИ
    UK.add({
        id: 'fx.tealOrange', cat: 'fx', name: 'Teal & Orange · Кинолук',
        desc: 'Бирюзовые тени, оранжевые света, чуть сочнее. Слайдер Amount — сила лука.',
        tags: 'teal orange cinematic color grade цветокор кино',
        apply: function (c) {
            var amt = amtRef(c, 'Teal&Orange Amount'), k = c.strength;
            var cb = UK.addFx(c.layer, 'ADBE Color Balance 2', 'Teal & Orange');
            look(cb, 'ADBE Color Balance 2-0001', -12 * k, amt);
            look(cb, 'ADBE Color Balance 2-0002', 4 * k, amt);
            look(cb, 'ADBE Color Balance 2-0003', 22 * k, amt);
            look(cb, 'ADBE Color Balance 2-0004', 6 * k, amt);
            look(cb, 'ADBE Color Balance 2-0006', -4 * k, amt);
            look(cb, 'ADBE Color Balance 2-0007', 22 * k, amt);
            look(cb, 'ADBE Color Balance 2-0008', 6 * k, amt);
            look(cb, 'ADBE Color Balance 2-0009', -18 * k, amt);
            UK.set(cb, 'ADBE Color Balance 2-0010', 1);
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'Vibrance');
            look(vb, 'ADBE Vibrance-0001', 25 * k, amt);
        }
    });

    UK.add({
        id: 'fx.cinematic', cat: 'fx', name: 'Cinematic Contrast · Киноконтраст',
        desc: 'Контраст, чуть приглушённая насыщенность и виньетка.',
        tags: 'cinematic contrast vignette кино контраст',
        apply: function (c) {
            var amt = amtRef(c, 'Cinematic Amount'), k = c.strength;
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0001', -4 * k, amt);
            look(bc, 'ADBE Brightness & Contrast 2-0002', 22 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'Vibrance');
            look(vb, 'ADBE Vibrance-0001', 15 * k, amt);
            look(vb, 'ADBE Vibrance-0002', -10 * k, amt);
            var vg = UK.addFx(c.layer, 'CC Vignette', 'Vignette');
            look(vg, 'CC Vignette-0001', 45 * k, amt);
            UK.set(vg, 'CC Vignette-0002', 60);
            UK.set(vg, 'CC Vignette-0004', 0);
        }
    });

    UK.add({
        id: 'fx.vintage', cat: 'fx', name: 'Vintage Faded · Выцветший матовый',
        desc: 'Приподнятые тени, тёплый оттенок, лёгкий шум.',
        tags: 'vintage faded matte retro ретро винтаж',
        apply: function (c) {
            var amt = amtRef(c, 'Vintage Amount'), k = c.strength;
            var tn = UK.addFx(c.layer, 'ADBE Tint', 'Warm Tint');
            UK.set(tn, 'ADBE Tint-0001', col(0.16, 0.12, 0.10));
            UK.set(tn, 'ADBE Tint-0002', col(1, 0.95, 0.85));
            look(tn, 'ADBE Tint-0003', 35 * k, amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Fade');
            look(bc, 'ADBE Brightness & Contrast 2-0001', 8 * k, amt);
            look(bc, 'ADBE Brightness & Contrast 2-0002', -18 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'Grain');
            look(nz, 'ADBE Noise2-0001', 6 * k, amt);
            UK.set(nz, 'ADBE Noise2-0002', 0);
            UK.set(nz, 'ADBE Noise2-0003', 1);
        }
    });

    UK.add({
        id: 'fx.bwContrast', cat: 'fx', name: 'B&W High Contrast · Чёрно-белый',
        desc: 'Контрастное ч/б с акцентом на красные/жёлтые.',
        tags: 'black white bw monochrome чб чёрно-белый',
        apply: function (c) {
            var amt = amtRef(c, 'B&W Contrast'), k = c.strength;
            var bw = UK.addFx(c.layer, 'ADBE Black&White', 'B&W');
            UK.set(bw, 'ADBE Black&White-0001', 60); UK.set(bw, 'ADBE Black&White-0002', 70);
            UK.set(bw, 'ADBE Black&White-0003', 30); UK.set(bw, 'ADBE Black&White-0004', 50);
            UK.set(bw, 'ADBE Black&White-0005', 10); UK.set(bw, 'ADBE Black&White-0006', 60);
            UK.set(bw, 'ADBE Black&White-0007', 0);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0002', 30 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.sepia', cat: 'fx', name: 'Sepia · Сепия',
        desc: 'Классическая сепия. Amount — степень тонирования.',
        tags: 'sepia old brown сепия',
        apply: function (c) {
            var tn = UK.addFx(c.layer, 'ADBE Tint', 'Sepia');
            UK.set(tn, 'ADBE Tint-0001', col(0.12, 0.07, 0.03));
            UK.set(tn, 'ADBE Tint-0002', col(1, 0.93, 0.8));
            drive(c, tn, 'ADBE Tint-0003', 'Sepia Amount', UK.clamp(85 * c.strength, 0, 100));
        }
    });

    UK.add({
        id: 'fx.duotone', cat: 'fx', name: 'Duotone · Дуотон',
        desc: 'Два цвета (тени/света) — меняются через Color Control.',
        tags: 'duotone two tone gradient map дуотон',
        apply: function (c) {
            var tt = UK.addFx(c.layer, 'ADBE Tritone', 'Duotone');
            driveColor(c, tt, 'ADBE Tritone-0001', 'Duotone Light', hexc('F6D365'));
            driveColor(c, tt, 'ADBE Tritone-0002', 'Duotone Mid', hexc('B04E9A'));
            driveColor(c, tt, 'ADBE Tritone-0003', 'Duotone Dark', hexc('1B1464'));
            drive(c, tt, 'ADBE Tritone-0004', 'Duotone Blend', UK.clamp(100 - 100 * c.strength, 0, 100));
        }
    });

    UK.add({
        id: 'fx.crossProcess', cat: 'fx', name: 'Cross Process · Кросс-процесс',
        desc: 'Сдвиг каналов как у плёнки, проявленной «не в том» процессе.',
        tags: 'cross process channel mixer film плёнка',
        apply: function (c) {
            var k = c.strength;
            var cm = UK.addFx(c.layer, 'ADBE CHANNEL MIXER', 'Cross Process');
            UK.set(cm, 'ADBE CHANNEL MIXER-0001', 100 + 15 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0002', -10 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0004', -5 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0006', 100 + 8 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0008', 3 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0009', 12 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0011', 100 - 20 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0012', 10 * k);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Contrast');
            drive(c, bc, 'ADBE Brightness & Contrast 2-0002', 'Cross Contrast', 15 * k);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.bleach', cat: 'fx', name: 'Bleach Bypass · Обесцвеченный контраст',
        desc: 'Низкая насыщенность, высокий контраст (как «Спасти рядового Райана»).',
        tags: 'bleach bypass desaturate contrast war',
        apply: function (c) {
            var amt = amtRef(c, 'Bleach Amount'), k = c.strength;
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'Desaturate');
            look(hs, 'ADBE HUE SATURATION-0004', -45 * k, amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0002', 35 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.warm', cat: 'fx', name: 'Warm Filter · Тёплый фильтр',
        desc: 'Тёплый фотофильтр (85). Density — плотность.',
        tags: 'warm photo filter orange тёплый',
        apply: function (c) {
            var pf = UK.addFx(c.layer, 'ADBE Photo Filter', 'Warm');
            UK.set(pf, 'ADBE Photo Filter-0001', 1);
            UK.set(pf, 'ADBE Photo Filter-0002', hexc('EC8A00'));
            drive(c, pf, 'ADBE Photo Filter-0003', 'Warm Density', UK.clamp(30 * c.strength, 0, 100));
            UK.set(pf, 'ADBE Photo Filter-0004', 1);
        }
    });

    UK.add({
        id: 'fx.cool', cat: 'fx', name: 'Cool Filter · Холодный фильтр',
        desc: 'Холодный фотофильтр (80). Density — плотность.',
        tags: 'cool photo filter blue холодный синий',
        apply: function (c) {
            var pf = UK.addFx(c.layer, 'ADBE Photo Filter', 'Cool');
            UK.set(pf, 'ADBE Photo Filter-0001', 3);
            UK.set(pf, 'ADBE Photo Filter-0002', hexc('006DFF'));
            drive(c, pf, 'ADBE Photo Filter-0003', 'Cool Density', UK.clamp(30 * c.strength, 0, 100));
            UK.set(pf, 'ADBE Photo Filter-0004', 1);
        }
    });

    UK.add({
        id: 'fx.cyberpunk', cat: 'fx', name: 'Cyberpunk Neon · Неоновый лук',
        desc: 'Маджента/циан тонирование + свечение.',
        tags: 'cyberpunk neon magenta cyan glow киберпанк неон',
        apply: function (c) {
            var k = c.strength;
            var tt = UK.addFx(c.layer, 'ADBE Tritone', 'Neon Tone');
            driveColor(c, tt, 'ADBE Tritone-0001', 'Neon Light', hexc('FFF2FF'));
            driveColor(c, tt, 'ADBE Tritone-0002', 'Neon Mid', hexc('E040C8'));
            driveColor(c, tt, 'ADBE Tritone-0003', 'Neon Dark', hexc('0A1F4A'));
            drive(c, tt, 'ADBE Tritone-0004', 'Neon Blend', UK.clamp(100 - 70 * k, 0, 100));
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Neon Glow');
            UK.set(g, 'ADBE Glo2-0002', 55);
            drive(c, g, 'ADBE Glo2-0003', 'Neon Glow Radius', 120);
            drive(c, g, 'ADBE Glo2-0004', 'Neon Glow Intensity', 0.8 * k);
        }
    });

    UK.add({
        id: 'fx.pastel', cat: 'fx', name: 'Pastel · Пастель',
        desc: 'Мягкие светлые тона: меньше контраста и насыщенности, светлее.',
        tags: 'pastel soft bright light пастель',
        apply: function (c) {
            var amt = amtRef(c, 'Pastel Amount'), k = c.strength;
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'Pastel');
            look(hs, 'ADBE HUE SATURATION-0004', -20 * k, amt);
            look(hs, 'ADBE HUE SATURATION-0005', 12 * k, amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Soft');
            look(bc, 'ADBE Brightness & Contrast 2-0002', -22 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.colorPop', cat: 'fx', name: 'Color Pop · Оставить один цвет',
        desc: 'Всё ч/б, кроме выбранного цвета (Color Control «Keep Color»).',
        tags: 'leave color pop selective исключить цвет',
        apply: function (c) {
            var lc = UK.addFx(c.layer, 'ADBE Leave Color', 'Color Pop');
            drive(c, lc, 'ADBE Leave Color-0001', 'Decolor Amount', UK.clamp(100 * c.strength, 0, 100));
            driveColor(c, lc, 'ADBE Leave Color-0002', 'Keep Color', hexc('E53935'));
            drive(c, lc, 'ADBE Leave Color-0003', 'Keep Tolerance', 25);
            UK.set(lc, 'ADBE Leave Color-0004', 15);
            UK.set(lc, 'ADBE Leave Color-0005', 2);
        }
    });

    UK.add({
        id: 'fx.exposure', cat: 'fx', name: 'Exposure · Экспозиция',
        desc: 'Коррекция экспозиции в стопах (Сила 100% = +0.5 EV).',
        tags: 'exposure brightness ev экспозиция яркость',
        apply: function (c) {
            var ex = UK.addFx(c.layer, 'ADBE Exposure2', 'Exposure');
            UK.set(ex, 'ADBE Exposure2-0001', 1);
            drive(c, ex, ['ADBE Exposure2-0003', 'Exposure'], 'Exposure EV', 0.5 * c.strength);
        }
    });

    // ================================================================ СТИЛИЗАЦИЯ
    UK.add({
        id: 'fx.vhs', cat: 'fx', name: 'VHS · Видеокассета',
        desc: 'Шум, цветовое смазывание, лёгкая волна и строчки.',
        tags: 'vhs tape retro analog 80s кассета',
        apply: function (c) {
            var k = c.strength;
            var cb = UK.addFx(c.layer, 'ADBE Channel Blur', 'VHS Color Bleed');
            drive(c, cb, 'ADBE Channel Blur-0001', 'VHS Bleed', 12 * k);
            UK.set(cb, 'ADBE Channel Blur-0003', 4 * k);
            UK.set(cb, 'ADBE Channel Blur-0005', 1);
            UK.set(cb, 'ADBE Channel Blur-0006', 2);
            var ww = UK.addFx(c.layer, 'ADBE Wave Warp', 'VHS Wobble');
            UK.set(ww, 'ADBE Wave Warp-0001', 1);
            drive(c, ww, 'ADBE Wave Warp-0002', 'VHS Wobble', 2 * k);
            UK.set(ww, 'ADBE Wave Warp-0003', 400);
            UK.set(ww, 'ADBE Wave Warp-0004', 0);
            UK.set(ww, 'ADBE Wave Warp-0005', 0.4);
            UK.set(ww, 'ADBE Wave Warp-0006', 1);
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'VHS Noise');
            drive(c, nz, 'ADBE Noise2-0001', 'VHS Noise', 18 * k);
            UK.set(nz, 'ADBE Noise2-0002', 1); UK.set(nz, 'ADBE Noise2-0003', 1);
            var gr = UK.addFx(c.layer, 'ADBE Grid', 'VHS Scanlines');
            UK.set(gr, 'ADBE Grid-0002', 3);
            UK.set(gr, 'ADBE Grid-0004', 20000);
            UK.set(gr, 'ADBE Grid-0005', 4);
            UK.set(gr, 'ADBE Grid-0006', 2);
            UK.set(gr, 'ADBE Grid-0011', col(0, 0, 0));
            drive(c, gr, 'ADBE Grid-0012', 'VHS Scanlines Opacity', 22 * k);
            UK.set(gr, ['ADBE Grid-0013', 'Blending Mode'], 2);
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'VHS Saturation');
            UK.set(hs, 'ADBE HUE SATURATION-0004', 15 * k);
        }
    });

    UK.add({
        id: 'fx.filmGrain', cat: 'fx', name: 'Film Grain (Noise) · Зерно',
        desc: 'Монохромное зерно через Noise — быстрое в рендере.',
        tags: 'grain noise film зерно шум',
        apply: function (c) {
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'Film Grain');
            drive(c, nz, 'ADBE Noise2-0001', 'Grain Amount', 12 * c.strength);
            UK.set(nz, 'ADBE Noise2-0002', 0);
            UK.set(nz, 'ADBE Noise2-0003', 1);
        }
    });

    UK.add({
        id: 'fx.addGrain', cat: 'fx', name: 'Film Grain (Add Grain) · Плёночное зерно',
        desc: 'Настоящее плёночное зерно (Add Grain, Final Output). Тяжелее в рендере.',
        tags: 'add grain film stock зерно плёнка',
        apply: function (c) {
            var g = UK.addFx(c.layer, 'VISINF Grain Implant', 'Add Grain');
            UK.set(g, ['Viewing Mode'], 3);
            drive(c, g, ['Intensity'], 'Grain Intensity', 0.8 * c.strength);
            drive(c, g, ['Size'], 'Grain Size', 1.0);
            UK.set(g, ['Softness'], 0.6);
        }
    });

    UK.add({
        id: 'fx.vignette', cat: 'fx', name: 'Vignette · Виньетка',
        desc: 'Затемнение краёв. Amount — сила, Angle — ширина.',
        tags: 'vignette dark edges виньетка',
        apply: function (c) {
            var vg = UK.addFx(c.layer, 'CC Vignette', 'Vignette');
            drive(c, vg, 'CC Vignette-0001', 'Vignette Amount', 60 * c.strength);
            drive(c, vg, 'CC Vignette-0002', 'Vignette Angle', 65);
            UK.set(vg, 'CC Vignette-0003', [c.comp.width / 2, c.comp.height / 2]);
            UK.set(vg, 'CC Vignette-0004', 0);
        }
    });

    UK.add({
        id: 'fx.letterbox', cat: 'fx', name: 'Letterbox 2.35 · Киношные полосы',
        desc: 'Чёрный слой с полосами сверху и снизу на время слоя. Высота полос — слайдер на слое полос.',
        tags: 'letterbox cinemascope bars 2.35 полосы',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height;
            var bar = Math.round((H - W / 2.35) / 2);
            if (bar < 4) bar = Math.round(H * 0.12);
            var s = UK.solid(c.comp, [0, 0, 0], 'Letterbox', c.layer.inPoint, c.layer.outPoint);
            var m = s.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
            var sh = new Shape();
            sh.vertices = [[0, bar], [W, bar], [W, H - bar], [0, H - bar]];
            sh.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.closed = true;
            m.property('ADBE Mask Shape').setValue(sh);
            m.inverted = true;
            m.name = UK.PREFIX + 'Letterbox Cutout';
            if (c.opts.controls) {
                var ref = cvOn(c, s, 'Bar Height', bar);
                m.property('ADBE Mask Shape').expression =
                    'var h = ' + ref + ';\n' +
                    'var w = thisLayer.width, hh = thisLayer.height;\n' +
                    'createPath([[0, h], [w, h], [w, hh - h], [0, hh - h]], [], [], true);';
            }
        }
    });

    UK.add({
        id: 'fx.chromatic', cat: 'fx', name: 'Chromatic Aberration · Хроматика',
        desc: 'RGB-разделение тремя копиями слоя (Add). Смещение — слайдер «CA Offset» на исходном слое.',
        tags: 'chromatic aberration rgb split хроматические аберрации',
        apply: function (c) {
            if (!isAV(c.layer)) {
                var cbl = UK.addFx(c.layer, 'ADBE Channel Blur', 'Chromatic');
                drive(c, cbl, 'ADBE Channel Blur-0001', 'CA Offset', 8 * c.strength);
                UK.set(cbl, 'ADBE Channel Blur-0003', 8 * c.strength);
                UK.set(cbl, 'ADBE Channel Blur-0005', 1);
                UK.set(cbl, 'ADBE Channel Blur-0006', 2);
                return;
            }
            var off = 6 * c.strength;
            var ref = c.opts.controls ? layerRef(c.layer) + '.effect("' + UK.CTRL_PREFIX + 'CA Offset")("ADBE Slider Control-0001")' : String(UK.fmt(off, 3));
            if (c.opts.controls) UK.slider(c.layer, 'CA Offset', off);
            var dirX = c.dirV[0] !== 0 ? 1 : 0, dirY = c.dirV[1] !== 0 ? 1 : 0;
            if (!dirX && !dirY) dirX = 1;

            function chan(layer, r, g, b, nick) {
                var sc = UK.addFx(layer, 'ADBE Shift Channels', nick);
                UK.set(sc, 'ADBE Shift Channels-0002', r ? 1 : 10);
                UK.set(sc, 'ADBE Shift Channels-0003', g ? 2 : 10);
                UK.set(sc, 'ADBE Shift Channels-0004', b ? 3 : 10);
                return sc;
            }
            function shift(layer, sign) {
                var tf = UK.addFx(layer, 'ADBE Geometry2', 'CA Shift');
                var p = UK.p(tf, 'ADBE Geometry2-0002');
                var base = p.value;
                p.expression = 'var o = ' + ref + ' * ' + sign + ';\n' +
                    '[' + UK.fmt(base[0], 2) + ' + o * ' + dirX + ', ' + UK.fmt(base[1], 2) + ' + o * ' + dirY + ']';
                UK.set(tf, 'ADBE Geometry2-0010', 0);
            }
            var gL = c.layer.duplicate(); gL.name = UK.PREFIX + 'CA Green';
            var bL = c.layer.duplicate(); bL.name = UK.PREFIX + 'CA Blue';
            chan(c.layer, 1, 0, 0, 'CA Red');
            chan(gL, 0, 1, 0, 'CA Green'); gL.blendingMode = BlendingMode.ADD;
            chan(bL, 0, 0, 1, 'CA Blue'); bL.blendingMode = BlendingMode.ADD;
            shift(gL, 1);
            shift(bL, -1);
        }
    });

    UK.add({
        id: 'fx.sharpen', cat: 'fx', name: 'Sharpen · Резкость',
        desc: 'Unsharp Mask: аккуратная резкость без артефактов.',
        tags: 'sharpen unsharp detail резкость',
        apply: function (c) {
            var us = UK.addFx(c.layer, 'ADBE Unsharp Mask2', 'Sharpen');
            drive(c, us, 'ADBE Unsharp Mask2-0001', 'Sharpen Amount', 60 * c.strength);
            drive(c, us, 'ADBE Unsharp Mask2-0002', 'Sharpen Radius', 1.5);
            UK.set(us, 'ADBE Unsharp Mask2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.bloom', cat: 'fx', name: 'Soft Bloom · Мягкое свечение',
        desc: 'Широкое мягкое свечение светлых областей (dreamy).',
        tags: 'bloom glow soft dreamy свечение',
        apply: function (c) {
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Bloom');
            drive(c, g, 'ADBE Glo2-0002', 'Bloom Threshold', 55);
            drive(c, g, 'ADBE Glo2-0003', 'Bloom Radius', 300);
            drive(c, g, 'ADBE Glo2-0004', 'Bloom Intensity', 0.6 * c.strength);
            UK.set(g, 'ADBE Glo2-0006', 2);
        }
    });

    UK.add({
        id: 'fx.neon', cat: 'fx', name: 'Neon Glow · Неоновое свечение',
        desc: 'Двойное свечение: плотное ядро + широкое гало. Для текста/логотипов.',
        tags: 'neon glow text logo неон',
        apply: function (c) {
            var k = c.strength;
            var g1 = UK.addFx(c.layer, 'ADBE Glo2', 'Neon Core');
            UK.set(g1, 'ADBE Glo2-0001', 2);
            UK.set(g1, 'ADBE Glo2-0002', 30);
            drive(c, g1, 'ADBE Glo2-0003', 'Neon Core Radius', 12);
            drive(c, g1, 'ADBE Glo2-0004', 'Neon Core Intensity', 1.5 * k);
            var g2 = UK.addFx(c.layer, 'ADBE Glo2', 'Neon Halo');
            UK.set(g2, 'ADBE Glo2-0001', 2);
            UK.set(g2, 'ADBE Glo2-0002', 30);
            drive(c, g2, 'ADBE Glo2-0003', 'Neon Halo Radius', 140);
            drive(c, g2, 'ADBE Glo2-0004', 'Neon Halo Intensity', 0.9 * k);
            UK.set(g2, 'ADBE Glo2-0006', 1);
        }
    });

    UK.add({
        id: 'fx.longShadow', cat: 'fx', name: 'Long Shadow · Длинная тень',
        desc: 'Плоская длинная тень (3 ступени). Направление — из настроек.',
        tags: 'long shadow flat тень длинная',
        apply: function (c) {
            var ang = { L: 270, R: 90, U: 0, D: 180 }[c.dirId] || 135;
            ang = (ang + 45) % 360;
            var base = 20 * c.strength;
            var ref = c.opts.controls ? UK.cv(c, 'Shadow Length', base) : null;
            for (var i = 1; i <= 3; i++) {
                var ds = UK.addFx(c.layer, 'ADBE Drop Shadow', 'Long Shadow ' + i);
                UK.set(ds, 'ADBE Drop Shadow-0001', col(0, 0, 0));
                UK.set(ds, 'ADBE Drop Shadow-0002', Math.round(200 / i));
                UK.set(ds, 'ADBE Drop Shadow-0003', ang);
                UK.set(ds, 'ADBE Drop Shadow-0004', base * i);
                if (ref) UK.expr(ds, 'ADBE Drop Shadow-0004', ref + ' * ' + i);
                UK.set(ds, 'ADBE Drop Shadow-0005', 0);
            }
        }
    });

    UK.add({
        id: 'fx.dropShadow', cat: 'fx', name: 'Soft Drop Shadow · Мягкая тень',
        desc: 'Мягкая реалистичная тень.',
        tags: 'drop shadow soft тень',
        apply: function (c) {
            var ds = UK.addFx(c.layer, 'ADBE Drop Shadow', 'Shadow');
            UK.set(ds, 'ADBE Drop Shadow-0001', col(0, 0, 0));
            drive(c, ds, 'ADBE Drop Shadow-0002', 'Shadow Opacity', 140);
            UK.set(ds, 'ADBE Drop Shadow-0003', 135);
            drive(c, ds, 'ADBE Drop Shadow-0004', 'Shadow Distance', 12 * c.strength);
            drive(c, ds, 'ADBE Drop Shadow-0005', 'Shadow Softness', 40 * c.strength);
        }
    });

    UK.add({
        id: 'fx.posterize', cat: 'fx', name: 'Posterize · Постеризация',
        desc: 'Ограничение числа тонов.',
        tags: 'posterize levels poster постеризация',
        apply: function (c) {
            var p = UK.addFx(c.layer, 'ADBE Posterize', 'Posterize');
            drive(c, p, 'ADBE Posterize-0001', 'Posterize Levels', Math.max(2, Math.round(8 / c.strength)));
        }
    });

    UK.add({
        id: 'fx.pixelate', cat: 'fx', name: 'Pixelate · Пикселизация',
        desc: 'Мозаика. Слайдер Pixel Size — размер пикселя в px.',
        tags: 'pixelate mosaic 8bit пиксели',
        apply: function (c) {
            var mo = UK.addFx(c.layer, 'ADBE Mosaic', 'Pixelate');
            var size = Math.max(2, Math.round(16 * c.strength));
            var sz = UK.cv(c, 'Pixel Size', size);
            UK.set(mo, 'ADBE Mosaic-0001', Math.round(c.comp.width / size));
            UK.set(mo, 'ADBE Mosaic-0002', Math.round(c.comp.height / size));
            UK.expr(mo, 'ADBE Mosaic-0001', 'Math.max(1, Math.round(thisComp.width / Math.max(1, ' + sz + ')))');
            UK.expr(mo, 'ADBE Mosaic-0002', 'Math.max(1, Math.round(thisComp.height / Math.max(1, ' + sz + ')))');
            UK.set(mo, 'ADBE Mosaic-0003', 1);
        }
    });

    UK.add({
        id: 'fx.cartoon', cat: 'fx', name: 'Cartoon · Мультяшный',
        desc: 'Эффект Cartoon: заливка ступенями + контуры.',
        tags: 'cartoon toon comic мультяшный',
        apply: function (c) {
            var ct = UK.addFx(c.layer, 'ADBE Cartoonify', 'Cartoon');
            UK.set(ct, ['Render'], 3);
            UK.set(ct, ['Detail Radius'], 3);
            UK.set(ct, ['Detail Threshold'], 25);
            drive(c, ct, ['Shading Steps'], 'Cartoon Steps', Math.max(2, Math.round(6 / c.strength)));
            UK.set(ct, ['Shading Smoothness'], 40);
            drive(c, ct, ['Width'], 'Cartoon Edge Width', 1.5 * c.strength);
            UK.set(ct, ['Threshold'], 1);
            UK.set(ct, ['Softness'], 60);
        }
    });

    UK.add({
        id: 'fx.sketch', cat: 'fx', name: 'Sketch · Карандашный эскиз',
        desc: 'Контуры + ч/б + контраст — рисунок карандашом.',
        tags: 'sketch pencil edges drawing эскиз карандаш',
        apply: function (c) {
            var fe = UK.addFx(c.layer, 'ADBE Find Edges', 'Edges');
            UK.set(fe, 'ADBE Find Edges-0001', 0);
            drive(c, fe, 'ADBE Find Edges-0002', 'Sketch Blend', UK.clamp(100 - 100 * c.strength, 0, 100));
            var tn = UK.addFx(c.layer, 'ADBE Tint', 'Mono');
            UK.set(tn, 'ADBE Tint-0001', col(0, 0, 0)); UK.set(tn, 'ADBE Tint-0002', col(1, 1, 1));
            UK.set(tn, 'ADBE Tint-0003', 100);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Contrast');
            drive(c, bc, 'ADBE Brightness & Contrast 2-0002', 'Sketch Contrast', 40);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.emboss', cat: 'fx', name: 'Emboss · Рельеф',
        desc: 'Цветной рельеф.',
        tags: 'emboss relief рельеф',
        apply: function (c) {
            var em = UK.addFx(c.layer, 'ADBE Color Emboss', 'Emboss');
            UK.set(em, 'ADBE Color Emboss-0001', 135);
            drive(c, em, 'ADBE Color Emboss-0002', 'Emboss Relief', 2.5 * c.strength);
            UK.set(em, 'ADBE Color Emboss-0003', 120);
            UK.set(em, 'ADBE Color Emboss-0004', 0);
        }
    });

    UK.add({
        id: 'fx.mirror', cat: 'fx', name: 'Mirror · Зеркало',
        desc: 'Зеркальное отражение половины кадра по направлению.',
        tags: 'mirror reflect symmetry зеркало симметрия',
        apply: function (c) {
            var s = lw(c);
            var mr = UK.addFx(c.layer, 'ADBE Mirror', 'Mirror');
            drivePoint(c, mr, 'ADBE Mirror-0001', 'Mirror Center', [s[0] / 2, s[1] / 2]);
            drive(c, mr, 'ADBE Mirror-0002', 'Mirror Angle', { L: 0, R: 180, U: 90, D: 270 }[c.dirId] || 0);
        }
    });

    UK.add({
        id: 'fx.kaleidoscope', cat: 'fx', name: 'Kaleidoscope · Калейдоскоп',
        desc: 'CC Kaleida с медленным вращением (Speed — об/с).',
        tags: 'kaleidoscope kaleida mirror калейдоскоп',
        apply: function (c) {
            var s = lw(c);
            var k = UK.addFx(c.layer, 'CC Kaleida', 'Kaleidoscope');
            UK.set(k, 'CC Kaleida-0001', [s[0] / 2, s[1] / 2]);
            drive(c, k, 'CC Kaleida-0002', 'Kaleida Size', 90 / c.strength);
            var sp = UK.cv(c, 'Kaleida Speed', 0.05);
            UK.expr(k, 'CC Kaleida-0004', 'time * ' + sp + ' * 360');
        }
    });

    UK.add({
        id: 'fx.echo', cat: 'fx', name: 'Echo Trails · Шлейфы',
        desc: 'Шлейф из предыдущих кадров (Echo). Хорошо на быстром движении.',
        tags: 'echo trails ghost шлейф',
        apply: function (c) {
            var e = UK.addFx(c.layer, 'ADBE Echo', 'Echo');
            UK.set(e, 'ADBE Echo-0001', -c.fd * 2);
            drive(c, e, 'ADBE Echo-0002', 'Echo Count', Math.round(6 * c.strength));
            UK.set(e, 'ADBE Echo-0003', 1);
            drive(c, e, 'ADBE Echo-0004', 'Echo Decay', 0.65);
            UK.set(e, 'ADBE Echo-0005', 5);
        }
    });

    UK.add({
        id: 'fx.stopMotion', cat: 'fx', name: 'Stop Motion · 12 fps',
        desc: 'Posterize Time — рваное движение как в стоп-моушене.',
        tags: 'stop motion posterize time fps стоп-моушен',
        apply: function (c) {
            var pt = UK.addFx(c.layer, 'ADBE Posterize Time', 'Stop Motion');
            drive(c, pt, 'ADBE Posterize Time-0001', 'Stop Motion FPS', 12);
        }
    });

    UK.add({
        id: 'fx.strobe', cat: 'fx', name: 'Strobe · Стробоскоп',
        desc: 'Белые вспышки с заданным периодом.',
        tags: 'strobe flash blink строб',
        apply: function (c) {
            var st = UK.addFx(c.layer, 'ADBE Strobe', 'Strobe');
            UK.set(st, 'ADBE Strobe-0001', col(1, 1, 1));
            UK.set(st, 'ADBE Strobe-0002', 0);
            drive(c, st, 'ADBE Strobe-0003', 'Strobe Duration', 0.06);
            drive(c, st, 'ADBE Strobe-0004', 'Strobe Period', 0.5 / c.strength);
            UK.set(st, 'ADBE Strobe-0005', 0);
            UK.set(st, 'ADBE Strobe-0006', 2);
            UK.set(st, 'ADBE Strobe-0007', 2);
        }
    });

    UK.add({
        id: 'fx.shake', cat: 'fx', name: 'Camera Shake · Тряска',
        desc: 'Постоянная ручная тряска (wiggle) на позиции. Слайдеры Freq/Amp.',
        tags: 'shake wiggle handheld camera тряска',
        apply: function (c) {
            var f = UK.cv(c, 'Shake Freq', 3);
            var a = UK.cv(c, 'Shake Amp', 15 * c.strength);
            c.layer.transform.position.expression = 'wiggle(' + f + ', ' + a + ')';
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'fx.pulse', cat: 'fx', name: 'Pulse to Beat · Пульсация',
        desc: 'Масштаб пульсирует в такт BPM.',
        tags: 'pulse beat bpm scale music пульс',
        apply: function (c) {
            var bpm = UK.cv(c, 'Pulse BPM', 120);
            var amp = UK.cv(c, 'Pulse Amp', 6 * c.strength);
            c.layer.transform.scale.expression =
                'var ph = Math.max(0, Math.sin(time * ' + bpm + ' / 60 * 2 * Math.PI));\n' +
                'value * (1 + ' + amp + ' / 100 * Math.pow(ph, 3))';
        }
    });

    UK.add({
        id: 'fx.flicker', cat: 'fx', name: 'Opacity Flicker · Мерцание',
        desc: 'Случайное мерцание прозрачности (неон, старая лампа).',
        tags: 'flicker opacity random neon lamp мерцание',
        apply: function (c) {
            var f = UK.cv(c, 'Flicker Rate', 12);
            var a = UK.cv(c, 'Flicker Amp', 35 * c.strength);
            c.layer.transform.opacity.expression =
                'posterizeTime(' + f + ');\n' +
                'seedRandom(index, false);\n' +
                'var r = random();\n' +
                'value * (1 - ' + a + ' / 100 * Math.pow(r, 2))';
        }
    });

    UK.add({
        id: 'fx.scanlines', cat: 'fx', name: 'Scanlines · Строчная развёртка',
        desc: 'Тонкие тёмные горизонтальные линии поверх картинки.',
        tags: 'scanlines crt tv lines развёртка',
        apply: function (c) {
            var gr = UK.addFx(c.layer, 'ADBE Grid', 'Scanlines');
            UK.set(gr, 'ADBE Grid-0002', 3);
            UK.set(gr, 'ADBE Grid-0004', 20000);
            drive(c, gr, 'ADBE Grid-0005', 'Scanline Spacing', 4);
            drive(c, gr, 'ADBE Grid-0006', 'Scanline Width', 2);
            UK.set(gr, 'ADBE Grid-0011', col(0, 0, 0));
            drive(c, gr, 'ADBE Grid-0012', 'Scanline Opacity', 30 * c.strength);
            UK.set(gr, ['ADBE Grid-0013', 'Blending Mode'], 2);
        }
    });

    UK.add({
        id: 'fx.tvOff', cat: 'fx', name: 'TV Turn Off · Выключение ТВ',
        desc: 'Событие: картинка схлопывается в полоску, затем в точку и гаснет.',
        tags: 'tv off crt collapse событие выключение',
        apply: function (c) {
            var tf = UK.addFx(c.layer, 'ADBE Geometry2', 'TV Off');
            UK.set(tf, 'ADBE Geometry2-0003', 0);
            var tA = c.t0 + c.dur * 0.55;
            var sh = UK.p(tf, 'ADBE Geometry2-0004');
            UK.keys(sh, [[c.t0, 100], [tA, 1.5]], 'expoIn');
            var sw = UK.p(tf, 'ADBE Geometry2-0005');
            UK.keys(sw, [[tA, 100], [c.t1, 0]], 'expoIn');
            var op = UK.p(tf, 'ADBE Geometry2-0009');
            UK.keys(op, [[c.t1 - c.fd * 2, 100], [c.t1, 0]], 'linear');
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'TV Flash');
            var br = UK.p(bc, 'ADBE Brightness & Contrast 2-0001');
            UK.keys(br, [[c.t0, 0], [tA, 60 * c.strength], [c.t1, 150]], 'smooth');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'TV Glow');
            UK.set(g, 'ADBE Glo2-0002', 40); UK.set(g, 'ADBE Glo2-0003', 60);
            UK.keys(UK.p(g, 'ADBE Glo2-0004'), [[c.t0, 0], [tA, 1.5 * c.strength], [c.t1, 3]], 'smooth');
        }
    });

    UK.add({
        id: 'fx.oldFilm', cat: 'fx', name: 'Old Film · Старая плёнка',
        desc: 'Сепия, зерно, виньетка и мерцание яркости.',
        tags: 'old film vintage sepia grain flicker старая плёнка',
        apply: function (c) {
            var k = c.strength;
            var tn = UK.addFx(c.layer, 'ADBE Tint', 'Old Sepia');
            UK.set(tn, 'ADBE Tint-0001', col(0.1, 0.07, 0.04)); UK.set(tn, 'ADBE Tint-0002', col(1, 0.92, 0.78));
            drive(c, tn, 'ADBE Tint-0003', 'Old Film Sepia', UK.clamp(70 * k, 0, 100));
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Old Flicker');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0002', 15 * k);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var fa = UK.cv(c, 'Old Film Flicker', 10 * k);
            UK.expr(bc, 'ADBE Brightness & Contrast 2-0001', 'posterizeTime(12); seedRandom(index, false); (random() - 0.5) * 2 * ' + fa);
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'Old Grain');
            drive(c, nz, 'ADBE Noise2-0001', 'Old Film Grain', 22 * k);
            UK.set(nz, 'ADBE Noise2-0002', 0); UK.set(nz, 'ADBE Noise2-0003', 1);
            var vg = UK.addFx(c.layer, 'CC Vignette', 'Old Vignette');
            drive(c, vg, 'CC Vignette-0001', 'Old Film Vignette', 80 * k);
            UK.set(vg, 'CC Vignette-0002', 55);
            UK.set(vg, 'CC Vignette-0003', [c.comp.width / 2, c.comp.height / 2]);
        }
    });

    UK.add({
        id: 'fx.dreamy', cat: 'fx', name: 'Dreamy Soft Focus · Мягкий фокус',
        desc: 'Размытая копия слоя в режиме Screen поверх — «мечтательная» дымка.',
        tags: 'dreamy soft focus diffusion glow дымка',
        apply: function (c) {
            if (!isAV(c.layer)) {
                var g0 = UK.addFx(c.layer, 'ADBE Glo2', 'Dreamy');
                UK.set(g0, 'ADBE Glo2-0002', 40); UK.set(g0, 'ADBE Glo2-0003', 200);
                drive(c, g0, 'ADBE Glo2-0004', 'Dreamy Intensity', 0.5 * c.strength);
                return;
            }
            var d = c.layer.duplicate();
            d.name = UK.PREFIX + 'Dreamy ' + c.layer.name;
            d.blendingMode = BlendingMode.SCREEN;
            var bl = UK.addFx(d, 'ADBE Gaussian Blur 2', 'Dreamy Blur');
            UK.set(bl, 'ADBE Gaussian Blur 2-0001', 45 * c.strength);
            UK.set(bl, 'ADBE Gaussian Blur 2-0003', 1);
            if (c.opts.controls) {
                UK.expr(bl, 'ADBE Gaussian Blur 2-0001', cvOn(c, d, 'Dreamy Blur', 45 * c.strength));
                d.transform.opacity.expression = cvOn(c, d, 'Dreamy Opacity', 55);
            } else {
                d.transform.opacity.setValue(55);
            }
        }
    });

    UK.add({
        id: 'fx.lensFlare', cat: 'fx', name: 'Lens Flare · Блик объектива',
        desc: 'Классический Lens Flare; центр — Point Control.',
        tags: 'lens flare sun light блик',
        apply: function (c) {
            var s = lw(c);
            var lf = UK.addFx(c.layer, 'ADBE Lens Flare', 'Lens Flare');
            drivePoint(c, lf, 'ADBE Lens Flare-0001', 'Flare Center', [s[0] * 0.72, s[1] * 0.28]);
            drive(c, lf, 'ADBE Lens Flare-0002', 'Flare Brightness', 100 * c.strength);
            UK.set(lf, 'ADBE Lens Flare-0003', 1);
            UK.set(lf, 'ADBE Lens Flare-0004', 0);
        }
    });

    UK.add({
        id: 'fx.tiltShift', cat: 'fx', name: 'Tilt-Shift · Миниатюра',
        desc: 'Резкая полоса по центру, размытые верх/низ (Compound Blur + скрытая карта).',
        tags: 'tilt shift miniature blur миниатюра',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height;
            var map = UK.solid(c.comp, [1, 1, 1], 'TiltShift Map', c.layer.inPoint, c.layer.outPoint);
            var rp = UK.addFx(map, 'ADBE Ramp', 'Map Ramp');
            UK.set(rp, 'ADBE Ramp-0001', [W / 2, H / 2]);
            UK.set(rp, 'ADBE Ramp-0002', col(0, 0, 0));
            UK.set(rp, 'ADBE Ramp-0003', [W / 2, H * 0.08]);
            UK.set(rp, 'ADBE Ramp-0004', col(1, 1, 1));
            UK.set(rp, 'ADBE Ramp-0005', 1);
            var mr = UK.addFx(map, 'ADBE Mirror', 'Map Mirror');
            UK.set(mr, 'ADBE Mirror-0001', [W / 2, H / 2]);
            UK.set(mr, 'ADBE Mirror-0002', 90);
            map.enabled = false;
            var cb = UK.addFx(c.layer, 'ADBE Compound Blur', 'Tilt-Shift');
            UK.set(cb, 'ADBE Compound Blur-0001', map.index);
            drive(c, cb, 'ADBE Compound Blur-0002', 'TiltShift Blur', 25 * c.strength);
            UK.set(cb, 'ADBE Compound Blur-0003', 1);
            UK.set(cb, 'ADBE Compound Blur-0004', 0);
        }
    });

    UK.add({
        id: 'fx.zoomBlur', cat: 'fx', name: 'Zoom Blur · Радиальное размытие',
        desc: 'Статичное зум-размытие от центра (CC Radial Fast Blur).',
        tags: 'zoom radial blur speed размытие',
        apply: function (c) {
            var s = lw(c);
            var rb = UK.addFx(c.layer, 'CC Radial Fast Blur', 'Zoom Blur');
            drivePoint(c, rb, 'CC Radial Fast Blur-0001', 'Zoom Blur Center', [s[0] / 2, s[1] / 2]);
            drive(c, rb, 'CC Radial Fast Blur-0002', 'Zoom Blur Amount', 25 * c.strength);
            UK.set(rb, 'CC Radial Fast Blur-0003', 1);
        }
    });

    UK.add({
        id: 'fx.motionBlurBoost', cat: 'fx', name: 'Motion Blur Boost · Усиленный MB',
        desc: 'CC Force Motion Blur с 360° затвором + включение MB слоя.',
        tags: 'motion blur force shutter смаз',
        apply: function (c) {
            UK.motionBlur(c.layer, c.comp);
            var fm = UK.addFx(c.layer, 'CC Force Motion Blur', 'Force MB');
            UK.set(fm, 'CC Force Motion Blur-0001', 16);
            UK.set(fm, 'CC Force Motion Blur-0002', 1);
            drive(c, fm, 'CC Force Motion Blur-0003', 'MB Shutter Angle', UK.clamp(360 * c.strength, 0, 720));
            UK.set(fm, 'CC Force Motion Blur-0004', 1);
        }
    });

    UK.add({
        id: 'fx.invert', cat: 'fx', name: 'Invert · Негатив',
        desc: 'Инверсия цветов.',
        tags: 'invert negative негатив инверсия',
        apply: function (c) {
            var iv = UK.addFx(c.layer, 'ADBE Invert', 'Invert');
            UK.set(iv, 'ADBE Invert-0001', 1);
            drive(c, iv, 'ADBE Invert-0002', 'Invert Blend', UK.clamp(100 - 100 * c.strength, 0, 100));
        }
    });

    UK.add({
        id: 'fx.threshold', cat: 'fx', name: 'Threshold · Порог',
        desc: 'Жёсткое ч/б по порогу яркости.',
        tags: 'threshold black white stencil порог трафарет',
        apply: function (c) {
            var th = UK.addFx(c.layer, 'ADBE Threshold2', 'Threshold');
            drive(c, th, 'ADBE Threshold2-0001', 'Threshold Level', UK.clamp(Math.round(127 * c.strength), 0, 255));
        }
    });

    UK.add({
        id: 'fx.dotMatrix', cat: 'fx', name: 'Dot Matrix · Точечный растр',
        desc: 'Картинка из точек (CC Ball Action) — полутоновый вид.',
        tags: 'halftone dots ball action растр точки',
        apply: function (c) {
            var ba = UK.addFx(c.layer, 'CC Ball Action', 'Dot Matrix');
            UK.set(ba, 'CC Ball Action-0001', 0);
            drive(c, ba, 'CC Ball Action-0006', 'Dot Spacing', Math.max(2, Math.round(8 * c.strength)));
            drive(c, ba, 'CC Ball Action-0007', 'Dot Size', 70);
        }
    });

    UK.add({
        id: 'fx.blur', cat: 'fx', name: 'Gaussian Blur · Размытие',
        desc: 'Простое размытие с слайдером.',
        tags: 'blur gaussian размытие',
        apply: function (c) {
            var bl = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Blur');
            drive(c, bl, 'ADBE Gaussian Blur 2-0001', 'Blur Amount', 30 * c.strength);
            UK.set(bl, 'ADBE Gaussian Blur 2-0003', 1);
        }
    });

    UK.add({
        id: 'fx.dirBlur', cat: 'fx', name: 'Directional Blur · Смаз по направлению',
        desc: 'Направленное размытие (угол по направлению из настроек).',
        tags: 'directional motion blur angle смаз',
        apply: function (c) {
            var db = UK.addFx(c.layer, 'ADBE Motion Blur', 'Directional Blur');
            drive(c, db, 'ADBE Motion Blur-0001', 'DirBlur Angle', dirAngle(c));
            drive(c, db, 'ADBE Motion Blur-0002', 'DirBlur Length', 40 * c.strength);
        }
    });

    UK.add({
        id: 'fx.softEdge', cat: 'fx', name: 'Soft Edge Mask · Мягкие края',
        desc: 'Маска по краю слоя с большой растушёвкой.',
        tags: 'soft edge mask feather vignette мягкие края',
        apply: function (c) {
            var s = lw(c), inset = Math.round(Math.min(s[0], s[1]) * 0.06);
            var fe = Math.round(Math.min(s[0], s[1]) * 0.25 * c.strength);
            var m = c.layer.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
            var sh = new Shape();
            sh.vertices = [[inset, inset], [s[0] - inset, inset], [s[0] - inset, s[1] - inset], [inset, s[1] - inset]];
            sh.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.closed = true;
            m.property('ADBE Mask Shape').setValue(sh);
            m.property('ADBE Mask Feather').setValue([fe, fe]);
            m.name = UK.PREFIX + 'Soft Edge';
            if (c.opts.controls) {
                var ref = UK.cv(c, 'Soft Edge Feather', fe);
                m.property('ADBE Mask Feather').expression = '[' + ref + ', ' + ref + ']';
            }
        }
    });

    UK.add({
        id: 'fx.focusPull', cat: 'fx', name: 'Focus Pull · Наводка на резкость',
        desc: 'Событие: из размытия в резкость за длительность от старта.',
        tags: 'focus pull rack blur in событие резкость',
        apply: function (c) {
            var bl = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Focus Pull');
            UK.set(bl, 'ADBE Gaussian Blur 2-0003', 1);
            UK.keys(UK.p(bl, 'ADBE Gaussian Blur 2-0001'), [[c.t0, 60 * c.strength], [c.t1, 0]], c.ease);
        }
    });

    // ================================================================ СОБЫТИЯ (хиты)
    UK.add({
        id: 'fx.glitchHit', cat: 'fx', name: 'Glitch Hit · Глитч-удар',
        desc: 'Событие: рывки позиции, блоки и RGB-смаз на длительность от старта.',
        tags: 'glitch hit digital rgb событие глитч',
        apply: function (c) {
            var s = lw(c), k = c.strength;
            var tf = UK.addFx(c.layer, 'ADBE Geometry2', 'Glitch Shift');
            var pos = UK.p(tf, 'ADBE Geometry2-0002');
            var base = pos.value;
            var mo = UK.addFx(c.layer, 'ADBE Mosaic', 'Glitch Blocks');
            UK.set(mo, 'ADBE Mosaic-0003', 1);
            var mh = UK.p(mo, 'ADBE Mosaic-0001'), mv = UK.p(mo, 'ADBE Mosaic-0002');
            var cb = UK.addFx(c.layer, 'ADBE Channel Blur', 'Glitch RGB');
            UK.set(cb, 'ADBE Channel Blur-0005', 1); UK.set(cb, 'ADBE Channel Blur-0006', 2);
            var rb = UK.p(cb, 'ADBE Channel Blur-0001'), bb = UK.p(cb, 'ADBE Channel Blur-0003');
            var n = Math.max(3, Math.round(c.dur / (c.fd * 2)));
            var step = c.dur / n, i, t, idx;
            var full = [s[0] * 4, s[1] * 4];
            for (i = 0; i < n; i++) {
                t = c.t0 + i * step;
                var hard = (i % 2 === 0);
                idx = UK.key(pos, t, [base[0] + UK.rnd(-40, 40) * k * (hard ? 1 : 0.3), base[1] + UK.rnd(-12, 12) * k * (hard ? 1 : 0.3)]); UK.setHold(pos, idx);
                idx = UK.key(mh, t, hard ? Math.round(UK.rnd(20, 90)) : full[0]); UK.setHold(mh, idx);
                idx = UK.key(mv, t, hard ? Math.round(UK.rnd(60, 300)) : full[1]); UK.setHold(mv, idx);
                idx = UK.key(rb, t, hard ? UK.rnd(10, 40) * k : 0); UK.setHold(rb, idx);
                idx = UK.key(bb, t, hard ? UK.rnd(10, 40) * k : 0); UK.setHold(bb, idx);
            }
            idx = UK.key(pos, c.t1, base); UK.setHold(pos, idx);
            idx = UK.key(mh, c.t1, full[0]); UK.setHold(mh, idx);
            idx = UK.key(mv, c.t1, full[1]); UK.setHold(mv, idx);
            idx = UK.key(rb, c.t1, 0); UK.setHold(rb, idx);
            idx = UK.key(bb, c.t1, 0); UK.setHold(bb, idx);
        }
    });

    UK.add({
        id: 'fx.flashHit', cat: 'fx', name: 'Flash Hit · Вспышка',
        desc: 'Событие: резкая белая вспышка с быстрым затуханием.',
        tags: 'flash hit white impact событие вспышка',
        apply: function (c) {
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Flash');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var br = UK.p(bc, 'ADBE Brightness & Contrast 2-0001');
            UK.keys(br, [[c.t0, 0], [c.t0 + c.fd, UK.clamp(150 * c.strength, 0, 150)], [c.t1, 0]], 'expoOut');
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Flash Glow');
            UK.set(g, 'ADBE Glo2-0002', 50); UK.set(g, 'ADBE Glo2-0003', 150);
            UK.keys(UK.p(g, 'ADBE Glo2-0004'), [[c.t0, 0], [c.t0 + c.fd, 2 * c.strength], [c.t1, 0]], 'expoOut');
        }
    });

    UK.add({
        id: 'fx.shakeHit', cat: 'fx', name: 'Shake Hit · Удар с тряской',
        desc: 'Событие: сильная тряска, затухающая за длительность от старта.',
        tags: 'shake hit impact wiggle decay событие удар',
        apply: function (c) {
            var amp = UK.cv(c, 'Hit Amp', 60 * c.strength);
            var freq = UK.cv(c, 'Hit Freq', 18);
            var decay = UK.cv(c, 'Hit Decay', UK.fmt(4 / c.dur, 3));
            var pos = c.layer.transform.position;
            pos.expression =
                'var t0 = ' + UK.fmt(c.t0, 4) + ';\n' +
                'var t = time - t0;\n' +
                'if (t < 0) { value; } else {\n' +
                '  var w = wiggle(' + freq + ', ' + amp + ') - value;\n' +
                '  value + w * Math.exp(-' + decay + ' * t);\n' +
                '}';
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'fx.zoomHit', cat: 'fx', name: 'Zoom Punch · Зум-удар',
        desc: 'Событие: резкий наезд масштаба с возвратом (под бит).',
        tags: 'zoom punch beat hit scale событие',
        apply: function (c) {
            var sc = c.layer.transform.scale;
            var v = sc.valueAtTime(c.t0, false);
            var up = UK.vecMul(v, 1 + 0.18 * c.strength);
            UK.keys(sc, [[c.t0, v], [c.t0 + Math.max(c.fd, c.dur * 0.15), up], [c.t1, v]], 'expoOut');
            UK.motionBlur(c.layer, c.comp);
        }
    });

})();
