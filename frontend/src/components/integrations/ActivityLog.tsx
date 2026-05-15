import React from 'react'
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
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No activity yet</p>
        ) : (
          <div className="px-4">
            {activities.map((activity) => (
              <ActivityLogEntry key={activity.id} activity={activity} />
            ))}
          </div>
        )}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={!hasPrev}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={!hasNext}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLog
