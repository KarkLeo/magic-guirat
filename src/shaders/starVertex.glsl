// Star Particle Vertex Shader
// Медленный дрейф и мерцание для космических звезд

attribute float aAlpha;
attribute float aSize;
attribute float aTwinkleOffset; // Фазовый сдвиг для асинхронного мерцания

uniform float uTime;
uniform float uSpeed; // Скорость анимации (audio reactive в S6-T5)

varying float vAlpha;

void main() {
  vAlpha = aAlpha;

  // Мерцание: sin wave с индивидуальным offset
  float twinkle = sin(uTime * 0.001 + aTwinkleOffset) * 0.5 + 0.5; // [0, 1]
  float twinkleIntensity = 0.3; // 30% amplitude
  float finalAlpha = aAlpha * (1.0 - twinkleIntensity + twinkleIntensity * twinkle);
  vAlpha = finalAlpha;

  // Медленный дрейф (используем aTwinkleOffset как seed для направления)
  vec3 driftOffset = vec3(
    sin(uTime * 0.0002 * uSpeed + aTwinkleOffset) * 0.5,
    cos(uTime * 0.00015 * uSpeed + aTwinkleOffset * 1.3) * 0.5,
    0.0
  );

  vec3 driftedPosition = position + driftOffset;

  // Финальная позиция
  vec4 mvPosition = modelViewMatrix * vec4(driftedPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Размер с мерцанием
  float sizeVariation = 0.8 + 0.2 * twinkle; // Slight size variation
  gl_PointSize = aSize * sizeVariation * (300.0 / -mvPosition.z);
}
