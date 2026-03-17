import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')!
const RAPIDAPI_HOST = 'pokemon-tcg-api.p.rapidapi.com'
const DAILY_LIMIT = 90 // keep 10 buffer below 100

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const search = url.searchParams.get('search')
    const productId = url.searchParams.get('id')

    if (!search && !productId) {
      return new Response(JSON.stringify({ error: 'Missing search or id param' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Supabase client with service role (for rate counter)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── Rate limiting ──────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]
    const { data: rateData } = await supabase
      .from('api_daily_counts')
      .select('count')
      .eq('date', today)
      .maybeSingle()

    const currentCount = rateData?.count || 0

    if (currentCount >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: 'daily_limit_reached', remaining: 0, count: currentCount }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Call RapidAPI ──────────────────────────────────────────────────────
    const apiUrl = productId
      ? `https://${RAPIDAPI_HOST}/products/${encodeURIComponent(productId)}`
      : `https://${RAPIDAPI_HOST}/products?search=${encodeURIComponent(search!)}&per_page=6`

    const apiRes = await fetch(apiUrl, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'Content-Type': 'application/json',
      },
    })

    if (!apiRes.ok) {
      const errorText = await apiRes.text()
      return new Response(
        JSON.stringify({ error: 'api_error', status: apiRes.status, detail: errorText }),
        { status: apiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await apiRes.json()

    // ── Increment daily counter ────────────────────────────────────────────
    await supabase
      .from('api_daily_counts')
      .upsert({ date: today, count: currentCount + 1, updated_at: new Date().toISOString() }, { onConflict: 'date' })

    return new Response(
      JSON.stringify({ ...data, _meta: { remaining: DAILY_LIMIT - currentCount - 1 } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
