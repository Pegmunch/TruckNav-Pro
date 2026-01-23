# Overview

This project is a specialized web application for truck navigation, providing safe and efficient routing for Heavy Goods Vehicles (HGVs). Its primary purpose is to help truck drivers plan routes that avoid restrictions based on vehicle dimensions (height, width, weight, length) and to locate truck-friendly facilities. The system aims to enhance safety and efficiency for professional drivers through intelligent route planning, real-time information, and a mobile-first design.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
The frontend uses React with TypeScript and Vite, leveraging Shadcn/ui (Radix UI, Tailwind CSS) for a mobile-first design. It features a 3-mode workflow (Plan → Preview → Navigate), a full-screen route planner, compact trip strip, MobileFAB for one-handed operation, and professional touch targets (44px+). A Day theme is enforced on mobile, and responsive design uses CSS clamp() density tokens.

## Technical Implementations
- **Frontend**: Wouter for client-side routing, TanStack React Query for server state, React Context for local UI state, and React Hook Form with Zod for form management.
- **Backend**: Node.js with Express.js and TypeScript, using Drizzle ORM with PostgreSQL.
- **Authentication**: Replit Auth (OIDC) with Express sessions.
- **Subscription System**: Stripe-powered subscription management with access control.
- **Data Storage**: PostgreSQL with Neon serverless driver, Drizzle Kit for schema migrations, and PostgreSQL for session storage.
- **Core Data Models**: Users, Subscriptions, Vehicle Profiles, Restrictions, Facilities, Routes, Region Preferences, Fleet Vehicles, Operators, Service Records, Fuel Logs, and Vehicle Assignments.
- **Smart Route Planning**: Utilizes TomTom Truck Routing API as the primary engine with GraphHopper as a fallback. It includes intelligent restriction avoidance, spatial validation (Turf.js), critical violation detection, and dimensional checking, with automatic off-route rerouting and a comprehensive restriction warning system.
- **Facility Discovery**: Allows searching for truck-friendly facilities by type and location.
- **Interactive Mapping**: Uses MapLibre GL JS (primary, GPU-accelerated, 3D) and Leaflet (fallback), featuring persistent tile sources, a professional navigation HUD with an enhanced speed limit system, 3D navigation mode, turn-by-turn indicator, and real-time traffic visualization.
- **3-Layer Route Traffic Visualization**: Displays a base route line, traffic color overlay with real-time data, and incident icons along the route from both TomTom Incidents API and crowdsourced reports.
- **Address Autocomplete & POI Search**: Uses TomTom Search API for worldwide address autocomplete and truck-specific POI search with fuzzy matching and a bulletproof geocoding system.
- **Mobile Menu**: Full-screen UI with a tabbed interface for route planning, recent destinations, vehicle selection, theme settings, and tools.
- **Mobile Compatibility & PWA**: Progressive Web App with offline support, iOS enhancements, automatic update detection, and offline features for cached routes, restrictions, and facilities.
- **Voice Commands for Incident Reporting**: Hands-free voice command system using Web Speech API for reporting traffic incidents during navigation, with dynamic language switching.
- **Multilingual Voice System**: All voice features dynamically use the user's selected language from i18n settings, supporting 40+ language codes.
- **User Guide**: Comprehensive in-app documentation translated into 17 languages.
- **Customizable Alert Sounds**: Personalized audio alerts using Web Audio API for speed limit warnings, traffic incidents, and fatigue/break reminders.
- **Haptic Feedback System**: Vibration API integration for tactile feedback.
- **3D Buildings Layer**: Interactive 3D building extrusions visible at zoom level 14+ when 3D mode is active.
- **Dynamic Route Suggestions**: Intelligent alternative route detection during navigation using TomTom Truck Routing API.
- **AR Navigation Overlay**: Camera-based augmented reality navigation view using device camera and DeviceOrientationEvent.
- **Customizable Dashboard Widgets**: Modular widget system for real-time navigation data.
- **Fleet Management System (Desktop-Only)**: Enterprise-grade system with 14 integrated tabs for advanced analytics, compliance tracking, and enterprise capabilities, including Vehicle Registry, Operator Management, Service Records, Fuel Consumption, Document Management, Cost Analytics, Incident Logging, Trip Tracking, Compliance & Regulatory Tracking, Real-Time Fleet Tracking, Geofencing, Driver Behavior Analytics, Hours of Service (HoS) Compliance, and Customer Billing Portal.

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

## Traffic API Fallback
- **HERE Traffic API**: For traffic flow data when TomTom Traffic Flow fails.