import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.test.ts'],
    setupFiles: ['./__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@xadmin/backend': resolve(__dirname, '.'),
    }
  },
})
