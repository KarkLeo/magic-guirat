<template>
  <div class="spectrum-visualizer">
    <div class="spectrum-header">
      <h3 class="spectrum-title">
        Частотный спектр
        <span v-if="isEssentiaLoaded" class="essentia-badge" aria-label="Essentia.js загружен">✨ Essentia.js</span>
      </h3>
      <!-- Essentia Pitch (приоритет если доступен) -->
      <div v-if="detectedPitch > 0 && pitchConfidence > 0" class="dominant-info" role="status" aria-live="polite">
        <span class="freq-value">{{ detectedPitch }} Hz</span>
        <span v-if="detectedNote.note" class="note-value">
          {{ detectedNote.note }}{{ detectedNote.octave }}
          <span v-if="Math.abs(detectedNote.cents) > 10" class="cents">
            {{ detectedNote.cents > 0 ? '+' : '' }}{{ detectedNote.cents }}¢
          </span>
        </span>
        <span class="confidence-badge">{{ Math.round(pitchConfidence * 100) }}%</span>
      </div>
      <!-- Fallback на FFT частоту если Essentia не определил -->
      <div v-else-if="dominantFrequency > 0" class="dominant-info fallback">
        <span class="freq-value">{{ dominantFrequency }} Hz</span>
        <span v-if="dominantNote.note" class="note-value">
          {{ dominantNote.note }}{{ dominantNote.octave }}
        </span>
        <span class="method-label">FFT</span>
      </div>
      <div v-else class="dominant-info idle">
        <span class="idle-text">Тишина...</span>
      </div>
    </div>

    <div class="spectrum-container">
      <canvas ref="canvasRef" class="spectrum-canvas" role="img" aria-label="Визуализация частотного спектра"></canvas>
    </div>

    <div class="spectrum-footer">
      <span class="freq-label">{{ GUITAR_MIN_FREQ }} Hz</span>
      <span class="freq-label center">Гитарный диапазон</span>
      <span class="freq-label">{{ GUITAR_MAX_FREQ }} Hz</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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

// Деструктуризация для удобства
const {
  dominantFrequency,
  isAnalyzing,
  startAnalysis,
  stopAnalysis,
  getFrequencySpectrum,
  frequencyToNote,
  GUITAR_MIN_FREQ,
  GUITAR_MAX_FREQ,
} = analyzer || {}

// Computed для ноты
const dominantNote = computed(() => {
  if (!frequencyToNote || !dominantFrequency?.value) {
    return { note: '', octave: 0, cents: 0 }
  }
  return frequencyToNote(dominantFrequency.value)
})

// Animation frame ID
let animationFrameId = null

// Canvas размеры
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 200
const BAR_WIDTH = 12
const BAR_GAP = 4
const NUM_BARS = Math.floor(CANVAS_WIDTH / (BAR_WIDTH + BAR_GAP))

/**
 * Инициализирует canvas
 */
const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  // Устанавливаем размеры
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  // Начинаем рендеринг
  renderSpectrum()
}

/**
 * Рендерит спектр на canvas
 */
const renderSpectrum = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height

  // Очищаем canvas
  ctx.fillStyle = 'rgba(15, 12, 41, 0.3)'
  ctx.fillRect(0, 0, width, height)

  // Если анализатор не активен, просто показываем пустой спектр
  if (!isAnalyzing?.value || !getFrequencySpectrum) {
    animationFrameId = requestAnimationFrame(renderSpectrum)
    return
  }

  // Получаем спектр для гитарного диапазона
  const spectrum = getFrequencySpectrum(GUITAR_MIN_FREQ, GUITAR_MAX_FREQ, NUM_BARS)

  // Рисуем бары
  for (let i = 0; i < spectrum.length; i++) {
    const amplitude = spectrum[i] // 0-255
    const normalizedAmplitude = amplitude / 255 // 0-1

    // Вычисляем высоту бара
    const barHeight = normalizedAmplitude * height * 0.9 // 90% высоты canvas

    // Позиция бара
    const x = i * (BAR_WIDTH + BAR_GAP)
    const y = height - barHeight

    // Градиент для бара (фиолетово-синий)
    const gradient = ctx.createLinearGradient(x, y, x, height)
    gradient.addColorStop(0, '#f093fb')
    gradient.addColorStop(0.5, '#a855f7')
    gradient.addColorStop(1, '#667eea')

    // Рисуем бар
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, BAR_WIDTH, barHeight)

    // Добавляем glow эффект для высоких амплитуд
    if (normalizedAmplitude > 0.5) {
      ctx.shadowBlur = 10
      ctx.shadowColor = '#f093fb'
      ctx.fillRect(x, y, BAR_WIDTH, barHeight)
      ctx.shadowBlur = 0
    }
  }

  // Рисуем grid линии
  drawGrid(ctx, width, height)

  // Запрашиваем следующий кадр
  animationFrameId = requestAnimationFrame(renderSpectrum)
}

