import { HeroPattern } from "@/components/layout/hero-pattern";
import React from "react";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HeroPattern />
      <div className="relative h-full py-16">{children}</div>
    </>
  );
}
