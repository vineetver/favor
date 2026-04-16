"use client";

import { Button } from "@shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BatchApiError,
  type CohortShare,
  type CreateShareResponse,
  createCohortShare,
  listCohortShares,
  revokeCohortShare,
} from "../api";
import {
  getShareToken,
  removeShareToken,
  saveShareToken,
} from "../lib/share-token-storage";

interface ShareDialogProps {
  cohortId: string;
}

const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;

function buildShareUrl(cohortId: string, token: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/batch-annotation/jobs/${encodeURIComponent(cohortId)}/analytics?share=${token}`;
}

/**
 * Row in the existing-shares list. Gets the full token only for shares the
 * owner minted on this browser (resolved via localStorage by share_id) —
 * backend never re-emits it. Without the full token the row can only be
 * revoked, not re-copied.
 */
function ShareRow({
  share,
  cohortId,
  onRevoke,
  isRevoking,
}: {
  share: CohortShare;
  cohortId: string;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}) {
  const expired =
    share.expires_at && new Date(share.expires_at).getTime() < Date.now();
  const revoked = !!share.revoked_at;
  const active = !expired && !revoked;

  const statusLabel = revoked
    ? "Revoked"
    : expired
      ? "Expired"
      : share.expires_at
        ? `Expires ${new Date(share.expires_at).toLocaleDateString()}`
        : "No expiry";

  const storedToken = active ? getShareToken(share.share_id) : null;
  const [rowCopied, setRowCopied] = useState(false);

  const handleRowCopy = useCallback(async () => {
    if (!storedToken) return;
    try {
      await navigator.clipboard.writeText(
        buildShareUrl(cohortId, storedToken),
      );
      setRowCopied(true);
      toast.success("Share link copied");
      setTimeout(() => setRowCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [storedToken, cohortId]);

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-mono text-foreground truncate">
          {share.token_prefix}…
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{statusLabel}</p>
      </div>
      {active && storedToken && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRowCopy}
          title="Copy share URL"
        >
          {rowCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          Copy
        </Button>
      )}
      {active && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isRevoking}
          onClick={() => onRevoke(share.share_id)}
          className="text-destructive hover:text-destructive"
        >
          {isRevoking ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Revoke
        </Button>
      )}
    </div>
  );
}

export function ShareDialog({ cohortId }: ShareDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(DEFAULT_DAYS);
  const [created, setCreated] = useState<CreateShareResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const sharesKey = useMemo(
    () => ["cohort-shares", cohortId] as const,
    [cohortId],
  );

  const listQuery = useQuery({
    queryKey: sharesKey,
    queryFn: () => listCohortShares(cohortId),
    enabled: open,
    // Always hit the server when the dialog opens — creating/revoking from
    // other tabs should never stale-cache this list.
    staleTime: 0,
    refetchOnMount: "always",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createCohortShare(cohortId, { expires_in_days: expiresInDays }),
    onSuccess: async (res) => {
      // Persist the raw token so the owner can re-copy the URL from the list
      // after closing the dialog. Cleared on revoke and on logout.
      saveShareToken(res.share_id, res.token);
      setCreated(res);
      setCopied(false);
      // Explicit refetch (not just invalidate) so the list reflects the
      // new share before the user sees the URL panel.
      await queryClient.refetchQueries({ queryKey: sharesKey });
    },
    onError: (err) => {
      const message =
        err instanceof BatchApiError
          ? err.status === 409
            ? "This cohort must finish processing before it can be shared."
            : err.message
          : "Failed to create share link.";
      toast.error(message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (shareId: string) => revokeCohortShare(cohortId, shareId),
    onSuccess: (_data, shareId) => {
      removeShareToken(shareId);
      toast.success("Share link revoked");
      queryClient.invalidateQueries({ queryKey: sharesKey });
    },
    onError: (err) => {
      toast.error(
        err instanceof BatchApiError ? err.message : "Failed to revoke",
      );
    },
  });

  const handleCopy = useCallback(async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(
        buildShareUrl(cohortId, created.token),
      );
      setCopied(true);
      toast.success("Share link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [created, cohortId]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      // Clearing the just-created token on close prevents it from lingering
      // in memory after the dialog is dismissed.
      setCreated(null);
      setCopied(false);
    }
  }, []);

  const serverShares = listQuery.data ?? [];
  // Pin the just-created share to the top if the backend list hasn't surfaced
  // it yet (read-after-write lag). Lets the user revoke immediately instead
  // of being stuck on "No share links yet."
  const shares = useMemo<CohortShare[]>(() => {
    if (!created) return serverShares;
    if (serverShares.some((s) => s.share_id === created.share_id)) {
      return serverShares;
    }
    const pending: CohortShare = {
      share_id: created.share_id,
      cohort_id: cohortId,
      created_at: new Date().toISOString(),
      expires_at: created.expires_at,
      revoked_at: null,
      last_used_at: null,
      token_prefix: created.token_prefix,
      label: created.label ?? null,
    };
    return [pending, ...serverShares];
  }, [created, serverShares, cohortId]);

  const activeShares = shares.filter(
    (s) =>
      !s.revoked_at &&
      (!s.expires_at || new Date(s.expires_at).getTime() >= Date.now()),
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="print:hidden">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share analytics</DialogTitle>
          <DialogDescription>
            Anyone with the link and a signed-in account can view this
            cohort&apos;s analytics. They cannot modify, re-run, or delete the
            job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="expires-in-days" className="text-xs">
                Expires in (days, max {MAX_DAYS})
              </Label>
              <Input
                id="expires-in-days"
                type="number"
                min={1}
                max={MAX_DAYS}
                value={expiresInDays}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) {
                    setExpiresInDays(
                      Math.max(1, Math.min(MAX_DAYS, Math.floor(n))),
                    );
                  }
                }}
                className="mt-1.5"
              />
            </div>
            <Button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              Create link
            </Button>
          </div>

          {/* Raw token appears inline once, alongside the list. Keeping the
              list visible lets the user confirm the new row landed in it and
              revoke without closing/reopening the dialog. */}
          {created && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <Label className="text-xs font-medium">New share URL</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  readOnly
                  value={buildShareUrl(cohortId, created.token)}
                  className="font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Copy it now — this is the only time the full URL is shown.
                  You can revoke it below.
                </span>
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                Active share links{" "}
                {activeShares.length > 0 && `(${activeShares.length})`}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => listQuery.refetch()}
                disabled={listQuery.isFetching}
                className="h-6 px-2 text-xs text-muted-foreground"
                title="Refresh list"
              >
                <RefreshCw
                  className={`w-3 h-3 ${listQuery.isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
            {listQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : listQuery.isError ? (
              <p className="text-xs text-destructive py-2 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Couldn&apos;t load existing share links
                  {listQuery.error instanceof BatchApiError
                    ? `: ${listQuery.error.message}`
                    : "."}
                </span>
              </p>
            ) : shares.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No share links yet.
              </p>
            ) : (
              <div className="space-y-2">
                {shares.map((s) => (
                  <ShareRow
                    key={s.share_id}
                    share={s}
                    cohortId={cohortId}
                    onRevoke={revokeMutation.mutate}
                    isRevoking={
                      revokeMutation.isPending &&
                      revokeMutation.variables === s.share_id
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
