// Vertex Shader для волнообразной деформации струн гитары
// Sprint 4 Task 2: String Wave Animation with Decay

// Uniforms - параметры, передаваемые из JavaScript
uniform float uTime;           // Текущее время анимации (мс)
uniform float uAmplitude;      // Амплитуда колебаний (0.0 - 1.0)
uniform float uFrequency;      // Частота волны (зависит от ноты)
uniform float uDamping;        // Коэффициент затухания (1.0 - 2.0)
uniform float uAttackTime;     // Время начала колебания (мс)

// Varying - передаём во fragment shader
varying vec2 vUv;              // UV координаты для текстурирования
varying float vIntensity;      // Интенсивность для затухания цвета

void main() {
  // Передаём UV координаты во fragment shader
  vUv = uv;

  // Копируем позицию вершины
  vec3 pos = position;

  // Вычисляем время с момента удара по струне
  float timeSinceAttack = uTime - uAttackTime;

  // Волнообразное смещение вдоль оси струны (x)
  // sin создаёт волну, зависящую от позиции и времени
  float wave = sin(pos.x * uFrequency + uTime * 3.0);

  // Экспоненциальное затухание (как у реальной струны)
  // exp(-x) создаёт плавное затухание от 1.0 до 0.0
  float decay = exp(-uDamping * max(0.0, timeSinceAttack * 0.001));

  // Применяем волну с затуханием к позиции Y (вертикальное смещение)
  pos.y += uAmplitude * wave * decay;

  // Передаём интенсивность для fragment shader (для свечения)
  vIntensity = decay;

  // Финальная трансформация позиции
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
