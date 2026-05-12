import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AnswerViewProps {
  answer: string;
  isLoading: boolean;
}

const AnswerView: React.FC<AnswerViewProps> = ({ answer, isLoading }) => {
  if (isLoading) {
    return (
      <div className="w-full max-w-3xl space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!answer) return null;

  return (
    <div className="w-full max-w-3xl prose prose-blue lg:prose-lg bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span className="text-blue-600">🧭</span> Answer
      </h2>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {answer}
      </ReactMarkdown>
    </div>
  );
};

export default AnswerView;
