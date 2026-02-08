import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark gosling.js as external for SSR to avoid Worker issues
  serverExternalPackages: ["gosling.js"],
  // Temporarily disable React Strict Mode to debug Gosling double-render
  reactStrictMode: false,
};

export default nextConfig;
