# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 15 restaurant management system for handling reservations, orders, tables, and multi-branch operations. Uses Prisma ORM with PostgreSQL, Tailwind CSS 4, and TypeScript.

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm build

# Start production server
npm start

# Run linting
npm run lint

# Start PostgreSQL database (Docker)
docker-compose up -d

# Generate Prisma client after schema changes
npx prisma generate

# Create and apply database migrations
npx prisma migrate dev --name <migration_name>

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Architecture

### Directory Structure

- **`app/`** - Next.js App Router pages and layouts
  - **`app/generated/prisma/`** - Generated Prisma Client (custom output location)
  - **`app/page.tsx`** - Root page
  - **`app/layout.tsx`** - Root layout with Geist fonts
- **`actions/`** - Server Actions for data mutations
- **`lib/`** - Shared utilities
  - **`lib/prisma.ts`** - Prisma Client singleton with dev mode hot reload handling
- **`prisma/`** - Database schema and migrations
- **`public/`** - Static assets

### Database Schema Organization

The Prisma schema is organized into logical sections:

1. **Enums**: `UserRole`, `OrderStatus`, `OrderType`, `ReservationStatus`, `PriceType`
2. **NextAuth Models**: `User`, `Account`, `Session` (authentication)
3. **Organization**: `Restaurant`, `Branch`, `UserOnBranch` (multi-tenant structure)
4. **Tables & Reservations**: `Table`, `Reservation`, `ReservationTable`, `TimeSlot`
5. **Products & Menu**: `Category`, `Product`, `ProductOnBranch`, `ProductPrice`
6. **Orders**: `Order`, `OrderItem`

### Key Architectural Patterns

**Multi-Branch System**: The app supports multiple restaurants with multiple branches. Most entities relate to a specific `Branch`:
- Products have different prices/stock per branch via `ProductOnBranch`
- Users have branch-specific roles via `UserOnBranch`
- Orders, reservations, and tables are branch-specific

**Price Flexibility**: Products support three price types (dine-in, take-away, delivery) per branch through `ProductPrice`.

**Prisma Custom Output**: The Prisma Client is generated to `app/generated/prisma/` instead of the default `node_modules/.prisma/client`. Import using `@/app/generated/prisma`.

**Server-Only Prisma**: The `lib/prisma.ts` file uses `"server-only"` to prevent client-side database access and includes dev mode singleton pattern to prevent connection exhaustion.

## Database Setup

The project uses PostgreSQL via Docker. Connection defaults:
- Host: localhost:5432
- Database: restaurant
- User/Password: postgres/postgres

Set `DATABASE_URL` in `.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/restaurant"
```

## Path Aliases

TypeScript is configured with `@/*` mapping to the root directory. Use `@/lib/prisma` instead of relative paths.

## Development Guidelines

**Separation of Concerns**: When creating new hooks, server actions, routes, or utilities:
- Place implementations in their corresponding folders (`actions/`, `lib/`, API routes in `app/api/`, etc.)
- **NEVER** add usage examples in the main `app/` codebase
- Create usage examples in `/demo` or `/showcase` folders to demonstrate how to use the new features
- This keeps the main application clean and separates reusable code from example implementations
