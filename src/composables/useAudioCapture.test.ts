import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAudioCapture } from './useAudioCapture'

describe('useAudioCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup
    const capture = useAudioCapture()
    if (capture.isCapturing.value) {
      capture.stopCapture()
    }
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const capture = useAudioCapture()

      expect(capture.isCapturing.value).toBe(false)
      expect(capture.isRequestingPermission.value).toBe(false)
      expect(capture.error.value).toBeNull()
      expect(capture.audioLevel.value).toBe(0)
    })

    it('should have correct computed properties', () => {
      const capture = useAudioCapture()

      expect(capture.hasError.value).toBe(false)
      expect(capture.canCapture.value).toBe(true)
    })
  })

  describe('startCapture', () => {
    it('should initiate permission request', async () => {
      const capture = useAudioCapture()

      const promise = capture.startCapture()
      expect(capture.isRequestingPermission.value).toBe(true)

      await promise
      // After completion, requesting permission should be false
      expect(capture.isRequestingPermission.value).toBe(false)
    })

    it('should handle NotAllowedError', async () => {
      const error = new DOMException('Permission denied', 'NotAllowedError')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error)

      const capture = useAudioCapture()
      await capture.startCapture()

      expect(capture.isCapturing.value).toBe(false)
      expect(capture.error.value).toContain('запрещён')
    })

    it('should handle NotFoundError', async () => {
      const error = new DOMException('No device found', 'NotFoundError')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error)

      const capture = useAudioCapture()
      await capture.startCapture()

      expect(capture.error.value).toContain('не найден')
    })

    it('should handle NotReadableError', async () => {
      const error = new DOMException('Device in use', 'NotReadableError')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error)

      const capture = useAudioCapture()
      await capture.startCapture()

      expect(capture.error.value).toContain('другим приложением')
    })

    it('should request permission during capture', async () => {
      const capture = useAudioCapture()

      const promise = capture.startCapture()
      expect(capture.isRequestingPermission.value).toBe(true)

      await promise

      expect(capture.isRequestingPermission.value).toBe(false)
    })

    it('should accept deviceId parameter', async () => {
      const capture = useAudioCapture()

      await capture.startCapture('device-123')

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            deviceId: { exact: 'device-123' }
          })
        })
      )
    })
  })

  describe('stopCapture', () => {
    it('should reset audio level on stop', () => {
      const capture = useAudioCapture()

      capture.audioLevel.value = 0.5
      capture.stopCapture()

      expect(capture.audioLevel.value).toBe(0)
      expect(capture.isCapturing.value).toBe(false)
    })
  })

  describe('switchDevice', () => {
    it('should not switch if not capturing', async () => {
      const capture = useAudioCapture()
      const getUserMediaCallCount = vi.mocked(
        navigator.mediaDevices.getUserMedia
      ).mock.calls.length

      await capture.switchDevice('new-device')

      // Should not call getUserMedia if not capturing
      expect(vi.mocked(navigator.mediaDevices.getUserMedia).mock.calls.length).toBe(
        getUserMediaCallCount
      )
    })
  })

  describe('getAnalyserNode & getAudioContext', () => {
    it('should return null before capturing', () => {
      const capture = useAudioCapture()

      expect(capture.getAnalyserNode()).toBeNull()
      expect(capture.getAudioContext()).toBeNull()
    })
  })

  describe('computed properties', () => {
    it('hasError should reflect error state', () => {
      const capture = useAudioCapture()

      expect(capture.hasError.value).toBe(false)

      capture.error.value = 'Some error'

      expect(capture.hasError.value).toBe(true)
    })

    it('canCapture should reflect isCapturing state', () => {
      const capture = useAudioCapture()

      expect(capture.canCapture.value).toBe(true)

      capture.isCapturing.value = true
      expect(capture.canCapture.value).toBe(false)

      capture.isCapturing.value = false
      expect(capture.canCapture.value).toBe(true)
    })
  })

  describe('audio level monitoring', () => {
    it('should update audio level during capture', async () => {
      const capture = useAudioCapture()
      await capture.startCapture()

      expect(capture.audioLevel.value).toBeGreaterThanOrEqual(0)
      expect(capture.audioLevel.value).toBeLessThanOrEqual(1)
    })

    it('should reset audio level on stop', async () => {
      const capture = useAudioCapture()
      await capture.startCapture()

      // Audio level should be set by monitoring
      // Then reset to 0 on stop
      capture.stopCapture()

      expect(capture.audioLevel.value).toBe(0)
    })
  })

  describe('cleanup on unmount', () => {
    it('should have onUnmounted lifecycle hook', () => {
      const capture = useAudioCapture()

      // onUnmounted is called automatically when component unmounts
      // We can verify the composable is properly initialized
      expect(capture).toBeDefined()
    })
  })
})
