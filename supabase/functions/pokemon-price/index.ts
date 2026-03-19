import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RAPIDAPI_HOST = 'pokemon-tcg.p.rapidapi.com'
const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')!

serve(async (req) => {
  const { query } = await req.json()

  // Check daily quota
  const today = new Date().toISOString().split('T')[0]
  const { data: count, error: countErr } = await supabase
    .from('api_daily_counts')
    .select('count')
    .eq('date', today)
    .single()

  if (count && count.count >= 90) {
    return new Response(JSON.stringify({ error: 'Daily quota exceeded', remaining: 0 }), { status: 429 })
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/products?q=${encodeURIComponent(query)}`
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'X-RapidAPI-Key': RAPIDAPI_KEY,
      },
    })

    const data = await response.json()

    // Update count
    const newCount = (count?.count || 0) + 1
    if (count) {
      await supabase.from('api_daily_counts').update({ count: newCount }).eq('date', today)
    } else {
      await supabase.from('api_daily_counts').insert({ date: today, count: 1 })
    }

    return new Response(JSON.stringify({ ...data, remaining: 90 - newCount }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
