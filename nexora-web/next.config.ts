import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      { source: '/dashboard', destination: '/agency/dashboard', permanent: true },
      { source: '/projects', destination: '/agency/projects', permanent: true },
      { source: '/projects/new', destination: '/agency/projects', permanent: true },
      { source: '/projects/:path*', destination: '/agency/projects/:path*', permanent: true },
      { source: '/keyword-research', destination: '/agency/keyword-research', permanent: true },
      { source: '/alerts', destination: '/agency/alerts', permanent: true },
      { source: '/billing', destination: '/agency/billing', permanent: true },
      { source: '/billing/:path*', destination: '/agency/billing/:path*', permanent: true },
      { source: '/settings', destination: '/agency/settings', permanent: true },
    ];
  },
};

export default nextConfig;
