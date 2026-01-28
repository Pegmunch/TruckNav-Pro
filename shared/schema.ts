import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, boolean, jsonb, timestamp, decimal, serial, index, doublePrecision } from "drizzle-orm/pg-core";
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

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for subscription management and Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: text("username"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  hasAcceptedTerms: boolean("has_accepted_terms").default(false).notNull(),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Social network fields
  bio: text("bio"),
  companyName: text("company_name"),
  truckType: text("truck_type"),
  yearsExperience: integer("years_experience"),
  preferredRegions: jsonb("preferred_regions").$type<string[]>(),
  isPublicProfile: boolean("is_public_profile").default(true),
  allowConnectionRequests: boolean("allow_connection_requests").default(true),
  allowMessages: boolean("allow_messages").default(true),
});

// Subscription plans - your specified pricing tiers
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "3 Months", "6 Months", "12 Months", "Lifetime", "Fleet Management Annual", "Fleet Management Lifetime"
  stripePriceId: text("stripe_price_id").notNull().unique(),
  appleProductId: text("apple_product_id"), // App Store in-app purchase product ID (e.g. uk.co.bespokemarketingai.trucknavpro.monthly)
  priceGBP: decimal("price_gbp", { precision: 10, scale: 2 }).notNull(), // £25.99, £49.99, £99.00, £200.00, £5000.00, £10000.00
  durationMonths: integer("duration_months"), // 3, 6, 12, null for lifetime
  isLifetime: boolean("is_lifetime").default(false),
  isRecurring: boolean("is_recurring").default(false), // true for auto-renewing subscriptions (monthly PAYG)
  category: text("category").default('navigation'), // 'navigation', 'fleet_management'
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
  status: text("status").notNull(), // 'active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'suspended'
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAt: timestamp("cancel_at"),
  canceledAt: timestamp("canceled_at"),
  category: text("category").default('navigation'), // 'navigation', 'fleet_management'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Renewal notification tracking
  lastRenewalNotificationSent: timestamp("last_renewal_notification_sent"),
  renewalNotification28DaySent: boolean("renewal_notification_28_day_sent").default(false),
  renewalNotification7DaySent: boolean("renewal_notification_7_day_sent").default(false),
  renewalNotification1DaySent: boolean("renewal_notification_1_day_sent").default(false),
  renewalNotificationsStopped: boolean("renewal_notifications_stopped").default(false),
});

// Subscription notifications log
export const subscriptionNotifications = pgTable("subscription_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subscriptionId: varchar("subscription_id").notNull(),
  notificationType: text("notification_type").notNull(), // 'renewal_28_day', 'renewal_7_day', 'renewal_1_day', 'payment_failed', 'subscription_expired', 'subscription_renewed'
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  emailRecipient: text("email_recipient"),
  status: text("status").default('pending'), // 'pending', 'sent', 'failed', 'skipped'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
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
  vehicleProfileId: z.string().min(1).optional(),
  routePreference: z.enum(['fastest', 'eco', 'avoid_tolls']).optional(),
  useCarMode: z.boolean().optional(),
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

// Schema for updating user profile (social network fields)
export const updateUserProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  companyName: z.string().max(100).optional(),
  truckType: z.string().max(100).optional(),
  yearsExperience: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? undefined : val,
    z.number().int().min(0).max(100)
  ).optional(),
  preferredRegions: z.array(z.string()).optional(),
  isPublicProfile: z.boolean().optional(),
  allowConnectionRequests: z.boolean().optional(),
  allowMessages: z.boolean().optional(),
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
export type UpsertUser = typeof users.$inferInsert;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

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

// ===== PREDICTIVE TRAFFIC ANALYSIS SCHEMAS =====

