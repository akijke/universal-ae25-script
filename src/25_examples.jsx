// =============================================================================
//  Базовые пресеты — эталон стиля для остальных библиотек
// =============================================================================
(function () {

    // --- Появление: Fade In
    UK.add({
        id: 'in.fade', cat: 'in', name: 'Fade In · Проявление',
        desc: 'Плавное появление по прозрачности.', tags: 'fade opacity прозрачность',
        apply: function (c) {
            var op = c.layer.transform.opacity;
            var end = op.valueAtTime(c.t1, false);
            UK.key2(op, c.t0, 0, c.t1, end, c.ease);
        }
    });

    // --- Появление: Slide In (направление из настроек, расстояние — за край кадра)
    UK.add({
        id: 'in.slide', cat: 'in', name: 'Slide In · Влёт из-за края',
        desc: 'Слой влетает из-за края композиции по выбранному направлению. Сила = доля расстояния.',
        tags: 'slide move position движение влёт',
        apply: function (c) {
            var pos = c.layer.transform.position;
            var end = pos.valueAtTime(c.t1, false);
            var d = UK.exitDistance(c.layer, c.comp, c.dirV, c.t0) * c.strength;
            var start = UK.vecAdd(end, UK.vecMul(c.dirV, d));
            UK.key2(pos, c.t0, start, c.t1, end, c.ease);
            UK.applyEaseExpr(pos, c.ease, c);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    // --- Исчезновение: Scale Out
    UK.add({
        id: 'out.scale', cat: 'out', name: 'Scale Out · Уменьшение',
        desc: 'Слой уменьшается до нуля и исчезает.', tags: 'scale shrink масштаб',
        apply: function (c) {
            var sc = c.layer.transform.scale, op = c.layer.transform.opacity;
            var v = sc.valueAtTime(c.t0, false);
            UK.key2(sc, c.t0, v, c.t1, UK.vecMul(v, 0), c.ease, true);
            UK.key2(op, c.t0 + c.dur * 0.4, op.valueAtTime(c.t0, false), c.t1, 0, 'expoIn');
        }
    });

    // --- Переход: Zoom Blur на корректирующем слое
    UK.add({
        id: 'trans.zoomBlur', cat: 'trans', name: 'Zoom Blur · Зум с размытием',
        desc: 'Корректирующий слой над склейкой: резкий зум + радиальное размытие.',
        tags: 'zoom blur transition зум переход', needs: 'trans',
        apply: function (c) {
            var adj = c.adj('Zoom Blur');
            var tf = UK.addFx(adj, 'ADBE Geometry2', 'Zoom');
            var sc = UK.p(tf, 'ADBE Geometry2-0005'); // Scale Width (uniform off -> use both)
            UK.set(tf, 'ADBE Geometry2-0003', 1); // Uniform scale
            var scH = UK.p(tf, 'ADBE Geometry2-0004');
            var z = 100 + 80 * c.strength;
            UK.keys(scH, [[c.t0, 100], [c.cut, z], [c.t1, 100]], 'expoInOut');
            UK.set(tf, 'ADBE Geometry2-0011', 360); // shutter angle
            UK.set(tf, 'ADBE Geometry2-0010', 0);   // use comp shutter: off
            var tile = UK.addFx(adj, 'ADBE Tile', 'Tile');
            UK.set(tile, 'ADBE Tile-0004', 300); UK.set(tile, 'ADBE Tile-0005', 300); UK.set(tile, 'ADBE Tile-0006', 1);
            // motion tile должен быть ДО transform: переместим
            tile.moveTo(1);
            var rb = UK.addFx(adj, 'CC Radial Fast Blur', 'Radial Blur');
            var amt = UK.p(rb, 'CC Radial Fast Blur-0002');
            UK.keys(amt, [[c.t0, 0], [c.cut, 60 * c.strength], [c.t1, 0]], 'smooth');
            UK.set(rb, 'CC Radial Fast Blur-0003', 2); // Zoom: Brightest
        }
    });

    // --- Эффект: Glow
    UK.add({
        id: 'fx.glow', cat: 'fx', name: 'Glow · Свечение',
        desc: 'Мягкое свечение ярких областей. Сила — интенсивность.', tags: 'glow bloom свечение',
        apply: function (c) {
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Glow');
            UK.set(g, 'ADBE Glo2-0002', 60);                // threshold
            UK.set(g, 'ADBE Glo2-0003', 80);                // radius
            UK.set(g, 'ADBE Glo2-0004', 1.0 * c.strength);  // intensity
            if (c.opts.controls) {
                UK.expr(g, 'ADBE Glo2-0004', UK.cv(c, 'Glow Intensity', 1.0 * c.strength));
                UK.expr(g, 'ADBE Glo2-0003', UK.cv(c, 'Glow Radius', 80));
            }
        }
    });

    // --- Текст: посимвольное появление
    UK.add({
        id: 'text.fadeChars', cat: 'text', name: 'Fade by Characters · По буквам',
        desc: 'Буквы проявляются слева направо с мягким краем.', tags: 'text characters буквы typewriter', needs: 'text',
        apply: function (c) {
            var ta = UK.textAnimator(c.layer, 'Fade Chars');
            UK.textProp(ta, 'ADBE Text Opacity', 0);
            UK.textSelector(ta, { basedOn: 1, shape: 2, easeHigh: 50, easeLow: 0 });
            UK.textOffsetKeys(ta, c.t0, c.t1, -100, 100, c.ease);
        }
    });

    // --- Утилита: удалить всё UK со слоя
    UK.add({
        id: 'util.removeUK', cat: 'util', name: 'Удалить эффекты UniKit',
        desc: 'Удаляет все эффекты и слайдеры UK с выделенных слоёв.', tags: 'remove clean удалить очистить',
        apply: function (c) { UK.removeFx(c.layer); }
    });

})();
