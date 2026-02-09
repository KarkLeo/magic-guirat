// Spectrum Fragment Shader
// Gradient colors + vertical/horizontal fade + shimmer

uniform float uTime;
uniform float uDominantFreq; // 0-1: позиция доминантной частоты
uniform float uBoost;        // 0-1: audio reactivity boost

varying vec2 vUv;

void main() {
  // 4-stop горизонтальный градиент: cyan → indigo → pink → amber
  // Сдвигаем gradient по uDominantFreq
  float gradPos = vUv.x + uDominantFreq * 0.15;

  vec3 cyan   = vec3(0.0, 0.85, 0.95);
  vec3 indigo = vec3(0.39, 0.4, 0.95);
  vec3 pink   = vec3(0.93, 0.29, 0.61);
  vec3 amber  = vec3(0.96, 0.62, 0.04);

  vec3 color;
  if (gradPos < 0.33) {
    color = mix(cyan, indigo, gradPos / 0.33);
  } else if (gradPos < 0.66) {
    color = mix(indigo, pink, (gradPos - 0.33) / 0.33);
  } else {
    color = mix(pink, amber, clamp((gradPos - 0.66) / 0.34, 0.0, 1.0));
  }

  // Вертикальный fade: растворение снизу вверх
  float verticalFade = smoothstep(0.0, 0.6, vUv.y);

  // Горизонтальный fade: растворение к краям
  float horizontalFade = 1.0 - smoothstep(0.8, 1.0, abs(vUv.x - 0.5) * 2.0);

  // Shimmer
  float shimmer = sin(uTime * 1.5 + vUv.x * 8.0) * 0.05 + 0.95;

  // Итоговая прозрачность
  float alpha = verticalFade * horizontalFade * shimmer;

  // Audio boost: ярче при сильном звуке
  float boost = 1.0 + uBoost * 0.5;
  color *= boost;

  gl_FragColor = vec4(color, alpha * 0.85);
}
