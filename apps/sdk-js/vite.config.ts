import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SeeYou',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'es' ? 'seeyou.js' : 'seeyou.iife.js'),
    },
    target: 'es2017',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Named exports → IIFE global SeeYou.init / SeeYou.captureEvent
        exports: 'named',
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
