import { ref, watch } from 'vue'
import type { UseSettingsReturn } from '@/types'

const STORAGE_KEY = 'magic-guitar-settings'

interface SettingsData {
  selectedDeviceId: string
  noiseThreshold: number
  bloomIntensity: number
  bloomThreshold: number
  bloomRadius: number
  ghostOpacity: number
  ghostFadeSpeed: number
  ghostBlur: number
  smokeIntensity: number
  turbulence: number
}

const DEFAULTS: SettingsData = {
  selectedDeviceId: '',
  noiseThreshold: 0.01,
  bloomIntensity: 0.85,
  bloomThreshold: 0.28,
  bloomRadius: 0.1,
  ghostOpacity: 0.52,   // Хорошо заметный шлейф, не перебивает струны
  ghostFadeSpeed: 0.045, // Умеренное затухание — призраки успевают проявиться
  ghostBlur: 0.6,        // Мягкое размытие, форма следа сохраняется
  smokeIntensity: 1.0,   // Интенсивность волн дыма
  turbulence: 0.5,       // Турбулентность дыма
}

// Module-level shared state (singleton)
const selectedDeviceId = ref<string>(DEFAULTS.selectedDeviceId)
const noiseThreshold = ref<number>(DEFAULTS.noiseThreshold)
const bloomIntensity = ref<number>(DEFAULTS.bloomIntensity)
const bloomThreshold = ref<number>(DEFAULTS.bloomThreshold)
const bloomRadius = ref<number>(DEFAULTS.bloomRadius)
const ghostOpacity = ref<number>(DEFAULTS.ghostOpacity)
const ghostFadeSpeed = ref<number>(DEFAULTS.ghostFadeSpeed)
const ghostBlur = ref<number>(DEFAULTS.ghostBlur)
const smokeIntensity = ref<number>(DEFAULTS.smokeIntensity)
const turbulence = ref<number>(DEFAULTS.turbulence)
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
      if (parsed.ghostOpacity !== undefined) ghostOpacity.value = parsed.ghostOpacity
      if (parsed.ghostFadeSpeed !== undefined) ghostFadeSpeed.value = parsed.ghostFadeSpeed
      if (parsed.ghostBlur !== undefined) ghostBlur.value = parsed.ghostBlur
      if (parsed.smokeIntensity !== undefined) smokeIntensity.value = parsed.smokeIntensity
      if (parsed.turbulence !== undefined) turbulence.value = parsed.turbulence
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
        bloomRadius: bloomRadius.value,
        ghostOpacity: ghostOpacity.value,
        ghostFadeSpeed: ghostFadeSpeed.value,
        ghostBlur: ghostBlur.value,
        smokeIntensity: smokeIntensity.value,
        turbulence: turbulence.value
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
watch(ghostOpacity, persist)
watch(ghostFadeSpeed, persist)
watch(ghostBlur, persist)
watch(smokeIntensity, persist)
watch(turbulence, persist)

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
    ghostOpacity.value = DEFAULTS.ghostOpacity
    ghostFadeSpeed.value = DEFAULTS.ghostFadeSpeed
    ghostBlur.value = DEFAULTS.ghostBlur
    smokeIntensity.value = DEFAULTS.smokeIntensity
    turbulence.value = DEFAULTS.turbulence
  }

  return {
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
    availableDevices,
    refreshDevices,
    resetToDefaults
  }
}
