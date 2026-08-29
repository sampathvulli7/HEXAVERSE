import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import type { RecentChat } from './components/Sidebar';
import { CommandBox } from './components/CommandBox';
import { SuggestionChips } from './components/SuggestionChips';
import { RecentlyIngestedCarousel } from './components/RecentlyIngestedCarousel';
import { ChatThread } from './components/ChatThread';
import { CitationDrawer } from './components/CitationDrawer';
import type { Message, IngestedFile } from './lib/mockData';
import type { AttachedFile } from './components/CommandBox';
import { mockFiles } from './lib/mockData';
import { queryMock, listProjects, createProject, listFiles, queryByImage, queryByAudio, adaptQueryResponse } from './lib/api';
import { Menu, Moon, Sun, ArrowLeft } from 'lucide-react';
import { TouchBackground } from './components/TouchBackground';
import { SettingsModal } from './components/SettingsModal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';

export interface ChatMessage extends Message {
  isStreaming?: boolean;
}

const INITIAL_RECENT_CHATS: RecentChat[] = [
  { id: 'c1', title: 'Q3 Financial Highlights', time: '10:24 AM' },
  { id: 'c2', title: 'Architecture & Vector Pipeline', time: 'Yesterday' },
  { id: 'c3', title: 'Product Roadmap 2024 Goals', time: '3 days ago' },
  { id: 'c4', title: 'All-Hands Audio Key Moments', time: '1 week ago' },
];

