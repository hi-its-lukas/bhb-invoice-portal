# BHB Invoice & Dunning Management Portal

## Overview

This is a full-stack invoice and dunning (debt collection) management portal that integrates with BuchhaltungsButler (BHB), a German accounting software. The portal serves as the "source of truth" for customer login/authorization, dunning levels, late payment interest, dunning fees, and automated reminder/dunning email workflows. BHB remains the source of truth for invoices/receipts, payment status, and debtor master data.

The application enables administrators to:
- View and manage open invoices synced from BHB
- Configure per-debtor dunning rules (payment reminders, dunning stages, interest rates)
- Track dunning events and automate reminder workflows
- Monitor dashboard statistics for overdue amounts and payment status

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Design System**: Material Design 3 + Carbon Design hybrid approach for financial data clarity

The frontend follows a page-based structure with reusable components. Key pages include Dashboard, Invoices, Customers, Dunning Rules, and Settings.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON API endpoints under `/api/*`
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via `connect-pg-simple`

The server uses a modular route structure with authentication middleware protecting API endpoints.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**:
  - `portal_customers` - Debtor/customer records with unique posting account numbers
  - `portal_user_customers` - User-to-customer assignments for access control
  - `bhb_receipts_cache` - Cached invoice data synced from BHB API
  - `dunning_rules` - Per-customer dunning configuration (stages, fees, interest rates)
  - `dunning_events` - Audit log of dunning actions taken
  - `users` / `sessions` - Authentication tables (required for Replit Auth)

### Build System
- **Development**: Vite dev server with HMR
- **Production Build**: esbuild for server bundling, Vite for client
- **Path Aliases**: `@/` maps to client source, `@shared/` maps to shared code

## External Dependencies

### BuchhaltungsButler API Integration
- **API Base URL**: `https://webapp.buchhaltungsbutler.de/api/v1`
- **Authentication**: API key per mandant (client/tenant)
- **Key Endpoints**:
  - `POST /receipts/get` - Fetch outbound invoices with payment status filtering
  - `POST /receipts/get/id_by_customer` - Get individual receipt with PDF (base64)
- **Data Sync**: Receipts are cached locally in `bhb_receipts_cache` table

### Authentication
- **Provider**: Username/Password authentication with bcrypt password hashing
- **Session Store**: PostgreSQL via `connect-pg-simple`
- **Docker Ready**: Designed for Docker deployment (no Replit-specific dependencies)
- **Required Environment Variables**: `SESSION_SECRET`, `ENCRYPTION_KEY` (for API credential encryption)

### Database
- **Provider**: PostgreSQL (requires `DATABASE_URL` environment variable)
- **Migrations**: Managed via Drizzle Kit (`npm run db:push`)

### Key npm Dependencies
- `drizzle-orm` / `drizzle-zod` - Database ORM and schema validation
- `@tanstack/react-query` - Server state management
- `express` / `express-session` - HTTP server and sessions
- `passport` - Authentication middleware
- Radix UI primitives - Accessible UI components

## Recent Changes (January 2026)

- Implemented complete MVP with all core features:
  - Landing page with feature showcase and login CTA
  - Dashboard with statistics cards and recent invoices
  - Customer (Debtor) management with CRUD operations
  - Invoice list with search, filtering, and interest calculation
  - Dunning rules configuration per customer (stages, grace days, interest rates)
  - Settings page for BHB API configuration and testing
  - Dark mode support with theme toggle

## Environment Variables Required

### Database
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)

### Authentication
- `SESSION_SECRET` - Secret for session encryption (configured via Replit Secrets)

### BHB API
- BHB credentials are stored encrypted in the portal database (not environment variables)
- Configure via the Settings page in the portal UI
- Encryption uses AES-256-GCM with `ENCRYPTION_KEY` environment variable

### Encryption
- `ENCRYPTION_KEY` - Secret key for encrypting sensitive data (API credentials)
- Falls back to `SESSION_SECRET` if not set, but should be set separately in production

### SMTP (For dunning email automation)
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password
- `SMTP_FROM` - From email address for dunning emails