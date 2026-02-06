# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Magic Guitar** — real-time guitar visualization web app. Captures audio via microphone, detects pitch using YIN autocorrelation, recognizes chords via chromagram analysis, and visualizes with Three.js WebGL.

**Tech Stack:** Vue 3 (Composition API) + Vite + Three.js + Web Audio API + TypeScript

---

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run tests (Vitest)
npm test              # Watch mode
npm run test:run      # Single run
npm run test:ui       # UI mode
npm run test:coverage # Coverage report

# Linting & Formatting
npm run lint          # ESLint with auto-fix
npm run format        # Prettier
npm run type-check    # TypeScript check (no emit)
```

**Node Version:** `^20.19.0 || >=22.12.0` (see package.json engines)

---

## Architecture Overview

### Audio Processing Pipeline

```
Microphone → AudioContext → AnalyserNode → [YIN Algorithm | Chromagram] → Pitch/Chord Detection → Guitar String Mapping → Three.js Visualization
```

**Two parallel analysis paths:**

1. **Single Note (YIN):** `useFrequencyAnalyzer` → YIN autocorrelation on time-domain data → frequency → guitar string mapping
2. **Chords (Chromagram):** `useChromaAnalyzer` → FFT bins aggregated into 12 pitch classes → `useChordRecognition` → chord matching

### Key Composables (State Management)

- **`useAudioCapture`** — microphone access, AudioContext, MediaStream management
- **`useFrequencyAnalyzer`** — YIN pitch detection + spectrum visualization (parallel buffers: `getFloatTimeDomainData` for YIN, `getByteFrequencyData` for spectrum)
- **`useChromaAnalyzer`** — chromagram analysis (FFT → 12 pitch classes), threshold-based activation
- **`useChordRecognition`** — chord matching with 3-frame stabilization (~50ms), detects when ≥2 pitch classes active
- **`useSettings`** — singleton settings store (microphone selection, noise threshold, bloom parameters), localStorage persistence
  - Returns: selectedDeviceId, noiseThreshold, bloomIntensity, bloomThreshold, bloomRadius

### Main Components

- **`AudioAnalyzerView.vue`** — orchestrator component, manages audio capture, switches between single/chord detection modes
- **`GuitarStringsVisualization.vue`** — Three.js WebGL scene, renders 6 guitar strings with emissive materials, particle system (2000 particles max, burst + stream emissions)
- **`ChordNameDisplay.vue`** — displays detected chord with gradient text, confidence bar, alternative chord suggestions
- **`FrequencySpectrumVisualizer.vue`** — canvas-based spectrum bars (50 bars)
- **`SettingsPanel.vue`** — modal for microphone selection, noise threshold, and bloom effect controls (bloomIntensity, bloomThreshold, bloomRadius)

### Utilities & Data

- **`src/utils/guitarMapping.ts`** — maps frequencies to guitar strings using **semitone distance** `12 * Math.log2(f1/f2)` (NOT absolute Hz difference)
- **`src/utils/noteUtils.ts`** — NOTE_NAMES, pitch class ↔ note name conversions
- **`src/data/chordDatabase.ts`** — chord templates (10 types: major, minor, dom7, maj7, min7, sus2, sus4, dim, aug, power), `lookupChord()` scoring function
- **`src/constants/colors.ts`** — centralized color palette (COLORS, GRADIENTS, ColorUtils) for consistent theming
- **`src/shaders/`** — GLSL shaders directory
  - `stringVertex.glsl` — wave oscillation with exponential decay
  - `stringFragment.glsl` — gradient colors with radial glow, fresnel, shimmer effects

---

## Critical Implementation Details

### Pitch Detection (YIN Algorithm)

- Uses **time-domain data** (`getFloatTimeDomainData`), NOT FFT
- YIN autocorrelation provides **real confidence** (1 - cmndf[tau]), NOT audio level based
- **Confidence threshold:** 0.3 minimum for string mapping
- YIN threshold: 0.15, with fallback to global minimum if nothing below threshold

### Chromagram for Chords

- Aggregates FFT bins into **12 pitch classes** (0-11), solving coarse bin resolution problem for bass frequencies
- Separate from YIN — different data domains (frequency vs time)
- Threshold: 0.3 for pitch class activation

### Chord Recognition

- **Scoring:** 12 roots × 10 chord templates, penalties for missing/extra notes, bonus for chromagram root strength
- **Stabilization:** 3-frame consensus (~50ms) prevents flickering between chord candidates
- **Auto mode switching:** `detectionMode = 'chord'` when ≥2 pitch classes + chord found, else `'single'`

### Guitar String Mapping

- **Standard tuning:** E2 (82.41 Hz), A2 (110 Hz), D3 (146.83 Hz), G3 (196 Hz), B3 (246.94 Hz), E4 (329.63 Hz)
- **Critical:** Always use **semitone distance** for frequency comparison in musical contexts, NOT Hz difference
- Confidence filtering: only map notes with confidence ≥ 0.3

### Three.js Visualization

- **Post-Processing:** EffectComposer with UnrealBloomPass for magical glow effect
  - bloomIntensity (0.5-3.0): controls strength of bloom
  - bloomThreshold (0.0-1.0): brightness threshold for bloom activation
  - bloomRadius (0.0-1.0): blur radius of bloom effect
  - All parameters user-adjustable via SettingsPanel, persisted to localStorage
- **Guitar Strings:** CylinderGeometry with ShaderMaterial
  - Custom vertex shader: wave oscillation with exponential decay based on attack time
  - Custom fragment shader: gradient colors (light→dark), radial glow, fresnel edge lighting, shimmer animation
  - Wave frequency unique per string (1.0 + index * 0.15)
- **Particle System:** Pool-based (2000 max), GPU-optimized (Float32Array buffers), shader-based rendering
  - Burst emission: ~50 particles on string attack
  - Stream emission: 18 particles/sec for active strings
  - Custom vertex/fragment shaders with additive blending
  - Smoothstep alpha/size interpolation for longer brightness
- **Chord Visualization:** THREE.Line connecting active strings, per-string intensity from chromagram

---

## Common Patterns & Conventions

### Composables Cleanup

- Composables called inside `computed()` cannot use `onUnmounted`
- Use explicit cleanup functions: `stopAnalysis()`, `stopCapture()`
- Always cleanup Three.js objects: `geometry.dispose()`, `material.dispose()`, `scene.remove(mesh)`

### Reactive State

- Use `ref()` for Three.js objects that need reactivity
- Prefer `computed()` for derived audio state (e.g., `detectionMode`, `activeStringIndices`)
- Watch audio data streams with throttling/debouncing where appropriate

### TypeScript Migration (In Progress)

- New files: write in TypeScript
- Existing files: gradually migrate (composables and utils prioritized)
- Types defined in `src/types/index.ts`

### Testing

- Vitest for unit tests
- Test files: `*.test.ts` alongside source files
- Coverage for critical audio/chord logic (see `useFrequencyAnalyzer.test.ts`, `chordDatabase.test.ts`)

---

## Performance Considerations

- **Target:** 60 FPS on desktop, 55+ FPS on laptop
- **Particle System:** GPU-optimized via Float32Array buffers, circular ring buffer for emission
- **Audio Analysis:** Runs in animation frame loop, use lerp (0.3) for smooth spectrum transitions
- **Avoid:** Frequent geometry creation/disposal, use object pooling (e.g., particle pool)

---

## Known Constraints

- **Essentia.js:** Installed but disabled due to WASM loading issues, YIN algorithm implemented manually
- **FFT Bin Resolution:** ~11.7 Hz at 48kHz/4096 fftSize — too coarse for bass frequencies → solved via chromagram aggregation
- **Cleanup in Composables:** Cannot use `onUnmounted` in composables called from `computed()` — use explicit cleanup functions

---

## Project Documentation

- **`.memory/README.md`** — documentation system overview
- **`.memory/currentWork.md`** — current sprint status (Sprint 4 ✅ complete, Sprint 5+ planned)
- **`.memory/progress.md`** — detailed progress tracker for completed sprints
- **`.memory/backlog.md`** — sprint backlog and task planning
- **`.memory/currentInput.md`** — user ideas and task descriptions
- **`.memory/visualDesignSpec.md`** — full visual design specification for visual overhaul
- **`MEMORY.md` (auto-memory)** — key architectural decisions and lessons learned

---

## Idioms & Best Practices

1. **Always use semitone distance** for musical frequency comparisons, not Hz difference
2. **Chromagram solves FFT resolution issues** for chord detection — aggregate bins into 12 pitch classes
3. **Stabilization prevents UI flicker** — use 3-frame consensus for chord changes
4. **YIN for single notes, Chromagram for chords** — different data domains, keep separate
5. **Confidence threshold 0.3** for both pitch detection and chromagram activation
6. **Cleanup is critical** — dispose Three.js objects, stop audio analysis on component unmount
7. **GPU optimization** — use Float32Array for particle buffers, shader-based rendering

---

## Accessibility & UX

- Responsive breakpoints: 768px (tablet), 480px (mobile)
- ARIA labels for interactive elements
- `prefers-reduced-motion` support for animations
- Focus-visible states for keyboard navigation
- Settings panel for microphone selection and sensitivity adjustment (localStorage persistence)

---

## Future Roadmap (Sprints 5+)

Visual overhaul with advanced WebGL effects (Sprint 4 ✅ complete):

**✅ Sprint 4 (DONE):**
- Post-processing pipeline (EffectComposer + UnrealBloomPass)
- GLSL shaders for strings (wave oscillation, radial glow, fresnel, shimmer)
- Centralized color palette (COLORS, GRADIENTS, ColorUtils)
- Bloom settings UI (threshold, radius, intensity controls)

**⏳ Sprint 5 (Planned):**
- Ghost trails effect (FBO accumulation)
- Enhanced string physics and decay

**⏳ Sprint 6+:**
- Background particles (cosmic dust), nebula effects
- Continuous spectrum visualizer (replace bar chart)
- UI refresh, particle bursts on attack, ripple effects
- Performance optimization, adaptive quality settings

See `.memory/progress.md` and `.memory/visualDesignSpec.md` for detailed information.
