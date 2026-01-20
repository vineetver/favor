'use client';

import { Fragment, useState } from 'react';
import { Combobox, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import {
  FlaskConical,
  FileText,
  Heart,
  Sparkles,
  Map,
} from 'lucide-react';
import type { TypeaheadResponse, TypeaheadSuggestion, EntityType } from '../types/api';

interface SearchSuggestionsProps {
  results: TypeaheadResponse;
  query: string;
  isLoading?: boolean;
  onSelect: (suggestion: TypeaheadSuggestion) => void;
}

const ENTITY_CONFIG: Record<
  EntityType,
  {
    label: string;
    icon: typeof FlaskConical;
    color: string;
    bgColor: string;
  }
> = {
  genes: {
    label: 'Genes',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  variants: {
    label: 'Variants',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  diseases: {
    label: 'Diseases',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  drugs: {
    label: 'Drugs',
    icon: FlaskConical,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  pathways: {
    label: 'Pathways',
    icon: Map,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
};

function SuggestionItem({ suggestion }: { suggestion: TypeaheadSuggestion }) {
  const config = ENTITY_CONFIG[suggestion.type];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 px-6 py-3">
      {/* Icon */}
      <div className={`flex-shrink-0 rounded-lg p-2 ${config.bgColor}`}>
        <Icon className={`h-5 w-5 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name with highlighting */}
        <div className="text-sm font-medium text-slate-900">
          {suggestion.highlight ? (
            <span
              dangerouslySetInnerHTML={{
                __html: suggestion.highlight.replace(
                  /<em>/g,
                  '<em class="font-bold text-primary not-italic">'
                ),
              }}
            />
          ) : (
            suggestion.name
          )}
        </div>

        {/* Description */}
        {suggestion.description && (
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
            {suggestion.description}
          </p>
        )}

        {/* Links and preview */}
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
          {/* Link counts */}
          {suggestion.links && (
            <div className="flex items-center gap-3 text-slate-400">
              {suggestion.links.gene_count !== undefined &&
                suggestion.links.gene_count > 0 && (
                  <span>{suggestion.links.gene_count.toLocaleString()} genes</span>
                )}
              {suggestion.links.disease_count !== undefined &&
                suggestion.links.disease_count > 0 && (
                  <span>{suggestion.links.disease_count.toLocaleString()} diseases</span>
                )}
              {suggestion.links.drug_count !== undefined &&
                suggestion.links.drug_count > 0 && (
                  <span>{suggestion.links.drug_count.toLocaleString()} drugs</span>
                )}
              {suggestion.links.variant_count !== undefined &&
                suggestion.links.variant_count > 0 && (
                  <span>{suggestion.links.variant_count.toLocaleString()} variants</span>
                )}
              {suggestion.links.pathway_count !== undefined &&
                suggestion.links.pathway_count > 0 && (
                  <span>{suggestion.links.pathway_count.toLocaleString()} pathways</span>
                )}
            </div>
          )}

          {/* Preview entities */}
          {suggestion.preview && (
            <>
              {suggestion.preview.genes && suggestion.preview.genes.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">→</span>
                  <span className="text-purple-600">
                    {suggestion.preview.genes.slice(0, 3).join(', ')}
                  </span>
                </div>
              )}
              {suggestion.preview.diseases && suggestion.preview.diseases.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">→</span>
                  <span className="text-red-600">
                    {suggestion.preview.diseases.slice(0, 3).join(', ')}
                  </span>
                </div>
              )}
              {suggestion.preview.drugs && suggestion.preview.drugs.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">→</span>
                  <span className="text-green-600">
                    {suggestion.preview.drugs.slice(0, 3).join(', ')}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      {!suggestion.url && (
        <div className="flex-shrink-0">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
            Coming soon
          </span>
        </div>
      )}
    </div>
  );
}

export function SearchSuggestions({
  results,
  query,
  isLoading,
  onSelect,
}: SearchSuggestionsProps) {
  const [selected, setSelected] = useState<TypeaheadSuggestion | null>(null);

  // Get all entity types with results
  const entityTypes: EntityType[] = (
    ['genes', 'variants', 'diseases', 'drugs', 'pathways'] as EntityType[]
  ).filter((type) => results.suggestions[type] && results.suggestions[type]!.length > 0);

  if (entityTypes.length === 0) {
    return null;
  }

  const handleSelect = (suggestion: TypeaheadSuggestion | null) => {
    if (suggestion) {
      onSelect(suggestion);
    }
  };

  return (
    <Combobox value={selected} onChange={handleSelect}>
      <ComboboxOptions
        static
        className="max-h-[calc(100vh-20rem)] overflow-y-auto border-t border-slate-200"
      >
        {entityTypes.map((entityType) => {
          const suggestions = results.suggestions[entityType]!;
          const config = ENTITY_CONFIG[entityType];

          return (
            <Fragment key={entityType}>
              {/* Section header */}
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-6 py-2">
                <div className="flex items-center gap-2">
                  <config.icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-label">{config.label}</span>
                  <span className="text-xs text-slate-400">({suggestions.length})</span>
                </div>
              </div>

              {/* Suggestions */}
              {suggestions.map((suggestion) => (
                <ComboboxOption
                  key={suggestion.id}
                  value={suggestion}
                  className="cursor-pointer ui-active:bg-slate-50"
                >
                  <SuggestionItem suggestion={suggestion} />
                </ComboboxOption>
              ))}
            </Fragment>
          );
        })}
      </ComboboxOptions>
    </Combobox>
  );
}
