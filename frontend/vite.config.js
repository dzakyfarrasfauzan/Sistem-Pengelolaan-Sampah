import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Request ke /be diteruskan ke backend Express, sehingga cukup satu alamat (frontend)
    proxy: {
      '/be': {
        target: 'http://localhost:3000',
        changeOrigin: true, ws: true,
        rewrite: (p) => p.replace(/^\/be/, ''),
      },
    },
  },
})
