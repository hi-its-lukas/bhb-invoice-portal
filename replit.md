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
  - `dunning_events` - Audit log of dunning actions taken (extended for email tracking)
  - `dunning_email_templates` - Email templates for dunning letters (reminder, dunning1-3)
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
  - `POST /settings/get/debtors` - Fetch debtor master data (limit=1000)
  - `POST /settings/update/debtor` - Push updated debtor data to BHB
- **Data Sync**: Receipts are cached locally in `bhb_receipts_cache` table
- **Debtor Sync**: Uses `/settings/get/debtors` endpoint for real debtor master data with postingaccount_number, name, email, address, tax IDs, banking info
- **Debtor Push**: Portal can push updated debtor master data to BHB via "Zu BHB übertragen" button in edit dialog
- **Debtor Numbers**: Real debtor numbers from BHB are synced via "Von BHB laden". Portal auto-generates 80xxx numbers from invoice counterparty names as fallback.

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

- **Dunning Email Template System**: Complete email automation for dunning letters:
  - Template management page with create/edit/delete functionality (admin only)
  - Handlebars template engine with helpers (formatCurrency, formatDate, formatNumber)
  - Four dunning stages: Zahlungserinnerung, 1./2./3. Mahnung
  - Template placeholders for customer data, invoice tables, sums, bank info
  - Interest calculation based on dunning rules (principal × rate × daysOverdue / 36500)
  - Send dunning dialog accessible from customers page
  - Email preview before sending with rendered HTML
  - Sent emails logged to dunning_events for audit trail
  - Default templates seeded automatically on first use

- **Role-based access control**: Four user roles implemented with route guards:
  - `admin`: Full access to all features including settings, user management, and dunning templates
  - `user`: Internal staff with access to customers, dunning rules (no settings access)
  - `viewer`: Read-only access to dashboard, invoices, and dunning rules (no customer/settings access)
  - `customer`: External users who can only view their assigned invoices and dashboard
- **Route guards**: AdminRoute (admin-only), CanEditDebtorsRoute (admin+user), InternalRoute (admin+user+viewer)
- **Security**: Server-side password validation (min 10 chars), last-admin deletion protection, bcrypt hashing
- **Customer-scoped data**: External customers only see invoices linked to their assigned debtor accounts
- **Landing page redesign**: Now a neutral customer portal instead of BHB advertising
- **Navigation per role**: Sidebar navigation adapts based on user role

- Implemented complete MVP with all core features:
  - Landing page with customer portal focus and login CTA
  - Dashboard with statistics cards and recent invoices (filtered by role)
  - Customer (Debtor) management with CRUD operations (internal only)
  - Invoice list with search, filtering, and interest calculation
  - Dunning rules configuration per customer (internal only)
  - Settings page for BHB API and SMTP configuration (internal only)
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
- SMTP credentials are stored encrypted in the portal database (like BHB credentials)
- Configure via the Settings page in the portal UI
- Supports STARTTLS and SSL/TLS connections
- Test button verifies actual SMTP connectivity and authentication

## Docker Deployment

### Files
- `Dockerfile` - Multi-stage build for production
- `docker-compose.yml` - App + PostgreSQL (Cloudflare separat)
- `.env.example` - Template for environment variables
- `DEPLOYMENT.md` - Complete deployment guide (German)

### Ports
- **5000/TCP**: App (HTTP API + SPA) - internal only
- **5432/TCP**: PostgreSQL - internal only, never expose
- **443**: External access via Cloudflare Tunnel

### Quick Start
```bash
cp .env.example .env
# Fill in values
docker compose up -d
```

See `DEPLOYMENT.md` for detailed instructions including admin user creation.