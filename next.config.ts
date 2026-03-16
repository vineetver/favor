import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark gosling.js as external for SSR to avoid Worker issues
  serverExternalPackages: ["gosling.js"],
  // Temporarily disable React Strict Mode to debug Gosling double-render
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
