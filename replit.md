# Overview

This is an analytical dashboard application for monitoring and analyzing makeup water consumption in Novosibirsk's district heating network. The system tracks Central Thermal Points (CTP) across multiple Regional Thermal Stations (RTS), providing statistical process control using Shewhart control charts, automated recommendations, and comprehensive analytics.

The application serves Novosibirsk Heat Supply Company (НТСК) to optimize heating system operations, identify anomalies, reduce water consumption, and improve maintenance planning through data-driven insights.

# User Preferences

Preferred communication style: Simple, everyday language.

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

**Database ORM**: Drizzle ORM configured for PostgreSQL

**File Storage**: Multer for handling Excel file uploads (.xlsx, .xlsm, .xlsb formats)

**API Design**: RESTful API endpoints organized in `server/routes.ts`

**Key Design Decisions**:
- In-memory storage implementation (`MemStorage`) as an abstraction layer over database operations
- Separation of concerns with `IStorage` interface defining all data operations
- Middleware for request logging and JSON parsing with raw body capture
- Vite integration for development server with HMR support

## Database Schema

**Core Tables**:
- `rts` - Regional Thermal Stations with location and identification
- `districts` - Microdistricts linked to RTS
- `ctp` - Central Thermal Points with control chart boundaries (UCL, CL, LCL) and meter status
- `measurements` - Daily measurements including makeup water, undermix, flow rates, temperature, and pressure
- `statistical_params` - Statistical parameters for Shewhart control charts
- `recommendations` - Automated recommendations based on statistical analysis
- `uploaded_files` - File upload history and processing status

**Design Rationale**: 
- UUID primary keys for scalability and distributed systems compatibility
- Denormalized control boundaries stored directly in CTP table for query performance
- Timestamp tracking on all entities for audit trails
- JSONB fields for flexible error storage in file uploads

## Statistical Analysis System

**Control Chart Implementation**: Shewhart control charts for statistical process control

**Statistical Functions**:
- Mean, standard deviation, and variance calculations
- Upper Control Limit (UCL), Central Line (CL), Lower Control Limit (LCL) computation
- Out-of-control point detection
- Trend analysis across multiple time horizons (day, week, month, year)

**Design Rationale**: Statistical calculations are performed server-side for consistency, with results cached and boundaries stored in the database to avoid repeated calculations.

## External Dependencies

**Database**: PostgreSQL via Neon serverless driver (`@neondatabase/serverless`)

**Session Management**: PostgreSQL-based sessions using `connect-pg-simple`

**Excel Processing**: Multer for file uploads with planned integration for Excel parsing libraries (xlsx/exceljs)

**UI Components**: 
- Radix UI primitives for accessible component foundation
- Recharts for data visualization
- Tailwind CSS for styling with CSS variables for theming

**Form Management**: React Hook Form with Zod validation via `@hookform/resolvers`

**Development Tools**: 
- Replit-specific plugins for development environment integration
- TypeScript for type safety across the stack
- ESBuild for production bundling

**Design Rationale**: The application uses established, well-maintained libraries to ensure reliability and minimize custom code maintenance. The Radix UI + Tailwind combination provides accessible, customizable components with a consistent design system.