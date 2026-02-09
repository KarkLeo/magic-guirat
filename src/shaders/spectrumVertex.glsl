// Spectrum Vertex Shader
// Passthrough с UV + secondary wave animation

uniform float uTime;

varying vec2 vUv;

void main() {
  vUv = uv;

  vec3 pos = position;

  // Secondary wave: еле заметные вторичные волны на верхних вершинах
  float isTop = step(0.01, uv.y); // 1.0 для верхних вершин
  pos.y += sin(uTime * 0.8 + pos.x * 0.5) * 0.15 * isTop;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
