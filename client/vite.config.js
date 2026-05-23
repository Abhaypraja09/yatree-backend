import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      stream: 'stream-browserify',
      util: 'util',
      events: 'events',
      buffer: 'buffer',
    },
  },
  define: {
    global: 'window',
    'process.env': {},
    process: {
      env: {}
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
    }
  },
  build: {
    chunkSizeWarningLimit: 1500,
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // React core + router + framer-motion MUST stay together — they share circular deps
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
          // Icons are safe to split separately
          icons: ['lucide-react'],
          // Excel is only used on export — completely safe to split
          excel: ['xlsx', 'xlsx-js-style']
        }
      }
    }
  }
})
