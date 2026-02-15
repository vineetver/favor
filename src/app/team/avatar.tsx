"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const sizeClasses = {
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-24 w-24 text-lg",
};

const sizeDims = { sm: 40, md: 56, lg: 96 };

function InitialsFallback({ name, size }: { name: string; size: "sm" | "md" | "lg" }) {
  return (
    <div
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}
    >
      {getInitials(name)}
    </div>
  );
}

export function Avatar({ name, imageUrl, size = "lg" }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return <InitialsFallback name={name} size={size} />;
  }

  return (
    <Image
      className={`${sizeClasses[size]} shrink-0 rounded-full object-cover`}
      src={imageUrl}
      alt={name}
      width={sizeDims[size]}
      height={sizeDims[size]}
      onError={() => setFailed(true)}
    />
  );
}
