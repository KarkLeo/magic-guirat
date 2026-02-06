,l# Sprint 4+ Backlog - Magic Guitar Visual Overhaul

> **Общая цель:** Трансформация визуализатора в магический, космический опыт с богатыми анимациями

---

## 📊 Обзор Спринтов

| Sprint | Фокус | Сложность | Приоритет |
|--------|-------|-----------|-----------|
| Sprint 4 | Фундамент (шейдеры, post-processing) | Высокая | Критичный |
| Sprint 5 | Улучшенные струны + Ghost Trails | Высокая | Критичный |
| Sprint 6 | Фоновые эффекты (частицы, туманность) | Средняя | Высокий |
| Sprint 7 | Спектр с эффектами | Средняя | Высокий |
| Sprint 8 | UI рефреш + дополнительные анимации | Низкая | Средний |
| Sprint 9 | Performance оптимизация | Средняя | Высокий |

**Общая длительность:** 6-8 недель (при работе 2-3 дня/неделю)

---

## 🎯 Sprint 4: Шейдерный Фундамент
**Цель:** Настроить Three.js post-processing pipeline и базовые шейдеры

**Длительность:** 4-6 дней

### Задачи

#### S4-T1: Setup Post-Processing Pipeline
**Priority:** P0 (блокер)
**Estimate:** 2-3 часа
**Description:**
- Установить зависимости: `npm install three postprocessing`
- Настроить `EffectComposer` в `GuitarStringsVisualization.vue`
- Добавить `RenderPass` (базовый)
- Добавить `UnrealBloomPass` с начальными параметрами
- Проверить, что existing сцена рендерится через composer

**Acceptance Criteria:**
- [ ] Composer создается и работает
- [ ] Bloom эффект применяется ко всей сцене
- [ ] Нет регрессий в текущей визуализации
- [ ] FPS остается ≥ 60

**Files:**
- `src/components/GuitarStringsVisualization.vue`

---

#### S4-T2: Базовый Vertex Shader для Струн
**Priority:** P0
**Estimate:** 3-4 часа
**Description:**
Создать vertex shader для волнообразной деформации струн

**Implementation:**
```glsl
// src/shaders/stringVertex.glsl
uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uDamping;

varying vec2 vUv;

void main() {
  vUv = uv;

  vec3 pos = position;

  // Волнообразное смещение
  float wave = uAmplitude * sin(pos.x * uFrequency + uTime * 3.0);

  // Затухание
  float decay = exp(-uDamping * (uTime - uAttackTime));

  pos.y += wave * decay;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

**Acceptance Criteria:**
- [ ] Shader компилируется без ошибок
- [ ] Uniforms обновляются из Vue component
- [ ] Видимая волнообразная анимация струны
- [ ] Затухание работает корректно

**Files:**
- `src/shaders/stringVertex.glsl` (new)
- `src/shaders/stringFragment.glsl` (new)
- `src/components/GuitarStringsVisualization.vue`

---

#### S4-T3: Fragment Shader для Градиентов Струн
**Priority:** P1
**Estimate:** 2 часа
**Description:**
Shader для gradient цвета струны с glow эффектом

```glsl
// src/shaders/stringFragment.glsl
uniform vec3 uColorStart;
uniform vec3 uColorEnd;
uniform float uGlowIntensity;

varying vec2 vUv;

void main() {
  // Градиент по длине струны
  vec3 color = mix(uColorStart, uColorEnd, vUv.x);

  // Glow (будет усилен bloom pass)
  float glow = uGlowIntensity;

  gl_FragColor = vec4(color * glow, 1.0);
}
```

**Acceptance Criteria:**
- [ ] Градиент отображается корректно
- [ ] Цвета из дизайн-спеки
- [ ] Glow работает с BloomPass

**Files:**
- `src/shaders/stringFragment.glsl`

---

#### S4-T4: Цветовая Палитра (Constants)
**Priority:** P1
**Estimate:** 1 час
**Description:**
Создать файл с константами цветов из дизайн-спеки

```typescript
// src/constants/colors.ts
export const COLORS = {
  background: {
    deepPurple: '#1a0033',
    darkBlue: '#0a192f',
    darkest: '#020617',
  },
  strings: {
    indigo: '#6366f1',
    purple: '#8b5cf6',
    pink: '#ec4899',
  },
  spectrum: {
    cyan: '#06b6d4',
    amber: '#f59e0b',
  },
  particles: {
    white: '#ffffff',
    cyan: '#06b6d4',
    pink: '#ec4899',
  }
} as const;

