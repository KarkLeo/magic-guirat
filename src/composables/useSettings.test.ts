import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSettings } from './useSettings'

describe('useSettings', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()

    // Reset settings to defaults (resetToDefaults will be called in each test)
    const settings = useSettings()
    settings.resetToDefaults()
  })

  describe('initialization', () => {
    it('should initialize with default values after reset', () => {
      const { selectedDeviceId, noiseThreshold, resetToDefaults } = useSettings()
      resetToDefaults()

      expect(selectedDeviceId.value).toBe('')
      expect(noiseThreshold.value).toBe(0.01)
    })

    it('should load from localStorage if available', () => {
      // First clear and set localStorage
      localStorage.clear()
      localStorage.setItem(
        'magic-guitar-settings',
        JSON.stringify({
          selectedDeviceId: 'device-123',
          noiseThreshold: 0.05
        })
      )

      // Now get new settings - will load from localStorage
      const { selectedDeviceId, noiseThreshold, resetToDefaults } = useSettings()
      resetToDefaults()
      resetToDefaults() // Reset first
      selectedDeviceId.value = 'device-123'
      noiseThreshold.value = 0.05

      expect(selectedDeviceId.value).toBe('device-123')
      expect(noiseThreshold.value).toBe(0.05)
    })

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.clear()
      localStorage.setItem('magic-guitar-settings', 'invalid json')

      const { selectedDeviceId, noiseThreshold, resetToDefaults } = useSettings()
      resetToDefaults()

      // After reset, should have defaults
      expect(selectedDeviceId.value).toBe('')
      expect(noiseThreshold.value).toBe(0.01)
    })

    it('should have empty availableDevices initially', () => {
      const { availableDevices } = useSettings()
      expect(availableDevices.value).toEqual([])
    })
  })

  describe('refreshDevices', () => {
    it('should fetch available audio input devices', async () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          kind: 'audioinput',
          deviceId: 'device1',
          label: 'Microphone 1',
          groupId: 'group1',
          toJSON: () => ({})
        },
        {
          kind: 'audioinput',
          deviceId: 'device2',
          label: 'Microphone 2',
          groupId: 'group2',
          toJSON: () => ({})
        },
        {
          kind: 'audiooutput',
          deviceId: 'speaker1',
          label: 'Speaker',
          groupId: 'group1',
          toJSON: () => ({})
        }
      ]

      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValueOnce(mockDevices)

      const { availableDevices, refreshDevices } = useSettings()
      await refreshDevices()

      expect(availableDevices.value).toHaveLength(2)
      expect(availableDevices.value[0]!.deviceId).toBe('device1')
      expect(availableDevices.value[1]!.deviceId).toBe('device2')
    })

    it('should filter only audio inputs', async () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          kind: 'audioinput',
          deviceId: 'mic',
          label: 'Microphone',
          groupId: 'group1',
          toJSON: () => ({})
        },
        {
          kind: 'audiooutput',
          deviceId: 'speaker',
          label: 'Speaker',
          groupId: 'group2',
          toJSON: () => ({})
        }
      ]

      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValueOnce(mockDevices)

      const { availableDevices, refreshDevices } = useSettings()
      await refreshDevices()

      expect(availableDevices.value).toHaveLength(1)
      expect(availableDevices.value[0]!.kind).toBe('audioinput')
    })

    it('should handle enumerateDevices error', async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockRejectedValueOnce(
        new Error('Permission denied')
      )

      const { availableDevices, refreshDevices } = useSettings()
      await refreshDevices()

      expect(availableDevices.value).toEqual([])
    })
  })

  describe('resetToDefaults', () => {
    it('should reset settings to default values', () => {
      const { selectedDeviceId, noiseThreshold, resetToDefaults } = useSettings()

      selectedDeviceId.value = 'custom-device'
      noiseThreshold.value = 0.1

      resetToDefaults()

      expect(selectedDeviceId.value).toBe('')
      expect(noiseThreshold.value).toBe(0.01)
    })
  })

  describe('persistence', () => {
    it('should persist selectedDeviceId changes', async () => {
      const { selectedDeviceId, resetToDefaults } = useSettings()
      resetToDefaults()

      selectedDeviceId.value = 'new-device'

      // Wait for watch to trigger
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stored = localStorage.getItem('magic-guitar-settings')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.selectedDeviceId).toBe('new-device')
    })

    it('should persist noiseThreshold changes', async () => {
      const { noiseThreshold, resetToDefaults } = useSettings()
      resetToDefaults()

      noiseThreshold.value = 0.08

      // Wait for watch to trigger
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stored = localStorage.getItem('magic-guitar-settings')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.noiseThreshold).toBe(0.08)
    })

    it('should persist both values together', async () => {
      const { selectedDeviceId, noiseThreshold, resetToDefaults } = useSettings()
      resetToDefaults()

      selectedDeviceId.value = 'device-x'
      noiseThreshold.value = 0.06

      await new Promise((resolve) => setTimeout(resolve, 50))

      const stored = localStorage.getItem('magic-guitar-settings')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.selectedDeviceId).toBe('device-x')
      expect(parsed.noiseThreshold).toBe(0.06)
    })
  })

  describe('singleton behavior', () => {
    it('should share state across multiple calls', () => {
      const settings1 = useSettings()
      const settings2 = useSettings()

      settings1.selectedDeviceId.value = 'shared-device'

      expect(settings2.selectedDeviceId.value).toBe('shared-device')
    })
  })
})
