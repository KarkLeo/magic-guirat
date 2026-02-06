/**
 * @deprecated Use useFrequencyAnalyzer.ts instead
 * This composable was using Essentia.js but had WASM loading issues.
 * Replaced with native Web Audio API YIN pitch detection.
 */

import { ref } from 'vue'

/**
 * Legacy pitch detector - DEPRECATED
 * Use useFrequencyAnalyzer instead
 */
export function usePitchDetector() {
  console.warn(
    'usePitchDetector is deprecated. Please use useFrequencyAnalyzer instead.'
  )

  const pitch = ref<number>(0)
  const confidence = ref<number>(0)
  const isReady = ref<boolean>(false)

  const initialize = async (): Promise<void> => {
    console.warn('usePitchDetector.initialize() is deprecated')
    isReady.value = false
  }

  return {
    pitch,
    confidence,
    isReady,
    initialize
  }
}
