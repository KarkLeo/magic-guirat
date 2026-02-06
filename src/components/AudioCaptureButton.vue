<template>
  <div class="audio-capture">
    <!-- Кнопка управления -->
    <button
      class="capture-button"
      :class="{
        active: isCapturing,
        requesting: isRequestingPermission,
        error: hasError,
      }"
      :disabled="isRequestingPermission"
      :aria-label="buttonText"
      :aria-pressed="isCapturing"
      @click="toggleCapture"
    >
      <span class="button-icon">
        <svg
          v-if="!isCapturing && !isRequestingPermission"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
          ></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <svg
          v-else-if="isCapturing"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
        <span v-else class="spinner"></span>
      </span>
      <span class="button-text">
        {{ buttonText }}
      </span>
    </button>

    <!-- Индикатор уровня сигнала -->
    <div v-if="isCapturing" class="audio-level-container" role="status" aria-live="polite">
      <div class="audio-level-label">Уровень сигнала</div>
      <div class="audio-level-meter" role="progressbar" :aria-valuenow="Math.round(audioLevel * 100)" aria-valuemin="0" aria-valuemax="100">
        <div
          class="audio-level-bar"
          :style="{ width: `${audioLevel * 100}%` }"
        ></div>
      </div>
      <div class="audio-level-value">{{ Math.round(audioLevel * 100) }}%</div>
    </div>

    <!-- Сообщение об ошибке -->
    <div v-if="hasError" class="error-message" role="alert" aria-live="assertive">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAudioCapture } from '@/composables/useAudioCapture'

// Props (если переданы, используем их вместо внутреннего useAudioCapture)
const props = defineProps({
  isCapturing: {
    type: Boolean,
    default: undefined,
  },
  isRequestingPermission: {
    type: Boolean,
    default: undefined,
  },
  error: {
    type: String,
    default: undefined,
  },
  hasError: {
    type: Boolean,
    default: undefined,
  },
  audioLevel: {
    type: Number,
    default: undefined,
  },
})

// Emits
const emit = defineEmits(['toggle-capture'])

// Если props не переданы, используем внутренний useAudioCapture
const internalAudio = props.isCapturing === undefined ? useAudioCapture() : null

// Используем либо props, либо internal состояния
const isCapturing = computed(() =>
  props.isCapturing !== undefined ? props.isCapturing : internalAudio?.isCapturing.value,
)
const isRequestingPermission = computed(() =>
  props.isRequestingPermission !== undefined
    ? props.isRequestingPermission
    : internalAudio?.isRequestingPermission.value,
)
const error = computed(() =>
  props.error !== undefined ? props.error : internalAudio?.error.value,
)
const hasError = computed(() =>
  props.hasError !== undefined ? props.hasError : internalAudio?.hasError.value,
)
const audioLevel = computed(() =>
  props.audioLevel !== undefined ? props.audioLevel : internalAudio?.audioLevel.value,
)

// Переключение состояния захвата
const toggleCapture = async () => {
  // Если используем props, emit событие
  if (props.isCapturing !== undefined) {
    emit('toggle-capture')
    return
  }

  // Иначе используем внутренний useAudioCapture
  if (internalAudio) {
    if (internalAudio.isCapturing.value) {
      internalAudio.stopCapture()
    } else {
      await internalAudio.startCapture()
    }
  }
}

// Текст кнопки в зависимости от состояния
const buttonText = computed(() => {
  if (isRequestingPermission.value) {
    return 'Запрос доступа...'
  }
  if (isCapturing.value) {
    return 'Остановить захват'
  }
  return 'Начать захват звука'
})
</script>

<style scoped>
.audio-capture {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  max-width: 400px;
  margin: 0 auto;
}

/* Кнопка управления */
.capture-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.capture-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.capture-button:active:not(:disabled) {
  transform: translateY(0);
}

.capture-button:focus-visible {
  outline: 3px solid #a855f7;
  outline-offset: 3px;
}

.capture-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Активное состояние */
.capture-button.active {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
  }
  50% {
    box-shadow: 0 4px 25px rgba(240, 147, 251, 0.8);
  }
}

/* Состояние запроса */
.capture-button.requesting {
  background: linear-gradient(135deg, #a8b5ff 0%, #c5b4e3 100%);
}

/* Состояние ошибки */
.capture-button.error {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
}

/* Иконка и текст кнопки */
.button-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-text {
  line-height: 1;
}

/* Спиннер загрузки */
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Индикатор уровня сигнала */
.audio-level-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.audio-level-label {
  font-size: 0.875rem;
  color: #a8b5ff;
  font-weight: 500;
}

.audio-level-meter {
  position: relative;
  width: 100%;
  height: 8px;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.audio-level-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #f093fb 100%);
  border-radius: 4px;
  transition: width 0.1s ease;
  box-shadow: 0 0 10px rgba(240, 147, 251, 0.6);
}

.audio-level-value {
  font-size: 0.875rem;
  color: #667eea;
  font-weight: 600;
  text-align: right;
}

/* Сообщение об ошибке */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  color: #ff6b6b;
  font-size: 0.875rem;
}

.error-message svg {
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .audio-capture {
    padding: 1rem;
    max-width: 100%;
  }

  .capture-button {
    padding: 0.875rem 1.75rem;
    font-size: 0.95rem;
    gap: 0.625rem;
  }

  .button-icon svg {
    width: 22px;
    height: 22px;
  }

  .audio-level-label,
  .audio-level-value,
  .error-message {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .audio-capture {
    padding: 0.75rem;
    gap: 0.875rem;
  }

  .capture-button {
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    gap: 0.5rem;
    border-radius: 10px;
  }

  .button-icon svg {
    width: 20px;
    height: 20px;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border-width: 2.5px;
  }

  .audio-level-label,
  .audio-level-value {
    font-size: 0.75rem;
  }

  .audio-level-meter {
    height: 6px;
  }

  .error-message {
    padding: 0.875rem;
    font-size: 0.75rem;
    gap: 0.5rem;
  }

  .error-message svg {
    width: 18px;
    height: 18px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .capture-button {
    transition: none;
  }

  .capture-button:hover:not(:disabled) {
    transform: none;
  }

  .capture-button.active {
    animation: none;
  }

  .spinner {
    animation: none;
    border-top-color: rgba(255, 255, 255, 0.5);
  }
}
</style>
