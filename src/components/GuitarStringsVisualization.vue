<template>
  <div class="guitar-visualization" role="region" aria-label="Визуализация струн гитары">
    <canvas ref="canvasRef" class="visualization-canvas" role="img" aria-label="3D визуализация шести струн гитары с анимацией свечения"></canvas>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { useSettings } from '@/composables/useSettings'
import { useFrequencyAnalyzer } from '@/composables/useFrequencyAnalyzer'

// Scene modules
import { createStarParticles, updateStars, disposeStars, recreateStars } from '@/scene/stars'
import { createNebulae, updateNebulae, disposeNebulae } from '@/scene/nebulae'
import { createSpectrumMesh, updateSpectrum, disposeSpectrum, SPECTRUM_BINS } from '@/scene/spectrum'
import { createParticleSystem, emitBurst, emitStream, updateParticles, disposeParticles, recreateParticles } from '@/scene/particles'
import { createStrings, updateStringActivation, updateStringUniforms, disposeStrings } from '@/scene/strings'
import { createGhostTrailFBO, disposeGhostTrail, recreateGhostTrailFBO } from '@/scene/ghostTrail'

const props = defineProps({
  activeStringIndices: {
    type: Array,
    default: () => [],
  },
  stringIntensities: {
    type: Object,
    default: () => ({}),
  },
  detectionMode: {
    type: String,
    default: 'single',
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  rmsLevel: {
    type: Number,
    default: 0,
  },
  analyserNode: {
    type: Object,
    default: null,
  },
})

const canvasRef = ref(null)

// Three.js core
let scene = null
let camera = null
let renderer = null
let composer = null
let bloomPass = null
let animationFrameId = null

// Subsystem data
let starsData = null
let nebulaeData = null
let spectrumData = null
let particleData = null
let ghostTrailData = null
const strings = []

// State
let smoothedAudioBoost = 0
let spectrumAnalyzer = null
let prevActiveSet = new Set()
let lastFrameTime = 0
let currentFboScale = 0.5
let currentMaxParticles = 2000
let currentNumStars = 800

const getViewportWidth = () => window.innerWidth
const getViewportHeight = () => window.innerHeight

// Settings
const { bloomIntensity, bloomThreshold, bloomRadius, ghostOpacity, ghostFadeSpeed, ghostBlur, smokeIntensity, turbulence, qualityPreset } = useSettings()

const QUALITY_CONFIGS = {
  low: { maxParticles: 500, numStars: 200, fboScale: 0.5, pixelRatio: 1.0, nebulaeEnabled: false },
  medium: { maxParticles: 1000, numStars: 500, fboScale: 0.5, pixelRatio: 1.5, nebulaeEnabled: true },
  high: { maxParticles: 2000, numStars: 800, fboScale: 0.75, pixelRatio: Math.min(window.devicePixelRatio, 2), nebulaeEnabled: true },
}

const qualityConfig = computed(() => QUALITY_CONFIGS[qualityPreset.value] || QUALITY_CONFIGS.high)

/**
 * Инициализация Three.js сцены
 */
const initThreeJS = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const qc = qualityConfig.value
  currentMaxParticles = qc.maxParticles
  currentNumStars = qc.numStars
  currentFboScale = qc.fboScale

  const w = getViewportWidth()
  const h = getViewportHeight()

  // Scene + Camera
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0f0c29)

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
  camera.position.set(0, 0, 18)
  camera.lookAt(0, 0, 0)

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setSize(w, h)
  renderer.setPixelRatio(qc.pixelRatio)

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
  scene.add(ambientLight)
  const pointLight1 = new THREE.PointLight(0x667eea, 1, 100)
  pointLight1.position.set(0, 5, 10)
  scene.add(pointLight1)
  const pointLight2 = new THREE.PointLight(0xf093fb, 0.5, 100)
  pointLight2.position.set(0, -5, 10)
  scene.add(pointLight2)

  // Post-processing
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  // Ghost Trail FBO
  ghostTrailData = createGhostTrailFBO(scene, camera, w, h, currentFboScale)
  composer.addPass(ghostTrailData.savePass)
  composer.addPass(ghostTrailData.ghostTrailPass)
  composer.addPass(ghostTrailData.compositePass)

  // Bloom
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    bloomIntensity.value,
    bloomRadius.value,
    bloomThreshold.value,
  )
  composer.addPass(bloomPass)

  // Create subsystems
  starsData = createStarParticles(scene, currentNumStars)
  nebulaeData = createNebulae(scene)
  strings.push(...createStrings(scene))
  spectrumData = createSpectrumMesh(scene)
  particleData = createParticleSystem(scene, currentMaxParticles)

  // Nebulae visibility from quality config
  if (!qc.nebulaeEnabled) {
    nebulaeData.nebulae.forEach((neb) => { neb.mesh.visible = false })
  }

  // Start rendering
  lastFrameTime = performance.now()
  animate()
}

/**
 * Анимация сцены
 */
