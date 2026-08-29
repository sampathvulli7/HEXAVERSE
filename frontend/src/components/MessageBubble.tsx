import React, { useEffect, useState, useRef, useMemo, memo } from 'react';
import type { Citation } from '../lib/mockData';
import { cn } from '../lib/utils';
import { CitationChip } from './CitationChip';
import type { ChatMessage } from '../App';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
  message: ChatMessage;
  onCitationClick: (citationId: string) => void;
  onFollowUpClick?: (q: string) => void;
}

/**
 * Memoized message bubble — streaming state changes inside one bubble
 * don't cascade re-renders to parent/sibling components.
 */
export const MessageBubble = memo(function MessageBubble({ message, onCitationClick, onFollowUpClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const shouldStream = message.isStreaming && !isUser;
  
  const safeContent = message.content || "";
  const [charIndex, setCharIndex] = useState(shouldStream ? 0 : safeContent.length);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Streaming reveal, scaled to answer length: any answer finishes in ~2.5s
  // regardless of size (a fixed chars-per-tick made long answers crawl).
  useEffect(() => {
    if (!shouldStream || charIndex >= safeContent.length) return;

    const step = Math.max(3, Math.ceil(safeContent.length / 100));
    intervalRef.current = setInterval(() => {
      setCharIndex(prev => {
        const next = prev + step + Math.floor(Math.random() * 2);
        if (next >= safeContent.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return safeContent.length;
        }
        return next;
      });
    }, 24);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shouldStream, charIndex, safeContent]);

  const isDoneStreaming = charIndex >= safeContent.length;
  const visibleText = isUser ? safeContent : safeContent.slice(0, charIndex);

  // Parse visible text into text spans + citation chips.
  // Citations fade in only after their surrounding text has been revealed.
  const renderedContent = useMemo(() => {
    if (isUser) return <span>{visibleText}</span>;

    const parts = visibleText.split(/(\[\d+\])/g);
    
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const num = parseInt(match[1], 10);
        const citation = message.citations?.find((c: Citation) => c.number === num);
        if (citation) {
          return (
            <motion.span
              key={`cit-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.1 }}
            >
              <CitationChip 
                citation={citation}
                onClick={() => onCitationClick(citation.id)} 
              />
            </motion.span>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  }, [visibleText, isUser, message.citations, onCitationClick]);

  // Follow-up suggestions come from the backend per answer (LLM-generated,
  // grounded in the same sources); empty array = no chips rendered.
  const followUps = message.followUps ?? [];

  return (
    <div className={cn(
      "flex flex-col w-full mb-8",
      isUser ? "items-end" : "items-start"
    )}>
      <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
        {!isUser && (
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-200 dark:border-blue-800 flex items-center justify-center mr-3.5 shadow-sm mt-1">
            O
          </div>
        )}
        
        <div className={cn(
          "max-w-[88%] sm:max-w-[80%] px-6 py-4.5 text-base leading-relaxed whitespace-pre-wrap",
          isUser 
            ? "bg-blue-600 text-white rounded-3xl rounded-tr-sm shadow-md" 
            : "bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 text-gray-800 dark:text-gray-100 rounded-3xl rounded-tl-sm shadow-sm"
        )}>
          {renderedContent}
          {!isDoneStreaming && <span className="inline-block w-1.5 h-5 ml-1 bg-blue-500 rounded-sm animate-pulse align-middle" />}

          {/* Sources row — always visible when citations exist, so sources
              are navigable even if the model omitted inline [n] markers
              (the online model frequently does). */}
          {!isUser && isDoneStreaming && (message.citations?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mr-1">Sources</span>
              {message.citations!.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onCitationClick(c.id)}
                  title={`${c.sourceFile ?? ''} ${c.page ?? ''}${c.timestamp ? ` · ${c.timestamp}` : ''}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors max-w-[220px]"
                >
                  <span className="text-blue-600 dark:text-blue-400 font-bold">[{c.number}]</span>
                  <span className="truncate">{c.sourceFile}</span>
                  {c.timestamp && <span className="text-gray-400 flex-shrink-0">{c.timestamp}</span>}
                  {c.page && !c.timestamp && <span className="text-gray-400 flex-shrink-0">{c.page.replace('Page ', 'p.')}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggested Follow-up chips after AI answers */}
      {!isUser && isDoneStreaming && onFollowUpClick && followUps.length > 0 && (
        <motion.div 
          className="flex flex-wrap gap-2 mt-3.5 ml-12"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {followUps.map((q, i) => (
            <button
              key={i}
              onClick={() => onFollowUpClick(q)}
              className="px-4 py-1.5 rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-medium text-gray-600 dark:text-gray-400 transition-all shadow-sm active:scale-95"
            >
              {q}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
});
