<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import starVertexShader from '@/shaders/starVertex.glsl?raw'
import starFragmentShader from '@/shaders/starFragment.glsl?raw'

// Props - Audio reactivity (will be used in S6-T5)
const props = defineProps({
  rmsLevel: {
    type: Number,
    default: 0,
  },
})

// === CONSTANTS ===
const NUM_STARS = 800 // Number of stars
const STAR_SPREAD = 40 // Distribution radius of stars (reduced for visibility)
const STAR_DEPTH = 50 // Distribution depth along Z

// Template refs
const canvasRef = ref()
const containerRef = ref()

// Three.js objects
let scene
let camera
let renderer
let animationFrameId

// Particle system for stars
let starParticles = null
let starGeometry = null
let starMaterial = null

// Sizes
let width = 0
let height = 0

/**
 * Initialize Three.js scene
 */
function initThreeJS() {
  if (!canvasRef.value || !containerRef.value) return

  // Container sizes
  width = containerRef.value.clientWidth
  height = containerRef.value.clientHeight

  // Scene
  scene = new THREE.Scene()
  scene.background = null // Transparent background (use CSS gradient)

  // Camera
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.z = 50

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true, // Transparent background
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0) // Black with alpha 0 (fully transparent)

  // S6-T2: Create stars
  createStarParticles()

  // TODO (S6-T3): Add nebula spheres

  console.log('[BackgroundLayer] Three.js initialized:', { width, height })
}

/**
 * S6-T2: Creates particle system for stars
 * GPU-optimized system with Float32Array buffers
 */
function createStarParticles() {
  // Initialize typed arrays
  const positions = new Float32Array(NUM_STARS * 3)
  const alphas = new Float32Array(NUM_STARS)
  const sizes = new Float32Array(NUM_STARS)
  const twinkleOffsets = new Float32Array(NUM_STARS)

  // DEBUG: First 10 stars - test (large, bright, in center)
  for (let i = 0; i < 10; i++) {
    positions[i * 3 + 0] = (i - 5) * 2 // x: from -10 to 10
    positions[i * 3 + 1] = 0 // y: center
    positions[i * 3 + 2] = -80 // z: straight ahead of camera
    alphas[i] = 1.0 // Fully opaque
    sizes[i] = 10.0 // VERY large
    twinkleOffsets[i] = 0
  }

  // Generate remaining stars with random parameters
  for (let i = 10; i < NUM_STARS; i++) {
    // Position: uniform distribution in 3D space
    const theta = Math.random() * Math.PI * 2 // Angle
    const radius = Math.random() * STAR_SPREAD // Radius from center
    // Z: stars should be AHEAD of camera in view direction
    // Camera at z=50, stars from -50 to -150 (ahead of camera in view direction)
    const z = -50 - Math.random() * STAR_DEPTH * 2 // From -50 to -150

    positions[i * 3 + 0] = Math.cos(theta) * radius // x
    positions[i * 3 + 1] = Math.sin(theta) * radius // y
    positions[i * 3 + 2] = z

    // Alpha: most stars bright for visibility
    const brightness = Math.random()
    // Increased for visibility: 0.6-1.0
    alphas[i] = brightness < 0.7 ? 0.6 + Math.random() * 0.3 : 0.9 + Math.random() * 0.1

    // Size: different sizes (small and large stars)
    // Increased for better visibility: 2-6px
    sizes[i] = brightness < 0.7 ? 2.0 + Math.random() * 2.0 : 4.0 + Math.random() * 2.0

    // Twinkle offset: random phase for asynchronous twinkling
    twinkleOffsets[i] = Math.random() * Math.PI * 2
  }

  // Create geometry with attributes
  starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
  starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  starGeometry.setAttribute('aTwinkleOffset', new THREE.BufferAttribute(twinkleOffsets, 1))

  // Shader material with custom shaders
  starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 1.0 }, // Will be modulated in S6-T5 (audio reactive)
    },
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending, // Additive blending for glow
    depthWrite: false,
  })

  // Create Points object
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

  // S6-T2: Update time for star shader
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
 * Handle window resize
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

// Watch for audio reactivity (will be used in S6-T5)
watch(() => props.rmsLevel, () => {
  // TODO (S6-T5): Implement audio reactivity
  // - Nebulae opacity increases by 20% on loud sounds
  // - Particles accelerate movement on peaks
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
  z-index: -1; /* Behind strings */
  overflow: hidden;
}

.gradient-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  /* Cosmic gradient (from design spec) */
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
  pointer-events: none; /* Don't block interaction with strings */
}
</style>
