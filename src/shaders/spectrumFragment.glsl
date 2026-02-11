// Spectrum Fragment Shader
// Яркая линия внизу, плавное растворение вверх (мягкий край, без пересвета)

uniform float uTime;
uniform float uDominantFreq;
uniform float uBoost;

varying vec2 vUv;

void main() {
  vec3 deepBlue = vec3(0.161, 0.024, 0.439);
  vec3 brightCyan = vec3(0.62, 0.035, 0.871);
  vec3 glowColor = vec3(0.89, 0.341, 0.043);

  vec3 color;
  // Смешиваем от глубокого синего к яркому морскому
  color = mix(deepBlue, brightCyan, vUv.y);

  // Двойной fade для очень мягкого верхнего края:
  // 1) Общий вертикальный градиент
  float verticalFade = pow(1.0 - vUv.y, 1.1);
  // 2) Edge softener
  float edgeSoft = smoothstep(1.0, 0.4, vUv.y);
  verticalFade *= edgeSoft;

  // Горизонтальный fade к краям
  float horizontalFade = 1.0 - smoothstep(0.6, 1.0, abs(vUv.x - 0.5) * 2.0);

  // Эффект вертикальных лучей (Aurora rays)
  float rays = pow(sin(vUv.x * 30.0 + uTime * 0.5), 3.0) * 0.15;
  float shimmer = sin(uTime * 1.2 + vUv.x * 8.0) * 0.05 + 0.95;

  float alpha = verticalFade * horizontalFade * shimmer * 0.8;

  // Мягкое свечение у основания (Aurora base glow)
  float coreGlow = 1.0 - smoothstep(0.0, 0.2, vUv.y);
  color += coreGlow * glowColor * 0.4 + rays * brightCyan * verticalFade;

  // Audio boost
  float boost = 1.0 + uBoost * 0.15;
  color *= boost;

  // Яркость контролируется через alpha (AdditiveBlending),
  // без Reinhard — он десатурирует яркие цвета, делая их серыми

  gl_FragColor = vec4(color, alpha);
}
