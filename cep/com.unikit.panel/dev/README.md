# Dev-режим панели

Панель работает и в обычном браузере без After Effects: вызовы хоста эмулируются.

```
node build.js                                   # собрать dist/UniKit.jsx (+ копия в host/)
node cep/com.unikit.panel/dev/gen_catalog.js    # обновить dev/catalog.json из ядра
node cep/com.unikit.panel/dev/serve.js          # http://localhost:5178
```

* `/` — панель (dev-бейдж в статус-баре, применение/превью — заглушки).
* `/dev/previews.html` — все ключи CSS-превью одновременно (контракт в `docs/PREVIEW_KEYS.md`).

Отладка в AE: `.debug` открывает remote debugging на `http://localhost:8099` (Chrome DevTools),
нужен `PlayerDebugMode=1` в `HKCU\Software\Adobe\CSXS.N` (ставит `install.bat`).
