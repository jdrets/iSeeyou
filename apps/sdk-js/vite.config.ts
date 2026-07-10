import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ISeeYou',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'es' ? 'iseeyou.js' : 'iseeyou.iife.js'),
    },
    target: 'es2017',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Named exports → IIFE global ISeeYou.init / ISeeYou.captureEvent
        exports: 'named',
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
