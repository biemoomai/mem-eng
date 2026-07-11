import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion-vendor': ['framer-motion'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'fsrs-vendor': ['ts-fsrs'],
          'icons-vendor': ['lucide-react']
        }
      }
    }
  }
})