export const GRADIENTS = {
  background: ['#1a0033', '#0a192f', '#020617'],
  string: ['#6366f1', '#8b5cf6', '#ec4899'],
  spectrum: ['#06b6d4', '#6366f1', '#ec4899', '#f59e0b'],
} as const;
```

**Acceptance Criteria:**
- [ ] Все цвета из дизайн-спеки
- [ ] TypeScript типизация
- [ ] Используется в компонентах

**Files:**
- `src/constants/colors.ts` (new)

---

#### S4-T5: Bloom Pass Настройка
**Priority:** P1
**Estimate:** 2 часа
**Description:**
Fine-tune параметров UnrealBloomPass для магического свечения

**Parameters to tune:**
- `strength`: 1.5 - 2.0
- `radius`: 0.8 - 1.0
- `threshold`: 0.1 - 0.3

**Добавить в Settings:**
- Слайдер "Bloom Intensity" (0.5 - 3.0)

**Acceptance Criteria:**
- [ ] Bloom выглядит магически, не чрезмерно
- [ ] Параметр в настройках работает
- [ ] Сохраняется в localStorage

**Files:**
- `src/components/GuitarStringsVisualization.vue`
- `src/composables/useSettings.js`
- `src/components/SettingsPanel.vue`

---

### Sprint 4 Definition of Done
- [ ] Post-processing pipeline работает
- [ ] Bloom эффект применяется
- [ ] Базовые шейдеры для струн работают
- [ ] Цветовая палитра настроена
- [ ] Нет регрессий в существующем функционале
- [ ] Performance: 60 FPS

---

## 🎨 Sprint 5: Enhanced Strings + Ghost Trails
**Цель:** Реализовать продвинутую анимацию струн с эффектом "призраков"

**Длительность:** 5-7 дней

### Задачи

#### S5-T1: Физика Колебаний Струн
**Priority:** P0
**Estimate:** 4 часа
**Description:**
Улучшить vertex shader для реалистичного колебания

**Physics model:**
```glsl
// Более сложная модель колебаний
float wave1 = sin(pos.x * uFrequency + uTime * uSpeed);
float wave2 = sin(pos.x * uFrequency * 2.0 + uTime * uSpeed * 1.5) * 0.3; // гармоника
float wave3 = sin(pos.x * uFrequency * 3.0 + uTime * uSpeed * 2.0) * 0.15;

float combinedWave = wave1 + wave2 + wave3;
float envelope = uAmplitude * exp(-uDamping * uTimeSinceAttack);

pos.y += combinedWave * envelope;
```

**Mapping audio → physics:**
- `uFrequency`: от detected pitch (0.5 - 3.0)
- `uAmplitude`: от intensity струны (0 - 30px)
- `uDamping`: константа (1.0 - 1.5)
- `uSpeed`: зависит от tempo (опционально)

**Acceptance Criteria:**
- [ ] Колебания выглядят естественно
- [ ] Разные струны с разными параметрами
- [ ] Плавное затухание
- [ ] Attack → sustain → release фазы

**Files:**
- `src/shaders/stringVertex.glsl`
- `src/components/GuitarStringsVisualization.vue`

---

#### S5-T2: FBO Setup для Ghost Trails
**Priority:** P0
**Estimate:** 4-5 часов
**Description:**
Настроить Frame Buffer Object для accumulation эффекта

**Approach:**
1. Создать два WebGLRenderTarget (ping-pong)
2. Рендерить струны в FBO с накоплением
3. Добавить fade-out шейдер

```javascript
// В GuitarStringsVisualization.vue
const fboScene = new THREE.Scene();
const fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderTargetA = new THREE.WebGLRenderTarget(width, height);
const renderTargetB = new THREE.WebGLRenderTarget(width, height);

// В animation loop
renderer.setRenderTarget(renderTargetA);
renderer.render(fboScene, fboCamera);

// Swap targets
[renderTargetA, renderTargetB] = [renderTargetB, renderTargetA];
```

**Acceptance Criteria:**
- [ ] FBO создается без ошибок
- [ ] Ping-pong buffer работает
- [ ] Нет утечек памяти
- [ ] Performance приемлемый

**Files:**
- `src/components/GuitarStringsVisualization.vue`
- `src/shaders/trailAccumulation.glsl` (new)

---

#### S5-T3: Ghost Trail Shader
**Priority:** P0
**Estimate:** 3-4 часа
**Description:**
Shader для эффекта призраков с экспоненциальным затуханием

```glsl
// src/shaders/ghostTrail.glsl
uniform sampler2D tDiffuse;
uniform sampler2D tPrevious;
uniform float uFadeSpeed;
uniform float uBlurAmount;

