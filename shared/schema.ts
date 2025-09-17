import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, boolean, jsonb, timestamp, decimal } from "drizzle-orm/pg-core";
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

export const insertVehicleProfileSchema = createInsertSchema(vehicleProfiles).omit({
  id: true,
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

export type LaneOption = z.infer<typeof laneOptionSchema>;
export type LaneSegment = z.infer<typeof laneSegmentSchema>;
