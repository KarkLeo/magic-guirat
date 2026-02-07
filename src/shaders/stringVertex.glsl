// Vertex Shader для волнообразной деформации струн гитары
// Sprint 5 Task 1: Enhanced String Physics with Harmonics

// Uniforms - параметры, передаваемые из JavaScript
uniform float uTime;           // Текущее время анимации (мс)
uniform float uAmplitude;      // Амплитуда колебаний (0.0 - 1.0)
uniform float uFrequency;      // Частота волны (зависит от ноты)
uniform float uDamping;        // Коэффициент затухания (1.0 - 2.0)
uniform float uAttackTime;     // Время начала колебания (мс)
uniform float uSpeed;          // Скорость колебания (зависит от темпа)

// Varying - передаём во fragment shader
varying vec2 vUv;              // UV координаты для текстурирования
varying float vIntensity;      // Интенсивность для затухания цвета

void main() {
  // Передаём UV координаты во fragment shader
  vUv = uv;

  // Копируем позицию вершины
  vec3 pos = position;

  // Вычисляем время с момента удара по струне (в секундах)
  float timeSinceAttack = max(0.0, (uTime - uAttackTime) * 0.001);

  // === РЕАЛИСТИЧНАЯ МОДЕЛЬ КОЛЕБАНИЙ С ГАРМОНИКАМИ ===
  // Реальная струна колеблется как суперпозиция нескольких частот (основная + обертоны)
  // Волна распространяется ВДОЛЬ струны (pos.y — ось длины цилиндра)

  // Основная частота (фундаментальная)
  float wave1 = sin(pos.y * uFrequency + uTime * 0.009 * uSpeed);

  // Вторая гармоника (октава выше, меньшая амплитуда)
  float wave2 = sin(pos.y * uFrequency * 2.0 + uTime * 0.009 * uSpeed * 1.5) * 0.3;

  // Третья гармоника (квинта, ещё меньшая амплитуда)
  float wave3 = sin(pos.y * uFrequency * 3.0 + uTime * 0.009 * uSpeed * 2.0) * 0.15;

  // Суммируем все гармоники для богатого звука
  float combinedWave = wave1 + wave2 + wave3;

  // === ТРЁХФАЗНАЯ МОДЕЛЬ ENVELOPE (ATTACK → SUSTAIN → RELEASE) ===

  // Attack phase: быстрый рост (0 → 1 за ~50ms)
  float attackDuration = 0.05;
  float attackPhase = smoothstep(0.0, attackDuration, timeSinceAttack);

  // Sustain + Release phase: экспоненциальное затухание
  // Для гитарных струн характерно медленное затухание (2-4 секунды)
  float sustainDecay = exp(-uDamping * timeSinceAttack);

  // Комбинированная envelope: attack * sustain
  // Это даёт естественный профиль:
  // - Быстрый рост в начале
  // - Плавное затухание после пика
  float envelope = attackPhase * sustainDecay * uAmplitude;

  // === ПРИМЕНЯЕМ ВОЛНУ К ГЕОМЕТРИИ ===
  // Вертикальное смещение (перпендикулярно струне, в мировых координатах — вверх/вниз)
  // Цилиндр: ось Y = длина, ось X/Z = радиус
  // После rotation.z = 90°: локальная X → мировая Y (вертикаль) ✓
  pos.x += combinedWave * envelope;

  // Передаём интенсивность для fragment shader (для свечения)
  // Используем envelope для синхронизации свечения с колебаниями
  vIntensity = sustainDecay;

  // Финальная трансформация позиции
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
