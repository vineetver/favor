import { PlayCircle, ImageIcon } from "lucide-react";

interface MediaSlotProps {
  type: "image" | "video";
  title: string;
  description: string;
  src?: string;
  poster?: string;
}

export function MediaSlot({
  type,
  title,
  description,
  src,
  poster,
}: MediaSlotProps) {
  const hasMedia = Boolean(src);

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      {hasMedia ? (
        type === "image" ? (
          <img
            src={src}
            alt={title}
            className="w-full h-auto object-cover bg-muted"
          />
        ) : (
          <video
            controls
            preload="metadata"
            className="w-full h-auto bg-black"
            poster={poster}
          >
            <source src={src} />
          </video>
        )
      ) : (
        <div className="aspect-video w-full bg-muted/30 flex items-center justify-center p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            {type === "image" ? (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            ) : (
              <PlayCircle className="w-6 h-6 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              {type === "image" ? "Image slot" : "Video slot"}
            </p>
            <p className="text-xs text-muted-foreground">
              Add media file and set <code>src</code> in this page component.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

