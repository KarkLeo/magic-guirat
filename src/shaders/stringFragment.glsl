// Fragment Shader для градиентного цвета и свечения струн
// Sprint 4 Task 3: Enhanced String Color Gradient with Advanced Glow
// Улучшенная версия с radial glow, fresnel effect и shimmer

// Uniforms
uniform vec3 uColorStart;       // Начальный цвет градиента (левый край)
uniform vec3 uColorEnd;         // Конечный цвет градиента (правый край)
uniform float uGlowIntensity;   // Интенсивность свечения (0.0 - 3.0)
uniform float uTime;            // Время для shimmer эффекта
uniform float uEdgeGlow;        // Интенсивность свечения на краях (0.0 - 1.0)

// Varying - получаем из vertex shader
varying vec2 vUv;
varying float vIntensity;       // Интенсивность от затухания струны

void main() {
  // 1. Горизонтальный градиент по длине струны (ось X)
  vec3 baseColor = mix(uColorStart, uColorEnd, vUv.x);

  // 2. Radial Glow - свечение сильнее в центре струны (по оси Y)
  // vUv.y: 0.0 на краях, 0.5 в центре
  float distFromCenter = abs(vUv.y - 0.5) * 2.0; // 0.0 в центре, 1.0 на краях
  float radialGlow = 1.0 - distFromCenter; // 1.0 в центре, 0.0 на краях

  // Применяем smoothstep для мягкого перехода
  radialGlow = smoothstep(0.0, 1.0, radialGlow);

  // 3. Fresnel-like Edge Enhancement - края светятся ярче
  // Имитация отражения света на цилиндрической поверхности
  float edgeIntensity = pow(distFromCenter, 2.0); // сильнее на краях
  float fresnel = edgeIntensity * uEdgeGlow * vIntensity;

  // 4. Shimmer Effect - subtle мерцание для активных струн
  // Используем vUv.x для пространственной вариации
  float shimmer = sin(uTime * 0.003 + vUv.x * 10.0) * 0.1 + 0.9; // 0.8 - 1.0
  shimmer = mix(1.0, shimmer, vIntensity); // shimmer только для активных струн

  // 5. Комбинируем все эффекты свечения
  float totalGlow = uGlowIntensity * vIntensity * radialGlow * shimmer;

  // 6. Финальный цвет
  // baseColor - базовый градиент
  // totalGlow - основное свечение (bloom)
  // fresnel - дополнительное edge свечение
  vec3 finalColor = baseColor * (1.0 + totalGlow + fresnel);

  gl_FragColor = vec4(finalColor, 1.0);
}
