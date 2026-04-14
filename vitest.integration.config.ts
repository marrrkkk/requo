import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: ['node_modules/**', '.next/**', 'tests/**', '**/*.config.*', '**/layout.tsx', '**/page.tsx']
    },
    env: {
      BETTER_AUTH_SECRET: 'test-secret-at-least-32-characters-long-so-zod-passes',
      BETTER_AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key'
    }
  },
});