// Historical traffic data table - stores aggregated traffic patterns
export const historicalTrafficData = pgTable("historical_traffic_data", {
  id: serial("id").primaryKey(),
  roadSegmentId: text("road_segment_id").notNull(), // Unique identifier for road segment (e.g., lat-lng hash)
  roadName: text("road_name"), // Human-readable road name
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ... 6=Saturday
  hourOfDay: integer("hour_of_day").notNull(), // 0-23
  averageSpeed: doublePrecision("average_speed").notNull(), // km/h
  freeFlowSpeed: doublePrecision("free_flow_speed").notNull(), // km/h (no traffic)
  congestionLevel: doublePrecision("congestion_level").notNull(), // 0-1 (0=free flow, 1=standstill)
  sampleCount: integer("sample_count").notNull().default(1), // Number of observations
  averageDelayMinutes: doublePrecision("average_delay_minutes").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Traffic observation for real-time data collection
export const trafficObservations = pgTable("traffic_observations", {
  id: serial("id").primaryKey(),
  roadSegmentId: text("road_segment_id").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  observedSpeed: doublePrecision("observed_speed").notNull(), // km/h
  freeFlowSpeed: doublePrecision("free_flow_speed"), // km/h
  congestionLevel: doublePrecision("congestion_level"), // 0-1
  timestamp: timestamp("timestamp").defaultNow(),
  source: text("source").default('user'), // 'user', 'tomtom', 'system'
  journeyId: integer("journey_id"), // Link to journey if from user travel
});

// Traffic prediction cache table
export const trafficPredictions = pgTable("traffic_predictions", {
  id: serial("id").primaryKey(),
  routeId: varchar("route_id").notNull(),
  predictionTime: timestamp("prediction_time").notNull(), // When prediction is for
  predictedDuration: integer("predicted_duration").notNull(), // minutes
  baselineDuration: integer("baseline_duration").notNull(), // minutes without traffic
  predictedDelay: integer("predicted_delay").notNull(), // minutes of expected delay
  congestionScore: doublePrecision("congestion_score").notNull(), // 0-1 overall route congestion
  confidence: doublePrecision("confidence").notNull(), // 0-1 prediction confidence
  segmentPredictions: jsonb("segment_predictions").$type<TrafficSegmentPrediction[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Traffic segment prediction schema
export const trafficSegmentPredictionSchema = z.object({
  roadSegmentId: z.string(),
  roadName: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  predictedSpeed: z.number(), // km/h
  freeFlowSpeed: z.number(), // km/h
  congestionLevel: z.number(), // 0-1
  predictedDelay: z.number(), // minutes
  confidence: z.number(), // 0-1
});

export type TrafficSegmentPrediction = z.infer<typeof trafficSegmentPredictionSchema>;

// Insert schemas
export const insertHistoricalTrafficDataSchema = createInsertSchema(historicalTrafficData).omit({
  id: true,
  createdAt: true,
});

export const insertTrafficObservationSchema = createInsertSchema(trafficObservations).omit({
  id: true,
});

export const insertTrafficPredictionSchema = createInsertSchema(trafficPredictions).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type HistoricalTrafficData = typeof historicalTrafficData.$inferSelect;
export type InsertHistoricalTrafficData = z.infer<typeof insertHistoricalTrafficDataSchema>;

export type TrafficObservation = typeof trafficObservations.$inferSelect;
export type InsertTrafficObservation = z.infer<typeof insertTrafficObservationSchema>;

export type TrafficPrediction = typeof trafficPredictions.$inferSelect;
export type InsertTrafficPrediction = z.infer<typeof insertTrafficPredictionSchema>;

// Predictive analysis request/response schemas
export const trafficPredictionRequestSchema = z.object({
  routeId: z.string(),
  departureTime: z.string().datetime().optional(), // ISO datetime, defaults to now
  routePath: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
  })).optional(),
});

export const trafficPredictionResponseSchema = z.object({
  routeId: z.string(),
  departureTime: z.string(),
  predictedDuration: z.number(), // minutes
  baselineDuration: z.number(), // minutes without traffic
  predictedDelay: z.number(), // minutes
  congestionScore: z.number(), // 0-1
  confidence: z.number(), // 0-1
  bestDepartureTime: z.string().nullable(), // ISO datetime of optimal departure
  alternativeTimes: z.array(z.object({
    time: z.string(),
    predictedDuration: z.number(),
    predictedDelay: z.number(),
    congestionScore: z.number(),
  })),
  segmentAnalysis: z.array(trafficSegmentPredictionSchema),
  dataQuality: z.enum(['high', 'medium', 'low', 'insufficient']),
});

export type TrafficPredictionRequest = z.infer<typeof trafficPredictionRequestSchema>;
export type TrafficPredictionResponse = z.infer<typeof trafficPredictionResponseSchema>;

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

// ==================== FLEET MANAGEMENT SYSTEM ====================
// Desktop-only fleet management for office/back-end use

// Fleet Vehicles - Main vehicle registry
export const fleetVehicles = pgTable("fleet_vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  registration: varchar("registration").notNull().unique(), // License plate/registration number
  trailerNumber: varchar("trailer_number"), // Trailer registration/identification number
  make: text("make").notNull(), // Vehicle manufacturer (e.g., "Volvo", "Mercedes")
  model: text("model").notNull(), // Vehicle model (e.g., "FH16", "Actros")
  year: integer("year").notNull(), // Year of manufacture
  vin: varchar("vin"), // Vehicle Identification Number
  vehicleType: text("vehicle_type").notNull(), // 'truck', 'van', 'lorry', 'trailer'
  fuelType: text("fuel_type").notNull(), // 'diesel', 'petrol', 'electric', 'hybrid'
  tankCapacity: real("tank_capacity"), // Fuel tank capacity in liters
  vehicleProfileId: varchar("vehicle_profile_id"), // Links to vehicle_profiles for navigation specs
  status: text("status").notNull().default('active'), // 'active', 'maintenance', 'decommissioned'
  purchaseDate: timestamp("purchase_date"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  currentMileage: real("current_mileage").default(0), // Current odometer reading in miles
  notes: text("notes"), // Additional notes about the vehicle
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Operators - Drivers/operators registry
export const operators = pgTable("operators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  licenseNumber: varchar("license_number").notNull().unique(),
  licenseType: text("license_type").notNull(), // 'C', 'C+E', 'C1', 'C1+E' (UK license categories)
  licenseExpiry: timestamp("license_expiry").notNull(),
  driverCQCExpiry: timestamp("driver_cqc_expiry"), // Driver CPC (Certificate of Professional Competence) expiry
  tachographCardNumber: varchar("tachograph_card_number"),
  tachographCardExpiry: timestamp("tachograph_card_expiry"),
  employeeId: varchar("employee_id"),
  status: text("status").notNull().default('active'), // 'active', 'inactive', 'suspended'
  hireDate: timestamp("hire_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service Records - Vehicle maintenance and service history
export const serviceRecords = pgTable("service_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  serviceType: text("service_type").notNull(), // 'routine', 'mot', 'repair', 'inspection', 'tachograph_calibration'
  serviceDate: timestamp("service_date").notNull(),
  nextServiceDue: timestamp("next_service_due"), // Automatic monitoring uses this
  mileageAtService: real("mileage_at_service"),
  serviceCost: decimal("service_cost", { precision: 10, scale: 2 }),
  serviceProvider: text("service_provider"), // Garage/service center name
  description: text("description"),
  partsReplaced: jsonb("parts_replaced").$type<string[]>(), // Array of parts replaced
  invoiceNumber: varchar("invoice_number"),
  nextServiceMiles: real("next_service_miles"), // Service due at this mileage
  status: text("status").default('completed'), // 'scheduled', 'in_progress', 'completed'
  performedBy: text("performed_by"), // Technician/mechanic name
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Fuel Logs - Track fuel consumption and efficiency
export const fuelLogs = pgTable("fuel_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  operatorId: varchar("operator_id"), // References operators (who filled up)
  fillDate: timestamp("fill_date").notNull(),
  odometer: real("odometer").notNull(), // Odometer reading at fill-up
  liters: real("liters").notNull(), // Liters of fuel added
  costPerLiter: decimal("cost_per_liter", { precision: 10, scale: 4 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  fuelType: text("fuel_type").notNull(), // 'diesel', 'petrol', 'electric', 'adblue'
  location: text("location"), // Where fuel was purchased
  fullTank: boolean("full_tank").default(false), // Whether tank was filled completely
  mpg: real("mpg"), // Miles per gallon (calculated automatically)
  receiptnumber: varchar("receipt_number"),
  paymentMethod: text("payment_method"), // 'company_card', 'cash', 'fuel_card'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vehicle Assignments - Track which operator is assigned to which vehicle
export const vehicleAssignments = pgTable("vehicle_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  operatorId: varchar("operator_id").notNull(), // References operators
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  unassignedAt: timestamp("unassigned_at"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
});

// AMPR/Toll Registration - Track toll payments and renewals
export const amprTollRegistrations = pgTable("ampr_toll_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  tollType: text("toll_type").notNull(), // 'ampr', 'vignette', 'zone', 'congestion', 'bridge', 'other'
  description: text("description").notNull(), // e.g., "AMPR License", "London Congestion Charge"
  annualFee: decimal("annual_fee", { precision: 10, scale: 2 }), // Annual cost
  renewalDate: timestamp("renewal_date"), // When the license/registration expires
  status: text("status").notNull().default('active'), // 'active', 'inactive', 'expired', 'pending_renewal'
  licenseNumber: varchar("license_number"), // License or registration number
  provider: text("provider"), // Provider name (e.g., "TfL", "Vignette Authority")
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fleet Notifications - On-screen expiration alerts
export const fleetNotifications = pgTable("fleet_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id"), // References fleet_vehicles (optional, for vehicle-related alerts)
  operatorId: varchar("operator_id"), // References operators (optional, for operator-related alerts)
  notificationType: text("notification_type").notNull(), // 'license', 'cqc', 'tachograph', 'service', 'toll_registration'
  message: text("message").notNull(), // Human-readable message
  expiryDate: timestamp("expiry_date").notNull(), // The date when the item expires
  daysUntilExpiry: integer("days_until_expiry").notNull(), // Number of days until expiry
  severity: text("severity").default('medium'), // 'low', 'medium', 'high' (high = 7 days, medium = 28 days)
  status: text("status").notNull().default('active'), // 'active', 'dismissed', 'resolved'
  resolvedAt: timestamp("resolved_at"), // When the notification was resolved
  createdAt: timestamp("created_at").defaultNow(),
});

// Vehicle Attachments - Store official documents for vehicles
export const vehicleAttachments = pgTable("vehicle_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  fileName: varchar("file_name").notNull(), // Original file name
  fileType: text("file_type").notNull(), // 'registration', 'mot', 'insurance', 'maintenance', 'other'
  objectPath: text("object_path").notNull(), // Path in object storage
  fileSize: integer("file_size"), // File size in bytes
  mimeType: varchar("mime_type"), // MIME type (e.g., 'application/pdf', 'image/jpeg')
  uploadedBy: varchar("uploaded_by"), // User who uploaded
  description: text("description"), // Optional notes about the document
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Driver connections for social trucking network
export const driverConnections = pgTable("driver_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'rejected', 'blocked'
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Ensure each connection pair is unique (prevent duplicate requests)
  uniqueConnection: index("unique_connection_pair").on(table.requesterId, table.receiverId),
}));

// Shared routes for social network
export const sharedRoutes = pgTable("shared_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  routeId: varchar("route_id").notNull().references(() => routes.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false), // Public to all or only connections
  shareWithConnections: boolean("share_with_connections").default(true),
  tags: jsonb("tags").$type<string[]>(), // ['motorway', 'scenic', 'fuel_efficient']
  sharedAt: timestamp("shared_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Index for finding routes by user
  userIdIndex: index("shared_routes_user_id_idx").on(table.userId),
  // Index for finding routes by original route
  routeIdIndex: index("shared_routes_route_id_idx").on(table.routeId),
}));

// Messages between drivers (PHASE 2 - deferred for now)
export const driverMessages = pgTable("driver_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (table) => ({
  // Index for finding messages by sender/receiver
  senderIdIndex: index("driver_messages_sender_id_idx").on(table.senderId),
  receiverIdIndex: index("driver_messages_receiver_id_idx").on(table.receiverId),
  sentAtIndex: index("driver_messages_sent_at_idx").on(table.sentAt),
}));

// Route comments/feedback
export const routeComments = pgTable("route_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sharedRouteId: varchar("shared_route_id").notNull().references(() => sharedRoutes.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  comment: text("comment").notNull(),
  rating: integer("rating"), // 1-5 stars (validated in application logic)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Index for finding comments by shared route
  sharedRouteIdIndex: index("route_comments_shared_route_id_idx").on(table.sharedRouteId),
}));

// Saved routes from other drivers
export const savedRoutes = pgTable("saved_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sharedRouteId: varchar("shared_route_id").notNull().references(() => sharedRoutes.id, { onDelete: 'cascade' }),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
}, (table) => ({
  // Ensure each user can only save a route once
  uniqueSavedRoute: index("unique_user_saved_route").on(table.userId, table.sharedRouteId),
}));

// Incident Logs - Driver incidents and accident tracking
export const incidentLogs = pgTable("incident_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  operatorId: varchar("operator_id"), // References operators
  incidentType: text("incident_type").notNull(), // 'accident', 'damage', 'violation', 'breakdown', 'near_miss', 'injury'
  severity: text("severity").notNull(), // 'critical', 'high', 'medium', 'low'
  description: text("description").notNull(),
  location: text("location"),
  coordinates: jsonb("coordinates").$type<{lat: number; lng: number}>(), // GPS coordinates if available
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  reportedBy: varchar("reported_by"), // User ID who reported
  insuranceClaimNumber: varchar("insurance_claim_number"),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  rootCause: text("root_cause"), // Analysis of what caused the incident
  preventativeMeasures: text("preventative_measures"), // Recommended measures
  status: text("status").notNull().default('open'), // 'open', 'closed', 'investigating'
  resolvedAt: timestamp("resolved_at"),
  attachmentIds: jsonb("attachment_ids").$type<string[]>(), // Photo/document IDs
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  vehicleIdIndex: index("incident_vehicle_idx").on(table.vehicleId),
  operatorIdIndex: index("incident_operator_idx").on(table.operatorId),
  reportedAtIndex: index("incident_reported_at_idx").on(table.reportedAt),
}));

