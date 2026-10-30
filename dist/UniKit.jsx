
// ---- src/00_header.jsx
/*
 *  UniKit — универсальный тулкит для монтажа в After Effects 2025 (v25+)
 *  ---------------------------------------------------------------------
 *  Готовые анимации, переходы, эффекты, искажения, лайтсвипы, текст, камера.
 *  Один клик — пресет применяется на выделенные слои с настраиваемыми
 *  параметрами (длительность, изинг, сила, направление, слайдеры-контролы).
 *
 *  Установка: положить файл в
 *    <AE>/Support Files/Scripts/ScriptUI Panels/UniKit.jsx
 *  и открыть через Window > UniKit.jsx
 *
 *  Код — ES3 (ExtendScript). Собрано из src/ скриптом build.js.
 */

(function UniKitMain(thisObj) {

// ------------------------------------------------------------------ polyfills
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (v, from) {
        var i = from || 0;
        for (; i < this.length; i++) if (this[i] === v) return i;
        return -1;
    };
}
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (fn, ctx) {
        for (var i = 0; i < this.length; i++) fn.call(ctx, this[i], i, this);
    };
}
if (!Array.prototype.map) {
    Array.prototype.map = function (fn, ctx) {
        var r = [];
        for (var i = 0; i < this.length; i++) r.push(fn.call(ctx, this[i], i, this));
        return r;
    };
}
if (!Array.prototype.filter) {
    Array.prototype.filter = function (fn, ctx) {
        var r = [];
        for (var i = 0; i < this.length; i++) if (fn.call(ctx, this[i], i, this)) r.push(this[i]);
        return r;
    };
}
if (!Object.keys) {
    Object.keys = function (o) {
        var r = [];
        for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r.push(k);
        return r;
    };
}
if (!String.prototype.trim) {
    String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ''); };
}


// ---- src/10_core.jsx
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
        { id: 'combo',   name: 'Готовые решения' },
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


// ---- src/15_bridge.jsx
// =============================================================================
//  Bridge — API для CEP-панели: JSON, применение пресета к конкретному слою,
//  комбинации (готовые решения), предпросмотр на футаже
// =============================================================================

// ------------------------------------------------------------------ JSON (ExtendScript без JSON)
UK.jsonStr = function (s) {
    s = String(s);
    var out = '"', i, ch, code;
    for (i = 0; i < s.length; i++) {
        ch = s.charAt(i); code = s.charCodeAt(i);
        if (ch === '"') out += '\\"';
        else if (ch === '\\') out += '\\\\';
        else if (ch === '\n') out += '\\n';
        else if (ch === '\r') out += '\\r';
        else if (ch === '\t') out += '\\t';
        else if (code < 32) out += '\\u' + ('000' + code.toString(16)).slice(-4);
        else out += ch;
    }
    return out + '"';
};
UK.json = function (v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number') return isFinite(v) ? String(v) : 'null';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'string') return UK.jsonStr(v);
    if (UK.isArr(v)) {
        var a = [];
        for (var i = 0; i < v.length; i++) a.push(UK.json(v[i]));
        return '[' + a.join(',') + ']';
    }
    if (typeof v === 'object') {
        var o = [];
        for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k) && typeof v[k] !== 'function') o.push(UK.jsonStr(k) + ':' + UK.json(v[k]));
        return '{' + o.join(',') + '}';
    }
    return 'null';
};
/** Очень простой парсер опций из панели: {"dur":0.8,"ease":"expoOut"} и т.д. — через eval. */
UK.parseOpts = function (s) {
    if (!s) return UK.defaultOpts();
    if (typeof s === 'object') return s;
    var o;
    try { o = eval('(' + s + ')'); } catch (e) { o = null; }
    var d = UK.defaultOpts();
    if (!o) return d;
    for (var k in d) if (o[k] !== undefined) d[k] = o[k];
    return d;
};

// ------------------------------------------------------------------ каталог для панели
/** Ключ CSS-превью для пресета (UK.PREVIEW заполняется в 28_previews.jsx). */
UK.PREVIEW = UK.PREVIEW || {};
UK.previewKey = function (p) {
    if (p.preview) return p.preview;
    if (UK.PREVIEW[p.id]) return UK.PREVIEW[p.id];
    var guess = { 'in': 'fadeIn', out: 'fadeOut', trans: 'dissolve', fx: 'grade', distort: 'wave', light: 'sweep', text: 'textUp', cam: 'camera', util: 'tool', combo: 'combo' };
    return guess[p.cat] || 'fadeIn';
};
UK.catalogJSON = function () {
    var items = [], i, p;
    for (i = 0; i < UK.presets.length; i++) {
        p = UK.presets[i];
        items.push({ id: p.id, cat: p.cat, name: p.name, desc: p.desc, tags: p.tags, needs: p.needs, preview: UK.previewKey(p), fav: UK.isFav(p.id) });
    }
    return UK.json({
        version: UK.VERSION,
        cats: UK.CATS,
        eases: UK.EASES.map(function (e) { return { id: e.id, name: e.name }; }),
        dirs: UK.DIRS.map(function (d) { return { id: d.id, name: d.name }; }),
        presets: items,
        favs: UK.favs(),
        settings: {
            dur: UK.settings.get('dur', '0.8'), ease: UK.settings.get('ease', 'expoOut'), strength: UK.settings.get('strength', '100'),
            dir: UK.settings.get('dir', 'L'), startMode: UK.settings.get('startMode', 'in'), stagger: UK.settings.get('stagger', '0.1'),
            controls: UK.settings.get('controls', 'true'), adj: UK.settings.get('adj', 'false'), cat: UK.settings.get('cat', 'in')
        }
    });
};
UK.saveOpts = function (o) {
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) UK.settings.set(k, o[k]);
};

// ------------------------------------------------------------------ состояние выделения (для панели)
UK.selectionJSON = function () {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return UK.json({ comp: false });
    var ls = UK.selectedLayers(comp), names = [], hasText = false, i;
    for (i = 0; i < ls.length; i++) { names.push(ls[i].name); if (UK.isText(ls[i])) hasText = true; }
    return UK.json({ comp: true, compName: comp.name, time: comp.time, count: ls.length, names: names, hasText: hasText });
};

// ------------------------------------------------------------------ запуск с захватом ошибок (для панели)
/** Возвращает JSON {ok:true} или {ok:false, error:'...'}; alert'ы ядра перехватываются. */
UK.runJSON = function (presetId, optsJSON) {
    var opts = UK.parseOpts(optsJSON);
    UK.saveOpts(opts);
    var msgs = [], realAlert = $.global.alert;
    $.global.alert = function (s) { msgs.push(String(s)); };
    try { UK.run(presetId, opts); }
    catch (e) { msgs.push(e.toString()); }
    $.global.alert = realAlert;
    return UK.json(msgs.length ? { ok: false, error: msgs.join('\n') } : { ok: true });
};
UK.toggleFavJSON = function (id) { return UK.json({ fav: UK.toggleFav(id), favs: UK.favs() }); };
UK.cleanJSON = function () {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return UK.json({ ok: false, error: 'Нет композиции' });
    app.beginUndoGroup(UK.NAME + ': удалить');
    var ls = UK.selectedLayers(comp), n = 0;
    for (var i = 0; i < ls.length; i++) n += UK.removeFx(ls[i]);
    app.endUndoGroup();
    return UK.json({ ok: true, removed: n });
};

// ------------------------------------------------------------------ применение к конкретному слою (для комбо)
/**
 * Применить пресет напрямую к слою (без обработки выделения).
 * over — переопределения опций ({dur:0.5, ease:'back', ...}); cat можно переопределить (напр. 'out').
 */
UK.applyTo = function (presetId, layer, baseOpts, over, i) {
    var p = UK.byId[presetId];
    if (!p) throw new Error('Пресет не найден: ' + presetId);
    var opts = UK.mergeOpts(baseOpts, over);
    var comp = layer.containingComp;
    var ctx = UK.ctxFor(comp, layer, [layer], i || 0, opts, p.cat);
    p.apply(ctx);
    return ctx;
};
/** Применить переход напрямую к слоям (A, B могут быть null). */
UK.applyTrans = function (presetId, comp, layers, baseOpts, over) {
    var p = UK.byId[presetId];
    if (!p) throw new Error('Пресет не найден: ' + presetId);
    var opts = UK.mergeOpts(baseOpts, over);
    var ctx = UK.transCtx(comp, layers, opts);
    p.apply(ctx);
    return ctx;
};
UK.mergeOpts = function (base, over) {
    var o = {}, k;
    base = base || UK.defaultOpts();
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) o[k] = base[k];
    if (over) for (k in over) if (Object.prototype.hasOwnProperty.call(over, k)) o[k] = over[k];
    return o;
};

// ------------------------------------------------------------------ предпросмотр на футаже
/**
 * Применяет пресет в отдельной undo-группе, ставит рабочую область на анимацию
 * и запускает предпросмотр. Отмена — UK.previewUndo().
 */
UK.PREVIEW_GROUP = UK.NAME + ' Preview';
UK.previewJSON = function (presetId, optsJSON) {
    var opts = UK.parseOpts(optsJSON);
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return UK.json({ ok: false, error: 'Откройте композицию' });
    var p = UK.byId[presetId];
    if (!p) return UK.json({ ok: false, error: 'Пресет не найден' });
    var layers = UK.selectedLayers(comp);
    var msgs = [], realAlert = $.global.alert;
    $.global.alert = function (s) { msgs.push(String(s)); };
    try {
        // UK.run сам открывает undo-группу с именем пресета — оборачиваем в свою, чтобы отменять одним шагом
        app.beginUndoGroup(UK.PREVIEW_GROUP);
        UK.run(presetId, opts);
        // рабочая область
        var dur = Math.max(comp.frameDuration, Number(opts.dur) || 0.8), t0, t1;
        if (p.needs === 'trans') {
            var tc = UK.transCtx(comp, layers, opts); t0 = tc.t0 - 0.3; t1 = tc.t1 + 0.3;
        } else if (layers.length) {
            var L = UK.sortByIn(layers)[0];
            if (p.cat === 'out') { t1 = (opts.startMode === 'playhead' ? comp.time : L.outPoint) + 0.2; t0 = t1 - dur - 0.6; }
            else { t0 = (opts.startMode === 'playhead' ? comp.time : L.inPoint) - 0.2; t1 = t0 + Math.max(dur, 1.5) + 0.6; }
        } else { t0 = comp.time - 0.5; t1 = comp.time + 1.5; }
        t0 = Math.max(0, t0); t1 = Math.min(comp.duration, Math.max(t1, t0 + comp.frameDuration * 2));
        comp.workAreaStart = t0;
        comp.workAreaDuration = t1 - t0;
        comp.time = t0;
        app.endUndoGroup();
        UK._previewActive = true;
        // запуск предпросмотра (разные версии AE — разные названия команды)
        var ids = ['Preview', 'RAM Preview', 'Play Current Preview'], started = false;
        for (var i = 0; i < ids.length && !started; i++) {
            try { var cid = app.findMenuCommandId(ids[i]); if (cid) { app.executeCommand(cid); started = true; } } catch (e) {}
        }
        if (!started) { try { app.executeCommand(2131); started = true; } catch (e2) {} } // RAM Preview (старый id)
    } catch (e3) { msgs.push(e3.toString()); try { app.endUndoGroup(); } catch (e4) {} }
    $.global.alert = realAlert;
    return UK.json(msgs.length ? { ok: false, error: msgs.join('\n') } : { ok: true, active: true });
};
/** Отменить последний предпросмотр (Undo). */
UK.previewUndoJSON = function () {
    if (!UK._previewActive) return UK.json({ ok: true, undone: false });
    try { app.executeCommand(16); } catch (e) { return UK.json({ ok: false, error: e.toString() }); } // 16 = Undo
    UK._previewActive = false;
    return UK.json({ ok: true, undone: true });
};
/** Оставить предпросмотр как результат. */
UK.previewKeepJSON = function () { UK._previewActive = false; return UK.json({ ok: true }); };


// ---- src/20_ui.jsx
// =============================================================================
//  UI — dockable ScriptUI панель
// =============================================================================
UK.buildUI = function (thisObj) {
    var win = (thisObj instanceof Panel) ? thisObj : new Window('palette', UK.NAME + ' ' + UK.VERSION, undefined, { resizeable: true });
    win.orientation = 'column';
    win.alignChildren = ['fill', 'top'];
    win.spacing = 4;
    win.margins = 6;

    var state = {
        cat: UK.settings.get('cat', 'in'),
        query: '',
        current: null,
        items: []
    };

    // ---------- верх: категория + поиск
    var top = win.add('group');
    top.orientation = 'row';
    top.alignChildren = ['fill', 'center'];
    top.spacing = 4;
    var ddCat = top.add('dropdownlist', undefined, []);
    ddCat.alignment = ['fill', 'center'];
    ddCat.preferredSize.width = 140;
    for (var i = 0; i < UK.CATS.length; i++) ddCat.add('item', UK.CATS[i].name);
    var etSearch = top.add('edittext', undefined, '');
    etSearch.alignment = ['fill', 'center'];
    etSearch.preferredSize.width = 90;
    etSearch.helpTip = 'Поиск по названию и тегам';
    var btnFav = top.add('button', undefined, '★');
    btnFav.preferredSize = [26, 24];
    btnFav.helpTip = 'Добавить/убрать из избранного';

    // ---------- список
    var lb = win.add('listbox', undefined, [], { multiselect: false });
    lb.alignment = ['fill', 'fill'];
    lb.preferredSize = [240, 230];

    var desc = win.add('statictext', undefined, '', { multiline: true });
    desc.alignment = ['fill', 'top'];
    desc.preferredSize.height = 34;

    // ---------- настройки
    var pnl = win.add('panel', undefined, 'Настройки');
    pnl.orientation = 'column';
    pnl.alignChildren = ['fill', 'top'];
    pnl.spacing = 3;
    pnl.margins = [8, 10, 8, 6];

    function row(parent) {
        var g = parent.add('group');
        g.orientation = 'row';
        g.alignChildren = ['left', 'center'];
        g.spacing = 4;
        return g;
    }
    function label(g, txt, w) {
        var s = g.add('statictext', undefined, txt);
        if (w) s.preferredSize.width = w;
        return s;
    }

    var r1 = row(pnl);
    label(r1, 'Длит., с', 58);
    var etDur = r1.add('edittext', undefined, '0.8'); etDur.characters = 5;
    label(r1, 'Изинг', 36);
    var ddEase = r1.add('dropdownlist', undefined, []);
    ddEase.alignment = ['fill', 'center'];
    for (i = 0; i < UK.EASES.length; i++) ddEase.add('item', UK.EASES[i].name);

    var r2 = row(pnl);
    label(r2, 'Направл.', 58);
    var ddDir = r2.add('dropdownlist', undefined, []);
    ddDir.preferredSize.width = 90;
    for (i = 0; i < UK.DIRS.length; i++) ddDir.add('item', UK.DIRS[i].name);
    label(r2, 'Сила %', 40);
    var etStr = r2.add('edittext', undefined, '100'); etStr.characters = 4;
    var slStr = r2.add('slider', undefined, 100, 0, 300);
    slStr.alignment = ['fill', 'center'];

    var r3 = row(pnl);
    label(r3, 'Старт', 58);
    var ddStart = r3.add('dropdownlist', undefined, ['От границы слоя', 'От курсора (playhead)']);
    ddStart.preferredSize.width = 150;
    label(r3, 'Шаг, с', 40);
    var etStag = r3.add('edittext', undefined, '0.1'); etStag.characters = 4;
    etStag.helpTip = 'Задержка между слоями при применении на несколько слоёв';

    var r4 = row(pnl);
    var cbCtrl = r4.add('checkbox', undefined, 'Слайдеры-контролы');
    cbCtrl.helpTip = 'Добавлять Slider Control для последующей настройки через выражения';
    var cbAdj = r4.add('checkbox', undefined, 'На корр. слой');
    cbAdj.helpTip = 'Эффекты/искажения/свет применять на новый корректирующий слой над выделением';

    // ---------- кнопки
    var rb = win.add('group');
    rb.orientation = 'row';
    rb.alignChildren = ['fill', 'center'];
    rb.spacing = 4;
    var btnApply = rb.add('button', undefined, 'Применить');
    btnApply.alignment = ['fill', 'center'];
    btnApply.preferredSize.height = 30;
    var btnClean = rb.add('button', undefined, 'Удалить UK');
    btnClean.helpTip = 'Удалить все эффекты и контролы UniKit с выделенных слоёв';
    btnClean.preferredSize.width = 80;
    var btnHelp = rb.add('button', undefined, '?');
    btnHelp.preferredSize.width = 24;

    var foot = win.add('statictext', undefined, UK.NAME + ' v' + UK.VERSION + ' · пресетов: ' + UK.presets.length);
    foot.alignment = ['fill', 'bottom'];
    foot.graphics.foregroundColor = foot.graphics.newPen(foot.graphics.PenType.SOLID_COLOR, [0.6, 0.6, 0.6], 1);

    // ---------- загрузка сохранённых опций
    function loadOpts() {
        var d = UK.defaultOpts();
        etDur.text = UK.settings.get('dur', String(d.dur));
        etStr.text = UK.settings.get('strength', String(d.strength));
        slStr.value = Number(etStr.text) || 100;
        etStag.text = UK.settings.get('stagger', String(d.stagger));
        cbCtrl.value = UK.settings.get('controls', 'true') === 'true';
        cbAdj.value = UK.settings.get('adj', 'false') === 'true';
        var ez = UK.settings.get('ease', d.ease), k;
        for (k = 0; k < UK.EASES.length; k++) if (UK.EASES[k].id === ez) ddEase.selection = k;
        if (!ddEase.selection) ddEase.selection = 1;
        var dr = UK.settings.get('dir', d.dir);
        for (k = 0; k < UK.DIRS.length; k++) if (UK.DIRS[k].id === dr) ddDir.selection = k;
        if (!ddDir.selection) ddDir.selection = 0;
        ddStart.selection = UK.settings.get('startMode', 'in') === 'playhead' ? 1 : 0;
        for (k = 0; k < UK.CATS.length; k++) if (UK.CATS[k].id === state.cat) ddCat.selection = k;
        if (!ddCat.selection) ddCat.selection = 0;
    }
    function readOpts() {
        var o = {
            dur: Math.max(0.02, Number(etDur.text) || 0.8),
            ease: UK.EASES[ddEase.selection ? ddEase.selection.index : 0].id,
            strength: UK.clamp(Number(etStr.text) || 100, 0, 1000),
            dir: UK.DIRS[ddDir.selection ? ddDir.selection.index : 0].id,
            startMode: ddStart.selection && ddStart.selection.index === 1 ? 'playhead' : 'in',
            stagger: Math.max(0, Number(etStag.text) || 0),
            controls: cbCtrl.value,
            adj: cbAdj.value
        };
        UK.settings.set('dur', o.dur); UK.settings.set('ease', o.ease); UK.settings.set('strength', o.strength);
        UK.settings.set('dir', o.dir); UK.settings.set('startMode', o.startMode); UK.settings.set('stagger', o.stagger);
        UK.settings.set('controls', o.controls); UK.settings.set('adj', o.adj);
        return o;
    }

    // ---------- список
    function refreshList() {
        var cat = UK.CATS[ddCat.selection ? ddCat.selection.index : 0].id;
        state.cat = cat;
        UK.settings.set('cat', cat);
        state.items = UK.list(cat, etSearch.text);
        // при поиске — по всем категориям
        if (etSearch.text.trim() && cat !== 'fav') state.items = UK.list(null, etSearch.text);
        lb.removeAll();
        for (var i = 0; i < state.items.length; i++) {
            var p = state.items[i];
            var it = lb.add('item', (UK.isFav(p.id) ? '★ ' : '') + p.name);
            it.preset = p;
        }
        if (state.items.length) lb.selection = 0;
        showDesc();
    }
    function showDesc() {
        var p = lb.selection ? lb.selection.preset : null;
        state.current = p;
        if (!p) { desc.text = ''; return; }
        var needs = { layer: 'слой', text: 'текстовый слой', trans: 'переход: 2 слоя или курсор', comp: 'композиция', none: '' }[p.needs] || '';
        desc.text = p.desc + (needs ? '  [' + needs + ']' : '');
    }
    function apply() {
        if (!state.current) return;
        UK.run(state.current.id, readOpts());
    }

    ddCat.onChange = refreshList;
    etSearch.onChanging = refreshList;
    lb.onChange = showDesc;
    lb.onDoubleClick = apply;
    btnApply.onClick = apply;
    btnFav.onClick = function () {
        if (!state.current) return;
        UK.toggleFav(state.current.id);
        var idx = lb.selection ? lb.selection.index : 0;
        refreshList();
        if (lb.items.length > idx) lb.selection = idx;
    };
    btnClean.onClick = function () {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) return;
        app.beginUndoGroup(UK.NAME + ': удалить');
        var ls = UK.selectedLayers(comp), n = 0;
        for (var i = 0; i < ls.length; i++) n += UK.removeFx(ls[i]);
        app.endUndoGroup();
        foot.text = 'Удалено эффектов: ' + n;
    };
    btnHelp.onClick = function () {
        alert(UK.NAME + ' v' + UK.VERSION + '\n\n' +
            '1. Выделите слой(и) и выберите категорию.\n' +
            '2. Двойной клик по пресету или «Применить».\n' +
            '3. Переходы: выделите 2 соседних слоя (склейка = начало верхнего) или 1 слой и поставьте курсор на склейку.\n' +
            '4. Изинг Back/Bounce/Elastic добавляет выражение поверх ключей — амплитуду можно менять слайдерами.\n' +
            '5. «Слайдеры-контролы» — параметры пресета выносятся в Effect Controls (UK: ...).\n' +
            '6. «Старт» — от границы слоя (in/out point) или от текущего положения курсора.\n' +
            '7. Поиск ищет по всем категориям.\n\n' +
            'Пресетов: ' + UK.presets.length);
    };
    slStr.onChanging = function () { etStr.text = String(Math.round(slStr.value)); };
    etStr.onChange = function () { slStr.value = UK.clamp(Number(etStr.text) || 100, 0, 300); };

    win.onResizing = win.onResize = function () { this.layout.resize(); };

    loadOpts();
    refreshList();

    if (win instanceof Window) { win.center(); win.show(); }
    else { win.layout.layout(true); win.layout.resize(); }
    return win;
};


