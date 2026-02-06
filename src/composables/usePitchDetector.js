import { ref, onUnmounted } from 'vue'
import * as EssentiaModule from 'essentia.js'

/**
 * Composable для определения питча с использованием Essentia.js (PitchYinFFT)
 * Оптимизирован для гитарного диапазона (82-1200 Hz)
 */
export function usePitchDetector(analyserNode) {
  // Реактивные состояния
  const detectedPitch = ref(0)
  const pitchConfidence = ref(0)
  const detectedNote = ref({ note: '', octave: 0, cents: 0 })
  const isAnalyzing = ref(false)
  const isEssentiaLoaded = ref(false)
  const essentiaError = ref(null)

  // Essentia instance
  let essentia = null
  let animationFrameId = null

  // Аудио параметры
  const SAMPLE_RATE = 48000 // Будет обновлено из AudioContext
  const FRAME_SIZE = 2048
  const MIN_FREQUENCY = 82 // E2 (самая низкая струна гитары)
  const MAX_FREQUENCY = 1200 // E6 (высокие ноты)
  const CONFIDENCE_THRESHOLD = 0.5 // Минимальная уверенность для отображения (снижено для лучшей отзывчивости)

  /**
   * Инициализирует Essentia.js WASM
   */
  const initEssentia = async () => {
    try {
      console.log('🔧 Загрузка Essentia.js WASM...')

      // Инициализируем Essentia с WASM backend
      essentia = new EssentiaModule.Essentia(EssentiaModule.EssentiaWASM)

      // Ждём загрузки WASM модуля
      if (EssentiaModule.EssentiaWASM && EssentiaModule.EssentiaWASM.ready) {
        await EssentiaModule.EssentiaWASM.ready
      }

      isEssentiaLoaded.value = true
      console.log('✅ Essentia.js WASM загружен')
    } catch (error) {
      console.error('❌ Ошибка загрузки Essentia.js:', error)
      essentiaError.value = `Не удалось загрузить Essentia.js: ${error.message}`
      isEssentiaLoaded.value = false
    }
  }

  /**
   * Запускает pitch detection
   */
  const startDetection = async () => {
    if (!analyserNode) {
      console.warn('⚠️ AnalyserNode не предоставлен')
      return
    }

    // Инициализируем Essentia если еще не загружен
    if (!isEssentiaLoaded.value && !essentiaError.value) {
      await initEssentia()
    }

    if (!isEssentiaLoaded.value) {
      console.warn('⚠️ Essentia.js не загружен, pitch detection недоступен')
      return
    }

    isAnalyzing.value = true
    analyzePitch()

    console.log('🎵 Pitch detection запущен')
  }

  /**
   * Останавливает pitch detection
   */
  const stopDetection = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    isAnalyzing.value = false
    detectedPitch.value = 0
    pitchConfidence.value = 0
    detectedNote.value = { note: '', octave: 0, cents: 0 }

    console.log('🎵 Pitch detection остановлен')
  }

  /**
   * Основной цикл анализа питча
   */
  const analyzePitch = () => {
    if (!analyserNode || !isAnalyzing.value || !essentia) {
      return
    }

    try {
      // Получаем FFT данные (spectrum) из AnalyserNode
      const bufferLength = analyserNode.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyserNode.getByteFrequencyData(dataArray)

      // Конвертируем Uint8Array (0-255) в Float32Array (0-1)
      const spectrum = new Float32Array(bufferLength)
      for (let i = 0; i < bufferLength; i++) {
        spectrum[i] = dataArray[i] / 255.0
      }

      // Используем PitchYinFFT алгоритм от Essentia
      const sampleRate = analyserNode.context.sampleRate
      const result = essentia.PitchYinFFT(spectrum, {
        frameSize: FRAME_SIZE,
        sampleRate: sampleRate,
        minFrequency: MIN_FREQUENCY,
        maxFrequency: MAX_FREQUENCY,
        interpolate: true,
        tolerance: 1,
      })

      // Обновляем реактивные данные
      const pitch = result.pitch
      const confidence = result.pitchConfidence

      // Если pitch в диапазоне, показываем его (даже с низким confidence)
      if (pitch >= MIN_FREQUENCY && pitch <= MAX_FREQUENCY && pitch > 0) {
        detectedPitch.value = Math.round(pitch)
        pitchConfidence.value = confidence
        detectedNote.value = frequencyToNote(pitch)

        // Логируем только если confidence выше минимального
        if (confidence >= CONFIDENCE_THRESHOLD) {
          console.log('🎵 High confidence pitch:', pitch, 'Hz', detectedNote.value, confidence)
        }
      } else {
        // Обнуляем только если pitch вне диапазона
        detectedPitch.value = 0
        pitchConfidence.value = 0
        detectedNote.value = { note: '', octave: 0, cents: 0 }
      }
    } catch (error) {
      console.error('❌ Ошибка в pitch detection:', error)
    }

    // Запрашиваем следующий кадр
    animationFrameId = requestAnimationFrame(analyzePitch)
  }

  /**
   * Конвертирует частоту в ноту
   * @param {number} frequency - Частота в Hz
   * @returns {object} { note: 'A', octave: 4, cents: 0 }
   */
  const frequencyToNote = (frequency) => {
    if (frequency === 0) {
      return { note: '', octave: 0, cents: 0 }
    }

    const A4 = 440 // Стандартная настройка A4 = 440 Hz
    const C0 = A4 * Math.pow(2, -4.75) // Частота C0

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

    const halfStepsFromC0 = 12 * Math.log2(frequency / C0)
    const midiNote = Math.round(halfStepsFromC0)
    const cents = Math.round((halfStepsFromC0 - midiNote) * 100)

    const noteIndex = midiNote % 12
    const octave = Math.floor(midiNote / 12)

    return {
      note: noteNames[noteIndex],
      octave: octave,
      cents: cents,
    }
  }

  /**
   * Получает информацию о pitch detector
   */
  const getDetectorInfo = () => {
    return {
      isLoaded: isEssentiaLoaded.value,
      algorithm: 'PitchYinFFT (Essentia.js)',
      minFrequency: MIN_FREQUENCY,
      maxFrequency: MAX_FREQUENCY,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
      frameSize: FRAME_SIZE,
    }
  }

  // Очистка при размонтировании
  onUnmounted(() => {
    if (isAnalyzing.value) {
      stopDetection()
    }
  })

  return {
    // Состояния
    detectedPitch,
    pitchConfidence,
    detectedNote,
    isAnalyzing,
    isEssentiaLoaded,
    essentiaError,

    // Методы
    startDetection,
    stopDetection,
    getDetectorInfo,

    // Константы
    MIN_FREQUENCY,
    MAX_FREQUENCY,
    CONFIDENCE_THRESHOLD,
  }
}
