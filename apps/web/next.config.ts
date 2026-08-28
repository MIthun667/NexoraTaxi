import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  allowedDevOrigins: ['*.trycloudflare.com'],
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3000';

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
