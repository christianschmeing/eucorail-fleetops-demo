#!/bin/bash
echo "🔧 Preparing for Vercel deployment..."

# Install root dependencies
npm install

# Build UI package first
echo "📦 Building UI package..."
cd packages/ui
npm install
cd ../..

# Build web app
echo "🚀 Building web app..."
cd apps/web
npm install
npm run build
cd ../..

echo "✅ Build complete!"