// Cost Analytics - Track all costs per vehicle
export const costAnalytics = pgTable("cost_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  costType: text("cost_type").notNull(), // 'fuel', 'maintenance', 'insurance', 'toll', 'tax', 'repair', 'other'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  category: text("category"), // 'fixed', 'variable', 'one_time'
  occurrenceDate: timestamp("occurrence_date").notNull(),
  relatedRecord: varchar("related_record"), // ID of related service record, fuel log, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  vehicleIdIndex: index("cost_vehicle_idx").on(table.vehicleId),
  costTypeIndex: index("cost_type_idx").on(table.costType),
  dateIndex: index("cost_date_idx").on(table.occurrenceDate),
}));

// Trip Tracking - Monitor vehicle trips and profitability
export const tripTracking = pgTable("trip_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  operatorId: varchar("operator_id"), // References operators
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  startCoordinates: jsonb("start_coordinates").$type<{lat: number; lng: number}>(),
  endCoordinates: jsonb("end_coordinates").$type<{lat: number; lng: number}>(),
  plannedStartTime: timestamp("planned_start_time"),
  actualStartTime: timestamp("actual_start_time").notNull().defaultNow(),
  plannedEndTime: timestamp("planned_end_time"),
  actualEndTime: timestamp("actual_end_time"),
  plannedDistance: real("planned_distance"), // Miles
  actualDistance: real("actual_distance"), // Miles
  plannedDuration: integer("planned_duration"), // Minutes
  actualDuration: integer("actual_duration"), // Minutes
  fuelUsed: real("fuel_used"), // Liters
  costEstimate: decimal("cost_estimate", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  revenue: decimal("revenue", { precision: 10, scale: 2 }), // Income from this trip
  profitMargin: real("profit_margin"), // Percentage
  jobNumber: varchar("job_number"), // Link to customer job/order
  customerId: varchar("customer_id"), // Customer reference
  routeEfficiency: real("route_efficiency"), // Percentage (planned vs actual distance)
  fuelEfficiency: real("fuel_efficiency"), // MPG on this trip
  status: text("status").notNull().default('in_progress'), // 'planned', 'in_progress', 'completed', 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  vehicleIdIndex: index("trip_vehicle_idx").on(table.vehicleId),
  operatorIdIndex: index("trip_operator_idx").on(table.operatorId),
  dateIndex: index("trip_date_idx").on(table.actualStartTime),
}));

