import { type VehicleProfile, type InsertVehicleProfile, type Restriction, type InsertRestriction, type Facility, type InsertFacility, type Route, type InsertRoute, type TrafficIncident, type InsertTrafficIncident, type User, type InsertUser, type UpsertUser, type SubscriptionPlan, type InsertSubscriptionPlan, type UserSubscription, type InsertUserSubscription, type Location, type InsertLocation, type Journey, type InsertJourney, type LaneSegment, type LaneOption, type RouteMonitoring, type InsertRouteMonitoring, type AlternativeRouteDB, type InsertAlternativeRouteDB, type ReRoutingEventDB, type InsertReRoutingEventDB, type TrafficCondition, type AlternativeRoute, type EntertainmentStation, type InsertEntertainmentStation, type EntertainmentPreset, type InsertEntertainmentPreset, type EntertainmentHistory, type InsertEntertainmentHistory, type EntertainmentPlaybackState, type InsertEntertainmentPlaybackState, type EntertainmentSettings, type FleetVehicle, type InsertFleetVehicle, type Operator, type InsertOperator, type ServiceRecord, type InsertServiceRecord, type FuelLog, type InsertFuelLog, type VehicleAssignment, type InsertVehicleAssignment, type DriverConnection, type InsertDriverConnection, type SharedRoute, type InsertSharedRoute, type RouteComment, type InsertRouteComment, type SavedRoute, type InsertSavedRoute, type VehicleAttachment, type InsertVehicleAttachment, type IncidentLog, type InsertIncidentLog, type CostAnalytics, type InsertCostAnalytics, type TripTracking, type InsertTripTracking, type UserRole, type InsertUserRole, type MaintenancePrediction, type InsertMaintenancePrediction, type ComplianceRecord, type InsertComplianceRecord, type GpsTracking, type InsertGpsTracking, type Geofence, type InsertGeofence, type GeofenceEvent, type InsertGeofenceEvent, type DriverBehavior, type InsertDriverBehavior, type HoursOfService, type InsertHoursOfService, type CustomerBilling, type InsertCustomerBilling, type FleetNotification, type HistoricalTrafficData, type TachographInfringement, type InsertTachographInfringement, type InsertHistoricalTrafficData, type TrafficObservation, type InsertTrafficObservation, type TrafficPrediction, type InsertTrafficPrediction, type FleetBroadcast, type InsertFleetBroadcast, type FleetBroadcastRead, type InsertFleetBroadcastRead, type DashCamRecording, type InsertDashCamRecording, type DriverBehaviorProfile, type InsertDriverBehaviorProfile, historicalTrafficData, trafficObservations, trafficPredictions, driverBehaviorProfiles, vehicleProfiles, restrictions, facilities, routes, trafficIncidents, users, subscriptionPlans, userSubscriptions, locations, journeys, fleetVehicles, operators, serviceRecords, fuelLogs, vehicleAssignments, driverConnections, sharedRoutes, routeComments, savedRoutes, vehicleAttachments, incidentLogs, costAnalytics, tripTracking, userRoles, maintenancePrediction, complianceRecords, gpsTracking, geofences, geofenceEvents, driverBehavior, hoursOfService, customerBilling, fleetNotifications, fleetBroadcasts, fleetBroadcastReads, dashCamRecordings, tachographInfringements } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte, gt, sql, desc, asc, or, ilike } from "drizzle-orm";

// Postcode search result type for storage layer
export interface PostcodeResult {
  postcode: string;
  formatted: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address?: string;
  city?: string;
  region?: string;
  confidence: number; // 0-1 confidence score
}

export interface IStorage {
  // Vehicle Profiles
  getVehicleProfile(id: string): Promise<VehicleProfile | undefined>;
  createVehicleProfile(profile: InsertVehicleProfile): Promise<VehicleProfile>;
  getAllVehicleProfiles(): Promise<VehicleProfile[]>;

  // Restrictions
  getRestriction(id: string): Promise<Restriction | undefined>;
  createRestriction(restriction: InsertRestriction): Promise<Restriction>;
  getRestrictionsByArea(bounds: { north: number; south: number; east: number; west: number }): Promise<Restriction[]>;

  // Facilities
  getFacility(id: string): Promise<Facility | undefined>;
  createFacility(facility: InsertFacility): Promise<Facility>;
  searchFacilities(params: { type?: string; coordinates?: { lat: number; lng: number }; radius?: number }): Promise<Facility[]>;

  // Routes
  getRoute(id: string): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  getFavoriteRoutes(): Promise<Route[]>;
  updateRoute(id: string, updates: Partial<Route>): Promise<Route | undefined>;

  // Traffic Incidents
  getTrafficIncident(id: string): Promise<TrafficIncident | undefined>;
  createTrafficIncident(incident: InsertTrafficIncident): Promise<TrafficIncident>;
  getTrafficIncidentsByArea(bounds: { north: number; south: number; east: number; west: number }): Promise<TrafficIncident[]>;
  getActiveTrafficIncidents(): Promise<TrafficIncident[]>;
  updateTrafficIncident(id: string, updates: Partial<TrafficIncident>): Promise<TrafficIncident | undefined>;
  resolveTrafficIncident(id: string): Promise<TrafficIncident | undefined>;
  verifyTrafficIncident(id: string): Promise<TrafficIncident | undefined>;
  
  // New Traffic Incident Methods for User-Reported Incidents
  createIncident(incident: InsertTrafficIncident): Promise<TrafficIncident>;
  getIncidentsNearLocation(lat: number, lng: number, radiusKm: number): Promise<TrafficIncident[]>;
  getAllActiveIncidents(): Promise<TrafficIncident[]>;
  deleteOldIncidents(): Promise<number>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Subscription Plans
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByStripeId(stripePriceId: string): Promise<SubscriptionPlan | undefined>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;

  // User Subscriptions
  getUserSubscription(id: string): Promise<UserSubscription | undefined>;
  getUserSubscriptionByUserId(userId: string): Promise<UserSubscription | undefined>;
  getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  cancelUserSubscription(id: string): Promise<UserSubscription | undefined>;

  // Lane Guidance
  getLaneGuidance(routeId: string): Promise<LaneSegment[] | null>;
  setLaneSelection(routeId: string, selections: Record<number, number>): Promise<void>;
  generateLaneGuidance(route: Route, vehicleProfile: VehicleProfile): Promise<LaneSegment[]>;

  // Location Management
  getLocations(options?: { favorites?: boolean }): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, updates: Partial<Location>): Promise<Location | undefined>;
  markLocationUsed(id: number): Promise<Location | undefined>;
  upsertByLabelOrCoords(location: InsertLocation): Promise<Location>;

  // Journey Management
  getJourney(id: number): Promise<Journey | undefined>;
  getJourneyByIdempotencyKey(key: string, sessionId: string): Promise<Journey | undefined>;
  startJourney(routeId: string, idempotencyKey?: string, sessionId?: string): Promise<Journey>;
  activateJourney(id: number, idempotencyKey?: string, sessionId?: string): Promise<Journey | undefined>;
  completeJourney(id: number): Promise<Journey | undefined>;
  getLastJourney(): Promise<Journey | undefined>;
  getJourneyHistory(limit?: number, offset?: number): Promise<Journey[]>;

  // Postcode/Geocoding
  searchPostcode(postcode: string, country?: string): Promise<PostcodeResult[]>;
  geocodePostcode(postcode: string, country?: string): Promise<PostcodeResult | null>;

  // Traffic Re-routing System
  
  // Route Monitoring
  createRouteMonitoring(monitoring: InsertRouteMonitoring): Promise<RouteMonitoring>;
  getRouteMonitoring(id: string): Promise<RouteMonitoring | undefined>;
  getActiveRouteMonitoring(): Promise<RouteMonitoring[]>;
  getRouteMonitoringByRoute(routeId: string): Promise<RouteMonitoring | undefined>;
  getRouteMonitoringByJourney(journeyId: number): Promise<RouteMonitoring | undefined>;
  updateRouteMonitoring(id: string, updates: Partial<RouteMonitoring>): Promise<RouteMonitoring | undefined>;
  stopRouteMonitoring(id: string): Promise<boolean>;

  // Alternative Routes  
  createAlternativeRoute(route: InsertAlternativeRouteDB): Promise<AlternativeRouteDB>;
  getAlternativeRoute(id: string): Promise<AlternativeRouteDB | undefined>;
  getAlternativeRoutesByOriginal(originalRouteId: string): Promise<AlternativeRouteDB[]>;
  getActiveAlternativeRoutes(originalRouteId: string): Promise<AlternativeRouteDB[]>;
  updateAlternativeRoute(id: string, updates: Partial<AlternativeRouteDB>): Promise<AlternativeRouteDB | undefined>;
  deactivateAlternativeRoute(id: string): Promise<boolean>;
  cleanupExpiredAlternatives(): Promise<number>; // returns count of cleaned up routes

  // Re-routing Events
  createReRoutingEvent(event: InsertReRoutingEventDB): Promise<ReRoutingEventDB>;
  getReRoutingEvent(id: string): Promise<ReRoutingEventDB | undefined>;
  getReRoutingEventsByJourney(journeyId: number): Promise<ReRoutingEventDB[]>;
  getReRoutingEventsByRoute(routeId: string): Promise<ReRoutingEventDB[]>;
  updateReRoutingEvent(id: string, updates: Partial<ReRoutingEventDB>): Promise<ReRoutingEventDB | undefined>;
  getReRoutingStats(routeId?: string, timeframe?: 'day' | 'week' | 'month'): Promise<{
    totalEvents: number;
    acceptedEvents: number;
    declinedEvents: number;
    averageTimeSavings: number;
    effectivenessScore: number;
  }>;

  // Traffic Conditions (cached/stored for analysis)
  storeTrafficConditions(routeId: string, conditions: TrafficCondition[]): Promise<void>;
  getTrafficConditions(routeId: string): Promise<TrafficCondition[]>;
  getTrafficHistory(routeId: string, hours: number): Promise<Array<{
    timestamp: Date;
    conditions: TrafficCondition[];
    averageDelay: number;
  }>>;
  cleanupTrafficHistory(hoursToKeep: number): Promise<number>;

  // Predictive Traffic Analysis
  recordTrafficObservation(observation: InsertTrafficObservation): Promise<TrafficObservation>;
  getTrafficObservations(roadSegmentId: string, limit?: number): Promise<TrafficObservation[]>;
  aggregateHistoricalData(roadSegmentId: string, dayOfWeek: number, hourOfDay: number): Promise<HistoricalTrafficData | undefined>;
  upsertHistoricalTrafficData(data: InsertHistoricalTrafficData): Promise<HistoricalTrafficData>;
  getHistoricalTrafficPatterns(roadSegmentId: string): Promise<HistoricalTrafficData[]>;
  getTrafficPrediction(routeId: string, predictionTime: Date): Promise<TrafficPrediction | undefined>;
  cacheTrafficPrediction(prediction: InsertTrafficPrediction): Promise<TrafficPrediction>;
  cleanupExpiredPredictions(): Promise<number>;
  getHistoricalDataForTimeSlot(dayOfWeek: number, hourOfDay: number, bounds?: { north: number; south: number; east: number; west: number }): Promise<HistoricalTrafficData[]>;

  // Driver Behavior Profiles
  getDriverBehaviorProfile(sessionId: string): Promise<DriverBehaviorProfile | undefined>;
  upsertDriverBehaviorProfile(profile: InsertDriverBehaviorProfile): Promise<DriverBehaviorProfile>;

  // Entertainment Stations
  getEntertainmentStation(id: string): Promise<EntertainmentStation | undefined>;
  createEntertainmentStation(station: InsertEntertainmentStation): Promise<EntertainmentStation>;
  getAllEntertainmentStations(params?: { platform?: string; type?: string; trucking?: boolean; limit?: number }): Promise<EntertainmentStation[]>;
  searchEntertainmentStations(query: string, params?: { platform?: string; type?: string; limit?: number }): Promise<EntertainmentStation[]>;
  updateEntertainmentStation(id: string, updates: Partial<EntertainmentStation>): Promise<EntertainmentStation | undefined>;
  deleteEntertainmentStation(id: string): Promise<boolean>;

  // Entertainment Presets
  getEntertainmentPreset(id: number): Promise<EntertainmentPreset | undefined>;
  createEntertainmentPreset(preset: InsertEntertainmentPreset): Promise<EntertainmentPreset>;
  getAllEntertainmentPresets(userId?: string): Promise<EntertainmentPreset[]>;
  updateEntertainmentPreset(id: number, updates: Partial<EntertainmentPreset>): Promise<EntertainmentPreset | undefined>;
  deleteEntertainmentPreset(id: number): Promise<boolean>;

  // Entertainment History
  getEntertainmentHistory(userId?: string, limit?: number): Promise<EntertainmentHistory[]>;
  createEntertainmentHistory(history: InsertEntertainmentHistory): Promise<EntertainmentHistory>;
  clearEntertainmentHistory(userId?: string): Promise<number>; // returns count of cleared items

  // Entertainment Playback State
  getEntertainmentPlaybackState(): Promise<EntertainmentPlaybackState | undefined>;
  updateEntertainmentPlaybackState(state: InsertEntertainmentPlaybackState): Promise<EntertainmentPlaybackState>;

  // Entertainment Settings
  getEntertainmentSettings(): Promise<EntertainmentSettings>;
  updateEntertainmentSettings(settings: Partial<EntertainmentSettings>): Promise<EntertainmentSettings>;

  // Fleet Management - Vehicles
  getFleetVehicle(id: string): Promise<FleetVehicle | undefined>;
  getAllFleetVehicles(): Promise<FleetVehicle[]>;
  getActiveFleetVehicles(): Promise<FleetVehicle[]>;
  createFleetVehicle(vehicle: InsertFleetVehicle): Promise<FleetVehicle>;
  updateFleetVehicle(id: string, updates: Partial<FleetVehicle>): Promise<FleetVehicle | undefined>;
  deleteFleetVehicle(id: string): Promise<boolean>;
  
  // Fleet Management - Operators
  getOperator(id: string): Promise<Operator | undefined>;
  getAllOperators(): Promise<Operator[]>;
  getActiveOperators(): Promise<Operator[]>;
  createOperator(operator: InsertOperator): Promise<Operator>;
  updateOperator(id: string, updates: Partial<Operator>): Promise<Operator | undefined>;
  deleteOperator(id: string): Promise<boolean>;
  
  // Fleet Management - Service Records
  getServiceRecord(id: string): Promise<ServiceRecord | undefined>;
  getServiceRecordsByVehicle(vehicleId: string): Promise<ServiceRecord[]>;
  getUpcomingServices(daysAhead?: number): Promise<ServiceRecord[]>;
  createServiceRecord(record: InsertServiceRecord): Promise<ServiceRecord>;
  updateServiceRecord(id: string, updates: Partial<ServiceRecord>): Promise<ServiceRecord | undefined>;
  deleteServiceRecord(id: string): Promise<boolean>;
  
  // Fleet Management - Fuel Logs
  getFuelLog(id: string): Promise<FuelLog | undefined>;
  getFuelLogsByVehicle(vehicleId: string, limit?: number): Promise<FuelLog[]>;
  createFuelLog(log: InsertFuelLog): Promise<FuelLog>;
  updateFuelLog(id: string, updates: Partial<FuelLog>): Promise<FuelLog | undefined>;
  deleteFuelLog(id: string): Promise<boolean>;
  getVehicleFuelEfficiency(vehicleId: string): Promise<{ averageMPG: number; totalFuelCost: number; totalLiters: number }>;
  
  // Fleet Management - Vehicle Assignments
  getActiveAssignment(vehicleId: string): Promise<VehicleAssignment | undefined>;
  getOperatorAssignment(operatorId: string): Promise<VehicleAssignment | undefined>;
  assignVehicle(assignment: InsertVehicleAssignment): Promise<VehicleAssignment>;
  unassignVehicle(vehicleId: string): Promise<boolean>;

  // Fleet Management - Notifications
  getFleetNotifications(status?: string): Promise<FleetNotification[]>;
  dismissFleetNotification(id: string): Promise<boolean>;
  resolveFleetNotification(id: string): Promise<boolean>;

  // Fleet Management - Vehicle Attachments
  createVehicleAttachment(attachment: any): Promise<any>;
  getVehicleAttachments(vehicleId: string): Promise<any[]>;
  getVehicleAttachment(attachmentId: string): Promise<any | undefined>;
  deleteVehicleAttachment(attachmentId: string): Promise<boolean>;

  // Fleet Management - Incidents
  createIncident(incident: InsertIncidentLog): Promise<IncidentLog>;
  getIncidentsByVehicle(vehicleId: string): Promise<IncidentLog[]>;
  getIncidentsByOperator(operatorId: string): Promise<IncidentLog[]>;
  getIncident(id: string): Promise<IncidentLog | undefined>;
  updateIncident(id: string, updates: Partial<IncidentLog>): Promise<IncidentLog | undefined>;
  deleteIncident(id: string): Promise<boolean>;

  // Fleet Management - Tachograph Compliance
  createTachographInfringement(infringement: InsertTachographInfringement): Promise<TachographInfringement>;
  getAllTachographInfringements(): Promise<TachographInfringement[]>;
  getTachographInfringementsByOperator(operatorId: string): Promise<TachographInfringement[]>;
  getTachographInfringement(id: string): Promise<TachographInfringement | undefined>;
  updateTachographInfringement(id: string, updates: Partial<TachographInfringement>): Promise<TachographInfringement | undefined>;
  deleteTachographInfringement(id: string): Promise<boolean>;
  getOperatorComplianceScore(operatorId: string): Promise<{ score: number; totalPoints: number; infringementCount: number }>;

  // Fleet Management - Cost Analytics
  createCostRecord(cost: InsertCostAnalytics): Promise<CostAnalytics>;
  getCostsByVehicle(vehicleId: string, startDate?: Date, endDate?: Date): Promise<CostAnalytics[]>;
  getVehicleTotalCosts(vehicleId: string): Promise<{ total: number; byType: Record<string, number> }>;
  deleteCostRecord(id: string): Promise<boolean>;

  // Fleet Management - Trip Tracking
  createTrip(trip: InsertTripTracking): Promise<TripTracking>;
  getTripsByVehicle(vehicleId: string): Promise<TripTracking[]>;
  getCompletedTrips(vehicleId: string): Promise<TripTracking[]>;
  getTrip(id: string): Promise<TripTracking | undefined>;
  updateTrip(id: string, updates: Partial<TripTracking>): Promise<TripTracking | undefined>;
  getFleetTripAnalytics(): Promise<{ totalTrips: number; totalDistance: number; avgProfitMargin: number; totalRevenue: number }>;

  // Fleet Management - User Roles (RBAC)
  getUserRole(userId: string): Promise<UserRole | undefined>;
  setUserRole(userId: string, role: InsertUserRole): Promise<UserRole>;
  hasPermission(userId: string, permission: string): Promise<boolean>;
  getAllUserRoles(): Promise<UserRole[]>;

  // Fleet Management - Maintenance Prediction
  createPrediction(prediction: InsertMaintenancePrediction): Promise<MaintenancePrediction>;
  getPredictionsByVehicle(vehicleId: string): Promise<MaintenancePrediction[]>;
  getHighRiskPredictions(): Promise<MaintenancePrediction[]>;

  // Fleet Management - Compliance
  createComplianceRecord(record: InsertComplianceRecord): Promise<ComplianceRecord>;
  getComplianceByVehicle(vehicleId: string): Promise<ComplianceRecord[]>;
  getComplianceByOperator(operatorId: string): Promise<ComplianceRecord[]>;
  getNonCompliantRecords(): Promise<ComplianceRecord[]>;

  // Social Network - Driver Profiles
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User | undefined>;
  getUserProfile(userId: string, currentUserId?: string): Promise<User | undefined>;
  searchDrivers(query: string, currentUserId?: string, limit?: number): Promise<User[]>;
  areUsersConnected(userId1: string, userId2: string): Promise<boolean>;
  
  // Social Network - Driver Connections
  sendConnectionRequest(requesterId: string, receiverId: string): Promise<any>; // Returns DriverConnection
  acceptConnection(connectionId: string): Promise<any | undefined>; // Returns DriverConnection
  rejectConnection(connectionId: string): Promise<any | undefined>; // Returns DriverConnection
  getConnections(userId: string): Promise<any[]>; // Returns DriverConnection[]
  getPendingRequests(userId: string): Promise<any[]>; // Returns DriverConnection[]
  
  // Social Network - Shared Routes
  shareRoute(userId: string, routeId: string, data: any): Promise<any>; // InsertSharedRoute -> SharedRoute
  getSharedRoutes(userId: string): Promise<any[]>; // Returns SharedRoute[]
  getPublicRoutes(limit?: number): Promise<any[]>; // Returns SharedRoute[]
  getConnectionRoutes(userId: string): Promise<any[]>; // Returns SharedRoute[] from connections
  saveSharedRoute(userId: string, sharedRouteId: string): Promise<any>; // Returns SavedRoute
  unsaveSharedRoute(userId: string, sharedRouteId: string): Promise<boolean>;
  getSavedRoutes(userId: string): Promise<any[]>; // Returns SavedRoute[]
  commentOnRoute(sharedRouteId: string, userId: string, comment: string, rating?: number): Promise<any>; // Returns RouteComment
  getRouteComments(sharedRouteId: string): Promise<any[]>; // Returns RouteComment[]

  // Enterprise Features - GPS Tracking
  createGpsTrackingPoint(point: InsertGpsTracking): Promise<GpsTracking>;
  getVehicleTrackingHistory(vehicleId: string, startTime?: Date, endTime?: Date, limit?: number): Promise<GpsTracking[]>;
  getLatestVehiclePosition(vehicleId: string): Promise<GpsTracking | undefined>;
  getFleetPositions(): Promise<GpsTracking[]>;

  // Enterprise Features - Geofences
  createGeofence(geofence: InsertGeofence): Promise<Geofence>;
  getGeofence(id: string): Promise<Geofence | undefined>;
  getUserGeofences(userId: string): Promise<Geofence[]>;
  updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence | undefined>;
  deleteGeofence(id: string): Promise<boolean>;
  createGeofenceEvent(event: InsertGeofenceEvent): Promise<GeofenceEvent>;
  getGeofenceEvents(geofenceId: string, startTime?: Date, endTime?: Date): Promise<GeofenceEvent[]>;
  getVehicleGeofenceEvents(vehicleId: string, limit?: number): Promise<GeofenceEvent[]>;

  // Enterprise Features - Driver Behavior
  createDriverBehaviorRecord(record: InsertDriverBehavior): Promise<DriverBehavior>;
  getDriverBehaviorRecords(operatorId: string, startDate?: Date, endDate?: Date): Promise<DriverBehavior[]>;
  getDriverSafetyScore(operatorId: string): Promise<{ safetyScore: number; efficiencyScore: number; overallScore: number }>;
  getFleetBehaviorAnalytics(): Promise<{ averageSafetyScore: number; totalSpeedingEvents: number; totalHarshBrakingEvents: number; topPerformers: { operatorId: string; score: number }[] }>;

  // Enterprise Features - Hours of Service
  createHoursOfServiceRecord(record: InsertHoursOfService): Promise<HoursOfService>;
  getOperatorHoursOfService(operatorId: string, startDate?: Date, endDate?: Date): Promise<HoursOfService[]>;
  getLatestHoursOfService(operatorId: string): Promise<HoursOfService | undefined>;
  getHoSViolations(): Promise<HoursOfService[]>;
  updateHoursOfService(id: string, updates: Partial<HoursOfService>): Promise<HoursOfService | undefined>;

  // Enterprise Features - Customer Billing
  createCustomer(customer: InsertCustomerBilling): Promise<CustomerBilling>;
  getCustomer(id: string): Promise<CustomerBilling | undefined>;
  getUserCustomers(userId: string): Promise<CustomerBilling[]>;
  updateCustomer(id: string, updates: Partial<CustomerBilling>): Promise<CustomerBilling | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  getCustomerAnalytics(userId: string): Promise<{ totalCustomers: number; totalRevenue: number; totalOutstanding: number; averageProfitMargin: number }>;

  // Fleet Broadcast Messaging
  createFleetBroadcast(broadcast: InsertFleetBroadcast): Promise<FleetBroadcast>;
  getFleetBroadcast(id: string): Promise<FleetBroadcast | undefined>;
  getActiveFleetBroadcasts(): Promise<FleetBroadcast[]>;
  getUserFleetBroadcasts(userId: string): Promise<FleetBroadcast[]>;
  updateFleetBroadcast(id: string, updates: Partial<FleetBroadcast>): Promise<FleetBroadcast | undefined>;
  deleteFleetBroadcast(id: string): Promise<boolean>;
  markBroadcastRead(broadcastId: string, userId: string): Promise<FleetBroadcastRead>;
  getBroadcastReadStatus(broadcastId: string, userId: string): Promise<FleetBroadcastRead | undefined>;
  getUserUnreadBroadcasts(userId: string): Promise<FleetBroadcast[]>;
  getBroadcastReadReceipts(broadcastId: string): Promise<FleetBroadcastRead[]>;

  // Dash Cam Recordings
  createDashCamRecording(recording: InsertDashCamRecording): Promise<DashCamRecording>;
  getDashCamRecording(id: string): Promise<DashCamRecording | undefined>;
  getDashCamRecordings(userId: string): Promise<DashCamRecording[]>;
  deleteDashCamRecording(id: string): Promise<boolean>;

}

