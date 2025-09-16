import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  isFavorite: boolean("is_favorite").default(false),
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

export type VehicleProfile = typeof vehicleProfiles.$inferSelect;
export type InsertVehicleProfile = z.infer<typeof insertVehicleProfileSchema>;

export type Restriction = typeof restrictions.$inferSelect;
export type InsertRestriction = z.infer<typeof insertRestrictionSchema>;

export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;

export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
