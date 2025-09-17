import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { insertVehicleProfileSchema, insertRestrictionSchema, insertFacilitySchema, insertRouteSchema, insertTrafficIncidentSchema, insertUserSchema, insertLocationSchema, insertJourneySchema } from "@shared/schema";
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
  validatePagination
} from "./middleware/validation";

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
      
      // Create a planned journey entry for immediate "Last Journey" availability
      // Explicitly ensure we create a 'planned' journey for route planning phase
      const plannedJourney = await storage.startJourney(route.id);
      
      // Verify the journey was created with 'planned' status as expected
      if (plannedJourney.status !== 'planned') {
        throw new Error(`Journey created with unexpected status: ${plannedJourney.status}, expected: planned`);
      }
      
      // Return the route with journey information
      res.json({
        ...route,
        plannedJourney: plannedJourney
      });
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

  const httpServer = createServer(app);
  return httpServer;
}
