"use client";

import { Bookmark } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SaveSearchDialogProps {
  query: string;
  genomicBuild: string;
  onSave: (name: string, description?: string) => void | Promise<void>;
  disabled?: boolean;
}

export function SaveSearchDialog({
  query,
  genomicBuild,
  onSave,
  disabled,
}: SaveSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsLoading(true);
    try {
      await onSave(trimmedName, description.trim() || undefined);
      resetForm();
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  const canSave = name.trim().length > 0 && !isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={disabled || !query.trim()}
          className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Save this search"
        >
          <Bookmark className="h-5 w-5" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 bg-white shadow-2xl shadow-slate-900/10 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            Save Search
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Save this search to quickly access it later
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Query & Genome Info */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-slate-500 mb-1.5 block">
                Query
              </span>
              <div className="text-sm bg-slate-100 px-3 py-2.5 rounded-lg font-mono text-slate-900 truncate">
                {query}
              </div>
            </div>
            <div className="w-16 shrink-0">
              <span className="text-xs font-medium text-slate-500 mb-1.5 block">
                Build
              </span>
              <div className="text-sm bg-slate-100 px-3 py-2.5 rounded-lg font-mono text-slate-900 text-center">
                {genomicBuild.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label
              htmlFor="search-name"
              className="text-xs font-medium text-slate-500 mb-1.5 block"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="search-name"
              type="text"
              placeholder="e.g., BRCA1 variant analysis"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-colors"
            />
          </div>

          {/* Description Input */}
          <div>
            <label
              htmlFor="search-description"
              className="text-xs font-medium text-slate-500 mb-1.5 block"
            >
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="search-description"
              placeholder="Add notes about this search..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-colors resize-none"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Search"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
