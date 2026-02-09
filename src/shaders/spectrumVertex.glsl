// Spectrum Vertex Shader
// UV + лёгкая волна по верхнему краю (полярное сияние)

uniform float uTime;

varying vec2 vUv;

void main() {
  vUv = uv;

  vec3 pos = position;
  float isTop = step(0.01, uv.y);
  // Мягкая волна по верхней линии — «занавес» сияния
  pos.y += sin(uTime * 0.6 + pos.x * 0.4) * 0.08 * isTop;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
