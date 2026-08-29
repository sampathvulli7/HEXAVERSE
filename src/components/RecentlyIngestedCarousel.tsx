import React from 'react';
import type { IngestedFile } from '../lib/mockData';
import { FileCard } from './FileCard';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export function RecentlyIngestedCarousel({ files }: { files: IngestedFile[] }) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-16 px-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recently ingested</h3>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-white dark:bg-zinc-900 shadow-sm transition-all"><ChevronLeft className="w-4 h-4" /></button>
          <button className="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-white dark:bg-zinc-900 shadow-sm transition-all"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
        {files.map(f => (
          <FileCard key={f.id} file={f} />
        ))}
      </div>
    </div>
  );
}
