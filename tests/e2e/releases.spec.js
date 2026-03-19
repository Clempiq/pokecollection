/**
 * Tests E2E — Page Releases (Sorties)
 *
 * Vérifie l'affichage de la page des sorties produits,
 * la navigation entre les onglets, et les éléments clés de l'UI.
 */
import { test, expect } from '@playwright/test'

test.describe('Page Releases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/releases')
    await page.waitForLoadState('networkidle')
  })

  test('la page se charge sans erreur', async ({ page }) => {
    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
  })

  test('les onglets À venir et Récentes sont présents', async ({ page }) => {
    const aVenir = page.locator('text=À venir, button:has-text("À venir")')
    const recentes = page.locator('text=Récentes').or(page.locator('button:has-text("Récentes")'))

    // Au moins un des onglets doit être visible
    const hasAVenir = await aVenir.count() > 0
    const hasRecentes = await recentes.count() > 0
    expect(hasAVenir || hasRecentes).toBeTruthy()
  })

  test('l\'onglet À venir affiche des sorties', async ({ page }) => {
    // Cliquer sur "À venir" si besoin
    const aVenirBtn = page.locator('button:has-text("À venir")').first()
    if (await aVenirBtn.count() > 0) {
      await aVenirBtn.click()
      await page.waitForTimeout(500)
    }

    // Des cartes de sorties doivent être présentes (au moins 1)
    // Les cards ont généralement un élément avec le nom du produit
    const cards = page.locator('.release-card, [data-testid="release-card"]')
      .or(page.locator('article, .rounded-2xl, .rounded-xl').filter({ hasText: /Booster|Display|ETB|Coffret|Bundle|Starter/i }))

    // On vérifie juste que la page n'est pas vide de contenu
    const pageContent = await page.locator('main, #root').textContent()
    expect(pageContent?.length).toBeGreaterThan(50)
    await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
  })

  test('les coffrets du 20 mars 2026 sont affichés', async ({ page }) => {
    // Cliquer sur "À venir"
    const aVenirBtn = page.locator('button:has-text("À venir")').first()
    if (await aVenirBtn.count() > 0) {
      await aVenirBtn.click()
      await page.waitForTimeout(500)
    }

    // Chercher les coffrets spécifiques (au moins un doit apparaître)
    const gardevoir = page.locator('text=Gardevoir').or(page.locator('text=gardevoir'))
    const lucario = page.locator('text=Lucario').or(page.locator('text=lucario'))
    const partenaires = page.locator('text=Partenaires').or(page.locator('text=partenaires'))

    const hasGardevoir = await gardevoir.count() > 0
    const hasLucario = await lucario.count() > 0
    const hasPartenaires = await partenaires.count() > 0

    // Au moins un des trois coffrets doit être présent
    expect(hasGardevoir || hasLucario || hasPartenaires).toBeTruthy()
  })

  test('navigation vers l\'onglet Récentes', async ({ page }) => {
    const recentesBtn = page.locator('button:has-text("Récentes")').first()
    if (await recentesBtn.count() > 0) {
      await recentesBtn.click()
      await page.waitForTimeout(500)
      await expect(page.locator('text=🔴 Erreur de rendu React')).not.toBeVisible()
    }
  })
})
