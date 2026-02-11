import { ref, shallowRef } from 'vue'
import type { UseChromaAnalyzerReturn } from '@/types'

/**
 * Composable for computing chromagram from FFT data
 * Chromagram aggregates FFT bins into 12 pitch classes (C, C#, D, ..., B)
 *
 * IMPORTANT: Does not use onUnmounted because it can be called inside computed().
 * Cleanup must be performed manually via stopAnalysis()
 */
export function useChromaAnalyzer(analyserNode: AnalyserNode | null): UseChromaAnalyzerReturn {
  const chromagram = shallowRef<Float32Array>(new Float32Array(12))
  const activePitchClasses = ref<Set<number>>(new Set())
  const isAnalyzing = ref<boolean>(false)

  let animationFrameId: number | null = null
  let spectrumBuffer: Uint8Array | null = null

  // Frequency of C0 for pitch class calculation
  const C0 = 16.35

  // Minimum frequency for analysis (below E2 is not interesting)
  const MIN_FREQ = 60
  // Maximum frequency (above ~1.5kHz harmonics are less useful for chords)
  const MAX_FREQ = 1500

  // Activation threshold for pitch class (relative to chromagram maximum)
  const ACTIVATION_THRESHOLD = 0.3

  /**
   * Starts chromagram analysis
   */
  const startAnalysis = (): void => {
    if (!analyserNode) {
      console.warn('useChromaAnalyzer: AnalyserNode not provided')
      return
    }

    isAnalyzing.value = true
    spectrumBuffer = new Uint8Array(analyserNode.frequencyBinCount)
    analyze()
    console.log('Chromagram analysis started')
  }

  /**
   * Stops analysis
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
   * Main analysis loop
   */
  const analyze = (): void => {
    if (!analyserNode || !isAnalyzing.value) return

    if (spectrumBuffer) {
      analyserNode.getByteFrequencyData(spectrumBuffer as any)

      const sampleRate = analyserNode.context.sampleRate
      const binCount = analyserNode.frequencyBinCount
      const binWidth = sampleRate / 2 / binCount

      // Frequency range bin indices
      const minBin = Math.max(1, Math.floor(MIN_FREQ / binWidth))
      const maxBin = Math.min(binCount - 1, Math.ceil(MAX_FREQ / binWidth))

      // Accumulate energy by pitch classes
      const chroma = new Float32Array(12)
      const chromaCounts = new Float32Array(12)

      for (let bin = minBin; bin <= maxBin; bin++) {
        const freq = bin * binWidth
        if (freq < MIN_FREQ) continue

        const amplitude = (spectrumBuffer[bin] ?? 0) / 255 // Normalize to 0-1

        // Pitch class: round(12 * log2(freq / C0)) % 12
        const pitchClass = Math.round(12 * Math.log2(freq / C0)) % 12
        const pc = ((pitchClass % 12) + 12) % 12 // Normalize to 0-11

        chroma[pc]! += amplitude * amplitude // Energy (amplitude squared)
        chromaCounts[pc]!++
      }

      // Average by bin count in each pitch class
      for (let i = 0; i < 12; i++) {
        if (chromaCounts[i]! > 0) {
          chroma[i]! /= chromaCounts[i]!
        }
      }

      // Normalize relative to maximum
      const maxVal = Math.max(...Array.from(chroma))
      if (maxVal > 0) {
        for (let i = 0; i < 12; i++) {
          chroma[i]! /= maxVal
        }
      }

      // Determine active pitch classes
      const newActive = new Set<number>()
      for (let i = 0; i < 12; i++) {
        if ((chroma[i] ?? 0) >= ACTIVATION_THRESHOLD) {
          newActive.add(i)
        }
      }

      // Update reactive values
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
