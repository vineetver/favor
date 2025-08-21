'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ToolCallErrorBoundaryProps {
  children: React.ReactNode;
  toolName?: string;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ToolCallErrorBoundary extends React.Component<
  ToolCallErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ToolCallErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Tool call error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <motion.div
          className="border rounded-lg p-4 bg-destructive/10 border-destructive/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2 text-sm font-medium mb-2 text-destructive">
            <AlertTriangle size={14} />
            <span>{this.props.toolName || 'Tool'} Error</span>
          </div>
          <div className="text-destructive text-sm mb-3">
            {this.state.error?.message || 'An unexpected error occurred during tool execution'}
          </div>
          {this.props.onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                this.props.onRetry?.();
              }}
              className="h-8 text-xs"
            >
              <RefreshCw size={12} className="mr-1" />
              Retry Tool
            </Button>
          )}
        </motion.div>
      );
    }

    return this.props.children;
  }
}

export function withToolCallErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  toolName?: string
) {
  return function WrappedComponent(props: P & { onRetry?: () => void }) {
    return (
      <ToolCallErrorBoundary toolName={toolName} onRetry={props.onRetry}>
        <Component {...props} />
      </ToolCallErrorBoundary>
    );
  };
}