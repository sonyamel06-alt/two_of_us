# OUTPUT (полный вывод)

Ниже перечислено, что было исправлено/добавлено в текущем проекте (без пересоздания с нуля), и какие файлы затронуты.

## A) FIX: iPhone Safari клиппинг/обрезание

- Добавлен единый `PixelPerfectViewport` с:
- корректным измерением viewport на iOS Safari через `visualViewport`
- safe-area padding (`env(safe-area-inset-*)`)
- scale: `floor(scaleExact)` если `>= 1`, иначе `scaleExact`
- фоном снаружи design-container (без черных боковин)
- Везде используется один design size под референсы: `375x812` (это `1500x3248 / 4`).

Файлы:
- `src/ui/PixelPerfectViewport.tsx`
- `src/styles/global.css`
- `src/App.tsx`

## Debug Overlay Mode

- `D` на десктопе
- Long-press по заголовку (и на Catch Hearts по HUD-панели, т.к. там нет заголовка)

Файлы:
- `src/utils/useLongPress.ts`
- `src/App.tsx`
- `src/screens/MenuScreen.tsx`
- `src/screens/CatchHeartsScreen.tsx`
- `src/maze_game.tsx`
- `src/love_clicker.tsx`

## B) Catch Hearts: скорость, drag, коллизии

- Ловец: `public/assets/sprites/catch_hearts_sprite.png`
- Управление: перетаскивание пальцем (Pointer Events) по игровому полю, движение по `x`, ограничения по границам.
- Сердечки: `public/assets/sprites/heart_small.png`, spawn с рандомом 700–1200ms.
- Скорость падения: через `deltaTime` (px/sec), ориентир ~35 секунд сверху вниз.
- Коллизия: хитбокс ловца (руки/верх торса) + хитбокс сердца; при пересечении `+1` очко, комбо растет; если сердце улетело вниз, комбо сбрасывается.
- Визуал HUD/кнопки: сохранен под референс.

Файлы:
- `src/screens/CatchHeartsScreen.tsx`

## C) Maze: персонажи, layout, генерация уровней, win-экран

- Исправлено в `src/maze_game.tsx` (разрешенный рефакторинг).
- Layout: вертикальный стек без налезаний (header -> info panel -> maze card -> d-pad -> bottom button). Минимум `absolute` (только там, где нужно).
- Лабиринт: фиксированный `cellSize` в design-координатах; рендер внутри `relative` контейнера.
- Персонажи:
- Player1 (ты): `public/assets/sprites/sprite_sheet_me.png`, статичный кадр.
- Player2 (девушка): `public/assets/sprites/sprite_sheet_my_gf.png`, анимация бега по направлению, `left` = mirror `right`.
- Tween движения девушки: ~160ms между клетками; анимация включается только во время tween.
- Генерация уровней: новый лабиринт на каждый запуск уровня, гарантированно проходимый (maze-generation + floor-to-floor start/goal).
- Победа:
- Условие: player1 дошел до клетки player2.
- После победы скрывается обычный UI и показывается win card в стиле референса.
- Картинка победы: `public/assets/sprites/win_maze_game.png`.
- Конфетти: легкий `canvas` overlay, автостоп (используется общий модуль).
- Кнопки: `Сыграть заново` (reset level=1, steps=0, новый лабиринт) и `Назад в меню`.

Файлы:
- `src/maze_game.tsx`
- `src/utils/mazeGen.ts`

## D) Love Clicker: PNG сердце, тексты раз в 8, конфетти по числам

- Исправлено в `src/love_clicker.tsx`.
- Большое сердце: PNG `public/assets/sprites/heart_big.png` (без символа `♥`).
- Сообщения: обновляются каждые 8 кликов (8, 16, 24, ...), берутся из массива и держатся до следующего кратного 8.
- Конфетти: строго на кликах `8, 12, 88, 888, 8888`, автостоп ~1.4s.
- Сохранение кликов: `localStorage`.

Файлы:
- `src/love_clicker.tsx`

## Переиспользуемые модули

- `src/ui/PixelPerfectViewport.tsx`
- `src/ui/ConfettiOverlay.tsx`
- `src/ui/SpriteSheetAnimator.tsx`

## Прочие изменения проекта

- Обновлен роутинг/композиция экранов под единый viewport-контейнер:
- `src/App.tsx`
- Обновлен тип в debug overlay (убран старый `DesignScaleContainer`):
- `src/ui/DebugOverlay.tsx`

Удалено (как устаревшее/дублирующее и неиспользуемое в текущей архитектуре):
- `src/ui/DesignScaleContainer.tsx`
- `src/ui/ConfettiCanvas.tsx`
- `src/screens/MazeScreen.tsx`
- `src/screens/LoveClickerScreen.tsx`
