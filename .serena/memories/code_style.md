# Code Style & Conventions

## Vue 3 Style

### Script Setup синтаксис

Используем `<script setup>` для всех компонентов:

```vue
<script setup>
import { ref, computed } from 'vue'
import SomeComponent from './SomeComponent.vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>
```

### Структура компонента

```vue
<script setup>
// 1. Imports
import { ref } from 'vue'
import ChildComponent from './ChildComponent.vue'

// 2. Props
const props = defineProps({
  title: String,
  count: Number
})

// 3. Emits
const emit = defineEmits(['update', 'close'])

// 4. State
const isActive = ref(false)

// 5. Computed
const doubleCount = computed(() => props.count * 2)

// 6. Methods
function handleClick() {
  emit('update', count.value)
}

// 7. Lifecycle hooks
onMounted(() => {
  console.log('Component mounted')
})
</script>

<template>
  <!-- Template here -->
</template>

<style scoped>
/* Scoped styles */
</style>
```

## Naming Conventions

### Файлы
- **Компоненты**: `PascalCase.vue` - `GuitarVisualizer.vue`, `AudioCapture.vue`
- **Composables**: `camelCase.js` - `useAudio.js`, `usePitchDetection.js`
- **Services**: `camelCase.js` - `audioService.js`, `chordDatabase.js`
- **Utils**: `camelCase.js` - `noteUtils.js`, `colorUtils.js`

### Переменные и функции
- **Variables**: `camelCase` - `audioContext`, `frequencyData`
- **Constants**: `UPPER_SNAKE_CASE` - `MAX_FREQUENCY`, `GUITAR_STRINGS`
- **Functions**: `camelCase` - `detectPitch()`, `analyzeFrequency()`
- **Boolean**: префикс `is`, `has`, `should` - `isActive`, `hasPermission`

### Компоненты
- **Multi-word names** - избегать однословных имен (кроме `App.vue`)
- **Base components**: `Base*` - `BaseButton.vue`, `BaseCard.vue`
- **Single-instance**: `The*` - `TheHeader.vue`, `TheVisualizer.vue`
- **Tightly coupled**: родительское имя как префикс - `GuitarString.vue`, `GuitarFretboard.vue`

## CSS/Styling

### Scoped styles
Всегда используем `<style scoped>`:

```vue
<style scoped>
.component-name {
  /* styles */
}
</style>
```

### Цветовая палитра
```css
/* Магические цвета проекта */
--primary-purple: #8b5cf6;
--primary-blue: #3b82f6;
--dark-bg: #0a0a0f;
--glow-color: rgba(139, 92, 246, 0.8);
```

### CSS переменные
Используем CSS custom properties для темизации

## Import Paths

Используем алиас `@` для `src/`:

```javascript
import GuitarVisualizer from '@/components/GuitarVisualizer.vue'
import { useAudio } from '@/composables/useAudio'
import audioService from '@/services/audioService'
```

## TypeScript (опционально)

Пока не используется, но можем добавить в будущем

## Комментарии

```javascript
// Однострочный комментарий для простых объяснений

/**
 * JSDoc для функций и методов
 * @param {number} frequency - Частота в Гц
 * @returns {string} Название ноты
 */
function frequencyToNote(frequency) {
  // implementation
}
```

## Архитектурные паттерны

### Композаблы (Composables)
Для переиспользуемой логики создаем composables:

```javascript
// composables/useAudio.js
export function useAudio() {
  const audioContext = ref(null)
  
  function startCapture() {
    // ...
  }
  
  return {
    audioContext,
    startCapture
  }
}
```

### Services
Для бизнес-логики и API:

```javascript
// services/pitchDetectionService.js
export default {
  detectPitch(buffer) {
    // implementation
  }
}
```

## Форматирование

- **Indentation**: 2 spaces
- **Quotes**: single quotes для JS, double для attributes
- **Semicolons**: да (используем)
- **Trailing commas**: да
- **Line length**: ~80-100 символов (не строго)

## TODO

- [ ] Настроить ESLint
- [ ] Настроить Prettier
- [ ] Добавить EditorConfig
- [ ] Настроить Vue devtools
