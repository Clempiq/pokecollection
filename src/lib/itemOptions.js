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
