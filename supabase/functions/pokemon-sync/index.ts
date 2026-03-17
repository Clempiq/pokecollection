import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RAPIDAPI_KEY  = Deno.env.get('RAPIDAPI_KEY')!
const RAPIDAPI_HOST = 'pokemon-tcg-api.p.rapidapi.com'
const DAILY_LIMIT   = 92          // leave 8 buffer below 100
const PER_PAGE      = 50          // max products per API call — change if API caps lower

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractImage(p: Record<string, unknown>): string | null {
  return (
    (p.imageCdnUrl400 as string) ||
    (p.imageCdnUrl200 as string) ||
    (p.imageCdnUrl    as string) ||
    (p.imageUrl       as string) ||
    (p.image          as string) ||
    null
  )
}

function extractMarketPrice(p: Record<string, unknown>): { lowest: number | null; lowest_fr: number | null } {
  const cm = (p as any)?.prices?.cardmarket
  return {
    lowest:    cm?.lowest    ?? null,
    lowest_fr: cm?.lowest_FR ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── 1. Check daily quota ────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]
    const { data: rateRow } = await supabase
      .from('api_daily_counts')
      .select('count')
      .eq('date', today)
      .maybeSingle()

    const usedToday  = rateRow?.count ?? 0
    const canCallAPI = DAILY_LIMIT - usedToday   // calls still available today

    if (canCallAPI <= 0) {
      return json({ ok: false, reason: 'daily_limit_reached', used_today: usedToday })
    }

    // ── 2. Load sync state ──────────────────────────────────────────────────
    const { data: state } = await supabase
      .from('sync_state')
      .select('*')
      .eq('id', 'pokemon_products')
      .maybeSingle()

    if (state?.completed) {
      return json({ ok: true, status: 'already_complete', total_synced: state.total_synced })
    }

    let currentPage  = state?.current_page  ?? 1
    let totalSynced  = state?.total_synced  ?? 0
    let callsMade    = 0
    let newProducts  = 0
    let reachedEnd   = false
    let lastError: string | null = null

    // ── 3. Fetch pages until quota is used up or catalog ends ───────────────
    while (callsMade < canCallAPI) {
      const apiUrl =
        `https://${RAPIDAPI_HOST}/products?per_page=${PER_PAGE}&page=${currentPage}`

      let apiRes: Response
      try {
        apiRes = await fetch(apiUrl, {
          headers: {
            'X-RapidAPI-Key':  RAPIDAPI_KEY,
            'X-RapidAPI-Host': RAPIDAPI_HOST,
          },
        })
      } catch (fetchErr) {
        lastError = `fetch error: ${fetchErr}`
        break
      }

      // Count this call regardless of result
      callsMade++

      if (!apiRes.ok) {
        lastError = `API ${apiRes.status}: ${await apiRes.text()}`
        break
      }

      const data        = await apiRes.json()
      const products: Record<string, unknown>[] = data.data ?? data.results ?? data.products ?? []

      // No more products → sync complete
      if (products.length === 0) {
        reachedEnd = true
        break
      }

      // ── Upsert batch into pokemon_products ─────────────────────────────
      const rows = products.map((p) => {
        const { lowest, lowest_fr } = extractMarketPrice(p)
        return {
          api_id:          String((p as any).id ?? (p as any).cardmarket_id ?? ''),
          cardmarket_id:   (p as any).cardmarket_id ?? null,
          name:            (p as any).name ?? '',
          set_name:        (p as any).episode?.name ?? (p as any).setName ?? null,
          image_url:       extractImage(p),
          market_price:    lowest,
          market_price_fr: lowest_fr,
          full_data:       p,
          synced_at:       new Date().toISOString(),
        }
      })

      const { error: upsertErr } = await supabase
        .from('pokemon_products')
        .upsert(rows, { onConflict: 'api_id' })

      if (upsertErr) {
        lastError = `upsert error: ${upsertErr.message}`
        break
      }

      newProducts += products.length
      totalSynced += products.length
      currentPage++

      // If the API returned fewer than PER_PAGE, we're at the last page
      if (products.length < PER_PAGE) {
        reachedEnd = true
        break
      }
    }

    // ── 4. Update daily counter ─────────────────────────────────────────────
    if (callsMade > 0) {
      await supabase
        .from('api_daily_counts')
        .upsert(
          { date: today, count: usedToday + callsMade, updated_at: new Date().toISOString() },
          { onConflict: 'date' },
        )
    }

    // ── 5. Persist sync state ───────────────────────────────────────────────
    await supabase
      .from('sync_state')
      .upsert({
        id:           'pokemon_products',
        current_page: currentPage,
        total_synced: totalSynced,
        completed:    reachedEnd,
        last_run:     new Date().toISOString(),
        last_error:   lastError,
      }, { onConflict: 'id' })

    return json({
      ok:            true,
      calls_made:    callsMade,
      new_products:  newProducts,
      total_synced:  totalSynced,
      current_page:  currentPage,
      completed:     reachedEnd,
      used_today:    usedToday + callsMade,
      remaining_today: DAILY_LIMIT - usedToday - callsMade,
      error:         lastError,
    })
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500)
  }
})