varying vec2 vUv;

void main() {
  vec4 current = texture2D(tDiffuse, vUv);
  vec4 previous = texture2D(tPrevious, vUv);

  // Экспоненциальное затухание
  vec4 accumulated = mix(current, previous, 0.9);
  accumulated.rgb *= (1.0 - uFadeSpeed);

  // Легкое размытие для "дымного" эффекта
  vec4 blurred = accumulated; // TODO: box blur

  gl_FragColor = blurred;
}
```

**Effects to implement:**
- Fade out: 0.05 - 0.1 per frame
- Slight blur: 1-2px
- Upward drift: смещение UV на +0.001 по Y

**Acceptance Criteria:**
- [ ] Призраки видны за активными струнами
- [ ] Плавное затухание (2-3 секунды)
- [ ] Дымный эффект (drift вверх)
- [ ] Настраиваемая интенсивность

**Files:**
- `src/shaders/ghostTrail.glsl` (new)
- `src/components/GuitarStringsVisualization.vue`

---

#### S5-T4: Multi-String Support для Ghost
**Priority:** P1
**Estimate:** 2 часа
**Description:**
Поддержка нескольких струн одновременно в ghost system

**Changes:**
- Все 6 струн рендерятся в один FBO
- Каждая струна со своим цветом → blend в FBO
- Независимые amplitude для каждой

**Acceptance Criteria:**
- [ ] Chord mode: все активные струны оставляют следы
- [ ] Цвета струн сохраняются в призраках
- [ ] Нет артефактов при наложении

**Files:**
- `src/components/GuitarStringsVisualization.vue`

---

#### S5-T5: Settings для Ghost Trails
**Priority:** P2
**Estimate:** 1.5 часа
**Description:**
Добавить контролы в SettingsPanel

**New settings:**
- `ghostOpacity`: 0.0 - 1.0 (default: 0.7)
- `ghostFadeSpeed`: 0.01 - 0.2 (default: 0.05)
- `ghostBlur`: 0 - 5 (default: 2)

**Acceptance Criteria:**
- [ ] Слайдеры в UI
- [ ] Real-time обновление эффекта
- [ ] Сохранение в localStorage

**Files:**
- `src/composables/useSettings.js`
- `src/components/SettingsPanel.vue`

---

### Sprint 5 Definition of Done
- [ ] Струны колеблются реалистично
- [ ] Ghost trails работают
- [ ] Дымный эффект присутствует
- [ ] Multi-string поддержка
- [ ] Настройки интенсивности
- [ ] Performance: ≥55 FPS (допустимо небольшое снижение)

---

## 🌌 Sprint 6: Background Effects
**Цель:** Создать космическую атмосферу с частицами и туманностями

**Длительность:** 4-5 дней

### Задачи

#### S6-T1: Background Layer Component
**Priority:** P0
**Estimate:** 2 часа
**Description:**
Создать новый компонент для фоновых эффектов

```typescript
// src/components/BackgroundLayer.vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

const canvasRef = ref<HTMLCanvasElement>();
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

// Layers:
// 1. Base gradient (CSS или Three.js plane)
// 2. Nebula spheres
// 3. Particles
// 4. Grid lines
</script>

<template>
  <div class="background-layer">
    <canvas ref="canvasRef" />
  </div>
</template>
```

**Acceptance Criteria:**
- [ ] Компонент создан и интегрирован
- [ ] Собственный Three.js renderer
- [ ] Z-index: -1 (за струнами)
- [ ] Responsive к размеру окна

**Files:**
- `src/components/BackgroundLayer.vue` (new)
- `src/components/AudioAnalyzerView.vue` (integration)

---

#### S6-T2: Particle System - Stars
**Priority:** P0
**Estimate:** 3-4 часа
**Description:**
Система частиц для космической пыли

**Implementation:**
```javascript
// Создание частиц
const particleCount = 300;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const sizes = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 100;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

  // Random color: white, cyan, pink
  const colorChoice = Math.random();
  if (colorChoice < 0.7) {
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 1.0; // white
  } else if (colorChoice < 0.85) {
    // cyan
  } else {
    // pink
  }

  sizes[i] = Math.random() * 3 + 1;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

