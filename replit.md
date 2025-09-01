# Overview

This is a full-stack cryptocurrency evaluation and portfolio management application built with React, Express, and PostgreSQL. The app helps users discover, rate, track, and manage cryptocurrency investments with a focus on beginner-friendly tools and data-driven decision making. It includes features for coin research, personal ratings, portfolio tracking, dollar-cost averaging (DCA) plans, and AI-powered market insights.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark/light theme support
- **State Management**: TanStack Query (React Query) for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Runtime**: Node.js with TypeScript and ESM modules
- **Framework**: Express.js with custom middleware for logging and error handling
- **API Design**: RESTful endpoints with consistent error handling and JWT-based authentication
- **Authentication**: JWT tokens (access + refresh) with bcrypt password hashing
- **Session Management**: HTTP-only secure cookies for refresh tokens, in-memory access tokens

## Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Database**: PostgreSQL (production) with Neon Database serverless support
- **Migrations**: Drizzle Kit for schema management and migrations
- **Schema**: Multi-user support with user isolation, watchlists, ratings, transactions, and DCA plans

## External Integrations
- **Market Data**: CoinGecko API as primary data source with rate limiting and caching
- **AI Services**: Groq API integration for cryptocurrency explanations and comparisons
- **Additional APIs**: Structured support for Crypto.com, CoinMarketCap, and Messari APIs

## Key Design Patterns
- **Monorepo Structure**: Shared schema definitions between client and server
- **Type Safety**: End-to-end TypeScript with Zod schemas for runtime validation
- **Error Boundaries**: Comprehensive error handling with user-friendly messages
- **Responsive Design**: Mobile-first approach with sidebar navigation and adaptive layouts
- **Caching Strategy**: Multi-level caching for API responses and user data
- **Security**: JWT-based auth, secure cookie handling, and input sanitization

# External Dependencies

## Core Technologies
- **Database**: PostgreSQL with Neon Database serverless hosting
- **Authentication**: JSON Web Tokens (JWT) with bcryptjs for password hashing
- **API Client**: Native fetch with retry logic and timeout handling
- **Form Validation**: Zod for schema validation and type inference

## Third-Party Services
- **CoinGecko API**: Primary cryptocurrency market data provider
- **Groq API**: AI-powered cryptocurrency analysis and explanations
- **Crypto.com API**: Optional exchange data integration (stub implementation)
- **CoinMarketCap API**: Secondary market data source (optional)
- **Messari API**: Fundamental analysis data (optional)

## Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **Code Quality**: TypeScript strict mode with path mapping for clean imports
- **Styling**: PostCSS with Tailwind CSS and CSS custom properties
- **Deployment**: Replit-optimized with runtime error overlay and development banners

## UI Components
- **Component Library**: Radix UI primitives with shadcn/ui styling
- **Icons**: Lucide React for consistent iconography
- **Theme System**: next-themes for dark/light mode switching
- **Charts**: Recharts for data visualization (configured but not fully implemented)

## Backend Services
- **HTTP Client**: Native fetch with retry logic and exponential backoff
- **Task Scheduling**: Planned integration for periodic market data updates
- **Email**: SMTP configuration for optional email notifications (not implemented)