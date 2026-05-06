import {
  AREA_LABEL,
  AREA_ORDER,
  type ChangeArea,
  type ChangeEntry,
  type ChangeKind,
  type Release,
  type ReleaseTag,
} from "../releases";
import { ReleaseImageCard } from "./release-image-card";

/* -------------------------------------------------------------------------- */
/*  Labels                                                                     */
/* -------------------------------------------------------------------------- */

const KIND_LABEL: Record<ChangeKind, string> = {
  added: "New",
  updated: "Updated",
  fixed: "Fixed",
  removed: "Removed",
};

const TAG_LABEL: Record<ReleaseTag, string> = {
  major: "Major release",
  minor: "Minor release",
  patch: "Patch",
};

const TAG_STYLE: Record<ReleaseTag, string> = {
  major: "bg-primary/10 text-primary border-primary/20",
  minor: "bg-muted text-muted-foreground border-border",
  patch: "bg-muted text-muted-foreground border-border",
};

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

function groupByArea(changes: ChangeEntry[]): Map<ChangeArea, ChangeEntry[]> {
  const groups = new Map<ChangeArea, ChangeEntry[]>();
  for (const change of changes) {
    const bucket = groups.get(change.area) ?? [];
    bucket.push(change);
    groups.set(change.area, bucket);
  }
  return groups;
}

/* -------------------------------------------------------------------------- */
/*  ReleaseTimeline                                                            */
/* -------------------------------------------------------------------------- */

export function ReleaseTimeline({ releases }: { releases: Release[] }) {
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
  const groups = groupByArea(release.changes);
  const tag = release.tag ?? "minor";

  return (
    <article
      id={`v${release.version}`}
      className="scroll-mt-24 py-16 first:pt-0 last:pb-0"
    >
      {/* ── Version + date + tag ── */}
      <header>
        <div className="flex items-baseline gap-4 flex-wrap">
          <h2 className="font-mono text-3xl font-semibold tracking-tight text-foreground">
            {release.version}
          </h2>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${TAG_STYLE[tag]}`}
          >
            {TAG_LABEL[tag]}
          </span>
        </div>
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

      {release.images && release.images.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-4">
          {release.images.map((img) => (
            <ReleaseImageCard
              key={img.src}
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              caption={img.caption}
            />
          ))}
        </div>
      )}

      {/* ── Changes grouped by area ── */}
      <div className="mt-10 space-y-10 max-w-2xl">
        {AREA_ORDER.map((area) => {
          const items = groups.get(area);
          if (!items || items.length === 0) return null;
          return (
            <section key={area}>
              <h3 className="text-sm font-semibold text-foreground">
                {AREA_LABEL[area]}
              </h3>
              <ul className="mt-4 space-y-3">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm text-muted-foreground leading-relaxed"
                  >
                    <span
                      className="mt-[0.35rem] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40"
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <KindBadge kind={item.kind} />
                      {item.source && (
                        <span className="font-medium text-foreground">
                          {item.source}.
                        </span>
                      )}{" "}
                      {item.text}
                    </span>
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

/* -------------------------------------------------------------------------- */
/*  KindBadge                                                                  */
/* -------------------------------------------------------------------------- */

const KIND_STYLE: Record<ChangeKind, string> = {
  added: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  updated: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  fixed: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  removed: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

function KindBadge({ kind }: { kind: ChangeKind }) {
  return (
    <span
      className={`mr-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${KIND_STYLE[kind]}`}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}
