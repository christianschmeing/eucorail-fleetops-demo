#!/bin/bash

echo "🚀 Direct Vercel Deployment (without GitHub Actions)"
echo "================================================"

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | xargs)
fi

# Check requirements
if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_TOKEN not set"
  echo "Add to .env.local or export VERCEL_TOKEN=xxx"
  exit 1
fi

# Build
echo "📦 Building project..."
npm run build || exit 1

# Deploy options
echo ""
echo "Choose deployment type:"
echo "1) Preview deployment"
echo "2) Production deployment"
read -p "Enter choice (1 or 2): " choice

case $choice in
  1)
    echo "🔄 Deploying to preview..."
    npx vercel --token=$VERCEL_TOKEN ;;
  2)
    echo "🚨 Deploying to PRODUCTION..."
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      npx vercel --prod --token=$VERCEL_TOKEN
    else
      echo "Deployment cancelled"
    fi ;;
  *)
    echo "Invalid choice"; exit 1 ;;
esac

echo "✅ Deployment complete!"


