"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EnhancedTissueTrackSelector } from "./enhanced-tissue-track-selector";

interface TissueTrackSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enabledTracks: string[];
  onTrackToggle: (trackId: string) => void;
  onBatchToggle?: (trackIds: string[], enabled: boolean) => void;
}

export function TissueTrackSelectorDialog({
  isOpen,
  onClose,
  enabledTracks,
  onTrackToggle,
  onBatchToggle,
}: TissueTrackSelectorDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Tissue-Specific Track Selector
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
          <EnhancedTissueTrackSelector
            enabledTracks={enabledTracks}
            onTrackToggle={onTrackToggle}
            onBatchToggle={onBatchToggle}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
