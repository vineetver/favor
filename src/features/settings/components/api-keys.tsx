"use client";

import { cn } from "@infra/utils";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { useAuth } from "@shared/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock,
  Copy,
  Key,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createApiKey, deleteApiKey, listApiKeys } from "../api";
import type { CreateApiKeyResponse } from "../types";

// ── Relative time formatting ──────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function expiresIn(dateStr: string): { text: string; urgent: boolean } {
  const ms = new Date(dateStr).getTime() - Date.now();
  if (ms <= 0) return { text: "Expired", urgent: true };
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return { text: "Expires today", urgent: true };
  if (days <= 7) return { text: `${days}d left`, urgent: true };
  if (days <= 30) return { text: `${days}d left`, urgent: false };
  return { text: `${days}d left`, urgent: false };
}

// ── Expiry options ────────────────────────────────────────────────────────

const EXPIRY_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "1 year", value: 365 },
  { label: "No expiry", value: 0 },
] as const;

// ── Create key dialog ─────────────────────────────────────────────────────

function CreateKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [expiryDays, setExpiryDays] = useState(90);
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      setCreatedKey(data);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create API key");
    },
  });

  const handleCreate = useCallback(() => {
    if (!label.trim()) return;
    mutation.mutate({
      label: label.trim(),
      expires_in_days: expiryDays || undefined,
    });
  }, [label, expiryDays, mutation]);

  const handleCopy = useCallback(() => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey.token);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [createdKey]);

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        // Reset state when closing
        setTimeout(() => {
          setLabel("");
          setExpiryDays(90);
          setCreatedKey(null);
          setCopied(false);
          mutation.reset();
        }, 200);
      }
      onOpenChange(open);
    },
    [onOpenChange, mutation],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Generate a key for programmatic access to protected endpoints.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label
                  htmlFor="key-label"
                  className="text-sm font-medium text-foreground"
                >
                  Label
                </label>
                <Input
                  id="key-label"
                  placeholder="e.g. my-pipeline, jupyter-notebook"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Expiration
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExpiryDays(opt.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium",
                        "border transition-all duration-150",
                        expiryDays === opt.value
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!label.trim() || mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
                Generate
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Copy your key now. You won't be able to see it again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg",
                  "bg-muted/50 border border-border",
                  "font-mono text-sm break-all",
                )}
              >
                <span className="flex-1 select-all">{createdKey.token}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed">
                  Store this key securely. It provides full access to your
                  account via the API and cannot be retrieved after you close
                  this dialog.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleCopy} className="w-full sm:w-auto">
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied" : "Copy Key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Delete confirmation dialog ────────────────────────────────────────────

function DeleteKeyDialog({
  keyId,
  keyLabel,
  open,
  onOpenChange,
}: {
  keyId: string;
  keyLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteApiKey(keyId),
    onSuccess: () => {
      toast.success(`API key "${keyLabel}" revoked`);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to revoke key");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Revoke API Key</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke{" "}
            <span className="font-semibold text-foreground">{keyLabel}</span>?
            Any scripts using this key will stop working immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Revoke
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function ApiKeysSection() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeys,
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage keys for programmatic access to the FAVOR API.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="w-4 h-4" />
          New Key
        </Button>
      </div>

      {/* Key list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : !keys?.length ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center py-16",
            "rounded-xl border border-dashed border-border",
          )}
        >
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No API keys yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Create a key to access the API from scripts and notebooks.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Create your first key
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const expiry = key.expires_at
              ? expiresIn(key.expires_at)
              : null;
            const isExpired = expiry?.text === "Expired";

            return (
              <div
                key={key.id}
                className={cn(
                  "group flex items-center gap-4 p-4 rounded-xl border",
                  "transition-all duration-150",
                  isExpired
                    ? "border-destructive/30 bg-destructive/5 opacity-70"
                    : "border-border hover:border-border/80 hover:shadow-sm bg-background",
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                    isExpired
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <Key className="w-5 h-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {key.label}
                    </span>
                    {isExpired && (
                      <Badge variant="destructive" className="text-[10px]">
                        Expired
                      </Badge>
                    )}
                    {expiry && expiry.urgent && !isExpired && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-600 border-amber-300"
                      >
                        {expiry.text}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                      {key.token_prefix}...
                    </code>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {timeAgo(key.created_at)}
                    </span>
                    {key.last_used_at && (
                      <span>Last used {timeAgo(key.last_used_at)}</span>
                    )}
                    {expiry && !expiry.urgent && (
                      <span>{expiry.text}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "shrink-0 h-8 w-8 text-muted-foreground",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:text-destructive hover:bg-destructive/10",
                  )}
                  onClick={() =>
                    setDeleteTarget({ id: key.id, label: key.label })
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Usage hint */}
      {keys && keys.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium text-foreground mb-2">Usage</p>
          <code className="block text-xs font-mono text-muted-foreground bg-muted rounded-md p-3 overflow-x-auto">
            curl -H &quot;Authorization: Bearer favor_sk_...&quot;{" "}
            {process.env.NEXT_PUBLIC_API_URL || "/api/v1"}/agent/sessions
          </code>
        </div>
      )}

      <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} />

      {deleteTarget && (
        <DeleteKeyDialog
          keyId={deleteTarget.id}
          keyLabel={deleteTarget.label}
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
