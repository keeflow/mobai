import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@shared': resolve('src/shared')
    }
  }
})
