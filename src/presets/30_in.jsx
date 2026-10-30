// =============================================================================
//  Анимации появления (In)
// =============================================================================
(function () {

    // ---------------------------------------------------------------- хелперы (общие для In/Out)
    UK.A = {
        /** Знак направления: L/U = -1, R/D = 1 */
        sign: function (c) { return c.dirV[0] !== 0 ? c.dirV[0] : c.dirV[1]; },
        horiz: function (c) { return c.dirV[0] !== 0; },
        /** Угол Linear Wipe, чтобы открывать слой со стороны направления */
        wipeAngle: function (c) { return { L: 270, R: 90, U: 180, D: 0 }[c.dirId] || 270; },
        /** Направление Directional Blur вдоль движения */
        blurDir: function (c) { return c.dirV[0] !== 0 ? 90 : 0; },
        /** Прямоугольник слоя в его координатах */
        rect: function (layer, t) {
            var r;
            try { r = layer.sourceRectAtTime(t, false); r = { l: r.left, t: r.top, w: r.width, h: r.height }; }
            catch (e) { r = { l: 0, t: 0, w: layer.width || 100, h: layer.height || 100 }; }
            if (!(r.w > 0) || !(r.h > 0)) r = { l: 0, t: 0, w: layer.width || 100, h: layer.height || 100 };
            return r;
        },
        rectShape: function (l, t, r, b) {
            var s = new Shape();
            s.vertices = [[l, t], [r, t], [r, b], [l, b]];
            s.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            s.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            s.closed = true;
            return s;
        },
        /** Полная и «схлопнутая к стороне направления» маски (с запасом pad) */
        maskPair: function (layer, c, t) {
            var r = UK.A.rect(layer, t), pad = 4;
            var l = r.l - pad, tp = r.t - pad, rt = r.l + r.w + pad, b = r.t + r.h + pad;
            var full = UK.A.rectShape(l, tp, rt, b), empty;
            if (c.dirId === 'L') empty = UK.A.rectShape(l, tp, l, b);
            else if (c.dirId === 'R') empty = UK.A.rectShape(rt, tp, rt, b);
            else if (c.dirId === 'U') empty = UK.A.rectShape(l, tp, rt, tp);
            else empty = UK.A.rectShape(l, b, rt, b);
            return { full: full, empty: empty, r: r };
        },
        addMask: function (layer, name) {
            var m = layer.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
            m.name = UK.PREFIX + (name || 'Reveal');
            try { m.maskMode = MaskMode.ADD; } catch (e) {}
            return m;
        },
        tr: function (c, m) { return c.layer.transform.property(m); },
        /** Копия scale с множителями по X/Y (сохраняет 3-е измерение) */
        scaleXY: function (v, kx, ky) {
            var r = v.slice();
            r[0] = v[0] * kx; r[1] = v[1] * ky;
            return r;
        },
        /** Принудительное пост-выражение (overshoot/bounce/elastic) независимо от выбранного изинга */
        force: function (prop, easeId, c) { UK.applyEaseExpr(prop, UK.easeById(easeId), c); },
        /** Fade In по opacity на [ta,tb] */
        fadeIn: function (c, ta, tb, ease) {
            var op = UK.A.tr(c, 'ADBE Opacity');
            var end = op.valueAtTime(tb, false);
            UK.key2(op, ta, 0, tb, end, ease || c.ease);
            return op;
        },
        /** Fade Out по opacity на [ta,tb] */
        fadeOut: function (c, ta, tb, ease) {
            var op = UK.A.tr(c, 'ADBE Opacity');
            var start = op.valueAtTime(ta, false);
            UK.key2(op, ta, start, tb, 0, ease || c.ease, true);
            return op;
        },
        /** Смещение за край кадра по направлению (вектор) */
        exitVec: function (c, k) {
            var d = UK.exitDistance(c.layer, c.comp, c.dirV, c.t0) * (k == null ? 1 : k);
            return UK.vecMul(c.dirV, d);
        },
        /** Короткое смещение (px) по направлению */
        shortVec: function (c, px) { return UK.vecMul(c.dirV, (px || 150) * c.strength); },
        /** Перенести якорь в точку (в координатах слоя) с компенсацией позиции */
        moveAnchor: function (layer, ax, ay, t) {
            var ap = layer.transform.property('ADBE Anchor Point'), pos = layer.transform.property('ADBE Position');
            var a0 = ap.valueAtTime(t, false), p0 = pos.valueAtTime(t, false), s = layer.transform.property('ADBE Scale').valueAtTime(t, false);
            var dx = (ax - a0[0]) * s[0] / 100, dy = (ay - a0[1]) * s[1] / 100;
            var na = a0.slice(); na[0] = ax; na[1] = ay;
            var np = p0.slice(); np[0] = p0[0] + dx; np[1] = p0[1] + dy;
            ap.setValue(na); pos.setValue(np);
        },
        /** Диагональный вектор: направление + перпендикуляр */
        diagVec: function (c, k) {
            var D = Math.max(c.comp.width, c.comp.height) * 0.6 * (k == null ? 1 : k);
            return [(c.dirV[0] || 1) * D, (c.dirV[1] || 1) * D];
        }
    };
    var A = UK.A;

    // ---------------------------------------------------------------- базовые
    UK.add({
        id: 'in.fadeSlide', cat: 'in', name: 'Fade + Slide · Проявление со сдвигом',
        desc: 'Короткий сдвиг по направлению (150px × Сила) с проявлением. Универсальный «рабочий» пресет.',
        tags: 'fade slide move сдвиг проявление',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), end = pos.valueAtTime(c.t1, false);
            UK.key2(pos, c.t0, UK.vecAdd(end, A.shortVec(c, 150)), c.t1, end, c.ease);
            UK.applyEaseExpr(pos, c.ease, c);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.7);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.scalePop', cat: 'in', name: 'Scale Pop · Выскакивание из нуля',
        desc: 'Масштаб 0 → 100 %. С изингом Back/Elastic даёт классический pop.',
        tags: 'scale pop zoom масштаб',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            UK.key2(sc, c.t0, UK.vecMul(end, 0), c.t1, end, c.ease);
            UK.applyEaseExpr(sc, c.ease, c);
        }
    });

    UK.add({
        id: 'in.scaleSoft', cat: 'in', name: 'Scale Soft · Мягкий наезд',
        desc: 'Масштаб 80 % → 100 % с проявлением. Деликатное появление для текста и плашек.',
        tags: 'scale soft fade мягкий масштаб',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            var k = 1 - 0.2 * c.strength;
            UK.key2(sc, c.t0, A.scaleXY(end, k, k), c.t1, end, c.ease);
            UK.applyEaseExpr(sc, c.ease, c);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.6);
        }
    });

    UK.add({
        id: 'in.scaleOvershoot', cat: 'in', name: 'Scale Overshoot · Pop с перелётом',
        desc: 'Масштаб из нуля с пружинным перелётом (выражение overshoot всегда включено).',
        tags: 'scale overshoot back pop пружина',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            UK.key2(sc, c.t0, UK.vecMul(end, 0), c.t1, end, 'expoOut');
            A.force(sc, 'back', c);
        }
    });

    UK.add({
        id: 'in.elasticPop', cat: 'in', name: 'Elastic Pop · Пружинный pop',
        desc: 'Масштаб из нуля с сильной упругой осцилляцией.',
        tags: 'elastic spring pop scale пружина',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            UK.key2(sc, c.t0, UK.vecMul(end, 0), c.t1, end, 'expoOut');
            A.force(sc, 'elastic', c);
        }
    });

    UK.add({
        id: 'in.spin', cat: 'in', name: 'Spin In · Вращение',
        desc: 'Поворот на 180° × Сила (знак по направлению) с проявлением.',
        tags: 'spin rotate rotation вращение поворот',
        apply: function (c) {
            var rot = A.tr(c, 'ADBE Rotate Z'), end = rot.valueAtTime(c.t1, false);
            UK.key2(rot, c.t0, end - 180 * c.strength * A.sign(c), c.t1, end, c.ease);
            UK.applyEaseExpr(rot, c.ease, c);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.5);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.spinZoom', cat: 'in', name: 'Spin Zoom · Вращение с наездом',
        desc: 'Масштаб из нуля + поворот на 360° × Сила. Для логотипов и иконок.',
        tags: 'spin zoom scale rotate логотип',
        apply: function (c) {
            var rot = A.tr(c, 'ADBE Rotate Z'), rEnd = rot.valueAtTime(c.t1, false);
            var sc = A.tr(c, 'ADBE Scale'), sEnd = sc.valueAtTime(c.t1, false);
            UK.key2(rot, c.t0, rEnd - 360 * c.strength * A.sign(c), c.t1, rEnd, c.ease);
            UK.key2(sc, c.t0, UK.vecMul(sEnd, 0), c.t1, sEnd, c.ease);
            UK.applyEaseExpr(sc, c.ease, c);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.flipX', cat: 'in', name: 'Flip X · 3D-переворот по горизонтальной оси',
        desc: 'Слой становится 3D и переворачивается вокруг оси X (как карточка сверху/снизу).',
        tags: 'flip 3d rotation x переворот карточка',
        apply: function (c) {
            UK.to3D(c.layer);
            var rx = A.tr(c, 'ADBE Rotate X'), end = rx.valueAtTime(c.t1, false);
            var s = c.dirV[1] !== 0 ? c.dirV[1] : 1;
            UK.key2(rx, c.t0, end + 90 * s * Math.max(0.5, c.strength), c.t1, end, c.ease);
            UK.applyEaseExpr(rx, c.ease, c);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.3);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.flipY', cat: 'in', name: 'Flip Y · 3D-переворот по вертикальной оси',
        desc: 'Слой становится 3D и переворачивается вокруг оси Y (как дверь слева/справа).',
        tags: 'flip 3d rotation y переворот дверь',
        apply: function (c) {
            UK.to3D(c.layer);
            var ry = A.tr(c, 'ADBE Rotate Y'), end = ry.valueAtTime(c.t1, false);
            var s = c.dirV[0] !== 0 ? -c.dirV[0] : 1;
            UK.key2(ry, c.t0, end + 90 * s * Math.max(0.5, c.strength), c.t1, end, c.ease);
            UK.applyEaseExpr(ry, c.ease, c);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.3);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    // ---------------------------------------------------------------- blur
    UK.add({
        id: 'in.blur', cat: 'in', name: 'Blur In · Из размытия',
        desc: 'Gaussian Blur 60 × Сила → 0 с проявлением.',
        tags: 'blur gaussian focus размытие фокус',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Blur In');
            UK.set(fx, 'ADBE Gaussian Blur 2-0003', 1);
            UK.key2(UK.p(fx, 'ADBE Gaussian Blur 2-0001'), c.t0, 60 * c.strength, c.t1, 0, c.ease);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.6);
        }
    });

    UK.add({
        id: 'in.dirBlurSlide', cat: 'in', name: 'Directional Blur Slide · Смазанный влёт',
        desc: 'Короткий сдвиг по направлению + Directional Blur вдоль движения. Быстро и «дорого».',
        tags: 'directional blur motion slide смаз влёт',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), end = pos.valueAtTime(c.t1, false);
            UK.key2(pos, c.t0, UK.vecAdd(end, A.shortVec(c, 250)), c.t1, end, c.ease);
            UK.applyEaseExpr(pos, c.ease, c);
            var fx = UK.addFx(c.layer, 'ADBE Motion Blur', 'Dir Blur');
            UK.set(fx, 'ADBE Motion Blur-0001', A.blurDir(c));
            UK.key2(UK.p(fx, 'ADBE Motion Blur-0002'), c.t0, 120 * c.strength, c.t1, 0, c.ease);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.4);
        }
    });

    UK.add({
        id: 'in.zoomBlur', cat: 'in', name: 'Zoom Blur In · Радиальный наезд',
        desc: 'Масштаб 150 % → 100 % + CC Radial Fast Blur (zoom) с проявлением.',
        tags: 'zoom radial blur наезд радиальное',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            var k = 1 + 0.5 * c.strength;
            UK.key2(sc, c.t0, A.scaleXY(end, k, k), c.t1, end, c.ease);
            var fx = UK.addFx(c.layer, 'CC Radial Fast Blur', 'Zoom Blur');
            UK.set(fx, 'CC Radial Fast Blur-0003', 2);
            UK.key2(UK.p(fx, 'CC Radial Fast Blur-0002'), c.t0, 70 * c.strength, c.t1, 0, c.ease);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.4);
        }
    });

    UK.add({
        id: 'in.zoomFar', cat: 'in', name: 'Zoom From Far · Из глубины',
        desc: 'Масштаб 300 % → 100 % с размытием и проявлением — «прилетает из камеры».',
        tags: 'zoom far camera scale blur из глубины',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            var k = 1 + 2 * c.strength;
            UK.key2(sc, c.t0, A.scaleXY(end, k, k), c.t1, end, c.ease);
            UK.applyEaseExpr(sc, c.ease, c);
            var fx = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Zoom Blur');
            UK.set(fx, 'ADBE Gaussian Blur 2-0003', 1);
            UK.key2(UK.p(fx, 'ADBE Gaussian Blur 2-0001'), c.t0, 30 * c.strength, c.t1, 0, c.ease);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.5);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    // ---------------------------------------------------------------- wipes / masks
    UK.add({
        id: 'in.linearWipe', cat: 'in', name: 'Linear Wipe · Линейное открытие',
        desc: 'Linear Wipe открывает слой со стороны направления. Небольшое перо.',
        tags: 'wipe linear reveal шторка открытие',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Linear Wipe', 'Wipe In');
            UK.set(fx, 'ADBE Linear Wipe-0002', A.wipeAngle(c));
            UK.set(fx, 'ADBE Linear Wipe-0003', 10 * c.strength);
            UK.key2(UK.p(fx, 'ADBE Linear Wipe-0001'), c.t0, 100, c.t1, 0, c.ease);
        }
    });

    UK.add({
        id: 'in.softWipe', cat: 'in', name: 'Soft Wipe · Градиентное открытие',
        desc: 'Linear Wipe с большим пером — мягкий градиентный проход по направлению.',
        tags: 'wipe soft gradient feather мягкая шторка',
        apply: function (c) {
            var r = A.rect(c.layer, c.t0);
            var fx = UK.addFx(c.layer, 'ADBE Linear Wipe', 'Soft Wipe');
            UK.set(fx, 'ADBE Linear Wipe-0002', A.wipeAngle(c));
            UK.set(fx, 'ADBE Linear Wipe-0003', (A.horiz(c) ? r.w : r.h) * 0.6 * c.strength);
            UK.key2(UK.p(fx, 'ADBE Linear Wipe-0001'), c.t0, 100, c.t1, 0, c.ease);
        }
    });

    UK.add({
        id: 'in.maskReveal', cat: 'in', name: 'Mask Reveal · Открытие маской',
        desc: 'Прямоугольная маска растёт со стороны направления. Чистые края, без эффектов.',
        tags: 'mask reveal маска открытие',
        apply: function (c) {
            var mp = A.maskPair(c.layer, c, c.t0);
            var m = A.addMask(c.layer, 'Reveal');
            UK.key2(m.property('ADBE Mask Shape'), c.t0, mp.empty, c.t1, mp.full, c.ease);
        }
    });

    UK.add({
        id: 'in.maskSlide', cat: 'in', name: 'Mask + Slide · Выезд из-под маски',
        desc: 'Слой выезжает из-за невидимой границы: маска открывается, а слой сдвигается навстречу.',
        tags: 'mask slide reveal выезд из-под',
        apply: function (c) {
            var mp = A.maskPair(c.layer, c, c.t0);
            var m = A.addMask(c.layer, 'Reveal');
            UK.key2(m.property('ADBE Mask Shape'), c.t0, mp.empty, c.t1, mp.full, c.ease);
            var pos = A.tr(c, 'ADBE Position'), end = pos.valueAtTime(c.t1, false);
            var dist = (A.horiz(c) ? mp.r.w : mp.r.h) * 0.5 * c.strength;
            UK.key2(pos, c.t0, UK.vecAdd(end, UK.vecMul(c.dirV, dist)), c.t1, end, c.ease);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.blinds', cat: 'in', name: 'Blinds · Жалюзи',
        desc: 'Venetian Blinds: полосы по направлению, ширина × Сила.',
        tags: 'blinds venetian жалюзи полосы',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Venetian Blinds', 'Blinds');
            UK.set(fx, 'ADBE Venetian Blinds-0002', A.horiz(c) ? 90 : 0);
            UK.set(fx, 'ADBE Venetian Blinds-0003', 60 * c.strength);
            UK.set(fx, 'ADBE Venetian Blinds-0004', 4);
            UK.key2(UK.p(fx, 'ADBE Venetian Blinds-0001'), c.t0, 100, c.t1, 0, c.ease);
        }
    });

    UK.add({
        id: 'in.radialWipe', cat: 'in', name: 'Radial Wipe · Часовая стрелка',
        desc: 'Radial Wipe по часовой (против — при направлении влево/вверх).',
        tags: 'radial wipe clock круговая стрелка',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Radial Wipe', 'Radial Wipe');
            UK.set(fx, 'ADBE Radial Wipe-0004', A.sign(c) < 0 ? 2 : 1);
            UK.set(fx, 'ADBE Radial Wipe-0005', 6 * c.strength);
            UK.key2(UK.p(fx, 'ADBE Radial Wipe-0001'), c.t0, 100, c.t1, 0, c.ease);
        }
    });

    UK.add({
        id: 'in.iris', cat: 'in', name: 'Iris · Круговое открытие',
        desc: 'Iris Wipe из центра слоя (32 точки = круг) с пером.',
        tags: 'iris circle wipe круг диафрагма',
        apply: function (c) {
            var r = A.rect(c.layer, c.t0);
            var fx = UK.addFx(c.layer, 'ADBE Iris Wipe', 'Iris');
            UK.set(fx, 'ADBE Iris Wipe-0001', [r.l + r.w / 2, r.t + r.h / 2]);
            UK.set(fx, 'ADBE Iris Wipe-0002', 32);
            UK.set(fx, 'ADBE Iris Wipe-0007', 30 * c.strength);
            var R = Math.sqrt(r.w * r.w + r.h * r.h) / 2 + 40 * c.strength;
            UK.key2(UK.p(fx, 'ADBE Iris Wipe-0003'), c.t0, 0, c.t1, R, c.ease);
        }
    });

    UK.add({
        id: 'in.blockDissolve', cat: 'in', name: 'Block Dissolve · Блочное проявление',
        desc: 'Block Dissolve с жёсткими блоками (размер × Сила).',
        tags: 'block dissolve pixel блоки',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Block Dissolve', 'Blocks');
            UK.set(fx, 'ADBE Block Dissolve-0002', 40 * c.strength);
            UK.set(fx, 'ADBE Block Dissolve-0003', 40 * c.strength);
            UK.set(fx, 'ADBE Block Dissolve-0004', 0);
            UK.set(fx, 'ADBE Block Dissolve-0005', 0);
            UK.key2(UK.p(fx, 'ADBE Block Dissolve-0001'), c.t0, 100, c.t1, 0, 'linear');
        }
    });

    UK.add({
        id: 'in.curtain', cat: 'in', name: 'Curtain Open · Занавес из центра',
        desc: 'Два Linear Wipe открывают слой из центра к краям (по оси направления).',
        tags: 'curtain split center занавес из центра',
        apply: function (c) {
            var a1 = A.horiz(c) ? 90 : 0, a2 = A.horiz(c) ? 270 : 180;
            var f1 = UK.addFx(c.layer, 'ADBE Linear Wipe', 'Curtain A');
            UK.set(f1, 'ADBE Linear Wipe-0002', a1); UK.set(f1, 'ADBE Linear Wipe-0003', 2);
            UK.key2(UK.p(f1, 'ADBE Linear Wipe-0001'), c.t0, 50, c.t1, 0, c.ease);
            var f2 = UK.addFx(c.layer, 'ADBE Linear Wipe', 'Curtain B');
            UK.set(f2, 'ADBE Linear Wipe-0002', a2); UK.set(f2, 'ADBE Linear Wipe-0003', 2);
            UK.key2(UK.p(f2, 'ADBE Linear Wipe-0001'), c.t0, 50, c.t1, 0, c.ease);
        }
    });

    // ---------------------------------------------------------------- физика / характер
    UK.add({
        id: 'in.dropBounce', cat: 'in', name: 'Drop Bounce · Падение с отскоком',
        desc: 'Влёт из-за края по направлению с отскоком (bounce-выражение всегда включено).',
        tags: 'drop bounce fall падение отскок',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), end = pos.valueAtTime(c.t1, false);
            UK.key2(pos, c.t0, UK.vecAdd(end, A.exitVec(c, 1)), c.t1, end, 'expoIn');
            A.force(pos, 'bounce', c);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.squashStretch', cat: 'in', name: 'Squash & Stretch · Сквош-стретч',
        desc: 'Pop из нуля через сплющивание/вытягивание — мультяшный характер.',
        tags: 'squash stretch cartoon pop сквош мульт',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            var k = 0.3 * c.strength;
            UK.keys(sc, [
                [c.t0, UK.vecMul(end, 0)],
                [c.t0 + c.dur * 0.5, A.scaleXY(end, 1 + k, 1 - k * 0.8)],
                [c.t0 + c.dur * 0.78, A.scaleXY(end, 1 - k * 0.5, 1 + k * 0.4)],
                [c.t1, end]
            ], 'smooth');
        }
    });

    UK.add({
        id: 'in.skewSlide', cat: 'in', name: 'Skew Slide · Сдвиг со скосом',
        desc: 'Короткий сдвиг + скос (Transform › Skew) по направлению, возвращающийся в ноль.',
        tags: 'skew slide shear скос наклон',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), end = pos.valueAtTime(c.t1, false);
            UK.key2(pos, c.t0, UK.vecAdd(end, A.shortVec(c, 200)), c.t1, end, c.ease);
            UK.applyEaseExpr(pos, c.ease, c);
            var fx = UK.addFx(c.layer, 'ADBE Geometry2', 'Skew');
            UK.set(fx, 'ADBE Geometry2-0007', A.horiz(c) ? 0 : 90);
            UK.key2(UK.p(fx, 'ADBE Geometry2-0006'), c.t0, -35 * c.strength * A.sign(c), c.t1, 0, c.ease);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.4);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.roll', cat: 'in', name: 'Roll In · Вкатывание',
        desc: 'Влёт из-за края с поворотом на 360° × Сила — катится как колесо.',
        tags: 'roll wheel rotate slide вкатывание колесо',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), end = pos.valueAtTime(c.t1, false);
            UK.key2(pos, c.t0, UK.vecAdd(end, A.exitVec(c, 1)), c.t1, end, c.ease);
            var rot = A.tr(c, 'ADBE Rotate Z'), rEnd = rot.valueAtTime(c.t1, false);
            UK.key2(rot, c.t0, rEnd + 360 * c.strength * A.sign(c), c.t1, rEnd, c.ease);
            UK.applyEaseExpr(pos, c.ease, c);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.swing', cat: 'in', name: 'Swing In · Маятник',
        desc: 'Якорь переносится на верхнюю грань, слой качается как табличка на гвозде (elastic-выражение).',
        tags: 'swing pendulum hang маятник качание',
        apply: function (c) {
            var r = A.rect(c.layer, c.t0);
            A.moveAnchor(c.layer, r.l + r.w / 2, r.t, c.t0);
            var rot = A.tr(c, 'ADBE Rotate Z'), end = rot.valueAtTime(c.t1, false);
            UK.key2(rot, c.t0, end - 70 * c.strength * (A.sign(c) || 1), c.t1, end, 'expoOut');
            A.force(rot, 'elastic', c);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.3);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.stretch', cat: 'in', name: 'Stretch In · Растяжение по оси',
        desc: 'Масштаб по оси направления из 0 → 100 % (вторая ось не меняется).',
        tags: 'stretch scale axis растяжение ось',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            var start = A.horiz(c) ? A.scaleXY(end, 0, 1) : A.scaleXY(end, 1, 0);
            UK.key2(sc, c.t0, start, c.t1, end, c.ease);
            UK.applyEaseExpr(sc, c.ease, c);
        }
    });

    UK.add({
        id: 'in.unfold', cat: 'in', name: 'Unfold · Разворачивание',
        desc: 'Сначала раскрывается в тонкую линию по одной оси, затем по другой.',
        tags: 'unfold line open разворачивание линия',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            var thin = 0.02;
            var k1 = A.horiz(c) ? A.scaleXY(end, 0, thin) : A.scaleXY(end, thin, 0);
            var k2 = A.horiz(c) ? A.scaleXY(end, 1, thin) : A.scaleXY(end, thin, 1);
            UK.keys(sc, [[c.t0, k1], [c.t0 + c.dur * 0.45, k2], [c.t1, end]], 'expoInOut');
        }
    });

    UK.add({
        id: 'in.slideRotate', cat: 'in', name: 'Slide + Rotate · Сдвиг с доворотом',
        desc: 'Короткий сдвиг с поворотом на 25° × Сила, выравнивается к концу.',
        tags: 'slide rotate tilt сдвиг доворот',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), end = pos.valueAtTime(c.t1, false);
            UK.key2(pos, c.t0, UK.vecAdd(end, A.shortVec(c, 220)), c.t1, end, c.ease);
            var rot = A.tr(c, 'ADBE Rotate Z'), rEnd = rot.valueAtTime(c.t1, false);
            UK.key2(rot, c.t0, rEnd - 25 * c.strength * A.sign(c), c.t1, rEnd, c.ease);
            UK.applyEaseExpr(pos, c.ease, c);
            UK.applyEaseExpr(rot, c.ease, c);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.5);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.diagonal', cat: 'in', name: 'Diagonal Slide · Влёт по диагонали',
        desc: 'Влёт из угла (направление + перпендикуляр) с проявлением.',
        tags: 'diagonal corner slide диагональ угол',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), end = pos.valueAtTime(c.t1, false);
            UK.key2(pos, c.t0, UK.vecAdd(end, A.diagVec(c, c.strength)), c.t1, end, c.ease);
            UK.applyEaseExpr(pos, c.ease, c);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.4);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'in.shadowPop', cat: 'in', name: 'Shadow Pop · Pop с тенью',
        desc: 'Масштаб 90 → 100 % + растущая Drop Shadow — слой «приподнимается» над фоном.',
        tags: 'shadow pop lift drop shadow тень',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            UK.key2(sc, c.t0, A.scaleXY(end, 0.9, 0.9), c.t1, end, c.ease);
            UK.applyEaseExpr(sc, c.ease, c);
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.4);
            var fx = UK.addFx(c.layer, 'ADBE Drop Shadow', 'Shadow');
            UK.set(fx, 'ADBE Drop Shadow-0001', [0, 0, 0]);
            UK.set(fx, 'ADBE Drop Shadow-0003', 135);
            UK.key2(UK.p(fx, 'ADBE Drop Shadow-0002'), c.t0, 0, c.t1, 60 * Math.min(1.5, c.strength), c.ease);
            UK.key2(UK.p(fx, 'ADBE Drop Shadow-0004'), c.t0, 0, c.t1, 25 * c.strength, c.ease);
            UK.key2(UK.p(fx, 'ADBE Drop Shadow-0005'), c.t0, 0, c.t1, 40 * c.strength, c.ease);
        }
    });

    // ---------------------------------------------------------------- глитч / пиксели / вспышки
    UK.add({
        id: 'in.glitch', cat: 'in', name: 'Glitch In · Глитч-появление',
        desc: 'Рывки позиции (Transform), мозаика и мигание прозрачности hold-ключами, затухающие к концу.',
        tags: 'glitch digital jitter глитч рывки',
        apply: function (c) {
            var layer = c.layer, r = A.rect(layer, c.t0);
            var tf = UK.addFx(layer, 'ADBE Geometry2', 'Glitch Shift');
            var tp = UK.p(tf, 'ADBE Geometry2-0002'), base = tp.valueAtTime(c.t0, false);
            var mos = UK.addFx(layer, 'ADBE Mosaic', 'Glitch Pixels');
            UK.set(mos, 'ADBE Mosaic-0003', 1);
            var hb = UK.p(mos, 'ADBE Mosaic-0001'), vb = UK.p(mos, 'ADBE Mosaic-0002');
            var op = A.tr(c, 'ADBE Opacity'), opEnd = op.valueAtTime(c.t1, false);
            var maxB = Math.min(4000, Math.max(r.w, r.h, 64));
            var n = Math.max(3, Math.round(c.dur / c.fd / 2)), step = c.dur / n;
            for (var i = 0; i < n; i++) {
                var t = c.t0 + i * step, k = 1 - i / n;
                var amp = 60 * c.strength * k;
                var p = base.slice();
                p[0] = base[0] + UK.rnd(-amp, amp); p[1] = base[1] + UK.rnd(-amp, amp) * 0.4;
                UK.setHold(tp, UK.key(tp, t, p));
                var blocks = Math.round(UK.lerp(maxB, 8, k * k));
                UK.setHold(hb, UK.key(hb, t, Math.max(1, blocks)));
                UK.setHold(vb, UK.key(vb, t, Math.max(1, Math.round(blocks * r.h / Math.max(1, r.w)))));
                var o = Math.random() < 0.35 * k ? 0 : (Math.random() < 0.5 ? 100 : 55);
                UK.setHold(op, UK.key(op, t, o));
            }
            UK.setHold(tp, UK.key(tp, c.t1, base));
            UK.setHold(hb, UK.key(hb, c.t1, maxB));
            UK.setHold(vb, UK.key(vb, c.t1, maxB));
            UK.setHold(op, UK.key(op, c.t1, opEnd));
        }
    });

    UK.add({
        id: 'in.pixelate', cat: 'in', name: 'Pixelate In · Из пикселей',
        desc: 'Mosaic от крупных блоков к полному разрешению + короткое проявление.',
        tags: 'pixelate mosaic pixel пиксели мозаика',
        apply: function (c) {
            var r = A.rect(c.layer, c.t0);
            var fx = UK.addFx(c.layer, 'ADBE Mosaic', 'Pixelate');
            UK.set(fx, 'ADBE Mosaic-0003', 1);
            var maxB = Math.min(4000, Math.max(r.w, 64));
            var from = Math.max(2, Math.round(12 / c.strength));
            UK.key2(UK.p(fx, 'ADBE Mosaic-0001'), c.t0, from, c.t1, maxB, 'expoIn');
            UK.key2(UK.p(fx, 'ADBE Mosaic-0002'), c.t0, Math.max(2, Math.round(from * r.h / Math.max(1, r.w))), c.t1, Math.min(4000, Math.max(r.h, 64)), 'expoIn');
            A.fadeIn(c, c.t0, c.t0 + c.dur * 0.3);
        }
    });

    UK.add({
        id: 'in.flash', cat: 'in', name: 'Flash In · Из белой вспышки',
        desc: 'Слой появляется белым силуэтом (Fill) и проявляет цвет; масштаб 110 → 100 %.',
        tags: 'flash white fill вспышка белый',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Fill', 'Flash');
            UK.set(fx, 'ADBE Fill-0003', [1, 1, 1]);
            UK.key2(UK.p(fx, 'ADBE Fill-0007'), c.t0 + c.fd, 100, c.t1, 0, 'expoOut');
            var sc = A.tr(c, 'ADBE Scale'), end = sc.valueAtTime(c.t1, false);
            var k = 1 + 0.1 * c.strength;
            UK.key2(sc, c.t0, A.scaleXY(end, k, k), c.t1, end, c.ease);
            A.fadeIn(c, c.t0, c.t0 + c.fd * 2, 'linear');
        }
    });

    UK.add({
        id: 'in.flicker', cat: 'in', name: 'Flicker In · Мерцание (неон)',
        desc: 'Случайные hold-ключи прозрачности, плотность растёт к концу — как включающаяся лампа.',
        tags: 'flicker neon lamp мерцание неон лампа',
        apply: function (c) {
            var op = A.tr(c, 'ADBE Opacity'), end = op.valueAtTime(c.t1, false);
            var n = Math.max(4, Math.round(c.dur / c.fd / 2)), step = c.dur / n;
            UK.setHold(op, UK.key(op, c.t0, 0));
            for (var i = 1; i < n; i++) {
                var t = c.t0 + i * step, k = i / n;
                var on = Math.random() < (0.25 + 0.7 * k);
                var v = on ? end * UK.rnd(0.6, 1) : end * UK.rnd(0, 0.15) * (1 - c.strength * 0.5);
                UK.setHold(op, UK.key(op, t, UK.clamp(v, 0, 100)));
            }
            UK.setHold(op, UK.key(op, c.t1, end));
        }
    });

    UK.add({
        id: 'in.riseBlur', cat: 'in', name: 'Rise + Blur · Подъём из размытия',
        desc: 'Сдвиг по направлению (120px × Сила) + Gaussian Blur + проявление — кинематографичный титр.',
        tags: 'rise blur cinematic title титр подъём',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), end = pos.valueAtTime(c.t1, false);
            UK.key2(pos, c.t0, UK.vecAdd(end, A.shortVec(c, 120)), c.t1, end, 'soft');
            var fx = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Rise Blur');
            UK.set(fx, 'ADBE Gaussian Blur 2-0003', 1);
            UK.key2(UK.p(fx, 'ADBE Gaussian Blur 2-0001'), c.t0, 40 * c.strength, c.t1, 0, 'soft');
            A.fadeIn(c, c.t0, c.t1, 'soft');
        }
    });

})();
