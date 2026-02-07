<template>
  <div class="spectrum-visualizer">
    <canvas ref="canvasRef" class="spectrum-canvas" role="img" aria-label="Визуализация частотного спектра"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useFrequencyAnalyzer } from '@/composables/useFrequencyAnalyzer'

const props = defineProps({
  analyserNode: {
    type: Object,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  detectedPitch: {
    type: Number,
    default: 0,
  },
  pitchConfidence: {
    type: Number,
    default: 0,
  },
  detectedNote: {
    type: Object,
    default: () => ({ note: '', octave: 0, cents: 0 }),
  },
  isEssentiaLoaded: {
    type: Boolean,
    default: false,
  },
})

// Canvas ref
const canvasRef = ref(null)

// Частотный анализатор
const analyzer = props.analyserNode
  ? useFrequencyAnalyzer(props.analyserNode)
  : null

const {
  dominantFrequency,
  isAnalyzing,
  startAnalysis,
  stopAnalysis,
  getFrequencySpectrum,
  GUITAR_MIN_FREQ,
  GUITAR_MAX_FREQ,
} = analyzer || {}

// Animation frame ID
let animationFrameId = null

// Canvas размеры — рассчитываются динамически
let canvasWidth = 0
let canvasHeight = 0
const BAR_GAP = 3
const BAR_WIDTH = 10

/**
 * Обновляет размеры canvas под viewport
 */
const updateCanvasSize = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const dpr = Math.min(window.devicePixelRatio, 2)
  canvasWidth = window.innerWidth
  canvasHeight = Math.round(window.innerHeight * 0.18)

  canvas.width = canvasWidth * dpr
  canvas.height = canvasHeight * dpr
  canvas.style.width = canvasWidth + 'px'
  canvas.style.height = canvasHeight + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
}

/**
 * Рендерит спектр на canvas
 */
const renderSpectrum = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')

  // Очищаем canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // Фоновый градиент — мягкий переход к прозрачности
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight)
  bgGradient.addColorStop(0, 'rgba(15, 12, 41, 0)')
  bgGradient.addColorStop(0.3, 'rgba(15, 12, 41, 0.4)')
  bgGradient.addColorStop(1, 'rgba(15, 12, 41, 0.8)')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Если анализатор не активен — пустой спектр
  if (!isAnalyzing?.value || !getFrequencySpectrum) {
    animationFrameId = requestAnimationFrame(renderSpectrum)
    return
  }

  // Динамическое количество баров
  const numBars = Math.floor(canvasWidth / (BAR_WIDTH + BAR_GAP))

  // Получаем спектр для гитарного диапазона
  const spectrum = getFrequencySpectrum(GUITAR_MIN_FREQ, GUITAR_MAX_FREQ, numBars)

  // Центрируем бары
  const totalBarsWidth = numBars * (BAR_WIDTH + BAR_GAP) - BAR_GAP
  const offsetX = (canvasWidth - totalBarsWidth) / 2

  // Рисуем бары
  for (let i = 0; i < spectrum.length; i++) {
    const amplitude = spectrum[i] / 255
    const barHeight = amplitude * canvasHeight * 0.85

    const x = offsetX + i * (BAR_WIDTH + BAR_GAP)
    const y = canvasHeight - barHeight

    // Градиент для бара
    const gradient = ctx.createLinearGradient(x, y, x, canvasHeight)
    gradient.addColorStop(0, `rgba(240, 147, 251, ${0.4 + amplitude * 0.6})`)
    gradient.addColorStop(0.5, `rgba(168, 85, 247, ${0.3 + amplitude * 0.5})`)
    gradient.addColorStop(1, `rgba(102, 126, 234, ${0.2 + amplitude * 0.3})`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(x, y, BAR_WIDTH, barHeight, 2)
    ctx.fill()

    // Glow для высоких амплитуд
    if (amplitude > 0.5) {
      ctx.shadowBlur = 8
      ctx.shadowColor = `rgba(240, 147, 251, ${amplitude * 0.5})`
      ctx.fillRect(x, y, BAR_WIDTH, barHeight)
      ctx.shadowBlur = 0
    }
  }

  animationFrameId = requestAnimationFrame(renderSpectrum)
}

/**
 * Обработчик resize
 */
const handleResize = () => {
  updateCanvasSize()
}

/**
 * Запускает или останавливает анализ
 */
watch(
  () => props.isActive,
  (active) => {
    if (active && analyzer && startAnalysis) {
      startAnalysis()
    } else if (!active && analyzer && stopAnalysis) {
      stopAnalysis()
    }
  },
  { immediate: true },
)

// Lifecycle
onMounted(() => {
  updateCanvasSize()
  window.addEventListener('resize', handleResize)
  renderSpectrum()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (isAnalyzing?.value && stopAnalysis) {
    stopAnalysis()
  }
})
</script>

<style scoped>
.spectrum-visualizer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 5;
  pointer-events: none;
}

.spectrum-canvas {
  display: block;
  width: 100%;
}
</style>
