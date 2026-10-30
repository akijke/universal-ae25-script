// =============================================================================
//  Анимации исчезновения (Out) — зеркала к In. Ключи в [c.t0, c.t1], c.t1 = out-point.
// =============================================================================
(function () {
    var A = UK.A;

    // ---------------------------------------------------------------- базовые
    UK.add({
        id: 'out.fade', cat: 'out', name: 'Fade Out · Растворение',
        desc: 'Плавное исчезновение по прозрачности.', tags: 'fade opacity прозрачность растворение',
        apply: function (c) { A.fadeOut(c, c.t0, c.t1); }
    });

    UK.add({
        id: 'out.fadeSlide', cat: 'out', name: 'Fade + Slide · Уход со сдвигом',
        desc: 'Короткий сдвиг по направлению (150px × Сила) с растворением.',
        tags: 'fade slide move сдвиг уход',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), start = pos.valueAtTime(c.t0, false);
            UK.key2(pos, c.t0, start, c.t1, UK.vecAdd(start, A.shortVec(c, 150)), c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.3, c.t1);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.slide', cat: 'out', name: 'Slide Out · Вылет за край',
        desc: 'Слой улетает за край композиции по направлению. Сила = доля расстояния.',
        tags: 'slide exit position вылет за край',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), start = pos.valueAtTime(c.t0, false);
            UK.key2(pos, c.t0, start, c.t1, UK.vecAdd(start, A.exitVec(c, c.strength)), c.ease, true);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.scaleSoft', cat: 'out', name: 'Scale Soft · Мягкий отъезд',
        desc: 'Масштаб 100 → 80 % с растворением.',
        tags: 'scale soft fade мягкий масштаб',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), start = sc.valueAtTime(c.t0, false);
            var k = 1 - 0.2 * c.strength;
            UK.key2(sc, c.t0, start, c.t1, A.scaleXY(start, k, k), c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.3, c.t1);
        }
    });

    UK.add({
        id: 'out.scaleUp', cat: 'out', name: 'Scale Up Out · Уход в камеру',
        desc: 'Масштаб 100 → 130 % × Сила с растворением — слой «пролетает сквозь камеру».',
        tags: 'scale up zoom through camera уход в камеру',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), start = sc.valueAtTime(c.t0, false);
            var k = 1 + 0.3 * c.strength;
            UK.key2(sc, c.t0, start, c.t1, A.scaleXY(start, k, k), c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.2, c.t1);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.pop', cat: 'out', name: 'Pop Out · Замах и схлопывание',
        desc: 'Короткий замах (масштаб 100 → 110 %) и быстрое схлопывание в ноль.',
        tags: 'pop anticipate shrink схлопывание замах',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), start = sc.valueAtTime(c.t0, false);
            var k = 1 + 0.12 * c.strength;
            UK.keys(sc, [[c.t0, start], [c.t0 + c.dur * 0.35, A.scaleXY(start, k, k)], [c.t1, UK.vecMul(start, 0)]], 'expoIn');
        }
    });

    UK.add({
        id: 'out.spin', cat: 'out', name: 'Spin Out · Вращение',
        desc: 'Поворот на 180° × Сила (знак по направлению) с растворением.',
        tags: 'spin rotate rotation вращение поворот',
        apply: function (c) {
            var rot = A.tr(c, 'ADBE Rotate Z'), start = rot.valueAtTime(c.t0, false);
            UK.key2(rot, c.t0, start, c.t1, start + 180 * c.strength * A.sign(c), c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.5, c.t1);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.spinZoom', cat: 'out', name: 'Spin Zoom Out · Вращение с отъездом',
        desc: 'Поворот на 360° × Сила + масштаб в ноль.',
        tags: 'spin zoom scale rotate логотип',
        apply: function (c) {
            var rot = A.tr(c, 'ADBE Rotate Z'), rS = rot.valueAtTime(c.t0, false);
            var sc = A.tr(c, 'ADBE Scale'), sS = sc.valueAtTime(c.t0, false);
            UK.key2(rot, c.t0, rS, c.t1, rS + 360 * c.strength * A.sign(c), c.ease, true);
            UK.key2(sc, c.t0, sS, c.t1, UK.vecMul(sS, 0), c.ease, true);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.flipX', cat: 'out', name: 'Flip X Out · 3D-переворот по горизонтальной оси',
        desc: 'Слой становится 3D и уходит переворотом вокруг оси X.',
        tags: 'flip 3d rotation x переворот карточка',
        apply: function (c) {
            UK.to3D(c.layer);
            var rx = A.tr(c, 'ADBE Rotate X'), start = rx.valueAtTime(c.t0, false);
            var s = c.dirV[1] !== 0 ? c.dirV[1] : 1;
            UK.key2(rx, c.t0, start, c.t1, start - 90 * s * Math.max(0.5, c.strength), c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.7, c.t1);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.flipY', cat: 'out', name: 'Flip Y Out · 3D-переворот по вертикальной оси',
        desc: 'Слой становится 3D и уходит переворотом вокруг оси Y.',
        tags: 'flip 3d rotation y переворот дверь',
        apply: function (c) {
            UK.to3D(c.layer);
            var ry = A.tr(c, 'ADBE Rotate Y'), start = ry.valueAtTime(c.t0, false);
            var s = c.dirV[0] !== 0 ? -c.dirV[0] : 1;
            UK.key2(ry, c.t0, start, c.t1, start - 90 * s * Math.max(0.5, c.strength), c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.7, c.t1);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    // ---------------------------------------------------------------- blur
    UK.add({
        id: 'out.blur', cat: 'out', name: 'Blur Out · В размытие',
        desc: 'Gaussian Blur 0 → 60 × Сила с растворением.',
        tags: 'blur gaussian focus размытие расфокус',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Blur Out');
            UK.set(fx, 'ADBE Gaussian Blur 2-0003', 1);
            UK.key2(UK.p(fx, 'ADBE Gaussian Blur 2-0001'), c.t0, 0, c.t1, 60 * c.strength, c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.4, c.t1);
        }
    });

    UK.add({
        id: 'out.dirBlurSlide', cat: 'out', name: 'Directional Blur Slide Out · Смазанный вылет',
        desc: 'Короткий сдвиг по направлению + Directional Blur вдоль движения.',
        tags: 'directional blur motion slide смаз вылет',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), start = pos.valueAtTime(c.t0, false);
            UK.key2(pos, c.t0, start, c.t1, UK.vecAdd(start, A.shortVec(c, 250)), c.ease, true);
            var fx = UK.addFx(c.layer, 'ADBE Motion Blur', 'Dir Blur');
            UK.set(fx, 'ADBE Motion Blur-0001', A.blurDir(c));
            UK.key2(UK.p(fx, 'ADBE Motion Blur-0002'), c.t0, 0, c.t1, 120 * c.strength, c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.6, c.t1);
        }
    });

    UK.add({
        id: 'out.zoomBlur', cat: 'out', name: 'Zoom Blur Out · Радиальный отъезд',
        desc: 'Масштаб 100 → 150 % + CC Radial Fast Blur с растворением.',
        tags: 'zoom radial blur отъезд радиальное',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), start = sc.valueAtTime(c.t0, false);
            var k = 1 + 0.5 * c.strength;
            UK.key2(sc, c.t0, start, c.t1, A.scaleXY(start, k, k), c.ease, true);
            var fx = UK.addFx(c.layer, 'CC Radial Fast Blur', 'Zoom Blur');
            UK.set(fx, 'CC Radial Fast Blur-0003', 2);
            UK.key2(UK.p(fx, 'CC Radial Fast Blur-0002'), c.t0, 0, c.t1, 70 * c.strength, c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.6, c.t1);
        }
    });

    UK.add({
        id: 'out.zoomFar', cat: 'out', name: 'Zoom To Far · В глубину',
        desc: 'Масштаб 100 → 0 с размытием и растворением — улетает вглубь.',
        tags: 'zoom far scale blur в глубину',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), start = sc.valueAtTime(c.t0, false);
            UK.key2(sc, c.t0, start, c.t1, UK.vecMul(start, 0), c.ease, true);
            var fx = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Zoom Blur');
            UK.set(fx, 'ADBE Gaussian Blur 2-0003', 1);
            UK.key2(UK.p(fx, 'ADBE Gaussian Blur 2-0001'), c.t0, 0, c.t1, 30 * c.strength, c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.5, c.t1);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    // ---------------------------------------------------------------- wipes / masks
    UK.add({
        id: 'out.linearWipe', cat: 'out', name: 'Linear Wipe Out · Линейное закрытие',
        desc: 'Linear Wipe закрывает слой в сторону направления.',
        tags: 'wipe linear hide шторка закрытие',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Linear Wipe', 'Wipe Out');
            UK.set(fx, 'ADBE Linear Wipe-0002', (A.wipeAngle(c) + 180) % 360);
            UK.set(fx, 'ADBE Linear Wipe-0003', 10 * c.strength);
            UK.key2(UK.p(fx, 'ADBE Linear Wipe-0001'), c.t0, 0, c.t1, 100, c.ease, true);
        }
    });

    UK.add({
        id: 'out.softWipe', cat: 'out', name: 'Soft Wipe Out · Градиентное закрытие',
        desc: 'Linear Wipe с большим пером — мягкий градиентный уход по направлению.',
        tags: 'wipe soft gradient feather мягкая шторка',
        apply: function (c) {
            var r = A.rect(c.layer, c.t0);
            var fx = UK.addFx(c.layer, 'ADBE Linear Wipe', 'Soft Wipe');
            UK.set(fx, 'ADBE Linear Wipe-0002', (A.wipeAngle(c) + 180) % 360);
            UK.set(fx, 'ADBE Linear Wipe-0003', (A.horiz(c) ? r.w : r.h) * 0.6 * c.strength);
            UK.key2(UK.p(fx, 'ADBE Linear Wipe-0001'), c.t0, 0, c.t1, 100, c.ease, true);
        }
    });

    UK.add({
        id: 'out.maskReveal', cat: 'out', name: 'Mask Hide · Закрытие маской',
        desc: 'Прямоугольная маска схлопывается в сторону направления.',
        tags: 'mask hide маска закрытие',
        apply: function (c) {
            var mp = A.maskPair(c.layer, c, c.t0);
            var m = A.addMask(c.layer, 'Hide');
            UK.key2(m.property('ADBE Mask Shape'), c.t0, mp.full, c.t1, mp.empty, c.ease, true);
        }
    });

    UK.add({
        id: 'out.maskSlide', cat: 'out', name: 'Mask + Slide Out · Уход под маску',
        desc: 'Слой сдвигается по направлению, маска схлопывается навстречу — уезжает «под край».',
        tags: 'mask slide hide уход под маску',
        apply: function (c) {
            var mp = A.maskPair(c.layer, c, c.t0);
            var m = A.addMask(c.layer, 'Hide');
            UK.key2(m.property('ADBE Mask Shape'), c.t0, mp.full, c.t1, mp.empty, c.ease, true);
            var pos = A.tr(c, 'ADBE Position'), start = pos.valueAtTime(c.t0, false);
            var dist = (A.horiz(c) ? mp.r.w : mp.r.h) * 0.5 * c.strength;
            UK.key2(pos, c.t0, start, c.t1, UK.vecAdd(start, UK.vecMul(c.dirV, -dist)), c.ease, true);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.blinds', cat: 'out', name: 'Blinds Out · Жалюзи',
        desc: 'Venetian Blinds закрывают слой полосами по направлению.',
        tags: 'blinds venetian жалюзи полосы',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Venetian Blinds', 'Blinds');
            UK.set(fx, 'ADBE Venetian Blinds-0002', A.horiz(c) ? 90 : 0);
            UK.set(fx, 'ADBE Venetian Blinds-0003', 60 * c.strength);
            UK.set(fx, 'ADBE Venetian Blinds-0004', 4);
            UK.key2(UK.p(fx, 'ADBE Venetian Blinds-0001'), c.t0, 0, c.t1, 100, c.ease, true);
        }
    });

    UK.add({
        id: 'out.radialWipe', cat: 'out', name: 'Radial Wipe Out · Часовая стрелка',
        desc: 'Radial Wipe закрывает слой по часовой (против — при направлении влево/вверх).',
        tags: 'radial wipe clock круговая стрелка',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Radial Wipe', 'Radial Wipe');
            UK.set(fx, 'ADBE Radial Wipe-0004', A.sign(c) < 0 ? 2 : 1);
            UK.set(fx, 'ADBE Radial Wipe-0005', 6 * c.strength);
            UK.key2(UK.p(fx, 'ADBE Radial Wipe-0001'), c.t0, 0, c.t1, 100, c.ease, true);
        }
    });

    UK.add({
        id: 'out.iris', cat: 'out', name: 'Iris Out · Круговое закрытие',
        desc: 'Iris Wipe схлопывается к центру слоя.',
        tags: 'iris circle wipe круг диафрагма',
        apply: function (c) {
            var r = A.rect(c.layer, c.t0);
            var fx = UK.addFx(c.layer, 'ADBE Iris Wipe', 'Iris');
            UK.set(fx, 'ADBE Iris Wipe-0001', [r.l + r.w / 2, r.t + r.h / 2]);
            UK.set(fx, 'ADBE Iris Wipe-0002', 32);
            UK.set(fx, 'ADBE Iris Wipe-0007', 30 * c.strength);
            var R = Math.sqrt(r.w * r.w + r.h * r.h) / 2 + 40 * c.strength;
            UK.key2(UK.p(fx, 'ADBE Iris Wipe-0003'), c.t0, R, c.t1, 0, c.ease, true);
        }
    });

    UK.add({
        id: 'out.blockDissolve', cat: 'out', name: 'Block Dissolve Out · Блочное растворение',
        desc: 'Block Dissolve с жёсткими блоками (размер × Сила).',
        tags: 'block dissolve pixel блоки',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Block Dissolve', 'Blocks');
            UK.set(fx, 'ADBE Block Dissolve-0002', 40 * c.strength);
            UK.set(fx, 'ADBE Block Dissolve-0003', 40 * c.strength);
            UK.set(fx, 'ADBE Block Dissolve-0004', 0);
            UK.set(fx, 'ADBE Block Dissolve-0005', 0);
            UK.key2(UK.p(fx, 'ADBE Block Dissolve-0001'), c.t0, 0, c.t1, 100, 'linear');
        }
    });

    UK.add({
        id: 'out.curtain', cat: 'out', name: 'Curtain Close · Занавес к центру',
        desc: 'Два Linear Wipe закрывают слой от краёв к центру (по оси направления).',
        tags: 'curtain split center занавес к центру',
        apply: function (c) {
            var a1 = A.horiz(c) ? 90 : 0, a2 = A.horiz(c) ? 270 : 180;
            var f1 = UK.addFx(c.layer, 'ADBE Linear Wipe', 'Curtain A');
            UK.set(f1, 'ADBE Linear Wipe-0002', a1); UK.set(f1, 'ADBE Linear Wipe-0003', 2);
            UK.key2(UK.p(f1, 'ADBE Linear Wipe-0001'), c.t0, 0, c.t1, 50, c.ease, true);
            var f2 = UK.addFx(c.layer, 'ADBE Linear Wipe', 'Curtain B');
            UK.set(f2, 'ADBE Linear Wipe-0002', a2); UK.set(f2, 'ADBE Linear Wipe-0003', 2);
            UK.key2(UK.p(f2, 'ADBE Linear Wipe-0001'), c.t0, 0, c.t1, 50, c.ease, true);
        }
    });

    // ---------------------------------------------------------------- физика / характер
    UK.add({
        id: 'out.dropFall', cat: 'out', name: 'Drop Fall · Падение за край',
        desc: 'Небольшой подскок вверх против направления, затем ускоренное падение за край по направлению.',
        tags: 'drop fall gravity падение гравитация',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), start = pos.valueAtTime(c.t0, false);
            var hop = UK.vecAdd(start, UK.vecMul(c.dirV, -40 * c.strength));
            UK.keys(pos, [[c.t0, start], [c.t0 + c.dur * 0.3, hop], [c.t1, UK.vecAdd(start, A.exitVec(c, 1))]], 'expoIn');
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.squashStretch', cat: 'out', name: 'Squash & Stretch Out · Сквош-стретч',
        desc: 'Сплющивание → вытягивание → схлопывание в ноль. Мультяшный характер.',
        tags: 'squash stretch cartoon сквош мульт',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), start = sc.valueAtTime(c.t0, false);
            var k = 0.3 * c.strength;
            UK.keys(sc, [
                [c.t0, start],
                [c.t0 + c.dur * 0.25, A.scaleXY(start, 1 + k * 0.6, 1 - k * 0.5)],
                [c.t0 + c.dur * 0.55, A.scaleXY(start, 1 - k * 0.6, 1 + k)],
                [c.t1, UK.vecMul(start, 0)]
            ], 'smooth');
        }
    });

    UK.add({
        id: 'out.skewSlide', cat: 'out', name: 'Skew Slide Out · Уход со скосом',
        desc: 'Короткий сдвиг + нарастающий скос (Transform › Skew) по направлению.',
        tags: 'skew slide shear скос наклон',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), start = pos.valueAtTime(c.t0, false);
            UK.key2(pos, c.t0, start, c.t1, UK.vecAdd(start, A.shortVec(c, 200)), c.ease, true);
            var fx = UK.addFx(c.layer, 'ADBE Geometry2', 'Skew');
            UK.set(fx, 'ADBE Geometry2-0007', A.horiz(c) ? 0 : 90);
            UK.key2(UK.p(fx, 'ADBE Geometry2-0006'), c.t0, 0, c.t1, 35 * c.strength * A.sign(c), c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.6, c.t1);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.roll', cat: 'out', name: 'Roll Out · Выкатывание',
        desc: 'Вылет за край с поворотом на 360° × Сила — укатывается как колесо.',
        tags: 'roll wheel rotate slide выкатывание колесо',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), start = pos.valueAtTime(c.t0, false);
            UK.key2(pos, c.t0, start, c.t1, UK.vecAdd(start, A.exitVec(c, 1)), c.ease, true);
            var rot = A.tr(c, 'ADBE Rotate Z'), rS = rot.valueAtTime(c.t0, false);
            UK.key2(rot, c.t0, rS, c.t1, rS + 360 * c.strength * A.sign(c), c.ease, true);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.swing', cat: 'out', name: 'Swing Out · Срыв с гвоздя',
        desc: 'Якорь на верхней грани; слой раскачивается и срывается вниз с растворением.',
        tags: 'swing pendulum fall маятник срыв',
        apply: function (c) {
            var r = A.rect(c.layer, c.t0);
            A.moveAnchor(c.layer, r.l + r.w / 2, r.t, c.t0);
            var rot = A.tr(c, 'ADBE Rotate Z'), rS = rot.valueAtTime(c.t0, false);
            var s = A.sign(c) || 1;
            UK.keys(rot, [[c.t0, rS], [c.t0 + c.dur * 0.3, rS - 12 * c.strength * s], [c.t0 + c.dur * 0.6, rS + 25 * c.strength * s], [c.t1, rS + 70 * c.strength * s]], 'smooth');
            var pos = A.tr(c, 'ADBE Position'), pS = pos.valueAtTime(c.t0, false);
            var drop = pS.slice(); drop[1] = pS[1] + c.comp.height * 0.25 * c.strength;
            UK.key2(pos, c.t0 + c.dur * 0.6, pS, c.t1, drop, 'expoIn');
            A.fadeOut(c, c.t0 + c.dur * 0.7, c.t1, 'expoIn');
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.stretch', cat: 'out', name: 'Stretch Out · Схлопывание по оси',
        desc: 'Масштаб по оси направления 100 → 0 % (вторая ось не меняется).',
        tags: 'stretch scale axis схлопывание ось',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), start = sc.valueAtTime(c.t0, false);
            var end = A.horiz(c) ? A.scaleXY(start, 0, 1) : A.scaleXY(start, 1, 0);
            UK.key2(sc, c.t0, start, c.t1, end, c.ease, true);
        }
    });

    UK.add({
        id: 'out.fold', cat: 'out', name: 'Fold · Сворачивание',
        desc: 'Сначала схлопывается в тонкую линию по одной оси, затем исчезает по другой.',
        tags: 'fold line close сворачивание линия',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), start = sc.valueAtTime(c.t0, false);
            var thin = 0.02;
            var k1 = A.horiz(c) ? A.scaleXY(start, 1, thin) : A.scaleXY(start, thin, 1);
            var k2 = A.horiz(c) ? A.scaleXY(start, 0, thin) : A.scaleXY(start, thin, 0);
            UK.keys(sc, [[c.t0, start], [c.t0 + c.dur * 0.55, k1], [c.t1, k2]], 'expoInOut');
        }
    });

    UK.add({
        id: 'out.slideRotate', cat: 'out', name: 'Slide + Rotate Out · Уход с доворотом',
        desc: 'Короткий сдвиг с поворотом на 25° × Сила и растворением.',
        tags: 'slide rotate tilt сдвиг доворот',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), start = pos.valueAtTime(c.t0, false);
            UK.key2(pos, c.t0, start, c.t1, UK.vecAdd(start, A.shortVec(c, 220)), c.ease, true);
            var rot = A.tr(c, 'ADBE Rotate Z'), rS = rot.valueAtTime(c.t0, false);
            UK.key2(rot, c.t0, rS, c.t1, rS + 25 * c.strength * A.sign(c), c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.5, c.t1);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.diagonal', cat: 'out', name: 'Diagonal Slide Out · Вылет по диагонали',
        desc: 'Вылет в угол (направление + перпендикуляр) с растворением.',
        tags: 'diagonal corner slide диагональ угол',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), start = pos.valueAtTime(c.t0, false);
            UK.key2(pos, c.t0, start, c.t1, UK.vecAdd(start, A.diagVec(c, c.strength)), c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.6, c.t1);
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'out.shadowPop', cat: 'out', name: 'Shadow Drop · Опускание на фон',
        desc: 'Тень сжимается, масштаб 100 → 90 %, слой «ложится» на фон и растворяется.',
        tags: 'shadow drop lift тень опускание',
        apply: function (c) {
            var sc = A.tr(c, 'ADBE Scale'), start = sc.valueAtTime(c.t0, false);
            UK.key2(sc, c.t0, start, c.t1, A.scaleXY(start, 0.9, 0.9), c.ease, true);
            A.fadeOut(c, c.t0 + c.dur * 0.6, c.t1);
            var fx = UK.addFx(c.layer, 'ADBE Drop Shadow', 'Shadow');
            UK.set(fx, 'ADBE Drop Shadow-0001', [0, 0, 0]);
            UK.set(fx, 'ADBE Drop Shadow-0003', 135);
            UK.key2(UK.p(fx, 'ADBE Drop Shadow-0002'), c.t0, 60 * Math.min(1.5, c.strength), c.t1, 0, c.ease, true);
            UK.key2(UK.p(fx, 'ADBE Drop Shadow-0004'), c.t0, 25 * c.strength, c.t1, 0, c.ease, true);
            UK.key2(UK.p(fx, 'ADBE Drop Shadow-0005'), c.t0, 40 * c.strength, c.t1, 0, c.ease, true);
        }
    });

    // ---------------------------------------------------------------- глитч / пиксели / вспышки
    UK.add({
        id: 'out.glitch', cat: 'out', name: 'Glitch Out · Глитч-исчезновение',
        desc: 'Нарастающие рывки позиции, мозаика и мигание прозрачности hold-ключами, в конце — пусто.',
        tags: 'glitch digital jitter глитч рывки',
        apply: function (c) {
            var layer = c.layer, r = A.rect(layer, c.t0);
            var tf = UK.addFx(layer, 'ADBE Geometry2', 'Glitch Shift');
            var tp = UK.p(tf, 'ADBE Geometry2-0002'), base = tp.valueAtTime(c.t0, false);
            var mos = UK.addFx(layer, 'ADBE Mosaic', 'Glitch Pixels');
            UK.set(mos, 'ADBE Mosaic-0003', 1);
            var hb = UK.p(mos, 'ADBE Mosaic-0001'), vb = UK.p(mos, 'ADBE Mosaic-0002');
            var op = A.tr(c, 'ADBE Opacity'), opS = op.valueAtTime(c.t0, false);
            var maxB = Math.min(4000, Math.max(r.w, r.h, 64));
            var n = Math.max(3, Math.round(c.dur / c.fd / 2)), step = c.dur / n;
            UK.setHold(tp, UK.key(tp, c.t0, base));
            UK.setHold(hb, UK.key(hb, c.t0, maxB));
            UK.setHold(vb, UK.key(vb, c.t0, maxB));
            UK.setHold(op, UK.key(op, c.t0, opS));
            for (var i = 1; i < n; i++) {
                var t = c.t0 + i * step, k = i / n;
                var amp = 60 * c.strength * k;
                var p = base.slice();
                p[0] = base[0] + UK.rnd(-amp, amp); p[1] = base[1] + UK.rnd(-amp, amp) * 0.4;
                UK.setHold(tp, UK.key(tp, t, p));
                var blocks = Math.round(UK.lerp(maxB, 8, k * k));
                UK.setHold(hb, UK.key(hb, t, Math.max(1, blocks)));
                UK.setHold(vb, UK.key(vb, t, Math.max(1, Math.round(blocks * r.h / Math.max(1, r.w)))));
                var o = Math.random() < 0.35 * k ? 0 : (Math.random() < 0.5 ? opS : opS * 0.55);
                UK.setHold(op, UK.key(op, t, o));
            }
            UK.setHold(op, UK.key(op, c.t1, 0));
        }
    });

    UK.add({
        id: 'out.pixelate', cat: 'out', name: 'Pixelate Out · В пиксели',
        desc: 'Mosaic от полного разрешения к крупным блокам + растворение в конце.',
        tags: 'pixelate mosaic pixel пиксели мозаика',
        apply: function (c) {
            var r = A.rect(c.layer, c.t0);
            var fx = UK.addFx(c.layer, 'ADBE Mosaic', 'Pixelate');
            UK.set(fx, 'ADBE Mosaic-0003', 1);
            var maxB = Math.min(4000, Math.max(r.w, 64));
            var to = Math.max(2, Math.round(12 / c.strength));
            UK.key2(UK.p(fx, 'ADBE Mosaic-0001'), c.t0, maxB, c.t1, to, 'expoOut');
            UK.key2(UK.p(fx, 'ADBE Mosaic-0002'), c.t0, Math.min(4000, Math.max(r.h, 64)), c.t1, Math.max(2, Math.round(to * r.h / Math.max(1, r.w))), 'expoOut');
            A.fadeOut(c, c.t0 + c.dur * 0.7, c.t1);
        }
    });

    UK.add({
        id: 'out.flash', cat: 'out', name: 'Flash Out · В белую вспышку',
        desc: 'Слой заливается белым (Fill) и резко исчезает; масштаб 100 → 110 %.',
        tags: 'flash white fill вспышка белый',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Fill', 'Flash');
            UK.set(fx, 'ADBE Fill-0003', [1, 1, 1]);
            UK.key2(UK.p(fx, 'ADBE Fill-0007'), c.t0, 0, c.t1 - c.fd, 100, 'expoIn');
            var sc = A.tr(c, 'ADBE Scale'), start = sc.valueAtTime(c.t0, false);
            var k = 1 + 0.1 * c.strength;
            UK.key2(sc, c.t0, start, c.t1, A.scaleXY(start, k, k), c.ease, true);
            A.fadeOut(c, c.t1 - c.fd * 2, c.t1, 'linear');
        }
    });

    UK.add({
        id: 'out.flicker', cat: 'out', name: 'Flicker Out · Мерцание (неон)',
        desc: 'Случайные hold-ключи прозрачности, плотность падает к концу — как гаснущая лампа.',
        tags: 'flicker neon lamp мерцание неон лампа',
        apply: function (c) {
            var op = A.tr(c, 'ADBE Opacity'), start = op.valueAtTime(c.t0, false);
            var n = Math.max(4, Math.round(c.dur / c.fd / 2)), step = c.dur / n;
            UK.setHold(op, UK.key(op, c.t0, start));
            for (var i = 1; i < n; i++) {
                var t = c.t0 + i * step, k = 1 - i / n;
                var on = Math.random() < (0.25 + 0.7 * k);
                var v = on ? start * UK.rnd(0.6, 1) : start * UK.rnd(0, 0.15) * (1 - c.strength * 0.5);
                UK.setHold(op, UK.key(op, t, UK.clamp(v, 0, 100)));
            }
            UK.setHold(op, UK.key(op, c.t1, 0));
        }
    });

    UK.add({
        id: 'out.riseBlur', cat: 'out', name: 'Rise + Blur Out · Уход в размытие',
        desc: 'Сдвиг по направлению (120px × Сила) + Gaussian Blur + растворение — кинематографичный титр.',
        tags: 'rise blur cinematic title титр',
        apply: function (c) {
            var pos = A.tr(c, 'ADBE Position'), start = pos.valueAtTime(c.t0, false);
            UK.key2(pos, c.t0, start, c.t1, UK.vecAdd(start, A.shortVec(c, 120)), 'soft', true);
            var fx = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Rise Blur');
            UK.set(fx, 'ADBE Gaussian Blur 2-0003', 1);
            UK.key2(UK.p(fx, 'ADBE Gaussian Blur 2-0001'), c.t0, 0, c.t1, 40 * c.strength, 'soft', true);
            A.fadeOut(c, c.t0, c.t1, 'soft');
        }
    });

})();
