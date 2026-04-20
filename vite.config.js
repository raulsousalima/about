import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

export default defineConfig({
  plugins: [
    {
      name: 'copy-dashboard-preview',
      writeBundle() {
        const src = resolve(__dirname, 'img/cases/nofrictionai/dashboard-preview.html')
        const destDir = resolve(__dirname, 'dist/img/cases/nofrictionai')
        mkdirSync(destDir, { recursive: true })
        copyFileSync(src, `${destDir}/dashboard-preview.html`)
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        styleguide: resolve(__dirname, 'styleguide.html'),
        decathlon: resolve(__dirname, 'case/decathlon.html'),
        nofrictionai: resolve(__dirname, 'case/nofrictionai.html'),
        starbem: resolve(__dirname, 'case/starbem.html'),
        pernambucanas: resolve(__dirname, 'case/pernambucanas.html'),
      },
    },
  },
})

