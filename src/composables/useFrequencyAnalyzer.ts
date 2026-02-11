import { ref } from 'vue'
import type { NoteInfo, UseFrequencyAnalyzerReturn } from '@/types'

/**
 * Composable for audio frequency analysis using YIN autocorrelation
 * Optimized for guitar frequency range (82-1200 Hz)
 *
 * IMPORTANT: Does not use onUnmounted since it can be called inside computed().
 * Cleanup must be performed manually via stopAnalysis()
 */
export function useFrequencyAnalyzer(
  analyserNode: AnalyserNode | null,
  options: { noiseThreshold?: number } = {}
): UseFrequencyAnalyzerReturn {
  // Reactive states
  const frequencyData = ref<Uint8Array | null>(null)
  const dominantFrequency = ref<number>(0)
  const pitchConfidence = ref<number>(0)
  const isAnalyzing = ref<boolean>(false)

  // Animation frame ID
  let animationFrameId: number | null = null

  // Frequency constants
  const GUITAR_MIN_FREQ = 82 // E2 (lowest string)
  const GUITAR_MAX_FREQ = 1200 // E6 (high notes)

  // YIN parameters
  const YIN_THRESHOLD = 0.15
  const YIN_MIN_FREQ = GUITAR_MIN_FREQ
  const YIN_MAX_FREQ = GUITAR_MAX_FREQ

  // Noise threshold (configurable via options)
  const noiseThreshold = options.noiseThreshold || 0.01

  // Buffers (reusable for performance)
  let timeDomainBuffer: Float32Array | null = null
  let spectrumBuffer: Uint8Array | null = null

  /**
   * Starts frequency analysis
   */
  const startAnalysis = (): void => {
    if (!analyserNode) {
      console.warn('AnalyserNode not provided')
      return
    }

    isAnalyzing.value = true

    // Initialize buffers
    const fftSize = analyserNode.fftSize
    timeDomainBuffer = new Float32Array(fftSize)
    spectrumBuffer = new Uint8Array(analyserNode.frequencyBinCount)

    // Start analysis loop
    analyzeFrequencies()

    console.log('Frequency analysis started (YIN, fftSize=' + fftSize + ')')
  }

  /**
   * Stops frequency analysis
   */
  const stopAnalysis = (): void => {
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
   * Main frequency analysis loop
   */
  const analyzeFrequencies = (): void => {
    if (!analyserNode || !isAnalyzing.value) {
      return
    }

    // Get time-domain data for YIN pitch detection
    if (timeDomainBuffer) {
      analyserNode.getFloatTimeDomainData(timeDomainBuffer as any)

      // Get frequency-domain data for spectrum visualization
      if (spectrumBuffer) {
        analyserNode.getByteFrequencyData(spectrumBuffer as any)
        frequencyData.value = new Uint8Array(spectrumBuffer)

        // Check signal level (RMS)
        const rms = calculateRMS(timeDomainBuffer)

        if (rms < noiseThreshold) {
          dominantFrequency.value = 0
          pitchConfidence.value = 0
        } else {
          // YIN pitch detection on time-domain data
          const sampleRate = analyserNode.context.sampleRate
          const result = yinDetectPitch(timeDomainBuffer, sampleRate)

          dominantFrequency.value = result.frequency
          pitchConfidence.value = result.confidence
        }
      }
    }

    // Request next frame
    animationFrameId = requestAnimationFrame(analyzeFrequencies)
  }

  /**
   * Calculates RMS (Root Mean Square) for signal level
   */
  const calculateRMS = (buffer: Float32Array): number => {
    let sum = 0
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i]! * buffer[i]!
    }
    return Math.sqrt(sum / buffer.length)
  }

  /**
   * YIN pitch detection algorithm
   * @param buffer - Time-domain audio samples
   * @param sampleRate - Sample rate in Hz
   * @returns {{ frequency: number, confidence: number }}
   */
  const yinDetectPitch = (
    buffer: Float32Array,
    sampleRate: number
  ): { frequency: number; confidence: number } => {
    const tauMin = Math.floor(sampleRate / YIN_MAX_FREQ) // ~40 for 48kHz
    const tauMax = Math.min(
      Math.ceil(sampleRate / YIN_MIN_FREQ), // ~585 for 48kHz
      Math.floor(buffer.length / 2)
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

    // Discard results outside guitar range
    if (frequency < GUITAR_MIN_FREQ || frequency > GUITAR_MAX_FREQ) {
      return { frequency: 0, confidence: 0 }
    }

    return { frequency, confidence: Math.max(0, Math.min(1, confidence)) }
  }

  /**
   * YIN Step 1: Difference function
   * d(tau) = sum of (x[j] - x[j+tau])^2 for j = 0..W-1
   */
  const yinDifferenceFunction = (
    buffer: Float32Array,
    tauMin: number,
    tauMax: number
  ): Float32Array => {
    const diff = new Float32Array(tauMax + 1)
    const halfLen = Math.floor(buffer.length / 2)

    for (let tau = tauMin; tau <= tauMax; tau++) {
      let sum = 0
      for (let j = 0; j < halfLen; j++) {
        const delta = buffer[j]! - buffer[j + tau]!
        sum += delta * delta
      }
      diff[tau]! = sum
    }

    return diff
  }

  /**
   * YIN Step 2: Cumulative mean normalized difference function
   * d'(tau) = d(tau) / ((1/tau) * sum(d(j), j=1..tau)) for tau > 0
   * d'(0) = 1
   */
  const yinCumulativeMeanNormalized = (diff: Float32Array, tauMin: number): Float32Array => {
    const cmndf = new Float32Array(diff.length)
    let runningSum = 0

    // For tau < tauMin set values = 1 (not used)
    for (let tau = 0; tau < tauMin; tau++) {
      cmndf[tau] = 1
    }

    // Calculate running sum up to tauMin
    for (let tau = 1; tau < tauMin; tau++) {
      runningSum += diff[tau]!
    }

    for (let tau = tauMin; tau < diff.length; tau++) {
      runningSum += diff[tau]!
      if (runningSum === 0) {
        cmndf[tau] = 1
      } else {
        cmndf[tau] = ((diff[tau] ?? 0) * tau) / runningSum
      }
    }

    return cmndf
  }

  /**
   * YIN Step 3: Absolute threshold
   * Finds first tau where cmndf(tau) < threshold and is local minimum
   */
  const yinAbsoluteThreshold = (
    cmndf: Float32Array,
    tauMin: number,
    tauMax: number
  ): { tau: number; value: number } => {
    let bestTau = -1
    let bestValue = 1

    // Look for first valley below threshold
    for (let tau = tauMin; tau < tauMax; tau++) {
      if ((cmndf[tau] ?? 0) < YIN_THRESHOLD) {
        // Found point below threshold, find minimum of this valley
        while (tau + 1 < tauMax && (cmndf[tau + 1] ?? 0) < (cmndf[tau] ?? 0)) {
          tau++
        }
        bestTau = tau
        bestValue = cmndf[tau] ?? 0
        break
      }
    }

    // If not found below threshold, find global minimum
    if (bestTau === -1) {
      for (let tau = tauMin; tau < tauMax; tau++) {
        if ((cmndf[tau] ?? 0) < bestValue) {
          bestValue = cmndf[tau] ?? 0
          bestTau = tau
        }
      }
      // If minimum too large, assume pitch not detected
      if (bestValue > 0.5) {
        return { tau: -1, value: 1 }
      }
    }

    return { tau: bestTau, value: bestValue }
  }

  /**
   * YIN Step 4: Parabolic interpolation
   * Refines tau between discrete points for sub-sample accuracy
   */
  const yinParabolicInterpolation = (
    cmndf: Float32Array,
    tau: number,
    tauMin: number,
    tauMax: number
  ): number => {
    if (tau <= tauMin || tau >= tauMax - 1) {
      return tau
    }

    const s0 = cmndf[tau - 1]!
    const s1 = cmndf[tau]!
    const s2 = cmndf[tau + 1]!

    const adjustment = (s0 - s2) / (2 * (s0 - 2 * s1 + s2))

    if (Math.abs(adjustment) > 1) {
      return tau
    }

    return tau + adjustment
  }

  /**
   * Gets spectrum in specific frequency range
   * @param minFreq - Minimum frequency (Hz)
   * @param maxFreq - Maximum frequency (Hz)
   * @param numBins - Number of bins to return (for resampling)
   * @returns Array of amplitudes (0-255)
   */
  const getFrequencySpectrum = (
    minFreq: number = GUITAR_MIN_FREQ,
    maxFreq: number = GUITAR_MAX_FREQ,
    numBins: number = 50
  ): number[] => {
    if (!frequencyData.value || !analyserNode) {
      return Array(numBins).fill(0)
    }

    const sampleRate = analyserNode.context.sampleRate
    const binCount = analyserNode.frequencyBinCount
    const binWidth = sampleRate / 2 / binCount

    // Indices for range
    const minBin = Math.floor(minFreq / binWidth)
    const maxBin = Math.ceil(maxFreq / binWidth)

    // Extract data in range
    const rangeData = Array.from(frequencyData.value.slice(minBin, maxBin))

    // Resample to desired number of bins
    if (numBins === rangeData.length) {
      return rangeData
    }

    const resampled: number[] = []
    const step = rangeData.length / numBins

    for (let i = 0; i < numBins; i++) {
      const startIdx = Math.floor(i * step)
      const endIdx = Math.floor((i + 1) * step)

      // Average values in each "bucket"
      let sum = 0
      let count = 0
      for (let j = startIdx; j < endIdx; j++) {
        sum += rangeData[j] ?? 0
        count++
      }

      resampled.push(count > 0 ? Math.round(sum / count) : 0)
    }

    return resampled
  }

  /**
   * Converts frequency to note
   * @param frequency - Frequency in Hz
   * @returns { note: 'A', octave: 4, cents: 0 }
   */
  const frequencyToNote = (frequency: number): NoteInfo => {
    if (frequency === 0) {
      return { note: '', octave: 0, cents: 0 }
    }

    const A4 = 440 // Standard tuning A4 = 440 Hz
    const C0 = A4 * Math.pow(2, -4.75) // Frequency of C0

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

    const halfStepsFromC0 = 12 * Math.log2(frequency / C0)
    const midiNote = Math.round(halfStepsFromC0)
    const cents = Math.round((halfStepsFromC0 - midiNote) * 100)

    const noteIndex = midiNote % 12
    const octave = Math.floor(midiNote / 12)

    return {
      note: noteNames[noteIndex] ?? 'C',
      octave: octave,
      cents: cents
    }
  }

  return {
    // States
    frequencyData,
    dominantFrequency,
    pitchConfidence,
    isAnalyzing,

    // Methods
    startAnalysis,
    stopAnalysis,
    getFrequencySpectrum,
    frequencyToNote,

    // Constants
    GUITAR_MIN_FREQ,
    GUITAR_MAX_FREQ
  }
}
