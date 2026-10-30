// Минимальный мок After Effects ExtendScript API для прогона пресетов в node.
// Не проверяет корректность matchName параметров (кроме списка известных эффектов),
// но ловит ошибки потока: undefined-функции, опечатки в хелперах, неверные типы.
'use strict';

const KNOWN_FX = new Set(require('./known_fx.json'));
const log = { alerts: [], unknownFx: new Set(), warnings: [] };

// ---- enums
const PropertyValueType = { NO_VALUE: 0, ThreeD_SPATIAL: 1, ThreeD: 2, TwoD_SPATIAL: 3, TwoD: 4, OneD: 5, COLOR: 6, CUSTOM_VALUE: 7, MARKER: 8, LAYER_INDEX: 9, MASK_INDEX: 10, SHAPE: 11, TEXT_DOCUMENT: 12 };
const PropertyType = { PROPERTY: 0, INDEXED_GROUP: 1, NAMED_GROUP: 2 };
const KeyframeInterpolationType = { LINEAR: 1, BEZIER: 2, HOLD: 3 };
const BlendingMode = new Proxy({}, { get: (t, k) => 'BlendingMode.' + String(k) });
const TrackMatteType = new Proxy({}, { get: (t, k) => 'TrackMatteType.' + String(k) });
const MaskMode = new Proxy({}, { get: (t, k) => 'MaskMode.' + String(k) });
const LayerQuality = new Proxy({}, { get: (t, k) => 'LayerQuality.' + String(k) });
const ParagraphJustification = new Proxy({}, { get: (t, k) => 'ParagraphJustification.' + String(k) });
const LightType = new Proxy({}, { get: (t, k) => 'LightType.' + String(k) });
const AutoOrientType = new Proxy({}, { get: (t, k) => 'AutoOrientType.' + String(k) });
const FrameBlendingType = new Proxy({}, { get: (t, k) => 'FrameBlendingType.' + String(k) });
const LayerSamplingQuality = new Proxy({}, { get: (t, k) => 'LayerSamplingQuality.' + String(k) });
const CloseOptions = new Proxy({}, { get: (t, k) => 'CloseOptions.' + String(k) });
const PurgeTarget = new Proxy({}, { get: (t, k) => 'PurgeTarget.' + String(k) });
const KeyframeEase = class { constructor(speed, influence) { if (influence < 0.1 || influence > 100) throw new Error('KeyframeEase influence out of range: ' + influence); this.speed = speed; this.influence = influence; } };
class Shape { constructor() { this.vertices = []; this.inTangents = []; this.outTangents = []; this.closed = true; } }
class TextDocument { constructor(t) { this.text = t || 'Text'; this.fontSize = 72; this.fillColor = [1, 1, 1]; this.font = 'Arial'; this.justification = 'ParagraphJustification.CENTER_JUSTIFY'; this.tracking = 0; this.applyFill = true; this.applyStroke = false; this.strokeWidth = 0; this.strokeColor = [0,0,0]; this.leading = 0; this.boxText = false; } }
class MarkerValue { constructor(c) { this.comment = c; this.duration = 0; } }

