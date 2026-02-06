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

    <!-- Визуализатор спектра (показывается только при активном захвате) -->
    <transition name="fade">
      <FrequencySpectrumVisualizer
        v-if="isCapturing && analyserNode"
        :analyser-node="analyserNode"
        :is-active="isCapturing"
        :detected-pitch="detectedPitch"
        :pitch-confidence="pitchConfidence"
        :detected-note="detectedNote"
        :is-essentia-loaded="isEssentiaLoaded"
      />
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAudioCapture } from '@/composables/useAudioCapture'
import { usePitchDetector } from '@/composables/usePitchDetector'
import AudioCaptureButton from './AudioCaptureButton.vue'
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

// Используем pitch detector с analyserNode
const pitchDetector = computed(() => {
  const node = analyserNode.value
  return node ? usePitchDetector(node) : null
})

// Деструктуризация pitch detector данных
const detectedPitch = computed(() => pitchDetector.value?.detectedPitch.value || 0)
const pitchConfidence = computed(() => pitchDetector.value?.pitchConfidence.value || 0)
const detectedNote = computed(
  () => pitchDetector.value?.detectedNote.value || { note: '', octave: 0, cents: 0 },
)
const isEssentiaLoaded = computed(() => pitchDetector.value?.isEssentiaLoaded.value || false)

// Переключение состояния захвата
const toggleCapture = async () => {
  if (isCapturing.value) {
    stopCapture()
    // Остановка pitch detection
    if (pitchDetector.value) {
      pitchDetector.value.stopDetection()
    }
  } else {
    await startCapture()
  }
}

// Запускаем pitch detection когда захват активен
watch(
  () => isCapturing.value,
  async (capturing) => {
    if (capturing && pitchDetector.value) {
      // Небольшая задержка для инициализации analyserNode
      setTimeout(() => {
        pitchDetector.value?.startDetection()
      }, 100)
    }
  },
)
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
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
