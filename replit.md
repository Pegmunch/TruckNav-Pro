# Overview

This project is a specialized web application for truck navigation, designed to provide safe and efficient routing for heavy goods vehicles (HGVs). Its primary purpose is to help truck drivers plan routes that avoid restrictions based on vehicle dimensions (height, width, weight, length) and to locate truck-friendly facilities along their journey. The system aims to enhance safety and efficiency for professional drivers by offering intelligent route planning and real-time information.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript and Vite.
- **UI/UX**: Shadcn/ui components (built on Radix UI) for accessibility, styled with Tailwind CSS and CSS variables.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack React Query for server state and caching; React Context for local UI state.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**:
    - Mobile-first approach with a clean, 3-mode workflow (Plan → Preview → Navigate).
    - Dedicated full-screen route planner for mobile with a hamburger menu.
    - Compact trip strip for navigation data.
    - MobileFAB component with speed-dial for one-handed operation.
    - Professional touch targets (44px+) optimized for gloved use.
    - Day (light) theme enforced on mobile for better visibility.
    - Responsive design using CSS clamp() density tokens.
    - Screen Wake Lock API to prevent display sleep during navigation.

## Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM modules.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **API Design**: RESTful endpoints for vehicle profiles, restrictions, facilities, and routes.
- **Authentication**: Express sessions with PostgreSQL storage.

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless driver.
- **Schema Management**: Drizzle Kit for migrations.
- **Session Storage**: PostgreSQL-based session store using `connect-pg-simple`.

## Core Data Models
- **Vehicle Profiles**: Dimensions (height, width, length, weight), axle count, hazmat status.
- **Restrictions**: Geographic coordinates, type (height/width/weight), limits.
- **Facilities**: Truck stops, fuel stations, parking areas with amenities.
- **Routes**: Saved routes including start/end, coordinates, and calculated paths.

## Technical Implementations & System Design
- **Smart Route Planning**: Calculates routes avoiding restrictions based on vehicle profiles.
- **Restriction Awareness**: Real-time checking of restrictions against vehicle dimensions.
- **Facility Discovery**: Search for truck-friendly facilities by type and location.
- **Interactive Mapping**:
    - **Map Engines**: MapLibre GL JS (default, GPU-accelerated, 3D support); Leaflet (fallback for non-WebGL devices).
    - **Persistent Tile Source Design**: All 4 tile sources (roads-2d, roads-3d, satellite-2d, satellite-3d) defined at initialization to eliminate tile loss during pan/zoom.
    - **Performance**: Aggressive caching (maxTileCacheSize: 500) and smooth transitions (fadeDuration: 100ms).
    - **Mobile Layout Architecture**: Map always mounted at z-0 base layer with HUD elements overlaid using absolute positioning at higher z-indexes. Prevents conditional mounting/unmounting which caused MapLibre tile loss.
    - **Compass/Orientation Control**: Top-right corner compass button displays current bearing (rotates with map), resets map to North (bearing 0°) on click with smooth animation.
    - **Speedometer**: GPS-based live speed tracking with speed limit display and auto MPH/KPH conversion.
    - **Real-Time Traffic Visualization**: TomTom Traffic Flow API integration with automatic color-coding (red/orange/yellow/green) based on traffic speed ratios, zoom-based line width scaling (2-8px), and 5-minute auto-refresh for latest traffic data.
    - **Traffic-Aware Route Coloring**: Routes automatically display color-coded segments based on real-time traffic conditions - heavy traffic areas show in red (speed ratio <0.3), moderate in orange (<0.6), light in yellow (<0.8), and free flow in blue (≥0.8). Auto-resamples every 2 minutes for live updates.
    - **Crowdsourced Incident Reporting System**: Community-driven traffic awareness with 23-type incident library featuring emoji icons across 6 categories (Emergency Services, Vehicle Incidents, Road Conditions, Traffic, Hazards, Weather). Features include: interactive 3-step wizard for reporting incidents, real-time incident feed showing nearby reports with distances, map markers with emoji icons, auto-refresh every 2 minutes, 24-hour auto-expiration, and GPS-based location capture. Works independently without external API keys.
    - **Auto-Route Planning**: 3-second debounce delay prevents premature route calculation while entering postcodes.
    - **Automatic GPS Position Lock & Real-Time Bearing Rotation (Production-Grade)**: When navigation starts, map automatically zooms to user's exact GPS location at maximum street level (zoom 19.5, 60° pitch) with 2-second flyTo animation and auto-rotation to GPS heading direction. During navigation, map continuously rotates to match real-time GPS direction of travel so route always points forward/upward. Switches to roads mode for optimal visibility. Enterprise-level robustness: retry logic for GPS timeouts, intelligent fallback to route start coordinates if GPS unavailable, comprehensive error handling for all GeolocationPositionError codes (PERMISSION_DENIED, TIMEOUT, POSITION_UNAVAILABLE), map readiness checks, and user-friendly toast notifications. Route line rendered at 10px width for clear visibility. Blue arrowhead marker displays current GPS position on route.
- **Address Autocomplete**: Debounced search with postcode suggestions for UK, US, CA, AU, DE, and FR.
- **Mobile Compatibility**:
    - Screen Wake Lock API.
    - Safe-area handling for iOS.
    - Android hardware back button handling.
    - Enhanced PWA capabilities with offline route storage.
    - Orientation lock preferences.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database queries and schema management.

## UI and Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

## Routing and Navigation Services
- **Wouter**: Lightweight client-side routing.
- **Geolocation APIs**: Browser-based location services.

## Traffic Data Services
- **TomTom Traffic Flow API**: Real-time traffic visualization with vector tiles.
  - **Required Environment Variable**: `VITE_TOMTOM_API_KEY` - TomTom API key for traffic data access.
  - **Features**: Automatic color-coded traffic flow (red=heavy, orange=moderate, yellow=light, green=free flow).
  - **Auto-refresh**: Traffic data updates every 5 minutes.

## Mapping Libraries
- **MapLibre GL JS**: Primary vector map engine.
- **Leaflet**: Fallback map rendering library.
- **React-Leaflet**: React bindings for Leaflet.
- **Tile Sources**: Google Maps (3D), OpenStreetMap, Esri satellite imagery.

## Form and Data Validation
- **Zod**: Runtime type validation and schema definition.
- **React Hook Form**: Forms management.

## State Management
- **TanStack React Query**: Server state management.