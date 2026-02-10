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
import { GUITAR_STRINGS, TOTAL_STRINGS } from '@/utils/guitarMapping'
import { ColorUtils } from '@/constants'
import { useSettings } from '@/composables/useSettings'
import { GhostTrailPass } from '@/utils/GhostTrailPass'
import {
  SaveFullSceneAndRenderStringsOnlyPass,
  CompositeFullSceneWithGhostPass,
} from '@/utils/ComposerHelperPasses'
// Импортируем шейдеры как raw строки
import stringVertexShader from '@/shaders/stringVertex.glsl?raw'
import stringFragmentShader from '@/shaders/stringFragment.glsl?raw'
import starVertexShader from '@/shaders/starVertex.glsl?raw'
import starFragmentShader from '@/shaders/starFragment.glsl?raw'
import nebulaVertexShader from '@/shaders/nebulaVertex.glsl?raw'
import nebulaFragmentShader from '@/shaders/nebulaFragment.glsl?raw'
import spectrumVertexShader from '@/shaders/spectrumVertex.glsl?raw'
import spectrumFragmentShader from '@/shaders/spectrumFragment.glsl?raw'
import { useFrequencyAnalyzer } from '@/composables/useFrequencyAnalyzer'

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
    default: 'single', // 'single' | 'chord'
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  // S6-T5: Audio reactivity для фоновых эффектов
  rmsLevel: {
    type: Number,
    default: 0,
  },
  // S7: AnalyserNode для 3D спектра
  analyserNode: {
    type: Object,
    default: null,
  },
})

// Canvas ref
const canvasRef = ref(null)

// Three.js objects
let scene = null
let camera = null
let renderer = null
let composer = null // Post-processing composer
let bloomPass = null // Bloom effect pass
const strings = [] // Массив mesh'ей струн
let animationFrameId = null

// FBO система для Ghost Trails (только от струн)
let ghostTrailPass = null
let fullSceneRT = null // Хранит полный кадр для композитинга
let saveFullSceneAndRenderStringsPass = null
let compositeFullSceneWithGhostPass = null

// S6-T2: Star particle system
let starParticles = null
let starGeometry = null
let starMaterial = null
let NUM_STARS = 800
const STAR_SPREAD = 60 // Радиус распределения
let smoothedAudioBoost = 0 // Сглаженный audio boost для плавной пульсации

// S6-T3: Nebula meshes
const nebulae = [] // Массив {mesh, baseScale, breathSpeed, breathPhase}
let sharedNebulaGeometry = null // Shared geometry для всех туманностей

// S6-T4: Grid lines
let gridLines = null

// S7: Spectrum mesh
let spectrumMesh = null
let spectrumGeometry = null
let spectrumMaterial = null
let spectrumAnalyzer = null // useFrequencyAnalyzer instance
const SPECTRUM_BINS = 256
const SPECTRUM_Y_BASE = -7.6   // Точно у нижнего края экрана (чуть ниже видимой границы)
const SPECTRUM_HEIGHT = 6      // Верх растворяется в «небо»
const SPECTRUM_X_MIN = -12
const SPECTRUM_X_MAX = 12
const smoothedSpectrum = new Float32Array(SPECTRUM_BINS) // Сглаженные данные
// Pre-allocated буферы для updateSpectrumVertices (избегаем аллокаций каждый кадр)
let spectrumSmoothBuffer = null  // Float32Array(SPECTRUM_BINS) — catmull-rom output
let spectrumFinalBuffer = null   // Float32Array(SPECTRUM_BINS) — smoothSpectrumLine output

// Система частиц
let particleSystem = null
let particleGeometry = null
let particleMaterial = null
// GPU-буферы (обновляются каждый кадр)
let pPositions = null   // Float32Array(MAX_PARTICLES * 3)
let pColors = null      // Float32Array(MAX_PARTICLES * 3)
let pAlphas = null      // Float32Array(MAX_PARTICLES)
let pSizes = null       // Float32Array(MAX_PARTICLES)
// CPU-only данные
let pVelocities = null  // Float32Array(MAX_PARTICLES * 3)
let pLifetimes = null   // Float32Array(MAX_PARTICLES) — оставшееся время жизни
let pMaxLifetimes = null // Float32Array(MAX_PARTICLES) — начальное время жизни
let pAlive = null       // Uint8Array(MAX_PARTICLES)
let nextParticleIndex = 0
let prevActiveSet = new Set()
let lastFrameTime = 0
// Stream accumulator: accumulated fractional particles per string array index
const streamAccumulators = new Float32Array(TOTAL_STRINGS)

// Размеры — используем viewport
const getViewportWidth = () => window.innerWidth
const getViewportHeight = () => window.innerHeight

// Параметры струн
const STRING_LENGTH = 20 // Увеличено для струн во всю ширину экрана
const STRING_RADIUS = 0.05
const STRING_SPACING = 1.2

// Параметры системы частиц
let MAX_PARTICLES = 2000
const BURST_COUNT = 50
const STREAM_RATE = 18
const PARTICLE_LIFETIME_MIN = 1.0
const PARTICLE_LIFETIME_MAX = 2.2
const PARTICLE_BASE_SIZE = 0.38

// Настройки из useSettings
const { bloomIntensity, bloomThreshold, bloomRadius, ghostOpacity, ghostFadeSpeed, ghostBlur, smokeIntensity, turbulence, qualityPreset } = useSettings()