// User Roles - RBAC system for fleet management
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text("role").notNull(), // 'admin', 'manager', 'dispatcher', 'driver', 'accountant', 'viewer'
  fleetId: varchar("fleet_id"), // Which fleet (for multi-fleet support)
  permissions: jsonb("permissions").$type<string[]>(), // Array of permission strings
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by"), // User ID who assigned
  expiresAt: timestamp("expires_at"), // Temporary role expiry
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIndex: index("user_role_user_idx").on(table.userId),
  roleIndex: index("user_role_role_idx").on(table.role),
}));

// Maintenance Prediction - Predictive maintenance alerts
export const maintenancePrediction = pgTable("maintenance_prediction", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  predictedServiceType: text("predicted_service_type").notNull(), // 'routine', 'brake_service', 'oil_change', 'tire_replacement'
  predictedDate: timestamp("predicted_date").notNull(),
  predictedMileage: real("predicted_mileage"), // Miles at which service is predicted
  confidence: real("confidence"), // 0-1 confidence score
  riskLevel: text("risk_level").notNull(), // 'low', 'medium', 'high', 'critical'
  reason: text("reason"), // Why this maintenance is predicted
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actionTaken: text("action_taken"), // What action was taken (scheduled, ignored, completed)
  serviceRecordId: varchar("service_record_id"), // Link to actual service if completed
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  vehicleIdIndex: index("pred_vehicle_idx").on(table.vehicleId),
  dateIndex: index("pred_date_idx").on(table.predictedDate),
}));

// Compliance Records - Track regulatory compliance
export const complianceRecords = pgTable("compliance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recordType: text("record_type").notNull(), // 'dvla_check', 'emission_standard', 'hazmat_cert', 'tachograph_check', 'working_hours'
  vehicleId: varchar("vehicle_id"), // References fleet_vehicles (nullable for operator-level records)
  operatorId: varchar("operator_id"), // References operators (nullable for vehicle-level records)
  status: text("status").notNull(), // 'compliant', 'non_compliant', 'warning', 'expired'
  lastCheckedAt: timestamp("last_checked_at"),
  nextCheckDue: timestamp("next_check_due"),
  details: jsonb("details").$type<Record<string, any>>(), // Additional compliance details
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  vehicleIdIndex: index("compliance_vehicle_idx").on(table.vehicleId),
  operatorIdIndex: index("compliance_operator_idx").on(table.operatorId),
}));

// ========================================
// ENTERPRISE FLEET MANAGEMENT FEATURES
// ========================================

