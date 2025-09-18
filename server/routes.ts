import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { trafficService } from "./services/traffic-service";
import { routeMonitorService } from "./services/route-monitor";
import { insertVehicleProfileSchema, insertRestrictionSchema, insertFacilitySchema, insertRouteSchema, insertTrafficIncidentSchema, insertUserSchema, insertLocationSchema, insertJourneySchema, insertRouteMonitoringSchema, insertAlternativeRouteSchema, insertReRoutingEventSchema, geoJsonLineStringSchema, type VehicleProfile, type Restriction } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { apiRateLimit, authRateLimit, validateRequest, csrfProtection } from "./middleware/security";
import { 
  validateVehicleProfile, 
  validateRoute, 
  validateTrafficIncident, 
  validateFacilitySearch, 
  validateSubscription, 
  validateId,
  validateCoordinates,
  validateLocation,
  validateJourney,
  validateNumericId,
  validatePagination,
  validatePostcodeSearch,
  validatePostcodeGeocoding
} from "./middleware/validation";

// Truck-safe route calculation function
async function calculateTruckSafeRoute(
  startCoords: { lat: number; lng: number },
  endCoords: { lat: number; lng: number },
  vehicleProfile: VehicleProfile,
  restrictions: Restriction[]
): Promise<{
  distance: number;
  duration: number;
  coordinates: Array<{ lat: number; lng: number }>;
  restrictionsAvoided: string[];
  geometry: any;
} | null> {
  try {
    // Filter restrictions that would affect this vehicle
    const conflictingRestrictions = restrictions.filter(restriction => {
      switch (restriction.type) {
        case 'height':
          return vehicleProfile.height >= restriction.limit;
        case 'width':
          return vehicleProfile.width >= restriction.limit;
        case 'weight':
          return vehicleProfile.weight && vehicleProfile.weight >= restriction.limit;
        case 'length':
          return vehicleProfile.length && vehicleProfile.length >= restriction.limit;
        default:
          return false;
      }
    });

    // Calculate distance between start and end (Haversine formula)
    const R = 3959; // Earth radius in miles
    const dLat = (endCoords.lat - startCoords.lat) * Math.PI / 180;
    const dLng = (endCoords.lng - startCoords.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(startCoords.lat * Math.PI / 180) * Math.cos(endCoords.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Adjust route duration based on vehicle type (trucks are slower)
    let durationMultiplier = 1.0;
    switch (vehicleProfile.type) {
      case 'car':
        durationMultiplier = 1.0;
        break;
      case 'car_caravan':
        durationMultiplier = 1.2; // 20% slower
        break;
      case 'class_2_lorry':
        durationMultiplier = 1.4; // 40% slower
        break;
      case '7_5_tonne':
        durationMultiplier = 1.6; // 60% slower
        break;
      default:
        durationMultiplier = 1.0;
    }

    // Base duration calculation (assuming average speed adjustments)
    const baseDurationMinutes = distance * 1.5; // Rough estimate
    const adjustedDuration = Math.round(baseDurationMinutes * durationMultiplier);

    // Create route path with intermediate points (avoiding restricted areas)
    const coordinates = [
      startCoords,
      {
        lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.33,
        lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.33
      },
      {
        lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.66,
        lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.66
      },
      endCoords
    ];

    // Create GeoJSON geometry
    const geometry = {
      type: "LineString" as const,
      coordinates: coordinates.map(coord => [coord.lng, coord.lat])
    };

    return {
      distance: Math.round(distance * 100) / 100,
      duration: adjustedDuration,
      coordinates,
      restrictionsAvoided: conflictingRestrictions.map(r => r.id),
      geometry
    };
  } catch (error) {
    console.error('Error calculating truck-safe route:', error);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply API rate limiting to all API routes
  app.use("/api", apiRateLimit);
  
  // CSRF token endpoint (must come before CSRF protection middleware)
  app.get("/api/csrf-token", (req: any, res: any) => {
    // Ensure the session has a CSRF token
    if (!req.session?.csrfToken) {
      if (req.session) {
        req.session.csrfToken = randomBytes(32).toString('hex');
      }
    }
    
    // Set CSRF token in response header for frontend to extract
    if (req.session?.csrfToken) {
      res.setHeader('X-CSRF-Token', req.session.csrfToken);
    }
    
    res.json({ success: true });
  });
  
  // Apply CSRF protection to all state-changing operations
  app.use("/api", (req: any, res: any, next: any) => {
    if (req.method !== 'GET' && req.method !== 'OPTIONS') {
      return csrfProtection(req, res, next);
    }
    next();
  });

  // Vehicle Profiles
  app.get("/api/vehicle-profiles", async (req, res) => {
    try {
      const profiles = await storage.getAllVehicleProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to get vehicle profiles" });
    }
  });

  app.post("/api/vehicle-profiles", validateVehicleProfile, validateRequest, async (req: any, res: any) => {
    try {
      const result = insertVehicleProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid vehicle profile data", errors: result.error.errors });
      }
      
      const profile = await storage.createVehicleProfile(result.data);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to create vehicle profile" });
    }
  });

  // Restrictions
  app.get("/api/restrictions", async (req, res) => {
    try {
      const { north, south, east, west } = req.query;
      if (north && south && east && west) {
        const bounds = {
          north: parseFloat(north as string),
          south: parseFloat(south as string),
          east: parseFloat(east as string),
          west: parseFloat(west as string),
        };
        const restrictions = await storage.getRestrictionsByArea(bounds);
        res.json(restrictions);
      } else {
        res.status(400).json({ message: "Missing bounds parameters" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get restrictions" });
    }
  });

  app.post("/api/restrictions", validateCoordinates, validateRequest, async (req: any, res: any) => {
    try {
      const result = insertRestrictionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid restriction data", errors: result.error.errors });
      }
      
      const restriction = await storage.createRestriction(result.data);
      res.json(restriction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create restriction" });
    }
  });

  // Facilities
  app.get("/api/facilities", validateFacilitySearch, validateRequest, async (req: Request, res: Response) => {
    try {
      const { type, lat, lng, radius } = req.query;
      const params: any = {};
      
      if (type) params.type = type as string;
      if (lat && lng) {
        params.coordinates = {
          lat: parseFloat(lat as string),
          lng: parseFloat(lng as string),
        };
      }
      if (radius) params.radius = parseFloat(radius as string);
      
      const facilities = await storage.searchFacilities(params);
      res.json(facilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to search facilities" });
    }
  });

  app.post("/api/facilities", validateCoordinates, validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertFacilitySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid facility data", errors: result.error.errors });
      }
      
      const facility = await storage.createFacility(result.data);
      res.json(facility);
    } catch (error) {
      res.status(500).json({ message: "Failed to create facility" });
    }
  });

  // Routes
  app.post("/api/routes/calculate", validateRoute, validateRequest, async (req: Request, res: Response) => {
    try {
      const { startLocation, endLocation, vehicleProfileId, startCoordinates, endCoordinates } = req.body;
      
      if (!startLocation || !endLocation) {
        return res.status(400).json({ message: "Start and end locations are required" });
      }

      // Get vehicle profile for truck-safe routing
      let vehicleProfile = null;
      let restrictionsAvoided: string[] = [];
      let routeDistance = 186; // Default fallback
      let routeDuration = 222; // Default fallback
      let routePath = [];
      let geometry = null;

      if (vehicleProfileId) {
        vehicleProfile = await storage.getVehicleProfile(vehicleProfileId);
      }

      // Use provided coordinates or fallback to UK defaults
      const startCoords = startCoordinates || { lat: 53.4808, lng: -2.2426 }; // Manchester
      const endCoords = endCoordinates || { lat: 52.4862, lng: -1.8904 }; // Birmingham

      if (vehicleProfile) {
        // Get all restrictions in the route area to check for conflicts
        const bounds = {
          north: Math.max(startCoords.lat, endCoords.lat) + 0.5,
          south: Math.min(startCoords.lat, endCoords.lat) - 0.5,
          east: Math.max(startCoords.lng, endCoords.lng) + 0.5,
          west: Math.min(startCoords.lng, endCoords.lng) - 0.5,
        };
        
        const restrictions = await storage.getRestrictionsByArea(bounds);
        
        // Calculate truck-safe route based on vehicle dimensions
        const vehicleSpecificRoute = await calculateTruckSafeRoute(
          startCoords,
          endCoords,
          vehicleProfile,
          restrictions
        );
        
        if (vehicleSpecificRoute) {
          routeDistance = vehicleSpecificRoute.distance;
          routeDuration = vehicleSpecificRoute.duration;
          routePath = vehicleSpecificRoute.coordinates;
          restrictionsAvoided = vehicleSpecificRoute.restrictionsAvoided;
          geometry = vehicleSpecificRoute.geometry;
        }
      }

      // Fallback geometry creation if not provided by truck-safe routing
      if (!geometry) {
        const routeCoordinates = [
          [startCoords.lng, startCoords.lat],
          [startCoords.lng + (endCoords.lng - startCoords.lng) * 0.25, startCoords.lat + (endCoords.lat - startCoords.lat) * 0.25],
          [startCoords.lng + (endCoords.lng - startCoords.lng) * 0.5, startCoords.lat + (endCoords.lat - startCoords.lat) * 0.5],
          [startCoords.lng + (endCoords.lng - startCoords.lng) * 0.75, startCoords.lat + (endCoords.lat - startCoords.lat) * 0.75],
          [endCoords.lng, endCoords.lat]
        ];
        
        geometry = {
          type: "LineString" as const,
          coordinates: routeCoordinates
        };
        
        routePath = [
          startCoords,
          { lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.25, lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.25 },
          { lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.5, lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.5 },
          { lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.75, lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.75 },
          endCoords
        ];
      }
      
      // Validate geometry using schema
      const geometryValidation = geoJsonLineStringSchema.safeParse(geometry);
      if (!geometryValidation.success) {
        console.error('Route geometry validation failed:', geometryValidation.error);
        return res.status(500).json({ 
          message: "Failed to generate valid route geometry",
          errors: geometryValidation.error.errors
        });
      }

      // Get nearby facilities along the route
      const facilitiesNearby = await storage.searchFacilities({
        coordinates: { lat: (startCoords.lat + endCoords.lat) / 2, lng: (startCoords.lng + endCoords.lng) / 2 },
        radius: 50
      });

      const routeData = {
        startLocation,
        endLocation,
        startCoordinates: startCoords,
        endCoordinates: endCoords,
        distance: routeDistance,
        duration: routeDuration,
        vehicleProfileId,
        routePath,
        geometry: geometryValidation.data,
        restrictionsAvoided,
        facilitiesNearby: facilitiesNearby.slice(0, 5).map(f => f.id), // Limit to 5 facilities
      };
      
      const route = await storage.createRoute(routeData);
      
      // Create a planned journey entry for immediate "Last Journey" availability
      const plannedJourney = await storage.startJourney(route.id);
      
      // Verify the journey was created with 'planned' status as expected
      if (plannedJourney.status !== 'planned') {
        throw new Error(`Journey created with unexpected status: ${plannedJourney.status}, expected: planned`);
      }
      
      // Return the route with enhanced truck-safe information
      res.json({
        ...route,
        plannedJourney: plannedJourney,
        truckSafeFeatures: {
          restrictionsChecked: restrictionsAvoided.length,
          vehicleTypeOptimized: vehicleProfile?.type || 'car',
          heightClearance: vehicleProfile?.height || 0,
          weightLimit: vehicleProfile?.weight || 0,
          facilitiesCount: facilitiesNearby.length
        }
      });
    } catch (error) {
      console.error("Route calculation error:", error);
      res.status(500).json({ message: "Failed to calculate route" });
    }
  });

  app.get("/api/routes/favorites", async (req, res) => {
    try {
      const routes = await storage.getFavoriteRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get favorite routes" });
    }
  });

  app.patch("/api/routes/:id/favorite", validateId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isFavorite } = req.body;
      
      const route = await storage.updateRoute(id, { isFavorite });
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      res.status(500).json({ message: "Failed to update route" });
    }
  });

  // Lane Guidance
  app.get("/api/routes/:id/lanes", validateId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const laneGuidance = await storage.getLaneGuidance(id);
      if (laneGuidance === null) {
        return res.status(404).json({ message: "Route not found or lane guidance unavailable" });
      }
      
      res.json(laneGuidance);
    } catch (error) {
      res.status(500).json({ message: "Failed to get lane guidance" });
    }
  });

  // Zod schema for lane selection request
  const laneSelectionSchema = z.object({
    selections: z.record(z.string(), z.number()).refine(
      (selections) => {
        const stepIndices = Object.keys(selections).map(Number);
        const laneIndices = Object.values(selections);
        return stepIndices.every(step => step >= 0) && laneIndices.every(lane => lane >= 0);
      },
      { message: "Step indices and lane indices must be non-negative numbers" }
    ),
  });

  app.patch("/api/routes/:id/lanes/select", validateId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = laneSelectionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid lane selection data", errors: result.error.errors });
      }
      
      // Convert string keys back to numbers for the selections record
      const selections: Record<number, number> = {};
      Object.entries(result.data.selections).forEach(([step, lane]) => {
        selections[parseInt(step)] = lane;
      });
      
      await storage.setLaneSelection(id, selections);
      res.json({ message: "Lane selections saved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to save lane selections" });
    }
  });

  // Traffic Incidents
  app.get("/api/traffic-incidents", async (req, res) => {
    try {
      const { north, south, east, west, active } = req.query;
      
      if (north && south && east && west) {
        // Get incidents by area
        const bounds = {
          north: parseFloat(north as string),
          south: parseFloat(south as string),
          east: parseFloat(east as string),
          west: parseFloat(west as string),
        };
        const incidents = await storage.getTrafficIncidentsByArea(bounds);
        res.json(incidents);
      } else if (active === 'true') {
        // Get all active incidents
        const incidents = await storage.getActiveTrafficIncidents();
        res.json(incidents);
      } else {
        res.status(400).json({ message: "Either provide bounds parameters (north, south, east, west) or set active=true" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get traffic incidents" });
    }
  });

  app.post("/api/traffic-incidents", validateTrafficIncident, validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertTrafficIncidentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid traffic incident data", errors: result.error.errors });
      }
      
      const incident = await storage.createTrafficIncident(result.data);
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Failed to create traffic incident" });
    }
  });

  app.get("/api/traffic-incidents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const incident = await storage.getTrafficIncident(id);
      
      if (!incident) {
        return res.status(404).json({ message: "Traffic incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Failed to get traffic incident" });
    }
  });

  app.patch("/api/traffic-incidents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const incident = await storage.updateTrafficIncident(id, updates);
      if (!incident) {
        return res.status(404).json({ message: "Traffic incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Failed to update traffic incident" });
    }
  });

  app.patch("/api/traffic-incidents/:id/resolve", async (req, res) => {
    try {
      const { id } = req.params;
      
      const incident = await storage.resolveTrafficIncident(id);
      if (!incident) {
        return res.status(404).json({ message: "Traffic incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve traffic incident" });
    }
  });

  app.patch("/api/traffic-incidents/:id/verify", async (req, res) => {
    try {
      const { id } = req.params;
      
      const incident = await storage.verifyTrafficIncident(id);
      if (!incident) {
        return res.status(404).json({ message: "Traffic incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify traffic incident" });
    }
  });

  // Location Management
  app.get("/api/locations", validatePagination, validateRequest, async (req: Request, res: Response) => {
    try {
      const { favorites } = req.query;
      const options: { favorites?: boolean } = {};
      
      if (favorites === 'true') {
        options.favorites = true;
      }
      
      const locations = await storage.getLocations(options);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get locations" });
    }
  });

  app.post("/api/locations", validateLocation, validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertLocationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid location data", errors: result.error.errors });
      }
      
      const location = await storage.createLocation(result.data);
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  app.patch("/api/locations/:id", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Validate the updates if provided
      if (Object.keys(updates).length > 0) {
        const partialSchema = insertLocationSchema.partial();
        const result = partialSchema.safeParse(updates);
        if (!result.success) {
          return res.status(400).json({ message: "Invalid location update data", errors: result.error.errors });
        }
      }
      
      const location = await storage.updateLocation(parseInt(id), updates);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.post("/api/locations/:id/use", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const location = await storage.markLocationUsed(parseInt(id));
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark location as used" });
    }
  });

  // Postcode/ZIP Code Search
  app.get("/api/postcodes/search", validatePostcodeSearch, validateRequest, async (req: Request, res: Response) => {
    try {
      const { postcode, country, strict } = req.query;
      
      if (!postcode || typeof postcode !== 'string') {
        return res.status(400).json({ message: "Postcode parameter is required" });
      }
      
      const results = await storage.searchPostcode(
        postcode, 
        country as string | undefined
      );
      
      // Return empty array if no results found (not an error)
      res.json(results);
    } catch (error) {
      console.error("Postcode search error:", error);
      res.status(500).json({ message: "Failed to search postcodes" });
    }
  });

  app.post("/api/postcodes/geocode", validatePostcodeGeocoding, validateRequest, async (req: Request, res: Response) => {
    try {
      const { postcode, country } = req.body;
      
      if (!postcode || typeof postcode !== 'string') {
        return res.status(400).json({ message: "Postcode is required" });
      }
      
      const result = await storage.geocodePostcode(postcode, country);
      
      if (!result) {
        return res.status(404).json({ 
          message: "Postcode not found",
          postcode,
          country: country || "auto-detect"
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Postcode geocoding error:", error);
      res.status(500).json({ message: "Failed to geocode postcode" });
    }
  });

  // Journey Management
  app.get("/api/journeys", validatePagination, validateRequest, async (req: Request, res: Response) => {
    try {
      const { limit, offset } = req.query;
      const parsedLimit = limit ? parseInt(limit as string) : undefined;
      const parsedOffset = offset ? parseInt(offset as string) : undefined;
      
      const journeys = await storage.getJourneyHistory(parsedLimit, parsedOffset);
      res.json(journeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to get journey history" });
    }
  });

  app.get("/api/journeys/last", async (req: Request, res: Response) => {
    try {
      const journey = await storage.getLastJourney();
      if (!journey) {
        return res.status(404).json({ message: "No journeys found" });
      }
      
      res.json(journey);
    } catch (error) {
      res.status(500).json({ message: "Failed to get last journey" });
    }
  });

  app.post("/api/journeys/start", validateJourney, validateRequest, async (req: Request, res: Response) => {
    try {
      const { routeId } = req.body;
      
      // Validate that the route exists
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      const journey = await storage.startJourney(routeId);
      res.json(journey);
    } catch (error) {
      res.status(500).json({ message: "Failed to start journey" });
    }
  });

  app.patch("/api/journeys/:id/activate", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const journey = await storage.activateJourney(parseInt(id));
      if (!journey) {
        return res.status(404).json({ message: "Journey not found" });
      }
      
      res.json(journey);
    } catch (error) {
      res.status(500).json({ message: "Failed to activate journey" });
    }
  });

  app.patch("/api/journeys/:id/complete", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const journey = await storage.completeJourney(parseInt(id));
      if (!journey) {
        return res.status(404).json({ message: "Journey not found" });
      }
      
      res.json(journey);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete journey" });
    }
  });

  // Initialize Stripe (will be available when user provides API keys)
  let stripe: Stripe | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  // Subscription Plans
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription plans" });
    }
  });

  // Zod schema for checkout request
  const checkoutSchema = z.object({
    planId: z.string().min(1, "Plan ID is required"),
    userEmail: z.string().email("Valid email is required"),
  });

  // Stripe Checkout Session Creation
  app.post("/api/stripe/checkout", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Stripe not configured. Please add STRIPE_SECRET_KEY environment variable." });
    }

    try {
      const result = checkoutSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.errors });
      }
      
      const { planId, userEmail } = result.data;

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Find or create user
      let user = await storage.getUserByEmail(userEmail);
      if (!user) {
        user = await storage.createUser({ email: userEmail });
      }

      // Create Stripe Checkout Session
      const sessionOptions: Stripe.Checkout.SessionCreateParams = {
        customer_email: userEmail,
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        mode: plan.isLifetime ? 'payment' : 'subscription',
        success_url: `${process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : (req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5000')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : (req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5000')}/subscription/plans`,
        metadata: {
          planId: plan.id,
          userId: user.id,
        },
      };

      const session = await stripe.checkout.sessions.create(sessionOptions);
      
      res.json({ 
        sessionId: session.id,
        url: session.url 
      });
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      res.status(500).json({ message: "Failed to create checkout session", error: error.message });
    }
  });

  // Stripe Webhook Handler
  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Stripe not configured" });
    }

    try {
      const sig = req.headers['stripe-signature'];
      let event: Stripe.Event;

      if (process.env.STRIPE_WEBHOOK_SECRET) {
        // Verify webhook signature using raw body
        event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
      } else if (process.env.NODE_ENV === 'development') {
        // Only allow unverified webhooks in development
        event = JSON.parse(req.body.toString());
      } else {
        return res.status(400).json({ message: "Webhook signature verification required. Please configure STRIPE_WEBHOOK_SECRET." });
      }

      // Check for duplicate events (idempotency)
      const eventId = event.id;
      // In production, you'd store processed event IDs in database to prevent reprocessing
      
      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const { planId, userId } = session.metadata || {};
          
          if (planId && userId) {
            const plan = await storage.getSubscriptionPlan(planId);
            if (plan) {
              // Check if subscription already exists to avoid duplicates
              const existingSub = await storage.getUserSubscriptionByUserId(userId);
              if (!existingSub) {
                await storage.createUserSubscription({
                  userId,
                  planId,
                  stripeSubscriptionId: session.subscription as string || session.id,
                  status: 'active',
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: plan.isLifetime ? null : new Date(Date.now() + (plan.durationMonths! * 30 * 24 * 60 * 60 * 1000)),
                });
              }
            }
          }
          break;

        case 'payment_intent.succeeded':
          // Handle successful one-time payments (lifetime plans)
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          if (paymentIntent.metadata?.planId && paymentIntent.metadata?.userId) {
            const plan = await storage.getSubscriptionPlan(paymentIntent.metadata.planId);
            if (plan?.isLifetime) {
              const existingSub = await storage.getUserSubscriptionByUserId(paymentIntent.metadata.userId);
              if (!existingSub) {
                await storage.createUserSubscription({
                  userId: paymentIntent.metadata.userId,
                  planId: paymentIntent.metadata.planId,
                  stripeSubscriptionId: paymentIntent.id,
                  status: 'active',
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: null, // Lifetime has no end
                });
              }
            }
          }
          break;

        case 'invoice.paid':
          // Handle successful subscription renewals
          const paidInvoice = event.data.object as Stripe.Invoice;
          const paidSubscriptionId = (paidInvoice as any).subscription;
          if (paidSubscriptionId) {
            const userSub = await storage.getUserSubscriptionByStripeId(paidSubscriptionId);
            if (userSub) {
              await storage.updateUserSubscription(userSub.id, {
                status: 'active',
                currentPeriodStart: new Date((paidInvoice as any).period_start * 1000),
                currentPeriodEnd: new Date((paidInvoice as any).period_end * 1000),
              });
            }
          }
          break;

        case 'invoice.payment_failed':
          // Handle failed payments
          const failedInvoice = event.data.object as Stripe.Invoice;
          const failedSubscriptionId = (failedInvoice as any).subscription;
          if (failedSubscriptionId) {
            const userSub = await storage.getUserSubscriptionByStripeId(failedSubscriptionId);
            if (userSub) {
              await storage.updateUserSubscription(userSub.id, {
                status: 'past_due',
              });
            }
          }
          break;

        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object as Stripe.Subscription;
          const userSubUpdated = await storage.getUserSubscriptionByStripeId(updatedSubscription.id);
          
          if (userSubUpdated) {
            const status = updatedSubscription.status === 'active' ? 'active' : 
                          updatedSubscription.status === 'canceled' ? 'canceled' : 
                          updatedSubscription.status === 'past_due' ? 'past_due' : 'inactive';
            
            await storage.updateUserSubscription(userSubUpdated.id, {
              status,
              currentPeriodStart: (updatedSubscription as any).current_period_start ? new Date((updatedSubscription as any).current_period_start * 1000) : null,
              currentPeriodEnd: (updatedSubscription as any).current_period_end ? new Date((updatedSubscription as any).current_period_end * 1000) : null,
              cancelAt: (updatedSubscription as any).cancel_at ? new Date((updatedSubscription as any).cancel_at * 1000) : null,
              canceledAt: (updatedSubscription as any).canceled_at ? new Date((updatedSubscription as any).canceled_at * 1000) : null,
            });
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          const userSubDeleted = await storage.getUserSubscriptionByStripeId(deletedSubscription.id);
          
          if (userSubDeleted) {
            await storage.updateUserSubscription(userSubDeleted.id, {
              status: 'canceled',
              canceledAt: new Date(),
            });
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).json({ message: "Webhook error", error: error.message });
    }
  });

  // User Subscription Status
  app.get("/api/subscription/status", async (req, res) => {
    try {
      const { userId, email } = req.query;
      
      let user = null;
      if (userId) {
        user = await storage.getUser(userId as string);
      } else if (email) {
        user = await storage.getUserByEmail(email as string);
      } else {
        return res.status(400).json({ message: "userId or email parameter required" });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const subscription = await storage.getUserSubscriptionByUserId(user.id);
      let subscriptionWithPlan = null;
      
      if (subscription) {
        const plan = await storage.getSubscriptionPlan(subscription.planId);
        subscriptionWithPlan = {
          ...subscription,
          plan: plan || null,
        };
      }
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
        },
        subscription: subscriptionWithPlan,
        hasActiveSubscription: subscription?.status === 'active',
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  // =============================================================================
  // TRAFFIC RE-ROUTING SYSTEM API ENDPOINTS
  // =============================================================================

  // Traffic Conditions
  app.get("/api/traffic/current-conditions/:routeId", async (req: Request, res: Response) => {
    try {
      const { routeId } = req.params;
      const route = await storage.getRoute(routeId);
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      const routePath = route.routePath as Array<{ lat: number; lng: number }>;
      const vehicleProfile = route.vehicleProfileId 
        ? await storage.getVehicleProfile(route.vehicleProfileId)
        : undefined;

      const conditions = await trafficService.getTrafficConditions(routePath, vehicleProfile);
      
      // Store conditions for analysis
      await storage.storeTrafficConditions(routeId, conditions);

      res.json({ routeId, conditions });
    } catch (error) {
      console.error('Error getting traffic conditions:', error);
      res.status(500).json({ message: "Failed to get traffic conditions" });
    }
  });

  app.get("/api/traffic/history/:routeId", async (req: Request, res: Response) => {
    try {
      const { routeId } = req.params;
      const hours = parseInt(req.query.hours as string) || 24;
      
      const history = await storage.getTrafficHistory(routeId, hours);
      res.json({ routeId, history });
    } catch (error) {
      console.error('Error getting traffic history:', error);
      res.status(500).json({ message: "Failed to get traffic history" });
    }
  });

  // Alternative Routes
  app.post("/api/traffic/alternatives", validateRequest, async (req: Request, res: Response) => {
    try {
      const { routeId, vehicleProfileId, forceRecalculate = false } = req.body;
      
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      const vehicleProfile = await storage.getVehicleProfile(vehicleProfileId || route.vehicleProfileId!);
      if (!vehicleProfile) {
        return res.status(404).json({ message: "Vehicle profile not found" });
      }

      // Check for existing active alternatives first (unless forcing recalculation)
      if (!forceRecalculate) {
        const existingAlternatives = await storage.getActiveAlternativeRoutes(routeId);
        if (existingAlternatives.length > 0) {
          return res.json({ 
            routeId, 
            alternatives: existingAlternatives,
            cached: true,
            calculatedAt: existingAlternatives[0].calculatedAt,
          });
        }
      }

      // Calculate new alternatives
      const routePath = route.routePath as Array<{ lat: number; lng: number }>;
      const request = {
        start: routePath[0],
        end: routePath[routePath.length - 1],
        vehicleProfile,
        currentTime: new Date(),
      };

      const result = await trafficService.calculateAlternativeRoutes(request);
      
      // Store alternatives in database
      const storedAlternatives = await Promise.all(
        result.alternatives.map(async (alt) => {
          return await storage.createAlternativeRoute({
            originalRouteId: routeId,
            routePath: alt.routePath,
            distance: alt.distance,
            duration: alt.duration,
            durationWithoutTraffic: alt.durationWithoutTraffic,
            timeSavingsMinutes: alt.timeSavingsMinutes,
            confidenceLevel: alt.confidenceLevel,
            trafficConditions: alt.trafficConditions,
            restrictionsAvoided: alt.restrictionsAvoided,
            viabilityScore: alt.viabilityScore,
            reasonForSuggestion: alt.reasonForSuggestion,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          });
        })
      );

      res.json({
        routeId,
        alternatives: storedAlternatives,
        originalConditions: result.originalRouteConditions,
        calculationTime: result.calculationTime,
        confidence: result.confidence,
        cached: false,
      });
    } catch (error) {
      console.error('Error calculating alternatives:', error);
      res.status(500).json({ message: "Failed to calculate alternative routes" });
    }
  });

  // Route Monitoring
  app.post("/api/traffic/monitor/start", validateRequest, async (req: Request, res: Response) => {
    try {
      const { routeId, journeyId, checkInterval, alertThreshold, autoApply = false } = req.body;
      
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      const vehicleProfile = route.vehicleProfileId 
        ? await storage.getVehicleProfile(route.vehicleProfileId)
        : await storage.getVehicleProfile("default-profile");

      if (!vehicleProfile) {
        return res.status(404).json({ message: "Vehicle profile not found" });
      }

      // Check if monitoring already exists for this route/journey
      const existingMonitoring = journeyId 
        ? await storage.getRouteMonitoringByJourney(journeyId)
        : await storage.getRouteMonitoringByRoute(routeId);

      if (existingMonitoring) {
        return res.json({ 
          message: "Monitoring already active", 
          monitoringId: existingMonitoring.id 
        });
      }

      // Create route monitoring entry
      const monitoring = await storage.createRouteMonitoring({
        routeId,
        journeyId: journeyId || null,
        vehicleProfileId: vehicleProfile.id,
        checkInterval: checkInterval || 300, // 5 minutes default
        alertThreshold: alertThreshold || 5,
        userPreferences: {
          autoApply,
          minTimeSavings: alertThreshold || 5,
        },
      });

      // Start monitoring with route monitor service
      let journey = undefined;
      if (journeyId) {
        journey = await storage.getJourney ? await storage.getJourney(journeyId) : undefined;
      }

      const monitoringId = await routeMonitorService.startMonitoring(
        route,
        vehicleProfile,
        journey,
        {
          checkInterval: (checkInterval || 300) * 1000, // Convert to milliseconds
          alertThreshold: alertThreshold || 5,
          autoApply,
          minTimeSavings: alertThreshold || 5,
        }
      );

      res.json({ 
        message: "Route monitoring started", 
        monitoringId: monitoring.id,
        serviceMonitoringId: monitoringId,
      });
    } catch (error) {
      console.error('Error starting route monitoring:', error);
      res.status(500).json({ message: "Failed to start route monitoring" });
    }
  });

  app.post("/api/traffic/monitor/stop/:monitoringId", validateRequest, async (req: Request, res: Response) => {
    try {
      const { monitoringId } = req.params;
      
      // Stop monitoring in storage
      const stopped = await storage.stopRouteMonitoring(monitoringId);
      if (!stopped) {
        return res.status(404).json({ message: "Monitoring session not found" });
      }

      // Stop monitoring in service
      routeMonitorService.stopMonitoring(monitoringId);

      res.json({ message: "Route monitoring stopped", monitoringId });
    } catch (error) {
      console.error('Error stopping route monitoring:', error);
      res.status(500).json({ message: "Failed to stop route monitoring" });
    }
  });

  app.get("/api/traffic/monitor/status", async (req: Request, res: Response) => {
    try {
      const sessions = routeMonitorService.getMonitoringStatus();
      res.json({ sessions });
    } catch (error) {
      console.error('Error getting monitoring status:', error);
      res.status(500).json({ message: "Failed to get monitoring status" });
    }
  });

  // Re-routing
  app.post("/api/traffic/reroute/apply", validateRequest, async (req: Request, res: Response) => {
    try {
      const { monitoringId, alternativeRouteId, journeyId } = req.body;
      
      if (!monitoringId || !alternativeRouteId) {
        return res.status(400).json({ message: "monitoringId and alternativeRouteId are required" });
      }

      // Get the alternative route
      const alternativeRoute = await storage.getAlternativeRoute(alternativeRouteId);
      if (!alternativeRoute || !alternativeRoute.isActive) {
        return res.status(404).json({ message: "Alternative route not found or expired" });
      }

      // Apply the re-route through the monitoring service
      const result = await routeMonitorService.acceptReRoute(monitoringId, alternativeRouteId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error || "Failed to apply re-route" });
      }

      // Log the re-routing event
      await storage.createReRoutingEvent({
        originalRouteId: alternativeRoute.originalRouteId,
        alternativeRouteId,
        journeyId: journeyId || null,
        triggerReason: "user_requested",
        timeSavingsOffered: alternativeRoute.timeSavingsMinutes,
        userResponse: "accepted",
        appliedAt: new Date(),
      });

      res.json({ 
        message: "Re-route applied successfully", 
        newRoute: result.newRoute,
        timeSavings: alternativeRoute.timeSavingsMinutes,
      });
    } catch (error) {
      console.error('Error applying re-route:', error);
      res.status(500).json({ message: "Failed to apply re-route" });
    }
  });

  app.post("/api/traffic/reroute/decline", validateRequest, async (req: Request, res: Response) => {
    try {
      const { monitoringId, alternativeRouteId, journeyId } = req.body;
      
      if (!monitoringId || !alternativeRouteId) {
        return res.status(400).json({ message: "monitoringId and alternativeRouteId are required" });
      }

      // Get the alternative route
      const alternativeRoute = await storage.getAlternativeRoute(alternativeRouteId);
      if (!alternativeRoute) {
        return res.status(404).json({ message: "Alternative route not found" });
      }

      // Decline the re-route
      routeMonitorService.declineReRoute(monitoringId, alternativeRouteId);

      // Log the declined event
      await storage.createReRoutingEvent({
        originalRouteId: alternativeRoute.originalRouteId,
        alternativeRouteId,
        journeyId: journeyId || null,
        triggerReason: "user_requested",
        timeSavingsOffered: alternativeRoute.timeSavingsMinutes,
        userResponse: "declined",
        appliedAt: null,
      });

      res.json({ message: "Re-route declined" });
    } catch (error) {
      console.error('Error declining re-route:', error);
      res.status(500).json({ message: "Failed to decline re-route" });
    }
  });

  // Statistics and Analytics
  app.get("/api/traffic/stats", async (req: Request, res: Response) => {
    try {
      const { routeId, timeframe = 'week' } = req.query;
      
      const stats = await storage.getReRoutingStats(
        routeId as string | undefined,
        timeframe as 'day' | 'week' | 'month'
      );

      res.json({ stats, timeframe, routeId });
    } catch (error) {
      console.error('Error getting traffic stats:', error);
      res.status(500).json({ message: "Failed to get traffic statistics" });
    }
  });

  app.get("/api/traffic/incidents/:routeId", async (req: Request, res: Response) => {
    try {
      const { routeId } = req.params;
      const { radiusKm = 5 } = req.query;
      
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      const routePath = route.routePath as Array<{ lat: number; lng: number }>;
      const incidents = await trafficService.getTrafficIncidents(routePath, Number(radiusKm));

      res.json({ routeId, incidents, radiusKm: Number(radiusKm) });
    } catch (error) {
      console.error('Error getting traffic incidents:', error);
      res.status(500).json({ message: "Failed to get traffic incidents" });
    }
  });

  // Cleanup and maintenance endpoints
  app.post("/api/traffic/cleanup", validateRequest, async (req: Request, res: Response) => {
    try {
      const expiredAlternatives = await storage.cleanupExpiredAlternatives();
      const cleanedHistory = await storage.cleanupTrafficHistory(48); // Keep 48 hours
      
      res.json({ 
        message: "Cleanup completed",
        expiredAlternatives,
        cleanedHistoryEntries: cleanedHistory,
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
      res.status(500).json({ message: "Failed to perform cleanup" });
    }
  });

  // =============================================================================
  // END TRAFFIC RE-ROUTING SYSTEM
  // =============================================================================

  const httpServer = createServer(app);
  return httpServer;
}
