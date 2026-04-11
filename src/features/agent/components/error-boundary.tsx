"use client";

import { Button } from "@shared/components/ui/button";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  error: Error | null;
}

export class AgentErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AgentErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertCircleIcon className="size-8 text-destructive/60" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {this.props.fallbackLabel ?? "Something went wrong"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => this.setState({ error: null })}
        >
          <RefreshCwIcon className="size-3.5" />
          Try again
        </Button>
      </div>
    );
  }
}