// Quality config: определяет параметры визуализации на основе preset
const QUALITY_CONFIGS = {
  low: { maxParticles: 500, numStars: 200, fboScale: 0.5, pixelRatio: 1.0, nebulaeEnabled: false },
  medium: { maxParticles: 1000, numStars: 500, fboScale: 0.5, pixelRatio: 1.5, nebulaeEnabled: true },
  high: { maxParticles: 2000, numStars: 800, fboScale: 0.75, pixelRatio: Math.min(window.devicePixelRatio, 2), nebulaeEnabled: true },
}

const qualityConfig = computed(() => QUALITY_CONFIGS[qualityPreset.value] || QUALITY_CONFIGS.high)

/**
 * Создаёт FBO систему для Ghost Trails эффекта
 * Использует ping-pong технику с двумя render targets через кастомный Pass
 */
// Масштаб разрешения для Ghost Trail FBO (из quality config)
let currentFboScale = 0.5

const createGhostTrailFBO = () => {
  const w = getViewportWidth()
  const h = getViewportHeight()

  const rtOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    stencilBuffer: false,
  }
  fullSceneRT = new THREE.WebGLRenderTarget(w, h, rtOptions)

  saveFullSceneAndRenderStringsPass = new SaveFullSceneAndRenderStringsOnlyPass(
    scene,
    camera,
    fullSceneRT,
  )
  ghostTrailPass = new GhostTrailPass(w, h, currentFboScale)
  compositeFullSceneWithGhostPass = new CompositeFullSceneWithGhostPass(fullSceneRT)
}

/**
 * Создаёт систему частиц с предаллоцированным пулом
 */
const createParticleSystem = () => {
  // Инициализация typed arrays
  pPositions = new Float32Array(MAX_PARTICLES * 3)
  pColors = new Float32Array(MAX_PARTICLES * 3)
  pAlphas = new Float32Array(MAX_PARTICLES)
  pSizes = new Float32Array(MAX_PARTICLES)
  pVelocities = new Float32Array(MAX_PARTICLES * 3)
  pLifetimes = new Float32Array(MAX_PARTICLES)
  pMaxLifetimes = new Float32Array(MAX_PARTICLES)
  pAlive = new Uint8Array(MAX_PARTICLES)

  // Все частицы начинают мёртвыми, позиции за экраном
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pPositions[i * 3 + 2] = -100 // z далеко за камерой
    pAlphas[i] = 0
    pSizes[i] = 0
  }

  particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
  particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(pColors, 3))
  particleGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(pAlphas, 1))
  particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1))

  particleMaterial = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      attribute vec3 aColor;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vAlpha = aAlpha;
        vColor = aColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (450.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = vAlpha * smoothstep(0.5, 0.08, dist);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  particleSystem = new THREE.Points(particleGeometry, particleMaterial)
  particleSystem.frustumCulled = false
  scene.add(particleSystem)
}

/**
 * Инициализация Three.js сцены
 */
const initThreeJS = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  // Применяем quality config при инициализации
  const qc = qualityConfig.value
  MAX_PARTICLES = qc.maxParticles
  NUM_STARS = qc.numStars
  currentFboScale = qc.fboScale

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0f0c29) // Темный фон

  // Camera
  const w = getViewportWidth()
  const h = getViewportHeight()
  camera = new THREE.PerspectiveCamera(
    45, // FOV
    w / h, // Aspect
    0.1, // Near
    1000, // Far
  )
  camera.position.set(0, 0, 18) // Отодвинута дальше для струн длиной 20 единиц
  camera.lookAt(0, 0, 0)

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  })
  renderer.setSize(w, h)
  renderer.setPixelRatio(qc.pixelRatio)

  // Освещение
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
  scene.add(ambientLight)

  const pointLight1 = new THREE.PointLight(0x667eea, 1, 100)
  pointLight1.position.set(0, 5, 10)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0xf093fb, 0.5, 100)
  pointLight2.position.set(0, -5, 10)
  scene.add(pointLight2)

  // Setup post-processing
  composer = new EffectComposer(renderer)

  // Базовый render pass
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  // Сохраняем полный кадр и рендерим только струны (layer 1) → призраки только от струн
  createGhostTrailFBO()
  composer.addPass(saveFullSceneAndRenderStringsPass)
  composer.addPass(ghostTrailPass)
  composer.addPass(compositeFullSceneWithGhostPass)

  // Bloom pass для магического свечения (применяется ПОСЛЕ ghost trails)
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    bloomIntensity.value,   // strength - интенсивность bloom (управляется из настроек)
    bloomRadius.value,      // radius - радиус размытия (управляется из настроек)
    bloomThreshold.value    // threshold - порог яркости для bloom (управляется из настроек)
  )
  composer.addPass(bloomPass)

  // S6: Фоновые эффекты (рендерятся за струнами)
  createStarParticles()  // S6-T2: Звёзды
  createNebulae()        // S6-T3: Туманности
  createGridLines()      // S6-T4: Сетка

  // Создаём струны
  createStrings()

  // S7: Создаём 3D спектр
  createSpectrumMesh()

  // Создаём систему частиц
  createParticleSystem()

  // Применяем nebulae visibility из quality config
  if (!qc.nebulaeEnabled) {
    nebulae.forEach((neb) => { neb.mesh.visible = false })
  }

  // Запускаем рендеринг
  lastFrameTime = performance.now()
  animate()
}

