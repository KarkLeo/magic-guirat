<template>
  <div class="guitar-visualization" role="region" aria-label="Визуализация струн гитары">
    <canvas ref="canvasRef" class="visualization-canvas" role="img" aria-label="3D визуализация шести струн гитары с анимацией свечения"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { GUITAR_STRINGS, TOTAL_STRINGS } from '@/utils/guitarMapping'

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
})

// Canvas ref
const canvasRef = ref(null)

// Three.js objects
let scene = null
let camera = null
let renderer = null
let strings = [] // Массив mesh'ей струн
let chordLines = [] // Соединительные линии между аккордными струнами
let animationFrameId = null

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
let streamAccumulators = new Float32Array(TOTAL_STRINGS)

// Размеры
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400

// Параметры струн
const STRING_LENGTH = 8
const STRING_RADIUS = 0.05
const STRING_SPACING = 1.2

// Параметры системы частиц
const MAX_PARTICLES = 1000
const BURST_COUNT = 30
const STREAM_RATE = 8
const PARTICLE_LIFETIME_MIN = 0.8
const PARTICLE_LIFETIME_MAX = 1.6
const PARTICLE_BASE_SIZE = 0.15

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
        gl_PointSize = aSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = vAlpha * smoothstep(0.5, 0.15, dist);
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

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0f0c29) // Темный фон

  // Camera
  camera = new THREE.PerspectiveCamera(
    45, // FOV
    CANVAS_WIDTH / CANVAS_HEIGHT, // Aspect
    0.1, // Near
    1000, // Far
  )
  camera.position.set(0, 0, 12)
  camera.lookAt(0, 0, 0)

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  })
  renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Освещение
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
  scene.add(ambientLight)

  const pointLight1 = new THREE.PointLight(0x667eea, 1, 100)
  pointLight1.position.set(0, 5, 10)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0xf093fb, 0.5, 100)
  pointLight2.position.set(0, -5, 10)
  scene.add(pointLight2)

  // Создаём струны
  createStrings()

  // Создаём систему частиц
  createParticleSystem()

  // Запускаем рендеринг
  lastFrameTime = performance.now()
  animate()
}

/**
 * Создаёт 6 струн гитары
 */
const createStrings = () => {
  const geometry = new THREE.CylinderGeometry(
    STRING_RADIUS,
    STRING_RADIUS,
    STRING_LENGTH,
    16,
  )

  // Создаём струны сверху вниз (6-я -> 1-я)
  GUITAR_STRINGS.forEach((stringInfo, index) => {
    // Материал с emissive свечением
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(stringInfo.color),
      emissive: new THREE.Color(stringInfo.color),
      emissiveIntensity: 0.2, // Базовое слабое свечение
      metalness: 0.8,
      roughness: 0.2,
    })

    const mesh = new THREE.Mesh(geometry, material)

    // Позиционирование: от верха (-2.5) к низу (2.5)
    const yPosition =
      (TOTAL_STRINGS - 1) * (STRING_SPACING / 2) - index * STRING_SPACING

    mesh.position.set(0, yPosition, 0)
    mesh.rotation.z = Math.PI / 2 // Поворот на 90° (горизонтально)

    // Сохраняем референс на струну
    mesh.userData = {
      stringIndex: stringInfo.index,
      arrayIndex: index,
      baseColor: new THREE.Color(stringInfo.color),
      targetIntensity: 0.2, // Целевая интенсивность
      currentIntensity: 0.2, // Текущая интенсивность
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
  pAlphas[i] = 0.6 + intensity * 0.4
  pSizes[i] = PARTICLE_BASE_SIZE * (0.8 + intensity * 0.4)

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
    emitParticle(stringArrayIndex, intensity * 0.6) // stream-частицы менее интенсивны
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

    // Квадратичное затухание alpha, линейное size
    pAlphas[i] = lifeRatio * lifeRatio * (0.6 + (1 - lifeRatio) * 0.4)
    pSizes[i] = PARTICLE_BASE_SIZE * lifeRatio
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

  // Плавная анимация интенсивности свечения
  strings.forEach((string) => {
    const userData = string.userData
    const diff = userData.targetIntensity - userData.currentIntensity

    // Плавное приближение к целевой интенсивности
    userData.currentIntensity += diff * 0.15

    // Обновляем материал
    string.material.emissiveIntensity = userData.currentIntensity
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

  // Рендерим сцену
  renderer.render(scene, camera)

  // Следующий кадр
  animationFrameId = requestAnimationFrame(animate)
}

/**
 * Удаляет все соединительные линии
 */
const clearChordLines = () => {
  chordLines.forEach((line) => {
    scene.remove(line)
    line.geometry.dispose()
    line.material.dispose()
  })
  chordLines = []
}

/**
 * Создаёт соединительные линии между активными струнами в chord mode
 */
const updateChordLines = () => {
  if (!scene) return

  clearChordLines()

  if (props.detectionMode !== 'chord' || props.activeStringIndices.length < 2) {
    return
  }

  // Находим mesh'и активных струн
  const activeStrings = strings.filter((s) =>
    props.activeStringIndices.includes(s.userData.stringIndex),
  )

  if (activeStrings.length < 2) return

  // Создаём линии между соседними активными струнами
  const material = new THREE.LineBasicMaterial({
    color: 0xc084fc,
    transparent: true,
    opacity: 0.4,
  })

  for (let i = 0; i < activeStrings.length - 1; i++) {
    const from = activeStrings[i].position
    const to = activeStrings[i + 1].position

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, from.y, 0.5),
      new THREE.Vector3(0, to.y, 0.5),
    ])

    const line = new THREE.Line(geometry, material.clone())
    scene.add(line)
    chordLines.push(line)
  }
}

