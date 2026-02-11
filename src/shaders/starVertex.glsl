// Star Particle Vertex Shader
// Drift, twinkle with per-star speed, color diversity

attribute float aAlpha;
attribute float aSize;
attribute float aTwinkleOffset;
attribute float aTwinkleSpeed;
attribute vec3 aColor;

uniform float uTime;
uniform float uSpeed;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vColor = aColor;

  // Twinkling: per-star speed variation + periodic bright flashes
  float twinkleBase = sin(uTime * 0.001 * aTwinkleSpeed + aTwinkleOffset) * 0.5 + 0.5;
  // Occasional bright flash (sharp peak every ~8 seconds)
  float flashPhase = uTime * 0.00012 * aTwinkleSpeed + aTwinkleOffset;
  float flash = pow(max(sin(flashPhase), 0.0), 12.0); // Sharp spike
  float twinkle = twinkleBase + flash * 0.5;
  twinkle = min(twinkle, 1.0);

  float twinkleIntensity = 0.4; // 40% amplitude (was 30%)
  float finalAlpha = aAlpha * (1.0 - twinkleIntensity + twinkleIntensity * twinkle);
  vAlpha = finalAlpha;

  // Slow drift
  vec3 driftOffset = vec3(
    sin(uTime * 0.0002 * uSpeed + aTwinkleOffset) * 0.5,
    cos(uTime * 0.00015 * uSpeed + aTwinkleOffset * 1.3) * 0.5,
    0.0
  );

  vec3 driftedPosition = position + driftOffset;

  vec4 mvPosition = modelViewMatrix * vec4(driftedPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size with twinkling + flash boost
  float sizeVariation = 0.8 + 0.2 * twinkle + flash * 0.3;
  gl_PointSize = aSize * sizeVariation * (300.0 / -mvPosition.z);
}
