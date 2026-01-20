'use client';

import { Fragment, useEffect, useState } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Search, X } from 'lucide-react';
import { useTypeahead } from '../hooks/use-typeahead';
import { SearchSuggestions } from './search-suggestions';
import { PivotExplorer } from './pivot-explorer';
import { useRouter } from 'next/navigation';
import type { EntityType, TypeaheadSuggestion } from '../types/api';
import { hasEntityPage } from '../utils/entity-routes';

interface GlobalSearchProps {
  /**
   * Controlled open state
   */
  open?: boolean;

  /**
   * Callback when dialog should close
   */
  onClose?: () => void;
}

export function GlobalSearch({ open: controlledOpen, onClose }: GlobalSearchProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [pivotEntity, setPivotEntity] = useState<{
    id: string;
    type: EntityType;
    name: string;
  } | null>(null);
  const router = useRouter();

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const { query, setQuery, results, isLoading, hasResults, clear } = useTypeahead({
    minLength: 2,
    debounce: 150,
    limit: 5,
    includeLinks: true,
    includePreview: true,
  });

  // Command-K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isControlled) {
          onClose?.();
        } else {
          setInternalOpen(true);
        }
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isControlled, onClose]);

  const handleClose = () => {
    clear();
    setPivotEntity(null);
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
  };

  const handleSelect = (suggestion: TypeaheadSuggestion) => {
    // Navigate to entity page if it has a dedicated page
    if (suggestion.url && hasEntityPage(suggestion.type)) {
      router.push(suggestion.url);
      handleClose();
    } else {
      // For entities without dedicated pages, show pivot explorer
      setPivotEntity({
        id: suggestion.id,
        type: suggestion.type,
        name: suggestion.name,
      });
    }
  };

  const handleClosePivot = () => {
    setPivotEntity(null);
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-sm" />
        </TransitionChild>

        {/* Dialog positioning */}
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="mx-auto max-w-3xl transform overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all">
              {/* Search input */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  className="h-12 w-full border-0 bg-transparent pl-11 pr-11 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  placeholder="Search genes, variants, diseases, drugs, pathways..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-500"
                    onClick={() => setQuery('')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Results */}
              {hasResults && results && (
                <SearchSuggestions
                  results={results}
                  query={query}
                  isLoading={isLoading}
                  onSelect={handleSelect}
                />
              )}

              {/* Loading state */}
              {isLoading && !hasResults && query.length >= 2 && (
                <div className="border-t border-slate-200 px-6 py-14 text-center text-sm text-slate-500">
                  Searching...
                </div>
              )}

              {/* No results */}
              {!isLoading && !hasResults && query.length >= 2 && (
                <div className="border-t border-slate-200 px-6 py-14 text-center">
                  <p className="text-sm text-slate-500">No results found</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try searching for genes, variants, diseases, drugs, or pathways
                  </p>
                </div>
              )}

              {/* Help text */}
              {!query && (
                <div className="border-t border-slate-200 px-6 py-8">
                  <div className="text-center">
                    <p className="text-sm text-slate-500">Quick search examples</p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <kbd className="rounded-md bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                        BRCA1
                      </kbd>
                      <kbd className="rounded-md bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                        rs7412
                      </kbd>
                      <kbd className="rounded-md bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                        Alzheimer
                      </kbd>
                      <kbd className="rounded-md bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                        Aspirin
                      </kbd>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer with shortcut hint */}
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-600 shadow-sm ring-1 ring-slate-200">
                        ↵
                      </kbd>
                      <span>to select</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-600 shadow-sm ring-1 ring-slate-200">
                        esc
                      </kbd>
                      <span>to close</span>
                    </div>
                  </div>
                  {results && (
                    <div className="text-slate-400">
                      {results.took_ms}ms · {results.total} results
                    </div>
                  )}
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>

      {/* Pivot Explorer - shown when user clicks entity without dedicated page */}
      {pivotEntity && (
        <PivotExplorer
          anchorId={pivotEntity.id}
          anchorType={pivotEntity.type}
          anchorName={pivotEntity.name}
          open={!!pivotEntity}
          onClose={handleClosePivot}
        />
      )}
    </Transition>
  );
}
