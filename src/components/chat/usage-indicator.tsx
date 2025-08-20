'use client';

import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

interface UsageIndicatorProps {
  className?: string;
  compact?: boolean;
}

export function UsageIndicator({ 
  className = '', 
  compact = false 
}: UsageIndicatorProps) {

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-500">Unlimited</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 border rounded-lg bg-card ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">Usage</h4>
        <Badge variant="outline" className="text-xs">
          No limits
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          <span>Unlimited messages and file uploads</span>
        </div>
      </div>
    </div>
  );
}

// Hook for usage tracking - simplified version
export function useUsageTracking() {
  return {
    usage: null,
    limits: { canSendMessage: true, canUploadFile: true },
    entitlements: null,
  };
}