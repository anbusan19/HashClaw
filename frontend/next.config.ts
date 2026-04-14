import type { NextConfig } from "next";
import path from "path";

// Load root .env in local dev only — Vercel injects env vars directly in production
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config({ path: path.join(__dirname, "../.env") });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
