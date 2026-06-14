import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { catalogApi } from './vite-plugins/catalogApi'

export default defineConfig({
  plugins: [react(), catalogApi()],
  worker: {
    format: 'es',
  },
})