/**
 * S6-T2: Создаёт фоновые звёзды (particle system)
 * Звёзды рендерятся далеко за струнами для космической атмосферы
 */
const createStarParticles = () => {
  const positions = new Float32Array(NUM_STARS * 3)
  const alphas = new Float32Array(NUM_STARS)
  const sizes = new Float32Array(NUM_STARS)
  const twinkleOffsets = new Float32Array(NUM_STARS)

  for (let i = 0; i < NUM_STARS; i++) {
    // Равномерное распределение по экрану, далеко за струнами
    const theta = Math.random() * Math.PI * 2
    const radius = Math.random() * STAR_SPREAD
    // Камера на z=18, звёзды далеко позади (z от -30 до -100)
    const z = -30 - Math.random() * 70

    positions[i * 3 + 0] = Math.cos(theta) * radius
    positions[i * 3 + 1] = Math.sin(theta) * radius
    positions[i * 3 + 2] = z

    // Яркость: большинство тусклых, некоторые чуть ярче (космическая пыль)
    const brightness = Math.random()
    alphas[i] = brightness < 0.8 ? 0.15 + Math.random() * 0.2 : 0.4 + Math.random() * 0.3

    // Размеры: 1-3px (мелкие точки)
    sizes[i] = brightness < 0.8 ? 1.0 + Math.random() * 1.0 : 1.5 + Math.random() * 1.5

    twinkleOffsets[i] = Math.random() * Math.PI * 2
  }

  starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
  starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  starGeometry.setAttribute('aTwinkleOffset', new THREE.BufferAttribute(twinkleOffsets, 1))

  starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 1.0 },
      uBrightness: { value: 1.0 }, // Audio reactive brightness
    },
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  starParticles = new THREE.Points(starGeometry, starMaterial)
  starParticles.frustumCulled = false
  scene.add(starParticles)
}

/**
 * S6-T3: Создаёт 3 полупрозрачных туманности для космической атмосферы
 * Размытые сферы с breathing анимацией
 */
const createNebulae = () => {
  const nebulaConfigs = [
    { color: 0x6366f1, x: -15, y: 8, z: -40, scale: 18, opacity: 0.08, breathSpeed: 0.0003, breathPhase: 0 },
    { color: 0xec4899, x: 12, y: -5, z: -55, scale: 22, opacity: 0.06, breathSpeed: 0.00025, breathPhase: 2.1 },
    { color: 0x8b5cf6, x: -5, y: -10, z: -70, scale: 25, opacity: 0.05, breathSpeed: 0.0002, breathPhase: 4.2 },
  ]

  // Одна геометрия для всех туманностей
  sharedNebulaGeometry = new THREE.PlaneGeometry(1, 1)

  nebulaConfigs.forEach((cfg) => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(cfg.color) },
        uOpacity: { value: cfg.opacity },
        uTime: { value: 0 },
      },
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    const nebMesh = new THREE.Mesh(sharedNebulaGeometry, material)
    nebMesh.position.set(cfg.x, cfg.y, cfg.z)
    nebMesh.scale.setScalar(cfg.scale)
    // Случайный поворот для разнообразия
    nebMesh.rotation.z = cfg.breathPhase

    scene.add(nebMesh)
    nebulae.push({
      mesh: nebMesh,
      baseScale: cfg.scale,
      baseOpacity: cfg.opacity,
      breathSpeed: cfg.breathSpeed,
      breathPhase: cfg.breathPhase,
    })
  })
}

/**
 * S6-T4: Создаёт тонкие геометрические линии для глубины
 * Разреженная сетка с очень низкой прозрачностью
 */
