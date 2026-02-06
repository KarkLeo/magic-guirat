# GLSL Shaders Documentation

Эта директория содержит GLSL шейдеры для визуализации струн и эффектов.

## Файлы

### stringVertex.glsl
**Назначение:** Vertex shader для волнообразной деформации геометрии струн

**Uniforms:**
- `uTime` (float) - Текущее время анимации в миллисекундах
- `uAmplitude` (float) - Амплитуда колебаний струны (0.0 - 1.0)
  - Зависит от интенсивности звука
  - 0.0 = нет колебаний, 1.0 = максимальные колебания
- `uFrequency` (float) - Частота волны (обычно 0.5 - 3.0)
  - Может быть связана с высотой ноты
  - Большие значения = более быстрые колебания
- `uDamping` (float) - Коэффициент затухания (1.0 - 2.0)
  - Определяет, как быстро затухают колебания
  - Меньше значение = медленнее затухание
- `uAttackTime` (float) - Время начала колебания в миллисекундах
  - Используется для вычисления затухания
  - Обновляется при каждом новом ударе по струне

**Varyings:**
- `vUv` (vec2) - UV координаты для fragment shader
- `vIntensity` (float) - Интенсивность затухания (1.0 → 0.0 со временем)

**Алгоритм:**
1. Волна создаётся функцией `sin(position.x * frequency + time)`
2. Затухание вычисляется как `exp(-damping * timeSinceAttack)`
3. Вертикальное смещение = `amplitude * wave * decay`

---

### stringFragment.glsl
**Назначение:** Fragment shader для градиентного цвета и свечения струн

**Uniforms:**
- `uColorStart` (vec3) - RGB начального цвета градиента (левый край струны)
- `uColorEnd` (vec3) - RGB конечного цвета градиента (правый край струны)
- `uGlowIntensity` (float) - Интенсивность свечения (0.0 - 3.0)
  - Зависит от активности струны
  - Усиливается bloom pass'ом

**Varyings (от vertex shader):**
- `vUv` (vec2) - UV координаты
- `vIntensity` (float) - Интенсивность затухания

**Алгоритм:**
1. Градиент вычисляется по оси X: `mix(colorStart, colorEnd, uv.x)`
2. Свечение усиливается пропорционально интенсивности затухания
3. Финальный цвет = `color * (1.0 + glow * intensity)`

---

## Использование в Three.js

```javascript
import vertexShader from './shaders/stringVertex.glsl?raw'
import fragmentShader from './shaders/stringFragment.glsl?raw'

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uAmplitude: { value: 0.5 },
    uFrequency: { value: 1.0 },
    uDamping: { value: 1.5 },
    uAttackTime: { value: 0.0 },
    uColorStart: { value: new THREE.Color(0x6366f1) },
    uColorEnd: { value: new THREE.Color(0xec4899) },
    uGlowIntensity: { value: 1.0 },
  },
  vertexShader,
  fragmentShader,
})

// В animation loop
material.uniforms.uTime.value = performance.now()
```

---

## Настройка параметров

### Для медленного затухания (sustain)
```javascript
uDamping: 0.8  // меньше = медленнее затухание
uAmplitude: 0.7
```

### Для быстрого затухания (staccato)
```javascript
uDamping: 2.0  // больше = быстрее затухание
uAmplitude: 0.4
```

### Для связи с pitch detection
```javascript
// Частота волны пропорциональна высоте ноты
const noteFreq = detectedFrequency // Hz
const normalizedFreq = (noteFreq - 80) / (400 - 80) // нормализация
uFrequency: 0.5 + normalizedFreq * 2.5 // 0.5 - 3.0
```

---

## Performance Notes

- Vertex shader выполняется для каждой вершины геометрии
- Fragment shader выполняется для каждого пикселя
- Для оптимизации: используйте низкополигональную геометрию струн (16 сегментов достаточно)
- `exp()` функция относительно дорогая, но затухание вычисляется только один раз на вершину

---

## Troubleshooting

**Проблема:** Струны не колеблются
- Проверьте, что `uTime` обновляется в каждом кадре
- Убедитесь, что `uAmplitude > 0`
- Проверьте, что `uAttackTime` обновляется при активации струны

**Проблема:** Слишком быстрое/медленное затухание
- Отрегулируйте `uDamping` (1.0 - 2.0 оптимальный диапазон)

**Проблема:** Нет bloom эффекта
- Увеличьте `uGlowIntensity` (> 1.5)
- Проверьте настройки UnrealBloomPass (threshold должен быть < 0.3)

---

## Roadmap

### Sprint 5 (планируется)
- Гармоники: добавить несколько волн разной частоты
- Улучшенная физика: учёт жёсткости струны
- Вариация amplitude по длине струны

### Sprint 6 (планируется)
- Shader для частиц (particle vertex/fragment)
- Shader для ghost trails эффекта
