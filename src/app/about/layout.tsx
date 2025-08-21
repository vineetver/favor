
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
      <div className="relative px-5 py-12 sm:px-6">{children}</div>
    </>
  );
}
