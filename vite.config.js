import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Vitest config
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    include: ['src/__tests__/**/*.test.{js,jsx}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/hooks/**', 'src/pages/**', 'src/components/**'],
      exclude: ['src/__tests__/**'],
    },
  },
})
