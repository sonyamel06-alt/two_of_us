# Two of us (mobile web game)

Стек: Vite + React + TypeScript. Цель: 4 экрана (меню + 3 мини-игры) с пиксельным рендерингом и debug overlay по референсам.

## Запуск

```powershell
npm install
npm run dev
```

Открыть в браузере: `http://localhost:5173`

## Debug overlay

В dev-режиме можно наложить референс поверх экрана с `opacity: 0.35`:

- На десктопе: клавиша `D`
- На телефоне: 5 быстрых тапов в левом верхнем углу меню

## Ассеты (пути фиксированные)

Референсы:
- `public/assets/ref/ref_menu_frames/*`
- `public/assets/ref/ref_games_screens/*`

UI:
- `public/assets/ui/*_button.png`

Спрайты:
- `public/assets/sprites/*`

Шрифт:
- `public/assets/fonts/PressStart2P.ttf`

## Замены ассетов

Если вы заменяете PNG/TTF, сохраняйте:
- тот же путь и имя файла
- пиксельный стиль (без встроенного размытия)

