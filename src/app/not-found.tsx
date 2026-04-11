import { Button } from "@shared/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-muted-foreground/20 tabular-nums">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Try searching from the homepage.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs">Documentation</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
