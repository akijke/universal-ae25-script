/*
 *  UniKit self-test для реального After Effects.
 *  File > Scripts > Run Script File... > test/ae_selftest.jsx
 *  Создаёт тестовую композицию, применяет КАЖДЫЙ пресет в нескольких режимах,
 *  собирает ошибки и пишет отчёт на рабочий стол (UniKit_selftest.txt).
 *  Проект после теста можно закрыть без сохранения.
 */
(function () {
    var here = new File($.fileName).parent;            // .../test
    var kit = new File(here.parent.fsName + '/dist/UniKit.jsx');
    if (!kit.exists) { alert('Не найден dist/UniKit.jsx — соберите: node build.js'); return; }

    $.global.UK_HEADLESS = true;
    $.evalFile(kit);
    var UK = $.global.UK;
    if (!UK) { alert('UK не загружен'); return; }

    var report = [], fails = 0, okc = 0;
    var realAlert = $.global.alert;
    var captured = [];
    $.global.alert = function (s) { captured.push(String(s)); };

    function freshComp() {
        var c = app.project.items.addComp('UK test', 1920, 1080, 1, 10, 30);
        var a = c.layers.addSolid([1, 0, 0], 'A', 1920, 1080, 1, 10); a.inPoint = 0; a.outPoint = 5;
        var b = c.layers.addSolid([0, 1, 0], 'B', 1920, 1080, 1, 10); b.inPoint = 5; b.outPoint = 10;
        var t = c.layers.addText('Hello World'); t.inPoint = 1; t.outPoint = 8;
        var s = c.layers.addShape(); s.inPoint = 0; s.outPoint = 10;
        var rect = s.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
        rect.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Rect');
        rect.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Fill');
        c.time = 5;
        c.openInViewer();
        return { c: c, a: a, b: b, t: t, s: s };
    }
    function select(o, arr) {
        var all = [o.a, o.b, o.t, o.s];
        for (var i = 0; i < all.length; i++) all[i].selected = false;
        for (i = 0; i < arr.length; i++) arr[i].selected = true;
    }

    var optsList = [
        { dur: 0.8, ease: 'expoOut', strength: 100, dir: 'L', startMode: 'in', stagger: 0.1, controls: true, adj: false },
        { dur: 0.5, ease: 'back', strength: 150, dir: 'U', startMode: 'playhead', stagger: 0, controls: false, adj: false },
        { dur: 1.0, ease: 'bounce', strength: 80, dir: 'D', startMode: 'in', stagger: 0.05, controls: true, adj: true }
    ];

    var presets = UK.presets.slice();
    var t0 = new Date().getTime();
    for (var pi = 0; pi < presets.length; pi++) {
        var p = presets[pi];
        var failed = false;
        for (var oi = 0; oi < optsList.length; oi++) {
            var opts = optsList[oi];
            var scen = [];
            var o = freshComp();
            if (p.needs === 'text') scen.push([o, [o.t]]);
            else if (p.needs === 'trans') { scen.push([o, [o.a, o.b]]); var o2 = freshComp(); o2.c.time = 5; scen.push([o2, [o2.b]]); }
            else if (p.needs === 'none' || p.needs === 'comp') { scen.push([o, [o.a, o.b]]); }
            else { scen.push([o, [o.a]]); var o3 = freshComp(); scen.push([o3, [o3.a, o3.t, o3.s]]); }
            for (var si = 0; si < scen.length; si++) {
                var objs = scen[si][0];
                objs.c.openInViewer();
                select(objs, scen[si][1]);
                captured = [];
                try { UK.run(p.id, opts); }
                catch (e) { captured.push('THROWN: ' + e.toString() + (e.line ? ' line ' + e.line : '')); }
                if (captured.length) {
                    failed = true;
                    report.push('FAIL ' + p.id + ' [' + p.cat + '] opts#' + oi + ' sel=' + scen[si][1].length + ' :: ' + captured.join(' | '));
                }
            }
            // убрать тестовые композиции
            for (si = 0; si < scen.length; si++) { try { scen[si][0].c.remove(); } catch (e2) {} }
        }
        if (failed) fails++; else okc++;
    }
    var dt = Math.round((new Date().getTime() - t0) / 1000);
    $.global.alert = realAlert;

    var head = 'UniKit ' + UK.VERSION + ' self-test — AE ' + app.version + '\n' +
        'presets: ' + presets.length + ', ok: ' + okc + ', FAIL: ' + fails + ', time: ' + dt + 's\n\n';
    var f = new File(Folder.desktop.fsName + '/UniKit_selftest.txt');
    f.encoding = 'UTF-8';
    f.open('w');
    f.write(head + report.join('\n'));
    f.close();
    alert(head + (fails ? 'Отчёт: ' + f.fsName : 'Все пресеты применились без ошибок.\nОтчёт: ' + f.fsName));
})();
