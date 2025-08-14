/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:4100/api/:path*' },
      { source: '/events', destination: 'http://localhost:4100/events' },
      { source: '/ws', destination: 'http://localhost:4100/ws' }
    ];
  }
};
export default nextConfig;