// Real-Time GPS Tracking - Track vehicle positions for live fleet view
export const gpsTracking = pgTable("gps_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  speed: real("speed"), // km/h
  heading: real("heading"), // degrees (0-360)
  accuracy: real("accuracy"), // meters
  altitude: real("altitude"), // meters
  engineStatus: text("engine_status"), // 'running', 'idle', 'off'
  fuelLevel: real("fuel_level"), // percentage 0-100
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  vehicleIdx: index("gps_tracking_vehicle_idx").on(table.vehicleId),
  timestampIdx: index("gps_tracking_timestamp_idx").on(table.timestamp),
}));

// Geofences - Define zones for alerts and monitoring
export const geofences = pgTable("geofences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  radiusMeters: real("radius_meters").notNull(),
  type: text("type").notNull(), // 'depot', 'customer', 'restricted_zone', 'fuel_station', 'rest_area'
  alertOnEntry: boolean("alert_on_entry").default(true),
  alertOnExit: boolean("alert_on_exit").default(true),
  isActive: boolean("is_active").default(true),
  color: text("color").default('#3B82F6'), // Hex color for map display
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("geofence_user_idx").on(table.userId),
}));

// Geofence Events - Track when vehicles enter/exit geofences
export const geofenceEvents = pgTable("geofence_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  geofenceId: varchar("geofence_id").notNull(),
  vehicleId: varchar("vehicle_id").notNull(),
  eventType: text("event_type").notNull(), // 'entry', 'exit'
  timestamp: timestamp("timestamp").defaultNow(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  geofenceIdx: index("geofence_event_geofence_idx").on(table.geofenceId),
  vehicleIdx: index("geofence_event_vehicle_idx").on(table.vehicleId),
}));

// Driver Behavior Analytics - Track safety metrics per driver
export const driverBehavior = pgTable("driver_behavior", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").notNull(), // References operators
  vehicleId: varchar("vehicle_id"), // References fleet_vehicles
  tripId: varchar("trip_id"), // References trip_tracking
  
  // Behavior metrics
  speedingEvents: integer("speeding_events").default(0),
  harshBrakingEvents: integer("harsh_braking_events").default(0),
  harshAccelerationEvents: integer("harsh_acceleration_events").default(0),
  sharpCorneringEvents: integer("sharp_cornering_events").default(0),
  phoneUsageEvents: integer("phone_usage_events").default(0),
  seatbeltViolations: integer("seatbelt_violations").default(0),
  
  // Time metrics
  totalDrivingTime: integer("total_driving_time"), // minutes
  idleTime: integer("idle_time"), // minutes
  nightDrivingTime: integer("night_driving_time"), // minutes
  
  // Distance metrics
  totalDistance: real("total_distance"), // miles
  
  // Scores (0-100)
  safetyScore: real("safety_score"),
  efficiencyScore: real("efficiency_score"),
  overallScore: real("overall_score"),
  
  periodType: text("period_type").default('daily'), // 'daily', 'weekly', 'monthly'
  behaviorDate: timestamp("behavior_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  operatorIdx: index("driver_behavior_operator_idx").on(table.operatorId),
  dateIdx: index("driver_behavior_date_idx").on(table.behaviorDate),
}));

// Hours of Service (HoS) Compliance - Track driving hours per regulations
export const hoursOfService = pgTable("hours_of_service", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").notNull(), // References operators
  vehicleId: varchar("vehicle_id"), // References fleet_vehicles
  
  // Daily limits (UK/EU regulations)
  dailyDrivingHours: real("daily_driving_hours").default(0), // Max 9h (can extend to 10h twice per week)
  dailyWorkingHours: real("daily_working_hours").default(0), // Max 13h
  dailyRestHours: real("daily_rest_hours").default(0), // Min 11h (can reduce to 9h three times per week)
  
  // Weekly limits
  weeklyDrivingHours: real("weekly_driving_hours").default(0), // Max 56h per week
  biweeklyDrivingHours: real("biweekly_driving_hours").default(0), // Max 90h per fortnight
  
  // Break tracking
  continuousDrivingTime: real("continuous_driving_time").default(0), // Max 4.5h before break
  breaksTaken: integer("breaks_taken").default(0),
  totalBreakTime: integer("total_break_time").default(0), // minutes
  
  // Violation flags
  dailyDrivingViolation: boolean("daily_driving_violation").default(false),
  dailyRestViolation: boolean("daily_rest_violation").default(false),
  weeklyDrivingViolation: boolean("weekly_driving_violation").default(false),
  breakViolation: boolean("break_violation").default(false),
  
  // Status
  currentStatus: text("current_status").default('off_duty'), // 'driving', 'working', 'break', 'rest', 'off_duty'
  lastStatusChange: timestamp("last_status_change"),
  
  logDate: timestamp("log_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  operatorIdx: index("hos_operator_idx").on(table.operatorId),
  dateIdx: index("hos_date_idx").on(table.logDate),
}));

// Customer Billing - Track revenue and profitability per customer
export const customerBilling = pgTable("customer_billing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull(), // External customer reference
  customerName: text("customer_name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  
  // Contract details
  contractType: text("contract_type"), // 'fixed', 'per_trip', 'per_mile', 'hourly'
  contractValue: decimal("contract_value", { precision: 12, scale: 2 }),
  ratePerMile: decimal("rate_per_mile", { precision: 6, scale: 2 }),
  ratePerHour: decimal("rate_per_hour", { precision: 6, scale: 2 }),
  
  // Financial summary
  totalTrips: integer("total_trips").default(0),
  totalMiles: real("total_miles").default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0"),
  profitMargin: real("profit_margin"), // percentage
  
  // Billing
  billingCycle: text("billing_cycle").default('monthly'), // 'weekly', 'monthly', 'quarterly'
  paymentTerms: integer("payment_terms").default(30), // days
  lastInvoiceDate: timestamp("last_invoice_date"),
  lastPaymentDate: timestamp("last_payment_date"),
  outstandingBalance: decimal("outstanding_balance", { precision: 12, scale: 2 }).default("0"),
  
  status: text("status").default('active'), // 'active', 'inactive', 'suspended'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("customer_billing_user_idx").on(table.userId),
  customerIdx: index("customer_billing_customer_idx").on(table.customerId),
}));