// ---- Property
class Property {
    constructor(parent, name, matchName, valueType, value) {
        this.parentProperty = parent; this.name = name; this.matchName = matchName || name;
        this.propertyType = PropertyType.PROPERTY;
        this.propertyValueType = valueType == null ? PropertyValueType.OneD : valueType;
        this._value = value == null ? 0 : value;
        this.keys = []; this._expression = ''; this.expressionEnabled = true; this.enabled = true;
        this.canSetExpression = true; this.isSpatial = (valueType === PropertyValueType.TwoD_SPATIAL || valueType === PropertyValueType.ThreeD_SPATIAL);
        this.dimensionsSeparated = false; this.numProperties = 0; this.isTimeVarying = false;
    }
    get expression() { return this._expression; }
    set expression(e) { if (typeof e !== 'string') throw new Error('expression must be string on ' + this.name); this._expression = e; checkExpr(e, this); }
    get value() { return this._value; }
    get numKeys() { return this.keys.length; }
    setValue(v) { this._checkVal(v); this._value = v; }
    _checkVal(v) {
        const t = this.propertyValueType;
        if (t === PropertyValueType.OneD && typeof v !== 'number' && typeof v !== 'boolean') throw new Error('setValue: 1D property "' + this.name + '" got ' + JSON.stringify(v));
        if ((t === PropertyValueType.TwoD || t === PropertyValueType.TwoD_SPATIAL) && !(Array.isArray(v) && v.length >= 2)) throw new Error('setValue: 2D property "' + this.name + '" got ' + JSON.stringify(v));
        if ((t === PropertyValueType.ThreeD || t === PropertyValueType.ThreeD_SPATIAL) && !(Array.isArray(v) && v.length >= 2)) throw new Error('setValue: 3D property "' + this.name + '" got ' + JSON.stringify(v));
        if (t === PropertyValueType.COLOR && !(Array.isArray(v) && v.length >= 3)) throw new Error('setValue: color property "' + this.name + '" got ' + JSON.stringify(v));
        if (Array.isArray(v)) for (const x of v) if (typeof x !== 'number' || Number.isNaN(x)) throw new Error('setValue: NaN/non-number in array for "' + this.name + '": ' + JSON.stringify(v));
        if (typeof v === 'number' && Number.isNaN(v)) throw new Error('setValue: NaN for "' + this.name + '"');
    }
    setValueAtTime(t, v) {
        if (typeof t !== 'number' || Number.isNaN(t)) throw new Error('setValueAtTime: bad time ' + t + ' on ' + this.name);
        this._checkVal(v);
        const i = this.keys.findIndex(k => Math.abs(k.time - t) < 1e-6);
        if (i >= 0) this.keys[i].value = v; else { this.keys.push({ time: t, value: v, inType: 2, outType: 2 }); this.keys.sort((a, b) => a.time - b.time); }
        this.isTimeVarying = true;
    }
    setValuesAtTimes(ts, vs) { ts.forEach((t, i) => this.setValueAtTime(t, vs[i])); }
    valueAtTime(t) { return this._value; }
    nearestKeyIndex(t) { let best = 1, bd = Infinity; this.keys.forEach((k, i) => { const d = Math.abs(k.time - t); if (d < bd) { bd = d; best = i + 1; } }); return best; }
    keyTime(i) { this._k(i); return this.keys[i - 1].time; }
    keyValue(i) { this._k(i); return this.keys[i - 1].value; }
    removeKey(i) { this._k(i); this.keys.splice(i - 1, 1); }
    _k(i) { if (i < 1 || i > this.keys.length) throw new Error('bad key index ' + i + ' on ' + this.name + ' (numKeys=' + this.keys.length + ')'); }
    setInterpolationTypeAtKey(i, a, b) { this._k(i); this.keys[i - 1].inType = a; this.keys[i - 1].outType = b == null ? a : b; }
    setTemporalEaseAtKey(i, inE, outE) {
        this._k(i);
        const need = this.isSpatial ? 1 : (this.propertyValueType === PropertyValueType.TwoD ? 2 : this.propertyValueType === PropertyValueType.ThreeD ? 3 : 1);
        if (!Array.isArray(inE) || inE.length !== need) throw new Error('setTemporalEaseAtKey: need ' + need + ' ease(s) on ' + this.name + ', got ' + (inE && inE.length));
        if (outE && outE.length !== need) throw new Error('setTemporalEaseAtKey: out ease count on ' + this.name);
    }
    setSpatialTangentsAtKey() {} setSpatialAutoBezierAtKey() {} setSpatialContinuousAtKey() {} setTemporalAutoBezierAtKey() {} setTemporalContinuousAtKey() {} setRovingAtKey() {}
    keyInInterpolationType(i) { this._k(i); return this.keys[i - 1].inType; }
    setSelectedAtKey() {}
    addKey(t) { this.setValueAtTime(t, this._value); return this.nearestKeyIndex(t); }
    property() { return null; }
    propertyGroup(n) { let p = this.parentProperty; for (let i = 1; i < (n || 1); i++) p = p.parentProperty; return p; }
}

const V = PropertyValueType;
function colorProp(parent, name, match, v) { return new Property(parent, name, match, V.COLOR, v || [1, 1, 1, 1]); }

