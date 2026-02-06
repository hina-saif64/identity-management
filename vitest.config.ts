import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});