// Daily Shift Check-In/Check-Out - Track driver vehicle usage per shift
export const shiftCheckins = pgTable("shift_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  operatorId: varchar("operator_id").notNull(), // References operators
  
  // Check-in details
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  checkInOdometer: real("check_in_odometer").notNull(), // Starting odometer
  checkInFuelLevel: real("check_in_fuel_level"), // Fuel level 0-100%
  
  // Pre-trip inspection
  preTripInspection: boolean("pre_trip_inspection").default(false),
  tiresOk: boolean("tires_ok").default(true),
  lightsOk: boolean("lights_ok").default(true),
  brakesOk: boolean("brakes_ok").default(true),
  fluidsOk: boolean("fluids_ok").default(true),
  mirrorsOk: boolean("mirrors_ok").default(true),
  hornOk: boolean("horn_ok").default(true),
  wipersOk: boolean("wiper_ok").default(true),
  safetyEquipmentOk: boolean("safety_equipment_ok").default(true),
  vehicleClean: boolean("vehicle_clean").default(true),
  defectsNoted: text("defects_noted"),
  
  // Check-out details (filled when shift ends)
  checkOutTime: timestamp("check_out_time"),
  checkOutOdometer: real("check_out_odometer"),
  checkOutFuelLevel: real("check_out_fuel_level"),
  milesDriven: real("miles_driven"),
  fuelUsed: real("fuel_used"),
  
  // Post-trip notes
  postTripNotes: text("post_trip_notes"),
  issuesReported: text("issues_reported"),
  
  status: text("status").default('checked_in'), // 'checked_in', 'checked_out', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("shift_checkin_user_idx").on(table.userId),
  vehicleIdx: index("shift_checkin_vehicle_idx").on(table.vehicleId),
  operatorIdx: index("shift_checkin_operator_idx").on(table.operatorId),
  dateIdx: index("shift_checkin_date_idx").on(table.checkInTime),
}));

// Shift Handover Notes - Notes passed between drivers
export const shiftHandovers = pgTable("shift_handovers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  
  // Outgoing driver (ending shift)
  outgoingOperatorId: varchar("outgoing_operator_id").notNull(), // References operators
  outgoingCheckinId: varchar("outgoing_checkin_id"), // References shift_checkins
  
  // Incoming driver (starting shift)
  incomingOperatorId: varchar("incoming_operator_id"), // References operators (may be null if no one assigned yet)
  incomingCheckinId: varchar("incoming_checkin_id"), // References shift_checkins
  
  // Handover details
  handoverTime: timestamp("handover_time").notNull().defaultNow(),
  vehicleCondition: text("vehicle_condition").notNull().default('good'), // 'excellent', 'good', 'fair', 'needs_attention', 'unsafe'
  fuelLevel: real("fuel_level"), // 0-100%
  currentOdometer: real("current_odometer"),
  
  // Notes
  handoverNotes: text("handover_notes"), // General notes for next driver
  urgentIssues: text("urgent_issues"), // Critical issues that need attention
  recommendedActions: text("recommended_actions"), // Suggested actions for next driver
  
  // Acknowledgement
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by"), // operatorId who acknowledged
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("shift_handover_user_idx").on(table.userId),
  vehicleIdx: index("shift_handover_vehicle_idx").on(table.vehicleId),
  outgoingIdx: index("shift_handover_outgoing_idx").on(table.outgoingOperatorId),
  dateIdx: index("shift_handover_date_idx").on(table.handoverTime),
}));

// Driver Performance Scores - Track driver performance over time
export const driverPerformanceScores = pgTable("driver_performance_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  operatorId: varchar("operator_id").notNull(), // References operators
  
  // Scoring period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  periodType: text("period_type").notNull().default('weekly'), // 'daily', 'weekly', 'monthly', 'quarterly'
  
  // Overall score (0-100)
  overallScore: real("overall_score").notNull().default(100),
  
  // Component scores (0-100 each)
  safetyScore: real("safety_score").default(100), // Based on incidents, harsh braking, speeding
  efficiencyScore: real("efficiency_score").default(100), // Fuel efficiency, route adherence
  complianceScore: real("compliance_score").default(100), // HoS compliance, inspections
  punctualityScore: real("punctuality_score").default(100), // On-time deliveries
  vehicleCareScore: real("vehicle_care_score").default(100), // Pre-trip inspections, cleanliness
  
  // Metrics used in calculation
  totalMilesDriven: real("total_miles_driven").default(0),
  totalHoursDriven: real("total_hours_driven").default(0),
  totalTrips: integer("total_trips").default(0),
  incidentCount: integer("incident_count").default(0),
  harshBrakingEvents: integer("harsh_braking_events").default(0),
  speedingEvents: integer("speeding_events").default(0),
  hosViolations: integer("hos_violations").default(0),
  lateDeliveries: integer("late_deliveries").default(0),
  missedInspections: integer("missed_inspections").default(0),
  
  // Trend
  scoreTrend: text("score_trend").default('stable'), // 'improving', 'stable', 'declining'
  previousScore: real("previous_score"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("driver_score_user_idx").on(table.userId),
  operatorIdx: index("driver_score_operator_idx").on(table.operatorId),
  periodIdx: index("driver_score_period_idx").on(table.periodStart),
}));

