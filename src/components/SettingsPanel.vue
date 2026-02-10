<template>
  <transition name="settings">
    <div v-if="isOpen" class="settings-overlay" @click.self="$emit('close')">
      <div class="settings-panel">
        <div class="settings-header">
          <h2 class="settings-title">Настройки</h2>
          <button class="settings-close" aria-label="Закрыть" @click="$emit('close')">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="settings-body">
          <!-- Quality Preset -->
          <div class="settings-section">
            <label class="settings-label">Качество графики</label>
            <div class="quality-presets">
              <button
                v-for="preset in qualityOptions"
                :key="preset.value"
                class="quality-btn"
                :class="{ active: qualityPreset === preset.value }"
                @click="qualityPreset = preset.value"
              >
                {{ preset.label }}
              </button>
            </div>
            <div class="settings-range-labels">
              <span>Для слабых ПК</span>
              <span>Максимум эффектов</span>
            </div>
          </div>

          <div class="settings-divider"></div>

          <!-- Микрофон -->
          <div class="settings-section">
            <label class="settings-label">Микрофон</label>
            <select
              v-model="selectedDeviceId"
              class="settings-select"
            >
              <option value="">По умолчанию</option>
              <option
                v-for="device in availableDevices"
                :key="device.deviceId"
                :value="device.deviceId"
              >
                {{ device.label || `Микрофон ${device.deviceId.slice(0, 8)}...` }}
              </option>
            </select>
          </div>

          <!-- Чувствительность -->
          <div class="settings-section">
            <label class="settings-label">
              Чувствительность
              <span class="settings-value">{{ formattedThreshold }}</span>
            </label>
            <input
              v-model.number="noiseThreshold"
              type="range"
              min="0.001"
              max="0.05"
              step="0.001"
              class="settings-range"
            />
            <div class="settings-range-labels">
              <span>Высокая</span>
              <span>Низкая</span>
            </div>
          </div>

          <!-- Bloom Intensity -->
          <div class="settings-section">
            <label class="settings-label">
              Интенсивность свечения
              <span class="settings-value">{{ formattedBloom }}</span>
            </label>
            <input
              v-model.number="bloomIntensity"
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              class="settings-range settings-range-bloom"
            />
            <div class="settings-range-labels">
              <span>Слабое</span>
              <span>Магическое ✨</span>
            </div>
          </div>

          <!-- Bloom Threshold -->
          <div class="settings-section">
            <label class="settings-label">
              Порог свечения
              <span class="settings-value">{{ formattedThresholdValue }}</span>
            </label>
            <input
              v-model.number="bloomThreshold"
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              class="settings-range"
            />
            <div class="settings-range-labels">
              <span>Всё светит</span>
              <span>Только яркое</span>
            </div>
          </div>

          <!-- Bloom Radius -->
          <div class="settings-section">
            <label class="settings-label">
              Размер свечения
              <span class="settings-value">{{ formattedRadiusValue }}</span>
            </label>
            <input
              v-model.number="bloomRadius"
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              class="settings-range"
            />
            <div class="settings-range-labels">
              <span>Маленький</span>
              <span>Большой</span>
            </div>
          </div>

          <!-- Divider -->
          <div class="settings-divider"></div>

          <!-- Ghost Opacity -->
          <div class="settings-section">
            <label class="settings-label">
              Прозрачность призраков
              <span class="settings-value">{{ formattedGhostOpacity }}</span>
            </label>
            <input
              v-model.number="ghostOpacity"
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              class="settings-range"
            />
            <div class="settings-range-labels">
              <span>Прозрачные</span>
              <span>Видимые</span>
            </div>
          </div>

          <!-- Ghost Fade Speed -->
          <div class="settings-section">
            <label class="settings-label">
              Затухание призраков
              <span class="settings-value">{{ formattedGhostFadeSpeed }}</span>
            </label>
            <input
              v-model.number="ghostFadeSpeed"
              type="range"
              min="0.01"
              max="0.2"
              step="0.01"
              class="settings-range"
            />
            <div class="settings-range-labels">
              <span>Медленное</span>
              <span>Быстрое</span>
            </div>
          </div>

          <!-- Ghost Blur -->
          <div class="settings-section">
            <label class="settings-label">
              Размытие призраков
              <span class="settings-value">{{ formattedGhostBlur }}</span>
            </label>
            <input
              v-model.number="ghostBlur"
              type="range"
              min="0.0"
              max="5.0"
              step="0.1"
              class="settings-range"
            />
            <div class="settings-range-labels">
              <span>Четкие</span>
              <span>Дымные</span>
            </div>
          </div>

          <!-- Новые настройки дыма -->
          <div class="settings-divider"></div>
          
          <div class="settings-section">
            <label class="settings-label">
              Интенсивность волн
              <span class="settings-value">{{ formattedSmokeIntensity }}</span>
            </label>
            <input
              v-model.number="smokeIntensity"
              type="range"
              min="0.0"
              max="2.0"
              step="0.1"
              class="settings-range"
            />
            <div class="settings-range-labels">
              <span>Спокойные</span>
              <span>Активные</span>
            </div>
          </div>

          <div class="settings-section">
            <label class="settings-label">
              Турбулентность
              <span class="settings-value">{{ formattedTurbulence }}</span>
            </label>
            <input
              v-model.number="turbulence"
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              class="settings-range"
            />
            <div class="settings-range-labels">
              <span>Плавные</span>
              <span>Клубящиеся</span>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <button class="settings-reset" @click="handleReset">
            По умолчанию
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useSettings } from '@/composables/useSettings'

