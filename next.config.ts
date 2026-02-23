import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['edge-tts'],

  // Hide the "N" dev indicator badge
  devIndicators: false,

  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
