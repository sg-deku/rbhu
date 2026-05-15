import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ActivityDTO } from '../../types/integrations'
import ActivityLogEntry from './ActivityLogEntry'

interface ActivityLogProps {
  activities: ActivityDTO[]
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  loading?: boolean
}

const ActivityLog = ({ activities, page, total, limit, onPageChange, loading }: ActivityLogProps) => {
  const totalPages = Math.ceil(total / limit)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Activity Log</h2>
          {total > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {total} event{total !== 1 ? 's' : ''} recorded
            </p>
          )}
        </div>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        {loading ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading activity…</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <svg className="w-6 h-6" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>No activity yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Events will appear here once you connect an integration.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            <div>
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                >
                  <ActivityLogEntry activity={activity} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {total > 0 && (
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={!hasPrev}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Prev
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={!hasNext}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                Next
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLog
