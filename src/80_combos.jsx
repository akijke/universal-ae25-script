// =============================================================================
//  Готовые решения (combo) — связки пресетов: появление + лук/эффект + свет + уход
// =============================================================================
(function () {

    // ---- хелперы
    /** Длина слоя. */
    function span(L) { return Math.max(0, L.outPoint - L.inPoint); }
    /** Длительность части: k × c.dur, но не больше 1/2.5 слоя и не меньше 2 кадров. */
    function part(c, k, L) {
        L = L || c.layer;
        var lim = span(L) / 2.5;
        return Math.max(c.fd * 2, Math.min(c.dur * (k || 1), lim > 0 ? lim : c.dur * (k || 1)));
    }
    /** Применить пресет к слою (по умолчанию c.layer) с переопределениями. */
    function at(c, id, over, L) { return UK.applyTo(id, L || c.layer, c.opts, over || {}, c.i); }
    /** Появление: от границы слоя или курсора (как выбрал пользователь). */
    function inAt(c, id, k, over, L) { return at(c, id, UK.mergeOpts({ dur: part(c, k, L) }, over), L); }
    /** Уход: всегда к out-point слоя, без каскада. */
    function outAt(c, id, k, over, L) { return at(c, id, UK.mergeOpts({ dur: part(c, k, L), startMode: 'in', stagger: 0 }, over), L); }
    /** Постоянный эффект/лук на слой. */
    function fx(c, id, over, L) { return at(c, id, UK.mergeOpts({ startMode: 'in', stagger: 0 }, over), L); }
    /** Событие в заданное время (через временный курсор). */
    function atTime(c, id, t, over, L) {
        var comp = c.comp, old = comp.time;
        t = UK.clamp(t, 0, comp.duration);
        comp.time = t;
        try { at(c, id, UK.mergeOpts({ startMode: 'playhead', stagger: 0 }, over), L); }
        finally { comp.time = old; }
    }
    /** Старт появления слоя (учитывает режим курсора и каскад). */
    function startT(c, L) { L = L || c.layer; return (c.opts.startMode === 'playhead' ? c.comp.time : L.inPoint) + (Number(c.opts.stagger) || 0) * c.i; }
    /** Переход. */
    function tr(c, id, over) { return UK.applyTrans(id, c.comp, c.layers, c.opts, over || {}); }
    /** Эффект на слой перехода (A/B), если он есть. */
    function onB(c, id, over) { if (c.B) at(c, id, UK.mergeOpts({ startMode: 'in', stagger: 0 }, over), c.B); }
    function onA(c, id, over) { if (c.A) at(c, id, UK.mergeOpts({ startMode: 'in', stagger: 0 }, over), c.A); }
    var weak = function (k) { return { strength: Math.round(k * 100) }; };

    // =========================================================== слой
    UK.add({
        id: 'combo.logoReveal', cat: 'combo', name: 'Logo Reveal · Появление логотипа',
        desc: 'Scale Pop (Back) → Glow → Light Sweep в конце появления → мягкий Fade Out. Готовая анимация логотипа.',
        tags: 'logo reveal glow sweep логотип готовое',
        apply: function (c) {
            var din = part(c, 1);
            inAt(c, 'in.scalePop', 1, { ease: 'back' });
            fx(c, 'fx.glow', weak(0.7 * c.strength));
            atTime(c, 'light.sweepSoft', startT(c) + din * 0.7, { dur: din * 0.9 });
            outAt(c, 'out.fade', 0.8, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.cinematicClip', cat: 'combo', name: 'Cinematic Clip · Кино-клип',
        desc: 'Ken Burns In + Cinematic look + Vignette + Film Grain + Fade In/Out. Для футажа и фото.',
        tags: 'cinematic clip ken burns vignette grain кино футаж',
        apply: function (c) {
            fx(c, 'cam.kenBurnsIn', weak(0.8 * c.strength));
            fx(c, 'fx.cinematic', weak(0.9 * c.strength));
            fx(c, 'fx.vignette', weak(0.8 * c.strength));
            fx(c, 'fx.filmGrain', weak(0.6 * c.strength));
            inAt(c, 'in.fade', 0.8, { ease: 'smooth' });
            outAt(c, 'out.fade', 0.8, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.glitchIntro', cat: 'combo', name: 'Glitch Intro · Глитч-интро',
        desc: 'Glitch In → Chromatic aberration → Glitch Hit перед концом → Glitch Out.',
        tags: 'glitch intro chromatic rgb глитч интро',
        apply: function (c) {
            var dout = part(c, 0.8), hit = Math.min(0.35, part(c, 0.4));
            inAt(c, 'in.glitch', 1);
            fx(c, 'fx.chromatic', weak(0.6 * c.strength));
            atTime(c, 'fx.glitchHit', c.layer.outPoint - dout - hit - c.fd, { dur: hit });
            outAt(c, 'out.glitch', 0.8);
        }
    });

    UK.add({
        id: 'combo.lowerThird', cat: 'combo', name: 'Lower Third · Титр-плашка',
        desc: 'Короткий Fade + Slide по направлению → Drop Shadow → Fade + Slide Out в ту же сторону.',
        tags: 'lower third title плашка титр slide shadow',
        apply: function (c) {
            inAt(c, 'in.fadeSlide', 1, { ease: 'expoOut' });
            fx(c, 'fx.dropShadow', weak(0.7 * c.strength));
            outAt(c, 'out.fadeSlide', 0.7, { ease: 'expoIn' });
        }
    });

    UK.add({
        id: 'combo.socialPop', cat: 'combo', name: 'Social Pop · Стикер для соцсетей',
        desc: 'Elastic Pop → Shadow Pop → Pulse (лёгкий бит) → Pop Out. Для стикеров, эмодзи, плашек.',
        tags: 'social pop sticker elastic bounce стикер соцсети',
        apply: function (c) {
            inAt(c, 'in.elasticPop', 1);
            inAt(c, 'in.shadowPop', 1, weak(0.6));
            fx(c, 'fx.pulse', weak(0.35 * c.strength));
            outAt(c, 'out.pop', 0.7, { ease: 'back' });
        }
    });

    UK.add({
        id: 'combo.slideshow', cat: 'combo', name: 'Photo Slideshow · Слайдшоу',
        desc: 'Ken Burns (чередует наезд/отъезд по слоям) + Vignette + Fade In/Out. Выделите все фото и примените разом.',
        tags: 'slideshow photo ken burns слайдшоу фото',
        apply: function (c) {
            fx(c, (c.i % 2 === 0) ? 'cam.kenBurnsIn' : 'cam.kenBurnsOut');
            fx(c, 'fx.vignette', weak(0.6 * c.strength));
            inAt(c, 'in.fade', 1, { ease: 'smooth', stagger: 0 });
            outAt(c, 'out.fade', 1, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.retroVHS', cat: 'combo', name: 'Retro VHS · Ретро-кассета',
        desc: 'VHS look + Old Film (зерно, мерцание) + Scanlines + Glitch In/Out.',
        tags: 'vhs retro 90s tape ретро кассета',
        apply: function (c) {
            fx(c, 'fx.vhs', weak(0.9 * c.strength));
            fx(c, 'fx.oldFilm', weak(0.4 * c.strength));
            fx(c, 'fx.scanlines', weak(0.5 * c.strength));
            inAt(c, 'in.glitch', 0.8);
            outAt(c, 'out.glitch', 0.7);
        }
    });

    UK.add({
        id: 'combo.dreamy', cat: 'combo', name: 'Dreamy · Сон / воспоминание',
        desc: 'Blur In → Dreamy soft focus → Warm фильтр → Blur Out.',
        tags: 'dreamy soft focus warm сон воспоминание flashback',
        apply: function (c) {
            inAt(c, 'in.blur', 1.2, { ease: 'smooth' });
            fx(c, 'fx.dreamy', weak(0.7 * c.strength));
            fx(c, 'fx.warm', weak(0.6 * c.strength));
            outAt(c, 'out.blur', 1, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.neonSign', cat: 'combo', name: 'Neon Sign · Неоновая вывеска',
        desc: 'Flash In → Neon Glow → Neon Flicker → Fade Out.',
        tags: 'neon sign glow flicker неон вывеска',
        apply: function (c) {
            inAt(c, 'in.flash', 0.6);
            fx(c, 'fx.neon', weak(0.9 * c.strength));
            fx(c, 'light.neonFlicker', weak(0.7 * c.strength));
            outAt(c, 'out.fade', 0.6, { ease: 'expoIn' });
        }
    });

    UK.add({
        id: 'combo.corporate', cat: 'combo', name: 'Clean Corporate · Чистый корпоратив',
        desc: 'Fade + Slide In → мягкая тень → лёгкий Cinematic → Fade + Slide Out. Сдержанно и аккуратно.',
        tags: 'corporate clean business чистый корпоративный',
        apply: function (c) {
            inAt(c, 'in.fadeSlide', 1, { ease: 'soft', strength: 60 * c.strength });
            fx(c, 'fx.dropShadow', weak(0.4 * c.strength));
            fx(c, 'fx.cinematic', weak(0.35 * c.strength));
            outAt(c, 'out.fadeSlide', 0.8, { ease: 'soft', strength: 60 * c.strength });
        }
    });

    UK.add({
        id: 'combo.horror', cat: 'combo', name: 'Horror / Dark · Хоррор',
        desc: 'Flicker In → сильная Vignette → Film Grain → обесцвечивание (B&W слабо) → Flicker Out.',
        tags: 'horror dark scary flicker хоррор тёмный',
        apply: function (c) {
            inAt(c, 'in.flicker', 1);
            fx(c, 'fx.vignette', weak(1.6 * c.strength));
            fx(c, 'fx.filmGrain', weak(1.1 * c.strength));
            fx(c, 'fx.bwContrast', weak(0.5 * c.strength));
            fx(c, 'fx.flicker', weak(0.5 * c.strength));
            outAt(c, 'out.flicker', 0.8);
        }
    });

    UK.add({
        id: 'combo.promo', cat: 'combo', name: 'Energetic Promo · Энергичное промо',
        desc: 'Squash & Stretch In → Pulse в бит → лёгкий Shake → Spin Out.',
        tags: 'promo energetic beat pulse промо энергичный',
        apply: function (c) {
            inAt(c, 'in.squashStretch', 1, { ease: 'back' });
            fx(c, 'fx.pulse', weak(0.6 * c.strength));
            fx(c, 'fx.shake', weak(0.3 * c.strength));
            outAt(c, 'out.spin', 0.7, { ease: 'expoIn' });
        }
    });

    UK.add({
        id: 'combo.product', cat: 'combo', name: 'Product Showcase · Витрина продукта',
        desc: 'Scale Soft In → 3D Tilt → Rim Light → Light Sweep → Scale Out.',
        tags: 'product showcase 3d tilt rim light продукт витрина',
        apply: function (c) {
            var din = part(c, 1);
            inAt(c, 'in.scaleSoft', 1, { ease: 'soft' });
            fx(c, 'cam.tilt3D', weak(0.6 * c.strength));
            fx(c, 'light.rimLight', weak(0.8 * c.strength));
            atTime(c, 'light.sweepSoft', startT(c) + din * 0.9, { dur: din });
            outAt(c, 'out.scaleSoft', 0.8, { ease: 'soft' });
        }
    });

    UK.add({
        id: 'combo.cyberpunk', cat: 'combo', name: 'Cyberpunk · Киберпанк',
        desc: 'Glitch In → Cyberpunk look → Scanlines → Chromatic → Glitch Out.',
        tags: 'cyberpunk neon glitch scanlines киберпанк',
        apply: function (c) {
            inAt(c, 'in.glitch', 1);
            fx(c, 'fx.cyberpunk', weak(0.9 * c.strength));
            fx(c, 'fx.scanlines', weak(0.4 * c.strength));
            fx(c, 'fx.chromatic', weak(0.5 * c.strength));
            outAt(c, 'out.glitch', 0.7);
        }
    });

    UK.add({
        id: 'combo.flipCard', cat: 'combo', name: '3D Flip Card · Карточка',
        desc: 'Flip Y In → Drop Shadow → Flip Y Out. Для карточек, цитат, фото.',
        tags: 'flip card 3d карточка переворот',
        apply: function (c) {
            inAt(c, 'in.flipY', 1, { ease: 'expoOut' });
            fx(c, 'fx.dropShadow', weak(0.6 * c.strength));
            outAt(c, 'out.flipY', 0.8, { ease: 'expoIn' });
        }
    });

    UK.add({
        id: 'combo.lightReveal', cat: 'combo', name: 'Light Reveal · Световое появление',
        desc: 'Flash In → God Rays → Glow Pulse → Fade Out.',
        tags: 'light reveal rays glow свет появление лучи',
        apply: function (c) {
            inAt(c, 'in.flash', 0.8);
            fx(c, 'light.godRays', weak(0.8 * c.strength));
            fx(c, 'light.glowPulse', weak(0.6 * c.strength));
            outAt(c, 'out.fade', 0.8, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.documentary', cat: 'combo', name: 'Handheld Documentary · Документалка',
        desc: 'Handheld shake → Vintage look → Fade In/Out на границах слоя.',
        tags: 'handheld documentary vintage документальный ручная камера',
        apply: function (c) {
            fx(c, 'cam.handheld', weak(0.6 * c.strength));
            fx(c, 'fx.vintage', weak(0.7 * c.strength));
            inAt(c, 'in.fade', 0.8, { ease: 'smooth' });
            outAt(c, 'out.fade', 0.8, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.stopMotion', cat: 'combo', name: 'Stop-Motion · Покадровая',
        desc: 'Stop Motion (12 fps) → Film Grain → Scale Pop In / Pop Out.',
        tags: 'stop motion frame rate grain покадровая',
        apply: function (c) {
            fx(c, 'fx.stopMotion');
            fx(c, 'fx.filmGrain', weak(0.8 * c.strength));
            inAt(c, 'in.scalePop', 0.8, { ease: 'back' });
            outAt(c, 'out.pop', 0.7, { ease: 'back' });
        }
    });

    UK.add({
        id: 'combo.liquidMorph', cat: 'combo', name: 'Liquid Morph · Жидкий',
        desc: 'Liquid displacement → Rise Blur In → Blur Out. Текучая органика.',
        tags: 'liquid morph wave organic жидкий органика',
        apply: function (c) {
            fx(c, 'distort.liquid', weak(0.8 * c.strength));
            inAt(c, 'in.riseBlur', 1.1, { ease: 'soft' });
            outAt(c, 'out.riseBlur', 0.9, { ease: 'soft' });
        }
    });

    UK.add({
        id: 'combo.cleanPhoto', cat: 'combo', name: 'Clean Photo · Фото с рамкой света',
        desc: 'Zoom Far In → Teal & Orange → Light Sweep → Soft Wipe Out.',
        tags: 'photo teal orange sweep фото',
        apply: function (c) {
            var din = part(c, 1);
            inAt(c, 'in.zoomFar', 1, { ease: 'expoOut' });
            fx(c, 'fx.tealOrange', weak(0.7 * c.strength));
            atTime(c, 'light.sweepSharp', startT(c) + din, { dur: din * 0.8 });
            outAt(c, 'out.softWipe', 0.8);
        }
    });

    UK.add({
        id: 'combo.hudTech', cat: 'combo', name: 'HUD / Tech · Техно-интерфейс',
        desc: 'Blinds In → Cool фильтр → Scanlines → Flicker → Blinds Out.',
        tags: 'hud tech interface sci-fi техно интерфейс',
        apply: function (c) {
            inAt(c, 'in.blinds', 0.8);
            fx(c, 'fx.cool', weak(0.6 * c.strength));
            fx(c, 'fx.scanlines', weak(0.5 * c.strength));
            fx(c, 'fx.flicker', weak(0.3 * c.strength));
            outAt(c, 'out.blinds', 0.7);
        }
    });

    UK.add({
        id: 'combo.comic', cat: 'combo', name: 'Comic Pop · Комикс',
        desc: 'Drop Bounce In → Cartoon → Long Shadow → Squash & Stretch Out.',
        tags: 'comic cartoon pop art комикс мультфильм',
        apply: function (c) {
            inAt(c, 'in.dropBounce', 1);
            fx(c, 'fx.cartoon', weak(0.8 * c.strength));
            fx(c, 'fx.longShadow', weak(0.7 * c.strength));
            outAt(c, 'out.squashStretch', 0.7);
        }
    });

    UK.add({
        id: 'combo.oldFilmReel', cat: 'combo', name: 'Old Film Reel · Старая плёнка',
        desc: 'Flash In → Old Film (сепия, зерно, мерцание) → Letterbox → Film Burn-подобный Flash Out.',
        tags: 'old film sepia reel letterbox старая плёнка',
        apply: function (c) {
            inAt(c, 'in.flash', 0.5);
            fx(c, 'fx.oldFilm', weak(0.9 * c.strength));
            fx(c, 'fx.letterbox', weak(0.8));
            outAt(c, 'out.flash', 0.5);
        }
    });

    UK.add({
        id: 'combo.gamer', cat: 'combo', name: 'Gamer Stream · Стрим-оверлей',
        desc: 'Skew Slide In → Neon Glow → Pulse → Chromatic → Skew Slide Out.',
        tags: 'gamer stream overlay twitch оверлей стрим',
        apply: function (c) {
            inAt(c, 'in.skewSlide', 0.9, { ease: 'expoOut' });
            fx(c, 'fx.neon', weak(0.6 * c.strength));
            fx(c, 'fx.pulse', weak(0.4 * c.strength));
            fx(c, 'fx.chromatic', weak(0.4 * c.strength));
            outAt(c, 'out.skewSlide', 0.7, { ease: 'expoIn' });
        }
    });

    // =========================================================== текст
    UK.add({
        id: 'combo.textHeadline', cat: 'combo', name: 'Text Headline · Заголовок',
        desc: 'Буквы выезжают снизу + Tracking In → Shine (блик) → Fade Out по буквам.',
        tags: 'text headline title заголовок буквы блик', needs: 'text',
        apply: function (c) {
            var din = part(c, 1);
            inAt(c, 'text.charsSlideUp', 1);
            inAt(c, 'text.trackingIn', 1.2, weak(0.6 * c.strength));
            atTime(c, 'light.shine', startT(c) + din, { dur: din });
            outAt(c, 'text.fadeOutChars', 0.7);
        }
    });

    UK.add({
        id: 'combo.textTypewriter', cat: 'combo', name: 'Text Typewriter · Печатная машинка',
        desc: 'Печать текста с мигающим курсором → Fade Out по словам.',
        tags: 'text typewriter cursor печать машинка', needs: 'text',
        apply: function (c) {
            inAt(c, 'text.typingCursor', 1.5);
            outAt(c, 'text.fadeOutWords', 0.6);
        }
    });

    UK.add({
        id: 'combo.textKinetic', cat: 'combo', name: 'Kinetic Text · Кинетический текст',
        desc: 'Zoom Words (слова влетают из глубины) → Chromatic → Scale Out.',
        tags: 'kinetic text zoom words кинетический', needs: 'text',
        apply: function (c) {
            inAt(c, 'text.zoomWords', 1, { ease: 'expoOut' });
            fx(c, 'fx.chromatic', weak(0.5 * c.strength));
            outAt(c, 'text.scaleOut', 0.7, { ease: 'expoIn' });
        }
    });

    UK.add({
        id: 'combo.textGlitch', cat: 'combo', name: 'Glitch Text · Глитч-текст',
        desc: 'Scramble (декодирование) → Chromatic → Jitter → Glitch Out слоя.',
        tags: 'glitch text scramble decode глитч текст', needs: 'text',
        apply: function (c) {
            inAt(c, 'text.scramble', 1.2);
            fx(c, 'fx.chromatic', weak(0.6 * c.strength));
            fx(c, 'text.jitter', weak(0.4 * c.strength));
            outAt(c, 'out.glitch', 0.7);
        }
    });

    UK.add({
        id: 'combo.textElegant', cat: 'combo', name: 'Elegant Title · Элегантный титр',
        desc: 'Blur In по буквам + Tracking In → мягкая тень → Blur Out по буквам.',
        tags: 'elegant title wedding blur titles элегантный титр', needs: 'text',
        apply: function (c) {
            inAt(c, 'text.charsBlur', 1.3, { ease: 'soft' });
            inAt(c, 'text.trackingIn', 1.5, weak(0.5 * c.strength));
            fx(c, 'fx.dropShadow', weak(0.4 * c.strength));
            outAt(c, 'text.blurOut', 1, { ease: 'soft' });
        }
    });

    UK.add({
        id: 'combo.textBouncy', cat: 'combo', name: 'Bouncy Text · Прыгучий текст',
        desc: 'Bounce Letters → Long Shadow → Drop Out по буквам.',
        tags: 'bouncy text bounce letters прыгучий', needs: 'text',
        apply: function (c) {
            inAt(c, 'text.bounceLetters', 1);
            fx(c, 'fx.longShadow', weak(0.6 * c.strength));
            outAt(c, 'text.dropOut', 0.7);
        }
    });

    UK.add({
        id: 'combo.textCounter', cat: 'combo', name: 'Number Counter · Счётчик',
        desc: 'Fade + Slide In → Counter (число растёт) → Fade Out.',
        tags: 'counter number statistics счётчик число', needs: 'text',
        apply: function (c) {
            inAt(c, 'in.fadeSlide', 0.6, { ease: 'expoOut' });
            inAt(c, 'text.counter', 2);
            outAt(c, 'out.fade', 0.6);
        }
    });

    // =========================================================== переходы
    UK.add({
        id: 'combo.vlogCut', cat: 'combo', name: 'Vlog Cut · Влог-склейка',
        desc: 'Whip Pan по направлению + Flash на склейке + Handheld на входящем слое.',
        tags: 'vlog cut whip pan flash handheld влог склейка', needs: 'trans',
        apply: function (c) {
            tr(c, 'trans.whipPan');
            tr(c, 'trans.flash', { strength: 60 * c.strength, dur: c.dur * 0.5 });
            onB(c, 'cam.handheld', weak(0.5 * c.strength));
        }
    });

    UK.add({
        id: 'combo.impactHit', cat: 'combo', name: 'Impact Hit · Удар',
        desc: 'Zoom Punch + Shake + Flash + Chromatic Zoom — мощный акцент на склейке.',
        tags: 'impact hit punch shake flash удар акцент', needs: 'trans',
        apply: function (c) {
            tr(c, 'trans.zoomPunch');
            tr(c, 'trans.shake', weak(0.8 * c.strength));
            tr(c, 'trans.chromaZoom', weak(0.6 * c.strength));
            tr(c, 'trans.flash', { strength: 70 * c.strength, dur: c.dur * 0.4 });
        }
    });

    UK.add({
        id: 'combo.smoothZoom', cat: 'combo', name: 'Smooth Zoom · Плавный зум',
        desc: 'Zoom In + Directional Blur + тёплый Light Leak. Мягкий «блогерский» переход.',
        tags: 'smooth zoom blur light leak плавный зум', needs: 'trans',
        apply: function (c) {
            tr(c, 'trans.zoomIn');
            tr(c, 'trans.dirBlur', weak(0.6 * c.strength));
            tr(c, 'trans.lightLeak', weak(0.8 * c.strength));
        }
    });

    UK.add({
        id: 'combo.filmBurnCut', cat: 'combo', name: 'Film Burn Cut · Прожиг плёнки',
        desc: 'Film Burn + Light Leak + Warm на входящем слое.',
        tags: 'film burn leak warm прожиг плёнка', needs: 'trans',
        apply: function (c) {
            tr(c, 'trans.filmBurn');
            tr(c, 'trans.lightLeak', weak(0.7 * c.strength));
            onB(c, 'fx.warm', weak(0.5 * c.strength));
        }
    });

    UK.add({
        id: 'combo.spinCut', cat: 'combo', name: 'Spin Cut · Вращение',
        desc: 'Spin + Zoom Spin blur + Flash на склейке.',
        tags: 'spin rotate transition вращение склейка', needs: 'trans',
        apply: function (c) {
            tr(c, 'trans.spin');
            tr(c, 'trans.zoomSpin', weak(0.5 * c.strength));
            tr(c, 'trans.flash', { strength: 50 * c.strength, dur: c.dur * 0.4 });
        }
    });

    UK.add({
        id: 'combo.whipStack', cat: 'combo', name: 'Speed Whip Stack · Быстрый пролёт',
        desc: 'Whip Pan + RGB Split + Shake. Агрессивный быстрый переход.',
        tags: 'whip rgb shake speed пролёт быстрый', needs: 'trans',
        apply: function (c) {
            tr(c, 'trans.whipPan', { strength: 120 * c.strength });
            tr(c, 'trans.rgbSplit', weak(0.8 * c.strength));
            tr(c, 'trans.shake', weak(0.5 * c.strength));
        }
    });

    UK.add({
        id: 'combo.glitchCut', cat: 'combo', name: 'Glitch Cut · Глитч-склейка',
        desc: 'Glitch + Pixelate + RGB Split + Glitch Hit на входящем слое.',
        tags: 'glitch cut pixel rgb глитч склейка', needs: 'trans',
        apply: function (c) {
            tr(c, 'trans.glitch');
            tr(c, 'trans.pixelate', weak(0.6 * c.strength));
            tr(c, 'trans.rgbSplit', weak(0.6 * c.strength));
            if (c.B) atTime(c, 'fx.glitchHit', c.cut, { dur: Math.min(0.3, c.dur * 0.4), strength: 60 * c.strength }, c.B);
        }
    });

    UK.add({
        id: 'combo.dreamCut', cat: 'combo', name: 'Dream Cut · Мягкая склейка',
        desc: 'Gaussian Blur dissolve + Light Leak + Dip to Color (белый) — мечтательный переход.',
        tags: 'dream soft blur leak мягкий переход', needs: 'trans',
        apply: function (c) {
            tr(c, 'trans.gaussBlur', weak(0.8 * c.strength));
            tr(c, 'trans.lightLeak', weak(0.7 * c.strength));
            tr(c, 'trans.flash', { strength: 35 * c.strength, dur: c.dur * 0.6 });
        }
    });

    UK.add({
        id: 'combo.pushStack', cat: 'combo', name: 'Push + Blur · Сдвиг с размытием',
        desc: 'Push (слои выталкивают друг друга) + Directional Blur + Shake лёгкий.',
        tags: 'push slide blur сдвиг переход', needs: 'trans',
        apply: function (c) {
            tr(c, 'trans.push');
            tr(c, 'trans.dirBlur', weak(0.7 * c.strength));
            tr(c, 'trans.shake', weak(0.25 * c.strength));
        }
    });

    UK.add({
        id: 'combo.lensCut', cat: 'combo', name: 'Lens Cut · Оптика',
        desc: 'Lens Distortion + Zoom Blur + Chroma Zoom — «линзовый» переход.',
        tags: 'lens distortion zoom chroma оптика линза', needs: 'trans',
        apply: function (c) {
            tr(c, 'trans.lensDistort');
            tr(c, 'trans.zoomBlur', weak(0.6 * c.strength));
            tr(c, 'trans.chromaZoom', weak(0.5 * c.strength));
        }
    });

})();
