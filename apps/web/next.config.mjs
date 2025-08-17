import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function getCurrentWebpackRuntime() {
  try {
    const dir = path.resolve(process.cwd(), '.next', 'static', 'chunks');
    const files = fs.readdirSync(dir);
    const hit = files.find((f) => /^webpack-.*\.js$/.test(f));
    return hit ? `/\_next/static/chunks/${hit}` : null;
  } catch {
    return null;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed: experimental: { appDir: true, },
  webpack: (config, { isServer, dev }) => {
    // Ensure maplibre-gl resolves from the hoisted root node_modules
    config.resolve.modules = [
      path.resolve(process.cwd(), 'node_modules'),
      path.resolve(process.cwd(), '../../node_modules'),
      ...(config.resolve.modules || []),
      'node_modules'
    ];
    // Avoid overriding Next.js chunk filenames; custom names caused 404s for app CSS/JS in dev
    // Do not alias 'maplibre-gl' to a single file to preserve subpath CSS imports
    return config;
  },
  async rewrites() {
    const webpackRuntime = getCurrentWebpackRuntime();
    return [
      { source: '/api/:path*', destination: 'http://localhost:4100/api/:path*' },
      { source: '/events', destination: 'http://localhost:4100/events' },
      { source: '/ws', destination: 'http://localhost:4100/ws' },
      // Fallback for stale webpack runtime chunk on fresh build
      ...(webpackRuntime ? [
        { source: '/_next/static/chunks/webpack-:any.js', destination: webpackRuntime }
      ] : [])
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