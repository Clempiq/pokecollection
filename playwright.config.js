import { defineConfig, devices } from '@playwright/test'

/**
 * Configuration Playwright pour les tests E2E de PokéCollection.
 * https://playwright.dev/docs/test-configuration
 *
 * Lance l'app en local (npm run dev) avant de jouer les tests.
 * Pour CI : les tests démarrent automatiquement le serveur de dev.
 */
export default defineConfig({
  // Dossier contenant les fichiers de tests E2E
  testDir: './tests/e2e',

  // Timeout global par test (30s — on attend parfois Supabase)
  timeout: 30_000,

  // Nombre de workers parallèles (1 en CI pour éviter les race conditions)
  workers: process.env.CI ? 1 : 2,

  // Nombre de tentatives en cas d'échec (1 retry en CI)
  retries: process.env.CI ? 1 : 0,

  // Reporter : html pour un rapport visuel, list pour la console
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    // URL de base de l'app en local
    baseURL: 'http://localhost:5173',

    // Garder une trace (screenshot + video) seulement en cas d'échec
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',

    // Accepter les certificats auto-signés (utile si HTTPS local)
    ignoreHTTPSErrors: true,

    // Locale FR pour correspondre à la langue de l'app
    locale: 'fr-FR',
  },

  // Navigateurs sur lesquels tourner les tests
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Mobile Chrome (iPhone 12)
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Démarre automatiquement le serveur de dev si pas déjà lancé
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
