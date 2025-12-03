"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

interface NERCStatus {
  page: {
    name: string;
    url: string;
    status: "UP" | "HASISSUES" | "UNDERMAINTENANCE";
  };
  activeIncidents?: Array<{
    id: string;
    name: string;
    started: string;
    status: string;
    impact: string;
    url: string;
  }>;
  activeMaintenances?: Array<{
    id: string;
    name: string;
    start: string;
    status: string;
    duration: string;
    url: string;
  }>;
}

export function WhatsNewButton() {
  const [nercStatus, setNercStatus] = useState<NERCStatus | null>(null);

  useEffect(() => {
    const fetchNercStatus = async () => {
      try {
        const response = await fetch(siteConfig.links.nercStatus);
        if (response.ok) {
          const data = await response.json();
          setNercStatus(data);
        }
      } catch (err) {
        // Fail silently - NERC status is not critical
        console.error("Failed to fetch NERC status", err);
      }
    };

    fetchNercStatus();
  }, []);

  const hasNercIssues =
    nercStatus &&
    (nercStatus.page.status !== "UP" ||
      (nercStatus.activeIncidents?.length || 0) > 0 ||
      (nercStatus.activeMaintenances?.length || 0) > 0);

  return (
    <Button
      variant="ghost"
      asChild
      className="relative rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-accent/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-auto"
    >
      <Link
        href={siteConfig.links.whatsNew}
        className="flex items-center gap-2"
      >
        {hasNercIssues ? (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
        <span>What&apos;s New</span>
        <Badge variant="secondary" className="text-xs">
          {siteConfig.version}
        </Badge>
      </Link>
    </Button>
  );
}
