import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, boolean, jsonb, timestamp, decimal, serial, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// SESSION TABLE
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull().$type<{userId?: string; user?: any}>(),
  expire: timestamp("expire"),
});

// USERS TABLE
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: varchar("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatar: text("avatar"),
  phone: varchar("phone"),
  verified: boolean("verified").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  subscriptionStatus: text("subscription_status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SUBSCRIPTION PLANS
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  interval: text("interval"), // 'monthly', 'yearly', 'lifetime'
  features: jsonb("features").$type<string[]>(),
  stripePriceId: varchar("stripe_price_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// USER SUBSCRIPTIONS
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  status: text("status"), // 'active', 'cancelled', 'expired'
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// LOCATIONS
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label"),
  coordinates: jsonb("coordinates").$type<{lat: number; lng: number}>(),
  isFavorite: boolean("is_favorite").default(false),
  useCount: integer("use_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// JOURNEYS
export const journeys = pgTable("journeys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id"),
  userId: varchar("user_id").references(() => users.id),
  status: text("status").default('planned'),
  startTime: timestamp("start_time"),
  completedTime: timestamp("completed_time"),
  plannedDate: timestamp("planned_date"),
  actualDistance: real("actual_distance"),
  actualDuration: integer("actual_duration"),
  fuelConsumed: real("fuel_consumed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// FLEET VEHICLES
export const fleetVehicles = pgTable("fleet_vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  registrationNumber: varchar("registration_number").notNull().unique(),
  trailerNumber: varchar("trailer_number"),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  vin: text("vin"),
  vehicleType: text("vehicle_type"),
  fuelType: text("fuel_type"),
  tankCapacity: real("tank_capacity"),
  mileage: integer("mileage"),
  status: text("status").default('active'),
  nextServiceDate: timestamp("next_service_date"),
  insuranceExpiry: timestamp("insurance_expiry"),
  motExpiry: timestamp("mot_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

// OPERATORS
export const operators = pgTable("operators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  licenseNumber: varchar("license_number"),
  licenseType: text("license_type"),
  licenseExpiry: timestamp("license_expiry"),
  driverCpcExpiry: timestamp("driver_cpc_expiry"),
  tachographCardExpiry: timestamp("tachograph_card_expiry"),
  employeeId: varchar("employee_id"),
  status: text("status").default('active'),
  createdAt: timestamp("created_at").defaultNow(),
});

// SERVICE RECORDS
export const serviceRecords = pgTable("service_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => fleetVehicles.id),
  serviceType: text("service_type").notNull(),
  serviceDate: timestamp("service_date").notNull(),
  nextDueDate: timestamp("next_due_date"),
  mileageAtService: integer("mileage_at_service"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  provider: text("provider"),
  partsReplaced: jsonb("parts_replaced").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// FUEL LOGS
export const fuelLogs = pgTable("fuel_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => fleetVehicles.id),
  odometerReading: integer("odometer_reading").notNull(),
  litersFilled: real("liters_filled").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  location: text("location"),
  fuelType: text("fuel_type"),
  mpg: real("mpg"),
  logDate: timestamp("log_date").defaultNow(),
});

// VEHICLE ASSIGNMENTS
export const vehicleAssignments = pgTable("vehicle_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => fleetVehicles.id),
  operatorId: varchar("operator_id").notNull().references(() => operators.id),
  assignedDate: timestamp("assigned_date").notNull().defaultNow(),
  unassignedDate: timestamp("unassigned_date"),
  status: text("status").default('active'),
  createdAt: timestamp("created_at").defaultNow(),
});

// DOCUMENTS
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").references(() => fleetVehicles.id),
  operatorId: varchar("operator_id").references(() => operators.id),
  documentType: text("document_type").notNull(),
  fileUrl: text("file_url"),
  expiryDate: timestamp("expiry_date"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// INCIDENT LOGS
export const incidentLogs = pgTable("incident_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").references(() => fleetVehicles.id),
  operatorId: varchar("operator_id").references(() => operators.id),
  incidentType: text("incident_type").notNull(),
  severity: text("severity").notNull(),
  description: text("description"),
  location: text("location"),
  rootCause: text("root_cause"),
  preventativeMeasures: text("preventative_measures"),
  insuranceClaimNumber: varchar("insurance_claim_number"),
  incidentDate: timestamp("incident_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// COST ANALYTICS
export const costAnalytics = pgTable("cost_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => fleetVehicles.id),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  costType: text("cost_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  jobNumber: varchar("job_number"),
  customerId: varchar("customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// TRIP TRACKING
export const tripTracking = pgTable("trip_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => fleetVehicles.id),
  operatorId: varchar("operator_id").references(() => operators.id),
  routeId: varchar("route_id"),
  plannedDistance: real("planned_distance"),
  actualDistance: real("actual_distance"),
  plannedDuration: integer("planned_duration"),
  actualDuration: integer("actual_duration"),
  plannedCost: decimal("planned_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  profitMargin: real("profit_margin"),
  fuelUsed: real("fuel_used"),
  efficiency: real("efficiency"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  tripDate: timestamp("trip_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// USER ROLES
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  permissions: jsonb("permissions").$type<string[]>(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// MAINTENANCE PREDICTION
export const maintenancePrediction = pgTable("maintenance_prediction", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => fleetVehicles.id),
  predictedServiceType: text("predicted_service_type"),
  predictedDate: timestamp("predicted_date"),
  riskLevel: text("risk_level"),
  confidence: real("confidence"),
  mileagePrediction: integer("mileage_prediction"),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at").defaultNow(),
});

// COMPLIANCE RECORDS
export const complianceRecords = pgTable("compliance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").references(() => fleetVehicles.id),
  operatorId: varchar("operator_id").references(() => operators.id),
  complianceType: text("compliance_type").notNull(),
  status: text("status").notNull(),
  lastCheckedDate: timestamp("last_checked_date"),
  nextCheckDate: timestamp("next_check_date"),
  details: jsonb("details").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// SOCIAL NETWORK TABLES
export const driverConnections = pgTable("driver_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromDriverId: varchar("from_driver_id").notNull().references(() => operators.id),
  toDriverId: varchar("to_driver_id").notNull().references(() => operators.id),
  status: text("status").default('pending'),
  requestedAt: timestamp("requested_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sharedRoutes = pgTable("shared_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull().references(() => routes.id),
  sharedBy: varchar("shared_by").notNull().references(() => operators.id),
  sharedWith: varchar("shared_with").notNull().references(() => operators.id),
  sharedAt: timestamp("shared_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const driverMessages = pgTable("driver_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromDriverId: varchar("from_driver_id").notNull().references(() => operators.id),
  toDriverId: varchar("to_driver_id").notNull().references(() => operators.id),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const routeComments = pgTable("route_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull().references(() => routes.id),
  driverId: varchar("driver_id").notNull().references(() => operators.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedRoutes = pgTable("saved_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull().references(() => routes.id),
  driverId: varchar("driver_id").notNull().references(() => operators.id),
  savedAt: timestamp("saved_at").defaultNow(),
});

// ENTERPRISE TRACKING FEATURES
export const gpsTracking = pgTable("gps_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => fleetVehicles.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  speed: real("speed"),
  heading: real("heading"),
  accuracy: real("accuracy"),
  altitude: real("altitude"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  vehicleIdx: index("gps_tracking_vehicle_id_idx").on(table.vehicleId),
  timestampIdx: index("gps_tracking_timestamp_idx").on(table.timestamp),
}));

export const driverBehavior = pgTable("driver_behavior", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").notNull().references(() => operators.id),
  vehicleId: varchar("vehicle_id").references(() => fleetVehicles.id),
  speedingEvents: integer("speeding_events").default(0),
  harshBrakingEvents: integer("harsh_braking_events").default(0),
  harshAccelerationEvents: integer("harsh_acceleration_events").default(0),
  corneringEvents: integer("cornering_events").default(0),
  idleTime: integer("idle_time"),
  safetyScore: real("safety_score"),
  behaviorDate: timestamp("behavior_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hoursOfService = pgTable("hours_of_service", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").notNull().references(() => operators.id),
  vehicleId: varchar("vehicle_id").references(() => fleetVehicles.id),
  workingHours: real("working_hours"),
  restingHours: real("resting_hours"),
  drivingHours: real("driving_hours"),
  breakDuration: real("break_duration"),
  dailyMaxViolation: boolean("daily_max_violation").default(false),
  logDate: timestamp("log_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerBilling = pgTable("customer_billing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default(0),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default(0),
  margin: real("margin"),
  status: text("status").default('active'),
  billingCycle: text("billing_cycle"),
  lastInvoiceDate: timestamp("last_invoice_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// NAVIGATION CORE TABLES
export const vehicleProfiles = pgTable("vehicle_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("class_1_lorry"),
  height: real("height").notNull(),
  width: real("width").notNull(),
  length: real("length"),
  weight: real("weight"),
  axles: integer("axles").default(4),
  isHazmat: boolean("is_hazmat").default(false),
  maxSpeed: integer("max_speed").default(70),
  canUseResidentialRoads: boolean("can_use_residential_roads").default(true),
  canUseMotorways: boolean("can_use_motorways").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const restrictions = pgTable("restrictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  location: text("location").notNull(),
  type: text("type").notNull(),
  limit: real("limit").notNull(),
  description: text("description"),
  coordinates: jsonb("coordinates").$type<{lat: number; lng: number}>(),
  roadName: text("road_name"),
  country: text("country").default('UK'),
  severity: text("severity").default('medium'),
  isActive: boolean("is_active").default(true),
});

export const facilities = pgTable("facilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  coordinates: jsonb("coordinates").$type<{lat: number; lng: number}>().notNull(),
  address: text("address"),
  amenities: jsonb("amenities").$type<string[]>(),
  rating: real("rating"),
  reviewCount: integer("review_count").default(0),
  truckParking: boolean("truck_parking").default(false),
  fuel: boolean("fuel").default(false),
  country: text("country").default('UK'),
});

export const routes = pgTable("routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  startCoordinates: jsonb("start_coordinates").$type<{lat: number; lng: number}>().notNull(),
  endCoordinates: jsonb("end_coordinates").$type<{lat: number; lng: number}>().notNull(),
  distance: real("distance"),
  duration: integer("duration"),
  vehicleProfileId: varchar("vehicle_profile_id"),
  routePath: jsonb("route_path").$type<{lat: number; lng: number}[]>(),
  geometry: jsonb("geometry").$type<{type: "LineString"; coordinates: [number, number][]}>(),
  isFavorite: boolean("is_favorite").default(false),
});

export const trafficIncidents = pgTable("traffic_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  coordinates: jsonb("coordinates").$type<{lat: number; lng: number}>().notNull(),
  roadName: text("road_name"),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  reportedAt: timestamp("reported_at").defaultNow(),
});

// VEHICLE ATTACHMENT
export const vehicleAttachments = pgTable("vehicle_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => fleetVehicles.id),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name"),
  fileType: text("file_type"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// TYPE EXPORTS
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof updateUserProfileSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Journey = typeof journeys.$inferSelect;
export type InsertJourney = z.infer<typeof insertJourneySchema>;

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

export type VehicleAttachment = typeof vehicleAttachments.$inferSelect;
export type InsertVehicleAttachment = z.infer<typeof insertVehicleAttachmentSchema>;

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
export type InsertComplianceRecord = z.infer<typeof insertComplianceRecordsSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type GpsTracking = typeof gpsTracking.$inferSelect;
export type InsertGpsTracking = z.infer<typeof insertGpsTrackingSchema>;

export type DriverBehavior = typeof driverBehavior.$inferSelect;
export type InsertDriverBehavior = z.infer<typeof insertDriverBehaviorSchema>;

export type HoursOfService = typeof hoursOfService.$inferSelect;
export type InsertHoursOfService = z.infer<typeof insertHoursOfServiceSchema>;

export type CustomerBilling = typeof customerBilling.$inferSelect;
export type InsertCustomerBilling = z.infer<typeof insertCustomerBillingSchema>;

// SCHEMA EXPORTS
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const updateUserProfileSchema = z.object({ firstName: z.string().optional(), lastName: z.string().optional(), phone: z.string().optional() });
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true });
export const insertJourneySchema = createInsertSchema(journeys).omit({ id: true, createdAt: true });
export const insertFleetVehicleSchema = createInsertSchema(fleetVehicles).omit({ id: true, createdAt: true });
export const insertOperatorSchema = createInsertSchema(operators).omit({ id: true, createdAt: true });
export const insertServiceRecordSchema = createInsertSchema(serviceRecords).omit({ id: true, createdAt: true });
export const insertFuelLogSchema = createInsertSchema(fuelLogs).omit({ id: true, logDate: true });
export const insertVehicleAssignmentSchema = createInsertSchema(vehicleAssignments).omit({ id: true, createdAt: true });
export const insertDriverConnectionSchema = createInsertSchema(driverConnections).omit({ id: true, requestedAt: true, createdAt: true });
export const insertSharedRouteSchema = createInsertSchema(sharedRoutes).omit({ id: true, sharedAt: true, updatedAt: true });
export const insertDriverMessageSchema = createInsertSchema(driverMessages).omit({ id: true, sentAt: true });
export const insertRouteCommentSchema = createInsertSchema(routeComments).omit({ id: true, createdAt: true });
export const insertSavedRouteSchema = createInsertSchema(savedRoutes).omit({ id: true, savedAt: true });
export const insertVehicleAttachmentSchema = createInsertSchema(vehicleAttachments).omit({ id: true, uploadedAt: true });
export const insertVehicleProfileSchema = createInsertSchema(vehicleProfiles).omit({ id: true, createdAt: true });
export const insertRestrictionSchema = createInsertSchema(restrictions).omit({ id: true });
export const insertFacilitySchema = createInsertSchema(facilities).omit({ id: true });
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true });
export const insertTrafficIncidentSchema = createInsertSchema(trafficIncidents).omit({ id: true, reportedAt: true });
export const insertIncidentLogSchema = createInsertSchema(incidentLogs).omit({ id: true, createdAt: true });
export const insertCostAnalyticsSchema = createInsertSchema(costAnalytics).omit({ id: true, createdAt: true });
export const insertTripTrackingSchema = createInsertSchema(tripTracking).omit({ id: true, createdAt: true });
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, assignedAt: true });
export const insertMaintenancePredictionSchema = createInsertSchema(maintenancePrediction).omit({ id: true, createdAt: true });
export const insertComplianceRecordsSchema = createInsertSchema(complianceRecords).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });
export const insertGpsTrackingSchema = createInsertSchema(gpsTracking).omit({ id: true, createdAt: true });
export const insertDriverBehaviorSchema = createInsertSchema(driverBehavior).omit({ id: true, createdAt: true });
export const insertHoursOfServiceSchema = createInsertSchema(hoursOfService).omit({ id: true, createdAt: true });
export const insertCustomerBillingSchema = createInsertSchema(customerBilling).omit({ id: true, createdAt: true });