const LAYOUT_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  
  // Decoupled view state from messages array so we can navigate back without losing chat
  const [activeView, setActiveView] = useState<'home' | 'chat'>('home');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<{ id: string, triggerTime: number } | null>(null);
  const [files, setFiles] = useState<IngestedFile[]>([]);
  const [projects, setProjects] = useState<string[]>(['Default']);
  const [activeProject, setActiveProject] = useState('Default');
  const [selectedModel, setSelectedModel] = useState("qwen2.5:3b");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [recentChats, setRecentChats] = useState<RecentChat[]>(INITIAL_RECENT_CHATS);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationActive = activeView === 'chat';

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  useEffect(() => {
    // Load projects and files
    listProjects().then((projArray: string[]) => {
      setProjects(projArray.length ? projArray : ['Default']);
      if (projArray.length && !projArray.includes(activeProject)) {
        setActiveProject(projArray[0]);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    // Load files for active project
    listFiles(activeProject).then((res: any[]) => {
      const formatted = res.map(f => ({
        id: f.id,
        name: f.filename,
        type: f.filename.split('.').pop() || 'unknown',
        size: ''
      }));
      setFiles(formatted);
    }).catch(console.error);
  }, [activeProject]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, activeView]); // added activeView so it scrolls when returning to chat

  const handleSendMessage = async (query: string, overrideChatId?: string, attachments?: AttachedFile[]) => {
    if (!query.trim() && (!attachments || attachments.length === 0)) return;

    const isFollowUp = !overrideChatId && activeView === 'chat' && messages.length > 0;
    
    setActiveView('chat');

    if (!isFollowUp) {
      const chatIdToUse = overrideChatId || `chat-${Date.now()}`;
      setCurrentChatId(chatIdToUse);
      
      if (!overrideChatId) {
        setRecentChats(prev => {
          const filtered = prev.filter(c => c.title.toLowerCase() !== query.toLowerCase());
          return [
            { id: chatIdToUse, title: query || "New Search", time: 'Just now' },
            ...filtered
          ].slice(0, 4);
        });
      }
    }

    const newUserMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: query || "Attached file" };
    
    setMessages(prev => isFollowUp ? [...prev, newUserMsg] : [newUserMsg]);
    setIsLoading(true);

    try {
      let aiMsg: ChatMessage;
      
      if (attachments && attachments.length > 0) {
        const file = attachments[0].fileObj;
        if (file) {
          const type = attachments[0].type;
          if (type === 'png') {
            const res = await queryByImage(file, query, activeProject, selectedModel);
            aiMsg = adaptQueryResponse(res);
          } else if (type === 'mp3') {
            const res = await queryByAudio(file, activeProject, selectedModel);
            aiMsg = adaptQueryResponse(res);
          } else {
            // PDF/Docx are ingested, so we just do a mock query
            aiMsg = await queryMock(query, activeProject, selectedModel);
          }
        } else {
          aiMsg = await queryMock(query, activeProject, selectedModel);
        }
      } else {
        aiMsg = await queryMock(query, activeProject, selectedModel);
      }
      
      setMessages(prev => [...prev, { ...aiMsg, isStreaming: true }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveView('home');
    setCurrentChatId(null);
    setMessages([]);
    setActiveCitation(null);
  };

  const handleSelectChat = (chatId: string, query: string) => {
    if (chatId === currentChatId && messages.length > 0) {
      // Resume existing active chat
      setActiveView('chat');
    } else {
      // Load a different chat
      handleSendMessage(query, chatId);
    }
  };

  const handleFilesAttached = (newFiles: IngestedFile[]) => {
    setFiles(prev => [...newFiles, ...prev]);
  };

  const allCitations = messages.flatMap(m => m.citations || []);

  return (
    <div className="flex h-screen w-full overflow-hidden relative font-sans text-gray-800 dark:text-gray-200 transition-colors duration-300">
      <TouchBackground isDarkMode={isDarkMode} />
      
      <Sidebar 
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onClose={() => setSidebarOpen(false)} 
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        recentChats={recentChats}
        activeChatTitle={activeView === 'chat' && messages.length > 0 ? messages[0].content : null}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => setActiveProject(p)}
        onCreateProject={async (name) => {
          await createProject(name);
          const p = await listProjects();
          setProjects(p);
          setActiveProject(name);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <main 
        className={cn(
          "flex-1 flex flex-col relative h-full overflow-hidden transition-all duration-300",
          sidebarCollapsed ? "md:ml-20" : "md:ml-72"
        )} 
        style={{ zIndex: 10 }}
      >
        {/* Mobile Hamburger */}
        <button 
          onClick={() => setSidebarOpen(true)}
          className="md:hidden absolute top-4 left-4 z-20 p-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 dark:border-zinc-800"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Back to Home Button (Visible only in chat) */}
        <AnimatePresence>
          {activeView === 'chat' && (
            <motion.button 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActiveView('home')}
              title="Back to Home"
              className="hidden md:flex absolute top-4 left-4 z-20 p-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Theme Toggle */}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          title="Toggle Light / Dark Mode"
          className="absolute top-4 right-4 z-20 p-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-gray-700 dark:text-gray-300"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-600" />}
        </button>

        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-44 pt-14 md:pt-16 px-4 hide-scrollbar">
          
          <AnimatePresence mode="wait">
            {!conversationActive && (
              <motion.div
                key="hero-content"
                initial={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto pt-12 md:pt-24 flex flex-col"
              >
                <h1 className="hero-heading text-5xl md:text-[4.5rem] text-center text-gray-900 dark:text-white mb-10">
                  One search. Every format.
                </h1>
                
                {/* Persistent CommandBox placed here in the DOM flow */}
                <motion.div layout transition={LAYOUT_SPRING} className="w-full">
                  <CommandBox 
                    onSearch={(q, attachments) => handleSendMessage(q, undefined, attachments)} 
                    isChatMode={conversationActive} 
                    onFilesAttached={handleFilesAttached}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                    project={activeProject}
                  />
                </motion.div>

                <div className="w-full">
                  <SuggestionChips onSelect={(q) => handleSendMessage(q)} />
                  <RecentlyIngestedCarousel files={files} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* When in chat mode, the CommandBox is rendered here instead so it remains in the DOM */}
          <AnimatePresence mode="wait">
            {conversationActive && (
              <motion.div
                key="chat-thread"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChatThread 
                  messages={messages} 
                  isLoading={isLoading} 
                  onCitationClick={(id) => setActiveCitation({ id, triggerTime: Date.now() })} 
                  onFollowUpClick={(q) => handleSendMessage(q)}
                />
                <motion.div layout transition={LAYOUT_SPRING} className="w-full">
                  <CommandBox 
                    onSearch={(q, attachments) => handleSendMessage(q, undefined, attachments)} 
                    isChatMode={conversationActive} 
                    onFilesAttached={handleFilesAttached}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                    project={activeProject}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <CitationDrawer 
          citationId={activeCitation?.id || null} 
          triggerTime={activeCitation?.triggerTime || 0}
          citations={allCitations} 
          onClose={() => setActiveCitation(null)} 
        />
        
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </main>
    </div>
  );
}

export default App;
