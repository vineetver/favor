"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark } from "lucide-react";

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
  disabled 
}: SaveSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (name.trim()) {
      setIsLoading(true);
      try {
        await onSave(name.trim(), description.trim() || undefined);
        setName("");
        setDescription("");
        setOpen(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setName("");
      setDescription("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || !query.trim()}
          className="h-8 w-8"
          aria-label="Save this search"
        >
          <Bookmark className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Search</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Save this search to quickly access it later
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Query</Label>
            <div className="mt-1 text-sm bg-muted p-3 rounded-md font-mono">
              {query}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Genome Build</Label>
            <div className="mt-1 text-sm bg-muted p-3 rounded-md font-mono">
              {genomicBuild.toUpperCase()}
            </div>
          </div>

          <div>
            <Label htmlFor="search-name">Name *</Label>
            <Input
              id="search-name"
              placeholder="Enter a name for this search"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="search-description">Description</Label>
            <Textarea
              id="search-description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? "Saving..." : "Save Search"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}