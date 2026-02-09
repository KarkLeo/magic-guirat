import type { Ref, ComputedRef, ShallowRef } from 'vue'

// ============================================================================
// Core Audio Types
// ============================================================================

export interface NoteInfo {
  note: string
  octave: number
  cents: number
}

export interface GuitarString {
  index: number
  note: string
  octave: number
  fullNote: string
  frequency: number
  color: string
}

export interface ChordCandidate {
  root: number
  rootName: string
  type: string
  displayName: string
  score: number
  matchedNotes: number
  totalNotes: number
}

export type ChordType =
  | 'major'
  | 'minor'
  | 'dom7'
  | 'maj7'
  | 'min7'
  | 'sus2'
  | 'sus4'
  | 'dim'
  | 'aug'
  | 'power'

// ============================================================================
// Composable Return Types
// ============================================================================

export interface UseAudioCaptureReturn {
  isCapturing: Ref<boolean>
  isRequestingPermission: Ref<boolean>
  error: Ref<string | null>
  audioLevel: Ref<number>
  hasError: ComputedRef<boolean>
  canCapture: ComputedRef<boolean>
  startCapture: (deviceId?: string) => Promise<void>
  stopCapture: () => void
  switchDevice: (deviceId: string) => Promise<void>
  getAnalyserNode: () => AnalyserNode | null
  getAudioContext: () => AudioContext | null
}

export interface UseFrequencyAnalyzerReturn {
  frequencyData: Ref<Uint8Array | null>
  dominantFrequency: Ref<number>
  pitchConfidence: Ref<number>
  isAnalyzing: Ref<boolean>
  startAnalysis: () => void
  stopAnalysis: () => void
  getFrequencySpectrum: (
    minFreq?: number,
    maxFreq?: number,
    numBins?: number
  ) => number[]
  frequencyToNote: (frequency: number) => NoteInfo
  GUITAR_MIN_FREQ: number
  GUITAR_MAX_FREQ: number
}

export interface UseChromaAnalyzerReturn {
  chromagram: ShallowRef<Float32Array>
  activePitchClasses: Ref<Set<number>>
  isAnalyzing: Ref<boolean>
  startAnalysis: () => void
  stopAnalysis: () => void
}

export interface UseChordRecognitionReturn {
  currentChord: Ref<ChordCandidate | null>
  chordCandidates: Ref<ChordCandidate[]>
  isChordDetected: Ref<boolean>
  detectedStrings: Ref<number[]>
}

export interface UseSettingsReturn {
  selectedDeviceId: Ref<string>
  noiseThreshold: Ref<number>
  bloomIntensity: Ref<number>
  bloomThreshold: Ref<number>
  bloomRadius: Ref<number>
  ghostOpacity: Ref<number>
  ghostFadeSpeed: Ref<number>
  ghostBlur: Ref<number>
  smokeIntensity: Ref<number>
  turbulence: Ref<number>
  availableDevices: Ref<MediaDeviceInfo[]>
  refreshDevices: () => Promise<void>
  resetToDefaults: () => void
}

export type DetectionMode = 'single' | 'chord'
