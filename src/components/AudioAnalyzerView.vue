<template>
  <div class="audio-analyzer-view">
    <!-- Кнопка захвата звука -->
    <AudioCaptureButton
      :is-capturing="isCapturing"
      :is-requesting-permission="isRequestingPermission"
      :error="error"
      :has-error="hasError"
      :audio-level="audioLevel"
      @toggle-capture="toggleCapture"
    />

    <!-- Визуализация струн гитары -->
    <transition name="fade">
      <GuitarStringsVisualization
        v-if="isCapturing"
        :active-string-index="activeStringIndex"
        :intensity="stringIntensity"
        :is-active="isCapturing"
      />
    </transition>

    <!-- Визуализатор спектра (показывается только при активном захвате) -->
    <transition name="fade">
      <FrequencySpectrumVisualizer
        v-if="isCapturing && analyserNode"
        :analyser-node="analyserNode"
        :is-active="isCapturing"
        :detected-pitch="detectedPitch"
        :pitch-confidence="pitchConfidence"
        :detected-note="detectedNote"
        :is-essentia-loaded="false"
      />
    </transition>
  </div>
</template>

<script setup>
import { computed, watch, onUnmounted } from 'vue'
import { useAudioCapture } from '@/composables/useAudioCapture'
import { useFrequencyAnalyzer } from '@/composables/useFrequencyAnalyzer'
import { getActiveString } from '@/utils/guitarMapping'
import AudioCaptureButton from './AudioCaptureButton.vue'
import GuitarStringsVisualization from './GuitarStringsVisualization.vue'
import FrequencySpectrumVisualizer from './FrequencySpectrumVisualizer.vue'

// Используем composable для работы с аудио
const {
  isCapturing,
  isRequestingPermission,
  error,
  audioLevel,
  hasError,
  startCapture,
  stopCapture,
  getAnalyserNode,
} = useAudioCapture()

// Получаем AnalyserNode для визуализатора
const analyserNode = computed(() => getAnalyserNode())

// Используем frequency analyzer для pitch detection (FFT)
const frequencyAnalyzer = computed(() => {
  const node = analyserNode.value
  return node ? useFrequencyAnalyzer(node) : null
})

// Деструктуризация FFT данных для pitch detection
const detectedPitch = computed(() => frequencyAnalyzer.value?.dominantFrequency.value || 0)
const detectedNote = computed(() => {
  if (!frequencyAnalyzer.value || !detectedPitch.value) {
    return { note: '', octave: 0, cents: 0 }
  }
  return frequencyAnalyzer.value.frequencyToNote(detectedPitch.value)
})

// Confidence из YIN алгоритма (реальное качество определения pitch)
const pitchConfidence = computed(() => frequencyAnalyzer.value?.pitchConfidence.value || 0)

// Определение активной струны (с фильтрацией по confidence)
const activeStringIndex = computed(() => {
  const note = detectedNote.value
  const pitch = detectedPitch.value
  const confidence = pitchConfidence.value

  if (!note.note || pitch === 0 || confidence < 0.3) {
    return null
  }

  const activeString = getActiveString({
    note: note.note,
    octave: note.octave,
    frequency: pitch,
  })

  console.log('Detected:', `${note.note}${note.octave} (${pitch} Hz)`,
              'confidence:', confidence.toFixed(2),
              '-> String:', activeString ? `${activeString.string.index} (${activeString.string.fullNote})` : 'none',
              'Method:', activeString?.method)

  return activeString ? activeString.string.index : null
})

// Интенсивность свечения струны
const stringIntensity = computed(() => {
  // Комбинируем pitchConfidence и audioLevel для лучшей отзывчивости
  const confidence = pitchConfidence.value
  const level = audioLevel.value || 0

  // Если есть pitch с хорошим confidence, используем его
  if (confidence >= 0.5) {
    return confidence
  }

  // Если pitch есть но confidence низкий, комбинируем с audioLevel
  if (detectedPitch.value > 0 && confidence > 0) {
    return Math.max(confidence, level * 0.8) // Используем большее значение
  }

  // Fallback на audioLevel
  return level
})

// Переключение состояния захвата
const toggleCapture = async () => {
  if (isCapturing.value) {
    stopCapture()
    // Остановка frequency analysis
    if (frequencyAnalyzer.value) {
      frequencyAnalyzer.value.stopAnalysis()
    }
  } else {
    await startCapture()
  }
}

// Запускаем frequency analysis когда захват активен
watch(
  () => isCapturing.value,
  async (capturing) => {
    if (capturing && frequencyAnalyzer.value) {
      // Небольшая задержка для инициализации analyserNode
      setTimeout(() => {
        frequencyAnalyzer.value?.startAnalysis()
      }, 100)
    }
  },
)

// Очистка при размонтировании компонента
onUnmounted(() => {
  // Останавливаем захват звука
  if (isCapturing.value) {
    stopCapture()
  }
  // Останавливаем анализ частот
  if (frequencyAnalyzer.value?.isAnalyzing.value) {
    frequencyAnalyzer.value.stopAnalysis()
  }
})
</script>

<style scoped>
.audio-analyzer-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: 900px;
}

/* Transition для появления спектра */
.fade-enter-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.6, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.98);
}

/* Responsive */
@media (max-width: 768px) {
  .audio-analyzer-view {
    gap: 1.5rem;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .audio-analyzer-view {
    gap: 1rem;
  }
}
</style>
