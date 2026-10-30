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
