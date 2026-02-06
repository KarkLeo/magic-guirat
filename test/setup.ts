import { beforeAll, vi } from 'vitest'

beforeAll(() => {
  // Mock Web Audio API
  global.AudioContext = vi.fn().mockImplementation(function () {
    return {
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      createAnalyser: vi.fn(() => ({
        fftSize: 4096,
        frequencyBinCount: 2048,
        smoothingTimeConstant: 0.7,
        context: { sampleRate: 48000 },
        getFloatTimeDomainData: vi.fn(),
        getByteTimeDomainData: vi.fn(),
        getByteFrequencyData: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn()
      })),
      close: vi.fn(),
      state: 'running',
      sampleRate: 48000
    }
  }) as any

  // Mock mediaDevices
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
    }),
    enumerateDevices: vi.fn().mockResolvedValue([
      {
        kind: 'audioinput',
        deviceId: 'default',
        label: 'Default Audio Input',
        groupId: 'default',
        toJSON: () => ({})
      }
    ])
  } as any

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
  global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id))

  // Mock localStorage
  const store: Record<string, string> = {}
  global.localStorage = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      for (const key in store) delete store[key]
    }),
    length: 0,
    key: vi.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    })
  } as any
})
