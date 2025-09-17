import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, boolean, jsonb, timestamp, decimal, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Lane selection data types
export const laneOptionSchema = z.object({
  index: z.number(), // lane position (0-based from left)
  direction: z.enum(['left', 'right', 'straight', 'exit']), // lane direction/purpose
  restrictions: z.array(z.string()).optional(), // optional restrictions (e.g., ["no-trucks", "weight-limit"])
  allowedVehicles: z.array(z.string()).optional(), // optional allowed vehicle types
  recommended: z.boolean().optional(), // whether this lane is recommended for the vehicle
});

export const laneSegmentSchema = z.object({
  stepIndex: z.number(), // which step in the route this applies to
  roadName: z.string(), // name of the road/street
  maneuverType: z.enum(['straight', 'turn-left', 'turn-right', 'merge', 'exit', 'enter']), // type of maneuver
  distance: z.number(), // distance to this maneuver (in miles)
  totalLanes: z.number(), // total number of lanes available
  laneOptions: z.array(laneOptionSchema), // array of available lanes
  advisory: z.string().optional(), // optional advisory text
});

export const vehicleProfiles = pgTable("vehicle_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("truck"), // 'car' or 'truck'
  height: real("height").notNull(), // in feet
  width: real("width").notNull(), // in feet
  length: real("length"), // in feet
  weight: real("weight"), // in tonnes
  axles: integer("axles").default(4),
  isHazmat: boolean("is_hazmat").default(false),
});

export const restrictions = pgTable("restrictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  location: text("location").notNull(),
  type: text("type").notNull(), // 'height', 'width', 'weight', 'length'
  limit: real("limit").notNull(), // in feet or tonnes
  description: text("description"),
  coordinates: jsonb("coordinates"), // { lat: number, lng: number }
  roadName: text("road_name"),
  country: text("country").default('UK'),
});

export const facilities = pgTable("facilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'truck_stop', 'fuel', 'parking', 'restaurant', 'hotel', 'rest_area'
  coordinates: jsonb("coordinates").notNull(), // { lat: number, lng: number }
  address: text("address"),
  amenities: jsonb("amenities"), // array of strings
  rating: real("rating"),
  reviewCount: integer("review_count").default(0),
  truckParking: boolean("truck_parking").default(false),
  fuel: boolean("fuel").default(false),
  restaurant: boolean("restaurant").default(false),
  restrooms: boolean("restrooms").default(false),
  showers: boolean("showers").default(false),
  country: text("country").default('UK'),
});

export const routes = pgTable("routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  startCoordinates: jsonb("start_coordinates").notNull(),
  endCoordinates: jsonb("end_coordinates").notNull(),
  distance: real("distance"), // in miles
  duration: integer("duration"), // in minutes
  vehicleProfileId: varchar("vehicle_profile_id"),
  routePath: jsonb("route_path"), // array of coordinate points
  restrictionsAvoided: jsonb("restrictions_avoided"), // array of restriction IDs
  facilitiesNearby: jsonb("facilities_nearby"), // array of facility IDs
  laneGuidance: jsonb("lane_guidance"), // array of LaneSegment objects
  isFavorite: boolean("is_favorite").default(false),
});

export const trafficIncidents = pgTable("traffic_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'police', 'accident', 'road_closure', 'construction', 'heavy_traffic', 'obstacle', 'hazmat_spill'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  title: text("title").notNull(),
  description: text("description"),
  coordinates: jsonb("coordinates").notNull(), // { lat: number, lng: number }
  roadName: text("road_name"),
  direction: text("direction"), // 'northbound', 'southbound', 'eastbound', 'westbound', 'both_directions'
  reportedBy: text("reported_by").default('user'), // 'user', 'system', 'traffic_authority'
  reporterName: text("reporter_name"),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  reportedAt: timestamp("reported_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  estimatedClearTime: timestamp("estimated_clear_time"),
  affectedLanes: integer("affected_lanes"),
  totalLanes: integer("total_lanes"),
  truckWarnings: jsonb("truck_warnings"), // array of truck-specific warnings
  trafficDelay: integer("traffic_delay"), // delay in minutes
  alternativeRoute: jsonb("alternative_route"), // suggested alternative route data
  country: text("country").default('UK'),
});

