import React from 'react';
import type { Citation, IngestedFile } from '../lib/mockData';

export function PdfViewerTab({ citation, file }: { citation: Citation, file: IngestedFile }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Relevant Snippet</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 leading-relaxed bg-yellow-50/50 p-3 rounded-lg border-l-2 border-yellow-400">
          {citation.snippet}
        </p>
      </div>
      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden min-h-[300px] flex flex-col">
        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 border-b border-gray-200 dark:border-zinc-700 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
          Page Viewer
        </div>
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-gray-300">
          <div className="w-full h-full border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded flex items-center justify-center bg-gray-50 dark:bg-zinc-900/50">
            <span className="text-sm font-medium">Mock Document Page</span>
          </div>
        </div>
      </div>
    </div>
  );
}
