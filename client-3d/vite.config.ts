import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('globe')) {
              return 'three-vendor';
            }
            if (id.includes('react')) {
              return 'react-vendor';
            }
          }
        }
      }
    }
  }
})
