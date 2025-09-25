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
  type: text("type").notNull().default("class_1_lorry"), // 'car', 'car_caravan', 'class_1_lorry', 'class_2_lorry', '7_5_tonne'
  height: real("height").notNull(), // in feet
  width: real("width").notNull(), // in feet
  length: real("length"), // in feet
  weight: real("weight"), // in tonnes
  axles: integer("axles").default(4),
  isHazmat: boolean("is_hazmat").default(false),
  // Enhanced vehicle class routing specifications
  maxSpeed: integer("max_speed").default(70), // in mph - varies by vehicle type
  canUseResidentialRoads: boolean("can_use_residential_roads").default(true),
  canUseMotorways: boolean("can_use_motorways").default(true),
  requiresCommercialRoutes: boolean("requires_commercial_routes").default(false),
  restrictedHours: jsonb("restricted_hours").$type<{start: string; end: string; days?: string[]}>(), // e.g., {"start": "22:00", "end": "06:00"} for night driving bans
  allowedRoadTypes: jsonb("allowed_road_types").$type<string[]>(), // ['motorway', 'A-road', 'B-road', 'residential', 'industrial']
  restrictedAreas: jsonb("restricted_areas").$type<string[]>(), // ['city_centre', 'residential_zone', 'school_zone']
  region: text("region").default("UK"), // 'UK', 'EU'
  minimumLaneWidth: real("minimum_lane_width"), // minimum lane width required in feet
  turningRadius: real("turning_radius"), // turning radius in feet
  bridgeFormula: jsonb("bridge_formula").$type<{maxAxleWeight: number; maxGroupWeight: number; steerAxleMax?: number}>(), // axle weight distribution rules
});

export const restrictions = pgTable("restrictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  location: text("location").notNull(),
  type: text("type").notNull(), // 'height', 'width', 'weight', 'length', 'axle_count', 'hazmat', 'vehicle_type', 'time_based', 'residential_ban', 'bridge_weight', 'tunnel_clearance'
  limit: real("limit").notNull(), // in feet or tonnes
  description: text("description"),
  coordinates: jsonb("coordinates").$type<{lat: number; lng: number}>(), // { lat: number, lng: number }
  roadName: text("road_name"),
  country: text("country").default('UK'),
  // Enhanced restriction specifications for strict enforcement
  severity: text("severity").default('medium'), // 'low', 'medium', 'high', 'absolute' - absolute means zero tolerance
  restrictedVehicleTypes: jsonb("restricted_vehicle_types").$type<string[]>(), // ['class_2_lorry', '7_5_tonne'] etc.
  timeRestrictions: jsonb("time_restrictions").$type<Record<string, {start: string; end: string} | null>>(), // {"weekdays": {"start": "07:00", "end": "19:00"}, "weekends": null}
  enforcementType: text("enforcement_type").default('advisory'), // 'advisory', 'legal', 'physical', 'strict'
  alternativeRoutes: jsonb("alternative_routes").$type<string[]>(), // Suggested alternative route IDs or instructions
  violationPenalty: text("violation_penalty"), // Description of penalty for violation
  isActive: boolean("is_active").default(true),
  activeSince: timestamp("active_since").default(sql`now()`),
  activeUntil: timestamp("active_until"),
  routeSegment: jsonb("route_segment").$type<{lat: number; lng: number}[]>(), // Specific route segment coordinates this applies to
  bypassAllowed: boolean("bypass_allowed").default(false), // Whether route can bypass this restriction
  exemptions: jsonb("exemptions").$type<string[]>(), // Special exemptions (emergency vehicles, etc.)
});

