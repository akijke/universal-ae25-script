# UniKit — API для авторов пресетов

Код — **ES3 (ExtendScript)**: никаких `let/const`, стрелок, шаблонных строк, `JSON`, trailing-comma,
`Array.isArray`. Доступны полифиллы: `indexOf/forEach/map/filter`, `Object.keys`, `String.trim`.
Каждый файл пресетов оборачивается в `(function(){ ... })();` и вызывает `UK.add({...})`.

## Регистрация

```js
UK.add({
  id: 'in.slideBlur',               // уникальный, префикс = категория
  cat: 'in',                        // in | out | trans | fx | distort | light | text | cam | util
  name: 'Slide + Blur · Влёт с размытием',   // "English · Русское"
  desc: 'Что делает, на что влияет Сила/Направление.',
  tags: 'slide blur motion',        // для поиска (англ + рус)
  needs: 'layer',                   // layer (по умолчанию) | text | trans | comp | none
  apply: function (c) { ... }       // c — контекст (см. ниже)
});
```

`UK.run` сам: открывает undo-группу, проходит по выделенным слоям (для `layer`/`text`),
создаёт контекст, ловит исключения и показывает alert. Пресет работает **с одним слоем** `c.layer`.

## Контекст `c` (для needs: layer / text / none / comp)

| поле | значение |
|---|---|
| `c.comp`, `c.layer`, `c.layers`, `c.i` | композиция, текущий слой, все целевые слои, индекс (для stagger уже учтён в t0) |
| `c.t0`, `c.t1`, `c.dur`, `c.tMid` | интервал анимации. Для `cat:'in'` — от начала слоя (или курсора); для `cat:'out'` — заканчивается на out-point (или курсоре) |
| `c.strength` | множитель силы (1.0 = 100 %) |
| `c.ease` / `c.easeId` | объект изинга из `UK.EASES` / его id. Передавать в `UK.key2/UK.keys` |
| `c.dir`, `c.dirV`, `c.dirId` | направление: `{id,name,v}`, вектор `[x,y]` (L=[-1,0] R=[1,0] U=[0,-1] D=[0,1]), id |
| `c.fps`, `c.fd` | кадров/с, длительность кадра |
| `c.opts` | сырые опции UI: `dur, ease, strength, dir, startMode('in'|'playhead'), stagger, controls(bool), adj(bool)` |
| `c.isOut` | true для cat 'out' |

## Контекст перехода (needs: 'trans')

| поле | значение |
|---|---|
| `c.cut` | время склейки |
| `c.t0`, `c.t1`, `c.half`, `c.dur` | интервал перехода вокруг склейки (cut ± dur/2) |
| `c.A` | исходящий слой (может быть `null`) |
| `c.B` | входящий слой (может быть `null`) |
| `c.adj(name)` | создать корректирующий слой над склейкой на [t0,t1]; возвращает слой и кладёт в `c.layer` |
| `c.layer` | B или A (для `UK.cv`/контролов до вызова adj) |
| `c.strength, c.ease, c.dirV, c.dirId, c.fd, c.comp, c.opts` | как выше |

Переход должен работать во всех трёх случаях: A и B заданы; только B; только A.
Паттерн: эффектные переходы — на `c.adj()`; "честные" (push/slide/wipe) — анимировать A и/или B, если они есть.

## Ключи и изинг

```js
UK.key2(prop, t0, v0, t1, v1, c.ease)         // два ключа + безье по изингу
UK.key2(prop, t0, v0, t1, v1, c.ease, true)   // mirror=true для исчезновений (ускорение к концу)
UK.keys(prop, [[t,v],[t,v],[t,v]], 'expoInOut') // серия ключей; ease — id или объект
UK.key(prop, t, v)              // один ключ, возвращает индекс
UK.setEase(prop, idx, inInfl, outInfl)  UK.setLinear(prop, idx)  UK.setHold(prop, idx)
UK.clearKeys(prop)
UK.applyEaseExpr(prop, c.ease, c)   // overshoot/bounce/elastic выражение (только если изинг back/bounce/elastic) — вызывать для position/scale/rotation в анимациях
```
Текущее значение: `prop.valueAtTime(c.t1, false)` (не `prop.value`, чтобы уважать существующие ключи).

