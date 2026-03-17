/**
 * Tests unitaires — lib/pokemonApi.js
 *
 * Les fonctions extractPrice et extractImage travaillent avec le format
 * brut de l'API RapidAPI (pokemon-tcg-api.p.rapidapi.com), pas avec la
 * structure normalisée de la table Supabase.
 *
 * Format API :
 *   product.prices.cardmarket.lowest_FR  — prix Cardmarket France
 *   product.prices.cardmarket.lowest     — prix Cardmarket global
 *   product.imageCdnUrl400               — image 400px
 *   product.imageCdnUrl200               — image 200px
 *   product.imageUrl                     — fallback
 */
import { describe, it, expect } from 'vitest'
import { extractPrice, extractImage, deriveItemType } from '../lib/pokemonApi'

// ─── extractPrice ────────────────────────────────────────────────────────────

describe('extractPrice', () => {
  it('retourne lowest_FR si disponible', () => {
    const product = { prices: { cardmarket: { lowest_FR: 89.99 } } }
    expect(extractPrice(product)).toBe(89.99)
  })

  it('retourne lowest si lowest_FR absent', () => {
    const product = { prices: { cardmarket: { lowest: 75.0 } } }
    expect(extractPrice(product)).toBe(75.0)
  })

  it('retourne null si aucun prix', () => {
    expect(extractPrice({})).toBeNull()
    expect(extractPrice(null)).toBeNull()
    expect(extractPrice(undefined)).toBeNull()
  })

  it('retourne null si prices.cardmarket absent', () => {
    expect(extractPrice({ prices: {} })).toBeNull()
    expect(extractPrice({ prices: { tcgplayer: { lowest: 50 } } })).toBeNull()
  })

  it('préfère lowest_FR sur lowest', () => {
    const product = { prices: { cardmarket: { lowest_FR: 100, lowest: 80 } } }
    expect(extractPrice(product)).toBe(100)
  })

  it('utilise lowest si lowest_FR est null/undefined', () => {
    const product = { prices: { cardmarket: { lowest_FR: null, lowest: 60 } } }
    // ?? retourne lowest car lowest_FR est null
    expect(extractPrice(product)).toBe(60)
  })
})

// ─── extractImage ────────────────────────────────────────────────────────────

describe('extractImage', () => {
  it('retourne imageCdnUrl400 en priorité', () => {
    const product = {
      imageCdnUrl400: 'https://cdn.example.com/img400.jpg',
      imageCdnUrl200: 'https://cdn.example.com/img200.jpg',
    }
    expect(extractImage(product)).toBe('https://cdn.example.com/img400.jpg')
  })

  it('retourne imageCdnUrl200 si 400 absent', () => {
    const product = { imageCdnUrl200: 'https://cdn.example.com/img200.jpg' }
    expect(extractImage(product)).toBe('https://cdn.example.com/img200.jpg')
  })

  it('retourne imageCdnUrl si 400 et 200 absents', () => {
    const product = { imageCdnUrl: 'https://cdn.example.com/img.jpg' }
    expect(extractImage(product)).toBe('https://cdn.example.com/img.jpg')
  })

  it('retourne imageUrl en fallback', () => {
    const product = { imageUrl: 'https://example.com/img.jpg' }
    expect(extractImage(product)).toBe('https://example.com/img.jpg')
  })

  it('retourne image en dernier recours', () => {
    const product = { image: 'https://example.com/img-last.jpg' }
    expect(extractImage(product)).toBe('https://example.com/img-last.jpg')
  })

  it('retourne null si pas d\'image', () => {
    expect(extractImage({})).toBeNull()
    expect(extractImage(null)).toBeNull()
    expect(extractImage(undefined)).toBeNull()
  })
})

// ─── deriveItemType ───────────────────────────────────────────────────────────

describe('deriveItemType', () => {
  const cases = [
    // Les valeurs retournées correspondent aux labels dans DEFAULT_ITEM_TYPES
    ['Booster Box Écarlate et Violet',   'Booster Box (Display)'],
    ['Display Sword & Shield',            'Booster Box (Display)'],
    ['Elite Trainer Box Paradox Rift',    'Elite Trainer Box (ETB)'],
    ['ETB Paldea Evolved',               'Elite Trainer Box (ETB)'],
    ['Coffret Premium Collection',        'Coffret Collection'],
    ['Collection Box Charizard',          'Coffret Collection'],
    ['Tin Paldean Fates',                'Tin'],
    ['Mini Tin Eevee',                   'Tin'],
    ['Boîte Métal Pikachu',             'Tin'],
    ['Blister Pack 3 Boosters',          'Blister / Pack'],
    ['Blister 3 boosters',               'Blister / Pack'],
    ['Starter Deck Fuecoco',             'Starter / Battle Deck'],
    ['Battle Deck Roy',                  'Starter / Battle Deck'],
    ['Bundle Pokémon Go',                'Bundle'],
    ['Booster Bundle',                   'Bundle'],
  ]

  cases.forEach(([input, expected]) => {
    it(`"${input}" → "${expected}"`, () => {
      expect(deriveItemType(input)).toBe(expected)
    })
  })

  it('retourne une valeur par défaut non-vide pour les produits inconnus', () => {
    const result = deriveItemType('Produit mystère XYZ 999')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('gère null, undefined et chaîne vide sans planter', () => {
    expect(() => deriveItemType(null)).not.toThrow()
    expect(() => deriveItemType(undefined)).not.toThrow()
    expect(() => deriveItemType('')).not.toThrow()
  })

  it('est insensible à la casse', () => {
    expect(deriveItemType('ELITE TRAINER BOX test')).toBe('Elite Trainer Box (ETB)')
    expect(deriveItemType('booster box')).toBe('Booster Box (Display)')
  })
})
