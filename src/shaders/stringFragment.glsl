// Fragment Shader for gradient color and string glow
// Sprint 4 Task 3: Enhanced String Color Gradient with Advanced Glow
// Enhanced version with radial glow, fresnel effect and shimmer

// Uniforms
uniform vec3 uColorStart;       // Gradient start color (left edge)
uniform vec3 uColorEnd;         // Gradient end color (right edge)
uniform float uGlowIntensity;   // Glow intensity (0.0 - 3.0)
uniform float uTime;            // Time for shimmer effect
uniform float uEdgeGlow;        // Edge glow intensity (0.0 - 1.0)

// Varying - receive from vertex shader
varying vec2 vUv;
varying float vIntensity;       // Intensity from string decay

void main() {
  // 1. Horizontal gradient along string length (X axis)
  vec3 baseColor = mix(uColorStart, uColorEnd, vUv.x);

  // 2. Radial Glow - stronger glow in center of string (Y axis)
  // vUv.y: 0.0 at edges, 0.5 in center
  float distFromCenter = abs(vUv.y - 0.5) * 2.0; // 0.0 in center, 1.0 at edges
  float radialGlow = 1.0 - distFromCenter; // 1.0 in center, 0.0 at edges

  // Apply smoothstep for soft transition
  radialGlow = smoothstep(0.0, 1.0, radialGlow);

  // 3. Fresnel-like Edge Enhancement - edges glow brighter
  // Imitate light reflection on cylindrical surface
  float edgeIntensity = pow(distFromCenter, 2.0); // stronger at edges
  float fresnel = edgeIntensity * uEdgeGlow * vIntensity;

  // 4. Shimmer Effect - subtle shimmer for active strings
  // Use vUv.x for spatial variation
  float shimmer = sin(uTime * 0.003 + vUv.x * 10.0) * 0.1 + 0.9; // 0.8 - 1.0
  shimmer = mix(1.0, shimmer, vIntensity); // shimmer only for active strings

  // 5. Combine all glow effects
  float totalGlow = uGlowIntensity * vIntensity * radialGlow * shimmer;

  // 6. Final color without overexposure: soft brightness limit
  vec3 finalColor = baseColor * (1.0 + totalGlow + fresnel);
  finalColor = finalColor / (1.0 + finalColor * 0.5);

  gl_FragColor = vec4(finalColor, 1.0);
}
