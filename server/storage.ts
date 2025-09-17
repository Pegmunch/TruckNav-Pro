import { type VehicleProfile, type InsertVehicleProfile, type Restriction, type InsertRestriction, type Facility, type InsertFacility, type Route, type InsertRoute, type TrafficIncident, type InsertTrafficIncident, type User, type InsertUser, type SubscriptionPlan, type InsertSubscriptionPlan, type UserSubscription, type InsertUserSubscription, type Location, type InsertLocation, type Journey, type InsertJourney, type LaneSegment, type LaneOption } from "@shared/schema";
import { randomUUID } from "crypto";

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

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Subscription Plans
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByStripeId(stripePriceId: string): Promise<SubscriptionPlan | undefined>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
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
  startJourney(routeId: string): Promise<Journey>;
  completeJourney(id: number): Promise<Journey | undefined>;
  getLastJourney(): Promise<Journey | undefined>;
  getJourneyHistory(limit?: number, offset?: number): Promise<Journey[]>;
}

export class MemStorage implements IStorage {
  private vehicleProfiles: Map<string, VehicleProfile>;
  private restrictions: Map<string, Restriction>;
  private facilities: Map<string, Facility>;
  private routes: Map<string, Route>;
  private trafficIncidents: Map<string, TrafficIncident>;
  private users: Map<string, User>;
  private subscriptionPlans: Map<string, SubscriptionPlan>;
  private userSubscriptions: Map<string, UserSubscription>;
  private locations: Map<number, Location>;
  private journeys: Map<number, Journey>;
  private locationIdCounter: number;
  private journeyIdCounter: number;

  constructor() {
    this.vehicleProfiles = new Map();
    this.restrictions = new Map();
    this.facilities = new Map();
    this.routes = new Map();
    this.trafficIncidents = new Map();
    this.users = new Map();
    this.subscriptionPlans = new Map();
    this.userSubscriptions = new Map();
    this.locations = new Map();
    this.journeys = new Map();
    this.locationIdCounter = 1;
    this.journeyIdCounter = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample vehicle profile
    const defaultProfile: VehicleProfile = {
      id: "default-profile",
      name: "Standard HGV",
      height: 15.75, // 15'9"
      width: 8.5, // 8'6"
      length: 53,
      weight: 44,
      axles: 4,
      isHazmat: false,
    };
    this.vehicleProfiles.set(defaultProfile.id, defaultProfile);

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
        alternativeRoute: { suggested: "M40 via A40", additionalTime: 20 },
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
      },
      {
        id: this.journeyIdCounter++,
        routeId: "550e8400-e29b-41d4-a716-446655440001",
        status: 'completed',
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // completed 4 hours later
      },
      {
        id: this.journeyIdCounter++,
        routeId: "550e8400-e29b-41d4-a716-446655440001",
        status: 'planned',
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        completedAt: null,
      },
    ];

    sampleJourneys.forEach(journey => {
      this.journeys.set(journey.id, journey);
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
      isHazmat: insertProfile.isHazmat ?? null
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
      country: insertRestriction.country ?? null
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
      amenities: insertFacility.amenities ?? null,
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
      facilities = facilities.filter(f => {
        const coords = f.coordinates as { lat: number; lng: number };
        const distance = this.calculateDistance(params.coordinates!, coords);
        return distance <= params.radius!;
      });
    }
    
    return facilities;
  }

  // Routes
  async getRoute(id: string): Promise<Route | undefined> {
    return this.routes.get(id);
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = randomUUID();
    const route: Route = { 
      ...insertRoute, 
      id,
      name: insertRoute.name ?? null,
      distance: insertRoute.distance ?? null,
      duration: insertRoute.duration ?? null,
      vehicleProfileId: insertRoute.vehicleProfileId ?? null,
      routePath: insertRoute.routePath ?? null,
      restrictionsAvoided: insertRoute.restrictionsAvoided ?? null,
      facilitiesNearby: insertRoute.facilitiesNearby ?? null,
      laneGuidance: insertRoute.laneGuidance ?? null,
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

  private haversineDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);
    const lat1 = this.toRad(coord1.lat);
    const lat2 = this.toRad(coord2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Returns distance in meters
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
    const incident: TrafficIncident = {
      ...insertIncident,
      id,
      reportedAt: new Date(),
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
      truckWarnings: insertIncident.truckWarnings ?? null,
      trafficDelay: insertIncident.trafficDelay ?? null,
      alternativeRoute: insertIncident.alternativeRoute ?? null,
      country: insertIncident.country ?? null,
    };
    this.trafficIncidents.set(id, incident);
    return incident;
  }

  async getTrafficIncidentsByArea(bounds: { north: number; south: number; east: number; west: number }): Promise<TrafficIncident[]> {
    return Array.from(this.trafficIncidents.values()).filter(incident => {
      if (!incident.coordinates || !incident.isActive) return false;
      const coords = incident.coordinates as { lat: number; lng: number };
      return coords.lat <= bounds.north && coords.lat >= bounds.south &&
             coords.lng <= bounds.east && coords.lng >= bounds.west;
    });
  }

  async getActiveTrafficIncidents(): Promise<TrafficIncident[]> {
    return Array.from(this.trafficIncidents.values()).filter(incident => incident.isActive);
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

    // Check if lane guidance already exists in the route
    if (route.laneGuidance && Array.isArray(route.laneGuidance)) {
      return route.laneGuidance as LaneSegment[];
    }

    // If no existing lane guidance, generate it
    const vehicleProfile = route.vehicleProfileId 
      ? this.vehicleProfiles.get(route.vehicleProfileId)
      : this.vehicleProfiles.get("default-profile");
    
    if (!vehicleProfile) return null;

    const laneGuidance = await this.generateLaneGuidance(route, vehicleProfile);
    
    // Save the generated lane guidance to the route
    const updatedRoute = { ...route, laneGuidance };
    this.routes.set(routeId, updatedRoute);
    
    return laneGuidance;
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
  async startJourney(routeId: string): Promise<Journey> {
    // Validate that the route exists before creating a journey
    const route = this.routes.get(routeId);
    if (!route) {
      throw new Error(`Route with ID ${routeId} not found`);
    }
    
    const id = this.journeyIdCounter++;
    const journey: Journey = {
      id,
      routeId,
      status: 'planned',
      startedAt: new Date(),
      completedAt: null,
    };
    
    this.journeys.set(id, journey);
    return journey;
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
}

export const storage = new MemStorage();
