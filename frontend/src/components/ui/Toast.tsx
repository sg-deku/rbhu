import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

const Toast = ({ message, type, onDismiss }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const colorClass =
    type === 'success'
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-red-50 border-red-200 text-red-800'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm ${colorClass}`}
      >
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onDismiss}
          className="ml-auto text-current opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

export default Toast
