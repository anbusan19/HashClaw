import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "path";

// Load root .env so API routes can read it via process.env
dotenv.config({ path: path.join(__dirname, "../.env") });

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
