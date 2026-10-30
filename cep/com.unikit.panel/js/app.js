/* UniKit CEP panel — логика интерфейса. Вся работа с AE — через UK.*JSON в ExtendScript. */
(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };
    var DEV = !CEP.inHost;

    // ------------------------------------------------------------ иконки категорий
    var ICONS = {
        'in': '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 12h10M9 8l4 4-4 4"/></svg>',
        out: '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 12h13M17 8l4 4-4 4"/></svg>',
        trans: '<svg class="ico" viewBox="0 0 24 24"><rect x="2" y="7" width="8" height="10" rx="1.5"/><rect x="14" y="7" width="8" height="10" rx="1.5"/><path d="M10 12h4M12.5 10l1.5 2-1.5 2"/></svg>',
        fx: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 20l9-9M11 11l2 2"/><path d="M15 3v3M14 4.5h2M19 8v2M18 9h2M18 14v2M17 15h2"/><path d="M14 8l1.5 1.5"/></svg>',
        distort: '<svg class="ico" viewBox="0 0 24 24"><path d="M3 7c3-3 6 3 9 0s6 3 9 0M3 12c3-3 6 3 9 0s6 3 9 0M3 17c3-3 6 3 9 0s6 3 9 0"/></svg>',
        light: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
        text: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 6V4h14v2M12 4v16M9 20h6"/></svg>',
        cam: '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3z"/></svg>',
        util: '<svg class="ico" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.3-.4-.4-2.3z"/></svg>',
        design: '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><circle cx="17" cy="7" r="4"/><path d="M3 21l4-8 4 8z"/><rect x="13" y="13" width="8" height="8" rx="4" opacity=".6"/></svg>',
        combo: '<svg class="ico" viewBox="0 0 24 24"><path d="M3 10l9-5 9 5-9 5z"/><path d="M3 15l9 5 9-5" opacity=".6"/><path d="M19 2l.8 1.7 1.7.3-1.3 1.2.3 1.8L19 6.1 17.5 7l.3-1.8-1.3-1.2 1.7-.3z" fill="currentColor" stroke="none"/></svg>',
        fav: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"/></svg>'
    };
    var SHORT = { 'in': 'In', out: 'Out', trans: 'Переходы', fx: 'Эффекты', distort: 'Искажения', light: 'Свет', text: 'Текст', cam: 'Камера', design: 'Дизайн', util: 'Утилиты', combo: 'Решения', fav: 'Избранное' };
    var EASE_PATHS = {
        smooth: 'M3 19C9 19 9 5 21 5', expoOut: 'M3 19C4 7 8 5 21 5', expoIn: 'M3 19C16 19 20 17 21 5', expoInOut: 'M3 19C12 19 12 5 21 5',
        soft: 'M3 19C8 19 10 5 21 5', back: 'M3 19C8 19 10 1 14 3 17 5 19 5 21 5', bounce: 'M3 19C7 19 9 5 11 5 13 5 14 12 16 12 18 12 19 8 21 8',
        elastic: 'M3 19C6 19 7 1 10 3 12 5 13 8 15 7 17 6 18 5 21 5', linear: 'M3 19L21 5'
    };

    // ------------------------------------------------------------ состояние
    var S = {
        catalog: null, cat: 'in', query: '', selected: null, favs: {}, previewActive: false, busy: false,
        opts: { dur: 0.8, ease: 'expoOut', strength: 100, dir: 'L', startMode: 'in', stagger: 0.1, controls: true, adj: false }
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
        else if (fn === 'cleanJSON') r = { ok: true, removed: 3 };
        setTimeout(function () { cb(r); }, 120);
    }

    // ------------------------------------------------------------ рендер вкладок
    function renderTabs() {
        var el = $('tabs'); el.innerHTML = '';
        var counts = {};
        S.catalog.presets.forEach(function (p) { counts[p.cat] = (counts[p.cat] || 0) + 1; });
        S.catalog.cats.forEach(function (c) {
            var b = document.createElement('button');
            b.className = 'tab' + (c.id === S.cat ? ' active' : '');
            b.type = 'button'; b.dataset.cat = c.id; b.title = c.name;
            var n = c.id === 'fav' ? Object.keys(S.favs).filter(function (k) { return S.favs[k]; }).length : counts[c.id] || 0;
            b.innerHTML = (ICONS[c.id] || ICONS.fx) + '<span>' + (SHORT[c.id] || c.name) + '</span>' + (n ? '<em class="count">' + n + '</em>' : '');
            b.addEventListener('click', function () { setCat(c.id); });
            el.appendChild(b);
        });
    }
    function setCat(id) {
        S.cat = id; LS.set('cat', id);
        $('search').value = ''; S.query = ''; $('searchClear').classList.add('hidden');
        renderTabs(); renderGrid();
        var t = document.querySelector('.tab.active'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }

    // ------------------------------------------------------------ рендер сетки
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
            e.innerHTML = (S.cat === 'fav' && !S.query ? ICONS.fav + '<b>Пока пусто</b>Отмечайте пресеты звёздочкой — они появятся здесь.' :
                '<svg class="ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8 11h6"/></svg><b>Ничего не найдено</b>Попробуйте другое слово: «glitch», «zoom», «текст»…');
            grid.appendChild(e);
            select(null);
            return;
        }
        var frag = document.createDocumentFragment();
        list.forEach(function (p, i) {
            var node = tpl.content.firstElementChild.cloneNode(true);
            node.dataset.id = p.id; node.style.setProperty('--i', Math.min(i, 30));
            node.querySelector('.pv').dataset.preview = p.preview || 'fadeIn';
            node.querySelector('.name').textContent = p.name;
            node.title = p.desc || p.name;
            var star = node.querySelector('.star'); if (S.favs[p.id]) star.classList.add('on');
            var badge = node.querySelector('.badge');
            if (p.needs === 'text') { badge.textContent = 'T'; badge.className = 'badge show text'; badge.title = 'Текстовый слой'; }
            else if (p.needs === 'trans') { badge.textContent = 'A→B'; badge.className = 'badge show trans'; badge.title = 'Переход: 2 слоя или курсор на склейке'; }
            if (S.query && S.cat !== p.cat) { var c = catName(p.cat); node.querySelector('.name').textContent = p.name; node.title = c + ' · ' + (p.desc || ''); }
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
            renderTabs();
            if (S.cat === 'fav') renderGrid();
            toast(r.fav ? 'Добавлено в избранное' : 'Убрано из избранного', 'info', 1200);
        });
    }

    // ------------------------------------------------------------ настройки
    function initSettings() {
        var st = S.catalog.settings || {};
        S.opts.dur = num(st.dur, 0.8); S.opts.ease = st.ease || 'expoOut'; S.opts.strength = num(st.strength, 100);
        S.opts.dir = st.dir || 'L'; S.opts.startMode = st.startMode || 'in'; S.opts.stagger = num(st.stagger, 0.1);
        S.opts.controls = String(st.controls) !== 'false'; S.opts.adj = String(st.adj) === 'true';

        var sel = $('optEase'); sel.innerHTML = '';
        S.catalog.eases.forEach(function (e) { var o = document.createElement('option'); o.value = e.id; o.textContent = e.name; sel.appendChild(o); });
        sel.value = S.opts.ease;
        sel.addEventListener('change', function () { S.opts.ease = sel.value; syncSettings(); });

        $('optDur').value = S.opts.dur;
        $('optDur').addEventListener('input', function () { S.opts.dur = clamp(num(this.value, 0.8), 0.05, 20); syncSettings(); });
        Array.prototype.forEach.call($('durChips').querySelectorAll('button'), function (b) {
            b.addEventListener('click', function () { S.opts.dur = num(b.dataset.v, 0.8); $('optDur').value = S.opts.dur; syncSettings(); });
        });
        Array.prototype.forEach.call($('optDir').querySelectorAll('button'), function (b) {
            b.addEventListener('click', function () { S.opts.dir = b.dataset.v; syncSettings(); });
        });
        Array.prototype.forEach.call($('optStart').querySelectorAll('button'), function (b) {
            b.addEventListener('click', function () { S.opts.startMode = b.dataset.v; syncSettings(); });
        });
        $('optStr').value = S.opts.strength;
        $('optStr').addEventListener('input', function () { S.opts.strength = num(this.value, 100); syncSettings(); });
        $('optStag').value = S.opts.stagger;
        $('optStag').addEventListener('input', function () { S.opts.stagger = clamp(num(this.value, 0.1), 0, 5); syncSettings(); });
        $('optControls').checked = S.opts.controls;
        $('optControls').addEventListener('change', function () { S.opts.controls = this.checked; syncSettings(); });
        $('optAdj').checked = S.opts.adj;
        $('optAdj').addEventListener('change', function () { S.opts.adj = this.checked; syncSettings(); });

        var collapsed = LS.get('settingsCollapsed', '0') === '1';
        $('settings').classList.toggle('collapsed', collapsed);
        $('settingsToggle').addEventListener('click', function () {
            var c = !$('settings').classList.contains('collapsed');
            $('settings').classList.toggle('collapsed', c); LS.set('settingsCollapsed', c ? '1' : '0');
        });
        syncSettings();
    }
    function syncSettings() {
        var o = S.opts;
        Array.prototype.forEach.call($('durChips').querySelectorAll('button'), function (b) { b.classList.toggle('on', Math.abs(num(b.dataset.v, -1) - o.dur) < 1e-9); });
        Array.prototype.forEach.call($('optDir').querySelectorAll('button'), function (b) { b.classList.toggle('on', b.dataset.v === o.dir); });
        Array.prototype.forEach.call($('optStart').querySelectorAll('button'), function (b) { b.classList.toggle('on', b.dataset.v === o.startMode); });
        $('optStrOut').value = Math.round(o.strength) + '%';
        $('optStr').style.setProperty('--pct', (o.strength / 3) + '%');
        var path = EASE_PATHS[o.ease] || EASE_PATHS.smooth;
        $('easeIcon').innerHTML = '<path d="' + path + '"/>';
        var easeName = (S.catalog.eases.filter(function (e) { return e.id === o.ease; })[0] || {}).name || o.ease;
        var dirName = { L: '←', R: '→', U: '↑', D: '↓' }[o.dir] || o.dir;
        $('settingsSummary').textContent = o.dur + 'с · ' + easeName.split(' ')[0] + ' · ' + dirName + ' · ' + Math.round(o.strength) + '%';
    }
    function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

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
                if (r.ok) toast('Применено: ' + p.name, 'ok', 1800); else toast(r.error || 'Ошибка', 'err', 6000);
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
                toast('Предпросмотр: ' + p.name + '\nОставить результат или отменить?', 'info', 3500);
            });
        };
        if (S.previewActive) previewUndo(run); else run();
    }
    function previewUndo(next) {
        ukCall('previewUndoJSON', [], function (r, err) {
            S.previewActive = false; updatePreviewButtons();
            if (!r) toast(err || 'Нет ответа', 'err');
            else if (!r.ok) toast(r.error || 'Не удалось отменить', 'err');
            else if (r.undone && !next) toast('Предпросмотр отменён', 'info', 1400);
            if (next) next();
        });
    }
    function previewKeep() {
        ukCall('previewKeepJSON', [], function () { S.previewActive = false; updatePreviewButtons(); toast('Результат оставлен', 'ok', 1400); });
    }
    function updatePreviewButtons() {
        $('btnKeep').classList.toggle('hidden', !S.previewActive);
        $('btnUndo').classList.toggle('hidden', !S.previewActive);
        $('btnPreview').classList.toggle('hidden', S.previewActive);
    }
    function clean() {
        if (S.busy) return;
        toast('Удалить все эффекты UniKit с выделенных слоёв?', 'info', 6000, { label: 'Удалить', fn: function () {
            ukCall('cleanJSON', [], function (r, err) {
                if (!r) { toast(err || 'Нет ответа', 'err'); return; }
                if (r.ok) toast('Удалено эффектов: ' + r.removed, 'ok', 1800); else toast(r.error || 'Ошибка', 'err');
            });
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
        function kill() { if (dead) return; dead = true; t.classList.add('out'); setTimeout(function () { t.remove(); }, 260); }
        t.addEventListener('click', function (ev) { if (!ev.target.closest('.act')) kill(); });
        setTimeout(kill, ms || 2500);
        while (box.children.length > 4) box.firstChild.remove();
    }

    // ------------------------------------------------------------ клавиатура
    function initKeys() {
        document.addEventListener('keydown', function (ev) {
            var tag = (ev.target.tagName || '').toLowerCase();
            if (ev.key === 'Enter' && tag !== 'input' && tag !== 'select' && tag !== 'textarea' && tag !== 'button') { ev.preventDefault(); apply(); }
            if (ev.key === 'Enter' && ev.target === $('search')) { ev.preventDefault(); apply(); }
            if (ev.key === 'Escape') { if (S.query) { $('search').value = ''; S.query = ''; $('searchClear').classList.add('hidden'); renderGrid(); } }
            if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft' || ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && (tag === 'body' || ev.target === $('grid') || ev.target.classList.contains('card'))) {
                var cards = Array.prototype.slice.call(document.querySelectorAll('.card')); if (!cards.length) return;
                var idx = S.selected ? cards.findIndex(function (c) { return c.dataset.id === S.selected.id; }) : -1;
                var cols = Math.max(1, Math.round($('grid').clientWidth / (cards[0].offsetWidth + 8)));
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
        $('search').addEventListener('input', function () { S.query = this.value; $('searchClear').classList.toggle('hidden', !S.query); renderGrid(); });
        $('searchClear').addEventListener('click', function () { $('search').value = ''; S.query = ''; this.classList.add('hidden'); renderGrid(); $('search').focus(); });
        $('btnApply').addEventListener('click', apply);
        $('btnPreview').addEventListener('click', preview);
        $('btnKeep').addEventListener('click', previewKeep);
        $('btnUndo').addEventListener('click', function () { previewUndo(); });
        $('btnClean').addEventListener('click', clean);
        $('infoFav').addEventListener('click', function () { if (S.selected) toggleFav(S.selected.id); });
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') startPolling(); else stopPolling(); });
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
            startPolling();
        });
    }
    document.addEventListener('DOMContentLoaded', boot);
})();