const createGridLines = () => {
  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0x6366f1,
    transparent: true,
    opacity: 0.06,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = []
  const gridSize = 80
  const spacing = 10

  // Горизонтальные линии
  for (let y = -gridSize / 2; y <= gridSize / 2; y += spacing) {
    points.push(new THREE.Vector3(-gridSize / 2, y, -60))
    points.push(new THREE.Vector3(gridSize / 2, y, -60))
  }

  // Вертикальные линии
  for (let x = -gridSize / 2; x <= gridSize / 2; x += spacing) {
    points.push(new THREE.Vector3(x, -gridSize / 2, -60))
    points.push(new THREE.Vector3(x, gridSize / 2, -60))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  gridLines = new THREE.LineSegments(geometry, gridMaterial)
  scene.add(gridLines)
}

/**
 * S7: Создаёт mesh спектра — заполненная область с деформируемыми вершинами
 * 128 столбцов × 2 ряда вершин (верх + низ), indexed triangles
 */
const createSpectrumMesh = () => {
  const numCols = SPECTRUM_BINS
  const xRange = SPECTRUM_X_MAX - SPECTRUM_X_MIN

  // Вершины: 2 ряда по numCols точек (нижний + верхний)
  const vertexCount = numCols * 2
  const positions = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)

  for (let i = 0; i < numCols; i++) {
    const t = i / (numCols - 1) // 0..1
    const x = SPECTRUM_X_MIN + t * xRange

    // Нижний ряд (index = i)
    const bottomIdx = i
    positions[bottomIdx * 3 + 0] = x
    positions[bottomIdx * 3 + 1] = SPECTRUM_Y_BASE
    positions[bottomIdx * 3 + 2] = 0
    uvs[bottomIdx * 2 + 0] = t
    uvs[bottomIdx * 2 + 1] = 0.0

    // Верхний ряд (index = numCols + i)
    const topIdx = numCols + i
    positions[topIdx * 3 + 0] = x
    positions[topIdx * 3 + 1] = SPECTRUM_Y_BASE // Начинаем с базовой линии
    positions[topIdx * 3 + 2] = 0
    uvs[topIdx * 2 + 0] = t
    uvs[topIdx * 2 + 1] = 1.0
  }

  // Индексы: два треугольника на каждый столбец
  const indexCount = (numCols - 1) * 6
  const indices = new Uint16Array(indexCount)
  let idx = 0
  for (let i = 0; i < numCols - 1; i++) {
    const bl = i            // bottom-left
    const br = i + 1        // bottom-right
    const tl = numCols + i  // top-left
    const tr = numCols + i + 1 // top-right

    // Треугольник 1: bl, tl, br
    indices[idx++] = bl
    indices[idx++] = tl
    indices[idx++] = br

    // Треугольник 2: br, tl, tr
    indices[idx++] = br
    indices[idx++] = tl
    indices[idx++] = tr
  }

  spectrumGeometry = new THREE.BufferGeometry()
  spectrumGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  spectrumGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  spectrumGeometry.setIndex(new THREE.BufferAttribute(indices, 1))

  spectrumMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uDominantFreq: { value: 0.5 },
      uBoost: { value: 0.0 },
    },
    vertexShader: spectrumVertexShader,
    fragmentShader: spectrumFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  spectrumMesh = new THREE.Mesh(spectrumGeometry, spectrumMaterial)
  spectrumMesh.frustumCulled = false
  scene.add(spectrumMesh)

  // Pre-allocate spectrum buffers
  spectrumSmoothBuffer = new Float32Array(SPECTRUM_BINS)
  spectrumFinalBuffer = new Float32Array(SPECTRUM_BINS)
}

/**
 * S7: Catmull-Rom сглаживание для массива данных
 */
const catmullRomSmooth = (data, output) => {
  const n = data.length
  for (let i = 0; i < n; i++) {
    const p0 = data[Math.max(0, i - 1)]
    const p1 = data[i]
    const p2 = data[Math.min(n - 1, i + 1)]
    const p3 = data[Math.min(n - 1, i + 2)]
    // Catmull-Rom at t=0.5 (center point)
    output[i] = 0.5 * (2 * p1 + (-p0 + p2) * 0.5 + (2 * p0 - 5 * p1 + 4 * p2 - p3) * 0.25 + (-p0 + 3 * p1 - 3 * p2 + p3) * 0.125)
    if (output[i] < 0) output[i] = 0
  }
}

/**
 * S7: Мягкое сглаживание по 5 точкам (убирает зубчатость)
 */
const smoothSpectrumLine = (data, output, radius = 2) => {
  const n = data.length
  for (let i = 0; i < n; i++) {
    let sum = 0
    let count = 0
    for (let j = -radius; j <= radius; j++) {
      const k = Math.max(0, Math.min(n - 1, i + j))
      sum += data[k]
      count++
    }
    output[i] = sum / count
  }
}

/**
 * S7: Обновляет вершины спектра из frequency data
 */
const updateSpectrumVertices = (spectrumData) => {
  if (!spectrumGeometry) return

  const positions = spectrumGeometry.attributes.position.array
  const numCols = SPECTRUM_BINS

  // Catmull-Rom сглаживание входных данных (в pre-allocated буфер)
  catmullRomSmooth(spectrumData, spectrumSmoothBuffer)

  // Lerp к текущим значениям (меньший коэффициент = плавнее реакция)
  for (let i = 0; i < numCols; i++) {
    const normalized = spectrumSmoothBuffer[i] / 255 // 0..1
    smoothedSpectrum[i] += (normalized - smoothedSpectrum[i]) * 0.2
  }

  // Дополнительное сглаживание линии (в pre-allocated буфер)
  smoothSpectrumLine(smoothedSpectrum, spectrumFinalBuffer, 2)

  // Обновляем верхний ряд вершин
  for (let i = 0; i < numCols; i++) {
    const topIdx = numCols + i
    positions[topIdx * 3 + 1] = SPECTRUM_Y_BASE + spectrumFinalBuffer[i] * SPECTRUM_HEIGHT
  }

  spectrumGeometry.attributes.position.needsUpdate = true
}

/**
 * Создаёт 6 струн гитары с кастомными шейдерами
 */