export const facilities = pgTable("facilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'truck_stop', 'fuel', 'parking', 'restaurant', 'hotel', 'rest_area'
  coordinates: jsonb("coordinates").$type<{lat: number; lng: number}>().notNull(), // { lat: number, lng: number }
  address: text("address"),
  amenities: jsonb("amenities").$type<string[]>(), // array of strings
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
  startCoordinates: jsonb("start_coordinates").$type<{lat: number; lng: number}>().notNull(),
  endCoordinates: jsonb("end_coordinates").$type<{lat: number; lng: number}>().notNull(),
  distance: real("distance"), // in miles
  duration: integer("duration"), // in minutes
  vehicleProfileId: varchar("vehicle_profile_id"),
  routePath: jsonb("route_path").$type<{lat: number; lng: number}[]>(), // array of coordinate points
  geometry: jsonb("geometry").$type<{type: "LineString"; coordinates: [number, number][]}>(), // GeoJSON LineString geometry for MapLibre GL JS animations
  restrictionsAvoided: jsonb("restrictions_avoided").$type<string[]>(), // array of restriction IDs
  facilitiesNearby: jsonb("facilities_nearby").$type<string[]>(), // array of facility IDs
  laneGuidance: jsonb("lane_guidance").$type<LaneSegment[]>(), // array of LaneSegment objects
  isFavorite: boolean("is_favorite").default(false),
});

export const trafficIncidents = pgTable("traffic_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'police', 'accident', 'road_closure', 'construction', 'heavy_traffic', 'obstacle', 'hazmat_spill'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  title: text("title").notNull(),
  description: text("description"),
  coordinates: jsonb("coordinates").$type<{lat: number; lng: number}>().notNull(), // { lat: number, lng: number }
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
  truckWarnings: jsonb("truck_warnings").$type<string[]>(), // array of truck-specific warnings
  trafficDelay: integer("traffic_delay"), // delay in minutes
  alternativeRoute: jsonb("alternative_route").$type<{routePath: {lat: number; lng: number}[]; distance: number; duration: number}>(), // suggested alternative route data
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
  features: jsonb("features").$type<string[]>(), // array of feature names
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
  coordinates: jsonb("coordinates").$type<{lat: number; lng: number}>().notNull(), // { lat: number, lng: number }
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
  idempotencyKey: varchar("idempotency_key"), // for duplicate detection
  sessionId: varchar("session_id"), // for session-based idempotency
});

export const insertVehicleProfileSchema = createInsertSchema(vehicleProfiles).omit({
  id: true,
}).extend({
  type: z.enum(["car", "car_caravan", "class_1_lorry", "class_2_lorry", "7_5_tonne", "truck"]).default("class_1_lorry")
    .transform((val) => {
      // Backward compatibility: map legacy "truck" type to appropriate new type
      if (val === "truck") {
        return "class_2_lorry";
      }
      return val;
    }),
  length: z.number().nullable().optional(),
  weight: z.number().nullable().optional(), 
  axles: z.number().nullable().optional(),
  isHazmat: z.boolean().default(false),
  // Enhanced vehicle class routing specifications
  maxSpeed: z.number().min(10).max(100).default(70),
  canUseResidentialRoads: z.boolean().default(true),
  canUseMotorways: z.boolean().default(true),
  requiresCommercialRoutes: z.boolean().default(false),
  restrictedHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional()
  }).optional(),
  allowedRoadTypes: z.array(z.enum(['motorway', 'A-road', 'B-road', 'residential', 'industrial', 'urban', 'rural'])).default(['motorway', 'A-road', 'B-road']),
  restrictedAreas: z.array(z.enum(['city_centre', 'residential_zone', 'school_zone', 'historic_district', 'environmental_zone'])).default([]),
  region: z.enum(['UK', 'EU']).default('UK'),
  minimumLaneWidth: z.number().min(6).max(20).optional(),
  turningRadius: z.number().min(10).max(100).optional(),
  bridgeFormula: z.object({
    maxAxleWeight: z.number(),
    maxGroupWeight: z.number(),
    steerAxleMax: z.number().optional()
  }).optional()
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

// Lightweight schema for route planning requests (user input validation)
export const planningRequestSchema = z.object({
  startLocation: z.string().min(3).max(200),
  endLocation: z.string().min(3).max(200),
  vehicleProfileId: z.string().min(1),
  routePreference: z.enum(['fastest', 'eco', 'avoid_tolls']).optional(),
  startCoordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  endCoordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
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
export type PlanningRequest = z.infer<typeof planningRequestSchema>;

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

// GeoJSON schemas for route geometry
export const geoJsonPointSchema = z.tuple([z.number(), z.number()]);

export const geoJsonLineStringSchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(geoJsonPointSchema),
});

