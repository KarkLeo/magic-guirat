# Quick Start Guide - Sprint 4

> **Быстрый старт для начала работы над новым визуальным дизайном**

---

## 📋 Что Было Подготовлено

1. **visualDesignSpec.md** - полная спецификация визуального дизайна
2. **sprint4_backlog.md** - детальный бэклог на 6 спринтов
3. Этот гайд - для быстрого старта

---

## 🎯 Sprint 4: Первые Шаги

### Цель
Настроить Three.js post-processing и базовые шейдеры для струн

### Что Делать Сначала

#### 1. Установка Зависимостей (15 минут)
```bash
cd /Users/karkleo/Documents/pro/magic-guitar

# Установить post-processing библиотеку
npm install postprocessing

# Установить GSAP для анимаций (Sprint 8, но можно сразу)
npm install gsap
```

#### 2. Создать Структуру Папок (5 минут)
```bash
# Создать папку для шейдеров
mkdir -p src/shaders

# Создать папку для констант
mkdir -p src/constants

# Создать папку для утилит
mkdir -p src/utils
```

#### 3. Начать с S4-T1: Post-Processing Setup (2-3 часа)

**Файл:** `src/components/GuitarStringsVisualization.vue`

**Что добавить:**
```typescript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// В setup()
let composer: EffectComposer;

onMounted(() => {
  // После создания renderer и scene...

  // Setup composer
  composer = new EffectComposer(renderer);

  // Базовый render pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Bloom pass
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // strength
    0.4,  // radius
    0.85  // threshold
  );
  composer.addPass(bloomPass);
});

// В animation loop, заменить:
// renderer.render(scene, camera);
// На:
composer.render();
```

**Проверка:**
- Запустить `npm run dev`
- Открыть приложение
- Должно работать как раньше, но с легким bloom эффектом

---

## 📂 Структура Файлов После Sprint 4

```
src/
├── shaders/
│   ├── stringVertex.glsl       # [NEW] Vertex shader для струн
│   ├── stringFragment.glsl     # [NEW] Fragment shader для струн
│   └── README.md              # [NEW] Описание шейдеров
├── constants/
│   └── colors.ts              # [NEW] Цветовая палитра
├── components/
│   ├── GuitarStringsVisualization.vue  # [MODIFIED] + post-processing
│   ├── SettingsPanel.vue              # [MODIFIED] + bloom intensity
│   └── ...existing
├── composables/
│   ├── useSettings.js         # [MODIFIED] + bloom settings
│   └── ...existing
```

---

## 🎨 Ключевые Концепции

### 1. Post-Processing Pipeline
```
Scene → RenderPass → BloomPass → UnrealBloomPass → Screen
```

### 2. Шейдеры для Струн
- **Vertex Shader:** деформация геометрии (волны)
- **Fragment Shader:** цвета и градиенты

### 3. Цветовая Палитра
- Глубокий фиолетовый: `#1a0033`
- Индиго: `#6366f1`
- Розовый: `#ec4899`
- Циан: `#06b6d4`

### 4. Ghost Trails (Sprint 5)
- FBO (Frame Buffer Object)
- Ping-pong rendering
- Accumulation + fade shader

---

## 🚦 Чек-лист Sprint 4

### S4-T1: Post-Processing ✅
- [ ] Установлены зависимости
- [ ] EffectComposer создан
- [ ] RenderPass добавлен
- [ ] UnrealBloomPass добавлен
- [ ] Работает без ошибок

### S4-T2: String Vertex Shader
- [ ] Файл `stringVertex.glsl` создан
- [ ] Uniforms определены (uTime, uAmplitude, uFrequency)
- [ ] Волнообразная деформация работает
- [ ] Интегрирован в GuitarStringsVisualization

### S4-T3: String Fragment Shader
- [ ] Файл `stringFragment.glsl` создан
- [ ] Градиент работает
- [ ] Цвета из палитры

### S4-T4: Color Constants
- [ ] Файл `colors.ts` создан
- [ ] Все цвета из спеки
- [ ] TypeScript типы

### S4-T5: Bloom Настройка
- [ ] Параметры bloom настроены
- [ ] Слайдер в SettingsPanel
- [ ] Сохранение в localStorage

---

## 🐛 Возможные Проблемы

### 1. "Cannot find module 'postprocessing'"
**Решение:**
```bash
npm install postprocessing
```

### 2. Шейдер не компилируется
**Решение:**
- Проверить синтаксис GLSL
- Убедиться, что все uniforms объявлены
- Проверить консоль на ошибки WebGL

### 3. Performance падает
**Решение:**
- Уменьшить bloom strength/radius
- Проверить размер render target
- Отложить оптимизацию до Sprint 9

### 4. Bloom слишком сильный/слабый
**Решение:**
- Настроить параметры:
  - `strength`: 0.5 - 3.0
  - `threshold`: 0.0 - 1.0
  - `radius`: 0.0 - 1.0

---

## 📖 Ресурсы

### Документация
- [Three.js Post-Processing](https://threejs.org/docs/#examples/en/postprocessing/EffectComposer)
- [UnrealBloomPass](https://threejs.org/docs/#examples/en/postprocessing/UnrealBloomPass)
- [GLSL Shader Tutorial](https://thebookofshaders.com/)

### Референсы
- `.memory/visual reference/` - визуальные референсы
- `visualDesignSpec.md` - детальная спека

---

## 🎯 После Sprint 4

### Что Дальше?
1. **Sprint 5:** Ghost Trails эффект (самая сложная часть)
2. **Sprint 6:** Фоновые эффекты (частицы, туманность)
3. **Sprint 7:** Обновленный спектр

### Когда Приступать?
- Sprint 5 можно начать сразу после завершения S4-T2 (vertex shader)
- Или завершить весь Sprint 4 для solid foundation

---

## 💡 Советы

### Development
- Тестировать каждую задачу отдельно
- Коммитить после каждой завершенной задачи
- Использовать Chrome DevTools для отладки WebGL

### Performance
- Держать DevTools Performance tab открытым
- Следить за FPS counter
- Не оптимизировать преждевременно (Sprint 9)

### Debugging Shaders
```javascript
// Добавить в onBeforeCompile для отладки
material.onBeforeCompile = (shader) => {
  console.log('Vertex Shader:', shader.vertexShader);
  console.log('Fragment Shader:', shader.fragmentShader);
};
```

---

## 🎉 Good Luck!

Начинайте с S4-T1 (Post-Processing Setup), это фундамент для всего остального.

**Вопросы?** Обратитесь к:
- `sprint4_backlog.md` - детальный бэклог
- `visualDesignSpec.md` - визуальная спецификация
