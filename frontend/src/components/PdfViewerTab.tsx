import React, { useEffect, useState } from 'react';
import type { Citation, IngestedFile } from '../lib/mockData';
import { cn } from '../lib/utils';

export function PdfViewerTab({ citation, file, triggerTime }: { citation: Citation, file: IngestedFile, triggerTime: number }) {
  const [highlightFlash, setHighlightFlash] = useState(false);

  useEffect(() => {
    // Flash the highlight when triggerTime changes (same citation clicked again)
    setHighlightFlash(true);
    const timer = setTimeout(() => setHighlightFlash(false), 1500);
    return () => clearTimeout(timer);
  }, [triggerTime, citation.id]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col">
        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-700 flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
            Document Viewer
          </span>
          {citation.page && (
            <span className="text-xs font-semibold px-2 py-1 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-md">
              {citation.page}
            </span>
          )}
        </div>
        <div className="flex-1 p-6 flex flex-col overflow-y-auto bg-gray-50 dark:bg-zinc-900/50">
          <div className="max-w-xl mx-auto w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 shadow-md p-8 rounded-sm text-gray-800 dark:text-gray-200 min-h-[600px] flex flex-col">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b pb-4 border-gray-100 dark:border-zinc-800">
              {citation.topicName || file.name.replace(/\.[^/.]+$/, "")}
            </h2>
            
            <div className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              
              <div 
                className={cn(
                  "p-2 -mx-2 rounded transition-all duration-1000",
                  highlightFlash 
                    ? "bg-yellow-200/60 dark:bg-yellow-500/30" 
                    : "bg-yellow-100/40 dark:bg-yellow-500/10"
                )}
              >
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {citation.snippet}
                </span>
              </div>
              
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