// Shader для частиц с мерцанием
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: particleVertexShader,
  fragmentShader: particleFragmentShader,
  transparent: true,
  depthWrite: false,
});
```

**Vertex Shader:**
```glsl
// src/shaders/particleVertex.glsl
attribute float size;
varying vec3 vColor;
uniform float uTime;

void main() {
  vColor = color;

  // Parallax movement
  vec3 pos = position;
  pos.x += sin(uTime * 0.1 + position.y) * 0.5;
  pos.y += cos(uTime * 0.15 + position.x) * 0.3;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
```

**Fragment Shader:**
```glsl
// src/shaders/particleFragment.glsl
varying vec3 vColor;
uniform float uTime;

void main() {
  // Circular shape
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;

  // Twinkle effect
  float twinkle = sin(uTime * 2.0 + gl_FragCoord.x * 0.1) * 0.3 + 0.7;

  float alpha = (1.0 - dist * 2.0) * twinkle;

  gl_FragColor = vec4(vColor, alpha);
}
```

**Acceptance Criteria:**
- [ ] 200-300 частиц на сцене
- [ ] Плавное движение (parallax)
- [ ] Мерцание
- [ ] Цвета из палитры
- [ ] Performance не падает

**Files:**
- `src/components/BackgroundLayer.vue`
- `src/shaders/particleVertex.glsl` (new)
- `src/shaders/particleFragment.glsl` (new)

---

#### S6-T3: Nebula Effect
**Priority:** P1
**Estimate:** 3 часа
**Description:**
Размытые сферы для эффекта туманности

**Implementation:**
```javascript
// 3-5 больших сфер
const nebulae = [];
for (let i = 0; i < 4; i++) {
  const geometry = new THREE.SphereGeometry(20, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: nebulaColors[i], // purple, blue, pink
    transparent: true,
    opacity: 0.1,
  });
  const sphere = new THREE.Mesh(geometry, material);

  sphere.position.set(
    (Math.random() - 0.5) * 80,
    (Math.random() - 0.5) * 60,
    -30 - Math.random() * 20
  );

  nebulae.push(sphere);
  scene.add(sphere);
}

// Animation: breathing effect
function animateNebulae(time) {
  nebulae.forEach((nebula, i) => {
    const scale = 1.0 + Math.sin(time * 0.0001 + i) * 0.05;
    nebula.scale.setScalar(scale);

    // Медленное движение
    nebula.position.x += Math.sin(time * 0.0002 + i) * 0.01;
    nebula.position.y += Math.cos(time * 0.0003 + i) * 0.01;
  });
}
```

**Post-processing:**
- Применить сильный blur (100px) через custom shader pass

**Acceptance Criteria:**
- [ ] 3-5 туманностей на сцене
- [ ] Сильное размытие
- [ ] Медленное движение + breathing
- [ ] Очень низкая opacity (0.05-0.15)

**Files:**
- `src/components/BackgroundLayer.vue`
- `src/shaders/nebulaBlur.glsl` (new)

---

#### S6-T4: Geometric Grid Lines
**Priority:** P2
**Estimate:** 2 часа
**Description:**
Декоративные геометрические линии

**Implementation:**
- Диагональные линии или разреженная сетка
- Opacity: 0.1
- Статичные (без анимации)

**Acceptance Criteria:**
- [ ] Линии видны но ненавязчивы
- [ ] Соответствуют референсам

**Files:**
- `src/components/BackgroundLayer.vue`

---

#### S6-T5: Audio Reactivity для Фона
**Priority:** P1
**Estimate:** 2 часа
**Description:**
Связать фоновые эффекты с RMS аудио

**Reactions:**
- Nebulae opacity: увеличивается на 20% при loud sounds
- Particles: ускорение движения при peaks
- Gradient: subtle brightness pulse

**Data flow:**
- `AudioAnalyzerView` → prop `rmsLevel` → `BackgroundLayer`

**Acceptance Criteria:**
- [ ] Фон реагирует на громкость
- [ ] Реакция subtle, не отвлекает
- [ ] Smooth interpolation

**Files:**
- `src/components/BackgroundLayer.vue`
- `src/components/AudioAnalyzerView.vue`

---

### Sprint 6 Definition of Done
- [ ] BackgroundLayer компонент работает
- [ ] Частицы анимированы
- [ ] Туманности с blur эффектом
- [ ] Геометрические элементы
- [ ] Audio reactivity настроен
- [ ] Performance: ≥55 FPS

---

## 📊 Sprint 7: Advanced Spectrum Visualizer
**Цель:** Плавный, растворяющийся спектр вместо столбиков

**Длительность:** 3-4 дня

### Задачи

#### S7-T1: Continuous Spectrum Geometry
**Priority:** P0
**Estimate:** 3 часа
**Description:**
Заменить дискретные столбики на непрерывную кривую

**Current:** Canvas-based bars
**New:** Three.js BufferGeometry с динамическими вершинами

**Implementation:**
```javascript
// src/components/SpectrumVisualizer3D.vue (new)
const pointsCount = 256;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(pointsCount * 3);

