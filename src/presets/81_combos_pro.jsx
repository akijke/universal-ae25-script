// =============================================================================
//  Готовые решения PRO (combo.pro*) — премиальные связки под конкретные жанры:
//  YouTube-интро, сторис, кино-титры, продуктовое видео, спорт, HUD, подкаст…
//  Опциональные части (design.*, trans.pro*) подключаются, если пресет зарегистрирован.
// =============================================================================
(function () {

    // ---------------------------------------------------------------- хелперы
    function span(L) { return Math.max(0, L.outPoint - L.inPoint); }
    function part(c, k, L) {
        L = L || c.layer;
        var lim = span(L) / 2.5;
        return Math.max(c.fd * 2, Math.min(c.dur * (k || 1), lim > 0 ? lim : c.dur * (k || 1)));
    }
    /** Первый существующий id из списка (или null). */
    function pick() {
        for (var i = 0; i < arguments.length; i++) if (arguments[i] && UK.byId[arguments[i]]) return arguments[i];
        return null;
    }
    function at(c, id, over, L) {
        id = pick.apply(null, UK.isArr(id) ? id : [id]);
        if (!id) return null;
        return UK.applyTo(id, L || c.layer, c.opts, over || {}, c.i);
    }
    function inAt(c, id, k, over, L) { return at(c, id, UK.mergeOpts({ dur: part(c, k, L) }, over), L); }
    function outAt(c, id, k, over, L) { return at(c, id, UK.mergeOpts({ dur: part(c, k, L), startMode: 'in', stagger: 0 }, over), L); }
    function fx(c, id, over, L) { return at(c, id, UK.mergeOpts({ startMode: 'in', stagger: 0 }, over), L); }
    function atTime(c, id, t, over, L) {
        var comp = c.comp, old = comp.time;
        t = UK.clamp(t, 0, comp.duration);
        comp.time = t;
        try { at(c, id, UK.mergeOpts({ startMode: 'playhead', stagger: 0 }, over), L); }
        finally { comp.time = old; }
    }
    function startT(c, L) { L = L || c.layer; return (c.opts.startMode === 'playhead' ? c.comp.time : L.inPoint) + (Number(c.opts.stagger) || 0) * c.i; }
    function tr(c, id, over) {
        id = pick.apply(null, UK.isArr(id) ? id : [id]);
        if (!id) return null;
        return UK.applyTrans(id, c.comp, c.layers, c.opts, over || {});
    }
    function onB(c, id, over) { if (c.B) at(c, id, UK.mergeOpts({ startMode: 'in', stagger: 0 }, over), c.B); }
    function onA(c, id, over) { if (c.A) at(c, id, UK.mergeOpts({ startMode: 'in', stagger: 0 }, over), c.A); }
    /** Дизайн-элемент (design.*) рядом со слоем — только если есть такой пресет. Применяется к тому же слою с курсором на его старте. */
    function design(c, ids, over) {
        var id = pick.apply(null, ids);
        if (!id) return;
        var p = UK.byId[id];
        if (p.needs === 'text' && !UK.isText(c.layer)) return;
        atTime(c, id, startT(c), over || {});
    }
    var weak = function (k) { return { strength: Math.round(k * 100) }; };
    var D = 'design.';

    // =========================================================== МЕДИА / БРЕНД
    UK.add({
        id: 'combo.proYouTubeIntro', cat: 'combo', name: 'YouTube Intro · Интро канала', preview: 'combo',
        desc: 'Light Reveal (или Scale Pop) → God Rays + Light Sweep → Glow → Chromatic Pop Out. Логотип канала за 3 секунды.',
        tags: 'youtube intro channel logo rays sweep интро канал готовое pro',
        apply: function (c) {
            var din = part(c, 1), t0 = startT(c);
            inAt(c, ['in.proLight', 'in.proIrisGlow', 'in.scalePop'], 1, { ease: 'back' });
            fx(c, 'light.godRays', weak(0.6 * c.strength));
            atTime(c, 'light.sweepSharp', t0 + din * 0.8, { dur: din * 0.7 });
            fx(c, 'fx.glow', weak(0.5 * c.strength));
            outAt(c, ['out.proChromaPop', 'out.zoomBlur'], 0.7, { ease: 'expoIn' });
        }
    });

    UK.add({
        id: 'combo.proInstaStory', cat: 'combo', name: 'Instagram Story · Сторис', preview: 'popIn',
        desc: 'Elastic Drop → пилюля-тег (если есть дизайн-пресет) → Pulse → Bounce Out. Вертикальный контент, стикеры.',
        tags: 'instagram story reels vertical sticker pop сторис pro',
        apply: function (c) {
            inAt(c, ['in.proElasticDrop', 'in.elasticPop'], 1, { ease: 'elastic' });
            design(c, [D + 'pillTag', D + 'stickerCard']);
            fx(c, 'fx.dropShadow', weak(0.6));
            fx(c, 'fx.pulse', weak(0.3 * c.strength));
            outAt(c, ['out.proElasticDrop', 'out.pop'], 0.7, { ease: 'bounce' });
        }
    });

    UK.add({
        id: 'combo.proTitleCard', cat: 'combo', name: 'Title Card Cinematic · Кино-титр', preview: 'textScale',
        desc: 'Текст: Blur In по буквам + Tracking In → Letterbox + Film Grain на тексте → Fade Out по буквам. Элегантный заголовок фильма.',
        tags: 'title card cinematic film text letterbox titles титр кино pro', needs: 'text',
        apply: function (c) {
            inAt(c, 'text.charsBlur', 1.2, { ease: 'smooth' });
            inAt(c, 'text.trackingIn', 1.6, { ease: 'expoOut' });
            fx(c, 'fx.letterbox', weak(1));
            fx(c, 'fx.filmGrain', weak(0.4 * c.strength));
            fx(c, 'fx.proMist', weak(0.5 * c.strength));
            outAt(c, 'text.fadeOutChars', 0.9, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.proQuoteCard', cat: 'combo', name: 'Quote Card · Цитата', preview: 'textUp',
        desc: 'Текст: Fade по словам → кавычки и подчёркивание (дизайн, если доступно) → Soft Shadow → Fade Out по словам.',
        tags: 'quote card text words underline цитата pro', needs: 'text',
        apply: function (c) {
            inAt(c, 'text.fadeWords', 1.4, { ease: 'smooth' });
            design(c, [D + 'quoteMarks']);
            design(c, [D + 'titleUnderline', D + 'underline']);
            fx(c, 'fx.dropShadow', weak(0.4));
            outAt(c, 'text.fadeOutWords', 0.8, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.proEndScreen', cat: 'combo', name: 'End Screen · Конечная заставка', preview: 'camera',
        desc: 'Медленный отъезд + Moody Dark + Vignette + затемнение для карточек/кнопок; Fade In/Out. Фон конечной заставки YouTube.',
        tags: 'end screen outro subscribe dark vignette конечная заставка pro',
        apply: function (c) {
            fx(c, 'cam.kenBurnsOut', weak(0.6));
            fx(c, 'fx.proMoody', weak(0.8 * c.strength));
            fx(c, 'fx.proColorVignette', weak(0.7));
            design(c, [D + 'subscribeButton', D + 'playButton']);
            inAt(c, 'in.fade', 1, { ease: 'smooth' });
            outAt(c, 'out.fade', 1, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.proKineticBurst', cat: 'combo', name: 'Kinetic Typography Burst · Кинетика', preview: 'textScale',
        desc: 'Текст: Zoom Words + Jitter + Chromatic → Scale Out. Агрессивная кинетическая типографика под бит.',
        tags: 'kinetic typography burst zoom words rgb jitter кинетика pro', needs: 'text',
        apply: function (c) {
            inAt(c, 'text.zoomWords', 1, { ease: 'expoOut' });
            fx(c, 'text.jitter', weak(0.6 * c.strength));
            fx(c, 'fx.chromatic', weak(0.7 * c.strength));
            fx(c, 'fx.pulse', weak(0.4));
            outAt(c, 'text.scaleOut', 0.6, { ease: 'expoIn' });
        }
    });

    // =========================================================== ПРОДУКТ / КОММЕРЦИЯ
    UK.add({
        id: 'combo.proProductHero', cat: 'combo', name: 'Product Hero · Продукт крупным планом', preview: 'orbit',
        desc: 'Depth Push (или Scale Soft) → Orbit 3D + Rim Light → Anamorphic Streak → Light Sweep → Spin Pop Out.',
        tags: 'product hero showcase orbit rim light anamorphic продукт pro',
        apply: function (c) {
            var din = part(c, 1), t0 = startT(c);
            inAt(c, ['in.proDepth', 'in.scaleSoft'], 1, { ease: 'expoOut' });
            fx(c, 'cam.orbit3D', weak(0.5 * c.strength));
            fx(c, 'light.rimLight', weak(0.8));
            fx(c, 'light.proAnamorphic', weak(0.6 * c.strength));
            atTime(c, 'light.sweepSoft', t0 + din * 1.1, { dur: din });
            outAt(c, ['out.proSpinPop', 'out.spinZoom'], 0.7, { ease: 'expoIn' });
        }
    });

    UK.add({
        id: 'combo.proRealEstate', cat: 'combo', name: 'Real Estate · Недвижимость', preview: 'pan',
        desc: 'Медленная панорама + Clarity + Golden Hour + плашка-титр (дизайн, если доступно) + Fade In/Out. Чистый лук для обзоров интерьеров.',
        tags: 'real estate property interior pan clarity warm недвижимость pro',
        apply: function (c) {
            fx(c, 'cam.pan', weak(0.5 * c.strength));
            fx(c, 'fx.proClarity', weak(0.8));
            fx(c, 'fx.proGoldenHour', weak(0.5 * c.strength));
            design(c, [D + 'lowerThirdBar', D + 'lowerThirdLine']);
            inAt(c, 'in.fade', 1, { ease: 'smooth' });
            outAt(c, 'out.fade', 1, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.proFood', cat: 'combo', name: 'Food & Cooking · Еда', preview: 'popIn',
        desc: 'Scale Pop → Golden Hour + Clarity + Vibrance-подсветка → маркер-подчёркивание для текста (если доступно) → Soft Focus Out.',
        tags: 'food cooking recipe warm clarity pop еда рецепт pro',
        apply: function (c) {
            inAt(c, ['in.proSpinPop', 'in.scalePop'], 1, { ease: 'back' });
            fx(c, 'fx.proGoldenHour', weak(0.6 * c.strength));
            fx(c, 'fx.proClarity', weak(0.7));
            fx(c, 'fx.proKodak', weak(0.4));
            design(c, [D + 'highlightMarker', D + 'textBacking']);
            outAt(c, ['out.proSoftFocus', 'out.blur'], 0.8, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.proMinimalCorp', cat: 'combo', name: 'Minimal Corporate · Минимализм', preview: 'slideIn',
        desc: 'Soft Mask Wipe (или Fade+Slide) → линия-подчёркивание (дизайн) → Matte Fade + Sharpen → Fade+Slide Out. Строгий корпоративный стиль.',
        tags: 'minimal corporate clean business underline минимализм корпоративный pro',
        apply: function (c) {
            inAt(c, ['in.proStrokeWipe', 'in.fadeSlide'], 1, { ease: 'expoOut' });
            design(c, [D + 'titleUnderline', D + 'underline']);
            fx(c, 'fx.proMatte', weak(0.5 * c.strength));
            fx(c, 'fx.proSharpen', weak(0.5));
            outAt(c, ['out.proStrokeWipe', 'out.fadeSlide'], 0.7, { ease: 'expoIn' });
        }
    });

    UK.add({
        id: 'combo.proPodcast', cat: 'combo', name: 'Podcast / Interview · Интервью', preview: 'vignette',
        desc: 'Fade In → Soft Vignette + Kodak-лук + Clarity → плашка имени (дизайн, если доступно) → Fade Out. Говорящая голова.',
        tags: 'podcast interview talking head lower third vignette подкаст интервью pro',
        apply: function (c) {
            inAt(c, 'in.fade', 0.8, { ease: 'smooth' });
            fx(c, 'fx.vignette', weak(0.5 * c.strength));
            fx(c, 'fx.proKodak', weak(0.45));
            fx(c, 'fx.proClarity', weak(0.5));
            design(c, [D + 'lowerThirdLine', D + 'lowerThirdBar']);
            outAt(c, 'out.fade', 0.8, { ease: 'smooth' });
        }
    });

    // =========================================================== ТРЕВЕЛ / СВАДЬБА / ДОКУМЕНТАЛКА
    UK.add({
        id: 'combo.proTravelVlog', cat: 'combo', name: 'Travel Vlog · Тревел-влог', preview: 'leak',
        desc: 'Handheld + Golden Hour + Light Leak Pro + Lens Dirt + Fade In/Out. Солнечный влог «с рук».',
        tags: 'travel vlog handheld golden hour light leak тревел влог pro',
        apply: function (c) {
            fx(c, 'cam.handheld', weak(0.5 * c.strength));
            fx(c, 'fx.proGoldenHour', weak(0.7 * c.strength));
            fx(c, 'light.proLeakPro', weak(0.6));
            fx(c, 'fx.proLensDirt', weak(0.6));
            inAt(c, 'in.fade', 0.8, { ease: 'smooth' });
            outAt(c, 'out.fade', 0.8, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.proWedding', cat: 'combo', name: 'Wedding Film · Свадебное кино', preview: 'glow',
        desc: 'Soft Focus In → медленный Ken Burns + Pastel Dream + Pro-Mist + Bokeh → Soft Focus Out. Нежная воздушная картинка.',
        tags: 'wedding film romantic soft pastel mist bokeh свадьба pro',
        apply: function (c) {
            inAt(c, ['in.proSoftFocus', 'in.blur'], 1.2, { ease: 'smooth' });
            fx(c, 'cam.kenBurnsIn', weak(0.5));
            fx(c, 'fx.proPastelDream', weak(0.7 * c.strength));
            fx(c, 'fx.proMist', weak(0.6));
            fx(c, 'light.proBokeh', weak(0.4));
            outAt(c, ['out.proSoftFocus', 'out.blur'], 1, { ease: 'smooth' });
        }
    });

    UK.add({
        id: 'combo.proDocArchive', cat: 'combo', name: 'Documentary Archive · Архивная хроника', preview: 'grain',
        desc: 'Faded Film + рамка 8mm + Gate Weave + Dust & Scratches + Exposure Flicker + Fade In/Out. «Найденная плёнка».',
        tags: 'documentary archive found footage 8mm dust weave хроника архив pro',
        apply: function (c) {
            fx(c, 'fx.proFilmFade', weak(0.9 * c.strength));
            fx(c, 'fx.proFilmBorder', weak(0.8));
            fx(c, 'fx.proGateWeave', weak(0.7));
            fx(c, 'fx.proDust', weak(0.8));
            fx(c, 'fx.proFlickerExposure', weak(0.6));
            inAt(c, 'in.fade', 0.6, { ease: 'linear' });
            outAt(c, 'out.fade', 0.6, { ease: 'linear' });
        }
    });

    UK.add({
        id: 'combo.proMemorial', cat: 'combo', name: 'Soft Memorial · Светлая память', preview: 'fadeIn',
        desc: 'Долгий Fade In → Pro-Mist + лёгкая десатурация + медленный дрейф → долгий Fade Out. Спокойно и бережно.',
        tags: 'memorial soft slow drift desaturate tribute память pro',
        apply: function (c) {
            inAt(c, 'in.fade', 1.6, { ease: 'smooth' });
            fx(c, 'fx.proMist', weak(0.7 * c.strength));
            fx(c, 'fx.proMatte', weak(0.6));
            fx(c, 'fx.bwContrast', weak(0.3));
            fx(c, 'cam.drift', weak(0.4));
            outAt(c, 'out.fade', 1.6, { ease: 'smooth' });
        }
    });

    // =========================================================== ЭНЕРГИЯ / СПОРТ / ИГРЫ
    UK.add({
        id: 'combo.proSports', cat: 'combo', name: 'Sports Promo · Спорт', preview: 'zoom',
        desc: 'Zoom Through → Speed Lines + Chromatic + Teal&Orange Pro → Zoom Punch перед концом → Glitch Slices Out.',
        tags: 'sports promo action speed lines punch rgb спорт промо pro',
        apply: function (c) {
            var dout = part(c, 0.7), hit = Math.min(0.3, part(c, 0.35));
            inAt(c, ['in.proZoomThrough', 'in.zoomFar'], 0.9, { ease: 'expoOut' });
            fx(c, 'fx.proSpeedLines', weak(0.6 * c.strength));
            fx(c, 'fx.chromatic', weak(0.6));
            fx(c, 'fx.proTealOrange', weak(0.7));
            atTime(c, 'fx.zoomHit', c.layer.outPoint - dout - hit - c.fd, { dur: hit });
            outAt(c, ['out.proGlitchSlices', 'out.glitch'], 0.7);
        }
    });

    UK.add({
        id: 'combo.proAnimeImpact', cat: 'combo', name: 'Anime Impact · Аниме-удар', preview: 'flash',
        desc: 'Stretch Snap → Speed Lines + Flash Hit + Shake Hit в момент появления → Halation → Stretch Snap Out.',
        tags: 'anime impact manga speed lines flash shake аниме удар pro',
        apply: function (c) {
            var din = part(c, 1), t0 = startT(c);
            inAt(c, ['in.proStretchSnap', 'in.squashStretch'], 1, { ease: 'back' });
            fx(c, 'fx.proSpeedLines', weak(0.9 * c.strength));
            atTime(c, 'fx.flashHit', t0 + din * 0.9, { dur: Math.min(0.25, din * 0.4) });
            atTime(c, 'fx.shakeHit', t0 + din * 0.9, { dur: Math.min(0.4, din * 0.6), strength: 120 * c.strength });
            fx(c, 'fx.proHalation', weak(0.5));
            outAt(c, ['out.proStretchSnap', 'out.squashStretch'], 0.6, { ease: 'expoIn' });
        }
    });

    UK.add({
        id: 'combo.proMusicVisual', cat: 'combo', name: 'Music Visual · Музыкальный визуал', preview: 'kaleido',
        desc: 'Pulse to Beat + Kaleidoscope + Chromatic + Strobe (слабый) + Glitch Slices In/Out. Ритмичная абстракция.',
        tags: 'music visual beat kaleidoscope strobe rgb клип визуал pro',
        apply: function (c) {
            inAt(c, ['in.proGlitchSlices', 'in.glitch'], 0.7);
            fx(c, 'fx.pulse', weak(0.8 * c.strength));
            fx(c, 'fx.kaleidoscope', weak(0.6));
            fx(c, 'fx.chromatic', weak(0.5));
            fx(c, 'fx.strobe', weak(0.3 * c.strength));
            outAt(c, ['out.proGlitchSlices', 'out.glitch'], 0.7);
        }
    });

    UK.add({
        id: 'combo.proRetro80s', cat: 'combo', name: 'Retro 80s · Синтвейв', preview: 'rgb',
        desc: 'Cyberpunk Neon + VHS Pro + CRT + Glitch Slices In/Out. Неон, кассета и кинескоп в одном.',
        tags: 'retro 80s synthwave vhs crt neon синтвейв pro',
        apply: function (c) {
            inAt(c, ['in.proGlitchSlices', 'in.glitch'], 0.8);
            fx(c, 'fx.cyberpunk', weak(0.7 * c.strength));
            fx(c, 'fx.proVHS', weak(0.7));
            fx(c, 'fx.proCRT', weak(0.5));
            outAt(c, ['out.proGlitchSlices', 'out.glitch'], 0.7);
        }
    });

    UK.add({
        id: 'combo.proTechHUD', cat: 'combo', name: 'Tech / HUD · Интерфейс', preview: 'glitch',
        desc: 'Pixel Sort In → Glitch Texture + Scanlines + Cool-лук → углы рамки и сетка (дизайн, если доступно) → Blocks Out.',
        tags: 'tech hud ui sci-fi grid corners glitch scanlines интерфейс pro',
        apply: function (c) {
            inAt(c, ['in.proPixelSort', 'in.proBlocks', 'in.pixelate'], 0.9);
            fx(c, 'fx.proGlitchTexture', weak(0.5 * c.strength));
            fx(c, 'fx.scanlines', weak(0.4));
            fx(c, 'fx.cool', weak(0.6));
            design(c, [D + 'frameCorners', D + 'recFrame']);
            design(c, [D + 'dotsGrid', D + 'animatedGrid']);
            outAt(c, ['out.proBlocks', 'out.pixelate'], 0.7);
        }
    });

    UK.add({
        id: 'combo.proHorrorTrailer', cat: 'combo', name: 'Horror Trailer · Хоррор-трейлер', preview: 'strobe',
        desc: 'Flicker In → Noir + Exposure Flicker + Dust + Gate Weave → Strobe-удар перед концом → Ink Hide (или Flicker Out).',
        tags: 'horror trailer noir flicker strobe ink хоррор трейлер pro',
        apply: function (c) {
            var dout = part(c, 0.8), hit = Math.min(0.4, part(c, 0.4));
            inAt(c, 'in.flicker', 0.8);
            fx(c, 'fx.proNoir', weak(0.8 * c.strength));
            fx(c, 'fx.proFlickerExposure', weak(0.9));
            fx(c, 'fx.proDust', weak(0.6));
            fx(c, 'fx.proGateWeave', weak(0.5));
            atTime(c, 'light.flashHit', c.layer.outPoint - dout - hit - c.fd, { dur: hit, strength: 150 });
            outAt(c, ['out.proInk', 'out.flicker'], 0.8);
        }
    });

    UK.add({
        id: 'combo.proFashion', cat: 'combo', name: 'Fashion Editorial · Фэшн', preview: 'blinds',
        desc: 'Slice Reveal → B&W Contrast + Film Grain + Opacity Flicker (как вспышки фотокамеры) → Slice Hide. Глянцевая съёмка.',
        tags: 'fashion editorial bw contrast slices flash фэшн глянец pro',
        apply: function (c) {
            inAt(c, ['in.proSlice', 'in.blinds'], 0.9, { ease: 'expoOut' });
            fx(c, 'fx.bwContrast', weak(0.9 * c.strength));
            fx(c, 'fx.filmGrain', weak(0.5));
            fx(c, 'fx.flicker', weak(0.35));
            fx(c, 'fx.proSharpen', weak(0.6));
            outAt(c, ['out.proSlice', 'out.blinds'], 0.7, { ease: 'expoIn' });
        }
    });

    // =========================================================== ПЕРЕХОДЫ PRO
    UK.add({
        id: 'combo.proCinematicCut', cat: 'combo', name: 'Cinematic Cut · Кино-склейка', preview: 'dissolve',
        desc: 'Переход: Blur Fade + Light Leak на склейке, Kodak-лук и Vignette на входящем слое.',
        tags: 'cinematic cut transition blur fade light leak kodak склейка pro', needs: 'trans',
        apply: function (c) {
            tr(c, ['trans.proLuma', 'trans.blurFade']);
            tr(c, 'trans.lightLeak', weak(0.7 * c.strength));
            onB(c, 'fx.proKodak', weak(0.5));
            onB(c, 'fx.vignette', weak(0.4));
        }
    });

    UK.add({
        id: 'combo.proActionCut', cat: 'combo', name: 'Action Cut · Экшен-склейка', preview: 'whip',
        desc: 'Переход: Whip Pan + RGB Split + Speed Lines на входящем + Shake Hit после склейки.',
        tags: 'action cut whip pan rgb speed lines shake экшен склейка pro', needs: 'trans',
        apply: function (c) {
            tr(c, ['trans.proChromaWhip', 'trans.whipPan']);
            tr(c, 'trans.rgbSplit', weak(0.6 * c.strength));
            onB(c, 'fx.proSpeedLines', weak(0.5));
            if (c.B) atTime(c, 'fx.shakeHit', c.cut, { dur: Math.min(0.4, c.half) }, c.B);
        }
    });

    UK.add({
        id: 'combo.proDreamCut', cat: 'combo', name: 'Dream Cut · Сон-склейка', preview: 'blurIn',
        desc: 'Переход: Gaussian Blur Dissolve + Flash + Pro-Mist и Pastel на входящем.',
        tags: 'dream cut soft blur flash mist pastel склейка сон pro', needs: 'trans',
        apply: function (c) {
            tr(c, ['trans.proMorphBlur', 'trans.gaussBlur']);
            tr(c, 'trans.flash', weak(0.4 * c.strength));
            onB(c, 'fx.proMist', weak(0.6));
            onB(c, 'fx.proPastelDream', weak(0.4));
        }
    });

    UK.add({
        id: 'combo.proGlitchCutPro', cat: 'combo', name: 'Glitch Cut Pro · Цифровая склейка', preview: 'glitch',
        desc: 'Переход: Glitch + Pixelate + Chromatic Zoom; Glitch Texture на входящем слое первые секунды.',
        tags: 'glitch cut pro digital pixelate chroma склейка глитч pro', needs: 'trans',
        apply: function (c) {
            tr(c, ['trans.proPixelBlock', 'trans.glitch']);
            tr(c, 'trans.pixelate', weak(0.5 * c.strength));
            tr(c, 'trans.chromaZoom', weak(0.5));
            onB(c, 'fx.proGlitchTexture', weak(0.4));
        }
    });

})();