## Эффекты

```js
var fx = UK.addFx(c.layer, 'ADBE Gaussian Blur 2', 'Blur');   // имя станет "UK · Blur"
UK.set(fx, 'ADBE Gaussian Blur 2-0001', 40);          // по matchName (предпочтительно) — молча пропускает, если нет
UK.set(fx, ['ADBE Glo2-0004', 'Glow Intensity'], 2);  // массив кандидатов: matchName, затем display-имя
var p = UK.p(fx, 'ADBE Gaussian Blur 2-0001');        // получить Property (бросает ошибку, если нет)
UK.keys(p, [[c.t0, 60], [c.t1, 0]], c.ease);
UK.expr(fx, 'ADBE Glo2-0004', 'выражение');            // поставить выражение
fx.moveTo(1);                                          // порядок в стеке
UK.findProp(group, cands)  // рекурсивный поиск (нужен для вложенных групп, напр. Fractal Noise > Transform)
```

## Контролы (слайдеры в Effect Controls, имена «UK: …»)

```js
UK.slider(c.layer, 'Amount', 50)      // создаёт/переиспользует "UK: Amount", возвращает Property
UK.point / UK.color / UK.check / UK.angle
UK.ref('Amount')                       // -> 'effect("UK: Amount")("ADBE Slider Control-0001")'
UK.ref('Tint', 'color')                // типы: slider | point | color | check | angle
// «контрол или константа»: если c.opts.controls — создаёт слайдер и возвращает ссылку, иначе число строкой
var amt = UK.cv(c, 'Blur Amount', 40);
UK.expr(fx, 'ADBE Gaussian Blur 2-0001', amt + ' * linear(time, ' + c.t0 + ', ' + c.t1 + ', 1, 0)');
```
Правило: если `c.opts.controls` — ключевые параметры пресета должны управляться слайдерами через выражения
(как в Motion Bro/EditKit). Если нет — ставить значения/ключи напрямую. `UK.cv` делает это автоматически.
Анимации (in/out) всегда ставят **ключи** (их удобно править в graph editor); слайдеры там — только для
overshoot-выражений (делает `UK.applyEaseExpr`).

## Слои

```js
UK.adjLayer(comp, t0, t1, 'Name')   // корректирующий слой поверх (UK · Name)
UK.solid(comp, [r,g,b], 'Name', t0, t1)
UK.nullLayer(comp, 'Name')
UK.motionBlur(layer, comp)          // включить MB слою и композиции
UK.layerSize(layer, t)              // [w,h] в пикселях комп с учётом scale
UK.exitDistance(layer, comp, dirV, t) // расстояние до полного ухода за край по направлению
UK.center(comp)                     // [w/2,h/2]
UK.isText(layer) / UK.isShape(layer) / UK.isAV(layer)
UK.vecAdd(a,b) UK.vecMul(a,k) UK.clamp UK.lerp UK.rnd UK.fmt(n, digits) UK.hex('FF8800') -> [r,g,b]
UK.frames(comp, n)                  // n кадров в секундах
```
Маски: `var m = layer.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'); var sh = new Shape(); sh.vertices = [[x,y],...]; sh.closed = true; m.property('ADBE Mask Shape').setValue(sh); m.property('ADBE Mask Feather')…; m.maskMode = MaskMode.ADD;`
Координаты масок — в пикселях слоя (0..layer.width). Для солидов/корр. слоёв = размер комп.

## Текст (needs: 'text')

