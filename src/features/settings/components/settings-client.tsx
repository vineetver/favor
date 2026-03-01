"use client";

import { cn } from "@infra/utils";
import { useAuth } from "@shared/hooks";
import { User } from "lucide-react";
import { ApiKeysSection } from "./api-keys";

function UserCard() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <div className="flex items-center gap-4 p-5 rounded-xl border border-border bg-background">
      {user.picture ? (
        <img
          src={user.picture}
          alt={user.name || "User"}
          className="h-14 w-14 rounded-full object-cover ring-2 ring-border/40"
        />
      ) : (
        <div
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center",
            "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground",
            "ring-2 ring-primary/20 text-lg font-semibold",
          )}
        >
          {initials}
        </div>
      )}
      <div className="min-w-0">
        {user.name && user.name !== user.email && (
          <p className="text-base font-semibold text-foreground truncate">
            {user.name}
          </p>
        )}
        {user.email && (
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">
          {user.sub}
        </p>
      </div>
    </div>
  );
}

export function SettingsClient() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and API access.
        </p>
      </div>

      <div className="space-y-10">
        {/* Profile section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Profile
            </h2>
          </div>
          <UserCard />
        </section>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* API Keys section */}
        <section>
          <ApiKeysSection />
        </section>
      </div>
    </div>
  );
}