const createStrings = () => {
  const geometry = new THREE.CylinderGeometry(
    STRING_RADIUS,    // radiusTop
    STRING_RADIUS,    // radiusBottom
    STRING_LENGTH,    // height
    16,               // radialSegments (окружность)
    128,              // heightSegments (вдоль длины) — позволяет изгибаться!
  )

  // Создаём струны сверху вниз (6-я -> 1-я)
  GUITAR_STRINGS.forEach((stringInfo, index) => {
    // Используем цвета из констант вместо stringInfo.color
    const colorHex = ColorUtils.getStringColor(index)
    const baseColor = new THREE.Color(colorHex)

    // Создаём градиент: немного светлее в начале, базовый цвет в конце
    const colorStart = baseColor.clone().multiplyScalar(1.2)
    const colorEnd = baseColor.clone()

    // Shader Material с кастомными шейдерами
    const material = new THREE.ShaderMaterial({
      uniforms: {
        // Параметры волны (vertex shader)
        uTime: { value: 0.0 },
        uAmplitude: { value: 0.0 }, // Начинаем с 0, обновится при активации
        uFrequency: { value: 0.15 + index * 0.015 }, // Разная частота для каждой струны (0.15-0.225 = очень длинные плавные волны)
        uDamping: { value: 1.0 + index * 0.08 }, // Более высокие струны затухают быстрее (1.0 - 1.4)
        uAttackTime: { value: 0.0 },
        uSpeed: { value: 1.0 }, // Скорость колебания (можно модулировать по темпу)
        // Параметры цвета (fragment shader)
        uColorStart: { value: colorStart },
        uColorEnd: { value: colorEnd },
        uGlowIntensity: { value: 0.2 }, // Базовое слабое свечение
        uEdgeGlow: { value: 0.3 }, // Fresnel edge enhancement
      },
      vertexShader: stringVertexShader,
      fragmentShader: stringFragmentShader,
    })

    const mesh = new THREE.Mesh(geometry, material)

    // Позиционирование: от верха (-2.5) к низу (2.5)
    const yPosition =
      (TOTAL_STRINGS - 1) * (STRING_SPACING / 2) - index * STRING_SPACING

    mesh.position.set(0, yPosition, 0)
    mesh.rotation.z = Math.PI / 2 // Поворот на 90° (горизонтально)
    mesh.layers.enable(1) // Layer 1: только струны для ghost trails

    // Сохраняем референс на струну
    mesh.userData = {
      stringIndex: stringInfo.index,
      arrayIndex: index,
      baseColor: baseColor,
      targetIntensity: 0.2, // Целевая интенсивность свечения
      currentIntensity: 0.2, // Текущая интенсивность свечения
      targetAmplitude: 0.0,  // Целевая амплитуда колебаний
      currentAmplitude: 0.0, // Текущая амплитуда колебаний
    }

    scene.add(mesh)
    strings.push(mesh)
  })
}

/**
 * Испускает одну частицу для указанной струны
 */
const emitParticle = (stringArrayIndex, intensity) => {
  const i = nextParticleIndex
  nextParticleIndex = (nextParticleIndex + 1) % MAX_PARTICLES

  const i3 = i * 3
  const stringMesh = strings[stringArrayIndex]
  if (!stringMesh) return

  const yPos = stringMesh.position.y
  const baseColor = stringMesh.userData.baseColor

  // Позиция: вдоль струны с jitter
  pPositions[i3] = (Math.random() - 0.5) * STRING_LENGTH // x: вдоль струны
  pPositions[i3 + 1] = yPos + (Math.random() - 0.5) * 0.3 // y: позиция струны ± jitter
  pPositions[i3 + 2] = 0.1 + Math.random() * 0.3 // z: слегка перед струной

  // Скорость: разлёт вверх
  pVelocities[i3] = (Math.random() - 0.5) * 1.5 // vx: spread
  pVelocities[i3 + 1] = 0.3 + Math.random() * 0.7 // vy: вверх
  pVelocities[i3 + 2] = (Math.random() - 0.5) * 0.3 // vz: slight

  // Цвет струны, усиленный intensity
  const boost = 0.3 + intensity * 0.7
  pColors[i3] = Math.min(1, baseColor.r * boost + 0.2)
  pColors[i3 + 1] = Math.min(1, baseColor.g * boost + 0.2)
  pColors[i3 + 2] = Math.min(1, baseColor.b * boost + 0.2)

  // Lifetime
  const lifetime = PARTICLE_LIFETIME_MIN + Math.random() * (PARTICLE_LIFETIME_MAX - PARTICLE_LIFETIME_MIN)
  pLifetimes[i] = lifetime
  pMaxLifetimes[i] = lifetime

  // Начальные alpha/size
  pAlphas[i] = 0.8 + intensity * 0.2
  pSizes[i] = PARTICLE_BASE_SIZE * (0.85 + intensity * 0.5)

  pAlive[i] = 1
}

/**
 * Всплеск частиц при ударе по струне
 */
const emitBurst = (stringArrayIndex, intensity) => {
  const count = Math.round(BURST_COUNT * 0.5 + BURST_COUNT * 0.5 * intensity)
  for (let j = 0; j < count; j++) {
    emitParticle(stringArrayIndex, intensity)
  }
}

/**
 * Постоянный поток частиц для активной струны (через accumulator)
 */
const emitStream = (stringArrayIndex, intensity, dt) => {
  const rate = STREAM_RATE * intensity // 0..8 частиц/сек
  streamAccumulators[stringArrayIndex] += rate * dt

  while (streamAccumulators[stringArrayIndex] >= 1) {
    streamAccumulators[stringArrayIndex] -= 1
    emitParticle(stringArrayIndex, intensity * 0.8) // stream-частицы чуть менее интенсивны
  }
}

/**
 * Обновляет все живые частицы
 */