export type GeoJsonLineString = z.infer<typeof geoJsonLineStringSchema>;

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
  currentTrafficConditions: jsonb("current_traffic_conditions").$type<TrafficCondition[]>(), // TrafficCondition array
  alertThreshold: integer("alert_threshold").default(5), // minimum minutes saved to trigger alert
  userPreferences: jsonb("user_preferences").$type<Record<string, any>>(), // auto-apply, notify-only, etc.
});

export const alternativeRoutes = pgTable("alternative_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalRouteId: varchar("original_route_id").notNull(),
  routePath: jsonb("route_path").$type<{lat: number; lng: number}[]>().notNull(), // array of coordinate points
  distance: real("distance").notNull(), // in miles
  duration: integer("duration").notNull(), // in minutes with current traffic
  durationWithoutTraffic: integer("duration_without_traffic").notNull(),
  timeSavingsMinutes: integer("time_savings_minutes").notNull(),
  confidenceLevel: real("confidence_level").notNull(),
  trafficConditions: jsonb("traffic_conditions").$type<TrafficCondition[]>(), // TrafficCondition array
  restrictionsAvoided: jsonb("restrictions_avoided").$type<string[]>(), // array of restriction IDs
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
  effectiveness: jsonb("effectiveness").$type<{predictedSavings: number; actualSavings?: number; accuracy?: number}>(), // predicted vs actual savings
  metadata: jsonb("metadata").$type<Record<string, any>>(), // additional context data
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

// Traffic Settings Schema
export const trafficSettingsSchema = z.object({
  autoApplyEnabled: z.boolean().default(false),
  autoApplyThreshold: z.number().min(1).max(60).default(10), // minutes
  notificationsEnabled: z.boolean().default(true),
  updateFrequency: z.number().min(1).max(10).default(3), // minutes between updates
  minimumSavings: z.number().min(1).max(30).default(5), // minimum minutes to show alerts
  aggressiveReroutingEnabled: z.boolean().default(false),
  avoidHighwayIncidents: z.boolean().default(true),
  considerFuelSavings: z.boolean().default(true),
  voiceAnnouncements: z.boolean().default(true),
  privacyMode: z.boolean().default(false),
});

export type TrafficSettings = z.infer<typeof trafficSettingsSchema>;

// ===== SOCIAL TRUCKING NETWORK SCHEMAS =====

// Driver profiles for social features
export const driverProfiles = pgTable("driver_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // references users table
  displayName: text("display_name").notNull(),
  truckModel: text("truck_model"),
  yearsExperience: integer("years_experience"),
  homeBase: text("home_base"), // home location/depot
  bio: text("bio"),
  profilePhoto: text("profile_photo"), // URL to profile image
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  sharingSettings: jsonb("sharing_settings").$type<{
    shareLocation: boolean;
    shareRoutes: boolean;
    shareStatus: boolean;
    allowMessages: boolean;
    visibleToPublic: boolean;
  }>().default({shareLocation: true, shareRoutes: true, shareStatus: true, allowMessages: true, visibleToPublic: true}),
  safetyRating: real("safety_rating").default(5.0), // 1-5 star rating
  responseTime: integer("response_time"), // average response time in minutes
  totalTrips: integer("total_trips").default(0),
  helpfulVotes: integer("helpful_votes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Driver connections (friend/follow system)
export const driverConnections = pgTable("driver_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull(), // driver who sent request
  recipientId: varchar("recipient_id").notNull(), // driver who received request
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'blocked'
  connectionType: text("connection_type").default("friend"), // 'friend', 'follow', 'trusted'
  requestedAt: timestamp("requested_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>(), // extra connection data
});

// Shared routes within social network
export const sharedRoutes = pgTable("shared_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull(), // references routes table
  sharedBy: varchar("shared_by").notNull(), // references driver_profiles
  title: text("title"),
  description: text("description"),
  visibility: text("visibility").default("friends"), // 'public', 'friends', 'convoy'
  tags: jsonb("tags").$type<string[]>(), // route tags like ['fuel-stops', 'scenic', 'fast']
  difficulty: text("difficulty").default("easy"), // 'easy', 'moderate', 'challenging'
  conditions: text("conditions"), // road/weather conditions when shared
  estimatedDuration: integer("estimated_duration"), // in minutes
  fuelEfficiency: real("fuel_efficiency"), // mpg or l/100km
  tollCosts: real("toll_costs"), // estimated toll costs
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  saves: integer("saves").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Route comments and interactions
export const routeComments = pgTable("route_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sharedRouteId: varchar("shared_route_id").notNull(), // references shared_routes
  authorId: varchar("author_id").notNull(), // references driver_profiles
  content: text("content").notNull(),
  parentCommentId: varchar("parent_comment_id"), // for replies
  likes: integer("likes").default(0),
  isEdited: boolean("is_edited").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Driver-to-driver messaging
export const driverMessages = pgTable("driver_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(), // references driver_profiles
  recipientId: varchar("recipient_id").notNull(), // references driver_profiles
  conversationId: varchar("conversation_id"), // group messages by conversation
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // 'text', 'route_share', 'location', 'alert'
  attachmentData: jsonb("attachment_data").$type<{
    type?: string;
    routeId?: string;
    coordinates?: {lat: number; lng: number};
    fileName?: string;
    fileUrl?: string;
  }>(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  sentAt: timestamp("sent_at").defaultNow(),
  editedAt: timestamp("edited_at"),
  isDeleted: boolean("is_deleted").default(false),
});

// Convoy/group travel coordination
export const convoys = pgTable("convoys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  leaderId: varchar("leader_id").notNull(), // references driver_profiles
  routeId: varchar("route_id"), // references routes table
  maxMembers: integer("max_members").default(10),
  currentMembers: integer("current_members").default(1),
  departureTime: timestamp("departure_time"),
  estimatedArrival: timestamp("estimated_arrival"),
  meetingPoint: jsonb("meeting_point").$type<{
    name: string;
    coordinates: {lat: number; lng: number};
    notes?: string;
  }>(),
  status: text("status").default("forming"), // 'forming', 'active', 'completed', 'cancelled'
  convoyType: text("convoy_type").default("informal"), // 'informal', 'official', 'emergency'
  requirements: jsonb("requirements").$type<{
    minExperience?: number;
    vehicleTypes?: string[];
    certifications?: string[];
  }>(),
  safetyLevel: text("safety_level").default("standard"), // 'relaxed', 'standard', 'strict'
  communicationChannel: text("communication_channel"), // CB channel, frequency
  rules: text("rules"), // convoy rules and expectations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Convoy membership
export const convoyMembers = pgTable("convoy_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  convoyId: varchar("convoy_id").notNull(), // references convoys
  driverId: varchar("driver_id").notNull(), // references driver_profiles
  role: text("role").default("member"), // 'leader', 'co-leader', 'member', 'backup'
  status: text("status").default("pending"), // 'pending', 'approved', 'declined', 'kicked'
  position: integer("position"), // order in convoy
  vehicleInfo: jsonb("vehicle_info").$type<{
    model?: string;
    plateNumber?: string;
    color?: string;
    specialEquipment?: string[];
  }>(),
  emergencyContact: jsonb("emergency_contact").$type<{
    name: string;
    phone: string;
    relationship: string;
  }>(),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
});

// Real-time driver locations (temporary data for live tracking)
export const driverLocations = pgTable("driver_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(), // references driver_profiles
  coordinates: jsonb("coordinates").$type<{lat: number; lng: number}>().notNull(),
  heading: real("heading"), // compass direction 0-360
  speed: real("speed"), // current speed in mph/kmh
  altitude: real("altitude"),
  accuracy: real("accuracy"), // GPS accuracy in meters
  isOnDuty: boolean("is_on_duty").default(false),
  currentStatus: text("current_status").default("available"), // 'available', 'driving', 'resting', 'loading', 'offline'
  routeId: varchar("route_id"), // current route if any
  convoyId: varchar("convoy_id"), // current convoy if any
  lastUpdate: timestamp("last_update").defaultNow(),
  expiresAt: timestamp("expires_at").default(sql`now() + interval '1 hour'`), // auto-cleanup old locations
});

// Driver activity feed (social posts, route shares, achievements)
export const driverActivity = pgTable("driver_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(), // references driver_profiles
  activityType: text("activity_type").notNull(), // 'route_completed', 'route_shared', 'milestone', 'safety_award'
  title: text("title").notNull(),
  content: text("content"),
  relatedId: varchar("related_id"), // ID of related route, convoy, etc.
  relatedType: text("related_type"), // 'route', 'convoy', 'achievement'
  visibility: text("visibility").default("friends"), // 'public', 'friends', 'private'
  metadata: jsonb("metadata").$type<Record<string, any>>(), // achievement details, stats, etc.
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===== ENTERTAINMENT SCHEMAS =====

// Entertainment content types and platform schemas
export const entertainmentPlatformSchema = z.enum(['tunein', 'mixcloud']);
export const entertainmentTypeSchema = z.enum(['radio', 'music', 'podcast', 'talk', 'news', 'sports']);

// TuneIn station schema
export const tuneInStationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  genre: z.string(),
  location: z.string().optional(),
  language: z.string().optional(),
  streamUrl: z.string(),
  logoUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  bitrate: z.number().optional(),
  format: z.string().optional(), // mp3, aac, etc.
  reliability: z.number().min(0).max(100).default(100), // stream reliability score
  listeners: z.number().optional(),
  tags: z.array(z.string()).default([]),
  isTruckingRelated: z.boolean().default(false),
});

// MixCloud content schema  
export const mixCloudContentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  creator: z.string(),
  genre: z.string(),
  tags: z.array(z.string()).default([]),
  duration: z.number(), // seconds
  playCount: z.number().default(0),
  streamUrl: z.string(),
  artworkUrl: z.string().optional(),
  createdAt: z.date(),
  isDrivingFriendly: z.boolean().default(false), // suitable for driving
});

// Entertainment stations database table
export const entertainmentStations = pgTable("entertainment_stations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(), // 'tunein' or 'mixcloud'
  type: text("type").notNull(), // 'radio', 'music', 'podcast', 'talk', 'news', 'sports'
  externalId: text("external_id").notNull(), // ID from the external platform
  name: text("name").notNull(),
  description: text("description"),
  genre: text("genre"),
  creator: text("creator"), // DJ, host, or station owner
  streamUrl: text("stream_url").notNull(),
  artworkUrl: text("artwork_url"),
  websiteUrl: text("website_url"),
  metadata: jsonb("metadata").$type<Record<string, any>>(), // platform-specific data
  duration: integer("duration"), // seconds (null for live radio)
  language: text("language").default('en'),
  country: text("country").default('US'),
  bitrate: integer("bitrate"),
  format: text("format").default('mp3'),
  reliability: integer("reliability").default(100), // 0-100 stream reliability
  listeners: integer("listeners"),
  playCount: integer("play_count").default(0),
  tags: jsonb("tags").$type<string[]>(), // array of strings
  isTruckingRelated: boolean("is_trucking_related").default(false),
  isDrivingFriendly: boolean("is_driving_friendly").default(false),
  isActive: boolean("is_active").default(true),
  lastVerified: timestamp("last_verified").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Entertainment presets/favorites
export const entertainmentPresets = pgTable("entertainment_presets", {
  id: serial("id").primaryKey(),
  stationId: varchar("station_id").notNull(), // references entertainment_stations
  userId: varchar("user_id"), // optional user association
  presetNumber: integer("preset_number"), // 1-10 for quick access
  customName: text("custom_name"), // user-defined name override
  volume: real("volume").default(0.8), // 0.0-1.0
  isDefault: boolean("is_default").default(false), // system default preset
  useCount: integer("use_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Entertainment playback history
export const entertainmentHistory = pgTable("entertainment_history", {
  id: serial("id").primaryKey(),
  stationId: varchar("station_id").notNull(), // references entertainment_stations
  userId: varchar("user_id"), // optional user association
  playedAt: timestamp("played_at").defaultNow(),
  playDuration: integer("play_duration"), // seconds actually played
  wasCompleted: boolean("was_completed").default(false), // finished the content
  volume: real("volume"),
  source: text("source").default('manual'), // 'manual', 'voice', 'preset'
  metadata: jsonb("metadata").$type<Record<string, any>>(), // playback session data
});

// Current playback state (single row, updated frequently)
export const entertainmentPlaybackState = pgTable("entertainment_playback_state", {
  id: serial("id").primaryKey(),
  currentStationId: varchar("current_station_id"), // references entertainment_stations
  isPlaying: boolean("is_playing").default(false),
  volume: real("volume").default(0.8),
  position: integer("position").default(0), // current position in seconds (for non-live content)
  duration: integer("duration"), // total duration in seconds (for non-live content)
  playbackStartedAt: timestamp("playback_started_at"),
  lastPausedAt: timestamp("last_paused_at"),
  audioFocusHeld: boolean("audio_focus_held").default(false), // for proper audio management
  crossfadeEnabled: boolean("crossfade_enabled").default(false),
  repeatMode: text("repeat_mode").default('none'), // 'none', 'one', 'all'
  shuffleEnabled: boolean("shuffle_enabled").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for entertainment tables
export const insertEntertainmentStationSchema = createInsertSchema(entertainmentStations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastVerified: true,
}).extend({
  platform: entertainmentPlatformSchema,
  type: entertainmentTypeSchema,
  reliability: z.number().min(0).max(100).default(100),
  volume: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).default([]),
});

export const insertEntertainmentPresetSchema = createInsertSchema(entertainmentPresets).omit({
  id: true,
  createdAt: true,
}).extend({
  volume: z.number().min(0).max(1).default(0.8),
  presetNumber: z.number().min(1).max(10).optional(),
});

export const insertEntertainmentHistorySchema = createInsertSchema(entertainmentHistory).omit({
  id: true,
  playedAt: true,
}).extend({
  volume: z.number().min(0).max(1).optional(),
  source: z.enum(['manual', 'voice', 'preset']).default('manual'),
});

export const insertEntertainmentPlaybackStateSchema = createInsertSchema(entertainmentPlaybackState).omit({
  id: true,
  updatedAt: true,
}).extend({
  volume: z.number().min(0).max(1).default(0.8),
  repeatMode: z.enum(['none', 'one', 'all']).default('none'),
});

// Entertainment settings schema
export const entertainmentSettingsSchema = z.object({
  defaultVolume: z.number().min(0).max(1).default(0.8),
  autoPlay: z.boolean().default(false),
  crossfadeEnabled: z.boolean().default(false),
  crossfadeDuration: z.number().min(0).max(10).default(3), // seconds
  backgroundPlayEnabled: z.boolean().default(true),
  voiceControlEnabled: z.boolean().default(true),
  showTruckingStationsFirst: z.boolean().default(true),
  preferredGenres: z.array(z.string()).default(['news', 'talk', 'music']),
  maxHistoryItems: z.number().min(10).max(100).default(50),
  audioQuality: z.enum(['low', 'medium', 'high']).default('medium'),
  emergencyInterruptEnabled: z.boolean().default(true), // pause for navigation alerts
});

// Type exports for entertainment schemas
export type EntertainmentPlatform = z.infer<typeof entertainmentPlatformSchema>;
export type EntertainmentType = z.infer<typeof entertainmentTypeSchema>;
export type TuneInStation = z.infer<typeof tuneInStationSchema>;
export type MixCloudContent = z.infer<typeof mixCloudContentSchema>;

export type EntertainmentStation = typeof entertainmentStations.$inferSelect;
export type InsertEntertainmentStation = z.infer<typeof insertEntertainmentStationSchema>;

export type EntertainmentPreset = typeof entertainmentPresets.$inferSelect;
export type InsertEntertainmentPreset = z.infer<typeof insertEntertainmentPresetSchema>;

export type EntertainmentHistory = typeof entertainmentHistory.$inferSelect;
export type InsertEntertainmentHistory = z.infer<typeof insertEntertainmentHistorySchema>;

export type EntertainmentPlaybackState = typeof entertainmentPlaybackState.$inferSelect;
export type InsertEntertainmentPlaybackState = z.infer<typeof insertEntertainmentPlaybackStateSchema>;

export type EntertainmentSettings = z.infer<typeof entertainmentSettingsSchema>;

// ===== SOCIAL NETWORKING INSERT SCHEMAS =====

export const insertDriverProfileSchema = createInsertSchema(driverProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSeen: true,
}).extend({
  displayName: z.string().min(2).max(50),
  yearsExperience: z.number().min(0).max(50).optional(),
  bio: z.string().max(500).optional(),
  safetyRating: z.number().min(1).max(5).default(5.0),
  sharingSettings: z.object({
    shareLocation: z.boolean().default(true),
    shareRoutes: z.boolean().default(true),
    shareStatus: z.boolean().default(true),
    allowMessages: z.boolean().default(true),
    visibleToPublic: z.boolean().default(true),
  }).default({shareLocation: true, shareRoutes: true, shareStatus: true, allowMessages: true, visibleToPublic: true}),
});

export const insertDriverConnectionSchema = createInsertSchema(driverConnections).omit({
  id: true,
  requestedAt: true,
  respondedAt: true,
}).extend({
  status: z.enum(['pending', 'accepted', 'blocked']).default('pending'),
  connectionType: z.enum(['friend', 'follow', 'trusted']).default('friend'),
});

export const insertSharedRouteSchema = createInsertSchema(sharedRoutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['public', 'friends', 'convoy']).default('friends'),
  difficulty: z.enum(['easy', 'moderate', 'challenging']).default('easy'),
  tags: z.array(z.string()).max(10).default([]),
});

export const insertRouteCommentSchema = createInsertSchema(routeComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  content: z.string().min(1).max(1000),
});

export const insertDriverMessageSchema = createInsertSchema(driverMessages).omit({
  id: true,
  sentAt: true,
  readAt: true,
  editedAt: true,
}).extend({
  content: z.string().min(1).max(2000),
  messageType: z.enum(['text', 'route_share', 'location', 'alert']).default('text'),
});

export const insertConvoySchema = createInsertSchema(convoys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  maxMembers: z.number().min(2).max(50).default(10),
  status: z.enum(['forming', 'active', 'completed', 'cancelled']).default('forming'),
  convoyType: z.enum(['informal', 'official', 'emergency']).default('informal'),
  safetyLevel: z.enum(['relaxed', 'standard', 'strict']).default('standard'),
});

