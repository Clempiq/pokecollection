import { useState } from 'react'
import OverviewPanel from './OverviewPanel'
import SyncManager from './SyncManager'
import SetsManager from './SetsManager'
import ItemTypesManager from './ItemTypesManager'
import ConditionsManager from './ConditionsManager'
import UsersManager from './UsersManager'
import PasswordManager from './PasswordManager'
import PokedexTracker from './PokedexTracker'

const TABS = [
  { id: 'overview',   label: '📊 Vue d\'ensemble' },
  { id: 'pokedex',    label: '🗂️ Mon Pokédex' },
  { id: 'sync',       label: '🔄 Sync BDD' },
  { id: 'sets',       label: '📋 Extensions' },
  { id: 'types',      label: '🃏 Types d\'items' },
  { id: 'conditions', label: '⭐ Conditions' },
  { id: 'users',      label: '👥 Utilisateurs' },
  { id: 'password',   label: '🔒 Mot de passe' },
]

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-pokemon-red rounded-xl flex items-center justify-center text-white text-lg">⚙️</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-gray-400 text-xs">Accès restreint — administrateur uniquement</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit min-w-full sm:min-w-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview'   && <OverviewPanel onNavigate={setActiveTab} />}
      {activeTab === 'pokedex'    && <PokedexTracker />}
      {activeTab === 'sync'       && <SyncManager />}
      {activeTab === 'sets'       && <SetsManager />}
      {activeTab === 'types'      && <ItemTypesManager />}
      {activeTab === 'conditions' && <ConditionsManager />}
      {activeTab === 'users'      && <UsersManager />}
      {activeTab === 'password'   && <PasswordManager />}
    </div>
  )
}
