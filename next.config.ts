import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the dev badge out of screenshots and the demo video.
  devIndicators: false,
  async redirects() {
    return [{ source: "/school", destination: "/philosophers", permanent: true }];
  },
};

export default nextConfig;
