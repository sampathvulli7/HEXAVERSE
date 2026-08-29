import React, { useState } from 'react';
import type { Citation, IngestedFile } from '../lib/mockData';
import { Play, SkipBack, SkipForward, Pause } from 'lucide-react';
import { cn } from '../lib/utils';

export function AudioPlayerTab({ citation, file }: { citation: Citation, file: IngestedFile }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTime, setActiveTime] = useState<string | null>(citation.timestamp || '14:22');

  const transcript = [
    { time: '14:20', text: "So looking at Q3, we saw some really interesting patterns." },
    { time: '14:22', text: "...so as we push these predictive models, upgrading our backend infrastructure scaling is our number one priority for this quarter..." },
    { time: '14:25', text: "We need to make sure the database can handle the load." },
    { time: '14:30', text: "Exactly, the latency needs to stay under 50ms." }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-zinc-900/50 rounded-b-xl overflow-hidden">
      <div className="p-6 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mb-4">
          <Play className="w-8 h-8 ml-1" />
        </div>
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{file.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-6">Snippet at {activeTime}</p>
        
        <div className="flex items-center gap-6">
          <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500"><SkipBack className="w-6 h-6" /></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-md transition-all">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
          </button>
          <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500"><SkipForward className="w-6 h-6" /></button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">Transcript</h4>
        <div className="flex flex-col gap-2">
          {transcript.map((t, i) => (
            <div 
              key={i} 
              onClick={() => setActiveTime(t.time)}
              className={cn(
                "p-3 rounded-xl cursor-pointer transition-colors border",
                activeTime === t.time ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-white dark:bg-zinc-900 border-transparent hover:border-gray-200 dark:border-zinc-700"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1",
                activeTime === t.time ? "text-blue-600" : "text-gray-400 dark:text-gray-500"
              )}>{t.time}</div>
              <div className={cn(
                "text-sm",
                activeTime === t.time ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400 dark:text-gray-500"
              )}>{t.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
