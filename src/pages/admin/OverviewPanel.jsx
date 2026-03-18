import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function OverviewPanel({ onNavigate }) {
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [
      { count: typesCount },
      { count: conditionsCount },
      { count: setsCount },
      { count: productsCount },
      { count: usersCount },
      { count: itemsCount },
    ] = await Promise.all([
      supabase.from('item_types').select('*', { count: 'exact', head: true }),
      supabase.from('item_conditions').select('*', { count: 'exact', head: true }),
      supabase.from('pokemon_sets').select('*', { count: 'exact', head: true }),
      supabase.from('pokemon_products').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('items').select('*', { count: 'exact', head: true }),
    ])
    setCounts({ typesCount, conditionsCount, setsCount, productsCount, usersCount, itemsCount })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const checks = [
    {
      label: "Types d'items", count: counts.typesCount, needed: 5,
      tab: 'types', icon: '🃏',
      hint: "Définit les catégories disponibles dans les formulaires d'ajout",
    },
    {
      label: 'Conditions', count: counts.conditionsCount, needed: 3,
      tab: 'conditions', icon: '⭐',
      hint: 'État du produit (Neuf Scellé, Bon État, etc.)',
    },
    {
      label: 'Extensions / Sets', count: counts.setsCount, needed: 10,
      tab: 'sets', icon: '📋',
      hint: 'Liste des extensions Pokémon TCG sélectionnables',
    },
    {
      label: 'Produits en cache', count: counts.productsCount, needed: 100,
      tab: 'sync', icon: '🔄',
      hint: 'Catalogue produits RapidAPI mis en cache localement',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">📊 Vue d'ensemble</h2>
        <p className="text-sm text-gray-400 mt-0.5">État de la base de données et accès rapide aux outils de configuration.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Utilisateurs', value: counts.usersCount, icon: '👥', color: 'text-blue-600' },
          { label: 'Items en BDD', value: counts.itemsCount, icon: '📦', color: 'text-emerald-600' },
          { label: 'Extensions', value: counts.setsCount, icon: '📋', color: 'text-violet-600' },
          { label: 'Produits cachés', value: counts.productsCount, icon: '🔄', color: 'text-orange-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</p>
            <p className="text-lg mt-0.5">{s.icon}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">🩺 Santé de la configuration</h3>
        <div className="space-y-2">
          {checks.map(c => {
            const ok = c.count >= c.needed
            return (
              <div key={c.label} className={`rounded-xl border p-3.5 flex items-center gap-3 ${ok ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                <span className="text-xl shrink-0">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{c.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ok ? `✅ ${c.count} entrées` : `⚠️ ${c.count ?? 0} entrée${(c.count ?? 0) > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{c.hint}</p>
                </div>
                {!ok && (
                  <button
                    onClick={() => onNavigate(c.tab)}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    Configurer →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">⚡ Accès rapide</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { tab: 'sync', label: 'Sync BDD produits', icon: '🔄', desc: 'Importer le catalogue' },
            { tab: 'sets', label: 'Extensions', icon: '📋', desc: 'Gérer les sets' },
            { tab: 'types', label: "Types d'items", icon: '🃏', desc: 'Catégories produits' },
            { tab: 'conditions', label: 'Conditions', icon: '⭐', desc: 'État des produits' },
            { tab: 'users', label: 'Utilisateurs', icon: '👥', desc: 'Comptes & rôles' },
            { tab: 'password', label: 'Mot de passe', icon: '🔒', desc: 'Sécurité admin' },
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => onNavigate(item.tab)}
              className="bg-white border border-gray-100 rounded-xl p-3 text-left hover:shadow-md hover:border-gray-200 transition-all"
            >
              <span className="text-xl">{item.icon}</span>
              <p className="text-sm font-semibold text-gray-800 mt-1">{item.label}</p>
              <p className="text-[11px] text-gray-400">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
