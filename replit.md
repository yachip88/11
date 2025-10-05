# Overview

This project is an analytical dashboard for monitoring and analyzing makeup water consumption in Novosibirsk's district heating network. It tracks Central Thermal Points (CTP) across Regional Thermal Stations (RTS), offering statistical process control via Shewhart charts, automated recommendations, and comprehensive analytics. The system aims to optimize heating operations, identify anomalies, reduce water consumption, and improve maintenance planning for the Novosibirsk Heat Supply Company (НТСК).

# User Preferences

Preferred communication style: Simple, everyday language (Russian).

# System Architecture

## Frontend Architecture

**Framework**: React with TypeScript, Vite.
**UI Library**: shadcn/ui (Radix UI + Tailwind CSS).
**Routing**: wouter.
**State Management**: TanStack Query for server state management, caching, and invalidation.
**Key Design Decisions**: Component-based architecture, page-based routing, custom chart components using Recharts, path aliases for clean imports.

## Backend Architecture

**Framework**: Express.js server with TypeScript.
**Database ORM**: Prisma ORM (configured for PostgreSQL development and Microsoft SQL Server production).
**File Storage**: Multer for Excel file uploads.
**API Design**: RESTful API endpoints.
**Key Design Decisions**: `IStorage` interface for data operations, separation of concerns, middleware for logging and parsing, Vite integration, Prisma Client singleton.

## Database Schema

**Database**: PostgreSQL (development), Microsoft SQL Server (production).
**Core Tables**: `rts`, `districts`, `ctp`, `measurements`, `statistical_params`, `recommendations`, `uploaded_files`.
**Design Rationale**: UUID primary keys, denormalized control boundaries in CTP for performance, timestamp tracking, TEXT fields for flexibility, referential integrity.

## Statistical Analysis System

**Control Chart Implementation**: Shewhart control charts for statistical process control.
**Statistical Functions**: Mean, standard deviation, variance, UCL/CL/LCL computation, out-of-control point detection, trend analysis.
**Design Rationale**: Server-side statistical calculations for consistency, with results cached and boundaries stored in the database.

# External Dependencies

**Database**: Microsoft SQL Server via Prisma Client.
**Session Management**: Memory-based sessions.
**Excel Processing**: Multer for uploads, xlsx library for parsing.
**UI Components**: Radix UI, Recharts, Tailwind CSS.
**Form Management**: React Hook Form with Zod validation.
**Development Tools**: Replit plugins, TypeScript, ESBuild, Prisma CLI.
