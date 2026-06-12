import { defineConfig, devices } from "@playwright/test";

// Load .env into the test process so e2e can mint a session cookie with the server's SESSION_SECRET.
const loadEnv = (process as unknown as { loadEnvFile?: (path?: string) => void }).loadEnvFile;
try {
  loadEnv?.(".env");
} catch {
  /* .env optional */
}

/** E2E smoke. Reuses the already-running dev server (the project keeps one live). */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
