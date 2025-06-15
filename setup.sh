#!/bin/bash

echo "🚀 Setting up CGSS Songs project..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create environment file
echo "⚙️  Creating environment file..."
cat > .env << EOF
# Database
DATABASE_URL="file:./dev.db"

# Environment  
NODE_ENV="development"
EOF

# Generate Prisma client
echo "🗄️  Setting up database..."
npx prisma generate

# Push database schema
npx prisma db push

echo "✅ Setup complete!"
echo ""
echo "🎵 Run the following commands to get started:"
echo "  npm run dev    - Run development server"
echo "  npm run db:studio - Open Prisma Studio"
echo "" 