const updateParticles = (dt) => {
  if (!pAlive) return

  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (!pAlive[i]) continue

    pLifetimes[i] -= dt
    if (pLifetimes[i] <= 0) {
      // Убить частицу
      pAlive[i] = 0
      pAlphas[i] = 0
      pSizes[i] = 0
      pPositions[i * 3 + 2] = -100
      continue
    }

    const i3 = i * 3
    const lifeRatio = pLifetimes[i] / pMaxLifetimes[i]

    // Физика: position += velocity * dt
    pPositions[i3] += pVelocities[i3] * dt
    pPositions[i3 + 1] += pVelocities[i3 + 1] * dt
    pPositions[i3 + 2] += pVelocities[i3 + 2] * dt

    // Drag
    pVelocities[i3] *= 0.98
    pVelocities[i3 + 1] *= 0.98
    pVelocities[i3 + 2] *= 0.98

    // Плавное затухание: частицы дольше остаются яркими и крупными
    const smoothLife = lifeRatio * lifeRatio * (3 - 2 * lifeRatio) // smoothstep
    pAlphas[i] = smoothLife * (0.8 + (1 - lifeRatio) * 0.2)
    pSizes[i] = PARTICLE_BASE_SIZE * (0.3 + 0.7 * smoothLife)
  }

  // Пометить буферы для обновления GPU
  particleGeometry.attributes.position.needsUpdate = true
  particleGeometry.attributes.aColor.needsUpdate = true
  particleGeometry.attributes.aAlpha.needsUpdate = true
  particleGeometry.attributes.aSize.needsUpdate = true
}

/**
 * Анимация сцены
 */
const animate = () => {
  if (!renderer || !scene || !camera) return

  // DeltaTime
  const now = performance.now()
  const dt = Math.min((now - lastFrameTime) / 1000, 0.1) // cap at 100ms
  lastFrameTime = now

  // Обновление шейдеров струн
  strings.forEach((string) => {
    const userData = string.userData
    const uniforms = string.material.uniforms

    // Обновляем время для волновой анимации
    uniforms.uTime.value = now

    // Плавная анимация интенсивности свечения
    const intensityDiff = userData.targetIntensity - userData.currentIntensity
    userData.currentIntensity += intensityDiff * 0.15
    uniforms.uGlowIntensity.value = userData.currentIntensity

    // Плавная анимация амплитуды колебаний
    const amplitudeDiff = userData.targetAmplitude - userData.currentAmplitude
    userData.currentAmplitude += amplitudeDiff * 0.2
    uniforms.uAmplitude.value = userData.currentAmplitude
  })

  // Обновление частиц
  updateParticles(dt)

  // Stream emission для активных струн
  if (props.isActive) {
    const activeSet = new Set(props.activeStringIndices)
    strings.forEach((string) => {
      const ud = string.userData
      if (activeSet.has(ud.stringIndex)) {
        const intensity = Math.max(0, Math.min(1, props.stringIntensities[ud.stringIndex] || 0.7))
        emitStream(ud.arrayIndex, intensity, dt)
      }
    })
  }

  // S6-T5: Audio reactivity — rmsLevel влияет на фоновые эффекты
  const rms = props.rmsLevel || 0
  const audioBoost = Math.min(rms * 3, 1.0) // Нормализованный 0-1
  // Сглаживание: быстрый attack (0.15), медленный decay (0.03) — плавная пульсация
  const lerpFactor = audioBoost > smoothedAudioBoost ? 0.15 : 0.03
  smoothedAudioBoost += (audioBoost - smoothedAudioBoost) * lerpFactor

  // S6-T2: Обновляем время для star shader (мерцание и drift)
  if (starMaterial) {
    starMaterial.uniforms.uTime.value = now
    // S6-T5: Мягкая пульсация яркости звёзд (без ускорения drift)
    starMaterial.uniforms.uBrightness.value = 1.0 + smoothedAudioBoost * 0.6
  }

  // S6-T3: Breathing анимация для туманностей
  nebulae.forEach((neb) => {
    const breath = Math.sin(now * neb.breathSpeed + neb.breathPhase) * 0.05 + 1.0 // 0.95-1.05
    neb.mesh.scale.setScalar(neb.baseScale * breath)
    neb.mesh.material.uniforms.uTime.value = now
    // S6-T5: Туманности становятся ярче на peaks (до +50%), сглажено
    neb.mesh.material.uniforms.uOpacity.value = neb.baseOpacity * (1.0 + smoothedAudioBoost * 0.5)
    // Медленное вращение
    neb.mesh.rotation.z += 0.00003
  })

  // S6-T5: Grid линии становятся ярче на peaks
  if (gridLines) {
    gridLines.material.opacity = 0.06 + smoothedAudioBoost * 0.08
  }

  // S7: Обновляем 3D спектр
  if (spectrumMesh && spectrumAnalyzer) {
    const spectrumData = spectrumAnalyzer.getFrequencySpectrum(82, 1200, SPECTRUM_BINS)
    updateSpectrumVertices(spectrumData)

    // Dominant frequency (индекс max бина / total бинов)
    let maxVal = 0
    let maxIdx = 0
    for (let i = 0; i < spectrumData.length; i++) {
      if (spectrumData[i] > maxVal) {
        maxVal = spectrumData[i]
        maxIdx = i
      }
    }
    const dominantFreq = spectrumData.length > 0 ? maxIdx / spectrumData.length : 0.5

    // Обновляем uniforms
    spectrumMaterial.uniforms.uTime.value = now * 0.001
    spectrumMaterial.uniforms.uDominantFreq.value = dominantFreq
    spectrumMaterial.uniforms.uBoost.value = smoothedAudioBoost
  }

  // Рендерим сцену через post-processing composer
  // GhostTrailPass автоматически управляет ping-pong буферами внутри
  // Multi-String Support: все активные струны рендерятся через RenderPass,
  // и GhostTrailPass накапливает их вместе с сохранением индивидуальных цветов
  if (composer) {
    composer.render()
  } else {
    renderer.render(scene, camera)
  }

  // Следующий кадр
  animationFrameId = requestAnimationFrame(animate)
}


