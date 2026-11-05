import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em dev, /api é repassado para o back-end (padrão: http://localhost:8080).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080',
    },
  },
})
