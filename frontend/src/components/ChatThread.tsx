import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../App';
import { MessageBubble } from './MessageBubble';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onCitationClick: (citationId: string) => void;
  onFollowUpClick?: (q: string) => void;
}

export function ChatThread({ messages, isLoading, onCitationClick, onFollowUpClick }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-12">
      {messages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MessageBubble message={msg} onCitationClick={onCitationClick} onFollowUpClick={onFollowUpClick} />
        </motion.div>
      ))}
      
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start mb-6"
        >
          <div className="px-5 py-3.5 rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center gap-3 shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Thinking...</span>
          </div>
        </motion.div>
      )}
      
      <div ref={endRef} />
    </div>
  );
}