const props = defineProps({
  isOpen: Boolean,
})

const emit = defineEmits(['close'])

const onKeydown = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

const {
  selectedDeviceId,
  noiseThreshold,
  bloomIntensity,
  bloomThreshold,
  bloomRadius,
  ghostOpacity,
  ghostFadeSpeed,
  ghostBlur,
  smokeIntensity,
  turbulence,
  qualityPreset,
  availableDevices,
  refreshDevices,
  resetToDefaults
} = useSettings()

const qualityOptions = [
  { value: 'low', label: 'Низкое' },
  { value: 'medium', label: 'Среднее' },
  { value: 'high', label: 'Высокое' },
]

const formattedThreshold = computed(() => noiseThreshold.value.toFixed(3))
const formattedBloom = computed(() => bloomIntensity.value.toFixed(1))
const formattedThresholdValue = computed(() => bloomThreshold.value.toFixed(2))
const formattedRadiusValue = computed(() => bloomRadius.value.toFixed(2))
const formattedGhostOpacity = computed(() => ghostOpacity.value.toFixed(2))
const formattedGhostFadeSpeed = computed(() => ghostFadeSpeed.value.toFixed(3))
const formattedGhostBlur = computed(() => ghostBlur.value.toFixed(1))
const formattedSmokeIntensity = computed(() => smokeIntensity.value.toFixed(1))
const formattedTurbulence = computed(() => turbulence.value.toFixed(2))

// Обновляем список устройств при открытии панели
watch(
  () => props.isOpen,
  (open) => {
    if (open) refreshDevices()
  },
)

const handleReset = () => {
  resetToDefaults()
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.settings-panel {
  background: rgba(15, 12, 41, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(168, 181, 255, 0.2);
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  padding: 1.5rem;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 60px rgba(102, 126, 234, 0.1);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.settings-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #e0d6f6;
}

.settings-close {
  background: none;
  border: none;
  color: rgba(168, 181, 255, 0.6);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
}

.settings-close:hover {
  color: #fff;
  background: rgba(168, 181, 255, 0.1);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(168, 181, 255, 0.2) 50%,
    transparent
  );
  margin: 0.5rem 0;
}

.settings-label {
  font-size: 0.875rem;
  color: rgba(168, 181, 255, 0.8);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-value {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.8rem;
  color: rgba(168, 181, 255, 0.5);
}

.settings-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(168, 181, 255, 0.15);
  border-radius: 8px;
  color: #e0d6f6;
  padding: 0.6rem 0.75rem;
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23a8b5ff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
}

.settings-select:focus {
  border-color: rgba(102, 126, 234, 0.5);
}

.settings-select option {
  background: #1a1640;
  color: #e0d6f6;
}

.settings-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(168, 181, 255, 0.15);
  outline: none;
}

.settings-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #a855f7);
  cursor: pointer;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.4);
  transition: box-shadow 0.2s;
}

.settings-range::-webkit-slider-thumb:hover {
  box-shadow: 0 0 16px rgba(102, 126, 234, 0.6);
}

.settings-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #a855f7);
  cursor: pointer;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.4);
}

.quality-presets {
  display: flex;
  gap: 0.5rem;
}

.quality-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(168, 181, 255, 0.15);
  color: rgba(168, 181, 255, 0.7);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.quality-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(168, 181, 255, 0.3);
}

.quality-btn.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(168, 85, 247, 0.3));
  border-color: rgba(102, 126, 234, 0.5);
  color: #e0d6f6;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.2);
}

.settings-range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(168, 181, 255, 0.4);
}

.settings-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(168, 181, 255, 0.1);
  display: flex;
  justify-content: center;
}

.settings-reset {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(168, 181, 255, 0.15);
  color: rgba(168, 181, 255, 0.7);
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-reset:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e0d6f6;
  border-color: rgba(168, 181, 255, 0.3);
}

/* Transition */
.settings-enter-active,
.settings-leave-active {
  transition: opacity 0.25s ease;
}

.settings-enter-active .settings-panel,
.settings-leave-active .settings-panel {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.settings-enter-from,
.settings-leave-to {
  opacity: 0;
}

.settings-enter-from .settings-panel,
.settings-leave-to .settings-panel {
  transform: scale(0.95) translateY(10px);
}
</style>
