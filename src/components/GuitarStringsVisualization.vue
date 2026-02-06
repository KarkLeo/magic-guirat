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
  activeStringIndex: {
    type: Number,
    default: null, // null = нет активной струны
  },
  intensity: {
    type: Number,
    default: 0, // 0-1
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

  console.log('🎸 Three.js визуализация инициализирована')
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
    // 6 струн с интервалом STRING_SPACING
    const yPosition =
      (TOTAL_STRINGS - 1) * (STRING_SPACING / 2) - index * STRING_SPACING

    mesh.position.set(0, yPosition, 0)
    mesh.rotation.z = Math.PI / 2 // Поворот на 90° (горизонтально)

    // Сохраняем референс на струну
    mesh.userData = {
      stringIndex: stringInfo.index,
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
 * Обновляет свечение струн в зависимости от активной струны
 */
const updateStrings = () => {
  if (!strings.length) return

  const activeIndex = props.activeStringIndex
  const intensity = Math.max(0, Math.min(1, props.intensity)) // Clamp 0-1

  strings.forEach((string) => {
    const userData = string.userData

    if (userData.stringIndex === activeIndex && props.isActive) {
      // Активная струна - яркое свечение
      userData.targetIntensity = 0.5 + intensity * 1.5 // 0.5 - 2.0
    } else if (activeIndex === null && props.isActive && intensity > 0.1) {
      // Если струна не определена, но есть звук - все струны слабо светятся
      userData.targetIntensity = 0.2 + intensity * 0.3 // 0.2 - 0.5
    } else {
      // Неактивные струны - базовое свечение
      userData.targetIntensity = 0.2
    }
  })
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
  () => [props.activeStringIndex, props.intensity, props.isActive],
  () => {
    updateStrings()
  },
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

  // Dispose geometry и materials
  strings.forEach((string) => {
    string.geometry.dispose()
    string.material.dispose()
  })

  if (renderer) {
    renderer.dispose()
  }

  console.log('🎸 Three.js визуализация очищена')
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
