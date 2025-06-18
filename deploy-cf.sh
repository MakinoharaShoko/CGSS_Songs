#!/bin/bash

echo "🚀 Starting Cloudflare Pages deployment..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Step 2: Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm db:generate

# Step 3: Build the web application
echo "🏗️ Building web application..."
pnpm web:build

# Step 4: Check if required files exist
echo "✅ Checking build artifacts..."
if [ ! -f "web/out/index.html" ]; then
    echo "❌ index.html not found in build output"
    exit 1
fi

if [ ! -f "web/out/sql-wasm.js" ]; then
    echo "❌ sql-wasm.js not found in build output"
    exit 1
fi

if [ ! -f "web/out/sql-wasm.wasm" ]; then
    echo "❌ sql-wasm.wasm not found in build output"
    exit 1
fi

if [ ! -f "web/out/prisma/dev.db" ]; then
    echo "❌ Database file not found in build output"
    exit 1
fi

if [ ! -f "web/out/_headers" ]; then
    echo "❌ _headers file not found in build output"
    exit 1
fi

echo "✅ All required files are present"

# Step 5: Show deployment info
echo "🎉 Build completed successfully!"
echo "📂 Upload the 'web/out' directory to Cloudflare Pages"
echo "⚙️  Make sure to set the build output directory to 'web/out' in CF Pages settings"
echo ""
echo "🔧 Cloudflare Pages Settings:"
echo "   - Build command: npm run web:build"
echo "   - Build output directory: web/out"
echo "   - Root directory: (leave empty or set to /)"
echo ""
echo "📝 Files in build output:"
ls -la web/out/
echo ""
echo "🌐 Your site should be accessible once deployed!" 