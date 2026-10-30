# UniKit — универсальный тулкит для монтажа в After Effects 2025

Панель для After Effects 2025 (работает и на 2022–2024) с библиотекой из **560 готовых пресетов** в 11 категориях:
появление и исчезновение слоёв, переходы, эффекты и луки, искажения, свет и лайтсвипы, текстовые анимации, камера,
дизайн-графика (shape-элементы), утилиты и готовые решения-связки. Один клик — пресет применяется на выделенные слои
с настраиваемыми длительностью, изингом (редактор кривой как в Flow), направлением и силой. Всё построено на штатных
эффектах AE и Cycore (CC), никаких сторонних плагинов.

Два интерфейса на одном ядре:
* **CEP-панель** (основная) — Window > Extensions > UniKit: вкладки, карточки с анимированным превью, редактор кривой, превью на футаже, undo/redo/сброс.
* **ScriptUI-панель** (резервная) — Window > UniKit.jsx: простой список, работает там, где CEP недоступен.

---

## Содержание

1. [Установка](#установка)
2. [Обновление](#обновление)
3. [Быстрый старт](#быстрый-старт)
4. [Интерфейс панели](#интерфейс-панели)
5. [Настройки пресетов](#настройки-пресетов)
6. [Изинг: редактор кривой](#изинг-редактор-кривой)
7. [Как работают категории](#как-работают-категории)
8. [Превью, отмена, сброс](#превью-отмена-сброс)
9. [Слайдеры-контролы: настройка после применения](#слайдеры-контролы-настройка-после-применения)
10. [Полный каталог пресетов](#полный-каталог-пресетов)
11. [Решение проблем](#решение-проблем)
12. [Для разработчиков](#для-разработчиков)

---

## Установка

### Вариант 1 — установщик (рекомендуется)

1. Скачайте репозиторий: `git clone https://github.com/akijke/universal-ae25-script.git` (или Code > Download ZIP и распакуйте).
2. Запустите **`install.bat`** двойным кликом. Он:
   * копирует CEP-панель в `%APPDATA%\Adobe\CEP\extensions\com.unikit.panel`;
   * включает режим неподписанных расширений: `PlayerDebugMode = 1` в `HKCU\Software\Adobe\CSXS.9 … CSXS.12` (без этого AE не покажет панель);
   * копирует резервную ScriptUI-панель `UniKit.jsx` в папки `Scripts\ScriptUI Panels` найденных версий AE;
   * сохраняет путь к папке проекта рядом с панелью (нужен кнопке «Обновить»).
3. Полностью перезапустите After Effects.
4. Откройте **Window > Extensions > UniKit**. Панель можно закрепить в любое место рабочего пространства.
5. Если пресеты с выражениями не создаются: **Edit > Preferences > Scripting & Expressions** → включить
   **Allow Scripts to Write Files and Access Network** → перезапустить AE.

### Вариант 2 — вручную

* CEP: скопируйте папку `cep/com.unikit.panel` в `%APPDATA%\Adobe\CEP\extensions\` и выполните в консоли
  `reg add HKCU\Software\Adobe\CSXS.12 /v PlayerDebugMode /t REG_SZ /d 1 /f` (повторите для CSXS.11).
* ScriptUI: скопируйте `dist/UniKit.jsx` в
  `C:\Program Files\Adobe\Adobe After Effects 2025\Support Files\Scripts\ScriptUI Panels\`.

### Требования

Windows 10/11, After Effects 2025 (25.x). Для сборки из исходников нужен Node.js (не обязателен для использования:
собранный `dist/UniKit.jsx` лежит в репозитории).

---

## Обновление

Обновление = **полная переустановка**: `reinstall.bat` закрывает After Effects (спросит подтверждение), удаляет все
копии панели (CEP-расширение в пользовательской и системных папках, кеш CEP, ScriptUI-копии во всех версиях AE),
скачивает свежую версию из GitHub, собирает и ставит заново, а в конце печатает штамп установленной сборки.

* **Из панели:** кнопка **⟳** справа от строки поиска → подтверждение → окно консоли → ответить `Y` на закрытие AE.
* **Вручную:** закрыть AE и запустить `reinstall.bat` (или `update.bat`, это то же самое) в папке проекта.
* **Если папка скачана как ZIP (без git):** `reinstall.bat` сам скачает свежий архив `main.zip` с GitHub (через встроенные curl и tar Windows) и распакует поверх. Git и Node на компьютере с AE не нужны.
* **Если скачать не удалось:** батник крупно напишет об этом и спросит, ставить ли локальную копию. Причины: нет интернета или репозиторий приватный без входа в GitHub на этом ПК.
* **Нумерация версий:** номер хранится в файле `VERSION` (сейчас 1.1.0) и при сборке попадает в ядро, в манифест
  и в название пункта меню — **Window > Extensions > UniKit v1.1.0**. Каждое обновление с новыми функциями повышает номер,
  так что по пункту меню сразу видно, какая версия загружена. Штамп сборки (дата + git-хеш) уточняет версию до коммита.
* **Как убедиться, что обновление встало:** в правом нижнем углу панели показан штамп сборки
  `v1.0.0 · 2026-10-30 23:10 · 1bdffc2` (дата, время, git-хеш). Он должен совпадать с тем, что напечатал `reinstall.bat`.

Почему именно так: пока AE открыт, он держит файлы панели и кеш CEP, и обычное копирование поверх может оставить
старую версию. Полное удаление при закрытом AE исключает это.

---

## Быстрый старт

1. Откройте композицию, выделите слой.
2. Вкладка **In** → двойной клик по карточке, например **Slide In**. Слой влетит из-за края за 0.8 с.
3. Вкладка **Out** → **Fade + Slide**: слой уйдёт в конце своей длительности.
4. Выделите **два соседних клипа** (верхний начинается там, где кончается нижний) → вкладка **Переходы** → **Zoom Punch**.
5. Вкладка **Эффекты** → **Teal & Orange**: лук применится на слой, а интенсивность появится в Effect Controls как слайдер `UK: …`.
6. Не понравилось — кнопка **↶ Отменить** или **Сбросить слой**.

---

## Интерфейс панели

```
┌──────────────────────────────────────────────┐
│ In  Out  Переходы  Эффекты  Искажения  Свет  │  ← вкладки категорий (скроллятся)
│ Текст  Камера  Дизайн  Утилиты  Решения  ★   │
├──────────────────────────────────────────────┤
│ 🔍 Поиск по всем категориям             ⟳    │  ← поиск + обновление
├──────────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐                          │
│ │prev│ │prev│ │prev│   ← карточки с превью    │
│ └────┘ └────┘ └────┘      (анимация на hover) │
│ Название · Русское                            │
├──────────────────────────────────────────────┤
│ Описание выбранного пресета, подсказка needs  │
├──────────────────────────────────────────────┤
│ ▸ Настройки      0.8 с · 100% · ← · Expo Out  │  ← сворачиваемый блок
│   Длительность ────●──── 0.8  [.25 .5 .8 1.2] │
│   Сила ──────●───── 100     Шаг ──●── 0.1     │
│   Направление  D-pad      Старт [Слой|Курсор] │
│   ● Слайдеры-контролы     ○ На корр. слой     │
│   Изинг: [Кривая] Back Bounce Elastic         │
│   ┌ график cubic-bezier с ручками ┐           │
│   x1 y1 x2 y2   ⇄ отразить   библиотека 32    │
│   [На ключи]                                  │
├──────────────────────────────────────────────┤
│ [ Применить ]  [👁 Превью]  ↶ ↷  [Сбросить]   │
│ ● Comp · 1 слой: Footage    v1.0.0 · сборка   │  ← статус-бар
└──────────────────────────────────────────────┘
```

* **Карточка:** клик — выбрать (внизу описание), двойной клик или Enter — применить, звезда в углу — в избранное.
  Бейдж `T` — нужен текстовый слой, `A→B` — переход.
* **Поиск** ищет сразу по всем категориям по английскому и русскому названию, тегам и описанию.
* **Статус-бар** показывает активную композицию и выделенные слои; предупреждает, если пресету нужен текстовый слой
  или два слоя для перехода.
* Горячие клавиши внутри панели: `Enter` — применить, `Esc` — очистить поиск, `Ctrl+Z` / `Ctrl+Shift+Z` — отменить / повторить.

---

## Настройки пресетов

| Параметр | Что делает | По умолчанию |
|---|---|---|
| **Длительность** | длина анимации появления/исчезновения или перехода (переход центрируется на склейке) | 0.8 с |
| **Сила** | амплитуда: расстояние влёта, интенсивность размытия/искажения/свечения, глубина зума. 100 % — авторский баланс, 200 % — вдвое сильнее | 100 % |
| **Шаг** | задержка между слоями, если выделено несколько (каскад). 0 — все одновременно | 0.1 с |
| **Направление** | ← → ↑ ↓ для всего, где есть геометрия: slide, wipe, whip pan, push, blinds, стрелки в дизайне | ← |
| **Старт** | **Слой** — появления стартуют от in-point слоя, исчезновения заканчиваются на out-point; **Курсор** — от текущего положения плейхеда | Слой |
| **Слайдеры-контролы** | параметры пресета выносятся в Effect Controls как `UK: …` и управляют эффектом через выражения — можно крутить после применения | вкл |
| **На корр. слой** | эффекты, искажения, свет и камера применяются не на сам слой, а на новый корректирующий слой `UK · …` над выделением (или над всей композицией, если ничего не выделено) | выкл |

Настройки запоминаются между сессиями.

---

## Изинг: редактор кривой

Блок **Изинг** в настройках работает как плагины Flow / Jerry Flow:

* **График** — кривая cubic-bezier с двумя ручками. Тяните ручки мышью: X ограничен 0…1, Y можно выводить за
  пределы (−0.5…1.5) — это даёт перелёт (overshoot) и «предвкушение» (anticipation). `Shift` при перетаскивании —
  шаг 0.05, двойной клик по графику — сброс к Ease.
* **x1 y1 x2 y2** — числовые поля, синхронны с графиком. Можно вставить значения из cubic-bezier.com или из CSS.
* **⇄ Отразить** — зеркалит кривую (ease-out ↔ ease-in).
* **Библиотека** — 32 кривые мини-графиками: Linear, Ease, Ease In/Out/InOut, Sine, Quad, Cubic, Quart, Quint, Expo,
  Circ, Back (каждая In / Out / InOut), Smooth, Snappy, Anticipate. Клик — загрузить в редактор.
* **Режимы:** **Кривая** — применяется bezier из редактора; **Back / Bounce / Elastic** — поверх ключей добавляется
  выражение с перелётом / отскоком / пружиной (амплитуда, частота и затухание — слайдерами `UK: Amp / Freq / Decay`,
  если включены контролы).
* **На ключи** — ставит текущую кривую на **выделенные ключи в таймлайне** любого свойства (минимум два соседних
  ключа), как Flow. Можно выделить ключи на нескольких свойствах и слоях сразу.

Как кривая попадает в AE: X-координаты ручек становятся **influence** ключей, наклон ручек — **speed** (относительно
средней скорости между ключами). Поэтому результат виден и редактируется в Graph Editor обычными средствами.

Для появлений кривая читается слева направо (быстрый старт — мягкая посадка при Expo Out); для исчезновений она
автоматически зеркалится, чтобы слой ускорялся к уходу.

---

## Как работают категории

### In / Out — появление и исчезновение
Применяются к каждому выделенному слою. **In** ставит ключи от in-point слоя (или курсора) на «Длительность»;
**Out** — заканчивает на out-point. Пресеты ставят ключи на Transform и эффекты — их можно править в Graph Editor.
Pro-пресеты (Slice, Split, Blinds 3D, Glitch Slices, Chroma Pop…) создают дубли слоя с масками — они называются
`UK · <имя слоя> N` и удаляются кнопкой «Сбросить слой» вместе с оригиналом.

### Переходы
Два способа задать склейку:
1. Выделить **два соседних слоя**: склейка = начало верхнего (более позднего). Нижний — уходящий (A), верхний — входящий (B).
2. Выделить **один слой** и поставить курсор: на его начало (он входящий), на конец (уходящий) или внутрь слоя.

Длительность перехода центрируется вокруг склейки. Эффектные переходы (zoom, spin, glitch, whip, slice…) создаются на
корректирующем слое `UK · Transition` над склейкой; «честные» (push, slide, wipe, flip, cube…) анимируют сами слои A и B.

### Эффекты и луки / Искажения / Свет
Применяются на слой (или на корректирующий слой при включённой опции). «Постоянные» луки и искажения ставятся без
ключей, главные параметры — слайдерами `UK: …`. «События» (Glitch Hit, Flash, Light Sweep, Lens Flare Pass) ставят
ключи от начала слоя или от курсора на «Длительность». Оверлеи (Light Leak, Dust, Rain, Bokeh, Anamorphic) создают
солиды `UK · …` с режимами наложения — их прозрачность регулируется слайдером на самом солиде.

### Текст
Работают только с текстовыми слоями (бейдж `T`). Создают аниматоры с Range Selector: Typewriter, по буквам/словам/
строкам, Scramble, Wave, Counter, Typing Cursor и исчезновения. Аниматоры называются `UK · …` и правятся вручную.

### Камера и движение
Handheld, Earthquake, Impact, Ken Burns, Dolly Zoom, Orbit 3D и т.д. Шейки — выражения `wiggle` с контролами частоты
и амплитуды; зумы и панорамы — ключи на весь слой.

### Дизайн (графика)
Создают shape-слои: lower thirds, подложки и подчёркивания под текст, рамки, сплит-скрины, фоны (сетки, полосы,
градиент), бейджи, прогресс-бары, стрелки и callouts, кнопки Subscribe/Play, кавычки, таймлайны. Без выделения
элемент создаётся от курсора на несколько секунд; с выделенным слоем — берёт его тайминг и (для подчёркивания,
подложки, рамки, скобок) его размер и позицию, парентится к нему. Цвета — `UK: Color 1/2/3`, размеры — слайдеры.

### Утилиты
Stagger / Sequence слоёв, Trim to Playhead, Auto Fade, Freeze Frame, Reverse, Loop, Bake Expressions, Center Anchor,
Fit to Comp, корректирующий слой над выделением, Parent to Null, Precompose Each, Motion Blur, 3D, Solo, маркер.

### Готовые решения
Связки нескольких пресетов одним кликом: появление + лук/свет + уход (Logo Reveal, Cinematic Clip, YouTube Intro,
Title Card, Product Hero…), текстовые (Headline, Typewriter, Kinetic, Quote Card) и переходы с эффектами на склейке
(Vlog Cut, Impact Hit, Cinematic Cut…). Длительности частей масштабируются от «Длительности» и ограничиваются длиной
слоя. Если в решение входит дизайн-элемент, он создаётся автоматически.

---

## Превью, отмена, сброс

* **👁 Превью** — применяет выбранный пресет на выделение в отдельной undo-группе, ставит рабочую область на
  интервал анимации и запускает предпросмотр AE. Затем появляются **Оставить** (результат остаётся) и **Отменить**
  (откат). Если нажать превью другого пресета, предыдущее откатится автоматически.
* **↶ Отменить действие / ↷ Повторить** — Undo / Redo After Effects (то же, что Ctrl+Z в AE).
* **Сбросить слой** — снимает с выделенных слоёв всё, что наложил UniKit: эффекты и контролы `UK`, аниматоры и
  маски `UK`, выражения на Transform и выражения, ссылающиеся на контролы `UK`, ключи Transform (значение фиксируется
  по середине слоя). Вспомогательные слои `UK · …` среди выделенных удаляются. Действие одно в истории — его можно отменить.

---

## Слайдеры-контролы: настройка после применения

При включённой опции пресеты создают в Effect Controls слоя контролы с префиксом **`UK:`**:

| Контрол | Где встречается |
|---|---|
| `UK: Amount`, `UK: Glow Intensity`, `UK: Blur Amount` … | интенсивность эффектов и искажений |
| `UK: Amp`, `UK: Freq`, `UK: Decay` | амплитуда, частота и затухание выражений Back / Bounce / Elastic |
| `UK: Color 1/2/3` | цвета дизайн-элементов и дуотонов |
| `UK: Speed`, `UK: Period` | скорость эволюции шума, период лайтсвипа |
| `UK: Opacity` на солиде `UK · …` | сила оверлея (light leak, dust, rain…) |

Эффекты, добавленные панелью, называются **`UK · <имя>`**, слои — **`UK · <имя>`**. По этим префиксам работает сброс.

---

## Полный каталог пресетов

### 69 — Fade In, Slide In, Fade + Slide, Scale Pop, Scale Soft, Scale Overshoot, Elastic Pop, Spin In, Spin Zoom, Flip X, Flip Y, Blur In, Directional Blur Slide, Zoom Blur In, Zoom From Far, Linear Wipe, Soft Wipe, Mask Reveal, Mask + Slide, Blinds, Radial Wipe, Iris, Block Dissolve, Curtain Open, Drop Bounce, Squash & Stretch, Skew Slide, Roll In, Swing In, Stretch In, Unfold, Slide + Rotate, Diagonal Slide, Shadow Pop, Glitch In, Pixelate In, Flash In, Flicker In, Rise + Blur, Slice Reveal, Split Reveal, Blinds 3D, Soft Mask Wipe, Brush Reveal, Ink Reveal, Liquid Wipe, Light Reveal, Lens Reveal, Depth Push, Parallax Layers, Zoom Through, Kinetic Slide, Elastic Drop, Spin Pop, Flip 3D + Shadow, Card Flip, Pixel Sort, Glitch Slices, Chromatic Pop, Block Wipe, Shutter, Clock Wipe Soft, Iris Glow, Soft Focus In, Stretch Snap, Wave In, Swing Door, Unroll, Zoom Rotate Blur

undefined

### 69 — Scale Out, Fade Out, Fade + Slide, Slide Out, Scale Soft, Scale Up Out, Pop Out, Spin Out, Spin Zoom Out, Flip X Out, Flip Y Out, Blur Out, Directional Blur Slide Out, Zoom Blur Out, Zoom To Far, Linear Wipe Out, Soft Wipe Out, Mask Hide, Mask + Slide Out, Blinds Out, Radial Wipe Out, Iris Out, Block Dissolve Out, Curtain Close, Drop Fall, Squash & Stretch Out, Skew Slide Out, Roll Out, Swing Out, Stretch Out, Fold, Slide + Rotate Out, Diagonal Slide Out, Shadow Drop, Glitch Out, Pixelate Out, Flash Out, Flicker Out, Rise + Blur Out, Slice Hide, Split Hide, Blinds 3D Out, Soft Mask Hide, Brush Hide, Ink Hide, Liquid Hide, Light Burn Out, Lens Hide, Depth Pull, Parallax Out, Zoom Through Out, Kinetic Slide Out, Elastic Lift, Spin Pop Out, Flip 3D + Shadow Out, Card Flip Out, Pixel Sort Out, Glitch Slices Out, Chromatic Pop Out, Block Hide, Shutter Out, Clock Wipe Soft Out, Iris Glow Out, Soft Focus Out, Stretch Snap Out, Wave Out, Swing Door Out, Roll Up, Zoom Rotate Blur Out

undefined

### 84 — Zoom Blur, Zoom In, Zoom Out, Zoom Punch, Spin, Zoom Spin, Whip Pan, Roll, Offset Wrap, Directional Blur, Blur Dissolve, Glitch, RGB Split, Chromatic Zoom, Pixelate, Twist, Ripple, Bulge, Lens Distortion, Fisheye Zoom, Mirror Split, Kaleidoscope, Warp Stretch, Shake, Impact Punch, Bounce Zoom, Flash, Dip to Black, Dip to Color, Negative Flash, Light Leak, Film Burn, Wave Warp, Turbulent Melt, Sphere Pop, Push, Slide Cover, Slide Reveal, 3D Flip, Scale Swap, Rotate Swap, Crossfade, Blur Fade, Zoom Through, Squeeze, Linear Wipe, Radial Wipe, Venetian Blinds, Block Dissolve, Iris Wipe, Grid Wipe, Jaws, Light Wipe, Line Sweep, Radial Scale Wipe, Scale Wipe, Twister, Slide Blur, Stripe Slide, Slice Transition, Split Slide, Ink Transition, Liquid Transition, Light Flash Zoom, Lens Flare Pass, Glass Refraction, Smear Stretch, Spin Blur 3D, Cube Rotate, Page Turn, Pixel Block, Freeze Hit, Slide Stack, Parallax Push, Luma Dissolve, Morph Blur, Twirl Vortex, Kaleido Spin, Chromatic Whip, Shutter Blinds 3D, Strobe Cut, Dip to Color Blur, Film Roll, Punch Through

undefined

### 88 — Glow, Teal & Orange, Cinematic Contrast, Vintage Faded, B&W High Contrast, Sepia, Duotone, Cross Process, Bleach Bypass, Warm Filter, Cool Filter, Cyberpunk Neon, Pastel, Color Pop, Exposure, VHS, Film Grain (Noise), Film Grain (Add Grain), Vignette, Letterbox 2.35, Chromatic Aberration, Sharpen, Soft Bloom, Neon Glow, Long Shadow, Soft Drop Shadow, Posterize, Pixelate, Cartoon, Sketch, Emboss, Mirror, Kaleidoscope, Echo Trails, Stop Motion, Strobe, Camera Shake, Pulse to Beat, Opacity Flicker, Scanlines, TV Turn Off, Old Film, Dreamy Soft Focus, Lens Flare, Tilt-Shift, Zoom Blur, Motion Blur Boost, Invert, Threshold, Dot Matrix, Gaussian Blur, Directional Blur, Soft Edge Mask, Focus Pull, Glitch Hit, Flash Hit, Shake Hit, Zoom Punch, Film Kodak-like, Film Fuji-like, Bleach Bypass Pro, Teal & Orange Pro, Moody Dark, Golden Hour, Matte Fade, Pastel Dream, Infrared, Noir, Duotone Gradient Map, Tritone Poster, Halation, Pro-Mist, Soft Skin, Sharpen Pro, Clarity, Dust & Scratches, Film Frame 8mm, Gate Weave, Exposure Flicker, CRT Monitor, VHS Pro, Glitch Texture, Gradient Overlay, Color Vignette, Lens Dirt, Speed Lines, Split Toning, Faded Film

undefined

### 36 — Turbulent Soft, Turbulent Hard, Turbulent Vertical, Heat Haze, Wave Warp, Water Surface, RGB Wave, Ripple, Twirl, Twirl Spin, Bulge, Pinch, Spherize, Mirror Split, Quad Mirror, Polar Coordinates, Tiny Planet, Fisheye, Lens Correction, CC Lens, Magnify Loupe, CC Kaleida Static, CC Slant, CC Bend It, CC Flo Motion, CC Tiler, Jelly Wobble, Wobble Rotation, Squash & Stretch, Skew, Perspective Tilt, Zoom Stretch, Pixel Stretch, Liquid Displacement, Glitch Displacement, Smoke Distortion

undefined

### 27 — Anamorphic Streak, Bokeh Overlay, Light Leak Pro, Moving Spotlight, Rain Overlay, Snow Overlay, Sparkles, Light Sweep Soft, Light Sweep Sharp, Light Sweep Diagonal, Double Sweep, Loop Sweep, Colored Sweep, Edge Sweep, Shine, God Rays, Light Burst Pulse, Lens Flare Pass, Light Leak, Glow Pulse, Neon Flicker, Strobe Light, Flash Hit, Spotlight, Flashlight Pan, Bokeh Glow, Rim Light

undefined

### 32 — Fade by Characters, Typewriter, Fade by Words, Fade by Lines, Lines Slide Up, Chars Slide Up, Chars Slide In, Chars Pop, Chars Blur In, Chars Rotate In, Chars Drop, Bounce Letters, Skew In, Random Fade, Flip 3D Chars, Zoom Words, Tracking Expand, Scramble Decode, Color Wipe, Wave, Jitter, Fade Out by Chars, Fade Out by Words, Scale Out Chars, Blur Out Chars, Slide Out Chars, Drop Out Chars, Rotate Out Chars, Typewriter Out, Tracking Out, Counter, Typing + Cursor

undefined

### 18 — Handheld, Earthquake, Impact Hit, Whip Hit, Push In, Push Out, Ken Burns In, Ken Burns Out, Zoom Beat, Dolly Zoom, Rack Focus, Slow Pan, Parallax Drift, Breathe, Smooth Follow, Orbit 3D, Tilt 3D, Spin Zoom In

undefined

### 50 — Lower Third Bar, Lower Third Line, Title Underline, Text Box Backing, Highlight Marker, Pill Tag, Ribbon Banner, Frame Border, Frame Corners, Rounded Frame, Brackets, REC Frame, Split Screen 2, Split Screen 3, Split Screen 4, Dots Grid, Stripes Background, Gradient Background, Animated Grid, Geometric Pattern, Soft Blob, Letterbox Bars, Circle Burst, Line Burst, Confetti Pop, Sparkle Stars, Progress Bar, Circular Progress, Counter Badge, Loading Spinner, Arrow Callout, Pointer Callout, Speech Bubble, Checkmark Draw, Play Button, Subscribe Button, Like Heart Pop, Quote Marks, Divider Line, Dashed Line, Zigzag Line, Wavy Line, Corner Badge, Neon Rect Outline, Sticker Card, Location Pin, Timeline Dots, Icon Circle Backing, Hex Badge, Social Bar

undefined

### 20 — Удалить эффекты UniKit, Stagger Layers, Sequence Layers, Trim to Playhead, Auto Fade In/Out, Freeze Frame, Reverse Layer, Loop Keyframes (cycle), Loop Keyframes (pingpong), Bake Expressions, Center Anchor Point, Fit to Comp, Adjustment Layer Over, Parent to Null, Precompose Each, Toggle Motion Blur, Toggle 3D, Toggle Solo, Remove All Effects, Marker at Playhead

undefined

### 67 — Logo Reveal, Cinematic Clip, Glitch Intro, Lower Third, Social Pop, Photo Slideshow, Retro VHS, Dreamy, Neon Sign, Clean Corporate, Horror / Dark, Energetic Promo, Product Showcase, Cyberpunk, 3D Flip Card, Light Reveal, Handheld Documentary, Stop-Motion, Liquid Morph, Clean Photo, HUD / Tech, Comic Pop, Old Film Reel, Gamer Stream, Text Headline, Text Typewriter, Kinetic Text, Glitch Text, Elegant Title, Bouncy Text, Number Counter, Vlog Cut, Impact Hit, Smooth Zoom, Film Burn Cut, Spin Cut, Speed Whip Stack, Glitch Cut, Dream Cut, Push + Blur, Lens Cut, YouTube Intro, Instagram Story, Title Card Cinematic, Quote Card, End Screen, Kinetic Typography Burst, Product Hero, Real Estate, Food & Cooking, Minimal Corporate, Podcast / Interview, Travel Vlog, Wedding Film, Documentary Archive, Soft Memorial, Sports Promo, Anime Impact, Music Visual, Retro 80s, Tech / HUD, Horror Trailer, Fashion Editorial, Cinematic Cut, Action Cut, Dream Cut, Glitch Cut Pro

undefined

---

## Решение проблем

Если что-то не так — запустите **`diagnose.bat`**: он соберёт в `UniKit_diag.txt` на рабочем столе версии в папке и в
установленной панели, ключи реестра, список расширений CEP, копии ScriptUI и последние строки логов CEP
(`%LOCALAPPDATA%Tempcsxs12-AEFT.log`), где AE пишет, почему расширение не загрузилось. Этот файл и нужен для разбора.

Отладка панели в браузере: пока AE открыт с панелью, зайдите в Chrome на `http://localhost:8099` — откроется DevTools
панели (консоль, ошибки JS). Порт задан в файле `.debug` расширения.

| Симптом | Решение |
|---|---|
| Нет пункта Window > Extensions > UniKit | Не включён PlayerDebugMode. Запустите `install.bat` ещё раз (он пишет ключи CSXS.9–12) и полностью перезапустите AE. Проверьте, что папка `%APPDATA%\Adobe\CEP\extensions\com.unikit.panel` существует. |
| Панель открывается пустой / белой | Включите Preferences > Scripting & Expressions > Allow Scripts to Write Files and Access Network. Проверьте, что в папке панели есть `host/UniKit.jsx`. |
| После обновления ничего не изменилось | Сверьте штамп сборки в статус-баре с тем, что напечатал `reinstall.bat`. Если старый — AE был открыт во время установки: закройте AE и запустите `reinstall.bat` ещё раз. |
| Кнопка ⟳ пишет «Не найден путь к репозиторию» | Панель установлена старым установщиком. Запустите `install.bat` из папки проекта. |
| «Выделите хотя бы один слой» | Пресеты In/Out/Эффекты требуют выделенный слой. Для эффектов без выделения включите «На корр. слой». |
| «Выделите текстовый слой» | Пресет из категории Текст работает только с Text Layer. |
| Переход применился не туда | Проверьте, что выделены два соседних слоя или курсор стоит точно на склейке (начало верхнего слоя). |
| Параметр эффекта остался по умолчанию | В локализованном (не английском) AE часть параметров ищется по display-имени и может не найтись; эффект всё равно добавится. Переключите AE на английский или настройте вручную. |
| Нужно убрать всё, что сделал скрипт | Выделите слои → **Сбросить слой**. Солиды и корректирующие слои `UK · …` тоже выделите. |
| Выражения показывают ошибку | Убедитесь, что движок выражений — JavaScript (Project Settings > Expressions). Legacy ExtendScript не поддерживается. |

---

## Для разработчиков

```
src/
  00_header.jsx      обёртка, полифиллы ES3
  10_core.jsx        ядро UK: реестр, ключи/изинг (influence и bezier), эффекты, контролы, контексты, UK.run
  15_bridge.jsx      JSON-API для CEP-панели, applyTo/applyTrans для комбо, предпросмотр
  16_bridge_ops.jsx  undo/redo, полный сброс слоя, кривая на выделенные ключи
  20_ui.jsx          резервная ScriptUI-панель
  25_examples.jsx    эталонные пресеты
  28_previews.jsx    карта пресет → ключ CSS-превью
  presets/           30_in 31_out 32_in_pro 33_out_pro 40_trans 41_trans_pro 50_fx 51_fx_pro 55_distort
                     60_light 65_text 70_cam 75_util 77_design
  80_combos.jsx 81_combos_pro.jsx   готовые решения
  90_footer.jsx
cep/com.unikit.panel/  CEP-панель: CSXS/manifest.xml, index.html, css, js, host/ (копия ядра), dev/ (браузерный режим)
build.js               сборка src → dist/UniKit.jsx (+ штамп сборки, копия в cep/host, cache-busting)
install.bat            установка (/silent — без паузы)
diagnose.bat           отчёт для разбора проблем (версии, реестр, логи CEP) → UniKit_diag.txt на рабочем столе
VERSION                номер версии, инжектится сборкой в ядро и манифест
reinstall.bat          полное удаление + свежая версия из GitHub + установка (update.bat — алиас)
test/mock_ae.js        мок AE API для node                 test/run.js прогон всех пресетов
test/ae_selftest.jsx   прогон всех пресетов внутри AE → отчёт UniKit_selftest.txt на рабочем столе
docs/API.md            API пресетов + match names эффектов   docs/PREVIEW_KEYS.md  ключи превью
```

* Сборка: `node build.js`. Тесты: `node test/run.js [фильтр]`. Панель в браузере: `node cep/com.unikit.panel/dev/serve.js` → http://localhost:5178 (каталог: `node cep/com.unikit.panel/dev/gen_catalog.js`).
* Свой пресет: файл в `src/presets/` с `UK.add({ id, cat, name, desc, tags, needs, preview, apply(c) })` — см. `docs/API.md`.
  Код — ES3 (ExtendScript): без `let/const`, стрелок, шаблонных строк и `JSON`.
* Проверка в реальном AE: `File > Scripts > Run Script File > test/ae_selftest.jsx` на пустом проекте.
