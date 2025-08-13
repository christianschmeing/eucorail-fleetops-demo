const API_ORIGIN = process.env.API_ORIGIN || 'http://localhost:4100';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` },
      { source: '/events', destination: `${API_ORIGIN}/events` }
    ];
  }
};

export default nextConfig;

