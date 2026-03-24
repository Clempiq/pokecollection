import { useEffect, useState } from 'react'
import { createContext, useContext, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timerRefs = useRef({})

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    clearTimeout(timerRefs.current[id])
  }, [])

  const addToast = useCallback(({ message, type = 'success', duration = 4000 }) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    timerRefs.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ addToast, dismiss }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const styles = {
    success: 'bg-white border border-green-200 text-gray-800',
    error:   'bg-white border border-red-200 text-gray-800',
    info:    'bg-white border border-blue-200 text-gray-800',
    friend:  'bg-white border border-pokemon-yellow/40 text-gray-800',
  }
  const icons = {
    success: '✅',
    error:   '❌',
    info:    'ℹ️',
    friend:  '👋',
  }

  return (
    <div
      onClick={onDismiss}
      className={`
        pointer-events-auto cursor-pointer
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm
        transition-all duration-300
        ${styles[toast.type] || styles.success}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <span className="text-lg shrink-0">{icons[toast.type] || icons.success}</span>
      <span className="text-sm font-medium">{toast.message}</span>
      <button className="ml-auto text-gray-300 hover:text-gray-500 text-xs shrink-0">✕</button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
