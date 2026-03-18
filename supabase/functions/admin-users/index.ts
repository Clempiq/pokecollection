import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const { action, userId, updates } = await req.json()

  try {
    if (action === 'list') {
      const { data: users, error } = await supabase
        .from('profiles')
        .select(`
          *,
          items:items(id)
        `)

      if (error) throw error

      return new Response(JSON.stringify(users.map(u => ({
        ...u,
        itemCount: u.items?.length || 0,
      }))), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      // Delete user
      const { error } = await supabase.auth.admin.deleteUser(userId)
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
