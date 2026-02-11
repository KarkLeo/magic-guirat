// Nebula Fragment Shader
// Soft nebula with enhanced FBM noise and audio-reactive color shift

uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uAudioBoost;

varying vec2 vUv;

// Pseudo-noise through sin combinations
float noise(vec2 p) {
  return sin(p.x * 1.7 + p.y * 3.1) * sin(p.y * 2.3 - p.x * 1.1) * 0.5 + 0.5;
}

// FBM (Fractal Brownian Motion) - layered noise
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p * frequency + uTime * 0.00003 * float(i + 1));
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 center = vUv - 0.5;
  float dist = length(center);

  // Radial falloff
  float falloff = 1.0 - smoothstep(0.0, 0.5, dist);
  falloff = pow(falloff, 1.5);

  // Enhanced noise with FBM + slow time evolution
  float n1 = fbm(vUv * 3.0 + uTime * 0.00005);
  float n2 = fbm(vUv * 5.0 - uTime * 0.00003);
  // Third layer: very slow large-scale evolution
  float n3 = noise((vUv + uTime * 0.00002) * 2.0);
  float noiseVal = mix(mix(n1, n2, 0.5), n3, 0.3);

  // Color shift on audio peaks (slight warm shift)
  vec3 finalColor = uColor;
  finalColor += vec3(0.15, 0.05, -0.05) * uAudioBoost;

  // Final opacity
  float alpha = falloff * noiseVal * uOpacity;

  gl_FragColor = vec4(finalColor, alpha);
}
