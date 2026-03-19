/**
 * Tests unitaires — lib/releasesUtils.js
 * Vérifie les fonctions utilitaires de la page Releases :
 *   formatDate, daysUntil, daysAgo, groupByDate
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatDate, daysUntil, daysAgo, groupByDate } from '../lib/releasesUtils'

// ─── Helpers : figer la date "aujourd'hui" ───────────────────────────────────

// On fixe "aujourd'hui" au 2026-03-17 pour rendre les tests déterministes
const FIXED_TODAY = new Date('2026-03-17T00:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formate une date ISO en français', () => {
    const result = formatDate('2026-03-20')
    // "vendredi 20 mars" — on vérifie les éléments clés sans dépendre du runtime
    expect(result).toContain('20')
    expect(result.toLowerCase()).toContain('mars')
  })

  it('retourne "—" pour une valeur falsy', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })

  it('inclut le jour de la semaine', () => {
    const result = formatDate('2026-03-20')
    // "vendredi" pour le 20 mars 2026
    expect(result.toLowerCase()).toContain('vendredi')
  })
})

// ─── daysUntil ────────────────────────────────────────────────────────────────

describe('daysUntil', () => {
  it('retourne 0 pour aujourd\'hui (2026-03-17)', () => {
    expect(daysUntil('2026-03-17')).toBe(0)
  })

  it('retourne 1 pour demain', () => {
    expect(daysUntil('2026-03-18')).toBe(1)
  })

  it('retourne 3 pour dans 3 jours', () => {
    expect(daysUntil('2026-03-20')).toBe(3)
  })

  it('retourne un nombre négatif pour une date passée', () => {
    expect(daysUntil('2026-03-10')).toBe(-7)
  })

  it('retourne null pour une valeur falsy', () => {
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil(undefined)).toBeNull()
    expect(daysUntil('')).toBeNull()
  })

  it('calcule correctement pour une date lointaine', () => {
    // 2026-05-22 = 66 jours après 2026-03-17
    // mars : 17→31 = 14 jours restants, avril = 30, mai 1→22 = 22 → total 66
    expect(daysUntil('2026-05-22')).toBe(66)
  })
})

// ─── daysAgo ─────────────────────────────────────────────────────────────────

describe('daysAgo', () => {
  it('retourne 0 pour aujourd\'hui', () => {
    expect(daysAgo('2026-03-17')).toBe(0)
  })

  it('retourne 1 pour hier', () => {
    expect(daysAgo('2026-03-16')).toBe(1)
  })

  it('retourne 7 pour il y a une semaine', () => {
    expect(daysAgo('2026-03-10')).toBe(7)
  })

  it('retourne un nombre négatif pour une date future', () => {
    expect(daysAgo('2026-03-20')).toBe(-3)
  })

  it('retourne null pour une valeur falsy', () => {
    expect(daysAgo(null)).toBeNull()
    expect(daysAgo(undefined)).toBeNull()
    expect(daysAgo('')).toBeNull()
  })

  it('daysAgo et daysUntil sont inverses pour une même date', () => {
    const date = '2026-03-20'
    expect(daysAgo(date)).toBe(-daysUntil(date))
  })
})

// ─── groupByDate ──────────────────────────────────────────────────────────────

describe('groupByDate', () => {
  const releases = [
    { id: 'a', name: 'Coffret Gardevoir', releaseDate: '2026-03-20' },
    { id: 'b', name: 'Coffret Lucario',   releaseDate: '2026-03-20' },
    { id: 'c', name: 'Extension Méga',    releaseDate: '2026-03-27' },
    { id: 'd', name: 'Bundle',            releaseDate: '2026-04-24' },
  ]

  it('regroupe les sorties par date', () => {
    const groups = groupByDate(releases)
    expect(groups).toHaveLength(3)
  })

  it('trie les dates dans l\'ordre chronologique', () => {
    const groups = groupByDate(releases)
    const dates = groups.map(([date]) => date)
    expect(dates).toEqual(['2026-03-20', '2026-03-27', '2026-04-24'])
  })

  it('regroupe correctement les items du même jour', () => {
    const groups = groupByDate(releases)
    const [date20, items20] = groups[0]
    expect(date20).toBe('2026-03-20')
    expect(items20).toHaveLength(2)
    expect(items20.map(r => r.id)).toContain('a')
    expect(items20.map(r => r.id)).toContain('b')
  })

  it('retourne un tableau vide pour une liste vide', () => {
    expect(groupByDate([])).toEqual([])
  })

  it('gère une seule sortie', () => {
    const single = [{ id: 'x', name: 'Solo', releaseDate: '2026-06-01' }]
    const groups = groupByDate(single)
    expect(groups).toHaveLength(1)
    expect(groups[0][0]).toBe('2026-06-01')
    expect(groups[0][1]).toHaveLength(1)
  })

  it('ne modifie pas le tableau original', () => {
    const original = [...releases]
    groupByDate(releases)
    expect(releases).toHaveLength(original.length)
  })
})
