import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVehicleProfileSchema, insertRestrictionSchema, insertFacilitySchema, insertRouteSchema, insertTrafficIncidentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Vehicle Profiles
  app.get("/api/vehicle-profiles", async (req, res) => {
    try {
      const profiles = await storage.getAllVehicleProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to get vehicle profiles" });
    }
  });

  app.post("/api/vehicle-profiles", async (req, res) => {
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

  app.post("/api/restrictions", async (req, res) => {
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
  app.get("/api/facilities", async (req, res) => {
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

  app.post("/api/facilities", async (req, res) => {
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
  app.post("/api/routes/calculate", async (req, res) => {
    try {
      const { startLocation, endLocation, vehicleProfileId } = req.body;
      
      if (!startLocation || !endLocation) {
        return res.status(400).json({ message: "Start and end locations are required" });
      }

      // Mock route calculation - in real implementation, this would use a routing service
      const mockRoute = {
        startLocation,
        endLocation,
        startCoordinates: { lat: 53.4808, lng: -2.2426 }, // Manchester
        endCoordinates: { lat: 52.4862, lng: -1.8904 }, // Birmingham
        distance: 186,
        duration: 222, // 3h 42m in minutes
        vehicleProfileId,
        routePath: [
          { lat: 53.4808, lng: -2.2426 },
          { lat: 52.9569, lng: -2.0642 },
          { lat: 52.4862, lng: -1.8904 }
        ],
        restrictionsAvoided: ["rest-1", "rest-2"],
        facilitiesNearby: ["facility-1", "facility-2"],
      };
      
      const route = await storage.createRoute(mockRoute);
      res.json(route);
    } catch (error) {
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

  app.patch("/api/routes/:id/favorite", async (req, res) => {
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

  app.post("/api/traffic-incidents", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
