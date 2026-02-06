import { ref, onUnmounted } from 'vue'

/**
 * Composable для частотного анализа аудио с использованием FFT
 * Оптимизирован для диапазона гитары (82-1200 Hz)
 */
export function useFrequencyAnalyzer(analyserNode) {
  // Реактивные состояния
  const frequencyData = ref(null)
  const dominantFrequency = ref(0)
  const isAnalyzing = ref(false)

  // Буфер для сглаживания данных
  let frequencyBuffer = []
  const BUFFER_SIZE = 3 // Количество кадров для усреднения

  // Animation frame ID
  let animationFrameId = null

  // Частотные константы
  const GUITAR_MIN_FREQ = 82 // E2 (самая низкая струна)
  const GUITAR_MAX_FREQ = 1200 // E6 (высокие ноты)

  /**
   * Запускает частотный анализ
   */
  const startAnalysis = () => {
    if (!analyserNode) {
      console.warn('⚠️ AnalyserNode не предоставлен')
      return
    }

    isAnalyzing.value = true
    frequencyBuffer = []

    // Запускаем цикл анализа
    analyzeFrequencies()

    console.log('📊 Частотный анализ запущен')
  }

  /**
   * Останавливает частотный анализ
   */
  const stopAnalysis = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    isAnalyzing.value = false
    frequencyData.value = null
    dominantFrequency.value = 0
    frequencyBuffer = []

    console.log('📊 Частотный анализ остановлен')
  }

  /**
   * Основной цикл анализа частот
   */
  const analyzeFrequencies = () => {
    if (!analyserNode || !isAnalyzing.value) {
      return
    }

    // Получаем частотные данные из AnalyserNode
    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserNode.getByteFrequencyData(dataArray)

    // Добавляем в буфер для сглаживания
    frequencyBuffer.push(dataArray)
    if (frequencyBuffer.length > BUFFER_SIZE) {
      frequencyBuffer.shift()
    }

    // Усредняем данные из буфера
    const smoothedData = smoothFrequencyData(frequencyBuffer)

    // Обновляем реактивные данные
    frequencyData.value = smoothedData

    // Вычисляем доминирующую частоту
    dominantFrequency.value = calculateDominantFrequency(smoothedData, analyserNode)

    // Запрашиваем следующий кадр
    animationFrameId = requestAnimationFrame(analyzeFrequencies)
  }

  /**
   * Сглаживает частотные данные путём усреднения буфера
   */
  const smoothFrequencyData = (buffer) => {
    if (buffer.length === 0) {
      return new Uint8Array(0)
    }

    const length = buffer[0].length
    const smoothed = new Uint8Array(length)

    for (let i = 0; i < length; i++) {
      let sum = 0
      for (let j = 0; j < buffer.length; j++) {
        sum += buffer[j][i]
      }
      smoothed[i] = Math.round(sum / buffer.length)
    }

    return smoothed
  }

  /**
   * Вычисляет доминирующую частоту в спектре
   * Фокусируется на гитарном диапазоне (82-1200 Hz)
   */
  const calculateDominantFrequency = (data, analyser) => {
    if (!data || data.length === 0) {
      return 0
    }

    // Получаем параметры для конвертации bin -> частота
    const sampleRate = analyser.context.sampleRate
    const binCount = analyser.frequencyBinCount
    const binWidth = sampleRate / 2 / binCount // Hz на bin

    // Вычисляем индексы bin'ов для гитарного диапазона
    const minBin = Math.floor(GUITAR_MIN_FREQ / binWidth)
    const maxBinRange = Math.ceil(GUITAR_MAX_FREQ / binWidth)

    // Ищем максимум в гитарном диапазоне
    let maxAmplitude = 0
    let maxBinIndex = 0

    for (let i = minBin; i < Math.min(maxBinRange, data.length); i++) {
      if (data[i] > maxAmplitude) {
        maxAmplitude = data[i]
        maxBinIndex = i
      }
    }

    // Если амплитуда слишком низкая, считаем что звука нет
    const NOISE_THRESHOLD = 30 // Порог шума (0-255)
    if (maxAmplitude < NOISE_THRESHOLD) {
      return 0
    }

    // Конвертируем bin в частоту
    const frequency = maxBinIndex * binWidth

    return Math.round(frequency)
  }

  /**
   * Получает спектр в определённом диапазоне частот
   * @param {number} minFreq - Минимальная частота (Hz)
   * @param {number} maxFreq - Максимальная частота (Hz)
   * @param {number} numBins - Количество bins для возврата (для ресемплинга)
   * @returns {Array} Массив амплитуд (0-255)
   */
  const getFrequencySpectrum = (
    minFreq = GUITAR_MIN_FREQ,
    maxFreq = GUITAR_MAX_FREQ,
    numBins = 50,
  ) => {
    if (!frequencyData.value || !analyserNode) {
      return Array(numBins).fill(0)
    }

    const sampleRate = analyserNode.context.sampleRate
    const binCount = analyserNode.frequencyBinCount
    const binWidth = sampleRate / 2 / binCount

    // Индексы для диапазона
    const minBin = Math.floor(minFreq / binWidth)
    const maxBin = Math.ceil(maxFreq / binWidth)

    // Извлекаем данные в диапазоне
    const rangeData = Array.from(frequencyData.value.slice(minBin, maxBin))

    // Ресемплим до нужного количества bins
    if (numBins === rangeData.length) {
      return rangeData
    }

    const resampled = []
    const step = rangeData.length / numBins

    for (let i = 0; i < numBins; i++) {
      const startIdx = Math.floor(i * step)
      const endIdx = Math.floor((i + 1) * step)

      // Усредняем значения в каждом "бакете"
      let sum = 0
      let count = 0
      for (let j = startIdx; j < endIdx; j++) {
        sum += rangeData[j] || 0
        count++
      }

      resampled.push(count > 0 ? Math.round(sum / count) : 0)
    }

    return resampled
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
   * Получает информацию об AnalyserNode
   */
  const getAnalyserInfo = () => {
    if (!analyserNode) {
      return null
    }

    return {
      fftSize: analyserNode.fftSize,
      frequencyBinCount: analyserNode.frequencyBinCount,
      sampleRate: analyserNode.context.sampleRate,
      binWidth: analyserNode.context.sampleRate / 2 / analyserNode.frequencyBinCount,
      smoothingTimeConstant: analyserNode.smoothingTimeConstant,
    }
  }

  // Очистка при размонтировании
  onUnmounted(() => {
    if (isAnalyzing.value) {
      stopAnalysis()
    }
  })

  return {
    // Состояния
    frequencyData,
    dominantFrequency,
    isAnalyzing,

    // Методы
    startAnalysis,
    stopAnalysis,
    getFrequencySpectrum,
    frequencyToNote,
    getAnalyserInfo,

    // Константы
    GUITAR_MIN_FREQ,
    GUITAR_MAX_FREQ,
  }
}
