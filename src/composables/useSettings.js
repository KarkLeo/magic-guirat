import { ref, watch } from 'vue'

const STORAGE_KEY = 'magic-guitar-settings'

const DEFAULTS = {
  selectedDeviceId: '',
  noiseThreshold: 0.01,
}

// Module-level shared state (singleton)
const selectedDeviceId = ref(DEFAULTS.selectedDeviceId)
const noiseThreshold = ref(DEFAULTS.noiseThreshold)
const availableDevices = ref([])

// Загружаем из localStorage при инициализации модуля
try {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    const parsed = JSON.parse(stored)
    if (parsed.selectedDeviceId !== undefined) selectedDeviceId.value = parsed.selectedDeviceId
    if (parsed.noiseThreshold !== undefined) noiseThreshold.value = parsed.noiseThreshold
  }
} catch (e) {
  // ignored — используем дефолты
}

// Персистенция: сохраняем при каждом изменении
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      selectedDeviceId: selectedDeviceId.value,
      noiseThreshold: noiseThreshold.value,
    }))
  } catch (e) {
    // ignored
  }
}

watch(selectedDeviceId, persist)
watch(noiseThreshold, persist)

export function useSettings() {
  const refreshDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      availableDevices.value = devices.filter(d => d.kind === 'audioinput')
    } catch (e) {
      console.warn('Не удалось получить список устройств:', e)
      availableDevices.value = []
    }
  }

  const resetToDefaults = () => {
    selectedDeviceId.value = DEFAULTS.selectedDeviceId
    noiseThreshold.value = DEFAULTS.noiseThreshold
  }

  return {
    selectedDeviceId,
    noiseThreshold,
    availableDevices,
    refreshDevices,
    resetToDefaults,
  }
}
