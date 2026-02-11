// Star Particle Fragment Shader
// Round glowing points with color diversity

uniform float uBrightness;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Soft edges with gaussian-like falloff
  float radius = 0.5;
  float edge = smoothstep(radius, radius * 0.3, dist);

  // Glow effect (brighter in center)
  float glow = 1.0 - smoothstep(0.0, radius, dist);
  glow = pow(glow, 2.0);

  gl_FragColor = vec4(vColor * uBrightness, edge * glow * vAlpha * uBrightness);
}
