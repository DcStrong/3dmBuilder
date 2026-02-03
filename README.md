# OC 3DM Editor

Примитивный веб-редактор 3D моделей для **3D принтера OpenComputers** (Minecraft). Позволяет рисовать модели из параллелепипедов (shapes) и сохранять их в формате `.3dm` / текстовом виде для использования с `print3d` в игре.

## Возможности

- **Сетка 16×16×16** — координаты как в принтере OpenComputers (0…15 по осям).
- **Инструменты:**
  - **Воксель** — клик ставит куб 1×1×1 с выбранной текстурой.
  - **Бокс** — первый клик задаёт один угол, второй — противоположный; создаётся параллелепипед.
  - **Ластик** — клик по фигуре удаляет её.
- **Текстура** — выбор из списка имён текстур Minecraft (planks_oak, cobblestone_mossy, wool_colored_*, и т.д.). Воксели отображаются с реальной текстурой: сначала ищется локальный файл в `public/textures/`, при отсутствии — подгружаются ванильные текстуры с [f0x.me (OpenComputers 3D Designer)](https://f0x.me/OpenComputers-3D-Designer/img/resourcepacks/Vanilla/blocks/).
- **Загрузка** — загрузить существующий `.3dm` или `.txt` с таблицей `shapes`.
- **Сохранение** — экспорт в `.3dm` или `.txt` в формате, совместимом с OpenComputers.

## Формат вывода

Файл — Lua-таблица в виде:

```lua
{
  label = "Метка",
  tooltip = "Подсказка",
  shapes = {
    [1] = { [1] = 0, [2] = 4, [3] = 0, [4] = 16, [5] = 13, [6] = 1, texture = "cobblestone_mossy" },
    ...
  }
}
```

Где `[1]..[3]` — minX, minY, minZ, `[4]..[6]` — maxX, maxY, maxZ. Лимит — 256 форм на модель.

## Запуск

```bash
npm install
npm run dev
```

Открой в браузере указанный адрес (обычно http://localhost:5173).

## Сборка

```bash
npm run build
```

Результат в папке `dist/`.

## Реальные текстуры Minecraft

Порядок загрузки текстур:

1. **Локально** — `public/textures/{имя}.png` (например `planks_oak.png`). Если файл есть, он используется.
2. **По ссылке** — если локального файла нет, редактор подгружает ванильные текстуры с [f0x.me (OpenComputers 3D Designer, Vanilla blocks)](https://f0x.me/OpenComputers-3D-Designer/img/resourcepacks/Vanilla/blocks/). Скачивать ничего не нужно — текстуры запрашиваются по URL.
3. **Fallback** — если и локально, и по ссылке загрузить не удалось (нет сети, CORS и т.п.), показывается цвет по имени текстуры.

Чтобы всегда использовать только свои файлы (без обращения к f0x.me), положи нужные PNG в `public/textures/` с именами из списка: `planks_oak.png`, `cobblestone_mossy.png`, `wool_colored_white.png` и т.д.

**Откуда взять текстуры:**

В папке `.minecraft/assets/` лежит только кэш лаунчера: в `objects/` файлы хранятся под **хешированными** именами, не под человекочитаемыми. Текстуры блоков по именам (`planks_oak.png` и т.п.) там не ищи — их там нет в таком виде.

**Вариант 1 — из jar версии игры**

Текстуры по нормальным именам лежат **внутри jar файла версии**:

1. Открой папку установки Minecraft (лаунчер): обычно `%appdata%\.minecraft` (Windows) или `~/Library/Application Support/minecraft` (macOS) / `~/.minecraft` (Linux).
2. Зайди в `versions/` и выбери папку версии, например `1.21.1`.
3. Внутри неё есть файл `1.21.1.jar` (имя совпадает с версией). **Это обычный zip-архив** — открой его архиватором (7-Zip, WinRAR, или переименуй в `.zip`).
4. Внутри jar: `assets/minecraft/textures/block/` — там все блоки с именами вроде `planks_oak.png`, `cobblestone_mossy.png`. Скопируй нужные PNG в `public/textures/` проекта.

**Вариант 2 — скачать готовые ассеты**

- **[mcasset.cloud](https://mcasset.cloud/latest)** — браузер ассетов Minecraft по версии (latest, 1.20, 1.21 и т.д.). Зайди в `assets` → `minecraft` → `textures` → `block` — можно открыть/скачать файлы или папку.
- **GitHub [InventivetalentDev/minecraft-assets](https://github.com/InventivetalentDev/minecraft-assets)** — распакованные ассеты по веткам версий. Выбери ветку (например `1.21.1`), в репозитории путь `assets/minecraft/textures/block/`. Можно скачать папку через «Download folder» или клонировать репозиторий и скопировать `assets/minecraft/textures/block/*.png` в `public/textures/`.

Текстуры по умолчанию — собственность Mojang; в репозиторий их не кладём. Копируешь их локально — редактор подхватывает из `public/textures/`.

## Стек

- **Vite** + **React** + **TypeScript**
- **Three.js** + **@react-three/fiber** + **@react-three/drei** для 3D сцены
