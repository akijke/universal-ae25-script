// =============================================================================
//  UK — ядро: реестр пресетов, хелперы для ключей, изинга, эффектов, контролов
// =============================================================================
var UK = {
    VERSION: '1.0.0',
    NAME: 'UniKit',
    PREFIX: 'UK · ',          // префикс имён эффектов, добавленных тулкитом
    CTRL_PREFIX: 'UK: ',      // префикс имён слайдеров-контролов
    presets: [],
    byId: {},
    CATS: [
        { id: 'in',      name: 'Появление (In)' },
        { id: 'out',     name: 'Исчезновение (Out)' },
        { id: 'trans',   name: 'Переходы' },
        { id: 'fx',      name: 'Эффекты и луки' },
        { id: 'distort', name: 'Искажения' },
        { id: 'light',   name: 'Свет и лайтсвипы' },
        { id: 'text',    name: 'Текст' },
        { id: 'cam',     name: 'Камера и движение' },
        { id: 'util',    name: 'Утилиты' },
        { id: 'fav',     name: '★ Избранное' }
    ],
    // Изинги. out1 — влияние исходящей ручки первого ключа, in2 — входящей последнего.
    // expr — пост-выражение (overshoot / bounce / elastic).
    EASES: [
        { id: 'smooth',   name: 'Smooth (плавный)',        out1: 33,  in2: 33 },
        { id: 'expoOut',  name: 'Expo Out (резкий старт)', out1: 1,   in2: 90 },
        { id: 'expoIn',   name: 'Expo In (резкий финиш)',  out1: 90,  in2: 1 },
        { id: 'expoInOut',name: 'Expo In-Out',             out1: 85,  in2: 85 },
        { id: 'soft',     name: 'Soft (мягкий)',           out1: 60,  in2: 75 },
        { id: 'back',     name: 'Back (с перелётом)',      out1: 1,   in2: 80, expr: 'overshoot' },
        { id: 'bounce',   name: 'Bounce (отскок)',         out1: 1,   in2: 60, expr: 'bounce' },
        { id: 'elastic',  name: 'Elastic (пружина)',       out1: 1,   in2: 70, expr: 'elastic' },
        { id: 'linear',   name: 'Linear',                  linear: true }
    ],
    DIRS: [
        { id: 'L', name: '← Слева',  v: [-1, 0] },
        { id: 'R', name: '→ Справа', v: [1, 0] },
        { id: 'U', name: '↑ Сверху', v: [0, -1] },
        { id: 'D', name: '↓ Снизу',  v: [0, 1] }
    ]
};

// ------------------------------------------------------------------ реестр
/**
 * Регистрация пресета.
 * p = {
 *   id:    'in.fade'                — уникальный id
 *   cat:   'in'|'out'|'trans'|'fx'|'distort'|'light'|'text'|'cam'|'util'
 *   name:  'Fade In · Появление'    — отображаемое имя
 *   desc:  'описание'               — подсказка
 *   tags:  'fade opacity'           — для поиска
 *   needs: 'layer' (по умолчанию) | 'text' | 'trans' | 'comp' | 'none'
 *   apply: function (ctx) { ... }
 * }
 */
UK.add = function (p) {
    if (!p || !p.id || !p.apply) throw new Error('UK.add: bad preset');
    if (UK.byId[p.id]) { // замена при повторной регистрации
        for (var i = 0; i < UK.presets.length; i++) if (UK.presets[i].id === p.id) { UK.presets.splice(i, 1); break; }
    }
    if (!p.needs) p.needs = 'layer';
    if (!p.tags) p.tags = '';
    if (!p.desc) p.desc = '';
    UK.presets.push(p);
    UK.byId[p.id] = p;
    return p;
};

UK.list = function (cat, query) {
    var r = [], q = (query || '').toLowerCase().trim();
    for (var i = 0; i < UK.presets.length; i++) {
        var p = UK.presets[i];
        if (cat === 'fav') { if (!UK.isFav(p.id)) continue; }
        else if (cat && p.cat !== cat) continue;
        if (q) {
            var hay = (p.name + ' ' + p.tags + ' ' + p.desc + ' ' + p.id).toLowerCase();
            if (hay.indexOf(q) < 0) continue;
        }
        r.push(p);
    }
    return r;
};

