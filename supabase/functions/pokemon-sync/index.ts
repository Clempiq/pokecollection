import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RAPIDAPI_HOST = 'pokemon-tcg.p.rapidapi.com'
const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')!

serve(async (req) => {
  try {
    // Fetch all sets in batches
    let page = 0
    let totalSynced = 0

    while (true) {
      const url = `https://${RAPIDAPI_HOST}/products?page=${page}&limit=100`
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Host': RAPIDAPI_HOST,
          'X-RapidAPI-Key': RAPIDAPI_KEY,
        },
      })

      const { data, pagination } = await response.json()
      if (!data || data.length === 0) break

      // Insert into pokemon_products
      const { error } = await supabase.from('pokemon_products').upsert(
        data.map((p: any) => ({
          id: p.id,
          name: p.name,
          set_name: p.series,
          image_url: p.image,
          price: p.price,
        }))
      )

      if (error) throw error
      totalSynced += data.length
      page++
    }

    // Update sync state
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('sync_state').upsert(
      { date: today, synced_count: totalSynced, last_sync: new Date() },
      { onConflict: 'date' }
    )

    return new Response(JSON.stringify({ success: true, synced: totalSynced }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