// Vehicle Health Scores - Track vehicle condition over time
export const vehicleHealthScores = pgTable("vehicle_health_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  vehicleId: varchar("vehicle_id").notNull(), // References fleet_vehicles
  
  // Scoring period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  periodType: text("period_type").notNull().default('weekly'), // 'daily', 'weekly', 'monthly'
  
  // Overall score (0-100)
  overallScore: real("overall_score").notNull().default(100),
  
  // Component scores (0-100 each)
  mechanicalScore: real("mechanical_score").default(100), // Engine, brakes, transmission
  safetySystemsScore: real("safety_systems_score").default(100), // Lights, wipers, mirrors
  tiresScore: real("tires_score").default(100), // Tire condition, tread depth
  fluidsScore: real("fluids_score").default(100), // Oil, coolant, brake fluid
  bodyScore: real("body_score").default(100), // Body condition, cleanliness
  
  // Metrics
  totalMiles: real("total_miles").default(0),
  fuelEfficiency: real("fuel_efficiency"), // MPG
  averageFuelEfficiency: real("average_fuel_efficiency"), // Historical average MPG
  serviceOverdue: boolean("service_overdue").default(false),
  daysSinceService: integer("days_since_service"),
  defectsReported: integer("defects_reported").default(0),
  defectsResolved: integer("defects_resolved").default(0),
  
  // Age/wear factors
  vehicleAgeYears: real("vehicle_age_years"),
  totalOdometer: real("total_odometer"),
  expectedLifespanPercent: real("expected_lifespan_percent"), // How much of expected life used
  
  // Trend
  scoreTrend: text("score_trend").default('stable'), // 'improving', 'stable', 'declining'
  previousScore: real("previous_score"),
  
  // Recommendations
  recommendedActions: text("recommended_actions"),
  urgentIssues: text("urgent_issues"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("vehicle_score_user_idx").on(table.userId),
  vehicleIdx: index("vehicle_score_vehicle_idx").on(table.vehicleId),
  periodIdx: index("vehicle_score_period_idx").on(table.periodStart),
}));

// ========================================
// FLEET BROADCAST MESSAGING
// ========================================

// Fleet Broadcasts - Messages from managers to all fleet drivers
export const fleetBroadcasts = pgTable("fleet_broadcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderName: text("sender_name").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").notNull().default('info'), // 'critical', 'important', 'info'
  category: text("category").notNull().default('general'), // 'general', 'safety', 'traffic', 'operations', 'emergency'
  expiresAt: timestamp("expires_at"), // Optional expiration time
  isActive: boolean("is_active").default(true),
  readCount: integer("read_count").default(0),
  targetAudience: text("target_audience").default('all'), // 'all', 'operators', 'managers'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  senderIdx: index("broadcast_sender_idx").on(table.senderId),
  priorityIdx: index("broadcast_priority_idx").on(table.priority),
  createdAtIdx: index("broadcast_created_idx").on(table.createdAt),
}));

// Fleet Broadcast Read Receipts - Track which drivers have read which broadcasts
export const fleetBroadcastReads = pgTable("fleet_broadcast_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  broadcastId: varchar("broadcast_id").notNull().references(() => fleetBroadcasts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: timestamp("read_at").defaultNow(),
}, (table) => ({
  broadcastIdx: index("read_broadcast_idx").on(table.broadcastId),
  userIdx: index("read_user_idx").on(table.userId),
}));

// Zod schemas for fleet management
export const insertFleetVehicleSchema = createInsertSchema(fleetVehicles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOperatorSchema = createInsertSchema(operators).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceRecordSchema = createInsertSchema(serviceRecords).omit({ id: true, createdAt: true });
export const insertFuelLogSchema = createInsertSchema(fuelLogs).omit({ id: true, createdAt: true });
export const insertVehicleAssignmentSchema = createInsertSchema(vehicleAssignments).omit({ id: true, assignedAt: true });
export const insertAmprTollRegistrationSchema = createInsertSchema(amprTollRegistrations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFleetNotificationSchema = createInsertSchema(fleetNotifications).omit({ id: true, createdAt: true });
export const insertVehicleAttachmentSchema = createInsertSchema(vehicleAttachments).omit({ id: true, uploadedAt: true });
export const insertIncidentLogSchema = createInsertSchema(incidentLogs).omit({ id: true, createdAt: true });
export const insertCostAnalyticsSchema = createInsertSchema(costAnalytics).omit({ id: true, createdAt: true });
export const insertTripTrackingSchema = createInsertSchema(tripTracking).omit({ id: true, createdAt: true });
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, createdAt: true });
export const insertMaintenancePredictionSchema = createInsertSchema(maintenancePrediction).omit({ id: true, createdAt: true });
export const insertComplianceRecordSchema = createInsertSchema(complianceRecords).omit({ id: true, createdAt: true });

// Zod schemas for enterprise features
export const insertGpsTrackingSchema = createInsertSchema(gpsTracking).omit({ id: true, createdAt: true, timestamp: true });
export const insertGeofenceSchema = createInsertSchema(geofences).omit({ id: true, createdAt: true });
export const insertGeofenceEventSchema = createInsertSchema(geofenceEvents).omit({ id: true, createdAt: true, timestamp: true });
export const insertDriverBehaviorSchema = createInsertSchema(driverBehavior).omit({ id: true, createdAt: true });
export const insertHoursOfServiceSchema = createInsertSchema(hoursOfService).omit({ id: true, createdAt: true });
export const insertCustomerBillingSchema = createInsertSchema(customerBilling).omit({ id: true, createdAt: true });

// Zod schemas for shift management
export const insertShiftCheckinSchema = createInsertSchema(shiftCheckins).omit({ id: true, createdAt: true });
export const insertShiftHandoverSchema = createInsertSchema(shiftHandovers).omit({ id: true, createdAt: true });
export const insertDriverPerformanceScoreSchema = createInsertSchema(driverPerformanceScores).omit({ id: true, createdAt: true });
export const insertVehicleHealthScoreSchema = createInsertSchema(vehicleHealthScores).omit({ id: true, createdAt: true });