// ---- src/25_examples.jsx
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


// ---- src/28_previews.jsx
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


// ---- src/presets/30_in.jsx
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


// ---- src/presets/31_out.jsx
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


// ---- src/presets/40_trans.jsx
// =============================================================================
//  Переходы (cat: 'trans', needs: 'trans')
//  Два типа: на корректирующем слое над склейкой (c.adj) и «честные» на слоях A/B.
// =============================================================================
(function () {

    // ------------------------------------------------------------ helpers
    function F(x) { return String(UK.fmt(x, 4)); }
    function isArr(v) { return v !== null && typeof v === 'object' && typeof v.length === 'number'; }
    function V(v) { return isArr(v) ? '[' + v.join(', ') + ']' : String(UK.fmt(v, 4)); }
    function add(a, b) { return isArr(a) ? UK.vecAdd(a, b) : a + b; }
    function horiz(c) { return c.dirV[0] !== 0; }
    function sgn(c) { return horiz(c) ? c.dirV[0] : c.dirV[1]; }
    function need(c) { if (!c.A && !c.B) throw new Error('Выделите слой(и) на склейке (2 соседних слоя или 1 слой + курсор).'); }
    function center(c) { return UK.center(c.comp); }
    /** размер слоя (ширина/высота источника) с фолбэком на композицию */
    function lsz(L, c) {
        var w = c.comp.width, h = c.comp.height;
        try { if (L.width > 0 && L.height > 0) { w = L.width; h = L.height; } } catch (e) {}
        return [w, h];
    }
    function lcenter(L, c) { var s = lsz(L, c); return [s[0] / 2, s[1] / 2]; }
    /** интервалы анимации для слоёв B (входящий) и A (исходящий) */
    function tB(c) { return (c.B && c.B.inPoint < c.cut - c.fd / 2) ? [c.t0, c.t1] : [c.cut, c.t1]; }
    function tA(c) { return (c.A && c.A.outPoint > c.cut + c.fd / 2) ? [c.t0, c.t1] : [c.t0, c.cut]; }

    /**
     * Симметричная огибающая вокруг склейки: base → base+delta (на cut) → base.
     * При контролах — слайдер «nick» (%) + выражение, иначе ключи.
     */
    function sym(c, prop, base, delta, nick, ease) {
        if (c.opts.controls) {
            var ref = UK.cv(c, nick, 100);
            prop.expression =
                'var amp = ' + ref + ' / 100;\n' +
                'var e = (time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', 0, 1) : ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', 1, 0);\n' +
                V(base) + ' + ' + V(delta) + ' * amp * e';
        } else {
            UK.keys(prop, [[c.t0, base], [c.cut, add(base, delta)], [c.t1, base]], ease || 'expoInOut');
        }
    }
    /**
     * «Прыжок» на склейке: base → base+dA (ускоряясь к cut), затем base+dB → base (замедляясь).
     */
    function jump(c, prop, base, dA, dB, nick) {
        if (c.opts.controls) {
            var ref = UK.cv(c, nick, 100);
            prop.expression =
                'var amp = ' + ref + ' / 100;\n' +
                '(time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', ' + V(base) + ', ' + V(base) + ' + ' + V(dA) + ' * amp) : ' +
                'ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', ' + V(base) + ' + ' + V(dB) + ' * amp, ' + V(base) + ')';
        } else {
            UK.key2(prop, c.t0, base, c.cut, add(base, dA), 'expoIn');
            UK.key2(prop, Math.min(c.cut + c.fd, c.t1), add(base, dB), c.t1, base, 'expoOut');
        }
    }
    /** Корр. слой + (опц.) Motion Tile 300% mirror + Transform с motion blur. */
    function adjTT(c, name, withTile) {
        var adj = c.adj(name), r = { adj: adj };
        if (withTile) {
            r.tile = UK.addFx(adj, 'ADBE Tile', 'Tile');
            UK.set(r.tile, 'ADBE Tile-0004', 300);
            UK.set(r.tile, 'ADBE Tile-0005', 300);
            UK.set(r.tile, 'ADBE Tile-0006', 1);
        }
        r.tf = UK.addFx(adj, 'ADBE Geometry2', 'Transform');
        UK.set(r.tf, 'ADBE Geometry2-0010', 0);
        UK.set(r.tf, 'ADBE Geometry2-0011', 360);
        UK.motionBlur(adj, c.comp);
        return r;
    }
    function uniScale(tf) { UK.set(tf, 'ADBE Geometry2-0003', 1); return UK.p(tf, 'ADBE Geometry2-0004'); }
    function radialZoom(c, adj, peak) {
        var rb = UK.addFx(adj, 'CC Radial Fast Blur', 'Radial Blur');
        UK.set(rb, 'CC Radial Fast Blur-0001', center(c));
        UK.set(rb, 'CC Radial Fast Blur-0003', 2);
        sym(c, UK.p(rb, 'CC Radial Fast Blur-0002'), 0, UK.clamp(peak, 0, 95), 'Radial Blur', 'smooth');
        return rb;
    }
    function dirBlur(c, adj, peak, dirDeg) {
        var mb = UK.addFx(adj, 'ADBE Motion Blur', 'Directional Blur');
        UK.set(mb, 'ADBE Motion Blur-0001', dirDeg == null ? (horiz(c) ? 90 : 0) : dirDeg);
        sym(c, UK.p(mb, 'ADBE Motion Blur-0002'), 0, peak, 'Blur', 'smooth');
        return mb;
    }
    /** Пара «wipe»-эффектов на слоях B (100→0) и A (0→100). setup(fx, layer) — донастройка. */
    function wipePair(c, match, nick, compProp, setup) {
        need(c);
        var s, fx, p;
        if (c.B) {
            fx = UK.addFx(c.B, match, nick);
            if (setup) setup(fx, c.B);
            p = UK.p(fx, compProp);
            s = tB(c);
            UK.key2(p, s[0], 100, s[1], 0, c.ease);
        }
        if (c.A) {
            fx = UK.addFx(c.A, match, nick);
            if (setup) setup(fx, c.A);
            p = UK.p(fx, compProp);
            s = tA(c);
            UK.key2(p, s[0], 0, s[1], 100, c.ease, true);
        }
    }
    function fadeOutA(c, from) {
        if (!c.A) return;
        var s = tA(c), op = c.A.transform.opacity;
        UK.key2(op, from == null ? s[0] : from, op.valueAtTime(s[0], false), s[1], 0, 'expoIn');
    }
    function fadeInB(c, to) {
        if (!c.B) return;
        var s = tB(c), op = c.B.transform.opacity;
        UK.key2(op, s[0], 0, to == null ? s[1] : to, op.valueAtTime(s[1], false), 'expoOut');
    }
    /** Белый/чёрный солид с огибающей прозрачности. */
    function dipSolid(c, color, name, peakOp, ease) {
        var sol = UK.solid(c.comp, color, name, c.t0, c.t1);
        c.layer = sol;
        var op = sol.transform.opacity;
        sym(c, op, 0, UK.clamp(peakOp, 0, 100), 'Opacity', ease || 'expoInOut');
        return sol;
    }

    // ============================================================ ТИП 1: корр. слой
    UK.add({
        id: 'trans.zoomIn', cat: 'trans', needs: 'trans', name: 'Zoom In · Зум внутрь',
        desc: 'Непрерывный зум внутрь через склейку с радиальным размытием. Сила — глубина зума.',
        tags: 'zoom in push переход зум',
        apply: function (c) {
            var r = adjTT(c, 'Zoom In', true), sc = uniScale(r.tf);
            var z = 150 * c.strength;
            jump(c, sc, 100, z, -100 + 10000 / (100 + z), 'Zoom');
            radialZoom(c, r.adj, 45 * c.strength);
        }
    });
    UK.add({
        id: 'trans.zoomOut', cat: 'trans', needs: 'trans', name: 'Zoom Out · Зум наружу',
        desc: 'Непрерывный зум наружу через склейку (края зеркалятся Motion Tile). Сила — глубина.',
        tags: 'zoom out pull переход зум',
        apply: function (c) {
            var r = adjTT(c, 'Zoom Out', true), sc = uniScale(r.tf);
            var lo = Math.max(36, 100 / (1 + 1.5 * c.strength));
            jump(c, sc, 100, lo - 100, 10000 / lo - 100, 'Zoom');
            radialZoom(c, r.adj, 45 * c.strength);
        }
    });
    UK.add({
        id: 'trans.zoomPunch', cat: 'trans', needs: 'trans', name: 'Zoom Punch · Зум-удар',
        desc: 'Симметричный зум туда-обратно с размытием. Сила — амплитуда.',
        tags: 'zoom punch bump зум удар',
        apply: function (c) {
            var r = adjTT(c, 'Zoom Punch', true), sc = uniScale(r.tf);
            sym(c, sc, 100, 60 * c.strength, 'Zoom', c.ease);
            radialZoom(c, r.adj, 35 * c.strength);
        }
    });
    UK.add({
        id: 'trans.spin', cat: 'trans', needs: 'trans', name: 'Spin · Вращение',
        desc: 'Кадр раскручивается до склейки и докручивается после (направление задаёт сторону).',
        tags: 'spin rotate rotation вращение',
        apply: function (c) {
            var r = adjTT(c, 'Spin', true);
            var rot = UK.p(r.tf, 'ADBE Geometry2-0008');
            var a = 90 * c.strength * (sgn(c) < 0 ? -1 : 1);
            jump(c, rot, 0, a, -a, 'Angle');
            var sc = uniScale(r.tf);
            sym(c, sc, 100, 45, 'Zoom', 'smooth');
            var rb = UK.addFx(r.adj, 'ADBE Radial Blur', 'Spin Blur');
            UK.set(rb, 'ADBE Radial Blur-0002', center(c));
            UK.set(rb, 'ADBE Radial Blur-0003', 1);
            UK.set(rb, 'ADBE Radial Blur-0004', 2);
            sym(c, UK.p(rb, 'ADBE Radial Blur-0001'), 0, 40 * c.strength, 'Spin Blur', 'smooth');
        }
    });
    UK.add({
        id: 'trans.zoomSpin', cat: 'trans', needs: 'trans', name: 'Zoom Spin · Зум с вращением',
        desc: 'Комбинация зума и поворота через склейку.',
        tags: 'zoom spin rotate зум вращение',
        apply: function (c) {
            var r = adjTT(c, 'Zoom Spin', true);
            var sc = uniScale(r.tf);
            sym(c, sc, 100, 80 * c.strength, 'Zoom', 'expoInOut');
            var a = 45 * c.strength * (sgn(c) < 0 ? -1 : 1);
            jump(c, UK.p(r.tf, 'ADBE Geometry2-0008'), 0, a, -a, 'Angle');
            radialZoom(c, r.adj, 30 * c.strength);
        }
    });
    UK.add({
        id: 'trans.whipPan', cat: 'trans', needs: 'trans', name: 'Whip Pan · Вжух-панорама',
        desc: 'Резкая панорама по направлению с направленным размытием. Сила — дистанция.',
        tags: 'whip pan swish панорама вжух',
        apply: function (c) {
            var r = adjTT(c, 'Whip Pan', true);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002');
            var base = pos.value;
            var dist = (horiz(c) ? c.comp.width : c.comp.height) * c.strength;
            var d = UK.vecMul(c.dirV, dist);
            jump(c, pos, base, d, UK.vecMul(d, -1), 'Distance');
            dirBlur(c, r.adj, 200 * c.strength);
        }
    });
    UK.add({
        id: 'trans.roll', cat: 'trans', needs: 'trans', name: 'Roll · Прокрутка',
        desc: 'Вертикальная прокрутка кадра через склейку (как барабан). Направление ↑/↓.',
        tags: 'roll scroll vertical прокрутка барабан',
        apply: function (c) {
            var r = adjTT(c, 'Roll', true);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002');
            var base = pos.value;
            var s = (c.dirV[1] !== 0) ? c.dirV[1] : 1;
            var d = [0, c.comp.height * s * c.strength];
            jump(c, pos, base, d, UK.vecMul(d, -1), 'Distance');
            dirBlur(c, r.adj, 200 * c.strength, 0);
        }
    });
    UK.add({
        id: 'trans.offsetPan', cat: 'trans', needs: 'trans', name: 'Offset Wrap · Панорама с заворотом',
        desc: 'Кадр заворачивается сам на себя (эффект Offset) по направлению с размытием.',
        tags: 'offset wrap pan заворот',
        apply: function (c) {
            var adj = c.adj('Offset Wrap');
            var off = UK.addFx(adj, 'ADBE Offset', 'Offset');
            var p = UK.p(off, 'ADBE Offset-0001');
            var base = center(c);
            var dist = (horiz(c) ? c.comp.width : c.comp.height);
            var d = UK.vecMul(c.dirV, dist);
            if (c.opts.controls) {
                var ref = UK.cv(c, 'Distance', 100);
                p.expression = V(base) + ' + ' + V(d) + ' * (' + ref + ' / 100) * ease(time, ' + F(c.t0) + ', ' + F(c.t1) + ', 0, 1)';
            } else {
                UK.key2(p, c.t0, base, c.t1, UK.vecAdd(base, d), 'expoInOut');
            }
            dirBlur(c, adj, 180 * c.strength);
            UK.motionBlur(adj, c.comp);
        }
    });
    UK.add({
        id: 'trans.dirBlur', cat: 'trans', needs: 'trans', name: 'Directional Blur · Направленное размытие',
        desc: 'Размытие по направлению нарастает к склейке и спадает. Сила — длина размытия.',
        tags: 'blur directional motion размытие',
        apply: function (c) {
            var adj = c.adj('Directional Blur');
            dirBlur(c, adj, 250 * c.strength);
        }
    });
    UK.add({
        id: 'trans.gaussBlur', cat: 'trans', needs: 'trans', name: 'Blur Dissolve · Размытие',
        desc: 'Гауссово размытие к склейке и обратно.',
        tags: 'blur gaussian dissolve размытие',
        apply: function (c) {
            var adj = c.adj('Blur Dissolve');
            var g = UK.addFx(adj, 'ADBE Gaussian Blur 2', 'Blur');
            UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
            sym(c, UK.p(g, 'ADBE Gaussian Blur 2-0001'), 0, 120 * c.strength, 'Blur', c.ease);
        }
    });
    UK.add({
        id: 'trans.glitch', cat: 'trans', needs: 'trans', name: 'Glitch · Глитч',
        desc: 'Случайные рывки, мозаика и мерцание вокруг склейки. Сила — амплитуда.',
        tags: 'glitch digital error глитч',
        apply: function (c) {
            var r = adjTT(c, 'Glitch', true);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002'), base = pos.value;
            var op = UK.p(r.tf, 'ADBE Geometry2-0009');
            var mos = UK.addFx(r.adj, 'ADBE Mosaic', 'Mosaic');
            UK.set(mos, 'ADBE Mosaic-0003', 1);
            var bh = UK.p(mos, 'ADBE Mosaic-0001'), bv = UK.p(mos, 'ADBE Mosaic-0002');
            var mb = UK.addFx(r.adj, 'ADBE Motion Blur', 'Blur');
            UK.set(mb, 'ADBE Motion Blur-0001', 90);
            var bl = UK.p(mb, 'ADBE Motion Blur-0002');
            var ratio = c.comp.height / c.comp.width;
            var k, t, env, step = c.fd * 2;
            for (t = c.t0; t < c.t1; t += step) {
                env = 1 - Math.abs(t - c.cut) / c.half;
                env = UK.clamp(env, 0, 1);
                var hit = Math.random() < 0.35 + 0.6 * env;
                var amp = 70 * c.strength * env;
                k = UK.key(pos, t, hit ? UK.vecAdd(base, [UK.rnd(-amp, amp), UK.rnd(-amp * 0.3, amp * 0.3)]) : base); UK.setHold(pos, k);
                var blocks = hit ? Math.max(3, Math.round(UK.lerp(400, 18, env * Math.random()))) : 2000;
                k = UK.key(bh, t, blocks); UK.setHold(bh, k);
                k = UK.key(bv, t, Math.max(2, Math.round(blocks * ratio))); UK.setHold(bv, k);
                k = UK.key(op, t, hit && Math.random() < 0.3 ? UK.rnd(55, 90) : 100); UK.setHold(op, k);
                k = UK.key(bl, t, hit ? UK.rnd(0, 90 * c.strength * env) : 0); UK.setHold(bl, k);
            }
            k = UK.key(pos, c.t1, base); UK.setHold(pos, k);
            k = UK.key(bh, c.t1, 2000); UK.setHold(bh, k);
            k = UK.key(bv, c.t1, 2000); UK.setHold(bv, k);
            k = UK.key(op, c.t1, 100); UK.setHold(op, k);
            k = UK.key(bl, c.t1, 0); UK.setHold(bl, k);
        }
    });
    UK.add({
        id: 'trans.rgbSplit', cat: 'trans', needs: 'trans', name: 'RGB Split · Расслоение каналов',
        desc: 'Красный и синий каналы расползаются по направлению к склейке (Channel Blur).',
        tags: 'rgb split chromatic aberration каналы',
        apply: function (c) {
            var r = adjTT(c, 'RGB Split', true);
            var cb = UK.addFx(r.adj, 'ADBE Channel Blur', 'Channel Blur');
            UK.set(cb, 'ADBE Channel Blur-0005', 1);
            UK.set(cb, 'ADBE Channel Blur-0006', horiz(c) ? 2 : 3);
            sym(c, UK.p(cb, 'ADBE Channel Blur-0001'), 0, 120 * c.strength, 'Red Split', c.ease);
            sym(c, UK.p(cb, 'ADBE Channel Blur-0003'), 0, 120 * c.strength, 'Blue Split', c.ease);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002');
            sym(c, pos, pos.value, UK.vecMul(c.dirV, 30 * c.strength), 'Shift', c.ease);
        }
    });
    UK.add({
        id: 'trans.chromaZoom', cat: 'trans', needs: 'trans', name: 'Chromatic Zoom · Хроматический зум',
        desc: 'Зум с расслоением RGB и радиальным размытием.',
        tags: 'chromatic zoom rgb aberration зум',
        apply: function (c) {
            var r = adjTT(c, 'Chromatic Zoom', true), sc = uniScale(r.tf);
            sym(c, sc, 100, 50 * c.strength, 'Zoom', 'expoInOut');
            var cb = UK.addFx(r.adj, 'ADBE Channel Blur', 'Channel Blur');
            UK.set(cb, 'ADBE Channel Blur-0005', 1);
            sym(c, UK.p(cb, 'ADBE Channel Blur-0001'), 0, 60 * c.strength, 'Red Split', 'smooth');
            sym(c, UK.p(cb, 'ADBE Channel Blur-0003'), 0, 60 * c.strength, 'Blue Split', 'smooth');
            radialZoom(c, r.adj, 30 * c.strength);
        }
    });
    UK.add({
        id: 'trans.pixelate', cat: 'trans', needs: 'trans', name: 'Pixelate · Пикселизация',
        desc: 'Кадр рассыпается на крупные пиксели к склейке и собирается обратно.',
        tags: 'pixel mosaic 8bit пиксели мозаика',
        apply: function (c) {
            var adj = c.adj('Pixelate');
            var mos = UK.addFx(adj, 'ADBE Mosaic', 'Mosaic');
            UK.set(mos, 'ADBE Mosaic-0003', 1);
            var minB = Math.max(2, Math.round(12 / c.strength));
            var ratio = c.comp.height / c.comp.width;
            sym(c, UK.p(mos, 'ADBE Mosaic-0001'), 1200, minB - 1200, 'Blocks', 'expoInOut');
            sym(c, UK.p(mos, 'ADBE Mosaic-0002'), Math.round(1200 * ratio), Math.max(2, Math.round(minB * ratio)) - Math.round(1200 * ratio), 'Blocks V', 'expoInOut');
        }
    });
    UK.add({
        id: 'trans.twist', cat: 'trans', needs: 'trans', name: 'Twist · Скручивание',
        desc: 'Кадр закручивается в спираль к склейке (Twirl).',
        tags: 'twist twirl spiral скручивание',
        apply: function (c) {
            var adj = c.adj('Twist');
            var tw = UK.addFx(adj, 'ADBE Twirl', 'Twirl');
            UK.set(tw, 'ADBE Twirl-0002', 75);
            UK.set(tw, 'ADBE Twirl-0003', center(c));
            var a = 180 * c.strength * (sgn(c) < 0 ? -1 : 1);
            sym(c, UK.p(tw, 'ADBE Twirl-0001'), 0, a, 'Angle', c.ease);
            var rb = UK.addFx(adj, 'ADBE Radial Blur', 'Spin Blur');
            UK.set(rb, 'ADBE Radial Blur-0002', center(c));
            UK.set(rb, 'ADBE Radial Blur-0003', 1);
            sym(c, UK.p(rb, 'ADBE Radial Blur-0001'), 0, 20 * c.strength, 'Blur', 'smooth');
        }
    });
    UK.add({
        id: 'trans.ripple', cat: 'trans', needs: 'trans', name: 'Ripple · Круги по воде',
        desc: 'Волновое искажение от центра, пик на склейке.',
        tags: 'ripple wave water волны',
        apply: function (c) {
            var adj = c.adj('Ripple');
            var rp = UK.addFx(adj, 'ADBE Ripple', 'Ripple');
            UK.set(rp, 'ADBE Ripple-0002', center(c));
            UK.set(rp, 'ADBE Ripple-0004', 1.5);
            UK.set(rp, 'ADBE Ripple-0005', 60);
            UK.set(rp, 'ADBE Ripple-0006', UK.clamp(50 * c.strength, 5, 100));
            sym(c, UK.p(rp, 'ADBE Ripple-0001'), 0, 100, 'Radius', c.ease);
        }
    });
    UK.add({
        id: 'trans.bulge', cat: 'trans', needs: 'trans', name: 'Bulge · Выпуклость',
        desc: 'Кадр выдувается линзой к склейке и возвращается.',
        tags: 'bulge lens выпуклость линза',
        apply: function (c) {
            var adj = c.adj('Bulge');
            var b = UK.addFx(adj, 'ADBE Bulge', 'Bulge');
            UK.set(b, 'ADBE Bulge-0001', c.comp.width * 0.65);
            UK.set(b, 'ADBE Bulge-0002', c.comp.width * 0.65);
            UK.set(b, 'ADBE Bulge-0003', center(c));
            UK.set(b, 'ADBE Bulge-0007', 1);
            sym(c, UK.p(b, 'ADBE Bulge-0004'), 0, UK.clamp(2.2 * c.strength, -4, 4), 'Height', c.ease);
        }
    });
    UK.add({
        id: 'trans.lensDistort', cat: 'trans', needs: 'trans', name: 'Lens Distortion · Дисторсия',
        desc: 'Оптическое искажение (Optics Compensation) с зумом, пик на склейке.',
        tags: 'lens distortion optics дисторсия',
        apply: function (c) {
            var r = adjTT(c, 'Lens Distortion', true);
            var oc = UK.addFx(r.adj, 'ADBE Optics Compensation', 'Optics');
            UK.set(oc, 'ADBE Optics Compensation-0002', 1);
            sym(c, UK.p(oc, 'ADBE Optics Compensation-0001'), 0, UK.clamp(90 * c.strength, 0, 150), 'FOV', c.ease);
            sym(c, uniScale(r.tf), 100, 25 * c.strength, 'Zoom', 'smooth');
            radialZoom(c, r.adj, 20 * c.strength);
        }
    });
    UK.add({
        id: 'trans.fisheye', cat: 'trans', needs: 'trans', name: 'Fisheye Zoom · Рыбий глаз',
        desc: 'Зум с «рыбьим глазом» — кадр выпучивается и уходит в следующий.',
        tags: 'fisheye zoom lens рыбий глаз',
        apply: function (c) {
            var r = adjTT(c, 'Fisheye', true);
            var oc = UK.addFx(r.adj, 'ADBE Optics Compensation', 'Optics');
            UK.set(oc, 'ADBE Optics Compensation-0002', 0);
            sym(c, UK.p(oc, 'ADBE Optics Compensation-0001'), 0, UK.clamp(110 * c.strength, 0, 160), 'FOV', c.ease);
            var z = 120 * c.strength;
            jump(c, uniScale(r.tf), 100, z, -100 + 10000 / (100 + z), 'Zoom');
            radialZoom(c, r.adj, 25 * c.strength);
        }
    });
    UK.add({
        id: 'trans.mirrorSplit', cat: 'trans', needs: 'trans', name: 'Mirror Split · Зеркало',
        desc: 'Ось зеркала наезжает от края к центру и уходит обратно, плюс лёгкий зум.',
        tags: 'mirror split reflection зеркало',
        apply: function (c) {
            var r = adjTT(c, 'Mirror Split', true);
            var m = UK.addFx(r.adj, 'ADBE Mirror', 'Mirror');
            var w = c.comp.width, h = c.comp.height;
            var edge, delta, ang;
            if (horiz(c)) { edge = [c.dirV[0] < 0 ? w : 0, h / 2]; delta = [(w / 2 - edge[0]) * UK.clamp(c.strength, 0.2, 1), 0]; ang = c.dirV[0] < 0 ? 0 : 180; }
            else { edge = [w / 2, c.dirV[1] < 0 ? h : 0]; delta = [0, (h / 2 - edge[1]) * UK.clamp(c.strength, 0.2, 1)]; ang = c.dirV[1] < 0 ? 90 : 270; }
            UK.set(m, 'ADBE Mirror-0002', ang);
            sym(c, UK.p(m, 'ADBE Mirror-0001'), edge, delta, 'Axis', c.ease);
            sym(c, uniScale(r.tf), 100, 30, 'Zoom', 'smooth');
        }
    });
    UK.add({
        id: 'trans.kaleida', cat: 'trans', needs: 'trans', name: 'Kaleidoscope · Калейдоскоп',
        desc: 'Кадр складывается в калейдоскоп на склейке (CC Kaleida).',
        tags: 'kaleidoscope kaleida mirror калейдоскоп',
        apply: function (c) {
            var adj = c.adj('Kaleidoscope');
            var k = UK.addFx(adj, 'CC Kaleida', 'Kaleida');
            UK.set(k, 'CC Kaleida-0001', center(c));
            UK.set(k, 'CC Kaleida-0003', 7);
            sym(c, UK.p(k, 'CC Kaleida-0002'), 320, -320 + Math.max(40, 120 / c.strength), 'Size', c.ease);
            sym(c, UK.p(k, 'CC Kaleida-0004'), 0, 90 * (sgn(c) < 0 ? -1 : 1), 'Rotation', c.ease);
            sym(c, adj.transform.opacity, 0, 100, 'Opacity', 'expoOut');
            UK.motionBlur(adj, c.comp);
        }
    });
    UK.add({
        id: 'trans.warpStretch', cat: 'trans', needs: 'trans', name: 'Warp Stretch · Растяжение',
        desc: 'Кадр растягивается по одной оси (по направлению) к склейке.',
        tags: 'stretch warp scale растяжение',
        apply: function (c) {
            var r = adjTT(c, 'Warp Stretch', true);
            UK.set(r.tf, 'ADBE Geometry2-0003', 0);
            var p = UK.p(r.tf, horiz(c) ? 'ADBE Geometry2-0005' : 'ADBE Geometry2-0004');
            sym(c, p, 100, 180 * c.strength, 'Stretch', c.ease);
            dirBlur(c, r.adj, 120 * c.strength);
        }
    });
    UK.add({
        id: 'trans.shake', cat: 'trans', needs: 'trans', name: 'Shake · Тряска',
        desc: 'Тряска кадра с огибающей вокруг склейки (wiggle). Сила — амплитуда.',
        tags: 'shake wiggle camera тряска',
        apply: function (c) {
            var r = adjTT(c, 'Shake', true);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002');
            var amp = UK.cv(c, 'Shake Amount', UK.fmt(60 * c.strength));
            var freq = UK.cv(c, 'Shake Freq', 14);
            pos.expression =
                'var amp = ' + amp + ', fr = ' + freq + ';\n' +
                'var e = (time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', 0, 1) : ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', 1, 0);\n' +
                'value + (wiggle(fr, amp) - value) * e';
            var rot = UK.p(r.tf, 'ADBE Geometry2-0008');
            rot.expression =
                'var e = (time < ' + F(c.cut) + ') ? ease(time, ' + F(c.t0) + ', ' + F(c.cut) + ', 0, 1) : ease(time, ' + F(c.cut) + ', ' + F(c.t1) + ', 1, 0);\n' +
                'value + (wiggle(' + freq + ', ' + F(2 * c.strength) + ') - value) * e';
            sym(c, uniScale(r.tf), 100, 12 * c.strength, 'Zoom', 'smooth');
        }
    });
    UK.add({
        id: 'trans.punch', cat: 'trans', needs: 'trans', name: 'Impact Punch · Удар',
        desc: 'Резкий короткий толчок масштаба на склейке с размытием.',
        tags: 'punch impact hit bump удар',
        apply: function (c) {
            var r = adjTT(c, 'Punch', true), sc = uniScale(r.tf);
            var pk = 100 + 18 * c.strength;
            UK.keys(sc, [[Math.max(c.t0, c.cut - 2 * c.fd), 100], [c.cut, pk], [c.t1, 100]], 'expoOut');
            radialZoom(c, r.adj, 25 * c.strength);
        }
    });
    UK.add({
        id: 'trans.bounceZoom', cat: 'trans', needs: 'trans', name: 'Bounce Zoom · Пружинный зум',
        desc: 'Зум к склейке с отскоком обратно (выражение bounce).',
        tags: 'bounce zoom elastic пружина',
        apply: function (c) {
            var r = adjTT(c, 'Bounce Zoom', true), sc = uniScale(r.tf);
            UK.keys(sc, [[c.t0, 100], [c.cut, 100 + 35 * c.strength], [c.t1, 100]], 'expoInOut');
            UK.applyEaseExpr(sc, 'bounce', c);
            radialZoom(c, r.adj, 20 * c.strength);
        }
    });
    UK.add({
        id: 'trans.flash', cat: 'trans', needs: 'trans', name: 'Flash · Белая вспышка',
        desc: 'Белый солид вспыхивает на склейке. Сила — яркость.',
        tags: 'flash white luma вспышка',
        apply: function (c) {
            var sol = dipSolid(c, [1, 1, 1], 'Flash', 100 * c.strength, 'expoIn');
            sol.blendingMode = BlendingMode.ADD;
        }
    });
    UK.add({
        id: 'trans.dipBlack', cat: 'trans', needs: 'trans', name: 'Dip to Black · Затемнение',
        desc: 'Уход в чёрное и выход из него вокруг склейки.',
        tags: 'dip black fade затемнение',
        apply: function (c) { dipSolid(c, [0, 0, 0], 'Dip to Black', 100, 'smooth'); }
    });
    UK.add({
        id: 'trans.dipColor', cat: 'trans', needs: 'trans', name: 'Dip to Color · Цветная заливка',
        desc: 'Уход в цвет (по умолчанию тёмно-синий, меняется у солида) и выход.',
        tags: 'dip color fade заливка цвет',
        apply: function (c) { dipSolid(c, [0.07, 0.1, 0.25], 'Dip to Color', 100, 'smooth'); }
    });
    UK.add({
        id: 'trans.negFlash', cat: 'trans', needs: 'trans', name: 'Negative Flash · Негатив',
        desc: 'Короткий инверсный импульс на склейке.',
        tags: 'invert negative flash негатив',
        apply: function (c) {
            var adj = c.adj('Negative Flash');
            UK.addFx(adj, 'ADBE Invert', 'Invert');
            var op = adj.transform.opacity;
            var a = Math.max(c.t0, c.cut - 3 * c.fd), b = Math.min(c.t1, c.cut + 3 * c.fd);
            var k = UK.key(op, a, 0); UK.setHold(op, k);
            k = UK.key(op, Math.max(a, c.cut - c.fd), 100); UK.setHold(op, k);
            k = UK.key(op, Math.min(b, c.cut + c.fd), 100); UK.setHold(op, k);
            k = UK.key(op, b, 0); UK.setHold(op, k);
        }
    });
    UK.add({
        id: 'trans.lightLeak', cat: 'trans', needs: 'trans', name: 'Light Leak · Засветка',
        desc: 'Тёплая плёночная засветка (Fractal Noise + Tint, режим Add) накрывает склейку.',
        tags: 'light leak film warm засветка плёнка',
        apply: function (c) {
            var sol = UK.solid(c.comp, [1, 1, 1], 'Light Leak', c.t0, c.t1);
            c.layer = sol;
            var fn = UK.addFx(sol, 'ADBE Fractal Noise', 'Noise');
            UK.set(fn, ['ADBE Fractal Noise-0004', 'Contrast'], 160);
            UK.set(fn, ['ADBE Fractal Noise-0005', 'Brightness'], -10);
            UK.set(fn, ['ADBE Fractal Noise-0009', 'Uniform Scaling'], 0);
            UK.set(fn, ['ADBE Fractal Noise-0011', 'Scale Width'], 900);
            UK.set(fn, ['ADBE Fractal Noise-0012', 'Scale Height'], 350);
            UK.set(fn, ['ADBE Fractal Noise-0015', 'Complexity'], 2);
            UK.expr(fn, ['ADBE Fractal Noise-0022', 'Evolution'], 'time * 90');
            UK.expr(fn, ['ADBE Fractal Noise-0013', 'Offset Turbulence'], 'value + [time * 250, time * 40]');
            var tint = UK.addFx(sol, 'ADBE Tint', 'Tint');
            UK.set(tint, 'ADBE Tint-0001', [0.75, 0.15, 0.05, 1]);
            UK.set(tint, 'ADBE Tint-0002', [1, 0.85, 0.55, 1]);
            var g = UK.addFx(sol, 'ADBE Gaussian Blur 2', 'Soften');
            UK.set(g, 'ADBE Gaussian Blur 2-0001', 60);
            UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
            sol.blendingMode = BlendingMode.ADD;
            sym(c, sol.transform.opacity, 0, UK.clamp(85 * c.strength, 0, 100), 'Opacity', 'smooth');
        }
    });
    UK.add({
        id: 'trans.filmBurn', cat: 'trans', needs: 'trans', name: 'Film Burn · Прожиг плёнки',
        desc: 'Исходящий кадр прогорает, входящий проявляется из прожига (CC Burn Film).',
        tags: 'film burn плёнка прожиг',
        apply: function (c) {
            need(c);
            var fx, s;
            if (c.A) {
                fx = UK.addFx(c.A, 'CC Burn Film', 'Burn');
                UK.set(fx, 'CC Burn Film-0002', lcenter(c.A, c));
                s = tA(c);
                UK.key2(UK.p(fx, 'CC Burn Film-0001'), s[0], 0, s[1], 100, c.ease, true);
            }
            if (c.B) {
                fx = UK.addFx(c.B, 'CC Burn Film', 'Burn');
                UK.set(fx, 'CC Burn Film-0002', lcenter(c.B, c));
                UK.set(fx, 'CC Burn Film-0003', 7);
                s = tB(c);
                UK.key2(UK.p(fx, 'CC Burn Film-0001'), s[0], 100, s[1], 0, c.ease);
            }
            var sol = UK.solid(c.comp, [1, 0.6, 0.2], 'Burn Glow', c.t0, c.t1);
            sol.blendingMode = BlendingMode.ADD;
            UK.keys(sol.transform.opacity, [[c.t0, 0], [c.cut, UK.clamp(45 * c.strength, 0, 100)], [c.t1, 0]], 'smooth');
        }
    });
    UK.add({
        id: 'trans.wave', cat: 'trans', needs: 'trans', name: 'Wave Warp · Волна',
        desc: 'Волновое искажение по направлению с пиком на склейке.',
        tags: 'wave warp волна',
        apply: function (c) {
            var adj = c.adj('Wave');
            var w = UK.addFx(adj, 'ADBE Wave Warp', 'Wave');
            UK.set(w, 'ADBE Wave Warp-0001', 1);
            UK.set(w, 'ADBE Wave Warp-0003', 220);
            UK.set(w, 'ADBE Wave Warp-0004', horiz(c) ? 90 : 0);
            UK.set(w, 'ADBE Wave Warp-0005', 2);
            UK.set(w, 'ADBE Wave Warp-0008', 2);
            sym(c, UK.p(w, 'ADBE Wave Warp-0002'), 0, 90 * c.strength, 'Height', c.ease);
        }
    });
    UK.add({
        id: 'trans.turbulent', cat: 'trans', needs: 'trans', name: 'Turbulent Melt · Турбулентность',
        desc: 'Кадр «плавится» турбулентным смещением на склейке.',
        tags: 'turbulent displace melt liquid плавление',
        apply: function (c) {
            var adj = c.adj('Turbulent');
            var td = UK.addFx(adj, 'ADBE Turbulent Displace', 'Turbulent');
            UK.set(td, 'ADBE Turbulent Displace-0003', 140);
            UK.set(td, 'ADBE Turbulent Displace-0005', 3);
            UK.expr(td, ['ADBE Turbulent Displace-0006', 'Evolution'], 'time * 240');
            sym(c, UK.p(td, 'ADBE Turbulent Displace-0002'), 0, 160 * c.strength, 'Amount', c.ease);
            var g = UK.addFx(adj, 'ADBE Gaussian Blur 2', 'Blur');
            UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
            sym(c, UK.p(g, 'ADBE Gaussian Blur 2-0001'), 0, 20 * c.strength, 'Blur', 'smooth');
        }
    });
    UK.add({
        id: 'trans.spherize', cat: 'trans', needs: 'trans', name: 'Sphere Pop · Сфера',
        desc: 'Кадр надувается сферой к склейке.',
        tags: 'sphere spherize bulge сфера',
        apply: function (c) {
            var adj = c.adj('Sphere');
            var sp = UK.addFx(adj, 'ADBE Spherize', 'Spherize');
            UK.set(sp, 'ADBE Spherize-0002', center(c));
            sym(c, UK.p(sp, 'ADBE Spherize-0001'), 0, c.comp.width * 0.55 * UK.clamp(c.strength, 0.3, 1.8), 'Radius', c.ease);
        }
    });

    // ============================================================ ТИП 2: слои A/B
    UK.add({
        id: 'trans.push', cat: 'trans', needs: 'trans', name: 'Push · Сдвиг',
        desc: 'Исходящий кадр выталкивается за край, входящий въезжает следом (по направлению).',
        tags: 'push slide move сдвиг',
        apply: function (c) {
            need(c);
            var s, pos, base;
            if (c.A) {
                pos = c.A.transform.position; base = pos.valueAtTime(c.cut, false); s = tA(c);
                UK.key2(pos, s[0], base, s[1], UK.vecAdd(base, UK.vecMul(c.dirV, UK.exitDistance(c.A, c.comp, c.dirV, c.cut))), c.ease, true);
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                pos = c.B.transform.position; base = pos.valueAtTime(c.t1, false); s = tB(c);
                var back = UK.vecMul(c.dirV, -1);
                UK.key2(pos, s[0], UK.vecAdd(base, UK.vecMul(back, UK.exitDistance(c.B, c.comp, back, c.cut))), s[1], base, c.ease);
                UK.applyEaseExpr(pos, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.slideCover', cat: 'trans', needs: 'trans', name: 'Slide Cover · Наезд сверху',
        desc: 'Входящий кадр наезжает и накрывает исходящий.',
        tags: 'slide cover over наезд',
        apply: function (c) {
            need(c);
            if (!c.B) { c.B = c.A; }
            var pos = c.B.transform.position, base = pos.valueAtTime(c.t1, false), s = tB(c);
            var back = UK.vecMul(c.dirV, -1);
            UK.key2(pos, s[0], UK.vecAdd(base, UK.vecMul(back, UK.exitDistance(c.B, c.comp, back, c.cut))), s[1], base, c.ease);
            UK.applyEaseExpr(pos, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
            UK.motionBlur(c.B, c.comp);
        }
    });
    UK.add({
        id: 'trans.slideReveal', cat: 'trans', needs: 'trans', name: 'Slide Reveal · Уход в сторону',
        desc: 'Исходящий кадр уезжает за край, открывая входящий.',
        tags: 'slide reveal uncover уход',
        apply: function (c) {
            need(c);
            if (!c.A) { c.A = c.B; }
            var pos = c.A.transform.position, base = pos.valueAtTime(c.cut, false), s = tA(c);
            UK.key2(pos, s[0], base, s[1], UK.vecAdd(base, UK.vecMul(c.dirV, UK.exitDistance(c.A, c.comp, c.dirV, c.cut))), c.ease, true);
            UK.motionBlur(c.A, c.comp);
        }
    });
    UK.add({
        id: 'trans.flip3D', cat: 'trans', needs: 'trans', name: '3D Flip · Переворот',
        desc: 'Кадры переворачиваются как карточка (3D). Направление задаёт ось и сторону.',
        tags: '3d flip card rotate переворот',
        apply: function (c) {
            need(c);
            var sg = sgn(c), s, rp;
            if (c.A) {
                UK.to3D(c.A); s = tA(c);
                rp = horiz(c) ? c.A.transform.yRotation : c.A.transform.xRotation;
                UK.key2(rp, s[0], rp.valueAtTime(s[0], false), s[1], rp.valueAtTime(s[0], false) + 90 * sg, c.ease, true);
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                UK.to3D(c.B); s = tB(c);
                rp = horiz(c) ? c.B.transform.yRotation : c.B.transform.xRotation;
                var end = rp.valueAtTime(s[1], false);
                UK.key2(rp, s[0], end - 90 * sg, s[1], end, c.ease);
                UK.applyEaseExpr(rp, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.scaleSwap', cat: 'trans', needs: 'trans', name: 'Scale Swap · Смена масштабом',
        desc: 'Исходящий уменьшается и тает, входящий вырастает из центра.',
        tags: 'scale swap grow shrink масштаб',
        apply: function (c) {
            need(c);
            var s, sc, base;
            if (c.A) {
                sc = c.A.transform.scale; base = sc.valueAtTime(c.cut, false); s = tA(c);
                UK.key2(sc, s[0], base, s[1], UK.vecMul(base, UK.clamp(1 - 0.6 * c.strength, 0, 1)), c.ease, true);
                fadeOutA(c);
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                sc = c.B.transform.scale; base = sc.valueAtTime(c.t1, false); s = tB(c);
                UK.key2(sc, s[0], UK.vecMul(base, UK.clamp(1 - 0.8 * c.strength, 0, 1)), s[1], base, c.ease);
                UK.applyEaseExpr(sc, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                fadeInB(c, s[0] + (s[1] - s[0]) * 0.5);
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.rotateSwap', cat: 'trans', needs: 'trans', name: 'Rotate Swap · Смена поворотом',
        desc: 'Исходящий уходит с поворотом и уменьшением, входящий вкручивается.',
        tags: 'rotate swap spin поворот',
        apply: function (c) {
            need(c);
            var sg = sgn(c), s, rot, sc, base;
            if (c.A) {
                s = tA(c); rot = c.A.transform.rotation; sc = c.A.transform.scale; base = sc.valueAtTime(c.cut, false);
                UK.key2(rot, s[0], rot.valueAtTime(s[0], false), s[1], rot.valueAtTime(s[0], false) + 90 * sg * c.strength, c.ease, true);
                UK.key2(sc, s[0], base, s[1], UK.vecMul(base, 0.4), c.ease, true);
                fadeOutA(c);
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                s = tB(c); rot = c.B.transform.rotation; sc = c.B.transform.scale; base = sc.valueAtTime(c.t1, false);
                var endR = rot.valueAtTime(s[1], false);
                UK.key2(rot, s[0], endR - 90 * sg * c.strength, s[1], endR, c.ease);
                UK.key2(sc, s[0], UK.vecMul(base, 0.4), s[1], base, c.ease);
                UK.applyEaseExpr(rot, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                fadeInB(c, s[0] + (s[1] - s[0]) * 0.4);
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.crossfade', cat: 'trans', needs: 'trans', name: 'Crossfade · Наплыв',
        desc: 'Классический наплыв по прозрачности.',
        tags: 'crossfade dissolve opacity наплыв',
        apply: function (c) {
            need(c);
            var s, op;
            if (c.B) { s = tB(c); op = c.B.transform.opacity; UK.key2(op, s[0], 0, s[1], op.valueAtTime(s[1], false), c.ease); }
            if (c.A) { s = tA(c); op = c.A.transform.opacity; UK.key2(op, s[0], op.valueAtTime(s[0], false), s[1], 0, c.ease, true); }
        }
    });
    UK.add({
        id: 'trans.blurFade', cat: 'trans', needs: 'trans', name: 'Blur Fade · Наплыв с размытием',
        desc: 'Наплыв, при котором кадры расфокусируются.',
        tags: 'blur fade dissolve focus размытие наплыв',
        apply: function (c) {
            need(c);
            var s, g, op;
            if (c.B) {
                s = tB(c); g = UK.addFx(c.B, 'ADBE Gaussian Blur 2', 'Blur'); UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
                UK.key2(UK.p(g, 'ADBE Gaussian Blur 2-0001'), s[0], 80 * c.strength, s[1], 0, c.ease);
                op = c.B.transform.opacity; UK.key2(op, s[0], 0, s[1], op.valueAtTime(s[1], false), c.ease);
            }
            if (c.A) {
                s = tA(c); g = UK.addFx(c.A, 'ADBE Gaussian Blur 2', 'Blur'); UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
                UK.key2(UK.p(g, 'ADBE Gaussian Blur 2-0001'), s[0], 0, s[1], 80 * c.strength, c.ease, true);
                op = c.A.transform.opacity; UK.key2(op, s[0], op.valueAtTime(s[0], false), s[1], 0, c.ease, true);
            }
        }
    });
    UK.add({
        id: 'trans.zoomThrough', cat: 'trans', needs: 'trans', name: 'Zoom Through · Сквозной зум',
        desc: 'Входящий кадр прилетает из глубины (масштаб 300→100 с размытием), исходящий уходит вглубь.',
        tags: 'zoom through fly дальний зум',
        apply: function (c) {
            need(c);
            var s, sc, base, g;
            if (c.B) {
                s = tB(c); sc = c.B.transform.scale; base = sc.valueAtTime(c.t1, false);
                UK.key2(sc, s[0], UK.vecMul(base, 1 + 2 * c.strength), s[1], base, c.ease);
                UK.applyEaseExpr(sc, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                g = UK.addFx(c.B, 'ADBE Gaussian Blur 2', 'Blur'); UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
                UK.key2(UK.p(g, 'ADBE Gaussian Blur 2-0001'), s[0], 60 * c.strength, s[1], 0, 'expoOut');
                fadeInB(c, s[0] + (s[1] - s[0]) * 0.35);
                UK.motionBlur(c.B, c.comp);
            }
            if (c.A) {
                s = tA(c); sc = c.A.transform.scale; base = sc.valueAtTime(c.cut, false);
                UK.key2(sc, s[0], base, s[1], UK.vecMul(base, UK.clamp(1 - 0.7 * c.strength, 0.05, 1)), c.ease, true);
                g = UK.addFx(c.A, 'ADBE Gaussian Blur 2', 'Blur'); UK.set(g, 'ADBE Gaussian Blur 2-0003', 1);
                UK.key2(UK.p(g, 'ADBE Gaussian Blur 2-0001'), s[0], 0, s[1], 40 * c.strength, 'expoIn');
                fadeOutA(c, s[0] + (s[1] - s[0]) * 0.5);
                UK.motionBlur(c.A, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.squeeze', cat: 'trans', needs: 'trans', name: 'Squeeze · Сжатие',
        desc: 'Исходящий сжимается в полоску по направлению, входящий разжимается из неё.',
        tags: 'squeeze squash stretch сжатие',
        apply: function (c) {
            need(c);
            var s, sc, base, idx = horiz(c) ? 0 : 1, v;
            if (c.A) {
                s = tA(c); sc = c.A.transform.scale; base = sc.valueAtTime(c.cut, false);
                v = base.slice(); v[idx] = 0;
                UK.key2(sc, s[0], base, s[1], v, 'expoIn');
                UK.motionBlur(c.A, c.comp);
            }
            if (c.B) {
                s = tB(c); sc = c.B.transform.scale; base = sc.valueAtTime(c.t1, false);
                v = base.slice(); v[idx] = 0;
                UK.key2(sc, s[0], v, s[1], base, 'expoOut');
                UK.applyEaseExpr(sc, c.ease, { strength: c.strength, opts: c.opts, layer: c.B });
                UK.motionBlur(c.B, c.comp);
            }
        }
    });
    UK.add({
        id: 'trans.linearWipe', cat: 'trans', needs: 'trans', name: 'Linear Wipe · Шторка',
        desc: 'Линейная шторка по направлению с мягким краем.',
        tags: 'wipe linear шторка',
        apply: function (c) {
            var ang = { L: 90, R: 270, U: 0, D: 180 }[c.dirId];
            wipePair(c, 'ADBE Linear Wipe', 'Wipe', 'ADBE Linear Wipe-0001', function (fx) {
                UK.set(fx, 'ADBE Linear Wipe-0002', ang);
                UK.set(fx, 'ADBE Linear Wipe-0003', 40 * c.strength);
            });
        }
    });
    UK.add({
        id: 'trans.radialWipe', cat: 'trans', needs: 'trans', name: 'Radial Wipe · Часы',
        desc: 'Радиальная шторка «часами» от центра.',
        tags: 'wipe radial clock часы',
        apply: function (c) {
            wipePair(c, 'ADBE Radial Wipe', 'Radial Wipe', 'ADBE Radial Wipe-0001', function (fx, L) {
                UK.set(fx, 'ADBE Radial Wipe-0003', lcenter(L, c));
                UK.set(fx, 'ADBE Radial Wipe-0004', sgn(c) < 0 ? 2 : 1);
                UK.set(fx, 'ADBE Radial Wipe-0005', 30 * c.strength);
            });
        }
    });
    UK.add({
        id: 'trans.blinds', cat: 'trans', needs: 'trans', name: 'Venetian Blinds · Жалюзи',
        desc: 'Жалюзи по направлению; Сила — ширина полос.',
        tags: 'blinds venetian stripes жалюзи',
        apply: function (c) {
            wipePair(c, 'ADBE Venetian Blinds', 'Blinds', 'ADBE Venetian Blinds-0001', function (fx) {
                UK.set(fx, 'ADBE Venetian Blinds-0002', horiz(c) ? 90 : 0);
                UK.set(fx, 'ADBE Venetian Blinds-0003', Math.max(10, 80 * c.strength));
                UK.set(fx, 'ADBE Venetian Blinds-0004', 6);
            });
        }
    });
    UK.add({
        id: 'trans.blockDissolve', cat: 'trans', needs: 'trans', name: 'Block Dissolve · Блоки',
        desc: 'Растворение квадратными блоками; Сила — размер блока.',
        tags: 'block dissolve pixel блоки',
        apply: function (c) {
            wipePair(c, 'ADBE Block Dissolve', 'Blocks', 'ADBE Block Dissolve-0001', function (fx) {
                var b = Math.max(4, 60 * c.strength);
                UK.set(fx, 'ADBE Block Dissolve-0002', b);
                UK.set(fx, 'ADBE Block Dissolve-0003', b);
                UK.set(fx, 'ADBE Block Dissolve-0004', 0);
                UK.set(fx, 'ADBE Block Dissolve-0005', 0);
            });
        }
    });
    UK.add({
        id: 'trans.irisWipe', cat: 'trans', needs: 'trans', name: 'Iris Wipe · Диафрагма',
        desc: 'Круглая диафрагма раскрывается из центра (и закрывается на исходящем).',
        tags: 'iris circle wipe диафрагма круг',
        apply: function (c) {
            need(c);
            var fx, s, sz, R;
            if (c.B) {
                sz = lsz(c.B, c); R = Math.sqrt(sz[0] * sz[0] + sz[1] * sz[1]) / 2 * 1.05;
                fx = UK.addFx(c.B, 'ADBE Iris Wipe', 'Iris');
                UK.set(fx, 'ADBE Iris Wipe-0001', lcenter(c.B, c));
                UK.set(fx, 'ADBE Iris Wipe-0002', 32);
                UK.set(fx, 'ADBE Iris Wipe-0007', 40 * c.strength);
                s = tB(c);
                UK.key2(UK.p(fx, 'ADBE Iris Wipe-0003'), s[0], 0, s[1], R, c.ease);
            }
            if (c.A) {
                sz = lsz(c.A, c); R = Math.sqrt(sz[0] * sz[0] + sz[1] * sz[1]) / 2 * 1.05;
                fx = UK.addFx(c.A, 'ADBE Iris Wipe', 'Iris');
                UK.set(fx, 'ADBE Iris Wipe-0001', lcenter(c.A, c));
                UK.set(fx, 'ADBE Iris Wipe-0002', 32);
                UK.set(fx, 'ADBE Iris Wipe-0007', 40 * c.strength);
                s = tA(c);
                UK.key2(UK.p(fx, 'ADBE Iris Wipe-0003'), s[0], R, s[1], 0, c.ease, true);
            }
        }
    });
    UK.add({
        id: 'trans.gridWipe', cat: 'trans', needs: 'trans', name: 'Grid Wipe · Сетка',
        desc: 'Плитки сетки раскрываются (CC Grid Wipe). Сила — размер плиток.',
        tags: 'grid wipe tiles сетка плитки',
        apply: function (c) {
            wipePair(c, 'CC Grid Wipe', 'Grid Wipe', 'CC Grid Wipe-0001', function (fx, L) {
                UK.set(fx, 'CC Grid Wipe-0002', lcenter(L, c));
                UK.set(fx, 'CC Grid Wipe-0005', Math.max(4, Math.round(12 / UK.clamp(c.strength, 0.3, 3))));
                UK.set(fx, 'CC Grid Wipe-0006', 2);
            });
        }
    });
    UK.add({
        id: 'trans.jaws', cat: 'trans', needs: 'trans', name: 'Jaws · Зубья',
        desc: 'Зубчатые челюсти смыкаются/размыкаются (CC Jaws).',
        tags: 'jaws teeth zigzag зубья',
        apply: function (c) {
            wipePair(c, 'CC Jaws', 'Jaws', 'CC Jaws-0001', function (fx, L) {
                UK.set(fx, 'CC Jaws-0002', lcenter(L, c));
                UK.set(fx, 'CC Jaws-0003', horiz(c) ? 90 : 0);
                UK.set(fx, 'CC Jaws-0004', 20 * c.strength);
                UK.set(fx, 'CC Jaws-0005', 15 * c.strength);
                UK.set(fx, 'CC Jaws-0006', 3);
            });
        }
    });
    UK.add({
        id: 'trans.lightWipe', cat: 'trans', needs: 'trans', name: 'Light Wipe · Световая шторка',
        desc: 'Светящаяся шторка (CC Light Wipe) с засветкой по краю.',
        tags: 'light wipe glow световая шторка',
        apply: function (c) {
            wipePair(c, 'CC Light Wipe', 'Light Wipe', 'CC Light Wipe-0001', function (fx, L) {
                UK.set(fx, 'CC Light Wipe-0002', lcenter(L, c));
                UK.set(fx, 'CC Light Wipe-0003', 80 * c.strength);
                UK.set(fx, 'CC Light Wipe-0004', 2);
                UK.set(fx, 'CC Light Wipe-0005', horiz(c) ? 90 : 0);
                UK.set(fx, 'CC Light Wipe-0007', [1, 1, 1, 1]);
            });
        }
    });
    UK.add({
        id: 'trans.lineSweep', cat: 'trans', needs: 'trans', name: 'Line Sweep · Линейная шторка',
        desc: 'Шторка с наклоном и ступеньками (CC Line Sweep).',
        tags: 'line sweep wipe шторка наклон',
        apply: function (c) {
            wipePair(c, 'CC Line Sweep', 'Line Sweep', ['Completion', 'CC Line Sweep-0001'], function (fx) {
                UK.set(fx, 'CC Line Sweep-0002', { L: 90, R: 270, U: 0, D: 180 }[c.dirId]);
                UK.set(fx, 'CC Line Sweep-0003', Math.max(5, 40 * c.strength));
                UK.set(fx, 'CC Line Sweep-0004', 30);
            });
        }
    });
    UK.add({
        id: 'trans.radialScaleWipe', cat: 'trans', needs: 'trans', name: 'Radial Scale Wipe · Воронка',
        desc: 'Кадр втягивается в воронку / выходит из неё (CC Radial ScaleWipe).',
        tags: 'radial scale wipe vortex воронка',
        apply: function (c) {
            wipePair(c, 'CC Radial ScaleWipe', 'Radial Scale', 'CC Radial ScaleWipe-0001', function (fx, L) {
                UK.set(fx, 'CC Radial ScaleWipe-0002', lcenter(L, c));
            });
        }
    });
    UK.add({
        id: 'trans.scaleWipe', cat: 'trans', needs: 'trans', name: 'Scale Wipe · Растяжка за край',
        desc: 'Кадр растягивается за край по направлению (CC Scale Wipe) и тает.',
        tags: 'scale wipe stretch растяжка',
        apply: function (c) {
            need(c);
            var fx, s, dirDeg = { L: 270, R: 90, U: 0, D: 180 }[c.dirId];
            if (c.A) {
                fx = UK.addFx(c.A, 'CC Scale Wipe', 'Scale Wipe');
                UK.set(fx, 'CC Scale Wipe-0002', lcenter(c.A, c));
                UK.set(fx, 'CC Scale Wipe-0003', dirDeg);
                s = tA(c);
                UK.key2(UK.p(fx, 'CC Scale Wipe-0001'), s[0], 0, s[1], 30 * c.strength, 'expoIn');
                fadeOutA(c, s[0] + (s[1] - s[0]) * 0.5);
            }
            if (c.B) {
                fx = UK.addFx(c.B, 'CC Scale Wipe', 'Scale Wipe');
                UK.set(fx, 'CC Scale Wipe-0002', lcenter(c.B, c));
                UK.set(fx, 'CC Scale Wipe-0003', (dirDeg + 180) % 360);
                s = tB(c);
                UK.key2(UK.p(fx, 'CC Scale Wipe-0001'), s[0], 30 * c.strength, s[1], 0, 'expoOut');
                fadeInB(c, s[0] + (s[1] - s[0]) * 0.5);
            }
        }
    });
    UK.add({
        id: 'trans.twister', cat: 'trans', needs: 'trans', name: 'Twister · Скрутка',
        desc: 'Кадр скручивается в жгут и раскручивается (CC Twister).',
        tags: 'twister twist roll скрутка',
        apply: function (c) {
            wipePair(c, 'CC Twister', 'Twister', 'CC Twister-0005', function (fx, L) {
                UK.set(fx, 'CC Twister-0002', 1);
                UK.set(fx, 'CC Twister-0003', lcenter(L, c));
                UK.set(fx, 'CC Twister-0004', horiz(c) ? 0 : 90);
            });
        }
    });
    UK.add({
        id: 'trans.slideBlur', cat: 'trans', needs: 'trans', name: 'Slide Blur · Сдвиг с размытием',
        desc: 'Push-сдвиг слоёв с направленным размытием на каждом слое.',
        tags: 'slide blur push сдвиг размытие',
        apply: function (c) {
            need(c);
            var s, pos, base, mb, dd = horiz(c) ? 90 : 0;
            if (c.A) {
                pos = c.A.transform.position; base = pos.valueAtTime(c.cut, false); s = tA(c);
                UK.key2(pos, s[0], base, s[1], UK.vecAdd(base, UK.vecMul(c.dirV, UK.exitDistance(c.A, c.comp, c.dirV, c.cut))), 'expoIn');
                mb = UK.addFx(c.A, 'ADBE Motion Blur', 'Blur'); UK.set(mb, 'ADBE Motion Blur-0001', dd);
                UK.key2(UK.p(mb, 'ADBE Motion Blur-0002'), s[0], 0, s[1], 150 * c.strength, 'expoIn');
            }
            if (c.B) {
                pos = c.B.transform.position; base = pos.valueAtTime(c.t1, false); s = tB(c);
                var back = UK.vecMul(c.dirV, -1);
                UK.key2(pos, s[0], UK.vecAdd(base, UK.vecMul(back, UK.exitDistance(c.B, c.comp, back, c.cut))), s[1], base, 'expoOut');
                mb = UK.addFx(c.B, 'ADBE Motion Blur', 'Blur'); UK.set(mb, 'ADBE Motion Blur-0001', dd);
                UK.key2(UK.p(mb, 'ADBE Motion Blur-0002'), s[0], 150 * c.strength, s[1], 0, 'expoOut');
            }
        }
    });
    UK.add({
        id: 'trans.stripes', cat: 'trans', needs: 'trans', name: 'Stripe Slide · Полосы',
        desc: 'Корр. слой: кадр разрезается на полосы Venetian Blinds с размытием и сдвигом по направлению.',
        tags: 'stripes blinds slide полосы',
        apply: function (c) {
            var r = adjTT(c, 'Stripes', true);
            var vb = UK.addFx(r.adj, 'ADBE Venetian Blinds', 'Blinds');
            UK.set(vb, 'ADBE Venetian Blinds-0002', horiz(c) ? 0 : 90);
            UK.set(vb, 'ADBE Venetian Blinds-0003', Math.max(20, c.comp.height / 8));
            UK.set(vb, 'ADBE Venetian Blinds-0004', 4);
            sym(c, UK.p(vb, 'ADBE Venetian Blinds-0001'), 0, UK.clamp(55 * c.strength, 0, 95), 'Blinds', c.ease);
            var pos = UK.p(r.tf, 'ADBE Geometry2-0002');
            sym(c, pos, pos.value, UK.vecMul(c.dirV, 120 * c.strength), 'Shift', c.ease);
            dirBlur(c, r.adj, 80 * c.strength);
        }
    });

})();


// ---- src/presets/50_fx.jsx
// =============================================================================
//  Библиотека: Эффекты и луки (cat: 'fx')
// =============================================================================
(function () {

    // ---------------------------------------------------------------- хелперы
    function col(r, g, b) { return [r, g, b, 1]; }
    function hexc(s) { var c = UK.hex(s); return [c[0], c[1], c[2], 1]; }
    function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
    function layerRef(l) { return 'thisComp.layer("' + esc(l.name) + '")'; }
    function isAV(l) { return l instanceof AVLayer; }
    function lw(c) {
        var w = 0, h = 0;
        try { w = c.layer.width; h = c.layer.height; } catch (e) {}
        if (!w || !h) { w = c.comp.width; h = c.comp.height; }
        return [w, h];
    }
    /** Слайдер «Amount» лука: ссылка либо null (если контролы выключены). */
    function amtRef(c, name) { return c.opts.controls ? UK.cv(c, name, 100) : null; }
    /** Значение параметра лука, масштабируемое слайдером Amount. */
    function look(fx, prop, value, amt) {
        UK.set(fx, prop, value);
        if (amt) UK.expr(fx, prop, UK.fmt(value, 3) + ' * ' + amt + ' / 100');
    }
    /** Параметр под своим слайдером. */
    function drive(c, fx, prop, name, value) {
        UK.set(fx, prop, value);
        if (c.opts.controls) UK.expr(fx, prop, UK.cv(c, name, value));
    }
    function driveColor(c, fx, prop, name, value) {
        UK.set(fx, prop, value);
        if (c.opts.controls) { UK.color(c.layer, name, value); UK.expr(fx, prop, UK.ref(name, 'color')); }
    }
    function drivePoint(c, fx, prop, name, value) {
        UK.set(fx, prop, value);
        if (c.opts.controls) { UK.point(c.layer, name, value); UK.expr(fx, prop, UK.ref(name, 'point')); }
    }
    /** Слайдер на произвольном слое (для дублей и карт). */
    function cvOn(c, layer, name, value) {
        if (c.opts.controls) { UK.slider(layer, name, value); return UK.ref(name); }
        return String(UK.fmt(value, 4));
    }
    function dirAngle(c) { return { L: 270, R: 90, U: 0, D: 180 }[c.dirId] || 0; }

    // ================================================================ ЛУКИ
    UK.add({
        id: 'fx.tealOrange', cat: 'fx', name: 'Teal & Orange · Кинолук',
        desc: 'Бирюзовые тени, оранжевые света, чуть сочнее. Слайдер Amount — сила лука.',
        tags: 'teal orange cinematic color grade цветокор кино',
        apply: function (c) {
            var amt = amtRef(c, 'Teal&Orange Amount'), k = c.strength;
            var cb = UK.addFx(c.layer, 'ADBE Color Balance 2', 'Teal & Orange');
            look(cb, 'ADBE Color Balance 2-0001', -12 * k, amt);
            look(cb, 'ADBE Color Balance 2-0002', 4 * k, amt);
            look(cb, 'ADBE Color Balance 2-0003', 22 * k, amt);
            look(cb, 'ADBE Color Balance 2-0004', 6 * k, amt);
            look(cb, 'ADBE Color Balance 2-0006', -4 * k, amt);
            look(cb, 'ADBE Color Balance 2-0007', 22 * k, amt);
            look(cb, 'ADBE Color Balance 2-0008', 6 * k, amt);
            look(cb, 'ADBE Color Balance 2-0009', -18 * k, amt);
            UK.set(cb, 'ADBE Color Balance 2-0010', 1);
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'Vibrance');
            look(vb, 'ADBE Vibrance-0001', 25 * k, amt);
        }
    });

    UK.add({
        id: 'fx.cinematic', cat: 'fx', name: 'Cinematic Contrast · Киноконтраст',
        desc: 'Контраст, чуть приглушённая насыщенность и виньетка.',
        tags: 'cinematic contrast vignette кино контраст',
        apply: function (c) {
            var amt = amtRef(c, 'Cinematic Amount'), k = c.strength;
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0001', -4 * k, amt);
            look(bc, 'ADBE Brightness & Contrast 2-0002', 22 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var vb = UK.addFx(c.layer, 'ADBE Vibrance', 'Vibrance');
            look(vb, 'ADBE Vibrance-0001', 15 * k, amt);
            look(vb, 'ADBE Vibrance-0002', -10 * k, amt);
            var vg = UK.addFx(c.layer, 'CC Vignette', 'Vignette');
            look(vg, 'CC Vignette-0001', 45 * k, amt);
            UK.set(vg, 'CC Vignette-0002', 60);
            UK.set(vg, 'CC Vignette-0004', 0);
        }
    });

    UK.add({
        id: 'fx.vintage', cat: 'fx', name: 'Vintage Faded · Выцветший матовый',
        desc: 'Приподнятые тени, тёплый оттенок, лёгкий шум.',
        tags: 'vintage faded matte retro ретро винтаж',
        apply: function (c) {
            var amt = amtRef(c, 'Vintage Amount'), k = c.strength;
            var tn = UK.addFx(c.layer, 'ADBE Tint', 'Warm Tint');
            UK.set(tn, 'ADBE Tint-0001', col(0.16, 0.12, 0.10));
            UK.set(tn, 'ADBE Tint-0002', col(1, 0.95, 0.85));
            look(tn, 'ADBE Tint-0003', 35 * k, amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Fade');
            look(bc, 'ADBE Brightness & Contrast 2-0001', 8 * k, amt);
            look(bc, 'ADBE Brightness & Contrast 2-0002', -18 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'Grain');
            look(nz, 'ADBE Noise2-0001', 6 * k, amt);
            UK.set(nz, 'ADBE Noise2-0002', 0);
            UK.set(nz, 'ADBE Noise2-0003', 1);
        }
    });

    UK.add({
        id: 'fx.bwContrast', cat: 'fx', name: 'B&W High Contrast · Чёрно-белый',
        desc: 'Контрастное ч/б с акцентом на красные/жёлтые.',
        tags: 'black white bw monochrome чб чёрно-белый',
        apply: function (c) {
            var amt = amtRef(c, 'B&W Contrast'), k = c.strength;
            var bw = UK.addFx(c.layer, 'ADBE Black&White', 'B&W');
            UK.set(bw, 'ADBE Black&White-0001', 60); UK.set(bw, 'ADBE Black&White-0002', 70);
            UK.set(bw, 'ADBE Black&White-0003', 30); UK.set(bw, 'ADBE Black&White-0004', 50);
            UK.set(bw, 'ADBE Black&White-0005', 10); UK.set(bw, 'ADBE Black&White-0006', 60);
            UK.set(bw, 'ADBE Black&White-0007', 0);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0002', 30 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.sepia', cat: 'fx', name: 'Sepia · Сепия',
        desc: 'Классическая сепия. Amount — степень тонирования.',
        tags: 'sepia old brown сепия',
        apply: function (c) {
            var tn = UK.addFx(c.layer, 'ADBE Tint', 'Sepia');
            UK.set(tn, 'ADBE Tint-0001', col(0.12, 0.07, 0.03));
            UK.set(tn, 'ADBE Tint-0002', col(1, 0.93, 0.8));
            drive(c, tn, 'ADBE Tint-0003', 'Sepia Amount', UK.clamp(85 * c.strength, 0, 100));
        }
    });

    UK.add({
        id: 'fx.duotone', cat: 'fx', name: 'Duotone · Дуотон',
        desc: 'Два цвета (тени/света) — меняются через Color Control.',
        tags: 'duotone two tone gradient map дуотон',
        apply: function (c) {
            var tt = UK.addFx(c.layer, 'ADBE Tritone', 'Duotone');
            driveColor(c, tt, 'ADBE Tritone-0001', 'Duotone Light', hexc('F6D365'));
            driveColor(c, tt, 'ADBE Tritone-0002', 'Duotone Mid', hexc('B04E9A'));
            driveColor(c, tt, 'ADBE Tritone-0003', 'Duotone Dark', hexc('1B1464'));
            drive(c, tt, 'ADBE Tritone-0004', 'Duotone Blend', UK.clamp(100 - 100 * c.strength, 0, 100));
        }
    });

    UK.add({
        id: 'fx.crossProcess', cat: 'fx', name: 'Cross Process · Кросс-процесс',
        desc: 'Сдвиг каналов как у плёнки, проявленной «не в том» процессе.',
        tags: 'cross process channel mixer film плёнка',
        apply: function (c) {
            var k = c.strength;
            var cm = UK.addFx(c.layer, 'ADBE CHANNEL MIXER', 'Cross Process');
            UK.set(cm, 'ADBE CHANNEL MIXER-0001', 100 + 15 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0002', -10 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0004', -5 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0006', 100 + 8 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0008', 3 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0009', 12 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0011', 100 - 20 * k);
            UK.set(cm, 'ADBE CHANNEL MIXER-0012', 10 * k);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Contrast');
            drive(c, bc, 'ADBE Brightness & Contrast 2-0002', 'Cross Contrast', 15 * k);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.bleach', cat: 'fx', name: 'Bleach Bypass · Обесцвеченный контраст',
        desc: 'Низкая насыщенность, высокий контраст (как «Спасти рядового Райана»).',
        tags: 'bleach bypass desaturate contrast war',
        apply: function (c) {
            var amt = amtRef(c, 'Bleach Amount'), k = c.strength;
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'Desaturate');
            look(hs, 'ADBE HUE SATURATION-0004', -45 * k, amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Contrast');
            look(bc, 'ADBE Brightness & Contrast 2-0002', 35 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.warm', cat: 'fx', name: 'Warm Filter · Тёплый фильтр',
        desc: 'Тёплый фотофильтр (85). Density — плотность.',
        tags: 'warm photo filter orange тёплый',
        apply: function (c) {
            var pf = UK.addFx(c.layer, 'ADBE Photo Filter', 'Warm');
            UK.set(pf, 'ADBE Photo Filter-0001', 1);
            UK.set(pf, 'ADBE Photo Filter-0002', hexc('EC8A00'));
            drive(c, pf, 'ADBE Photo Filter-0003', 'Warm Density', UK.clamp(30 * c.strength, 0, 100));
            UK.set(pf, 'ADBE Photo Filter-0004', 1);
        }
    });

    UK.add({
        id: 'fx.cool', cat: 'fx', name: 'Cool Filter · Холодный фильтр',
        desc: 'Холодный фотофильтр (80). Density — плотность.',
        tags: 'cool photo filter blue холодный синий',
        apply: function (c) {
            var pf = UK.addFx(c.layer, 'ADBE Photo Filter', 'Cool');
            UK.set(pf, 'ADBE Photo Filter-0001', 3);
            UK.set(pf, 'ADBE Photo Filter-0002', hexc('006DFF'));
            drive(c, pf, 'ADBE Photo Filter-0003', 'Cool Density', UK.clamp(30 * c.strength, 0, 100));
            UK.set(pf, 'ADBE Photo Filter-0004', 1);
        }
    });

    UK.add({
        id: 'fx.cyberpunk', cat: 'fx', name: 'Cyberpunk Neon · Неоновый лук',
        desc: 'Маджента/циан тонирование + свечение.',
        tags: 'cyberpunk neon magenta cyan glow киберпанк неон',
        apply: function (c) {
            var k = c.strength;
            var tt = UK.addFx(c.layer, 'ADBE Tritone', 'Neon Tone');
            driveColor(c, tt, 'ADBE Tritone-0001', 'Neon Light', hexc('FFF2FF'));
            driveColor(c, tt, 'ADBE Tritone-0002', 'Neon Mid', hexc('E040C8'));
            driveColor(c, tt, 'ADBE Tritone-0003', 'Neon Dark', hexc('0A1F4A'));
            drive(c, tt, 'ADBE Tritone-0004', 'Neon Blend', UK.clamp(100 - 70 * k, 0, 100));
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Neon Glow');
            UK.set(g, 'ADBE Glo2-0002', 55);
            drive(c, g, 'ADBE Glo2-0003', 'Neon Glow Radius', 120);
            drive(c, g, 'ADBE Glo2-0004', 'Neon Glow Intensity', 0.8 * k);
        }
    });

    UK.add({
        id: 'fx.pastel', cat: 'fx', name: 'Pastel · Пастель',
        desc: 'Мягкие светлые тона: меньше контраста и насыщенности, светлее.',
        tags: 'pastel soft bright light пастель',
        apply: function (c) {
            var amt = amtRef(c, 'Pastel Amount'), k = c.strength;
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'Pastel');
            look(hs, 'ADBE HUE SATURATION-0004', -20 * k, amt);
            look(hs, 'ADBE HUE SATURATION-0005', 12 * k, amt);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Soft');
            look(bc, 'ADBE Brightness & Contrast 2-0002', -22 * k, amt);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.colorPop', cat: 'fx', name: 'Color Pop · Оставить один цвет',
        desc: 'Всё ч/б, кроме выбранного цвета (Color Control «Keep Color»).',
        tags: 'leave color pop selective исключить цвет',
        apply: function (c) {
            var lc = UK.addFx(c.layer, 'ADBE Leave Color', 'Color Pop');
            drive(c, lc, 'ADBE Leave Color-0001', 'Decolor Amount', UK.clamp(100 * c.strength, 0, 100));
            driveColor(c, lc, 'ADBE Leave Color-0002', 'Keep Color', hexc('E53935'));
            drive(c, lc, 'ADBE Leave Color-0003', 'Keep Tolerance', 25);
            UK.set(lc, 'ADBE Leave Color-0004', 15);
            UK.set(lc, 'ADBE Leave Color-0005', 2);
        }
    });

    UK.add({
        id: 'fx.exposure', cat: 'fx', name: 'Exposure · Экспозиция',
        desc: 'Коррекция экспозиции в стопах (Сила 100% = +0.5 EV).',
        tags: 'exposure brightness ev экспозиция яркость',
        apply: function (c) {
            var ex = UK.addFx(c.layer, 'ADBE Exposure2', 'Exposure');
            UK.set(ex, 'ADBE Exposure2-0001', 1);
            drive(c, ex, ['ADBE Exposure2-0003', 'Exposure'], 'Exposure EV', 0.5 * c.strength);
        }
    });

    // ================================================================ СТИЛИЗАЦИЯ
    UK.add({
        id: 'fx.vhs', cat: 'fx', name: 'VHS · Видеокассета',
        desc: 'Шум, цветовое смазывание, лёгкая волна и строчки.',
        tags: 'vhs tape retro analog 80s кассета',
        apply: function (c) {
            var k = c.strength;
            var cb = UK.addFx(c.layer, 'ADBE Channel Blur', 'VHS Color Bleed');
            drive(c, cb, 'ADBE Channel Blur-0001', 'VHS Bleed', 12 * k);
            UK.set(cb, 'ADBE Channel Blur-0003', 4 * k);
            UK.set(cb, 'ADBE Channel Blur-0005', 1);
            UK.set(cb, 'ADBE Channel Blur-0006', 2);
            var ww = UK.addFx(c.layer, 'ADBE Wave Warp', 'VHS Wobble');
            UK.set(ww, 'ADBE Wave Warp-0001', 1);
            drive(c, ww, 'ADBE Wave Warp-0002', 'VHS Wobble', 2 * k);
            UK.set(ww, 'ADBE Wave Warp-0003', 400);
            UK.set(ww, 'ADBE Wave Warp-0004', 0);
            UK.set(ww, 'ADBE Wave Warp-0005', 0.4);
            UK.set(ww, 'ADBE Wave Warp-0006', 1);
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'VHS Noise');
            drive(c, nz, 'ADBE Noise2-0001', 'VHS Noise', 18 * k);
            UK.set(nz, 'ADBE Noise2-0002', 1); UK.set(nz, 'ADBE Noise2-0003', 1);
            var gr = UK.addFx(c.layer, 'ADBE Grid', 'VHS Scanlines');
            UK.set(gr, 'ADBE Grid-0002', 3);
            UK.set(gr, 'ADBE Grid-0004', 20000);
            UK.set(gr, 'ADBE Grid-0005', 4);
            UK.set(gr, 'ADBE Grid-0006', 2);
            UK.set(gr, 'ADBE Grid-0011', col(0, 0, 0));
            drive(c, gr, 'ADBE Grid-0012', 'VHS Scanlines Opacity', 22 * k);
            UK.set(gr, ['ADBE Grid-0013', 'Blending Mode'], 2);
            var hs = UK.addFx(c.layer, 'ADBE HUE SATURATION', 'VHS Saturation');
            UK.set(hs, 'ADBE HUE SATURATION-0004', 15 * k);
        }
    });

    UK.add({
        id: 'fx.filmGrain', cat: 'fx', name: 'Film Grain (Noise) · Зерно',
        desc: 'Монохромное зерно через Noise — быстрое в рендере.',
        tags: 'grain noise film зерно шум',
        apply: function (c) {
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'Film Grain');
            drive(c, nz, 'ADBE Noise2-0001', 'Grain Amount', 12 * c.strength);
            UK.set(nz, 'ADBE Noise2-0002', 0);
            UK.set(nz, 'ADBE Noise2-0003', 1);
        }
    });

    UK.add({
        id: 'fx.addGrain', cat: 'fx', name: 'Film Grain (Add Grain) · Плёночное зерно',
        desc: 'Настоящее плёночное зерно (Add Grain, Final Output). Тяжелее в рендере.',
        tags: 'add grain film stock зерно плёнка',
        apply: function (c) {
            var g = UK.addFx(c.layer, 'VISINF Grain Implant', 'Add Grain');
            UK.set(g, ['Viewing Mode'], 3);
            drive(c, g, ['Intensity'], 'Grain Intensity', 0.8 * c.strength);
            drive(c, g, ['Size'], 'Grain Size', 1.0);
            UK.set(g, ['Softness'], 0.6);
        }
    });

    UK.add({
        id: 'fx.vignette', cat: 'fx', name: 'Vignette · Виньетка',
        desc: 'Затемнение краёв. Amount — сила, Angle — ширина.',
        tags: 'vignette dark edges виньетка',
        apply: function (c) {
            var vg = UK.addFx(c.layer, 'CC Vignette', 'Vignette');
            drive(c, vg, 'CC Vignette-0001', 'Vignette Amount', 60 * c.strength);
            drive(c, vg, 'CC Vignette-0002', 'Vignette Angle', 65);
            UK.set(vg, 'CC Vignette-0003', [c.comp.width / 2, c.comp.height / 2]);
            UK.set(vg, 'CC Vignette-0004', 0);
        }
    });

    UK.add({
        id: 'fx.letterbox', cat: 'fx', name: 'Letterbox 2.35 · Киношные полосы',
        desc: 'Чёрный слой с полосами сверху и снизу на время слоя. Высота полос — слайдер на слое полос.',
        tags: 'letterbox cinemascope bars 2.35 полосы',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height;
            var bar = Math.round((H - W / 2.35) / 2);
            if (bar < 4) bar = Math.round(H * 0.12);
            var s = UK.solid(c.comp, [0, 0, 0], 'Letterbox', c.layer.inPoint, c.layer.outPoint);
            var m = s.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
            var sh = new Shape();
            sh.vertices = [[0, bar], [W, bar], [W, H - bar], [0, H - bar]];
            sh.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.closed = true;
            m.property('ADBE Mask Shape').setValue(sh);
            m.inverted = true;
            m.name = UK.PREFIX + 'Letterbox Cutout';
            if (c.opts.controls) {
                var ref = cvOn(c, s, 'Bar Height', bar);
                m.property('ADBE Mask Shape').expression =
                    'var h = ' + ref + ';\n' +
                    'var w = thisLayer.width, hh = thisLayer.height;\n' +
                    'createPath([[0, h], [w, h], [w, hh - h], [0, hh - h]], [], [], true);';
            }
        }
    });

    UK.add({
        id: 'fx.chromatic', cat: 'fx', name: 'Chromatic Aberration · Хроматика',
        desc: 'RGB-разделение тремя копиями слоя (Add). Смещение — слайдер «CA Offset» на исходном слое.',
        tags: 'chromatic aberration rgb split хроматические аберрации',
        apply: function (c) {
            if (!isAV(c.layer)) {
                var cbl = UK.addFx(c.layer, 'ADBE Channel Blur', 'Chromatic');
                drive(c, cbl, 'ADBE Channel Blur-0001', 'CA Offset', 8 * c.strength);
                UK.set(cbl, 'ADBE Channel Blur-0003', 8 * c.strength);
                UK.set(cbl, 'ADBE Channel Blur-0005', 1);
                UK.set(cbl, 'ADBE Channel Blur-0006', 2);
                return;
            }
            var off = 6 * c.strength;
            var ref = c.opts.controls ? layerRef(c.layer) + '.effect("' + UK.CTRL_PREFIX + 'CA Offset")("ADBE Slider Control-0001")' : String(UK.fmt(off, 3));
            if (c.opts.controls) UK.slider(c.layer, 'CA Offset', off);
            var dirX = c.dirV[0] !== 0 ? 1 : 0, dirY = c.dirV[1] !== 0 ? 1 : 0;
            if (!dirX && !dirY) dirX = 1;

            function chan(layer, r, g, b, nick) {
                var sc = UK.addFx(layer, 'ADBE Shift Channels', nick);
                UK.set(sc, 'ADBE Shift Channels-0002', r ? 1 : 10);
                UK.set(sc, 'ADBE Shift Channels-0003', g ? 2 : 10);
                UK.set(sc, 'ADBE Shift Channels-0004', b ? 3 : 10);
                return sc;
            }
            function shift(layer, sign) {
                var tf = UK.addFx(layer, 'ADBE Geometry2', 'CA Shift');
                var p = UK.p(tf, 'ADBE Geometry2-0002');
                var base = p.value;
                p.expression = 'var o = ' + ref + ' * ' + sign + ';\n' +
                    '[' + UK.fmt(base[0], 2) + ' + o * ' + dirX + ', ' + UK.fmt(base[1], 2) + ' + o * ' + dirY + ']';
                UK.set(tf, 'ADBE Geometry2-0010', 0);
            }
            var gL = c.layer.duplicate(); gL.name = UK.PREFIX + 'CA Green';
            var bL = c.layer.duplicate(); bL.name = UK.PREFIX + 'CA Blue';
            chan(c.layer, 1, 0, 0, 'CA Red');
            chan(gL, 0, 1, 0, 'CA Green'); gL.blendingMode = BlendingMode.ADD;
            chan(bL, 0, 0, 1, 'CA Blue'); bL.blendingMode = BlendingMode.ADD;
            shift(gL, 1);
            shift(bL, -1);
        }
    });

    UK.add({
        id: 'fx.sharpen', cat: 'fx', name: 'Sharpen · Резкость',
        desc: 'Unsharp Mask: аккуратная резкость без артефактов.',
        tags: 'sharpen unsharp detail резкость',
        apply: function (c) {
            var us = UK.addFx(c.layer, 'ADBE Unsharp Mask2', 'Sharpen');
            drive(c, us, 'ADBE Unsharp Mask2-0001', 'Sharpen Amount', 60 * c.strength);
            drive(c, us, 'ADBE Unsharp Mask2-0002', 'Sharpen Radius', 1.5);
            UK.set(us, 'ADBE Unsharp Mask2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.bloom', cat: 'fx', name: 'Soft Bloom · Мягкое свечение',
        desc: 'Широкое мягкое свечение светлых областей (dreamy).',
        tags: 'bloom glow soft dreamy свечение',
        apply: function (c) {
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Bloom');
            drive(c, g, 'ADBE Glo2-0002', 'Bloom Threshold', 55);
            drive(c, g, 'ADBE Glo2-0003', 'Bloom Radius', 300);
            drive(c, g, 'ADBE Glo2-0004', 'Bloom Intensity', 0.6 * c.strength);
            UK.set(g, 'ADBE Glo2-0006', 2);
        }
    });

    UK.add({
        id: 'fx.neon', cat: 'fx', name: 'Neon Glow · Неоновое свечение',
        desc: 'Двойное свечение: плотное ядро + широкое гало. Для текста/логотипов.',
        tags: 'neon glow text logo неон',
        apply: function (c) {
            var k = c.strength;
            var g1 = UK.addFx(c.layer, 'ADBE Glo2', 'Neon Core');
            UK.set(g1, 'ADBE Glo2-0001', 2);
            UK.set(g1, 'ADBE Glo2-0002', 30);
            drive(c, g1, 'ADBE Glo2-0003', 'Neon Core Radius', 12);
            drive(c, g1, 'ADBE Glo2-0004', 'Neon Core Intensity', 1.5 * k);
            var g2 = UK.addFx(c.layer, 'ADBE Glo2', 'Neon Halo');
            UK.set(g2, 'ADBE Glo2-0001', 2);
            UK.set(g2, 'ADBE Glo2-0002', 30);
            drive(c, g2, 'ADBE Glo2-0003', 'Neon Halo Radius', 140);
            drive(c, g2, 'ADBE Glo2-0004', 'Neon Halo Intensity', 0.9 * k);
            UK.set(g2, 'ADBE Glo2-0006', 1);
        }
    });

    UK.add({
        id: 'fx.longShadow', cat: 'fx', name: 'Long Shadow · Длинная тень',
        desc: 'Плоская длинная тень (3 ступени). Направление — из настроек.',
        tags: 'long shadow flat тень длинная',
        apply: function (c) {
            var ang = { L: 270, R: 90, U: 0, D: 180 }[c.dirId] || 135;
            ang = (ang + 45) % 360;
            var base = 20 * c.strength;
            var ref = c.opts.controls ? UK.cv(c, 'Shadow Length', base) : null;
            for (var i = 1; i <= 3; i++) {
                var ds = UK.addFx(c.layer, 'ADBE Drop Shadow', 'Long Shadow ' + i);
                UK.set(ds, 'ADBE Drop Shadow-0001', col(0, 0, 0));
                UK.set(ds, 'ADBE Drop Shadow-0002', Math.round(200 / i));
                UK.set(ds, 'ADBE Drop Shadow-0003', ang);
                UK.set(ds, 'ADBE Drop Shadow-0004', base * i);
                if (ref) UK.expr(ds, 'ADBE Drop Shadow-0004', ref + ' * ' + i);
                UK.set(ds, 'ADBE Drop Shadow-0005', 0);
            }
        }
    });

    UK.add({
        id: 'fx.dropShadow', cat: 'fx', name: 'Soft Drop Shadow · Мягкая тень',
        desc: 'Мягкая реалистичная тень.',
        tags: 'drop shadow soft тень',
        apply: function (c) {
            var ds = UK.addFx(c.layer, 'ADBE Drop Shadow', 'Shadow');
            UK.set(ds, 'ADBE Drop Shadow-0001', col(0, 0, 0));
            drive(c, ds, 'ADBE Drop Shadow-0002', 'Shadow Opacity', 140);
            UK.set(ds, 'ADBE Drop Shadow-0003', 135);
            drive(c, ds, 'ADBE Drop Shadow-0004', 'Shadow Distance', 12 * c.strength);
            drive(c, ds, 'ADBE Drop Shadow-0005', 'Shadow Softness', 40 * c.strength);
        }
    });

    UK.add({
        id: 'fx.posterize', cat: 'fx', name: 'Posterize · Постеризация',
        desc: 'Ограничение числа тонов.',
        tags: 'posterize levels poster постеризация',
        apply: function (c) {
            var p = UK.addFx(c.layer, 'ADBE Posterize', 'Posterize');
            drive(c, p, 'ADBE Posterize-0001', 'Posterize Levels', Math.max(2, Math.round(8 / c.strength)));
        }
    });

    UK.add({
        id: 'fx.pixelate', cat: 'fx', name: 'Pixelate · Пикселизация',
        desc: 'Мозаика. Слайдер Pixel Size — размер пикселя в px.',
        tags: 'pixelate mosaic 8bit пиксели',
        apply: function (c) {
            var mo = UK.addFx(c.layer, 'ADBE Mosaic', 'Pixelate');
            var size = Math.max(2, Math.round(16 * c.strength));
            var sz = UK.cv(c, 'Pixel Size', size);
            UK.set(mo, 'ADBE Mosaic-0001', Math.round(c.comp.width / size));
            UK.set(mo, 'ADBE Mosaic-0002', Math.round(c.comp.height / size));
            UK.expr(mo, 'ADBE Mosaic-0001', 'Math.max(1, Math.round(thisComp.width / Math.max(1, ' + sz + ')))');
            UK.expr(mo, 'ADBE Mosaic-0002', 'Math.max(1, Math.round(thisComp.height / Math.max(1, ' + sz + ')))');
            UK.set(mo, 'ADBE Mosaic-0003', 1);
        }
    });

    UK.add({
        id: 'fx.cartoon', cat: 'fx', name: 'Cartoon · Мультяшный',
        desc: 'Эффект Cartoon: заливка ступенями + контуры.',
        tags: 'cartoon toon comic мультяшный',
        apply: function (c) {
            var ct = UK.addFx(c.layer, 'ADBE Cartoonify', 'Cartoon');
            UK.set(ct, ['Render'], 3);
            UK.set(ct, ['Detail Radius'], 3);
            UK.set(ct, ['Detail Threshold'], 25);
            drive(c, ct, ['Shading Steps'], 'Cartoon Steps', Math.max(2, Math.round(6 / c.strength)));
            UK.set(ct, ['Shading Smoothness'], 40);
            drive(c, ct, ['Width'], 'Cartoon Edge Width', 1.5 * c.strength);
            UK.set(ct, ['Threshold'], 1);
            UK.set(ct, ['Softness'], 60);
        }
    });

    UK.add({
        id: 'fx.sketch', cat: 'fx', name: 'Sketch · Карандашный эскиз',
        desc: 'Контуры + ч/б + контраст — рисунок карандашом.',
        tags: 'sketch pencil edges drawing эскиз карандаш',
        apply: function (c) {
            var fe = UK.addFx(c.layer, 'ADBE Find Edges', 'Edges');
            UK.set(fe, 'ADBE Find Edges-0001', 0);
            drive(c, fe, 'ADBE Find Edges-0002', 'Sketch Blend', UK.clamp(100 - 100 * c.strength, 0, 100));
            var tn = UK.addFx(c.layer, 'ADBE Tint', 'Mono');
            UK.set(tn, 'ADBE Tint-0001', col(0, 0, 0)); UK.set(tn, 'ADBE Tint-0002', col(1, 1, 1));
            UK.set(tn, 'ADBE Tint-0003', 100);
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Contrast');
            drive(c, bc, 'ADBE Brightness & Contrast 2-0002', 'Sketch Contrast', 40);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
        }
    });

    UK.add({
        id: 'fx.emboss', cat: 'fx', name: 'Emboss · Рельеф',
        desc: 'Цветной рельеф.',
        tags: 'emboss relief рельеф',
        apply: function (c) {
            var em = UK.addFx(c.layer, 'ADBE Color Emboss', 'Emboss');
            UK.set(em, 'ADBE Color Emboss-0001', 135);
            drive(c, em, 'ADBE Color Emboss-0002', 'Emboss Relief', 2.5 * c.strength);
            UK.set(em, 'ADBE Color Emboss-0003', 120);
            UK.set(em, 'ADBE Color Emboss-0004', 0);
        }
    });

    UK.add({
        id: 'fx.mirror', cat: 'fx', name: 'Mirror · Зеркало',
        desc: 'Зеркальное отражение половины кадра по направлению.',
        tags: 'mirror reflect symmetry зеркало симметрия',
        apply: function (c) {
            var s = lw(c);
            var mr = UK.addFx(c.layer, 'ADBE Mirror', 'Mirror');
            drivePoint(c, mr, 'ADBE Mirror-0001', 'Mirror Center', [s[0] / 2, s[1] / 2]);
            drive(c, mr, 'ADBE Mirror-0002', 'Mirror Angle', { L: 0, R: 180, U: 90, D: 270 }[c.dirId] || 0);
        }
    });

    UK.add({
        id: 'fx.kaleidoscope', cat: 'fx', name: 'Kaleidoscope · Калейдоскоп',
        desc: 'CC Kaleida с медленным вращением (Speed — об/с).',
        tags: 'kaleidoscope kaleida mirror калейдоскоп',
        apply: function (c) {
            var s = lw(c);
            var k = UK.addFx(c.layer, 'CC Kaleida', 'Kaleidoscope');
            UK.set(k, 'CC Kaleida-0001', [s[0] / 2, s[1] / 2]);
            drive(c, k, 'CC Kaleida-0002', 'Kaleida Size', 90 / c.strength);
            var sp = UK.cv(c, 'Kaleida Speed', 0.05);
            UK.expr(k, 'CC Kaleida-0004', 'time * ' + sp + ' * 360');
        }
    });

    UK.add({
        id: 'fx.echo', cat: 'fx', name: 'Echo Trails · Шлейфы',
        desc: 'Шлейф из предыдущих кадров (Echo). Хорошо на быстром движении.',
        tags: 'echo trails ghost шлейф',
        apply: function (c) {
            var e = UK.addFx(c.layer, 'ADBE Echo', 'Echo');
            UK.set(e, 'ADBE Echo-0001', -c.fd * 2);
            drive(c, e, 'ADBE Echo-0002', 'Echo Count', Math.round(6 * c.strength));
            UK.set(e, 'ADBE Echo-0003', 1);
            drive(c, e, 'ADBE Echo-0004', 'Echo Decay', 0.65);
            UK.set(e, 'ADBE Echo-0005', 5);
        }
    });

    UK.add({
        id: 'fx.stopMotion', cat: 'fx', name: 'Stop Motion · 12 fps',
        desc: 'Posterize Time — рваное движение как в стоп-моушене.',
        tags: 'stop motion posterize time fps стоп-моушен',
        apply: function (c) {
            var pt = UK.addFx(c.layer, 'ADBE Posterize Time', 'Stop Motion');
            drive(c, pt, 'ADBE Posterize Time-0001', 'Stop Motion FPS', 12);
        }
    });

    UK.add({
        id: 'fx.strobe', cat: 'fx', name: 'Strobe · Стробоскоп',
        desc: 'Белые вспышки с заданным периодом.',
        tags: 'strobe flash blink строб',
        apply: function (c) {
            var st = UK.addFx(c.layer, 'ADBE Strobe', 'Strobe');
            UK.set(st, 'ADBE Strobe-0001', col(1, 1, 1));
            UK.set(st, 'ADBE Strobe-0002', 0);
            drive(c, st, 'ADBE Strobe-0003', 'Strobe Duration', 0.06);
            drive(c, st, 'ADBE Strobe-0004', 'Strobe Period', 0.5 / c.strength);
            UK.set(st, 'ADBE Strobe-0005', 0);
            UK.set(st, 'ADBE Strobe-0006', 2);
            UK.set(st, 'ADBE Strobe-0007', 2);
        }
    });

    UK.add({
        id: 'fx.shake', cat: 'fx', name: 'Camera Shake · Тряска',
        desc: 'Постоянная ручная тряска (wiggle) на позиции. Слайдеры Freq/Amp.',
        tags: 'shake wiggle handheld camera тряска',
        apply: function (c) {
            var f = UK.cv(c, 'Shake Freq', 3);
            var a = UK.cv(c, 'Shake Amp', 15 * c.strength);
            c.layer.transform.position.expression = 'wiggle(' + f + ', ' + a + ')';
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'fx.pulse', cat: 'fx', name: 'Pulse to Beat · Пульсация',
        desc: 'Масштаб пульсирует в такт BPM.',
        tags: 'pulse beat bpm scale music пульс',
        apply: function (c) {
            var bpm = UK.cv(c, 'Pulse BPM', 120);
            var amp = UK.cv(c, 'Pulse Amp', 6 * c.strength);
            c.layer.transform.scale.expression =
                'var ph = Math.max(0, Math.sin(time * ' + bpm + ' / 60 * 2 * Math.PI));\n' +
                'value * (1 + ' + amp + ' / 100 * Math.pow(ph, 3))';
        }
    });

    UK.add({
        id: 'fx.flicker', cat: 'fx', name: 'Opacity Flicker · Мерцание',
        desc: 'Случайное мерцание прозрачности (неон, старая лампа).',
        tags: 'flicker opacity random neon lamp мерцание',
        apply: function (c) {
            var f = UK.cv(c, 'Flicker Rate', 12);
            var a = UK.cv(c, 'Flicker Amp', 35 * c.strength);
            c.layer.transform.opacity.expression =
                'posterizeTime(' + f + ');\n' +
                'seedRandom(index, false);\n' +
                'var r = random();\n' +
                'value * (1 - ' + a + ' / 100 * Math.pow(r, 2))';
        }
    });

    UK.add({
        id: 'fx.scanlines', cat: 'fx', name: 'Scanlines · Строчная развёртка',
        desc: 'Тонкие тёмные горизонтальные линии поверх картинки.',
        tags: 'scanlines crt tv lines развёртка',
        apply: function (c) {
            var gr = UK.addFx(c.layer, 'ADBE Grid', 'Scanlines');
            UK.set(gr, 'ADBE Grid-0002', 3);
            UK.set(gr, 'ADBE Grid-0004', 20000);
            drive(c, gr, 'ADBE Grid-0005', 'Scanline Spacing', 4);
            drive(c, gr, 'ADBE Grid-0006', 'Scanline Width', 2);
            UK.set(gr, 'ADBE Grid-0011', col(0, 0, 0));
            drive(c, gr, 'ADBE Grid-0012', 'Scanline Opacity', 30 * c.strength);
            UK.set(gr, ['ADBE Grid-0013', 'Blending Mode'], 2);
        }
    });

    UK.add({
        id: 'fx.tvOff', cat: 'fx', name: 'TV Turn Off · Выключение ТВ',
        desc: 'Событие: картинка схлопывается в полоску, затем в точку и гаснет.',
        tags: 'tv off crt collapse событие выключение',
        apply: function (c) {
            var tf = UK.addFx(c.layer, 'ADBE Geometry2', 'TV Off');
            UK.set(tf, 'ADBE Geometry2-0003', 0);
            var tA = c.t0 + c.dur * 0.55;
            var sh = UK.p(tf, 'ADBE Geometry2-0004');
            UK.keys(sh, [[c.t0, 100], [tA, 1.5]], 'expoIn');
            var sw = UK.p(tf, 'ADBE Geometry2-0005');
            UK.keys(sw, [[tA, 100], [c.t1, 0]], 'expoIn');
            var op = UK.p(tf, 'ADBE Geometry2-0009');
            UK.keys(op, [[c.t1 - c.fd * 2, 100], [c.t1, 0]], 'linear');
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'TV Flash');
            var br = UK.p(bc, 'ADBE Brightness & Contrast 2-0001');
            UK.keys(br, [[c.t0, 0], [tA, 60 * c.strength], [c.t1, 150]], 'smooth');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'TV Glow');
            UK.set(g, 'ADBE Glo2-0002', 40); UK.set(g, 'ADBE Glo2-0003', 60);
            UK.keys(UK.p(g, 'ADBE Glo2-0004'), [[c.t0, 0], [tA, 1.5 * c.strength], [c.t1, 3]], 'smooth');
        }
    });

    UK.add({
        id: 'fx.oldFilm', cat: 'fx', name: 'Old Film · Старая плёнка',
        desc: 'Сепия, зерно, виньетка и мерцание яркости.',
        tags: 'old film vintage sepia grain flicker старая плёнка',
        apply: function (c) {
            var k = c.strength;
            var tn = UK.addFx(c.layer, 'ADBE Tint', 'Old Sepia');
            UK.set(tn, 'ADBE Tint-0001', col(0.1, 0.07, 0.04)); UK.set(tn, 'ADBE Tint-0002', col(1, 0.92, 0.78));
            drive(c, tn, 'ADBE Tint-0003', 'Old Film Sepia', UK.clamp(70 * k, 0, 100));
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Old Flicker');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0002', 15 * k);
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var fa = UK.cv(c, 'Old Film Flicker', 10 * k);
            UK.expr(bc, 'ADBE Brightness & Contrast 2-0001', 'posterizeTime(12); seedRandom(index, false); (random() - 0.5) * 2 * ' + fa);
            var nz = UK.addFx(c.layer, 'ADBE Noise2', 'Old Grain');
            drive(c, nz, 'ADBE Noise2-0001', 'Old Film Grain', 22 * k);
            UK.set(nz, 'ADBE Noise2-0002', 0); UK.set(nz, 'ADBE Noise2-0003', 1);
            var vg = UK.addFx(c.layer, 'CC Vignette', 'Old Vignette');
            drive(c, vg, 'CC Vignette-0001', 'Old Film Vignette', 80 * k);
            UK.set(vg, 'CC Vignette-0002', 55);
            UK.set(vg, 'CC Vignette-0003', [c.comp.width / 2, c.comp.height / 2]);
        }
    });

    UK.add({
        id: 'fx.dreamy', cat: 'fx', name: 'Dreamy Soft Focus · Мягкий фокус',
        desc: 'Размытая копия слоя в режиме Screen поверх — «мечтательная» дымка.',
        tags: 'dreamy soft focus diffusion glow дымка',
        apply: function (c) {
            if (!isAV(c.layer)) {
                var g0 = UK.addFx(c.layer, 'ADBE Glo2', 'Dreamy');
                UK.set(g0, 'ADBE Glo2-0002', 40); UK.set(g0, 'ADBE Glo2-0003', 200);
                drive(c, g0, 'ADBE Glo2-0004', 'Dreamy Intensity', 0.5 * c.strength);
                return;
            }
            var d = c.layer.duplicate();
            d.name = UK.PREFIX + 'Dreamy ' + c.layer.name;
            d.blendingMode = BlendingMode.SCREEN;
            var bl = UK.addFx(d, 'ADBE Gaussian Blur 2', 'Dreamy Blur');
            UK.set(bl, 'ADBE Gaussian Blur 2-0001', 45 * c.strength);
            UK.set(bl, 'ADBE Gaussian Blur 2-0003', 1);
            if (c.opts.controls) {
                UK.expr(bl, 'ADBE Gaussian Blur 2-0001', cvOn(c, d, 'Dreamy Blur', 45 * c.strength));
                d.transform.opacity.expression = cvOn(c, d, 'Dreamy Opacity', 55);
            } else {
                d.transform.opacity.setValue(55);
            }
        }
    });

    UK.add({
        id: 'fx.lensFlare', cat: 'fx', name: 'Lens Flare · Блик объектива',
        desc: 'Классический Lens Flare; центр — Point Control.',
        tags: 'lens flare sun light блик',
        apply: function (c) {
            var s = lw(c);
            var lf = UK.addFx(c.layer, 'ADBE Lens Flare', 'Lens Flare');
            drivePoint(c, lf, 'ADBE Lens Flare-0001', 'Flare Center', [s[0] * 0.72, s[1] * 0.28]);
            drive(c, lf, 'ADBE Lens Flare-0002', 'Flare Brightness', 100 * c.strength);
            UK.set(lf, 'ADBE Lens Flare-0003', 1);
            UK.set(lf, 'ADBE Lens Flare-0004', 0);
        }
    });

    UK.add({
        id: 'fx.tiltShift', cat: 'fx', name: 'Tilt-Shift · Миниатюра',
        desc: 'Резкая полоса по центру, размытые верх/низ (Compound Blur + скрытая карта).',
        tags: 'tilt shift miniature blur миниатюра',
        apply: function (c) {
            var W = c.comp.width, H = c.comp.height;
            var map = UK.solid(c.comp, [1, 1, 1], 'TiltShift Map', c.layer.inPoint, c.layer.outPoint);
            var rp = UK.addFx(map, 'ADBE Ramp', 'Map Ramp');
            UK.set(rp, 'ADBE Ramp-0001', [W / 2, H / 2]);
            UK.set(rp, 'ADBE Ramp-0002', col(0, 0, 0));
            UK.set(rp, 'ADBE Ramp-0003', [W / 2, H * 0.08]);
            UK.set(rp, 'ADBE Ramp-0004', col(1, 1, 1));
            UK.set(rp, 'ADBE Ramp-0005', 1);
            var mr = UK.addFx(map, 'ADBE Mirror', 'Map Mirror');
            UK.set(mr, 'ADBE Mirror-0001', [W / 2, H / 2]);
            UK.set(mr, 'ADBE Mirror-0002', 90);
            map.enabled = false;
            var cb = UK.addFx(c.layer, 'ADBE Compound Blur', 'Tilt-Shift');
            UK.set(cb, 'ADBE Compound Blur-0001', map.index);
            drive(c, cb, 'ADBE Compound Blur-0002', 'TiltShift Blur', 25 * c.strength);
            UK.set(cb, 'ADBE Compound Blur-0003', 1);
            UK.set(cb, 'ADBE Compound Blur-0004', 0);
        }
    });

    UK.add({
        id: 'fx.zoomBlur', cat: 'fx', name: 'Zoom Blur · Радиальное размытие',
        desc: 'Статичное зум-размытие от центра (CC Radial Fast Blur).',
        tags: 'zoom radial blur speed размытие',
        apply: function (c) {
            var s = lw(c);
            var rb = UK.addFx(c.layer, 'CC Radial Fast Blur', 'Zoom Blur');
            drivePoint(c, rb, 'CC Radial Fast Blur-0001', 'Zoom Blur Center', [s[0] / 2, s[1] / 2]);
            drive(c, rb, 'CC Radial Fast Blur-0002', 'Zoom Blur Amount', 25 * c.strength);
            UK.set(rb, 'CC Radial Fast Blur-0003', 1);
        }
    });

    UK.add({
        id: 'fx.motionBlurBoost', cat: 'fx', name: 'Motion Blur Boost · Усиленный MB',
        desc: 'CC Force Motion Blur с 360° затвором + включение MB слоя.',
        tags: 'motion blur force shutter смаз',
        apply: function (c) {
            UK.motionBlur(c.layer, c.comp);
            var fm = UK.addFx(c.layer, 'CC Force Motion Blur', 'Force MB');
            UK.set(fm, 'CC Force Motion Blur-0001', 16);
            UK.set(fm, 'CC Force Motion Blur-0002', 1);
            drive(c, fm, 'CC Force Motion Blur-0003', 'MB Shutter Angle', UK.clamp(360 * c.strength, 0, 720));
            UK.set(fm, 'CC Force Motion Blur-0004', 1);
        }
    });

    UK.add({
        id: 'fx.invert', cat: 'fx', name: 'Invert · Негатив',
        desc: 'Инверсия цветов.',
        tags: 'invert negative негатив инверсия',
        apply: function (c) {
            var iv = UK.addFx(c.layer, 'ADBE Invert', 'Invert');
            UK.set(iv, 'ADBE Invert-0001', 1);
            drive(c, iv, 'ADBE Invert-0002', 'Invert Blend', UK.clamp(100 - 100 * c.strength, 0, 100));
        }
    });

    UK.add({
        id: 'fx.threshold', cat: 'fx', name: 'Threshold · Порог',
        desc: 'Жёсткое ч/б по порогу яркости.',
        tags: 'threshold black white stencil порог трафарет',
        apply: function (c) {
            var th = UK.addFx(c.layer, 'ADBE Threshold2', 'Threshold');
            drive(c, th, 'ADBE Threshold2-0001', 'Threshold Level', UK.clamp(Math.round(127 * c.strength), 0, 255));
        }
    });

    UK.add({
        id: 'fx.dotMatrix', cat: 'fx', name: 'Dot Matrix · Точечный растр',
        desc: 'Картинка из точек (CC Ball Action) — полутоновый вид.',
        tags: 'halftone dots ball action растр точки',
        apply: function (c) {
            var ba = UK.addFx(c.layer, 'CC Ball Action', 'Dot Matrix');
            UK.set(ba, 'CC Ball Action-0001', 0);
            drive(c, ba, 'CC Ball Action-0006', 'Dot Spacing', Math.max(2, Math.round(8 * c.strength)));
            drive(c, ba, 'CC Ball Action-0007', 'Dot Size', 70);
        }
    });

    UK.add({
        id: 'fx.blur', cat: 'fx', name: 'Gaussian Blur · Размытие',
        desc: 'Простое размытие с слайдером.',
        tags: 'blur gaussian размытие',
        apply: function (c) {
            var bl = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Blur');
            drive(c, bl, 'ADBE Gaussian Blur 2-0001', 'Blur Amount', 30 * c.strength);
            UK.set(bl, 'ADBE Gaussian Blur 2-0003', 1);
        }
    });

    UK.add({
        id: 'fx.dirBlur', cat: 'fx', name: 'Directional Blur · Смаз по направлению',
        desc: 'Направленное размытие (угол по направлению из настроек).',
        tags: 'directional motion blur angle смаз',
        apply: function (c) {
            var db = UK.addFx(c.layer, 'ADBE Motion Blur', 'Directional Blur');
            drive(c, db, 'ADBE Motion Blur-0001', 'DirBlur Angle', dirAngle(c));
            drive(c, db, 'ADBE Motion Blur-0002', 'DirBlur Length', 40 * c.strength);
        }
    });

    UK.add({
        id: 'fx.softEdge', cat: 'fx', name: 'Soft Edge Mask · Мягкие края',
        desc: 'Маска по краю слоя с большой растушёвкой.',
        tags: 'soft edge mask feather vignette мягкие края',
        apply: function (c) {
            var s = lw(c), inset = Math.round(Math.min(s[0], s[1]) * 0.06);
            var fe = Math.round(Math.min(s[0], s[1]) * 0.25 * c.strength);
            var m = c.layer.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
            var sh = new Shape();
            sh.vertices = [[inset, inset], [s[0] - inset, inset], [s[0] - inset, s[1] - inset], [inset, s[1] - inset]];
            sh.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            sh.closed = true;
            m.property('ADBE Mask Shape').setValue(sh);
            m.property('ADBE Mask Feather').setValue([fe, fe]);
            m.name = UK.PREFIX + 'Soft Edge';
            if (c.opts.controls) {
                var ref = UK.cv(c, 'Soft Edge Feather', fe);
                m.property('ADBE Mask Feather').expression = '[' + ref + ', ' + ref + ']';
            }
        }
    });

    UK.add({
        id: 'fx.focusPull', cat: 'fx', name: 'Focus Pull · Наводка на резкость',
        desc: 'Событие: из размытия в резкость за длительность от старта.',
        tags: 'focus pull rack blur in событие резкость',
        apply: function (c) {
            var bl = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Focus Pull');
            UK.set(bl, 'ADBE Gaussian Blur 2-0003', 1);
            UK.keys(UK.p(bl, 'ADBE Gaussian Blur 2-0001'), [[c.t0, 60 * c.strength], [c.t1, 0]], c.ease);
        }
    });

    // ================================================================ СОБЫТИЯ (хиты)
    UK.add({
        id: 'fx.glitchHit', cat: 'fx', name: 'Glitch Hit · Глитч-удар',
        desc: 'Событие: рывки позиции, блоки и RGB-смаз на длительность от старта.',
        tags: 'glitch hit digital rgb событие глитч',
        apply: function (c) {
            var s = lw(c), k = c.strength;
            var tf = UK.addFx(c.layer, 'ADBE Geometry2', 'Glitch Shift');
            var pos = UK.p(tf, 'ADBE Geometry2-0002');
            var base = pos.value;
            var mo = UK.addFx(c.layer, 'ADBE Mosaic', 'Glitch Blocks');
            UK.set(mo, 'ADBE Mosaic-0003', 1);
            var mh = UK.p(mo, 'ADBE Mosaic-0001'), mv = UK.p(mo, 'ADBE Mosaic-0002');
            var cb = UK.addFx(c.layer, 'ADBE Channel Blur', 'Glitch RGB');
            UK.set(cb, 'ADBE Channel Blur-0005', 1); UK.set(cb, 'ADBE Channel Blur-0006', 2);
            var rb = UK.p(cb, 'ADBE Channel Blur-0001'), bb = UK.p(cb, 'ADBE Channel Blur-0003');
            var n = Math.max(3, Math.round(c.dur / (c.fd * 2)));
            var step = c.dur / n, i, t, idx;
            var full = [s[0] * 4, s[1] * 4];
            for (i = 0; i < n; i++) {
                t = c.t0 + i * step;
                var hard = (i % 2 === 0);
                idx = UK.key(pos, t, [base[0] + UK.rnd(-40, 40) * k * (hard ? 1 : 0.3), base[1] + UK.rnd(-12, 12) * k * (hard ? 1 : 0.3)]); UK.setHold(pos, idx);
                idx = UK.key(mh, t, hard ? Math.round(UK.rnd(20, 90)) : full[0]); UK.setHold(mh, idx);
                idx = UK.key(mv, t, hard ? Math.round(UK.rnd(60, 300)) : full[1]); UK.setHold(mv, idx);
                idx = UK.key(rb, t, hard ? UK.rnd(10, 40) * k : 0); UK.setHold(rb, idx);
                idx = UK.key(bb, t, hard ? UK.rnd(10, 40) * k : 0); UK.setHold(bb, idx);
            }
            idx = UK.key(pos, c.t1, base); UK.setHold(pos, idx);
            idx = UK.key(mh, c.t1, full[0]); UK.setHold(mh, idx);
            idx = UK.key(mv, c.t1, full[1]); UK.setHold(mv, idx);
            idx = UK.key(rb, c.t1, 0); UK.setHold(rb, idx);
            idx = UK.key(bb, c.t1, 0); UK.setHold(bb, idx);
        }
    });

    UK.add({
        id: 'fx.flashHit', cat: 'fx', name: 'Flash Hit · Вспышка',
        desc: 'Событие: резкая белая вспышка с быстрым затуханием.',
        tags: 'flash hit white impact событие вспышка',
        apply: function (c) {
            var bc = UK.addFx(c.layer, 'ADBE Brightness & Contrast 2', 'Flash');
            UK.set(bc, 'ADBE Brightness & Contrast 2-0003', 0);
            var br = UK.p(bc, 'ADBE Brightness & Contrast 2-0001');
            UK.keys(br, [[c.t0, 0], [c.t0 + c.fd, UK.clamp(150 * c.strength, 0, 150)], [c.t1, 0]], 'expoOut');
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Flash Glow');
            UK.set(g, 'ADBE Glo2-0002', 50); UK.set(g, 'ADBE Glo2-0003', 150);
            UK.keys(UK.p(g, 'ADBE Glo2-0004'), [[c.t0, 0], [c.t0 + c.fd, 2 * c.strength], [c.t1, 0]], 'expoOut');
        }
    });

    UK.add({
        id: 'fx.shakeHit', cat: 'fx', name: 'Shake Hit · Удар с тряской',
        desc: 'Событие: сильная тряска, затухающая за длительность от старта.',
        tags: 'shake hit impact wiggle decay событие удар',
        apply: function (c) {
            var amp = UK.cv(c, 'Hit Amp', 60 * c.strength);
            var freq = UK.cv(c, 'Hit Freq', 18);
            var decay = UK.cv(c, 'Hit Decay', UK.fmt(4 / c.dur, 3));
            var pos = c.layer.transform.position;
            pos.expression =
                'var t0 = ' + UK.fmt(c.t0, 4) + ';\n' +
                'var t = time - t0;\n' +
                'if (t < 0) { value; } else {\n' +
                '  var w = wiggle(' + freq + ', ' + amp + ') - value;\n' +
                '  value + w * Math.exp(-' + decay + ' * t);\n' +
                '}';
            UK.motionBlur(c.layer, c.comp);
        }
    });

    UK.add({
        id: 'fx.zoomHit', cat: 'fx', name: 'Zoom Punch · Зум-удар',
        desc: 'Событие: резкий наезд масштаба с возвратом (под бит).',
        tags: 'zoom punch beat hit scale событие',
        apply: function (c) {
            var sc = c.layer.transform.scale;
            var v = sc.valueAtTime(c.t0, false);
            var up = UK.vecMul(v, 1 + 0.18 * c.strength);
            UK.keys(sc, [[c.t0, v], [c.t0 + Math.max(c.fd, c.dur * 0.15), up], [c.t1, v]], 'expoOut');
            UK.motionBlur(c.layer, c.comp);
        }
    });

})();


// ---- src/presets/55_distort.jsx
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


// ---- src/presets/60_light.jsx
// =============================================================================
//  LIGHT — лайтсвипы, лучи, блики, световые утечки, вспышки
// =============================================================================
(function () {

    // ---- локальные хелперы
    function rect(layer, t) {
        try {
            var r = layer.sourceRectAtTime(t, false);
            if (r.width > 0 && r.height > 0) return r;
        } catch (e) {}
        return { left: 0, top: 0, width: layer.width || 1920, height: layer.height || 1080 };
    }
    /** Траектория центра свипа по направлению: {from:[x,y], to:[x,y], w, h, cx, cy} в координатах слоя. */
    function sweepPath(c, pad) {
        var r = rect(c.layer, c.t0);
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        pad = pad == null ? 0.7 : pad;
        var dx = r.width * (0.5 + pad), dy = r.height * (0.5 + pad);
        var from, to;
        if (c.dirV[0] !== 0) { // горизонтально: из-за края ПО направлению движения
            from = [cx - c.dirV[0] * dx, cy]; to = [cx + c.dirV[0] * dx, cy];
        } else {
            from = [cx, cy - c.dirV[1] * dy]; to = [cx, cy + c.dirV[1] * dy];
        }
        return { from: from, to: to, w: r.width, h: r.height, cx: cx, cy: cy, r: r };
    }
    /** Угол линии свипа: горизонтальный проход — наклонная линия, вертикальный — горизонтальная. */
    function sweepDir(c, tilt) {
        tilt = tilt == null ? 30 : tilt;
        return c.dirV[0] !== 0 ? tilt : 90 + (c.dirId === 'U' ? -tilt : tilt) * 0.3;
    }
    function addSweep(c, nick, o) {
        var sp = sweepPath(c, o.pad);
        var fx = UK.addFx(c.layer, 'CC Light Sweep', nick || 'Light Sweep');
        UK.set(fx, 'CC Light Sweep-0002', o.dir != null ? o.dir : sweepDir(c));
        UK.set(fx, 'CC Light Sweep-0003', o.shape || 2);
        UK.set(fx, 'CC Light Sweep-0004', Math.max(4, o.width));
        UK.set(fx, 'CC Light Sweep-0005', o.sweep);
        UK.set(fx, 'CC Light Sweep-0006', o.edge);
        UK.set(fx, 'CC Light Sweep-0007', o.thick == null ? 4 : o.thick);
        UK.set(fx, 'CC Light Sweep-0009', 1);
        if (o.color) UK.set(fx, 'CC Light Sweep-0008', o.color);
        var t0 = c.t0 + (o.delay || 0), t1 = t0 + c.dur;
        var center = UK.p(fx, 'CC Light Sweep-0001');
        UK.key2(center, t0, sp.from, t1, sp.to, o.ease || c.ease);
        return fx;
    }
    function ellipse(cx, cy, rx, ry) {
        var k = 0.5523, sh = new Shape();
        sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
        sh.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];
        sh.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];
        sh.closed = true;
        return sh;
    }
    /** Солид над слоем на его длительности. Возвращает {solid, cs} где cs — контекст для UK.cv на солиде. */
    function overlaySolid(c, color, name, t0, t1) {
        var s = UK.solid(c.comp, color, name, t0 == null ? c.layer.inPoint : t0, t1 == null ? c.layer.outPoint : t1);
        s.moveBefore(c.layer);
        return { solid: s, cs: { opts: c.opts, layer: s, strength: c.strength } };
    }
    function layerPos(layer) {
        var p = layer.transform.position.value;
        return [p[0], p[1]];
    }

    // -------------------------------------------------------------- Light Sweep
    UK.add({
        id: 'light.sweepSoft', cat: 'light', name: 'Light Sweep Soft · Мягкий блик',
        desc: 'Широкий мягкий световой блик проходит по слою за длительность. Направление — из настроек, сила — яркость.',
        tags: 'light sweep shine блик свип логотип',
        apply: function (c) {
            var sp = sweepPath(c);
            addSweep(c, 'Sweep Soft', { shape: 2, width: sp.w * 0.45, sweep: 55 * c.strength, edge: 35 * c.strength, thick: 3 });
        }
    });
    UK.add({
        id: 'light.sweepSharp', cat: 'light', name: 'Light Sweep Sharp · Резкий блик',
        desc: 'Узкая яркая полоса света с чёткими краями.',
        tags: 'light sweep sharp блик резкий полоса',
        apply: function (c) {
            var sp = sweepPath(c);
            addSweep(c, 'Sweep Sharp', { shape: 3, width: sp.w * 0.08, sweep: 95 * c.strength, edge: 70 * c.strength, thick: 2 });
        }
    });
    UK.add({
        id: 'light.sweepDiag', cat: 'light', name: 'Light Sweep Diagonal · Диагональный блик',
        desc: 'Блик под углом 45° по выбранному направлению.',
        tags: 'light sweep diagonal блик диагональ',
        apply: function (c) {
            var sp = sweepPath(c);
            var ang = (c.dirId === 'L' || c.dirId === 'U') ? -45 : 45;
            addSweep(c, 'Sweep Diagonal', { shape: 2, width: sp.w * 0.25, sweep: 70 * c.strength, edge: 50 * c.strength, dir: ang, thick: 3 });
        }
    });
    UK.add({
        id: 'light.sweepDouble', cat: 'light', name: 'Double Sweep · Двойной блик',
        desc: 'Широкий мягкий блик и следом узкий яркий — классический «премиум» проход.',
        tags: 'light sweep double двойной блик',
        apply: function (c) {
            var sp = sweepPath(c);
            addSweep(c, 'Sweep Wide', { shape: 2, width: sp.w * 0.4, sweep: 40 * c.strength, edge: 25 * c.strength, thick: 3 });
            addSweep(c, 'Sweep Thin', { shape: 3, width: sp.w * 0.06, sweep: 90 * c.strength, edge: 60 * c.strength, thick: 2, delay: c.dur * 0.25 });
        }
    });
    UK.add({
        id: 'light.sweepLoop', cat: 'light', name: 'Loop Sweep · Циклический блик',
        desc: 'Блик проходит по слою бесконечно с заданным периодом (слайдер «Period»).',
        tags: 'light sweep loop цикл блик бесконечный',
        apply: function (c) {
            var sp = sweepPath(c);
            var fx = UK.addFx(c.layer, 'CC Light Sweep', 'Sweep Loop');
            UK.set(fx, 'CC Light Sweep-0002', sweepDir(c));
            UK.set(fx, 'CC Light Sweep-0003', 2);
            UK.set(fx, 'CC Light Sweep-0004', Math.max(4, sp.w * 0.2));
            UK.set(fx, 'CC Light Sweep-0005', 60 * c.strength);
            UK.set(fx, 'CC Light Sweep-0006', 40 * c.strength);
            UK.set(fx, 'CC Light Sweep-0007', 3);
            var period = UK.cv(c, 'Sweep Period', Math.max(0.5, c.dur * 3));
            var ex = 'var p = Math.max(0.05, ' + period + ');\n' +
                'var ph = (((time - inPoint) % p) + p) % p / p;\n' +
                'var a = [' + UK.fmt(sp.from[0]) + ', ' + UK.fmt(sp.from[1]) + '], b = [' + UK.fmt(sp.to[0]) + ', ' + UK.fmt(sp.to[1]) + '];\n' +
                '[a[0] + (b[0] - a[0]) * ph, a[1] + (b[1] - a[1]) * ph]';
            UK.expr(fx, 'CC Light Sweep-0001', ex);
        }
    });
    UK.add({
        id: 'light.sweepColor', cat: 'light', name: 'Colored Sweep · Цветной блик',
        desc: 'Блик с цветом света (по умолчанию тёплое золото). Цвет — через контрол «Sweep Color».',
        tags: 'light sweep color gold цветной золотой блик',
        apply: function (c) {
            var sp = sweepPath(c);
            var fx = addSweep(c, 'Sweep Color', { shape: 2, width: sp.w * 0.3, sweep: 75 * c.strength, edge: 45 * c.strength, thick: 3, color: [1, 0.82, 0.45, 1] });
            if (c.opts.controls) UK.expr(fx, 'CC Light Sweep-0008', UK.cv(c, 'Sweep Color', [1, 0.82, 0.45, 1], 'color'));
        }
    });
    UK.add({
        id: 'light.sweepEdge', cat: 'light', name: 'Edge Sweep · Блик по контуру',
        desc: 'Светится только кромка (edge) слоя — проход по контуру логотипа/текста.',
        tags: 'light sweep edge контур кромка',
        apply: function (c) {
            var sp = sweepPath(c);
            addSweep(c, 'Sweep Edge', { shape: 2, width: sp.w * 0.3, sweep: 0, edge: 100 * c.strength, thick: 6 });
        }
    });
    UK.add({
        id: 'light.shine', cat: 'light', name: 'Shine · Блик + свечение',
        desc: 'Лайтсвип и мягкое свечение вместе — для логотипов и заголовков.',
        tags: 'shine glow sweep логотип свечение блик',
        apply: function (c) {
            var sp = sweepPath(c);
            addSweep(c, 'Shine Sweep', { shape: 2, width: sp.w * 0.3, sweep: 70 * c.strength, edge: 50 * c.strength, thick: 3 });
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Shine Glow');
            UK.set(g, 'ADBE Glo2-0002', 55);
            UK.set(g, 'ADBE Glo2-0003', 60);
            UK.set(g, 'ADBE Glo2-0004', 0.8 * c.strength);
            if (c.opts.controls) UK.expr(g, 'ADBE Glo2-0004', UK.cv(c, 'Shine Glow', 0.8 * c.strength));
        }
    });

    // -------------------------------------------------------------- Rays / Burst / Flare
    UK.add({
        id: 'light.godRays', cat: 'light', name: 'God Rays · Лучи света',
        desc: 'Объёмные лучи от яркой точки (по умолчанию сверху). Центр и интенсивность — контролы.',
        tags: 'god rays light rays лучи волюметрик',
        apply: function (c) {
            var r = rect(c.layer, c.t0);
            var fx = UK.addFx(c.layer, 'CC Light Rays', 'God Rays');
            var cx = r.left + r.width / 2, cy = r.top + r.height * (c.dirId === 'D' ? 0.9 : 0.1);
            UK.set(fx, 'CC Light Rays-0001', 120 * c.strength);
            UK.set(fx, 'CC Light Rays-0002', [cx, cy]);
            UK.set(fx, 'CC Light Rays-0003', Math.max(r.width, r.height) * 0.15);
            UK.set(fx, 'CC Light Rays-0004', 60);
            UK.set(fx, 'CC Light Rays-0007', 1);
            UK.set(fx, 'CC Light Rays-0008', 0);
            if (c.opts.controls) {
                UK.expr(fx, 'CC Light Rays-0001', UK.cv(c, 'Rays Intensity', 120 * c.strength));
                UK.expr(fx, 'CC Light Rays-0002', UK.cv(c, 'Rays Center', [cx, cy], 'point'));
            }
        }
    });
    UK.add({
        id: 'light.rayBurst', cat: 'light', name: 'Light Burst Pulse · Вспышка лучей',
        desc: 'Радиальная вспышка лучей из центра слоя — нарастает и гаснет за длительность.',
        tags: 'light burst pulse вспышка лучи радиальная',
        apply: function (c) {
            var r = rect(c.layer, c.t0);
            var fx = UK.addFx(c.layer, 'CC Light Burst 2.5', 'Light Burst');
            UK.set(fx, 'CC Light Burst 2.5-0001', [r.left + r.width / 2, r.top + r.height / 2]);
            UK.set(fx, 'CC Light Burst 2.5-0003', 60 * c.strength);
            UK.set(fx, 'CC Light Burst 2.5-0004', 2);
            var p = UK.p(fx, ['Intensity', 'CC Light Burst 2.5-0002']);
            UK.keys(p, [[c.t0, 0], [c.tMid, 150 * c.strength], [c.t1, 0]], 'smooth');
        }
    });
    UK.add({
        id: 'light.flarePass', cat: 'light', name: 'Lens Flare Pass · Пролёт блика',
        desc: 'Блик объектива пролетает через слой по направлению, разгораясь в середине.',
        tags: 'lens flare блик объектив пролёт',
        apply: function (c) {
            var sp = sweepPath(c, 0.3);
            var fx = UK.addFx(c.layer, 'ADBE Lens Flare', 'Lens Flare');
            UK.set(fx, 'ADBE Lens Flare-0003', 1);
            UK.key2(UK.p(fx, 'ADBE Lens Flare-0001'), c.t0, sp.from, c.t1, sp.to, 'smooth');
            var br = UK.p(fx, 'ADBE Lens Flare-0002');
            UK.keys(br, [[c.t0, 0], [c.tMid, 130 * c.strength], [c.t1, 0]], 'smooth');
        }
    });

    // -------------------------------------------------------------- Leaks / Glow / Flicker
    UK.add({
        id: 'light.leak', cat: 'light', name: 'Light Leak · Световая утечка',
        desc: 'Тёплая плывущая засветка (Fractal Noise + Tint, режим Add) поверх слоя. Прозрачность и скорость — контролы.',
        tags: 'light leak утечка засветка плёнка warm',
        apply: function (c) {
            var o = overlaySolid(c, [1, 0.6, 0.3], 'Light Leak');
            var s = o.solid;
            var fn = UK.addFx(s, 'ADBE Fractal Noise', 'Leak Noise');
            UK.set(fn, ['ADBE Fractal Noise-0001', 'Fractal Type'], 1);
            UK.set(fn, ['ADBE Fractal Noise-0002', 'Noise Type'], 3);
            UK.set(fn, ['ADBE Fractal Noise-0004', 'Contrast'], 70);
            UK.set(fn, ['ADBE Fractal Noise-0005', 'Brightness'], -25);
            UK.set(fn, ['ADBE Fractal Noise-0009', 'Uniform Scaling'], 0);
            UK.set(fn, ['ADBE Fractal Noise-0011', 'Scale Width'], 900);
            UK.set(fn, ['ADBE Fractal Noise-0012', 'Scale Height'], 350);
            UK.set(fn, ['ADBE Fractal Noise-0015', 'Complexity'], 2);
            var speed = UK.cv(o.cs, 'Leak Speed', 40);
            UK.expr(fn, ['ADBE Fractal Noise-0022', 'Evolution'], 'time * ' + speed);
            UK.expr(fn, ['ADBE Fractal Noise-0013', 'Offset Turbulence'], 'value + [time * ' + speed + ' * 2, 0]');
            var tint = UK.addFx(s, 'ADBE Tint', 'Leak Tint');
            UK.set(tint, 'ADBE Tint-0001', [0.35, 0.04, 0.0, 1]);
            UK.set(tint, 'ADBE Tint-0002', [1, 0.72, 0.35, 1]);
            if (c.opts.controls) UK.expr(tint, 'ADBE Tint-0002', UK.cv(o.cs, 'Leak Color', [1, 0.72, 0.35, 1], 'color'));
            s.blendingMode = BlendingMode.ADD;
            var op = UK.cv(o.cs, 'Leak Opacity', 70 * c.strength);
            s.transform.opacity.expression = 'Math.min(100, ' + op + ')';
        }
    });
    UK.add({
        id: 'light.glowPulse', cat: 'light', name: 'Glow Pulse · Пульсирующее свечение',
        desc: 'Свечение, дышащее по синусоиде. Частота, база и амплитуда — контролы.',
        tags: 'glow pulse пульс свечение неон',
        apply: function (c) {
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Glow Pulse');
            UK.set(g, 'ADBE Glo2-0002', 50);
            UK.set(g, 'ADBE Glo2-0003', 70);
            var base = UK.cv(c, 'Glow Base', 0.6 * c.strength), amp = UK.cv(c, 'Glow Amp', 1.2 * c.strength), fr = UK.cv(c, 'Glow Freq', 1 / Math.max(0.2, c.dur));
            UK.expr(g, 'ADBE Glo2-0004', 'var b = ' + base + ', a = ' + amp + ', f = ' + fr + ';\nb + a * (0.5 + 0.5 * Math.sin((time - inPoint) * f * 2 * Math.PI))');
        }
    });
    UK.add({
        id: 'light.neonFlicker', cat: 'light', name: 'Neon Flicker · Мерцание неона',
        desc: 'Случайные провалы яркости как у неоновой вывески. Частота, вероятность и глубина — контролы.',
        tags: 'neon flicker мерцание неон вывеска',
        apply: function (c) {
            var g = UK.addFx(c.layer, 'ADBE Glo2', 'Neon Glow');
            UK.set(g, 'ADBE Glo2-0002', 45);
            UK.set(g, 'ADBE Glo2-0003', 40);
            UK.set(g, 'ADBE Glo2-0004', 1.0 * c.strength);
            var f = UK.cv(c, 'Flicker Rate', 14), pr = UK.cv(c, 'Flicker Chance', 15), mn = UK.cv(c, 'Flicker Min', Math.max(0, 60 - 40 * c.strength));
            c.layer.transform.opacity.expression = 'var f = ' + f + ', p = ' + pr + ', mn = ' + mn + ';\n' +
                'posterizeTime(f);\nseedRandom(index, false);\n' +
                '(random() < p / 100) ? value * mn / 100 : value';
        }
    });
    UK.add({
        id: 'light.strobe', cat: 'light', name: 'Strobe Light · Стробоскоп',
        desc: 'Белые вспышки с заданным периодом (эффект Strobe). Сила — частота.',
        tags: 'strobe стробоскоп вспышки клуб',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Strobe', 'Strobe');
            UK.set(fx, 'ADBE Strobe-0001', [1, 1, 1, 1]);
            UK.set(fx, 'ADBE Strobe-0002', 0);
            UK.set(fx, 'ADBE Strobe-0003', 0.06);
            UK.set(fx, 'ADBE Strobe-0004', Math.max(0.1, 0.5 / c.strength));
            UK.set(fx, 'ADBE Strobe-0005', 0);
            UK.set(fx, 'ADBE Strobe-0006', 2);
            if (c.opts.controls) UK.expr(fx, 'ADBE Strobe-0004', 'Math.max(0.04, ' + UK.cv(c, 'Strobe Period', Math.max(0.1, 0.5 / c.strength)) + ')');
        }
    });
    UK.add({
        id: 'light.flashHit', cat: 'light', name: 'Flash Hit · Белая вспышка',
        desc: 'Короткая белая вспышка (Add) над слоем в точке старта — акцент под бит.',
        tags: 'flash hit вспышка белая бит акцент',
        apply: function (c) {
            var d = Math.max(c.fd * 3, c.dur * 0.5);
            var o = overlaySolid(c, [1, 1, 1], 'Flash', c.t0, c.t0 + d);
            var s = o.solid;
            s.blendingMode = BlendingMode.ADD;
            UK.keys(s.transform.opacity, [[c.t0, 0], [c.t0 + c.fd, Math.min(100, 100 * c.strength)], [c.t0 + d, 0]], 'expoOut');
        }
    });

    // -------------------------------------------------------------- Spot / Flashlight / Bokeh / Rim
    UK.add({
        id: 'light.spotlight', cat: 'light', name: 'Spotlight · Прожектор',
        desc: 'Затемнение всего кадра кроме мягкого овала вокруг слоя. Прозрачность — контрол «Spot Darkness».',
        tags: 'spotlight прожектор виньетка затемнение пятно',
        apply: function (c) {
            var o = overlaySolid(c, [0, 0, 0], 'Spotlight');
            var s = o.solid;
            var p = layerPos(c.layer), sz = UK.layerSize(c.layer, c.t0);
            var rx = Math.max(120, sz[0] * 0.75 * c.strength), ry = Math.max(120, sz[1] * 0.9 * c.strength);
            var m = s.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
            m.name = 'Spot';
            m.property('ADBE Mask Shape').setValue(ellipse(p[0], p[1], rx, ry));
            m.inverted = true;
            m.property('ADBE Mask Feather').setValue([rx * 0.6, ry * 0.6]);
            var dk = UK.cv(o.cs, 'Spot Darkness', 85);
            s.transform.opacity.expression = 'Math.min(100, ' + dk + ')';
        }
    });
    UK.add({
        id: 'light.flashlight', cat: 'light', name: 'Flashlight Pan · Луч фонаря',
        desc: 'Тёмный кадр и пятно света, проходящее по направлению за длительность.',
        tags: 'flashlight фонарь луч пятно пан',
        apply: function (c) {
            var o = overlaySolid(c, [0, 0, 0], 'Flashlight');
            var s = o.solid;
            var cw = c.comp.width, ch = c.comp.height;
            var r = Math.max(100, Math.min(cw, ch) * 0.22 * c.strength);
            var cx = cw / 2, cy = ch / 2;
            var from = [cx - c.dirV[0] * (cw / 2 + r), cy - c.dirV[1] * (ch / 2 + r)];
            var to = [cx + c.dirV[0] * (cw / 2 + r), cy + c.dirV[1] * (ch / 2 + r)];
            var m = s.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
            m.name = 'Beam';
            m.inverted = true;
            var sh = m.property('ADBE Mask Shape');
            sh.setValueAtTime(c.t0, ellipse(from[0], from[1], r, r));
            sh.setValueAtTime(c.t1, ellipse(to[0], to[1], r, r));
            m.property('ADBE Mask Feather').setValue([r * 0.5, r * 0.5]);
            var dk = UK.cv(o.cs, 'Beam Darkness', 90);
            s.transform.opacity.expression = 'Math.min(100, ' + dk + ')';
        }
    });
    UK.add({
        id: 'light.bokehGlow', cat: 'light', name: 'Bokeh Glow · Мягкое сияние',
        desc: 'Дубликат слоя с сильным размытием и свечением в режиме Screen — «дрим»-ореол.',
        tags: 'bokeh glow dream ореол сияние screen',
        apply: function (c) {
            var d = c.layer.duplicate();
            d.name = UK.PREFIX + 'Bokeh ' + c.layer.name;
            d.blendingMode = BlendingMode.SCREEN;
            var b = UK.addFx(d, 'ADBE Gaussian Blur 2', 'Bokeh Blur');
            UK.set(b, 'ADBE Gaussian Blur 2-0001', 45 * c.strength);
            UK.set(b, 'ADBE Gaussian Blur 2-0003', 1);
            var g = UK.addFx(d, 'ADBE Glo2', 'Bokeh Glow');
            UK.set(g, 'ADBE Glo2-0002', 40);
            UK.set(g, 'ADBE Glo2-0003', 120);
            UK.set(g, 'ADBE Glo2-0004', 1.2 * c.strength);
            var cs = { opts: c.opts, layer: d };
            var op = UK.cv(cs, 'Bokeh Opacity', 70);
            d.transform.opacity.expression = 'Math.min(100, ' + op + ')';
            if (c.opts.controls) UK.expr(b, 'ADBE Gaussian Blur 2-0001', UK.cv(cs, 'Bokeh Blur', 45 * c.strength));
        }
    });
    UK.add({
        id: 'light.rimLight', cat: 'light', name: 'Rim Light · Контровой свет',
        desc: 'Тонкая светлая кромка по альфа-каналу (Bevel Alpha). Угол — по направлению.',
        tags: 'rim light bevel контровой кромка объём',
        apply: function (c) {
            var fx = UK.addFx(c.layer, 'ADBE Bevel Alpha', 'Rim Light');
            var ang = c.dirId === 'L' ? 180 : (c.dirId === 'R' ? 0 : (c.dirId === 'U' ? -90 : 90));
            UK.set(fx, 'ADBE Bevel Alpha-0001', 2.5 * c.strength);
            UK.set(fx, 'ADBE Bevel Alpha-0002', ang);
            UK.set(fx, 'ADBE Bevel Alpha-0003', [1, 1, 1, 1]);
            UK.set(fx, 'ADBE Bevel Alpha-0004', 0.6 * c.strength);
            if (c.opts.controls) {
                UK.expr(fx, 'ADBE Bevel Alpha-0004', UK.cv(c, 'Rim Intensity', 0.6 * c.strength));
                UK.expr(fx, 'ADBE Bevel Alpha-0002', UK.cv(c, 'Rim Angle', ang, 'angle'));
            }
        }
    });

})();


// ---- src/presets/65_text.jsx
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


// ---- src/presets/70_cam.jsx
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


// ---- src/presets/75_util.jsx
// =============================================================================
//  UTIL — утилиты монтажа
// =============================================================================
(function () {

    /** Пресеты «на выделение целиком»: выполняем один раз (на первом слое). */
    function once(c) { return c.i === 0; }
    function sortByIndexDesc(layers) {
        var a = layers.slice();
        a.sort(function (x, y) { return y.index - x.index; });
        return a;
    }
    function rect(layer, t) {
        try {
            var r = layer.sourceRectAtTime(t, false);
            if (r.width > 0 && r.height > 0) return r;
        } catch (e) {}
        return { left: 0, top: 0, width: layer.width || 100, height: layer.height || 100 };
    }
    function transformProps(layer) {
        var tr = layer.property('ADBE Transform Group'), r = [];
        for (var i = 1; i <= tr.numProperties; i++) {
            var p = tr.property(i);
            if (p && p.propertyType === PropertyType.PROPERTY) r.push(p);
        }
        return r;
    }

    // -------------------------------------------------------------- timing
    UK.add({
        id: 'util.stagger', cat: 'util', name: 'Stagger Layers · Сдвиг слоёв каскадом',
        desc: 'Каждый следующий выделенный слой (по порядку входа) сдвигается на «Шаг, с».',
        tags: 'stagger offset каскад сдвиг слои',
        apply: function (c) {
            if (!once(c)) return;
            var stg = Number(c.opts.stagger) || 0.1;
            var ls = UK.sortByIn(c.layers);
            for (var i = 0; i < ls.length; i++) ls[i].startTime += stg * i;
        }
    });
    UK.add({
        id: 'util.sequence', cat: 'util', name: 'Sequence Layers · Встык друг за другом',
        desc: 'Выделенные слои расставляются последовательно встык (по порядку входа).',
        tags: 'sequence встык последовательно слои',
        apply: function (c) {
            if (!once(c)) return;
            var ls = UK.sortByIn(c.layers);
            for (var i = 1; i < ls.length; i++) {
                var shift = ls[i - 1].outPoint - ls[i].inPoint;
                ls[i].startTime += shift;
                ls[i].inPoint += shift;
                ls[i].outPoint += shift;
            }
        }
    });
    UK.add({
        id: 'util.trimToPlayhead', cat: 'util', name: 'Trim to Playhead · Обрезать по курсору',
        desc: 'Обрезает ближайшую границу слоя по курсору (вход или выход).',
        tags: 'trim cut обрезать курсор',
        apply: function (c) {
            var t = c.comp.time, L = c.layer;
            if (t <= L.inPoint || t >= L.outPoint) return;
            var mid = (L.inPoint + L.outPoint) / 2;
            if (t < mid) L.inPoint = t; else L.outPoint = t;
        }
    });
    UK.add({
        id: 'util.autoFade', cat: 'util', name: 'Auto Fade In/Out · Фейды на концах',
        desc: 'Ключи прозрачности на входе и выходе слоя длительностью «Длит.».',
        tags: 'fade in out auto фейд прозрачность',
        apply: function (c) {
            var L = c.layer, op = L.transform.opacity;
            var d = Math.min(c.dur, (L.outPoint - L.inPoint) / 2 - c.fd);
            if (d <= 0) return;
            var v = op.valueAtTime(L.inPoint + d, false);
            UK.keys(op, [[L.inPoint, 0], [L.inPoint + d, v], [L.outPoint - d, v], [L.outPoint, 0]], 'smooth');
        }
    });
    UK.add({
        id: 'util.freeze', cat: 'util', name: 'Freeze Frame · Стоп-кадр на курсоре',
        desc: 'Включает Time Remap и замораживает кадр, на котором стоит курсор.',
        tags: 'freeze frame стоп кадр time remap',
        apply: function (c) {
            var L = c.layer;
            if (!L.canSetTimeRemapEnabled) throw new Error('Слой не поддерживает Time Remap');
            L.timeRemapEnabled = true;
            var tr = L.property('ADBE Time Remapping');
            var t = UK.clamp(c.comp.time, L.inPoint, L.outPoint);
            var v = tr.valueAtTime(t, false);
            UK.clearKeys(tr);
            var k = UK.key(tr, t, v);
            UK.setHold(tr, k);
        }
    });
    UK.add({
        id: 'util.reverse', cat: 'util', name: 'Reverse Layer · Реверс',
        desc: 'Воспроизведение задом наперёд через Time Remap.',
        tags: 'reverse backwards реверс обратно',
        apply: function (c) {
            var L = c.layer;
            if (!L.canSetTimeRemapEnabled) throw new Error('Слой не поддерживает Time Remap');
            L.timeRemapEnabled = true;
            var tr = L.property('ADBE Time Remapping');
            var a = 0, b = 0;
            if (tr.numKeys >= 2) { a = tr.keyValue(1); b = tr.keyValue(tr.numKeys); }
            else { b = (L.source && L.source.duration) ? L.source.duration : (L.outPoint - L.inPoint); }
            UK.clearKeys(tr);
            var k1 = UK.key(tr, L.inPoint, b), k2 = UK.key(tr, L.outPoint, a);
            UK.setLinear(tr, k1); UK.setLinear(tr, k2);
        }
    });
    UK.add({
        id: 'util.loopCycle', cat: 'util', name: 'Loop Keyframes (cycle) · Зациклить ключи',
        desc: 'loopOut("cycle") на все анимированные свойства Transform.',
        tags: 'loop cycle зациклить ключи выражение',
        apply: function (c) {
            var ps = transformProps(c.layer);
            for (var i = 0; i < ps.length; i++) if (ps[i].numKeys > 1) ps[i].expression = UK.EXPR.loopOut('cycle');
        }
    });
    UK.add({
        id: 'util.loopPingPong', cat: 'util', name: 'Loop Keyframes (pingpong) · Туда-обратно',
        desc: 'loopOut("pingpong") на все анимированные свойства Transform.',
        tags: 'loop pingpong зациклить туда обратно',
        apply: function (c) {
            var ps = transformProps(c.layer);
            for (var i = 0; i < ps.length; i++) if (ps[i].numKeys > 1) ps[i].expression = UK.EXPR.loopOut('pingpong');
        }
    });
    UK.add({
        id: 'util.bakeExpr', cat: 'util', name: 'Bake Expressions · Запечь выражения в ключи',
        desc: 'Конвертирует выражения Transform в ключи (Convert Expression to Keyframes).',
        tags: 'bake convert expression keyframes запечь выражения',
        apply: function (c) {
            var ps = transformProps(c.layer), any = false;
            for (var i = 0; i < ps.length; i++) {
                try { ps[i].selected = !!(ps[i].expression && ps[i].expressionEnabled); if (ps[i].selected) any = true; } catch (e) {}
            }
            if (!any) return;
            try { app.executeCommand(app.findMenuCommandId('Convert Expression to Keyframes')); } catch (e2) {}
        }
    });

    // -------------------------------------------------------------- geometry
    UK.add({
        id: 'util.centerAnchor', cat: 'util', name: 'Center Anchor Point · Якорь в центр',
        desc: 'Переносит опорную точку в центр содержимого без смещения слоя.',
        tags: 'anchor center якорь центр опорная точка',
        apply: function (c) {
            var L = c.layer, r = rect(L, c.comp.time);
            var ap = L.transform.anchorPoint, pos = L.transform.position, sc = L.transform.scale;
            var a = ap.value, p = pos.value, s = sc.value;
            var na = [r.left + r.width / 2, r.top + r.height / 2];
            var dx = na[0] - a[0], dy = na[1] - a[1];
            var newA = [], newP = [];
            for (var i = 0; i < a.length; i++) newA.push(i < 2 ? na[i] : a[i]);
            for (var j = 0; j < p.length; j++) newP.push(j === 0 ? p[0] + dx * s[0] / 100 : (j === 1 ? p[1] + dy * s[1] / 100 : p[j]));
            ap.setValue(newA);
            pos.setValue(newP);
        }
    });
    UK.add({
        id: 'util.fitToComp', cat: 'util', name: 'Fit to Comp · Вписать в композицию',
        desc: 'Масштабирует слой так, чтобы он целиком вписался в кадр, и центрирует его.',
        tags: 'fit comp scale вписать центр',
        apply: function (c) {
            var L = c.layer, r = rect(L, c.comp.time);
            var k = Math.min(c.comp.width / r.width, c.comp.height / r.height) * 100;
            var sc = L.transform.scale, s = sc.value, ns = [];
            for (var i = 0; i < s.length; i++) ns.push(i < 2 ? k : s[i]);
            sc.setValue(ns);
            L.transform.anchorPoint.setValue(s.length > 2 ? [r.left + r.width / 2, r.top + r.height / 2, 0] : [r.left + r.width / 2, r.top + r.height / 2]);
            var p = L.transform.position.value, np = [c.comp.width / 2, c.comp.height / 2];
            if (p.length > 2) np.push(p[2]);
            L.transform.position.setValue(np);
        }
    });
    UK.add({
        id: 'util.adjOver', cat: 'util', name: 'Adjustment Layer Over · Корр. слой над выделением',
        desc: 'Создаёт корректирующий слой над выделенными слоями на их общую длительность.',
        tags: 'adjustment layer корректирующий слой',
        apply: function (c) {
            if (!once(c)) return;
            var tIn = c.layers[0].inPoint, tOut = c.layers[0].outPoint, top = c.layers[0];
            for (var i = 1; i < c.layers.length; i++) {
                tIn = Math.min(tIn, c.layers[i].inPoint); tOut = Math.max(tOut, c.layers[i].outPoint);
                if (c.layers[i].index < top.index) top = c.layers[i];
            }
            var adj = UK.adjLayer(c.comp, tIn, tOut, 'Adjustment');
            adj.moveBefore(top);
        }
    });
    UK.add({
        id: 'util.parentNull', cat: 'util', name: 'Parent to Null · Привязать к нуль-объекту',
        desc: 'Создаёт Null в центре композиции и делает его родителем всех выделенных слоёв.',
        tags: 'null parent родитель нуль объект',
        apply: function (c) {
            if (!once(c)) return;
            var n = UK.nullLayer(c.comp, 'Control');
            n.transform.position.setValue(UK.center(c.comp));
            var top = c.layers[0];
            for (var i = 0; i < c.layers.length; i++) {
                if (c.layers[i].index < top.index) top = c.layers[i];
                if (c.layers[i] !== n && !c.layers[i].parent) c.layers[i].parent = n;
            }
            n.moveBefore(top);
        }
    });
    UK.add({
        id: 'util.precomposeEach', cat: 'util', name: 'Precompose Each · Прекомпоз каждого',
        desc: 'Каждый выделенный слой — в отдельную прекомпозицию (с переносом атрибутов).',
        tags: 'precompose прекомпоз каждый',
        apply: function (c) {
            if (!once(c)) return;
            var ls = sortByIndexDesc(c.layers);
            for (var i = 0; i < ls.length; i++) {
                c.comp.layers.precompose([ls[i].index], ls[i].name + ' [pre]', true);
            }
        }
    });

    // -------------------------------------------------------------- toggles
    UK.add({
        id: 'util.motionBlur', cat: 'util', name: 'Toggle Motion Blur · Motion Blur вкл/выкл',
        desc: 'Переключает motion blur слоя и включает его в композиции.',
        tags: 'motion blur toggle размытие движения',
        apply: function (c) {
            c.layer.motionBlur = !c.layer.motionBlur;
            try { c.comp.motionBlur = true; } catch (e) {}
        }
    });
    UK.add({
        id: 'util.toggle3D', cat: 'util', name: 'Toggle 3D · 3D-слой вкл/выкл',
        desc: 'Переключает 3D у выделенных слоёв.',
        tags: '3d toggle слой',
        apply: function (c) { c.layer.threeDLayer = !c.layer.threeDLayer; }
    });
    UK.add({
        id: 'util.solo', cat: 'util', name: 'Toggle Solo · Соло вкл/выкл',
        desc: 'Переключает соло у выделенных слоёв.',
        tags: 'solo соло',
        apply: function (c) { c.layer.solo = !c.layer.solo; }
    });
    UK.add({
        id: 'util.removeAllFx', cat: 'util', name: 'Remove All Effects · Удалить все эффекты',
        desc: 'Удаляет ВСЕ эффекты со слоя (не только UniKit).',
        tags: 'remove effects удалить все эффекты очистить',
        apply: function (c) {
            var fxs = c.layer.property('ADBE Effect Parade');
            for (var i = fxs.numProperties; i >= 1; i--) fxs.property(i).remove();
        }
    });
    UK.add({
        id: 'util.marker', cat: 'util', name: 'Marker at Playhead · Маркер на курсоре',
        desc: 'Ставит маркер слоя в позиции курсора.',
        tags: 'marker маркер курсор',
        apply: function (c) {
            c.layer.property('ADBE Marker').setValueAtTime(c.comp.time, new MarkerValue('UK'));
        }
    });

})();


// ---- src/80_combos.jsx
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


// ---- src/90_footer.jsx
// =============================================================================
//  Запуск
// =============================================================================
if (typeof $ !== 'undefined' && $.global && $.global.UK_HEADLESS) {
    // режим тестов: экспортируем ядро без UI
    $.global.UK = UK;
} else {
    UK.buildUI(thisObj);
}

})(this);

