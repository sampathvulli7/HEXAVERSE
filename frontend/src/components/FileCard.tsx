import React from 'react';
import { FileText, Image as ImageIcon, Music, File } from 'lucide-react';
import type { IngestedFile } from '../lib/mockData';
import { cn } from '../lib/utils';

interface FileCardProps {
  file: IngestedFile;
}

export function FileCard({ file }: FileCardProps) {
  const getIcon = () => {
    switch (file.type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'docx': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'png': return <ImageIcon className="w-5 h-5 text-green-500" />;
      case 'mp3': return <Music className="w-5 h-5 text-purple-500" />;
      default: return <File className="w-5 h-5 text-gray-500 dark:text-gray-400 dark:text-gray-500" />;
    }
  };

  return (
    <div className={cn(
      "flex flex-col p-3 bg-white dark:bg-zinc-900 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm",
      "hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer min-w-[140px] max-w-[160px]"
    )}>
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 dark:bg-zinc-900/50 mb-3">
        {file.thumbnailUrl ? (
          <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          getIcon()
        )}
      </div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={file.name}>
        {file.name}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        {file.size}
      </p>
    </div>
  );
}
