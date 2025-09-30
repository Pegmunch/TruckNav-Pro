# Overview

This is a specialized truck navigation web application designed to provide safe routing for heavy goods vehicles (HGVs) by avoiding restrictions based on vehicle dimensions. The system helps truck drivers plan routes while considering height, width, weight, and length restrictions, and locate truck-friendly facilities along their routes.

# Recent Changes

## September 30, 2025 - Mobile UX Enhancement & Workflow Simplification ✅
- **COMPLETED**: Mobile UX improvements with clean 3-mode workflow and focused mobile interface
- **Added**: 3-mode mobile workflow (Plan → Preview → Navigate) with dedicated UI states and automatic transitions
  - PLAN mode: Main "Plan Your Route" button opens simplified drawer for route setup
  - PREVIEW mode: Route displayed with compact trip strip and FAB menu access
  - NAVIGATE mode: Full-screen minimal UI with trip strip showing ETA/distance/maneuver
- **Fixed**: MapShell height calculations using flexbox (h-full) instead of CSS calc() for reliable cross-device rendering
- **Added**: MobileFAB component with speed-dial pattern positioned bottom-right for one-handed gloved operation
  - 64px primary button with expandable secondary actions (Settings, Menu, Clear Route)
  - Safe-area handling and consistent touch targets across all devices
- **Added**: CompactTripStrip component for stable navigation data display
  - Single-line layout with Route icon, ETA, distance, and next maneuver
  - Overflow handling and max-width constraints for text stability
- **Added**: SimplifiedRouteDrawer component replacing complex NavigationSidebar on mobile
  - Focused on essential route planning: from/to inputs, current location button, route preferences
  - Wired route preference tabs (Fastest, Eco, No Tolls) with proper state management
  - Reduced complexity from 20+ props to 6 essential props for streamlined mobile experience
- **Technical**: Unique map component keys per mode prevent container reuse errors and ensure clean state
- **Status**: All mobile UX enhancement tasks completed successfully

## September 29, 2025 - Mobile Compatibility Overhaul ✅
- **COMPLETED**: Comprehensive mobile compatibility improvements for professional truck drivers
- **Fixed**: Tile source inconsistency between mobile (ESRI) and desktop (OpenStreetMap) maps
- **Added**: 4-tier responsive design system with CSS clamp() density tokens for smooth scaling
- **Added**: MapShell wrapper component to eliminate "squashed" mobile layout issues
- **Added**: Screen Wake Lock API with iOS/Android fallbacks to prevent display sleep during navigation
- **Added**: Safe-area handling for iOS devices with notches and home indicators
- **Added**: Android hardware back button handling with priority system for navigation safety
- **Added**: Enhanced PWA capabilities with mobile network detection and offline route storage
- **Added**: Orientation lock preferences for landscape tablet navigation
- **Added**: Professional touch targets (44px+) optimized for truck drivers wearing gloves
- **Added**: Mobile-safe CSS classes and responsive navigation interface
- **Updated**: Mobile navigation header and bottom navigation buttons to use responsive density tokens
- **Status**: All mobile compatibility requirements completed and tested successfully

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple
- **API Design**: RESTful endpoints for vehicle profiles, restrictions, facilities, and routes

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema management
- **In-Memory Fallback**: Memory storage implementation for development/testing
- **Session Storage**: PostgreSQL-based sessions for user state persistence

## Core Data Models
- **Vehicle Profiles**: Store truck dimensions (height, width, length, weight), axle count, and hazmat status
- **Restrictions**: Geographic restrictions with coordinates, type (height/width/weight), and limits
- **Facilities**: Truck stops, fuel stations, parking areas with amenities and coordinates
- **Routes**: Saved routes with start/end locations, coordinates, and calculated paths

## Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL storage
- **Security**: CORS configuration and request logging middleware
- **Error Handling**: Centralized error handling with status code mapping

## Key Features
- **Smart Route Planning**: Route calculation that avoids restrictions based on vehicle profile
- **Restriction Awareness**: Real-time restriction checking against vehicle dimensions
- **Facility Discovery**: Search for truck-friendly facilities by type and location
- **Vehicle Profile Management**: Multiple vehicle configurations with dimension validation
- **Interactive Mapping**: Map-based route visualization and facility location display

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database queries and schema management

## UI and Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Fast development server and build tool with React plugin
- **TypeScript**: Static type checking across the entire application
- **ESLint/Prettier**: Code quality and formatting (implied by structure)

## Routing and Navigation Services
- **Wouter**: Lightweight client-side routing library
- **Geolocation APIs**: Browser-based location services for current position

## Form and Data Validation
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Performant forms with minimal re-renders
- **Drizzle Zod**: Integration between Drizzle schemas and Zod validation

## State Management
- **TanStack React Query**: Server state caching, synchronization, and background updates
- **React Context**: Local state management for UI components

The architecture prioritizes type safety, performance, and user experience while maintaining a clean separation between client and server concerns. The system is designed to be scalable and maintainable with proper error handling and validation throughout the stack.