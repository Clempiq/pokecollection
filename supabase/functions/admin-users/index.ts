import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, userId, username, password } = await req.json()

    // ── LIST: Get all auth users + join with profiles ──────────────────────
    if (action === 'list') {
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
      if (usersError) throw usersError

      // Get all profiles to enrich with profile data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email, is_admin, created_at, last_sign_in_at')

      const profileMap = {}
      profiles?.forEach(p => {
        profileMap[p.id] = p
      })

      // Enrich auth users with profile data
      const enrichedUsers = users.map(authUser => {
        const profile = profileMap[authUser.id] || {}
        return {
          id: authUser.id,
          email: authUser.email,
          username: profile.username || '',
          is_admin: profile.is_admin || false,
          created_at: profile.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          item_count: 0, // Will be filled separately
        }
      })

      // Get item counts
      const { data: items } = await supabase.from('items').select('user_id')
      const itemCounts: Record<string, number> = {}
      items?.forEach(item => {
        itemCounts[item.user_id] = (itemCounts[item.user_id] || 0) + 1
      })

      enrichedUsers.forEach(u => {
        u.item_count = itemCounts[u.id] || 0
      })

      return new Response(JSON.stringify({ success: true, users: enrichedUsers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── DELETE: Remove a user ──────────────────────────────────────────────
    if (action === 'delete' && userId) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true, message: 'User deleted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── UPDATE: Reset password and/or update username ──────────────────────
    if (action === 'update' && userId) {
      const updates: any = {}

      if (password) {
        updates.password = password
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, updates)
        if (updateError) throw updateError
      }

      if (username) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ username })
          .eq('id', userId)
        if (profileError) throw profileError
      }

      return new Response(JSON.stringify({ success: true, message: 'User updated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
