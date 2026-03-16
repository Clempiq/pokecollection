import { useState } from 'react'

/**
 * Règles de validation du mot de passe
 */
export const PASSWORD_RULES = [
  { id: 'length',   label: '8 caractères minimum',       test: v => v.length >= 8 },
  { id: 'upper',    label: 'Une majuscule (A-Z)',         test: v => /[A-Z]/.test(v) },
  { id: 'lower',    label: 'Une minuscule (a-z)',         test: v => /[a-z]/.test(v) },
  { id: 'special',  label: 'Un caractère spécial (!@#…)', test: v => /[^A-Za-z0-9]/.test(v) },
]

export function validatePassword(value) {
  return PASSWORD_RULES.every(r => r.test(value))
}

/**
 * Champ mot de passe avec toggle show/hide et indicateur de force
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  name = 'password',
  showStrength = false,
  required = true,
}) {
  const [visible, setVisible] = useState(false)

  const passed = PASSWORD_RULES.filter(r => r.test(value)).length
  const strength = value.length === 0 ? 0 : passed

  const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
  const strengthLabels = ['', 'Faible', 'Moyen', 'Bon', 'Fort']

  return (
    <div className="space-y-2">
      {/* Input */}
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          className="input-field pr-10"
          placeholder={placeholder}
          required={required}
          autoComplete={name === 'password' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? (
            // Eye-off icon
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            // Eye icon
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Indicateur de force (uniquement si showStrength et valeur non vide) */}
      {showStrength && value.length > 0 && (
        <div className="space-y-1.5">
          {/* Barre de force */}
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= strength ? strengthColors[strength] : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className={`text-xs font-medium ${strength === 4 ? 'text-green-600' : strength >= 2 ? 'text-yellow-600' : 'text-red-500'}`}>
            {strengthLabels[strength]}
          </p>
          {/* Règles */}
          <ul className="space-y-0.5">
            {PASSWORD_RULES.map(rule => (
              <li key={rule.id} className={`text-xs flex items-center gap-1.5 ${rule.test(value) ? 'text-green-600' : 'text-gray-400'}`}>
                <span>{rule.test(value) ? '✓' : '○'}</span>
                {rule.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
