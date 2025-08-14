import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed: experimental: { appDir: true, },
  webpack: (config) => {
    // Ensure maplibre-gl resolves from the hoisted root node_modules
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      ...(config.resolve.modules || []),
      'node_modules'
    ];
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'maplibre-gl': require.resolve('maplibre-gl')
    };
    return config;
  },
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