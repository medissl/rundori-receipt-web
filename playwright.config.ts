import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
if (existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "off",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
