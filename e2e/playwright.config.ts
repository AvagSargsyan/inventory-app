import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Resolved from this file rather than the working directory, so running the
// config from the repo root still finds e2e/.env.
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), ".env") });

// The suite runs in one of two modes and the specs cannot tell the difference,
// because nothing below them ever names a host.
//
//   local (default) — Playwright starts the API and the built SPA itself,
//                     against a database it is free to destroy
//   deployed        — BASE_URL already serves a running environment; nothing
//                     is started and the data belongs to someone else
//
// Explicit rather than inferred from BASE_URL: .env sets BASE_URL for local
// runs too, so inferring it would silently stop the servers from starting.
const hermetic = (process.env.E2E_TARGET ?? "local") !== "deployed";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";
const API_URL = process.env.API_URL ?? "http://localhost:3100";

// Deliberately not DATABASE_URL: that name is already set in api/.env and in
// most shells here, and inheriting it would point the suite at the development
// database — which the seed drops on its way in.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://localhost:5432/fakestore_test";

export default defineConfig({
  testDir: "./tests",

  // Every test creates the rows it asserts on, under a name no other test
  // uses, so they do not have to be serialised.
  fullyParallel: true,

  // A .only left in a spec silently skips the rest of the suite.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,

  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    // The trace is a full timeline with DOM snapshots and network log, which
    // is what makes a failure that only happens in CI debuggable at all.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Headless runs finish faster than the eye can follow, so test:e2e:watch
    // sets SLOW_MO to pause between actions. Normal runs leave it at 0.
    launchOptions: { slowMo: Number(process.env.SLOW_MO) || 0 },
  },

  // Chromium alone: the five viewport widths in the design spec are worth more
  // here than a second engine.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: hermetic
    ? [
        {
          // Seed first, in the same command: Playwright starts web servers
          // before globalSetup runs, so seeding there would be too late and
          // the readiness check below would query tables that do not exist.
          command: "npm run seed && npm run dev",
          cwd: "../api",
          // Port 3100, not the 3000 a development server sits on. Reusing that
          // one would run the whole suite against the development database.
          url: `${API_URL}/api/categories`,
          reuseExistingServer: !process.env.CI,
          env: {
            PORT: "3100",
            DATABASE_URL: TEST_DATABASE_URL,
            CORS_ORIGIN: BASE_URL,
            // Its own directory, so an E2E run's uploads land somewhere
            // it is safe to empty.
            UPLOAD_DIR: "./uploads-test",
          },
        },
        {
          // The built SPA, not the dev server: VITE_API_URL is inlined at build
          // time, so only a real build exercises what actually ships.
          command: "npm run build && npm run preview -- --port 4173 --strictPort",
          cwd: "../web",
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          // tsc plus a Vite build does not finish inside the 60s default.
          timeout: 120_000,
          env: { VITE_API_URL: API_URL },
        },
      ]
    : undefined,
});
