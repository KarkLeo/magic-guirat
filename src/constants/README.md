# Constants

Centralized application constants for Magic Guitar.

## Structure

```
src/constants/
├── colors.ts      - Color palette
├── index.ts       - Barrel export
└── README.md      - This documentation
```

---

## colors.ts

### COLORS

Main application colors, organized by categories:

#### background
Colors for background and cosmic atmosphere:
```typescript
COLORS.background.deepPurple  // '#1a0033' - deep purple
COLORS.background.darkBlue    // '#0a192f' - dark blue
COLORS.background.darkest     // '#020617' - darkest
COLORS.background.current     // '#0f0c29' - current scene background
```

#### strings
String colors (gradient indigo → purple → pink):
```typescript
COLORS.strings.indigo   // '#6366f1' - indigo (cool)
COLORS.strings.purple   // '#8b5cf6' - purple (medium)
COLORS.strings.pink     // '#ec4899' - pink (warm)

// Individual colors for each string (E A D G B e)
COLORS.strings.string1  // '#ec4899' - 1st (e) pink
COLORS.strings.string2  // '#f472b6' - 2nd (B) light pink
COLORS.strings.string3  // '#c084fc' - 3rd (G) light purple
COLORS.strings.string4  // '#8b5cf6' - 4th (D) purple
COLORS.strings.string5  // '#7c3aed' - 5th (A) dark purple
COLORS.strings.string6  // '#6366f1' - 6th (E) indigo
```

#### spectrum
Colors for frequency spectrum visualizer:
```typescript
COLORS.spectrum.cyan    // '#06b6d4' - cyan (low frequencies)
COLORS.spectrum.indigo  // '#6366f1' - indigo (mid)
COLORS.spectrum.pink    // '#ec4899' - pink (high)
COLORS.spectrum.amber   // '#f59e0b' - amber (very high)
```

#### particles
Colors for particle system:
```typescript
COLORS.particles.white   // '#ffffff' - white (primary)
COLORS.particles.cyan    // '#06b6d4' - cyan (cool accent)
COLORS.particles.pink    // '#ec4899' - pink (warm accent)
COLORS.particles.purple  // '#8b5cf6' - purple (medium)
```

#### ui
UI element colors:
```typescript
COLORS.ui.border         // '#a8b5ff' - borders
COLORS.ui.borderOpacity  // 0.2 - border opacity
COLORS.ui.text           // '#ffffff' - text
COLORS.ui.textSecondary  // '#9ca3af' - secondary text
COLORS.ui.accent         // '#ec4899' - accent color
```

---

### GRADIENTS

Color arrays for smooth transitions:

```typescript
GRADIENTS.background  // ['#1a0033', '#0a192f', '#020617']
GRADIENTS.string      // ['#6366f1', '#8b5cf6', '#ec4899']
GRADIENTS.spectrum    // ['#06b6d4', '#6366f1', '#ec4899', '#f59e0b']
GRADIENTS.particles   // ['#ffffff', '#06b6d4', '#ec4899']
GRADIENTS.chordName   // ['#ec4899', '#f59e0b']
```

**Usage:**
```javascript
// CSS gradient
background: linear-gradient(to bottom, ...GRADIENTS.background)

// Three.js gradient
const colors = GRADIENTS.string.map(c => new THREE.Color(c))
```

---

### COLORS_RGB

RGB values for Three.js (range [0, 1]):

```typescript
COLORS_RGB.strings.indigo  // { r: 0.388, g: 0.4, b: 0.945 }
COLORS_RGB.strings.purple  // { r: 0.545, g: 0.361, b: 0.965 }
COLORS_RGB.strings.pink    // { r: 0.925, g: 0.282, b: 0.6 }
```

**Usage in ShaderMaterial:**
```javascript
const color = COLORS_RGB.strings.pink
uniforms.uColor.value = new THREE.Vector3(color.r, color.g, color.b)
```

---

### ColorUtils

Utilities for working with colors:

#### `hexToRgb(hex: string)`
Converts HEX → RGB for Three.js
```typescript
const rgb = ColorUtils.hexToRgb('#6366f1')
// { r: 0.388, g: 0.4, b: 0.945 }
```

#### `getStringColor(index: number)`
Gets string color by index (0-5):
```typescript
const color = ColorUtils.getStringColor(0) // '#6366f1' (6th string)
const color = ColorUtils.getStringColor(5) // '#ec4899' (1st string)
```

---

## Usage Examples

### In Vue components

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

### In Three.js components

```javascript
import { ColorUtils, COLORS } from '@/constants'

// Using ColorUtils
const colorHex = ColorUtils.getStringColor(index)
const baseColor = new THREE.Color(colorHex)

// Or directly
const color = new THREE.Color(COLORS.strings.pink)
```

### In GLSL shaders

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

Color palette is based on:
- **Cosmic theme**: dark backgrounds (deepPurple, darkBlue)
- **Magical glow**: bright accents (pink, cyan, amber)
- **Gradients**: smooth transitions cool → warm
- **Contrast**: sufficient for readability (WCAG AA)

### Color Theory

**Strings** (cool → warm):
- 6th string (E, low): indigo (cool, deep)
- 1st string (e, high): pink (warm, bright)

**Spectrum** (frequency → color):
- Low frequencies: cyan (cool, calm)
- High frequencies: amber (warm, energetic)

---

## Extension

To add new colors:

1. Add to appropriate category in `COLORS`
2. If needed, add RGB version to `COLORS_RGB`
3. Update type definitions
4. Update this documentation

```typescript
// Example
export const COLORS = {
  // ... existing
  newCategory: {
    newColor: '#123456',
  },
} as const
```

---

## Best Practices

1. **Always use constants** instead of hardcoding colors
2. **Use ColorUtils** for HEX → RGB conversion
3. **Group by categories** for better organization
4. **Document new colors** in this README
5. **TypeScript typing** via `as const` for autocomplete
