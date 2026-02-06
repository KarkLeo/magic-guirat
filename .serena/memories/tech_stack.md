# Tech Stack

## Frontend Framework

- **Vue 3** - Latest version (3.5.27)
- **Composition API** - используем `<script setup>` синтаксис
- **SFC (Single File Components)** - `.vue` файлы

## Build Tool

- **Vite** - v7.3.1 для быстрой разработки
- **vite-plugin-vue-devtools** - для удобной разработки

## Установленные библиотеки

### Аудио:
- **Essentia.js v0.1.3** ✅ - полифоническое pitch detection, chord recognition, melody extraction (WebAssembly)
- **Web Audio API** (native) - захват микрофона, FFT анализ, визуализация спектра

**Решение:** Используем Essentia.js сразу для полного функционала (размер 2-3 MB не критичен)

### Визуализация:
- **Canvas 2D** / **Three.js** / **PixiJS** (выбор в процессе)
- **particles.js** или custom WebGL - для системы частиц

### Styling:
- **CSS3** - нативные стили с animations
- Возможно **SCSS** в будущем

## Node.js

- Требуется: `^20.19.0 || >=22.12.0`
- Package manager: **npm**

## Браузеры

- **Chrome/Chromium** - primary target
- **Firefox** - secondary
- **Safari** - если будет поддержка Web Audio API

Требуется поддержка:
- Web Audio API
- MediaStream API
- Canvas/WebGL
- ES modules
