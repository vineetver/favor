import type { ChangeEntry, ChangeKind, Release } from "../releases";

/* -------------------------------------------------------------------------- */
/*  Section ordering & labels                                                  */
/* -------------------------------------------------------------------------- */

const KIND_LABEL: Record<ChangeKind, string> = {
  added: "New",
  updated: "Updated",
  fixed: "Fixed",
  removed: "Removed",
};

const KIND_ORDER: ChangeKind[] = ["added", "updated", "fixed", "removed"];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function groupByKind(changes: ChangeEntry[]): Map<ChangeKind, ChangeEntry[]> {
  const groups = new Map<ChangeKind, ChangeEntry[]>();
  for (const change of changes) {
    const bucket = groups.get(change.kind) ?? [];
    bucket.push(change);
    groups.set(change.kind, bucket);
  }
  return groups;
}

/* -------------------------------------------------------------------------- */
/*  ChangelogTimeline                                                          */
/* -------------------------------------------------------------------------- */

export function ChangelogTimeline({ releases }: { releases: Release[] }) {
  return (
    <div className="divide-y divide-border">
      {releases.map((release) => (
        <ReleaseSection key={release.version} release={release} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ReleaseSection                                                             */
/* -------------------------------------------------------------------------- */

function ReleaseSection({ release }: { release: Release }) {
  const groups = groupByKind(release.changes);

  return (
    <article
      id={`v${release.version}`}
      className="scroll-mt-24 py-16 first:pt-0 last:pb-0"
    >
      {/* ── Version + date ── */}
      <header>
        <h2 className="font-mono text-3xl font-semibold tracking-tight text-foreground">
          {release.version}
        </h2>
        <time
          dateTime={release.date}
          className="mt-2 block text-xs text-muted-foreground tabular-nums"
        >
          {formatDate(release.date)}
        </time>
      </header>

      {/* ── Title + summary ── */}
      <div className="mt-8 max-w-2xl">
        <p className="text-lg font-medium text-foreground leading-snug">
          {release.title}
        </p>
        {release.summary && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {release.summary}
          </p>
        )}
      </div>

      {/* ── Changes ── */}
      <div className="mt-10 space-y-10 max-w-2xl">
        {KIND_ORDER.map((kind) => {
          const items = groups.get(kind);
          if (!items || items.length === 0) return null;
          return (
            <section key={kind}>
              <h3 className="text-sm font-semibold text-foreground">
                {KIND_LABEL[kind]}
              </h3>
              <ul className="mt-4 space-y-3">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground leading-relaxed"
                  >
                    {item.source && (
                      <span className="font-medium text-foreground">
                        {item.source}.
                      </span>
                    )}{" "}
                    {item.text}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}
