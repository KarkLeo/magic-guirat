// Star Particle Fragment Shader
// Круглые светящиеся точки с мягкими краями

varying float vAlpha;

void main() {
  // Круглая форма с мягкими краями
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Soft edges с gaussian-like falloff
  float radius = 0.5;
  float edge = smoothstep(radius, radius * 0.3, dist);

  // Glow эффект (ярче в центре)
  float glow = 1.0 - smoothstep(0.0, radius, dist);
  glow = pow(glow, 2.0); // Более яркий центр

  // Финальный цвет: белые звезды с легким теплым оттенком
  vec3 starColor = vec3(1.0, 0.98, 0.95); // Слегка теплый белый

  gl_FragColor = vec4(starColor, edge * glow * vAlpha);
}
