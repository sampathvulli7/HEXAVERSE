import React, { useState, useEffect, useRef } from 'react';
import { ChatThread } from './ChatThread';
import { CommandBox } from './CommandBox';
import { CitationDrawer } from './CitationDrawer';
import type { Message } from '../lib/mockData';
import { queryMock } from '../lib/api';
import { ArrowLeft } from 'lucide-react';

export interface ChatMessage extends Message {
  isStreaming?: boolean;
}

interface ChatViewProps {
  initialQuery: string;
  onUploadClick: () => void;
  onReset: () => void;
  onNewQuerySubmitted?: (query: string) => void;
}

export function ChatView({ initialQuery, onUploadClick, onReset, onNewQuerySubmitted }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const hasProcessedInitialQuery = useRef(false);

  useEffect(() => {
    if (!hasProcessedInitialQuery.current && initialQuery) {
      hasProcessedInitialQuery.current = true;
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    if (onNewQuerySubmitted) {
      onNewQuerySubmitted(content);
    }

    const newUserMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const aiMsg = await queryMock(content);
      setMessages(prev => [...prev, { ...aiMsg, isStreaming: true }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const allCitations = messages.flatMap(m => m.citations || []);

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden">
      {/* Back to Home Button */}
      <button
        onClick={onReset}
        title="Return to main search page"
        className="fixed top-4 left-16 md:left-80 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-md hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-medium text-gray-700 dark:text-gray-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>Back to Home</span>
      </button>

      {/* Thread Content */}
      <ChatThread 
        messages={messages} 
        isLoading={isLoading} 
        onCitationClick={setActiveCitationId} 
        onFollowUpClick={handleSendMessage}
      />
      
      {/* Docked Command Box */}
      <CommandBox 
        onSearch={handleSendMessage} 
        isChatMode={true} 
      />
      
      {/* Citation Drawer */}
      <CitationDrawer 
        citationId={activeCitationId} 
        citations={allCitations} 
        onClose={() => setActiveCitationId(null)} 
      />
    </div>
  );
}
