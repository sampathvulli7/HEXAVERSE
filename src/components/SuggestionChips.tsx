import React from 'react';

export function SuggestionChips({ onSelect }: { onSelect: (q: string) => void }) {
  const suggestions = [
    "Show the report on international development 2024",
    "Find the screenshot from 14:32",
    "Summarize the product roadmap goals",
    "What did they say about predictive modeling?"
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 overflow-x-auto hide-scrollbar">
      <div className="flex items-center gap-2 px-1">
        {suggestions.map((s, i) => (
          <button 
            key={i}
            onClick={() => onSelect(s)}
            className="whitespace-nowrap px-4 py-2 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:bg-zinc-900/50 text-sm text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
