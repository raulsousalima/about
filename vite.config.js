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
        designsystem: resolve(__dirname, 'designsystem.html'),
        decathlon: resolve(__dirname, 'case/decathlon.html'),
        daycoval: resolve(__dirname, 'case/daycoval.html'),
        nofrictionai: resolve(__dirname, 'case/nofrictionai.html'),
        starbem: resolve(__dirname, 'case/starbem.html'),
        pernambucanas: resolve(__dirname, 'case/pernambucanas.html'),
        pefisa: resolve(__dirname, 'case/pefisa.html'),
        kalion: resolve(__dirname, 'case/kalion.html'),
        spaceshooter: resolve(__dirname, 'space-shooter-offline.html'),
        profile: resolve(__dirname, 'profile.html'),
        prototipoDecathlon: resolve(__dirname, 'prototipo/decathlon.html'),
      },
    },
  },
})

