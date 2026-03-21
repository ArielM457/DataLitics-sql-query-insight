import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* DataAgent frontend configuration */
  reactStrictMode: true,
  output: "standalone", // required for Docker / Container Apps
};

export default nextConfig;