/**
 * Рисует grid линии на canvas
 */
const drawGrid = (ctx, width, height) => {
  ctx.strokeStyle = 'rgba(168, 181, 255, 0.1)'
  ctx.lineWidth = 1

  // Горизонтальные линии (уровни амплитуды)
  const numHorizontalLines = 4
  for (let i = 1; i <= numHorizontalLines; i++) {
    const y = (height / (numHorizontalLines + 1)) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

/**
 * Запускает или останавливает анализ в зависимости от isActive
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

// Lifecycle hooks
onMounted(() => {
  initCanvas()
})

onUnmounted(() => {
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(15, 12, 41, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(168, 181, 255, 0.2);
  backdrop-filter: blur(10px);
}

/* Header */
.spectrum-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.spectrum-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #a8b5ff;
  margin: 0;
}

.dominant-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  min-height: auto;
}

.dominant-info.idle {
  opacity: 0.5;
}

.freq-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f093fb;
  font-variant-numeric: tabular-nums;
}

.note-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #667eea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cents {
  font-size: 0.875rem;
  color: #a8b5ff;
  opacity: 0.7;
}

.idle-text {
  font-size: 1rem;
  color: #a8b5ff;
  font-style: italic;
}

/* Canvas container */
.spectrum-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(15, 12, 41, 0.8);
}

.spectrum-canvas {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: crisp-edges;
}

/* Footer */
.spectrum-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.freq-label {
  font-size: 0.75rem;
  color: #a8b5ff;
  opacity: 0.7;
}

.freq-label.center {
  font-weight: 600;
  opacity: 1;
}

/* Responsive */
@media (max-width: 900px) {
  .spectrum-visualizer {
    padding: 1rem;
  }

  .spectrum-title {
    font-size: 1rem;
  }

  .freq-value {
    font-size: 1.25rem;
  }

  .note-value {
    font-size: 1rem;
  }
}

@media (max-width: 768px) {
  .spectrum-visualizer {
    padding: 0.875rem;
    gap: 0.75rem;
  }

  .spectrum-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .spectrum-title {
    font-size: 0.95rem;
  }

  .essentia-badge {
    font-size: 0.65rem;
    padding: 0.2rem 0.4rem;
    margin-left: 0.375rem;
  }

  .dominant-info {
    align-items: flex-start;
    width: 100%;
  }

  .freq-value {
    font-size: 1.125rem;
  }

  .note-value {
    font-size: 0.95rem;
    gap: 0.375rem;
  }

  .cents {
    font-size: 0.75rem;
  }

  .confidence-badge,
  .method-label {
    font-size: 0.65rem;
    padding: 0.2rem 0.4rem;
  }

  .spectrum-footer {
    font-size: 0.7rem;
  }

  .freq-label {
    font-size: 0.65rem;
  }
}

@media (max-width: 480px) {
  .spectrum-visualizer {
    padding: 0.75rem;
    gap: 0.625rem;
  }

  .spectrum-header {
    gap: 0.5rem;
  }

  .spectrum-title {
    font-size: 0.875rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }

  .essentia-badge {
    font-size: 0.6rem;
    padding: 0.15rem 0.35rem;
    margin-left: 0.25rem;
  }

  .freq-value {
    font-size: 1rem;
  }

  .note-value {
    font-size: 0.875rem;
  }

  .cents {
    font-size: 0.7rem;
  }

  .idle-text {
    font-size: 0.875rem;
  }

  .confidence-badge,
  .method-label {
    font-size: 0.6rem;
    padding: 0.15rem 0.35rem;
  }

  .spectrum-footer {
    gap: 0.25rem;
  }

  .freq-label {
    font-size: 0.6rem;
  }

  .freq-label.center {
    display: none; /* Hide on very small screens */
  }
}

/* Essentia badge */
.essentia-badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  margin-left: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  color: #fff;
}

.essentia-badge.loading {
  background: linear-gradient(135deg, #a8b5ff 0%, #c5b4e3 100%);
  animation: pulse-slow 2s ease-in-out infinite;
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Confidence badge */
.confidence-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  background: rgba(102, 126, 234, 0.2);
  border: 1px solid rgba(102, 126, 234, 0.4);
  border-radius: 4px;
  color: #667eea;
  margin-top: 0.25rem;
}

/* Method label (FFT fallback) */
.method-label {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  background: rgba(168, 181, 255, 0.2);
  border-radius: 4px;
  color: #a8b5ff;
  margin-top: 0.25rem;
}

.dominant-info.fallback .freq-value {
  color: #a8b5ff;
}
</style>
