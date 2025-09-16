import { type VehicleProfile, type InsertVehicleProfile, type Restriction, type InsertRestriction, type Facility, type InsertFacility, type Route, type InsertRoute, type TrafficIncident, type InsertTrafficIncident, type User, type InsertUser, type SubscriptionPlan, type InsertSubscriptionPlan, type UserSubscription, type InsertUserSubscription } from "@shared/schema";
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

  constructor() {
    this.vehicleProfiles = new Map();
    this.restrictions = new Map();
    this.facilities = new Map();
    this.routes = new Map();
    this.trafficIncidents = new Map();
    this.users = new Map();
    this.subscriptionPlans = new Map();
    this.userSubscriptions = new Map();
    
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
}

export const storage = new MemStorage();
