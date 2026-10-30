/* UniKit CEP panel — логика интерфейса. Вся работа с AE — через UK.*JSON в ExtendScript. */
(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };
    var DEV = !CEP.inHost;

    // ------------------------------------------------------------ иконки категорий
    var ICONS = {
        'in': '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14"/><path d="M3 12h10M9 8l4 4-4 4"/></svg>',
        out: '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14"/><path d="M8 12h13M17 8l4 4-4 4"/></svg>',
        trans: '<svg class="ico" viewBox="0 0 24 24"><rect x="2" y="7" width="8" height="10"/><rect x="14" y="7" width="8" height="10"/><path d="M10 12h4M12.5 10l1.5 2-1.5 2"/></svg>',
        fx: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 20l9-9M11 11l2 2"/><path d="M15 3v3M14 4.5h2M19 8v2M18 9h2M18 14v2M17 15h2"/></svg>',
        distort: '<svg class="ico" viewBox="0 0 24 24"><path d="M3 7c3-3 6 3 9 0s6 3 9 0M3 12c3-3 6 3 9 0s6 3 9 0M3 17c3-3 6 3 9 0s6 3 9 0"/></svg>',
        light: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
        text: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 6V4h14v2M12 4v16M9 20h6"/></svg>',
        cam: '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="10"/><path d="M16 11l5-3v8l-5-3z"/></svg>',
        util: '<svg class="ico" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.3-.4-.4-2.3z"/></svg>',
        design: '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8"/><circle cx="17" cy="7" r="4"/><path d="M3 21l4-8 4 8z"/><rect x="13" y="13" width="8" height="8"/></svg>',
        combo: '<svg class="ico" viewBox="0 0 24 24"><path d="M3 10l9-5 9 5-9 5z"/><path d="M3 15l9 5 9-5"/></svg>',
        fav: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"/></svg>'
    };
    var SHORT = { 'in': 'In', out: 'Out', trans: 'Переходы', fx: 'Эффекты', distort: 'Искажения', light: 'Свет', text: 'Текст', cam: 'Камера', design: 'Дизайн', util: 'Утилиты', combo: 'Решения', fav: 'Избранное' };

    // ------------------------------------------------------------ состояние
    var S = {
        catalog: null, cat: 'in', query: '', selected: null, favs: {}, previewActive: false, busy: false,
        // mode: 'curve' | 'back' | 'bounce' | 'elastic'; curveId — id из библиотеки или 'custom'
        mode: 'curve', curveId: 'expoOut',
        opts: { dur: 0.8, ease: 'expoOut', strength: 100, dir: 'L', startMode: 'in', stagger: 0.1, controls: true, adj: false, bez: [0.19, 1, 0.22, 1] }
    };
    var LS = {
        get: function (k, d) { try { var v = localStorage.getItem('uk.' + k); return v === null ? d : v; } catch (e) { return d; } },
        set: function (k, v) { try { localStorage.setItem('uk.' + k, String(v)); } catch (e) {} }
    };

    // ------------------------------------------------------------ мост к хосту
    function hostCall(expr, cb) {
        if (DEV) { devHost(expr, cb); return; }
        CEP.evalScript(expr, function (res) {
            if (res === 'EvalScript error.' || res === undefined || res === null || res === '') { cb(null, 'Ошибка ExtendScript: ' + expr.slice(0, 60)); return; }
            try { cb(JSON.parse(res)); } catch (e) { cb(null, 'Некорректный ответ хоста: ' + String(res).slice(0, 120)); }
        });
    }
    function ukCall(fn, args, cb) {
        var a = (args || []).map(function (x) { return JSON.stringify(typeof x === 'string' ? x : JSON.stringify(x)); }).join(', ');
        hostCall('$.global.UK.' + fn + '(' + a + ')', cb);
    }
    function loadHost(cb) {
        if (DEV) {
            fetch('dev/catalog.json').then(function (r) { return r.json(); }).then(function (j) { cb(j); }).catch(function () { cb(null, 'dev/catalog.json не найден (node cep/com.unikit.panel/dev/gen_catalog.js)'); });
            return;
        }
        var ext = CEP.getSystemPath('extension');
        var file = ext + '/host/UniKit.jsx';
        var code = '(function(){try{if(typeof $.global.UK==="undefined"||!$.global.UK.catalogJSON){$.global.UK_HEADLESS=true;$.evalFile(new File(' + JSON.stringify(file) + '));}return $.global.UK.catalogJSON();}' +
            'catch(e){return "{\\"error\\":\\"" + String(e).replace(/"/g, "\'").replace(/\\\\/g, "/").replace(/[\\r\\n]+/g, " ") + "\\"}";}})()';
        hostCall(code, function (j, err) {
            if (!j) { cb(null, err); return; }
            if (j.error) { cb(null, 'Хост-скрипт: ' + j.error); return; }
            cb(j);
        });
    }

    // dev-эмуляция хоста (браузер без AE)
    var devSel = { comp: true, compName: 'Demo Comp', time: 2.5, count: 1, names: ['Footage.mp4'], hasText: false };
    function devHost(expr, cb) {
        var m = expr.match(/UK\.(\w+)\(/), fn = m ? m[1] : '';
        var r = { ok: true };
        if (fn === 'selectionJSON') r = devSel;
        else if (fn === 'toggleFavJSON') { var id = JSON.parse(expr.match(/\((.*)\)$/)[1]); S.favs[id] = !S.favs[id]; r = { fav: !!S.favs[id], favs: Object.keys(S.favs).filter(function (k) { return S.favs[k]; }) }; }
        else if (fn === 'previewJSON') r = { ok: true, active: true };
        else if (fn === 'previewUndoJSON') r = { ok: true, undone: true };
        else if (fn === 'resetJSON') r = { ok: true, changes: 4, removedLayers: 1 };
        else if (fn === 'applyEaseKeysJSON') r = { ok: true, pairs: 2 };
        else if (fn === 'undoJSON' || fn === 'redoJSON') r = { ok: true };
        setTimeout(function () { cb(r); }, 120);
    }

    // ------------------------------------------------------------ вкладки
    function renderTabs() {
        var el = $('tabs'); el.innerHTML = '';
        S.catalog.cats.forEach(function (c) {
            var b = document.createElement('button');
            b.className = 'tab' + (c.id === S.cat ? ' active' : '');
            b.type = 'button'; b.dataset.cat = c.id; b.title = c.name;
            b.innerHTML = (ICONS[c.id] || ICONS.fx) + '<span>' + (SHORT[c.id] || c.name) + '</span>';
            b.addEventListener('click', function () { setCat(c.id); });
            el.appendChild(b);
        });
    }
    function setCat(id) {
        S.cat = id; LS.set('cat', id);
        $('search').value = ''; S.query = ''; $('searchClear').classList.add('hidden');
        renderTabs(); renderGrid();
        var t = document.querySelector('.tab.active'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' });
    }

    // ------------------------------------------------------------ сетка
    function filtered() {
        var q = S.query.trim().toLowerCase();
        return S.catalog.presets.filter(function (p) {
            if (q) { return (p.name + ' ' + p.tags + ' ' + p.desc + ' ' + p.id).toLowerCase().indexOf(q) >= 0; }
            if (S.cat === 'fav') return !!S.favs[p.id];
            return p.cat === S.cat;
        });
    }
    function renderGrid() {
        var grid = $('grid'); grid.innerHTML = '';
        var list = filtered();
        var tpl = $('tplCard');
        if (!list.length) {
            var e = document.createElement('div'); e.className = 'empty';
            e.innerHTML = (S.cat === 'fav' && !S.query ? ICONS.fav + '<b>Избранное пусто</b>Отмечайте пресеты звёздочкой.' :
                '<svg class="ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8 11h6"/></svg><b>Ничего не найдено</b>Попробуйте другое слово: glitch, zoom, текст.');
            grid.appendChild(e);
            select(null);
            return;
        }
        var frag = document.createDocumentFragment();
        list.forEach(function (p) {
            var node = tpl.content.firstElementChild.cloneNode(true);
            node.dataset.id = p.id;
            node.querySelector('.pv').dataset.preview = p.preview || 'fadeIn';
            node.querySelector('.name').textContent = p.name;
            node.title = (S.query && S.cat !== p.cat ? catName(p.cat) + ' · ' : '') + (p.desc || p.name);
            var star = node.querySelector('.star'); if (S.favs[p.id]) star.classList.add('on');
            var badge = node.querySelector('.badge');
            if (p.needs === 'text') { badge.textContent = 'T'; badge.className = 'badge show'; badge.title = 'Текстовый слой'; }
            else if (p.needs === 'trans') { badge.textContent = 'A→B'; badge.className = 'badge show'; badge.title = 'Переход: 2 слоя или курсор на склейке'; }
            if (S.selected && S.selected.id === p.id) node.classList.add('selected');
            node.addEventListener('click', function (ev) { if (ev.target.closest('.star')) return; select(p, node); });
            node.addEventListener('dblclick', function (ev) { if (ev.target.closest('.star')) return; select(p, node); apply(); });
            star.addEventListener('click', function (ev) { ev.stopPropagation(); toggleFav(p.id); });
            frag.appendChild(node);
        });
        grid.appendChild(frag);
        if (S.selected && !list.some(function (p) { return p.id === S.selected.id; })) select(null);
    }
    function catName(id) { var c = S.catalog.cats.filter(function (x) { return x.id === id; })[0]; return c ? c.name : id; }

    function select(p, node) {
        S.selected = p;
        Array.prototype.forEach.call(document.querySelectorAll('.card.selected'), function (n) { n.classList.remove('selected'); });
        var info = $('info');
        if (!p) { info.classList.add('hidden'); $('btnApply').disabled = true; $('btnPreview').disabled = true; return; }
        if (node) node.classList.add('selected');
        info.classList.remove('hidden');
        $('infoName').textContent = p.name;
        $('infoDesc').textContent = p.desc || '';
        $('infoFav').classList.toggle('on', !!S.favs[p.id]);
        $('btnApply').disabled = false; $('btnPreview').disabled = false;
        updateHint();
    }
    function updateHint() {
        var h = $('infoHint'), p = S.selected; h.className = 'info-hint';
        if (!p) return;
        if (p.needs === 'text') { h.textContent = lastSel.hasText || !lastSel.comp ? 'Применяется к текстовым слоям (аниматоры).' : 'Нужен текстовый слой — выделите его.'; h.classList.add('show'); if (lastSel.comp && !lastSel.hasText) h.classList.add('warn'); }
        else if (p.needs === 'trans') { h.textContent = 'Переход: выделите 2 соседних слоя (склейка = начало верхнего) или 1 слой и поставьте курсор на склейку.'; h.classList.add('show'); if (lastSel.comp && lastSel.count === 0) h.classList.add('warn'); }
        else if (p.needs === 'none' || p.needs === 'comp') { h.textContent = 'Работает с композицией / всем выделением.'; h.classList.add('show'); }
        else if (lastSel.comp && lastSel.count === 0) { h.textContent = 'Выделите хотя бы один слой.'; h.classList.add('show', 'warn'); }
    }
    function toggleFav(id) {
        ukCall('toggleFavJSON', [id], function (r) {
            if (!r) return;
            S.favs[id] = !!r.fav;
            Array.prototype.forEach.call(document.querySelectorAll('.card[data-id="' + CSS.escape(id) + '"] .star'), function (s) { s.classList.toggle('on', !!r.fav); });
            if (S.selected && S.selected.id === id) $('infoFav').classList.toggle('on', !!r.fav);
            if (S.cat === 'fav') renderGrid();
        });
    }

    // ------------------------------------------------------------ настройки
    function initSettings() {
        var st = S.catalog.settings || {};
        S.opts.dur = num(st.dur, 0.8); S.opts.strength = num(st.strength, 100);
        S.opts.dir = st.dir || 'L'; S.opts.startMode = st.startMode || 'in'; S.opts.stagger = num(st.stagger, 0.1);
        S.opts.controls = String(st.controls) !== 'false'; S.opts.adj = String(st.adj) === 'true';

        // изинг: восстановить режим/кривую
        var ease = st.ease || 'expoOut';
        var bez = parseBez(LS.get('bez', st.bez || '[0.19,1,0.22,1]'));
        if (ease === 'back' || ease === 'bounce' || ease === 'elastic') { S.mode = ease; }
        else { S.mode = 'curve'; }
        var lib = curveById(ease);
        if (ease === 'custom' || !lib) { S.curveId = 'custom'; if (!bez) bez = [0.19, 1, 0.22, 1]; }
        else { S.curveId = lib.id; bez = lib.bez.slice(); }
        // старые ease-id (smooth, soft, expoIn...) без кривой в библиотеке → ближайшая кривая
        if (!lib && ease !== 'custom' && S.mode === 'curve') { var mapOld = { smooth: 'easeInOut', soft: 'cubicOut', expoOut: 'expoOut', expoIn: 'expoIn', expoInOut: 'expoInOut', linear: 'linear' }; var c2 = curveById(mapOld[ease] || 'expoOut'); if (c2) { S.curveId = c2.id; bez = c2.bez.slice(); } }
        S.opts.bez = bez;

        bind('optDur', 'optDurR', function (v) { S.opts.dur = clamp(v, 0.05, 20); }, 0.8);
        Array.prototype.forEach.call($('durChips').querySelectorAll('button'), function (b) {
            b.addEventListener('click', function () { S.opts.dur = num(b.dataset.v, 0.8); syncSettings(); });
        });
        bind('optStrN', 'optStr', function (v) { S.opts.strength = clamp(v, 0, 1000); }, 100);
        bind('optStag', 'optStagR', function (v) { S.opts.stagger = clamp(v, 0, 5); }, 0.1);
        Array.prototype.forEach.call($('optDir').querySelectorAll('button'), function (b) {
            b.addEventListener('click', function () { S.opts.dir = b.dataset.v; syncSettings(); });
        });
        Array.prototype.forEach.call($('optStart').querySelectorAll('button'), function (b) {
            b.addEventListener('click', function () { S.opts.startMode = b.dataset.v; syncSettings(); });
        });
        $('optControls').checked = S.opts.controls;
        $('optControls').addEventListener('change', function () { S.opts.controls = this.checked; syncSettings(); });
        $('optAdj').checked = S.opts.adj;
        $('optAdj').addEventListener('change', function () { S.opts.adj = this.checked; syncSettings(); });

        var collapsed = LS.get('settingsCollapsed', '0') === '1';
        $('settings').classList.toggle('collapsed', collapsed);
        $('settingsToggle').addEventListener('click', function () {
            var c = !$('settings').classList.contains('collapsed');
            $('settings').classList.toggle('collapsed', c); LS.set('settingsCollapsed', c ? '1' : '0');
            if (!c) drawGraph();
        });
        initEase();
        syncSettings();
    }
    /** связать number-поле и range: оба меняют значение через setter */
    function bind(numId, rangeId, setter, def) {
        var n = $(numId), r = $(rangeId);
        n.addEventListener('input', function () { setter(num(this.value, def)); syncSettings(numId); });
        n.addEventListener('change', function () { syncSettings(); });
        r.addEventListener('input', function () { setter(num(this.value, def)); syncSettings(); });
    }
    function syncSettings(skipId) {
        var o = S.opts;
        if (skipId !== 'optDur') $('optDur').value = fmt(o.dur);
        $('optDurR').value = clamp(o.dur, 0.1, 3); setPct($('optDurR'));
        if (skipId !== 'optStrN') $('optStrN').value = Math.round(o.strength);
        $('optStr').value = clamp(o.strength, 0, 300); setPct($('optStr'));
        if (skipId !== 'optStag') $('optStag').value = fmt(o.stagger);
        $('optStagR').value = clamp(o.stagger, 0, 0.5); setPct($('optStagR'));
        Array.prototype.forEach.call($('durChips').querySelectorAll('button'), function (b) { b.classList.toggle('on', Math.abs(num(b.dataset.v, -1) - o.dur) < 1e-9); });
        Array.prototype.forEach.call($('optDir').querySelectorAll('button'), function (b) { b.classList.toggle('on', b.dataset.v === o.dir); });
        $('dirLabel').textContent = { L: '←', R: '→', U: '↑', D: '↓' }[o.dir] || '';
        Array.prototype.forEach.call($('optStart').querySelectorAll('button'), function (b) { b.classList.toggle('on', b.dataset.v === o.startMode); });
        // изинг → opts.ease
        if (S.mode === 'curve') o.ease = S.curveId === 'custom' ? 'custom' : S.curveId; else o.ease = S.mode;
        LS.set('bez', JSON.stringify(o.bez));
        var easeName = S.mode === 'curve' ? (S.curveId === 'custom' ? 'Custom' : (curveById(S.curveId) || {}).name || S.curveId) : ({ back: 'Back', bounce: 'Bounce', elastic: 'Elastic' })[S.mode];
        $('easeName').textContent = easeName;
        $('summaryText').textContent = fmt(o.dur) + ' с · ' + Math.round(o.strength) + '% · ' + ($('dirLabel').textContent) + ' · ' + easeName;
        $('summaryCurve').innerHTML = '<rect class="box" x="2" y="2" width="20" height="20"/>' + miniPath(o.bez, 2, 2, 20);
        syncEaseUI();
    }
    function setPct(r) { var mn = num(r.min, 0), mx = num(r.max, 1), v = num(r.value, mn); r.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); }
    function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function fmt(v) { return String(Math.round(v * 100) / 100); }
    function parseBez(s) { try { var a = typeof s === 'string' ? JSON.parse(s) : s; if (Array.isArray(a) && a.length === 4 && a.every(function (x) { return isFinite(x); })) return a.map(Number); } catch (e) {} return null; }
    function curveById(id) { return (S.catalog.curves || []).filter(function (c) { return c.id === id; })[0] || null; }

    // ------------------------------------------------------------ ease editor
    var G = { pad: 14, size: 200, yMin: -0.5, yMax: 1.5, drag: null };
    function gx(x) { return G.pad + x * (G.size - 2 * G.pad); }
    function gy(y) { var h = G.size - 2 * G.pad; return G.pad + (G.yMax - y) / (G.yMax - G.yMin) * h; }
    function ix(px) { return (px - G.pad) / (G.size - 2 * G.pad); }
    function iy(py) { var h = G.size - 2 * G.pad; return G.yMax - (py - G.pad) / h * (G.yMax - G.yMin); }
    function miniPath(b, x0, y0, s) {
        // мини-кривая в квадрате s×s с запасом по Y (overshoot обрезается рамкой)
        function X(x) { return x0 + x * s; } function Y(y) { return y0 + (1 - y) * s; }
        return '<path d="M' + X(0) + ' ' + Y(0) + 'C' + X(b[0]) + ' ' + Y(b[1]) + ' ' + X(b[2]) + ' ' + Y(b[3]) + ' ' + X(1) + ' ' + Y(1) + '"/>';
    }
    function drawGraph() {
        var svg = $('easeGraph'), b = S.opts.bez, s = '';
        var x0 = gx(0), x1 = gx(1), y0 = gy(0), y1 = gy(1);
        // сетка
        for (var i = 1; i < 4; i++) { var t = i / 4; s += '<line class="g" x1="' + gx(t) + '" y1="' + G.pad + '" x2="' + gx(t) + '" y2="' + (G.size - G.pad) + '"/>'; s += '<line class="g" x1="' + G.pad + '" y1="' + gy(t) + '" x2="' + (G.size - G.pad) + '" y2="' + gy(t) + '"/>'; }
        s += '<line class="g" x1="' + G.pad + '" y1="' + gy(-0.25) + '" x2="' + (G.size - G.pad) + '" y2="' + gy(-0.25) + '"/>';
        s += '<line class="g" x1="' + G.pad + '" y1="' + gy(1.25) + '" x2="' + (G.size - G.pad) + '" y2="' + gy(1.25) + '"/>';
        s += '<rect class="box" x="' + x0 + '" y="' + y1 + '" width="' + (x1 - x0) + '" height="' + (y0 - y1) + '"/>';
        s += '<line class="diag" x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y1 + '"/>';
        s += '<text x="' + (x0 + 2) + '" y="' + (y0 + 9) + '">0</text><text x="' + (x1 - 6) + '" y="' + (y1 - 3) + '">1</text>';
        // кривая
        s += '<path class="curve" d="M' + x0 + ' ' + y0 + 'C' + gx(b[0]) + ' ' + gy(b[1]) + ' ' + gx(b[2]) + ' ' + gy(b[3]) + ' ' + x1 + ' ' + y1 + '"/>';
        // ручки
        s += '<line class="hl" x1="' + x0 + '" y1="' + y0 + '" x2="' + gx(b[0]) + '" y2="' + gy(b[1]) + '"/>';
        s += '<line class="hl" x1="' + x1 + '" y1="' + y1 + '" x2="' + gx(b[2]) + '" y2="' + gy(b[3]) + '"/>';
        s += '<circle class="ep" cx="' + x0 + '" cy="' + y0 + '" r="3"/><circle class="ep" cx="' + x1 + '" cy="' + y1 + '" r="3"/>';
        s += '<circle class="hp' + (G.drag === 1 ? ' drag' : '') + '" data-h="1" cx="' + gx(b[0]) + '" cy="' + gy(b[1]) + '" r="5.5"/>';
        s += '<circle class="hp' + (G.drag === 2 ? ' drag' : '') + '" data-h="2" cx="' + gx(b[2]) + '" cy="' + gy(b[3]) + '" r="5.5"/>';
        svg.innerHTML = s;
    }
    function svgPoint(svg, ev) {
        var r = svg.getBoundingClientRect();
        // viewBox 200×200 вписан в прямоугольник (xMidYMid meet)
        var sc = Math.min(r.width, r.height) / G.size;
        var ox = (r.width - G.size * sc) / 2, oy = (r.height - G.size * sc) / 2;
        return { x: (ev.clientX - r.left - ox) / sc, y: (ev.clientY - r.top - oy) / sc };
    }
    function setBez(b, fromLib) {
        S.opts.bez = [round2(clamp(b[0], 0, 1)), round2(clamp(b[1], G.yMin, G.yMax)), round2(clamp(b[2], 0, 1)), round2(clamp(b[3], G.yMin, G.yMax))];
        if (!fromLib) {
            // совпадает ли с кривой библиотеки
            var hit = (S.catalog.curves || []).filter(function (c) { return c.bez.every(function (v, i) { return Math.abs(v - S.opts.bez[i]) < 0.006; }); })[0];
            S.curveId = hit ? hit.id : 'custom';
        }
        if (S.mode !== 'curve') S.mode = 'curve';
        syncSettings();
    }
    function round2(v) { return Math.round(v * 1000) / 1000; }
    function initEase() {
        var svg = $('easeGraph');
        // библиотека
        var lib = $('easeLib'); lib.innerHTML = '';
        (S.catalog.curves || []).forEach(function (c) {
            var b = document.createElement('button'); b.type = 'button'; b.dataset.id = c.id; b.title = c.name + '  [' + c.bez.join(', ') + ']';
            b.innerHTML = '<svg viewBox="0 0 24 24"><rect class="b" x="2" y="2" width="20" height="20"/>' + miniPath(c.bez, 2, 2, 20) + '</svg>';
            b.addEventListener('click', function () { S.curveId = c.id; S.mode = 'curve'; setBez(c.bez.slice(), true); });
            lib.appendChild(b);
        });
        // режимы
        Array.prototype.forEach.call($('easeMode').querySelectorAll('button'), function (b) {
            b.addEventListener('click', function () { S.mode = b.dataset.m; syncSettings(); });
        });
        // числовые поля
        ['bx1', 'by1', 'bx2', 'by2'].forEach(function (id, i) {
            $(id).addEventListener('input', function () { var b = S.opts.bez.slice(); var v = parseFloat(this.value); if (!isFinite(v)) return; b[i] = v; setBez(b); });
        });
        $('bezFlip').addEventListener('click', function () { var b = S.opts.bez; setBez([1 - b[2], 1 - b[3], 1 - b[0], 1 - b[1]]); });
        // перетаскивание ручек
        svg.addEventListener('pointerdown', function (ev) {
            var h = ev.target.getAttribute && ev.target.getAttribute('data-h');
            if (!h) {
                // клик мимо ручки — захватываем ближайшую
                var p = svgPoint(svg, ev), b = S.opts.bez;
                var d1 = Math.hypot(p.x - gx(b[0]), p.y - gy(b[1])), d2 = Math.hypot(p.x - gx(b[2]), p.y - gy(b[3]));
                h = d1 <= d2 ? '1' : '2';
            }
            G.drag = Number(h); svg.setPointerCapture(ev.pointerId); ev.preventDefault();
            drawGraph();
        });
        svg.addEventListener('pointermove', function (ev) {
            if (!G.drag) return;
            var p = svgPoint(svg, ev), b = S.opts.bez.slice();
            var x = clamp(ix(p.x), 0, 1), y = clamp(iy(p.y), G.yMin, G.yMax);
            if (ev.shiftKey) y = Math.round(y * 20) / 20, x = Math.round(x * 20) / 20;
            if (G.drag === 1) { b[0] = x; b[1] = y; } else { b[2] = x; b[3] = y; }
            setBez(b);
        });
        var end = function (ev) { if (!G.drag) return; G.drag = null; try { svg.releasePointerCapture(ev.pointerId); } catch (e) {} drawGraph(); };
        svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
        svg.addEventListener('dblclick', function () { var c = curveById('ease'); if (c) { S.curveId = c.id; setBez(c.bez.slice(), true); } });
        $('btnEaseKeys').addEventListener('click', applyEaseToKeys);
    }
    function syncEaseUI() {
        var b = S.opts.bez;
        Array.prototype.forEach.call($('easeMode').querySelectorAll('button'), function (x) { x.classList.toggle('on', x.dataset.m === S.mode); });
        Array.prototype.forEach.call($('easeLib').querySelectorAll('button'), function (x) { x.classList.toggle('on', S.mode === 'curve' && x.dataset.id === S.curveId); });
        var ids = ['bx1', 'by1', 'bx2', 'by2'];
        ids.forEach(function (id, i) { var el = $(id); if (document.activeElement !== el) el.value = b[i]; el.disabled = S.mode !== 'curve'; });
        $('easeGraph').classList.toggle('dis', S.mode !== 'curve');
        $('bezFlip').disabled = S.mode !== 'curve';
        $('easeHint').textContent = S.mode === 'curve'
            ? 'cubic-bezier(' + b.join(', ') + ')  ·  Shift — шаг 0.05, dbl-click — сброс'
            : 'Выражение поверх ключей; амплитуда — слайдеры UK: Amp / Freq / Decay';
        if (!$('settings').classList.contains('collapsed')) drawGraph();
    }
    function applyEaseToKeys() {
        if (S.busy) return;
        var btn = $('btnEaseKeys'); setBusy(btn, true);
        ukCall('applyEaseKeysJSON', [JSON.stringify(S.opts.bez)], function (r, err) {
            setBusy(btn, false);
            if (!r) { toast(err || 'Нет ответа от After Effects', 'err'); return; }
            if (r.ok) toast('Кривая применена: пар ключей — ' + r.pairs, 'ok', 1800); else toast(r.error || 'Ошибка', 'err', 5000);
        });
    }

    // ------------------------------------------------------------ действия
    function setBusy(btn, on) { btn.classList.toggle('busy', on); S.busy = on; }
    function apply() {
        if (!S.selected || S.busy) return;
        var p = S.selected, btn = $('btnApply');
        var doApply = function () {
            setBusy(btn, true);
            ukCall('runJSON', [p.id, S.opts], function (r, err) {
                setBusy(btn, false);
                if (!r) { toast(err || 'Нет ответа от After Effects', 'err'); return; }
                if (r.ok) toast('Применено: ' + p.name, 'ok', 1600); else toast(r.error || 'Ошибка', 'err', 6000);
                pollSelection();
            });
        };
        if (S.previewActive) { previewUndo(doApply); } else doApply();
    }
    function preview() {
        if (!S.selected || S.busy) return;
        var p = S.selected, btn = $('btnPreview');
        var run = function () {
            setBusy(btn, true);
            ukCall('previewJSON', [p.id, S.opts], function (r, err) {
                setBusy(btn, false);
                if (!r) { toast(err || 'Нет ответа', 'err'); return; }
                if (!r.ok) { toast(r.error || 'Ошибка превью', 'err', 6000); return; }
                S.previewActive = true; updatePreviewButtons();
                toast('Предпросмотр: ' + p.name + '. Оставить или отменить?', 'info', 3000);
            });
        };
        if (S.previewActive) previewUndo(run); else run();
    }
    function previewUndo(next) {
        ukCall('previewUndoJSON', [], function (r, err) {
            S.previewActive = false; updatePreviewButtons();
            if (!r) toast(err || 'Нет ответа', 'err');
            else if (!r.ok) toast(r.error || 'Не удалось отменить', 'err');
            else if (r.undone && !next) toast('Предпросмотр отменён', 'info', 1200);
            if (next) next();
        });
    }
    function previewKeep() {
        ukCall('previewKeepJSON', [], function () { S.previewActive = false; updatePreviewButtons(); toast('Результат оставлен', 'ok', 1200); });
    }
    function updatePreviewButtons() {
        $('btnKeep').classList.toggle('hidden', !S.previewActive);
        $('btnPvUndo').classList.toggle('hidden', !S.previewActive);
        $('btnPreview').classList.toggle('hidden', S.previewActive);
    }
    function undo() {
        if (S.busy) return;
        S.previewActive = false; updatePreviewButtons();
        ukCall('undoJSON', [], function (r, err) {
            if (!r) { toast(err || 'Нет ответа', 'err'); return; }
            if (r.ok) toast('Отменено', 'info', 900); else toast(r.error || 'Ошибка', 'err');
            pollSelection();
        });
    }
    function redo() {
        if (S.busy) return;
        ukCall('redoJSON', [], function (r, err) {
            if (!r) { toast(err || 'Нет ответа', 'err'); return; }
            if (r.ok) toast('Повторено', 'info', 900); else toast(r.error || 'Ошибка', 'err');
            pollSelection();
        });
    }
    function resetLayer() {
        if (S.busy) return;
        if (lastSel.comp && lastSel.count === 0) { toast('Выделите слой для сброса', 'err', 2500); return; }
        toast('Снять все изменения UniKit с выделенных слоёв? Эффекты, контролы, аниматоры, маски UK, ключи и выражения Transform будут удалены.', 'info', 8000, { label: 'Сбросить', fn: function () {
            ukCall('resetJSON', [], function (r, err) {
                if (!r) { toast(err || 'Нет ответа', 'err'); return; }
                if (!r.ok) { toast(r.error || 'Ошибка', 'err'); return; }
                S.previewActive = false; updatePreviewButtons();
                var msg = 'Сброшено: изменений — ' + r.changes;
                if (r.removedLayers) msg += ', удалено слоёв UK — ' + r.removedLayers;
                toast(msg, 'ok', 2500);
                pollSelection();
            });
        } });
    }

    // ------------------------------------------------------------ обновление из GitHub
    function buildLabel() { var c = S.catalog || {}; return 'v' + (c.version || '?') + (c.build ? ' · ' + c.build : ''); }
    function updateKit() {
        if (DEV) { toast('Обновление доступно только внутри After Effects. Текущая сборка: ' + buildLabel(), 'info', 3000); return; }
        var ext = CEP.getSystemPath('extension');
        var repo = CEP.readFile(ext + '/repo_path.txt');
        if (!repo) { toast('Не найден путь к репозиторию. Переустановите панель через install.bat из папки проекта.', 'err', 7000); return; }
        repo = repo.replace(/[\r\n]+$/, '').replace(/[\\\/]+$/, '');
        var bat = repo + '\\update.bat';
        toast('Обновить UniKit из GitHub? Текущая сборка: ' + buildLabel() + '. Откроется окно консоли; после завершения перезапустите AE.', 'info', 9000, { label: 'Обновить', fn: function () {
            var ok = CEP.run('C:\\Windows\\System32\\cmd.exe', ['/c', 'start', 'UniKit update', bat]);
            if (ok) toast('Обновление запущено в отдельном окне. После завершения перезапустите After Effects и сверьте сборку в статус-баре (сейчас ' + buildLabel() + ').', 'ok', 8000);
            else toast('Не удалось запустить update.bat. Запустите вручную: ' + bat, 'err', 9000);
        } });
    }

    // ------------------------------------------------------------ статус / выделение
    var lastSel = { comp: false, count: 0, names: [], hasText: false };
    var pollTimer = null;
    function pollSelection() {
        if (document.visibilityState === 'hidden') return;
        ukCall('selectionJSON', [], function (r, err) {
            var st = $('status'), tx = $('statusText');
            st.className = 'status' + (DEV ? ' dev' : '');
            if (!r) { st.classList.add('off'); tx.textContent = err ? 'Нет связи с AE' : 'Нет связи'; lastSel = { comp: false, count: 0, names: [], hasText: false }; updateHint(); return; }
            lastSel = r;
            if (!r.comp) { st.classList.add('warn'); tx.textContent = 'Откройте композицию'; }
            else if (r.count === 0) { st.classList.add('warn'); tx.textContent = r.compName + ' · выделите слой · ' + fmtTime(r.time); }
            else { st.classList.add('ok'); tx.textContent = r.compName + ' · ' + r.count + ' ' + plural(r.count, 'слой', 'слоя', 'слоёв') + ': ' + r.names.join(', '); }
            tx.title = tx.textContent;
            updateHint();
        });
    }
    function startPolling() { stopPolling(); pollSelection(); pollTimer = setInterval(pollSelection, 1000); }
    function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
    function fmtTime(t) { var s = Math.max(0, t || 0); var m = Math.floor(s / 60); var r = (s - m * 60).toFixed(2); return m + ':' + (r < 10 ? '0' : '') + r; }
    function plural(n, a, b, c) { var m = n % 10, h = n % 100; if (m === 1 && h !== 11) return a; if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return b; return c; }

    // ------------------------------------------------------------ тосты
    function toast(msg, kind, ms, action) {
        var box = $('toasts'); var t = document.createElement('div'); t.className = 'toast ' + (kind || 'info');
        var ico = kind === 'ok' ? '<svg class="ico" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>' :
            kind === 'err' ? '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h0"/></svg>' :
                '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h0"/></svg>';
        t.innerHTML = ico + '<span class="msg"></span>';
        t.querySelector('.msg').textContent = msg;
        if (action) { var b = document.createElement('button'); b.className = 'act'; b.textContent = action.label; b.addEventListener('click', function () { action.fn(); kill(); }); t.appendChild(b); }
        box.appendChild(t);
        var dead = false;
        function kill() { if (dead) return; dead = true; t.classList.add('out'); setTimeout(function () { t.remove(); }, 160); }
        t.addEventListener('click', function (ev) { if (!ev.target.closest('.act')) kill(); });
        setTimeout(kill, ms || 2500);
        while (box.children.length > 4) box.firstChild.remove();
    }

    // ------------------------------------------------------------ клавиатура
    function initKeys() {
        document.addEventListener('keydown', function (ev) {
            var tag = (ev.target.tagName || '').toLowerCase();
            var inField = tag === 'input' || tag === 'select' || tag === 'textarea';
            if (ev.key === 'Enter' && !inField && tag !== 'button') { ev.preventDefault(); apply(); }
            if (ev.key === 'Enter' && ev.target === $('search')) { ev.preventDefault(); apply(); }
            if (ev.key === 'Escape') { if (S.query) { $('search').value = ''; S.query = ''; $('searchClear').classList.add('hidden'); renderGrid(); } }
            if ((ev.key === 'z' || ev.key === 'Z') && (ev.ctrlKey || ev.metaKey) && !inField) { ev.preventDefault(); if (ev.shiftKey) redo(); else undo(); }
            if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft' || ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && (tag === 'body' || ev.target === $('grid') || ev.target.classList.contains('card'))) {
                var cards = Array.prototype.slice.call(document.querySelectorAll('.card')); if (!cards.length) return;
                var idx = S.selected ? cards.findIndex(function (c) { return c.dataset.id === S.selected.id; }) : -1;
                var cols = Math.max(1, Math.round($('grid').clientWidth / (cards[0].offsetWidth + 5)));
                var d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowDown' ? cols : -cols;
                var ni = clamp(idx + d, 0, cards.length - 1);
                var node = cards[ni]; var p = S.catalog.presets.filter(function (x) { return x.id === node.dataset.id; })[0];
                select(p, node); node.scrollIntoView({ block: 'nearest' }); ev.preventDefault();
            }
            if (ev.key === 'f' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); $('search').focus(); }
        });
    }

    // ------------------------------------------------------------ старт
    function boot() {
        $('btnApply').disabled = true; $('btnPreview').disabled = true;
        CEP.applyHostTheme();
        CEP.addEventListener('com.adobe.csxs.events.ThemeColorChanged', function () { CEP.applyHostTheme(); });
        $('btnUpdate').addEventListener('click', updateKit);
        $('search').addEventListener('input', function () { S.query = this.value; $('searchClear').classList.toggle('hidden', !S.query); renderGrid(); });
        $('searchClear').addEventListener('click', function () { $('search').value = ''; S.query = ''; this.classList.add('hidden'); renderGrid(); $('search').focus(); });
        $('btnApply').addEventListener('click', apply);
        $('btnPreview').addEventListener('click', preview);
        $('btnKeep').addEventListener('click', previewKeep);
        $('btnPvUndo').addEventListener('click', function () { previewUndo(); });
        $('btnUndo').addEventListener('click', undo);
        $('btnRedo').addEventListener('click', redo);
        $('btnReset').addEventListener('click', resetLayer);
        $('infoFav').addEventListener('click', function () { if (S.selected) toggleFav(S.selected.id); });
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') startPolling(); else stopPolling(); });
        window.addEventListener('resize', function () { if (!$('settings').classList.contains('collapsed')) drawGraph(); });
        initKeys();

        loadHost(function (cat, err) {
            if (!cat) {
                $('status').className = 'status off'; $('statusText').textContent = err || 'Не удалось загрузить ядро';
                toast((err || 'Не удалось загрузить ядро UniKit') + '\nПроверьте host/UniKit.jsx и настройку «Allow Scripts to Write Files and Access Network».', 'err', 10000);
                return;
            }
            S.catalog = cat;
            (cat.favs || []).forEach(function (id) { S.favs[id] = true; });
            S.cat = LS.get('cat', cat.settings && cat.settings.cat || 'in');
            if (!cat.cats.some(function (c) { return c.id === S.cat; })) S.cat = 'in';
            initSettings(); renderTabs(); renderGrid();
            document.title = 'UniKit ' + cat.version;
            $('statusVer').textContent = buildLabel();
            $('statusVer').title = 'Ядро UniKit ' + buildLabel() + (DEV ? ' (dev-режим, каталог из dev/catalog.json)' : '');
            startPolling();
        });
    }
    document.addEventListener('DOMContentLoaded', boot);

    // для отладки из консоли
    window.UKPanel = { state: S, drawGraph: drawGraph, setBez: setBez };
})();
