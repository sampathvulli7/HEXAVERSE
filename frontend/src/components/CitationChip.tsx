import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import type { Citation } from '../lib/mockData';
import { motion, AnimatePresence } from '../lib/motion';
import { FileText, Image as ImageIcon, Music } from 'lucide-react';

interface CitationChipProps {
  citation: Citation;
  onClick: () => void;
}

export function CitationChip({ citation, onClick }: CitationChipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cardPosition, setCardPosition] = useState<'top' | 'bottom'>('top');
  const chipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      // Determine if we have space above, otherwise show below
      if (chipRef.current) {
        const rect = chipRef.current.getBoundingClientRect();
        if (rect.top < 150) {
          setCardPosition('bottom');
        } else {
          setCardPosition('top');
        }
      }
      setIsHovered(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150); // Grace delay
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  // Prevent memory leaks
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  const getIcon = () => {
    switch (citation.sourceType) {
      case 'pdf': return <FileText className="w-3 h-3 text-red-500" />;
      case 'docx': return <FileText className="w-3 h-3 text-blue-500" />;
      case 'png': return <ImageIcon className="w-3 h-3 text-emerald-500" />;
      case 'mp3': return <Music className="w-3 h-3 text-purple-500" />;
      default: return <FileText className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <div 
      className="inline-block relative z-30" 
      ref={chipRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <button
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex items-center justify-center px-1.5 py-0.5 mx-1 translate-y-[-2px]",
          "text-xs font-semibold rounded-full cursor-pointer transition-all duration-200",
          "bg-gradient-to-r from-blue-100 to-violet-100 text-blue-700",
          "hover:from-blue-200 hover:to-violet-200 hover:shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        )}
      >
        {citation.number}
      </button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: cardPosition === 'top' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: cardPosition === 'top' ? 5 : -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-700/80 shadow-xl rounded-xl p-3 z-50 text-left pointer-events-auto",
              cardPosition === 'top' ? "bottom-full mb-2" : "top-full mt-2"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
                {getIcon()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {citation.sourceFile || 'Unknown Source'}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {citation.topicName} {citation.page && `• ${citation.page}`} {citation.timestamp && `• ${citation.timestamp}`}
                </span>
              </div>
            </div>
            {citation.snippet && (
              <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed bg-gray-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-gray-100 dark:border-zinc-800">
                "{citation.snippet}"
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
