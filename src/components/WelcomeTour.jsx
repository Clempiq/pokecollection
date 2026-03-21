import { useState, useEffect } from 'react'

const TOUR_KEY = 'pokecol_tour_v1_seen'

const STEPS = [
  {
    emoji: '🎉',
    title: 'Bienvenue sur PokéCollection !',
    desc: 'L\'app pour suivre, valoriser et partager ta collection de Pokémon sealed. On va te faire faire un tour rapide !',
    color: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    hint: null,
  },
  {
    emoji: '📦',
    title: 'Ta collection au centre',
    desc: 'Ajoute tes displays, ETB, tins et blisters. L\'app suit automatiquement leur valeur Cardmarket et calcule ton P&L en temps réel.',
    color: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
    hint: '💡 Clique sur une carte pour voir tous les détails et gérer l\'item',
  },
  {
    emoji: '📊',
    title: 'Dashboard & évolution',
    desc: 'L\'onglet Dashboard suit l\'évolution de la valeur de ta collection jour après jour. Le graphe se remplit automatiquement !',
    color: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    hint: '💡 Tes stats sont mises à jour à chaque connexion',
  },
  {
    emoji: '✨',
    title: 'Wishlist intelligente',
    desc: 'Ajoute les produits que tu veux acheter. L\'app compare ton prix cible avec le prix Cardmarket pour te dire si c\'est le bon moment.',
    color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    hint: '💡 Marque un item "Acheté" pour le basculer directement dans ta collection',
  },
  {
    emoji: '🏆',
    title: 'Badges & amis',
    desc: 'Débloque des trophées au fil de ta collection, partage ta wishlist et connecte-toi avec d\'autres collectionneurs !',
    color: 'linear-gradient(135deg, #ef4444 0%, #be185d 100%)',
    hint: null,
  },
]

export default function WelcomeTour({ onDone }) {
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const advance = () => {
    if (isLast) {
      finish()
    } else {
      setStep(s => s + 1)
    }
  }

  const finish = () => {
    setLeaving(true)
    localStorage.setItem(TOUR_KEY, '1')
    setTimeout(() => onDone(), 300)
  }

  // Swipe to navigate (touch)
  let touchStartX = 0
  const onTouchStart = e => { touchStartX = e.touches[0].clientX }
  const onTouchEnd = e => {
    const dx = e.changedTouches[0].clientX - touchStartX
    if (dx < -50 && !isLast) setStep(s => s + 1)
    if (dx > 50 && step > 0) setStep(s => s - 1)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        transition: 'opacity 0.3s',
        opacity: leaving ? 0 : 1,
      }}
      onClick={e => { if (e.target === e.currentTarget) finish() }}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          transform: leaving ? 'translateY(40px)' : 'translateY(0)',
          transition: 'transform 0.3s',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Hero gradient */}
        <div
          className="relative flex flex-col items-center justify-center py-10 px-6"
          style={{ background: current.color, minHeight: '11rem' }}
        >
          {/* Dot pattern */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          <span className="text-6xl drop-shadow-lg relative z-10">{current.emoji}</span>
          {/* Skip button */}
          <button onClick={finish}
            className="absolute top-3 right-3 text-xs px-3 py-1.5 rounded-full font-medium"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.75)' }}>
            Passer
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-2">
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {current.desc}
          </p>
          {current.hint && (
            <p className="text-xs mt-3 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              {current.hint}
            </p>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-4">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className="rounded-full transition-all"
              style={{
                width: i === step ? '1.5rem' : '0.4rem',
                height: '0.4rem',
                backgroundColor: i === step ? 'var(--accent)' : 'var(--border-strong)',
              }} />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 px-6 pb-8">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold btn-secondary">
              ← Précédent
            </button>
          )}
          <button
            onClick={advance}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: current.color, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}
          >
            {isLast ? '🚀 C\'est parti !' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Hook: returns true if the tour should be shown */
export function useShouldShowTour() {
  return !localStorage.getItem(TOUR_KEY)
}
