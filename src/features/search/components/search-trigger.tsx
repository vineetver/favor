'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { GlobalSearch } from './global-search';

interface SearchTriggerProps {
  /**
   * Button variant
   */
  variant?: 'default' | 'compact';

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function SearchTrigger({ variant = 'default', className = '' }: SearchTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const modifierKey = isMac ? '⌘' : 'Ctrl';

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 ${className}`}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        <GlobalSearch open={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:shadow ${className}`}
      >
        <Search className="h-5 w-5 flex-shrink-0 text-slate-400" />
        <span className="flex-1 truncate">Search genes, variants, diseases...</span>
        <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 sm:inline-block">
          {modifierKey}K
        </kbd>
      </button>

      <GlobalSearch open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
