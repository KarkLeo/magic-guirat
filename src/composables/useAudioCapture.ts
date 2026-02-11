import { ref, computed, onUnmounted } from 'vue'
import type { UseAudioCaptureReturn } from '@/types'

/**
 * Composable for capturing audio from microphone
 * Uses Web Audio API for capture and analysis
 */
export function useAudioCapture(): UseAudioCaptureReturn {
  // Reactive states
  const isCapturing = ref<boolean>(false)
  const isRequestingPermission = ref<boolean>(false)
  const error = ref<string | null>(null)
  const audioLevel = ref<number>(0)

  // Web Audio API objects
  let audioContext: AudioContext | null = null
  let mediaStream: MediaStream | null = null
  let analyserNode: AnalyserNode | null = null
  let microphoneSource: MediaStreamAudioSourceNode | null = null
  let animationFrameId: number | null = null

  // Buffer for signal level analysis
  let dataArray: Uint8Array | null = null

  /**
   * Starts audio capture from microphone
   */
  const startCapture = async (deviceId: string = ''): Promise<void> => {
    try {
      error.value = null
      isRequestingPermission.value = true

      // Form audio constraints
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId }
      }

      // Request microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      })

      // Create AudioContext
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create source from MediaStream
      microphoneSource = audioContext.createMediaStreamSource(mediaStream)

      // Create AnalyserNode for frequency analysis
      analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = 4096 // Balance between accuracy and performance
      analyserNode.smoothingTimeConstant = 0.7 // Average smoothing

      // Connect microphone to analyzer
      microphoneSource.connect(analyserNode)

      // Create buffer for data
      const bufferLength = analyserNode.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)

      // Start signal level monitoring
      startAudioLevelMonitoring()

      isCapturing.value = true
      isRequestingPermission.value = false

      console.log('Audio capture started')
    } catch (err) {
      console.error('Error capturing audio:', err)

      const error_ = err as DOMException
      // Handle different error types
      if (error_.name === 'NotAllowedError' || error_.name === 'PermissionDeniedError') {
        error.value = 'Microphone access denied. Enable access in browser settings.'
      } else if (error_.name === 'NotFoundError') {
        error.value = 'Microphone not found. Connect a microphone and try again.'
      } else if (error_.name === 'NotReadableError') {
        error.value =
          'Microphone is in use by another app. Close other apps and try again.'
      } else {
        error.value = `Microphone access error: ${error_.message}`
      }

      isRequestingPermission.value = false
    }
  }

  /**
   * Stops audio capture
   */
  const stopCapture = (): void => {
    try {
      // Stop level monitoring
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }

      // Disconnect all sources
      if (microphoneSource) {
        microphoneSource.disconnect()
        microphoneSource = null
      }

      // Stop MediaStream
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
        mediaStream = null
      }

      // Close AudioContext
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
        audioContext = null
      }

      analyserNode = null
      dataArray = null
      audioLevel.value = 0
      isCapturing.value = false

      console.log('Audio capture stopped')
    } catch (err) {
      console.error('Error stopping capture:', err)
      const error_ = err as Error
      error.value = `Stop error: ${error_.message}`
    }
  }

  /**
   * Starts monitoring audio signal level
   */
  const startAudioLevelMonitoring = (): void => {
    const updateAudioLevel = (): void => {
      if (!analyserNode || !dataArray) {
        return
      }

      // Get data from analyzer
      analyserNode.getByteTimeDomainData(dataArray as any)

      // Calculate RMS (Root Mean Square) for loudness level
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = ((dataArray[i] ?? 0) - 128) / 128 // Normalize from -1 to 1
        sum += normalized * normalized
      }
      const rms = Math.sqrt(sum / dataArray.length)

      // Update level (0 to 1)
      audioLevel.value = Math.min(rms * 2, 1) // Multiply by 2 for better sensitivity

      // Request next frame
      animationFrameId = requestAnimationFrame(updateAudioLevel)
    }

    updateAudioLevel()
  }

  /**
   * Switches to different microphone (stop + start)
   */
  const switchDevice = async (newDeviceId: string): Promise<void> => {
    if (isCapturing.value) {
      stopCapture()
      await startCapture(newDeviceId)
    }
  }

  /**
   * Gets AnalyserNode for further analysis
   */
  const getAnalyserNode = (): AnalyserNode | null => {
    return analyserNode
  }

  /**
   * Gets AudioContext
   */
  const getAudioContext = (): AudioContext | null => {
    return audioContext
  }

  // Computed properties
  const hasError = computed<boolean>(() => error.value !== null)
  const canCapture = computed<boolean>(() => !isCapturing.value && !isRequestingPermission.value)

  // Cleanup on component unmount
  onUnmounted(() => {
    if (isCapturing.value) {
      stopCapture()
    }
  })

  return {
    // States
    isCapturing,
    isRequestingPermission,
    error,
    audioLevel,
    hasError,
    canCapture,

    // Methods
    startCapture,
    stopCapture,
    switchDevice,
    getAnalyserNode,
    getAudioContext
  }
}
