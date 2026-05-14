"use client";

import { AlertCircle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Scoped error boundary for a single render section (e.g. one modality).
 * Prevents one bad modality from blanking the whole variant view.
 */
export class ModalityErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ModalityErrorBoundary:${this.props.label}]`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex items-center gap-2 rounded border border-dashed border-destructive/40 px-3 py-2 text-xs text-muted-foreground">
        <AlertCircle className="size-3.5 text-destructive/70 shrink-0" />
        <span className="truncate">
          Couldn't render {this.props.label}: {this.state.error.message}
        </span>
      </div>
    );
  }
}
