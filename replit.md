# Overview

This project is a specialized web application for truck navigation, providing safe and efficient routing for Heavy Goods Vehicles (HGVs). Its primary purpose is to help truck drivers plan routes that avoid restrictions based on vehicle dimensions (height, width, weight, length) and to locate truck-friendly facilities. The system aims to enhance safety and efficiency for professional drivers through intelligent route planning, real-time information, and a mobile-first design.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
The frontend uses React with TypeScript and Vite, leveraging Shadcn/ui (Radix UI, Tailwind CSS) for a mobile-first design. It features a 3-mode workflow (Plan → Preview → Navigate), a full-screen route planner, compact trip strip, MobileFAB for one-handed operation, and professional touch targets (44px+). A Day theme is enforced on mobile, and responsive design uses CSS clamp() density tokens. The Screen Wake Lock API prevents display sleep.

## Technical Implementations
- **Frontend**: Wouter for client-side routing, TanStack React Query for server state, React Context for local UI state, and React Hook Form with Zod for form management.
- **Backend**: Node.js with Express.js and TypeScript, using Drizzle ORM with PostgreSQL.
- **Authentication**: Replit Auth (OIDC) with Express sessions.
- **Subscription System**: Stripe-powered subscription management with access control.
- **Data Storage**: PostgreSQL with Neon serverless driver, Drizzle Kit for schema migrations, and PostgreSQL for session storage.
- **Core Data Models**: Users, Subscriptions, Vehicle Profiles, Restrictions, Facilities, Routes, and Region Preferences.
- **Smart Route Planning**: Utilizes TomTom Truck Routing API as the primary engine with GraphHopper as a fallback. It includes intelligent restriction avoidance, spatial validation (Turf.js), critical violation detection, automatic rerouting, and dimensional checking.
- **Facility Discovery**: Allows searching for truck-friendly facilities by type and location.
- **Interactive Mapping**: Uses MapLibre GL JS (primary, GPU-accelerated, 3D) and Leaflet (fallback). Features persistent tile sources, a professional navigation HUD with an enhanced speed limit system (OpenStreetMap Overpass API, region-specific signs), and an enhanced 3D navigation mode with dynamic segment tracking and dual-mode bearing. Includes a turn-by-turn indicator, simplified navigation info bar, real-time traffic visualization (TomTom Traffic Flow API), TomTom Traffic Incidents API, and crowdsourced incident reporting. Automatic GPS position lock, real-time bearing rotation, and vehicle-specific GPS markers are also implemented.
- **Address Autocomplete & POI Search**: Uses TomTom Search API for worldwide address autocomplete and truck-specific POI search with fuzzy matching. Features bulletproof geocoding system with priority-based lookups (direct coordinates, cached, postcodes.io, TomTom Search API).
- **Mobile Menu**: Full-screen UI with a tabbed interface for route planning, recent destinations, vehicle selection, theme settings, and tools. Route planning includes live autocomplete with TomTom-powered dropdowns.
- **Mobile Compatibility & PWA**: Progressive Web App with offline support, iOS enhancements, automatic update detection, and offline features for cached routes, restrictions, and facilities.

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

## TomTom API Integration Suite
- **TomTom Search API**: For address autocomplete and POI search.
- **TomTom Truck Routing API**: Primary routing engine.
- **TomTom Traffic Flow API**: For real-time traffic visualization.
- **TomTom Traffic Incidents API**: For real-time verified incident data.
- **TomTom POI Search API**: For location-aware truck-specific POI search.

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