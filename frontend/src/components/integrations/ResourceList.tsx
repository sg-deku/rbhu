import React from 'react'
import { ResourceDTO } from '../../types/integrations'

interface ResourceListProps {
  resources: ResourceDTO[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  loading?: boolean
}

const ResourceList = ({ resources, selectedIds, onChange, loading }: ResourceListProps) => {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  if (loading) {
    return (
      <ul className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="flex items-center gap-3 p-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse flex-shrink-0" />
            <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="space-y-1">
      {(resources || []).map((resource) => (
        <li key={resource.id}>
          <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.includes(resource.id)}
              onChange={() => toggle(resource.id)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{resource.name}</span>
            <span className="text-xs text-gray-400 ml-auto">{resource.type}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}

export default ResourceList