// Создание начальных позиций
for (let i = 0; i < pointsCount; i++) {
  const x = (i / pointsCount) * width - width / 2;
  positions[i * 3] = x;
  positions[i * 3 + 1] = 0;
  positions[i * 3 + 2] = 0;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

// Update в animation loop
function updateSpectrum(frequencyData) {
  const positions = geometry.attributes.position.array;

  for (let i = 0; i < pointsCount; i++) {
    const frequency = frequencyData[i] / 255.0;

    // Lerp для плавности
    const targetY = frequency * maxHeight;
    const currentY = positions[i * 3 + 1];
    positions[i * 3 + 1] = THREE.MathUtils.lerp(currentY, targetY, 0.3);
  }

  geometry.attributes.position.needsUpdate = true;
}
```

**Line smoothing:**
- Использовать Catmull-Rom spline для интерполяции
- Или кастомный shader с smoothstep

**Acceptance Criteria:**
- [ ] Плавный контур вместо столбиков
- [ ] Real-time обновление
- [ ] Smooth transitions

**Files:**
- `src/components/SpectrumVisualizer3D.vue` (new, заменяет FrequencySpectrumVisualizer)

---

#### S7-T2: Gradient Fade Shader
**Priority:** P0
**Estimate:** 2-3 часа
**Description:**
Shader для вертикального и горизонтального растворения

```glsl
// src/shaders/spectrumFragment.glsl
uniform vec3 uColorStart;
uniform vec3 uColorEnd;
uniform float uDominantFreq;

varying vec2 vUv;
varying float vAmplitude;

void main() {
  // Horizontal gradient (циан → индиго → розовый → янтарь)
  vec3 color = mix(uColorStart, uColorEnd, vUv.x);

  // Вертикальный fade (снизу вверх)
  float verticalFade = smoothstep(0.0, 1.0, vUv.y);

  // Горизонтальный fade (от центра к краям)
  float distFromCenter = abs(vUv.x - 0.5) * 2.0;
  float horizontalFade = 1.0 - smoothstep(0.7, 1.0, distFromCenter);

  float alpha = verticalFade * horizontalFade * 0.8;

  gl_FragColor = vec4(color, alpha);
}
```

**Acceptance Criteria:**
- [ ] Плавное растворение к краям
- [ ] Вертикальное растворение работает
- [ ] Градиент цветов корректный

**Files:**
- `src/shaders/spectrumFragment.glsl` (new)
- `src/components/SpectrumVisualizer3D.vue`

---

#### S7-T3: Dynamic Color Shift
**Priority:** P1
**Estimate:** 2 часа
**Description:**
Смещение градиента на основе dominant frequency

**Logic:**
```javascript
// Определение доминирующей частоты
function getDominantFrequency(frequencyData) {
  let maxIndex = 0;
  let maxValue = 0;

  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > maxValue) {
      maxValue = frequencyData[i];
      maxIndex = i;
    }
  }

  return maxIndex / frequencyData.length; // 0.0 - 1.0
}

// Передать в shader
material.uniforms.uDominantFreq.value = dominantFreq;
```

**Shader adjustment:**
```glsl
// Сдвиг градиента
float gradientPos = vUv.x + (uDominantFreq - 0.5) * 0.3;
gradientPos = clamp(gradientPos, 0.0, 1.0);
vec3 color = mix(uColorStart, uColorEnd, gradientPos);
```

**Acceptance Criteria:**
- [ ] Gradient сдвигается при изменении частоты
- [ ] Smooth interpolation
- [ ] Визуально приятно

**Files:**
- `src/components/SpectrumVisualizer3D.vue`
- `src/shaders/spectrumFragment.glsl`

---

#### S7-T4: Secondary Wave Animation
**Priority:** P2
**Estimate:** 2 часа
**Description:**
Добавить вторичные "волны" на спектре

**Concept:**
- Помимо основной амплитуды, добавить медленные волны
- Sine wave movement вдоль X-оси

```javascript
// В update loop
const secondaryWave = Math.sin(time * 0.001 + (i / pointsCount) * Math.PI * 2) * 5;
positions[i * 3 + 1] += secondaryWave;
```

**Acceptance Criteria:**
- [ ] Едва заметные вторичные волны
- [ ] Не мешают основной визуализации
- [ ] Добавляют "живости"

**Files:**
- `src/components/SpectrumVisualizer3D.vue`

---

#### S7-T5: Integration в Main Layout
**Priority:** P0
**Estimate:** 1 час
**Description:**
Заменить старый FrequencySpectrumVisualizer на новый 3D компонент

**Changes:**
- `AudioAnalyzerView.vue`: замена компонента
- Проверка z-index layers
- Responsive позиционирование

**Acceptance Criteria:**
- [ ] Новый спектр на нужном месте
- [ ] Не перекрывает струны
- [ ] Responsive

**Files:**
- `src/components/AudioAnalyzerView.vue`

---

### Sprint 7 Definition of Done
- [ ] Новый 3D спектр работает
- [ ] Плавное растворение к краям
- [ ] Градиент с динамическим сдвигом
- [ ] Вторичные волны (опционально)
- [ ] Интеграция в layout
- [ ] Performance: ≥55 FPS

---

## 🎨 Sprint 8: UI Refresh & Extra Animations
**Цель:** Обновить UI элементы под новый стиль, добавить particle bursts

**Длительность:** 3-4 дня

### Задачи

#### S8-T1: Header Redesign
**Priority:** P1
**Estimate:** 2 часа
**Description:**
Обновить стиль заголовка "Magic Guitar"

**New styling:**
```css
.magic-guitar-title {
  font-family: 'Space Mono', monospace; /* или аналогичный */
  font-size: 2.5rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;

  background: linear-gradient(90deg, #ec4899, #f59e0b);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;

  filter: drop-shadow(0 0 20px rgba(236, 72, 153, 0.5));

  animation: titlePulse 3s ease-in-out infinite;
}

@keyframes titlePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
```

**Audio reactivity:**
- Scale пульсация по RMS (0.98 - 1.02)
- Glow intensity по RMS

**Acceptance Criteria:**
- [ ] Gradient text
- [ ] Glow эффект
- [ ] Пульсация в такт

**Files:**
- `src/components/AudioAnalyzerView.vue`
- `src/assets/styles/typography.css` (new)

---

#### S8-T2: Chord Display Enhancement
**Priority:** P1
**Estimate:** 2 часа
**Description:**
Улучшить анимацию появления аккорда

**Current:** простой fade
**New:** fade + scale + glow pulse

```javascript
// src/components/ChordNameDisplay.vue
const showChord = (chordName) => {
  gsap.fromTo(
    chordElement,
    {
      scale: 0.8,
      opacity: 0,
      filter: 'drop-shadow(0 0 0px rgba(236, 72, 153, 0))',
    },
    {
      scale: 1.0,
      opacity: 1,
      filter: 'drop-shadow(0 0 30px rgba(236, 72, 153, 0.8))',
      duration: 0.4,
      ease: 'back.out(1.7)',
    }
  );
};
```

**Acceptance Criteria:**
- [ ] Bounce-in анимация
- [ ] Strong glow при появлении
- [ ] Плавное исчезновение

**Files:**
- `src/components/ChordNameDisplay.vue`

---

#### S8-T3: Particle Burst на Attack
**Priority:** P1
**Estimate:** 3-4 часа
**Description:**
Particle burst при резком ударе по струне

**Trigger detection:**
```javascript
// В GuitarStringsVisualization
let previousIntensity = 0;

function detectAttack(currentIntensity) {
  const delta = currentIntensity - previousIntensity;
  const isAttack = delta > ATTACK_THRESHOLD; // например, 30

  if (isAttack) {
    spawnParticleBurst(stringIndex);
  }

  previousIntensity = currentIntensity;
}
```

**Particle system:**
```javascript
function spawnParticleBurst(stringIndex) {
  const stringPosition = getStringPosition(stringIndex);
  const particleCount = 25;

  for (let i = 0; i < particleCount; i++) {
    const particle = {
      x: stringPosition.x + randomRange(-10, 10),
      y: stringPosition.y,
      vx: randomRange(-5, 5),
      vy: randomRange(-8, -2),
      gravity: 0.3,
      lifetime: 1.0, // seconds
      color: stringColors[stringIndex],
      size: randomRange(2, 6),
    };

    particles.push(particle);
  }
}

// Update particles
function updateParticles(deltaTime) {
  particles.forEach((p, i) => {
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    p.vy += p.gravity;

    p.lifetime -= deltaTime;

    if (p.lifetime <= 0) {
      particles.splice(i, 1);
    }
  });
}
```

**Rendering:**
- THREE.Points с BufferGeometry
- Fade out по lifetime
- Additive blending

**Acceptance Criteria:**
- [ ] Burst триггерится при attack
- [ ] Частицы разлетаются радиально
- [ ] Gravity работает
- [ ] Fade out плавный
- [ ] Цвет = цвет струны

**Files:**
- `src/components/GuitarStringsVisualization.vue`
- `src/utils/particleBurst.ts` (new)

---

#### S8-T4: Settings Icon Animation
**Priority:** P2
**Estimate:** 1 час
**Description:**
Анимация иконки настроек

```css
.settings-icon {
  transition: transform 0.3s ease, filter 0.3s ease;
}

.settings-icon:hover {
  transform: rotate(90deg);
  filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.8));
}
```

**Acceptance Criteria:**
- [ ] Rotate on hover
- [ ] Glow эффект

**Files:**
- `src/components/SettingsPanel.vue`

---

#### S8-T5: Ripple Effect на Bass Hits
**Priority:** P2 (nice-to-have)
**Estimate:** 3 часа
**Description:**
Circular ripple на фоне при сильных басах

**Trigger:**
```javascript
// Detect bass hit
const bassLevel = frequencyData.slice(0, 10).reduce((a, b) => a + b) / 10;
if (bassLevel > BASS_THRESHOLD && !recentRipple) {
  createRipple();
  recentRipple = true;
  setTimeout(() => recentRipple = false, 500);
}
```

**Ripple shader:**
```glsl
// Distortion shader
uniform float uRippleTime;
uniform vec2 uRippleCenter;
uniform float uRippleRadius;