// ---- PropertyGroup (permissive)
class PropertyGroup {
    constructor(parent, name, matchName, indexed) {
        this.parentProperty = parent; this.name = name; this.matchName = matchName || name;
        this.propertyType = indexed ? PropertyType.INDEXED_GROUP : PropertyType.NAMED_GROUP;
        this.children = []; this.enabled = true; this._permissive = true;
    }
    get numProperties() { return this.children.length; }
    canAddProperty(m) { if (this._fxParade) return true; return true; }
    _find(x) {
        if (typeof x === 'number') { if (x < 1 || x > this.children.length) throw new Error('property index out of range: ' + x + ' in ' + this.name); return this.children[x - 1]; }
        return this.children.find(c => c.matchName === x || c.name === x) || null;
    }
    property(x) {
        const f = this._find(x);
        if (f) return f;
        if (typeof x === 'number') return null;
        if (!this._permissive) return null;
        // авто-создание: угадываем тип по имени
        return this._auto(x);
    }
    _auto(x) {
        const n = String(x);
        let t = V.OneD, val = 0;
        if (/Color|Colour|Tint|Map Black|Map White|Highlights|Midtones|Shadows|Brights|Darktones/i.test(n) && !/Amount|Loop|Phase|Mode|Operation|Dimensions/i.test(n)) { t = V.COLOR; val = [1, 1, 1, 1]; }
        else if (/Center|Centre|Position|Point|Offset|Anchor|Corner|Pin|Knot|Start of|End of|Starting Point|Ending Point|Reflection Center|Shift Center|Wipe Center|Iris Center|View Center|Flare Center|Tile Center|Twirl Center|Bulge Center|Center of|Sweep/i.test(n) && !/Offset \(Turbulence\)|Percent Offset|Phase|Amount|Width|Height|Blend|Softness|Intensity|Direction|Shape|Edge|Thickness|Reception/i.test(n)) { t = V.TwoD; val = [0, 0]; }
        else if (/^ADBE Point Control-0001$/.test(n)) { t = V.TwoD; val = [0, 0]; }
        else if (/^ADBE Color Control-0001$/.test(n)) { t = V.COLOR; val = [1, 1, 1, 1]; }
        if (/Tile-0001|Geometry2-0001|Geometry2-0002|Light Sweep-0001|Lens-0001|Radial Blur-0002|Radial Fast Blur-0001|Light Rays-0002|Light Burst 2.5-0001|Ripple-0002|Bulge-0003|Twirl-0003|Mirror-0001|Spherize-0002|Offset-0001|Magnify-0002|Kaleida-0001|Vignette-0003|Ramp-0001|Ramp-0003|Circle-0001|Ellipse-0001|Lens Flare-0001|Radial Wipe-0003|Iris Wipe-0001|Grid Wipe-0002|Jaws-0002|Light Wipe-0002|Radial ScaleWipe-0002|Scale Wipe-0002|Twister-0003|Fractal Noise-0013|Turbulent Displace-0004|Drop Shadow-0001$|Cell Pattern-0007|Laser-0001|Laser-0002|Corner Pin-000[1-4]|Power Pin-000[1-4]|Flo Motion-0002|Flo Motion-0004|Griddler|Glass-0007|Burn Film-0002|Light Burst 2.5-0001$/i.test(n)) {
            if (/Drop Shadow-0001$/.test(n)) { t = V.COLOR; val = [0, 0, 0, 1]; }
            else if (/Light Sweep-0008|Ramp-0002|Ramp-0004|Light Rays-0009|Light Burst 2.5-0007|Laser-0008|Laser-0009|Circle-0009|Ellipse-0005|Ellipse-0006|Light Wipe-0007|Fractal Noise-0013/.test(n)) { }
            else { t = V.TwoD; val = [0, 0]; }
        }
        if (/Light Sweep-0008|Ramp-0002|Ramp-0004|Light Rays-0009|Light Burst 2\.5-0007|Laser-0008|Laser-0009|Circle-0009|Ellipse-0005|Ellipse-0006|Light Wipe-0007|Glo2-0012|Glo2-0013|Tint-0001|Tint-0002|Tritone-000[1-3]|Fill-0003|Stroke-0004|Toner-000[2-6]|Bevel Alpha-0003|Bevel Edges-0003|Strobe-0001|Grid-0011|Checkerboard-0009|Photo Filter-0002|Roughen Edges-0002|Color Control-0001|4ColorGradient-000[2468]|Vegas|Lightning 2-00(09|10|11)|Black&White-0008|Leave Color-0002|Change To Color-000[12]/.test(n)) { t = V.COLOR; val = [1, 1, 1, 1]; }
        if (/Fractal Noise-0013|Turbulent Displace-0004|Cell Pattern-0007/.test(n)) { t = V.TwoD; val = [0, 0]; }
        const p = new Property(this, n, n, t, val);
        this.children.push(p);
        return p;
    }
    addProperty(m) {
        if (this._fxParade) {
            if (!KNOWN_FX.has(m)) log.unknownFx.add(m);
            const fx = new PropertyGroup(this, m, m, false);
            fx._isEffect = true;
            this.children.push(fx);
            fx.remove = () => { const i = this.children.indexOf(fx); if (i >= 0) this.children.splice(i, 1); };
            fx.moveTo = (i) => { const idx = this.children.indexOf(fx); this.children.splice(idx, 1); this.children.splice(i - 1, 0, fx); };
            // Slider/Point/Color controls: property(1) typed
            if (m === 'ADBE Slider Control') fx.children.push(new Property(fx, 'Slider', 'ADBE Slider Control-0001', V.OneD, 0));
            if (m === 'ADBE Point Control') fx.children.push(new Property(fx, 'Point', 'ADBE Point Control-0001', V.TwoD, [0, 0]));
            if (m === 'ADBE Color Control') fx.children.push(new Property(fx, 'Color', 'ADBE Color Control-0001', V.COLOR, [1, 1, 1, 1]));
            if (m === 'ADBE Checkbox Control') fx.children.push(new Property(fx, 'Checkbox', 'ADBE Checkbox Control-0001', V.OneD, 0));
            if (m === 'ADBE Angle Control') fx.children.push(new Property(fx, 'Angle', 'ADBE Angle Control-0001', V.OneD, 0));
            if (m === 'ADBE Layer Control') fx.children.push(new Property(fx, 'Layer', 'ADBE Layer Control-0001', V.LAYER_INDEX, 0));
            return fx;
        }
        if (this.matchName === 'ADBE Mask Parade') return makeMask(this);
        if (this.matchName === 'ADBE Text Animators') return makeTextAnimator(this);
        if (this.matchName === 'ADBE Text Selectors') return makeTextSelector(this);
        if (this.matchName === 'ADBE Text Animator Properties') {
            const map = { 'ADBE Text Opacity': [V.OneD, 100], 'ADBE Text Position 3D': [V.ThreeD, [0, 0, 0]], 'ADBE Text Scale 3D': [V.ThreeD, [100, 100, 100]], 'ADBE Text Rotation': [V.OneD, 0], 'ADBE Text Blur': [V.TwoD, [0, 0]], 'ADBE Text Tracking Amount': [V.OneD, 0], 'ADBE Text Skew': [V.OneD, 0], 'ADBE Text Fill Color': [V.COLOR, [1, 1, 1, 1]], 'ADBE Text Anchor Point 3D': [V.ThreeD, [0, 0, 0]], 'ADBE Text Stroke Color': [V.COLOR, [1, 1, 1, 1]], 'ADBE Text Stroke Width': [V.OneD, 0], 'ADBE Text Line Anchor': [V.OneD, 0], 'ADBE Text Line Spacing': [V.TwoD, [0, 0]], 'ADBE Text Character Offset': [V.OneD, 0], 'ADBE Text Character Value': [V.OneD, 0], 'ADBE Text Fill Hue': [V.OneD, 0], 'ADBE Text Fill Saturation': [V.OneD, 0], 'ADBE Text Fill Brightness': [V.OneD, 0], 'ADBE Text Fill Opacity': [V.OneD, 100], 'ADBE Text Tracking Type': [V.OneD, 0], 'ADBE Text Skew Axis': [V.OneD, 0], 'ADBE Text Rotation X': [V.OneD, 0], 'ADBE Text Rotation Y': [V.OneD, 0], 'ADBE Text Character Replace': [V.OneD, 0], 'ADBE Text Character Range': [V.OneD, 0], 'ADBE Text Stroke Opacity': [V.OneD, 100] };
            if (!map[m]) { log.warnings.push('unknown text animator property: ' + m); map[m] = [V.OneD, 0]; }
            const p = new Property(this, m, m, map[m][0], map[m][1]);
            this.children.push(p); return p;
        }
        if (this.matchName === 'ADBE Root Vectors Group' || this.matchName === 'ADBE Vectors Group') return makeVectorGroup(this, m);
        const g = new PropertyGroup(this, m, m, false);
        this.children.push(g);
        g.remove = () => { const i = this.children.indexOf(g); if (i >= 0) this.children.splice(i, 1); };
        return g;
    }
    remove() { const i = this.parentProperty.children.indexOf(this); if (i >= 0) this.parentProperty.children.splice(i, 1); }
    propertyGroup(n) { let p = this.parentProperty; for (let i = 1; i < (n || 1); i++) p = p.parentProperty; return p; }
}

