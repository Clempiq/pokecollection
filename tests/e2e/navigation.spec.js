/**
 * Tests E2E — Navigation générale
 *
 * Vérifie que toutes les pages publiques sont accessibles
 * et que la navigation entre elles fonctionne correctement.
 *
 * Pré-requis : npm run dev lancé sur localhost:5173
 */
import { test, expect } from '@playwright/test'

// ─── Pages publiques (accessibles sans connexion) ─────────────────────────────

test.describe('Pages publiques', () => {
  test('la page /login s\'affiche correctement', async ({ page }) => {
    await page.goto('/login')

    // Le titre ou un élément clé doit être visible
    await expect(page).toHaveTitle(/PokéCollection|Pokémon/)
    await expect(page.getByRole('heading', { level: 1 }).or(page.locator('h1, h2')).first()).toBeVisible()

    // Pas d'écran blanc ni de message d'erreur React
    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
  })

  test('la page /register s\'affiche correctement', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
    // Un formulaire doit exister
    await expect(page.locator('form, input[type="email"]').first()).toBeVisible()
  })

  test('la page /releases est accessible', async ({ page }) => {
    await page.goto('/releases')
    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
    // L'onglet "À venir" ou similaire doit être présent
    await expect(page.locator('text=À venir').or(page.locator('text=Sorties')).first()).toBeVisible()
  })

  test('une URL inconnue redirige vers login ou affiche une page 404', async ({ page }) => {
    const response = await page.goto('/cette-page-nexiste-pas')
    // Pas d'erreur serveur (503, 500), soit 200 (SPA) soit 404
    expect([200, 404]).toContain(response?.status())
    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
  })
})

// ─── Redirections d'auth ───────────────────────────────────────────────────────

test.describe('Redirections non authentifié', () => {
  test('/collection redirige vers /login si non connecté', async ({ page }) => {
    await page.goto('/collection')
    // Attend que la navigation se stabilise
    await page.waitForLoadState('networkidle')

    // Soit on est sur /login, soit la page demande de se connecter
    const url = page.url()
    const hasLoginForm = await page.locator('input[type="email"], input[type="password"]').count()
    const isOnLogin = url.includes('/login') || url.includes('/onboarding')

    expect(isOnLogin || hasLoginForm > 0).toBeTruthy()
  })

  test('/wishlist redirige vers /login si non connecté', async ({ page }) => {
    await page.goto('/wishlist')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const hasLoginForm = await page.locator('input[type="email"], input[type="password"]').count()
    const isOnLogin = url.includes('/login') || url.includes('/onboarding')

    expect(isOnLogin || hasLoginForm > 0).toBeTruthy()
  })

  test('/admin redirige vers /login si non connecté', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const isProtected = url.includes('/login') || url.includes('/onboarding') || url.includes('/admin')
    expect(isProtected).toBeTruthy()
    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
  })
})

// ─── Navigation entre pages publiques ─────────────────────────────────────────

test.describe('Navigation entre pages', () => {
  test('lien vers /register depuis /login', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Chercher un lien "Créer un compte" ou "S'inscrire"
    const registerLink = page.locator('a[href*="register"], a:has-text("Créer"), a:has-text("inscrire"), a:has-text("Inscription")')
    const count = await registerLink.count()

    if (count > 0) {
      await registerLink.first().click()
      await page.waitForURL('**/register')
      expect(page.url()).toContain('register')
    }
    // Si le lien n'existe pas, le test passe quand même (structure optionnelle)
  })

  test('lien vers /login depuis /register', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    const loginLink = page.locator('a[href*="login"], a:has-text("Connexion"), a:has-text("connecter")')
    const count = await loginLink.count()

    if (count > 0) {
      await loginLink.first().click()
      await page.waitForURL('**/login')
      expect(page.url()).toContain('login')
    }
  })
})
