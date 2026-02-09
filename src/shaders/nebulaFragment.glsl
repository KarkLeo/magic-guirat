// Nebula Fragment Shader
// Мягкая туманность с radial gradient и noise-like effect

uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;

varying vec2 vUv;

// Простой pseudo-noise через sin комбинации
float noise(vec2 p) {
  return sin(p.x * 1.7 + p.y * 3.1) * sin(p.y * 2.3 - p.x * 1.1) * 0.5 + 0.5;
}

void main() {
  // Расстояние от центра UV
  vec2 center = vUv - 0.5;
  float dist = length(center);

  // Radial falloff — мягкие края
  float falloff = 1.0 - smoothstep(0.0, 0.5, dist);
  falloff = pow(falloff, 1.5); // Мягче к краям

  // Noise-like модуляция для органичной формы
  float n = noise(vUv * 3.0 + uTime * 0.00005);
  float n2 = noise(vUv * 5.0 - uTime * 0.00003);
  float noiseVal = mix(n, n2, 0.5);

  // Финальная непрозрачность
  float alpha = falloff * noiseVal * uOpacity;

  gl_FragColor = vec4(uColor, alpha);
}
