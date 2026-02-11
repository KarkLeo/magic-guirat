# GLSL Shaders Documentation

This directory contains GLSL shaders for string visualization and effects.

## Files

### stringVertex.glsl
**Purpose:** Vertex shader for wave deformation of string geometry

**Uniforms:**
- `uTime` (float) - Current animation time in milliseconds
- `uAmplitude` (float) - Wave oscillation amplitude (0.0 - 1.0)
  - Depends on sound intensity
  - 0.0 = no oscillation, 1.0 = maximum oscillation
- `uFrequency` (float) - Wave frequency (usually 0.5 - 3.0)
  - Can be linked to note pitch
  - Larger values = faster oscillations
- `uDamping` (float) - Damping coefficient (1.0 - 2.0)
  - Determines how quickly oscillations decay
  - Smaller value = slower decay
- `uAttackTime` (float) - Oscillation start time in milliseconds
  - Used to calculate decay
  - Updates with each new string strike

**Varyings:**
- `vUv` (vec2) - UV coordinates for fragment shader
- `vIntensity` (float) - Decay intensity (1.0 → 0.0 over time)

**Algorithm:**
1. Wave created by `sin(position.x * frequency + time)`
2. Decay computed as `exp(-damping * timeSinceAttack)`
3. Vertical displacement = `amplitude * wave * decay`

---

### stringFragment.glsl
**Purpose:** Enhanced fragment shader for gradient color with advanced glow effects

**Uniforms:**
- `uColorStart` (vec3) - RGB gradient start color (left edge)
- `uColorEnd` (vec3) - RGB gradient end color (right edge)
- `uGlowIntensity` (float) - Glow intensity (0.0 - 3.0)
  - Depends on string activity
  - Boosted by bloom pass
- `uTime` (float) - Current time for shimmer effect (milliseconds)
- `uEdgeGlow` (float) - Fresnel edge enhancement intensity (0.0 - 1.0)
  - Recommended value: 0.3
  - Imitates light reflection on cylindrical surface

**Varyings (from vertex shader):**
- `vUv` (vec2) - UV coordinates
- `vIntensity` (float) - Decay intensity

**Algorithm:**
1. **Horizontal Gradient**: `mix(colorStart, colorEnd, uv.x)` - basic gradient along length
2. **Radial Glow**: Stronger in string center (Y axis), weaker at edges
   - `distFromCenter = abs(uv.y - 0.5) * 2.0`
   - `radialGlow = smoothstep(0.0, 1.0, 1.0 - distFromCenter)`
3. **Fresnel Effect**: Edge enhancement for realistic light reflection
   - `fresnel = pow(distFromCenter, 2.0) * uEdgeGlow * vIntensity`
4. **Shimmer Effect**: Subtle shimmer for active strings
   - `shimmer = sin(uTime * 0.003 + uv.x * 10.0) * 0.1 + 0.9`
   - Applied only to active strings via `mix(1.0, shimmer, vIntensity)`
5. **Total Glow**: Combination of all effects
   - `totalGlow = uGlowIntensity * vIntensity * radialGlow * shimmer`
6. **Final Color**: `baseColor * (1.0 + totalGlow + fresnel)`

**Visual Effects:**
- String center glows brighter than edges (radial glow)
- Edges glow via fresnel effect
- Subtle shimmer on active strings
- Smooth gradient along string length

---

## Usage in Three.js

```javascript
import vertexShader from './shaders/stringVertex.glsl?raw'
import fragmentShader from './shaders/stringFragment.glsl?raw'

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uAmplitude: { value: 0.5 },
    uFrequency: { value: 1.0 },
    uDamping: { value: 1.5 },
    uAttackTime: { value: 0.0 },
    uColorStart: { value: new THREE.Color(0x6366f1) },
    uColorEnd: { value: new THREE.Color(0xec4899) },
    uGlowIntensity: { value: 1.0 },
  },
  vertexShader,
  fragmentShader,
})

// In animation loop
material.uniforms.uTime.value = performance.now()
```

---

## Parameter Tuning

### For slow decay (sustain)
```javascript
uDamping: 0.8  // smaller = slower decay
uAmplitude: 0.7
```

### For fast decay (staccato)
```javascript
uDamping: 2.0  // larger = faster decay
uAmplitude: 0.4
```

### For linking to pitch detection
```javascript
// Wave frequency proportional to note pitch
const noteFreq = detectedFrequency // Hz
const normalizedFreq = (noteFreq - 80) / (400 - 80) // normalize
uFrequency: 0.5 + normalizedFreq * 2.5 // 0.5 - 3.0
```

---

## Performance Notes

- Vertex shader executes for each geometry vertex
- Fragment shader executes for each pixel
- For optimization: use low-polygon string geometry (16 segments sufficient)
- `exp()` function is relatively expensive, but decay computed only once per vertex

---

## Troubleshooting

**Problem:** Strings don't oscillate
- Check that `uTime` updates each frame
- Ensure `uAmplitude > 0`
- Verify `uAttackTime` updates on string activation

**Problem:** Too fast/slow decay
- Adjust `uDamping` (1.0 - 2.0 is optimal range)

**Problem:** No bloom effect
- Increase `uGlowIntensity` (> 1.5)
- Check UnrealBloomPass settings (threshold should be < 0.3)

---

## Roadmap

### Sprint 5 (planned)
- Harmonics: add multiple waves at different frequencies
- Enhanced physics: account for string stiffness
- Amplitude variation along string length

### Sprint 6 (planned)
- Particle vertex/fragment shaders
- Ghost trails effect shader
