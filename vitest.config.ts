import path from 'path';
import { config } from 'dotenv';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

config({ path: '.env.local' });
config();

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    env: {
      BETTER_AUTH_SECRET: 'test-secret-at-least-32-characters-long-so-zod-passes',
      BETTER_AUTH_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/requo',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: ['node_modules/**', '.next/**', 'tests/**', '**/*.config.*', '**/layout.tsx', '**/page.tsx']
    },
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
  },
});
