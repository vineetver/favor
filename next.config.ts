import path from "node:path";
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
  // @duckdb/duckdb-wasm still needs to be external for SSR to avoid Worker
  // issues. gosling.js used to live here too, but the import is wrapped in
  // next/dynamic({ ssr: false }) so the SSR bundle never touches it, and
  // the webpack alias below is what actually lets webpack resolve it on
  // the client under Next 16.
  serverExternalPackages: ["@duckdb/duckdb-wasm"],
  // Temporarily disable React Strict Mode to debug Gosling double-render
  reactStrictMode: false,
  // gosling.js 2.0.0-alpha.9 ships an exports field with only the "import"
  // condition, which Next 16 + webpack fails to resolve for the bare
  // "gosling.js" specifier. Alias the exact specifier to the built ESM file
  // to bypass the exports-field resolver entirely. The "$" suffix makes the
  // alias exact-match only, so subpaths like "gosling.js/utils" still work.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "gosling.js$": path.resolve(
        process.cwd(),
        "node_modules/gosling.js/dist/gosling.js",
      ),
    };
    return config;
  },
  // Rewrite rule removed: all API calls now use API_BASE directly with
  // `credentials: "include"` so session cookies reach the backend.
  // The old /api/v1/ proxy silently dropped auth cookies because they
  // were set on the backend domain, not the Next.js domain.
};

export default nextConfig;
