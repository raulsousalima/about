import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        styleguide: resolve(__dirname, 'styleguide.html'),
        decathlon: resolve(__dirname, 'case/decathlon.html'),
        nofrictionai: resolve(__dirname, 'case/nofrictionai.html'),
      },
    },
  },
})
