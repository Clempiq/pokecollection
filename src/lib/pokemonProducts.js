import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function usePokemonProducts() {
  const [products, setProducts] = useState([])
  const [setNames, setSetNames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('pokemon_products').select('*')
      setProducts(data || [])
      const names = [...new Set((data || []).map(p => p.set_name))].sort()
      setSetNames(names)
      setLoading(false)
    }
    fetch()
  }, [])

  return { products, setNames, loading }
}
