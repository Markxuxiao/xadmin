import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    vue()
    // XAdmin plugin: 已移除，Phase 1 直接 import 视图
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@xadmin/frontend': resolve(__dirname, '../../packages/core/frontend'),
      '@xadmin/backend': resolve(__dirname, '../../packages/core/backend'),
      '@xadmin/module-user': resolve(__dirname, '../../packages/module-user'),
      '@xadmin/module-order': resolve(__dirname, '../../packages/module-order'),
    }
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
