import type { Metadata } from "next";
import { RequireAuth } from "@shared/components/require-auth";
import { SettingsClient } from "@features/settings/components/settings-client";

export const metadata: Metadata = {
  title: "Settings | FAVOR",
  description: "Manage your account and API keys",
};

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsClient />
    </RequireAuth>
  );
}
