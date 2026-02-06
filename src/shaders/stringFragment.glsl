// Fragment Shader для градиентного цвета и свечения струн
// Sprint 4 Task 3: String Color Gradient with Glow
// Базовая версия для S4-T2, будет улучшена в S4-T3

// Uniforms
uniform vec3 uColorStart;      // Начальный цвет градиента
uniform vec3 uColorEnd;        // Конечный цвет градиента
uniform float uGlowIntensity;  // Интенсивность свечения (0.0 - 3.0)

// Varying - получаем из vertex shader
varying vec2 vUv;
varying float vIntensity;      // Интенсивность от затухания струны

void main() {
  // Градиент по длине струны (ось X)
  vec3 color = mix(uColorStart, uColorEnd, vUv.x);

  // Усиливаем яркость для bloom эффекта
  // vIntensity уменьшается при затухании струны
  float glow = uGlowIntensity * vIntensity;

  // Финальный цвет с учётом свечения
  vec3 finalColor = color * (1.0 + glow);

  gl_FragColor = vec4(finalColor, 1.0);
}