const animate = () => {
  if (!renderer || !scene || !camera) return

  const now = performance.now()
  const dt = Math.min((now - lastFrameTime) / 1000, 0.1)
  lastFrameTime = now

  // Strings uniforms
  updateStringUniforms(strings, now)

  // Particles physics
  updateParticles(particleData, dt)

  // Stream emission for active strings
  if (props.isActive) {
    const activeSet = new Set(props.activeStringIndices)
    strings.forEach((string) => {
      const ud = string.userData
      if (activeSet.has(ud.stringIndex)) {
        const intensity = Math.max(0, Math.min(1, props.stringIntensities[ud.stringIndex] || 0.7))
        emitStream(particleData, strings, ud.arrayIndex, intensity, dt)
      }
    })
  }

  // Audio reactivity
  const rms = props.rmsLevel || 0
  const audioBoost = Math.min(rms * 3, 1.0)
  const lerpFactor = audioBoost > smoothedAudioBoost ? 0.15 : 0.03
  smoothedAudioBoost += (audioBoost - smoothedAudioBoost) * lerpFactor

  // Stars
  updateStars(starsData, now, smoothedAudioBoost)

  // Nebulae
  updateNebulae(nebulaeData, now, smoothedAudioBoost)

  // Spectrum
  if (spectrumData && spectrumAnalyzer) {
    const freqData = spectrumAnalyzer.getFrequencySpectrum(82, 1200, SPECTRUM_BINS)
    updateSpectrum(spectrumData, freqData, now, smoothedAudioBoost)
  }

  // Render
  if (composer) {
    composer.render()
  } else {
    renderer.render(scene, camera)
  }

  animationFrameId = requestAnimationFrame(animate)
}

/**
 * Обновляет свечение и колебания струн
 */
const onStringsUpdate = () => {
  prevActiveSet = updateStringActivation(strings, props, prevActiveSet, (arrayIndex, intensity) => {
    emitBurst(particleData, strings, arrayIndex, intensity)
  })
}

/**
 * Обработка изменения размера окна
 */
const handleResize = () => {
  if (!camera || !renderer) return

  const width = getViewportWidth()
  const height = getViewportHeight()

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)

  if (ghostTrailData) {
    if (ghostTrailData.fullSceneRT) ghostTrailData.fullSceneRT.setSize(width, height)
    if (ghostTrailData.ghostTrailPass) ghostTrailData.ghostTrailPass.setSize(width, height)
  }

  if (composer) composer.setSize(width, height)
}

// Watch: string activation
watch(
  () => [props.activeStringIndices, props.stringIntensities, props.detectionMode, props.isActive],
  onStringsUpdate,
  { deep: true },
)

// Watch: spectrum analyzer
watch(
  () => props.analyserNode,
  (node) => {
    if (node && !spectrumAnalyzer) {
      spectrumAnalyzer = useFrequencyAnalyzer(node)
      spectrumAnalyzer.startAnalysis()
    } else if (!node && spectrumAnalyzer) {
      spectrumAnalyzer.stopAnalysis()
      spectrumAnalyzer = null
      if (spectrumData) spectrumData.smoothedSpectrum.fill(0)
    }
  },
)

// Watchers: bloom settings
watch(bloomIntensity, (v) => { if (bloomPass) bloomPass.strength = v })
watch(bloomThreshold, (v) => { if (bloomPass) bloomPass.threshold = v })
watch(bloomRadius, (v) => { if (bloomPass) bloomPass.radius = v })

// Watchers: ghost trail settings
watch(ghostOpacity, (v) => { if (ghostTrailData?.ghostTrailPass) ghostTrailData.ghostTrailPass.setOpacity(v) })
watch(ghostFadeSpeed, (v) => { if (ghostTrailData?.ghostTrailPass) ghostTrailData.ghostTrailPass.setFadeSpeed(v) })
watch(ghostBlur, (v) => { if (ghostTrailData?.ghostTrailPass) ghostTrailData.ghostTrailPass.setBlurAmount(v) })
watch(smokeIntensity, (v) => { if (ghostTrailData?.ghostTrailPass) ghostTrailData.ghostTrailPass.setSmokeIntensity(v) })
watch(turbulence, (v) => { if (ghostTrailData?.ghostTrailPass) ghostTrailData.ghostTrailPass.setTurbulence(v) })

// Watch: quality preset
watch(qualityPreset, (newPreset) => {
  const qc = QUALITY_CONFIGS[newPreset] || QUALITY_CONFIGS.high

  if (renderer) renderer.setPixelRatio(qc.pixelRatio)

  if (qc.maxParticles !== currentMaxParticles) {
    currentMaxParticles = qc.maxParticles
    particleData = recreateParticles(scene, particleData, currentMaxParticles)
  }

  if (qc.numStars !== currentNumStars) {
    currentNumStars = qc.numStars
    starsData = recreateStars(scene, starsData, currentNumStars)
  }

  if (qc.fboScale !== currentFboScale) {
    currentFboScale = qc.fboScale
    const oldData = ghostTrailData
    ghostTrailData = recreateGhostTrailFBO(
      composer, scene, camera, currentFboScale,
      () => ({ width: getViewportWidth(), height: getViewportHeight() }),
    )
    // oldData passes already disposed inside recreateGhostTrailFBO
    if (!ghostTrailData) ghostTrailData = oldData
  }

  if (nebulaeData) {
    nebulaeData.nebulae.forEach((neb) => { neb.mesh.visible = qc.nebulaeEnabled })
  }

  handleResize()
})

// Lifecycle
onMounted(() => {
  initThreeJS()
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)

  // Dispose subsystems
  disposeStars(scene, starsData)
  disposeNebulae(scene, nebulaeData)
  disposeSpectrum(scene, spectrumData)
  disposeParticles(scene, particleData)
  disposeStrings(scene, strings)
  disposeGhostTrail(ghostTrailData)

  if (spectrumAnalyzer) {
    spectrumAnalyzer.stopAnalysis()
    spectrumAnalyzer = null
  }

  if (composer) {
    composer.dispose()
    composer = null
  }

  if (renderer) {
    renderer.dispose()
  }
})
</script>

<style scoped>
.guitar-visualization {
  position: fixed;
  inset: 0;
  z-index: 0;
}

.visualization-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
