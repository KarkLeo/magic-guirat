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
- **Web Audio API** (native) - захват микрофона, AnalyserNode, визуализация спектра
- **YIN autocorrelation** - pitch detection на time-domain данных (реализован в useFrequencyAnalyzer.js)
- **Essentia.js v0.1.3** - установлен но отключён (проблемы с загрузкой WASM), может использоваться в Sprint 2

**Текущий подход:** YIN на time-domain данных (getFloatTimeDomainData) + FFT спектр для визуализации (getByteFrequencyData)

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
