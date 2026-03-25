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
  // Rewrite rule removed: all API calls now use API_BASE directly with
  // `credentials: "include"` so session cookies reach the backend.
  // The old /api/v1/ proxy silently dropped auth cookies because they
  // were set on the backend domain, not the Next.js domain.
};

export default nextConfig;
