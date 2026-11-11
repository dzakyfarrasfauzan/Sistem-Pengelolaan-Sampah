import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // dapat dibuka dari perangkat lain di jaringan WiFi yang sama
    // Request ke /be diteruskan ke backend Express, sehingga cukup satu alamat (frontend)
    proxy: {
      '/be': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/be/, ''),
      },
    },
  },
})
