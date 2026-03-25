import type { NextConfig } from "next";

// Validate API URL — reject non-http(s) protocols to prevent SSRF via misconfiguration
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
try {
  const parsed = new URL(apiUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`NEXT_PUBLIC_API_URL must use http or https, got: ${parsed.protocol}`);
  }
} catch (err) {
  if (err instanceof TypeError) {
    throw new Error(`NEXT_PUBLIC_API_URL is not a valid URL: ${apiUrl}`);
  }
  throw err;
}

const nextConfig: NextConfig = {
  // Mark gosling.js as external for SSR to avoid Worker issues
  serverExternalPackages: ["gosling.js", "@duckdb/duckdb-wasm"],
  // Temporarily disable React Strict Mode to debug Gosling double-render
  reactStrictMode: false,
  async rewrites() {
    // WARNING: This rewrite proxies requests through Next.js, which does NOT
    // forward browser cookies. Authenticated endpoints must call API_BASE
    // directly with `credentials: "include"` — never go through /api/v1/.
    // This rewrite exists only for legacy/public endpoints.
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
