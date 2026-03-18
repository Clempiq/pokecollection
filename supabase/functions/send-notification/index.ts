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
