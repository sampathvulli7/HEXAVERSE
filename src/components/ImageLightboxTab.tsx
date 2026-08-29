import React, { useState } from 'react';
import type { Citation, IngestedFile } from '../lib/mockData';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export function ImageLightboxTab({ citation, file }: { citation: Citation, file: IngestedFile }) {
  const [showOcr, setShowOcr] = useState(false);
  
  const ocrText = "Extracted Text from Image:\n\nDiagram details flow of data from ingestion layer to embedding model. Key components include vector database and semantic search pipeline.";

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-zinc-900/50 relative rounded-b-xl overflow-hidden">
      <div className="absolute top-4 right-4 z-10 bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-1 flex">
        <button 
          onClick={() => setShowOcr(false)} 
          className={cn("p-1.5 rounded-md transition-colors", !showOcr ? "bg-blue-50 text-blue-600" : "text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-zinc-800")}
          title="View Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setShowOcr(true)} 
          className={cn("p-1.5 rounded-md transition-colors", showOcr ? "bg-blue-50 text-blue-600" : "text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-zinc-800")}
          title="View OCR Text"
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        {showOcr ? (
          <div className="flex-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-6 overflow-y-auto mt-10 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">OCR Extraction</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{ocrText}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center mt-6">
            {file.thumbnailUrl ? (
              <img src={file.thumbnailUrl} alt={file.name} className="max-w-full max-h-full object-contain rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-zinc-700 animate-pulse rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500">
                Image missing
              </div>
            )}
          </div>
        )}
      </div>
      
      {citation.caption && (
        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 text-center">
          {citation.caption}
        </div>
      )}
    </div>
  );
}