// Zod schemas for fleet broadcasts
export const insertFleetBroadcastSchema = createInsertSchema(fleetBroadcasts).omit({ id: true, createdAt: true, readCount: true });
export const insertFleetBroadcastReadSchema = createInsertSchema(fleetBroadcastReads).omit({ id: true, readAt: true });

// Zod schemas for social network
export const insertDriverConnectionSchema = createInsertSchema(driverConnections).omit({ id: true, requestedAt: true, createdAt: true });
export const insertSharedRouteSchema = createInsertSchema(sharedRoutes).omit({ id: true, sharedAt: true, updatedAt: true });
export const insertDriverMessageSchema = createInsertSchema(driverMessages).omit({ id: true, sentAt: true });
export const insertRouteCommentSchema = createInsertSchema(routeComments).omit({ id: true, createdAt: true });
export const insertSavedRouteSchema = createInsertSchema(savedRoutes).omit({ id: true, savedAt: true });

// Type exports for fleet management
export type FleetVehicle = typeof fleetVehicles.$inferSelect;
export type InsertFleetVehicle = z.infer<typeof insertFleetVehicleSchema>;

export type Operator = typeof operators.$inferSelect;
export type InsertOperator = z.infer<typeof insertOperatorSchema>;

export type ServiceRecord = typeof serviceRecords.$inferSelect;
export type InsertServiceRecord = z.infer<typeof insertServiceRecordSchema>;

export type FuelLog = typeof fuelLogs.$inferSelect;
export type InsertFuelLog = z.infer<typeof insertFuelLogSchema>;

export type VehicleAssignment = typeof vehicleAssignments.$inferSelect;
export type InsertVehicleAssignment = z.infer<typeof insertVehicleAssignmentSchema>;

export type AmprTollRegistration = typeof amprTollRegistrations.$inferSelect;
export type InsertAmprTollRegistration = z.infer<typeof insertAmprTollRegistrationSchema>;

export type FleetNotification = typeof fleetNotifications.$inferSelect;
export type InsertFleetNotification = z.infer<typeof insertFleetNotificationSchema>;

export type VehicleAttachment = typeof vehicleAttachments.$inferSelect;
export type InsertVehicleAttachment = z.infer<typeof insertVehicleAttachmentSchema>;

export type IncidentLog = typeof incidentLogs.$inferSelect;
export type InsertIncidentLog = z.infer<typeof insertIncidentLogSchema>;

export type CostAnalytics = typeof costAnalytics.$inferSelect;
export type InsertCostAnalytics = z.infer<typeof insertCostAnalyticsSchema>;

export type TripTracking = typeof tripTracking.$inferSelect;
export type InsertTripTracking = z.infer<typeof insertTripTrackingSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type MaintenancePrediction = typeof maintenancePrediction.$inferSelect;
export type InsertMaintenancePrediction = z.infer<typeof insertMaintenancePredictionSchema>;

export type ComplianceRecord = typeof complianceRecords.$inferSelect;
export type InsertComplianceRecord = z.infer<typeof insertComplianceRecordSchema>;

// Type exports for social network
export type DriverConnection = typeof driverConnections.$inferSelect;
export type InsertDriverConnection = z.infer<typeof insertDriverConnectionSchema>;

export type SharedRoute = typeof sharedRoutes.$inferSelect;
export type InsertSharedRoute = z.infer<typeof insertSharedRouteSchema>;

export type DriverMessage = typeof driverMessages.$inferSelect;
export type InsertDriverMessage = z.infer<typeof insertDriverMessageSchema>;

export type RouteComment = typeof routeComments.$inferSelect;
export type InsertRouteComment = z.infer<typeof insertRouteCommentSchema>;

export type SavedRoute = typeof savedRoutes.$inferSelect;
export type InsertSavedRoute = z.infer<typeof insertSavedRouteSchema>;

// Type exports for enterprise features
export type GpsTracking = typeof gpsTracking.$inferSelect;
export type InsertGpsTracking = z.infer<typeof insertGpsTrackingSchema>;

export type Geofence = typeof geofences.$inferSelect;
export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;

export type GeofenceEvent = typeof geofenceEvents.$inferSelect;
export type InsertGeofenceEvent = z.infer<typeof insertGeofenceEventSchema>;

export type DriverBehavior = typeof driverBehavior.$inferSelect;
export type InsertDriverBehavior = z.infer<typeof insertDriverBehaviorSchema>;

export type HoursOfService = typeof hoursOfService.$inferSelect;
export type InsertHoursOfService = z.infer<typeof insertHoursOfServiceSchema>;

// Type exports for fleet broadcasts
export type FleetBroadcast = typeof fleetBroadcasts.$inferSelect;
export type InsertFleetBroadcast = z.infer<typeof insertFleetBroadcastSchema>;

export type FleetBroadcastRead = typeof fleetBroadcastReads.$inferSelect;
export type InsertFleetBroadcastRead = z.infer<typeof insertFleetBroadcastReadSchema>;

export type CustomerBilling = typeof customerBilling.$inferSelect;
export type InsertCustomerBilling = z.infer<typeof insertCustomerBillingSchema>;

// Type exports for shift management
export type ShiftCheckin = typeof shiftCheckins.$inferSelect;
export type InsertShiftCheckin = z.infer<typeof insertShiftCheckinSchema>;

export type ShiftHandover = typeof shiftHandovers.$inferSelect;
export type InsertShiftHandover = z.infer<typeof insertShiftHandoverSchema>;

export type DriverPerformanceScore = typeof driverPerformanceScores.$inferSelect;
export type InsertDriverPerformanceScore = z.infer<typeof insertDriverPerformanceScoreSchema>;

export type VehicleHealthScore = typeof vehicleHealthScores.$inferSelect;
export type InsertVehicleHealthScore = z.infer<typeof insertVehicleHealthScoreSchema>;

