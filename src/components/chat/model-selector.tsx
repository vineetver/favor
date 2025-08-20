'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { models, getReasoningModels, getStandardModels, type ChatModel } from '@/lib/ai/models';
import { cn } from '@/lib/utils/general';
import { Check, ChevronDown, Brain, Zap, Globe, Clock } from 'lucide-react';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Badge } from '@/components/ui/badge';

interface ModelSelectorProps {
  selectedModelId: string;
  className?: string;
}

export function ModelSelector({
  selectedModelId,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] = useOptimistic(selectedModelId);

  // All models are available - no entitlements
  const availableModels = models.filter(model => !model.disabled);
  
  // Group available models by type
  const standardModels = availableModels.filter(model => !model.reasoning);
  const reasoningModels = availableModels.filter(model => model.reasoning);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === optimisticModelId),
    [optimisticModelId],
  );

  const getModelIcon = (model: ChatModel) => {
    if (model.reasoning) return <Brain className="w-4 h-4" />;
    if (model.id.includes('nano') || model.id.includes('mini')) return <Zap className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  const getModelBadges = (model: ChatModel) => {
    const badges = [];
    
    if (model.reasoning) {
      badges.push(
        <Badge key="reasoning" variant="secondary" className="text-xs">
          <Brain className="w-3 h-3 mr-1" />
          Reasoning
        </Badge>
      );
    }
    
    if (model.context && model.context > 100000) {
      badges.push(
        <Badge key="context" variant="outline" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          {(model.context / 1000).toFixed(0)}K
        </Badge>
      );
    }
    
    return badges;
  };

  const handleModelSelect = (modelId: string) => {
    setOpen(false);
    
    startTransition(() => {
      setOptimisticModelId(modelId);
      saveChatModelAsCookie(modelId);
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          data-testid="model-selector"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs gap-1"
        >
          {getModelIcon(selectedModel!)}
          {selectedModel?.label}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Choose AI Model
        </DropdownMenuLabel>
        
        {/* Standard Models */}
        {standardModels.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-medium">
              Standard Models
            </DropdownMenuLabel>
            {standardModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                data-testid={`model-selector-item-${model.id}`}
                onSelect={() => handleModelSelect(model.id)}
                data-active={model.id === optimisticModelId}
                className="focus:bg-accent/50"
                disabled={model.disabled}
              >
                <div className="flex items-center justify-between w-full gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {getModelIcon(model)}
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="font-medium text-sm">{model.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {model.description}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {getModelBadges(model)}
                      </div>
                    </div>
                  </div>
                  
                  {model.id === optimisticModelId && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Reasoning Models */}
        {reasoningModels.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium">
              Advanced Reasoning
            </DropdownMenuLabel>
            {reasoningModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                data-testid={`model-selector-item-${model.id}`}
                onSelect={() => handleModelSelect(model.id)}
                data-active={model.id === optimisticModelId}
                className="focus:bg-accent/50"
                disabled={model.disabled}
              >
                <div className="flex items-center justify-between w-full gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {getModelIcon(model)}
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="font-medium text-sm">{model.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {model.description}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {getModelBadges(model)}
                      </div>
                    </div>
                  </div>
                  
                  {model.id === optimisticModelId && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Models optimized for genomics analysis
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}