export const insertConvoyMemberSchema = createInsertSchema(convoyMembers).omit({
  id: true,
  joinedAt: true,
  leftAt: true,
}).extend({
  role: z.enum(['leader', 'co-leader', 'member', 'backup']).default('member'),
  status: z.enum(['pending', 'approved', 'declined', 'kicked']).default('pending'),
});

export const insertDriverLocationSchema = createInsertSchema(driverLocations).omit({
  id: true,
  lastUpdate: true,
  expiresAt: true,
}).extend({
  currentStatus: z.enum(['available', 'driving', 'resting', 'loading', 'offline']).default('available'),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).max(200).optional(),
});

export const insertDriverActivitySchema = createInsertSchema(driverActivity).omit({
  id: true,
  createdAt: true,
}).extend({
  activityType: z.enum(['route_completed', 'route_shared', 'milestone', 'safety_award']),
  title: z.string().min(5).max(100),
  content: z.string().max(1000).optional(),
  visibility: z.enum(['public', 'friends', 'private']).default('friends'),
  relatedType: z.enum(['route', 'convoy', 'achievement']).optional(),
});

// ===== SOCIAL NETWORKING TYPE EXPORTS =====

export type DriverProfile = typeof driverProfiles.$inferSelect;
export type InsertDriverProfile = z.infer<typeof insertDriverProfileSchema>;

export type DriverConnection = typeof driverConnections.$inferSelect;
export type InsertDriverConnection = z.infer<typeof insertDriverConnectionSchema>;

export type SharedRoute = typeof sharedRoutes.$inferSelect;
export type InsertSharedRoute = z.infer<typeof insertSharedRouteSchema>;

export type RouteComment = typeof routeComments.$inferSelect;
export type InsertRouteComment = z.infer<typeof insertRouteCommentSchema>;

export type DriverMessage = typeof driverMessages.$inferSelect;
export type InsertDriverMessage = z.infer<typeof insertDriverMessageSchema>;

export type Convoy = typeof convoys.$inferSelect;
export type InsertConvoy = z.infer<typeof insertConvoySchema>;

export type ConvoyMember = typeof convoyMembers.$inferSelect;
export type InsertConvoyMember = z.infer<typeof insertConvoyMemberSchema>;

export type DriverLocation = typeof driverLocations.$inferSelect;
export type InsertDriverLocation = z.infer<typeof insertDriverLocationSchema>;

export type DriverActivity = typeof driverActivity.$inferSelect;
export type InsertDriverActivity = z.infer<typeof insertDriverActivitySchema>;