function makeMask(parade) {
    const m = new PropertyGroup(parade, 'Mask ' + (parade.children.length + 1), 'ADBE Mask Atom', false);
    m.children.push(new Property(m, 'Mask Path', 'ADBE Mask Shape', V.SHAPE, new Shape()));
    m.children.push(new Property(m, 'Mask Feather', 'ADBE Mask Feather', V.TwoD, [0, 0]));
    m.children.push(new Property(m, 'Mask Opacity', 'ADBE Mask Opacity', V.OneD, 100));
    m.children.push(new Property(m, 'Mask Expansion', 'ADBE Mask Offset', V.OneD, 0));
    m.maskMode = 'MaskMode.ADD'; m.inverted = false; m.maskFeatherFalloff = 0;
    Object.defineProperty(m, 'maskShape', { get() { return m.children[0]; } });
    Object.defineProperty(m, 'maskPath', { get() { return m.children[0]; } });
    Object.defineProperty(m, 'maskFeather', { get() { return m.children[1]; } });
    Object.defineProperty(m, 'maskOpacity', { get() { return m.children[2]; } });
    Object.defineProperty(m, 'maskExpansion', { get() { return m.children[3]; } });
    parade.children.push(m);
    return m;
}
function makeTextAnimator(anims) {
    const a = new PropertyGroup(anims, 'Animator ' + (anims.children.length + 1), 'ADBE Text Animator', false);
    const sels = new PropertyGroup(a, 'Selectors', 'ADBE Text Selectors', true);
    const props = new PropertyGroup(a, 'Properties', 'ADBE Text Animator Properties', false);
    props._permissive = false;
    a.children.push(sels, props);
    anims.children.push(a);
    return a;
}
function makeTextSelector(sels) {
    const s = new PropertyGroup(sels, 'Range Selector ' + (sels.children.length + 1), 'ADBE Text Selector', false);
    s._permissive = false;
    s.children.push(new Property(s, 'Start', 'ADBE Text Percent Start', V.OneD, 0));
    s.children.push(new Property(s, 'End', 'ADBE Text Percent End', V.OneD, 100));
    s.children.push(new Property(s, 'Offset', 'ADBE Text Percent Offset', V.OneD, 0));
    const adv = new PropertyGroup(s, 'Advanced', 'ADBE Text Range Advanced', false);
    adv._permissive = false;
    [['Units', 'ADBE Text Range Units'], ['Based On', 'ADBE Text Range Type2'], ['Mode', 'ADBE Text Selector Mode'], ['Amount', 'ADBE Text Levels Max'], ['Shape', 'ADBE Text Range Shape'], ['Smoothness', 'ADBE Text Selector Smoothness'], ['Ease High', 'ADBE Text Levels Max Ease'], ['Ease Low', 'ADBE Text Levels Min Ease'], ['Randomize Order', 'ADBE Text Randomize Order'], ['Random Seed', 'ADBE Text Random Seed']].forEach(([n, m]) => adv.children.push(new Property(adv, n, m, V.OneD, 0)));
    s.children.push(adv);
    sels.children.push(s);
    return s;
}
function makeVectorGroup(parent, m) {
    const g = new PropertyGroup(parent, m, m, false);
    if (m === 'ADBE Vector Group') {
        const inner = new PropertyGroup(g, 'Contents', 'ADBE Vectors Group', true);
        g.children.push(inner);
        const tr = new PropertyGroup(g, 'Transform', 'ADBE Vector Transform Group', false);
        g.children.push(tr);
    }
    parent.children.push(g);
    g.remove = () => { const i = parent.children.indexOf(g); if (i >= 0) parent.children.splice(i, 1); };
    return g;
}

