import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Mic, ArrowUp, Search, FileText, Image as ImageIcon, Music, File, X, UploadCloud, CheckCircle2, Loader2, MicOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from '../lib/motion';
import type { IngestedFile } from '../lib/mockData';
import { suggest } from '../lib/api';

export interface AttachedFile {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'docx' | 'png' | 'mp3';
  status: 'extracting' | 'embedding' | 'indexing' | 'ready';
  fileObj?: File;
}

interface CommandBoxProps {
  onSearch: (query: string, attachments?: AttachedFile[]) => void;
  isChatMode: boolean;
  onFilesAttached?: (files: IngestedFile[]) => void;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
  project?: string;
}

export function CommandBox({ onSearch, isChatMode, onFilesAttached, selectedModel = "qwen2.5:3b", onSelectModel, project = "Default" }: CommandBoxProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const suggestSeqRef = useRef(0);

  // Live type-ahead: debounce keystrokes, drop out-of-order responses so a
  // slow earlier request can never overwrite results for the current text.
  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const seq = ++suggestSeqRef.current;
    const timer = setTimeout(() => {
      suggest(trimmed, project)
        .then((results) => {
          if (suggestSeqRef.current === seq) setSuggestions(results);
        })
        .catch(() => { /* suggestions are best-effort */ });
    }, 150);
    return () => clearTimeout(timer);
  }, [input, project]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const toggleMic = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } else {
      // Fallback voice simulation
      setIsListening(true);
      setTimeout(() => {
        setInput("Summarize key findings from the Q3 earnings report");
        setIsListening(false);
      }, 1500);
    }
  };

  const processFiles = (fileList: File[]) => {
    const newAttachments: AttachedFile[] = fileList.map((f, i) => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      let type: 'pdf' | 'docx' | 'png' | 'mp3' = 'pdf';
      if (ext === 'docx') type = 'docx';
      else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') type = 'png';
      else if (ext === 'mp3' || ext === 'wav' || ext === 'm4a') type = 'mp3';

      const sizeStr = f.size > 1024 * 1024 
        ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(f.size / 1024)} KB`;

      return {
        id: `attach-${Date.now()}-${i}`,
        name: f.name,
        size: sizeStr,
        type,
        status: 'extracting',
        fileObj: f,
      };
    });

    setAttachments(prev => [...prev, ...newAttachments]);

    newAttachments.forEach(att => {
      setTimeout(() => {
        setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, status: 'embedding' } : a));
      }, 500);

      setTimeout(() => {
        setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, status: 'indexing' } : a));
      }, 1000);

      setTimeout(() => {
        setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, status: 'ready' } : a));
        if (onFilesAttached) {
          onFilesAttached([{
            id: att.id,
            name: att.name,
            type: att.type,
            size: att.size
          }]);
        }
      }, 1500);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = () => {
    if (input.trim() || attachments.length > 0) {
      onSearch(input.trim() || `Search across attached files (${attachments.map(a => a.name).join(', ')})`, attachments);
      setInput('');
      setAttachments([]);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'docx': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'png': return <ImageIcon className="w-4 h-4 text-emerald-500" />;
      case 'mp3': return <Music className="w-4 h-4 text-purple-500" />;
      default: return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div 
      className={cn(
        "relative w-full max-w-3xl mx-auto transition-all duration-500 z-30",
        isChatMode ? "fixed bottom-6 left-0 right-0 px-4 md:pl-72 md:pr-4 mx-auto max-w-4xl" : "mt-8"
      )}
    >
      <motion.div 
        layout
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative bg-white dark:bg-zinc-900 shadow-xl border overflow-hidden transition-all duration-300 mx-auto",
          isChatMode ? "rounded-[2rem] w-full" : "rounded-3xl w-full",
          isDragging 
            ? "border-blue-500 ring-4 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20" 
            : isFocused && !isChatMode 
              ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-500/10 shadow-2xl" 
              : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700"
        )}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept=".pdf,.docx,.png,.mp3,.jpg,.jpeg,.webp,.wav"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <AnimatePresence>
          {isDragging && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-blue-600/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center text-white p-6"
            >
              <UploadCloud className="w-10 h-10 mb-2 animate-bounce" />
              <p className="font-semibold text-lg">Drop files here to attach</p>
              <p className="text-xs text-blue-100 mt-1">Supports PDF, DOCX, PNG, MP3</p>
            </motion.div>
          )}
        </AnimatePresence>

        {attachments.length > 0 && (
          <div className="px-6 pt-4 pb-1 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <motion.div
                key={att.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shadow-sm",
                  att.status === 'ready'
                    ? "bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-gray-200"
                    : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                )}
              >
                {getFileIcon(att.type)}
                <span className="max-w-[140px] truncate">{att.name}</span>
                <span className="text-[10px] opacity-60">({att.size})</span>

                {att.status !== 'ready' ? (
                  <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {att.status}
                  </span>
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
                )}

                <button 
                  onClick={() => removeAttachment(att.id)}
                  className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={isListening ? "Listening... Speak now" : "Ask anything or drag & drop documents, images, and audio..."}
          className="w-full bg-transparent border-none outline-none resize-none px-6 pt-5 pb-2 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-lg leading-relaxed min-h-[64px]"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            } else if (e.key === 'Tab' && suggestions.length > 0 && input.trim()) {
              // Tab completes with the top suggestion, like a browser omnibox
              e.preventDefault();
              setInput(suggestions[0]);
            } else if (e.key === 'Escape') {
              setSuggestions([]);
            }
          }}
        />
        
        <div className="px-4 pb-4 pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              title="Attach files (PDF, DOCX, PNG, MP3)"
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={toggleMic}
              title={isListening ? "Stop listening" : "Start voice input"}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                isListening 
                  ? "bg-red-500 text-white animate-pulse shadow-md" 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800"
              )}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {onSelectModel && (
              <select 
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                className="hidden md:block bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 text-xs font-medium px-2 py-1.5 rounded-lg border-none focus:ring-0 outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                title="Select Model"
              >
                <option value="qwen2.5:3b">qwen2.5:3b (Offline)</option>
                <option value="meta/llama-3.2-11b-vision-instruct">meta/llama-3.2-11b-vision-instruct (Online)</option>
              </select>
            )}
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && attachments.length === 0}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm",
                (input.trim() || attachments.length > 0)
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
              )}
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Live type-ahead suggestions (from past queries + indexed content).
          Opens downward in hero mode, upward when the box is docked at the
          bottom in chat mode. */}
      <AnimatePresence>
        {isFocused && input.trim().length >= 2 && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: isChatMode ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isChatMode ? 10 : -10 }}
            className={cn(
              "absolute left-0 right-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 py-2 z-50",
              isChatMode ? "bottom-full mb-2 mx-4 md:ml-72" : "top-full mt-2"
            )}
          >
            {suggestions.map((s, i) => {
              const startsWithTyped = s.toLowerCase().startsWith(input.trim().toLowerCase());
              const typedLen = input.trim().length;
              return (
                <div
                  key={i}
                  // onMouseDown so it fires before the textarea's onBlur
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setInput(s);
                    textareaRef.current?.focus();
                  }}
                  className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800/60 cursor-pointer flex items-center gap-3 text-gray-700 dark:text-gray-300"
                >
                  <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="truncate">
                    {startsWithTyped ? (
                      <>
                        <span>{s.slice(0, typedLen)}</span>
                        <span className="font-semibold">{s.slice(typedLen)}</span>
                      </>
                    ) : (
                      <span>{s}</span>
                    )}
                  </span>
                </div>
              );
            })}
            <div className="px-4 pt-1.5 text-[10px] text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-zinc-800 mt-1">
              Tab to complete · Esc to dismiss
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