/**
 * Обновляет свечение и колебания струн
 */
const updateStrings = () => {
  if (!strings.length) return

  const activeSet = new Set(props.activeStringIndices)
  const intensities = props.stringIntensities
  const currentTime = performance.now()

  strings.forEach((string) => {
    const userData = string.userData
    const uniforms = string.material.uniforms
    const idx = userData.stringIndex

    if (activeSet.has(idx) && props.isActive) {
      // Активная струна — яркое свечение и колебания
      const intensity = Math.max(0, Math.min(1, intensities[idx] || 0.7))
      userData.targetIntensity = 0.5 + intensity * 1.5 // 0.5 - 2.0

      // Утончённая амплитуда для изящных волн
      // Нижние струны (больший индекс) колеблются с большей амплитудой
      const baseAmplitude = 0.025 + (userData.arrayIndex * 0.0085) // 0.025 - 0.0675 base
      userData.targetAmplitude = baseAmplitude + intensity * 0.0835 // 0.025 - 0.15 (амплитуда волны, уменьшена в 6 раз)

      // Attack: обновляем время начала колебания при появлении новой активной струны
      if (!prevActiveSet.has(idx)) {
        uniforms.uAttackTime.value = currentTime
        emitBurst(userData.arrayIndex, intensity)
      }
    } else if (activeSet.size === 0 && props.isActive) {
      // Нет определённых струн но есть звук — слабое свечение, нет колебаний
      userData.targetIntensity = 0.25
      userData.targetAmplitude = 0.0
    } else {
      // Неактивные струны — базовое свечение, нет колебаний
      userData.targetIntensity = 0.2
      userData.targetAmplitude = 0.0
      // Сбросить stream accumulator при деактивации
      streamAccumulators[userData.arrayIndex] = 0
    }
  })

  // Обновляем prevActiveSet
  prevActiveSet = new Set(props.activeStringIndices)
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

  if (fullSceneRT) fullSceneRT.setSize(width, height)
  if (ghostTrailPass) ghostTrailPass.setSize(width, height)

  if (composer) composer.setSize(width, height)
}

// Watch для обновления свечения
watch(
  () => [props.activeStringIndices, props.stringIntensities, props.detectionMode, props.isActive],
  () => {
    updateStrings()
  },
  { deep: true },
)

// S7: Watch для инициализации spectrum analyzer
watch(
  () => props.analyserNode,
  (node) => {
    if (node && !spectrumAnalyzer) {
      spectrumAnalyzer = useFrequencyAnalyzer(node)
      spectrumAnalyzer.startAnalysis()
    } else if (!node && spectrumAnalyzer) {
      spectrumAnalyzer.stopAnalysis()
      spectrumAnalyzer = null
      // Сброс спектра
      smoothedSpectrum.fill(0)
    }
  },
)

// Watch для обновления bloom параметров
watch(bloomIntensity, (newIntensity) => {
  if (bloomPass) {
    bloomPass.strength = newIntensity
  }
})

watch(bloomThreshold, (newThreshold) => {
  if (bloomPass) {
    bloomPass.threshold = newThreshold
  }
})

watch(bloomRadius, (newRadius) => {
  if (bloomPass) {
    bloomPass.radius = newRadius
  }
})

// Watch для обновления ghost trail параметров
watch(ghostOpacity, (newOpacity) => {
  if (ghostTrailPass) {
    ghostTrailPass.setOpacity(newOpacity)
  }
})

watch(ghostFadeSpeed, (newFadeSpeed) => {
  if (ghostTrailPass) {
    ghostTrailPass.setFadeSpeed(newFadeSpeed)
  }
})

watch(ghostBlur, (newBlur) => {
  if (ghostTrailPass) {
    ghostTrailPass.setBlurAmount(newBlur)
  }
})

// Watch для новых параметров дыма
watch(smokeIntensity, (newIntensity) => {
  if (ghostTrailPass) {
    ghostTrailPass.setSmokeIntensity(newIntensity)
  }
})

watch(turbulence, (newTurbulence) => {
  if (ghostTrailPass) {
    ghostTrailPass.setTurbulence(newTurbulence)
  }
})

/**
 * Пересоздаёт систему частиц с новым MAX_PARTICLES
 */
const recreateParticleSystem = () => {
  if (particleSystem && scene) {
    scene.remove(particleSystem)
    particleGeometry.dispose()
    particleMaterial.dispose()
    particleSystem = null
  }
  pPositions = null
  pColors = null
  pAlphas = null
  pSizes = null
  pVelocities = null
  pLifetimes = null
  pMaxLifetimes = null
  pAlive = null
  nextParticleIndex = 0
  streamAccumulators.fill(0)
  if (scene) createParticleSystem()
}

