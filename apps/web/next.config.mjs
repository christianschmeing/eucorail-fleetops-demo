import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: ['localhost', 'eucorail-fleetops-demo.vercel.app'],
    unoptimized: true
  },
  webpack: (config, { isServer, dev }) => {
    // Ensure maplibre-gl resolves from the hoisted root node_modules
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      ...(config.resolve.modules || []),
      'node_modules'
    ];
    // Avoid overriding Next.js chunk filenames; custom names caused 404s for app CSS/JS in dev
    // Alias mapbox-gl to maplibre-gl for compatibility
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'mapbox-gl': 'maplibre-gl',
      '@': path.resolve(__dirname),
      '@/components': path.resolve(__dirname, 'components'),
      '@/features': path.resolve(__dirname, 'features'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/app': path.resolve(__dirname, 'app'),
      '@/styles': path.resolve(__dirname, 'styles')
    };
    return config;
  },
  transpilePackages: ['@eucorail/ui', 'maplibre-gl'],
  // Remove rewrites to allow Next API routes under /api/** to serve same-origin fail-open responses
  async rewrites() {
    const webpackRuntime = getCurrentWebpackRuntime();
    return [
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