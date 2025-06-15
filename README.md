# CGSS Songs

A TypeScript-based scraper for Idolmaster Cinderella Girls Starlight Stage (CGSS) songs using Prisma, SQLite, and Cheerio.

## Tech Stack

- **Runtime**: Node.js
- **Package Manager**: npm
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **HTTP Client**: node-fetch
- **HTML Parser**: Cheerio
- **Execution**: tsx (TypeScript execution)

## Quick Start

```bash
# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh

# Start development
npm run dev
```

## Manual Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Initialize database
npx prisma db push

# Run development server
npm run dev
```

## Scripts

- `npm run dev` - Run development server with tsx
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Run built JavaScript
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Database Schema

### Songs
- Basic song information (title, artist, album, duration, genre)
- Image and audio URLs
- Difficulty levels (stored as JSON)
- Timestamps

### Idols
- Personal information (name variations, physical stats)
- Character details (hobbies, hometown, etc.)
- Profile images
- Timestamps

## Usage

The scraper includes:
- HTTP client with proper headers for web scraping
- HTML parsing with Cheerio
- Database operations with Prisma
- TypeScript interfaces for type safety

Modify the scraper selectors in `src/scraper.ts` to match the actual website structure you want to scrape.

## Environment Variables

```env
DATABASE_URL="file:./dev.db"
NODE_ENV="development"
``` 