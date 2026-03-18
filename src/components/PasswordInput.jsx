import { useState } from 'react'

export function validatePassword(pwd) {
  if (!pwd) return false
  const hasLength = pwd.length >= 8
  const hasUpper = /[A-Z]/.test(pwd)
  const hasLower = /[a-z]/.test(pwd)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
  return hasLength && hasUpper && hasLower && hasSpecial
}

export default function PasswordInput({ value, onChange, showStrength = false, placeholder = 'Mot de passe', name = 'password' }) {
  const [show, setShow] = useState(false)

  const rules = [
    { label: '8+ caractères', ok: (value?.length || 0) >= 8 },
    { label: 'Majuscule', ok: /[A-Z]/.test(value) },
    { label: 'Minuscule', ok: /[a-z]/.test(value) },
    { label: 'Caractère spécial', ok: /[!@#$%^&*(),.?":{}|<>]/.test(value) },
  ]

  const passedRules = rules.filter(r => r.ok).length
  const strength = passedRules === 0 ? 'weak' : passedRules <= 2 ? 'medium' : 'strong'
  const strengthColor = strength === 'weak' ? 'text-red-500' : strength === 'medium' ? 'text-yellow-500' : 'text-green-500'
  const strengthLabel = strength === 'weak' ? 'Faible' : strength === 'medium' ? 'Moyen' : 'Fort'

  return (
    <div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          name={name}
          className="input-field pr-10"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
        >
          {show ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-2 space-y-1">
          <div className="flex gap-1">
            {rules.map((rule, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${rule.ok ? 'bg-green-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <div className="text-xs flex justify-between">
            <span className={strengthColor}>{strengthLabel}</span>
            <span className="text-gray-400">{passedRules}/4</span>
          </div>
          <div className="text-xs text-gray-500 space-y-0.5">
            {rules.map((rule, i) => (
              <div key={i} className={rule.ok ? 'text-green-600' : 'text-gray-400'}>
                {rule.ok ? '✓' : '○'} {rule.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
