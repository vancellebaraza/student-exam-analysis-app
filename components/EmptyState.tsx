
import React from 'react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6 transition-colors">
        <i className="fa-solid fa-book-open-reader text-indigo-300 dark:text-indigo-500 text-4xl"></i>
      </div>
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2 serif-font">Ready to study?</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md">
        Paste your textbook extracts, lecture notes, or upload a document to generate clear, structured study material.
      </p>
    </div>
  );
};

export default EmptyState;
