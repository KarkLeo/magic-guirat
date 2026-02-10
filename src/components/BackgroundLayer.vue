<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import starVertexShader from '@/shaders/starVertex.glsl?raw'
import starFragmentShader from '@/shaders/starFragment.glsl?raw'

// Props - Audio reactivity (будет использоваться в S6-T5)
const props = defineProps({
  rmsLevel: {
    type: Number,
    default: 0,
  },
})

// === CONSTANTS ===
const NUM_STARS = 800 // Количество звезд
const STAR_SPREAD = 40 // Радиус распределения звезд (уменьшен для видимости)
const STAR_DEPTH = 50 // Глубина распределения по Z

// Template refs
const canvasRef = ref()
const containerRef = ref()

// Three.js objects
let scene
let camera
let renderer
let animationFrameId

// Particle system для звезд
let starParticles = null
let starGeometry = null
let starMaterial = null

// Размеры
let width = 0
let height = 0

/**
 * Инициализация Three.js сцены
 */
function initThreeJS() {
  if (!canvasRef.value || !containerRef.value) return

  // Размеры контейнера
  width = containerRef.value.clientWidth
  height = containerRef.value.clientHeight

  // Scene
  scene = new THREE.Scene()
  scene.background = null // Прозрачный фон (используем CSS gradient)

  // Camera
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.z = 50

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true, // Прозрачный фон
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0) // Черный с альфой 0 (полностью прозрачный)

  // S6-T2: Создаём звезды
  createStarParticles()

  // TODO (S6-T3): Add nebula spheres

  console.log('[BackgroundLayer] Three.js initialized:', { width, height })
}

/**
 * S6-T2: Создаёт particle system для звезд
 * GPU-оптимизированная система с Float32Array буферами
 */
function createStarParticles() {
  // Инициализация typed arrays
  const positions = new Float32Array(NUM_STARS * 3)
  const alphas = new Float32Array(NUM_STARS)
  const sizes = new Float32Array(NUM_STARS)
  const twinkleOffsets = new Float32Array(NUM_STARS)

  // DEBUG: Первые 10 звезд - тестовые (большие, яркие, в центре)
  for (let i = 0; i < 10; i++) {
    positions[i * 3 + 0] = (i - 5) * 2 // x: от -10 до 10
    positions[i * 3 + 1] = 0 // y: центр
    positions[i * 3 + 2] = -80 // z: прямо впереди камеры
    alphas[i] = 1.0 // Полностью непрозрачные
    sizes[i] = 10.0 // ОЧЕНЬ большие
    twinkleOffsets[i] = 0
  }

  // Генерация остальных звезд с случайными параметрами
  for (let i = 10; i < NUM_STARS; i++) {
    // Позиция: равномерное распределение в 3D пространстве
    const theta = Math.random() * Math.PI * 2 // Угол
    const radius = Math.random() * STAR_SPREAD // Радиус от центра
    // Z: звезды должны быть ВПЕРЕДИ камеры в направлении -Z
    // Камера на z=50, звезды от -50 до -150 (впереди камеры по направлению взгляда)
    const z = -50 - Math.random() * STAR_DEPTH * 2 // От -50 до -150

    positions[i * 3 + 0] = Math.cos(theta) * radius // x
    positions[i * 3 + 1] = Math.sin(theta) * radius // y
    positions[i * 3 + 2] = z

    // Альфа: большинство звезд яркие для видимости
    const brightness = Math.random()
    // Увеличены для видимости: 0.6-1.0
    alphas[i] = brightness < 0.7 ? 0.6 + Math.random() * 0.3 : 0.9 + Math.random() * 0.1

    // Размер: различные размеры (маленькие и большие звезды)
    // Увеличены для лучшей видимости: 2-6px
    sizes[i] = brightness < 0.7 ? 2.0 + Math.random() * 2.0 : 4.0 + Math.random() * 2.0

    // Twinkle offset: случайная фаза для асинхронного мерцания
    twinkleOffsets[i] = Math.random() * Math.PI * 2
  }

  // Создание geometry с attributes
  starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
  starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  starGeometry.setAttribute('aTwinkleOffset', new THREE.BufferAttribute(twinkleOffsets, 1))

  // Shader material с custom shaders
  starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 1.0 }, // Будет модулироваться в S6-T5 (audio reactive)
    },
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending, // Аддитивное смешивание для свечения
    depthWrite: false,
  })

  // Создание Points object
  starParticles = new THREE.Points(starGeometry, starMaterial)
  starParticles.frustumCulled = false
  scene.add(starParticles)

  console.log('[BackgroundLayer] Star particles created:', NUM_STARS)
}

/**
 * Animation loop
 */
function animate() {
  animationFrameId = requestAnimationFrame(animate)

  // S6-T2: Обновление времени для star shader
  if (starMaterial) {
    starMaterial.uniforms.uTime.value = performance.now()
  }

  // TODO (S6-T3): Animate nebulae (breathing, movement)
  // TODO (S6-T5): Audio reactivity

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

/**
 * Обработка ресайза окна
 */
function handleResize() {
  if (!containerRef.value) return

  width = containerRef.value.clientWidth
  height = containerRef.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  console.log('[BackgroundLayer] Resized:', { width, height })
}

/**
 * Cleanup
 */
function cleanup() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  // Dispose star particle system
  if (starParticles) {
    scene.remove(starParticles)
    starGeometry?.dispose()
    starMaterial?.dispose()
    starParticles = null
  }

  // Dispose Three.js objects
  if (renderer) {
    renderer.dispose()
  }

  if (scene) {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose()
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      }
    })
  }

  console.log('[BackgroundLayer] Cleaned up')
}

// Lifecycle
onMounted(() => {
  initThreeJS()
  animate()

  // Resize listener
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('resize', handleResize)
})

// Watch для audio reactivity (будет использоваться в S6-T5)
watch(() => props.rmsLevel, () => {
  // TODO (S6-T5): Implement audio reactivity
  // - Nebulae opacity увеличивается на 20% при loud sounds
  // - Particles ускорение движения при peaks
  // - Gradient subtle brightness pulse
})
</script>

<template>
  <div ref="containerRef" class="background-layer">
    <!-- CSS gradient background -->
    <div class="gradient-background" />

    <!-- Three.js canvas -->
    <canvas ref="canvasRef" />
  </div>
</template>

<style scoped>
.background-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1; /* За струнами */
  overflow: hidden;
}

.gradient-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  /* Космический градиент (из дизайн-спеки) */
  background: linear-gradient(
    180deg,
    #1a0033 0%,    /* Deep purple */
    #0a192f 50%,   /* Dark blue */
    #020617 100%   /* Darkest */
  );
}

canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Не блокируем взаимодействие со струнами */
}
</style>
