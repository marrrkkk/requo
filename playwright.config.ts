import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? "3000");
const baseURL = `http://127.0.0.1:${port}`;
const webServerCommand =
  `npm run db:migrate && npm run db:seed-demo && ` +
  `npm run dev:app -- --hostname 127.0.0.1 --port ${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: webServerCommand,
    env: {
      ...process.env,
      APP_TOKEN_HASH_SECRET:
        process.env.APP_TOKEN_HASH_SECRET ??
        "test-token-hash-secret-at-least-32-characters",
      BETTER_AUTH_URL: baseURL,
      DISABLE_TRANSACTIONAL_EMAILS: "1",
      NEXT_PUBLIC_BETTER_AUTH_URL: `${baseURL}/api/auth`,
      OPENROUTER_API_KEY: "",
      GROQ_API_KEY: "",
      GEMINI_API_KEY: "",
      RESEND_API_KEY: "",
      RESEND_FROM_EMAIL: "",
      RESEND_REPLY_TO_EMAIL: "",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