// ---- Layers
let layerIdSeq = 1;
class Layer {
    constructor(comp, name) {
        this.containingComp = comp; this.name = name; this.id = layerIdSeq++;
        this.startTime = 0; this.inPoint = 0; this.outPoint = comp.duration; this.enabled = true;
        this.locked = false; this.shy = false; this.solo = false; this.label = 0; this.comment = '';
        this.motionBlur = false; this.threeDLayer = false; this.adjustmentLayer = false; this.guideLayer = false;
        this.blendingMode = 'BlendingMode.NORMAL'; this.trackMatteType = 'TrackMatteType.NO_TRACK_MATTE'; this.quality = 'LayerQuality.BEST';
        this.parent = null; this.selected = false; this.hasVideo = true; this.hasAudio = false; this.audioEnabled = false;
        this.timeRemapEnabled = false; this.canSetTimeRemapEnabled = true; this.frameBlendingType = 0; this.collapseTransformation = false; this.preserveTransparency = false;
        this.autoOrient = 'AutoOrientType.NO_AUTO_ORIENT'; this.samplingQuality = 0; this.width = comp.width; this.height = comp.height;
        this.isTrackMatte = false; this.hasTrackMatte = false; this.environmentLayer = false; this.effectsActive = true; this.isNameSet = true;
        this.source = { mainSource: { color: [1, 1, 1] }, width: comp.width, height: comp.height, name: name, duration: comp.duration };
        this._root = new PropertyGroup(null, 'Layer', 'ADBE Root', false);
        this._root._permissive = false;
        this._root.parentProperty = this;
        const tr = new PropertyGroup(this._root, 'Transform', 'ADBE Transform Group', false);
        tr._permissive = false;
        tr.children.push(new Property(tr, 'Anchor Point', 'ADBE Anchor Point', V.TwoD_SPATIAL, [comp.width / 2, comp.height / 2]));
        tr.children.push(new Property(tr, 'Position', 'ADBE Position', V.TwoD_SPATIAL, [comp.width / 2, comp.height / 2]));
        tr.children.push(new Property(tr, 'X Position', 'ADBE Position_0', V.OneD, comp.width / 2));
        tr.children.push(new Property(tr, 'Y Position', 'ADBE Position_1', V.OneD, comp.height / 2));
        tr.children.push(new Property(tr, 'Z Position', 'ADBE Position_2', V.OneD, 0));
        tr.children.push(new Property(tr, 'Scale', 'ADBE Scale', V.ThreeD, [100, 100, 100]));
        tr.children.push(new Property(tr, 'Orientation', 'ADBE Orientation', V.ThreeD, [0, 0, 0]));
        tr.children.push(new Property(tr, 'X Rotation', 'ADBE Rotate X', V.OneD, 0));
        tr.children.push(new Property(tr, 'Y Rotation', 'ADBE Rotate Y', V.OneD, 0));
        tr.children.push(new Property(tr, 'Rotation', 'ADBE Rotate Z', V.OneD, 0));
        tr.children.push(new Property(tr, 'Opacity', 'ADBE Opacity', V.OneD, 100));
        [['anchorPoint','ADBE Anchor Point'],['position','ADBE Position'],['xPosition','ADBE Position_0'],['yPosition','ADBE Position_1'],['zPosition','ADBE Position_2'],['scale','ADBE Scale'],['orientation','ADBE Orientation'],['xRotation','ADBE Rotate X'],['yRotation','ADBE Rotate Y'],['rotation','ADBE Rotate Z'],['zRotation','ADBE Rotate Z'],['opacity','ADBE Opacity'],['pointOfInterest','ADBE Anchor Point']].forEach(([k, m]) => Object.defineProperty(tr, k, { get() { return tr._find(m); } }));
        this._root.children.push(tr);
        const fx = new PropertyGroup(this._root, 'Effects', 'ADBE Effect Parade', true); fx._fxParade = true; fx._permissive = false;
        this._root.children.push(fx);
        const masks = new PropertyGroup(this._root, 'Masks', 'ADBE Mask Parade', true); masks._permissive = false;
        this._root.children.push(masks);
        const ls = new PropertyGroup(this._root, 'Layer Styles', 'ADBE Layer Styles', false);
        this._root.children.push(ls);
        const tro = new PropertyGroup(this._root, 'Time Remap', 'ADBE Time Remapping', false);
        const trp = new Property(this._root, 'Time Remap', 'ADBE Time Remapping', V.OneD, 0);
        this._root.children.push(trp);
        this._root.children.push(new Property(this._root, 'Marker', 'ADBE Marker', V.MARKER, null));
        const ao = new PropertyGroup(this._root, 'Audio', 'ADBE Audio Group', false);
        ao.children.push(new Property(ao, 'Audio Levels', 'ADBE Audio Levels', V.TwoD, [0, 0]));
        this._root.children.push(ao);
        const mo = new PropertyGroup(this._root, 'Material Options', 'ADBE Material Options Group', false);
        this._root.children.push(mo);
        const geo = new PropertyGroup(this._root, 'Geometry Options', 'ADBE Extrsn Options Group', false);
        this._root.children.push(geo);
    }
    get transform() { return this._root.property('ADBE Transform Group'); }
    get anchorPoint() { return this.transform.property('ADBE Anchor Point'); }
    get position() { return this.transform.property('ADBE Position'); }
    get scale() { return this.transform.property('ADBE Scale'); }
    get rotation() { return this.transform.property('ADBE Rotate Z'); }
    get opacity() { return this.transform.property('ADBE Opacity'); }
    get orientation() { return this.transform.property('ADBE Orientation'); }
    get xRotation() { return this.transform.property('ADBE Rotate X'); }
    get yRotation() { return this.transform.property('ADBE Rotate Y'); }
    get zRotation() { return this.transform.property('ADBE Rotate Z'); }
    get marker() { return this._root.property('ADBE Marker'); }
    get timeRemap() { return this._root.property('ADBE Time Remapping'); }
    get mask() { return this._root.property('ADBE Mask Parade'); }
    get effect() { return this._root.property('ADBE Effect Parade'); }
    get index() { return this.containingComp.layers._arr.indexOf(this) + 1; }
    get numProperties() { return this._root.children.length; }
    get active() { return this.enabled; }
    property(x) {
        if (typeof x === 'string') {
            const aliases = { 'Transform': 'ADBE Transform Group', 'Effects': 'ADBE Effect Parade', 'Masks': 'ADBE Mask Parade', 'Position': 'ADBE Position', 'Scale': 'ADBE Scale', 'Rotation': 'ADBE Rotate Z', 'Opacity': 'ADBE Opacity', 'Anchor Point': 'ADBE Anchor Point', 'Time Remap': 'ADBE Time Remapping', 'Contents': 'ADBE Root Vectors Group', 'Text': 'ADBE Text Properties', 'Source Text': 'ADBE Text Document' };
            if (aliases[x]) x = aliases[x];
        }
        let r = this._root.property(x);
        if (!r && typeof x === 'string') { r = this.transform.property(x); }
        if (!r && typeof x === 'string') { const txt = this._root._find('ADBE Text Properties'); if (txt) r = txt.property(x); }
        return r;
    }
    sourceRectAtTime() { return { top: -this.height / 2, left: -this.width / 2, width: this.width, height: this.height }; }
    duplicate() { const d = this.containingComp.layers._clone(this); return d; }
    remove() { const a = this.containingComp.layers._arr; const i = a.indexOf(this); if (i >= 0) a.splice(i, 1); }
    moveToBeginning() { const a = this.containingComp.layers._arr; a.splice(a.indexOf(this), 1); a.unshift(this); }
    moveToEnd() { const a = this.containingComp.layers._arr; a.splice(a.indexOf(this), 1); a.push(this); }
    moveBefore(l) { const a = this.containingComp.layers._arr; a.splice(a.indexOf(this), 1); a.splice(a.indexOf(l), 0, this); }
    moveAfter(l) { const a = this.containingComp.layers._arr; a.splice(a.indexOf(this), 1); a.splice(a.indexOf(l) + 1, 0, this); }
    setParentWithJump(p) { this.parent = p; }
    setTrackMatte(l, t) { this.trackMatteType = t; this.hasTrackMatte = true; }
    removeTrackMatte() { this.hasTrackMatte = false; }
    applyPreset() {}
    openInViewer() {}
    activeAtTime() { return true; }
    copyToComp(c) { return c.layers._clone(this); }
}
class AVLayer extends Layer { }
class ShapeLayer extends AVLayer {
    constructor(comp, name) {
        super(comp, name);
        const root = new PropertyGroup(this._root, 'Contents', 'ADBE Root Vectors Group', true);
        this._root.children.splice(1, 0, root);
        this.width = 0; this.height = 0;
    }
    sourceRectAtTime() { return { top: -100, left: -100, width: 200, height: 200 }; }
}
class TextLayer extends AVLayer {
    constructor(comp, name) {
        super(comp, name);
        const tp = new PropertyGroup(this._root, 'Text', 'ADBE Text Properties', false);
        tp._permissive = false;
        const doc = new Property(tp, 'Source Text', 'ADBE Text Document', V.TEXT_DOCUMENT, new TextDocument(name));
        tp.children.push(doc);
        tp.children.push(new PropertyGroup(tp, 'Path Options', 'ADBE Text Path Options', false));
        const mo = new PropertyGroup(tp, 'More Options', 'ADBE Text More Options', false);
        mo.children.push(new Property(mo, 'Anchor Point Grouping', 'ADBE Text Anchor Point Option', V.OneD, 1));
        mo.children.push(new Property(mo, 'Grouping Alignment', 'ADBE Text Grouping Alignment', V.TwoD, [0, 0]));
        mo.children.push(new Property(mo, 'Fill & Stroke', 'ADBE Text Render Order', V.OneD, 1));
        mo.children.push(new Property(mo, 'Inter-Character Blending', 'ADBE Text Character Blend Mode', V.OneD, 1));
        tp.children.push(mo);
        const anims = new PropertyGroup(tp, 'Animators', 'ADBE Text Animators', true);
        anims._permissive = false;
        tp.children.push(anims);
        this._root.children.splice(1, 0, tp);
        this.width = 600; this.height = 120;
    }
    get text() { return this._root.property('ADBE Text Properties'); }
    get sourceText() { return this.text.property('ADBE Text Document'); }
    sourceRectAtTime() { return { top: -60, left: -300, width: 600, height: 120 }; }
}
class CameraLayer extends Layer { constructor(c, n) { super(c, n); this.threeDLayer = true; const co = new PropertyGroup(this._root, 'Camera Options', 'ADBE Camera Options Group', false); co.children.push(new Property(co, 'Zoom', 'ADBE Camera Zoom', V.OneD, 1000)); co.children.push(new Property(co, 'Depth of Field', 'ADBE Camera Depth of Field', V.OneD, 0)); co.children.push(new Property(co, 'Focus Distance', 'ADBE Camera Focus Distance', V.OneD, 1000)); co.children.push(new Property(co, 'Aperture', 'ADBE Camera Aperture', V.OneD, 25)); co.children.push(new Property(co, 'Blur Level', 'ADBE Camera Blur Level', V.OneD, 100)); this._root.children.push(co); this.transform.children.push(new Property(this.transform, 'Point of Interest', 'ADBE Anchor Point', V.ThreeD_SPATIAL, [0, 0, 0])); this.hasVideo = false; } get pointOfInterest() { return this.transform.property('ADBE Anchor Point'); } get cameraOption() { return this._root.property('ADBE Camera Options Group'); } }
class LightLayer extends Layer { constructor(c, n) { super(c, n); this.lightType = 'LightType.POINT'; const lo = new PropertyGroup(this._root, 'Light Options', 'ADBE Light Options Group', false); this._root.children.push(lo); this.hasVideo = false; } get lightOption() { return this._root.property('ADBE Light Options Group'); } }

