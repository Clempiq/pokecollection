import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Affiche une erreur visible plutôt qu'un écran blanc
if (!supabaseUrl || !supabaseAnonKey) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#f9fafb;">
      <div style="text-align:center;padding:2rem;background:white;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:400px;">
        <div style="font-size:3rem;margin-bottom:1rem;">⚙️</div>
        <h2 style="color:#111;margin-bottom:.5rem;">Configuration manquante</h2>
        <p style="color:#6b7280;font-size:.9rem;">Les variables d'environnement Supabase ne sont pas définies.<br/>
        Ajoute <strong>VITE_SUPABASE_URL</strong> et <strong>VITE_SUPABASE_ANON_KEY</strong> dans les settings Vercel.</p>
      </div>
    </div>`
  throw new Error('Missing Supabase environment variables — see UI for instructions')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