// Users table for subscription management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans - your specified pricing tiers
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "3 Months", "6 Months", "12 Months", "Lifetime"
  stripePriceId: text("stripe_price_id").notNull().unique(),
  priceGBP: decimal("price_gbp", { precision: 10, scale: 2 }).notNull(), // £25.99, £49.99, £99.00, £200.00
  durationMonths: integer("duration_months"), // 3, 6, 12, null for lifetime
  isLifetime: boolean("is_lifetime").default(false),
  features: jsonb("features"), // array of feature names
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User subscriptions tracking
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  planId: varchar("plan_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  status: text("status").notNull(), // 'active', 'canceled', 'past_due', 'unpaid', 'incomplete'
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAt: timestamp("cancel_at"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Location bookmarks and history
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  coordinates: jsonb("coordinates").notNull(), // { lat: number, lng: number }
  isFavorite: boolean("is_favorite").default(false),
  useCount: integer("use_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
});

// Journey history tracking
export const journeys = pgTable("journeys", {
  id: serial("id").primaryKey(),
  routeId: varchar("route_id").notNull(), // references routes table (UUID)
  status: text("status").notNull(), // 'planned', 'active', 'completed'
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertVehicleProfileSchema = createInsertSchema(vehicleProfiles).omit({
  id: true,
}).extend({
  type: z.enum(["car", "truck"]).default("truck"),
  length: z.number().nullable().optional(),
  weight: z.number().nullable().optional(), 
  axles: z.number().nullable().optional(),
  isHazmat: z.boolean().default(false)
});

export const insertRestrictionSchema = createInsertSchema(restrictions).omit({
  id: true,
});

export const insertFacilitySchema = createInsertSchema(facilities).omit({
  id: true,
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
});

export const insertTrafficIncidentSchema = createInsertSchema(trafficIncidents).omit({
  id: true,
  reportedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
});

export const insertJourneySchema = createInsertSchema(journeys).omit({
  id: true,
  startedAt: true, // auto-generated with defaultNow()
}).extend({
  status: z.enum(['planned', 'active', 'completed']), // enforce valid journey statuses
});

export type VehicleProfile = typeof vehicleProfiles.$inferSelect;
export type InsertVehicleProfile = z.infer<typeof insertVehicleProfileSchema>;

export type Restriction = typeof restrictions.$inferSelect;
export type InsertRestriction = z.infer<typeof insertRestrictionSchema>;

export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;

export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;

export type TrafficIncident = typeof trafficIncidents.$inferSelect;
export type InsertTrafficIncident = z.infer<typeof insertTrafficIncidentSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Journey = typeof journeys.$inferSelect;
export type InsertJourney = z.infer<typeof insertJourneySchema>;

export type LaneOption = z.infer<typeof laneOptionSchema>;
export type LaneSegment = z.infer<typeof laneSegmentSchema>;

// Traffic re-routing system schemas
export const trafficConditionSchema = z.object({
  segmentId: z.string(), // unique identifier for road segment
  roadName: z.string(),
  coordinates: z.object({
    start: z.object({ lat: z.number(), lng: z.number() }),
    end: z.object({ lat: z.number(), lng: z.number() })
  }),
  speedLimit: z.number(), // mph or km/h based on region
  currentSpeed: z.number(), // actual traffic speed
  flowLevel: z.enum(['free', 'light', 'moderate', 'heavy', 'standstill']),
  delayMinutes: z.number(), // estimated delay compared to free-flow
  confidence: z.number().min(0).max(1), // confidence level 0-1
  lastUpdated: z.date(),
  incidents: z.array(z.string()).optional(), // related incident IDs
});

export const alternativeRouteSchema = z.object({
  id: z.string(),
  originalRouteId: z.string(), // references routes table
  routePath: z.array(z.object({ lat: z.number(), lng: z.number() })),
  distance: z.number(), // in miles
  duration: z.number(), // in minutes with current traffic
  durationWithoutTraffic: z.number(), // baseline duration
  timeSavingsMinutes: z.number(), // compared to original route
  confidenceLevel: z.number().min(0).max(1), // reliability of time estimate
  trafficConditions: z.array(trafficConditionSchema),
  restrictionsAvoided: z.array(z.string()), // restriction IDs avoided
  viabilityScore: z.number(), // overall route quality score
  reasonForSuggestion: z.enum(['traffic_incident', 'heavy_congestion', 'road_closure', 'faster_alternative']),
  calculatedAt: z.date(),
});

export const reRoutingEventSchema = z.object({
  id: z.string(),
  originalRouteId: z.string(),
  alternativeRouteId: z.string(),
  journeyId: z.number(), // references journeys table
  triggerReason: z.enum(['traffic_incident', 'congestion_detected', 'user_requested', 'automatic_optimization']),
  timeSavingsOffered: z.number(), // minutes saved
  userResponse: z.enum(['accepted', 'declined', 'ignored']).optional(),
  appliedAt: z.date().optional(), // when user accepted the re-route
  effectiveness: z.object({
    predictedSavings: z.number(),
    actualSavings: z.number().optional(), // measured after completion
    accuracy: z.number().optional(), // how accurate was the prediction
  }).optional(),
  metadata: z.object({
    trafficConditionsSnapshot: z.array(trafficConditionSchema).optional(),
    vehicleProfileId: z.string().optional(),
    userPreferences: z.record(z.any()).optional(),
  }).optional(),
});

// Database tables for traffic re-routing
export const routeMonitoring = pgTable("route_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull(), // references routes table
  journeyId: integer("journey_id"), // references journeys table, null for planned routes
  isActive: boolean("is_active").default(true),
  vehicleProfileId: varchar("vehicle_profile_id"), // for truck-specific routing
  monitoringStarted: timestamp("monitoring_started").defaultNow(),
  monitoringEnded: timestamp("monitoring_ended"),
  checkInterval: integer("check_interval").default(300), // seconds between checks (5 minutes default)
  lastTrafficCheck: timestamp("last_traffic_check"),
  currentTrafficConditions: jsonb("current_traffic_conditions"), // TrafficCondition array
  alertThreshold: integer("alert_threshold").default(5), // minimum minutes saved to trigger alert
  userPreferences: jsonb("user_preferences"), // auto-apply, notify-only, etc.
});

export const alternativeRoutes = pgTable("alternative_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalRouteId: varchar("original_route_id").notNull(),
  routePath: jsonb("route_path").notNull(), // array of coordinate points
  distance: real("distance").notNull(), // in miles
  duration: integer("duration").notNull(), // in minutes with current traffic
  durationWithoutTraffic: integer("duration_without_traffic").notNull(),
  timeSavingsMinutes: integer("time_savings_minutes").notNull(),
  confidenceLevel: real("confidence_level").notNull(),
  trafficConditions: jsonb("traffic_conditions"), // TrafficCondition array
  restrictionsAvoided: jsonb("restrictions_avoided"), // array of restriction IDs
  viabilityScore: real("viability_score"), // 0-1 score for route quality
  reasonForSuggestion: text("reason_for_suggestion").notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  isActive: boolean("is_active").default(true), // false when traffic conditions change
  expiresAt: timestamp("expires_at"), // when this alternative becomes stale
});

export const reRoutingEvents = pgTable("rerouting_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalRouteId: varchar("original_route_id").notNull(),
  alternativeRouteId: varchar("alternative_route_id"),
  journeyId: integer("journey_id"), // references journeys table
  triggerReason: text("trigger_reason").notNull(),
  timeSavingsOffered: integer("time_savings_offered"), // minutes
  userResponse: text("user_response"), // 'accepted', 'declined', 'ignored'
  responseTime: integer("response_time"), // seconds taken to respond
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  effectiveness: jsonb("effectiveness"), // predicted vs actual savings
  metadata: jsonb("metadata"), // additional context data
});

// Insert schemas for new tables
export const insertRouteMonitoringSchema = createInsertSchema(routeMonitoring).omit({
  id: true,
  monitoringStarted: true,
});

export const insertAlternativeRouteSchema = createInsertSchema(alternativeRoutes).omit({
  id: true,
  calculatedAt: true,
});

export const insertReRoutingEventSchema = createInsertSchema(reRoutingEvents).omit({
  id: true,
  createdAt: true,
});

// Type exports for new schemas
export type TrafficCondition = z.infer<typeof trafficConditionSchema>;
export type AlternativeRoute = z.infer<typeof alternativeRouteSchema>;
export type ReRoutingEvent = z.infer<typeof reRoutingEventSchema>;

export type RouteMonitoring = typeof routeMonitoring.$inferSelect;
export type InsertRouteMonitoring = z.infer<typeof insertRouteMonitoringSchema>;

export type AlternativeRouteDB = typeof alternativeRoutes.$inferSelect;
export type InsertAlternativeRouteDB = z.infer<typeof insertAlternativeRouteSchema>;

export type ReRoutingEventDB = typeof reRoutingEvents.$inferSelect;
export type InsertReRoutingEventDB = z.infer<typeof insertReRoutingEventSchema>;