/**
 * Пересоздаёт звёзды с новым NUM_STARS
 */
const recreateStars = () => {
  if (starParticles && scene) {
    scene.remove(starParticles)
    starGeometry.dispose()
    starMaterial.dispose()
    starParticles = null
  }
  if (scene) createStarParticles()
}

/**
 * Пересоздаёт Ghost Trail FBO с новым scale
 */
const recreateGhostTrailFBO = () => {
  if (!composer || !scene) return

  // Удаляем старые passes из composer
  const passes = composer.passes.slice()
  composer.passes.length = 0

  if (saveFullSceneAndRenderStringsPass) saveFullSceneAndRenderStringsPass.dispose()
  if (ghostTrailPass) ghostTrailPass.dispose()
  if (compositeFullSceneWithGhostPass) compositeFullSceneWithGhostPass.dispose()
  if (fullSceneRT) fullSceneRT.dispose()

  createGhostTrailFBO()

  // Восстанавливаем passes в правильном порядке
  passes.forEach((pass) => {
    if (pass instanceof SaveFullSceneAndRenderStringsOnlyPass ||
        pass instanceof GhostTrailPass ||
        pass instanceof CompositeFullSceneWithGhostPass) return
    if (pass instanceof RenderPass) {
      composer.addPass(pass)
      composer.addPass(saveFullSceneAndRenderStringsPass)
      composer.addPass(ghostTrailPass)
      composer.addPass(compositeFullSceneWithGhostPass)
    } else {
      composer.addPass(pass)
    }
  })
}

// Watch для смены quality preset — пересоздаём подсистемы
watch(qualityPreset, (newPreset) => {
  const qc = QUALITY_CONFIGS[newPreset] || QUALITY_CONFIGS.high

  // Обновляем pixelRatio
  if (renderer) {
    renderer.setPixelRatio(qc.pixelRatio)
  }

  // Пересоздаём частицы при изменении maxParticles
  if (qc.maxParticles !== MAX_PARTICLES) {
    MAX_PARTICLES = qc.maxParticles
    recreateParticleSystem()
  }

  // Пересоздаём звёзды при изменении numStars
  if (qc.numStars !== NUM_STARS) {
    NUM_STARS = qc.numStars
    recreateStars()
  }

  // Пересоздаём FBO при изменении fboScale
  if (qc.fboScale !== currentFboScale) {
    currentFboScale = qc.fboScale
    recreateGhostTrailFBO()
  }

  // Видимость туманностей
  nebulae.forEach((neb) => {
    neb.mesh.visible = qc.nebulaeEnabled
  })

  // Обновляем размеры
  handleResize()
})

// Lifecycle hooks
onMounted(() => {
  initThreeJS()
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  // Очистка Three.js ресурсов
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  window.removeEventListener('resize', handleResize)

  // Dispose star particles
  if (starParticles) {
    scene.remove(starParticles)
    starGeometry.dispose()
    starMaterial.dispose()
    starParticles = null
  }

  // Dispose nebulae
  nebulae.forEach((neb) => {
    scene.remove(neb.mesh)
    neb.mesh.material.dispose()
  })
  nebulae.length = 0
  if (sharedNebulaGeometry) {
    sharedNebulaGeometry.dispose()
    sharedNebulaGeometry = null
  }

  // Dispose grid lines
  if (gridLines) {
    scene.remove(gridLines)
    gridLines.geometry.dispose()
    gridLines.material.dispose()
    gridLines = null
  }

  // S7: Dispose spectrum mesh
  if (spectrumMesh) {
    scene.remove(spectrumMesh)
    if (spectrumGeometry) {
      spectrumGeometry.dispose()
      spectrumGeometry = null
    }
    if (spectrumMaterial) {
      spectrumMaterial.dispose()
      spectrumMaterial = null
    }
    spectrumMesh = null
  }
  if (spectrumAnalyzer) {
    spectrumAnalyzer.stopAnalysis()
    spectrumAnalyzer = null
  }
  spectrumSmoothBuffer = null
  spectrumFinalBuffer = null

  // Dispose particle system
  if (particleSystem) {
    scene.remove(particleSystem)
    particleGeometry.dispose()
    particleMaterial.dispose()
    particleSystem = null
  }
  pPositions = null
  pColors = null
  pAlphas = null
  pSizes = null
  pVelocities = null
  pLifetimes = null
  pMaxLifetimes = null
  pAlive = null

  // Dispose geometry и materials
  strings.forEach((string) => {
    string.geometry.dispose()
    string.material.dispose()
  })

  if (saveFullSceneAndRenderStringsPass) {
    saveFullSceneAndRenderStringsPass.dispose()
    saveFullSceneAndRenderStringsPass = null
  }
  if (compositeFullSceneWithGhostPass) {
    compositeFullSceneWithGhostPass.dispose()
    compositeFullSceneWithGhostPass = null
  }
  if (ghostTrailPass) {
    ghostTrailPass.dispose()
    ghostTrailPass = null
  }
  if (fullSceneRT) {
    fullSceneRT.dispose()
    fullSceneRT = null
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
