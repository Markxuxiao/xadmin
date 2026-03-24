import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.test.{ts,tsx,js,jsx,vue}'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@xadmin/frontend': resolve(__dirname, '../../packages/core/frontend'),
      '@xadmin/backend': resolve(__dirname, '../../packages/core/backend'),
      '@xadmin/module-user': resolve(__dirname, '../../packages/module-user'),
      '@xadmin/module-order': resolve(__dirname, '../../packages/module-order'),
    }
  }
})
