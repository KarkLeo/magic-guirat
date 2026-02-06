# Constants

Централизованные константы приложения Magic Guitar.

## Структура

```
src/constants/
├── colors.ts      - Цветовая палитра
├── index.ts       - Barrel export
└── README.md      - Эта документация
```

---

## colors.ts

### COLORS

Основные цвета приложения, организованные по категориям:

#### background
Цвета для фона и космической атмосферы:
```typescript
COLORS.background.deepPurple  // '#1a0033' - глубокий фиолетовый
COLORS.background.darkBlue    // '#0a192f' - тёмно-синий
COLORS.background.darkest     // '#020617' - самый тёмный
COLORS.background.current     // '#0f0c29' - текущий фон сцены
```

#### strings
Цвета струн (градиент индиго → фиолетовый → розовый):
```typescript
COLORS.strings.indigo   // '#6366f1' - индиго (холодный)
COLORS.strings.purple   // '#8b5cf6' - фиолетовый (средний)
COLORS.strings.pink     // '#ec4899' - розовый (тёплый)

// Индивидуальные цвета для каждой струны (E A D G B e)
COLORS.strings.string1  // '#ec4899' - 1-я (e) розовый
COLORS.strings.string2  // '#f472b6' - 2-я (B) светло-розовый
COLORS.strings.string3  // '#c084fc' - 3-я (G) светло-фиолетовый
COLORS.strings.string4  // '#8b5cf6' - 4-я (D) фиолетовый
COLORS.strings.string5  // '#7c3aed' - 5-я (A) тёмно-фиолетовый
COLORS.strings.string6  // '#6366f1' - 6-я (E) индиго
```

#### spectrum
Цвета для frequency spectrum visualizer:
```typescript
COLORS.spectrum.cyan    // '#06b6d4' - циан (низкие частоты)
COLORS.spectrum.indigo  // '#6366f1' - индиго (средние)
COLORS.spectrum.pink    // '#ec4899' - розовый (высокие)
COLORS.spectrum.amber   // '#f59e0b' - янтарь (очень высокие)
```

#### particles
Цвета для системы частиц:
```typescript
COLORS.particles.white   // '#ffffff' - белый (основной)
COLORS.particles.cyan    // '#06b6d4' - циан (холодный акцент)
COLORS.particles.pink    // '#ec4899' - розовый (тёплый акцент)
COLORS.particles.purple  // '#8b5cf6' - фиолетовый (средний)
```

#### ui
Цвета UI элементов:
```typescript
COLORS.ui.border         // '#a8b5ff' - рамки
COLORS.ui.borderOpacity  // 0.2 - прозрачность рамок
COLORS.ui.text           // '#ffffff' - текст
COLORS.ui.textSecondary  // '#9ca3af' - вторичный текст
COLORS.ui.accent         // '#ec4899' - акцентный цвет
```

---

### GRADIENTS

Массивы цветов для плавных переходов:

```typescript
GRADIENTS.background  // ['#1a0033', '#0a192f', '#020617']
GRADIENTS.string      // ['#6366f1', '#8b5cf6', '#ec4899']
GRADIENTS.spectrum    // ['#06b6d4', '#6366f1', '#ec4899', '#f59e0b']
GRADIENTS.particles   // ['#ffffff', '#06b6d4', '#ec4899']
GRADIENTS.chordName   // ['#ec4899', '#f59e0b']
```

**Использование:**
```javascript
// CSS gradient
background: linear-gradient(to bottom, ...GRADIENTS.background)

// Three.js gradient
const colors = GRADIENTS.string.map(c => new THREE.Color(c))
```

---

### COLORS_RGB

RGB значения для Three.js (диапазон [0, 1]):

```typescript
COLORS_RGB.strings.indigo  // { r: 0.388, g: 0.4, b: 0.945 }
COLORS_RGB.strings.purple  // { r: 0.545, g: 0.361, b: 0.965 }
COLORS_RGB.strings.pink    // { r: 0.925, g: 0.282, b: 0.6 }
```

**Использование в ShaderMaterial:**
```javascript
const color = COLORS_RGB.strings.pink
uniforms.uColor.value = new THREE.Vector3(color.r, color.g, color.b)
```

---

### ColorUtils

Утилиты для работы с цветами:

#### `hexToRgb(hex: string)`
Конвертирует HEX → RGB для Three.js
```typescript
const rgb = ColorUtils.hexToRgb('#6366f1')
// { r: 0.388, g: 0.4, b: 0.945 }
```

#### `getStringColor(index: number)`
Получает цвет струны по индексу (0-5):
```typescript
const color = ColorUtils.getStringColor(0) // '#6366f1' (6-я струна)
const color = ColorUtils.getStringColor(5) // '#ec4899' (1-я струна)
```

---

## Примеры использования

### В Vue компонентах

```vue
<script setup>
import { COLORS, GRADIENTS } from '@/constants'

const borderColor = COLORS.ui.border
const gradient = GRADIENTS.background.join(', ')
</script>

<style scoped>
.container {
  border: 1px solid v-bind(borderColor);
  background: linear-gradient(to bottom, v-bind(gradient));
}
</style>
```

### В Three.js компонентах

```javascript
import { ColorUtils, COLORS } from '@/constants'

// Использование ColorUtils
const colorHex = ColorUtils.getStringColor(index)
const baseColor = new THREE.Color(colorHex)

// Или напрямую
const color = new THREE.Color(COLORS.strings.pink)
```

### В GLSL шейдерах

```javascript
import { COLORS_RGB } from '@/constants'

const material = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Vector3(
      COLORS_RGB.strings.pink.r,
      COLORS_RGB.strings.pink.g,
      COLORS_RGB.strings.pink.b
    )}
  }
})
```

---

## Design System

Цветовая палитра основана на:
- **Космическая тема**: тёмные фоны (deepPurple, darkBlue)
- **Магическое свечение**: яркие акценты (pink, cyan, amber)
- **Градиенты**: плавные переходы холодный → тёплый
- **Контраст**: достаточный для читаемости (WCAG AA)

### Цветовая теория

**Струны** (холодный → тёплый):
- 6-я струна (E, низкая): индиго (холодный, глубокий)
- 1-я струна (e, высокая): розовый (тёплый, яркий)

**Spectrum** (частота → цвет):
- Низкие частоты: циан (холодный, спокойный)
- Высокие частоты: янтарь (тёплый, энергичный)

---

## Расширение

Для добавления новых цветов:

1. Добавить в соответствующую категорию в `COLORS`
2. При необходимости добавить RGB версию в `COLORS_RGB`
3. Обновить Type definitions
4. Обновить эту документацию

```typescript
// Пример
export const COLORS = {
  // ... existing
  newCategory: {
    newColor: '#123456',
  },
} as const
```

---

## Best Practices

1. **Всегда используйте константы** вместо хардкода цветов
2. **Используйте ColorUtils** для конвертации HEX → RGB
3. **Группируйте по категориям** для лучшей организации
4. **Документируйте новые цвета** в этом README
5. **TypeScript типизация** через `as const` для автодополнения
