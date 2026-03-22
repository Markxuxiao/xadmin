import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { createXAdmin } from '@xadmin/frontend/runtime/plugin'

export default defineConfig({
  plugins: [
    vue(),
    createXAdmin({
      frontend: {
        moduleGlob: '/packages/module-*/views/**/*.vue'
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
