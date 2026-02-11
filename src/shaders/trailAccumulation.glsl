// Trail Accumulation Shader — Ghost Trails FBO Effect
// Swirling smoke effect with wave motion in still space

uniform sampler2D tDiffuse; // Current frame (strings)
uniform sampler2D tPrevious; // Previous accumulated frame
uniform float uFadeSpeed; // Fade speed (0.03 - 0.15)
uniform float uOpacity; // Overall trail transparency (0.0 - 1.0)
uniform vec2 uDriftOffset; // Base UV offset (usually 0,0)
uniform vec2 uResolution; // Resolution for blur
uniform float uBlurAmount; // Blur intensity (0.0 - 2.0)
uniform float uTime; // Time for wave animation
uniform float uSmokeIntensity; // Wave intensity (0.0 - 2.0)
uniform float uTurbulence; // Smoke turbulence (0.0 - 1.0)

varying vec2 vUv;

// Simple noise function for swirling smoke
float noise(vec2 p) {
  return sin(p.x * 10.0) * sin(p.y * 10.0);
}

// Simplified FBM with 2 octaves (sufficient for smoke effect, -50% trig ops)
float fbm(vec2 p) {
  float value = 0.5 * noise(p);
  value += 0.25 * noise(p * 2.0);
  return value;
}

// Function for creating wave motion of smoke
vec2 smokeWave(vec2 uv, float time) {
  // Upward movement must be constant for feedback loop,
  // not infinitely growing from time
  float upward = 0.002;

  // Horizontal wave oscillations (using sin for cyclicity)
  float waveX = sin(uv.y * 8.0 + time * 2.0) * 0.005;

  // Swirling motion (turbulence) — time is OK here since noise is cyclic or random
  float turbulenceX = fbm(vec2(uv.x * 3.0, uv.y * 2.0 + time * 0.5)) * 0.008;
  float turbulenceY = fbm(vec2(uv.x * 2.0, uv.y * 3.0 + time * 0.4)) * 0.005;

  // Combine motions
  // For smoke to move UP, we must sample previous frame slightly BELOW
  return vec2(waveX + turbulenceX, -upward + turbulenceY);
}

// Simple 3x3 box blur
vec4 boxBlur(sampler2D tex, vec2 uv, vec2 pixelSize, float blurAmount) {
  vec4 result = vec4(0.0);
  float total = 0.0;
  float w[9];
  w[0] = 1.0;
  w[1] = 2.0;
  w[2] = 1.0;
  w[3] = 2.0;
  w[4] = 4.0;
  w[5] = 2.0;
  w[6] = 1.0;
  w[7] = 2.0;
  w[8] = 1.0;
  int idx = 0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 off = vec2(float(x), float(y)) * pixelSize * blurAmount;
      result += texture2D(tex, uv + off) * w[idx];
      total += w[idx];
      idx++;
    }
  }
  return result / total;
}

void main() {
  vec4 current = texture2D(tDiffuse, vUv);
  vec2 pixelSize = 1.0 / uResolution;

  // Apply wave motion of smoke to UV coordinates
  vec2 smokeOffset = smokeWave(vUv, uTime) * uSmokeIntensity;
  vec2 animatedUv = vUv + uDriftOffset + smokeOffset;

  // Add additional turbulence
  vec2 turbulence = vec2(
    sin(uTime * 3.0 + vUv.x * 5.0) * uTurbulence * 0.005,
    cos(uTime * 2.0 + vUv.y * 4.0) * uTurbulence * 0.003
  );
  animatedUv += turbulence;

  vec4 previous = boxBlur(tPrevious, animatedUv, pixelSize, uBlurAmount);

  // Fade accumulated frame
  float fade = 1.0 - uFadeSpeed;
  previous.rgb *= fade;
  previous.a *= fade;

  // Simple additive accumulation: current strings + fading trail
  // Without Reinhard and trailMask — they broke accumulation with oscillation
  // CompositeFullSceneWithGhostPass does screen blend at final stage
  vec3 blendedColor = current.rgb + previous.rgb * uOpacity;

  float finalAlpha = max(current.a, previous.a * uOpacity);
  gl_FragColor = vec4(blendedColor, finalAlpha);
}
