// Vertex Shader for wave-based string deformation of guitar strings
// Sprint 5 Task 1: Enhanced String Physics with Harmonics

// Uniforms - parameters passed from JavaScript
uniform float uTime;           // Current animation time (ms)
uniform float uAmplitude;      // Oscillation amplitude (0.0 - 1.0)
uniform float uFrequency;      // Wave frequency (depends on note)
uniform float uDamping;        // Damping coefficient (1.0 - 2.0)
uniform float uAttackTime;     // Oscillation start time (ms)
uniform float uSpeed;          // Oscillation speed (depends on tempo)

// Varying - pass to fragment shader
varying vec2 vUv;              // UV coordinates for texturing
varying float vIntensity;      // Intensity for color decay

void main() {
  // Pass UV coordinates to fragment shader
  vUv = uv;

  // Copy vertex position
  vec3 pos = position;

  // Calculate time since string was struck (in seconds)
  float timeSinceAttack = max(0.0, (uTime - uAttackTime) * 0.001);

  // === REALISTIC OSCILLATION MODEL WITH HARMONICS ===
  // A real string oscillates as a superposition of multiple frequencies (fundamental + overtones)
  // The wave propagates ALONG the string (pos.y — cylinder length axis)

  // Fundamental frequency (first harmonic)
  float wave1 = sin(pos.y * uFrequency + uTime * 0.018 * uSpeed);

  // Second harmonic (octave higher, smaller amplitude)
  float wave2 = sin(pos.y * uFrequency * 2.0 + uTime * 0.018 * uSpeed * 1.5) * 0.3;

  // Third harmonic (fifth, even smaller amplitude)
  float wave3 = sin(pos.y * uFrequency * 3.0 + uTime * 0.018 * uSpeed * 2.0) * 0.15;

  // Sum all harmonics for rich sound
  float combinedWave = wave1 + wave2 + wave3;

  // === THREE-PHASE ENVELOPE MODEL (ATTACK → SUSTAIN → RELEASE) ===

  // Attack phase: rapid rise (0 → 1 over ~50ms)
  float attackDuration = 0.05;
  float attackPhase = smoothstep(0.0, attackDuration, timeSinceAttack);

  // Sustain + Release phase: exponential decay
  // Guitar strings are characterized by slow decay (2-4 seconds)
  float sustainDecay = exp(-uDamping * timeSinceAttack);

  // Combined envelope: attack * sustain
  // This gives a natural profile:
  // - Rapid rise at the beginning
  // - Smooth decay after peak
  float envelope = attackPhase * sustainDecay * uAmplitude;

  // === APPLY WAVE TO GEOMETRY ===
  // Vertical displacement (perpendicular to string, in world coordinates — up/down)
  // Cylinder: Y axis = length, X/Z axis = radius
  // After rotation.z = 90°: local X → world Y (vertical) ✓
  pos.x += combinedWave * envelope;

  // Pass intensity to fragment shader (for glow)
  // Use envelope to synchronize glow with oscillations
  vIntensity = sustainDecay;

  // Final position transformation
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
