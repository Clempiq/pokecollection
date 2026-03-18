<<<<<<< HEAD
/**
 * Types d'items et conditions — lus depuis Supabase
 * Cache module-level pour éviter les requêtes multiples.
 * Appeler clearItemOptionsCache() après une modification admin.
 */

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

let _cache = null
let _promise = null

async function loadFromSupabase() {
  const [{ data: types }, { data: conditions }] = await Promise.all([
    supabase.from('item_types').select('*').order('sort_order'),
    supabase.from('item_conditions').select('*').order('sort_order'),
  ])
  _cache = { types: types || [], conditions: conditions || [] }
  return _cache
}

export function clearItemOptionsCache() {
  _cache = null
  _promise = null
}

export function useItemOptions() {
  const [data, setData] = useState(_cache)
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) {
      setData(_cache)
      setLoading(false)
      return
    }
    if (!_promise) {
      _promise = loadFromSupabase()
    }
    _promise.then(result => {
      setData(result)
      setLoading(false)
    })
  }, [])

  return {
    types: data?.types || [],
    conditions: data?.conditions || [],
    // Lookups pratiques pour l'affichage
    typeIcon: (label) => data?.types.find(t => t.label === label)?.icon || '✨',
    conditionColor: (label) => data?.conditions.find(c => c.label === label)?.color_class || 'bg-gray-100 text-gray-600',
    loading,
  }
}
=======
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

let itemTypesCache = null
let conditionsCache = null
let cacheFetched = false

export function useItemOptions() {
  const [itemTypes, setItemTypes] = useState([])
  const [conditions, setConditions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cacheFetched) {
      setItemTypes(itemTypesCache || [])
      setConditions(conditionsCache || [])
      setLoading(false)
      return
    }

    const fetch = async () => {
      const [{ data: types }, { data: conds }] = await Promise.all([
        supabase.from('item_types').select('*'),
        supabase.from('conditions').select('*'),
      ])
      itemTypesCache = types || []
      conditionsCache = conds || []
      cacheFetched = true
      setItemTypes(itemTypesCache)
      setConditions(conditionsCache)
      setLoading(false)
    }
    fetch()
  }, [])

  return { itemTypes, conditions, loading }
}
>>>>>>> 75bda405994aff8b32f967b0793cc12339417565
