import { ref, watch } from 'vue'
import type { UseSettingsReturn } from '@/types'

const STORAGE_KEY = 'magic-guitar-settings'

interface SettingsData {
  selectedDeviceId: string
  noiseThreshold: number
  bloomIntensity: number
  bloomThreshold: number
  bloomRadius: number
}

const DEFAULTS: SettingsData = {
  selectedDeviceId: '',
  noiseThreshold: 0.01,
  bloomIntensity: 1.5,  // Оптимальное значение для магического свечения
  bloomThreshold: 0.15,  // Порог яркости для bloom эффекта
  bloomRadius: 0.8,      // Радиус размытия bloom
}

// Module-level shared state (singleton)
const selectedDeviceId = ref<string>(DEFAULTS.selectedDeviceId)
const noiseThreshold = ref<number>(DEFAULTS.noiseThreshold)
const bloomIntensity = ref<number>(DEFAULTS.bloomIntensity)
const bloomThreshold = ref<number>(DEFAULTS.bloomThreshold)
const bloomRadius = ref<number>(DEFAULTS.bloomRadius)
const availableDevices = ref<MediaDeviceInfo[]>([])

// Load from localStorage
function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: Partial<SettingsData> = JSON.parse(stored)
      if (parsed.selectedDeviceId !== undefined) selectedDeviceId.value = parsed.selectedDeviceId
      if (parsed.noiseThreshold !== undefined) noiseThreshold.value = parsed.noiseThreshold
      if (parsed.bloomIntensity !== undefined) bloomIntensity.value = parsed.bloomIntensity
      if (parsed.bloomThreshold !== undefined) bloomThreshold.value = parsed.bloomThreshold
      if (parsed.bloomRadius !== undefined) bloomRadius.value = parsed.bloomRadius
    }
  } catch (e) {
    // ignored — используем дефолты
  }
}

// Persist to localStorage
function persist(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedDeviceId: selectedDeviceId.value,
        noiseThreshold: noiseThreshold.value,
        bloomIntensity: bloomIntensity.value,
        bloomThreshold: bloomThreshold.value,
        bloomRadius: bloomRadius.value
      })
    )
  } catch (e) {
    // ignored
  }
}

// Initialize on module load
loadFromStorage()
watch(selectedDeviceId, persist)
watch(noiseThreshold, persist)
watch(bloomIntensity, persist)
watch(bloomThreshold, persist)
watch(bloomRadius, persist)

export function useSettings(): UseSettingsReturn {
  const refreshDevices = async (): Promise<void> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      availableDevices.value = devices.filter((d) => d.kind === 'audioinput')
    } catch (e) {
      console.warn('Не удалось получить список устройств:', e)
      availableDevices.value = []
    }
  }

  const resetToDefaults = (): void => {
    selectedDeviceId.value = DEFAULTS.selectedDeviceId
    noiseThreshold.value = DEFAULTS.noiseThreshold
    bloomIntensity.value = DEFAULTS.bloomIntensity
    bloomThreshold.value = DEFAULTS.bloomThreshold
    bloomRadius.value = DEFAULTS.bloomRadius
  }

  return {
    selectedDeviceId,
    noiseThreshold,
    bloomIntensity,
    bloomThreshold,
    bloomRadius,
    availableDevices,
    refreshDevices,
    resetToDefaults
  }
}
