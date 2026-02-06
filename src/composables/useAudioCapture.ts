import { ref, computed, onUnmounted } from 'vue'
import type { UseAudioCaptureReturn } from '@/types'

/**
 * Composable для захвата звука с микрофона
 * Использует Web Audio API для захвата и анализа аудио
 */
export function useAudioCapture(): UseAudioCaptureReturn {
  // Реактивные состояния
  const isCapturing = ref<boolean>(false)
  const isRequestingPermission = ref<boolean>(false)
  const error = ref<string | null>(null)
  const audioLevel = ref<number>(0)

  // Web Audio API объекты
  let audioContext: AudioContext | null = null
  let mediaStream: MediaStream | null = null
  let analyserNode: AnalyserNode | null = null
  let microphoneSource: MediaStreamAudioSourceNode | null = null
  let animationFrameId: number | null = null

  // Буфер для анализа уровня сигнала
  let dataArray: Uint8Array | null = null

  /**
   * Запускает захват звука с микрофона
   */
  const startCapture = async (deviceId: string = ''): Promise<void> => {
    try {
      error.value = null
      isRequestingPermission.value = true

      // Формируем audio constraints
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId }
      }

      // Запрос доступа к микрофону
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      })

      // Создаём AudioContext
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Создаём источник из MediaStream
      microphoneSource = audioContext.createMediaStreamSource(mediaStream)

      // Создаём AnalyserNode для анализа частот
      analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = 4096 // Баланс между точностью и производительностью
      analyserNode.smoothingTimeConstant = 0.7 // Среднее сглаживание

      // Подключаем микрофон к анализатору
      microphoneSource.connect(analyserNode)

      // Создаём буфер для данных
      const bufferLength = analyserNode.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)

      // Запускаем анализ уровня сигнала
      startAudioLevelMonitoring()

      isCapturing.value = true
      isRequestingPermission.value = false

      console.log('🎤 Захват звука запущен')
    } catch (err) {
      console.error('❌ Ошибка при захвате звука:', err)

      const error_ = err as DOMException
      // Обработка различных типов ошибок
      if (error_.name === 'NotAllowedError' || error_.name === 'PermissionDeniedError') {
        error.value = 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.'
      } else if (error_.name === 'NotFoundError') {
        error.value = 'Микрофон не найден. Подключите микрофон и попробуйте снова.'
      } else if (error_.name === 'NotReadableError') {
        error.value =
          'Микрофон используется другим приложением. Закройте другие приложения и попробуйте снова.'
      } else {
        error.value = `Ошибка при доступе к микрофону: ${error_.message}`
      }

      isRequestingPermission.value = false
    }
  }

  /**
   * Останавливает захват звука
   */
  const stopCapture = (): void => {
    try {
      // Останавливаем мониторинг уровня
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }

      // Отключаем все источники
      if (microphoneSource) {
        microphoneSource.disconnect()
        microphoneSource = null
      }

      // Останавливаем MediaStream
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
        mediaStream = null
      }

      // Закрываем AudioContext
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
        audioContext = null
      }

      analyserNode = null
      dataArray = null
      audioLevel.value = 0
      isCapturing.value = false

      console.log('🎤 Захват звука остановлен')
    } catch (err) {
      console.error('❌ Ошибка при остановке захвата:', err)
      const error_ = err as Error
      error.value = `Ошибка при остановке: ${error_.message}`
    }
  }

  /**
   * Запускает мониторинг уровня аудио сигнала
   */
  const startAudioLevelMonitoring = (): void => {
    const updateAudioLevel = (): void => {
      if (!analyserNode || !dataArray) {
        return
      }

      // Получаем данные из анализатора
      analyserNode.getByteTimeDomainData(dataArray as any)

      // Вычисляем RMS (Root Mean Square) для определения уровня громкости
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = ((dataArray[i] ?? 0) - 128) / 128 // Нормализуем от -1 до 1
        sum += normalized * normalized
      }
      const rms = Math.sqrt(sum / dataArray.length)

      // Обновляем уровень (от 0 до 1)
      audioLevel.value = Math.min(rms * 2, 1) // Умножаем на 2 для лучшей чувствительности

      // Запрашиваем следующий кадр
      animationFrameId = requestAnimationFrame(updateAudioLevel)
    }

    updateAudioLevel()
  }

  /**
   * Переключает на другой микрофон (stop + start)
   */
  const switchDevice = async (newDeviceId: string): Promise<void> => {
    if (isCapturing.value) {
      stopCapture()
      await startCapture(newDeviceId)
    }
  }

  /**
   * Получает доступ к AnalyserNode для дальнейшего анализа
   */
  const getAnalyserNode = (): AnalyserNode | null => {
    return analyserNode
  }

  /**
   * Получает доступ к AudioContext
   */
  const getAudioContext = (): AudioContext | null => {
    return audioContext
  }

  // Computed свойства
  const hasError = computed<boolean>(() => error.value !== null)
  const canCapture = computed<boolean>(() => !isCapturing.value && !isRequestingPermission.value)

  // Очистка при размонтировании компонента
  onUnmounted(() => {
    if (isCapturing.value) {
      stopCapture()
    }
  })

  return {
    // Состояния
    isCapturing,
    isRequestingPermission,
    error,
    audioLevel,
    hasError,
    canCapture,

    // Методы
    startCapture,
    stopCapture,
    switchDevice,
    getAnalyserNode,
    getAudioContext
  }
}
