// =============================================================================
//  CAM — камера и движение: тряска, зум, пан, 3D, фокус
// =============================================================================
(function () {

    function scaleMul(v, k) {
        var r = [];
        for (var i = 0; i < v.length; i++) r.push(i < 2 ? v[i] * k : v[i]);
        return r;
    }
    /** Угол Directional Blur по направлению: горизонтальное движение — 90°, вертикальное — 0°. */
    function blurAngle(c) { return c.dirV[0] !== 0 ? 90 : 0; }
    function span(layer) { return { t0: layer.inPoint, t1: layer.outPoint }; }

    // -------------------------------------------------------------- shake
    UK.add({
        id: 'cam.handheld', cat: 'cam', name: 'Handheld · Ручная камера',
        desc: 'Лёгкое живое покачивание позиции и поворота (wiggle). Частота и амплитуда — контролы.',
        tags: 'handheld shake camera ручная камера покачивание wiggle',
        apply: function (c) {
            var f = UK.cv(c, 'Shake Freq', 1.5), a = UK.cv(c, 'Shake Amp', 12 * c.strength), r = UK.cv(c, 'Shake Rot', 0.4 * c.strength);
            c.layer.transform.position.expression = 'wiggle(' + f + ', ' + a + ')';
            c.layer.transform.rotation.expression = 'wiggle(' + f + ', ' + r + ')';
            var sc = UK.cv(c, 'Shake Zoom', 104);
            c.layer.transform.scale.expression = 'var k = ' + sc + ' / 100;\n[value[0] * k, value[1] * k, value[2]]';
            UK.motionBlur(c.layer, c.comp);
        }
    });
    UK.add({
        id: 'cam.earthquake', cat: 'cam', name: 'Earthquake · Землетрясение',
        desc: 'Сильная быстрая тряска с поворотом и запасом масштаба, чтобы не было видно краёв.',
        tags: 'earthquake shake тряска землетрясение сильная',
        apply: function (c) {
            var f = UK.cv(c, 'Quake Freq', 14), a = UK.cv(c, 'Quake Amp', 45 * c.strength), r = UK.cv(c, 'Quake Rot', 1.5 * c.strength);
            c.layer.transform.position.expression = 'wiggle(' + f + ', ' + a + ')';
            c.layer.transform.rotation.expression = 'wiggle(' + f + ', ' + r + ')';
            c.layer.transform.scale.expression = 'var k = 1 + ' + UK.fmt(0.08 * c.strength) + ';\n[value[0] * k, value[1] * k, value[2]]';
            UK.motionBlur(c.layer, c.comp);
        }
    });
    UK.add({
        id: 'cam.impact', cat: 'cam', name: 'Impact Hit · Удар',
        desc: 'Резкий толчок масштаба и затухающая тряска в точке старта — под удар/бит.',
        tags: 'impact hit punch удар бит тряска',
        apply: function (c) {
            var sc = c.layer.transform.scale;
            var v = sc.valueAtTime(c.t0, false);
            UK.keys(sc, [[c.t0, v], [c.t0 + c.fd * 2, scaleMul(v, 1 + 0.12 * c.strength)], [c.t1, v]], 'expoOut');
            var a = UK.cv(c, 'Impact Amp', 35 * c.strength), d = UK.cv(c, 'Impact Decay', c.dur);
            c.layer.transform.position.expression = 'var t0 = ' + UK.fmt(c.t0) + ', d = Math.max(0.05, ' + d + '), a = ' + a + ';\n' +
                'var k = (time >= t0 && time < t0 + d) ? Math.pow(1 - (time - t0) / d, 2) : 0;\n' +
                'k > 0 ? wiggle(22, a * k) : value';
            UK.motionBlur(c.layer, c.comp);
        }
    });
    UK.add({
        id: 'cam.whipHit', cat: 'cam', name: 'Whip Hit · Хлёсткий сдвиг',
        desc: 'Слой резко прилетает по направлению с направленным размытием — хлыст.',
        tags: 'whip pan hit хлыст сдвиг размытие',
        apply: function (c) {
            var pos = c.layer.transform.position;
            var end = pos.valueAtTime(c.t1, false);
            var dist = (c.dirV[0] !== 0 ? c.comp.width : c.comp.height) * 0.35 * c.strength;
            var start = UK.vecAdd(end, UK.vecMul(c.dirV, -dist));
            UK.key2(pos, c.t0, start, c.t1, end, 'expoOut');
            UK.applyEaseExpr(pos, c.ease, c);
            var mb = UK.addFx(c.layer, 'ADBE Motion Blur', 'Whip Blur');
            UK.set(mb, 'ADBE Motion Blur-0001', blurAngle(c));
            UK.keys(UK.p(mb, 'ADBE Motion Blur-0002'), [[c.t0, 160 * c.strength], [c.t1, 0]], 'expoOut');
            UK.motionBlur(c.layer, c.comp);
        }
    });

    // -------------------------------------------------------------- zoom
    UK.add({
        id: 'cam.pushIn', cat: 'cam', name: 'Push In · Наезд',
        desc: 'Плавный наезд (масштаб +) за длительность с выбранным изингом.',
        tags: 'push in zoom наезд масштаб',
        apply: function (c) {
            var sc = c.layer.transform.scale;
            var v = sc.valueAtTime(c.t0, false);
            UK.key2(sc, c.t0, v, c.t1, scaleMul(v, 1 + 0.25 * c.strength), c.ease);
            UK.applyEaseExpr(sc, c.ease, c);
            UK.motionBlur(c.layer, c.comp);
        }
    });
    UK.add({
        id: 'cam.pushOut', cat: 'cam', name: 'Push Out · Отъезд',
        desc: 'Плавный отъезд (масштаб −) за длительность.',
        tags: 'push out zoom отъезд масштаб',
        apply: function (c) {
            var sc = c.layer.transform.scale;
            var v = sc.valueAtTime(c.t0, false);
            UK.key2(sc, c.t0, scaleMul(v, 1 + 0.25 * c.strength), c.t1, v, c.ease);
            UK.applyEaseExpr(sc, c.ease, c);
            UK.motionBlur(c.layer, c.comp);
        }
    });
    UK.add({
        id: 'cam.kenBurnsIn', cat: 'cam', name: 'Ken Burns In · Медленный наезд',
        desc: 'Линейный наезд на всю длину слоя (100 → ~110 %). Для фото и статики.',
        tags: 'ken burns slow zoom медленный наезд фото',
        apply: function (c) {
            var s = span(c.layer), sc = c.layer.transform.scale;
            var v = sc.valueAtTime(s.t0, false);
            UK.key2(sc, s.t0, v, s.t1, scaleMul(v, 1 + 0.1 * c.strength), 'linear');
        }
    });
    UK.add({
        id: 'cam.kenBurnsOut', cat: 'cam', name: 'Ken Burns Out · Медленный отъезд',
        desc: 'Линейный отъезд на всю длину слоя (~110 → 100 %).',
        tags: 'ken burns slow zoom out медленный отъезд фото',
        apply: function (c) {
            var s = span(c.layer), sc = c.layer.transform.scale;
            var v = sc.valueAtTime(s.t0, false);
            UK.key2(sc, s.t0, scaleMul(v, 1 + 0.1 * c.strength), s.t1, v, 'linear');
        }
    });
    UK.add({
        id: 'cam.zoomBeat', cat: 'cam', name: 'Zoom Beat · Пульс под бит',
        desc: 'Ритмичные толчки масштаба с заданным BPM (контролы BPM/Amount).',
        tags: 'zoom beat bpm pulse пульс бит ритм',
        apply: function (c) {
            var bpm = UK.cv(c, 'Beat BPM', 120), amt = UK.cv(c, 'Beat Amount', 6 * c.strength);
            c.layer.transform.scale.expression = 'var b = Math.max(1, ' + bpm + '), a = ' + amt + ';\n' +
                'var per = 60 / b;\nvar ph = ((time - inPoint) % per + per) % per / per;\n' +
                'var k = 1 + a / 100 * Math.pow(1 - ph, 3);\n[value[0] * k, value[1] * k, value[2]]';
        }
    });
    UK.add({
        id: 'cam.dollyZoom', cat: 'cam', name: 'Dolly Zoom · Вертиго',
        desc: 'Наезд масштабом с противоположной линзовой дисторсией (Optics Compensation) — эффект «вертиго».',
        tags: 'dolly zoom vertigo вертиго дисторсия',
        apply: function (c) {
            var sc = c.layer.transform.scale;
            var v = sc.valueAtTime(c.t0, false);
            UK.key2(sc, c.t0, v, c.t1, scaleMul(v, 1 + 0.3 * c.strength), c.ease);
            var oc = UK.addFx(c.layer, 'ADBE Optics Compensation', 'Dolly Lens');
            UK.set(oc, 'ADBE Optics Compensation-0002', 1);
            UK.set(oc, 'ADBE Optics Compensation-0006', 1);
            UK.key2(UK.p(oc, 'ADBE Optics Compensation-0001'), c.t0, 0, c.t1, 70 * c.strength, c.ease);
        }
    });
    UK.add({
        id: 'cam.rackFocus', cat: 'cam', name: 'Rack Focus · Перевод фокуса',
        desc: 'Слой приходит в фокус из размытия за длительность.',
        tags: 'rack focus blur фокус резкость',
        apply: function (c) {
            var b = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Rack Focus');
            UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
            UK.key2(UK.p(b, 'ADBE Gaussian Blur 2-0001'), c.t0, 40 * c.strength, c.t1, 0, c.ease);
        }
    });

    // -------------------------------------------------------------- pan / 3D
    UK.add({
        id: 'cam.pan', cat: 'cam', name: 'Slow Pan · Медленный пан',
        desc: 'Линейный дрейф позиции по направлению на всю длину слоя.',
        tags: 'pan drift пан дрейф движение',
        apply: function (c) {
            var s = span(c.layer), pos = c.layer.transform.position;
            var v = pos.valueAtTime(s.t0, false);
            var d = (c.dirV[0] !== 0 ? c.comp.width : c.comp.height) * 0.08 * c.strength;
            UK.key2(pos, s.t0, UK.vecAdd(v, UK.vecMul(c.dirV, -d / 2)), s.t1, UK.vecAdd(v, UK.vecMul(c.dirV, d / 2)), 'linear');
        }
    });
    UK.add({
        id: 'cam.drift', cat: 'cam', name: 'Parallax Drift · Медленный дрейф',
        desc: 'Очень медленное случайное плавание позиции — живой «паралакс» для фонов.',
        tags: 'parallax drift float дрейф фон плавание',
        apply: function (c) {
            var f = UK.cv(c, 'Drift Freq', 0.15), a = UK.cv(c, 'Drift Amp', 30 * c.strength);
            c.layer.transform.position.expression = 'wiggle(' + f + ', ' + a + ')';
            c.layer.transform.scale.expression = 'var k = 1 + ' + UK.fmt(0.04 * c.strength) + ';\n[value[0] * k, value[1] * k, value[2]]';
        }
    });
    UK.add({
        id: 'cam.breathe', cat: 'cam', name: 'Breathe · Дыхание',
        desc: 'Еле заметная синусоидальная пульсация масштаба.',
        tags: 'breathe pulse дыхание пульсация масштаб',
        apply: function (c) {
            var p = UK.cv(c, 'Breathe Period', Math.max(0.5, c.dur * 3)), a = UK.cv(c, 'Breathe Amp', 2 * c.strength);
            c.layer.transform.scale.expression = 'var s = Math.sin((time - inPoint) * 2 * Math.PI / Math.max(0.1, ' + p + ')) * ' + a + ';\n[value[0] + s, value[1] + s, value[2]]';
        }
    });
    UK.add({
        id: 'cam.follow', cat: 'cam', name: 'Smooth Follow · Сглаживание движения',
        desc: 'Сглаживает существующую анимацию позиции (smooth) — как операторская стабилизация.',
        tags: 'smooth follow lag сглаживание стабилизация',
        apply: function (c) {
            var w = UK.cv(c, 'Smooth Width', 0.3 * c.strength);
            c.layer.transform.position.expression = 'smooth(Math.max(0.02, ' + w + '), 10)';
        }
    });
    UK.add({
        id: 'cam.orbit3D', cat: 'cam', name: 'Orbit 3D · Облёт',
        desc: 'Слой становится 3D и поворачивается вокруг вертикальной оси на всю длину.',
        tags: 'orbit 3d rotate облёт поворот',
        apply: function (c) {
            UK.to3D(c.layer);
            var s = span(c.layer);
            var dir = c.dirId === 'R' ? -1 : 1;
            UK.key2(c.layer.transform.yRotation, s.t0, -20 * c.strength * dir, s.t1, 20 * c.strength * dir, 'linear');
            UK.motionBlur(c.layer, c.comp);
        }
    });
    UK.add({
        id: 'cam.tilt3D', cat: 'cam', name: 'Tilt 3D · Наклон',
        desc: 'Слой становится 3D и медленно наклоняется по горизонтальной оси.',
        tags: 'tilt 3d наклон перспектива',
        apply: function (c) {
            UK.to3D(c.layer);
            var s = span(c.layer);
            var dir = c.dirId === 'D' ? -1 : 1;
            UK.key2(c.layer.transform.xRotation, s.t0, -15 * c.strength * dir, s.t1, 15 * c.strength * dir, 'linear');
        }
    });
    UK.add({
        id: 'cam.spinIn', cat: 'cam', name: 'Spin Zoom In · Вращение с наездом',
        desc: 'Слой прилетает с вращением и масштабом из глубины — динамичный камера-мув.',
        tags: 'spin zoom вращение наезд динамика',
        apply: function (c) {
            var sc = c.layer.transform.scale, rot = c.layer.transform.rotation;
            var v = sc.valueAtTime(c.t1, false), r = rot.valueAtTime(c.t1, false);
            UK.key2(sc, c.t0, scaleMul(v, 1 + 0.6 * c.strength), c.t1, v, c.ease);
            UK.key2(rot, c.t0, r + (c.dirId === 'R' ? 1 : -1) * 25 * c.strength, c.t1, r, c.ease);
            UK.applyEaseExpr(sc, c.ease, c);
            UK.motionBlur(c.layer, c.comp);
        }
    });

})();
