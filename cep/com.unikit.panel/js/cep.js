/* Мини-шим CSInterface: evalScript / getSystemPath / тема. В браузере (dev) работает заглушка. */
(function (global) {
    'use strict';
    var cep = global.__adobe_cep__ || null;

    var CEP = {
        inHost: !!cep,

        evalScript: function (code, cb) {
            cb = cb || function () {};
            if (!cep) { cb('EvalScript error.'); return; }
            try {
                cep.evalScript(code, function (res) { cb(res); });
            } catch (e) { cb('EvalScript error.'); }
        },

        /** 'extension' | 'userData' | 'commonFiles' | 'myDocuments' | 'hostApplication' */
        getSystemPath: function (type) {
            if (!cep) return '';
            var map = { extension: 'extension', userData: 'userData', commonFiles: 'commonFiles', myDocuments: 'myDocuments', hostApplication: 'hostApplication' };
            try {
                var p = cep.getSystemPath(map[type] || type);
                return String(p).replace(/^file:\/\/\/?/, '').replace(/^\/([A-Za-z]:)/, '$1');
            } catch (e) { return ''; }
        },

        getHostEnvironment: function () {
            if (!cep) return null;
            try { return JSON.parse(cep.getHostEnvironment()); } catch (e) { return null; }
        },

        /** Цвет фона панели хоста (AE) → применяем как CSS-переменную. */
        applyHostTheme: function () {
            var env = this.getHostEnvironment();
            if (!env || !env.appSkinInfo || !env.appSkinInfo.panelBackgroundColor) return;
            var c = env.appSkinInfo.panelBackgroundColor.color;
            var bg = 'rgb(' + Math.round(c.red) + ',' + Math.round(c.green) + ',' + Math.round(c.blue) + ')';
            document.documentElement.style.setProperty('--host-bg', bg);
            var lum = (c.red * 0.299 + c.green * 0.587 + c.blue * 0.114);
            document.documentElement.classList.toggle('light-host', lum > 128);
        },

        addEventListener: function (type, fn) {
            if (!cep) return;
            try { cep.addEventListener(type, fn); } catch (e) {}
        },

        openURL: function (url) {
            if (cep && cep.util && cep.util.openURLInDefaultBrowser) cep.util.openURLInDefaultBrowser(url);
            else global.open(url, '_blank');
        }
    };

    global.CEP = CEP;
})(window);
