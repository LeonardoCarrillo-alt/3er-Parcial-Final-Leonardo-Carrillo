import { defineConfig, devices } from "@playwright/test";

// CI (Playwright reportes y proveedores de estado) — headless con JUnit+list para GitHub Actions.
// Local — `--project=chromium-visual` abre Chrome con interfaz gráfica.
//
// Puertos: el cliente Vite se sirve en el puerto fijo 5174 (Task 13.1 pide
// baseURL 5173, pero la máquina local suele tener 5173 ocupado por otros
// proyectos). Se puede sobrescribir con BASE_URL si se usa el servidor de
// producción de CI (p. ej. BASE_URL=http://localhost:3001).
//
// PW_SKIP_SERVERS = 1 desactiva el arranque automático de servidores
// (webServer). Lo usa el workflow de CI de E2E (Task 15.2), que levanta el
// servidor de producción (`node server/dist/index.js`) antes de los tests.
const isCI = !!process.env.CI;
const skipServers = !!process.env.PW_SKIP_SERVERS;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: undefined,
  timeout: 60_000,

  reporter: [
    ["list"],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5174",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: true,
      },
    },
    {
      name: "chromium-visual",
      use: {
        ...devices["Desktop Chrome"],
        headless: false,
      },
    },
  ],

  webServer: skipServers
    ? []
    : [
        {
          command: "./duelo-de-cristales/server/node_modules/.bin/tsx watch duelo-de-cristales/server/src/index.ts",
          url: "http://localhost:3001/api/health",
          reuseExistingServer: !isCI,
          timeout: 120_000,
        },
        {
          command: "./node_modules/.bin/vite --port 5174 --strictPort",
          cwd: "duelo-de-cristales/client",
          url: "http://localhost:5174",
          reuseExistingServer: !isCI,
          timeout: 120_000,
        },
      ],
});