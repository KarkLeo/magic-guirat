import { ref } from 'vue'

/**
 * Composable для частотного анализа аудио с использованием YIN autocorrelation
 * Оптимизирован для диапазона гитары (82-1200 Hz)
 *
 * ВАЖНО: Не использует onUnmounted, т.к. может вызываться внутри computed.
 * Очистка должна выполняться вручную через stopAnalysis()
 */
export function useFrequencyAnalyzer(analyserNode) {
  // Реактивные состояния
  const frequencyData = ref(null)
  const dominantFrequency = ref(0)
  const pitchConfidence = ref(0)
  const isAnalyzing = ref(false)

  // Animation frame ID
  let animationFrameId = null

  // Частотные константы
  const GUITAR_MIN_FREQ = 82 // E2 (самая низкая струна)
  const GUITAR_MAX_FREQ = 1200 // E6 (высокие ноты)

  // YIN параметры
  const YIN_THRESHOLD = 0.15
  const YIN_MIN_FREQ = GUITAR_MIN_FREQ
  const YIN_MAX_FREQ = GUITAR_MAX_FREQ

  // Буферы (переиспользуемые для производительности)
  let timeDomainBuffer = null
  let spectrumBuffer = null

  /**
   * Запускает частотный анализ
   */
  const startAnalysis = () => {
    if (!analyserNode) {
      console.warn('AnalyserNode не предоставлен')
      return
    }

    isAnalyzing.value = true

    // Инициализируем буферы
    const fftSize = analyserNode.fftSize
    timeDomainBuffer = new Float32Array(fftSize)
    spectrumBuffer = new Uint8Array(analyserNode.frequencyBinCount)

    // Запускаем цикл анализа
    analyzeFrequencies()

    console.log('Частотный анализ запущен (YIN, fftSize=' + fftSize + ')')
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
    pitchConfidence.value = 0
    timeDomainBuffer = null
    spectrumBuffer = null
  }

  /**
   * Основной цикл анализа частот
   */
  const analyzeFrequencies = () => {
    if (!analyserNode || !isAnalyzing.value) {
      return
    }

    // Получаем time-domain данные для YIN pitch detection
    analyserNode.getFloatTimeDomainData(timeDomainBuffer)

    // Получаем frequency-domain данные для визуализации спектра
    analyserNode.getByteFrequencyData(spectrumBuffer)
    frequencyData.value = new Uint8Array(spectrumBuffer)

    // Проверяем уровень сигнала (RMS)
    const rms = calculateRMS(timeDomainBuffer)
    const NOISE_THRESHOLD = 0.01

    if (rms < NOISE_THRESHOLD) {
      dominantFrequency.value = 0
      pitchConfidence.value = 0
    } else {
      // YIN pitch detection на time-domain данных
      const sampleRate = analyserNode.context.sampleRate
      const result = yinDetectPitch(timeDomainBuffer, sampleRate)

      dominantFrequency.value = result.frequency
      pitchConfidence.value = result.confidence
    }

    // Запрашиваем следующий кадр
    animationFrameId = requestAnimationFrame(analyzeFrequencies)
  }

  /**
   * Вычисляет RMS (Root Mean Square) для определения уровня сигнала
   */
  const calculateRMS = (buffer) => {
    let sum = 0
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i]
    }
    return Math.sqrt(sum / buffer.length)
  }

  /**
   * YIN pitch detection algorithm
   * @param {Float32Array} buffer - Time-domain audio samples
   * @param {number} sampleRate - Sample rate in Hz
   * @returns {{ frequency: number, confidence: number }}
   */
  const yinDetectPitch = (buffer, sampleRate) => {
    const tauMin = Math.floor(sampleRate / YIN_MAX_FREQ) // ~40 for 48kHz
    const tauMax = Math.min(
      Math.ceil(sampleRate / YIN_MIN_FREQ), // ~585 for 48kHz
      Math.floor(buffer.length / 2),
    )

    if (tauMax <= tauMin) {
      return { frequency: 0, confidence: 0 }
    }

    // Step 1: Difference function
    const diff = yinDifferenceFunction(buffer, tauMin, tauMax)

    // Step 2: Cumulative mean normalized difference
    const cmndf = yinCumulativeMeanNormalized(diff, tauMin)

    // Step 3: Absolute threshold — find best tau
    const tauResult = yinAbsoluteThreshold(cmndf, tauMin, tauMax)

    if (tauResult.tau === -1) {
      return { frequency: 0, confidence: 0 }
    }

    // Step 4: Parabolic interpolation for sub-sample accuracy
    const refinedTau = yinParabolicInterpolation(cmndf, tauResult.tau, tauMin, tauMax)

    const frequency = Math.round(sampleRate / refinedTau)
    const confidence = 1 - tauResult.value

    // Отбрасываем результаты за пределами гитарного диапазона
    if (frequency < GUITAR_MIN_FREQ || frequency > GUITAR_MAX_FREQ) {
      return { frequency: 0, confidence: 0 }
    }

    return { frequency, confidence: Math.max(0, Math.min(1, confidence)) }
  }

  /**
   * YIN Step 1: Difference function
   * d(tau) = sum of (x[j] - x[j+tau])^2 for j = 0..W-1
   */
  const yinDifferenceFunction = (buffer, tauMin, tauMax) => {
    const diff = new Float32Array(tauMax + 1)
    const halfLen = Math.floor(buffer.length / 2)

    for (let tau = tauMin; tau <= tauMax; tau++) {
      let sum = 0
      for (let j = 0; j < halfLen; j++) {
        const delta = buffer[j] - buffer[j + tau]
        sum += delta * delta
      }
      diff[tau] = sum
    }

    return diff
  }

  /**
   * YIN Step 2: Cumulative mean normalized difference function
   * d'(tau) = d(tau) / ((1/tau) * sum(d(j), j=1..tau)) for tau > 0
   * d'(0) = 1
   */
  const yinCumulativeMeanNormalized = (diff, tauMin) => {
    const cmndf = new Float32Array(diff.length)
    let runningSum = 0

    // Для tau < tauMin устанавливаем значения = 1 (они не используются)
    for (let tau = 0; tau < tauMin; tau++) {
      cmndf[tau] = 1
    }

    // Подсчитываем running sum до tauMin
    for (let tau = 1; tau < tauMin; tau++) {
      runningSum += diff[tau]
    }

    for (let tau = tauMin; tau < diff.length; tau++) {
      runningSum += diff[tau]
      if (runningSum === 0) {
        cmndf[tau] = 1
      } else {
        cmndf[tau] = diff[tau] * tau / runningSum
      }
    }

    return cmndf
  }

  /**
   * YIN Step 3: Absolute threshold
   * Находит первый tau где cmndf(tau) < threshold и это локальный минимум
   */
  const yinAbsoluteThreshold = (cmndf, tauMin, tauMax) => {
    let bestTau = -1
    let bestValue = 1

    // Ищем первую долину ниже порога
    for (let tau = tauMin; tau < tauMax; tau++) {
      if (cmndf[tau] < YIN_THRESHOLD) {
        // Нашли точку ниже порога, ищем минимум этой долины
        while (tau + 1 < tauMax && cmndf[tau + 1] < cmndf[tau]) {
          tau++
        }
        bestTau = tau
        bestValue = cmndf[tau]
        break
      }
    }

    // Если не нашли ниже порога, ищем глобальный минимум
    if (bestTau === -1) {
      for (let tau = tauMin; tau < tauMax; tau++) {
        if (cmndf[tau] < bestValue) {
          bestValue = cmndf[tau]
          bestTau = tau
        }
      }
      // Если минимум слишком большой, считаем что pitch не определён
      if (bestValue > 0.5) {
        return { tau: -1, value: 1 }
      }
    }

    return { tau: bestTau, value: bestValue }
  }

  /**
   * YIN Step 4: Parabolic interpolation
   * Уточняет tau между дискретными точками для sub-sample accuracy
   */
  const yinParabolicInterpolation = (cmndf, tau, tauMin, tauMax) => {
    if (tau <= tauMin || tau >= tauMax - 1) {
      return tau
    }

    const s0 = cmndf[tau - 1]
    const s1 = cmndf[tau]
    const s2 = cmndf[tau + 1]

    const adjustment = (s0 - s2) / (2 * (s0 - 2 * s1 + s2))

    if (Math.abs(adjustment) > 1) {
      return tau
    }

    return tau + adjustment
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

  return {
    // Состояния
    frequencyData,
    dominantFrequency,
    pitchConfidence,
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