export class MemStorage implements IStorage {
  private vehicleProfiles: Map<string, VehicleProfile>;
  private defaultVehicleProfileId: string;
  private restrictions: Map<string, Restriction>;
  private facilities: Map<string, Facility>;
  private routes: Map<string, Route>;
  private trafficIncidents: Map<string, TrafficIncident>;
  private users: Map<string, User>;
  private subscriptionPlans: Map<string, SubscriptionPlan>;
  private userSubscriptions: Map<string, UserSubscription>;
  private locations: Map<number, Location>;
  private journeys: Map<number, Journey>;
  private journeyIdempotencyKeys: Map<string, Map<string, number>>; // Maps sessionId -> idempotency key -> journey ID
  private locationIdCounter: number;
  private journeyIdCounter: number;
  private postcodeDatabase: Map<string, PostcodeResult>;
  
  // Traffic re-routing system storage
  private routeMonitoring: Map<string, RouteMonitoring>;
  private alternativeRoutes: Map<string, AlternativeRouteDB>;
  private reRoutingEvents: Map<string, ReRoutingEventDB>;
  private trafficHistory: Map<string, Array<{
    timestamp: Date;
    conditions: TrafficCondition[];
    averageDelay: number;
  }>>;

  // Entertainment system storage
  private entertainmentStations: Map<string, EntertainmentStation>;
  private entertainmentPresets: Map<number, EntertainmentPreset>;
  private entertainmentHistory: Map<number, EntertainmentHistory>;
  private entertainmentPlaybackState: EntertainmentPlaybackState | null;
  private entertainmentSettings: EntertainmentSettings;
  private presetIdCounter: number;
  private historyIdCounter: number;

