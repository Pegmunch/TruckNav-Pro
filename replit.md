# Overview

This project is a specialized web application for truck navigation, designed to provide safe and efficient routing for heavy goods vehicles (HGVs). Its primary purpose is to help truck drivers plan routes that avoid restrictions based on vehicle dimensions (height, width, weight, length) and to locate truck-friendly facilities along their journey. The system aims to enhance safety and efficiency for professional drivers by offering intelligent route planning and real-time information.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework**: React with TypeScript and Vite.
- **UI/UX**: Shadcn/ui (Radix UI, Tailwind CSS) with a mobile-first, 3-mode workflow (Plan → Preview → Navigate). Features include a dedicated full-screen route planner, compact trip strip, MobileFAB for one-handed operation, professional touch targets (44px+), and Day (light) theme enforced on mobile. Responsive design uses CSS clamp() density tokens. Screen Wake Lock API prevents display sleep.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack React Query for server state; React Context for local UI state.
- **Forms**: React Hook Form with Zod validation.

## Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM modules.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **API Design**: RESTful endpoints for vehicle profiles, restrictions, facilities, and routes.
- **Authentication**: Replit Auth (OIDC) with Express sessions and PostgreSQL storage.
- **Subscription System**: Stripe-powered subscription management with access control middleware for features.

## Data Storage
- **Primary Database**: PostgreSQL with Neon serverless driver.
- **Schema Management**: Drizzle Kit for migrations.
- **Session Storage**: PostgreSQL-based session store.

## Core Data Models
- **Users**: Authentication and session management.
- **Subscriptions**: User subscriptions linked to pricing plans.
- **Subscription Plans**: 4 pricing tiers with feature access control.
- **Vehicle Profiles**: Dimensions, axle count, hazmat status.
- **Restrictions**: Geographic and type-based limits (height, width, weight).
- **Facilities**: Truck stops, fuel stations, parking areas with amenities.
- **Routes**: Saved routes including start/end, coordinates, and calculated paths.

## Technical Implementations & System Design
- **Smart Route Planning**: Calculates routes avoiding restrictions based on vehicle profiles.
- **Restriction Awareness**: Real-time checking of restrictions against vehicle dimensions.
- **Facility Discovery**: Search for truck-friendly facilities by type and location.
- **Interactive Mapping**:
    - **Map Engines**: MapLibre GL JS (primary, GPU-accelerated, 3D), Leaflet (fallback).
    - **Persistent Tile Source Design**: All 4 tile sources (roads-2d, roads-3d, satellite-2d, satellite-3d) defined at initialization.
    - **Mobile Layout**: Map always mounted at z-0 with HUD elements overlaid.
    - **Compass/Orientation Control**: Top-right compass button for bearing display and North reset.
    - **Professional Speedometer**: GPS-based live speed tracking with visual safety warnings, intelligent color-coding, and pulsing red ring when speeding.
    - **Real-Time Traffic Visualization**: TomTom Traffic Flow API integration with automatic color-coding and 5-minute auto-refresh.
    - **Traffic-Aware Route Coloring**: Routes display color-coded segments based on real-time traffic conditions, auto-resampled every 2 minutes.
    - **Crowdsourced Incident Reporting**: Community-driven system with 23 incident types, real-time feed, map markers, 2-minute auto-refresh, and 24-hour auto-expiration.
    - **Automatic GPS Position Lock & Real-Time Bearing Rotation**: Map auto-zooms to GPS location, rotates to match travel direction, with retry logic and error handling.
    - **GPS Singleton Provider**: Centralized, battery-optimized GPS tracking using React Context with EMA heading smoothing.
    - **Enhanced Mobile Marker Visibility**: Responsive GPS arrowhead marker sizing with high z-index, halo ring, shadows, and pulse animation.
    - **MapLibre WebGL Reliability**: Comprehensive WebGL capability detection with retry logic, extension checks, and graceful fallback to Leaflet.
    - **Robustness Features**: Includes GPS auto-zoom circuit breaker, postcode search resilience (LRU cache, exponential backoff), map animation safety, and navigation mode stability with telemetry.
- **Address Autocomplete & POI Search**:
    - **Photon API**: Free worldwide address search using OpenStreetMap data, integrated with GPS-powered POI search (Supermarket, Restaurant, Fuel, Shop categories).
    - **Search Method**: Supports city names, street addresses, or landmarks. Features 3-character minimum, 300ms debouncing, and error resilience.
    - **Saved Locations**: Favorites and recent searches.
- **Mobile Compatibility & PWA**:
    - **Progressive Web App**: Offline support via service worker and IndexedDB caching.
    - **iOS Enhancements**: Custom splash screens, meta tags for fullscreen and status bar.
    - **Update Management**: Automatic update detection.
    - **Offline Features**: Cached routes, restrictions, facilities.
    - Screen Wake Lock API, safe-area handling for iOS, Android hardware back button handling, orientation lock preferences.

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
- **TomTom Traffic Flow API**: Real-time traffic visualization.
  - **Required Environment Variable**: `VITE_TOMTOM_API_KEY`

## Address Autocomplete Services
- **Photon API**: Free worldwide address autocomplete (OpenStreetMap-based).
  - **Endpoint**: `https://photon.komoot.io/api/`

## Mapping Libraries
- **MapLibre GL JS**: Primary vector map engine.
- **Leaflet**: Fallback map rendering library.
- **React-Leaflet**: React bindings for Leaflet.
- **Tile Sources**: Google Maps, OpenStreetMap, Esri satellite imagery.

## Form and Data Validation
- **Zod**: Runtime type validation and schema definition.
- **React Hook Form**: Forms management.

## State Management
- **TanStack React Query**: Server state management.
- **Mobile Compatibility & PWA**:
    - **Progressive Web App**: Full offline support with service worker and IndexedDB caching.
    - **Clean PWA UI**: Development banner automatically hidden in standalone/PWA mode via CSS media query `@media (display-mode: standalone)`
    - **iOS Enhancements**: Custom splash screens for iPhone 15 Pro Max, 15 Pro, SE, 8 Plus, and iPad Pro.
    - **iOS Meta Tags**: Black-translucent status bar, fullscreen mode, theme colors for light/dark modes.
    - **Service Worker**: v2.0.0 with cache-first strategy for maps, network-first for APIs, background sync.
    - **Install Prompts**: iOS-specific "Add to Home Screen" instructions with visual guides.
    - **Update Management**: Automatic update detection with user-friendly toast notifications.
    - **Offline Features**: Cached routes, restrictions, facilities for offline navigation.
    - Screen Wake Lock API.
    - Safe-area handling for iOS.
    - Android hardware back button handling.
    - Orientation lock preferences.
