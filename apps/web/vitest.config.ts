import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/e2e/**'],
    globals: true,
    hookTimeout: 60000,
    environment: 'happy-dom',
    setupFiles: ['./src/tests/setup.ts'],
    env: {
      PUBLIC_SERVER_URL: 'http://localhost:3000',
      PUBLIC_WEB_URL: 'http://localhost:5173',
    },
  },
});
