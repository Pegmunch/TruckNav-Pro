CREATE TABLE "alternative_routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_route_id" varchar NOT NULL,
	"route_path" jsonb NOT NULL,
	"distance" real NOT NULL,
	"duration" integer NOT NULL,
	"duration_without_traffic" integer NOT NULL,
	"time_savings_minutes" integer NOT NULL,
	"confidence_level" real NOT NULL,
	"traffic_conditions" jsonb,
	"restrictions_avoided" jsonb,
	"viability_score" real,
	"reason_for_suggestion" text NOT NULL,
	"calculated_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ampr_toll_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"toll_type" text NOT NULL,
	"description" text NOT NULL,
	"annual_fee" numeric(10, 2),
	"renewal_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"license_number" varchar,
	"provider" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_type" text NOT NULL,
	"vehicle_id" varchar,
	"operator_id" varchar,
	"status" text NOT NULL,
	"last_checked_at" timestamp,
	"next_check_due" timestamp,
	"details" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cost_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"cost_type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"category" text,
	"occurrence_date" timestamp NOT NULL,
	"related_record" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_billing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"customer_name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"contract_type" text,
	"contract_value" numeric(12, 2),
	"rate_per_mile" numeric(6, 2),
	"rate_per_hour" numeric(6, 2),
	"total_trips" integer DEFAULT 0,
	"total_miles" real DEFAULT 0,
	"total_revenue" numeric(12, 2) DEFAULT '0',
	"total_cost" numeric(12, 2) DEFAULT '0',
	"profit_margin" real,
	"billing_cycle" text DEFAULT 'monthly',
	"payment_terms" integer DEFAULT 30,
	"last_invoice_date" timestamp,
	"last_payment_date" timestamp,
	"outstanding_balance" numeric(12, 2) DEFAULT '0',
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dash_cam_recordings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"vehicle_id" varchar,
	"filename" text NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"file_size" integer NOT NULL,
	"duration" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"start_location" jsonb,
	"end_location" jsonb,
	"gps_track" jsonb,
	"max_speed" integer DEFAULT 0,
	"average_speed" integer DEFAULT 0,
	"incidents" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "driver_behavior" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" varchar NOT NULL,
	"vehicle_id" varchar,
	"trip_id" varchar,
	"speeding_events" integer DEFAULT 0,
	"harsh_braking_events" integer DEFAULT 0,
	"harsh_acceleration_events" integer DEFAULT 0,
	"sharp_cornering_events" integer DEFAULT 0,
	"phone_usage_events" integer DEFAULT 0,
	"seatbelt_violations" integer DEFAULT 0,
	"total_driving_time" integer,
	"idle_time" integer,
	"night_driving_time" integer,
	"total_distance" real,
	"safety_score" real,
	"efficiency_score" real,
	"overall_score" real,
	"period_type" text DEFAULT 'daily',
	"behavior_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "driver_behavior_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar NOT NULL,
	"average_speed_factor" double precision DEFAULT 1 NOT NULL,
	"break_frequency_per_hour" double precision DEFAULT 0,
	"average_break_duration" integer DEFAULT 0,
	"trips_completed" integer DEFAULT 0 NOT NULL,
	"total_driving_minutes" integer DEFAULT 0,
	"average_speed_kmh" double precision DEFAULT 50,
	"last_trip_speed_factor" double precision DEFAULT 1,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "driver_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" varchar NOT NULL,
	"receiver_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "driver_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar NOT NULL,
	"receiver_id" varchar NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_performance_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"operator_id" varchar NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"period_type" text DEFAULT 'weekly' NOT NULL,
	"overall_score" real DEFAULT 100 NOT NULL,
	"safety_score" real DEFAULT 100,
	"efficiency_score" real DEFAULT 100,
	"compliance_score" real DEFAULT 100,
	"punctuality_score" real DEFAULT 100,
	"vehicle_care_score" real DEFAULT 100,
	"total_miles_driven" real DEFAULT 0,
	"total_hours_driven" real DEFAULT 0,
	"total_trips" integer DEFAULT 0,
	"incident_count" integer DEFAULT 0,
	"harsh_braking_events" integer DEFAULT 0,
	"speeding_events" integer DEFAULT 0,
	"hos_violations" integer DEFAULT 0,
	"late_deliveries" integer DEFAULT 0,
	"missed_inspections" integer DEFAULT 0,
	"score_trend" text DEFAULT 'stable',
	"previous_score" real,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entertainment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" varchar NOT NULL,
	"user_id" varchar,
	"played_at" timestamp DEFAULT now(),
	"play_duration" integer,
	"was_completed" boolean DEFAULT false,
	"volume" real,
	"source" text DEFAULT 'manual',
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "entertainment_playback_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"current_station_id" varchar,
	"is_playing" boolean DEFAULT false,
	"volume" real DEFAULT 0.8,
	"position" integer DEFAULT 0,
	"duration" integer,
	"playback_started_at" timestamp,
	"last_paused_at" timestamp,
	"audio_focus_held" boolean DEFAULT false,
	"crossfade_enabled" boolean DEFAULT false,
	"repeat_mode" text DEFAULT 'none',
	"shuffle_enabled" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entertainment_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" varchar NOT NULL,
	"user_id" varchar,
	"preset_number" integer,
	"custom_name" text,
	"volume" real DEFAULT 0.8,
	"is_default" boolean DEFAULT false,
	"use_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entertainment_stations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"type" text NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"genre" text,
	"creator" text,
	"stream_url" text NOT NULL,
	"artwork_url" text,
	"website_url" text,
	"metadata" jsonb,
	"duration" integer,
	"language" text DEFAULT 'en',
	"country" text DEFAULT 'US',
	"bitrate" integer,
	"format" text DEFAULT 'mp3',
	"reliability" integer DEFAULT 100,
	"listeners" integer,
	"play_count" integer DEFAULT 0,
	"tags" jsonb,
	"is_trucking_related" boolean DEFAULT false,
	"is_driving_friendly" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"last_verified" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"coordinates" jsonb NOT NULL,
	"address" text,
	"amenities" jsonb,
	"rating" real,
	"review_count" integer DEFAULT 0,
	"truck_parking" boolean DEFAULT false,
	"fuel" boolean DEFAULT false,
	"restaurant" boolean DEFAULT false,
	"restrooms" boolean DEFAULT false,
	"showers" boolean DEFAULT false,
	"country" text DEFAULT 'UK'
);
--> statement-breakpoint
CREATE TABLE "fleet_broadcast_reads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broadcast_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"read_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fleet_broadcasts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar NOT NULL,
	"sender_name" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"priority" text DEFAULT 'info' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"read_count" integer DEFAULT 0,
	"target_audience" text DEFAULT 'all',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fleet_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar,
	"operator_id" varchar,
	"notification_type" text NOT NULL,
	"message" text NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"days_until_expiry" integer NOT NULL,
	"severity" text DEFAULT 'medium',
	"status" text DEFAULT 'active' NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fleet_vehicles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration" varchar NOT NULL,
	"trailer_number" varchar,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"vin" varchar,
	"vehicle_type" text NOT NULL,
	"fuel_type" text NOT NULL,
	"tank_capacity" real,
	"vehicle_profile_id" varchar,
	"status" text DEFAULT 'active' NOT NULL,
	"purchase_date" timestamp,
	"purchase_price" numeric(10, 2),
	"current_mileage" real DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fleet_vehicles_registration_unique" UNIQUE("registration")
);
--> statement-breakpoint
CREATE TABLE "fuel_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"operator_id" varchar,
	"fill_date" timestamp NOT NULL,
	"odometer" real NOT NULL,
	"liters" real NOT NULL,
	"cost_per_liter" numeric(10, 4),
	"total_cost" numeric(10, 2),
	"fuel_type" text NOT NULL,
	"location" text,
	"full_tank" boolean DEFAULT false,
	"mpg" real,
	"receipt_number" varchar,
	"payment_method" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "geofence_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geofence_id" varchar NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"latitude" real,
	"longitude" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "geofences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"radius_meters" real NOT NULL,
	"type" text NOT NULL,
	"alert_on_entry" boolean DEFAULT true,
	"alert_on_exit" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"color" text DEFAULT '#3B82F6',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gps_tracking" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"speed" real,
	"heading" real,
	"accuracy" real,
	"altitude" real,
	"engine_status" text,
	"fuel_level" real,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historical_traffic_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"road_segment_id" text NOT NULL,
	"road_name" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"day_of_week" integer NOT NULL,
	"hour_of_day" integer NOT NULL,
	"average_speed" double precision NOT NULL,
	"free_flow_speed" double precision NOT NULL,
	"congestion_level" double precision NOT NULL,
	"sample_count" integer DEFAULT 1 NOT NULL,
	"average_delay_minutes" double precision DEFAULT 0,
	"last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hours_of_service" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" varchar NOT NULL,
	"vehicle_id" varchar,
	"daily_driving_hours" real DEFAULT 0,
	"daily_working_hours" real DEFAULT 0,
	"daily_rest_hours" real DEFAULT 0,
	"weekly_driving_hours" real DEFAULT 0,
	"biweekly_driving_hours" real DEFAULT 0,
	"continuous_driving_time" real DEFAULT 0,
	"breaks_taken" integer DEFAULT 0,
	"total_break_time" integer DEFAULT 0,
	"daily_driving_violation" boolean DEFAULT false,
	"daily_rest_violation" boolean DEFAULT false,
	"weekly_driving_violation" boolean DEFAULT false,
	"break_violation" boolean DEFAULT false,
	"current_status" text DEFAULT 'off_duty',
	"last_status_change" timestamp,
	"log_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "incident_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"operator_id" varchar,
	"incident_type" text NOT NULL,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"coordinates" jsonb,
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"reported_by" varchar,
	"insurance_claim_number" varchar,
	"estimated_cost" numeric(10, 2),
	"root_cause" text,
	"preventative_measures" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp,
	"attachment_ids" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" varchar NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"idempotency_key" varchar,
	"session_id" varchar
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"coordinates" jsonb NOT NULL,
	"is_favorite" boolean DEFAULT false,
	"use_count" integer DEFAULT 0,
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "maintenance_prediction" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"predicted_service_type" text NOT NULL,
	"predicted_date" timestamp NOT NULL,
	"predicted_mileage" real,
	"confidence" real,
	"risk_level" text NOT NULL,
	"reason" text,
	"estimated_cost" numeric(10, 2),
	"action_taken" text,
	"service_record_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" varchar,
	"phone" varchar,
	"license_number" varchar NOT NULL,
	"license_type" text NOT NULL,
	"license_expiry" timestamp NOT NULL,
	"driver_cqc_expiry" timestamp,
	"tachograph_card_number" varchar,
	"tachograph_card_expiry" timestamp,
	"employee_id" varchar,
	"status" text DEFAULT 'active' NOT NULL,
	"hire_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "operators_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE "rerouting_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_route_id" varchar NOT NULL,
	"alternative_route_id" varchar,
	"journey_id" integer,
	"trigger_reason" text NOT NULL,
	"time_savings_offered" integer,
	"user_response" text,
	"response_time" integer,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"effectiveness" jsonb,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "restrictions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location" text NOT NULL,
	"type" text NOT NULL,
	"limit" real NOT NULL,
	"description" text,
	"coordinates" jsonb,
	"road_name" text,
	"country" text DEFAULT 'UK',
	"severity" text DEFAULT 'medium',
	"restricted_vehicle_types" jsonb,
	"time_restrictions" jsonb,
	"enforcement_type" text DEFAULT 'advisory',
	"alternative_routes" jsonb,
	"violation_penalty" text,
	"is_active" boolean DEFAULT true,
	"active_since" timestamp DEFAULT now(),
	"active_until" timestamp,
	"route_segment" jsonb,
	"bypass_allowed" boolean DEFAULT false,
	"exemptions" jsonb
);
--> statement-breakpoint
CREATE TABLE "route_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shared_route_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"comment" text NOT NULL,
	"rating" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "route_monitoring" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" varchar NOT NULL,
	"journey_id" integer,
	"is_active" boolean DEFAULT true,
	"vehicle_profile_id" varchar,
	"monitoring_started" timestamp DEFAULT now(),
	"monitoring_ended" timestamp,
	"check_interval" integer DEFAULT 300,
	"last_traffic_check" timestamp,
	"current_traffic_conditions" jsonb,
	"alert_threshold" integer DEFAULT 5,
	"user_preferences" jsonb
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"start_location" text NOT NULL,
	"end_location" text NOT NULL,
	"start_coordinates" jsonb NOT NULL,
	"end_coordinates" jsonb NOT NULL,
	"distance" real,
	"duration" integer,
	"vehicle_profile_id" varchar,
	"route_path" jsonb,
	"geometry" jsonb,
	"restrictions_avoided" jsonb,
	"facilities_nearby" jsonb,
	"lane_guidance" jsonb,
	"is_favorite" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "saved_routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"shared_route_id" varchar NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"service_type" text NOT NULL,
	"service_date" timestamp NOT NULL,
	"next_service_due" timestamp,
	"mileage_at_service" real,
	"service_cost" numeric(10, 2),
	"service_provider" text,
	"description" text,
	"parts_replaced" jsonb,
	"invoice_number" varchar,
	"next_service_miles" real,
	"status" text DEFAULT 'completed',
	"performed_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"route_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"share_with_connections" boolean DEFAULT true,
	"tags" jsonb,
	"shared_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_checkins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"operator_id" varchar NOT NULL,
	"check_in_time" timestamp DEFAULT now() NOT NULL,
	"check_in_odometer" real NOT NULL,
	"check_in_fuel_level" real,
	"pre_trip_inspection" boolean DEFAULT false,
	"tires_ok" boolean DEFAULT true,
	"lights_ok" boolean DEFAULT true,
	"brakes_ok" boolean DEFAULT true,
	"fluids_ok" boolean DEFAULT true,
	"mirrors_ok" boolean DEFAULT true,
	"horn_ok" boolean DEFAULT true,
	"wiper_ok" boolean DEFAULT true,
	"safety_equipment_ok" boolean DEFAULT true,
	"vehicle_clean" boolean DEFAULT true,
	"defects_noted" text,
	"check_out_time" timestamp,
	"check_out_odometer" real,
	"check_out_fuel_level" real,
	"miles_driven" real,
	"fuel_used" real,
	"post_trip_notes" text,
	"issues_reported" text,
	"status" text DEFAULT 'checked_in',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_handovers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"outgoing_operator_id" varchar NOT NULL,
	"outgoing_checkin_id" varchar,
	"incoming_operator_id" varchar,
	"incoming_checkin_id" varchar,
	"handover_time" timestamp DEFAULT now() NOT NULL,
	"vehicle_condition" text DEFAULT 'good' NOT NULL,
	"fuel_level" real,
	"current_odometer" real,
	"handover_notes" text,
	"urgent_issues" text,
	"recommended_actions" text,
	"acknowledged" boolean DEFAULT false,
	"acknowledged_at" timestamp,
	"acknowledged_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subscription_id" varchar NOT NULL,
	"notification_type" text NOT NULL,
	"email_sent" boolean DEFAULT false,
	"email_sent_at" timestamp,
	"email_recipient" text,
	"status" text DEFAULT 'pending',
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"apple_product_id" text,
	"price_gbp" numeric(10, 2) NOT NULL,
	"duration_months" integer,
	"is_lifetime" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT false,
	"category" text DEFAULT 'navigation',
	"features" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_plans_stripe_price_id_unique" UNIQUE("stripe_price_id")
);
--> statement-breakpoint
CREATE TABLE "tachograph_infringements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" varchar NOT NULL,
	"vehicle_id" varchar,
	"infringement_date" timestamp NOT NULL,
	"infringement_type" text NOT NULL,
	"severity" text NOT NULL,
	"description" text,
	"location" text,
	"driving_time_exceeded" integer,
	"rest_time_shortfall" integer,
	"fine_amount" numeric(10, 2),
	"fine_paid" boolean DEFAULT false,
	"points_deducted" integer DEFAULT 0 NOT NULL,
	"evidence_notes" text,
	"reported_by" text,
	"enforcement_agency" text,
	"is_disputed" boolean DEFAULT false,
	"dispute_notes" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "traffic_incidents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"coordinates" jsonb NOT NULL,
	"road_name" text,
	"direction" text,
	"reported_by" text DEFAULT 'user',
	"reporter_name" text,
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"reported_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"resolved_at" timestamp,
	"estimated_clear_time" timestamp,
	"affected_lanes" integer,
	"total_lanes" integer,
	"truck_warnings" jsonb,
	"traffic_delay" integer,
	"alternative_route" jsonb,
	"country" text DEFAULT 'UK'
);
--> statement-breakpoint
CREATE TABLE "traffic_observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"road_segment_id" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"observed_speed" double precision NOT NULL,
	"free_flow_speed" double precision,
	"congestion_level" double precision,
	"timestamp" timestamp DEFAULT now(),
	"source" text DEFAULT 'user',
	"journey_id" integer
);
--> statement-breakpoint
CREATE TABLE "traffic_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" varchar NOT NULL,
	"prediction_time" timestamp NOT NULL,
	"predicted_duration" integer NOT NULL,
	"baseline_duration" integer NOT NULL,
	"predicted_delay" integer NOT NULL,
	"congestion_score" double precision NOT NULL,
	"confidence" double precision NOT NULL,
	"segment_predictions" jsonb,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_tracking" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"operator_id" varchar,
	"start_location" text NOT NULL,
	"end_location" text NOT NULL,
	"start_coordinates" jsonb,
	"end_coordinates" jsonb,
	"planned_start_time" timestamp,
	"actual_start_time" timestamp DEFAULT now() NOT NULL,
	"planned_end_time" timestamp,
	"actual_end_time" timestamp,
	"planned_distance" real,
	"actual_distance" real,
	"planned_duration" integer,
	"actual_duration" integer,
	"fuel_used" real,
	"cost_estimate" numeric(10, 2),
	"actual_cost" numeric(10, 2),
	"revenue" numeric(10, 2),
	"profit_margin" real,
	"job_number" varchar,
	"customer_id" varchar,
	"route_efficiency" real,
	"fuel_efficiency" real,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role" text NOT NULL,
	"fleet_id" varchar,
	"permissions" jsonb,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" varchar,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at" timestamp,
	"canceled_at" timestamp,
	"category" text DEFAULT 'navigation',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_renewal_notification_sent" timestamp,
	"renewal_notification_28_day_sent" boolean DEFAULT false,
	"renewal_notification_7_day_sent" boolean DEFAULT false,
	"renewal_notification_1_day_sent" boolean DEFAULT false,
	"renewal_notifications_stopped" boolean DEFAULT false,
	CONSTRAINT "user_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"username" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_connect_account_id" text,
	"connect_onboarding_status" text DEFAULT 'not_started',
	"has_accepted_terms" boolean DEFAULT false NOT NULL,
	"terms_accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"bio" text,
	"company_name" text,
	"truck_type" text,
	"years_experience" integer,
	"preferred_regions" jsonb,
	"is_public_profile" boolean DEFAULT true,
	"allow_connection_requests" boolean DEFAULT true,
	"allow_messages" boolean DEFAULT true,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"operator_id" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"unassigned_at" timestamp,
	"is_active" boolean DEFAULT true,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "vehicle_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"file_name" varchar NOT NULL,
	"file_type" text NOT NULL,
	"object_path" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar,
	"uploaded_by" varchar,
	"description" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_health_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"period_type" text DEFAULT 'weekly' NOT NULL,
	"overall_score" real DEFAULT 100 NOT NULL,
	"mechanical_score" real DEFAULT 100,
	"safety_systems_score" real DEFAULT 100,
	"tires_score" real DEFAULT 100,
	"fluids_score" real DEFAULT 100,
	"body_score" real DEFAULT 100,
	"total_miles" real DEFAULT 0,
	"fuel_efficiency" real,
	"average_fuel_efficiency" real,
	"service_overdue" boolean DEFAULT false,
	"days_since_service" integer,
	"defects_reported" integer DEFAULT 0,
	"defects_resolved" integer DEFAULT 0,
	"vehicle_age_years" real,
	"total_odometer" real,
	"expected_lifespan_percent" real,
	"score_trend" text DEFAULT 'stable',
	"previous_score" real,
	"recommended_actions" text,
	"urgent_issues" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'class_1_lorry' NOT NULL,
	"height" real NOT NULL,
	"width" real NOT NULL,
	"length" real,
	"weight" real,
	"axles" integer DEFAULT 4,
	"is_hazmat" boolean DEFAULT false,
	"max_speed" integer DEFAULT 70,
	"can_use_residential_roads" boolean DEFAULT true,
	"can_use_motorways" boolean DEFAULT true,
	"requires_commercial_routes" boolean DEFAULT false,
	"restricted_hours" jsonb,
	"allowed_road_types" jsonb,
	"restricted_areas" jsonb,
	"region" text DEFAULT 'UK',
	"minimum_lane_width" real,
	"turning_radius" real,
	"bridge_formula" jsonb
);
--> statement-breakpoint
ALTER TABLE "customer_billing" ADD CONSTRAINT "customer_billing_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dash_cam_recordings" ADD CONSTRAINT "dash_cam_recordings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_connections" ADD CONSTRAINT "driver_connections_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_connections" ADD CONSTRAINT "driver_connections_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_messages" ADD CONSTRAINT "driver_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_messages" ADD CONSTRAINT "driver_messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_performance_scores" ADD CONSTRAINT "driver_performance_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_broadcast_reads" ADD CONSTRAINT "fleet_broadcast_reads_broadcast_id_fleet_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."fleet_broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_broadcast_reads" ADD CONSTRAINT "fleet_broadcast_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_broadcasts" ADD CONSTRAINT "fleet_broadcasts_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_comments" ADD CONSTRAINT "route_comments_shared_route_id_shared_routes_id_fk" FOREIGN KEY ("shared_route_id") REFERENCES "public"."shared_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_comments" ADD CONSTRAINT "route_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_routes" ADD CONSTRAINT "saved_routes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_routes" ADD CONSTRAINT "saved_routes_shared_route_id_shared_routes_id_fk" FOREIGN KEY ("shared_route_id") REFERENCES "public"."shared_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_routes" ADD CONSTRAINT "shared_routes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_routes" ADD CONSTRAINT "shared_routes_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_checkins" ADD CONSTRAINT "shift_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_health_scores" ADD CONSTRAINT "vehicle_health_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compliance_vehicle_idx" ON "compliance_records" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "compliance_operator_idx" ON "compliance_records" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "cost_vehicle_idx" ON "cost_analytics" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "cost_type_idx" ON "cost_analytics" USING btree ("cost_type");--> statement-breakpoint
CREATE INDEX "cost_date_idx" ON "cost_analytics" USING btree ("occurrence_date");--> statement-breakpoint
CREATE INDEX "customer_billing_user_idx" ON "customer_billing" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_billing_customer_idx" ON "customer_billing" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "dashcam_user_idx" ON "dash_cam_recordings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashcam_vehicle_idx" ON "dash_cam_recordings" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "dashcam_start_time_idx" ON "dash_cam_recordings" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "driver_behavior_operator_idx" ON "driver_behavior" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "driver_behavior_date_idx" ON "driver_behavior" USING btree ("behavior_date");--> statement-breakpoint
CREATE INDEX "unique_connection_pair" ON "driver_connections" USING btree ("requester_id","receiver_id");--> statement-breakpoint
CREATE INDEX "driver_messages_sender_id_idx" ON "driver_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "driver_messages_receiver_id_idx" ON "driver_messages" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "driver_messages_sent_at_idx" ON "driver_messages" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "driver_score_user_idx" ON "driver_performance_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "driver_score_operator_idx" ON "driver_performance_scores" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "driver_score_period_idx" ON "driver_performance_scores" USING btree ("period_start");--> statement-breakpoint
CREATE INDEX "read_broadcast_idx" ON "fleet_broadcast_reads" USING btree ("broadcast_id");--> statement-breakpoint
CREATE INDEX "read_user_idx" ON "fleet_broadcast_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "broadcast_sender_idx" ON "fleet_broadcasts" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "broadcast_priority_idx" ON "fleet_broadcasts" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "broadcast_created_idx" ON "fleet_broadcasts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "geofence_event_geofence_idx" ON "geofence_events" USING btree ("geofence_id");--> statement-breakpoint
CREATE INDEX "geofence_event_vehicle_idx" ON "geofence_events" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "geofence_user_idx" ON "geofences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gps_tracking_vehicle_idx" ON "gps_tracking" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "gps_tracking_timestamp_idx" ON "gps_tracking" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "hos_operator_idx" ON "hours_of_service" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "hos_date_idx" ON "hours_of_service" USING btree ("log_date");--> statement-breakpoint
CREATE INDEX "incident_vehicle_idx" ON "incident_logs" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "incident_operator_idx" ON "incident_logs" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "incident_reported_at_idx" ON "incident_logs" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX "pred_vehicle_idx" ON "maintenance_prediction" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "pred_date_idx" ON "maintenance_prediction" USING btree ("predicted_date");--> statement-breakpoint
CREATE INDEX "route_comments_shared_route_id_idx" ON "route_comments" USING btree ("shared_route_id");--> statement-breakpoint
CREATE INDEX "unique_user_saved_route" ON "saved_routes" USING btree ("user_id","shared_route_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "shared_routes_user_id_idx" ON "shared_routes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shared_routes_route_id_idx" ON "shared_routes" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "shift_checkin_user_idx" ON "shift_checkins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shift_checkin_vehicle_idx" ON "shift_checkins" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "shift_checkin_operator_idx" ON "shift_checkins" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "shift_checkin_date_idx" ON "shift_checkins" USING btree ("check_in_time");--> statement-breakpoint
CREATE INDEX "shift_handover_user_idx" ON "shift_handovers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shift_handover_vehicle_idx" ON "shift_handovers" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "shift_handover_outgoing_idx" ON "shift_handovers" USING btree ("outgoing_operator_id");--> statement-breakpoint
CREATE INDEX "shift_handover_date_idx" ON "shift_handovers" USING btree ("handover_time");--> statement-breakpoint
CREATE INDEX "tacho_operator_idx" ON "tachograph_infringements" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "tacho_date_idx" ON "tachograph_infringements" USING btree ("infringement_date");--> statement-breakpoint
CREATE INDEX "tacho_type_idx" ON "tachograph_infringements" USING btree ("infringement_type");--> statement-breakpoint
CREATE INDEX "trip_vehicle_idx" ON "trip_tracking" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "trip_operator_idx" ON "trip_tracking" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "trip_date_idx" ON "trip_tracking" USING btree ("actual_start_time");--> statement-breakpoint
CREATE INDEX "user_role_user_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_role_idx" ON "user_roles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "vehicle_score_user_idx" ON "vehicle_health_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vehicle_score_vehicle_idx" ON "vehicle_health_scores" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_score_period_idx" ON "vehicle_health_scores" USING btree ("period_start");