class LayerCollection {
    constructor(comp) { this.comp = comp; this._arr = []; return new Proxy(this, { get(t, k) { if (typeof k === 'string' && /^\d+$/.test(k)) return t._arr[Number(k) - 1]; return t[k]; } }); }
    get length() { return this._arr.length; }
    _push(l) { this._arr.unshift(l); return l; }
    addSolid(color, name, w, h, par, dur) { const l = new AVLayer(this.comp, name); l.source.mainSource.color = color; l.width = w; l.height = h; l.source.width = w; l.source.height = h; l.isSolid = true; return this._push(l); }
    addNull(dur) { const l = new AVLayer(this.comp, 'Null'); l.nullLayer = true; l.width = 100; l.height = 100; return this._push(l); }
    addText(t) { const l = new TextLayer(this.comp, typeof t === 'string' ? t : 'Text'); return this._push(l); }
    addBoxText(size, t) { return this.addText(t); }
    addShape() { return this._push(new ShapeLayer(this.comp, 'Shape Layer')); }
    addCamera(n, c) { return this._push(new CameraLayer(this.comp, n)); }
    addLight(n, c) { return this._push(new LightLayer(this.comp, n)); }
    add(item, dur) { const l = new AVLayer(this.comp, item.name || 'Footage'); l.source = item; return this._push(l); }
    byName(n) { return this._arr.find(l => l.name === n) || null; }
    precompose(indices, name, moveAll) { const c = app.project.items.addComp(name, this.comp.width, this.comp.height, 1, this.comp.duration, this.comp.frameRate); const l = new AVLayer(this.comp, name); l.source = c; indices.slice().sort((a, b) => b - a).forEach(i => this._arr.splice(i - 1, 1)); this._arr.unshift(l); return c; }
    _clone(src) { const l = new src.constructor(this.comp, src.name); l.inPoint = src.inPoint; l.outPoint = src.outPoint; l.startTime = src.startTime; l.width = src.width; l.height = src.height; l.threeDLayer = src.threeDLayer; this._arr.splice(this._arr.indexOf(src), 0, l); return l; }
}

