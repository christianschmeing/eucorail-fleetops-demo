/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed: experimental: { appDir: true, },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:4100/api/:path*' },
      { source: '/events', destination: 'http://localhost:4100/events' },
      { source: '/ws', destination: 'http://localhost:4100/ws' }
    ];
  },
  async headers() {
    return [
      {
        source: '/events',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-transform' },
          { key: 'X-Accel-Buffering', value: 'no' },
          // Removed: Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers
        ]
      }
    ];
  }
};

export default nextConfig;