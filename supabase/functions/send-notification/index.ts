<<<<<<< HEAD
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VAPID_PUBLIC_KEY = 'BHRkK-waI-0j8FosX6K6MxcmZAH7shu2vckvsq2ZwBHNyFpryoq5zyjUgUS5Ctqie1X8BXMzB11dhtiH8aDf0v4'
const VAPID_PRIVATE_KEY = 'kqXCX3oZF19U2sUJ8ngtahnHiTpe49PT7BRYU4mzRyY'
const RESEND_API_KEY = 're_iWacMwG8_7XVM45JcR5T4duM2Xp8hmGey'

// Minimal VAPID JWT generator using Web Crypto (Deno compatible)
async function createVapidJwt(audience: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: 'mailto:admin@pokecollection.app',
  }
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const data = `${encode(header)}.${encode(payload)}`

  // Import private key
  const rawPriv = Uint8Array.from(atob(VAPID_PRIVATE_KEY.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'raw', rawPriv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(data)
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${data}.${sigB64}`
}

async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string) {
  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await createVapidJwt(audience)

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    },
    body: payload,
  })
  return res.ok
}

async function sendEmail(to: string, fromUsername: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PokéCollection <onboarding@resend.dev>',
      to: [to],
      subject: `${fromUsername} veut être ton ami sur PokéCollection !`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0c0c14; color: #e8e8f4; border-radius: 16px;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">👋 Nouvelle demande d'ami</h1>
          <p style="color: #9090b8; margin-bottom: 24px;"><strong style="color: #a5b4fc;">${fromUsername}</strong> veut rejoindre ta liste d'amis sur PokéCollection.</p>
          <a href="https://pokecollection.app/friends" style="display: inline-block; background: #6366f1; color: white; font-weight: 600; padding: 12px 24px; border-radius: 10px; text-decoration: none;">Voir la demande →</a>
          <p style="color: #55556e; font-size: 12px; margin-top: 32px;">Tu reçois cet email car tu as un compte PokéCollection. Tu peux gérer tes préférences de notification dans ton profil.</p>
        </div>
      `,
    }),
  })
  return res.ok
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { addresseeId, fromUsername } = await req.json()
    if (!addresseeId) return new Response(JSON.stringify({ error: 'Missing addresseeId' }), { status: 400, headers: corsHeaders })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get addressee email + push subscriptions
    const [{ data: profile }, { data: subs }] = await Promise.all([
      supabase.from('profiles').select('email').eq('id', addresseeId).single(),
      supabase.from('push_subscriptions').select('*').eq('user_id', addresseeId),
    ])

    const results = { push: 0, email: false }

    // Send push to all devices
    if (subs && subs.length > 0) {
      const payload = JSON.stringify({
        title: '👋 Nouvelle demande d\'ami',
        body: `${fromUsername} veut être ton ami !`,
        url: '/friends',
      })
      for (const sub of subs) {
        const ok = await sendWebPush(sub, payload)
        if (ok) results.push++
      }
    }

    // Send email
    if (profile?.email) {
      results.email = await sendEmail(profile.email, fromUsername)
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
=======
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

serve(async (req) => {
  const { addresseeId, fromUsername } = await req.json()

  try {
    // Get push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', addresseeId)

    // Send web push notifications
    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        // Create VAPID JWT and send push
        const payload = JSON.stringify({
          title: 'Nouvelle demande d\'ami',
          body: `${fromUsername} veut être ton ami`,
        })

        // Push notification logic here (using web-push library)
      }
    }

    // Get user email for email notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', addresseeId)
      .single()

    // Send email via Resend
    if (profile?.email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Pokemon Collection <noreply@pokecollection.app>',
          to: profile.email,
          subject: `Nouvelle demande d'ami de ${fromUsername}`,
          html: `<p>${fromUsername} veut être ton ami</p>`,
        }),
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
>>>>>>> 75bda405994aff8b32f967b0793cc12339417565