void main() {
  vec2 toCenter = vUv - uRippleCenter;
  float dist = length(toCenter);

  float ripple = sin(dist * 20.0 - uRippleTime * 5.0) * 0.02;
  float envelope = smoothstep(uRippleRadius, uRippleRadius - 0.1, dist);

  vec2 distortedUv = vUv + normalize(toCenter) * ripple * envelope;

  gl_FragColor = texture2D(tDiffuse, distortedUv);
}
```

**Acceptance Criteria:**
- [ ] Ripple на bass hits
- [ ] Smooth expansion
- [ ] Не слишком отвлекает

**Files:**
- `src/components/BackgroundLayer.vue`
- `src/shaders/ripple.glsl` (new)

---

### Sprint 8 Definition of Done
- [ ] Header с новым стилем
- [ ] Chord display улучшен
- [ ] Particle bursts работают
- [ ] Settings icon анимирован
- [ ] Ripple эффект (опционально)
- [ ] Performance: ≥55 FPS

---

## ⚡ Sprint 9: Performance Optimization
**Цель:** Оптимизация производительности, достижение стабильных 60 FPS

**Длительность:** 3-4 дня

### Задачи

#### S9-T1: Performance Profiling
**Priority:** P0
**Estimate:** 2 часа
**Description:**
Провести профилирование и выявить bottlenecks

**Tools:**
- Chrome DevTools Performance tab
- Three.js stats.js
- WebGL Inspector

**Metrics to track:**
- FPS
- Frame time
- Draw calls
- Triangles count
- Shader compilation time

**Acceptance Criteria:**
- [ ] Профиль создан
- [ ] Bottlenecks выявлены
- [ ] Документация узких мест

---

#### S9-T2: Geometry Optimization
**Priority:** P1
**Estimate:** 3 часа
**Description:**
Оптимизация геометрии

**Optimizations:**
- Reduce vertex count где возможно
- Use BufferGeometry вместо Geometry (уже делается)
- Merge static geometries
- Use instancing для частиц

**Acceptance Criteria:**
- [ ] Vertex count снижен на 20-30%
- [ ] Draw calls снижены

---

#### S9-T3: Shader Optimization
**Priority:** P1
**Estimate:** 2-3 часа
**Description:**
Оптимизация шейдеров

**Techniques:**
- Minimize branching (if statements)
- Pre-compute uniforms где возможно
- Use lower precision где допустимо (mediump вместо highp)
- Reduce texture lookups

**Acceptance Criteria:**
- [ ] Shader compilation time снижен
- [ ] Frame time улучшен

---

#### S9-T4: FBO/Texture Optimization
**Priority:** P1
**Estimate:** 2 часа
**Description:**
Оптимизация render targets

**Optimizations:**
- Reduce FBO resolution если возможно (половинное разрешение для blur effects)
- Dispose старых textures
- Use texture pooling

**Acceptance Criteria:**
- [ ] Memory usage снижен
- [ ] No memory leaks

---

#### S9-T5: Adaptive Quality Settings
**Priority:** P2
**Estimate:** 3 часа
**Description:**
Автоматическая адаптация качества под производительность

**Implementation:**
```javascript
const performanceMonitor = {
  fpsHistory: [],

  update(fps) {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();

    const avgFps = this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length;

    if (avgFps < 50) {
      this.reduceQuality();
    } else if (avgFps > 58 && this.qualityLevel < MAX_QUALITY) {
      this.increaseQuality();
    }
  },

  reduceQuality() {
    // Reduce particle count
    // Reduce FBO resolution
    // Disable some effects
  },

  increaseQuality() {
    // Opposite
  }
};
```

**Acceptance Criteria:**
- [ ] Auto-adjust работает
- [ ] Quality changes не заметны визуально
- [ ] FPS стабилизируется

---

#### S9-T6: Settings: Quality Presets
**Priority:** P2
**Estimate:** 2 часа
**Description:**
Presets качества в настройках

**Presets:**
- **Low:** minimal particles, no ghost trails, reduced bloom
- **Medium:** balanced
- **High:** все эффекты
- **Auto:** adaptive

**Acceptance Criteria:**
- [ ] Presets в UI
- [ ] Switching работает
- [ ] Сохранение в localStorage

**Files:**
- `src/composables/useSettings.js`
- `src/components/SettingsPanel.vue`

---

### Sprint 9 Definition of Done
- [ ] Профилирование выполнено
- [ ] Geometries оптимизированы
- [ ] Shaders оптимизированы
- [ ] FBO/Textures оптимизированы
- [ ] Adaptive quality работает
- [ ] Quality presets доступны
- [ ] Performance: стабильные 60 FPS на Medium preset

---

## 📝 Общие Требования ко Всем Спринтам

### Code Quality
- [ ] TypeScript строгая типизация
- [ ] ESLint без warnings
- [ ] Комментарии к сложным шейдерам
- [ ] Cleanup в onUnmounted

### Testing
- [ ] Визуальное тестирование на каждом этапе
- [ ] Тестирование на разных разрешениях
- [ ] Проверка производительности

### Documentation
- [ ] Обновление MEMORY.md
- [ ] Комментарии к новым техникам
- [ ] Shader documentations

### Git
- [ ] Коммиты после каждой задачи
- [ ] Meaningful commit messages
- [ ] Branch per sprint (опционально)

---

## 🎯 Success Metrics

### Visual Quality
- Соответствие дизайн-спеке: 95%+
- Референсное сходство: субъективно, но близко к визуальным референсам

### Performance
- **Desktop:** 60 FPS stable
- **Laptop:** 55+ FPS
- **Low-end:** 45+ FPS with Auto quality

### User Experience
- Smooth transitions
- Настройки интуитивны
- Не отвлекает от игры

---

## 📅 Estimated Timeline

| Sprint | Weeks | Cumulative |
|--------|-------|------------|
| Sprint 4 | 1 | 1 week |
| Sprint 5 | 1.5 | 2.5 weeks |
| Sprint 6 | 1 | 3.5 weeks |
| Sprint 7 | 1 | 4.5 weeks |
| Sprint 8 | 1 | 5.5 weeks |
| Sprint 9 | 1 | 6.5 weeks |

**Total:** 6-8 недель при работе 10-15 часов/неделю

---

## 🚀 Next Steps

1. **Review** этого бэклога
2. **Prioritize** задачи внутри спринтов
3. **Start Sprint 4** с setup post-processing
4. **Iterate** по результатам каждого спринта
