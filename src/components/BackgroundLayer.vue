<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'

// Props - Audio reactivity (будет использоваться в S6-T5)
const props = defineProps({
  rmsLevel: {
    type: Number,
    default: 0,
  },
})

// Template refs
const canvasRef = ref()
const containerRef = ref()

// Three.js objects
let scene
let camera
let renderer
let animationFrameId

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

  // TODO (S6-T2): Add particle system
  // TODO (S6-T3): Add nebula spheres
  // TODO (S6-T4): Add grid lines

  console.log('[BackgroundLayer] Three.js initialized:', { width, height })
}

/**
 * Animation loop
 */
function animate() {
  animationFrameId = requestAnimationFrame(animate)

  // TODO (S6-T2): Update particles
  // TODO (S6-T3): Animate nebulae (breathing, movement)
  // TODO (S6-T5): Audio reactivity

  renderer.render(scene, camera)
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
}
</style>
