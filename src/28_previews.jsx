// =============================================================================
//  Карта CSS-превью: id пресета -> ключ из docs/PREVIEW_KEYS.md
// =============================================================================
UK.PREVIEW = UK.PREVIEW || {};
(function () {
    var P = UK.PREVIEW;
    function set(key, ids) { for (var i = 0; i < ids.length; i++) P[ids[i]] = key; }

    // ---- In
    set('fadeIn',  ['in.fade', 'in.fadeSlide', 'in.flicker']);
    set('slideIn', ['in.slide', 'in.maskSlide', 'in.diagonal', 'in.dirBlurSlide', 'in.skewSlide', 'in.slideRotate']);
    set('scaleIn', ['in.scalePop', 'in.scaleSoft', 'in.zoomFar', 'in.zoomBlur']);
    set('popIn',   ['in.scaleOvershoot', 'in.shadowPop']);
    set('elastic', ['in.elasticPop']);
    set('spin',    ['in.spin', 'in.spinZoom']);
    set('flip',    ['in.flipX', 'in.flipY']);
    set('blurIn',  ['in.blur', 'in.riseBlur']);
    set('wipe',    ['in.linearWipe', 'in.softWipe', 'in.maskReveal', 'in.curtain']);
    set('blinds',  ['in.blinds']);
    set('iris',    ['in.radialWipe', 'in.iris']);
    set('pixel',   ['in.blockDissolve', 'in.pixelate']);
    set('bounce',  ['in.dropBounce']);
    set('squash',  ['in.squashStretch']);
    set('roll',    ['in.roll']);
    set('swing',   ['in.swing']);
    set('stretch', ['in.stretch', 'in.unfold']);
    set('glitch',  ['in.glitch']);
    set('flash',   ['in.flash']);

    // ---- Out
    set('fadeOut',  ['out.fade', 'out.fadeSlide', 'out.flicker']);
    set('slideOut', ['out.slide', 'out.maskSlide', 'out.diagonal', 'out.dirBlurSlide', 'out.skewSlide', 'out.slideRotate']);
    set('scaleOut', ['out.scale', 'out.scaleSoft', 'out.scaleUp', 'out.zoomFar', 'out.zoomBlur']);
    set('popOut',   ['out.pop', 'out.shadowPop']);
    set('spin',     ['out.spin', 'out.spinZoom']);
    set('flip',     ['out.flipX', 'out.flipY']);
    set('blurOut',  ['out.blur', 'out.riseBlur']);
    set('wipe',     ['out.linearWipe', 'out.softWipe', 'out.maskReveal', 'out.curtain']);
    set('blinds',   ['out.blinds']);
    set('iris',     ['out.radialWipe', 'out.iris']);
    set('pixel',    ['out.blockDissolve', 'out.pixelate']);
    set('bounce',   ['out.dropFall']);
    set('squash',   ['out.squashStretch']);
    set('roll',     ['out.roll']);
    set('swing',    ['out.swing']);
    set('stretch',  ['out.stretch', 'out.fold']);
    set('glitch',   ['out.glitch']);
    set('flash',    ['out.flash']);

    // ---- Transitions
    set('zoom',     ['trans.zoomBlur', 'trans.zoomIn', 'trans.zoomOut', 'trans.zoomPunch', 'trans.punch', 'trans.bounceZoom', 'trans.zoomThrough', 'trans.chromaZoom']);
    set('spin',     ['trans.spin', 'trans.zoomSpin', 'trans.rotateSwap', 'trans.twister']);
    set('whip',     ['trans.whipPan', 'trans.offsetPan', 'trans.dirBlur', 'trans.slideBlur']);
    set('roll',     ['trans.roll']);
    set('dissolve', ['trans.gaussBlur', 'trans.crossfade', 'trans.blurFade']);
    set('glitch',   ['trans.glitch']);
    set('rgb',      ['trans.rgbSplit']);
    set('pixel',    ['trans.pixelate', 'trans.blockDissolve', 'trans.gridWipe']);
    set('twist',    ['trans.twist']);
    set('ripple',   ['trans.ripple']);
    set('bulge',    ['trans.bulge', 'trans.lensDistort', 'trans.fisheye', 'trans.spherize']);
    set('mirror',   ['trans.mirrorSplit']);
    set('kaleido',  ['trans.kaleida']);
    set('stretch',  ['trans.warpStretch', 'trans.squeeze', 'trans.scaleWipe']);
    set('shake',    ['trans.shake']);
    set('flash',    ['trans.flash', 'trans.dipBlack', 'trans.dipColor', 'trans.negFlash', 'trans.lightWipe']);
    set('leak',     ['trans.lightLeak', 'trans.filmBurn']);
    set('wave',     ['trans.wave', 'trans.turbulent']);
    set('push',     ['trans.push', 'trans.slideCover', 'trans.slideReveal']);
    set('flip',     ['trans.flip3D']);
    set('scaleIn',  ['trans.scaleSwap']);
    set('wipe',     ['trans.linearWipe', 'trans.jaws', 'trans.lineSweep', 'trans.stripes']);
    set('iris',     ['trans.radialWipe', 'trans.irisWipe', 'trans.radialScaleWipe']);
    set('blinds',   ['trans.blinds']);

    // ---- FX
    set('grade',    ['fx.tealOrange', 'fx.cinematic', 'fx.vintage', 'fx.bwContrast', 'fx.sepia', 'fx.duotone', 'fx.crossProcess', 'fx.bleach', 'fx.warm', 'fx.cool', 'fx.cyberpunk', 'fx.pastel', 'fx.colorPop', 'fx.exposure', 'fx.posterize', 'fx.invert', 'fx.threshold', 'fx.cartoon', 'fx.sketch', 'fx.emboss']);
    set('rgb',      ['fx.vhs', 'fx.chromatic']);
    set('grain',    ['fx.filmGrain', 'fx.addGrain', 'fx.oldFilm', 'fx.dotMatrix']);
    set('vignette', ['fx.vignette', 'fx.softEdge']);
    set('letterbox',['fx.letterbox']);
    set('glow',     ['fx.glow', 'fx.bloom', 'fx.neon', 'fx.sharpen', 'fx.lensFlare']);
    set('shadow',   ['fx.longShadow', 'fx.dropShadow']);
    set('pixel',    ['fx.pixelate']);
    set('mirror',   ['fx.mirror']);
    set('kaleido',  ['fx.kaleidoscope']);
    set('echo',     ['fx.echo', 'fx.motionBlurBoost']);
    set('strobe',   ['fx.stopMotion', 'fx.strobe', 'fx.flicker', 'fx.tvOff']);
    set('shake',    ['fx.shake', 'fx.shakeHit']);
    set('elastic',  ['fx.pulse']);
    set('blinds',   ['fx.scanlines']);
    set('blurIn',   ['fx.dreamy', 'fx.tiltShift', 'fx.blur', 'fx.focusPull']);
    set('zoom',     ['fx.zoomBlur', 'fx.zoomHit']);
    set('whip',     ['fx.dirBlur']);
    set('glitch',   ['fx.glitchHit']);
    set('flash',    ['fx.flashHit']);

    // ---- Distort
    set('wave',    ['distort.turbSoft', 'distort.turbHard', 'distort.turbVertical', 'distort.heatHaze', 'distort.wave', 'distort.water', 'distort.smoke']);
    set('rgb',     ['distort.rgbWave']);
    set('ripple',  ['distort.ripple']);
    set('twist',   ['distort.twirl', 'distort.twirlSpin', 'distort.wobbleRot']);
    set('bulge',   ['distort.bulge', 'distort.pinch', 'distort.spherize', 'distort.fisheye', 'distort.lensCorrect', 'distort.ccLens', 'distort.magnify']);
    set('mirror',  ['distort.mirrorSplit', 'distort.quadMirror', 'distort.tiler']);
    set('kaleido', ['distort.kaleida', 'distort.polar', 'distort.tinyPlanet']);
    set('stretch', ['distort.slant', 'distort.skew', 'distort.perspective', 'distort.zoomStretch', 'distort.pixelStretch', 'distort.bendIt', 'distort.floMotion']);
    set('elastic', ['distort.jelly']);
    set('squash',  ['distort.squash']);
    set('liquid',  ['distort.liquid']);
    set('glitch',  ['distort.glitchDisp']);

    // ---- Light
    set('sweep',  ['light.sweepSoft', 'light.sweepSharp', 'light.sweepDiag', 'light.sweepDouble', 'light.sweepLoop', 'light.sweepColor', 'light.sweepEdge', 'light.shine', 'light.flarePass', 'light.flashlight']);
    set('rays',   ['light.godRays', 'light.rayBurst', 'light.spotlight']);
    set('leak',   ['light.leak']);
    set('glow',   ['light.glowPulse', 'light.bokehGlow', 'light.rimLight']);
    set('strobe', ['light.neonFlicker', 'light.strobe']);
    set('flash',  ['light.flashHit']);

    // ---- Text
    set('typewriter', ['text.typewriter', 'text.typingCursor', 'text.typewriterOut', 'text.scramble']);
    set('fadeIn',     ['text.fadeChars', 'text.fadeWords', 'text.fadeLines', 'text.randomFade', 'text.colorWipe']);
    set('textUp',     ['text.linesSlideUp', 'text.charsSlideUp', 'text.slideChars', 'text.charsDrop', 'text.bounceLetters', 'text.skewIn', 'text.trackingIn', 'text.wave', 'text.jitter']);
    set('textScale',  ['text.charsPop', 'text.charsBlur', 'text.charsRotate', 'text.zoomWords']);
    set('flip',       ['text.flip3D']);
    set('fadeOut',    ['text.fadeOutChars', 'text.fadeOutWords', 'text.trackingOut']);
    set('scaleOut',   ['text.scaleOut', 'text.rotateOut']);
    set('blurOut',    ['text.blurOut']);
    set('slideOut',   ['text.slideOut', 'text.dropOut']);
    set('counter',    ['text.counter']);

    // ---- Camera
    set('shake',  ['cam.handheld', 'cam.earthquake', 'cam.impact', 'cam.whipHit']);
    set('zoom',   ['cam.pushIn', 'cam.pushOut', 'cam.zoomBeat', 'cam.dollyZoom']);
    set('camera', ['cam.kenBurnsIn', 'cam.kenBurnsOut', 'cam.drift', 'cam.breathe', 'cam.follow']);
    set('blurIn', ['cam.rackFocus']);
    set('pan',    ['cam.pan']);
    set('orbit',  ['cam.orbit3D', 'cam.tilt3D']);
    set('spin',   ['cam.spinIn']);

    // ---- Utils
    set('tool', ['util.removeUK', 'util.stagger', 'util.sequence', 'util.trimToPlayhead', 'util.autoFade', 'util.freeze', 'util.reverse', 'util.loopCycle', 'util.loopPingPong', 'util.bakeExpr', 'util.centerAnchor', 'util.fitToComp', 'util.adjOver', 'util.parentNull', 'util.precomposeEach', 'util.motionBlur', 'util.toggle3D', 'util.solo', 'util.removeAllFx', 'util.marker']);

    // ---- Combo
    set('combo',  ['combo.logoReveal', 'combo.lowerThird', 'combo.socialPop', 'combo.corporate', 'combo.product', 'combo.flipCard', 'combo.lightReveal', 'combo.stopMotion', 'combo.cleanPhoto', 'combo.comic', 'combo.gamer', 'combo.textHeadline', 'combo.textElegant', 'combo.textBouncy']);
    set('camera', ['combo.cinematicClip', 'combo.slideshow', 'combo.documentary']);
    set('glitch', ['combo.glitchIntro', 'combo.cyberpunk', 'combo.textGlitch', 'combo.glitchCut']);
    set('rgb',    ['combo.retroVHS']);
    set('blurIn', ['combo.dreamy', 'combo.dreamCut']);
    set('glow',   ['combo.neonSign']);
    set('vignette', ['combo.horror']);
    set('elastic', ['combo.promo']);
    set('liquid', ['combo.liquidMorph']);
    set('blinds', ['combo.hudTech']);
    set('grain',  ['combo.oldFilmReel']);
    set('typewriter', ['combo.textTypewriter']);
    set('textScale',  ['combo.textKinetic']);
    set('counter',    ['combo.textCounter']);
    set('whip',   ['combo.vlogCut', 'combo.whipStack', 'combo.pushStack']);
    set('zoom',   ['combo.impactHit', 'combo.smoothZoom', 'combo.lensCut']);
    set('leak',   ['combo.filmBurnCut']);
    set('spin',   ['combo.spinCut']);
})();
