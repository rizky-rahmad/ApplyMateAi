import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/Node-only parsers out of the server bundle so they load at runtime.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
