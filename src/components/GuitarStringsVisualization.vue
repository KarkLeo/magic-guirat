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

// Размеры
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400

// Параметры струн
const STRING_LENGTH = 8
const STRING_RADIUS = 0.05
const STRING_SPACING = 1.2

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

  // Запускаем рендеринг
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
 * Анимация сцены
 */
const animate = () => {
  if (!renderer || !scene || !camera) return

  // Плавная анимация интенсивности свечения
  strings.forEach((string) => {
    const userData = string.userData
    const diff = userData.targetIntensity - userData.currentIntensity

    // Плавное приближение к целевой интенсивности
    userData.currentIntensity += diff * 0.15

    // Обновляем материал
    string.material.emissiveIntensity = userData.currentIntensity
  })

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
    } else if (activeSet.size === 0 && props.isActive) {
      // Нет определённых струн но есть звук — слабое свечение
      userData.targetIntensity = 0.25
    } else {
      // Неактивные струны — базовое свечение
      userData.targetIntensity = 0.2
    }
  })

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
