import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useFrequencyAnalyzer } from './useFrequencyAnalyzer'

// Helper to create mock AnalyserNode
function createMockAnalyser(): AnalyserNode {
  return {
    fftSize: 4096,
    frequencyBinCount: 2048,
    smoothingTimeConstant: 0.7,
    context: {
      sampleRate: 48000
    },
    getFloatTimeDomainData: vi.fn(),
    getByteFrequencyData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  } as any
}

// Helper to inject synthetic waveform into buffer
function injectSineWave(buffer: Float32Array, frequency: number, sampleRate: number): void {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate)
  }
}

describe('useFrequencyAnalyzer', () => {
  let mockAnalyser: AnalyserNode

  beforeEach(() => {
    mockAnalyser = createMockAnalyser()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      expect(analyzer.frequencyData.value).toBeNull()
      expect(analyzer.dominantFrequency.value).toBe(0)
      expect(analyzer.pitchConfidence.value).toBe(0)
      expect(analyzer.isAnalyzing.value).toBe(false)
    })

    it('should handle null analyserNode', () => {
      const analyzer = useFrequencyAnalyzer(null)

      expect(() => analyzer.startAnalysis()).not.toThrow()
      expect(analyzer.isAnalyzing.value).toBe(false)
    })

    it('should accept noiseThreshold option', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser, { noiseThreshold: 0.05 })

      expect(analyzer).toBeDefined()
    })
  })

  describe('startAnalysis & stopAnalysis', () => {
    it('should start analysis', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      analyzer.startAnalysis()

      expect(analyzer.isAnalyzing.value).toBe(true)
    })

    it('should stop analysis and cleanup', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)
      analyzer.startAnalysis()

      analyzer.stopAnalysis()

      expect(analyzer.isAnalyzing.value).toBe(false)
      expect(analyzer.frequencyData.value).toBeNull()
      expect(analyzer.dominantFrequency.value).toBe(0)
      expect(analyzer.pitchConfidence.value).toBe(0)
    })

    it('should cancel animation frame on stop', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)
      analyzer.startAnalysis()

      analyzer.stopAnalysis()

      expect(global.cancelAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('frequencyToNote', () => {
    it('should convert 0 Hz to empty note', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      const result = analyzer.frequencyToNote(0)

      expect(result.note).toBe('')
      expect(result.octave).toBe(0)
      expect(result.cents).toBe(0)
    })

    it('should convert A4 (440 Hz)', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      const result = analyzer.frequencyToNote(440)

      expect(result.note).toBe('A')
      expect(result.octave).toBe(4)
      expect(Math.abs(result.cents)).toBeLessThan(5)
    })

    it('should convert E2 (82.41 Hz) - lowest guitar string', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      const result = analyzer.frequencyToNote(82.41)

      expect(result.note).toBe('E')
      expect(result.octave).toBe(2)
    })

    it('should convert E4 (329.63 Hz) - highest open string', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      const result = analyzer.frequencyToNote(329.63)

      expect(result.note).toBe('E')
      expect(result.octave).toBe(4)
    })

    it('should track cents deviation from note', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      const sharp = analyzer.frequencyToNote(440 * Math.pow(2, 10 / 1200)) // +10 cents
      const flat = analyzer.frequencyToNote(440 * Math.pow(2, -10 / 1200)) // -10 cents

      expect(sharp.cents).toBeGreaterThan(0)
      expect(flat.cents).toBeLessThan(0)
    })
  })

  describe('getFrequencySpectrum', () => {
    it('should return array of specified size', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      const spectrum = analyzer.getFrequencySpectrum(82, 1200, 50)

      expect(spectrum).toHaveLength(50)
    })

    it('should return zeros if no frequency data', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      const spectrum = analyzer.getFrequencySpectrum(82, 1200, 10)

      expect(spectrum).toEqual(Array(10).fill(0))
    })

    it('should use default guitar range', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      const spectrum = analyzer.getFrequencySpectrum()

      expect(spectrum.length).toBe(50) // default numBins
    })
  })

  describe('YIN pitch detection', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should detect pitch from time-domain buffer', () => {
      const mockAnalyserWithData = createMockAnalyser()
      const buffer = new Float32Array(4096)
      injectSineWave(buffer, 440, 48000) // A4

      vi.mocked(mockAnalyserWithData.getFloatTimeDomainData).mockImplementation((buf) => {
        buf.set(buffer)
      })
      vi.mocked(mockAnalyserWithData.getByteFrequencyData).mockImplementation((buf) => {
        buf.fill(50)
      })

      const analyzer = useFrequencyAnalyzer(mockAnalyserWithData)
      analyzer.startAnalysis()

      // Wait for async analysis
      vi.advanceTimersByTime(16)

      expect(analyzer.dominantFrequency.value).toBeGreaterThan(0)
      expect(analyzer.pitchConfidence.value).toBeGreaterThan(0)
    })

    it('should ignore noise below threshold', () => {
      const mockAnalyserWithData = createMockAnalyser()
      const silentBuffer = new Float32Array(4096).fill(0.001) // Very quiet

      vi.mocked(mockAnalyserWithData.getFloatTimeDomainData).mockImplementation((buf) => {
        buf.set(silentBuffer)
      })
      vi.mocked(mockAnalyserWithData.getByteFrequencyData).mockImplementation((buf) => {
        buf.fill(0)
      })

      const analyzer = useFrequencyAnalyzer(mockAnalyserWithData, { noiseThreshold: 0.05 })
      analyzer.startAnalysis()

      vi.advanceTimersByTime(16)

      expect(analyzer.dominantFrequency.value).toBe(0)
      expect(analyzer.pitchConfidence.value).toBe(0)
    })

    it('should respect guitar frequency bounds', () => {
      const mockAnalyserWithData = createMockAnalyser()
      const buffer = new Float32Array(4096)
      injectSineWave(buffer, 50, 48000) // Below guitar range

      vi.mocked(mockAnalyserWithData.getFloatTimeDomainData).mockImplementation((buf) => {
        buf.set(buffer)
      })
      vi.mocked(mockAnalyserWithData.getByteFrequencyData).mockImplementation((buf) => {
        buf.fill(50)
      })

      const analyzer = useFrequencyAnalyzer(mockAnalyserWithData)
      analyzer.startAnalysis()

      vi.advanceTimersByTime(16)

      // Frequency outside guitar range should be ignored
      expect(analyzer.dominantFrequency.value).toBeLessThanOrEqual(
        analyzer.GUITAR_MAX_FREQ
      )
    })
  })

  describe('constants', () => {
    it('should export guitar frequency constants', () => {
      const analyzer = useFrequencyAnalyzer(mockAnalyser)

      expect(analyzer.GUITAR_MIN_FREQ).toBe(82)
      expect(analyzer.GUITAR_MAX_FREQ).toBe(1200)
    })
  })
})
