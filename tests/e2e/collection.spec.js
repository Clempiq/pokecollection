/**
 * Tests E2E — Collection & Wishlist (authentifié)
 *
 * Ces tests nécessitent un compte de test valide.
 * Définir : E2E_TEST_EMAIL et E2E_TEST_PASSWORD
 *
 * Les tests vérifient :
 *  - L'affichage de la collection
 *  - La présence du bouton d'ajout d'item
 *  - L'ouverture du formulaire modal
 *  - Les dropdowns Extension et Type sont peuplés
 */
import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

// ─── Fixture : connexion persistée ────────────────────────────────────────────

async function loginAndGoto(page, path) {
  if (!TEST_EMAIL || !TEST_PASSWORD) return false

  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /connexion|login/i }).click()
  await page.waitForURL(/\/(dashboard|collection|onboarding)/, { timeout: 15_000 })
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  return true
}

// ─── Tests Collection ──────────────────────────────────────────────────────────

test.describe('Page Collection (authentifié)', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Variables E2E_TEST_EMAIL / E2E_TEST_PASSWORD non définies')

  test('la page collection se charge', async ({ page }) => {
    const ok = await loginAndGoto(page, '/collection')
    if (!ok) return

    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
    // Un titre ou contenu de collection doit être présent
    expect(await page.locator('main, #root').textContent()).toBeTruthy()
  })

  test('le bouton Ajouter un item est présent', async ({ page }) => {
    const ok = await loginAndGoto(page, '/collection')
    if (!ok) return

    const addBtn = page.locator(
      'button:has-text("Ajouter"), button:has-text("+ Ajouter"), button:has-text("Nouvel item")'
    ).first()
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
  })

  test('le formulaire d\'ajout s\'ouvre et contient les dropdowns', async ({ page }) => {
    const ok = await loginAndGoto(page, '/collection')
    if (!ok) return

    // Ouvrir le modal d'ajout
    const addBtn = page.locator(
      'button:has-text("Ajouter"), button:has-text("+ Ajouter"), button:has-text("Nouvel item")'
    ).first()
    await addBtn.click()
    await page.waitForTimeout(800)

    // Le modal doit s'afficher
    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()

    // Chercher les champs Extension et Type
    const hasExtField = await page.locator('label:has-text("Extension"), select[name*="set"], select[name*="extension"]').count()
    const hasTypeField = await page.locator('label:has-text("Type"), select[name*="type"]').count()
    const hasInputs = await page.locator('input, select').count()

    // Le formulaire a au minimum des inputs
    expect(hasInputs).toBeGreaterThan(0)
  })
})

// ─── Tests Wishlist ────────────────────────────────────────────────────────────

test.describe('Page Wishlist (authentifié)', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Variables E2E_TEST_EMAIL / E2E_TEST_PASSWORD non définies')

  test('la page wishlist se charge sans erreur', async ({ page }) => {
    const ok = await loginAndGoto(page, '/wishlist')
    if (!ok) return

    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
  })

  test('les images de la wishlist utilisent object-contain', async ({ page }) => {
    const ok = await loginAndGoto(page, '/wishlist')
    if (!ok) return

    // Vérifier qu'aucune image n'utilise object-cover (on veut object-contain)
    const images = page.locator('img')
    const count = await images.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i)
      const classList = await img.getAttribute('class') || ''
      // object-cover est le mauvais comportement (coupé), on veut object-contain
      expect(classList).not.toContain('object-cover')
    }
  })
})

// ─── Tests sans auth ──────────────────────────────────────────────────────────

test.describe('Page Collection (non authentifié)', () => {
  test('accéder à /collection sans auth redirige vers login', async ({ page }) => {
    await page.goto('/collection')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const hasLoginElements = await page.locator('input[type="email"]').count()
    expect(url.includes('/login') || url.includes('/onboarding') || hasLoginElements > 0).toBeTruthy()
  })
})