/**
 * Обновляет свечение струн
 */
const updateStrings = () => {
  if (!strings.length) return

  const activeSet = new Set(props.activeStringIndices)
  const intensities = props.stringIntensities

  strings.forEach((string) => {
    const userData = string.userData
    const idx = userData.stringIndex

    if (activeSet.has(idx) && props.isActive) {
      // Активная струна — яркое свечение
      const intensity = Math.max(0, Math.min(1, intensities[idx] || 0.7))
      userData.targetIntensity = 0.5 + intensity * 1.5 // 0.5 - 2.0

      // Burst при появлении новой активной струны
      if (!prevActiveSet.has(idx)) {
        emitBurst(userData.arrayIndex, intensity)
      }
    } else if (activeSet.size === 0 && props.isActive) {
      // Нет определённых струн но есть звук — слабое свечение
      userData.targetIntensity = 0.25
    } else {
      // Неактивные струны — базовое свечение
      userData.targetIntensity = 0.2
      // Сбросить stream accumulator при деактивации
      streamAccumulators[userData.arrayIndex] = 0
    }
  })

  // Обновляем prevActiveSet
  prevActiveSet = new Set(props.activeStringIndices)

  // Обновляем chord lines
  updateChordLines()
}

/**
 * Обработка изменения размера окна
 */
const handleResize = () => {
  if (!camera || !renderer) return

  const container = canvasRef.value?.parentElement
  if (!container) return

  const width = Math.min(container.clientWidth, CANVAS_WIDTH)
  const height = CANVAS_HEIGHT

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

// Watch для обновления свечения
watch(
  () => [props.activeStringIndices, props.stringIntensities, props.detectionMode, props.isActive],
  () => {
    updateStrings()
  },
  { deep: true },
)

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

  clearChordLines()

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

  if (renderer) {
    renderer.dispose()
  }
})
</script>

<style scoped>
.guitar-visualization {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  background: rgba(15, 12, 41, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(168, 181, 255, 0.2);
  backdrop-filter: blur(10px);
}

.visualization-canvas {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .guitar-visualization {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .guitar-visualization {
    padding: 0.75rem;
  }

  .visualization-canvas {
    border-radius: 6px;
  }
}
</style>
