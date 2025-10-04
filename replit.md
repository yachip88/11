# Overview

This is an analytical dashboard application for monitoring and analyzing makeup water consumption in Novosibirsk's district heating network. The system tracks Central Thermal Points (CTP) across multiple Regional Thermal Stations (RTS), providing statistical process control using Shewhart control charts, automated recommendations, and comprehensive analytics.

The application serves Novosibirsk Heat Supply Company (НТСК) to optimize heating system operations, identify anomalies, reduce water consumption, and improve maintenance planning through data-driven insights.

# User Preferences

Preferred communication style: Simple, everyday language (Russian).

# Recent Changes (October 2025)

**Auto-creation of RTS and Districts from Excel Filename (October 4, 2025)**
- Excel parser now extracts district name from filename format: "ЦТП name, address, code, 3-РТС, Кировский, ..."
- File upload system automatically creates RTS if not found (e.g., "РТС-3" from "3-РТС" in filename)
- File upload system automatically creates district if not found (e.g., "Кировский" after РТС in filename)
- All CTPs created during upload are now properly linked to the correct RTS and district
- Database completely cleared for fresh production data import

**Migration to Prisma ORM with PostgreSQL (October 4, 2025)**
- Migrated from MSSQL to PostgreSQL for development and testing
- Created virtual PostgreSQL database in Replit environment
- Updated Prisma schema for PostgreSQL compatibility
- Fixed Russian character encoding (TEXT fields support UTF-8 in PostgreSQL)
- Fixed file upload functionality (middleware updated to skip multipart/form-data)
- Successfully tested with seed data (2 RTS, 10 CTPs, 310 measurements)

**Previous Migration to MSSQL with Prisma ORM**
- Migrated from Drizzle ORM + PostgreSQL to Prisma ORM + MSSQL
- All database code updated to work with Microsoft SQL Server
- Prisma schema created in `prisma/schema.prisma`
- Database connection configured for both `sqlserver://` and `postgresql://` protocols
- Storage layer (`server/db-storage.ts`) rewritten for Prisma Client API
- Type definitions updated in `shared/schema.ts` for Prisma compatibility

# System Architecture

## Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling

**Routing**: wouter for lightweight client-side routing

**State Management**: TanStack Query (React Query) for server state management with query invalidation and caching

**Key Design Decisions**:
- Component-based architecture with reusable UI components in `client/src/components/ui/`
- Page-based routing with dedicated pages in `client/src/pages/` for Dashboard, Control Charts, CTP Table, Trends, Tree view, Recommendations, Analytics, and Data Upload
- Custom chart components wrapping Recharts library for data visualization
- Path aliases (`@/`, `@shared/`, `@assets/`) for clean imports

## Backend Architecture

**Framework**: Express.js server with TypeScript

**Database ORM**: Prisma ORM configured for PostgreSQL (development) and Microsoft SQL Server (production)

**File Storage**: Multer for handling Excel file uploads (.xlsx, .xlsm, .xlsb formats)

**API Design**: RESTful API endpoints organized in `server/routes.ts`

**Key Design Decisions**:
- Database storage implementation (`DbStorage`) implementing `IStorage` interface
- Separation of concerns with `IStorage` interface defining all data operations
- Middleware for request logging and JSON parsing with conditional multipart/form-data support
- Vite integration for development server with HMR support
- Prisma Client singleton pattern in `server/db.ts` for connection management
- Content-Type based middleware routing (multipart/form-data bypasses JSON parsing)

## Database Schema

**Database**: PostgreSQL (development), Microsoft SQL Server (production)

**Core Tables**:
- `rts` - Regional Thermal Stations with location and identification
- `districts` - Microdistricts linked to RTS
- `ctp` - Central Thermal Points with control chart boundaries (UCL, CL, LCL) and meter status
- `measurements` - Daily measurements including makeup water, undermix, flow rates, temperature, and pressure
- `statistical_params` - Statistical parameters for Shewhart control charts
- `recommendations` - Automated recommendations based on statistical analysis
- `uploaded_files` - File upload history and processing status

**Design Rationale**: 
- UUID (VarChar) primary keys for scalability and distributed systems compatibility
- Denormalized control boundaries stored directly in CTP table for query performance
- Timestamp tracking on all entities for audit trails
- TEXT fields for flexible error storage in file uploads
- Referential integrity with cascade/no-action policies for complex relationships

## Statistical Analysis System

**Control Chart Implementation**: Shewhart control charts for statistical process control

**Statistical Functions**:
- Mean, standard deviation, and variance calculations
- Upper Control Limit (UCL), Central Line (CL), Lower Control Limit (LCL) computation
- Out-of-control point detection
- Trend analysis across multiple time horizons (day, week, month, year)

**Design Rationale**: Statistical calculations are performed server-side for consistency, with results cached and boundaries stored in the database to avoid repeated calculations.

## External Dependencies

**Database**: Microsoft SQL Server via Prisma Client

**Session Management**: Memory-based sessions (configured for production use with database-backed sessions if needed)

**Excel Processing**: 
- Multer for file uploads
- xlsx library for parsing Excel files (.xlsx, .xlsm, .xlsb formats)

**UI Components**: 
- Radix UI primitives for accessible component foundation
- Recharts for data visualization
- Tailwind CSS for styling with CSS variables for theming

**Form Management**: React Hook Form with Zod validation via `@hookform/resolvers`

**Development Tools**: 
- Replit-specific plugins for development environment integration
- TypeScript for type safety across the stack
- ESBuild for production bundling
- Prisma CLI for schema management and migrations

**Design Rationale**: The application uses established, well-maintained libraries to ensure reliability and minimize custom code maintenance. Prisma provides type-safe database access with excellent TypeScript integration.

## Database Setup

**Connection String Format (MSSQL)**:
```
sqlserver://host:port;database=dbname;user=username;password=password;encrypt=true;trustServerCertificate=true
```

**Commands**:
- `npx prisma generate` - Generate Prisma Client after schema changes
- `npx prisma db push` - Sync Prisma schema with database (development)
- `npx prisma studio` - Open Prisma Studio for database GUI

**Schema Location**: `prisma/schema.prisma`
