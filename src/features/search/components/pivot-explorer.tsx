'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { X, FlaskConical, FileText, Heart, Sparkles, Map } from 'lucide-react';
import { usePivotSearch } from '../hooks/use-pivot-search';
import { useRouter } from 'next/navigation';
import type { EntityType, SearchEntity } from '../types/api';
import { Fragment } from 'react';

interface PivotExplorerProps {
  /**
   * The anchor entity to explore from
   */
  anchorId: string;
  anchorType: EntityType;
  anchorName: string;

  /**
   * Controlled open state
   */
  open?: boolean;

  /**
   * Callback when dialog should close
   */
  onClose?: () => void;
}

const ENTITY_CONFIG: Record<
  EntityType,
  {
    label: string;
    icon: typeof FlaskConical;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  genes: {
    label: 'Genes',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  variants: {
    label: 'Variants',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  diseases: {
    label: 'Diseases',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  drugs: {
    label: 'Drugs',
    icon: FlaskConical,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  pathways: {
    label: 'Pathways',
    icon: Map,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
};

function EntityCard({
  entity,
  onClick,
}: {
  entity: SearchEntity;
  onClick: (entity: SearchEntity) => void;
}) {
  const config = ENTITY_CONFIG[entity.type];
  const Icon = config.icon;
  const hasUrl = entity.url !== null && entity.url !== undefined;

  return (
    <button
      type="button"
      onClick={() => onClick(entity)}
      disabled={!hasUrl}
      className={`group relative flex w-full flex-col gap-2 rounded-lg border p-4 text-left transition-all ${
        config.borderColor
      } ${config.bgColor} ${
        hasUrl
          ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 rounded-lg p-2 bg-white border ${config.borderColor}`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${config.color} line-clamp-1`}>
            {entity.highlight ? (
              <span
                dangerouslySetInnerHTML={{
                  __html: entity.highlight.replace(
                    /<em>/g,
                    '<em class="font-bold not-italic underline">'
                  ),
                }}
              />
            ) : (
              entity.name
            )}
          </div>

          {entity.description && (
            <p className="mt-1 text-xs text-slate-600 line-clamp-2">{entity.description}</p>
          )}

          {entity.links && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {entity.links.gene_count !== undefined && entity.links.gene_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {entity.links.gene_count.toLocaleString()}
                </span>
              )}
              {entity.links.disease_count !== undefined && entity.links.disease_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {entity.links.disease_count.toLocaleString()}
                </span>
              )}
              {entity.links.drug_count !== undefined && entity.links.drug_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <FlaskConical className="h-3 w-3" />
                  {entity.links.drug_count.toLocaleString()}
                </span>
              )}
              {entity.links.variant_count !== undefined && entity.links.variant_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {entity.links.variant_count.toLocaleString()}
                </span>
              )}
              {entity.links.pathway_count !== undefined && entity.links.pathway_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Map className="h-3 w-3" />
                  {entity.links.pathway_count.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {!hasUrl && (
        <div className="absolute right-2 top-2">
          <span className="inline-flex items-center rounded-md bg-white border border-slate-200 px-2 py-1 text-xs text-slate-600">
            Coming soon
          </span>
        </div>
      )}
    </button>
  );
}

export function PivotExplorer({
  anchorId,
  anchorType,
  anchorName,
  open = true,
  onClose,
}: PivotExplorerProps) {
  const router = useRouter();
  const { results, isLoading, searchPivot } = usePivotSearch({
    limit: 20,
    expand: true,
  });

  const config = ENTITY_CONFIG[anchorType];
  const AnchorIcon = config.icon;

  useEffect(() => {
    if (open) {
      searchPivot(anchorId, anchorType);
    }
  }, [open, anchorId, anchorType, searchPivot]);

  const handleEntityClick = (entity: SearchEntity) => {
    if (entity.url) {
      router.push(entity.url);
      onClose?.();
    }
  };

  // Get entity types with results
  const entityTypes: EntityType[] = (
    ['genes', 'variants', 'diseases', 'drugs', 'pathways'] as EntityType[]
  ).filter((type) => results?.results[type] && results.results[type]!.length > 0);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose ?? (() => {})}>
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
            <DialogPanel className="mx-auto max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all">
              {/* Header */}
              <div className={`border-b ${config.borderColor} ${config.bgColor} px-6 py-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 bg-white border ${config.borderColor}`}>
                      <AnchorIcon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <div>
                      <h2 className={`text-lg font-semibold ${config.color}`}>{anchorName}</h2>
                      <p className="text-sm text-slate-600">
                        Exploring related {config.label.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-500"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Loading */}
              {isLoading && (
                <div className="px-6 py-12 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-200 border-t-primary"></div>
                  <p className="mt-4 text-sm text-slate-500">Finding related entities...</p>
                </div>
              )}

              {/* Results */}
              {!isLoading && results && entityTypes.length > 0 && (
                <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
                  {entityTypes.map((entityType) => {
                    const entities = results.results[entityType]!;
                    const typeConfig = ENTITY_CONFIG[entityType];

                    return (
                      <div key={entityType} className="border-b border-slate-200 last:border-0">
                        <div className="sticky top-0 z-10 bg-slate-50 px-6 py-3 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <typeConfig.icon className={`h-4 w-4 ${typeConfig.color}`} />
                            <span className="text-label">{typeConfig.label}</span>
                            <span className="text-xs text-slate-400">({entities.length})</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 p-6 md:grid-cols-2 lg:grid-cols-3">
                          {entities.map((entity) => (
                            <EntityCard
                              key={entity.id}
                              entity={entity}
                              onClick={handleEntityClick}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No results */}
              {!isLoading && results && entityTypes.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-slate-500">No related entities found</p>
                </div>
              )}

              {/* Footer */}
              {results && (
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-600 shadow-sm ring-1 ring-slate-200">
                        esc
                      </kbd>
                      <span>to close</span>
                    </div>
                    <div className="text-slate-400">
                      {results.took_ms}ms · {results.total} results
                    </div>
                  </div>
                </div>
              )}
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
