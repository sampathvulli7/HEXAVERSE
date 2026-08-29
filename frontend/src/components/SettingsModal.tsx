import { X, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100 font-semibold">
                <Settings2 className="w-5 h-5 text-blue-500" />
                <h2>System Settings</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Configuration</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Adjust your LLM models, vector chunk sizes, and API keys here.</p>
                
                <div className="space-y-4 opacity-50">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">LLM Base URL</label>
                    <input 
                      type="text" 
                      disabled 
                      value="http://localhost:11434/v1" 
                      className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none"
                    />
                    <p className="mt-1 text-[10px] text-gray-500">Currently configured for Ollama Defaults (qwen2.5:3b)</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hugging Face Token (Embedding/TTS)</label>
                    <input 
                      type="password" 
                      disabled 
                      value="****************" 
                      className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800/80">
                 <button onClick={onClose} className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors">
                    Close
                 </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
