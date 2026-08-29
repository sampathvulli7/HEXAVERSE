import React from 'react';
import { cn } from '../lib/utils';

interface CitationChipProps {
  number: number;
  onClick: () => void;
}

export function CitationChip({ number, onClick }: CitationChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center px-1.5 py-0.5 mx-1 translate-y-[-2px]",
        "text-xs font-semibold rounded-full cursor-pointer transition-all duration-200",
        "bg-gradient-to-r from-blue-100 to-violet-100 text-blue-700",
        "hover:from-blue-200 hover:to-violet-200 hover:shadow-sm active:scale-95"
      )}
    >
      {number}
    </button>
  );
}
