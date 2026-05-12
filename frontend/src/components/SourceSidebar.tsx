import React from 'react';

export interface Source {
  id: string;
  title: string;
  snippet: string;
  url: string;
}

interface SourceSidebarProps {
  sources: Source[];
  isLoading: boolean;
}

const SourceSidebar: React.FC<SourceSidebarProps> = ({ sources, isLoading }) => {
  if (isLoading) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border border-gray-100 rounded-xl space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        ))}
      </div>
    );
  }

  if (sources.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span>📄</span> Sources
      </h3>
      <div className="space-y-3">
        {sources.map((source) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all group"
          >
            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors mb-1 truncate">
              {source.title}
            </h4>
            <p className="text-sm text-gray-500 line-clamp-2">
              {source.snippet}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default SourceSidebar;