```js
var ta = UK.textAnimator(c.layer, 'Name');             // {anim, sel, props}
UK.textProp(ta, 'ADBE Text Opacity', 0);               // добавить свойство аниматора со значением
// другие: 'ADBE Text Position 3D' [x,y,0], 'ADBE Text Scale 3D' [sx,sy,100], 'ADBE Text Rotation', 'ADBE Text Blur' [bx,by],
//         'ADBE Text Tracking Amount', 'ADBE Text Skew', 'ADBE Text Fill Color', 'ADBE Text Anchor Point 3D'
UK.textSelector(ta, { basedOn: 1, shape: 2, easeHigh: 50, easeLow: 0, random: true, smooth: 100, start: 0, end: 100 });
// basedOn 1=Characters 2=Chars excl. spaces 3=Words 4=Lines; shape 1=Square 2=Ramp Up 3=Ramp Down 4=Triangle 5=Round 6=Smooth
UK.textOffsetKeys(ta, c.t0, c.t1, -100, 100, c.ease);  // ключи Offset (появление: -100→100; исчезновение: 0→100 со start/end нюансами)
```
Для исчезновений текста: `UK.textSelector(ta,{shape:2}); UK.textOffsetKeys(ta, c.t0, c.t1, -100, 100)` с перевёрнутой логикой (Start=0,End=100, Offset 0→100 скрывает слева направо: ставьте `UK.textSelector(ta,{start:0,end:100})` и Offset ключи 0→100 с анимируемым свойством = конечное состояние).

## Выражения

`UK.EXPR.overshoot(amp,freq,decay)`, `UK.EXPR.bounce(...)`, `UK.EXPR.wiggle(f,a)`, `UK.EXPR.loopOut('cycle')`.
Выражения — движок JavaScript (AE 16+). Используйте `var`, многострочные через `'...\n' +`.
Не использовать `thisComp.layer("имя")` по русским именам — только `thisLayer`, `effect("UK: Name")(...)`.

## Match names частых эффектов (параметры = `<match>-000N`)

