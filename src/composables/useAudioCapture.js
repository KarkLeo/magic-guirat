import { ref, computed, onUnmounted } from 'vue'

/**
 * Composable для захвата звука с микрофона
 * Использует Web Audio API для захвата и анализа аудио
 */
export function useAudioCapture() {
  // Реактивные состояния
  const isCapturing = ref(false)
  const isRequestingPermission = ref(false)
  const error = ref(null)
  const audioLevel = ref(0)

  // Web Audio API объекты
  let audioContext = null
  let mediaStream = null
  let analyserNode = null
  let microphoneSource = null
  let animationFrameId = null

  // Буфер для анализа уровня сигнала
  let dataArray = null

  /**
   * Запускает захват звука с микрофона
   */
  const startCapture = async () => {
    try {
      error.value = null
      isRequestingPermission.value = true

      // Запрос доступа к микрофону
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // Отключаем подавление эха для чистого звука гитары
          noiseSuppression: false, // Отключаем шумоподавление
          autoGainControl: false, // Отключаем автоматическую регулировку усиления
        },
      })

      // Создаём AudioContext
      audioContext = new (window.AudioContext || window.webkitAudioContext)()

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

      // Обработка различных типов ошибок
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        error.value = 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.'
      } else if (err.name === 'NotFoundError') {
        error.value = 'Микрофон не найден. Подключите микрофон и попробуйте снова.'
      } else if (err.name === 'NotReadableError') {
        error.value =
          'Микрофон используется другим приложением. Закройте другие приложения и попробуйте снова.'
      } else {
        error.value = `Ошибка при доступе к микрофону: ${err.message}`
      }

      isRequestingPermission.value = false
    }
  }

  /**
   * Останавливает захват звука
   */
  const stopCapture = () => {
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
      error.value = `Ошибка при остановке: ${err.message}`
    }
  }

  /**
   * Запускает мониторинг уровня аудио сигнала
   */
  const startAudioLevelMonitoring = () => {
    const updateAudioLevel = () => {
      if (!analyserNode || !dataArray) {
        return
      }

      // Получаем данные из анализатора
      analyserNode.getByteTimeDomainData(dataArray)

      // Вычисляем RMS (Root Mean Square) для определения уровня громкости
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128 // Нормализуем от -1 до 1
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
   * Получает доступ к AnalyserNode для дальнейшего анализа
   */
  const getAnalyserNode = () => {
    return analyserNode
  }

  /**
   * Получает доступ к AudioContext
   */
  const getAudioContext = () => {
    return audioContext
  }

  // Computed свойства
  const hasError = computed(() => error.value !== null)
  const canCapture = computed(() => !isCapturing.value && !isRequestingPermission.value)

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
    getAnalyserNode,
    getAudioContext,
  }
}
