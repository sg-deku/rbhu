import React from 'react';

interface QueryHistoryProps {
  history: string[];
  onSelectQuery: (query: string) => void;
  onClearHistory: () => void;
}

const QueryHistory: React.FC<QueryHistoryProps> = ({ history, onSelectQuery, onClearHistory }) => {
  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Recent Queries
        </h3>
        <button
          onClick={onClearHistory}
          className="text-xs text-red-500 hover:text-red-600 font-medium"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((query, index) => (
          <button
            key={index}
            onClick={() => onSelectQuery(query)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors truncate max-w-xs"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QueryHistory;