```
ADBE Gaussian Blur 2:   1 Blurriness, 2 Blur Dimensions(1 H&V,2 H,3 V), 3 Repeat Edge Pixels
ADBE Motion Blur (Directional Blur): 1 Direction, 2 Blur Length
ADBE Radial Blur:       1 Amount, 2 Center, 3 Type(1 Spin,2 Zoom), 4 Antialiasing
ADBE Box Blur2:         1 Blur Radius, 2 Iterations, 3 Blur Dimensions, 4 Repeat Edge Pixels
CC Radial Fast Blur:    1 Center, 2 Amount, 3 Zoom(1 Standard,2 Brightest,3 Darkest)
CC Radial Blur:         1 Type(1 Rotate..., 4 Fading Zoom), 2 Amount, 3 Quality, 4 Center
CC Cross Blur:          1 Radius X, 2 Radius Y, 3 Transfer Mode
CC Vector Blur:         1 Type, 2 Amount, 3 Angle Offset, 4 Ridge Smoothness, 5 Vector Map, 6 Property, 7 Map Softness
ADBE Geometry2 (Transform): 1 Anchor Point, 2 Position, 3 Uniform Scale(bool), 4 Scale Height, 5 Scale Width, 6 Skew, 7 Skew Axis, 8 Rotation, 9 Opacity, 10 Use Comp Shutter Angle, 11 Shutter Angle, 12 Sampling
ADBE Tile (Motion Tile): 1 Tile Center, 2 Tile Width, 3 Tile Height, 4 Output Width, 5 Output Height, 6 Mirror Edges, 7 Phase, 8 Horizontal Phase Shift
ADBE Turbulent Displace: 1 Displacement(1 Turbulent,2 Bulge,3 Twist,4 Turbulent Smoother...), 2 Amount, 3 Size, 4 Offset(Turbulence), 5 Complexity, 6 Evolution, 7 Evolution Options(grp): 8 Cycle Evolution, 9 Cycle, 10 Random Seed; 11 Pinning, 12 Resize Layer, 13 Antialiasing
ADBE Wave Warp:         1 Wave Type, 2 Wave Height, 3 Wave Width, 4 Direction, 5 Wave Speed, 6 Pinning(1 None,...), 7 Phase, 8 Antialiasing
ADBE Displacement Map:  1 Map Layer, 2 Use For Horizontal(1 Red..5 Lum), 3 Max Horizontal, 4 Use For Vertical, 5 Max Vertical, 6 Map Behavior, 7 Edge Behavior, 8 Expand Output
ADBE Bulge:             1 Horizontal Radius, 2 Vertical Radius, 3 Bulge Center, 4 Bulge Height, 5 Taper Radius, 6 Antialiasing, 7 Pinning
ADBE Ripple:            1 Radius, 2 Center of Ripple, 3 Type of Conversion, 4 Wave Speed, 5 Wave Width, 6 Wave Height, 7 Ripple Phase
ADBE Twirl:             1 Angle, 2 Twirl Radius, 3 Twirl Center
ADBE Mirror:            1 Reflection Center, 2 Reflection Angle
ADBE Offset:            1 Shift Center To, 2 Blend With Original
ADBE Optics Compensation: 1 FOV, 2 Reverse Lens Distortion, 3 FOV Orientation, 4 View Center, 5 Optimal Pixels, 6 Resize
ADBE Spherize:          1 Radius, 2 Center of Sphere
ADBE Polar Coordinates: 1 Interpolation, 2 Type of Conversion(1 Rect→Polar, 2 Polar→Rect)
ADBE Warp:              1 Warp Style(1 Arc...), 2 Warp Axis, 3 Bend, 4 Horizontal Distortion, 5 Vertical Distortion
ADBE Magnify:           1 Shape, 2 Center, 3 Magnification, 4 Link, 5 Size, 6 Feather, 7 Opacity, 8 Scaling, 9 Blending Mode, 10 Resize Layer
ADBE Corner Pin:        1 UL, 2 UR, 3 LL, 4 LR
CC Lens:                1 Center, 2 Size, 3 Convergence
CC Power Pin:           1 Top Left, 2 Top Right, 3 Bottom Left, 4 Bottom Right, 5 Perspective, 6 Unstretch, 7 Expansion%...
CC Kaleida:             1 Center, 2 Size, 3 Mirroring, 4 Rotation, 5 Floating Center
CC Twister:             1 Backside, 2 Shading, 3 Center, 4 Axis, 5 Completion
CC Slant:               1 Slant, 2 Stretching, 3 Floor, 4 Height
CC Bend It:             1 Bend, 2 Start, 3 End, 4 Render Prestart, 5 Distort
CC Flo Motion:          1 Finer Controls, 2 Knot 1, 3 Amount 1, 4 Knot 2, 5 Amount 2, 6 Tile Edges, 7 Antialiasing, 8 Falloff
CC Tiler:               1 Scale, 2 Center, 3 Blend w. Original
CC Blobbylize:          1 Blob Layer, 2 Property, 3 Softness, 4 Cut Away, 5 Light Intensity...
ADBE Glo2 (Glow):       1 Glow Based On, 2 Glow Threshold, 3 Glow Radius, 4 Glow Intensity, 5 Composite Original, 6 Glow Operation, 7 Glow Colors, 8 Color Looping, 9 Color Loops, 10 Color Phase, 11 A&B Midpoint, 12 Color A, 13 Color B, 14 Glow Dimensions
ADBE Tint:              1 Map Black To, 2 Map White To, 3 Amount to Tint
ADBE Tritone:           1 Highlights, 2 Midtones, 3 Shadows, 4 Blend With Original
ADBE Brightness & Contrast 2: 1 Brightness, 2 Contrast, 3 Use Legacy
ADBE HUE SATURATION:    1 Channel Control, 2 Channel Range, 3 Master Hue, 4 Master Saturation, 5 Master Lightness, 6 Colorize, 7 Colorize Hue, 8 Colorize Saturation, 9 Colorize Lightness
ADBE Vibrance:          1 Vibrance, 2 Saturation
ADBE Exposure2:         1 Channels, 2 Master(grp): 3 Exposure, 4 Offset, 5 Gamma Correction  (используйте UK.findProp / display-имена)
ADBE Photo Filter:      1 Filter, 2 Color, 3 Density, 4 Preserve Luminosity
ADBE Black&White:       1 Reds, 2 Yellows, 3 Greens, 4 Cyans, 5 Blues, 6 Magentas, 7 Tint, 8 Tint Color
ADBE Color Balance (HLS): 1 Hue, 2 Lightness, 3 Saturation
ADBE Color Balance 2:   1 Shadow Red, 2 Shadow Green, 3 Shadow Blue, 4 Mid R, 5 Mid G, 6 Mid B, 7 Hi R, 8 Hi G, 9 Hi B, 10 Preserve Luminosity
ADBE CHANNEL MIXER:     1 Red-Red,2 Red-Green,3 Red-Blue,4 Red-Const, 5 Green-Red ... 13 Monochrome
ADBE Leave Color:       1 Amount to Decolor, 2 Color To Leave, 3 Tolerance, 4 Edge Softness, 5 Match colors
ADBE Invert:            1 Channel, 2 Blend With Original
ADBE Shift Channels:    1 Take Alpha From, 2 Take Red From, 3 Take Green From, 4 Take Blue From  (1 Red,2 Green,3 Blue,4 Alpha,5 Luminance,...,9 Full On,10 Full Off)
ADBE Set Matte:         1 Take Matte From Layer, 2 Use For Matte, 3 Invert Matte, 4 If Layer Sizes Differ, 5 Composite Matte with Original, 6 Premultiply Matte Layer
CC Toner:               1 Tones, 2 Highlights, 3 Brights, 4 Midtones, 5 Darktones, 6 Shadows, 7 Blend w. Original
CC Color Offset:        1 Red Phase, 2 Green Phase, 3 Blue Phase, 4 Overflow
CC Vignette:            1 Amount, 2 Angle of View, 3 Center, 4 Pin Highlights
ADBE Mosaic:            1 Horizontal Blocks, 2 Vertical Blocks, 3 Sharp Colors
ADBE Posterize:         1 Levels
ADBE Posterize Time:    1 Frame Rate
ADBE Echo:              1 Echo Time, 2 Number of Echoes, 3 Starting Intensity, 4 Decay, 5 Echo Operator(1 Add,2 Max,3 Min,4 Screen,5 Composite Back,6 Composite Front,7 Blend)
ADBE Find Edges:        1 Invert, 2 Blend With Original
ADBE Emboss:            1 Direction, 2 Relief, 3 Contrast, 4 Blend With Original
ADBE Solarize:          1 Threshold
ADBE Threshold2:        1 Level
ADBE Noise2:            1 Amount of Noise, 2 Use Color Noise, 3 Clipping
ADBE Scatter:           1 Scatter Amount, 2 Grain, 3 Scatter Randomness
ADBE Strobe:            1 Strobe Color, 2 Blend With Original, 3 Strobe Duration, 4 Strobe Period, 5 Random Strobe Probability, 6 Strobe(1 Makes Layer Transparent, 2 Operates on Color Only), 7 Strobe Operator, 8 Random Seed
ADBE Roughen Edges:     1 Edge Type, 2 Edge Color, 3 Border, 4 Edge Sharpness, 5 Fractal Influence, 6 Scale, 7 Stretch W/H, 8 Offset(Turbulence), 9 Complexity, 10 Evolution
ADBE Drop Shadow:       1 Shadow Color, 2 Opacity, 3 Direction, 4 Distance, 5 Softness, 6 Shadow Only
ADBE Bevel Alpha:       1 Edge Thickness, 2 Light Angle, 3 Light Color, 4 Light Intensity
ADBE Fill:              1 Fill Mask, 2 All Masks, 3 Color, 4 Invert, 5 Horizontal Feather, 6 Vertical Feather, 7 Opacity
ADBE Ramp:              1 Start of Ramp, 2 Start Color, 3 End of Ramp, 4 End Color, 5 Ramp Shape(1 Linear,2 Radial), 6 Ramp Scatter, 7 Blend With Original
ADBE Fractal Noise:     1 Fractal Type, 2 Noise Type, 3 Invert, 4 Contrast, 5 Brightness, 6 Overflow, 7 Transform(grp): 8 Rotation, 9 Uniform Scaling, 10 Scale, 11 Scale Width, 12 Scale Height, 13 Offset Turbulence, 14 Perspective Offset; 15 Complexity, 16 Sub Settings(grp)...; 22 Evolution; 23 Evolution Options(grp): 24 Cycle Evolution, 25 Cycle, 26 Random Seed; 27 Opacity, 28 Blending Mode
                        -> из-за вложенности для Fractal Noise/Turbulent Displace используйте массивы кандидатов: ['ADBE Fractal Noise-0022','Evolution']
ADBE Circle:            1 Center, 2 Radius, 3 Edge(1 None,2 Edge Radius,3 Thickness,4 Thickness*Radius,5 Thickness&Feather*Radius), 4 Edge Radius/Thickness, 5 Feather(grp), 8 Invert Circle, 9 Color, 10 Opacity, 11 Blending Mode
ADBE Lens Flare:        1 Flare Center, 2 Flare Brightness, 3 Lens Type(1 50-300mm,2 35mm,3 105mm), 4 Blend With Original
CC Light Sweep:         1 Center, 2 Direction, 3 Shape(1 Linear,2 Smooth,3 Sharp), 4 Width, 5 Sweep Intensity, 6 Edge Intensity, 7 Edge Thickness, 8 Light Color, 9 Light Reception(1 Add,2 Composite,3 Cutout)
CC Light Rays:          1 Intensity, 2 Center, 3 Radius, 4 Warp Softness, 5 Shape, 6 Direction, 7 Color from Source, 8 Allow Brightening, 9 Color, 10 Transfer Mode
CC Light Burst 2.5:     1 Center, 2 Intensity, 3 Ray Length, 4 Burst(1 Straight,2 Fade,3 Center), 5 Halo Alpha, 6 Set Color, 7 Color
ADBE Linear Wipe:       1 Transition Completion, 2 Wipe Angle, 3 Feather
ADBE Radial Wipe:       1 Transition Completion, 2 Start Angle, 3 Wipe Center, 4 Wipe(1 Clockwise,2 Counter,3 Both), 5 Feather
ADBE Venetian Blinds:   1 Transition Completion, 2 Direction, 3 Width, 4 Feather
ADBE Block Dissolve:    1 Transition Completion, 2 Block Width, 3 Block Height, 4 Feather, 5 Soft Edges
ADBE Iris Wipe:         1 Iris Center, 2 Iris Points, 3 Outer Radius, 4 Use Inner Radius, 5 Inner Radius, 6 Rotation, 7 Feather
ADBE Gradient Wipe:     1 Transition Completion, 2 Transition Softness, 3 Gradient Layer, 4 Gradient Placement, 5 Invert Gradient
CC Grid Wipe:           1 Completion, 2 Center, 3 Rotation, 4 Border, 5 Tiles, 6 Shape, 7 Reverse Transition
CC Jaws:                1 Completion, 2 Center, 3 Direction, 4 Height, 5 Width, 6 Shape
CC Light Wipe:          1 Completion, 2 Center, 3 Intensity, 4 Shape, 5 Direction, 6 Color from Source, 7 Color, 8 Reverse Transition
CC Line Sweep:          1 Completion, 2 Direction, 3 Thickness, 4 Slant, 5 Flip Direction
CC Radial ScaleWipe:    1 Completion, 2 Center, 3 Reverse Transition
CC Scale Wipe:          1 Stretch, 2 Center, 3 Direction
CC WarpoMatic:          1 Completion, 2 Layer to Reveal, 3 Reactor, 4 Smoothness, 5 Warp Amount, 6 Warp Direction, 7 Blend Span
CC Glass Wipe:          1 Completion, 2 Layer to Reveal, 3 Gradient Layer, 4 Softness, 5 Displacement Amount
CC Image Wipe:          1 Completion, 2 Border Softness, 3 Auto Softness, 4 Gradient(layer), 5 Property, 6 Blur, 7 Inverse Gradient
CC Burn Film:           1 Burn, 2 Center, 3 Random Seed
CC Block Load:          1 Completion, 2 Scans, 3 Start Cleared, 4 Blocks
CC Glass:               (Surface grp) Bump Map, Property, Softness, Height, Displacement; (Light grp)...; (Shading grp)... -> display-имена
CC Wide Time:           1 Forward Steps, 2 Backward Steps, 3 Native Motion Blur
CC Force Motion Blur:   1 Motion Blur Samples, 2 Override Shutter Angle, 3 Shutter Angle, 4 Native Motion Blur
ADBE Timewarp:          display-имена ('Speed', 'Method')
ADBE Minimax:           1 Operation(1 Minimum,2 Maximum,3 Min then Max,4 Max then Min), 2 Radius, 3 Channel, 4 Direction, 5 Don't Shrink Edges
VISINF Grain Implant (Add Grain): display-имена: 'Viewing Mode'(2=Final Output), 'Preset', 'Intensity', 'Size', 'Softness' (внутри групп — UK.findProp найдёт)
ADBE Noise HLS2:        1 Noise, 2 Hue, 3 Lightness, 4 Saturation, 5 Grain Size, 6 Noise Phase
ADBE Cell Pattern:      1 Cell Pattern, 2 Invert, 3 Contrast, 4 Overflow, 5 Disperse, 6 Size, 7 Offset, 8 Tiling Options(grp)..., 12 Evolution
ADBE Grid:              1 Anchor, 2 Size From, 3 Corner, 4 Width, 5 Height, 6 Border, 7 Feather(grp), 10 Invert Grid, 11 Color, 12 Opacity, 13 Blending Mode
```
Для свойств, в которых не уверены, передавайте массив `[matchName, 'Display Name']`.

## Качество

* Дефолты должны выглядеть хорошо «из коробки» на 1920×1080, 30 fps, и масштабироваться от `c.comp.width/height`.
* Все анимации — с motion blur, где уместно (`UK.motionBlur`).
* Длительности: in ≈ `c.dur`, out ≈ `c.dur`, переход = `c.dur` вокруг склейки.
* Сила (`c.strength`) влияет на амплитуду/интенсивность, а не на время.
* Направление (`c.dirV`) учитывать везде, где есть геометрический смысл.
* Эффекты (fx/distort/light) на слое с «постоянным» характером (look, искажение) — без ключей, но с контролами;
  события (вспышка, лайтсвип, глитч-удар) — с ключами в [t0,t1] или вокруг playhead (`c.t0` = inPoint слоя или курсор).
* Имена эффектов — через `UK.addFx(layer, match, nick)`; контролы — `UK.slider(...)` / `UK.cv(...)`.
* Не оставлять `alert` в пресетах; ошибки — `throw new Error('...')`.

## Контролы на вспомогательных слоях

Если пресет создаёт солид/дубль (UK.solid, layer.duplicate()) и ставит на него выражения со ссылкой
`effect("UK: …")`, то слайдеры должны лежать **на том же слое**: передавайте `UK.cv({ opts: c.opts, layer: solid }, ...)`
или вызывайте `UK.slider(solid, …)` явно. Ссылка на другой слой по имени (`thisComp.layer("…")`) ломается при переименовании.
