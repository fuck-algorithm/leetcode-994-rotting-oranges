import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/algorithm/**/*.ts', 'src/utils/**/*.ts'],
      reporter: ['text', 'html'],
      thresholds: { lines: 60, functions: 60, branches: 50 },
    },
  },
});
