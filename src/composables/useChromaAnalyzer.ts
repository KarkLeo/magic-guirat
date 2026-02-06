import { ref, shallowRef } from 'vue'
import type { UseChromaAnalyzerReturn } from '@/types'

/**
 * Composable для вычисления chromagram из FFT данных
 * Chromagram агрегирует FFT bins в 12 pitch classes (C, C#, D, ..., B)
 *
 * ВАЖНО: Не использует onUnmounted, т.к. может вызываться внутри computed.
 * Очистка должна выполняться вручную через stopAnalysis()
 */
export function useChromaAnalyzer(analyserNode: AnalyserNode | null): UseChromaAnalyzerReturn {
  const chromagram = shallowRef<Float32Array>(new Float32Array(12))
  const activePitchClasses = ref<Set<number>>(new Set())
  const isAnalyzing = ref<boolean>(false)

  let animationFrameId: number | null = null
  let spectrumBuffer: Uint8Array | null = null

  // Частота C0 для расчёта pitch class
  const C0 = 16.35

  // Минимальная частота для анализа (ниже E2 не интересно)
  const MIN_FREQ = 60
  // Максимальная частота (выше ~1.5kHz гармоники менее полезны для аккордов)
  const MAX_FREQ = 1500

  // Порог активности pitch class (относительно максимума chromagram)
  const ACTIVATION_THRESHOLD = 0.3

  /**
   * Запускает анализ chromagram
   */
  const startAnalysis = (): void => {
    if (!analyserNode) {
      console.warn('useChromaAnalyzer: AnalyserNode не предоставлен')
      return
    }

    isAnalyzing.value = true
    spectrumBuffer = new Uint8Array(analyserNode.frequencyBinCount)
    analyze()
    console.log('Chromagram анализ запущен')
  }

  /**
   * Останавливает анализ
   */
  const stopAnalysis = (): void => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    isAnalyzing.value = false
    chromagram.value = new Float32Array(12)
    activePitchClasses.value = new Set()
    spectrumBuffer = null
  }

  /**
   * Основной цикл анализа
   */
  const analyze = (): void => {
    if (!analyserNode || !isAnalyzing.value) return

    if (spectrumBuffer) {
      analyserNode.getByteFrequencyData(spectrumBuffer as any)

      const sampleRate = analyserNode.context.sampleRate
      const binCount = analyserNode.frequencyBinCount
      const binWidth = sampleRate / 2 / binCount

      // Индексы для нужного диапазона частот
      const minBin = Math.max(1, Math.floor(MIN_FREQ / binWidth))
      const maxBin = Math.min(binCount - 1, Math.ceil(MAX_FREQ / binWidth))

      // Накопление энергии по pitch classes
      const chroma = new Float32Array(12)
      const chromaCounts = new Float32Array(12)

      for (let bin = minBin; bin <= maxBin; bin++) {
        const freq = bin * binWidth
        if (freq < MIN_FREQ) continue

        const amplitude = (spectrumBuffer[bin] ?? 0) / 255 // Нормализация 0-1

        // Pitch class: round(12 * log2(freq / C0)) % 12
        const pitchClass = Math.round(12 * Math.log2(freq / C0)) % 12
        const pc = ((pitchClass % 12) + 12) % 12 // Нормализация в 0-11

        chroma[pc]! += amplitude * amplitude // Энергия (квадрат амплитуды)
        chromaCounts[pc]!++
      }

      // Усредняем по количеству bins в каждом pitch class
      for (let i = 0; i < 12; i++) {
        if (chromaCounts[i]! > 0) {
          chroma[i]! /= chromaCounts[i]!
        }
      }

      // Нормализация относительно максимума
      const maxVal = Math.max(...Array.from(chroma))
      if (maxVal > 0) {
        for (let i = 0; i < 12; i++) {
          chroma[i]! /= maxVal
        }
      }

      // Определяем активные pitch classes
      const newActive = new Set<number>()
      for (let i = 0; i < 12; i++) {
        if ((chroma[i] ?? 0) >= ACTIVATION_THRESHOLD) {
          newActive.add(i)
        }
      }

      // Обновляем реактивные значения
      chromagram.value = chroma
      activePitchClasses.value = newActive
    }

    animationFrameId = requestAnimationFrame(analyze)
  }

  return {
    chromagram,
    activePitchClasses,
    isAnalyzing,
    startAnalysis,
    stopAnalysis
  }
}