// ------------------------------------------------------------------ настройки
UK.settings = {
    get: function (key, def) {
        try {
            if (app.settings.haveSetting(UK.NAME, key)) return app.settings.getSetting(UK.NAME, key);
        } catch (e) {}
        return def;
    },
    set: function (key, val) {
        try { app.settings.saveSetting(UK.NAME, key, String(val)); } catch (e) {}
    }
};
UK.favs = function () {
    var s = UK.settings.get('favs', '');
    return s ? s.split('|') : [];
};
UK.isFav = function (id) { return UK.favs().indexOf(id) >= 0; };
UK.toggleFav = function (id) {
    var f = UK.favs(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    UK.settings.set('favs', f.join('|'));
    return i < 0;
};

// ------------------------------------------------------------------ утилиты
UK.isArr = function (x) { return Object.prototype.toString.call(x) === '[object Array]'; };
UK.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
UK.lerp = function (a, b, t) { return a + (b - a) * t; };
UK.rnd = function (a, b) { return a + Math.random() * (b - a); };
UK.fmt = function (n, d) { var m = Math.pow(10, d == null ? 3 : d); return Math.round(n * m) / m; };
UK.isText = function (layer) { return layer instanceof TextLayer; };
UK.isShape = function (layer) { return layer instanceof ShapeLayer; };
UK.isAV = function (layer) { return layer instanceof AVLayer || layer instanceof TextLayer || layer instanceof ShapeLayer; };
UK.frame = function (comp) { return comp.frameDuration; };
UK.frames = function (comp, n) { return comp.frameDuration * n; };
UK.easeById = function (id) {
    for (var i = 0; i < UK.EASES.length; i++) if (UK.EASES[i].id === id) return UK.EASES[i];
    return UK.EASES[0];
};
UK.dirById = function (id) {
    for (var i = 0; i < UK.DIRS.length; i++) if (UK.DIRS[i].id === id) return UK.DIRS[i];
    return UK.DIRS[0];
};
UK.toHex = function (c) { // [r,g,b] 0..1 -> 'RRGGBB'
    function h(x) { var s = Math.round(UK.clamp(x, 0, 1) * 255).toString(16); return s.length < 2 ? '0' + s : s; }
    return h(c[0]) + h(c[1]) + h(c[2]);
};
UK.hex = function (s) { // 'RRGGBB' -> [r,g,b]
    s = s.replace('#', '');
    return [parseInt(s.substr(0, 2), 16) / 255, parseInt(s.substr(2, 2), 16) / 255, parseInt(s.substr(4, 2), 16) / 255];
};
UK.vecAdd = function (a, b) { var r = []; for (var i = 0; i < a.length; i++) r.push(a[i] + (b[i] || 0)); return r; };
UK.vecMul = function (a, k) { var r = []; for (var i = 0; i < a.length; i++) r.push(a[i] * k); return r; };

// ------------------------------------------------------------------ геометрия слоя
/** Размер слоя в пикселях композиции с учётом scale (без поворота). */
UK.layerSize = function (layer, t) {
    var w = 100, h = 100;
    try {
        var r = layer.sourceRectAtTime(t == null ? layer.inPoint : t, false);
        w = r.width; h = r.height;
    } catch (e) {
        try { w = layer.width; h = layer.height; } catch (e2) {}
    }
    var s = [100, 100];
    try { s = layer.transform.scale.value; } catch (e3) {}
    return [Math.abs(w * s[0] / 100), Math.abs(h * s[1] / 100)];
};

/** Расстояние, на которое нужно сдвинуть слой, чтобы он полностью ушёл за край композиции. */
UK.exitDistance = function (layer, comp, dirV, t) {
    var sz = UK.layerSize(layer, t);
    var pos = layer.transform.position.value;
    var d;
    if (dirV[0] < 0) d = pos[0] + sz[0] / 2;
    else if (dirV[0] > 0) d = (comp.width - pos[0]) + sz[0] / 2;
    else if (dirV[1] < 0) d = pos[1] + sz[1] / 2;
    else d = (comp.height - pos[1]) + sz[1] / 2;
    return Math.max(d, 10) + 20;
};

// ------------------------------------------------------------------ ключи и изинг
UK.dimsOf = function (prop) {
    var t = prop.propertyValueType;
    if (t === PropertyValueType.TwoD_SPATIAL || t === PropertyValueType.ThreeD_SPATIAL) return 1; // spatial: 1 ease
    if (t === PropertyValueType.TwoD) return 2;
    if (t === PropertyValueType.ThreeD) return 3;
    if (t === PropertyValueType.COLOR) return 1;
    return 1;
};
UK.easeArr = function (prop, speed, infl) {
    var n = UK.dimsOf(prop), r = [];
    infl = UK.clamp(infl, 0.1, 100);
    for (var i = 0; i < n; i++) r.push(new KeyframeEase(speed, infl));
    return r;
};
/** Задать бесселевые ручки на ключе: inInfl для входящей, outInfl для исходящей. */
UK.setEase = function (prop, keyIndex, inInfl, outInfl) {
    prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    prop.setTemporalEaseAtKey(keyIndex, UK.easeArr(prop, 0, inInfl), UK.easeArr(prop, 0, outInfl));
};
UK.setLinear = function (prop, keyIndex) {
    prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
};
UK.setHold = function (prop, keyIndex) {
    prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
};
UK.key = function (prop, t, v) {
    prop.setValueAtTime(t, v);
    return prop.nearestKeyIndex(t);
};
/**
 * Поставить серию ключей и применить изинг.
 * pairs = [[t, v], [t, v], ...]; ease — объект из UK.EASES (или id);
 * mirror=true — зеркалит изинг (для анимаций исчезновения).
 * Возвращает массив индексов ключей.
 */
UK.keys = function (prop, pairs, ease, mirror) {
    if (typeof ease === 'string') ease = UK.easeById(ease);
    if (!ease) ease = UK.EASES[0];
    var idx = [], i;
    for (i = 0; i < pairs.length; i++) idx.push(UK.key(prop, pairs[i][0], pairs[i][1]));
    var out1 = ease.out1, in2 = ease.in2;
    if (mirror) { out1 = ease.in2; in2 = ease.out1; }
    for (i = 0; i < idx.length; i++) {
        if (ease.linear) { UK.setLinear(prop, idx[i]); continue; }
        var isFirst = (i === 0), isLast = (i === idx.length - 1);
        var inI = isFirst ? out1 : (isLast ? in2 : 50);
        var outI = isFirst ? out1 : (isLast ? in2 : 50);
        UK.setEase(prop, idx[i], inI, outI);
    }
    return idx;
};
/** Два ключа A→B с изингом. */
UK.key2 = function (prop, t0, v0, t1, v1, ease, mirror) {
    return UK.keys(prop, [[t0, v0], [t1, v1]], ease, mirror);
};
/** Снять все ключи со свойства. */
UK.clearKeys = function (prop) {
    while (prop.numKeys > 0) prop.removeKey(1);
};

// ------------------------------------------------------------------ выражения
UK.EXPR = {
    // Overshoot / bounce / elastic поверх ключей.
    // amp — амплитуда, freq — частота (Гц), decay — затухание.
    overshoot: function (amp, freq, decay) {
        return 'var amp = ' + amp + ', freq = ' + freq + ', decay = ' + decay + ';\n' +
            'var n = 0;\n' +
            'if (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }\n' +
            'if (n == 0) { value; } else {\n' +
            '  var t = time - key(n).time;\n' +
            '  if (t < 1.5) {\n' +
            '    var v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n' +
            '    value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);\n' +
            '  } else { value; }\n' +
            '}';
    },
    bounce: function (amp, freq, decay) {
        return 'var amp = ' + amp + ', freq = ' + freq + ', decay = ' + decay + ';\n' +
            'var n = 0;\n' +
            'if (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }\n' +
            'if (n == 0) { value; } else {\n' +
            '  var t = time - key(n).time;\n' +
            '  if (t < 1.5) {\n' +
            '    var v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n' +
            '    value + v * amp * Math.abs(Math.sin(freq * t * 2 * Math.PI)) / Math.exp(decay * t);\n' +
            '  } else { value; }\n' +
            '}';
    },
    /** wiggle с паузой на ключах не нужен — обычный wiggle с множителем */
    wiggle: function (freq, amp) { return 'wiggle(' + freq + ', ' + amp + ')'; },
    loopOut: function (type) { return 'loopOut("' + (type || 'cycle') + '")'; },
    /** Ссылка на контрол: effect("UK: Name")(matchName) */
    ref: function (name, type) {
        var m = { slider: 'ADBE Slider Control-0001', point: 'ADBE Point Control-0001', color: 'ADBE Color Control-0001',
                  check: 'ADBE Checkbox Control-0001', angle: 'ADBE Angle Control-0001' }[type || 'slider'];
        return 'effect("' + UK.CTRL_PREFIX + name + '")("' + m + '")';
    }
};

/** Применить пост-изинг (overshoot/bounce/elastic) к свойству по выбранному изингу. */
UK.applyEaseExpr = function (prop, ease, ctx) {
    if (typeof ease === 'string') ease = UK.easeById(ease);
    if (!ease || !ease.expr) return;
    var k = ctx && ctx.strength != null ? ctx.strength : 1;
    var amp, freq, decay, fn;
    if (ease.expr === 'overshoot') { amp = 0.06 * k; freq = 2.0; decay = 7.0; fn = UK.EXPR.overshoot; }
    else if (ease.expr === 'bounce') { amp = 0.05 * k; freq = 3.0; decay = 6.0; fn = UK.EXPR.bounce; }
    else { amp = 0.12 * k; freq = 3.5; decay = 5.0; fn = UK.EXPR.overshoot; }
    if (ctx && ctx.opts && ctx.opts.controls && ctx.layer) {
        var a = UK.slider(ctx.layer, 'Amp', UK.fmt(amp)), f = UK.slider(ctx.layer, 'Freq', freq), d = UK.slider(ctx.layer, 'Decay', decay);
        prop.expression = fn(UK.EXPR.ref('Amp'), UK.EXPR.ref('Freq'), UK.EXPR.ref('Decay'));
    } else {
        prop.expression = fn(UK.fmt(amp), freq, decay);
    }
};

// ------------------------------------------------------------------ эффекты
/** Найти свойство рекурсивно по matchName или display-имени (один кандидат или массив). */
UK.findProp = function (group, cands) {
    if (!UK.isArr(cands)) cands = [cands];
    var i, j, p;
    // прямые дети
    for (i = 0; i < cands.length; i++) {
        try { p = group.property(cands[i]); if (p) return p; } catch (e) {}
    }
    // рекурсия
    try {
        for (j = 1; j <= group.numProperties; j++) {
            var ch = group.property(j);
            if (ch && ch.propertyType !== PropertyType.PROPERTY) {
                p = UK.findProp(ch, cands);
                if (p) return p;
            }
        }
    } catch (e2) {}
    return null;
};
/** Добавить эффект на слой. match — matchName ('ADBE Gaussian Blur 2'), nick — имя для UI. */
UK.addFx = function (layer, match, nick) {
    var fxs = layer.property('ADBE Effect Parade');
    if (!fxs.canAddProperty(match)) throw new Error('Эффект недоступен: ' + match);
    var fx = fxs.addProperty(match);
    if (nick) {
        var nm = UK.PREFIX + nick, n = nm, k = 2;
        while (UK.hasFx(layer, n)) { n = nm + ' ' + k; k++; }
        fx.name = n;
    }
    return fx;
};
UK.hasFx = function (layer, name) {
    var fxs = layer.property('ADBE Effect Parade');
    for (var i = 1; i <= fxs.numProperties; i++) if (fxs.property(i).name === name) return true;
    return false;
};
UK.getFx = function (layer, name) {
    var fxs = layer.property('ADBE Effect Parade');
    for (var i = 1; i <= fxs.numProperties; i++) if (fxs.property(i).name === name) return fxs.property(i);
    return null;
};
/** Установить значение свойства эффекта (по matchName / имени). Молча пропускает, если не найдено. */
UK.set = function (fx, cands, value) {
    var p = UK.findProp(fx, cands);
    if (!p) return null;
    try { p.setValue(value); } catch (e) {}
    return p;
};
/** Получить свойство эффекта (с ошибкой, если нет). */
UK.p = function (fx, cands) {
    var p = UK.findProp(fx, cands);
    if (!p) throw new Error('Свойство не найдено: ' + cands);
    return p;
};
/** Поставить выражение на свойство эффекта. */
UK.expr = function (fx, cands, expression) {
    var p = UK.findProp(fx, cands);
    if (p) { try { p.expression = expression; } catch (e) {} }
    return p;
};
/** Удалить все эффекты UK с слоя. */
UK.removeFx = function (layer) {
    var fxs = layer.property('ADBE Effect Parade'), n = 0;
    for (var i = fxs.numProperties; i >= 1; i--) {
        var nm = fxs.property(i).name;
        if (nm.indexOf(UK.PREFIX) === 0 || nm.indexOf(UK.CTRL_PREFIX) === 0) { fxs.property(i).remove(); n++; }
    }
    return n;
};

// ------------------------------------------------------------------ контролы (слайдеры)
UK._ctrl = function (layer, match, name, value) {
    var full = UK.CTRL_PREFIX + name;
    var ex = UK.getFx(layer, full);
    if (!ex) {
        ex = layer.property('ADBE Effect Parade').addProperty(match);
        ex.name = full;
    }
    var p = ex.property(1);
    if (value != null) { try { p.setValue(value); } catch (e) {} }
    return p;
};
UK.slider = function (layer, name, value) { return UK._ctrl(layer, 'ADBE Slider Control', name, value); };
UK.point  = function (layer, name, value) { return UK._ctrl(layer, 'ADBE Point Control', name, value); };
UK.color  = function (layer, name, value) { return UK._ctrl(layer, 'ADBE Color Control', name, value); };
UK.check  = function (layer, name, value) { return UK._ctrl(layer, 'ADBE Checkbox Control', name, value); };
UK.angle  = function (layer, name, value) { return UK._ctrl(layer, 'ADBE Angle Control', name, value); };
UK.ref = UK.EXPR.ref;

/**
 * «Контрол или константа»: если в опциях включены контролы — создать слайдер и вернуть
 * строку-ссылку для выражения; иначе вернуть число строкой.
 */
UK.cv = function (ctx, name, value, type) {
    if (ctx.opts.controls) {
        var fn = { slider: UK.slider, point: UK.point, color: UK.color, check: UK.check, angle: UK.angle }[type || 'slider'];
        fn(ctx.layer, name, value);
        return UK.ref(name, type || 'slider');
    }
    if (UK.isArr(value)) return '[' + value.join(', ') + ']';
    return String(UK.fmt(value, 4));
};

// ------------------------------------------------------------------ слои
UK.selectedLayers = function (comp) {
    var r = [];
    if (!comp) return r;
    var sel = comp.selectedLayers;
    for (var i = 0; i < sel.length; i++) r.push(sel[i]);
    return r;
};
UK.sortByIn = function (layers) {
    var a = layers.slice();
    a.sort(function (x, y) { return x.inPoint - y.inPoint; });
    return a;
};
/** Корректирующий слой поверх всего на интервале [t0, t1]. */
UK.adjLayer = function (comp, t0, t1, name) {
    var solid = comp.layers.addSolid([1, 1, 1], UK.PREFIX + (name || 'Adjustment'), comp.width, comp.height, comp.pixelAspect, comp.duration);
    solid.adjustmentLayer = true;
    solid.startTime = 0;
    if (t0 != null) solid.inPoint = Math.max(0, t0);
    if (t1 != null) solid.outPoint = Math.min(comp.duration, t1);
    solid.moveToBeginning();
    solid.label = 11; // orange
    return solid;
};
/** Сплошной слой (solid) на интервале. */
UK.solid = function (comp, color, name, t0, t1) {
    var s = comp.layers.addSolid(color || [0, 0, 0], UK.PREFIX + (name || 'Solid'), comp.width, comp.height, comp.pixelAspect, comp.duration);
    s.startTime = 0;
    if (t0 != null) s.inPoint = Math.max(0, t0);
    if (t1 != null) s.outPoint = Math.min(comp.duration, t1);
    s.moveToBeginning();
    return s;
};
/** Нулевой объект. */
UK.nullLayer = function (comp, name) {
    var n = comp.layers.addNull(comp.duration);
    n.name = UK.PREFIX + (name || 'Null');
    return n;
};
/** Включить motion blur на слое и в композиции. */
UK.motionBlur = function (layer, comp) {
    try { layer.motionBlur = true; } catch (e) {}
    try { comp.motionBlur = true; } catch (e2) {}
};
/** Перевести слой в 3D и вернуть его. */
UK.to3D = function (layer) { try { layer.threeDLayer = true; } catch (e) {} return layer; };
/** Центр композиции. */
UK.center = function (comp) { return [comp.width / 2, comp.height / 2]; };

// ------------------------------------------------------------------ текст
/** Добавить аниматор к текстовому слою. Возвращает { anim, sel, props }. */
UK.textAnimator = function (layer, name) {
    var anims = layer.property('ADBE Text Properties').property('ADBE Text Animators');
    var anim = anims.addProperty('ADBE Text Animator');
    anim.name = UK.PREFIX + (name || 'Animator');
    var sel = anim.property('ADBE Text Selectors').addProperty('ADBE Text Selector');
    var props = anim.property('ADBE Text Animator Properties');
    return { anim: anim, sel: sel, props: props };
};
/** Добавить свойство к аниматору и задать значение. match: 'ADBE Text Opacity', 'ADBE Text Position 3D', 'ADBE Text Scale 3D', 'ADBE Text Rotation', 'ADBE Text Blur', 'ADBE Text Tracking Amount', 'ADBE Text Skew', 'ADBE Text Fill Color', 'ADBE Text Anchor Point 3D' */
UK.textProp = function (ta, match, value) {
    var p = ta.props.addProperty(match);
    if (value != null) p.setValue(value);
    return p;
};
/**
 * Настроить Range Selector: basedOn 1=Characters 2=Chars excl. spaces 3=Words 4=Lines;
 * shape 1=Square 2=Ramp Up 3=Ramp Down 4=Triangle 5=Round 6=Smooth
 */
UK.textSelector = function (ta, o) {
    o = o || {};
    var s = ta.sel;
    var adv = s.property('ADBE Text Range Advanced');
    if (o.basedOn != null) UK.set(adv, ['ADBE Text Range Type2', 'Based On'], o.basedOn);
    if (o.shape != null) UK.set(adv, ['ADBE Text Range Shape', 'Shape'], o.shape);
    if (o.easeHigh != null) UK.set(adv, ['ADBE Text Levels Max Ease', 'Ease High'], o.easeHigh);
    if (o.easeLow != null) UK.set(adv, ['ADBE Text Levels Min Ease', 'Ease Low'], o.easeLow);
    if (o.random != null) UK.set(adv, ['ADBE Text Randomize Order', 'Randomize Order'], o.random ? 1 : 0);
    if (o.smooth != null) UK.set(adv, ['ADBE Text Selector Smoothness', 'Smoothness'], o.smooth);
    if (o.start != null) UK.set(s, ['ADBE Text Percent Start', 'Start'], o.start);
    if (o.end != null) UK.set(s, ['ADBE Text Percent End', 'End'], o.end);
    if (o.offset != null) UK.set(s, ['ADBE Text Percent Offset', 'Offset'], o.offset);
    return s;
};
/** Ключи на Offset селектора: -100 → 100 за [t0,t1] (появление) или 0→100 для старта. */
UK.textOffsetKeys = function (ta, t0, t1, from, to, ease) {
    var off = UK.findProp(ta.sel, ['ADBE Text Percent Offset', 'Offset']);
    return UK.key2(off, t0, from == null ? -100 : from, t1, to == null ? 100 : to, ease || 'smooth');
};

// ------------------------------------------------------------------ контекст применения
/** Собрать opts из UI (или дефолт). */
UK.defaultOpts = function () {
    return { dur: 0.8, ease: 'expoOut', strength: 100, dir: 'L', startMode: 'in', stagger: 0.1, controls: true, adj: false };
};

/** Построить контекст для слоя. */
UK.ctxFor = function (comp, layer, layers, i, opts, cat) {
    var dur = Math.max(UK.frame(comp), Number(opts.dur) || 0.8);
    var stg = (Number(opts.stagger) || 0) * i;
    var t0, t1;
    if (cat === 'out') {
        t1 = (opts.startMode === 'playhead' || !layer ? comp.time : layer.outPoint) - stg;
        t0 = t1 - dur;
    } else {
        t0 = (opts.startMode === 'playhead' || !layer ? comp.time : layer.inPoint) + stg;
        t1 = t0 + dur;
    }
    var d = UK.dirById(opts.dir);
    return {
        comp: comp, layer: layer, layers: layers, i: i, opts: opts, cat: cat,
        t0: t0, t1: t1, dur: dur, tMid: (t0 + t1) / 2,
        strength: (Number(opts.strength) || 100) / 100,
        ease: UK.easeById(opts.ease),
        easeId: opts.ease,
        dir: d, dirV: d.v, dirId: d.id,
        fps: 1 / comp.frameDuration, fd: comp.frameDuration,
        isOut: cat === 'out'
    };
};

/** Контекст перехода: точка склейки, исходящий/входящий слои. */
UK.transCtx = function (comp, layers, opts) {
    var dur = Math.max(UK.frame(comp) * 2, Number(opts.dur) || 1.0);
    var A = null, B = null, cut;
    var ls = UK.sortByIn(layers);
    if (ls.length >= 2) {
        A = ls[ls.length - 2]; B = ls[ls.length - 1];
        cut = B.inPoint;
    } else if (ls.length === 1) {
        var L = ls[0];
        cut = comp.time;
        if (Math.abs(cut - L.inPoint) < UK.frame(comp) / 2) { B = L; }
        else if (Math.abs(cut - L.outPoint) < UK.frame(comp) / 2) { A = L; }
        else { B = L; A = null; }
    } else {
        cut = comp.time;
    }
    var d = UK.dirById(opts.dir);
    var c = {
        comp: comp, layers: ls, A: A, B: B, cut: cut, dur: dur, opts: opts,
        t0: cut - dur / 2, t1: cut + dur / 2, half: dur / 2,
        strength: (Number(opts.strength) || 100) / 100,
        ease: UK.easeById(opts.ease), easeId: opts.ease,
        dir: d, dirV: d.v, dirId: d.id,
        fps: 1 / comp.frameDuration, fd: comp.frameDuration,
        cat: 'trans'
    };
    c.t0 = Math.max(0, c.t0);
    c.t1 = Math.min(comp.duration, c.t1);
    /** Корректирующий слой на длительность перехода. */
    c.adj = function (name) {
        var l = UK.adjLayer(comp, c.t0, c.t1, name || 'Transition');
        c.layer = l;
        return l;
    };
    c.layer = B || A;
    return c;
};

// ------------------------------------------------------------------ запуск пресета
UK.run = function (presetId, opts) {
    var p = UK.byId[presetId];
    if (!p) { alert('Пресет не найден: ' + presetId); return; }
    opts = opts || UK.defaultOpts();
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) { alert('Откройте композицию.'); return; }
    var layers = UK.selectedLayers(comp);

    app.beginUndoGroup(UK.NAME + ': ' + p.name);
    try {
        var i, ctx;
        if (p.needs === 'none' || p.needs === 'comp') {
            ctx = UK.ctxFor(comp, layers[0] || null, layers, 0, opts, p.cat);
            p.apply(ctx);
        } else if (p.needs === 'trans') {
            ctx = UK.transCtx(comp, layers, opts);
            p.apply(ctx);
        } else {
            var targets = layers;
            if (p.needs === 'text') {
                targets = layers.filter(UK.isText);
                if (!targets.length) { alert('Выделите текстовый слой.'); app.endUndoGroup(); return; }
            }
            if (!targets.length) {
                if (opts.adj && (p.cat === 'fx' || p.cat === 'distort' || p.cat === 'light' || p.cat === 'cam')) {
                    targets = [UK.adjLayer(comp, 0, comp.duration, p.name)];
                } else {
                    alert('Выделите хотя бы один слой.');
                    app.endUndoGroup();
                    return;
                }
            } else if (opts.adj && (p.cat === 'fx' || p.cat === 'distort' || p.cat === 'light' || p.cat === 'cam')) {
                // один корректирующий слой над выделением
                var s = UK.sortByIn(targets);
                var tIn = s[0].inPoint, tOut = s[0].outPoint;
                for (i = 0; i < s.length; i++) { tIn = Math.min(tIn, s[i].inPoint); tOut = Math.max(tOut, s[i].outPoint); }
                var adj = UK.adjLayer(comp, tIn, tOut, p.name);
                adj.moveBefore(s[s.length - 1]);
                targets = [adj];
            }
            for (i = 0; i < targets.length; i++) {
                ctx = UK.ctxFor(comp, targets[i], targets, i, opts, p.cat);
                p.apply(ctx);
            }
        }
    } catch (e) {
        alert(UK.NAME + ' — ошибка в пресете «' + p.name + '»:\n' + e.toString() + (e.line ? '\n(строка ' + e.line + ')' : ''));
    }
    app.endUndoGroup();
};
