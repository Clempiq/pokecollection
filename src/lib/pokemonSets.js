import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function usePokemonSets() {
  const [sets, setSets] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('pokemon_sets').select('*').order('series, name')
      const grouped = {}
      (data || []).forEach(s => {
        if (!grouped[s.series]) grouped[s.series] = []
        grouped[s.series].push(s)
      })
      setSets(grouped)
      setLoading(false)
    }
    fetch()
  }, [])

  return { sets, loading }
}
