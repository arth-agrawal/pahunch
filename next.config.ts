import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Temporary share links (Cloudflare quick tunnels) are a different origin
  // than the dev server. Without this, Next blocks the page's scripts.
  allowedDevOrigins: ["*.trycloudflare.com", "127.0.0.1"],
};

export default nextConfig;
