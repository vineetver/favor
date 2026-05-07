"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useWhatsNew } from "../hooks/use-whats-new";

const RELEASE_NOTES_HREF = "/docs/release-notes";

const TAG_STYLE: Record<string, string> = {
  major: "bg-primary/10 text-primary",
  minor: "bg-muted text-muted-foreground",
  patch: "bg-muted text-muted-foreground",
};

const TAG_LABEL: Record<string, string> = {
  major: "Major",
  minor: "Minor",
  patch: "Patch",
};

function formatDate(iso: string): string {
  const [, m, d] = iso.split("-").map((p) => parseInt(p, 10));
  if (!m || !d) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[m - 1]} ${d}`;
}

/**
 * Bell + popover panel listing recent releases. Reads from
 * /docs/release-notes (RELEASES) so there's exactly one source of truth.
 * Mark-all-seen fires on close so the badge clears once the user has
 * clearly looked at the panel.
 */
export function WhatsNewBell() {
  const { releases, unreadCount, isUnread, markSeen, markAllSeen } =
    useWhatsNew();
  const [open, setOpen] = useState(false);
  // Snapshot the unread set when the panel opens so highlights persist
  // through the open session even after click-marks-seen fires.
  const [unreadSnapshot, setUnreadSnapshot] = useState<ReadonlySet<string>>(
    new Set(),
  );

  // SSR + first client render both see unreadCount === 0 (empty seen-set
  // from useSyncExternalStore's getServerSnapshot), so the badge stays
  // hidden through hydration and appears only once the real localStorage
  // value lands. No `ready` flag needed.
  const badge = unreadCount > 0;

  // Show top 5 releases in the popover; full list lives on the page.
  const visible = releases.slice(0, 5);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setUnreadSnapshot(
            new Set(
              releases.filter((r) => isUnread(r.version)).map((r) => r.version),
            ),
          );
        } else {
          markAllSeen();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          aria-label={
            unreadCount > 0
              ? `What's new — ${unreadCount} unread`
              : "What's new"
          }
          className={cn(
            "relative rounded-full",
            "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
            "shadow-none",
          )}
        >
          <Bell className="h-5 w-5" />
          {badge && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5",
                "min-w-[16px] h-[16px] px-1",
                "rounded-full bg-primary text-primary-foreground",
                "text-[10px] font-bold leading-none",
                "inline-flex items-center justify-center",
                "ring-2 ring-background",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[380px] p-0 rounded-xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">What's new</p>
        </div>
        <div className="max-h-[440px] overflow-y-auto divide-y divide-border">
          {visible.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              No releases yet.
            </div>
          )}
          {visible.map((release) => {
            const tag = release.tag ?? "minor";
            const unread = unreadSnapshot.has(release.version);
            return (
              <Link
                key={release.version}
                href={`${RELEASE_NOTES_HREF}#v${release.version}`}
                onClick={() => {
                  markSeen([release.version]);
                  setOpen(false);
                }}
                className={cn(
                  "relative block px-4 py-3 transition-colors hover:bg-muted/60",
                  unread && "bg-primary/[0.04]",
                )}
              >
                {unread && (
                  <span
                    aria-hidden
                    className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-primary"
                  />
                )}
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "font-mono text-sm text-foreground",
                        unread ? "font-bold" : "font-semibold",
                      )}
                    >
                      {release.version}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                        TAG_STYLE[tag],
                      )}
                    >
                      {TAG_LABEL[tag]}
                    </span>
                    {unread && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-primary">
                        New
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {formatDate(release.date)}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-sm leading-snug",
                    unread
                      ? "font-semibold text-foreground"
                      : "font-medium text-foreground/85",
                  )}
                >
                  {release.title}
                </p>
                {release.summary && (
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {release.summary}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
        <Link
          href={RELEASE_NOTES_HREF}
          onClick={() => setOpen(false)}
          className={cn(
            "block px-4 py-2.5 border-t border-border",
            "text-xs font-medium text-primary",
            "hover:bg-muted/60 transition-colors",
          )}
        >
          See full release notes →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