  constructor() {
    this.vehicleProfiles = new Map();
    this.defaultVehicleProfileId = "550e8400-e29b-41d4-a716-446655440000"; // Class 1 as default - proper UUID
    this.restrictions = new Map();
    this.facilities = new Map();
    this.routes = new Map();
    this.trafficIncidents = new Map();
    this.users = new Map();
    this.subscriptionPlans = new Map();
    this.userSubscriptions = new Map();
    this.locations = new Map();
    this.journeys = new Map();
    this.journeyIdempotencyKeys = new Map();
    this.locationIdCounter = 1;
    this.journeyIdCounter = 1;
    this.postcodeDatabase = new Map();
    
    // Initialize traffic re-routing system storage
    this.routeMonitoring = new Map();
    this.alternativeRoutes = new Map();
    this.reRoutingEvents = new Map();
    this.trafficHistory = new Map();

    // Initialize entertainment system storage
    this.entertainmentStations = new Map();
    this.entertainmentPresets = new Map();
    this.entertainmentHistory = new Map();
    this.entertainmentPlaybackState = null;
    this.entertainmentSettings = {
      defaultVolume: 0.8,
      autoPlay: false,
      crossfadeEnabled: false,
      crossfadeDuration: 3,
      backgroundPlayEnabled: true,
      voiceControlEnabled: true,
      showTruckingStationsFirst: true,
      preferredGenres: ['news', 'talk', 'music'],
      maxHistoryItems: 50,
      audioQuality: 'medium',
      emergencyInterruptEnabled: true,
    };
    this.presetIdCounter = 1;
    this.historyIdCounter = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Vehicle profiles with correct specifications - using stable IDs
    const class1Profile: VehicleProfile = {
      id: "550e8400-e29b-41d4-a716-446655440000", // Stable UUID for backward compatibility
      name: "Class 1",
      type: "class_1_lorry",
      height: 14.0, // 14 feet 0 inches
      width: 9.25, // 9 feet 3 inches
      length: 53,
      weight: 44, // 44 tonnes
      axles: 5,
      isHazmat: false,
      maxSpeed: 70,
      canUseResidentialRoads: false,
      canUseMotorways: true,
      requiresCommercialRoutes: true,
      restrictedHours: { start: "22:00", end: "06:00" },
      allowedRoadTypes: ["motorway", "A-road", "industrial", "commercial"],
      restrictedAreas: ["residential_zone", "city_centre", "school_zone"],
      region: "UK",
      minimumLaneWidth: null,
      turningRadius: null,
      bridgeFormula: null,
    };
    
    const class2Profile: VehicleProfile = {
      id: "vehicle-class-2",
      name: "Class 2",
      type: "class_2_lorry",
      height: 14.0, // 14 feet 0 inches
      width: 9.25, // 9 feet 3 inches
      length: 53,
      weight: 30, // 30 tonnes
      axles: 2,
      isHazmat: false,
      maxSpeed: 60,
      canUseResidentialRoads: false,
      canUseMotorways: true,
      requiresCommercialRoutes: true,
      restrictedHours: { start: "22:00", end: "06:00" },
      allowedRoadTypes: ["motorway", "A-road", "industrial"],
      restrictedAreas: ["residential_zone", "city_centre", "school_zone", "narrow_roads"],
      region: "UK",
      minimumLaneWidth: null,
      turningRadius: null,
      bridgeFormula: null,
    };
    
    const sevenFiveTonneProfile: VehicleProfile = {
      id: "vehicle-7-5-tonne",
      name: "7.5 Tonne",
      type: "7_5_tonne",
      height: 12.0, // 12 feet
      width: 8.25, // 8 feet 3 inches
      length: 26,
      weight: 7.5, // 7.5 tonnes
      axles: 2,
      isHazmat: false,
      maxSpeed: 70,
      canUseResidentialRoads: true,
      canUseMotorways: true,
      requiresCommercialRoutes: false,
      restrictedHours: null,
      allowedRoadTypes: ["motorway", "A-road", "B-road", "residential", "industrial"],
      restrictedAreas: ["narrow_lanes"],
      region: "UK",
      minimumLaneWidth: null,
      turningRadius: null,
      bridgeFormula: null,
    };
    
    const carProfile: VehicleProfile = {
      id: "vehicle-standard-car",
      name: "Standard Car",
      type: "car",
      height: 6.0, // Standard car height
      width: 5.91, // 1.8 meters converted to feet
      length: 15,
      weight: 2, // 2 tonnes
      axles: 2,
      isHazmat: false,
      maxSpeed: 70,
      canUseResidentialRoads: true,
      canUseMotorways: true,
      requiresCommercialRoutes: false,
      restrictedHours: null,
      allowedRoadTypes: ["motorway", "A-road", "B-road", "residential", "urban"],
      restrictedAreas: [],
      region: "UK",
      minimumLaneWidth: null,
      turningRadius: null,
      bridgeFormula: null,
    };

    // Add profiles to storage - Class 1 (default-profile) is the default
    this.vehicleProfiles.set(class1Profile.id, class1Profile);
    this.vehicleProfiles.set(class2Profile.id, class2Profile);
    this.vehicleProfiles.set(sevenFiveTonneProfile.id, sevenFiveTonneProfile);
    this.vehicleProfiles.set(carProfile.id, carProfile);
    
    // Set default vehicle profile ID for the system
    this.defaultVehicleProfileId = "default-profile";

    // Sample restrictions
    const sampleRestrictions: Restriction[] = [
      {
        id: "rest-1",
        location: "A34 Newbury",
        type: "height",
        limit: 14.5,
        description: "Low Bridge - A34",
        coordinates: { lat: 51.4014, lng: -1.3213 },
        roadName: "A34",
        country: "UK",
        severity: "high",
        restrictedVehicleTypes: ["class_1_lorry", "class_2_lorry"],
        timeRestrictions: null,
        enforcementType: "physical",
        alternativeRoutes: [],
        violationPenalty: "Vehicle damage risk",
        isActive: true,
        activeSince: new Date(),
        activeUntil: null,
        routeSegment: null,
        bypassAllowed: false,
        exemptions: [],
      },
      {
        id: "rest-2",
        location: "B4040 Oxford",
        type: "width",
        limit: 8.0,
        description: "Width Restriction - B4040",
        coordinates: { lat: 51.7520, lng: -1.2577 },
        roadName: "B4040",
        country: "UK",
        severity: "medium",
        restrictedVehicleTypes: ["class_2_lorry"],
        timeRestrictions: null,
        enforcementType: "advisory",
        alternativeRoutes: [],
        violationPenalty: null,
        isActive: true,
        activeSince: new Date(),
        activeUntil: null,
        routeSegment: null,
        bypassAllowed: true,
        exemptions: [],
      },
    ];

    sampleRestrictions.forEach(restriction => {
      this.restrictions.set(restriction.id, restriction);
    });

    // Sample facilities
    const sampleFacilities: Facility[] = [
      {
        id: "facility-1",
        name: "Watford Gap Services",
        type: "truck_stop",
        coordinates: { lat: 52.1326, lng: -1.1147 },
        address: "Watford Gap, Northamptonshire",
        amenities: ["fuel", "parking", "restaurant", "restrooms", "showers"],
        rating: 4.8,
        reviewCount: 156,
        truckParking: true,
        fuel: true,
        restaurant: true,
        restrooms: true,
        showers: true,
        country: "UK",
      },
      {
        id: "facility-2",
        name: "Premier Inn Birmingham",
        type: "hotel",
        coordinates: { lat: 52.4862, lng: -1.8904 },
        address: "Birmingham City Centre",
        amenities: ["parking", "restaurant"],
        rating: 4.3,
        reviewCount: 89,
        truckParking: true,
        fuel: false,
        restaurant: true,
        restrooms: true,
        showers: false,
        country: "UK",
      },
    ];

    sampleFacilities.forEach(facility => {
      this.facilities.set(facility.id, facility);
    });
    
    // Add test facility near St Albans for POI distance filtering verification
    const stAlbansFacility: Facility = {
      id: "facility-st-albans-test",
      name: "St Albans Fuel Station",
      type: "fuel",
      coordinates: { lat: 51.760, lng: -0.340 }, // About 0.5km from St Albans center
      address: "St Albans, Hertfordshire",
      amenities: ["fuel", "parking", "restrooms"],
      rating: 4.5,
      reviewCount: 42,
      truckParking: true,
      fuel: true,
      restaurant: false,
      restrooms: true,
      showers: false,
      country: "UK",
    };
    this.facilities.set(stAlbansFacility.id, stAlbansFacility);

    // Sample traffic incidents
    const sampleIncidents: TrafficIncident[] = [
      {
        id: "incident-1",
        type: "accident",
        severity: "high",
        title: "Multi-Vehicle Accident",
        description: "3-vehicle collision blocking 2 lanes on M25 clockwise",
        coordinates: { lat: 51.5074, lng: -0.1278 },
        roadName: "M25",
        direction: "clockwise",
        reportedBy: "traffic_authority",
        reporterName: "Highways England",
        isVerified: true,
        isActive: true,
        reportedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        resolvedAt: null,
        estimatedClearTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        affectedLanes: 2,
        totalLanes: 4,
        truckWarnings: ["Avoid if carrying hazmat", "Long delays expected"],
        trafficDelay: 45,
        alternativeRoute: null,
        country: "UK",
      },
      {
        id: "incident-2",
        type: "construction",
        severity: "medium",
        title: "Road Works",
        description: "Lane closure for bridge maintenance work",
        coordinates: { lat: 52.4862, lng: -1.8904 },
        roadName: "M6",
        direction: "northbound",
        reportedBy: "system",
        reporterName: null,
        isVerified: true,
        isActive: true,
        reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        resolvedAt: null,
        estimatedClearTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
        affectedLanes: 1,
        totalLanes: 3,
        truckWarnings: ["Width restriction 2.5m", "Speed limit 40mph"],
        trafficDelay: 15,
        alternativeRoute: null,
        country: "UK",
      },
      {
        id: "incident-3",
        type: "police",
        severity: "low",
        title: "Police Activity",
        description: "Police vehicle on hard shoulder - no lanes affected",
        coordinates: { lat: 53.4808, lng: -2.2426 },
        roadName: "M62",
        direction: "eastbound",
        reportedBy: "user",
        reporterName: "John D.",
        isVerified: false,
        isActive: true,
        reportedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        resolvedAt: null,
        estimatedClearTime: null,
        affectedLanes: 0,
        totalLanes: 3,
        truckWarnings: [],
        trafficDelay: 0,
        alternativeRoute: null,
        country: "UK",
      },
    ];

    sampleIncidents.forEach(incident => {
      this.trafficIncidents.set(incident.id, incident);
    });

    // Subscription Plans - your exact pricing tiers
    const subscriptionPlans: SubscriptionPlan[] = [
      {
        id: "plan-3month",
        name: "3 Months",
        stripePriceId: "price_3month_trucknav", // Will be replaced with actual Stripe price ID
        priceGBP: "25.99",
        durationMonths: 3,
        isLifetime: false,
        features: ["Real-time traffic data", "Voice navigation", "Route optimization", "Truck stops finder"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "plan-6month",
        name: "6 Months",
        stripePriceId: "price_6month_trucknav", // Will be replaced with actual Stripe price ID
        priceGBP: "49.99",
        durationMonths: 6,
        isLifetime: false,
        features: ["Real-time traffic data", "Voice navigation", "Route optimization", "Truck stops finder", "Priority support"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "plan-12month",
        name: "12 Months",
        stripePriceId: "price_12month_trucknav", // Will be replaced with actual Stripe price ID
        priceGBP: "99.00",
        durationMonths: 12,
        isLifetime: false,
        features: ["Real-time traffic data", "Voice navigation", "Route optimization", "Truck stops finder", "Priority support", "Advanced reporting"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "plan-lifetime",
        name: "Lifetime",
        stripePriceId: "price_lifetime_trucknav", // Will be replaced with actual Stripe price ID
        priceGBP: "200.00",
        durationMonths: null,
        isLifetime: true,
        features: ["Real-time traffic data", "Voice navigation", "Route optimization", "Truck stops finder", "Priority support", "Advanced reporting", "Future feature access"],
        isActive: true,
        createdAt: new Date(),
      },
    ];

    subscriptionPlans.forEach(plan => {
      this.subscriptionPlans.set(plan.id, plan);
    });

    // Sample routes for testing
    const sampleRoutes: Route[] = [
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Manchester to Birmingham",
        startLocation: "Manchester",
        endLocation: "Birmingham",
        startCoordinates: { lat: 53.4808, lng: -2.2426 },
        endCoordinates: { lat: 52.4862, lng: -1.8904 },
        distance: 186,
        duration: 222, // 3h 42m in minutes
        vehicleProfileId: "default-profile",
        routePath: [
          { lat: 53.4808, lng: -2.2426 },
          { lat: 52.9569, lng: -2.0642 },
          { lat: 52.4862, lng: -1.8904 }
        ],
        geometry: {
          type: "LineString",
          coordinates: [
            [-2.2426, 53.4808],
            [-2.0642, 52.9569],
            [-1.8904, 52.4862]
          ]
        },
        restrictionsAvoided: ["rest-1"],
        facilitiesNearby: ["facility-1"],
        laneGuidance: null,
        isFavorite: false,
      },
    ];

    sampleRoutes.forEach(route => {
      this.routes.set(route.id, route);
    });

    // Sample locations
    const sampleLocations: Location[] = [
      {
        id: this.locationIdCounter++,
        label: "Manchester Distribution Center",
        coordinates: { lat: 53.4808, lng: -2.2426 },
        isFavorite: true,
        useCount: 15,
        lastUsedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        id: this.locationIdCounter++,
        label: "Birmingham Warehouse",
        coordinates: { lat: 52.4862, lng: -1.8904 },
        isFavorite: true,
        useCount: 12,
        lastUsedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: this.locationIdCounter++,
        label: "London Depot",
        coordinates: { lat: 51.5074, lng: -0.1278 },
        isFavorite: false,
        useCount: 8,
        lastUsedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        id: this.locationIdCounter++,
        label: "Oxford Services",
        coordinates: { lat: 51.7520, lng: -1.2577 },
        isFavorite: false,
        useCount: 3,
        lastUsedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      },
      {
        id: this.locationIdCounter++,
        label: "Leeds Industrial Park",
        coordinates: { lat: 53.8008, lng: -1.5491 },
        isFavorite: true,
        useCount: 6,
        lastUsedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ];

    sampleLocations.forEach(location => {
      this.locations.set(location.id, location);
    });

    // Sample journeys
    const sampleJourneys: Journey[] = [
      {
        id: this.journeyIdCounter++,
        routeId: "550e8400-e29b-41d4-a716-446655440001", // Manchester to Birmingham route
        status: 'completed',
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // completed 3 hours later
        idempotencyKey: null,
        sessionId: null,
      },
      {
        id: this.journeyIdCounter++,
        routeId: "550e8400-e29b-41d4-a716-446655440001",
        status: 'completed',
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // completed 4 hours later
        idempotencyKey: null,
        sessionId: null,
      },
      {
        id: this.journeyIdCounter++,
        routeId: "550e8400-e29b-41d4-a716-446655440001",
        status: 'planned',
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        completedAt: null,
        idempotencyKey: null,
        sessionId: null,
      },
    ];

    sampleJourneys.forEach(journey => {
      this.journeys.set(journey.id, journey);
    });

    // Sample postcodes for testing - comprehensive coverage of supported countries
    const samplePostcodes: PostcodeResult[] = [
      // UK Postcodes
      {
        postcode: "SW1A1AA",
        formatted: "SW1A 1AA",
        country: "UK",
        coordinates: { lat: 51.5014, lng: -0.1419 },
        address: "Buckingham Palace, Westminster",
        city: "London",
        region: "England",
        confidence: 0.98,
      },
      {
        postcode: "M11AA",
        formatted: "M1 1AA",
        country: "UK",
        coordinates: { lat: 53.4808, lng: -2.2426 },
        address: "Manchester City Centre",
        city: "Manchester",
        region: "England",
        confidence: 0.95,
      },
      {
        postcode: "B338TH",
        formatted: "B33 8TH",
        country: "UK",
        coordinates: { lat: 52.4862, lng: -1.8904 },
        address: "Birmingham Area",
        city: "Birmingham",
        region: "England",
        confidence: 0.92,
      },
      {
        postcode: "G12QP",
        formatted: "G1 2QP",
        country: "UK",
        coordinates: { lat: 55.8642, lng: -4.2518 },
        address: "Glasgow City Centre",
        city: "Glasgow",
        region: "Scotland",
        confidence: 0.94,
      },
      // Milton Keynes/Bedfordshire Area - CRITICAL FIX for wrong geocoding
      {
        postcode: "MK17",
        formatted: "MK17",
        country: "UK",
        coordinates: { lat: 51.9948, lng: -0.5892 },
        address: "Flitwick, Bedfordshire",
        city: "Flitwick",
        region: "Bedfordshire",
        confidence: 0.95,
      },
      {
        postcode: "MK179",
        formatted: "MK17 9",
        country: "UK", 
        coordinates: { lat: 51.9948, lng: -0.5892 },
        address: "Flitwick, Bedfordshire",
        city: "Flitwick",
        region: "Bedfordshire",
        confidence: 0.95,
      },
      {
        postcode: "MK1",
        formatted: "MK1",
        country: "UK",
        coordinates: { lat: 52.0406, lng: -0.7594 },
        address: "Milton Keynes Central",
        city: "Milton Keynes",
        region: "Buckinghamshire",
        confidence: 0.96,
      },
      {
        postcode: "MK9",
        formatted: "MK9",
        country: "UK",
        coordinates: { lat: 52.0406, lng: -0.7594 },
        address: "Milton Keynes",
        city: "Milton Keynes", 
        region: "Buckinghamshire",
        confidence: 0.96,
      },
      // US ZIP Codes
      {
        postcode: "10001",
        formatted: "10001",
        country: "US",
        coordinates: { lat: 40.7505, lng: -73.9934 },
        address: "New York, NY",
        city: "New York",
        region: "New York",
        confidence: 0.97,
      },
      {
        postcode: "902101234",
        formatted: "90210-1234",
        country: "US",
        coordinates: { lat: 34.0901, lng: -118.4065 },
        address: "Beverly Hills, CA",
        city: "Beverly Hills",
        region: "California",
        confidence: 0.96,
      },
      {
        postcode: "60601",
        formatted: "60601",
        country: "US",
        coordinates: { lat: 41.8781, lng: -87.6298 },
        address: "Chicago, IL",
        city: "Chicago",
        region: "Illinois",
        confidence: 0.95,
      },
      // Canadian Postal Codes
      {
        postcode: "K1A0A6",
        formatted: "K1A 0A6",
        country: "CA",
        coordinates: { lat: 45.4215, lng: -75.6972 },
        address: "Ottawa, ON",
        city: "Ottawa",
        region: "Ontario",
        confidence: 0.94,
      },
      {
        postcode: "H0H0H0",
        formatted: "H0H 0H0",
        country: "CA",
        coordinates: { lat: 45.5017, lng: -73.5673 },
        address: "Montreal, QC",
        city: "Montreal",
        region: "Quebec",
        confidence: 0.93,
      },
      {
        postcode: "V6B5A7",
        formatted: "V6B 5A7",
        country: "CA",
        coordinates: { lat: 49.2827, lng: -123.1207 },
        address: "Vancouver, BC",
        city: "Vancouver",
        region: "British Columbia",
        confidence: 0.95,
      },
      // Australian Postcodes
      {
        postcode: "2000",
        formatted: "2000",
        country: "AU",
        coordinates: { lat: -33.8688, lng: 151.2093 },
        address: "Sydney CBD, NSW",
        city: "Sydney",
        region: "New South Wales",
        confidence: 0.96,
      },
      {
        postcode: "3000",
        formatted: "3000",
        country: "AU",
        coordinates: { lat: -37.8136, lng: 144.9631 },
        address: "Melbourne CBD, VIC",
        city: "Melbourne",
        region: "Victoria",
        confidence: 0.95,
      },
      {
        postcode: "4000",
        formatted: "4000",
        country: "AU",
        coordinates: { lat: -27.4698, lng: 153.0251 },
        address: "Brisbane CBD, QLD",
        city: "Brisbane",
        region: "Queensland",
        confidence: 0.94,
      },
      // German PLZ
      {
        postcode: "10115",
        formatted: "10115",
        country: "DE",
        coordinates: { lat: 52.5200, lng: 13.4050 },
        address: "Berlin Mitte",
        city: "Berlin",
        region: "Berlin",
        confidence: 0.97,
      },
      {
        postcode: "80331",
        formatted: "80331",
        country: "DE",
        coordinates: { lat: 48.1351, lng: 11.5820 },
        address: "München Altstadt",
        city: "München",
        region: "Bayern",
        confidence: 0.96,
      },
      {
        postcode: "20095",
        formatted: "20095",
        country: "DE",
        coordinates: { lat: 53.5511, lng: 9.9937 },
        address: "Hamburg Altstadt",
        city: "Hamburg",
        region: "Hamburg",
        confidence: 0.95,
      },
      // French Postal Codes
      {
        postcode: "75001",
        formatted: "75001",
        country: "FR",
        coordinates: { lat: 48.8606, lng: 2.3376 },
        address: "Paris 1er Arrondissement",
        city: "Paris",
        region: "Île-de-France",
        confidence: 0.98,
      },
      {
        postcode: "69001",
        formatted: "69001",
        country: "FR",
        coordinates: { lat: 45.7640, lng: 4.8357 },
        address: "Lyon 1er Arrondissement",
        city: "Lyon",
        region: "Auvergne-Rhône-Alpes",
        confidence: 0.96,
      },
      {
        postcode: "13001",
        formatted: "13001",
        country: "FR",
        coordinates: { lat: 43.2965, lng: 5.3698 },
        address: "Marseille 1er Arrondissement",
        city: "Marseille",
        region: "Provence-Alpes-Côte d'Azur",
        confidence: 0.95,
      },
    ];

    samplePostcodes.forEach(postcode => {
      // Use normalized postcode (without spaces) as key for consistent lookup
      const key = postcode.postcode.replace(/\s+/g, '').toUpperCase();
      this.postcodeDatabase.set(key, postcode);
    });
  }

  // Vehicle Profiles
  async getVehicleProfile(id: string): Promise<VehicleProfile | undefined> {
    return this.vehicleProfiles.get(id);
  }

  async createVehicleProfile(insertProfile: InsertVehicleProfile): Promise<VehicleProfile> {
    const id = randomUUID();
    const profile: VehicleProfile = { 
      ...insertProfile, 
      id,
      weight: insertProfile.weight ?? null,
      length: insertProfile.length ?? null,
      axles: insertProfile.axles ?? null,
      isHazmat: insertProfile.isHazmat ?? null,
      maxSpeed: insertProfile.maxSpeed ?? null,
      canUseResidentialRoads: insertProfile.canUseResidentialRoads ?? null,
      canUseMotorways: insertProfile.canUseMotorways ?? null,
      requiresCommercialRoutes: insertProfile.requiresCommercialRoutes ?? null,
      restrictedHours: insertProfile.restrictedHours ?? null,
      allowedRoadTypes: insertProfile.allowedRoadTypes ?? null,
      restrictedAreas: insertProfile.restrictedAreas ?? null,
      region: insertProfile.region ?? null,
      minimumLaneWidth: insertProfile.minimumLaneWidth ?? null,
      turningRadius: insertProfile.turningRadius ?? null,
      bridgeFormula: insertProfile.bridgeFormula ?? null
    };
    this.vehicleProfiles.set(id, profile);
    return profile;
  }

  async getAllVehicleProfiles(): Promise<VehicleProfile[]> {
    return Array.from(this.vehicleProfiles.values());
  }

  // Restrictions
  async getRestriction(id: string): Promise<Restriction | undefined> {
    return this.restrictions.get(id);
  }

  async createRestriction(insertRestriction: InsertRestriction): Promise<Restriction> {
    const id = randomUUID();
    const restriction: Restriction = { 
      ...insertRestriction, 
      id,
      description: insertRestriction.description ?? null,
      coordinates: insertRestriction.coordinates ?? null,
      roadName: insertRestriction.roadName ?? null,
      country: insertRestriction.country ?? null,
      severity: insertRestriction.severity ?? null,
      restrictedVehicleTypes: insertRestriction.restrictedVehicleTypes ? [...insertRestriction.restrictedVehicleTypes] : null,
      timeRestrictions: insertRestriction.timeRestrictions ?? null,
      enforcementType: insertRestriction.enforcementType ?? null,
      alternativeRoutes: insertRestriction.alternativeRoutes ? [...insertRestriction.alternativeRoutes] : null,
      violationPenalty: insertRestriction.violationPenalty ?? null,
      isActive: insertRestriction.isActive ?? null,
      activeSince: insertRestriction.activeSince ?? null,
      activeUntil: insertRestriction.activeUntil ?? null,
      routeSegment: insertRestriction.routeSegment ? [...insertRestriction.routeSegment] : null,
      bypassAllowed: insertRestriction.bypassAllowed ?? null,
      exemptions: insertRestriction.exemptions ? [...insertRestriction.exemptions] : null
    };
    this.restrictions.set(id, restriction);
    return restriction;
  }

  async getRestrictionsByArea(bounds: { north: number; south: number; east: number; west: number }): Promise<Restriction[]> {
    return Array.from(this.restrictions.values()).filter(restriction => {
      if (!restriction.coordinates) return false;
      const coords = restriction.coordinates as { lat: number; lng: number };
      return coords.lat <= bounds.north && coords.lat >= bounds.south &&
             coords.lng <= bounds.east && coords.lng >= bounds.west;
    });
  }

  // Facilities
  async getFacility(id: string): Promise<Facility | undefined> {
    return this.facilities.get(id);
  }

  async createFacility(insertFacility: InsertFacility): Promise<Facility> {
    const id = randomUUID();
    const facility: Facility = { 
      ...insertFacility, 
      id,
      address: insertFacility.address ?? null,
      amenities: insertFacility.amenities ? [...insertFacility.amenities] : null,
      rating: insertFacility.rating ?? null,
      reviewCount: insertFacility.reviewCount ?? null,
      truckParking: insertFacility.truckParking ?? null,
      fuel: insertFacility.fuel ?? null,
      restaurant: insertFacility.restaurant ?? null,
      restrooms: insertFacility.restrooms ?? null,
      showers: insertFacility.showers ?? null,
      country: insertFacility.country ?? null
    };
    this.facilities.set(id, facility);
    return facility;
  }

  async searchFacilities(params: { type?: string; coordinates?: { lat: number; lng: number }; radius?: number }): Promise<Facility[]> {
    let facilities = Array.from(this.facilities.values());
    
    if (params.type) {
      facilities = facilities.filter(f => f.type === params.type);
    }
    
    if (params.coordinates && params.radius) {
      // Keep radius in kilometers - this is the fix!
      const radiusKm = params.radius;
      
      // Debug logging for POI search
      console.log('[POI-SEARCH] Starting facility search:', {
        userLocation: params.coordinates,
        radiusKm: radiusKm,
        type: params.type || 'all',
        totalFacilities: facilities.length
      });
      
      // Map facilities with their distances
      const facilitiesWithDistance = facilities
        .map(f => {
          const coords = f.coordinates as { lat: number; lng: number };
          // calculateDistance returns miles (Earth radius = 3959 miles)
          const distanceInMiles = this.calculateDistance(params.coordinates!, coords);
          // Convert miles to kilometers
          const distanceInKm = distanceInMiles * 1.60934;
          
          // Debug log for each facility
          console.log(`[POI-SEARCH] Facility "${f.name}":`, {
            location: `(${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
            distanceKm: distanceInKm.toFixed(2),
            withinRadius: distanceInKm <= radiusKm
          });
          
          return {
            facility: f,
            distanceInMiles,
            distanceInKm
          };
        })
        // CRITICAL FIX: Filter by kilometers, not miles!
        .filter(item => {
          const passes = item.distanceInKm <= radiusKm;
          if (!passes) {
            console.log(`[POI-SEARCH] ❌ Filtered out "${item.facility.name}" - ${item.distanceInKm.toFixed(2)}km > ${radiusKm}km`);
          } else {
            console.log(`[POI-SEARCH] ✅ Including "${item.facility.name}" - ${item.distanceInKm.toFixed(2)}km <= ${radiusKm}km`);
          }
          return passes;
        })
        // Sort by distance in kilometers (closest first)
        .sort((a, b) => a.distanceInKm - b.distanceInKm);
      
      console.log(`[POI-SEARCH] Found ${facilitiesWithDistance.length} facilities within ${radiusKm}km radius`);
      
      // Return facilities with distance property added
      return facilitiesWithDistance.map(item => ({
        ...item.facility,
        // Add distance in both units for flexibility
        distance: item.distanceInKm, // Distance in kilometers for display
        distanceMiles: item.distanceInMiles // Distance in miles if needed
      }));
    }
    
    return facilities;
  }

  // Routes
  async getRoute(id: string): Promise<Route | undefined> {
    return this.routes.get(id);
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = randomUUID();
    
    // Generate geometry from routePath if provided
    const geometry = insertRoute.routePath ? {
      type: "LineString" as const,
      coordinates: insertRoute.routePath.map((coord: {lat: number; lng: number}) => [coord.lng, coord.lat] as [number, number])
    } : null;
    
    const route: Route = { 
      ...insertRoute, 
      id,
      name: insertRoute.name ?? null,
      distance: insertRoute.distance ?? null,
      duration: insertRoute.duration ?? null,
      vehicleProfileId: insertRoute.vehicleProfileId ?? null,
      routePath: insertRoute.routePath ? [...insertRoute.routePath] : null,
      geometry: geometry,
      restrictionsAvoided: insertRoute.restrictionsAvoided ? [...insertRoute.restrictionsAvoided] : null,
      facilitiesNearby: insertRoute.facilitiesNearby ? [...insertRoute.facilitiesNearby] : null,
      laneGuidance: insertRoute.laneGuidance ? [...insertRoute.laneGuidance] : null,
      isFavorite: insertRoute.isFavorite ?? null
    };
    this.routes.set(id, route);
    return route;
  }

  async getFavoriteRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(r => r.isFavorite);
  }

  async updateRoute(id: string, updates: Partial<Route>): Promise<Route | undefined> {
    const route = this.routes.get(id);
    if (!route) return undefined;
    
    const updatedRoute = { ...route, ...updates };
    this.routes.set(id, updatedRoute);
    return updatedRoute;
  }

  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);
    const lat1 = this.toRad(coord1.lat);
    const lat2 = this.toRad(coord2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Journey Management
  async getJourney(id: number): Promise<Journey | undefined> {
    return this.journeys.get(id);
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  // Traffic Incidents
  async getTrafficIncident(id: string): Promise<TrafficIncident | undefined> {
    return this.trafficIncidents.get(id);
  }

  async createTrafficIncident(insertIncident: InsertTrafficIncident): Promise<TrafficIncident> {
    const id = randomUUID();
    const reportedAt = new Date();
    const expiresAt = new Date(reportedAt.getTime() + 2 * 60 * 60 * 1000); // Expires 2 hours after reported
    const incident: TrafficIncident = {
      ...insertIncident,
      id,
      reportedAt,
      expiresAt,
      description: insertIncident.description ?? null,
      roadName: insertIncident.roadName ?? null,
      direction: insertIncident.direction ?? null,
      reportedBy: insertIncident.reportedBy ?? null,
      reporterName: insertIncident.reporterName ?? null,
      isVerified: insertIncident.isVerified ?? null,
      isActive: insertIncident.isActive ?? null,
      resolvedAt: insertIncident.resolvedAt ?? null,
      estimatedClearTime: insertIncident.estimatedClearTime ?? null,
      affectedLanes: insertIncident.affectedLanes ?? null,
      totalLanes: insertIncident.totalLanes ?? null,
      truckWarnings: insertIncident.truckWarnings ? [...insertIncident.truckWarnings] : null,
      trafficDelay: insertIncident.trafficDelay ?? null,
      alternativeRoute: insertIncident.alternativeRoute ? {
        routePath: [...insertIncident.alternativeRoute.routePath],
        distance: insertIncident.alternativeRoute.distance,
        duration: insertIncident.alternativeRoute.duration
      } : null,
      country: insertIncident.country ?? null,
    };
    this.trafficIncidents.set(id, incident);
    return incident;
  }

  async getTrafficIncidentsByArea(bounds: { north: number; south: number; east: number; west: number }): Promise<TrafficIncident[]> {
    const now = new Date();
    return Array.from(this.trafficIncidents.values()).filter(incident => {
      if (!incident.coordinates || !incident.isActive) return false;
      // Filter out expired incidents
      if (incident.expiresAt && new Date(incident.expiresAt) <= now) return false;
      const coords = incident.coordinates as { lat: number; lng: number };
      return coords.lat <= bounds.north && coords.lat >= bounds.south &&
             coords.lng <= bounds.east && coords.lng >= bounds.west;
    });
  }

  async getActiveTrafficIncidents(): Promise<TrafficIncident[]> {
    const now = new Date();
    return Array.from(this.trafficIncidents.values()).filter(incident => {
      if (!incident.isActive) return false;
      // Filter out expired incidents
      if (incident.expiresAt && new Date(incident.expiresAt) <= now) return false;
      return true;
    });
  }

  async updateTrafficIncident(id: string, updates: Partial<TrafficIncident>): Promise<TrafficIncident | undefined> {
    const incident = this.trafficIncidents.get(id);
    if (!incident) return undefined;

    const updatedIncident = { ...incident, ...updates };
    this.trafficIncidents.set(id, updatedIncident);
    return updatedIncident;
  }

  async resolveTrafficIncident(id: string): Promise<TrafficIncident | undefined> {
    const incident = this.trafficIncidents.get(id);
    if (!incident) return undefined;

    const resolvedIncident = {
      ...incident,
      isActive: false,
      resolvedAt: new Date(),
    };
    this.trafficIncidents.set(id, resolvedIncident);
    return resolvedIncident;
  }

  async verifyTrafficIncident(id: string): Promise<TrafficIncident | undefined> {
    const incident = this.trafficIncidents.get(id);
    if (!incident) return undefined;

    const verifiedIncident = {
      ...incident,
      isVerified: true,
    };
    this.trafficIncidents.set(id, verifiedIncident);
    return verifiedIncident;
  }

  // New Traffic Incident Methods for User-Reported Incidents
  async createIncident(insertIncident: InsertTrafficIncident): Promise<TrafficIncident> {
    return this.createTrafficIncident(insertIncident);
  }

  async getIncidentsNearLocation(lat: number, lng: number, radiusKm: number): Promise<TrafficIncident[]> {
    const now = new Date();
    return Array.from(this.trafficIncidents.values()).filter(incident => {
      if (!incident.coordinates || !incident.isActive) return false;
      // Filter out expired incidents
      if (incident.expiresAt && new Date(incident.expiresAt) <= now) return false;
      const coords = incident.coordinates as { lat: number; lng: number };
      const distance = this.calculateDistance({ lat, lng }, coords);
      const distanceKm = distance * 1.60934; // Convert miles to km
      return distanceKm <= radiusKm;
    });
  }

  async getAllActiveIncidents(): Promise<TrafficIncident[]> {
    const now = new Date();
    return Array.from(this.trafficIncidents.values()).filter(incident => {
      if (!incident.isActive) return false;
      // Filter out expired incidents (use expiresAt instead of 24-hour window)
      if (incident.expiresAt && new Date(incident.expiresAt) <= now) return false;
      return true;
    });
  }

  async deleteOldIncidents(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const [id, incident] of this.trafficIncidents.entries()) {
      if (incident.reportedAt && incident.reportedAt < twentyFourHoursAgo) {
        this.trafficIncidents.delete(id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      username: insertUser.username ?? null,
      stripeCustomerId: insertUser.stripeCustomerId ?? null,
      stripeSubscriptionId: insertUser.stripeSubscriptionId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id!);
    
    if (existingUser) {
      const updatedUser: User = {
        ...existingUser,
        ...userData,
        updatedAt: new Date(),
      };
      this.users.set(userData.id!, updatedUser);
      return updatedUser;
    } else {
      const newUser: User = {
        id: userData.id!,
        email: userData.email ?? null,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        username: userData.username ?? null,
        stripeCustomerId: userData.stripeCustomerId ?? null,
        stripeSubscriptionId: userData.stripeSubscriptionId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(newUser.id, newUser);
      return newUser;
    }
  }

  // Subscription Plans
  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.get(id);
  }

  async getSubscriptionPlanByStripeId(stripePriceId: string): Promise<SubscriptionPlan | undefined> {
    return Array.from(this.subscriptionPlans.values()).find(plan => plan.stripePriceId === stripePriceId);
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values()).filter(plan => plan.isActive);
  }

  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values()).filter(plan => plan.isActive);
  }

  async createSubscriptionPlan(insertPlan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const id = randomUUID();
    const plan: SubscriptionPlan = {
      ...insertPlan,
      id,
      durationMonths: insertPlan.durationMonths ?? null,
      isLifetime: insertPlan.isLifetime ?? null,
      features: insertPlan.features ?? null,
      isActive: insertPlan.isActive ?? null,
      createdAt: new Date(),
    };
    this.subscriptionPlans.set(id, plan);
    return plan;
  }

  // User Subscriptions
  async getUserSubscription(id: string): Promise<UserSubscription | undefined> {
    return this.userSubscriptions.get(id);
  }

  async getUserSubscriptionByUserId(userId: string): Promise<UserSubscription | undefined> {
    return Array.from(this.userSubscriptions.values()).find(sub => sub.userId === userId && sub.status === 'active');
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
    return Array.from(this.userSubscriptions.values()).find(sub => sub.stripeSubscriptionId === stripeSubscriptionId);
  }

  async createUserSubscription(insertSubscription: InsertUserSubscription): Promise<UserSubscription> {
    const id = randomUUID();
    const subscription: UserSubscription = {
      ...insertSubscription,
      id,
      currentPeriodStart: insertSubscription.currentPeriodStart ?? null,
      currentPeriodEnd: insertSubscription.currentPeriodEnd ?? null,
      cancelAt: insertSubscription.cancelAt ?? null,
      canceledAt: insertSubscription.canceledAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userSubscriptions.set(id, subscription);
    return subscription;
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const subscription = this.userSubscriptions.get(id);
    if (!subscription) return undefined;

    const updatedSubscription = { ...subscription, ...updates, updatedAt: new Date() };
    this.userSubscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async cancelUserSubscription(id: string): Promise<UserSubscription | undefined> {
    const subscription = this.userSubscriptions.get(id);
    if (!subscription) return undefined;

    const canceledSubscription = {
      ...subscription,
      status: 'canceled' as const,
      canceledAt: new Date(),
      updatedAt: new Date(),
    };
    this.userSubscriptions.set(id, canceledSubscription);
    return canceledSubscription;
  }

  // Lane Guidance
  private laneSelections: Map<string, Record<number, number>> = new Map();

  async getLaneGuidance(routeId: string): Promise<LaneSegment[] | null> {
    const route = this.routes.get(routeId);
    if (!route) return null;
    
    // Generate realistic lane guidance based on route geometry
    const laneSegments: LaneSegment[] = [];
    
    // Calculate distance in meters for proper threshold calculations
    const totalDistanceMeters = (route.distance || 10) * 1609.344; // Convert miles to meters
    
    // Generate lane guidance segments based on route maneuvers
    // For now, create segments at key points along the route
    const segmentDistances = [
      { distance: 500, maneuverType: 'turn-right' as const, roadName: 'Main Road', instruction: 'Turn right onto Main Road' },
      { distance: 1200, maneuverType: 'straight' as const, roadName: 'High Street', instruction: 'Continue straight on High Street' },
      { distance: 2500, maneuverType: 'turn-left' as const, roadName: 'Station Road', instruction: 'Turn left onto Station Road' },
      { distance: 4000, maneuverType: 'exit' as const, roadName: 'Industrial Estate', instruction: 'Take the exit towards Industrial Estate' },
    ];
    
    for (let i = 0; i < segmentDistances.length; i++) {
      const segment = segmentDistances[i];
      if (segment.distance > totalDistanceMeters) continue;
      
      const laneCount = segment.maneuverType === 'exit' ? 3 : (segment.maneuverType === 'straight' ? 2 : 3);
      const laneOptions: LaneOption[] = [];
      
      for (let laneIndex = 0; laneIndex < laneCount; laneIndex++) {
        const isLeftLane = laneIndex === 0;
        const isRightLane = laneIndex === laneCount - 1;
        const isMiddleLane = !isLeftLane && !isRightLane;
        
        let direction: LaneOption['direction'] = 'straight';
        let recommended = false;
        
        if (segment.maneuverType === 'turn-right') {
          if (isRightLane) { direction = 'right'; recommended = true; }
          else if (isMiddleLane) { direction = 'straight'; }
          else { direction = 'left'; }
        } else if (segment.maneuverType === 'turn-left') {
          if (isLeftLane) { direction = 'left'; recommended = true; }
          else if (isMiddleLane) { direction = 'straight'; }
          else { direction = 'right'; }
        } else if (segment.maneuverType === 'exit') {
          if (isRightLane) { direction = 'exit'; recommended = true; }
          else { direction = 'straight'; }
        } else {
          direction = 'straight';
          recommended = isMiddleLane || laneCount === 2;
        }
        
        laneOptions.push({
          index: laneIndex,
          direction,
          recommended,
          restrictions: []
        });
      }
      
      laneSegments.push({
        stepIndex: i,
        distance: segment.distance,
        maneuverType: segment.maneuverType,
        roadName: segment.roadName,
        totalLanes: laneCount,
        laneOptions,
        advisory: segment.instruction
      });
    }
    
    return laneSegments;
  }

  async setLaneSelection(routeId: string, selections: Record<number, number>): Promise<void> {
    this.laneSelections.set(routeId, selections);
  }

  async generateLaneGuidance(route: Route, vehicleProfile: VehicleProfile): Promise<LaneSegment[]> {
    // Generate realistic lane guidance based on route and vehicle profile
    const laneSegments: LaneSegment[] = [];
    
    // Mock route segments based on distance and typical UK motorway/A-road structure
    const totalDistance = route.distance || 186; // miles
    const segmentCount = Math.min(Math.max(Math.floor(totalDistance / 20), 3), 8); // 3-8 segments
    
    for (let i = 0; i < segmentCount; i++) {
      const segmentDistance = totalDistance / segmentCount * (i + 1);
      const isLastSegment = i === segmentCount - 1;
      const isFirstSegment = i === 0;
      
      // Determine maneuver type based on position
      let maneuverType: LaneSegment['maneuverType'];
      let totalLanes: number;
      let roadName: string;
      
      if (isFirstSegment) {
        maneuverType = 'enter';
        totalLanes = 2;
        roadName = 'A-road';
      } else if (isLastSegment) {
        maneuverType = 'exit';
        totalLanes = 3;
        roadName = route.endLocation.includes('M') ? route.endLocation.split(' ')[0] : 'A-road';
      } else if (i === 1) {
        maneuverType = 'merge';
        totalLanes = 4;
        roadName = 'M25'; // Common UK motorway
      } else if (i === segmentCount - 2) {
        // Randomly choose between turn-left and turn-right for more realistic guidance
        maneuverType = Math.random() > 0.5 ? 'turn-right' : 'turn-left';
        totalLanes = 3;
        roadName = 'A40';
      } else {
        maneuverType = 'straight';
        totalLanes = 3;
        roadName = 'M6';
      }

      // Generate lane options based on vehicle profile and restrictions
      const laneOptions: LaneOption[] = [];
      
      for (let laneIndex = 0; laneIndex < totalLanes; laneIndex++) {
        const isLeftLane = laneIndex === 0;
        const isRightLane = laneIndex === totalLanes - 1;
        const isMiddleLane = !isLeftLane && !isRightLane;
        
        let direction: LaneOption['direction'];
        let restrictions: string[] = [];
        let recommended = false;
        
        // Determine lane direction and restrictions
        if (maneuverType === 'exit' && isRightLane) {
          direction = 'exit';
          recommended = true;
        } else if (maneuverType === 'turn-right' && isRightLane) {
          direction = 'right';
          recommended = true;
        } else if (maneuverType === 'turn-left' && isLeftLane) {
          direction = 'left';
          recommended = true;
        } else if (maneuverType === 'merge' && isMiddleLane) {
          direction = 'straight';
          recommended = true;
        } else {
          direction = 'straight';
          recommended = isMiddleLane; // Middle lanes generally recommended for trucks
        }
        
        // Add vehicle-specific restrictions
        if (vehicleProfile.height && vehicleProfile.height > 15) {
          if (Math.random() > 0.8) { // 20% chance of height restriction
            restrictions.push('height-restriction-15ft');
            recommended = false;
          }
        }
        
        if (vehicleProfile.isHazmat) {
          if (isLeftLane && Math.random() > 0.7) { // 30% chance hazmat restriction in left lane
            restrictions.push('no-hazmat');
            recommended = false;
          }
        }
        
        if (vehicleProfile.weight && vehicleProfile.weight > 40) {
          if (isRightLane && Math.random() > 0.85) { // 15% chance weight restriction
            restrictions.push('weight-limit-40t');
            recommended = false;
          }
        }

        laneOptions.push({
          index: laneIndex,
          direction,
          restrictions: restrictions.length > 0 ? restrictions : undefined,
          allowedVehicles: undefined,
          recommended,
        });
      }

      // Generate advisory message
      let advisory: string | undefined;
      if (maneuverType === 'merge') {
        advisory = 'Prepare to merge - check mirrors and signal early';
      } else if (maneuverType === 'exit') {
        advisory = 'Exit approaching - move to exit lane';
      } else if (maneuverType === 'turn-right') {
        advisory = 'Right turn ahead - use right lane';
      } else if (vehicleProfile.height && vehicleProfile.height > 15) {
        advisory = 'Low bridge ahead - check height clearance';
      } else if (vehicleProfile.isHazmat) {
        advisory = 'Hazmat restrictions may apply - check lane signs';
      }

      laneSegments.push({
        stepIndex: i,
        roadName,
        maneuverType,
        distance: Math.round(segmentDistance * 10) / 10, // Round to 1 decimal
        totalLanes,
        laneOptions,
        advisory,
      });
    }
    
    return laneSegments;
  }

  // Location Management
  async getLocations(options?: { favorites?: boolean }): Promise<Location[]> {
    let locations = Array.from(this.locations.values());
    
    if (options?.favorites !== undefined) {
      locations = locations.filter(loc => loc.isFavorite === options.favorites);
    }
    
    // Sort by lastUsedAt desc, then useCount desc
    locations.sort((a, b) => {
      // First sort by lastUsedAt (most recent first)
      if (a.lastUsedAt && b.lastUsedAt) {
        const timeCompare = new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
        if (timeCompare !== 0) return timeCompare;
      } else if (a.lastUsedAt && !b.lastUsedAt) {
        return -1;
      } else if (!a.lastUsedAt && b.lastUsedAt) {
        return 1;
      }
      
      // Then sort by useCount (highest first)
      const useCountA = a.useCount || 0;
      const useCountB = b.useCount || 0;
      return useCountB - useCountA;
    });
    
    return locations;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = this.locationIdCounter++;
    const location: Location = {
      ...insertLocation,
      id,
      isFavorite: insertLocation.isFavorite ?? false,
      useCount: insertLocation.useCount ?? 0,
      lastUsedAt: insertLocation.lastUsedAt ?? new Date(),
    };
    
    this.locations.set(id, location);
    this.trimLocationHistory();
    return location;
  }

  async updateLocation(id: number, updates: Partial<Location>): Promise<Location | undefined> {
    const location = this.locations.get(id);
    if (!location) return undefined;
    
    const updatedLocation = { ...location, ...updates };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async markLocationUsed(id: number): Promise<Location | undefined> {
    const location = this.locations.get(id);
    if (!location) return undefined;
    
    const updatedLocation = {
      ...location,
      useCount: (location.useCount || 0) + 1,
      lastUsedAt: new Date(),
    };
    
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async upsertByLabelOrCoords(insertLocation: InsertLocation): Promise<Location> {
    // Try to find existing location by label first
    let existing = Array.from(this.locations.values()).find(loc => 
      loc.label === insertLocation.label
    );
    
    // If no match by label, try by coordinates (within 100m tolerance)
    if (!existing && insertLocation.coordinates) {
      const coords = insertLocation.coordinates as { lat: number; lng: number };
      existing = Array.from(this.locations.values()).find(loc => {
        const locCoords = loc.coordinates as { lat: number; lng: number };
        if (!locCoords) return false;
        
        // Use precise haversine distance calculation for 100m tolerance
        const distance = this.haversineDistance(coords, locCoords);
        return distance <= 100; // 100 meters tolerance
      });
    }
    
    if (existing) {
      // Update existing location
      const updatedLocation = await this.updateLocation(existing.id, {
        ...insertLocation,
        useCount: (existing.useCount || 0) + 1,
        lastUsedAt: new Date(),
      });
      return updatedLocation!;
    } else {
      // Create new location
      return await this.createLocation(insertLocation);
    }
  }

  private trimLocationHistory(): void {
    const locations = Array.from(this.locations.values());
    if (locations.length <= 50) return;
    
    // Sort by lastUsedAt ascending (oldest first) to remove oldest entries
    locations.sort((a, b) => {
      if (a.lastUsedAt && b.lastUsedAt) {
        return new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime();
      }
      return 0;
    });
    
    // Keep only favorites and the 50 most recent non-favorites
    const favorites = locations.filter(loc => loc.isFavorite);
    const nonFavorites = locations.filter(loc => !loc.isFavorite);
    
    const keepLocations = [
      ...favorites,
      ...nonFavorites.slice(-50) // Keep last 50 non-favorites
    ];
    
    // Clear and repopulate map
    this.locations.clear();
    keepLocations.forEach(loc => this.locations.set(loc.id, loc));
  }

  // Journey Management
  async getJourneyByIdempotencyKey(key: string, sessionId: string): Promise<Journey | undefined> {
    const sessionKeys = this.journeyIdempotencyKeys.get(sessionId);
    if (!sessionKeys) return undefined;
    const journeyId = sessionKeys.get(key);
    if (!journeyId) return undefined;
    return this.journeys.get(journeyId);
  }

  async startJourney(routeId: string, idempotencyKey?: string, sessionId?: string): Promise<Journey> {
    // Check for existing journey with same idempotency key (scoped to session)
    if (idempotencyKey && sessionId) {
      const existing = await this.getJourneyByIdempotencyKey(idempotencyKey, sessionId);
      if (existing) {
        return existing;
      }
    }

    // Validate that the route exists before creating a journey
    const route = this.routes.get(routeId);
    if (!route) {
      throw new Error(`Route with ID ${routeId} not found`);
    }
    
    const id = this.journeyIdCounter++;
    const journey: Journey = {
      id,
      routeId,
      status: 'planned', // CRITICAL: Always start with 'planned' status for route planning phase
      startedAt: new Date(),
      completedAt: null,
      idempotencyKey: idempotencyKey ?? null,
      sessionId: sessionId ?? null,
    };
    
    this.journeys.set(id, journey);
    
    // Store idempotency key mapping if provided (scoped to session)
    if (idempotencyKey && sessionId) {
      if (!this.journeyIdempotencyKeys.has(sessionId)) {
        this.journeyIdempotencyKeys.set(sessionId, new Map());
      }
      this.journeyIdempotencyKeys.get(sessionId)!.set(idempotencyKey, id);
    }
    
    console.log(`[JOURNEY] Created journey ${id} with status 'planned' for route ${routeId}${idempotencyKey ? ` (idempotency: ${idempotencyKey})` : ''}`);
    return journey;
  }

  async activateJourney(id: number, idempotencyKey?: string, sessionId?: string): Promise<Journey | undefined> {
    // Check for existing activation with same idempotency key (scoped to session)
    if (idempotencyKey && sessionId) {
      const existing = await this.getJourneyByIdempotencyKey(idempotencyKey, sessionId);
      if (existing && existing.status === 'active') {
        return existing;
      }
    }

    const journey = this.journeys.get(id);
    if (!journey) return undefined;
    
    // Prevent repeated activation - if already active, return as-is
    if (journey.status === 'active') {
      return journey;
    }
    
    // Only allow activation from 'planned' state
    if (journey.status !== 'planned') {
      throw new Error(`Cannot activate journey from status: ${journey.status}`);
    }
    
    const activeJourney = {
      ...journey,
      status: 'active' as const,
    };
    
    this.journeys.set(id, activeJourney);
    
    // Update idempotency key mapping for activation (scoped to session)
    if (idempotencyKey && sessionId) {
      if (!this.journeyIdempotencyKeys.has(sessionId)) {
        this.journeyIdempotencyKeys.set(sessionId, new Map());
      }
      this.journeyIdempotencyKeys.get(sessionId)!.set(idempotencyKey, id);
    }
    
    console.log(`[JOURNEY] Activated journey ${id} - status changed to 'active'${idempotencyKey ? ` (idempotency: ${idempotencyKey})` : ''}`);
    return activeJourney;
  }

  async completeJourney(id: number): Promise<Journey | undefined> {
    const journey = this.journeys.get(id);
    if (!journey) return undefined;
    
    // Prevent repeated completion - if already completed, return as-is
    if (journey.status === 'completed') {
      return journey;
    }
    
    // Only allow completion from 'planned' or 'active' states
    if (journey.status !== 'planned' && journey.status !== 'active') {
      throw new Error(`Cannot complete journey from status: ${journey.status}`);
    }
    
    const completedJourney = {
      ...journey,
      status: 'completed' as const,
      completedAt: new Date(),
    };
    
    this.journeys.set(id, completedJourney);
    console.log(`[JOURNEY] Completed journey ${id} - status changed to 'completed'`);
    return completedJourney;
  }

  async getLastJourney(): Promise<Journey | undefined> {
    const journeys = Array.from(this.journeys.values());
    if (journeys.length === 0) return undefined;
    
    // Sort by startedAt descending and return the most recent
    journeys.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return journeys[0];
  }

  async getJourneyHistory(limit: number = 20, offset: number = 0): Promise<Journey[]> {
    const journeys = Array.from(this.journeys.values());
    
    // Sort by startedAt descending (most recent first)
    journeys.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    // Apply pagination
    return journeys.slice(offset, offset + limit);
  }

  // Postcode search functions
  async searchPostcode(postcode: string, country?: string): Promise<PostcodeResult[]> {
    if (!postcode || postcode.trim().length === 0) {
      return [];
    }

    // Normalize the search term (remove spaces, convert to uppercase)
    const normalizedSearch = postcode.replace(/\s+/g, '').toUpperCase();
    const results: PostcodeResult[] = [];

    // Search through the postcode database
    for (const [key, postcodeData] of Array.from(this.postcodeDatabase.entries())) {
      const matches = this.isPostcodeMatch(key, postcodeData, normalizedSearch, country);
      if (matches) {
        results.push(postcodeData);
      }
    }

    // Sort by confidence score (highest first) and limit results
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Limit to top 10 results
  }

  async geocodePostcode(postcode: string, country?: string): Promise<PostcodeResult | null> {
    if (!postcode || postcode.trim().length === 0) {
      return null;
    }

    // Normalize the postcode for exact lookup
    const normalizedPostcode = postcode.replace(/\s+/g, '').toUpperCase();
    
    // Try exact match first
    const exactMatch = this.postcodeDatabase.get(normalizedPostcode);
    if (exactMatch && (!country || exactMatch.country === country)) {
      return exactMatch;
    }

    // Try partial matching for formats that support it (like UK postcodes)
    for (const [key, postcodeData] of Array.from(this.postcodeDatabase.entries())) {
      if (this.isPostcodeMatch(key, postcodeData, normalizedPostcode, country, true)) {
        return postcodeData;
      }
    }

    return null;
  }

  private isPostcodeMatch(
    key: string, 
    postcodeData: PostcodeResult, 
    searchTerm: string, 
    country?: string,
    exactOnly: boolean = false
  ): boolean {
    // Filter by country if specified
    if (country && postcodeData.country !== country) {
      return false;
    }

    // Exact match
    if (key === searchTerm || postcodeData.postcode === searchTerm) {
      return true;
    }

    // Skip partial matching if exactOnly is true
    if (exactOnly) {
      return false;
    }

    // Partial matching for different postcode formats
    if (postcodeData.country === 'UK') {
      // UK: Allow matching on district (first part before space)
      // e.g., "SW1A" should match "SW1A 1AA"
      const ukDistrict = postcodeData.postcode.split(/\s/)[0];
      if (ukDistrict && searchTerm.startsWith(ukDistrict.replace(/\s+/g, '').toUpperCase())) {
        return true;
      }
    }

    // Contains matching for addresses and cities
    const searchLower = searchTerm.toLowerCase();
    return Boolean(
      postcodeData.address?.toLowerCase().includes(searchLower) ||
      postcodeData.city?.toLowerCase().includes(searchLower) ||
      postcodeData.region?.toLowerCase().includes(searchLower)
    );
  }

  // Traffic Re-routing System Implementation

  // Route Monitoring
  async createRouteMonitoring(insertMonitoring: InsertRouteMonitoring): Promise<RouteMonitoring> {
    const id = randomUUID();
    const monitoring: RouteMonitoring = {
      ...insertMonitoring,
      id,
      vehicleProfileId: insertMonitoring.vehicleProfileId ?? null,
      journeyId: insertMonitoring.journeyId ?? null,
      isActive: insertMonitoring.isActive ?? true,
      checkInterval: insertMonitoring.checkInterval ?? 300,
      alertThreshold: insertMonitoring.alertThreshold ?? 5,
      monitoringStarted: new Date(),
      monitoringEnded: null,
      lastTrafficCheck: null,
      currentTrafficConditions: null,
      userPreferences: insertMonitoring.userPreferences || { autoApply: false, minTimeSavings: 5 },
    };

    this.routeMonitoring.set(id, monitoring);
    return monitoring;
  }

  async getRouteMonitoring(id: string): Promise<RouteMonitoring | undefined> {
    return this.routeMonitoring.get(id);
  }

  async getActiveRouteMonitoring(): Promise<RouteMonitoring[]> {
    return Array.from(this.routeMonitoring.values()).filter(m => m.isActive);
  }

  async getRouteMonitoringByRoute(routeId: string): Promise<RouteMonitoring | undefined> {
    return Array.from(this.routeMonitoring.values()).find(m => m.routeId === routeId && m.isActive);
  }

  async getRouteMonitoringByJourney(journeyId: number): Promise<RouteMonitoring | undefined> {
    return Array.from(this.routeMonitoring.values()).find(m => m.journeyId === journeyId && m.isActive);
  }

  async updateRouteMonitoring(id: string, updates: Partial<RouteMonitoring>): Promise<RouteMonitoring | undefined> {
    const monitoring = this.routeMonitoring.get(id);
    if (!monitoring) return undefined;

    const updatedMonitoring = { ...monitoring, ...updates };
    this.routeMonitoring.set(id, updatedMonitoring);
    return updatedMonitoring;
  }

  async stopRouteMonitoring(id: string): Promise<boolean> {
    const monitoring = this.routeMonitoring.get(id);
    if (!monitoring) return false;

    const stoppedMonitoring = {
      ...monitoring,
      isActive: false,
      monitoringEnded: new Date(),
    };

    this.routeMonitoring.set(id, stoppedMonitoring);
    return true;
  }

  // Alternative Routes
  async createAlternativeRoute(insertRoute: InsertAlternativeRouteDB): Promise<AlternativeRouteDB> {
    const id = randomUUID();
    const alternativeRoute: AlternativeRouteDB = {
      ...insertRoute,
      id,
      restrictionsAvoided: insertRoute.restrictionsAvoided ?? [],
      trafficConditions: insertRoute.trafficConditions ?? null,
      viabilityScore: insertRoute.viabilityScore ?? 0.5,
      calculatedAt: new Date(),
      isActive: insertRoute.isActive ?? true,
      expiresAt: insertRoute.expiresAt || new Date(Date.now() + 30 * 60 * 1000), // 30 minutes default
    };

    this.alternativeRoutes.set(id, alternativeRoute);
    return alternativeRoute;
  }

  async getAlternativeRoute(id: string): Promise<AlternativeRouteDB | undefined> {
    return this.alternativeRoutes.get(id);
  }

  async getAlternativeRoutesByOriginal(originalRouteId: string): Promise<AlternativeRouteDB[]> {
    return Array.from(this.alternativeRoutes.values())
      .filter(route => route.originalRouteId === originalRouteId);
  }

  async getActiveAlternativeRoutes(originalRouteId: string): Promise<AlternativeRouteDB[]> {
    const now = new Date();
    return Array.from(this.alternativeRoutes.values())
      .filter(route => 
        route.originalRouteId === originalRouteId && 
        route.isActive && 
        (!route.expiresAt || route.expiresAt > now)
      );
  }

  async updateAlternativeRoute(id: string, updates: Partial<AlternativeRouteDB>): Promise<AlternativeRouteDB | undefined> {
    const route = this.alternativeRoutes.get(id);
    if (!route) return undefined;

    const updatedRoute = { ...route, ...updates };
    this.alternativeRoutes.set(id, updatedRoute);
    return updatedRoute;
  }

  async deactivateAlternativeRoute(id: string): Promise<boolean> {
    const route = this.alternativeRoutes.get(id);
    if (!route) return false;

    const deactivatedRoute = { ...route, isActive: false };
    this.alternativeRoutes.set(id, deactivatedRoute);
    return true;
  }

  async cleanupExpiredAlternatives(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [id, route] of Array.from(this.alternativeRoutes.entries())) {
      if (route.expiresAt && route.expiresAt <= now) {
        this.alternativeRoutes.delete(id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // Re-routing Events
  async createReRoutingEvent(insertEvent: InsertReRoutingEventDB): Promise<ReRoutingEventDB> {
    const id = randomUUID();
    const event: ReRoutingEventDB = {
      ...insertEvent,
      id,
      journeyId: insertEvent.journeyId ?? null,
      alternativeRouteId: insertEvent.alternativeRouteId ?? null,
      timeSavingsOffered: insertEvent.timeSavingsOffered ?? null,
      userResponse: insertEvent.userResponse ?? null,
      responseTime: insertEvent.responseTime ?? null,
      appliedAt: insertEvent.appliedAt ?? null,
      effectiveness: insertEvent.effectiveness ?? null,
      metadata: insertEvent.metadata ?? {},
      createdAt: new Date(),
    };

    this.reRoutingEvents.set(id, event);
    return event;
  }

  async getReRoutingEvent(id: string): Promise<ReRoutingEventDB | undefined> {
    return this.reRoutingEvents.get(id);
  }

  async getReRoutingEventsByJourney(journeyId: number): Promise<ReRoutingEventDB[]> {
    return Array.from(this.reRoutingEvents.values())
      .filter(event => event.journeyId === journeyId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getReRoutingEventsByRoute(routeId: string): Promise<ReRoutingEventDB[]> {
    return Array.from(this.reRoutingEvents.values())
      .filter(event => event.originalRouteId === routeId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async updateReRoutingEvent(id: string, updates: Partial<ReRoutingEventDB>): Promise<ReRoutingEventDB | undefined> {
    const event = this.reRoutingEvents.get(id);
    if (!event) return undefined;

    const updatedEvent = { ...event, ...updates };
    this.reRoutingEvents.set(id, updatedEvent);
    return updatedEvent;
  }

  async getReRoutingStats(routeId?: string, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalEvents: number;
    acceptedEvents: number;
    declinedEvents: number;
    averageTimeSavings: number;
    effectivenessScore: number;
  }> {
    const timeframeDays = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
    const cutoffDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    let events = Array.from(this.reRoutingEvents.values())
      .filter(event => event.createdAt && event.createdAt >= cutoffDate);

    if (routeId) {
      events = events.filter(event => event.originalRouteId === routeId);
    }

    const totalEvents = events.length;
    const acceptedEvents = events.filter(event => event.userResponse === 'accepted').length;
    const declinedEvents = events.filter(event => event.userResponse === 'declined').length;

    const timeSavingsValues = events
      .filter(event => event.timeSavingsOffered !== null && event.timeSavingsOffered !== undefined)
      .map(event => event.timeSavingsOffered!);

    const averageTimeSavings = timeSavingsValues.length > 0
      ? timeSavingsValues.reduce((sum, savings) => sum + savings, 0) / timeSavingsValues.length
      : 0;

    // Calculate effectiveness as the ratio of accepted to total events (excluding ignored)
    const respondedEvents = acceptedEvents + declinedEvents;
    const effectivenessScore = respondedEvents > 0 ? (acceptedEvents / respondedEvents) : 0;

    return {
      totalEvents,
      acceptedEvents,
      declinedEvents,
      averageTimeSavings: Math.round(averageTimeSavings * 100) / 100,
      effectivenessScore: Math.round(effectivenessScore * 100) / 100,
    };
  }

  // Traffic Conditions
  async storeTrafficConditions(routeId: string, conditions: TrafficCondition[]): Promise<void> {
    const averageDelay = conditions.length > 0
      ? conditions.reduce((sum, condition) => sum + condition.delayMinutes, 0) / conditions.length
      : 0;

    const entry = {
      timestamp: new Date(),
      conditions,
      averageDelay,
    };

    const existingHistory = this.trafficHistory.get(routeId) || [];
    existingHistory.push(entry);

    // Keep only last 48 hours of history
    const cutoffTime = Date.now() - (48 * 60 * 60 * 1000);
    const filteredHistory = existingHistory.filter(
      entry => entry.timestamp.getTime() > cutoffTime
    );

    this.trafficHistory.set(routeId, filteredHistory);
  }

  async getTrafficConditions(routeId: string): Promise<TrafficCondition[]> {
    const history = this.trafficHistory.get(routeId);
    if (!history || history.length === 0) return [];

    // Return the most recent conditions
    const latest = history[history.length - 1];
    return latest.conditions;
  }

  async getTrafficHistory(routeId: string, hours: number): Promise<Array<{
    timestamp: Date;
    conditions: TrafficCondition[];
    averageDelay: number;
  }>> {
    const history = this.trafficHistory.get(routeId) || [];
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

    return history.filter(entry => entry.timestamp.getTime() > cutoffTime);
  }

  async cleanupTrafficHistory(hoursToKeep: number): Promise<number> {
    const cutoffTime = Date.now() - (hoursToKeep * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [routeId, history] of Array.from(this.trafficHistory.entries())) {
      const originalLength = history.length;
      const filteredHistory = history.filter(
        (entry: { timestamp: Date; conditions: any[]; averageDelay: number }) => entry.timestamp.getTime() > cutoffTime
      );

      if (filteredHistory.length === 0) {
        this.trafficHistory.delete(routeId);
      } else {
        this.trafficHistory.set(routeId, filteredHistory);
      }

      cleanedCount += originalLength - filteredHistory.length;
    }

    return cleanedCount;
  }

  // ===== PREDICTIVE TRAFFIC ANALYSIS METHODS (In-Memory) =====
  private historicalTrafficStore = new Map<string, HistoricalTrafficData>();
  private driverBehaviorStore = new Map<string, DriverBehaviorProfile>();
  private trafficObservationsStore: TrafficObservation[] = [];
  private trafficPredictionsStore = new Map<string, TrafficPrediction>();

  async recordTrafficObservation(observation: InsertTrafficObservation): Promise<TrafficObservation> {
    const newObs: TrafficObservation = {
      id: this.trafficObservationsStore.length + 1,
      ...observation,
      timestamp: observation.timestamp || new Date(),
      source: observation.source || 'user',
      freeFlowSpeed: observation.freeFlowSpeed || null,
      congestionLevel: observation.congestionLevel || null,
      journeyId: observation.journeyId || null,
    };
    this.trafficObservationsStore.push(newObs);
    
    // Aggregate into historical data
    const date = newObs.timestamp!;
    const dayOfWeek = date.getDay();
    const hourOfDay = date.getHours();
    await this.aggregateIntoHistorical(observation.roadSegmentId, observation.latitude, observation.longitude, dayOfWeek, hourOfDay, observation.observedSpeed, observation.freeFlowSpeed || observation.observedSpeed * 1.2);
    
    return newObs;
  }

  private async aggregateIntoHistorical(roadSegmentId: string, lat: number, lng: number, dayOfWeek: number, hourOfDay: number, observedSpeed: number, freeFlowSpeed: number): Promise<void> {
    const key = `${roadSegmentId}-${dayOfWeek}-${hourOfDay}`;
    const existing = this.historicalTrafficStore.get(key);
    
    const congestionLevel = Math.max(0, Math.min(1, 1 - (observedSpeed / freeFlowSpeed)));
    const delay = freeFlowSpeed > 0 ? Math.max(0, (freeFlowSpeed - observedSpeed) / freeFlowSpeed * 10) : 0;
    
    if (existing) {
      const newSampleCount = existing.sampleCount + 1;
      const newAvgSpeed = (existing.averageSpeed * existing.sampleCount + observedSpeed) / newSampleCount;
      const newCongestion = (existing.congestionLevel * existing.sampleCount + congestionLevel) / newSampleCount;
      const newDelay = ((existing.averageDelayMinutes || 0) * existing.sampleCount + delay) / newSampleCount;
      
      this.historicalTrafficStore.set(key, {
        ...existing,
        averageSpeed: newAvgSpeed,
        congestionLevel: newCongestion,
        sampleCount: newSampleCount,
        averageDelayMinutes: newDelay,
        lastUpdated: new Date(),
      });
    } else {
      const newData: HistoricalTrafficData = {
        id: this.historicalTrafficStore.size + 1,
        roadSegmentId,
        roadName: null,
        latitude: lat,
        longitude: lng,
        dayOfWeek,
        hourOfDay,
        averageSpeed: observedSpeed,
        freeFlowSpeed,
        congestionLevel,
        sampleCount: 1,
        averageDelayMinutes: delay,
        lastUpdated: new Date(),
        createdAt: new Date(),
      };
      this.historicalTrafficStore.set(key, newData);
    }
  }

  async getTrafficObservations(roadSegmentId: string, limit?: number): Promise<TrafficObservation[]> {
    const filtered = this.trafficObservationsStore.filter(o => o.roadSegmentId === roadSegmentId);
    return limit ? filtered.slice(-limit) : filtered;
  }

  async aggregateHistoricalData(roadSegmentId: string, dayOfWeek: number, hourOfDay: number): Promise<HistoricalTrafficData | undefined> {
    const key = `${roadSegmentId}-${dayOfWeek}-${hourOfDay}`;
    return this.historicalTrafficStore.get(key);
  }

  async upsertHistoricalTrafficData(data: InsertHistoricalTrafficData): Promise<HistoricalTrafficData> {
    const key = `${data.roadSegmentId}-${data.dayOfWeek}-${data.hourOfDay}`;
    const newData: HistoricalTrafficData = {
      id: this.historicalTrafficStore.size + 1,
      ...data,
      roadName: data.roadName || null,
      sampleCount: data.sampleCount || 1,
      averageDelayMinutes: data.averageDelayMinutes || 0,
      lastUpdated: new Date(),
      createdAt: new Date(),
    };
    this.historicalTrafficStore.set(key, newData);
    return newData;
  }

  async getHistoricalTrafficPatterns(roadSegmentId: string): Promise<HistoricalTrafficData[]> {
    return Array.from(this.historicalTrafficStore.values()).filter(d => d.roadSegmentId === roadSegmentId);
  }

  async getTrafficPrediction(routeId: string, predictionTime: Date): Promise<TrafficPrediction | undefined> {
    const key = `${routeId}-${predictionTime.toISOString().slice(0, 13)}`; // Hour precision
    const cached = this.trafficPredictionsStore.get(key);
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }
    return undefined;
  }

  async cacheTrafficPrediction(prediction: InsertTrafficPrediction): Promise<TrafficPrediction> {
    const key = `${prediction.routeId}-${prediction.predictionTime.toISOString().slice(0, 13)}`;
    const newPrediction: TrafficPrediction = {
      id: this.trafficPredictionsStore.size + 1,
      ...prediction,
      segmentPredictions: prediction.segmentPredictions || null,
      createdAt: new Date(),
    };
    this.trafficPredictionsStore.set(key, newPrediction);
    return newPrediction;
  }

  async cleanupExpiredPredictions(): Promise<number> {
    const now = new Date();
    let cleaned = 0;
    for (const [key, pred] of this.trafficPredictionsStore.entries()) {
      if (pred.expiresAt < now) {
        this.trafficPredictionsStore.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  async getHistoricalDataForTimeSlot(dayOfWeek: number, hourOfDay: number, bounds?: { north: number; south: number; east: number; west: number }): Promise<HistoricalTrafficData[]> {
    let results = Array.from(this.historicalTrafficStore.values()).filter(
      d => d.dayOfWeek === dayOfWeek && d.hourOfDay === hourOfDay
    );
    
    if (bounds) {
      results = results.filter(d => 
        d.latitude >= bounds.south && d.latitude <= bounds.north &&
        d.longitude >= bounds.west && d.longitude <= bounds.east
      );
    }
    
    return results;
  }

  // Utility method for distance calculations
  private haversineDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1.lat * Math.PI / 180;
    const φ2 = coord2.lat * Math.PI / 180;
    const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
    const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  // ===== DRIVER BEHAVIOR PROFILE METHODS (In-Memory) =====

  async getDriverBehaviorProfile(sessionId: string): Promise<DriverBehaviorProfile | undefined> {
    return this.driverBehaviorStore.get(sessionId);
  }

  async upsertDriverBehaviorProfile(profile: InsertDriverBehaviorProfile): Promise<DriverBehaviorProfile> {
    const existing = this.driverBehaviorStore.get(profile.sessionId);
    if (existing) {
      const updated: DriverBehaviorProfile = {
        ...existing,
        ...profile,
        updatedAt: new Date(),
      };
      this.driverBehaviorStore.set(profile.sessionId, updated);
      return updated;
    }
    const newProfile: DriverBehaviorProfile = {
      id: this.driverBehaviorStore.size + 1,
      sessionId: profile.sessionId,
      averageSpeedFactor: profile.averageSpeedFactor ?? 1.0,
      breakFrequencyPerHour: profile.breakFrequencyPerHour ?? 0,
      averageBreakDuration: profile.averageBreakDuration ?? 0,
      tripsCompleted: profile.tripsCompleted ?? 0,
      totalDrivingMinutes: profile.totalDrivingMinutes ?? 0,
      averageSpeedKmh: profile.averageSpeedKmh ?? 50,
      lastTripSpeedFactor: profile.lastTripSpeedFactor ?? 1.0,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    this.driverBehaviorStore.set(profile.sessionId, newProfile);
    return newProfile;
  }

  // ===== ENTERTAINMENT STORAGE METHODS =====

  // Entertainment Stations
  async getEntertainmentStation(id: string): Promise<EntertainmentStation | undefined> {
    return this.entertainmentStations.get(id);
  }

  async createEntertainmentStation(station: InsertEntertainmentStation): Promise<EntertainmentStation> {
    const id = randomUUID();
    const now = new Date();
    const newStation: EntertainmentStation = {
      id,
      ...station,
      playCount: station.playCount || 0,
      reliability: station.reliability || 100,
      isActive: station.isActive !== undefined ? station.isActive : true,
      lastVerified: now,
      createdAt: now,
      updatedAt: now,
    };
    
    this.entertainmentStations.set(id, newStation);
    return newStation;
  }

  async getAllEntertainmentStations(params?: { 
    platform?: string; 
    type?: string; 
    trucking?: boolean; 
    limit?: number 
  }): Promise<EntertainmentStation[]> {
    let stations = Array.from(this.entertainmentStations.values());

    // Apply filters
    if (params?.platform) {
      stations = stations.filter(s => s.platform === params.platform);
    }
    if (params?.type) {
      stations = stations.filter(s => s.type === params.type);
    }
    if (params?.trucking) {
      stations = stations.filter(s => s.isTruckingRelated);
    }

    // Sort by trucking-related first, then by reliability/play count
    stations.sort((a, b) => {
      if (a.isTruckingRelated !== b.isTruckingRelated) {
        return a.isTruckingRelated ? -1 : 1;
      }
      return (b.reliability || 0) - (a.reliability || 0);
    });

    // Apply limit
    if (params?.limit) {
      stations = stations.slice(0, params.limit);
    }

    return stations;
  }

  async searchEntertainmentStations(query: string, params?: { 
    platform?: string; 
    type?: string; 
    limit?: number 
  }): Promise<EntertainmentStation[]> {
    const lowercaseQuery = query.toLowerCase();
    let stations = Array.from(this.entertainmentStations.values()).filter(station => 
      station.name.toLowerCase().includes(lowercaseQuery) ||
      station.description?.toLowerCase().includes(lowercaseQuery) ||
      station.genre.toLowerCase().includes(lowercaseQuery) ||
      station.creator.toLowerCase().includes(lowercaseQuery) ||
      (station.tags as string[]).some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );

    // Apply additional filters
    if (params?.platform) {
      stations = stations.filter(s => s.platform === params.platform);
    }
    if (params?.type) {
      stations = stations.filter(s => s.type === params.type);
    }

    // Sort by relevance (exact matches first, then partial matches)
    stations.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowercaseQuery ? 1 : 0;
      const bExact = b.name.toLowerCase() === lowercaseQuery ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      return (b.playCount || 0) - (a.playCount || 0);
    });

    // Apply limit
    if (params?.limit) {
      stations = stations.slice(0, params.limit);
    }

    return stations;
  }

  async updateEntertainmentStation(id: string, updates: Partial<EntertainmentStation>): Promise<EntertainmentStation | undefined> {
    const station = this.entertainmentStations.get(id);
    if (!station) return undefined;

    const updatedStation: EntertainmentStation = {
      ...station,
      ...updates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date(),
    };

    this.entertainmentStations.set(id, updatedStation);
    return updatedStation;
  }

  async deleteEntertainmentStation(id: string): Promise<boolean> {
    return this.entertainmentStations.delete(id);
  }

  // Entertainment Presets
  async getEntertainmentPreset(id: number): Promise<EntertainmentPreset | undefined> {
    return this.entertainmentPresets.get(id);
  }

  async createEntertainmentPreset(preset: InsertEntertainmentPreset): Promise<EntertainmentPreset> {
    const id = this.presetIdCounter++;
    const newPreset: EntertainmentPreset = {
      id,
      ...preset,
      useCount: preset.useCount || 0,
      isDefault: preset.isDefault || false,
      volume: preset.volume || 0.8,
      createdAt: new Date(),
    };

    this.entertainmentPresets.set(id, newPreset);
    return newPreset;
  }

  async getAllEntertainmentPresets(userId?: string): Promise<EntertainmentPreset[]> {
    let presets = Array.from(this.entertainmentPresets.values());

    if (userId) {
      presets = presets.filter(p => p.userId === userId || p.isDefault);
    }

    // Sort by preset number first, then by use count
    presets.sort((a, b) => {
      if (a.presetNumber && b.presetNumber) {
        return a.presetNumber - b.presetNumber;
      }
      if (a.presetNumber && !b.presetNumber) return -1;
      if (!a.presetNumber && b.presetNumber) return 1;
      return (b.useCount || 0) - (a.useCount || 0);
    });

    return presets;
  }

  async updateEntertainmentPreset(id: number, updates: Partial<EntertainmentPreset>): Promise<EntertainmentPreset | undefined> {
    const preset = this.entertainmentPresets.get(id);
    if (!preset) return undefined;

    const updatedPreset: EntertainmentPreset = {
      ...preset,
      ...updates,
      id, // Ensure ID cannot be changed
    };

    this.entertainmentPresets.set(id, updatedPreset);
    return updatedPreset;
  }

  async deleteEntertainmentPreset(id: number): Promise<boolean> {
    return this.entertainmentPresets.delete(id);
  }

  // Entertainment History
  async getEntertainmentHistory(userId?: string, limit?: number): Promise<EntertainmentHistory[]> {
    let history = Array.from(this.entertainmentHistory.values());

    if (userId) {
      history = history.filter(h => h.userId === userId);
    }

    // Sort by played date (most recent first)
    history.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());

    if (limit) {
      history = history.slice(0, limit);
    }

    return history;
  }

  async createEntertainmentHistory(history: InsertEntertainmentHistory): Promise<EntertainmentHistory> {
    const id = this.historyIdCounter++;
    const newHistory: EntertainmentHistory = {
      id,
      ...history,
      playedAt: new Date(),
      wasCompleted: history.wasCompleted || false,
      source: history.source || 'manual',
    };

    this.entertainmentHistory.set(id, newHistory);

    // Cleanup old history if over max items
    const allHistory = Array.from(this.entertainmentHistory.values());
    if (allHistory.length > this.entertainmentSettings.maxHistoryItems) {
      const sortedHistory = allHistory.sort((a, b) => 
        new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
      );
      
      const toDelete = sortedHistory.slice(this.entertainmentSettings.maxHistoryItems);
      toDelete.forEach(item => this.entertainmentHistory.delete(item.id));
    }

    return newHistory;
  }

  async clearEntertainmentHistory(userId?: string): Promise<number> {
    let clearedCount = 0;
    
    if (userId) {
      // Clear history for specific user
      const toDelete = Array.from(this.entertainmentHistory.entries())
        .filter(([_, history]) => history.userId === userId)
        .map(([id, _]) => id);
      
      toDelete.forEach(id => {
        if (this.entertainmentHistory.delete(id)) {
          clearedCount++;
        }
      });
    } else {
      // Clear all history
      clearedCount = this.entertainmentHistory.size;
      this.entertainmentHistory.clear();
    }

    return clearedCount;
  }

  // Entertainment Playback State
  async getEntertainmentPlaybackState(): Promise<EntertainmentPlaybackState | undefined> {
    return this.entertainmentPlaybackState || undefined;
  }

  async updateEntertainmentPlaybackState(state: InsertEntertainmentPlaybackState): Promise<EntertainmentPlaybackState> {
    const id = this.entertainmentPlaybackState?.id || 1;
    const newState: EntertainmentPlaybackState = {
      id,
      ...state,
      volume: state.volume || 0.8,
      position: state.position || 0,
      isPlaying: state.isPlaying !== undefined ? state.isPlaying : false,
      audioFocusHeld: state.audioFocusHeld !== undefined ? state.audioFocusHeld : false,
      crossfadeEnabled: state.crossfadeEnabled !== undefined ? state.crossfadeEnabled : false,
      repeatMode: state.repeatMode || 'none',
      shuffleEnabled: state.shuffleEnabled !== undefined ? state.shuffleEnabled : false,
      updatedAt: new Date(),
    };

    this.entertainmentPlaybackState = newState;
    return newState;
  }

  // Entertainment Settings
  async getEntertainmentSettings(): Promise<EntertainmentSettings> {
    return { ...this.entertainmentSettings };
  }

  async updateEntertainmentSettings(settings: Partial<EntertainmentSettings>): Promise<EntertainmentSettings> {
    this.entertainmentSettings = {
      ...this.entertainmentSettings,
      ...settings,
    };
    
    return { ...this.entertainmentSettings };
  }

  // Dash Cam Recordings (MemStorage placeholder - not used in production)
  async createDashCamRecording(recording: InsertDashCamRecording): Promise<DashCamRecording> {
    throw new Error("Dash cam recordings not available in memory storage");
  }

  async getDashCamRecording(id: string): Promise<DashCamRecording | undefined> {
    return undefined;
  }

  async getDashCamRecordings(userId: string): Promise<DashCamRecording[]> {
    return [];
  }

  async deleteDashCamRecording(id: string): Promise<boolean> {
    return false;
  }
}


export class DatabaseStorage implements IStorage {
  private postcodeDatabase: Map<string, PostcodeResult>;

  constructor() {
    this.postcodeDatabase = new Map();
    this.initializePostcodeData();
  }

  private initializePostcodeData() {
    // Sample postcodes for testing - comprehensive coverage of supported countries
    const samplePostcodes: PostcodeResult[] = [
      // UK Postcodes
      {
        postcode: "SW1A1AA",
        formatted: "SW1A 1AA",
        country: "UK",
        coordinates: { lat: 51.5014, lng: -0.1419 },
        address: "Buckingham Palace, Westminster",
        city: "London",
        region: "England",
        confidence: 0.98,
      },
      {
        postcode: "M11AA",
        formatted: "M1 1AA",
        country: "UK",
        coordinates: { lat: 53.4808, lng: -2.2426 },
        address: "Manchester City Centre",
        city: "Manchester",
        region: "England",
        confidence: 0.95,
      },
      {
        postcode: "B338TH",
        formatted: "B33 8TH",
        country: "UK",
        coordinates: { lat: 52.4862, lng: -1.8904 },
        address: "Birmingham Area",
        city: "Birmingham",
        region: "England",
        confidence: 0.92,
      },
      {
        postcode: "G12QP",
        formatted: "G1 2QP",
        country: "UK",
        coordinates: { lat: 55.8642, lng: -4.2518 },
        address: "Glasgow City Centre",
        city: "Glasgow",
        region: "Scotland",
        confidence: 0.94,
      },
      // Milton Keynes/Bedfordshire Area - CRITICAL FIX for wrong geocoding
      {
        postcode: "MK17",
        formatted: "MK17",
        country: "UK",
        coordinates: { lat: 51.9948, lng: -0.5892 },
        address: "Flitwick, Bedfordshire",
        city: "Flitwick",
        region: "Bedfordshire",
        confidence: 0.95,
      },
      {
        postcode: "MK179",
        formatted: "MK17 9",
        country: "UK", 
        coordinates: { lat: 51.9948, lng: -0.5892 },
        address: "Flitwick, Bedfordshire",
        city: "Flitwick",
        region: "Bedfordshire",
        confidence: 0.95,
      },
      {
        postcode: "MK1",
        formatted: "MK1",
        country: "UK",
        coordinates: { lat: 52.0406, lng: -0.7594 },
        address: "Milton Keynes Central",
        city: "Milton Keynes",
        region: "Buckinghamshire",
        confidence: 0.96,
      },
      {
        postcode: "MK9",
        formatted: "MK9",
        country: "UK",
        coordinates: { lat: 52.0406, lng: -0.7594 },
        address: "Milton Keynes",
        city: "Milton Keynes", 
        region: "Buckinghamshire",
        confidence: 0.96,
      },
      // USER'S EXACT CURRENT LOCATION - CRITICAL FOR ACCURATE NAVIGATION
      {
        postcode: "LU27FG",
        formatted: "LU2 7FG",
        country: "UK",
        coordinates: { lat: 51.8787, lng: -0.4200 },
        address: "Luton, Bedfordshire",
        city: "Luton",
        region: "Bedfordshire",
        confidence: 0.98,
      },
      {
        postcode: "LU2",
        formatted: "LU2",
        country: "UK",
        coordinates: { lat: 51.8787, lng: -0.4200 },
        address: "Luton Central, Bedfordshire",
        city: "Luton",
        region: "Bedfordshire",
        confidence: 0.97,
      },
    ];

    samplePostcodes.forEach(postcode => {
      // Use normalized postcode (without spaces) as key for consistent lookup
      const key = postcode.postcode.replace(/\s+/g, '').toUpperCase();
      this.postcodeDatabase.set(key, postcode);
    });
  }

  // Vehicle Profiles
  async getVehicleProfile(id: string): Promise<VehicleProfile | undefined> {
    const [profile] = await db.select().from(vehicleProfiles).where(eq(vehicleProfiles.id, id));
    return profile || undefined;
  }

  async createVehicleProfile(profile: InsertVehicleProfile): Promise<VehicleProfile> {
    const [created] = await db
      .insert(vehicleProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async getAllVehicleProfiles(): Promise<VehicleProfile[]> {
    return await db.select().from(vehicleProfiles);
  }

  // Restrictions
  async getRestriction(id: string): Promise<Restriction | undefined> {
    const [restriction] = await db.select().from(restrictions).where(eq(restrictions.id, id));
    return restriction || undefined;
  }

  async createRestriction(restriction: InsertRestriction): Promise<Restriction> {
    const [created] = await db
      .insert(restrictions)
      .values(restriction)
      .returning();
    return created;
  }

  async getRestrictionsByArea(bounds: { north: number; south: number; east: number; west: number }): Promise<Restriction[]> {
    // CRITICAL: Filter restrictions by geographic bounds to ensure country-specific and area-specific restriction checking
    const allRestrictions = await db.select().from(restrictions).where(eq(restrictions.isActive, true));
    
    // Filter by geographic coordinates to get only restrictions in the specified area
    const validRestrictions: Restriction[] = [];
    
    for (const restriction of allRestrictions) {
      if (!restriction.coordinates) continue;
      
      try {
        const coords = typeof restriction.coordinates === 'string' 
          ? JSON.parse(restriction.coordinates) 
          : restriction.coordinates;
        
        // Ensure coordinates are valid
        if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
          console.warn(`[RESTRICTION-FILTER] Invalid coordinates for restriction ${restriction.id}`);
          continue;
        }
        
        // Check if restriction is within the geographic bounds
        const withinBounds = coords.lat <= bounds.north && 
                            coords.lat >= bounds.south &&
                            coords.lng <= bounds.east && 
                            coords.lng >= bounds.west;
        
        if (withinBounds) {
          validRestrictions.push(restriction);
          console.log(`[RESTRICTION-FILTER] Found restriction in area: ${restriction.country} - ${restriction.type} at ${restriction.location}`);
        }
      } catch (parseError) {
        console.error(`[RESTRICTION-FILTER] Error parsing coordinates for restriction ${restriction.id}:`, parseError);
        continue;
      }
    }
    
    return validRestrictions;
  }

  // Facilities
  async getFacility(id: string): Promise<Facility | undefined> {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));
    return facility || undefined;
  }

  async createFacility(facility: InsertFacility): Promise<Facility> {
    const [created] = await db
      .insert(facilities)
      .values(facility)
      .returning();
    return created;
  }

  async searchFacilities(params: { type?: string; coordinates?: { lat: number; lng: number }; radius?: number }): Promise<Facility[]> {
    let allFacilities = await db.select().from(facilities);
    
    // Filter by type if specified
    if (params.type) {
      allFacilities = allFacilities.filter(f => f.type === params.type);
    }
    
    // Filter by distance if coordinates and radius are provided
    if (params.coordinates && params.radius) {
      // Keep radius in kilometers - this is the fix!
      const radiusKm = params.radius;
      
      // Debug logging for POI search
      console.log('[DB-POI-SEARCH] Starting facility search:', {
        userLocation: params.coordinates,
        radiusKm: radiusKm,
        type: params.type || 'all',
        totalFacilities: allFacilities.length
      });
      
      // Map facilities with their distances
      const facilitiesWithDistance = allFacilities
        .map(facility => {
          if (!facility.coordinates) return null;
          
          try {
            const facilityCoords = typeof facility.coordinates === 'string' 
              ? JSON.parse(facility.coordinates) 
              : facility.coordinates;
            
            // calculateDistance returns miles (Earth radius = 3959 miles)
            const distanceInMiles = this.calculateDistance(params.coordinates!, facilityCoords);
            // Convert miles to kilometers
            const distanceInKm = distanceInMiles * 1.60934;
            
            // Debug log for each facility
            console.log(`[DB-POI-SEARCH] Facility "${facility.name}":`, {
              location: `(${facilityCoords.lat.toFixed(4)}, ${facilityCoords.lng.toFixed(4)})`,
              distanceKm: distanceInKm.toFixed(2),
              withinRadius: distanceInKm <= radiusKm
            });
            
            return {
              facility,
              distanceInMiles,
              distanceInKm
            };
          } catch (error) {
            console.error(`[DB-POI-SEARCH] Error parsing coordinates for facility ${facility.id}:`, error);
            return null;
          }
        })
        // Filter out facilities without valid coordinates
        .filter((item): item is { facility: any; distanceInMiles: number; distanceInKm: number } => item !== null)
        // CRITICAL FIX: Filter by kilometers, not miles!
        .filter(item => {
          const passes = item.distanceInKm <= radiusKm;
          if (!passes) {
            console.log(`[DB-POI-SEARCH] ❌ Filtered out "${item.facility.name}" - ${item.distanceInKm.toFixed(2)}km > ${radiusKm}km`);
          } else {
            console.log(`[DB-POI-SEARCH] ✅ Including "${item.facility.name}" - ${item.distanceInKm.toFixed(2)}km <= ${radiusKm}km`);
          }
          return passes;
        })
        // Sort by distance in kilometers (closest first)
        .sort((a, b) => a.distanceInKm - b.distanceInKm);
      
      console.log(`[DB-POI-SEARCH] Found ${facilitiesWithDistance.length} facilities within ${radiusKm}km radius`);
      
      // Return facilities with distance property added
      return facilitiesWithDistance.map(item => ({
        ...item.facility,
        // Add distance in both units for flexibility
        distance: item.distanceInKm, // Distance in kilometers for display
        distanceMiles: item.distanceInMiles // Distance in miles if needed
      }));
    }
    
    return allFacilities;
  }

  // Helper methods for distance calculation (Haversine formula)
  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);
    const lat1 = this.toRad(coord1.lat);
    const lat2 = this.toRad(coord2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  // Routes
  async getRoute(id: string): Promise<Route | undefined> {
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    return route || undefined;
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const [created] = await db
      .insert(routes)
      .values(route)
      .returning();
    return created;
  }

  async getFavoriteRoutes(): Promise<Route[]> {
    return await db.select().from(routes).where(eq(routes.isFavorite, true));
  }

  async updateRoute(id: string, updates: Partial<Route>): Promise<Route | undefined> {
    const [updated] = await db
      .update(routes)
      .set(updates)
      .where(eq(routes.id, id))
      .returning();
    return updated || undefined;
  }

  // Traffic Incidents
  async getTrafficIncident(id: string): Promise<TrafficIncident | undefined> {
    const [incident] = await db.select().from(trafficIncidents).where(eq(trafficIncidents.id, id));
    return incident || undefined;
  }

  async createTrafficIncident(incident: InsertTrafficIncident): Promise<TrafficIncident> {
    const reportedAt = new Date();
    const expiresAt = new Date(reportedAt.getTime() + 2 * 60 * 60 * 1000); // Expires 2 hours after reported
    const [created] = await db
      .insert(trafficIncidents)
      .values({ ...incident, reportedAt, expiresAt })
      .returning();
    return created;
  }

  async getTrafficIncidentsByArea(bounds: { north: number; south: number; east: number; west: number }): Promise<TrafficIncident[]> {
    // Return all active, non-expired incidents
    const now = new Date();
    return await db.select().from(trafficIncidents).where(
      and(
        eq(trafficIncidents.isActive, true),
        or(
          sql`${trafficIncidents.expiresAt} IS NULL`,
          gt(trafficIncidents.expiresAt, now)
        )
      )
    );
  }

  async getActiveTrafficIncidents(): Promise<TrafficIncident[]> {
    // Return all active, non-expired incidents
    const now = new Date();
    return await db.select().from(trafficIncidents).where(
      and(
        eq(trafficIncidents.isActive, true),
        or(
          sql`${trafficIncidents.expiresAt} IS NULL`,
          gt(trafficIncidents.expiresAt, now)
        )
      )
    );
  }

  async updateTrafficIncident(id: string, updates: Partial<TrafficIncident>): Promise<TrafficIncident | undefined> {
    const [updated] = await db
      .update(trafficIncidents)
      .set(updates)
      .where(eq(trafficIncidents.id, id))
      .returning();
    return updated || undefined;
  }

  async resolveTrafficIncident(id: string): Promise<TrafficIncident | undefined> {
    const [updated] = await db
      .update(trafficIncidents)
      .set({ isActive: false, resolvedAt: new Date() })
      .where(eq(trafficIncidents.id, id))
      .returning();
    return updated || undefined;
  }

  async verifyTrafficIncident(id: string): Promise<TrafficIncident | undefined> {
    const [updated] = await db
      .update(trafficIncidents)
      .set({ isVerified: true })
      .where(eq(trafficIncidents.id, id))
      .returning();
    return updated || undefined;
  }

  // New Traffic Incident Methods for User-Reported Incidents
  async createIncident(incident: InsertTrafficIncident): Promise<TrafficIncident> {
    return this.createTrafficIncident(incident);
  }

  async getIncidentsNearLocation(lat: number, lng: number, radiusKm: number): Promise<TrafficIncident[]> {
    const now = new Date();
    const allActiveIncidents = await db.select().from(trafficIncidents).where(
      and(
        eq(trafficIncidents.isActive, true),
        or(
          sql`${trafficIncidents.expiresAt} IS NULL`,
          gt(trafficIncidents.expiresAt, now)
        )
      )
    );
    
    return allActiveIncidents.filter(incident => {
      if (!incident.coordinates) return false;
      const coords = incident.coordinates as { lat: number; lng: number };
      const R = 6371; // Earth's radius in km
      const dLat = this.toRad(coords.lat - lat);
      const dLon = this.toRad(coords.lng - lng);
      const lat1 = this.toRad(lat);
      const lat2 = this.toRad(coords.lat);

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      
      return distance <= radiusKm;
    });
  }

  async getAllActiveIncidents(): Promise<TrafficIncident[]> {
    const now = new Date();
    return await db.select()
      .from(trafficIncidents)
      .where(
        and(
          eq(trafficIncidents.isActive, true),
          or(
            sql`${trafficIncidents.expiresAt} IS NULL`,
            gt(trafficIncidents.expiresAt, now)
          )
        )
      );
  }

  async deleteOldIncidents(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deleted = await db
      .delete(trafficIncidents)
      .where(lte(trafficIncidents.reportedAt, twentyFourHoursAgo))
      .returning();
    return deleted.length;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db
      .insert(users)
      .values(user)
      .returning();
    return created;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Subscription Plans
  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan || undefined;
  }

  async getSubscriptionPlanByStripeId(stripePriceId: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.stripePriceId, stripePriceId));
    return plan || undefined;
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  }

  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [created] = await db
      .insert(subscriptionPlans)
      .values(plan)
      .returning();
    return created;
  }

  // User Subscriptions
  async getUserSubscription(id: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.id, id));
    return subscription || undefined;
  }

  async getUserSubscriptionByUserId(userId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    return subscription || undefined;
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription || undefined;
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [created] = await db
      .insert(userSubscriptions)
      .values(subscription)
      .returning();
    return created;
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const [updated] = await db
      .update(userSubscriptions)
      .set(updates)
      .where(eq(userSubscriptions.id, id))
      .returning();
    return updated || undefined;
  }

  async cancelUserSubscription(id: string): Promise<UserSubscription | undefined> {
    const [updated] = await db
      .update(userSubscriptions)
      .set({ status: 'canceled', canceledAt: new Date() })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return updated || undefined;
  }

  // Locations
  async getLocations(options?: { favorites?: boolean }): Promise<Location[]> {
    let query = db.select().from(locations);
    
    if (options?.favorites) {
      query = query.where(eq(locations.isFavorite, true));
    }
    
    return await query.orderBy(desc(locations.lastUsedAt));
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [created] = await db
      .insert(locations)
      .values(location)
      .returning();
    return created;
  }

  async updateLocation(id: number, updates: Partial<Location>): Promise<Location | undefined> {
    const [updated] = await db
      .update(locations)
      .set(updates)
      .where(eq(locations.id, id))
      .returning();
    return updated || undefined;
  }

  async markLocationUsed(id: number): Promise<Location | undefined> {
    const [updated] = await db
      .update(locations)
      .set({ 
        useCount: sql`${locations.useCount} + 1`,
        lastUsedAt: new Date() 
      })
      .where(eq(locations.id, id))
      .returning();
    return updated || undefined;
  }

  async upsertByLabelOrCoords(location: InsertLocation): Promise<Location> {
    // For now, just create a new location. In a real implementation, you would check for existing by label or coordinates
    return await this.createLocation(location);
  }

  // Journeys
  async getJourney(id: number): Promise<Journey | undefined> {
    const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
    return journey || undefined;
  }

  async getJourneyByIdempotencyKey(key: string, sessionId: string): Promise<Journey | undefined> {
    const [journey] = await db.select().from(journeys)
      .where(and(
        eq(journeys.idempotencyKey, key),
        eq(journeys.sessionId, sessionId)
      ));
    return journey || undefined;
  }

  async startJourney(routeId: string, idempotencyKey?: string, sessionId?: string): Promise<Journey> {
    const [created] = await db
      .insert(journeys)
      .values({ 
        routeId, 
        status: 'planned',
        idempotencyKey,
        sessionId,
        startedAt: new Date()
      })
      .returning();
    return created;
  }

  async activateJourney(id: number, idempotencyKey?: string, sessionId?: string): Promise<Journey | undefined> {
    const [updated] = await db
      .update(journeys)
      .set({ status: 'active' })
      .where(eq(journeys.id, id))
      .returning();
    return updated || undefined;
  }

  async completeJourney(id: number): Promise<Journey | undefined> {
    const [updated] = await db
      .update(journeys)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(journeys.id, id))
      .returning();
    return updated || undefined;
  }

  async getLastJourney(): Promise<Journey | undefined> {
    const [journey] = await db
      .select()
      .from(journeys)
      .orderBy(desc(journeys.startedAt))
      .limit(1);
    return journey || undefined;
  }

  async getJourneyHistory(limit?: number, offset?: number): Promise<Journey[]> {
    let query = db.select().from(journeys).orderBy(desc(journeys.startedAt));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.offset(offset);
    }
    
    return await query;
  }

  // Stub implementations for methods that aren't critical for basic functionality
  // These would need to be implemented for full functionality
  
  async getLaneGuidance(routeId: string): Promise<LaneSegment[] | null> {
    // Check if route exists
    const [route] = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);
    if (!route) return null;
    
    // Generate realistic lane guidance for London-Birmingham route scenarios
    const laneSegments: LaneSegment[] = [];
    const totalDistance = route.distance || 186; // Default to London-Birmingham distance
    const segmentCount = Math.min(Math.max(Math.floor(totalDistance / 25), 3), 6); // 3-6 segments

    for (let i = 0; i < segmentCount; i++) {
      const segmentDistance = totalDistance - (totalDistance / segmentCount * i);
      const isLastSegment = i === segmentCount - 1;
      const isFirstSegment = i === 0;
      
      let maneuverType: LaneSegment['maneuverType'];
      let totalLanes: number;
      let roadName: string;
      let laneOptions: LaneOption[];
      
      if (isFirstSegment) {
        // Starting maneuver - merge onto motorway
        maneuverType = 'merge';
        totalLanes = 4;
        roadName = 'M40 London-Birmingham';
        laneOptions = [
          { index: 0, direction: 'left', restrictions: ['no-trucks'], recommended: false },
          { index: 1, direction: 'straight', recommended: true },
          { index: 2, direction: 'straight', recommended: true },
          { index: 3, direction: 'right', restrictions: ['exit-only'], recommended: false }
        ];
      } else if (isLastSegment) {
        // Final approach maneuver
        maneuverType = 'exit';
        totalLanes = 3;
        roadName = 'A34 Birmingham Exit';
        laneOptions = [
          { index: 0, direction: 'left', restrictions: ['weight-limit'], recommended: false },
          { index: 1, direction: 'exit', recommended: true },
          { index: 2, direction: 'straight', recommended: false }
        ];
      } else if (i === 1) {
        // Junction maneuver
        maneuverType = 'turn-right';
        totalLanes = 3;
        roadName = 'M25 Junction 16';
        laneOptions = [
          { index: 0, direction: 'straight', recommended: false },
          { index: 1, direction: 'right', recommended: true },
          { index: 2, direction: 'right', recommended: true }
        ];
      } else if (i === 2) {
        // Motorway continuation with restricted lane
        maneuverType = 'straight';
        totalLanes = 4;
        roadName = 'M40 Motorway';
        laneOptions = [
          { index: 0, direction: 'straight', restrictions: ['cars-only'], recommended: false },
          { index: 1, direction: 'straight', recommended: true },
          { index: 2, direction: 'straight', recommended: true },
          { index: 3, direction: 'straight', restrictions: ['hgv-prohibited'], recommended: false }
        ];
      } else {
        // Standard motorway section
        maneuverType = 'straight';
        totalLanes = 3;
        roadName = 'M40 Motorway';
        laneOptions = [
          { index: 0, direction: 'straight', recommended: false },
          { index: 1, direction: 'straight', recommended: true },
          { index: 2, direction: 'straight', recommended: true }
        ];
      }

      laneSegments.push({
        stepIndex: i,
        roadName,
        maneuverType,
        distance: segmentDistance,
        totalLanes,
        laneOptions,
        advisory: i === 0 ? 'Merge onto motorway safely' : 
                  isLastSegment ? 'Prepare for exit' : 
                  'Continue on motorway'
      });
    }

    return laneSegments;
  }

  async setLaneSelection(routeId: string, selections: Record<number, number>): Promise<void> {
    // No-op for now
  }

  async generateLaneGuidance(route: Route, vehicleProfile: VehicleProfile): Promise<LaneSegment[]> {
    // Return empty array for now
    return [];
  }

  async searchPostcode(postcode: string, country?: string): Promise<PostcodeResult[]> {
    if (!postcode || postcode.trim().length === 0) {
      return [];
    }

    // Normalize the search term (remove spaces, convert to uppercase)
    const normalizedSearch = postcode.replace(/\s+/g, '').toUpperCase();
    const results: PostcodeResult[] = [];

    // Search through the postcode database
    for (const [key, postcodeData] of Array.from(this.postcodeDatabase.entries())) {
      const matches = this.isPostcodeMatch(key, postcodeData, normalizedSearch, country);
      if (matches) {
        results.push(postcodeData);
      }
    }

    // Sort by confidence score (highest first) and limit results
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Limit to top 10 results
  }

  async geocodePostcode(postcode: string, country?: string): Promise<PostcodeResult | null> {
    if (!postcode || postcode.trim().length === 0) {
      return null;
    }

    // Normalize the postcode for exact lookup
    const normalizedPostcode = postcode.replace(/\s+/g, '').toUpperCase();
    
    // Try exact match first
    const exactMatch = this.postcodeDatabase.get(normalizedPostcode);
    if (exactMatch && (!country || exactMatch.country === country)) {
      return exactMatch;
    }

    // Try partial matching for formats that support it (like UK postcodes)
    for (const [key, postcodeData] of Array.from(this.postcodeDatabase.entries())) {
      if (this.isPostcodeMatch(key, postcodeData, normalizedPostcode, country, true)) {
        return postcodeData;
      }
    }

    return null;
  }

  private isPostcodeMatch(
    key: string, 
    postcodeData: PostcodeResult, 
    searchTerm: string, 
    country?: string,
    exactOnly: boolean = false
  ): boolean {
    // Filter by country if specified
    if (country && postcodeData.country !== country) {
      return false;
    }

    // Exact match
    if (key === searchTerm || postcodeData.postcode === searchTerm) {
      return true;
    }

    // Skip partial matching if exactOnly is true
    if (exactOnly) {
      return false;
    }

    // Partial matching for different postcode formats
    if (postcodeData.country === 'UK') {
      // UK: Allow matching on district (first part before space)
      // e.g., "SW1A" should match "SW1A 1AA"
      const ukDistrict = postcodeData.postcode.split(/\s/)[0];
      if (ukDistrict && searchTerm.startsWith(ukDistrict.replace(/\s+/g, '').toUpperCase())) {
        return true;
      }
    }

    // Contains matching for addresses and cities
    const searchLower = searchTerm.toLowerCase();
    return Boolean(
      postcodeData.address?.toLowerCase().includes(searchLower) ||
      postcodeData.city?.toLowerCase().includes(searchLower) ||
      postcodeData.region?.toLowerCase().includes(searchLower)
    );
  }

  // Traffic re-routing stubs (would be implemented later)
  async createRouteMonitoring(monitoring: InsertRouteMonitoring): Promise<RouteMonitoring> {
    throw new Error("Route monitoring not implemented in database storage yet");
  }

  async getRouteMonitoring(id: string): Promise<RouteMonitoring | undefined> {
    return undefined;
  }

  async getActiveRouteMonitoring(): Promise<RouteMonitoring[]> {
    return [];
  }

  async getRouteMonitoringByRoute(routeId: string): Promise<RouteMonitoring | undefined> {
    return undefined;
  }

  async getRouteMonitoringByJourney(journeyId: number): Promise<RouteMonitoring | undefined> {
    return undefined;
  }

  async updateRouteMonitoring(id: string, updates: Partial<RouteMonitoring>): Promise<RouteMonitoring | undefined> {
    return undefined;
  }

  async stopRouteMonitoring(id: string): Promise<boolean> {
    return true;
  }

  async createAlternativeRoute(route: InsertAlternativeRouteDB): Promise<AlternativeRouteDB> {
    throw new Error("Alternative routes not implemented in database storage yet");
  }

  async getAlternativeRoute(id: string): Promise<AlternativeRouteDB | undefined> {
    return undefined;
  }

  async getAlternativeRoutesByOriginal(originalRouteId: string): Promise<AlternativeRouteDB[]> {
    return [];
  }

  async getActiveAlternativeRoutes(originalRouteId: string): Promise<AlternativeRouteDB[]> {
    return [];
  }

  async updateAlternativeRoute(id: string, updates: Partial<AlternativeRouteDB>): Promise<AlternativeRouteDB | undefined> {
    return undefined;
  }

  async deactivateAlternativeRoute(id: string): Promise<boolean> {
    return true;
  }

  async cleanupExpiredAlternatives(): Promise<number> {
    return 0;
  }

  async createReRoutingEvent(event: InsertReRoutingEventDB): Promise<ReRoutingEventDB> {
    throw new Error("Re-routing events not implemented in database storage yet");
  }

  async getReRoutingEvent(id: string): Promise<ReRoutingEventDB | undefined> {
    return undefined;
  }

  async getReRoutingEventsByJourney(journeyId: number): Promise<ReRoutingEventDB[]> {
    return [];
  }

  async getReRoutingEventsByRoute(routeId: string): Promise<ReRoutingEventDB[]> {
    return [];
  }

  async updateReRoutingEvent(id: string, updates: Partial<ReRoutingEventDB>): Promise<ReRoutingEventDB | undefined> {
    return undefined;
  }

  async getReRoutingStats(routeId?: string, timeframe?: 'day' | 'week' | 'month'): Promise<{
    totalEvents: number;
    acceptedEvents: number;
    declinedEvents: number;
    averageTimeSavings: number;
    effectivenessScore: number;
  }> {
    return {
      totalEvents: 0,
      acceptedEvents: 0,
      declinedEvents: 0,
      averageTimeSavings: 0,
      effectivenessScore: 0,
    };
  }

  async storeTrafficConditions(routeId: string, conditions: TrafficCondition[]): Promise<void> {
    // No-op for now
  }

  async getTrafficConditions(routeId: string): Promise<TrafficCondition[]> {
    return [];
  }

  async getTrafficHistory(routeId: string, hours: number): Promise<Array<{
    timestamp: Date;
    conditions: TrafficCondition[];
    averageDelay: number;
  }>> {
    return [];
  }

  async cleanupTrafficHistory(hoursToKeep: number): Promise<number> {
    return 0;
  }

  // ===== PREDICTIVE TRAFFIC ANALYSIS (Database) =====
  async recordTrafficObservation(observation: InsertTrafficObservation): Promise<TrafficObservation> {
    const [result] = await db.insert(trafficObservations).values(observation).returning();
    
    // Also aggregate into historical data
    const timestamp = observation.timestamp || new Date();
    const dayOfWeek = timestamp.getDay();
    const hourOfDay = timestamp.getHours();
    
    await this.upsertHistoricalTrafficData({
      roadSegmentId: observation.roadSegmentId,
      latitude: observation.latitude,
      longitude: observation.longitude,
      dayOfWeek,
      hourOfDay,
      averageSpeed: observation.observedSpeed,
      freeFlowSpeed: observation.freeFlowSpeed || observation.observedSpeed * 1.2,
      congestionLevel: observation.congestionLevel || 0,
      sampleCount: 1,
    });
    
    return result;
  }

  async getTrafficObservations(roadSegmentId: string, limit?: number): Promise<TrafficObservation[]> {
    const query = db.select().from(trafficObservations)
      .where(eq(trafficObservations.roadSegmentId, roadSegmentId))
      .orderBy(desc(trafficObservations.timestamp));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async aggregateHistoricalData(roadSegmentId: string, dayOfWeek: number, hourOfDay: number): Promise<HistoricalTrafficData | undefined> {
    const [result] = await db.select().from(historicalTrafficData)
      .where(and(
        eq(historicalTrafficData.roadSegmentId, roadSegmentId),
        eq(historicalTrafficData.dayOfWeek, dayOfWeek),
        eq(historicalTrafficData.hourOfDay, hourOfDay)
      ));
    return result;
  }

  async upsertHistoricalTrafficData(data: InsertHistoricalTrafficData): Promise<HistoricalTrafficData> {
    const existing = await this.aggregateHistoricalData(data.roadSegmentId, data.dayOfWeek, data.hourOfDay);
    
    if (existing) {
      const newSampleCount = existing.sampleCount + (data.sampleCount || 1);
      const newAvgSpeed = (existing.averageSpeed * existing.sampleCount + data.averageSpeed * (data.sampleCount || 1)) / newSampleCount;
      const newCongestion = (existing.congestionLevel * existing.sampleCount + data.congestionLevel * (data.sampleCount || 1)) / newSampleCount;
      const newDelay = ((existing.averageDelayMinutes || 0) * existing.sampleCount + (data.averageDelayMinutes || 0) * (data.sampleCount || 1)) / newSampleCount;
      
      const [updated] = await db.update(historicalTrafficData)
        .set({
          averageSpeed: newAvgSpeed,
          congestionLevel: newCongestion,
          sampleCount: newSampleCount,
          averageDelayMinutes: newDelay,
          lastUpdated: new Date(),
        })
        .where(eq(historicalTrafficData.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(historicalTrafficData).values({
        ...data,
        sampleCount: data.sampleCount || 1,
      }).returning();
      return created;
    }
  }

  async getHistoricalTrafficPatterns(roadSegmentId: string): Promise<HistoricalTrafficData[]> {
    return await db.select().from(historicalTrafficData)
      .where(eq(historicalTrafficData.roadSegmentId, roadSegmentId))
      .orderBy(asc(historicalTrafficData.dayOfWeek), asc(historicalTrafficData.hourOfDay));
  }

  async getTrafficPrediction(routeId: string, predictionTime: Date): Promise<TrafficPrediction | undefined> {
    const hourStart = new Date(predictionTime);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);
    
    const [result] = await db.select().from(trafficPredictions)
      .where(and(
        eq(trafficPredictions.routeId, routeId),
        gte(trafficPredictions.predictionTime, hourStart),
        lte(trafficPredictions.predictionTime, hourEnd),
        gte(trafficPredictions.expiresAt, new Date())
      ))
      .orderBy(desc(trafficPredictions.createdAt))
      .limit(1);
    return result;
  }

  async cacheTrafficPrediction(prediction: InsertTrafficPrediction): Promise<TrafficPrediction> {
    const [result] = await db.insert(trafficPredictions).values(prediction).returning();
    return result;
  }

  async cleanupExpiredPredictions(): Promise<number> {
    const result = await db.delete(trafficPredictions)
      .where(lte(trafficPredictions.expiresAt, new Date()));
    return 0; // Drizzle doesn't return count easily
  }

  async getHistoricalDataForTimeSlot(dayOfWeek: number, hourOfDay: number, bounds?: { north: number; south: number; east: number; west: number }): Promise<HistoricalTrafficData[]> {
    let query = db.select().from(historicalTrafficData)
      .where(and(
        eq(historicalTrafficData.dayOfWeek, dayOfWeek),
        eq(historicalTrafficData.hourOfDay, hourOfDay)
      ));
    
    if (bounds) {
      query = db.select().from(historicalTrafficData)
        .where(and(
          eq(historicalTrafficData.dayOfWeek, dayOfWeek),
          eq(historicalTrafficData.hourOfDay, hourOfDay),
          gte(historicalTrafficData.latitude, bounds.south),
          lte(historicalTrafficData.latitude, bounds.north),
          gte(historicalTrafficData.longitude, bounds.west),
          lte(historicalTrafficData.longitude, bounds.east)
        ));
    }
    
    return await query;
  }

  // Driver Behavior Profile methods (Database)
  async getDriverBehaviorProfile(sessionId: string): Promise<DriverBehaviorProfile | undefined> {
    const [profile] = await db.select().from(driverBehaviorProfiles).where(eq(driverBehaviorProfiles.sessionId, sessionId)).limit(1);
    return profile;
  }

  async upsertDriverBehaviorProfile(profile: InsertDriverBehaviorProfile): Promise<DriverBehaviorProfile> {
    const existing = await this.getDriverBehaviorProfile(profile.sessionId);
    if (existing) {
      const [updated] = await db.update(driverBehaviorProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(driverBehaviorProfiles.sessionId, profile.sessionId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(driverBehaviorProfiles).values(profile).returning();
    return created;
  }

  // Entertainment stubs (would be implemented later)
  async getEntertainmentStation(id: string): Promise<EntertainmentStation | undefined> {
    return undefined;
  }

  async createEntertainmentStation(station: InsertEntertainmentStation): Promise<EntertainmentStation> {
    throw new Error("Entertainment stations not implemented in database storage yet");
  }

  async getAllEntertainmentStations(params?: { platform?: string; type?: string; trucking?: boolean; limit?: number }): Promise<EntertainmentStation[]> {
    return [];
  }

  async searchEntertainmentStations(query: string, params?: { platform?: string; type?: string; limit?: number }): Promise<EntertainmentStation[]> {
    return [];
  }

  async updateEntertainmentStation(id: string, updates: Partial<EntertainmentStation>): Promise<EntertainmentStation | undefined> {
    return undefined;
  }

  async deleteEntertainmentStation(id: string): Promise<boolean> {
    return true;
  }

  async getEntertainmentPreset(id: number): Promise<EntertainmentPreset | undefined> {
    return undefined;
  }

  async createEntertainmentPreset(preset: InsertEntertainmentPreset): Promise<EntertainmentPreset> {
    throw new Error("Entertainment presets not implemented in database storage yet");
  }

  async getAllEntertainmentPresets(userId?: string): Promise<EntertainmentPreset[]> {
    return [];
  }

  async updateEntertainmentPreset(id: number, updates: Partial<EntertainmentPreset>): Promise<EntertainmentPreset | undefined> {
    return undefined;
  }

  async deleteEntertainmentPreset(id: number): Promise<boolean> {
    return true;
  }

  async getEntertainmentHistory(userId?: string, limit?: number): Promise<EntertainmentHistory[]> {
    return [];
  }

  async createEntertainmentHistory(history: InsertEntertainmentHistory): Promise<EntertainmentHistory> {
    throw new Error("Entertainment history not implemented in database storage yet");
  }

  async clearEntertainmentHistory(userId?: string): Promise<number> {
    return 0;
  }

  async getEntertainmentPlaybackState(): Promise<EntertainmentPlaybackState | undefined> {
    return undefined;
  }

  async updateEntertainmentPlaybackState(state: InsertEntertainmentPlaybackState): Promise<EntertainmentPlaybackState> {
    throw new Error("Entertainment playback state not implemented in database storage yet");
  }

  async getEntertainmentSettings(): Promise<EntertainmentSettings> {
    return {
      defaultVolume: 0.8,
      autoPlay: false,
      crossfadeEnabled: false,
      crossfadeDuration: 3,
      backgroundPlayEnabled: true,
      voiceControlEnabled: true,
      showTruckingStationsFirst: true,
      preferredGenres: ['news', 'talk', 'music'],
      maxHistoryItems: 50,
      audioQuality: 'medium',
      emergencyInterruptEnabled: true,
    };
  }

  async updateEntertainmentSettings(settings: Partial<EntertainmentSettings>): Promise<EntertainmentSettings> {
    return await this.getEntertainmentSettings();
  }

  // ==================== FLEET MANAGEMENT IMPLEMENTATIONS ====================

  // Fleet Vehicles
  async getFleetVehicle(id: string): Promise<FleetVehicle | undefined> {
    const result = await db.select().from(fleetVehicles).where(eq(fleetVehicles.id, id)).limit(1);
    return result[0];
  }

  async getAllFleetVehicles(): Promise<FleetVehicle[]> {
    return await db.select().from(fleetVehicles).orderBy(desc(fleetVehicles.createdAt));
  }

  async getActiveFleetVehicles(): Promise<FleetVehicle[]> {
    return await db.select().from(fleetVehicles).where(eq(fleetVehicles.status, 'active')).orderBy(asc(fleetVehicles.registration));
  }

  async createFleetVehicle(vehicle: InsertFleetVehicle): Promise<FleetVehicle> {
    const result = await db.insert(fleetVehicles).values(vehicle).returning();
    return result[0];
  }

  async updateFleetVehicle(id: string, updates: Partial<FleetVehicle>): Promise<FleetVehicle | undefined> {
    const result = await db.update(fleetVehicles).set({ ...updates, updatedAt: new Date() }).where(eq(fleetVehicles.id, id)).returning();
    return result[0];
  }

  async deleteFleetVehicle(id: string): Promise<boolean> {
    const result = await db.delete(fleetVehicles).where(eq(fleetVehicles.id, id));
    return true;
  }

  // Operators
  async getOperator(id: string): Promise<Operator | undefined> {
    const result = await db.select().from(operators).where(eq(operators.id, id)).limit(1);
    return result[0];
  }

  async getAllOperators(): Promise<Operator[]> {
    return await db.select().from(operators).orderBy(asc(operators.lastName), asc(operators.firstName));
  }

  async getActiveOperators(): Promise<Operator[]> {
    return await db.select().from(operators).where(eq(operators.status, 'active')).orderBy(asc(operators.lastName), asc(operators.firstName));
  }

  async createOperator(operator: InsertOperator): Promise<Operator> {
    const result = await db.insert(operators).values(operator).returning();
    return result[0];
  }

  async updateOperator(id: string, updates: Partial<Operator>): Promise<Operator | undefined> {
    const result = await db.update(operators).set({ ...updates, updatedAt: new Date() }).where(eq(operators.id, id)).returning();
    return result[0];
  }

  async deleteOperator(id: string): Promise<boolean> {
    await db.delete(operators).where(eq(operators.id, id));
    return true;
  }

  // Service Records
  async getServiceRecord(id: string): Promise<ServiceRecord | undefined> {
    const result = await db.select().from(serviceRecords).where(eq(serviceRecords.id, id)).limit(1);
    return result[0];
  }

  async getServiceRecordsByVehicle(vehicleId: string): Promise<ServiceRecord[]> {
    return await db.select().from(serviceRecords).where(eq(serviceRecords.vehicleId, vehicleId)).orderBy(desc(serviceRecords.serviceDate));
  }

  async getUpcomingServices(daysAhead: number = 30): Promise<ServiceRecord[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return await db.select()
      .from(serviceRecords)
      .where(
        and(
          lte(serviceRecords.nextServiceDue, futureDate),
          gte(serviceRecords.nextServiceDue, new Date())
        )
      )
      .orderBy(asc(serviceRecords.nextServiceDue));
  }

  async createServiceRecord(record: InsertServiceRecord): Promise<ServiceRecord> {
    const result = await db.insert(serviceRecords).values(record).returning();
    return result[0];
  }

  async updateServiceRecord(id: string, updates: Partial<ServiceRecord>): Promise<ServiceRecord | undefined> {
    const result = await db.update(serviceRecords).set(updates).where(eq(serviceRecords.id, id)).returning();
    return result[0];
  }

  async deleteServiceRecord(id: string): Promise<boolean> {
    await db.delete(serviceRecords).where(eq(serviceRecords.id, id));
    return true;
  }

  // Fuel Logs
  async getFuelLog(id: string): Promise<FuelLog | undefined> {
    const result = await db.select().from(fuelLogs).where(eq(fuelLogs.id, id)).limit(1);
    return result[0];
  }

  async getFuelLogsByVehicle(vehicleId: string, limit: number = 50): Promise<FuelLog[]> {
    return await db.select().from(fuelLogs).where(eq(fuelLogs.vehicleId, vehicleId)).orderBy(desc(fuelLogs.fillDate)).limit(limit);
  }

  async createFuelLog(log: InsertFuelLog): Promise<FuelLog> {
    const result = await db.insert(fuelLogs).values(log).returning();
    return result[0];
  }

  async updateFuelLog(id: string, updates: Partial<FuelLog>): Promise<FuelLog | undefined> {
    const result = await db.update(fuelLogs).set(updates).where(eq(fuelLogs.id, id)).returning();
    return result[0];
  }

  async deleteFuelLog(id: string): Promise<boolean> {
    await db.delete(fuelLogs).where(eq(fuelLogs.id, id));
    return true;
  }

  async getVehicleFuelEfficiency(vehicleId: string): Promise<{ averageMPG: number; totalFuelCost: number; totalLiters: number }> {
    const logs = await db.select().from(fuelLogs).where(eq(fuelLogs.vehicleId, vehicleId));
    
    if (logs.length === 0) {
      return { averageMPG: 0, totalFuelCost: 0, totalLiters: 0 };
    }

    const totalLiters = logs.reduce((sum, log) => sum + (log.liters || 0), 0);
    const totalCost = logs.reduce((sum, log) => sum + parseFloat(log.totalCost?.toString() || '0'), 0);
    const mpgLogs = logs.filter(log => log.mpg && log.mpg > 0);
    const averageMPG = mpgLogs.length > 0 ? mpgLogs.reduce((sum, log) => sum + (log.mpg || 0), 0) / mpgLogs.length : 0;

    return { averageMPG, totalFuelCost: totalCost, totalLiters };
  }

  // Vehicle Assignments
  async getActiveAssignment(vehicleId: string): Promise<VehicleAssignment | undefined> {
    const result = await db.select().from(vehicleAssignments)
      .where(and(eq(vehicleAssignments.vehicleId, vehicleId), eq(vehicleAssignments.isActive, true)))
      .limit(1);
    return result[0];
  }

  async getOperatorAssignment(operatorId: string): Promise<VehicleAssignment | undefined> {
    const result = await db.select().from(vehicleAssignments)
      .where(and(eq(vehicleAssignments.operatorId, operatorId), eq(vehicleAssignments.isActive, true)))
      .limit(1);
    return result[0];
  }

  async assignVehicle(assignment: InsertVehicleAssignment): Promise<VehicleAssignment> {
    await db.update(vehicleAssignments)
      .set({ isActive: false, unassignedAt: new Date() })
      .where(and(eq(vehicleAssignments.vehicleId, assignment.vehicleId), eq(vehicleAssignments.isActive, true)));
    
    await db.update(vehicleAssignments)
      .set({ isActive: false, unassignedAt: new Date() })
      .where(and(eq(vehicleAssignments.operatorId, assignment.operatorId), eq(vehicleAssignments.isActive, true)));
    
    const result = await db.insert(vehicleAssignments).values(assignment).returning();
    return result[0];
  }

  async unassignVehicle(vehicleId: string): Promise<boolean> {
    await db.update(vehicleAssignments)
      .set({ isActive: false, unassignedAt: new Date() })
      .where(and(eq(vehicleAssignments.vehicleId, vehicleId), eq(vehicleAssignments.isActive, true)));
    return true;
  }

  // Social Network - Driver Profiles
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User | undefined> {
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => 
        value !== undefined && !Number.isNaN(value)
      )
    ) as Partial<User>;
    
    if (Object.keys(cleanedUpdates).length === 0) {
      const existing = await this.getUser(userId);
      return existing;
    }
    
    const result = await db.update(users).set(cleanedUpdates).where(eq(users.id, userId)).returning();
    return result[0];
  }

  async areUsersConnected(userId1: string, userId2: string): Promise<boolean> {
    if (!userId1 || !userId2) return false;
    
    const connection = await db.select()
      .from(driverConnections)
      .where(
        and(
          or(
            and(eq(driverConnections.requesterId, userId1), eq(driverConnections.receiverId, userId2)),
            and(eq(driverConnections.requesterId, userId2), eq(driverConnections.receiverId, userId1))
          ),
          eq(driverConnections.status, 'accepted')
        )
      )
      .limit(1);
    
    return connection.length > 0;
  }

  async getUserProfile(userId: string, currentUserId?: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const profile = result[0];
    
    if (!profile) {
      return undefined;
    }

    // Allow if viewing own profile
    if (currentUserId && userId === currentUserId) {
      return profile;
    }

    // Allow if profile is public
    if (profile.isPublicProfile) {
      return profile;
    }

    // Allow if users are connected
    if (currentUserId && await this.areUsersConnected(userId, currentUserId)) {
      return profile;
    }

    // Privacy check failed
    return undefined;
  }

  async searchDrivers(query: string, currentUserId?: string, limit: number = 20): Promise<User[]> {
    const allUsers = await db.select()
      .from(users)
      .where(
        or(
          ilike(users.firstName, `%${query}%`),
          ilike(users.lastName, `%${query}%`),
          ilike(users.username, `%${query}%`),
          ilike(users.companyName, `%${query}%`),
          ilike(users.truckType, `%${query}%`)
        )
      )
      .limit(limit * 2); // Fetch extra to account for filtering

    // Filter based on privacy rules
    const filteredUsers: User[] = [];
    for (const user of allUsers) {
      if (filteredUsers.length >= limit) break;
      
      // Skip current user
      if (currentUserId && user.id === currentUserId) continue;

      // Include if public profile
      if (user.isPublicProfile) {
        filteredUsers.push(user);
        continue;
      }

      // Include if already connected (even if not public)
      if (currentUserId && await this.areUsersConnected(user.id, currentUserId)) {
        filteredUsers.push(user);
        continue;
      }
    }

    return filteredUsers;
  }

  // Social Network - Driver Connections
  async sendConnectionRequest(requesterId: string, receiverId: string): Promise<DriverConnection> {
    // Check if receiver allows connection requests
    const receiver = await db.select().from(users).where(eq(users.id, receiverId)).limit(1);
    if (!receiver[0]) {
      throw new Error('User not found');
    }
    
    if (!receiver[0].allowConnectionRequests) {
      throw new Error('This user has disabled connection requests');
    }

    const existing = await db.select()
      .from(driverConnections)
      .where(
        or(
          and(eq(driverConnections.requesterId, requesterId), eq(driverConnections.receiverId, receiverId)),
          and(eq(driverConnections.requesterId, receiverId), eq(driverConnections.receiverId, requesterId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Connection request already exists');
    }

    const result = await db.insert(driverConnections).values({
      requesterId,
      receiverId,
      status: 'pending'
    }).returning();
    return result[0];
  }

  async acceptConnection(connectionId: string): Promise<DriverConnection | undefined> {
    const result = await db.update(driverConnections)
      .set({ status: 'accepted', respondedAt: new Date() })
      .where(eq(driverConnections.id, connectionId))
      .returning();
    return result[0];
  }

  async rejectConnection(connectionId: string): Promise<DriverConnection | undefined> {
    const result = await db.update(driverConnections)
      .set({ status: 'rejected', respondedAt: new Date() })
      .where(eq(driverConnections.id, connectionId))
      .returning();
    return result[0];
  }

  async getConnections(userId: string): Promise<DriverConnection[]> {
    return await db.select()
      .from(driverConnections)
      .where(
        and(
          or(
            eq(driverConnections.requesterId, userId),
            eq(driverConnections.receiverId, userId)
          ),
          eq(driverConnections.status, 'accepted')
        )
      )
      .orderBy(desc(driverConnections.createdAt));
  }

  async getPendingRequests(userId: string): Promise<DriverConnection[]> {
    return await db.select()
      .from(driverConnections)
      .where(
        and(
          eq(driverConnections.receiverId, userId),
          eq(driverConnections.status, 'pending')
        )
      )
      .orderBy(desc(driverConnections.requestedAt));
  }

  // Social Network - Shared Routes
  async shareRoute(userId: string, routeId: string, data: InsertSharedRoute): Promise<SharedRoute> {
    const result = await db.insert(sharedRoutes).values({
      ...data,
      userId,
      routeId
    }).returning();
    return result[0];
  }

  async getSharedRoutes(userId: string): Promise<SharedRoute[]> {
    return await db.select()
      .from(sharedRoutes)
      .where(eq(sharedRoutes.userId, userId))
      .orderBy(desc(sharedRoutes.sharedAt));
  }

  async getPublicRoutes(limit: number = 50): Promise<SharedRoute[]> {
    return await db.select()
      .from(sharedRoutes)
      .where(eq(sharedRoutes.isPublic, true))
      .orderBy(desc(sharedRoutes.sharedAt))
      .limit(limit);
  }

  async getConnectionRoutes(userId: string): Promise<SharedRoute[]> {
    const connections = await this.getConnections(userId);
    const connectionIds = connections.map(c => 
      c.requesterId === userId ? c.receiverId : c.requesterId
    );

    if (connectionIds.length === 0) {
      return [];
    }

    return await db.select()
      .from(sharedRoutes)
      .where(
        and(
          eq(sharedRoutes.shareWithConnections, true),
          sql`${sharedRoutes.userId} IN (${sql.join(connectionIds.map(id => sql`${id}`), sql`, `)})`
        )
      )
      .orderBy(desc(sharedRoutes.sharedAt));
  }

  async saveSharedRoute(userId: string, sharedRouteId: string): Promise<SavedRoute> {
    const existing = await db.select()
      .from(savedRoutes)
      .where(
        and(
          eq(savedRoutes.userId, userId),
          eq(savedRoutes.sharedRouteId, sharedRouteId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const result = await db.insert(savedRoutes).values({
      userId,
      sharedRouteId
    }).returning();
    return result[0];
  }

  async unsaveSharedRoute(userId: string, sharedRouteId: string): Promise<boolean> {
    await db.delete(savedRoutes)
      .where(
        and(
          eq(savedRoutes.userId, userId),
          eq(savedRoutes.sharedRouteId, sharedRouteId)
        )
      );
    return true;
  }

  async getSavedRoutes(userId: string): Promise<SavedRoute[]> {
    return await db.select()
      .from(savedRoutes)
      .where(eq(savedRoutes.userId, userId))
      .orderBy(desc(savedRoutes.savedAt));
  }

  async commentOnRoute(sharedRouteId: string, userId: string, comment: string, rating?: number): Promise<RouteComment> {
    const result = await db.insert(routeComments).values({
      sharedRouteId,
      userId,
      comment,
      rating: rating || null
    }).returning();
    return result[0];
  }

  async getRouteComments(sharedRouteId: string): Promise<RouteComment[]> {
    return await db.select()
      .from(routeComments)
      .where(eq(routeComments.sharedRouteId, sharedRouteId))
      .orderBy(desc(routeComments.createdAt));
  }

  // Vehicle Attachments
  async createVehicleAttachment(attachment: InsertVehicleAttachment): Promise<VehicleAttachment> {
    const result = await db.insert(vehicleAttachments).values(attachment).returning();
    return result[0];
  }

  async getVehicleAttachments(vehicleId: string): Promise<VehicleAttachment[]> {
    return await db.select()
      .from(vehicleAttachments)
      .where(eq(vehicleAttachments.vehicleId, vehicleId))
      .orderBy(desc(vehicleAttachments.uploadedAt));
  }

  async getVehicleAttachment(attachmentId: string): Promise<VehicleAttachment | undefined> {
    const result = await db.select()
      .from(vehicleAttachments)
      .where(eq(vehicleAttachments.id, attachmentId))
      .limit(1);
    return result[0];
  }

  async deleteVehicleAttachment(attachmentId: string): Promise<boolean> {
    await db.delete(vehicleAttachments)
      .where(eq(vehicleAttachments.id, attachmentId));
    return true;
  }

  // Incidents
  async createIncident(incident: InsertIncidentLog): Promise<IncidentLog> {
    const result = await db.insert(incidentLogs).values(incident).returning();
    return result[0];
  }

  async getIncidentsByVehicle(vehicleId: string): Promise<IncidentLog[]> {
    return await db.select().from(incidentLogs).where(eq(incidentLogs.vehicleId, vehicleId)).orderBy(desc(incidentLogs.reportedAt));
  }

  async getIncidentsByOperator(operatorId: string): Promise<IncidentLog[]> {
    return await db.select().from(incidentLogs).where(eq(incidentLogs.operatorId, operatorId)).orderBy(desc(incidentLogs.reportedAt));
  }

  async getIncident(id: string): Promise<IncidentLog | undefined> {
    const result = await db.select().from(incidentLogs).where(eq(incidentLogs.id, id)).limit(1);
    return result[0];
  }

  async updateIncident(id: string, updates: Partial<IncidentLog>): Promise<IncidentLog | undefined> {
    const result = await db.update(incidentLogs).set(updates).where(eq(incidentLogs.id, id)).returning();
    return result[0];
  }

  async deleteIncident(id: string): Promise<boolean> {
    await db.delete(incidentLogs).where(eq(incidentLogs.id, id));
    return true;
  }

  // Tachograph Compliance
  async createTachographInfringement(infringement: InsertTachographInfringement): Promise<TachographInfringement> {
    const result = await db.insert(tachographInfringements).values(infringement).returning();
    return result[0];
  }

  async getAllTachographInfringements(): Promise<TachographInfringement[]> {
    return await db.select().from(tachographInfringements).orderBy(desc(tachographInfringements.infringementDate));
  }

  async getTachographInfringementsByOperator(operatorId: string): Promise<TachographInfringement[]> {
    return await db.select().from(tachographInfringements)
      .where(eq(tachographInfringements.operatorId, operatorId))
      .orderBy(desc(tachographInfringements.infringementDate));
  }

  async getTachographInfringement(id: string): Promise<TachographInfringement | undefined> {
    const result = await db.select().from(tachographInfringements).where(eq(tachographInfringements.id, id)).limit(1);
    return result[0];
  }

  async updateTachographInfringement(id: string, updates: Partial<TachographInfringement>): Promise<TachographInfringement | undefined> {
    const result = await db.update(tachographInfringements).set({...updates, updatedAt: new Date()}).where(eq(tachographInfringements.id, id)).returning();
    return result[0];
  }

  async deleteTachographInfringement(id: string): Promise<boolean> {
    await db.delete(tachographInfringements).where(eq(tachographInfringements.id, id));
    return true;
  }

  async getOperatorComplianceScore(operatorId: string): Promise<{ score: number; totalPoints: number; infringementCount: number }> {
    // Get infringements from the last 12 months for rolling score
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const infringements = await db.select().from(tachographInfringements)
      .where(and(
        eq(tachographInfringements.operatorId, operatorId),
        gte(tachographInfringements.infringementDate, twelveMonthsAgo)
      ));
    
    const totalPoints = infringements.reduce((sum, inf) => sum + (inf.pointsDeducted || 0), 0);
    const infringementCount = infringements.length;
    
    // Score starts at 100 and decreases with points
    // Max 100 points can be deducted before hitting 0
    const score = Math.max(0, 100 - totalPoints);
    
    return { score, totalPoints, infringementCount };
  }

  // Cost Analytics
  async createCostRecord(cost: InsertCostAnalytics): Promise<CostAnalytics> {
    const result = await db.insert(costAnalytics).values(cost).returning();
    return result[0];
  }

  async getCostsByVehicle(vehicleId: string, startDate?: Date, endDate?: Date): Promise<CostAnalytics[]> {
    let query = db.select().from(costAnalytics).where(eq(costAnalytics.vehicleId, vehicleId));
    if (startDate && endDate) {
      query = query.where(and(gte(costAnalytics.occurrenceDate, startDate), lte(costAnalytics.occurrenceDate, endDate)));
    }
    return await query.orderBy(desc(costAnalytics.occurrenceDate));
  }

  async getVehicleTotalCosts(vehicleId: string): Promise<{ total: number; byType: Record<string, number> }> {
    const costs = await this.getCostsByVehicle(vehicleId);
    const total = costs.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);
    const byType: Record<string, number> = {};
    costs.forEach(c => {
      byType[c.costType] = (byType[c.costType] || 0) + parseFloat(c.amount.toString());
    });
    return { total, byType };
  }

  async deleteCostRecord(id: string): Promise<boolean> {
    await db.delete(costAnalytics).where(eq(costAnalytics.id, id));
    return true;
  }

  // Trip Tracking
  async createTrip(trip: InsertTripTracking): Promise<TripTracking> {
    const result = await db.insert(tripTracking).values(trip).returning();
    return result[0];
  }

  async getTripsByVehicle(vehicleId: string): Promise<TripTracking[]> {
    return await db.select().from(tripTracking).where(eq(tripTracking.vehicleId, vehicleId)).orderBy(desc(tripTracking.actualStartTime));
  }

  async getCompletedTrips(vehicleId: string): Promise<TripTracking[]> {
    return await db.select().from(tripTracking).where(and(eq(tripTracking.vehicleId, vehicleId), eq(tripTracking.status, 'completed'))).orderBy(desc(tripTracking.actualStartTime));
  }

  async getTrip(id: string): Promise<TripTracking | undefined> {
    const result = await db.select().from(tripTracking).where(eq(tripTracking.id, id)).limit(1);
    return result[0];
  }

  async updateTrip(id: string, updates: Partial<TripTracking>): Promise<TripTracking | undefined> {
    const result = await db.update(tripTracking).set(updates).where(eq(tripTracking.id, id)).returning();
    return result[0];
  }

  async getFleetTripAnalytics(): Promise<{ totalTrips: number; totalDistance: number; avgProfitMargin: number; totalRevenue: number }> {
    const trips = await db.select().from(tripTracking).where(eq(tripTracking.status, 'completed'));
    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum, t) => sum + (t.actualDistance || 0), 0);
    const totalRevenue = trips.reduce((sum, t) => sum + parseFloat(t.revenue?.toString() || '0'), 0);
    const avgProfitMargin = trips.length > 0 ? trips.reduce((sum, t) => sum + (t.profitMargin || 0), 0) / trips.length : 0;
    return { totalTrips, totalDistance, avgProfitMargin, totalRevenue };
  }

  // User Roles
  async getUserRole(userId: string): Promise<UserRole | undefined> {
    const result = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
    return result[0];
  }

  async setUserRole(userId: string, role: InsertUserRole): Promise<UserRole> {
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    const result = await db.insert(userRoles).values({ ...role, userId }).returning();
    return result[0];
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    return userRole?.permissions?.includes(permission) || false;
  }

  async getAllUserRoles(): Promise<UserRole[]> {
    return await db.select().from(userRoles).orderBy(asc(userRoles.role));
  }

  // Maintenance Prediction
  async createPrediction(prediction: InsertMaintenancePrediction): Promise<MaintenancePrediction> {
    const result = await db.insert(maintenancePrediction).values(prediction).returning();
    return result[0];
  }

  async getPredictionsByVehicle(vehicleId: string): Promise<MaintenancePrediction[]> {
    return await db.select().from(maintenancePrediction).where(eq(maintenancePrediction.vehicleId, vehicleId)).orderBy(asc(maintenancePrediction.predictedDate));
  }

  async getHighRiskPredictions(): Promise<MaintenancePrediction[]> {
    return await db.select().from(maintenancePrediction).where(or(eq(maintenancePrediction.riskLevel, 'high'), eq(maintenancePrediction.riskLevel, 'critical'))).orderBy(asc(maintenancePrediction.predictedDate));
  }

  // Compliance
  async createComplianceRecord(record: InsertComplianceRecord): Promise<ComplianceRecord> {
    const result = await db.insert(complianceRecords).values(record).returning();
    return result[0];
  }

  async getComplianceByVehicle(vehicleId: string): Promise<ComplianceRecord[]> {
    return await db.select().from(complianceRecords).where(eq(complianceRecords.vehicleId, vehicleId)).orderBy(asc(complianceRecords.recordType));
  }

  async getComplianceByOperator(operatorId: string): Promise<ComplianceRecord[]> {
    return await db.select().from(complianceRecords).where(eq(complianceRecords.operatorId, operatorId)).orderBy(asc(complianceRecords.recordType));
  }

  async getNonCompliantRecords(): Promise<ComplianceRecord[]> {
    return await db.select().from(complianceRecords).where(or(eq(complianceRecords.status, 'non_compliant'), eq(complianceRecords.status, 'expired'))).orderBy(asc(complianceRecords.nextCheckDue));
  }

  // ========================================
  // ENTERPRISE FEATURES - GPS TRACKING
  // ========================================

  async createGpsTrackingPoint(point: InsertGpsTracking): Promise<GpsTracking> {
    const result = await db.insert(gpsTracking).values(point).returning();
    return result[0];
  }

  async getVehicleTrackingHistory(vehicleId: string, startTime?: Date, endTime?: Date, limit: number = 100): Promise<GpsTracking[]> {
    let conditions = [eq(gpsTracking.vehicleId, vehicleId)];
    
    if (startTime) {
      conditions.push(gte(gpsTracking.timestamp, startTime));
    }
    if (endTime) {
      conditions.push(lte(gpsTracking.timestamp, endTime));
    }

    return await db.select()
      .from(gpsTracking)
      .where(and(...conditions))
      .orderBy(desc(gpsTracking.timestamp))
      .limit(limit);
  }

  async getLatestVehiclePosition(vehicleId: string): Promise<GpsTracking | undefined> {
    const result = await db.select()
      .from(gpsTracking)
      .where(eq(gpsTracking.vehicleId, vehicleId))
      .orderBy(desc(gpsTracking.timestamp))
      .limit(1);
    return result[0];
  }

  async getFleetPositions(): Promise<GpsTracking[]> {
    const subquery = db.select({
      vehicleId: gpsTracking.vehicleId,
      maxTimestamp: sql<Date>`MAX(${gpsTracking.timestamp})`.as('max_timestamp')
    })
      .from(gpsTracking)
      .groupBy(gpsTracking.vehicleId)
      .as('latest');

    const result = await db.select()
      .from(gpsTracking)
      .innerJoin(
        subquery,
        and(
          eq(gpsTracking.vehicleId, subquery.vehicleId),
          eq(gpsTracking.timestamp, subquery.maxTimestamp)
        )
      );

    return result.map(r => r.gps_tracking);
  }

  // ========================================
  // ENTERPRISE FEATURES - GEOFENCES
  // ========================================

  async createGeofence(geofence: InsertGeofence): Promise<Geofence> {
    const result = await db.insert(geofences).values(geofence).returning();
    return result[0];
  }

  async getGeofence(id: string): Promise<Geofence | undefined> {
    const result = await db.select()
      .from(geofences)
      .where(eq(geofences.id, id))
      .limit(1);
    return result[0];
  }

  async getUserGeofences(userId: string): Promise<Geofence[]> {
    return await db.select()
      .from(geofences)
      .where(eq(geofences.userId, userId))
      .orderBy(desc(geofences.createdAt));
  }

  async updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence | undefined> {
    const result = await db.update(geofences)
      .set(updates)
      .where(eq(geofences.id, id))
      .returning();
    return result[0];
  }

  async deleteGeofence(id: string): Promise<boolean> {
    await db.delete(geofences).where(eq(geofences.id, id));
    return true;
  }

  async createGeofenceEvent(event: InsertGeofenceEvent): Promise<GeofenceEvent> {
    const result = await db.insert(geofenceEvents).values(event).returning();
    return result[0];
  }

  async getGeofenceEvents(geofenceId: string, startTime?: Date, endTime?: Date): Promise<GeofenceEvent[]> {
    let conditions = [eq(geofenceEvents.geofenceId, geofenceId)];
    
    if (startTime) {
      conditions.push(gte(geofenceEvents.timestamp, startTime));
    }
    if (endTime) {
      conditions.push(lte(geofenceEvents.timestamp, endTime));
    }

    return await db.select()
      .from(geofenceEvents)
      .where(and(...conditions))
      .orderBy(desc(geofenceEvents.timestamp));
  }

  async getVehicleGeofenceEvents(vehicleId: string, limit: number = 50): Promise<GeofenceEvent[]> {
    return await db.select()
      .from(geofenceEvents)
      .where(eq(geofenceEvents.vehicleId, vehicleId))
      .orderBy(desc(geofenceEvents.timestamp))
      .limit(limit);
  }

  // ========================================
  // ENTERPRISE FEATURES - DRIVER BEHAVIOR
  // ========================================

  async createDriverBehaviorRecord(record: InsertDriverBehavior): Promise<DriverBehavior> {
    const result = await db.insert(driverBehavior).values(record).returning();
    return result[0];
  }

  async getDriverBehaviorRecords(operatorId: string, startDate?: Date, endDate?: Date): Promise<DriverBehavior[]> {
    let conditions = [eq(driverBehavior.operatorId, operatorId)];
    
    if (startDate) {
      conditions.push(gte(driverBehavior.behaviorDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(driverBehavior.behaviorDate, endDate));
    }

    return await db.select()
      .from(driverBehavior)
      .where(and(...conditions))
      .orderBy(desc(driverBehavior.behaviorDate));
  }

  async getDriverSafetyScore(operatorId: string): Promise<{ safetyScore: number; efficiencyScore: number; overallScore: number }> {
    const records = await db.select()
      .from(driverBehavior)
      .where(eq(driverBehavior.operatorId, operatorId))
      .orderBy(desc(driverBehavior.behaviorDate))
      .limit(30);

    if (records.length === 0) {
      return { safetyScore: 0, efficiencyScore: 0, overallScore: 0 };
    }

    const avgSafetyScore = records.reduce((sum, r) => sum + (r.safetyScore || 0), 0) / records.length;
    const avgEfficiencyScore = records.reduce((sum, r) => sum + (r.efficiencyScore || 0), 0) / records.length;
    const avgOverallScore = records.reduce((sum, r) => sum + (r.overallScore || 0), 0) / records.length;

    return {
      safetyScore: Math.round(avgSafetyScore * 100) / 100,
      efficiencyScore: Math.round(avgEfficiencyScore * 100) / 100,
      overallScore: Math.round(avgOverallScore * 100) / 100
    };
  }

  async getFleetBehaviorAnalytics(): Promise<{ averageSafetyScore: number; totalSpeedingEvents: number; totalHarshBrakingEvents: number; topPerformers: { operatorId: string; score: number }[] }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await db.select()
      .from(driverBehavior)
      .where(gte(driverBehavior.behaviorDate, thirtyDaysAgo));

    if (records.length === 0) {
      return {
        averageSafetyScore: 0,
        totalSpeedingEvents: 0,
        totalHarshBrakingEvents: 0,
        topPerformers: []
      };
    }

    const totalSpeedingEvents = records.reduce((sum, r) => sum + (r.speedingEvents || 0), 0);
    const totalHarshBrakingEvents = records.reduce((sum, r) => sum + (r.harshBrakingEvents || 0), 0);
    const averageSafetyScore = records.reduce((sum, r) => sum + (r.safetyScore || 0), 0) / records.length;

    const operatorScores = new Map<string, { total: number; count: number }>();
    for (const record of records) {
      const existing = operatorScores.get(record.operatorId) || { total: 0, count: 0 };
      existing.total += record.overallScore || 0;
      existing.count += 1;
      operatorScores.set(record.operatorId, existing);
    }

    const topPerformers = Array.from(operatorScores.entries())
      .map(([operatorId, data]) => ({
        operatorId,
        score: Math.round((data.total / data.count) * 100) / 100
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      averageSafetyScore: Math.round(averageSafetyScore * 100) / 100,
      totalSpeedingEvents,
      totalHarshBrakingEvents,
      topPerformers
    };
  }

  // ========================================
  // ENTERPRISE FEATURES - HOURS OF SERVICE
  // ========================================

  async createHoursOfServiceRecord(record: InsertHoursOfService): Promise<HoursOfService> {
    const result = await db.insert(hoursOfService).values(record).returning();
    return result[0];
  }

  async getOperatorHoursOfService(operatorId: string, startDate?: Date, endDate?: Date): Promise<HoursOfService[]> {
    let conditions = [eq(hoursOfService.operatorId, operatorId)];
    
    if (startDate) {
      conditions.push(gte(hoursOfService.logDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(hoursOfService.logDate, endDate));
    }

    return await db.select()
      .from(hoursOfService)
      .where(and(...conditions))
      .orderBy(desc(hoursOfService.logDate));
  }

  async getLatestHoursOfService(operatorId: string): Promise<HoursOfService | undefined> {
    const result = await db.select()
      .from(hoursOfService)
      .where(eq(hoursOfService.operatorId, operatorId))
      .orderBy(desc(hoursOfService.logDate))
      .limit(1);
    return result[0];
  }

  async getHoSViolations(): Promise<HoursOfService[]> {
    return await db.select()
      .from(hoursOfService)
      .where(
        or(
          eq(hoursOfService.dailyDrivingViolation, true),
          eq(hoursOfService.dailyRestViolation, true),
          eq(hoursOfService.weeklyDrivingViolation, true),
          eq(hoursOfService.breakViolation, true)
        )
      )
      .orderBy(desc(hoursOfService.logDate));
  }

  async updateHoursOfService(id: string, updates: Partial<HoursOfService>): Promise<HoursOfService | undefined> {
    const result = await db.update(hoursOfService)
      .set(updates)
      .where(eq(hoursOfService.id, id))
      .returning();
    return result[0];
  }

  // ========================================
  // ENTERPRISE FEATURES - CUSTOMER BILLING
  // ========================================

  async createCustomer(customer: InsertCustomerBilling): Promise<CustomerBilling> {
    const result = await db.insert(customerBilling).values(customer).returning();
    return result[0];
  }

  async getCustomer(id: string): Promise<CustomerBilling | undefined> {
    const result = await db.select()
      .from(customerBilling)
      .where(eq(customerBilling.id, id))
      .limit(1);
    return result[0];
  }

  async getUserCustomers(userId: string): Promise<CustomerBilling[]> {
    return await db.select()
      .from(customerBilling)
      .where(eq(customerBilling.userId, userId))
      .orderBy(desc(customerBilling.createdAt));
  }

  async updateCustomer(id: string, updates: Partial<CustomerBilling>): Promise<CustomerBilling | undefined> {
    const result = await db.update(customerBilling)
      .set(updates)
      .where(eq(customerBilling.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomer(id: string): Promise<boolean> {
    await db.delete(customerBilling).where(eq(customerBilling.id, id));
    return true;
  }

  async getCustomerAnalytics(userId: string): Promise<{ totalCustomers: number; totalRevenue: number; totalOutstanding: number; averageProfitMargin: number }> {
    const customers = await db.select()
      .from(customerBilling)
      .where(and(
        eq(customerBilling.userId, userId),
        eq(customerBilling.status, 'active')
      ));

    if (customers.length === 0) {
      return {
        totalCustomers: 0,
        totalRevenue: 0,
        totalOutstanding: 0,
        averageProfitMargin: 0
      };
    }

    const totalRevenue = customers.reduce((sum, c) => sum + parseFloat(c.totalRevenue?.toString() || '0'), 0);
    const totalOutstanding = customers.reduce((sum, c) => sum + parseFloat(c.outstandingBalance?.toString() || '0'), 0);
    const avgProfitMargin = customers.reduce((sum, c) => sum + (c.profitMargin || 0), 0) / customers.length;

    return {
      totalCustomers: customers.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      averageProfitMargin: Math.round(avgProfitMargin * 100) / 100
    };
  }

  // ========================================
  // FLEET MANAGEMENT - NOTIFICATIONS
  // ========================================

  async getFleetNotifications(status?: string): Promise<FleetNotification[]> {
    if (status) {
      return await db.select()
        .from(fleetNotifications)
        .where(eq(fleetNotifications.status, status))
        .orderBy(desc(fleetNotifications.createdAt));
    }
    return await db.select()
      .from(fleetNotifications)
      .orderBy(desc(fleetNotifications.createdAt));
  }

  async dismissFleetNotification(id: string): Promise<boolean> {
    const result = await db.update(fleetNotifications)
      .set({ status: 'dismissed' })
      .where(eq(fleetNotifications.id, id))
      .returning();
    return result.length > 0;
  }

  async resolveFleetNotification(id: string): Promise<boolean> {
    const result = await db.update(fleetNotifications)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(eq(fleetNotifications.id, id))
      .returning();
    return result.length > 0;
  }

  // ========================================
  // FLEET BROADCAST MESSAGING
  // ========================================

  async createFleetBroadcast(broadcast: InsertFleetBroadcast): Promise<FleetBroadcast> {
    const [result] = await db.insert(fleetBroadcasts).values(broadcast).returning();
    return result;
  }

  async getFleetBroadcast(id: string): Promise<FleetBroadcast | undefined> {
    const [result] = await db.select().from(fleetBroadcasts).where(eq(fleetBroadcasts.id, id));
    return result;
  }

  async getActiveFleetBroadcasts(): Promise<FleetBroadcast[]> {
    const now = new Date();
    return await db.select()
      .from(fleetBroadcasts)
      .where(and(
        eq(fleetBroadcasts.isActive, true),
        or(
          sql`${fleetBroadcasts.expiresAt} IS NULL`,
          gte(fleetBroadcasts.expiresAt, now)
        )
      ))
      .orderBy(desc(fleetBroadcasts.createdAt));
  }

  async getUserFleetBroadcasts(userId: string): Promise<FleetBroadcast[]> {
    return await db.select()
      .from(fleetBroadcasts)
      .where(eq(fleetBroadcasts.senderId, userId))
      .orderBy(desc(fleetBroadcasts.createdAt));
  }

  async updateFleetBroadcast(id: string, updates: Partial<FleetBroadcast>): Promise<FleetBroadcast | undefined> {
    const [result] = await db.update(fleetBroadcasts)
      .set(updates)
      .where(eq(fleetBroadcasts.id, id))
      .returning();
    return result;
  }

  async deleteFleetBroadcast(id: string): Promise<boolean> {
    const result = await db.delete(fleetBroadcasts)
      .where(eq(fleetBroadcasts.id, id))
      .returning();
    return result.length > 0;
  }

  async markBroadcastRead(broadcastId: string, userId: string): Promise<FleetBroadcastRead> {
    const existing = await this.getBroadcastReadStatus(broadcastId, userId);
    if (existing) {
      return existing;
    }

    const [result] = await db.insert(fleetBroadcastReads)
      .values({ broadcastId, userId })
      .returning();

    await db.update(fleetBroadcasts)
      .set({ readCount: sql`COALESCE(${fleetBroadcasts.readCount}, 0) + 1` })
      .where(eq(fleetBroadcasts.id, broadcastId));

    return result;
  }

  async getBroadcastReadStatus(broadcastId: string, userId: string): Promise<FleetBroadcastRead | undefined> {
    const [result] = await db.select()
      .from(fleetBroadcastReads)
      .where(and(
        eq(fleetBroadcastReads.broadcastId, broadcastId),
        eq(fleetBroadcastReads.userId, userId)
      ));
    return result;
  }

  async getUserUnreadBroadcasts(userId: string): Promise<FleetBroadcast[]> {
    const now = new Date();
    const readBroadcastIds = await db.select({ broadcastId: fleetBroadcastReads.broadcastId })
      .from(fleetBroadcastReads)
      .where(eq(fleetBroadcastReads.userId, userId));

    const readIds = readBroadcastIds.map(r => r.broadcastId);

    if (readIds.length === 0) {
      return await this.getActiveFleetBroadcasts();
    }

    return await db.select()
      .from(fleetBroadcasts)
      .where(and(
        eq(fleetBroadcasts.isActive, true),
        or(
          sql`${fleetBroadcasts.expiresAt} IS NULL`,
          gte(fleetBroadcasts.expiresAt, now)
        ),
        sql`${fleetBroadcasts.id} NOT IN (${sql.join(readIds.map(id => sql`${id}`), sql`, `)})`
      ))
      .orderBy(desc(fleetBroadcasts.createdAt));
  }

  async getBroadcastReadReceipts(broadcastId: string): Promise<FleetBroadcastRead[]> {
    return await db.select()
      .from(fleetBroadcastReads)
      .where(eq(fleetBroadcastReads.broadcastId, broadcastId))
      .orderBy(desc(fleetBroadcastReads.readAt));
  }

  // Dash Cam Recording Methods
  async createDashCamRecording(recording: InsertDashCamRecording): Promise<DashCamRecording> {
    const [created] = await db.insert(dashCamRecordings).values(recording).returning();
    return created;
  }

  async getDashCamRecording(id: string): Promise<DashCamRecording | undefined> {
    const [recording] = await db.select().from(dashCamRecordings).where(eq(dashCamRecordings.id, id));
    return recording;
  }

  async getDashCamRecordings(userId: string): Promise<DashCamRecording[]> {
    return await db.select()
      .from(dashCamRecordings)
      .where(eq(dashCamRecordings.userId, userId))
      .orderBy(desc(dashCamRecordings.startTime));
  }

  async deleteDashCamRecording(id: string): Promise<boolean> {
    const result = await db.delete(dashCamRecordings).where(eq(dashCamRecordings.id, id)).returning();
    return result.length > 0;
  }

}

export const storage = new DatabaseStorage();
