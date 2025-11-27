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
- **Core Data Models**: Users, Subscriptions, Vehicle Profiles, Restrictions, Facilities, Routes, Region Preferences, Fleet Vehicles, Operators, Service Records, Fuel Logs, and Vehicle Assignments.
- **Smart Route Planning**: Utilizes TomTom Truck Routing API as the primary engine with GraphHopper as a fallback. It includes intelligent restriction avoidance, spatial validation (Turf.js), critical violation detection, automatic rerouting, and dimensional checking. Features a comprehensive restriction warning system with RestrictionsWarningPanel displaying color-coded violations (critical/high/medium severity) with dimensional comparisons, and interactive map markers (AlertTriangle icons) showing restriction locations during preview mode. Uses dual refs (restrictionViolationsRef, isNavigatingRef) with stable useCallback to prevent stale closures, ensuring markers render correctly across map style changes (roads ⇄ satellite/3D) via styledata event listener. Warnings and markers automatically hide when navigation starts for clean navigation interface.
- **Facility Discovery**: Allows searching for truck-friendly facilities by type and location.
- **Interactive Mapping**: Uses MapLibre GL JS (primary, GPU-accelerated, 3D) and Leaflet (fallback). Features persistent tile sources with lazy initialization to prevent duplicate source/layer registration. A professional navigation HUD with an enhanced speed limit system (OpenStreetMap Overpass API, region-specific signs), and an enhanced 3D navigation mode with dynamic segment tracking and dual-mode bearing. Includes a turn-by-turn indicator, CompactTripStrip (fixed positioning, z-index 1700) displaying ETA/distance/next maneuver at top during navigation, 8-button navigation control stack on right side (compass, recenter, zoom, 3D, traffic, satellite, incidents) with scrollable container for small viewports, real-time traffic visualization (TomTom Traffic Flow API), TomTom Traffic Incidents API, and crowdsourced incident reporting. Automatic GPS position lock, real-time bearing rotation, and vehicle-specific GPS markers are also implemented. Navigation controls only render during navigate mode (not preview) for clean interface.
- **Address Autocomplete & POI Search**: Uses TomTom Search API for worldwide address autocomplete and truck-specific POI search with fuzzy matching. Features bulletproof geocoding system with priority-based lookups (direct coordinates, cached, postcodes.io, TomTom Search API).
- **Mobile Menu**: Full-screen UI with a tabbed interface for route planning, recent destinations, vehicle selection, theme settings, and tools. Route planning includes live autocomplete with TomTom-powered dropdowns.
- **Mobile Compatibility & PWA**: Progressive Web App with offline support, iOS enhancements, automatic update detection, and offline features for cached routes, restrictions, and facilities.
- **Fleet Management System (Desktop-Only)**: Enterprise-grade comprehensive fleet management system for office/back-end use, accessible only on desktop devices. Features 9 integrated tabs with advanced analytics and compliance tracking:
  - **Vehicle Registry**: Track vehicles with registration numbers, trailer numbers, make/model, year, VIN, vehicle type, fuel type, tank capacity, mileage, and status (active/maintenance/decommissioned).
  - **Operator Management**: Manage drivers with personal details, license information (number, type, expiry), Driver CPC expiry, tachograph card details, employee ID, and status.
  - **Service Records**: Comprehensive maintenance tracking including service type (routine, MOT, repair, inspection, tachograph calibration), service dates, next due dates, mileage at service, costs, service providers, parts replaced, and automatic monitoring for upcoming services.
  - **Fuel Consumption**: Log fuel fill-ups with odometer readings, liters added, costs, location, fuel type, MPG calculations, and automatic fuel efficiency tracking per vehicle.
  - **Vehicle Assignments**: Track which operators are assigned to which vehicles with active/inactive status and assignment history.
  - **Document Management**: Store and manage official vehicle documents (registration, MOT, insurance, maintenance) with cloud storage integration.
  - **Cost Analytics Dashboard**: Professional financial analysis with pie charts (cost breakdown by type), bar charts (costs per vehicle), and monthly trend lines. Includes total cost tracking, average cost per vehicle, and category analysis.
  - **Incident Logging**: Track accidents, damage, violations, breakdowns, and near-misses with severity levels (critical/high/medium/low), root cause analysis, preventative measures, and insurance claim tracking.
  - **Trip Tracking & Profitability Analysis**: Monitor trips with planned vs. actual metrics (distance, duration, cost, revenue), profit margin calculations, route efficiency tracking, and fleet-wide trip analytics dashboard.
  - **Compliance & Regulatory Tracking**: Track regulatory compliance (DVLA checks, emission standards, hazmat certifications, tachograph inspections, working hours) with non-compliant record alerts.
  - **Predictive Maintenance**: AI-powered maintenance predictions based on mileage and usage patterns with risk level scoring (low/medium/high/critical).
  - **Role-Based Access Control (RBAC)**: 6 role types (admin, manager, dispatcher, driver, accountant, viewer) with granular permission management.
  - **Automatic Monitoring**: System monitors upcoming service dates, license/certification expirations, and non-compliance issues with configurable alert thresholds.
  - **Desktop Navigation**: Clean desktop-only header navigation for switching between Navigation and Fleet Management interfaces.

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

# Critical UI Defaults (DO NOT CHANGE)

These settings are LOCKED and must remain unchanged to preserve the user experience:

## Navigation UI Components
- **Left Action Stack Buttons**: ALWAYS h-11 w-11 (44px) with h-5 w-5 icons - professional touch targets
- **GPS Fallback Chip**: ALWAYS thin/transparent (bg-orange-500/80, px-2.5 py-1, text-xs) - NOT thick orange oval
- **SpeedometerHUD Position**: ALWAYS centered (left: 50%, transform: translateX(-50%), bottom: 50px + safe-area) - centered between left and right buttons
- **Turn Indicator Position**: ALWAYS below ETA header (top: 108px + safe-area-top) - top edge at bottom of CompactTripStrip
- **CompactTripStrip (ETA Header)**: ALWAYS visible during navigation at top: 56px + safe-area-top
- **Navigation Controls Stack**: 8 scrollable buttons on RIGHT side during navigation mode only

## Head-Up Navigation Display (CRITICAL FEATURE)
- **Preview Mode**: Route bearing calculated from start→destination, map rotated so route appears vertical (bottom-to-top)
- **Navigation Mode**: Map continuously rotates based on GPS heading to keep route vertical
- **Route Line**: ALWAYS begins at top edge of speedometer, goes upward to destination - map rotates beneath it
- **GPS Heading Rotation**: Runs at 30 FPS for smooth rotation during navigation
- **Map Padding During Navigation**: bottom: 260px (aligns route start with speedometer top edge), top: 300px

## Mode-Specific Behavior
- **Plan Mode**: Hamburger FAB in bottom-right corner (h-14 w-14, blue) for menu access
- **Preview Mode**: White header with "TruckNav Pro" title + green settings button, route oriented vertically
- **Navigate Mode**: Full navigation HUD with CompactTripStrip, TurnIndicator, SpeedometerHUD, and control stacks