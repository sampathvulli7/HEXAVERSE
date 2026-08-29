import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#FAFAFB] via-[#FAFAFB] to-transparent z-30 pointer-events-none">
      <div className="max-w-3xl mx-auto relative pointer-events-auto">
        <div className="relative flex items-center bg-white dark:bg-zinc-900/80 backdrop-blur-xl border border-gray-200 dark:border-zinc-700/60 rounded-full shadow-lg p-2 transition-shadow duration-300 focus-within:shadow-xl focus-within:border-blue-300">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything across your documents, images, and audio..."
            disabled={disabled}
            className={cn(
              "flex-1 bg-transparent border-none outline-none px-4 py-2 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:text-gray-500 font-medium",
              disabled && "opacity-50"
            )}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full text-white transition-all duration-200 shadow-sm",
              (!input.trim() || disabled) 
                ? "bg-gray-300 text-gray-500 dark:text-gray-400 dark:text-gray-500 cursor-not-allowed" 
                : "bg-gradient-to-r from-blue-500 to-violet-500 hover:shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            )}
          >
            <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