class CompItem {
    constructor(name, w, h, par, dur, fps) {
        this.name = name; this.width = w; this.height = h; this.pixelAspect = par || 1; this.duration = dur; this.frameRate = fps; this.frameDuration = 1 / fps;
        this.time = 0; this.motionBlur = false; this.layers = new LayerCollection(this); this.workAreaStart = 0; this.workAreaDuration = dur; this.bgColor = [0, 0, 0];
        this.shutterAngle = 180; this.shutterPhase = 0; this.hideShyLayers = false; this.displayStartTime = 0; this.preserveNestedFrameRate = false; this.id = Math.floor(Math.random() * 1e6); this.typeName = 'Composition'; this.comment = '';
    }
    get numLayers() { return this.layers.length; }
    get selectedLayers() { return this.layers._arr.filter(l => l.selected); }
    get activeCamera() { return this.layers._arr.find(l => l instanceof CameraLayer) || null; }
    layer(x) { if (typeof x === 'number') return this.layers._arr[x - 1]; return this.layers.byName(x); }
    openInViewer() {}
}
const app = {
    version: '25.0.0',
    project: { activeItem: null, items: { addComp(n, w, h, p, d, f) { const c = new CompItem(n, w, h, p, d, f); return c; }, addFolder(n) { return { name: n }; }, length: 0 }, bitsPerChannel: 8, file: null, save() {}, close() {}, numItems: 0, item() { return null; } },
    settings: { _s: {}, haveSetting(a, k) { return (a + '/' + k) in this._s; }, getSetting(a, k) { return this._s[a + '/' + k]; }, saveSetting(a, k, v) { this._s[a + '/' + k] = String(v); } },
    beginUndoGroup() { app._undo++; }, endUndoGroup() { app._undo--; }, _undo: 0,
    activeViewer: { setActive() {} }, executeCommand() {}, findMenuCommandId() { return 0; },
    isoLanguage: 'en_US', preferences: {}, buildName: 'mock', quit() {}
};
function alert(s) { log.alerts.push(String(s)); }
function prompt() { return null; }
function confirm() { return true; }
function writeLn() {}
function checkExpr(e, p) {
    // грубая проверка баланса скобок в выражении
    let bal = 0, par = 0, br = 0, inS = null;
    for (let i = 0; i < e.length; i++) {
        const ch = e[i];
        if (inS) { if (ch === '\\') { i++; continue; } if (ch === inS) inS = null; continue; }
        if (ch === '"' || ch === "'") { inS = ch; continue; }
        if (ch === '{') bal++; else if (ch === '}') bal--; else if (ch === '(') par++; else if (ch === ')') par--; else if (ch === '[') br++; else if (ch === ']') br--;
    }
    if (bal || par || br || inS) log.warnings.push('expression unbalanced on "' + p.name + '": ' + e.slice(0, 120).replace(/\n/g, ' '));
    // синтаксис выражения: оборачиваем в функцию и парсим
    try { new Function('time,value,thisComp,thisLayer,effect,wiggle,loopOut,loopIn,numKeys,nearestKey,key,velocityAtTime,valueAtTime,linear,ease,easeIn,easeOut,random,seedRandom,noise,clamp,length,index,inPoint,outPoint,thisProperty,sourceRectAtTime,framesToTime,timeToFrames,degreesToRadians,radiansToDegrees,comp,layer,footage,posterizeTime,lookAt,toComp,fromComp,toWorld,fromWorld,text,transform,marker,width,height,name,hasParent,parent,anchorPoint,position,scale,rotation,opacity,speedAtTime,propertyGroup,sampleImage,hslToRgb,rgbToHsl,add,sub,mul,div,dot,normalize,cross,colorDepth,timeStart,duration,frameDuration,textIndex,textTotal,selectorValue', e); }
    catch (err) { log.warnings.push('expression SYNTAX on "' + p.name + '": ' + err.message + ' :: ' + e.slice(0, 160).replace(/\n/g, ' ')); }
}

const $ = { global: { UK_HEADLESS: true }, fileName: 'mock', os: 'Windows', writeln() {}, locale: 'en_US', version: '4.5' };
class File { constructor(p) { this.path = p; this.exists = false; } open() { return true; } write() {} close() {} writeln() {} }
class Folder { constructor(p) { this.path = p; } static get userData() { return new Folder('~'); } }

module.exports = { app, $, alert, prompt, confirm, writeLn, File, Folder, log, CompItem, AVLayer, TextLayer, ShapeLayer, CameraLayer, LightLayer, Layer, Property, PropertyGroup, PropertyValueType, PropertyType, KeyframeInterpolationType, KeyframeEase, BlendingMode, TrackMatteType, MaskMode, LayerQuality, ParagraphJustification, LightType, AutoOrientType, FrameBlendingType, LayerSamplingQuality, CloseOptions, PurgeTarget, Shape, TextDocument, MarkerValue, Window: class {}, Panel: class {} };
