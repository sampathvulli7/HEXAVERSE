import React, { useEffect, useState } from 'react';
import { X, FileText, Image as ImageIcon, Music, ExternalLink } from 'lucide-react';
import type { Citation, IngestedFile } from '../lib/mockData';
import { mockFiles } from '../lib/mockData';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PdfViewerTab } from './PdfViewerTab';
import { ImageLightboxTab } from './ImageLightboxTab';
import { AudioPlayerTab } from './AudioPlayerTab';

interface CitationDrawerProps {
  citationId: string | null;
  triggerTime: number;
  citations: Citation[];
  onClose: () => void;
}

export function CitationDrawer({ citationId, triggerTime, citations, onClose }: CitationDrawerProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!citationId) return null;

  const citation = citations.find(c => c.id === citationId);
  const file = citation ? mockFiles.find(f => f.id === citation.fileId) : null;

  if (!citation || !file) return null;

  const getIcon = () => {
    switch (file.type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'docx': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'png': return <ImageIcon className="w-5 h-5 text-green-500" />;
      case 'mp3': return <Music className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 dark:text-gray-500" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex md:bg-transparent bg-gray-900/20 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={isMobile ? { y: '100%' } : { x: '100%' }}
          animate={isMobile ? { y: 0 } : { x: 0 }}
          exit={isMobile ? { y: '100%' } : { x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "fixed bg-white dark:bg-zinc-900 shadow-2xl flex flex-col z-50",
            "md:right-0 md:top-0 md:h-full md:w-[450px] md:border-l border-gray-200 dark:border-zinc-700 md:rounded-none",
            "bottom-0 left-0 w-full h-[85vh] rounded-t-3xl"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 md:pt-6">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 flex items-center justify-center flex-shrink-0">
                {getIcon()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{file.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Source [{citation.number}]</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:bg-zinc-800 rounded-full transition-colors">
                <ExternalLink className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:bg-zinc-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-zinc-900/50">
            {file.type === 'pdf' || file.type === 'docx' ? (
              <PdfViewerTab citation={citation} file={file} triggerTime={triggerTime} />
            ) : file.type === 'png' ? (
              <ImageLightboxTab citation={citation} file={file} triggerTime={triggerTime} />
            ) : file.type === 'mp3' ? (
              <AudioPlayerTab citation={citation} file={file} triggerTime={triggerTime} />
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
