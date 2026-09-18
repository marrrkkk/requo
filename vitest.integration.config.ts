import path from 'path';
import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

import { COVERAGE_EXCLUDES } from './vitest.shared';

config({ path: '.env.local' });
config();

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    reporters: [['default'], ['json', { outputFile: 'reports/vitest-integration.json' }]],
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './') },
      {
        find: 'server-only',
        replacement: path.resolve(__dirname, 'node_modules/server-only/empty.js'),
      },
      {
        find: /^next\/server$/,
        replacement: path.resolve(__dirname, 'node_modules/next/server.js'),
      },
    ],
    server: {
      deps: {
        inline: ['@polar-sh/nextjs'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: ['node_modules/**', '.next/**', ...COVERAGE_EXCLUDES],
    },
    env: {
      BETTER_AUTH_SECRET: 'test-secret-at-least-32-characters-long-so-zod-passes',
      // Deterministic AES-256 key (base64 of 32 ASCII bytes) for provider
      // credential encryption in payment tests. Never a real secret.
      PAYMENT_CREDENTIALS_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
      // Stripe Connect platform config for connection-flow tests. Fake values;
      // provider HTTP is stubbed per test. Never real secrets.
      STRIPE_PLATFORM_SECRET_KEY: 'sk_test_platform_tests_only',
      STRIPE_PLATFORM_WEBHOOK_SECRET: 'whsec_platform_tests_only',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        process.env.DATABASE_URL ??
        'postgresql://postgres:postgres@127.0.0.1:5432/requo',
      EMAIL_DOMAIN: 'example.com',
      EMAIL_FROM_DEFAULT: 'Requo <noreply@example.com>',
      EMAIL_FROM_NOTIFICATIONS: 'Requo Notifications <notifications@example.com>',
      EMAIL_FROM_SYSTEM: 'Requo System <system@example.com>',
      EMAIL_FROM_QUOTES: 'Requo Quotes <quotes@example.com>',
      EMAIL_FROM_SUPPORT: 'Requo Support <support@example.com>',
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-key',
    },
  },
});
