# Overview

This is an analytical dashboard application for monitoring and analyzing makeup water consumption in Novosibirsk's district heating network. The system tracks Central Thermal Points (CTP) across multiple Regional Thermal Stations (RTS), providing statistical process control using Shewhart control charts, automated recommendations, and comprehensive analytics.

The application serves Novosibirsk Heat Supply Company (НТСК) to optimize heating system operations, identify anomalies, reduce water consumption, and improve maintenance planning through data-driven insights.

# User Preferences

Preferred communication style: Simple, everyday language (Russian).

# Recent Changes (October 2025)

**Trend Chart Bank Filtering (October 4, 2025)**
- Extended TrendChart component to support bank-based RTS filtering for trend visualization
- Added custom queryFn to properly construct URLs with `rtsFilter` query parameters (`?rtsFilter=right` or `?rtsFilter=left`)
- Updated server-side `/api/trends/:period` endpoint to accept and process `rtsFilter` parameter
- Extended `getTrendData` method in storage layer to filter RTS by location field:
  - `rtsFilter: 'right'` → queries РТС with location = "Правый берег" (РТС-1, РТС-3, РТС-5)
  - `rtsFilter: 'left'` → queries РТС with location = "Левый берег" (РТС-2, РТС-4)
- Updated RTS location data in database: set correct "Правый берег" and "Левый берег" values for proper filtering
- Dashboard bank filter now correctly filters both statistics cards AND trend charts (previously only filtered statistics)
- E2e tests passing: Bank filtering verified for all three modes (All/Right/Left), trend data updates correctly

**Recommendations Page Fix (October 4, 2025)**
- Fixed recommendations page to use real CTP data instead of hardcoded mock data
- Changed CTP query type from `CTP[]` to `CTPWithDetails[]` to include related RTS and district information
- Mock recommendations now dynamically generated from first 3 CTPs with UCL/LCL boundaries
- Mock CTP names now show real data: `fullName (rts.code, district.name)` format
- Updated `actions` field handling: converted to JSON string to match schema type (`string | null`)
- Enhanced RecommendationCard to parse JSON action strings with safe fallback
- Mock data now calculates UCL/excess values based on actual CTP boundaries

**Upload History Bug Fix (October 4, 2025)**
- Fixed `/api/import-model` to correctly create `uploaded_files` records with all required fields:
  - `originalName`: Original filename from uploaded file
  - `fileType`: MIME type from multer
  - `size`: File size in bytes
  - `status`: Tracking progression (processing → completed/error)
- Fixed `records_processed` calculation to use actual database counts instead of parser results:
  - Changed from `result.ctpCount + result.measurementCount + result.vyvodCount` (inflated by duplicates)
  - To `db.cTP.count() + db.measurements.count() + db.vyvod.count()` (actual inserted records)
  - Example: Parser reports 15 vyvods but database stores 10 unique (after deduplication) → recordsProcessed = 183,343 (not 183,348)
- Added `/api/clear-database` endpoint for safe database cleanup in correct dependency order
- Added import `db` from `./db` to routes.ts for database count queries
- E2e tests passing: Upload history shows accurate record counts, CTP table displays correctly
- Created `design_guidelines.md` with Carbon Design System guidelines for industrial dashboard

**Previous Bug Fixes and UI Improvements (October 4, 2025)**
- Fixed nullable handling in CTP table:
  - `ctp.rts?.code || '—'` for nullable RTS relations
  - `ctp.district?.name || '—'` for nullable district relations
  - `measurement ? measurement.makeupWater.toFixed(1) : '—'` for nullable measurements
- Updated CTP table to display fullName (or name fallback) for all CTPs
- All LSP diagnostics resolved

**Model_2.5.20.xlsm Parser and Import System (October 4, 2025)**
- Added `Vyvod` (heat sources) table to database schema with one-to-many relationship to CTPs
- Extended CTP model with comprehensive fields:
  - Basic info: fullName, city, address, yearBuilt
  - Links: vyvodId (heat source), rtsId, districtId
  - Comments: commentPTU, commentRTS, commentSKIPiA (from different departments)
  - Status: operational status and notes
  - Extended statistics: av365G1, av365G2, min730, min365, min30, min7, percentFromG1, normativMinenergo
- Created `ModelParser` class (`server/model-parser.ts`) to parse the complete analytical model:
  - Extracts 419 CTPs with full metadata from "data ЦТП" sheet
  - Imports historical measurements from date columns (Excel format dates 45200+)
  - Auto-creates unique Vyvod entities from "Вывод" column
  - Batch processing for performance (50 CTPs, 100 measurements per batch)
  - Case-insensitive column mapping for Russian headers (toLowerCase() fix)
- Added `/api/import-model` endpoint for uploading Model_2.5.20.xlsm
- Updated Data Upload UI with dedicated Model Import section
- Prisma schema migrated to support new fields and relationships
- Successfully imported 307 CTPs with 183,026 measurements and 15 vyvods (heat sources)

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
