import { ref, watch } from 'vue'
import type { UseSettingsReturn } from '@/types'

const STORAGE_KEY = 'magic-guitar-settings'

interface SettingsData {
  selectedDeviceId: string
  noiseThreshold: number
}

const DEFAULTS: SettingsData = {
  selectedDeviceId: '',
  noiseThreshold: 0.01
}

// Module-level shared state (singleton)
const selectedDeviceId = ref<string>(DEFAULTS.selectedDeviceId)
const noiseThreshold = ref<number>(DEFAULTS.noiseThreshold)
const availableDevices = ref<MediaDeviceInfo[]>([])

// Load from localStorage
function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: Partial<SettingsData> = JSON.parse(stored)
      if (parsed.selectedDeviceId !== undefined) selectedDeviceId.value = parsed.selectedDeviceId
      if (parsed.noiseThreshold !== undefined) noiseThreshold.value = parsed.noiseThreshold
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
        noiseThreshold: noiseThreshold.value
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
  }

  return {
    selectedDeviceId,
    noiseThreshold,
    availableDevices,
    refreshDevices,
    resetToDefaults
  }
}
