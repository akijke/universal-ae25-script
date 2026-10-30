// =============================================================================
//  Библиотека: Искажения (cat: 'distort')
// =============================================================================
(function () {

    function lw(c) {
        var w = 0, h = 0;
        try { w = c.layer.width; h = c.layer.height; } catch (e) {}
        if (!w || !h) { w = c.comp.width; h = c.comp.height; }
        return [w, h];
    }
    function drive(c, fx, prop, name, value) {
        UK.set(fx, prop, value);
        if (c.opts.controls) UK.expr(fx, prop, UK.cv(c, name, value));
    }
    function drivePoint(c, fx, prop, name, value) {
        UK.set(fx, prop, value);
        if (c.opts.controls) { UK.point(c.layer, name, value); UK.expr(fx, prop, UK.ref(name, 'point')); }
    }
    /** Слайдер на произвольном слое (карты смещения). */
    function cvOn(c, layer, name, value) {
        if (c.opts.controls) { UK.slider(layer, name, value); return UK.ref(name); }
        return String(UK.fmt(value, 4));
    }
    function dirAngle(c) { return { L: 270, R: 90, U: 0, D: 180 }[c.dirId] || 0; }
    /** Выражение «вращение эволюции»: speed — оборотов в секунду. */
    function evolve(c, fx, prop, name, speed) {
        var sp = UK.cv(c, name, speed);
        UK.expr(fx, prop, 'time * ' + sp + ' * 360');
    }

    // ---------------------------------------------------------------- Turbulent Displace
    function turb(c, nick, type, amount, size, complexity, speed, ctrlPrefix) {
        var td = UK.addFx(c.layer, 'ADBE Turbulent Displace', nick);
        UK.set(td, 'ADBE Turbulent Displace-0001', type);
        drive(c, td, 'ADBE Turbulent Displace-0002', ctrlPrefix + ' Amount', amount * c.strength);
        drive(c, td, 'ADBE Turbulent Displace-0003', ctrlPrefix + ' Size', size);
        UK.set(td, 'ADBE Turbulent Displace-0005', complexity);
        evolve(c, td, ['ADBE Turbulent Displace-0006', 'Evolution'], ctrlPrefix + ' Speed', speed);
        UK.set(td, ['ADBE Turbulent Displace-0011', 'Pinning'], 1);
        UK.set(td, ['ADBE Turbulent Displace-0013', 'Antialiasing for Best Quality'], 2);
        return td;
    }

    UK.add({
        id: 'distort.turbSoft', cat: 'distort', name: 'Turbulent Soft · Мягкая турбулентность',
        desc: 'Плавное «дыхание» картинки (Turbulent Smoother). Amount/Size/Speed.',
        tags: 'turbulent displace soft smooth wobble турбулентность',
        apply: function (c) { turb(c, 'Turbulent Soft', 4, 25, 220, 2, 0.08, 'Turb'); }
    });
    UK.add({
        id: 'distort.turbHard', cat: 'distort', name: 'Turbulent Hard · Жёсткая турбулентность',
        desc: 'Рваные искажения с мелкой детализацией.',
        tags: 'turbulent displace hard rough распад',
        apply: function (c) { turb(c, 'Turbulent Hard', 1, 60, 90, 5, 0.25, 'Turb'); }
    });
    UK.add({
        id: 'distort.turbVertical', cat: 'distort', name: 'Turbulent Vertical · Вертикальный дрейф',
        desc: 'Турбулентность, вытянутая по вертикали — горизонтальные полосы дрожат.',
        tags: 'turbulent vertical streaks полосы',
        apply: function (c) {
            var td = turb(c, 'Turbulent Vertical', 3, 35, 40, 3, 0.3, 'Turb');
            UK.set(td, ['ADBE Turbulent Displace-0011', 'Pinning'], 1);
            // вытягиваем размер через Offset(Turbulence) не получится — используем Wave Warp вертикальную поверх
            var ww = UK.addFx(c.layer, 'ADBE Wave Warp', 'Vertical Stretch');
            UK.set(ww, 'ADBE Wave Warp-0001', 1);
            UK.set(ww, 'ADBE Wave Warp-0002', 6 * c.strength);
            UK.set(ww, 'ADBE Wave Warp-0003', 20);
            UK.set(ww, 'ADBE Wave Warp-0004', 90);
            UK.set(ww, 'ADBE Wave Warp-0005', 1.5);
            UK.set(ww, 'ADBE Wave Warp-0006', 1);
        }
    });
    UK.add({
        id: 'distort.heatHaze', cat: 'distort', name: 'Heat Haze · Марево',
        desc: 'Быстрая мелкая турбулентность — горячий воздух над асфальтом.',
        tags: 'heat haze mirage wave марево жара',
        apply: function (c) { turb(c, 'Heat Haze', 1, 6, 25, 3, 1.2, 'Haze'); }
    });

    // ---------------------------------------------------------------- Wave / Ripple / etc.
    UK.add({
        id: 'distort.wave', cat: 'distort', name: 'Wave Warp · Волна',
        desc: 'Синусоидальная волна по направлению из настроек.',
        tags: 'wave warp sine волна',
        apply: function (c) {
            var ww = UK.addFx(c.layer, 'ADBE Wave Warp', 'Wave');
            UK.set(ww, 'ADBE Wave Warp-0001', 1);
            drive(c, ww, 'ADBE Wave Warp-0002', 'Wave Height', 20 * c.strength);
            drive(c, ww, 'ADBE Wave Warp-0003', 'Wave Width', 240);
            UK.set(ww, 'ADBE Wave Warp-0004', dirAngle(c) + 90);
            drive(c, ww, 'ADBE Wave Warp-0005', 'Wave Speed', 1);
            UK.set(ww, 'ADBE Wave Warp-0006', 1);
            UK.set(ww, 'ADBE Wave Warp-0008', 2);
        }
    });
    UK.add({
        id: 'distort.water', cat: 'distort', name: 'Water Surface · Вода',
        desc: 'Волна + турбулентность: отражение в воде / под водой.',
        tags: 'water underwater reflection вода',
        apply: function (c) {
            var ww = UK.addFx(c.layer, 'ADBE Wave Warp', 'Water Wave');
            UK.set(ww, 'ADBE Wave Warp-0001', 1);
            drive(c, ww, 'ADBE Wave Warp-0002', 'Water Height', 8 * c.strength);
            UK.set(ww, 'ADBE Wave Warp-0003', 120);
            UK.set(ww, 'ADBE Wave Warp-0004', 90);
            drive(c, ww, 'ADBE Wave Warp-0005', 'Water Speed', 0.6);
            UK.set(ww, 'ADBE Wave Warp-0006', 1);
            turb(c, 'Water Turbulence', 4, 14, 80, 3, 0.2, 'Water Turb');
        }
    });
    UK.add({
        id: 'distort.rgbWave', cat: 'distort', name: 'RGB Wave · Волна с хроматикой',
        desc: 'Волна с цветовым расслоением каналов.',
        tags: 'rgb wave chromatic channel волна',
        apply: function (c) {
            var ww = UK.addFx(c.layer, 'ADBE Wave Warp', 'RGB Wave');
            UK.set(ww, 'ADBE Wave Warp-0001', 1);
            drive(c, ww, 'ADBE Wave Warp-0002', 'RGB Wave Height', 10 * c.strength);
            UK.set(ww, 'ADBE Wave Warp-0003', 80);
            UK.set(ww, 'ADBE Wave Warp-0004', 0);
            drive(c, ww, 'ADBE Wave Warp-0005', 'RGB Wave Speed', 1.5);
            UK.set(ww, 'ADBE Wave Warp-0006', 1);
            var cb = UK.addFx(c.layer, 'ADBE Channel Blur', 'RGB Split');
            drive(c, cb, 'ADBE Channel Blur-0001', 'RGB Split', 14 * c.strength);
            UK.set(cb, 'ADBE Channel Blur-0003', 14 * c.strength);
            UK.set(cb, 'ADBE Channel Blur-0005', 1);
            UK.set(cb, 'ADBE Channel Blur-0006', 2);
        }
    });
    UK.add({
        id: 'distort.ripple', cat: 'distort', name: 'Ripple · Круги на воде',
        desc: 'Концентрические волны от центра.',
        tags: 'ripple rings water drop круги',
        apply: function (c) {
            var s = lw(c);
            var rp = UK.addFx(c.layer, 'ADBE Ripple', 'Ripple');
            drive(c, rp, 'ADBE Ripple-0001', 'Ripple Radius', 100);
            drivePoint(c, rp, 'ADBE Ripple-0002', 'Ripple Center', [s[0] / 2, s[1] / 2]);
            UK.set(rp, 'ADBE Ripple-0003', 1);
            drive(c, rp, 'ADBE Ripple-0004', 'Ripple Speed', 1);
            UK.set(rp, 'ADBE Ripple-0005', 40);
            drive(c, rp, 'ADBE Ripple-0006', 'Ripple Height', 25 * c.strength);
        }
    });
    UK.add({
        id: 'distort.twirl', cat: 'distort', name: 'Twirl · Закрутка',
        desc: 'Спиральная закрутка вокруг центра.',
        tags: 'twirl swirl spiral закрутка спираль',
        apply: function (c) {
            var s = lw(c);
            var tw = UK.addFx(c.layer, 'ADBE Twirl', 'Twirl');
            drive(c, tw, 'ADBE Twirl-0001', 'Twirl Angle', 90 * c.strength);
            drive(c, tw, 'ADBE Twirl-0002', 'Twirl Radius', 50);
            drivePoint(c, tw, 'ADBE Twirl-0003', 'Twirl Center', [s[0] / 2, s[1] / 2]);
        }
    });
    UK.add({
        id: 'distort.twirlSpin', cat: 'distort', name: 'Twirl Spin · Вращающаяся закрутка',
        desc: 'Закрутка, угол которой постоянно растёт (Speed — °/с).',
        tags: 'twirl spin animated rotating закрутка',
        apply: function (c) {
            var s = lw(c);
            var tw = UK.addFx(c.layer, 'ADBE Twirl', 'Twirl Spin');
            var sp = UK.cv(c, 'Twirl Spin Speed', 45 * c.strength);
            UK.expr(tw, 'ADBE Twirl-0001', 'time * ' + sp);
            drive(c, tw, 'ADBE Twirl-0002', 'Twirl Spin Radius', 45);
            UK.set(tw, 'ADBE Twirl-0003', [s[0] / 2, s[1] / 2]);
        }
    });
    UK.add({
        id: 'distort.bulge', cat: 'distort', name: 'Bulge · Выпуклость',
        desc: 'Линза-выпуклость по центру.',
        tags: 'bulge lens magnify выпуклость',
        apply: function (c) {
            var s = lw(c), r = Math.min(s[0], s[1]) * 0.35;
            var bg = UK.addFx(c.layer, 'ADBE Bulge', 'Bulge');
            drive(c, bg, 'ADBE Bulge-0001', 'Bulge Radius X', r);
            drive(c, bg, 'ADBE Bulge-0002', 'Bulge Radius Y', r);
            drivePoint(c, bg, 'ADBE Bulge-0003', 'Bulge Center', [s[0] / 2, s[1] / 2]);
            drive(c, bg, 'ADBE Bulge-0004', 'Bulge Height', 1.2 * c.strength);
            UK.set(bg, 'ADBE Bulge-0005', 0.2);
            UK.set(bg, 'ADBE Bulge-0006', 2);
        }
    });
    UK.add({
        id: 'distort.pinch', cat: 'distort', name: 'Pinch · Вогнутость',
        desc: 'Обратная выпуклость — картинка втягивается в центр.',
        tags: 'pinch concave implode вогнутость',
        apply: function (c) {
            var s = lw(c), r = Math.min(s[0], s[1]) * 0.4;
            var bg = UK.addFx(c.layer, 'ADBE Bulge', 'Pinch');
            drive(c, bg, 'ADBE Bulge-0001', 'Pinch Radius X', r);
            drive(c, bg, 'ADBE Bulge-0002', 'Pinch Radius Y', r);
            UK.set(bg, 'ADBE Bulge-0003', [s[0] / 2, s[1] / 2]);
            drive(c, bg, 'ADBE Bulge-0004', 'Pinch Height', -1.0 * c.strength);
            UK.set(bg, 'ADBE Bulge-0005', 0.3);
            UK.set(bg, 'ADBE Bulge-0006', 2);
        }
    });
    UK.add({
        id: 'distort.spherize', cat: 'distort', name: 'Spherize · Сфера',
        desc: 'Сферическое искажение.',
        tags: 'spherize sphere ball сфера',
        apply: function (c) {
            var s = lw(c);
            var sp = UK.addFx(c.layer, 'ADBE Spherize', 'Spherize');
            drive(c, sp, 'ADBE Spherize-0001', 'Sphere Radius', Math.min(s[0], s[1]) * 0.45 * c.strength);
            drivePoint(c, sp, 'ADBE Spherize-0002', 'Sphere Center', [s[0] / 2, s[1] / 2]);
        }
    });
    UK.add({
        id: 'distort.mirrorSplit', cat: 'distort', name: 'Mirror Split · Зеркальная половина',
        desc: 'Половина кадра отражается на другую (по направлению).',
        tags: 'mirror split symmetry зеркало',
        apply: function (c) {
            var s = lw(c);
            var mr = UK.addFx(c.layer, 'ADBE Mirror', 'Mirror Split');
            drivePoint(c, mr, 'ADBE Mirror-0001', 'Mirror Split Center', [s[0] / 2, s[1] / 2]);
            UK.set(mr, 'ADBE Mirror-0002', { L: 0, R: 180, U: 90, D: 270 }[c.dirId] || 0);
        }
    });
    UK.add({
        id: 'distort.quadMirror', cat: 'distort', name: 'Quad Mirror · Четырёхкратное зеркало',
        desc: 'Два Mirror подряд: симметрия по горизонтали и вертикали.',
        tags: 'quad mirror symmetry four зеркало',
        apply: function (c) {
            var s = lw(c);
            var m1 = UK.addFx(c.layer, 'ADBE Mirror', 'Mirror H');
            UK.set(m1, 'ADBE Mirror-0001', [s[0] / 2, s[1] / 2]); UK.set(m1, 'ADBE Mirror-0002', 0);
            var m2 = UK.addFx(c.layer, 'ADBE Mirror', 'Mirror V');
            UK.set(m2, 'ADBE Mirror-0001', [s[0] / 2, s[1] / 2]); UK.set(m2, 'ADBE Mirror-0002', 90);
        }
    });
    UK.add({
        id: 'distort.polar', cat: 'distort', name: 'Polar Coordinates · Полярные (кольцо)',
        desc: 'Прямоугольник → полярные координаты.',
        tags: 'polar coordinates ring circle полярные',
        apply: function (c) {
            var pc = UK.addFx(c.layer, 'ADBE Polar Coordinates', 'Polar');
            drive(c, pc, 'ADBE Polar Coordinates-0001', 'Polar Interpolation', UK.clamp(100 * c.strength, 0, 100));
            UK.set(pc, 'ADBE Polar Coordinates-0002', 1);
        }
    });
    UK.add({
        id: 'distort.tinyPlanet', cat: 'distort', name: 'Tiny Planet · Маленькая планета',
        desc: 'Полярные → прямоугольные с переворотом: эффект «маленькой планеты».',
        tags: 'tiny planet polar 360 планета',
        apply: function (c) {
            var s = lw(c);
            var tf = UK.addFx(c.layer, 'ADBE Geometry2', 'Planet Flip');
            UK.set(tf, 'ADBE Geometry2-0003', 0);
            UK.set(tf, 'ADBE Geometry2-0004', -100);
            UK.set(tf, 'ADBE Geometry2-0005', 100);
            UK.set(tf, 'ADBE Geometry2-0010', 0);
            var pc = UK.addFx(c.layer, 'ADBE Polar Coordinates', 'Tiny Planet');
            drive(c, pc, 'ADBE Polar Coordinates-0001', 'Planet Interpolation', UK.clamp(100 * c.strength, 0, 100));
            UK.set(pc, 'ADBE Polar Coordinates-0002', 2);
            var sc = UK.addFx(c.layer, 'ADBE Geometry2', 'Planet Scale');
            UK.set(sc, 'ADBE Geometry2-0003', 1);
            drive(c, sc, 'ADBE Geometry2-0004', 'Planet Zoom', 100);
            UK.set(sc, 'ADBE Geometry2-0010', 0);
            UK.set(sc, 'ADBE Geometry2-0001', [s[0] / 2, s[1] / 2]);
        }
    });
    UK.add({
        id: 'distort.fisheye', cat: 'distort', name: 'Fisheye · Рыбий глаз',
        desc: 'Optics Compensation с обратным искажением — широкоугольный бочкообразный вид.',
        tags: 'fisheye optics barrel lens рыбий глаз',
        apply: function (c) {
            var s = lw(c);
            var oc = UK.addFx(c.layer, 'ADBE Optics Compensation', 'Fisheye');
            drive(c, oc, 'ADBE Optics Compensation-0001', 'Fisheye FOV', UK.clamp(90 * c.strength, 0, 180));
            UK.set(oc, 'ADBE Optics Compensation-0002', 1);
            UK.set(oc, 'ADBE Optics Compensation-0004', [s[0] / 2, s[1] / 2]);
            UK.set(oc, 'ADBE Optics Compensation-0006', 1);
        }
    });
    UK.add({
        id: 'distort.lensCorrect', cat: 'distort', name: 'Lens Correction · Убрать бочку',
        desc: 'Optics Compensation без реверса — выпрямляет широкоугольник.',
        tags: 'lens correction optics compensation straighten коррекция',
        apply: function (c) {
            var oc = UK.addFx(c.layer, 'ADBE Optics Compensation', 'Lens Correction');
            drive(c, oc, 'ADBE Optics Compensation-0001', 'Lens FOV', UK.clamp(50 * c.strength, 0, 180));
            UK.set(oc, 'ADBE Optics Compensation-0002', 0);
            UK.set(oc, 'ADBE Optics Compensation-0006', 2);
        }
    });
    UK.add({
        id: 'distort.ccLens', cat: 'distort', name: 'CC Lens · Линза',
        desc: 'Картинка свёрнута в круглую линзу.',
        tags: 'cc lens circle sphere линза',
        apply: function (c) {
            var s = lw(c);
            var ln = UK.addFx(c.layer, 'CC Lens', 'Lens');
            drivePoint(c, ln, 'CC Lens-0001', 'Lens Center', [s[0] / 2, s[1] / 2]);
            drive(c, ln, 'CC Lens-0002', 'Lens Size', UK.clamp(200 / c.strength, 10, 500));
            drive(c, ln, 'CC Lens-0003', 'Lens Convergence', 100);
        }
    });
    UK.add({
        id: 'distort.magnify', cat: 'distort', name: 'Magnify Loupe · Лупа',
        desc: 'Круглая лупа с растушёвкой; центр и увеличение — контролы.',
        tags: 'magnify loupe zoom glass лупа увеличение',
        apply: function (c) {
            var s = lw(c);
            var mg = UK.addFx(c.layer, 'ADBE Magnify', 'Loupe');
            UK.set(mg, 'ADBE Magnify-0001', 1);
            drivePoint(c, mg, 'ADBE Magnify-0002', 'Loupe Center', [s[0] / 2, s[1] / 2]);
            drive(c, mg, 'ADBE Magnify-0003', 'Loupe Magnification', 100 + 100 * c.strength);
            UK.set(mg, 'ADBE Magnify-0004', 1);
            drive(c, mg, 'ADBE Magnify-0005', 'Loupe Size', Math.min(s[0], s[1]) * 0.3);
            drive(c, mg, 'ADBE Magnify-0006', 'Loupe Feather', 20);
            UK.set(mg, 'ADBE Magnify-0008', 2);
            UK.set(mg, 'ADBE Magnify-0010', 1);
        }
    });
    UK.add({
        id: 'distort.kaleida', cat: 'distort', name: 'CC Kaleida Static · Калейдоскоп (статичный)',
        desc: 'Калейдоскоп без вращения; размер — слайдер.',
        tags: 'kaleida kaleidoscope pattern калейдоскоп',
        apply: function (c) {
            var s = lw(c);
            var k = UK.addFx(c.layer, 'CC Kaleida', 'Kaleida');
            drivePoint(c, k, 'CC Kaleida-0001', 'Kaleida Center', [s[0] / 2, s[1] / 2]);
            drive(c, k, 'CC Kaleida-0002', 'Kaleida Size', 120 / c.strength);
            drive(c, k, 'CC Kaleida-0004', 'Kaleida Rotation', 0);
        }
    });
    UK.add({
        id: 'distort.slant', cat: 'distort', name: 'CC Slant · Наклон',
        desc: 'Сдвиг верха относительно низа (италик для картинки). Направление L/R.',
        tags: 'slant skew italic наклон',
        apply: function (c) {
            var s = lw(c);
            var sl = UK.addFx(c.layer, 'CC Slant', 'Slant');
            var sign = c.dirId === 'L' ? -1 : 1;
            drive(c, sl, 'CC Slant-0001', 'Slant Amount', 80 * c.strength * sign);
            UK.set(sl, 'CC Slant-0002', 0);
            UK.set(sl, 'CC Slant-0003', [s[0] / 2, s[1]]);
            UK.set(sl, 'CC Slant-0004', s[1]);
        }
    });
    UK.add({
        id: 'distort.bendIt', cat: 'distort', name: 'CC Bend It · Изгиб',
        desc: 'Изгиб слоя относительно оси (как флаг или стебель).',
        tags: 'bend curve flag изгиб',
        apply: function (c) {
            var s = lw(c);
            var bi = UK.addFx(c.layer, 'CC Bend It', 'Bend');
            drive(c, bi, 'CC Bend It-0001', 'Bend Amount', 40 * c.strength);
            var vert = c.dirV[1] !== 0;
            UK.set(bi, 'CC Bend It-0002', vert ? [s[0] / 2, s[1]] : [0, s[1] / 2]);
            UK.set(bi, 'CC Bend It-0003', vert ? [s[0] / 2, 0] : [s[0], s[1] / 2]);
            UK.set(bi, 'CC Bend It-0004', 2);
            UK.set(bi, 'CC Bend It-0005', 2);
        }
    });
    UK.add({
        id: 'distort.floMotion', cat: 'distort', name: 'CC Flo Motion · Стягивание в точки',
        desc: 'Картинка втягивается к двум узлам (сюрреалистичное искажение).',
        tags: 'flo motion knots pull стягивание',
        apply: function (c) {
            var s = lw(c);
            var fm = UK.addFx(c.layer, 'CC Flo Motion', 'Flo Motion');
            UK.set(fm, 'CC Flo Motion-0001', 0);
            drivePoint(c, fm, 'CC Flo Motion-0002', 'Flo Knot 1', [s[0] * 0.3, s[1] * 0.5]);
            drive(c, fm, 'CC Flo Motion-0003', 'Flo Amount 1', 30 * c.strength);
            drivePoint(c, fm, 'CC Flo Motion-0004', 'Flo Knot 2', [s[0] * 0.7, s[1] * 0.5]);
            drive(c, fm, 'CC Flo Motion-0005', 'Flo Amount 2', 30 * c.strength);
            UK.set(fm, 'CC Flo Motion-0006', 1);
            UK.set(fm, 'CC Flo Motion-0007', 1);
        }
    });
    UK.add({
        id: 'distort.tiler', cat: 'distort', name: 'CC Tiler · Плитка',
        desc: 'Мозаика из уменьшенных копий слоя. Scale 50 = 2×2, 25 = 4×4.',
        tags: 'tiler tile grid repeat плитка',
        apply: function (c) {
            var s = lw(c);
            var tl = UK.addFx(c.layer, 'CC Tiler', 'Tiler');
            drive(c, tl, 'CC Tiler-0001', 'Tiler Scale', UK.clamp(50 / c.strength, 1, 100));
            drivePoint(c, tl, 'CC Tiler-0002', 'Tiler Center', [s[0] / 2, s[1] / 2]);
            UK.set(tl, 'CC Tiler-0003', 0);
        }
    });

    // ---------------------------------------------------------------- выражения
    UK.add({
        id: 'distort.jelly', cat: 'distort', name: 'Jelly Wobble · Желе',
        desc: 'Затухающее желеобразное колебание масштаба от старта слоя (или курсора).',
        tags: 'jelly wobble squash stretch elastic желе',
        apply: function (c) {
            var amp = UK.cv(c, 'Jelly Amp', UK.fmt(0.12 * c.strength, 3));
            var freq = UK.cv(c, 'Jelly Freq', 3);
            var decay = UK.cv(c, 'Jelly Decay', 3);
            c.layer.transform.scale.expression =
                'var t0 = ' + UK.fmt(c.t0, 4) + ';\n' +
                'var t = time - t0;\n' +
                'if (t < 0) { value; } else {\n' +
                '  var s = ' + amp + ' * Math.sin(' + freq + ' * t * 2 * Math.PI) / Math.exp(' + decay + ' * t);\n' +
                '  var r = [];\n' +
                '  for (var i = 0; i < value.length; i++) r.push(value[i]);\n' +
                '  r[0] = value[0] * (1 + s);\n' +
                '  r[1] = value[1] * (1 - s);\n' +
                '  r;\n' +
                '}';
        }
    });
    UK.add({
        id: 'distort.wobbleRot', cat: 'distort', name: 'Wobble Rotation · Покачивание',
        desc: 'Постоянное синусоидальное покачивание по вращению.',
        tags: 'wobble rotation swing pendulum покачивание',
        apply: function (c) {
            var amp = UK.cv(c, 'Wobble Amp', 6 * c.strength);
            var freq = UK.cv(c, 'Wobble Freq', 0.8);
            c.layer.transform.rotation.expression = 'value + ' + amp + ' * Math.sin(time * ' + freq + ' * 2 * Math.PI)';
        }
    });
    UK.add({
        id: 'distort.squash', cat: 'distort', name: 'Squash & Stretch · Сплющивание',
        desc: 'Событие: сплющить и вернуть за длительность (анимационный squash).',
        tags: 'squash stretch bounce cartoon событие',
        apply: function (c) {
            var sc = c.layer.transform.scale;
            var v = sc.valueAtTime(c.t0, false);
            var k = 0.25 * c.strength;
            var sq = v.slice(); sq[0] = v[0] * (1 + k); sq[1] = v[1] * (1 - k);
            var st = v.slice(); st[0] = v[0] * (1 - k * 0.5); st[1] = v[1] * (1 + k * 0.5);
            UK.keys(sc, [[c.t0, v], [c.t0 + c.dur * 0.35, sq], [c.t0 + c.dur * 0.7, st], [c.t1, v]], 'smooth');
        }
    });

    // ---------------------------------------------------------------- геометрия
    UK.add({
        id: 'distort.skew', cat: 'distort', name: 'Skew · Скос',
        desc: 'Скос через Transform; ось по направлению.',
        tags: 'skew shear slant скос',
        apply: function (c) {
            var tf = UK.addFx(c.layer, 'ADBE Geometry2', 'Skew');
            var sign = (c.dirId === 'L' || c.dirId === 'U') ? -1 : 1;
            drive(c, tf, 'ADBE Geometry2-0006', 'Skew Amount', 25 * c.strength * sign);
            UK.set(tf, 'ADBE Geometry2-0007', c.dirV[1] !== 0 ? 90 : 0);
            UK.set(tf, 'ADBE Geometry2-0010', 0);
        }
    });
    UK.add({
        id: 'distort.perspective', cat: 'distort', name: 'Perspective Tilt · Перспектива',
        desc: 'Corner Pin: наклон плоскости в сторону направления.',
        tags: 'perspective corner pin tilt 3d перспектива',
        apply: function (c) {
            var s = lw(c), w = s[0], h = s[1];
            var kx = w * 0.12 * c.strength, ky = h * 0.12 * c.strength;
            var ul = [0, 0], ur = [w, 0], ll = [0, h], lr = [w, h];
            if (c.dirId === 'L') { ul = [0, ky]; ll = [0, h - ky]; ur = [w - kx * 0.5, -ky * 0.3]; lr = [w - kx * 0.5, h + ky * 0.3]; }
            else if (c.dirId === 'R') { ur = [w, ky]; lr = [w, h - ky]; ul = [kx * 0.5, -ky * 0.3]; ll = [kx * 0.5, h + ky * 0.3]; }
            else if (c.dirId === 'U') { ul = [kx, 0]; ur = [w - kx, 0]; ll = [-kx * 0.3, h - ky * 0.5]; lr = [w + kx * 0.3, h - ky * 0.5]; }
            else { ll = [kx, h]; lr = [w - kx, h]; ul = [-kx * 0.3, ky * 0.5]; ur = [w + kx * 0.3, ky * 0.5]; }
            var cp = UK.addFx(c.layer, 'ADBE Corner Pin', 'Perspective');
            UK.set(cp, 'ADBE Corner Pin-0001', ul);
            UK.set(cp, 'ADBE Corner Pin-0002', ur);
            UK.set(cp, 'ADBE Corner Pin-0003', ll);
            UK.set(cp, 'ADBE Corner Pin-0004', lr);
        }
    });
    UK.add({
        id: 'distort.zoomStretch', cat: 'distort', name: 'Zoom Stretch · Растяжение с зеркалом',
        desc: 'Растяжение по направлению; края заполняются зеркальной плиткой.',
        tags: 'zoom stretch mirror tile растяжение',
        apply: function (c) {
            var tile = UK.addFx(c.layer, 'ADBE Tile', 'Mirror Tile');
            UK.set(tile, 'ADBE Tile-0004', 300); UK.set(tile, 'ADBE Tile-0005', 300); UK.set(tile, 'ADBE Tile-0006', 1);
            var tf = UK.addFx(c.layer, 'ADBE Geometry2', 'Stretch');
            UK.set(tf, 'ADBE Geometry2-0003', 0);
            var horiz = c.dirV[0] !== 0;
            drive(c, tf, 'ADBE Geometry2-0005', 'Stretch Width', horiz ? 100 + 60 * c.strength : 100);
            drive(c, tf, 'ADBE Geometry2-0004', 'Stretch Height', horiz ? 100 : 100 + 60 * c.strength);
            UK.set(tf, 'ADBE Geometry2-0010', 0);
        }
    });
    UK.add({
        id: 'distort.pixelStretch', cat: 'distort', name: 'Pixel Stretch · Пиксельное растяжение',
        desc: 'CC Scale Wipe: пиксели тянутся из точки по направлению.',
        tags: 'pixel stretch scale wipe smear растяжение',
        apply: function (c) {
            var s = lw(c);
            var sw = UK.addFx(c.layer, 'CC Scale Wipe', 'Pixel Stretch');
            drive(c, sw, 'CC Scale Wipe-0001', 'Pixel Stretch', 3 * c.strength);
            drivePoint(c, sw, 'CC Scale Wipe-0002', 'Pixel Stretch Center', [s[0] / 2, s[1] / 2]);
            UK.set(sw, 'CC Scale Wipe-0003', dirAngle(c));
        }
    });

    // ---------------------------------------------------------------- карты смещения
    function dispMap(c, nick, setup) {
        var W = c.comp.width, H = c.comp.height;
        var map = UK.solid(c.comp, [0.5, 0.5, 0.5], nick + ' Map', c.layer.inPoint, c.layer.outPoint);
        var fn = UK.addFx(map, 'ADBE Fractal Noise', 'Map Noise');
        setup(map, fn);
        map.enabled = false;
        var dm = UK.addFx(c.layer, 'ADBE Displacement Map', nick);
        UK.set(dm, 'ADBE Displacement Map-0001', map.index);
        UK.set(dm, 'ADBE Displacement Map-0002', 1);
        UK.set(dm, 'ADBE Displacement Map-0004', 2);
        UK.set(dm, 'ADBE Displacement Map-0006', 2);
        UK.set(dm, 'ADBE Displacement Map-0007', 2);
        UK.set(dm, 'ADBE Displacement Map-0008', 1);
        return dm;
    }

    UK.add({
        id: 'distort.liquid', cat: 'distort', name: 'Liquid Displacement · Жидкость',
        desc: 'Fractal Noise-карта (скрытый слой) + Displacement Map — текучее искажение.',
        tags: 'liquid displacement map fluid жидкость',
        apply: function (c) {
            var dm = dispMap(c, 'Liquid', function (map, fn) {
                UK.set(fn, 'ADBE Fractal Noise-0001', 5);
                UK.set(fn, 'ADBE Fractal Noise-0002', 3);
                UK.set(fn, ['ADBE Fractal Noise-0004', 'Contrast'], 120);
                UK.set(fn, ['ADBE Fractal Noise-0010', 'Scale'], 220);
                UK.set(fn, ['ADBE Fractal Noise-0015', 'Complexity'], 4);
                var sp = cvOn(c, map, 'Liquid Speed', 0.15);
                UK.expr(fn, ['ADBE Fractal Noise-0022', 'Evolution'], 'time * ' + sp + ' * 360');
            });
            drive(c, dm, 'ADBE Displacement Map-0003', 'Liquid Amount X', 40 * c.strength);
            drive(c, dm, 'ADBE Displacement Map-0005', 'Liquid Amount Y', 40 * c.strength);
        }
    });
    UK.add({
        id: 'distort.glitchDisp', cat: 'distort', name: 'Glitch Displacement · Блочный глитч',
        desc: 'Блочная Fractal Noise-карта (Posterize Time) + горизонтальное смещение — цифровой глитч.',
        tags: 'glitch displacement blocks digital глитч',
        apply: function (c) {
            var dm = dispMap(c, 'Glitch', function (map, fn) {
                UK.set(fn, 'ADBE Fractal Noise-0001', 1);
                UK.set(fn, 'ADBE Fractal Noise-0002', 1);
                UK.set(fn, ['ADBE Fractal Noise-0004', 'Contrast'], 400);
                UK.set(fn, ['ADBE Fractal Noise-0005', 'Brightness'], -40);
                UK.set(fn, ['ADBE Fractal Noise-0009', 'Uniform Scaling'], 0);
                UK.set(fn, ['ADBE Fractal Noise-0011', 'Scale Width'], 4000);
                UK.set(fn, ['ADBE Fractal Noise-0012', 'Scale Height'], 30);
                UK.set(fn, ['ADBE Fractal Noise-0015', 'Complexity'], 1);
                var sp = cvOn(c, map, 'Glitch Speed', 2);
                UK.expr(fn, ['ADBE Fractal Noise-0022', 'Evolution'], 'time * ' + sp + ' * 360');
                var pt = UK.addFx(map, 'ADBE Posterize Time', 'Map Stutter');
                UK.set(pt, 'ADBE Posterize Time-0001', 8);
            });
            drive(c, dm, 'ADBE Displacement Map-0003', 'Glitch Amount X', 60 * c.strength);
            drive(c, dm, 'ADBE Displacement Map-0005', 'Glitch Amount Y', 0);
        }
    });
    UK.add({
        id: 'distort.smoke', cat: 'distort', name: 'Smoke Distortion · Дымка',
        desc: 'Крупная мягкая карта смещения — как сквозь дым или стекло с потёками.',
        tags: 'smoke glass soft displacement дым стекло',
        apply: function (c) {
            var dm = dispMap(c, 'Smoke', function (map, fn) {
                UK.set(fn, 'ADBE Fractal Noise-0001', 4);
                UK.set(fn, 'ADBE Fractal Noise-0002', 3);
                UK.set(fn, ['ADBE Fractal Noise-0004', 'Contrast'], 80);
                UK.set(fn, ['ADBE Fractal Noise-0010', 'Scale'], 500);
                UK.set(fn, ['ADBE Fractal Noise-0015', 'Complexity'], 2);
                var sp = cvOn(c, map, 'Smoke Speed', 0.06);
                UK.expr(fn, ['ADBE Fractal Noise-0022', 'Evolution'], 'time * ' + sp + ' * 360');
                UK.expr(fn, ['ADBE Fractal Noise-0013', 'Offset Turbulence'], '[thisComp.width / 2, thisComp.height / 2 - time * 40]');
            });
            drive(c, dm, 'ADBE Displacement Map-0003', 'Smoke Amount X', 25 * c.strength);
            drive(c, dm, 'ADBE Displacement Map-0005', 'Smoke Amount Y', 25 * c.strength);
        }
    });

})();
