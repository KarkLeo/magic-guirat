// Spectrum Fragment Shader
// Яркая линия внизу, плавное растворение вверх (мягкий край, без пересвета)

uniform float uTime;
uniform float uDominantFreq;
uniform float uBoost;

varying vec2 vUv;

void main() {
  // 3-stop градиент: pink (низ) → indigo (середина) → cyan (верх)
  vec3 pink   = vec3(1.0, 0.0, 0.882);    // #FF00E1
  vec3 indigo = vec3(0.216, 0.129, 0.871); // #3721DE
  vec3 cyan   = vec3(0.0, 0.831, 1.0);    // #00D4FF

  vec3 color;
  if (vUv.y < 0.5) {
    color = mix(pink, indigo, vUv.y * 2.0);
  } else {
    color = mix(indigo, cyan, (vUv.y - 0.5) * 2.0);
  }

  // Двойной fade для очень мягкого верхнего края:
  // 1) Общий вертикальный градиент — плавное растворение вверх
  float verticalFade = pow(1.0 - vUv.y, 0.9);
  // 2) Edge softener — растянут на 60% высоты для максимально мягкой границы
  float edgeSoft = smoothstep(1.0, 0.4, vUv.y);
  verticalFade *= edgeSoft;

  // Горизонтальный fade к краям
  float horizontalFade = 1.0 - smoothstep(0.65, 1.0, abs(vUv.x - 0.5) * 2.0);
  float shimmer = sin(uTime * 1.0 + vUv.x * 5.0) * 0.02 + 0.98;

  float alpha = verticalFade * horizontalFade * shimmer * 0.7;

  // Лёгкое розовое ядро внизу
  float coreGlow = (1.0 - smoothstep(0.0, 0.15, vUv.y)) * 0.06;
  color += coreGlow * pink * 0.5;

  // Audio boost
  float boost = 1.0 + uBoost * 0.15;
  color *= boost;

  // Яркость контролируется через alpha (AdditiveBlending),
  // без Reinhard — он десатурирует яркие цвета, делая их серыми

  gl_FragColor = vec4(color, alpha);
}
