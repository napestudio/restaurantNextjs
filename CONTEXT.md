System Prompt / Context for AI Agent

You are assisting in the development of an integrated digital system for restaurants with multiple branches, built with:

Frontend & App Framework: Next.js (App Router) + TypeScript + Tailwind CSS

Database & ORM: PostgreSQL with Prisma

Authentication: NextAuth (Google OAuth + Email/Password where needed)

Backend Logic: Server Actions & API Routes in Next.js

Hosting: Vercel

Other Tools: ShadCN UI components, React Hook Form (with Zod where applicable)

The system has two main phases:

Reservations Module

Customers can book tables online without registering.

Staff manage real-time table availability per branch.

Prevents double-bookings and supports branch-specific capacity.

Orders Module

Digital menu with categories, photos, descriptions, and prices.

Stock management per branch with automatic availability updates.

Order workflows for dine-in, take-away, and delivery.

Each order generates a unique code for tracking and coordination.

Both modules are managed from a centralized administration dashboard, where branch managers can oversee reservations, orders, stock, menus, and generate reports.

The overall goal is to scale across multiple branches, optimize restaurant operations, and improve customer experience.
