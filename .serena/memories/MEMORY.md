# Magic Guitar - Auto Memory

## Project Overview
Vue 3 + Vite web app for real-time guitar visualization. Captures audio via microphone, detects pitch, maps to guitar strings, visualizes with Three.js.

## Key Architecture Decisions
- **Pitch detection**: YIN autocorrelation on time-domain data (`getFloatTimeDomainData`), NOT FFT/HPS
- **Spectrum visualization**: separate `getByteFrequencyData` buffer (parallel to YIN)
- **String comparison**: semitone distance `12 * Math.log2(f1/f2)`, NOT absolute Hz difference
- **Confidence**: real YIN confidence (1 - cmndf[tau]), NOT audio level based
- **Confidence threshold**: 0.3 minimum for string mapping
- **Essentia.js**: installed but disabled (WASM loading issues)

## File Map
- `src/composables/useFrequencyAnalyzer.js` - YIN pitch detection + spectrum data
- `src/composables/useAudioCapture.js` - microphone capture, AudioContext
- `src/composables/useChromaAnalyzer.js` - chromagram from FFT, activePitchClasses
- `src/composables/useChordRecognition.js` - chord matching + 3-frame stabilization
- `src/composables/usePitchDetector.js` - legacy Essentia.js wrapper (disabled)
- `src/composables/useSettings.ts` - singleton settings store + localStorage (selectedDeviceId, noiseThreshold, bloomIntensity, bloomThreshold, bloomRadius)
- `src/utils/guitarMapping.ts` - frequency-to-string mapping (semitone distance)
- `src/utils/noteUtils.ts` - NOTE_NAMES, pitch class conversions
- `src/data/chordDatabase.ts` - chord templates + lookupChord() scoring
- `src/components/AudioAnalyzerView.vue` - main orchestrator, fullscreen scene with overlays
- `src/components/GuitarStringsVisualization.vue` - Three.js visualization + EffectComposer, UnrealBloomPass, ShaderMaterial for strings
- `src/components/ChordNameDisplay.vue` - chord name UI with gradient text
- `src/components/FrequencySpectrumVisualizer.vue` - canvas spectrum bars
- `src/components/SettingsPanel.vue` - modal settings (mic, threshold, bloom controls)
- `src/components/AudioCaptureButton.vue` - microphone capture trigger
- `src/constants/colors.ts` - цветовая палитра (COLORS, GRADIENTS, COLORS_RGB, ColorUtils)
- `src/constants/index.ts` - barrel export констант
- `src/shaders/stringVertex.glsl` - vertex shader: волнообразная деформация с затуханием
- `src/shaders/stringFragment.glsl` - fragment shader: градиенты + radial glow + fresnel + shimmer
- `.memory/README.md` - documentation system overview
- `.memory/currentWork.md` - current sprint status
- `.memory/progress.md` - completed sprints progress tracker
- `.memory/backlog.md` - sprint backlog
- `.memory/visualDesignSpec.md` - visual design specification

## Sprint Status
- Sprint 0: DONE (init, deps)
- Sprint 1: DONE (audio capture, pitch detection, string viz, UI polish, sound-to-string fix)
- Sprint 2: DONE (chromagram, chord recognition, multi-string viz, chord display)
- SETTINGS-1: DONE (settings panel, mic selection, noise threshold slider, localStorage persistence)
- Sprint 4: DONE (post-processing, shaders, visual overhaul) - 100% done
- Sprint 5: DONE (layout restructure) ✅
  - Fullscreen Three.js scene (AudioAnalyzerView)
  - Logo overlay (top-left)
  - Settings button overlay (top-right)
  - Chord detection & spectrum as integrated components
  - Removed header/footer/complex gradients

## Key Architecture Decisions (Sprint 2)
- **Chromagram**: separate composable from YIN — different data domain (frequency vs time)
- **Chord detection**: chromagram → activePitchClasses → lookupChord() scoring → 3-frame stabilization
- **Auto mode switching**: `detectionMode` = 'chord' when ≥2 pitch classes + chord found, else 'single'
- **YIN preserved** for single-note (better accuracy), chromagram for chords
- **GuitarStringsVisualization**: now accepts `activeStringIndices` (Array) + `stringIntensities` (Object)

## Layout Architecture (Sprint 5)
- **App.vue**: Overlay container with fixed positioning
  - AudioAnalyzerView: fullscreen (100vw × 100vh) background
  - app-logo: fixed top-left, gradient text with glow
  - settings-btn: fixed top-right, semi-transparent button with backdrop blur
  - SettingsPanel: modal overlay
- **AudioAnalyzerView**: Fullscreen scene manager
  - AudioCaptureButton: trigger for microphone capture
  - GuitarStringsVisualization: Three.js guitar strings (50% viewport height)
  - FrequencySpectrumVisualizer: canvas spectrum (25% viewport height, bottom)
  - ChordNameDisplay: overlay above spectrum

## Lessons Learned
- HPS algorithm on FFT data has too coarse resolution for bass guitar frequencies (~11.7 Hz binWidth at 48kHz/4096 fftSize)
- YIN threshold 0.15 works well for guitar; fallback to global minimum if nothing below threshold
- Always use semitone distance for frequency comparison in musical contexts
- `useFrequencyAnalyzer` is called inside `computed()` — cannot use `onUnmounted`, cleanup via `stopAnalysis()`
- Chromagram: aggregate FFT bins into 12 pitch classes solves coarse binWidth problem for chords
- Chord stabilization (3 frames ~50ms) prevents flickering between chord candidates
- **Sprint 4 - Post-processing:** EffectComposer from three.js/examples stable without extra deps; bloom threshold 0.15 works well with emissive materials (струны); always update composer.setSize() on resize; cleanup composer in onUnmounted()
- **Sprint 4 - Shaders:** ShaderMaterial replaces MeshStandardMaterial; Vite supports `.glsl?raw` import; vertex shader: `sin(pos.x * freq + time) * exp(-damping * t)` for wave with decay; fragment shader: `mix(colorStart, colorEnd, uv.x)` for gradient; uAttackTime updates on new activation for decay reset; lerp uniforms (0.15-0.2) for smooth transitions; unique frequency per string (1.0 + index * 0.15)
- **Sprint 4 - Fragment enhancements:** radial glow via `smoothstep(0, 1, 1 - abs(uv.y - 0.5) * 2)` creates 3D depth; fresnel edge via `pow(distFromCenter, 2) * uEdgeGlow`; shimmer via `sin(uTime * 0.003 + uv.x * 10) * 0.1 + 0.9` only on active strings; combined glow = `intensity * radialGlow * shimmer`; all effects in single pass for performance
- **Sprint 4 - Bloom settings:** bloomThreshold (0.0-1.0, default 0.15) controls which pixels bloom; bloomRadius (0.0-1.0, default 0.8) controls blur size; both settings persisted to localStorage; bloomIntensity (0.5-3.0) controls overall strength; all three params updated via watchers on GuitarStringsVisualization's bloomPass
- **Sprint 5 - Layout:** Fullscreen scene (100vw × 100vh) with overlay controls via fixed positioning; AudioAnalyzerView fullscreen background; elements layer above; background simplified (no complex gradients); cleaner component structure
