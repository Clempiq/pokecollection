/**
 * Tests E2E — Authentification
 *
 * Vérifie le flux complet de connexion / déconnexion.
 * Les credentials de test doivent être définis dans les variables d'env :
 *   E2E_TEST_EMAIL    — email d'un compte de test
 *   E2E_TEST_PASSWORD — mot de passe de ce compte
 *
 * Si les variables ne sont pas définies, les tests sont sautés.
 *
 * Usage :
 *   E2E_TEST_EMAIL=test@example.com E2E_TEST_PASSWORD=monPassword npx playwright test auth
 */
import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /connexion|se connecter|login/i }).click()

  // Attendre la navigation post-login (dashboard, collection ou onboarding)
  await page.waitForURL(/\/(dashboard|collection|onboarding)/, { timeout: 15_000 })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Authentification', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Variables E2E_TEST_EMAIL et E2E_TEST_PASSWORD non définies')

  test('connexion avec des identifiants valides', async ({ page }) => {
    await login(page)

    // Après connexion, on est sur une page authentifiée
    const url = page.url()
    expect(url).toMatch(/\/(dashboard|collection|onboarding)/)

    // Pas d'erreur React
    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
  })

  test('échec de connexion avec mauvais mot de passe', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.locator('input[type="email"]').fill(TEST_EMAIL)
    await page.locator('input[type="password"]').fill('mauvais-mot-de-passe-xyz-123')
    await page.getByRole('button', { name: /connexion|se connecter|login/i }).click()

    // Un message d'erreur doit apparaître (pas de redirection)
    await page.waitForTimeout(3000)
    const url = page.url()
    expect(url).toContain('/login')

    // L'app ne doit pas crasher
    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
  })

  test('déconnexion depuis la navbar', async ({ page }) => {
    await login(page)

    // Chercher le bouton de déconnexion (menu profil ou lien direct)
    const logoutBtn = page.locator(
      'button:has-text("Déconnexion"), button:has-text("Se déconnecter"), a:has-text("Déconnexion")'
    )

    // Sur mobile, le menu peut être caché derrière un hamburger
    const hamburger = page.locator('button[aria-label*="menu"], button:has-text("☰")')
    if (await hamburger.count() > 0) {
      await hamburger.first().click()
      await page.waitForTimeout(500)
    }

    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click()
      await page.waitForURL(/\/login/, { timeout: 10_000 })
      expect(page.url()).toContain('/login')
    }
  })
})

// ─── Tests sans auth (toujours exécutés) ─────────────────────────────────────

test.describe('Formulaire de connexion', () => {
  test('le formulaire de connexion a les bons champs', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /connexion|login/i })).toBeVisible()
  })

  test('email invalide affiche une erreur de validation HTML5', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.locator('input[type="email"]').fill('pas-un-email')
    await page.locator('input[type="password"]').fill('quelquechose')
    await page.getByRole('button', { name: /connexion|login/i }).click()

    // Le navigateur bloque la soumission (validation HTML5) — on reste sur /login
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/login')
  })
})
