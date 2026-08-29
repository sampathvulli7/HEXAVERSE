import React, { useState, useMemo } from 'react';
import { Plus, FolderKanban, FolderPlus, X, Sun, Moon, ChevronDown, Search, FileText, Image as ImageIcon, Music, PanelLeftClose, PanelLeftOpen, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface RecentChat {
  id: string;
  title: string;
  time: string;
}

interface SidebarProps {
  isOpen: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onNewChat?: () => void;
  onSelectChat?: (chatId: string, query: string) => void;
  recentChats: RecentChat[];
  activeChatTitle?: string | null;
  projects?: string[];
  activeProject?: string;
  onSelectProject?: (project: string) => void;
  onCreateProject?: (project: string) => void;
  onOpenSettings?: () => void;
}

const PROJECT_FILES: Record<string, { name: string; type: string; indexed: boolean }[]> = {
  'p1': [
    { name: 'Requirements.pdf', type: 'pdf', indexed: true },
    { name: 'Architecture.png', type: 'png', indexed: true },
    { name: 'API_Spec.docx', type: 'docx', indexed: true },
    { name: 'Meeting_Notes.pdf', type: 'pdf', indexed: false },
  ],
  'p2': [
    { name: 'Analytics_Report.pdf', type: 'pdf', indexed: true },
    { name: 'Dashboard_Mock.png', type: 'png', indexed: true },
    { name: 'User_Research.docx', type: 'docx', indexed: false },
  ],
  'p3': [
    { name: 'Keynote_Recording.mp3', type: 'mp3', indexed: true },
    { name: 'Transcript_v2.docx', type: 'docx', indexed: true },
  ],
};

function groupChatsByTime(chats: RecentChat[]): { label: string; chats: RecentChat[] }[] {
  const groups: { label: string; chats: RecentChat[] }[] = [];
  const today: RecentChat[] = [];
  const yesterday: RecentChat[] = [];
  const earlier: RecentChat[] = [];

  for (const chat of chats) {
    const t = chat.time.toLowerCase();
    if (t === 'just now' || t.includes('am') || t.includes('pm') || t.includes('min') || t.includes('hour')) {
      today.push(chat);
    } else if (t === 'yesterday') {
      yesterday.push(chat);
    } else {
      earlier.push(chat);
    }
  }

  if (today.length > 0) groups.push({ label: 'Today', chats: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', chats: yesterday });
  if (earlier.length > 0) groups.push({ label: 'Earlier', chats: earlier });

  return groups;
}

export function Sidebar({ 
  isOpen, 
  isCollapsed = false,
  onToggleCollapse,
  onClose, 
  isDarkMode, 
  onToggleTheme, 
  onNewChat, 
  onSelectChat,
  recentChats,
  activeChatTitle,
  projects = [],
  activeProject = 'Default',
  onSelectProject,
  onCreateProject,
  onOpenSettings
}: SidebarProps) {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  
  // Independent collapse state for each module
  const [recentChatsExpanded, setRecentChatsExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const displayedRecentChats = recentChats.slice(0, 4);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return displayedRecentChats;
    const q = searchQuery.toLowerCase();
    return displayedRecentChats.filter(c => c.title.toLowerCase().includes(q));
  }, [displayedRecentChats, searchQuery]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(p => p.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  const groupedChats = useMemo(() => groupChatsByTime(filteredChats), [filteredChats]);

  const handleCreateProject = () => {
    if (newProjectTitle.trim() && onCreateProject) {
      onCreateProject(newProjectTitle.trim());
      setNewProjectTitle('');
      setIsCreatingProject(false);
    }
  };

  const handleChatClick = (chat: RecentChat) => {
    if (onSelectChat) onSelectChat(chat.id, chat.title);
    if (onClose) onClose();
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-3 h-3 text-red-400" />;
      case 'docx': return <FileText className="w-3 h-3 text-blue-400" />;
      case 'png': return <ImageIcon className="w-3 h-3 text-emerald-400" />;
      case 'mp3': return <Music className="w-3 h-3 text-purple-400" />;
      default: return <FileText className="w-3 h-3 text-gray-400" />;
    }
  };

  const cardBase = "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/80 dark:border-zinc-800/80 p-3";

  const navContent = (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto hide-scrollbar p-3 gap-3 w-full">
      
      {/* CARD 1: Top Actions */}
      <div className={cn(cardBase, "flex flex-col gap-3")}>
        <div className={cn("flex items-center w-full", isCollapsed ? "justify-center" : "justify-between")}>
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-200 dark:border-blue-800 shadow-sm">
              O
            </div>
            {!isCollapsed && <span className="font-semibold text-lg tracking-tight text-gray-900 dark:text-gray-100">Okapi</span>}
          </div>
          {!isCollapsed && (
            <button onClick={onClose} className="md:hidden p-1.5 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className={cn("flex flex-col gap-2 w-full", isCollapsed ? "items-center" : "")}>
          <button
            onClick={() => {
              if (onNewChat) onNewChat();
              if (onClose) onClose();
            }}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]",
              isCollapsed ? "px-0 w-10 h-10 rounded-full" : "w-full px-4"
            )}
            title={isCollapsed ? "New Chat" : undefined}
          >
            <Plus className={isCollapsed ? "w-5 h-5" : "w-4 h-4"} />
            {!isCollapsed && <span>New Chat</span>}
          </button>

          {!isCollapsed && (
            <button
              onClick={() => setIsCreatingProject(!isCreatingProject)}
              className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-medium transition-all active:scale-[0.98]"
            >
              <FolderPlus className="w-3.5 h-3.5 text-purple-500" />
              <span>New Project</span>
            </button>
          )}
        </div>

        {/* New Project Form inline */}
        <AnimatePresence>
          {!isCollapsed && isCreatingProject && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-2.5 rounded-xl border border-purple-500/40 bg-purple-50/30 dark:bg-purple-900/10 space-y-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Project name..."
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject();
                    if (e.key === 'Escape') setIsCreatingProject(false);
                  }}
                  className="w-full bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500/30"
                />
                <div className="flex justify-end gap-1.5">
                  <button onClick={() => setIsCreatingProject(false)} className="px-2 py-1 rounded text-[11px] text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800">Cancel</button>
                  <button onClick={handleCreateProject} disabled={!newProjectTitle.trim()} className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-medium disabled:opacity-40">Create</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CARD 2: Search */}
      {!isCollapsed && (
        <div className={cn(cardBase, "p-2")}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search chats & projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-transparent border-none text-xs text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-0 transition-all"
            />
          </div>
        </div>
      )}

      {/* CARD 3: Recent Chats */}
      {groupedChats.length > 0 && (
        <div className={cn(cardBase, isCollapsed ? "p-2" : "p-3")}>
          {!isCollapsed && (
            <button 
              onClick={() => setRecentChatsExpanded(!recentChatsExpanded)} 
              className="flex w-full items-center justify-between group px-1 pb-2"
            >
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em]">Recent Chats</h3>
              <motion.div animate={{ rotate: recentChatsExpanded ? 180 : 0 }} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.div>
            </button>
          )}

          <AnimatePresence initial={false}>
            {(recentChatsExpanded || isCollapsed) && (
              <motion.div
                initial={isCollapsed ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                animate={isCollapsed ? { height: 'auto', opacity: 1 } : { height: 'auto', opacity: 1 }}
                exit={isCollapsed ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                className={cn("overflow-hidden", isCollapsed ? "flex flex-col items-center gap-2" : "space-y-3")}
              >
                {groupedChats.map((group) => (
                  <div key={group.label} className={isCollapsed ? "flex flex-col items-center gap-2 w-full" : ""}>
                    {!isCollapsed && <span className="text-[10px] font-semibold text-gray-300 dark:text-gray-600 uppercase tracking-wider px-1 mb-1 block">{group.label}</span>}
                    <div className={cn(isCollapsed ? "space-y-2" : "space-y-1")}>
                      {group.chats.map((chat) => {
                        const isActive = activeChatTitle?.toLowerCase() === chat.title.toLowerCase();
                        
                        if (isCollapsed) {
                          return (
                            <button
                              key={chat.id}
                              onClick={() => handleChatClick(chat)}
                              title={chat.title}
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold transition-all relative",
                                isActive
                                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-800"
                                  : "bg-gray-100 dark:bg-zinc-800/80 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                              )}
                            >
                              {chat.title.charAt(0).toUpperCase()}
                              {isActive && <div className="absolute right-0 top-0 w-2 h-2 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950" />}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={chat.id}
                            onClick={() => handleChatClick(chat)}
                            className={cn(
                              "relative flex items-center w-full pl-3 pr-2 py-1.5 rounded-lg text-left transition-all duration-150 group",
                              isActive
                                ? "bg-white dark:bg-zinc-800 shadow-sm border border-gray-200 dark:border-zinc-700"
                                : "bg-transparent hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 border border-transparent hover:border-gray-200/50 dark:hover:border-zinc-700/50"
                            )}
                          >
                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-gradient-to-b from-blue-500 to-violet-500" />}
                            <div className="flex flex-col flex-1 min-w-0 ml-1">
                              <span className={cn(
                                "text-xs font-medium truncate",
                                isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"
                              )}>{chat.title}</span>
                              <span className="text-[9px] text-gray-400 dark:text-gray-500">{chat.time}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* CARD 4: Projects */}
      {filteredProjects.length > 0 && (
        <div className={cn(cardBase, isCollapsed ? "p-2" : "p-3")}>
          {!isCollapsed && (
            <button 
              onClick={() => setProjectsExpanded(!projectsExpanded)} 
              className="flex w-full items-center justify-between group px-1 pb-2"
            >
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em]">Projects</h3>
              <motion.div animate={{ rotate: projectsExpanded ? 180 : 0 }} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.div>
            </button>
          )}

          <AnimatePresence initial={false}>
            {(projectsExpanded || isCollapsed) && (
              <motion.div
                initial={isCollapsed ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                animate={isCollapsed ? { height: 'auto', opacity: 1 } : { height: 'auto', opacity: 1 }}
                exit={isCollapsed ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                className={cn("overflow-hidden", isCollapsed ? "flex flex-col items-center gap-2" : "space-y-1")}
              >
                {filteredProjects.map((projTitle) => {
                  const isActive = activeProject === projTitle;
                  const color = "bg-purple-500"; // Can hash string to color if desired
                  
                  if (isCollapsed) {
                    return (
                      <button
                        key={projTitle}
                        title={projTitle}
                        onClick={() => onSelectProject?.(projTitle)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-colors border",
                          isActive ? "bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700" : "bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700 border-transparent"
                        )}
                      >
                        <FolderKanban className={cn("w-4 h-4", isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-500")} />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={projTitle}
                      onClick={() => onSelectProject?.(projTitle)}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left transition-all group",
                        isActive
                          ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50 shadow-sm"
                          : "text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 border border-transparent hover:border-gray-200/50 dark:hover:border-zinc-700/50"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", color)} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-medium truncate">{projTitle}</span>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!isCollapsed && searchQuery.trim() && groupedChats.length === 0 && filteredProjects.length === 0 && (
        <div className={cn(cardBase, "py-6 text-center")}>
          <p className="text-xs text-gray-400 dark:text-gray-500">No results for "{searchQuery}"</p>
        </div>
      )}

      {/* FOOTER: Theme + Settings + Collapse Toggles */}
      <div className={cn("mt-auto flex gap-2 pt-2 pb-4", isCollapsed ? "flex-col items-center" : "items-center px-1")}>
        
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Settings"
            className={cn(
              "flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md",
              isCollapsed ? "w-10 h-10 rounded-full" : "w-10 h-10 rounded-xl flex-shrink-0"
            )}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        )}

        {onToggleTheme && (
          <div className={cn("flex items-center", isCollapsed ? "w-10 h-10" : "flex-1")}>
            {isCollapsed ? (
              <button
                onClick={onToggleTheme}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-400 shadow-sm transition-all hover:shadow-md"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
              </button>
            ) : (
              <div className="relative flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-xl p-1 border border-gray-200 dark:border-zinc-800 shadow-sm w-full">
                <motion.div
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-gray-100 dark:bg-zinc-800 shadow-sm"
                  animate={{ x: isDarkMode ? 'calc(100% + 8px)' : '0%' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
                <button
                  onClick={() => { if (isDarkMode) onToggleTheme(); }}
                  className={cn(
                    "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                    !isDarkMode ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"
                  )}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
                <button
                  onClick={() => { if (!isDarkMode) onToggleTheme(); }}
                  className={cn(
                    "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                    isDarkMode ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"
                  )}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
              </div>
            )}
          </div>
        )}

        {onToggleCollapse && (
          <button 
            onClick={onToggleCollapse} 
            className={cn(
              "hidden md:flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md",
              isCollapsed ? "w-10 h-10 rounded-full" : "w-10 h-10 rounded-xl flex-shrink-0"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar wrapper (transparent) */}
      <motion.div 
        animate={{ width: isCollapsed ? 88 : 280 }} 
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:block fixed top-0 left-0 bottom-0 z-30 pointer-events-none"
      >
        <div className="w-full h-full pointer-events-auto">
           {navContent}
        </div>
      </motion.div>

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
