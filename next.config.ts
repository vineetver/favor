import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Mark gosling.js as external for SSR to avoid Worker issues
  serverExternalPackages: ["gosling.js"],
};

export default nextConfig;
