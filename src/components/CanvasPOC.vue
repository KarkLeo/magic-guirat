<template>
  <div class="canvas-poc">
    <h2>Canvas 2D API - POC</h2>
    <div class="controls">
      <button @click="simulateStrum">Симуляция удара по струнам</button>
      <button @click="simulateChord">Симуляция аккорда (C Major)</button>
    </div>
    <canvas ref="canvasRef" width="800" height="600"></canvas>
    <div class="info">
      <p><strong>Технологии:</strong> Canvas 2D API + requestAnimationFrame</p>
      <p><strong>FPS:</strong> {{ fps }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
const fps = ref(60)

// Состояние струн
const strings = [
  { note: 'E2', y: 100, active: 0, color: '#8b5cf6' },
  { note: 'A2', y: 180, active: 0, color: '#6366f1' },
  { note: 'D3', y: 260, active: 0, color: '#3b82f6' },
  { note: 'G3', y: 340, active: 0, color: '#06b6d4' },
  { note: 'B3', y: 420, active: 0, color: '#8b5cf6' },
  { note: 'E4', y: 500, active: 0, color: '#6366f1' }
]

let ctx = null
let animationId = null
let lastTime = performance.now()
let frameCount = 0

// Инициализация Canvas
onMounted(() => {
  ctx = canvasRef.value.getContext('2d')
  animate()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})

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

  // Очистка и фон
  ctx.fillStyle = '#0f0f23'
  ctx.fillRect(0, 0, 800, 600)

  // Отрисовка струн
  strings.forEach((string) => {
    drawString(string)
    // Затухание активности
    if (string.active > 0) {
      string.active -= 0.02
    }
  })
}

// Отрисовка струны с эффектом свечения
function drawString(string) {
  const intensity = Math.max(0, string.active)
  const glowSize = 20 + intensity * 30

  ctx.save()

  // Внешнее свечение (glow effect)
  if (intensity > 0) {
    const gradient = ctx.createRadialGradient(400, string.y, 0, 400, string.y, glowSize)
    gradient.addColorStop(0, `${string.color}80`)
    gradient.addColorStop(0.5, `${string.color}40`)
    gradient.addColorStop(1, `${string.color}00`)

    ctx.fillStyle = gradient
    ctx.fillRect(0, string.y - glowSize, 800, glowSize * 2)
  }

  // Основная линия струны
  ctx.strokeStyle = intensity > 0.1 ? string.color : '#4a5568'
  ctx.lineWidth = intensity > 0.1 ? 3 + intensity * 2 : 2
  ctx.shadowBlur = intensity * 20
  ctx.shadowColor = string.color

  ctx.beginPath()
  ctx.moveTo(50, string.y)
  ctx.lineTo(750, string.y)
  ctx.stroke()

  // Название ноты
  ctx.fillStyle = intensity > 0.1 ? string.color : '#718096'
  ctx.font = 'bold 14px monospace'
  ctx.shadowBlur = 0
  ctx.fillText(string.note, 10, string.y + 5)

  ctx.restore()
}

// Симуляция удара по струнам
function simulateStrum() {
  strings.forEach((string, index) => {
    setTimeout(() => {
      string.active = 1.0
    }, index * 50)
  })
}

// Симуляция аккорда (C Major: C-E-G)
function simulateChord() {
  // C Major на гитаре: струны 5(A), 4(D), 3(G), 2(B), 1(E)
  const chordStrings = [1, 2, 3, 4, 5] // индексы струн

  chordStrings.forEach((index) => {
    strings[index].active = 1.0
  })
}
</script>

<style scoped>
.canvas-poc {
  padding: 2rem;
  background: #1a1a2e;
  border-radius: 12px;
  color: #e2e8f0;
}

h2 {
  color: #8b5cf6;
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

canvas {
  border: 2px solid #4a5568;
  border-radius: 8px;
  display: block;
  background: #0f0f23;
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
