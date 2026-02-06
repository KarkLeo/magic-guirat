import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'test/',
          '*.config.*',
          'src/main.ts',
          'src/**/*.spec.ts',
          'src/**/*.test.ts'
        ],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80
        }
      }
    }
  })
)
