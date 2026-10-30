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

    var foot = win.add('statictext', undefined, UK.NAME + ' v' + UK.VERSION + (UK.BUILD ? ' · ' + UK.BUILD : '') + ' · пресетов: ' + UK.presets.length);
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
