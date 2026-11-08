import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Sertifikat HTTPS lokal (frontend/cert). Kamera dan GPS di HP hanya bisa
// dipakai lewat HTTPS, jadi bila sertifikat ada, server dev memakai HTTPS.
const certDir = path.resolve(import.meta.dirname, 'cert')
const https = fs.existsSync(path.join(certDir, 'key.pem'))
  ? { key: fs.readFileSync(path.join(certDir, 'key.pem')), cert: fs.readFileSync(path.join(certDir, 'cert.pem')) }
  : undefined

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // dapat dibuka dari HP lain di jaringan WiFi yang sama
    https,
    // Request ke /be diteruskan ke backend Express, sehingga HP cukup
    // mengakses satu alamat (frontend) saja.
    proxy: {
      '/be': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/be/, ''),
      },
    },
  },
})
