<template>
  <div class="three-poc">
    <h2>Three.js - POC</h2>
    <div class="controls">
      <button @click="simulateStrum">Симуляция удара по струнам</button>
      <button @click="simulateChord">Симуляция аккорда (C Major)</button>
    </div>
    <div ref="containerRef" class="three-container"></div>
    <div class="info">
      <p><strong>Технологии:</strong> Three.js + WebGL</p>
      <p><strong>FPS:</strong> {{ fps }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const containerRef = ref(null)
const fps = ref(60)

let scene, camera, renderer
let strings = []
let animationId = null
let lastTime = performance.now()
let frameCount = 0

// Конфигурация струн
const stringConfig = [
  { note: 'E2', z: -2.5, color: 0x8b5cf6 },
  { note: 'A2', z: -1.5, color: 0x6366f1 },
  { note: 'D3', z: -0.5, color: 0x3b82f6 },
  { note: 'G3', z: 0.5, color: 0x06b6d4 },
  { note: 'B3', z: 1.5, color: 0x8b5cf6 },
  { note: 'E4', z: 2.5, color: 0x6366f1 }
]

onMounted(() => {
  initThree()
  animate()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (renderer) {
    renderer.dispose()
  }
})

// Инициализация Three.js
function initThree() {
  // Сцена
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0f0f23)

  // Камера
  camera = new THREE.PerspectiveCamera(
    75,
    800 / 600,
    0.1,
    1000
  )
  camera.position.set(0, 0, 8)

  // Рендерер
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(800, 600)
  containerRef.value.appendChild(renderer.domElement)

  // Создание струн
  stringConfig.forEach((config) => {
    const string = createString(config)
    strings.push(string)
    scene.add(string.group)
  })

  // Освещение
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 1)
  pointLight.position.set(0, 0, 10)
  scene.add(pointLight)
}

// Создание струны с эффектом свечения
function createString(config) {
  const group = new THREE.Group()

  // Основная линия струны
  const geometry = new THREE.CylinderGeometry(0.02, 0.02, 10, 16)
  geometry.rotateZ(Math.PI / 2)
  
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    emissive: config.color,
    emissiveIntensity: 0,
    metalness: 0.8,
    roughness: 0.2
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.z = config.z
  group.add(mesh)

  // Glow эффект (большой полупрозрачный цилиндр)
  const glowGeometry = new THREE.CylinderGeometry(0.3, 0.3, 10, 16)
  glowGeometry.rotateZ(Math.PI / 2)
  
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: config.color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending
  })

  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
  glowMesh.position.z = config.z
  group.add(glowMesh)

  // Текст с названием ноты
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 128
  canvas.height = 64
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(config.note, 64, 32)

  const texture = new THREE.CanvasTexture(canvas)
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.position.set(-6, 0, config.z)
  sprite.scale.set(0.8, 0.4, 1)
  group.add(sprite)

  return {
    group,
    mesh,
    glowMesh,
    material,
    glowMaterial,
    active: 0,
    config
  }
}

// Главный цикл анимации
function animate(currentTime) {
  animationId = requestAnimationFrame(animate)

  // Подсчет FPS
  frameCount++
  if (currentTime - lastTime >= 1000) {
    fps.value = frameCount
    frameCount = 0
    lastTime = currentTime
  }

  // Обновление струн
  strings.forEach((string) => {
    updateString(string)
  })

  renderer.render(scene, camera)
}

// Обновление состояния струны
function updateString(string) {
  const intensity = Math.max(0, string.active)

  // Интенсивность свечения
  string.material.emissiveIntensity = intensity * 2
  string.glowMaterial.opacity = intensity * 0.6

  // Пульсация
  const pulse = Math.sin(Date.now() * 0.01) * 0.1 * intensity
  string.mesh.scale.y = 1 + pulse

  // Затухание
  if (string.active > 0) {
    string.active -= 0.02
  }
}

// Симуляция удара по струнам
function simulateStrum() {
  strings.forEach((string, index) => {
    setTimeout(() => {
      string.active = 1.0
    }, index * 50)
  })
}

// Симуляция аккорда (C Major)
function simulateChord() {
  const chordStrings = [1, 2, 3, 4, 5]
  chordStrings.forEach((index) => {
    strings[index].active = 1.0
  })
}
</script>

<style scoped>
.three-poc {
  padding: 2rem;
  background: #1a1a2e;
  border-radius: 12px;
  color: #e2e8f0;
}

h2 {
  color: #6366f1;
  margin-bottom: 1rem;
}

.controls {
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
}

button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s;
}

button:hover {
  transform: translateY(-2px);
}

button:active {
  transform: translateY(0);
}

.three-container {
  border: 2px solid #4a5568;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.info {
  margin-top: 1rem;
  padding: 1rem;
  background: #2d3748;
  border-radius: 8px;
  font-size: 0.9rem;
}

.info p {
  margin: 0.5rem 0;
}
</style>
