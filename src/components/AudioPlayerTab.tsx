import React, { useState, useEffect, useRef } from 'react';
import type { Citation, IngestedFile } from '../lib/mockData';
import { Play, SkipBack, SkipForward, Pause } from 'lucide-react';
import { cn } from '../lib/utils';

export function AudioPlayerTab({ citation, file, triggerTime }: { citation: Citation, file: IngestedFile, triggerTime: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTime, setActiveTime] = useState<string | null>(citation.timestamp || '14:22');
  const [highlightFlash, setHighlightFlash] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  const transcript = [
    { time: '14:20', text: "So looking at Q3, we saw some really interesting patterns." },
    { time: '14:22', text: "...so as we push these predictive models, upgrading our backend infrastructure scaling is our number one priority for this quarter..." },
    { time: '14:25', text: "We need to make sure the database can handle the load." },
    { time: '14:30', text: "Exactly, the latency needs to stay under 50ms." },
    { time: '14:35', text: "What about the analytics pipeline?" },
    { time: '14:40', text: "That's tracking well, but we need to verify the new vector DB." },
    { time: '14:45', text: "Okay, let's schedule a follow-up for tomorrow." }
  ];

  useEffect(() => {
    if (citation.timestamp) {
      setActiveTime(citation.timestamp);
    }
    
    // Flash the highlight when triggerTime changes (same citation clicked again)
    setHighlightFlash(true);
    const timer = setTimeout(() => setHighlightFlash(false), 1500);
    
    // Scroll the active item into view
    if (activeItemRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeItemRef.current;
      
      const scrollPos = element.offsetTop - container.offsetTop - (container.clientHeight / 2) + (element.clientHeight / 2);
      
      container.scrollTo({
        top: scrollPos,
        behavior: 'smooth'
      });
    }
    
    return () => clearTimeout(timer);
  }, [triggerTime, citation.timestamp, citation.id]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-zinc-900/50 rounded-b-xl overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800">
      <div className="p-6 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
          <Play className="w-8 h-8 ml-1" />
        </div>
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{file.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Seeked to {activeTime}</p>
        
        <div className="flex items-center gap-6">
          <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"><SkipBack className="w-6 h-6" /></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-md transition-all active:scale-95">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
          </button>
          <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"><SkipForward className="w-6 h-6" /></button>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 relative scroll-smooth">
        <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">Transcript</h4>
        <div className="flex flex-col gap-2 pb-10">
          {transcript.map((t, i) => {
            const isActive = activeTime === t.time;
            return (
              <div 
                key={i} 
                ref={isActive ? activeItemRef : null}
                onClick={() => setActiveTime(t.time)}
                className={cn(
                  "p-3 rounded-xl cursor-pointer transition-all duration-500 border",
                  isActive 
                    ? highlightFlash 
                      ? "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 shadow-sm"
                      : "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm" 
                    : "bg-white dark:bg-zinc-900 border-transparent hover:border-gray-200 dark:hover:border-zinc-700"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1 transition-colors duration-300",
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                )}>{t.time}</div>
                <div className={cn(
                  "text-sm transition-colors duration-300",
                  isActive ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-gray-400"
                )}>{t.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
