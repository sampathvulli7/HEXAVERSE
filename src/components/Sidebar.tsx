import React, { useState } from 'react';
import { Plus, MessageSquare, FolderKanban, FolderPlus, X, Sun, Moon, ChevronRight, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface RecentChat {
  id: string;
  title: string;
  time: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onNewChat?: () => void;
  onSelectChat?: (query: string) => void;
  recentChats: RecentChat[];
  activeChatTitle?: string | null;
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  isDarkMode, 
  onToggleTheme, 
  onNewChat, 
  onSelectChat,
  recentChats,
  activeChatTitle
}: SidebarProps) {
  const [projects, setProjects] = useState([
    { id: 'p1', title: 'SIH Multimodal Intelligence', count: 12, color: 'text-blue-500' },
    { id: 'p2', title: 'Document Analytics Suite', count: 8, color: 'text-purple-500' },
    { id: 'p3', title: 'Audio & Speech Transcripts', count: 5, color: 'text-emerald-500' },
  ]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');

  // Strictly maximum 4 recent chats displayed
  const displayedRecentChats = recentChats.slice(0, 4);

  const handleCreateProject = () => {
    if (newProjectTitle.trim()) {
      const colors = ['text-blue-500', 'text-purple-500', 'text-emerald-500', 'text-amber-500', 'text-rose-500'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      setProjects(prev => [
        ...prev,
        {
          id: `p-${Date.now()}`,
          title: newProjectTitle.trim(),
          count: 0,
          color: randomColor
        }
      ]);
      setNewProjectTitle('');
      setIsCreatingProject(false);
    }
  };

  const handleChatClick = (chat: RecentChat) => {
    if (onSelectChat) onSelectChat(chat.title);
    if (onClose) onClose();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#FAFAFA] dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800/80 transition-colors duration-300">
      {/* App Header */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/okapi-logo.png" alt="Okapi" className="w-8 h-8 rounded-xl object-cover bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm" />
          <span className="font-semibold text-xl tracking-tight text-gray-900 dark:text-gray-100">Okapi</span>
        </div>
        <button onClick={onClose} className="md:hidden p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Prominent Action Buttons: New Chat & New Project */}
      <div className="px-4 mb-6 flex flex-col gap-2.5">
        <button
          onClick={() => {
            if (onNewChat) onNewChat();
            if (onClose) onClose();
          }}
          className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-2xl bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Chat</span>
        </button>

        <button
          onClick={() => setIsCreatingProject(!isCreatingProject)}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-2xl bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-gray-200 font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
        >
          <FolderPlus className="w-4.5 h-4.5 text-purple-500" />
          <span>New Project</span>
        </button>
      </div>

      {/* Main Vertical Lists */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6 hide-scrollbar">
        {/* Recent Chats - Strictly Max 4 Items */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent Chats</h3>
            <span className="text-[10px] bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
              {displayedRecentChats.length} / 4
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {displayedRecentChats.map((chat) => {
              const isActive = activeChatTitle?.toLowerCase() === chat.title.toLowerCase();
              return (
                <button
                  key={chat.id}
                  onClick={() => handleChatClick(chat)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all group",
                    isActive
                      ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200/80 dark:border-zinc-800"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-900/60"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                      : "bg-gray-100 dark:bg-zinc-900 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                  )}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{chat.title}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{chat.time}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Projects</h3>
            <span className="text-[10px] bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">{projects.length}</span>
          </div>

          {/* New Project Input Card */}
          <AnimatePresence>
            {isCreatingProject && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 px-1 overflow-hidden"
              >
                <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-purple-500/50 dark:border-purple-500/60 shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Create New Project</span>
                    <button onClick={() => setIsCreatingProject(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. SIH Hackathon 2024"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProject();
                      if (e.key === 'Escape') setIsCreatingProject(false);
                    }}
                    className="w-full bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsCreatingProject(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateProject}
                      disabled={!newProjectTitle.trim()}
                      className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium disabled:opacity-40 shadow-sm transition-all"
                    >
                      Create Project
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-1">
            {projects.map((proj) => (
              <button
                key={proj.id}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-900/60 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-900 flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200">
                  <FolderKanban className={cn("w-3.5 h-3.5", proj.color)} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{proj.title}</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">{proj.count} files</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Theme Switcher in Sidebar footer */}
      {onToggleTheme && (
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800/80 mt-auto">
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm"
          >
            <span className="flex items-center gap-2.5">
              {isDarkMode ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              {isDarkMode ? 'Dark Theme' : 'Light Theme'}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">Toggle</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed top-0 left-0 bottom-0 w-72 z-30">
        {navContent}
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="md:hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-50 shadow-2xl"
            >
              {navContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
