// =============================================================================
//  TEXT — анимации текста через аниматоры (посимвольно / по словам / по строкам)
// =============================================================================
(function () {

    var CH = 1, WORDS = 3, LINES = 4;           // Based On
    var SQUARE = 1, RAMP_UP = 2, RAMP_DOWN = 3, TRIANGLE = 4, SMOOTH = 6;

    /** Тайминг исчезновения: конец = outPoint слоя (или курсор), минус stagger. */
    function outT(c) {
        var stg = (Number(c.opts.stagger) || 0) * c.i;
        var t1 = (c.opts.startMode === 'playhead' ? c.comp.time : c.layer.outPoint) - stg;
        return { t0: t1 - c.dur, t1: t1 };
    }
    /** Исходное появление: диапазон шириной w (%) проходит по тексту; с направления R — справа налево. */
    function rampIn(ta, c, basedOn, w, o) {
        o = o || {};
        w = w || 50;
        var fromRight = c.dirId === 'R';
        var sel = { basedOn: basedOn, shape: fromRight ? RAMP_DOWN : RAMP_UP, start: 0, end: w };
        if (o.easeHigh != null) sel.easeHigh = o.easeHigh;
        if (o.easeLow != null) sel.easeLow = o.easeLow;
        if (o.random) sel.random = true;
        UK.textSelector(ta, sel);
        if (fromRight) UK.textOffsetKeys(ta, c.t0, c.t1, 100, -w, c.ease);
        else UK.textOffsetKeys(ta, c.t0, c.t1, -w, 100, c.ease);
    }
    /** Исчезновение (зеркально rampIn), ключи в [t.t0, t.t1]. */
    function rampOut(ta, c, basedOn, w, o) {
        o = o || {};
        w = w || 50;
        var t = outT(c);
        var fromRight = c.dirId === 'R';
        var sel = { basedOn: basedOn, shape: fromRight ? RAMP_DOWN : RAMP_UP, start: 0, end: w };
        if (o.easeHigh != null) sel.easeHigh = o.easeHigh;
        if (o.easeLow != null) sel.easeLow = o.easeLow;
        UK.textSelector(ta, sel);
        if (fromRight) UK.textOffsetKeys(ta, t.t0, t.t1, -w, 100, c.ease, true);
        else UK.textOffsetKeys(ta, t.t0, t.t1, 100, -w, c.ease, true);
        return t;
    }
    /** Square-селектор: появление offset 0→100, исчезновение -100→0. */
    function squareIn(ta, c, basedOn, random, linear) {
        UK.textSelector(ta, { basedOn: basedOn, shape: SQUARE, start: 0, end: 100, random: !!random, smooth: 0 });
        UK.textOffsetKeys(ta, c.t0, c.t1, 0, 100, linear ? 'linear' : c.ease);
    }
    function squareOut(ta, c, basedOn, random, linear) {
        var t = outT(c);
        UK.textSelector(ta, { basedOn: basedOn, shape: SQUARE, start: 0, end: 100, random: !!random, smooth: 0 });
        UK.textOffsetKeys(ta, t.t0, t.t1, -100, 0, linear ? 'linear' : c.ease);
        return t;
    }
    function dirVec(c, d) { return [c.dirV[0] * d, c.dirV[1] * d, 0]; }
    function sourceText(layer) { return layer.property('ADBE Text Properties').property('ADBE Text Document'); }

    // -------------------------------------------------------------- IN
    UK.add({
        id: 'text.typewriter', cat: 'text', needs: 'text', name: 'Typewriter · Печатная машинка',
        desc: 'Буквы появляются по одной, без сглаживания.', tags: 'typewriter type печать машинка буквы',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Typewriter');
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            squareIn(ta, c, CH, false, true);
        }
    });
    UK.add({
        id: 'text.fadeWords', cat: 'text', needs: 'text', name: 'Fade by Words · По словам',
        desc: 'Слова проявляются одно за другим.', tags: 'fade words слова',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Fade Words');
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, WORDS, 40);
        }
    });
    UK.add({
        id: 'text.fadeLines', cat: 'text', needs: 'text', name: 'Fade by Lines · По строкам',
        desc: 'Строки проявляются сверху вниз.', tags: 'fade lines строки',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Fade Lines');
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, LINES, 60);
        }
    });
    UK.add({
        id: 'text.linesSlideUp', cat: 'text', needs: 'text', name: 'Lines Slide Up · Строки снизу',
        desc: 'Строки выезжают снизу с проявлением.', tags: 'lines slide up строки снизу',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Lines Slide');
            UK.textProp(ta, 'ADBE Text Position 3D', [0, 80 * c.strength, 0]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, LINES, 60);
        }
    });
    UK.add({
        id: 'text.charsSlideUp', cat: 'text', needs: 'text', name: 'Chars Slide Up · Буквы снизу',
        desc: 'Буквы всплывают снизу с проявлением.', tags: 'chars slide up буквы снизу всплытие',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Chars Slide Up');
            UK.textProp(ta, 'ADBE Text Position 3D', [0, 60 * c.strength, 0]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, CH, 50, { easeHigh: 40 });
        }
    });
    UK.add({
        id: 'text.slideChars', cat: 'text', needs: 'text', name: 'Chars Slide In · Буквы по направлению',
        desc: 'Буквы влетают по выбранному направлению.', tags: 'chars slide direction буквы влёт',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Chars Slide');
            UK.textProp(ta, 'ADBE Text Position 3D', dirVec(c, -120 * c.strength));
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, CH, 50, { easeHigh: 50 });
        }
    });
    UK.add({
        id: 'text.charsPop', cat: 'text', needs: 'text', name: 'Chars Pop · Буквы выскакивают',
        desc: 'Буквы вырастают из нуля с мягким торможением.', tags: 'chars pop scale буквы масштаб',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Chars Pop');
            UK.textProp(ta, 'ADBE Text Scale 3D', [0, 0, 100]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, CH, 40, { easeHigh: 70, easeLow: -20 });
        }
    });
    UK.add({
        id: 'text.charsBlur', cat: 'text', needs: 'text', name: 'Chars Blur In · Буквы из размытия',
        desc: 'Буквы собираются из размытия.', tags: 'chars blur focus буквы размытие',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Chars Blur');
            UK.textProp(ta, 'ADBE Text Blur', [25 * c.strength, 25 * c.strength]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, CH, 60);
        }
    });
    UK.add({
        id: 'text.charsRotate', cat: 'text', needs: 'text', name: 'Chars Rotate In · Буквы с поворотом',
        desc: 'Буквы раскручиваются из повёрнутого положения.', tags: 'chars rotate spin буквы поворот',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Chars Rotate');
            UK.textProp(ta, 'ADBE Text Rotation', (c.dirId === 'R' ? -1 : 1) * 90 * c.strength);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, CH, 50, { easeHigh: 50 });
        }
    });
    UK.add({
        id: 'text.charsDrop', cat: 'text', needs: 'text', name: 'Chars Drop · Буквы падают',
        desc: 'Буквы падают сверху с мягкой посадкой.', tags: 'chars drop fall буквы падение',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Chars Drop');
            UK.textProp(ta, 'ADBE Text Position 3D', [0, -160 * c.strength, 0]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, CH, 40, { easeHigh: 80, easeLow: 0 });
        }
    });
    UK.add({
        id: 'text.bounceLetters', cat: 'text', needs: 'text', name: 'Bounce Letters · Буквы с отскоком',
        desc: 'Буквы прыгают снизу и мягко садятся (отскок через Ease селектора).', tags: 'bounce letters jump буквы отскок',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Bounce Letters');
            UK.textProp(ta, 'ADBE Text Position 3D', [0, 110 * c.strength, 0]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            UK.textProp(ta, 'ADBE Text Scale 3D', [70, 130, 100]);
            rampIn(ta, c, CH, 45, { easeHigh: 100, easeLow: -60 });
        }
    });
    UK.add({
        id: 'text.skewIn', cat: 'text', needs: 'text', name: 'Skew In · Наклон',
        desc: 'Буквы выпрямляются из наклона, влетая по направлению.', tags: 'skew italic наклон буквы',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Skew In');
            UK.textProp(ta, 'ADBE Text Skew', (c.dirId === 'R' ? -1 : 1) * 40 * c.strength);
            UK.textProp(ta, 'ADBE Text Position 3D', dirVec(c, -40 * c.strength));
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, CH, 50, { easeHigh: 40 });
        }
    });
    UK.add({
        id: 'text.randomFade', cat: 'text', needs: 'text', name: 'Random Fade · Случайный порядок',
        desc: 'Буквы проявляются в случайном порядке.', tags: 'random fade случайный буквы',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Random Fade');
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            UK.textProp(ta, 'ADBE Text Blur', [8 * c.strength, 8 * c.strength]);
            UK.textSelector(ta, { basedOn: CH, shape: RAMP_UP, start: 0, end: 60, random: true });
            UK.textOffsetKeys(ta, c.t0, c.t1, -60, 100, c.ease);
        }
    });
    UK.add({
        id: 'text.flip3D', cat: 'text', needs: 'text', name: 'Flip 3D Chars · 3D-переворот букв',
        desc: 'Включает 3D по символам; буквы разворачиваются вокруг вертикальной оси.', tags: 'flip 3d chars переворот буквы',
        apply: function (c) {
            try { c.layer.threeDPerChar = true; } catch (e) {}
            var ta = UK.textAnimator(c.layer, 'Flip 3D');
            UK.textProp(ta, 'ADBE Text Rotation Y', (c.dirId === 'R' ? 1 : -1) * 90 * c.strength);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampIn(ta, c, CH, 50, { easeHigh: 50 });
        }
    });
    UK.add({
        id: 'text.zoomWords', cat: 'text', needs: 'text', name: 'Zoom Words · Слова из глубины',
        desc: 'Слова прилетают из увеличения с размытием — кинематографичный заголовок.', tags: 'zoom words слова приближение',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Zoom Words');
            UK.textProp(ta, 'ADBE Text Scale 3D', [100 + 200 * c.strength, 100 + 200 * c.strength, 100]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            UK.textProp(ta, 'ADBE Text Blur', [10 * c.strength, 10 * c.strength]);
            rampIn(ta, c, WORDS, 50, { easeHigh: 60 });
        }
    });
    UK.add({
        id: 'text.trackingIn', cat: 'text', needs: 'text', name: 'Tracking Expand · Разлёт трекинга',
        desc: 'Буквы расходятся из сжатого состояния, текст проявляется.', tags: 'tracking expand трекинг разлёт кино',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Tracking In');
            var tr = UK.textProp(ta, 'ADBE Text Tracking Amount', 0);
            UK.textSelector(ta, { basedOn: CH, start: 0, end: 100 });
            UK.key2(tr, c.t0, -22 * c.strength, c.t1, 0, c.ease);
            var op = c.layer.transform.opacity;
            UK.key2(op, c.t0, 0, c.t0 + c.dur * 0.6, op.valueAtTime(c.t1, false), 'smooth');
        }
    });
    UK.add({
        id: 'text.scramble', cat: 'text', needs: 'text', name: 'Scramble Decode · Расшифровка',
        desc: 'Символы хаотично перебираются и один за другим фиксируются в итоговый текст.', tags: 'scramble decode glitch hacker расшифровка',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Scramble');
            var off = UK.textProp(ta, 'ADBE Text Character Offset', 10);
            var rate = UK.cv(c, 'Scramble Rate', 15);
            off.expression = 'posterizeTime(' + rate + ');\nseedRandom(index + Math.floor(time * ' + rate + '), true);\nMath.round(random(1, 30))';
            UK.textProp(ta, 'ADBE Text Opacity', 60);
            squareIn(ta, c, CH, false, true);
        }
    });
    UK.add({
        id: 'text.colorWipe', cat: 'text', needs: 'text', name: 'Color Wipe · Цветовая волна',
        desc: 'Акцентный цвет пробегает по тексту (контрол «Wipe Color»).', tags: 'color wipe highlight цвет волна акцент',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Color Wipe');
            var col = UK.textProp(ta, 'ADBE Text Fill Color', [1, 0.75, 0.2, 1]);
            if (c.opts.controls) col.expression = UK.cv(c, 'Wipe Color', [1, 0.75, 0.2, 1], 'color');
            UK.textSelector(ta, { basedOn: CH, shape: TRIANGLE, start: 0, end: 35 });
            if (c.dirId === 'R') UK.textOffsetKeys(ta, c.t0, c.t1, 100, -35, 'smooth');
            else UK.textOffsetKeys(ta, c.t0, c.t1, -35, 100, 'smooth');
        }
    });

    // -------------------------------------------------------------- LOOPS
    UK.add({
        id: 'text.wave', cat: 'text', needs: 'text', name: 'Wave · Волна',
        desc: 'Буквы бесконечно качаются волной. Амплитуда и скорость — контролы.', tags: 'wave loop волна буквы цикл',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Wave');
            var pos = UK.textProp(ta, 'ADBE Text Position 3D', [0, -30 * c.strength, 0]);
            if (c.opts.controls) pos.expression = '[0, -' + UK.cv(c, 'Wave Amp', 30 * c.strength) + ', 0]';
            UK.textSelector(ta, { basedOn: CH, shape: TRIANGLE, start: 0, end: 50, smooth: 100 });
            var sp = UK.cv(c, 'Wave Speed', 1 / Math.max(0.3, c.dur));
            var off = UK.findProp(ta.sel, ['ADBE Text Percent Offset', 'Offset']);
            off.expression = 'var s = ' + sp + ';\n(((time - inPoint) * s * 150) % 150) - 50';
        }
    });
    UK.add({
        id: 'text.jitter', cat: 'text', needs: 'text', name: 'Jitter · Дрожание',
        desc: 'Нервное дрожание букв (положение + поворот) — контролы «Jitter Amp/Rate».', tags: 'jitter shake дрожание буквы нервный',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Jitter');
            var pos = UK.textProp(ta, 'ADBE Text Position 3D', [0, 0, 0]);
            var rot = UK.textProp(ta, 'ADBE Text Rotation', 0);
            UK.textSelector(ta, { basedOn: CH, shape: SQUARE, start: 0, end: 100, random: true });
            var amp = UK.cv(c, 'Jitter Amp', 6 * c.strength), rate = UK.cv(c, 'Jitter Rate', 12);
            pos.expression = 'var a = ' + amp + ';\nwiggle(' + rate + ', a)';
            rot.expression = 'wiggle(' + rate + ', ' + amp + ' * 0.8)';
        }
    });

    // -------------------------------------------------------------- OUT
    UK.add({
        id: 'text.fadeOutChars', cat: 'text', needs: 'text', name: 'Fade Out by Chars · Буквы гаснут',
        desc: 'Буквы исчезают одна за другой к концу слоя.', tags: 'fade out chars буквы исчезновение',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Fade Out Chars');
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampOut(ta, c, CH, 50);
        }
    });
    UK.add({
        id: 'text.fadeOutWords', cat: 'text', needs: 'text', name: 'Fade Out by Words · Слова гаснут',
        desc: 'Слова исчезают по очереди к концу слоя.', tags: 'fade out words слова исчезновение',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Fade Out Words');
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampOut(ta, c, WORDS, 40);
        }
    });
    UK.add({
        id: 'text.scaleOut', cat: 'text', needs: 'text', name: 'Scale Out Chars · Буквы сжимаются',
        desc: 'Буквы схлопываются в ноль.', tags: 'scale out chars буквы сжатие',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Scale Out');
            UK.textProp(ta, 'ADBE Text Scale 3D', [0, 0, 100]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampOut(ta, c, CH, 40, { easeLow: 50 });
        }
    });
    UK.add({
        id: 'text.blurOut', cat: 'text', needs: 'text', name: 'Blur Out Chars · Буквы в размытие',
        desc: 'Буквы расплываются и гаснут.', tags: 'blur out chars буквы размытие',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Blur Out');
            UK.textProp(ta, 'ADBE Text Blur', [25 * c.strength, 25 * c.strength]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampOut(ta, c, CH, 60);
        }
    });
    UK.add({
        id: 'text.slideOut', cat: 'text', needs: 'text', name: 'Slide Out Chars · Буквы улетают',
        desc: 'Буквы улетают по направлению и гаснут.', tags: 'slide out chars буквы улёт',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Slide Out');
            UK.textProp(ta, 'ADBE Text Position 3D', dirVec(c, 120 * c.strength));
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampOut(ta, c, CH, 50, { easeLow: 40 });
        }
    });
    UK.add({
        id: 'text.dropOut', cat: 'text', needs: 'text', name: 'Drop Out Chars · Буквы падают вниз',
        desc: 'Буквы по очереди срываются вниз.', tags: 'drop out fall chars буквы падение вниз',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Drop Out');
            UK.textProp(ta, 'ADBE Text Position 3D', [0, 220 * c.strength, 0]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            UK.textProp(ta, 'ADBE Text Rotation', 25 * c.strength);
            rampOut(ta, c, CH, 40, { easeLow: 70 });
        }
    });
    UK.add({
        id: 'text.rotateOut', cat: 'text', needs: 'text', name: 'Rotate Out Chars · Буквы закручиваются',
        desc: 'Буквы закручиваются и исчезают.', tags: 'rotate out spin chars буквы поворот',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Rotate Out');
            UK.textProp(ta, 'ADBE Text Rotation', (c.dirId === 'R' ? -1 : 1) * 90 * c.strength);
            UK.textProp(ta, 'ADBE Text Scale 3D', [60, 60, 100]);
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            rampOut(ta, c, CH, 50);
        }
    });
    UK.add({
        id: 'text.typewriterOut', cat: 'text', needs: 'text', name: 'Typewriter Out · Стирание',
        desc: 'Буквы стираются по одной (с конца, если направление →).', tags: 'typewriter out erase стирание',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Typewriter Out');
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            var t = outT(c);
            UK.textSelector(ta, { basedOn: CH, shape: SQUARE, start: 0, end: 100, smooth: 0 });
            if (c.dirId === 'R') UK.textOffsetKeys(ta, t.t0, t.t1, 100, 0, 'linear');
            else UK.textOffsetKeys(ta, t.t0, t.t1, -100, 0, 'linear');
        }
    });
    UK.add({
        id: 'text.trackingOut', cat: 'text', needs: 'text', name: 'Tracking Out · Разлёт и исчезновение',
        desc: 'Буквы разлетаются трекингом и гаснут к концу слоя.', tags: 'tracking out трекинг разлёт исчезновение',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Tracking Out');
            var tr = UK.textProp(ta, 'ADBE Text Tracking Amount', 0);
            UK.textSelector(ta, { basedOn: CH, start: 0, end: 100 });
            var t = outT(c);
            UK.key2(tr, t.t0, 0, t.t1, 60 * c.strength, c.ease, true);
            var op = c.layer.transform.opacity;
            UK.key2(op, t.t0 + c.dur * 0.3, op.valueAtTime(t.t0, false), t.t1, 0, 'expoIn');
        }
    });

    // -------------------------------------------------------------- EXPRESSIONS ON SOURCE TEXT
    UK.add({
        id: 'text.counter', cat: 'text', needs: 'text', name: 'Counter · Счётчик чисел',
        desc: 'Число растёт от «From» до «To» за длительность (контролы From/To/Decimals, суффикс — слайдер Decimals).',
        tags: 'counter number счётчик числа проценты',
        apply: function (c) {
            var from = UK.cv(c, 'Counter From', 0), to = UK.cv(c, 'Counter To', Math.round(100 * c.strength)), dec = UK.cv(c, 'Counter Decimals', 0);
            var st = sourceText(c.layer);
            st.expression = 'var a = ' + from + ', b = ' + to + ', d = Math.max(0, Math.round(' + dec + '));\n' +
                'var t0 = ' + UK.fmt(c.t0) + ', t1 = ' + UK.fmt(c.t1) + ';\n' +
                'var v = ease(time, t0, t1, a, b);\n' +
                'var s = v.toFixed(d);\n' +
                'var parts = s.split(".");\n' +
                'parts[0] = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ");\n' +
                'parts.join(".")';
        }
    });
    UK.add({
        id: 'text.typingCursor', cat: 'text', needs: 'text', name: 'Typing + Cursor · Набор с курсором',
        desc: 'Текст набирается с заданной скоростью (символов/с), мигающий курсор «|» в конце.',
        tags: 'typing cursor terminal набор курсор терминал',
        apply: function (c) {
            var st = sourceText(c.layer);
            var cps = UK.cv(c, 'Chars Per Sec', 12 * c.strength);
            st.expression = 'var txt = "" + text.sourceText;\n' +
                'var n = Math.floor(Math.max(0, time - inPoint) * Math.max(0.1, ' + cps + '));\n' +
                'n = Math.min(txt.length, n);\n' +
                'var blink = (Math.floor(time * 2) % 2 == 0) ? "|" : " ";\n' +
                'txt.substr(0, n) + blink';
        }
    });

})();
