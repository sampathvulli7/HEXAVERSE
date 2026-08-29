import React, { useEffect, useState } from 'react';
import type { Citation } from '../lib/mockData';
import { cn } from '../lib/utils';
import { CitationChip } from './CitationChip';
import type { ChatMessage } from '../App';

interface MessageBubbleProps {
  message: ChatMessage;
  onCitationClick: (citationId: string) => void;
  onFollowUpClick?: (q: string) => void;
}

export function MessageBubble({ message, onCitationClick, onFollowUpClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [displayedText, setDisplayedText] = useState(message.isStreaming && !isUser ? '' : message.content);
  const [isDoneStreaming, setIsDoneStreaming] = useState(!message.isStreaming || isUser);

  useEffect(() => {
    if (message.isStreaming && !isUser && displayedText.length < message.content.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(message.content.slice(0, displayedText.length + 5));
      }, 12);
      return () => clearTimeout(timeout);
    } else if (message.isStreaming && displayedText.length >= message.content.length) {
      setIsDoneStreaming(true);
    }
  }, [displayedText, message]);

  const renderContent = () => {
    if (isUser) return displayedText;

    const parts = displayedText.split(/(\[\d+\])/g);
    
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const num = parseInt(match[1], 10);
        const citation = message.citations?.find((c: Citation) => c.number === num);
        if (citation) {
          return (
            <CitationChip 
              key={index} 
              number={num} 
              onClick={() => onCitationClick(citation.id)} 
            />
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  const followUps = [
    "How does latency compare to Q2?",
    "Show the full architecture diagram"
  ];

  return (
    <div className={cn(
      "flex flex-col w-full mb-8",
      isUser ? "items-end" : "items-start"
    )}>
      <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
        {!isUser && (
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center mr-3.5 shadow-sm mt-1 overflow-hidden">
            <img src="/okapi-logo.png" alt="Okapi" className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className={cn(
          "max-w-[88%] sm:max-w-[80%] px-6 py-4.5 text-base leading-relaxed whitespace-pre-wrap",
          isUser 
            ? "bg-blue-600 text-white rounded-3xl rounded-tr-sm shadow-md" 
            : "bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 text-gray-800 dark:text-gray-100 rounded-3xl rounded-tl-sm shadow-sm"
        )}>
          {renderContent()}
          {!isDoneStreaming && <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />}
        </div>
      </div>

      {/* Suggested Follow-up chips after AI answers */}
      {!isUser && isDoneStreaming && onFollowUpClick && (
        <div className="flex flex-wrap gap-2 mt-3.5 ml-12">
          {followUps.map((q, i) => (
            <button
              key={i}
              onClick={() => onFollowUpClick(q)}
              className="px-4 py-1.5 rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-medium text-gray-600 dark:text-gray-400 transition-all shadow-sm active:scale-95"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
