import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? "3000");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run db:migrate && npm run db:seed-demo && npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      ...process.env,
      BETTER_AUTH_URL: baseURL,
      NEXT_PUBLIC_BETTER_AUTH_URL: `${baseURL}/api/auth`,
      OPENROUTER_API_KEY: "",
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
