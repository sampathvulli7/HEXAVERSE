import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { RecentChat } from './components/Sidebar';
import { CommandBox } from './components/CommandBox';
import { SuggestionChips } from './components/SuggestionChips';
import { RecentlyIngestedCarousel } from './components/RecentlyIngestedCarousel';
import { ChatThread } from './components/ChatThread';
import { CitationDrawer } from './components/CitationDrawer';
import type { Message, IngestedFile } from './lib/mockData';
import { mockFiles } from './lib/mockData';
import { queryMock } from './lib/api';
import { Menu, Moon, Sun, ArrowLeft } from 'lucide-react';
import { TouchBackground } from './components/TouchBackground';

export interface ChatMessage extends Message {
  isStreaming?: boolean;
}

const INITIAL_RECENT_CHATS: RecentChat[] = [
  { id: 'c1', title: 'Q3 Financial Highlights', time: '10:24 AM' },
  { id: 'c2', title: 'Architecture & Vector Pipeline', time: 'Yesterday' },
  { id: 'c3', title: 'Product Roadmap 2024 Goals', time: '3 days ago' },
  { id: 'c4', title: 'All-Hands Audio Key Moments', time: '1 week ago' },
];

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [files, setFiles] = useState<IngestedFile[]>(mockFiles);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [recentChats, setRecentChats] = useState<RecentChat[]>(INITIAL_RECENT_CHATS);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSendMessage = async (query: string) => {
    if (!query.trim()) return;

    // Add query to Recent Chats list immediately
    setRecentChats(prev => {
      const filtered = prev.filter(c => c.title.toLowerCase() !== query.toLowerCase());
      return [
        { id: `chat-${Date.now()}`, title: query, time: 'Just now' },
        ...filtered
      ].slice(0, 4);
    });

    const newUserMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: query };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const aiMsg = await queryMock(query);
      setMessages(prev => [...prev, { ...aiMsg, isStreaming: true }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveCitationId(null);
  };

  const handleSelectChat = (query: string) => {
    setMessages([]);
    handleSendMessage(query);
  };

  const handleFilesAttached = (newFiles: IngestedFile[]) => {
    setFiles(prev => [...newFiles, ...prev]);
  };

  const allCitations = messages.flatMap(m => m.citations || []);
  const isChatActive = messages.length > 0;

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] dark:bg-zinc-950 overflow-hidden relative font-sans text-gray-800 dark:text-gray-200 transition-colors duration-300">
      <TouchBackground />
      
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        recentChats={recentChats}
        activeChatTitle={isChatActive ? messages[0].content : null}
      />
      
      <main className="flex-1 flex flex-col relative md:ml-72 h-full overflow-hidden transition-all duration-300 z-10">
        {/* Mobile Hamburger Menu */}
        <button 
          onClick={() => setSidebarOpen(true)}
          className="md:hidden absolute top-4 left-4 z-20 p-2.5 bg-white dark:bg-zinc-900 rounded-full shadow-sm border border-gray-200 dark:border-zinc-800"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Back Button (Appears during active chat) */}
        {isChatActive && (
          <button 
            onClick={handleNewChat}
            title="Back to Home Search"
            className="absolute top-4 left-16 md:left-8 z-20 flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-zinc-900 rounded-full shadow-md border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-medium text-gray-700 dark:text-gray-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Back</span>
          </button>
        )}

        {/* Top-Right Theme Toggle */}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          title="Toggle Light / Dark Mode"
          className="absolute top-4 right-4 z-20 p-2.5 bg-white dark:bg-zinc-900 rounded-full shadow-sm border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-gray-700 dark:text-gray-300"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-600" />}
        </button>

        {/* Main Content Viewport */}
        <div className="flex-1 overflow-y-auto pb-44 pt-16 md:pt-20 px-4 hide-scrollbar">
          {!isChatActive ? (
            <div className="max-w-4xl mx-auto pt-12 md:pt-20">
              <h1 className="text-5xl md:text-[4.5rem] font-light text-center text-gray-900 dark:text-gray-100 mb-10 tracking-tight">
                Search everything.
              </h1>
              
              <CommandBox 
                onSearch={handleSendMessage} 
                isChatMode={false} 
                onFilesAttached={handleFilesAttached}
              />
              
              <SuggestionChips onSelect={handleSendMessage} />
              <RecentlyIngestedCarousel files={files} />
            </div>
          ) : (
            <ChatThread 
              messages={messages} 
              isLoading={isLoading} 
              onCitationClick={setActiveCitationId} 
              onFollowUpClick={handleSendMessage}
            />
          )}
        </div>

        {/* Fixed Docked Command Box (When in active chat mode) */}
        {isChatActive && (
          <CommandBox 
            onSearch={handleSendMessage} 
            isChatMode={true} 
            onFilesAttached={handleFilesAttached}
          />
        )}

        {/* Citation Drawer */}
        <CitationDrawer 
          citationId={activeCitationId} 
          citations={allCitations} 
          onClose={() => setActiveCitationId(null)} 
        />
      </main>
    </div>
  );
}

export default App;
