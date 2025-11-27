import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { trafficService } from "./services/traffic-service";
import { routeMonitorService } from "./services/route-monitor";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireSubscription, requireAuth } from "./subscriptionMiddleware";
import { insertVehicleProfileSchema, insertRestrictionSchema, insertFacilitySchema, insertRouteSchema, insertTrafficIncidentSchema, insertUserSchema, updateUserProfileSchema, insertLocationSchema, insertJourneySchema, insertRouteMonitoringSchema, insertAlternativeRouteSchema, insertReRoutingEventSchema, geoJsonLineStringSchema, insertEntertainmentStationSchema, insertEntertainmentPresetSchema, insertEntertainmentHistorySchema, insertEntertainmentPlaybackStateSchema, type VehicleProfile, type Restriction } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { apiRateLimit, authRateLimit, validateRequest } from "./middleware/security";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import multer from "multer";
import { createReadStream } from "fs";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { 
  validateVehicleProfile, 
  validateRoute,
  validateRoutePlanningRequest, 
  validateTrafficIncident, 
  validateFacilitySearch, 
  validateSubscription, 
  validateId,
  validateCoordinates,
  validateLocation,
  validateJourney,
  validateNumericId,
  validatePagination,
  validatePostcodeSearch,
  validatePostcodeGeocoding
} from "./middleware/validation";
import * as turf from "@turf/turf";

// Server-side GraphHopper API integration with proper parameters
async function callGraphHopperAPI(
  startCoords: { lat: number; lng: number },
  endCoords: { lat: number; lng: number },
  vehicleProfile: VehicleProfile
): Promise<{
  distance: number;
  duration: number;
  coordinates: Array<{ lat: number; lng: number }>;
  geometry: any;
  instructions?: Array<{ text: string; distance: number; time: number; sign: number }>;
} | null> {
  try {
    const apiKey = process.env.GRAPHHOPPER_API_KEY;
    if (!apiKey) {
      console.error('GraphHopper API key not found in server environment');
      return null;
    }

    // Convert vehicle dimensions - feet to meters for GraphHopper
    const heightMeters = vehicleProfile.height * 0.3048;
    const widthMeters = vehicleProfile.width * 0.3048;
    const weightKg = (vehicleProfile.weight || 0) * 1000;
    const lengthMeters = (vehicleProfile.length || 0) * 0.3048;

    // Determine GraphHopper vehicle profile based on vehicle type
    let ghVehicle = 'car';
    let customModel: any = {};
    
    switch (vehicleProfile.type) {
      case 'car':
        ghVehicle = 'car';
        break;
      case 'car_caravan':
        ghVehicle = 'car';
        customModel = {
          priority: [
            { if: "road_class == MOTORWAY", multiply_by: 1.2 },
            { if: "road_class == TRUNK", multiply_by: 1.1 },
            { if: "road_class == PRIMARY", multiply_by: 1.0 },
            { if: "road_class == SECONDARY", multiply_by: 0.9 },
            { if: "road_class == RESIDENTIAL", multiply_by: 0.7 }
          ],
          speed: [
            { if: "true", limit_to: 60 }
          ]
        };
        break;
      case 'class_1_lorry':
      case 'class_2_lorry':
      case '7_5_tonne':
        ghVehicle = 'car'; // Use 'car' profile for trucks since free GraphHopper doesn't support 'truck'
        const maxSpeed = vehicleProfile.maxSpeed || 70;
        customModel = {
          priority: [
            { if: "road_class == MOTORWAY", multiply_by: 1.3 },
            { if: "road_class == TRUNK", multiply_by: 1.2 },
            { if: "road_class == PRIMARY", multiply_by: 1.1 },
            { if: "road_class == SECONDARY", multiply_by: 0.8 },
            { if: "road_class == RESIDENTIAL", multiply_by: vehicleProfile.canUseResidentialRoads ? 0.3 : 0.05 },
            { if: "road_class == LIVING_STREET", multiply_by: 0.1 },
            { if: "toll == yes", multiply_by: vehicleProfile.type === 'class_2_lorry' || vehicleProfile.type === '7_5_tonne' ? 0.2 : 1.0 },
            { if: "road_environment == FERRY", multiply_by: vehicleProfile.type === 'class_2_lorry' || vehicleProfile.type === '7_5_tonne' ? 0.1 : 1.0 }
          ],
          speed: [
            { if: "true", limit_to: maxSpeed }
          ],
          distance_influence: 70
        };
        break;
    }

    // Build request parameters with valid GraphHopper API format
    const params = new URLSearchParams({
      point: `${startCoords.lat},${startCoords.lng}`,
      vehicle: ghVehicle,
      locale: 'en-GB',
      instructions: 'true',
      calc_points: 'true',
      debug: 'false',
      elevation: 'false',
      points_encoded: 'false',
      type: 'json'
    });

    // Add second point
    params.append('point', `${endCoords.lat},${endCoords.lng}`);

    // DISABLED: Custom models not supported in free GraphHopper tier  
    // Free packages cannot use flexible mode, so we'll use basic profiles only
    // Custom vehicle restrictions will be handled in post-processing
    // if (Object.keys(customModel).length > 0) {
    //   params.append('custom_model', JSON.stringify(customModel));
    //   params.append('ch.disable', 'true');
    // }

    // REMOVED: Invalid GraphHopper parameters (height, width, weight, length, avoid)
    // These constraints are now handled via custom_model priority rules above

    params.append('key', apiKey);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(`https://graphhopper.com/api/1/route?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TruckNav-Pro/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`GraphHopper API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('GraphHopper error response:', errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data.paths || data.paths.length === 0) {
      console.error('No route found from GraphHopper API');
      return null;
    }

    const path = data.paths[0];
    
    return {
      distance: Math.round(path.distance / 1609.34 * 100) / 100, // meters to miles
      duration: Math.round(path.time / 60000), // milliseconds to minutes
      coordinates: path.points.coordinates.map((coord: number[]) => ({ 
        lat: coord[1], 
        lng: coord[0] 
      })),
      geometry: {
        type: "LineString" as const,
        coordinates: path.points.coordinates
      },
      instructions: path.instructions?.map((inst: any) => ({
        text: inst.text,
        distance: Math.round(inst.distance / 1609.34 * 100) / 100, // meters to miles
        time: Math.round(inst.time / 1000), // milliseconds to seconds
        sign: inst.sign
      })) || []
    };
  } catch (error) {
    console.error('GraphHopper API call failed:', error);
    return null;
  }
}

// TomTom Truck Routing API integration with full vehicle dimension support
async function callTomTomRoutingAPI(
  startCoords: { lat: number; lng: number },
  endCoords: { lat: number; lng: number },
  vehicleProfile: VehicleProfile,
  options?: { avoidTolls?: boolean; avoidFerries?: boolean }
): Promise<{
  distance: number;
  duration: number;
  coordinates: Array<{ lat: number; lng: number }>;
  geometry: any;
  instructions?: Array<{ text: string; distance: number; time: number; sign: number }>;
  summary?: { lengthInMeters: number; travelTimeInSeconds: number; trafficDelayInSeconds: number };
} | null> {
  try {
    const TOMTOM_API_KEY = process.env.VITE_TOMTOM_API_KEY;
    
    if (!TOMTOM_API_KEY) {
      console.error('[TOMTOM-ROUTING] API key not found');
      return null;
    }

    // Convert vehicle dimensions from feet to meters for TomTom API
    const heightMeters = vehicleProfile.height * 0.3048;
    const widthMeters = vehicleProfile.width * 0.3048;
    const lengthMeters = (vehicleProfile.length || 0) * 0.3048;
    
    // Convert weight from tons to kilograms
    const weightKg = (vehicleProfile.weight || 0) * 1000;
    
    // Build locations string (lat,lng:lat,lng)
    const locations = `${startCoords.lat},${startCoords.lng}:${endCoords.lat},${endCoords.lng}`;
    
    // Build TomTom Routing API URL
    const tomtomUrl = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${locations}/json`);
    
    // Add API key
    tomtomUrl.searchParams.set('key', TOMTOM_API_KEY);
    
    // Set travel mode to truck for commercial vehicle routing
    tomtomUrl.searchParams.set('travelMode', 'truck');
    
    // Add vehicle dimensions and specifications
    if (heightMeters > 0) {
      tomtomUrl.searchParams.set('vehicleHeight', heightMeters.toFixed(2));
    }
    if (widthMeters > 0) {
      tomtomUrl.searchParams.set('vehicleWidth', widthMeters.toFixed(2));
    }
    if (lengthMeters > 0) {
      tomtomUrl.searchParams.set('vehicleLength', lengthMeters.toFixed(2));
    }
    if (weightKg > 0) {
      tomtomUrl.searchParams.set('vehicleWeight', weightKg.toString());
    }
    
    // Add axle count if specified
    if (vehicleProfile.axles) {
      // TomTom uses axleWeight parameter - distribute total weight across axles
      const axleWeight = Math.round(weightKg / vehicleProfile.axles);
      tomtomUrl.searchParams.set('vehicleAxleWeight', axleWeight.toString());
    }
    
    // Set commercial vehicle flag for trucks
    if (vehicleProfile.type !== 'car' && vehicleProfile.type !== 'car_caravan') {
      tomtomUrl.searchParams.set('vehicleCommercial', 'true');
    }
    
    // Add hazmat restrictions if vehicle carries hazardous materials
    if (vehicleProfile.isHazmat) {
      tomtomUrl.searchParams.set('vehicleLoadType', 'otherHazmatGeneral');
    }
    
    // Add route preferences
    const avoidOptions: string[] = [];
    if (options?.avoidTolls) {
      avoidOptions.push('tollRoads');
    }
    if (options?.avoidFerries) {
      avoidOptions.push('ferries');
    }
    if (avoidOptions.length > 0) {
      tomtomUrl.searchParams.set('avoid', avoidOptions.join(','));
    }
    
    // Add traffic information
    tomtomUrl.searchParams.set('traffic', 'true');
    
    // Request detailed instructions
    tomtomUrl.searchParams.set('instructionsType', 'text');
    tomtomUrl.searchParams.set('routeType', 'fastest'); // Optimize for time
    
    // Add language preference
    tomtomUrl.searchParams.set('language', 'en-GB');
    
    console.log('[TOMTOM-ROUTING] Request URL:', tomtomUrl.toString().replace(TOMTOM_API_KEY, '***'));
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(tomtomUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TruckNav-Pro/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TOMTOM-ROUTING] API error: HTTP ${response.status}`, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      console.error('[TOMTOM-ROUTING] No route found');
      return null;
    }

    const route = data.routes[0];
    const summary = route.summary;
    const legs = route.legs || [];
    
    // Extract coordinates from route geometry
    const coordinates: Array<{ lat: number; lng: number }> = [];
    
    for (const leg of legs) {
      if (leg.points && Array.isArray(leg.points)) {
        for (const point of leg.points) {
          coordinates.push({
            lat: point.latitude,
            lng: point.longitude
          });
        }
      }
    }
    
    // Build GeoJSON geometry
    const geometry = {
      type: "LineString" as const,
      coordinates: coordinates.map(coord => [coord.lng, coord.lat])
    };
    
    // Map TomTom maneuver strings to GraphHopper-style numeric sign codes
    const mapTomTomManeuverToSign = (maneuver: string): number => {
      const maneuverMap: Record<string, number> = {
        'ARRIVE': 4,
        'ARRIVE_LEFT': 4,
        'ARRIVE_RIGHT': 4,
        'DEPART': 0,
        'STRAIGHT': 0,
        'KEEP_STRAIGHT': 0,
        'BEAR_LEFT': -7,
        'BEAR_RIGHT': 7,
        'TURN_LEFT': -2,
        'TURN_RIGHT': 2,
        'SHARP_LEFT': -3,
        'SHARP_RIGHT': 3,
        'U_TURN_LEFT': -8,
        'U_TURN_RIGHT': 8,
        'ENTER_MOTORWAY': 0,
        'EXIT_MOTORWAY': 6,
        'ENTER_FREEWAY': 0,
        'EXIT_FREEWAY': 6,
        'ROUNDABOUT_LEFT': -2,
        'ROUNDABOUT_RIGHT': 2,
        'ROUNDABOUT_CROSS': 0,
        'TAKE_EXIT': 6
      };
      
      return maneuverMap[maneuver] || 0;
    };
    
    // Extract turn-by-turn instructions
    const instructions: Array<{ text: string; distance: number; time: number; sign: number }> = [];
    
    for (const leg of legs) {
      if (leg.instructions && Array.isArray(leg.instructions)) {
        for (const instruction of leg.instructions) {
          // Use lengthInMeters for per-instruction distance, not routeOffsetInMeters (cumulative)
          const distanceMeters = instruction.lengthInMeters || instruction.routeOffsetInMeters || 0;
          
          instructions.push({
            text: instruction.message || instruction.instruction || '',
            distance: Math.round(distanceMeters / 1609.34 * 100) / 100, // meters to miles
            time: Math.round((instruction.travelTimeInSeconds || 0)), // seconds
            sign: mapTomTomManeuverToSign(instruction.maneuver || '')
          });
        }
      }
    }
    
    console.log('[TOMTOM-ROUTING] Success:', {
      distance: Math.round(summary.lengthInMeters / 1609.34 * 100) / 100,
      duration: Math.round(summary.travelTimeInSeconds / 60),
      points: coordinates.length,
      instructions: instructions.length
    });
    
    return {
      distance: Math.round(summary.lengthInMeters / 1609.34 * 100) / 100, // meters to miles
      duration: Math.round(summary.travelTimeInSeconds / 60), // seconds to minutes
      coordinates,
      geometry,
      instructions,
      summary: {
        lengthInMeters: summary.lengthInMeters,
        travelTimeInSeconds: summary.travelTimeInSeconds,
        trafficDelayInSeconds: summary.trafficDelayInSeconds || 0
      }
    };
  } catch (error) {
    console.error('[TOMTOM-ROUTING] API call failed:', error);
    return null;
  }
}

// Enhanced strict vehicle class routing function with actual spatial validation
async function calculateStrictVehicleClassRoute(
  startCoords: { lat: number; lng: number },
  endCoords: { lat: number; lng: number },
  vehicleProfile: VehicleProfile,
  restrictions: Restriction[]
): Promise<{
  distance: number;
  duration: number;
  coordinates: Array<{ lat: number; lng: number }>;
  restrictionsAvoided: string[];
  geometry: any;
  violations: Array<{ restriction: Restriction; severity: string; bypassable: boolean }>;
  isRouteAllowed: boolean;
} | null> {
  try {
    // Get route from TomTom Truck Routing API (primary) with GraphHopper as fallback
    let routeResult = await callTomTomRoutingAPI(startCoords, endCoords, vehicleProfile);
    
    if (!routeResult) {
      console.log('[ROUTING] TomTom routing failed, falling back to GraphHopper');
      routeResult = await callGraphHopperAPI(startCoords, endCoords, vehicleProfile);
      
      if (!routeResult) {
        console.error('Failed to get route from both TomTom and GraphHopper APIs');
        return null;
      }
    } else {
      console.log('[ROUTING] Using TomTom truck routing with vehicle dimensions');
    }

    // Now perform spatial validation with actual route geometry
    const violations: Array<{ restriction: Restriction; severity: string; bypassable: boolean }> = [];
    const restrictionsAvoided: string[] = [];
    const routeLine = turf.lineString(routeResult.geometry.coordinates);

    // Check each restriction for spatial intersection with the actual route
    for (const restriction of restrictions) {
      let intersects = false;
      
      try {
        // Check if restriction has spatial coordinates
        if (restriction.coordinates) {
          let coords;
          try {
            coords = typeof restriction.coordinates === 'string' 
              ? JSON.parse(restriction.coordinates) 
              : restriction.coordinates;
          } catch (parseError) {
            console.error(`[RESTRICTION-ERROR] Failed to parse coordinates for restriction ${restriction.id}:`, parseError);
            continue;
          }
          
          if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
            // Create a point for the restriction
            const restrictionPoint = turf.point([coords.lng, coords.lat]);
            
            // Check if route passes within 100 meters (0.1km) of restriction
            const buffer = turf.buffer(restrictionPoint, 0.1, { units: 'kilometers' });
            if (buffer) {
              intersects = turf.booleanIntersects(routeLine, buffer);
            }
          } else {
            console.warn(`[RESTRICTION-VALIDATION] Invalid coordinates for restriction ${restriction.id}: missing or invalid lat/lng`);
          }
        } else if (restriction.routeSegment) {
          // Handle route segment restrictions
          let segmentCoords;
          try {
            segmentCoords = typeof restriction.routeSegment === 'string'
              ? JSON.parse(restriction.routeSegment)
              : restriction.routeSegment;
          } catch (parseError) {
            console.error(`[RESTRICTION-ERROR] Failed to parse routeSegment for restriction ${restriction.id}:`, parseError);
            continue;
          }
            
          if (Array.isArray(segmentCoords) && segmentCoords.length >= 2) {
            const restrictionSegment = turf.lineString(segmentCoords.map(coord => [coord.lng, coord.lat]));
            intersects = turf.booleanIntersects(routeLine, restrictionSegment);
          }
        }
      } catch (error) {
        console.error(`[RESTRICTION-ERROR] Error processing restriction ${restriction.id}:`, error);
        continue;
      }

      // If restriction intersects with route, check if vehicle is affected
      if (intersects && isVehicleAffectedByRestriction(vehicleProfile, restriction)) {
        const bypassable = restriction.bypassAllowed !== false && restriction.severity !== 'absolute';
        
        violations.push({
          restriction,
          severity: restriction.severity || 'medium',
          bypassable
        });
        
        restrictionsAvoided.push(restriction.id);
        
        const country = restriction.country || 'Unknown';
        const limitValue = restriction.type === 'height' ? `${restriction.limit} ft` :
                          restriction.type === 'width' ? `${restriction.limit} ft` :
                          restriction.type === 'weight' ? `${restriction.limit} tonnes` : restriction.limit;
        
        console.log(`[${country}] Route intersects with ${restriction.severity} restriction: ${restriction.type} (${limitValue}) at ${restriction.location}`);
      }
    }

    // Check for absolute restrictions that block the route completely
    const absoluteViolations = violations.filter(v => v.severity === 'absolute' && !v.bypassable);
    if (absoluteViolations.length > 0) {
      console.log(`Route blocked by ${absoluteViolations.length} absolute restrictions`);
      return {
        distance: 0,
        duration: 0,
        coordinates: [],
        restrictionsAvoided,
        geometry: null,
        violations: absoluteViolations,
        isRouteAllowed: false
      };
    }

    // Return the validated route with spatial intersection results
    return {
      distance: routeResult.distance,
      duration: routeResult.duration,
      coordinates: routeResult.coordinates,
      restrictionsAvoided,
      geometry: routeResult.geometry,
      violations,
      isRouteAllowed: violations.every(v => v.bypassable) // Route allowed if all violations are bypassable
    };
  } catch (error) {
    console.error('Error calculating strict vehicle class route:', error);
    return null;
  }
}

/**
 * Attempt to find alternative route using waypoints to avoid restrictions
 */
async function tryRerouteWithWaypoints(
  startCoords: { lat: number; lng: number },
  endCoords: { lat: number; lng: number },
  vehicleProfile: VehicleProfile,
  restrictions: Restriction[],
  violatedRestrictions: Restriction[]
): Promise<{
  distance: number;
  duration: number;
  coordinates: Array<{ lat: number; lng: number }>;
  restrictionsAvoided: string[];
  geometry: any;
  violations: Array<{ restriction: Restriction; severity: string; bypassable: boolean }>;
  isRouteAllowed: boolean;
} | null> {
  try {
    // Calculate perpendicular offset waypoints to bypass restrictions
    const midLat = (startCoords.lat + endCoords.lat) / 2;
    const midLng = (startCoords.lng + endCoords.lng) / 2;
    
    // Calculate bearing of direct route
    const bearing = Math.atan2(
      endCoords.lng - startCoords.lng,
      endCoords.lat - startCoords.lat
    );
    
    // Try waypoints at different offsets (perpendicular to route)
    const offsets = [0.05, 0.1, -0.05, -0.1]; // degrees offset
    
    for (const offset of offsets) {
      const waypointLat = midLat + offset * Math.cos(bearing + Math.PI/2);
      const waypointLng = midLng + offset * Math.sin(bearing + Math.PI/2);
      const waypoint = { lat: waypointLat, lng: waypointLng };
      
      console.log(`[REROUTE] Trying waypoint at ${waypoint.lat.toFixed(4)}, ${waypoint.lng.toFixed(4)}`);
      
      // Try route with waypoint: start -> waypoint -> end
      const leg1 = await callGraphHopperAPI(startCoords, waypoint, vehicleProfile);
      if (!leg1) continue;
      
      const leg2 = await callGraphHopperAPI(waypoint, endCoords, vehicleProfile);
      if (!leg2) continue;
      
      // Combine the two legs
      const combinedCoords = [...leg1.coordinates, ...leg2.coordinates];
      const combinedGeometry = {
        type: "LineString" as const,
        coordinates: [
          ...leg1.geometry.coordinates,
          ...leg2.geometry.coordinates
        ]
      };
      
      // Validate against restrictions
      const routeLine = turf.lineString(combinedGeometry.coordinates);
      const violations: Array<{ restriction: Restriction; severity: string; bypassable: boolean }> = [];
      const restrictionsAvoided: string[] = [];
      
      for (const restriction of restrictions) {
        let intersects = false;
        
        try {
          if (restriction.coordinates) {
            let coords;
            try {
              coords = typeof restriction.coordinates === 'string' 
                ? JSON.parse(restriction.coordinates) 
                : restriction.coordinates;
            } catch (parseError) {
              console.error(`[REROUTE-ERROR] Failed to parse coordinates for restriction ${restriction.id}:`, parseError);
              continue;
            }
            
            if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
              const restrictionPoint = turf.point([coords.lng, coords.lat]);
              const buffer = turf.buffer(restrictionPoint, 0.1, { units: 'kilometers' });
              if (buffer) {
                intersects = turf.booleanIntersects(routeLine, buffer);
              }
            }
          }
          
          if (intersects && isVehicleAffectedByRestriction(vehicleProfile, restriction)) {
            const bypassable = restriction.bypassAllowed !== false && restriction.severity !== 'absolute';
            violations.push({
              restriction,
              severity: restriction.severity || 'medium',
              bypassable
            });
            restrictionsAvoided.push(restriction.id);
          }
        } catch (error) {
          console.error(`[REROUTE-ERROR] Error processing restriction ${restriction.id}:`, error);
          continue;
        }
      }
      
      // Check if this route avoids critical violations
      const criticalViolations = violations.filter(v => !v.bypassable);
      if (criticalViolations.length === 0) {
        const avoidedCountries = Array.from(new Set(violatedRestrictions.map(r => r.country || 'Unknown')));
        console.log(`[REROUTE] SUCCESS: Found safe route with waypoint, avoided ${violatedRestrictions.length} restrictions from: ${avoidedCountries.join(', ')}`);
        return {
          distance: leg1.distance + leg2.distance,
          duration: leg1.duration + leg2.duration,
          coordinates: combinedCoords,
          restrictionsAvoided,
          geometry: combinedGeometry,
          violations,
          isRouteAllowed: true
        };
      }
    }
    
    console.log('[REROUTE] FAILED: No safe waypoint routes found');
    return null;
  } catch (error) {
    console.error('[REROUTE] Error during waypoint rerouting:', error);
    return null;
  }
}

/**
 * Check if a vehicle is affected by a specific restriction
 */
function isVehicleAffectedByRestriction(vehicleProfile: VehicleProfile, restriction: Restriction): boolean {
  try {
    // Check if restriction specifically targets this vehicle type
    if (restriction.restrictedVehicleTypes) {
      try {
        const restrictedTypes = Array.isArray(restriction.restrictedVehicleTypes) 
          ? restriction.restrictedVehicleTypes 
          : JSON.parse(restriction.restrictedVehicleTypes as string);
        return restrictedTypes.includes(vehicleProfile.type);
      } catch (parseError) {
        console.error(`[RESTRICTION-CHECK] Error parsing restrictedVehicleTypes for restriction ${restriction.id}:`, parseError);
        return false;
      }
    }
    
    // Check dimensional restrictions with proper type safety
    switch (restriction.type) {
      case 'height':
        return typeof vehicleProfile.height === 'number' && 
               typeof restriction.limit === 'number' && 
               vehicleProfile.height >= restriction.limit;
      case 'width':
        return typeof vehicleProfile.width === 'number' && 
               typeof restriction.limit === 'number' && 
               vehicleProfile.width >= restriction.limit;
      case 'weight':
        return typeof vehicleProfile.weight === 'number' && 
               typeof restriction.limit === 'number' && 
               vehicleProfile.weight >= restriction.limit;
      case 'length':
        return typeof vehicleProfile.length === 'number' && 
               typeof restriction.limit === 'number' && 
               vehicleProfile.length >= restriction.limit;
      case 'axle_count':
        return typeof vehicleProfile.axles === 'number' && 
               typeof restriction.limit === 'number' && 
               vehicleProfile.axles > restriction.limit;
      case 'hazmat':
        return vehicleProfile.isHazmat === true;
      default:
        return false;
    }
  } catch (error) {
    console.error(`[RESTRICTION-CHECK] Error checking if vehicle is affected by restriction ${restriction.id}:`, error);
    return false;
  }
}

/**
 * Check if a vehicle violates vehicle class specific restrictions
 */
function isVehicleClassViolation(vehicleProfile: VehicleProfile, restriction: Restriction): boolean {
  // Parse vehicle profile restrictions
  const allowedRoadTypes = vehicleProfile.allowedRoadTypes 
    ? (Array.isArray(vehicleProfile.allowedRoadTypes) 
        ? vehicleProfile.allowedRoadTypes 
        : JSON.parse(vehicleProfile.allowedRoadTypes as string))
    : [];
    
  const restrictedAreas = vehicleProfile.restrictedAreas 
    ? (Array.isArray(vehicleProfile.restrictedAreas) 
        ? vehicleProfile.restrictedAreas 
        : JSON.parse(vehicleProfile.restrictedAreas as string))
    : [];

  // Use actual schema fields for restriction types
  switch (restriction.type) {
    case 'residential_ban':
      // Heavy vehicles banned from residential areas
      return vehicleProfile.canUseResidentialRoads === false &&
             ['class_1_lorry', 'class_2_lorry', '7_5_tonne'].includes(vehicleProfile.type);
             
    case 'vehicle_type':
      // Check if this vehicle type is specifically restricted
      const restrictedTypes = restriction.restrictedVehicleTypes
        ? (Array.isArray(restriction.restrictedVehicleTypes) 
            ? restriction.restrictedVehicleTypes 
            : JSON.parse(restriction.restrictedVehicleTypes as string))
        : [];
      return restrictedTypes.includes(vehicleProfile.type);
      
    case 'time_based':
      // Check time restrictions (simplified - would need actual time checking)
      if (vehicleProfile.restrictedHours) {
        const restrictedHours = typeof vehicleProfile.restrictedHours === 'string'
          ? JSON.parse(vehicleProfile.restrictedHours)
          : vehicleProfile.restrictedHours;
        const currentHour = new Date().getHours();
        const startHour = parseInt(restrictedHours.start?.split(':')[0] || '0');
        const endHour = parseInt(restrictedHours.end?.split(':')[0] || '24');
        
        // Check if current time falls within restricted hours
        if (startHour < endHour) {
          return currentHour >= startHour && currentHour < endHour;
        } else {
          // Overnight restriction (e.g., 22:00 to 06:00)
          return currentHour >= startHour || currentHour < endHour;
        }
      }
      return false;
      
    case 'bridge_weight':
      // Bridge weight restrictions for heavy vehicles
      return (vehicleProfile.weight || 0) > restriction.limit;
      
    case 'tunnel_clearance':
      // Tunnel height clearance - same as height restriction
      return vehicleProfile.height > restriction.limit;
      
    default:
      return false;
  }
}

// Legacy function for backward compatibility
async function calculateTruckSafeRoute(
  startCoords: { lat: number; lng: number },
  endCoords: { lat: number; lng: number },
  vehicleProfile: VehicleProfile,
  restrictions: Restriction[]
): Promise<{
  distance: number;
  duration: number;
  coordinates: Array<{ lat: number; lng: number }>;
  restrictionsAvoided: string[];
  geometry: any;
} | null> {
  const result = await calculateStrictVehicleClassRoute(startCoords, endCoords, vehicleProfile, restrictions);
  if (!result) return null;
  
  // If route is not allowed due to absolute restrictions, return null
  if (!result.isRouteAllowed) {
    return null;
  }
  
  return {
    distance: result.distance,
    duration: result.duration,
    coordinates: result.coordinates,
    restrictionsAvoided: result.restrictionsAvoided,
    geometry: result.geometry
  };
}

/**
 * Get vehicle compliance level based on vehicle type
 */
function getVehicleComplianceLevel(vehicleType: string): string {
  switch (vehicleType) {
    case 'car':
      return 'basic'; // Minimal restrictions
    case 'car_caravan':
      return 'moderate'; // Some restrictions for safety
    case 'class_1_lorry':
      return 'strict'; // Commercial vehicle restrictions
    case 'class_2_lorry':
      return 'very_strict'; // Heavy commercial restrictions
    case '7_5_tonne':
      return 'maximum'; // Maximum restrictions and compliance
    default:
      return 'basic';
  }
}

// Initialize OpenAI client for voice transcription (gracefully handle missing API key)
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    console.log('OpenAI client initialized successfully');
  } else {
    console.warn('OpenAI API key not found - voice transcription features will be disabled');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
  openai = null;
}

// Configure multer for audio file uploads
const upload = multer({
  dest: tmpdir(), // Temporary directory for uploaded files
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
    files: 1 // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    const allowedMimeTypes = [
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/m4a',
      'audio/mp4',
      'audio/ogg',
      'audio/flac'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// Voice transcription request validation
const validateVoiceTranscription = [
  z.object({
    language: z.string().optional(),
    duration: z.string().transform(val => parseInt(val)).optional(),
    timestamp: z.string().transform(val => parseInt(val)).optional()
  })
];

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  
  // Apply API rate limiting to all API routes
  app.use("/api", apiRateLimit);
  
  // CSRF token endpoint (must come before CSRF protection middleware) - enhanced for concurrent requests
  app.get("/api/csrf-token", (req: any, res: any) => {
    // Always ensure session exists
    if (!req.session) {
      console.error('[CSRF] No session available for token generation');
      return res.status(500).json({ error: 'Session not available' });
    }

    // Initialize token pool if needed
    if (!req.session.csrfTokens) {
      req.session.csrfTokens = [];
    }

    // Clean up expired tokens (older than 10 minutes)
    const now = Date.now();
    req.session.csrfTokens = req.session.csrfTokens.filter((tokenInfo: any) => 
      now - tokenInfo.timestamp < 600000
    );

    // Generate a fresh CSRF token and add it to the pool
    const newToken = randomBytes(32).toString('hex');
    req.session.csrfTokens.push({
      token: newToken,
      timestamp: now
    });

    // Keep only the last 5 tokens to prevent memory bloat
    if (req.session.csrfTokens.length > 5) {
      req.session.csrfTokens = req.session.csrfTokens.slice(-5);
    }

    console.log(`[CSRF] New token generated for session ${req.sessionID}: ${newToken.substring(0, 8)}... (pool size: ${req.session.csrfTokens.length})`);
    
    // Reliable session saving with enhanced error handling
    req.session.save((err: any) => {
      if (err) {
        console.error('[CSRF] Failed to save session:', err);
        return res.status(500).json({ 
          error: 'Failed to initialize session',
          code: 'SESSION_SAVE_ERROR',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`[CSRF] Session saved successfully - token pool size: ${req.session.csrfTokens?.length || 0}`);
      
      // Set CSRF token in response header and body, add cache control and session monitoring
      res.setHeader('X-CSRF-Token', newToken);
      res.setHeader('X-Session-ID', req.sessionID || 'missing');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Enhanced session monitoring
      const cookieReceived = !!req.headers.cookie;
      const userAgent = req.get('User-Agent')?.substring(0, 50) || 'unknown';
      console.log(`[SESSION_MONITOR] CSRF token request - Session: ${req.sessionID?.substring(0, 8)}..., Cookie sent: ${cookieReceived}, User-Agent: ${userAgent}...`);
      if (req.headers.cookie) {
        console.log(`[COOKIE_DEBUG] Cookie header: ${req.headers.cookie.substring(0, 100)}...`);
      } else {
        console.log(`[COOKIE_DEBUG] No cookie header received from client`);
      }
      
      res.json({ 
        success: true,
        csrfToken: newToken,
        sessionId: req.sessionID,
        tokenPoolSize: req.session.csrfTokens?.length || 0,
        sessionAge: req.session.created ? Date.now() - req.session.created : 0,
        cookieReceived: cookieReceived,
        timestamp: new Date().toISOString()
      });
    });
  });
  
  // CSRF protection is now handled globally by security middleware - no duplicate needed

  // Auth endpoints
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // POST /api/users/accept-terms - Record consent (works for both auth states)
  app.post('/api/users/accept-terms', async (req: any, res: Response) => {
    try {
      // If authenticated, save to database
      if (req.user && req.user.claims && req.user.claims.sub) {
        const userId = req.user.claims.sub;
        await storage.updateUser(userId, {
          hasAcceptedTerms: true,
          termsAcceptedAt: new Date()
        });
      }
      // Always return success (localStorage save happens client-side)
      res.json({ success: true, authenticated: !!req.user });
    } catch (error) {
      console.error("Error recording terms acceptance:", error);
      res.status(500).json({ message: "Failed to record terms acceptance" });
    }
  });

  // POST /api/users/sync-consent - Sync localStorage consent to database after login
  app.post('/api/users/sync-consent', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only update if not already accepted
      if (!user.hasAcceptedTerms) {
        await storage.updateUser(userId, {
          hasAcceptedTerms: true,
          termsAcceptedAt: new Date()
        });
      }
      
      res.json({ success: true, alreadyAccepted: user.hasAcceptedTerms });
    } catch (error) {
      console.error("Error syncing consent:", error);
      res.status(500).json({ message: "Failed to sync consent" });
    }
  });

  // Subscription endpoints
  app.get('/api/subscription/plans', async (req: Request, res: Response) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.post('/api/subscription/create', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({ message: "Plan ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.hasAcceptedTerms) {
        return res.status(403).json({ 
          message: "Terms and conditions must be accepted before creating a subscription" 
        });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: plan.stripePriceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      }) as any;

      await storage.createUserSubscription({
        userId: user.id,
        planId: plan.id,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      });

      const invoice = subscription.latest_invoice as any;
      const paymentIntent = invoice?.payment_intent;

      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret,
        status: subscription.status,
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.get('/api/subscription/status', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getUserSubscriptionByUserId(userId);
      
      if (!subscription) {
        return res.json({ hasActiveSubscription: false });
      }

      const isActive = subscription.status === 'active';
      res.json({
        hasActiveSubscription: isActive,
        subscription: subscription,
      });
    } catch (error) {
      console.error("Error checking subscription status:", error);
      res.status(500).json({ message: "Failed to check subscription status" });
    }
  });

  // Voice Transcription Endpoint - Whisper API fallback
  app.post("/api/voice/transcribe", upload.single('audio'), async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      // Check if OpenAI client is available
      if (!openai || !process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: 'OPENAI_API_KEY_MISSING',
          message: 'OpenAI API key not configured. Voice fallback unavailable.' 
        });
      }

      // Validate uploaded file
      if (!req.file) {
        return res.status(400).json({ 
          error: 'NO_AUDIO_FILE',
          message: 'No audio file provided.' 
        });
      }

      // Validate file size (Whisper has a 25MB limit)
      if (req.file.size > 25 * 1024 * 1024) {
        return res.status(400).json({ 
          error: 'FILE_TOO_LARGE',
          message: 'Audio file too large. Maximum size is 25MB.' 
        });
      }

      // Extract request parameters
      const { language = 'en', duration, timestamp } = req.body;
      
      // Validate language parameter
      const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'tr', 'nl', 'pl'];
      const whisperLanguage = supportedLanguages.includes(language) ? language : 'en';

      try {
        // Create a read stream from the uploaded file
        const audioFile = createReadStream(req.file.path);
        
        // Transcribe using OpenAI Whisper
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language: whisperLanguage,
          response_format: 'verbose_json', // Get timestamps and confidence scores
          temperature: 0.0 // For consistent results
        });

        // Calculate processing time
        const processingTime = Date.now() - startTime;

        // Extract confidence from segments (if available)
        let confidence = 1.0;
        if (transcription.segments && transcription.segments.length > 0) {
          const totalTokens = transcription.segments.reduce((acc, segment) => acc + (segment.tokens?.length || 0), 0);
          const weightedConfidence = transcription.segments.reduce((acc, segment) => {
            const segmentWeight = (segment.tokens?.length || 0) / totalTokens;
            const segmentConfidence = segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.9;
            return acc + (segmentConfidence * segmentWeight);
          }, 0);
          confidence = Math.min(Math.max(weightedConfidence, 0.0), 1.0);
        }

        // Prepare response with word-level timestamps if available
        const words = transcription.segments?.flatMap(segment => 
          (segment as any).words?.map((word: any) => ({
            text: word.word,
            confidence: word.probability || confidence,
            start: word.start,
            end: word.end
          })) || []
        ) || undefined;

        const response = {
          text: transcription.text.trim(),
          confidence,
          language: transcription.language || whisperLanguage,
          duration: transcription.duration || (duration ? parseInt(duration) / 1000 : 0),
          processingTime,
          words,
          metadata: {
            model: 'whisper-1',
            timestamp: timestamp ? parseInt(timestamp) : Date.now(),
            fileSize: req.file.size,
            originalFilename: req.file.originalname
          }
        };

        // Clean up temporary file
        try {
          await unlink(req.file.path);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary audio file:', cleanupError);
        }

        res.json(response);

      } catch (openaiError: any) {
        // Handle OpenAI API errors specifically
        console.error('OpenAI Whisper API error:', openaiError);
        
        let errorMessage = 'Speech transcription failed.';
        let errorCode = 'TRANSCRIPTION_FAILED';
        
        if (openaiError.code === 'insufficient_quota') {
          errorMessage = 'OpenAI API quota exceeded. Please try again later.';
          errorCode = 'QUOTA_EXCEEDED';
        } else if (openaiError.code === 'invalid_api_key') {
          errorMessage = 'Invalid OpenAI API key configuration.';
          errorCode = 'INVALID_API_KEY';
        } else if (openaiError.message?.includes('file format')) {
          errorMessage = 'Unsupported audio format. Please try a different format.';
          errorCode = 'UNSUPPORTED_FORMAT';
        } else if (openaiError.message?.includes('duration')) {
          errorMessage = 'Audio file too long. Maximum duration is 25 minutes.';
          errorCode = 'FILE_TOO_LONG';
        }

        return res.status(500).json({ 
          error: errorCode,
          message: errorMessage,
          processingTime: Date.now() - startTime 
        });
      }

    } catch (error: any) {
      console.error('Voice transcription endpoint error:', error);
      
      // Clean up temporary file if it exists
      if (req.file?.path) {
        try {
          await unlink(req.file.path);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary audio file after error:', cleanupError);
        }
      }

      return res.status(500).json({ 
        error: 'INTERNAL_ERROR',
        message: 'Internal server error during voice transcription.',
        processingTime: Date.now() - startTime 
      });
    }
  });

  // Vehicle Profiles
  app.get("/api/vehicle-profiles", async (req, res) => {
    try {
      const profiles = await storage.getAllVehicleProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to get vehicle profiles" });
    }
  });

  app.post("/api/vehicle-profiles", validateVehicleProfile, validateRequest, async (req: any, res: any) => {
    try {
      const result = insertVehicleProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid vehicle profile data", errors: result.error.errors });
      }
      
      const profile = await storage.createVehicleProfile(result.data);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to create vehicle profile" });
    }
  });

  // Restrictions
  app.get("/api/restrictions", async (req, res) => {
    try {
      const { north, south, east, west } = req.query;
      if (north && south && east && west) {
        const bounds = {
          north: parseFloat(north as string),
          south: parseFloat(south as string),
          east: parseFloat(east as string),
          west: parseFloat(west as string),
        };
        const restrictions = await storage.getRestrictionsByArea(bounds);
        res.json(restrictions);
      } else {
        res.status(400).json({ message: "Missing bounds parameters" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get restrictions" });
    }
  });

  app.post("/api/restrictions", validateCoordinates, validateRequest, async (req: any, res: any) => {
    try {
      const result = insertRestrictionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid restriction data", errors: result.error.errors });
      }
      
      const restriction = await storage.createRestriction(result.data);
      res.json(restriction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create restriction" });
    }
  });

  // Facilities
  app.get("/api/facilities", validateFacilitySearch, validateRequest, async (req: Request, res: Response) => {
    try {
      const { type, lat, lng, radius } = req.query;
      const params: any = {};
      
      if (type) params.type = type as string;
      if (lat && lng) {
        params.coordinates = {
          lat: parseFloat(lat as string),
          lng: parseFloat(lng as string),
        };
      }
      if (radius) params.radius = parseFloat(radius as string);
      
      const facilities = await storage.searchFacilities(params);
      res.json(facilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to search facilities" });
    }
  });

  app.post("/api/facilities", validateCoordinates, validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertFacilitySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid facility data", errors: result.error.errors });
      }
      
      const facility = await storage.createFacility(result.data);
      res.json(facility);
    } catch (error) {
      res.status(500).json({ message: "Failed to create facility" });
    }
  });

  // Live POI Search (TomTom + Photon fallback)
  app.get("/api/poi-search", async (req: Request, res: Response) => {
    try {
      const { type, lat, lng, radius, q } = req.query;
      
      console.log('[POI-SEARCH] Request received:', { type, lat, lng, radius, q });
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const searchRadius = radius ? parseFloat(radius as string) : 10;
      const radiusInMeters = Math.round(searchRadius * 1000);
      
      // Get TomTom API key
      const TOMTOM_API_KEY = process.env.VITE_TOMTOM_API_KEY;
      
      // Map POI types to TomTom category codes
      const tomtomCategoryMap: Record<string, string> = {
        truck_stop: '7315',
        fuel: '7311,7312,7313', // Multiple fuel categories
        parking: '7309',
        restaurant: '7318',
        supermarket: '7332', // Supermarkets and grocery stores
        shop: 'SHOP' // Using general SHOP category name
      };
      
      const poiType = type as string;
      const tomtomCategory = tomtomCategoryMap[poiType];
      
      let facilities: any[] = [];
      
      // For shops, skip category search and use text search directly
      if (poiType === 'shop' && TOMTOM_API_KEY) {
        try {
          console.log(`[POI-SEARCH] Enhanced shop search - using parallel text search for UK shop brands`);
          
          // Comprehensive list of UK shop brands with variations
          const shopBrands = [
            // Major supermarkets
            'Tesco Express', 
            'Tesco Metro',
            'Tesco Extra',
            'Tesco',
            'Sainsburys Local',
            'Sainsburys',
            'Co-op Food',
            'Co-op',
            'Morrisons Daily',
            'Morrisons',
            'ASDA',
            'Waitrose',
            'M&S Food',
            'M&S Simply Food',
            'Marks & Spencer',
            
            // Discount chains
            'Iceland',
            'Aldi',
            'Lidl',
            'Poundland',
            'Poundstretcher',
            'B&M',
            'Home Bargains',
            
            // Convenience stores
            'Spar',
            'Premier',
            'Costcutter',
            'Budgens',
            'Nisa',
            'Nisa Local',
            'Nisa Extra',
            'Best-one',
            'Londis',
            'McColls',
            'One Stop',
            'Family Shopper',
            'Select & Save',
            
            // Petrol station shops
            'BP Shop',
            'Shell Select',
            'Esso Express',
            
            // Other chains
            'Boots',
            'Superdrug',
            'WHSmith',
            'Martin\'s',
            'Post Office'
          ];
          
          // Calculate distance between two coordinates in meters
          const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
            const R = 6371000; // Earth's radius in meters
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;

            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

            return R * c;
          };
          
          // Parallel fetch with timeout
          const fetchWithTimeout = async (url: string, timeout: number = 5000): Promise<any> => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
              const response = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
              
              if (response.ok) {
                return await response.json();
              }
              return null;
            } catch (error) {
              clearTimeout(timeoutId);
              return null;
            }
          };
          
          // Create search promises for parallel execution
          const searchPromises = shopBrands.map(async (brand) => {
            const shopSearchUrl = new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(brand)}.json`);
            shopSearchUrl.searchParams.set('key', TOMTOM_API_KEY);
            shopSearchUrl.searchParams.set('lat', latitude.toString());
            shopSearchUrl.searchParams.set('lon', longitude.toString());
            shopSearchUrl.searchParams.set('radius', radiusInMeters.toString());
            shopSearchUrl.searchParams.set('limit', '3'); // Limit per brand to avoid too many results
            shopSearchUrl.searchParams.set('countrySet', 'GB,IE'); // Include Ireland
            shopSearchUrl.searchParams.set('idxSet', 'POI');
            shopSearchUrl.searchParams.set('typeahead', 'false');
            
            const shopData = await fetchWithTimeout(shopSearchUrl.toString(), 3000);
            
            if (shopData && shopData.results && shopData.results.length > 0) {
              console.log(`[POI-SEARCH] Found ${shopData.results.length} ${brand} locations`);
              return shopData.results;
            }
            
            return [];
          });
          
          // Execute searches in parallel
          const searchResults = await Promise.all(searchPromises);
          const allShopResults = searchResults.flat();
          
          if (allShopResults.length > 0) {
            console.log(`[POI-SEARCH] Total shops found: ${allShopResults.length}`);
            
            // Enhanced deduplication with location clustering
            const seenLocations = new Set<string>();
            const uniqueShops = allShopResults
              .filter(shop => {
                if (!shop.position?.lat || !shop.position?.lon) return false;
                
                // Create a location key with reduced precision to cluster nearby shops
                const locKey = `${Math.round(shop.position.lat * 10000) / 10000},${Math.round(shop.position.lon * 10000) / 10000}`;
                
                // Also check for exact name matches at similar locations
                const nameKey = `${shop.poi?.name?.toLowerCase().replace(/\s+/g, '')}:${locKey}`;
                
                if (seenLocations.has(nameKey)) {
                  return false;
                }
                
                seenLocations.add(nameKey);
                return true;
              })
              .map(shop => {
                // Calculate actual distance
                const distance = calculateDistance(
                  latitude,
                  longitude,
                  shop.position?.lat || latitude,
                  shop.position?.lon || longitude
                );
                
                return {
                  ...shop,
                  calculatedDistance: distance
                };
              })
              // Sort by calculated distance
              .sort((a, b) => a.calculatedDistance - b.calculatedDistance)
              // Take top results
              .slice(0, 60);
            
            facilities = uniqueShops.map((result: any, index: number) => {
              const distanceKm = (result.calculatedDistance / 1000).toFixed(2);
              
              return {
                id: `tomtom-shop-${index}`,
                name: result.poi?.name || 'Unknown Shop',
                type: 'shop',
                latitude: result.position?.lat || latitude,
                longitude: result.position?.lon || longitude,
                address: result.address?.freeformAddress || '',
                amenities: result.poi?.categories || [],
                city: result.address?.municipality || result.address?.localName || '',
                state: result.address?.countrySubdivision || '',
                zip: result.address?.postalCode || '',
                country: result.address?.country || '',
                phone: result.poi?.phone || null,
                website: result.poi?.url || null,
                rating: result.score || null,
                imageUrl: null,
                distance: `${distanceKm} km`,
                distanceMeters: result.calculatedDistance,
                openingHours: result.poi?.openingHours || null
              };
            });
            
            console.log(`[POI-SEARCH] Returning ${facilities.length} unique shop results`);
          } else {
            console.log('[POI-SEARCH] No shop results found from brand searches - trying general search');
            
            // Fallback: Try a general search for "shop" or "store"
            try {
              const generalSearchUrl = new URL('https://api.tomtom.com/search/2/search/shop store convenience.json');
              generalSearchUrl.searchParams.set('key', TOMTOM_API_KEY);
              generalSearchUrl.searchParams.set('lat', latitude.toString());
              generalSearchUrl.searchParams.set('lon', longitude.toString());
              generalSearchUrl.searchParams.set('radius', radiusInMeters.toString());
              generalSearchUrl.searchParams.set('limit', '30');
              generalSearchUrl.searchParams.set('countrySet', 'GB,IE');
              generalSearchUrl.searchParams.set('idxSet', 'POI');
              
              const generalData = await fetchWithTimeout(generalSearchUrl.toString(), 5000);
              
              if (generalData && generalData.results && generalData.results.length > 0) {
                  console.log(`[POI-SEARCH] Found ${generalData.results.length} shops from general search`);
                  
                  facilities = generalData.results
                    .filter((result: any) => result.position?.lat && result.position?.lon)
                    .map((result: any, index: number) => {
                      const distance = calculateDistance(
                        latitude,
                        longitude,
                        result.position?.lat || latitude,
                        result.position?.lon || longitude
                      );
                      const distanceKm = (distance / 1000).toFixed(2);
                      
                      return {
                        id: `tomtom-shop-${index}`,
                        name: result.poi?.name || 'Shop',
                        type: 'shop',
                        latitude: result.position?.lat || latitude,
                        longitude: result.position?.lon || longitude,
                        address: result.address?.freeformAddress || '',
                        amenities: result.poi?.categories || [],
                        city: result.address?.municipality || '',
                        state: result.address?.countrySubdivision || '',
                        zip: result.address?.postalCode || '',
                        country: result.address?.country || '',
                        phone: result.poi?.phone || null,
                        website: result.poi?.url || null,
                        rating: result.score || null,
                        imageUrl: null,
                        distance: `${distanceKm} km`,
                        distanceMeters: distance,
                        openingHours: result.poi?.openingHours || null
                      };
                    })
                    .sort((a: any, b: any) => a.distanceMeters - b.distanceMeters)
                    .slice(0, 30);
                  
                  console.log(`[POI-SEARCH] Returning ${facilities.length} shops from general search`);
                }
            } catch (fallbackError) {
              console.error('[POI-SEARCH] Fallback general search also failed:', fallbackError);
            }
          }
        } catch (error) {
          console.error('[POI-SEARCH] Shop search failed:', error);
          // Fallback to empty results rather than crashing
          facilities = [];
        }
      }
      // Try TomTom for non-shop POI types
      else if (tomtomCategory && TOMTOM_API_KEY && poiType !== 'shop') {
        try {
          console.log(`[POI-SEARCH] Searching for ${poiType} with TomTom categorySearch API`);
          console.log(`[POI-SEARCH] Category codes: ${tomtomCategory}`);
          
          const tomtomUrl = new URL('https://api.tomtom.com/search/2/categorySearch/.json');
          tomtomUrl.searchParams.set('key', TOMTOM_API_KEY);
          tomtomUrl.searchParams.set('lat', latitude.toString());
          tomtomUrl.searchParams.set('lon', longitude.toString());
          tomtomUrl.searchParams.set('radius', radiusInMeters.toString());
          tomtomUrl.searchParams.set('categorySet', tomtomCategory);
          tomtomUrl.searchParams.set('limit', '50');
          
          if (poiType === 'parking') {
            tomtomUrl.searchParams.set('vehicleType', 'truck');
          }
          
          console.log(`[POI-SEARCH] TomTom URL: ${tomtomUrl.toString().replace(TOMTOM_API_KEY, '***')}`);
          const tomtomResponse = await fetch(tomtomUrl.toString());
          
          if (tomtomResponse.ok) {
            const data = await tomtomResponse.json();
            console.log(`[POI-SEARCH] TomTom categorySearch returned ${data.results?.length || 0} results for ${poiType}`);
            console.log(`[POI-SEARCH] Response summary:`, data.summary || 'No summary');
            
            // If no results for shops, try searching for specific UK shop brands
            if (poiType === 'shop' && (!data.results || data.results.length === 0)) {
              console.log('[POI-SEARCH] No shops found with categorySearch, trying UK shop brand searches...');
              
              // Common UK shop brands to search for
              const shopBrands = [
                'Tesco', 
                'Sainsbury',
                'Co-op',
                'Morrisons',
                'ASDA',
                'Waitrose',
                'M&S Food',
                'Iceland',
                'Aldi',
                'Lidl'
              ];
              
              const allShopResults = [];
              
              // Search for each brand
              for (const brand of shopBrands) {
                const shopSearchUrl = new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(brand)}.json`);
                shopSearchUrl.searchParams.set('key', TOMTOM_API_KEY);
                shopSearchUrl.searchParams.set('lat', latitude.toString());
                shopSearchUrl.searchParams.set('lon', longitude.toString());
                shopSearchUrl.searchParams.set('radius', radiusInMeters.toString());
                shopSearchUrl.searchParams.set('limit', '10');
                shopSearchUrl.searchParams.set('countrySet', 'GB');
                shopSearchUrl.searchParams.set('idxSet', 'POI');
                
                console.log(`[POI-SEARCH] Searching for ${brand}...`);
                const shopResponse = await fetch(shopSearchUrl.toString());
                
                if (shopResponse.ok) {
                  const shopData = await shopResponse.json();
                  console.log(`[POI-SEARCH] Found ${shopData.results?.length || 0} ${brand} locations`);
                  
                  if (shopData.results && shopData.results.length > 0) {
                    allShopResults.push(...shopData.results);
                  }
                } else {
                  console.log(`[POI-SEARCH] Search failed for ${brand}: ${shopResponse.status}`);
                }
              }
              
              if (allShopResults.length > 0) {
                console.log(`[POI-SEARCH] Total shops found: ${allShopResults.length}`);
                // Sort by distance and take closest 50
                data.results = allShopResults
                  .sort((a, b) => (a.dist || 0) - (b.dist || 0))
                  .slice(0, 50);
              } else {
                console.log('[POI-SEARCH] No shop results found from brand searches');
              }
            }
            
            if (data.results && data.results.length > 0) {
              // Log first few results for debugging
              console.log(`[POI-SEARCH] First 3 ${poiType} results:`, 
                data.results.slice(0, 3).map((r: any) => ({
                  name: r.poi?.name,
                  category: r.poi?.categories,
                  address: r.address?.freeformAddress
                }))
              );
              
              facilities = data.results.map((result: any, index: number) => ({
                id: `tomtom-${poiType}-${index}`,
                name: result.poi?.name || 'Unknown',
                type: poiType,
                latitude: result.position?.lat || latitude,
                longitude: result.position?.lon || longitude,
                address: result.address?.freeformAddress || '',
                amenities: [],
                city: result.address?.municipality || result.address?.localName || '',
                state: result.address?.countrySubdivision || '',
                zip: result.address?.postalCode || '',
                country: result.address?.country || '',
                phone: result.poi?.phone || null,
                website: result.poi?.url || null,
                rating: null,
                imageUrl: null,
              }));
            }
          }
        } catch (error) {
          console.error('[POI-SEARCH] TomTom search failed:', error);
        }
      }
      
      // Fallback to Photon for general POIs or if TomTom returned nothing
      if (facilities.length === 0) {
        try {
          // Map POI types to OpenStreetMap tags
          const osmTagMap: Record<string, string> = {
            truck_stop: 'highway:services',
            fuel: 'amenity:fuel',
            parking: 'amenity:parking',
            restaurant: 'amenity:restaurant',
          };
          
          const osmTag = osmTagMap[poiType] || poiType;
          const photonUrl = new URL('https://photon.komoot.io/api/');
          photonUrl.searchParams.set('lat', latitude.toString());
          photonUrl.searchParams.set('lon', longitude.toString());
          photonUrl.searchParams.set('limit', '20');
          photonUrl.searchParams.set('osm_tag', osmTag);
          
          if (q) {
            photonUrl.searchParams.set('q', q as string);
          }
          
          const photonResponse = await fetch(photonUrl.toString());
          
          if (photonResponse.ok) {
            const data = await photonResponse.json();
            
            if (data.features && data.features.length > 0) {
              facilities = data.features
                .filter((f: any) => {
                  const coords = f.geometry?.coordinates;
                  if (!coords) return false;
                  
                  const distance = Math.sqrt(
                    Math.pow((coords[1] - latitude) * 111.32, 2) +
                    Math.pow((coords[0] - longitude) * 111.32 * Math.cos(latitude * Math.PI / 180), 2)
                  );
                  
                  return distance <= searchRadius;
                })
                .map((feature: any, index: number) => ({
                  id: `photon-${poiType}-${index}`,
                  name: feature.properties?.name || feature.properties?.street || 'Unknown',
                  type: poiType,
                  latitude: feature.geometry.coordinates[1],
                  longitude: feature.geometry.coordinates[0],
                  address: feature.properties?.street || '',
                  amenities: [],
                  city: feature.properties?.city || feature.properties?.county || '',
                  state: feature.properties?.state || '',
                  zip: feature.properties?.postcode || '',
                  country: feature.properties?.country || '',
                  phone: null,
                  website: null,
                  rating: null,
                  imageUrl: null,
                }));
            }
          }
        } catch (error) {
          console.error('[POI-SEARCH] Photon search failed:', error);
        }
      }
      
      res.json(facilities);
    } catch (error) {
      console.error('[POI-SEARCH] Error:', error);
      res.status(500).json({ message: "Failed to search POIs" });
    }
  });

  // Route Validation and Compliance Checking
  app.post("/api/routes/validate", requireSubscription, validateRoute, validateRequest, async (req: Request, res: Response) => {
    try {
      const { routeId, vehicleProfileId, currentPosition, checkCompliance = true } = req.body;
      
      if (!routeId) {
        return res.status(400).json({ message: "Route ID is required for validation" });
      }
      
      // Get the route and vehicle profile
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      let vehicleProfile = null;
      if (vehicleProfileId) {
        vehicleProfile = await storage.getVehicleProfile(vehicleProfileId);
      }
      
      if (!vehicleProfile) {
        return res.status(400).json({ message: "Vehicle profile is required for compliance validation" });
      }
      
      // Get restrictions in the route area
      const routeCoords = route.routePath as Array<{ lat: number; lng: number }> || [];
      if (routeCoords.length === 0) {
        return res.status(400).json({ message: "Route has no coordinate data" });
      }
      
      const bounds = {
        north: Math.max(...routeCoords.map(c => c.lat)) + 0.5,
        south: Math.min(...routeCoords.map(c => c.lat)) - 0.5,
        east: Math.max(...routeCoords.map(c => c.lng)) + 0.5,
        west: Math.min(...routeCoords.map(c => c.lng)) - 0.5,
      };
      
      const restrictions = await storage.getRestrictionsByArea(bounds);
      
      // Perform compliance validation
      const validationResult = {
        routeId,
        vehicleType: vehicleProfile.type,
        isCompliant: true,
        violations: [] as any[],
        recommendations: [] as string[],
        severity: 'low' as string,
        requiresRerouting: false,
        complianceScore: 100
      };
      
      // Check for absolute restrictions that would block this vehicle type
      const absoluteViolations = restrictions.filter(r => 
        r.severity === 'absolute' && 
        r.restrictedVehicleTypes && 
        (Array.isArray(r.restrictedVehicleTypes) 
          ? r.restrictedVehicleTypes.includes(vehicleProfile.type)
          : JSON.parse(r.restrictedVehicleTypes as string).includes(vehicleProfile.type))
      );
      
      if (absoluteViolations.length > 0) {
        validationResult.isCompliant = false;
        validationResult.severity = 'critical';
        validationResult.requiresRerouting = true;
        validationResult.complianceScore = 0;
        validationResult.violations = absoluteViolations.map(r => ({
          type: 'absolute_restriction',
          restriction: {
            id: r.id,
            type: r.type,
            location: r.location,
            severity: r.severity,
            description: r.description
          },
          message: `Absolute restriction violation: ${vehicleProfile.type} vehicles are completely prohibited in this area`,
          canBypass: false
        }));
        validationResult.recommendations.push('Immediate rerouting required - no exceptions permitted');
      } else {
        // Check for other compliance issues
        const vehicleClassViolations = [];
        
        // Check road type restrictions
        if (!vehicleProfile.canUseMotorways) {
          const motorwayRestrictions = restrictions.filter(r => r.type === 'motorway_restriction');
          vehicleClassViolations.push(...motorwayRestrictions);
        }
        
        if (!vehicleProfile.canUseResidentialRoads) {
          const residentialRestrictions = restrictions.filter(r => r.type === 'residential_ban');
          vehicleClassViolations.push(...residentialRestrictions);
        }
        
        if (vehicleClassViolations.length > 0) {
          validationResult.complianceScore = Math.max(0, 100 - (vehicleClassViolations.length * 20));
          validationResult.violations = vehicleClassViolations.map(r => ({
            type: 'vehicle_class_restriction',
            restriction: {
              id: r.id,
              type: r.type,
              location: r.location,
              severity: r.severity || 'medium',
              description: r.description
            },
            message: `Vehicle class ${vehicleProfile.type} has restrictions on ${r.type} roads`,
            canBypass: r.bypassAllowed !== false && r.severity !== 'absolute'
          }));
          
          if (vehicleClassViolations.some(r => r.severity === 'high' || r.enforcementType === 'strict')) {
            validationResult.severity = 'high';
            validationResult.requiresRerouting = true;
            validationResult.recommendations.push('Consider alternative route for strict compliance');
          } else {
            validationResult.severity = 'medium';
            validationResult.recommendations.push('Exercise caution in restricted areas');
          }
        }
      }
      
      // Add current position check if provided
      if (currentPosition && checkCompliance) {
        const nearbyRestrictions = restrictions.filter(r => {
          if (r.coordinates) {
            const coords = typeof r.coordinates === 'string' ? JSON.parse(r.coordinates) : r.coordinates;
            const distance = calculateHaversineDistance(currentPosition, coords);
            return distance < 0.5; // Within 0.5 miles
          }
          return false;
        });
        
        if (nearbyRestrictions.length > 0) {
          validationResult.recommendations.push(`${nearbyRestrictions.length} restrictions detected near current position`);
        }
      }
      
      res.json(validationResult);
    } catch (error) {
      console.error('Route validation error:', error);
      res.status(500).json({ message: "Failed to validate route compliance" });
    }
  });

  // Real-time compliance monitoring endpoint
  app.post("/api/routes/compliance-check", requireSubscription, validateRequest, async (req: Request, res: Response) => {
    try {
      const { currentPosition, vehicleType, routeId } = req.body;
      
      if (!currentPosition || !vehicleType) {
        return res.status(400).json({ message: "Current position and vehicle type are required" });
      }
      
      // Get restrictions near current position
      const bounds = {
        north: currentPosition.lat + 0.1, // Small area around current position
        south: currentPosition.lat - 0.1,
        east: currentPosition.lng + 0.1,
        west: currentPosition.lng - 0.1,
      };
      
      const nearbyRestrictions = await storage.getRestrictionsByArea(bounds);
      
      // Check for immediate compliance violations
      const immediateViolations = nearbyRestrictions.filter(r => {
        if (r.severity === 'absolute' && r.restrictedVehicleTypes) {
          const restrictedTypes = Array.isArray(r.restrictedVehicleTypes) 
            ? r.restrictedVehicleTypes 
            : JSON.parse(r.restrictedVehicleTypes as string);
          return restrictedTypes.includes(vehicleType);
        }
        return false;
      });
      
      const complianceStatus = {
        position: currentPosition,
        vehicleType,
        timestamp: new Date().toISOString(),
        compliant: immediateViolations.length === 0,
        immediateAction: immediateViolations.length > 0 ? 'STOP_REROUTE' : 'CONTINUE',
        violations: immediateViolations.map(r => ({
          id: r.id,
          type: r.type,
          severity: r.severity,
          message: `Immediate violation: ${vehicleType} vehicle in absolute restricted area`,
          location: r.location
        })),
        nearbyRestrictions: nearbyRestrictions.length,
        recommendations: immediateViolations.length > 0 
          ? ['Stop vehicle immediately', 'Calculate alternative route', 'Contact dispatch if needed']
          : ['Continue on current route', 'Monitor for upcoming restrictions']
      };
      
      res.json(complianceStatus);
    } catch (error) {
      console.error('Real-time compliance check error:', error);
      res.status(500).json({ message: "Failed to perform compliance check" });
    }
  });

  // Helper function for distance calculation
  function calculateHaversineDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 3959; // Earth radius in miles
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Routes with strict vehicle class enforcement (open access for route planning)
  app.post("/api/routes/calculate", validateRoutePlanningRequest, async (req: Request, res: Response) => {
    try {
      const { startLocation, endLocation, vehicleProfileId, startCoordinates, endCoordinates, routePreference } = req.body;
      
      if (!startLocation || !endLocation) {
        return res.status(400).json({ message: "Start and end locations are required" });
      }

      // Log route preference for debugging (would be passed to routing engine in production)
      const preference = routePreference || 'fastest';
      console.log(`[ROUTE] Calculating route with preference: ${preference}`);

      // Get vehicle profile for truck-safe routing
      let vehicleProfile = null;
      let restrictionsAvoided: string[] = [];
      let routeDistance = 186; // Default fallback
      let routeDuration = 222; // Default fallback
      let routePath: Array<{ lat: number; lng: number }> = [];
      let geometry = null;

      if (vehicleProfileId) {
        vehicleProfile = await storage.getVehicleProfile(vehicleProfileId);
      }

      // Use provided coordinates or return error if missing
      if (!startCoordinates || !endCoordinates) {
        return res.status(400).json({ 
          message: "Start and end coordinates are required for route calculation" 
        });
      }
      
      const startCoords = startCoordinates;
      const endCoords = endCoordinates;
      
      // Pre-route validation: Check if vehicle type is provided and valid
      if (vehicleProfileId && vehicleProfile) {
        const allowedVehicleTypes = ['car', 'car_caravan', 'class_1_lorry', 'class_2_lorry', '7_5_tonne'];
        if (!allowedVehicleTypes.includes(vehicleProfile.type)) {
          return res.status(400).json({
            message: `Invalid vehicle type: ${vehicleProfile.type}`,
            allowedTypes: allowedVehicleTypes,
            routeBlocked: true
          });
        }
      }

      if (vehicleProfile) {
        // Get all restrictions in the route area with expanded bounds for stricter checking
        const bounds = {
          north: Math.max(startCoords.lat, endCoords.lat) + 1.0, // Expanded for stricter compliance
          south: Math.min(startCoords.lat, endCoords.lat) - 1.0,
          east: Math.max(startCoords.lng, endCoords.lng) + 1.0,
          west: Math.min(startCoords.lng, endCoords.lng) - 1.0,
        };
        
        const restrictions = await storage.getRestrictionsByArea(bounds);
        
        // Log restriction check details for transparency
        const restrictionsByCountry = restrictions.reduce((acc, r) => {
          const country = r.country || 'Unknown';
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`[ROUTE-SAFETY] Checking ${restrictions.length} restrictions for ${vehicleProfile.type}`);
        console.log(`[ROUTE-SAFETY] Restrictions by country:`, restrictionsByCountry);
        
        // Pre-route absolute restriction check - block route immediately if violations exist
        const absoluteRestrictionsForVehicle = restrictions.filter(r => 
          r.severity === 'absolute' && 
          r.restrictedVehicleTypes && 
          (Array.isArray(r.restrictedVehicleTypes) 
            ? r.restrictedVehicleTypes.includes(vehicleProfile.type)
            : JSON.parse(r.restrictedVehicleTypes as string).includes(vehicleProfile.type))
        );
        
        if (absoluteRestrictionsForVehicle.length > 0) {
          return res.status(403).json({
            message: `Route completely blocked by ${absoluteRestrictionsForVehicle.length} absolute restrictions for vehicle type ${vehicleProfile.type}`,
            absoluteRestrictions: absoluteRestrictionsForVehicle.map(r => ({
              id: r.id,
              type: r.type,
              location: r.location,
              description: r.description,
              severity: r.severity
            })),
            routeBlocked: true,
            canBypass: false
          });
        }
        
        // Calculate strict vehicle class route with absolute restriction enforcement
        const strictRouteResult = await calculateStrictVehicleClassRoute(
          startCoords,
          endCoords,
          vehicleProfile,
          restrictions
        );
        
        // Check if route is completely blocked by absolute restrictions
        if (strictRouteResult && !strictRouteResult.isRouteAllowed) {
          return res.status(403).json({
            message: `Route blocked for vehicle type ${vehicleProfile.type}`,
            violations: strictRouteResult.violations,
            absoluteRestrictions: strictRouteResult.violations.filter(v => v.severity === 'absolute'),
            routeBlocked: true
          });
        }
        
        const vehicleSpecificRoute = strictRouteResult;
        
        if (vehicleSpecificRoute) {
          routeDistance = vehicleSpecificRoute.distance;
          routeDuration = vehicleSpecificRoute.duration;
          routePath = vehicleSpecificRoute.coordinates;
          restrictionsAvoided = vehicleSpecificRoute.restrictionsAvoided;
          geometry = vehicleSpecificRoute.geometry;
          
          // Check for non-bypassable violations (critical restrictions like low bridges)
          if (vehicleSpecificRoute.violations && vehicleSpecificRoute.violations.length > 0) {
            const routeViolations = vehicleSpecificRoute.violations;
            const criticalViolations = routeViolations.filter(v => !v.bypassable);
            
            if (criticalViolations.length > 0) {
              // CRITICAL: Route contains non-bypassable restrictions - TRY REROUTING
              console.warn(`[SAFETY] Route has ${criticalViolations.length} critical violations for ${vehicleProfile.type} - attempting reroute`);
              
              // Log each violation for debugging
              criticalViolations.forEach(v => {
                console.warn(`  - ${v.restriction.type} restriction at ${v.restriction.location}: ` +
                  `Vehicle ${vehicleProfile.type} (${v.restriction.type === 'height' ? vehicleProfile.height + ' ft' : 
                  v.restriction.type === 'width' ? vehicleProfile.width + ' ft' : 
                  vehicleProfile.weight + ' tonnes'}) exceeds limit ${v.restriction.limit}`);
              });
              
              // Try to find alternative route using waypoints
              const violatedRestrictions = criticalViolations.map(v => v.restriction);
              const rerouteResult = await tryRerouteWithWaypoints(
                startCoords,
                endCoords,
                vehicleProfile,
                restrictions,
                violatedRestrictions
              );
              
              if (rerouteResult && rerouteResult.isRouteAllowed) {
                // SUCCESS: Found safe alternative route
                console.log(`[SAFETY] ✓ Successfully rerouted around ${criticalViolations.length} restrictions`);
                routeDistance = rerouteResult.distance;
                routeDuration = rerouteResult.duration;
                routePath = rerouteResult.coordinates;
                restrictionsAvoided = rerouteResult.restrictionsAvoided;
                geometry = rerouteResult.geometry;
              } else {
                // FAILED: No safe route possible - BLOCK
                console.error(`[SAFETY] ✗ Cannot find safe route - blocking for safety`);
                return res.status(403).json({
                  message: `Route contains ${criticalViolations.length} critical restriction(s) that cannot be bypassed`,
                  routeBlocked: true,
                  canBypass: false,
                  violations: criticalViolations.map(v => ({
                    type: v.restriction.type,
                    location: v.restriction.location,
                    description: v.restriction.description,
                    limit: v.restriction.limit,
                    yourValue: v.restriction.type === 'height' ? vehicleProfile.height :
                              v.restriction.type === 'width' ? vehicleProfile.width :
                              vehicleProfile.weight,
                    severity: v.severity,
                    roadName: v.restriction.roadName
                  })),
                  suggestion: "No safe route available. The system tried multiple alternatives but all paths contain restrictions unsafe for your vehicle. Please choose a different destination or adjust your vehicle profile."
                });
              }
            }
            
            // Log bypassable violations for information
            const bypassableViolations = routeViolations.filter(v => v.bypassable);
            if (bypassableViolations.length > 0) {
              console.log(`[INFO] Route contains ${bypassableViolations.length} bypassable advisory restrictions`);
            }
          }
        }
      }

      // Fallback geometry creation if not provided by truck-safe routing
      if (!geometry) {
        const routeCoordinates = [
          [startCoords.lng, startCoords.lat],
          [startCoords.lng + (endCoords.lng - startCoords.lng) * 0.25, startCoords.lat + (endCoords.lat - startCoords.lat) * 0.25],
          [startCoords.lng + (endCoords.lng - startCoords.lng) * 0.5, startCoords.lat + (endCoords.lat - startCoords.lat) * 0.5],
          [startCoords.lng + (endCoords.lng - startCoords.lng) * 0.75, startCoords.lat + (endCoords.lat - startCoords.lat) * 0.75],
          [endCoords.lng, endCoords.lat]
        ];
        
        geometry = {
          type: "LineString" as const,
          coordinates: routeCoordinates
        };
        
        routePath = [
          startCoords,
          { lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.25, lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.25 },
          { lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.5, lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.5 },
          { lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.75, lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.75 },
          endCoords
        ];
      }
      
      // Validate geometry using schema
      const geometryValidation = geoJsonLineStringSchema.safeParse(geometry);
      if (!geometryValidation.success) {
        console.error('Route geometry validation failed:', geometryValidation.error);
        return res.status(500).json({ 
          message: "Failed to generate valid route geometry",
          errors: geometryValidation.error.errors
        });
      }

      // Get nearby facilities along the route
      const facilitiesNearby = await storage.searchFacilities({
        coordinates: { lat: (startCoords.lat + endCoords.lat) / 2, lng: (startCoords.lng + endCoords.lng) / 2 },
        radius: 50
      });

      const routeData = {
        startLocation,
        endLocation,
        startCoordinates: startCoords,
        endCoordinates: endCoords,
        distance: routeDistance,
        duration: routeDuration,
        vehicleProfileId,
        routePath,
        geometry: geometryValidation.data,
        restrictionsAvoided,
        facilitiesNearby: facilitiesNearby.slice(0, 5).map(f => f.id), // Limit to 5 facilities
      };
      
      const route = await storage.createRoute(routeData);
      
      // Create a planned journey entry ONLY for authenticated users
      let plannedJourney = null;
      if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
        const sessionId = req.sessionID || 'authenticated';
        plannedJourney = await storage.startJourney(route.id, undefined, sessionId);
        
        // Verify the journey was created with 'planned' status as expected
        if (plannedJourney.status !== 'planned') {
          throw new Error(`Journey created with unexpected status: ${plannedJourney.status}, expected: planned`);
        }
      }
      
      // Return the route with enhanced truck-safe information
      res.json({
        ...route,
        plannedJourney: plannedJourney,
        truckSafeFeatures: {
          restrictionsChecked: restrictionsAvoided.length,
          vehicleTypeOptimized: vehicleProfile?.type || 'car',
          heightClearance: vehicleProfile?.height || 0,
          complianceLevel: vehicleProfile?.type ? getVehicleComplianceLevel(vehicleProfile.type) : 'basic',
          weightLimit: vehicleProfile?.weight || 0,
          facilitiesCount: facilitiesNearby.length
        }
      });
    } catch (error) {
      console.error("Route calculation error:", error);
      res.status(500).json({ message: "Failed to calculate route" });
    }
  });

  // Get single route by ID
  app.get("/api/routes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const route = await storage.getRoute(id);
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      console.error("[ROUTE-GET] Error fetching route:", error);
      res.status(500).json({ message: "Failed to get route" });
    }
  });

  app.get("/api/routes/favorites", requireSubscription, async (req, res) => {
    try {
      const routes = await storage.getFavoriteRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get favorite routes" });
    }
  });

  app.patch("/api/routes/:id/favorite", requireSubscription, validateId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isFavorite } = req.body;
      
      const route = await storage.updateRoute(id, { isFavorite });
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      res.status(500).json({ message: "Failed to update route" });
    }
  });

  // Lane Guidance
  app.get("/api/routes/:id/lanes", requireSubscription, validateId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const laneGuidance = await storage.getLaneGuidance(id);
      if (laneGuidance === null) {
        return res.status(404).json({ message: "Route not found or lane guidance unavailable" });
      }
      
      res.json(laneGuidance);
    } catch (error) {
      res.status(500).json({ message: "Failed to get lane guidance" });
    }
  });

  // Zod schema for lane selection request
  const laneSelectionSchema = z.object({
    selections: z.record(z.string(), z.number()).refine(
      (selections) => {
        const stepIndices = Object.keys(selections).map(Number);
        const laneIndices = Object.values(selections);
        return stepIndices.every(step => step >= 0) && laneIndices.every(lane => lane >= 0);
      },
      { message: "Step indices and lane indices must be non-negative numbers" }
    ),
  });

  app.patch("/api/routes/:id/lanes/select", requireSubscription, validateId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = laneSelectionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid lane selection data", errors: result.error.errors });
      }
      
      // Convert string keys back to numbers for the selections record
      const selections: Record<number, number> = {};
      Object.entries(result.data.selections).forEach(([step, lane]) => {
        selections[parseInt(step)] = lane;
      });
      
      await storage.setLaneSelection(id, selections);
      res.json({ message: "Lane selections saved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to save lane selections" });
    }
  });

  // Route Monitoring - Supports anonymous users (no auth required)
  app.post("/api/routes/:id/monitor", validateId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const route = await storage.getRoute(id);
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Return success for now - monitoring is handled by the route monitor service
      res.json({ message: "Route monitoring started", routeId: id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start route monitoring" });
    }
  });

  // Traffic Incidents
  app.get("/api/traffic-incidents", async (req, res) => {
    try {
      const { north, south, east, west, active } = req.query;
      
      if (north && south && east && west) {
        // Get incidents by area
        const bounds = {
          north: parseFloat(north as string),
          south: parseFloat(south as string),
          east: parseFloat(east as string),
          west: parseFloat(west as string),
        };
        const incidents = await storage.getTrafficIncidentsByArea(bounds);
        res.json(incidents);
      } else if (active === 'true') {
        // Get all active incidents
        const incidents = await storage.getActiveTrafficIncidents();
        res.json(incidents);
      } else {
        // Return empty array if no parameters provided (prevents 400 errors on initial load)
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get traffic incidents" });
    }
  });

  app.post("/api/traffic-incidents", validateTrafficIncident, validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertTrafficIncidentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid traffic incident data", errors: result.error.errors });
      }
      
      const incident = await storage.createTrafficIncident(result.data);
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Failed to create traffic incident" });
    }
  });

  app.get("/api/traffic-incidents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const incident = await storage.getTrafficIncident(id);
      
      if (!incident) {
        return res.status(404).json({ message: "Traffic incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Failed to get traffic incident" });
    }
  });

  app.patch("/api/traffic-incidents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const incident = await storage.updateTrafficIncident(id, updates);
      if (!incident) {
        return res.status(404).json({ message: "Traffic incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Failed to update traffic incident" });
    }
  });

  app.patch("/api/traffic-incidents/:id/resolve", async (req, res) => {
    try {
      const { id } = req.params;
      
      const incident = await storage.resolveTrafficIncident(id);
      if (!incident) {
        return res.status(404).json({ message: "Traffic incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve traffic incident" });
    }
  });

  app.patch("/api/traffic-incidents/:id/verify", async (req, res) => {
    try {
      const { id } = req.params;
      
      const incident = await storage.verifyTrafficIncident(id);
      if (!incident) {
        return res.status(404).json({ message: "Traffic incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify traffic incident" });
    }
  });

  // TomTom Traffic Incidents API - Real-time incidents from TomTom
  app.get("/api/tomtom/traffic-incidents", async (req, res) => {
    try {
      const { north, south, east, west } = req.query;
      
      if (!north || !south || !east || !west) {
        return res.status(400).json({ message: "Bounding box coordinates are required (north, south, east, west)" });
      }
      
      const TOMTOM_API_KEY = process.env.VITE_TOMTOM_API_KEY;
      
      if (!TOMTOM_API_KEY) {
        console.error('[TOMTOM-INCIDENTS] API key not found');
        return res.status(500).json({ message: "TomTom API key not configured" });
      }
      
      // Build TomTom Traffic Incidents API URL
      // API format: https://api.tomtom.com/traffic/services/5/incidentDetails
      const tomtomUrl = new URL('https://api.tomtom.com/traffic/services/5/incidentDetails');
      
      // Add API key
      tomtomUrl.searchParams.set('key', TOMTOM_API_KEY);
      
      // Set bounding box (minLon,minLat,maxLon,maxLat)
      const bbox = `${west},${south},${east},${north}`;
      tomtomUrl.searchParams.set('bbox', bbox);
      
      // Request fields for detailed incident information
      tomtomUrl.searchParams.set('fields', '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,aci{probabilityOfOccurrence,numberOfReports,lastReportTime}}}}');
      
      // Language preference
      tomtomUrl.searchParams.set('language', 'en-GB');
      
      // Output format
      tomtomUrl.searchParams.set('categoryFilter', 'all');
      tomtomUrl.searchParams.set('timeValidityFilter', 'present');
      
      console.log('[TOMTOM-INCIDENTS] Request URL:', tomtomUrl.toString().replace(TOMTOM_API_KEY, '***'));
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(tomtomUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TruckNav-Pro/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TOMTOM-INCIDENTS] API error: HTTP ${response.status}`, errorText);
        return res.status(response.status).json({ message: "TomTom API error", details: errorText });
      }

      const data = await response.json();
      
      // Transform TomTom incidents to our app's format
      const incidents = (data.incidents || []).map((incident: any) => {
        const props = incident.properties || {};
        const geometry = incident.geometry || {};
        const events = props.events || [];
        
        // Map TomTom icon category to our incident types
        const iconCategoryMap: Record<number, string> = {
          0: 'other',
          1: 'accident',
          2: 'fog',
          3: 'hazard',
          4: 'construction',
          5: 'ice',
          6: 'jam',
          7: 'lane_closed',
          8: 'road_closed',
          9: 'road_works',
          10: 'wind',
          11: 'flooding',
          14: 'broken_down_vehicle'
        };
        
        const incidentType = iconCategoryMap[props.iconCategory] || 'other';
        
        // Get coordinates (TomTom uses GeoJSON format)
        let latitude = 0;
        let longitude = 0;
        
        if (geometry.type === 'Point' && geometry.coordinates && geometry.coordinates.length >= 2) {
          longitude = geometry.coordinates[0];
          latitude = geometry.coordinates[1];
        } else if (geometry.type === 'LineString' && geometry.coordinates && geometry.coordinates.length > 0) {
          // Use midpoint of line for better representation
          const midIndex = Math.floor(geometry.coordinates.length / 2);
          const midpoint = geometry.coordinates[midIndex];
          if (midpoint && midpoint.length >= 2) {
            longitude = midpoint[0];
            latitude = midpoint[1];
          }
        } else if (geometry.coordinates && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
          // Fallback: try to extract coordinates from any array format
          longitude = geometry.coordinates[0];
          latitude = geometry.coordinates[1];
        }
        
        // Build description from events
        const description = events.map((e: any) => e.description).filter(Boolean).join('. ') || 'Traffic incident';
        
        // Calculate severity based on delay magnitude (TomTom scale: 0=Unknown, 1=Minor, 2=Moderate, 3=Major, 4=Undefined)
        // Also consider delay time in seconds
        const delayMagnitude = props.magnitudeOfDelay || 0;
        const delaySeconds = props.delay || 0;
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        
        // Primary: use delay magnitude
        if (delayMagnitude === 4 || delayMagnitude === 3) {
          severity = 'high';
        } else if (delayMagnitude === 2) {
          severity = 'medium';
        } else if (delayMagnitude === 1) {
          severity = 'low';
        } else if (delayMagnitude === 0) {
          // Fallback: use delay time if magnitude is unknown
          if (delaySeconds >= 1800) severity = 'high'; // 30+ min delay
          else if (delaySeconds >= 600) severity = 'medium'; // 10+ min delay
          else severity = 'low';
        }
        
        // Upgrade severity for critical incident types
        if (props.iconCategory === 1 || props.iconCategory === 8) {
          // Accident or Road Closed = always high severity
          severity = 'high';
        }
        
        return {
          id: `tomtom-${props.id}`,
          type: incidentType,
          description: description,
          latitude: latitude,
          longitude: longitude,
          severity: severity,
          reportedAt: props.startTime || new Date().toISOString(),
          expiresAt: props.endTime || null,
          isActive: true,
          verifiedCount: 1, // TomTom data is pre-verified
          source: 'tomtom',
          roadNumbers: props.roadNumbers || [],
          delay: props.delay || 0,
          length: props.length || 0,
          from: props.from || null,
          to: props.to || null,
          geometry: geometry
        };
      });
      
      console.log(`[TOMTOM-INCIDENTS] Retrieved ${incidents.length} incidents`);
      
      res.json(incidents);
    } catch (error) {
      console.error('[TOMTOM-INCIDENTS] API call failed:', error);
      res.status(500).json({ message: "Failed to fetch TomTom traffic incidents" });
    }
  });

  // User-Reported Traffic Incidents API
  app.post("/api/incidents", validateTrafficIncident, validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertTrafficIncidentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid incident data", errors: result.error.errors });
      }

      const incident = await storage.createIncident(result.data);
      res.status(201).json(incident);
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ message: "Failed to create incident" });
    }
  });

  app.get("/api/incidents", async (req: Request, res: Response) => {
    try {
      const incidents = await storage.getAllActiveIncidents();
      res.json(incidents);
    } catch (error) {
      console.error('Error getting active incidents:', error);
      res.status(500).json({ message: "Failed to get active incidents" });
    }
  });

  app.get("/api/incidents/nearby", async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "lat and lng query parameters are required" });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusKm = radius ? parseFloat(radius as string) : 50;

      if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
        return res.status(400).json({ message: "Invalid lat, lng, or radius values" });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      if (radiusKm <= 0 || radiusKm > 500) {
        return res.status(400).json({ message: "Radius must be between 0 and 500 km" });
      }

      const incidents = await storage.getIncidentsNearLocation(latitude, longitude, radiusKm);
      res.json(incidents);
    } catch (error) {
      console.error('Error getting nearby incidents:', error);
      res.status(500).json({ message: "Failed to get nearby incidents" });
    }
  });

  // Location Management
  app.get("/api/locations", validatePagination, validateRequest, async (req: Request, res: Response) => {
    try {
      const { favorites } = req.query;
      const options: { favorites?: boolean } = {};
      
      if (favorites === 'true') {
        options.favorites = true;
      }
      
      const locations = await storage.getLocations(options);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get locations" });
    }
  });

  app.post("/api/locations", validateLocation, validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertLocationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid location data", errors: result.error.errors });
      }
      
      const location = await storage.createLocation(result.data);
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  app.patch("/api/locations/:id", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Validate the updates if provided
      if (Object.keys(updates).length > 0) {
        const partialSchema = insertLocationSchema.partial();
        const result = partialSchema.safeParse(updates);
        if (!result.success) {
          return res.status(400).json({ message: "Invalid location update data", errors: result.error.errors });
        }
      }
      
      const location = await storage.updateLocation(parseInt(id), updates);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.post("/api/locations/:id/use", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const location = await storage.markLocationUsed(parseInt(id));
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark location as used" });
    }
  });

  // Postcode/ZIP Code Search
  app.get("/api/postcodes/search", validatePostcodeSearch, validateRequest, async (req: Request, res: Response) => {
    try {
      const { postcode, country, strict } = req.query;
      
      if (!postcode || typeof postcode !== 'string') {
        return res.status(400).json({ message: "Postcode parameter is required" });
      }
      
      const results = await storage.searchPostcode(
        postcode, 
        country as string | undefined
      );
      
      // Return empty array if no results found (not an error)
      res.json(results);
    } catch (error) {
      console.error("Postcode search error:", error);
      res.status(500).json({ message: "Failed to search postcodes" });
    }
  });

  app.post("/api/postcodes/geocode", validatePostcodeGeocoding, validateRequest, async (req: Request, res: Response) => {
    try {
      const { postcode, country } = req.body;
      
      if (!postcode || typeof postcode !== 'string') {
        return res.status(400).json({ message: "Postcode is required" });
      }
      
      const result = await storage.geocodePostcode(postcode, country);
      
      if (!result) {
        return res.status(404).json({ 
          message: "Postcode not found",
          postcode,
          country: country || "auto-detect"
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Postcode geocoding error:", error);
      res.status(500).json({ message: "Failed to geocode postcode" });
    }
  });

  // Helper function to calculate distance between two coordinates (Haversine formula)
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Photon API Proxy - Address Autocomplete with POI Support
  app.get("/api/photon-autocomplete", async (req: Request, res: Response) => {
    try {
      const { q, limit, osm_tag, lat, lon } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      const photonUrl = new URL('https://photon.komoot.io/api');
      photonUrl.searchParams.set('q', q);
      photonUrl.searchParams.set('limit', '50'); // Request more results for filtering
      
      // Add POI filtering if osm_tag provided (e.g., "shop:supermarket", "amenity:restaurant")
      if (osm_tag && typeof osm_tag === 'string') {
        photonUrl.searchParams.set('osm_tag', osm_tag);
      }
      
      // Add GPS coordinates for location-biased search (POI near me)
      const userLat = lat && typeof lat === 'string' ? parseFloat(lat) : null;
      const userLon = lon && typeof lon === 'string' ? parseFloat(lon) : null;
      
      if (userLat !== null && userLon !== null && !isNaN(userLat) && !isNaN(userLon)) {
        photonUrl.searchParams.set('lat', lat as string);
        photonUrl.searchParams.set('lon', lon as string);
        console.log(`[PHOTON-PROXY] Location-biased search: lat=${userLat}, lon=${userLon}`);
      }
      
      console.log('[PHOTON-PROXY] Request URL:', photonUrl.toString());
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const photonResponse = await fetch(photonUrl.toString(), {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TruckNav-Pro/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!photonResponse.ok) {
          const errorText = await photonResponse.text();
          console.error(`[PHOTON-PROXY] API error: HTTP ${photonResponse.status}`, errorText);
          return res.status(photonResponse.status).json({ 
            message: `Photon API error: HTTP ${photonResponse.status}`,
            features: []
          });
        }
        
        const data = await photonResponse.json();
        let features = data.features || [];
        
        // CRITICAL: Filter by distance if GPS coordinates provided and POI search (osm_tag)
        // This prevents showing results from wrong countries and prioritizes nearby POIs
        if (userLat !== null && userLon !== null && osm_tag) {
          const MAX_DISTANCE_KM = 150; // 150km radius for POI search to show local amenities
          
          // Calculate distance for each feature and attach it
          const featuresWithDistance = features.map((feature: any) => {
            if (!feature.geometry?.coordinates || feature.geometry.coordinates.length < 2) {
              return { feature, distance: Infinity };
            }
            
            const [featureLon, featureLat] = feature.geometry.coordinates;
            const distance = calculateDistance(userLat, userLon, featureLat, featureLon);
            
            return { feature, distance };
          });
          
          // Filter by distance
          const filtered = featuresWithDistance.filter(({ distance }: { distance: number }) => {
            if (distance > MAX_DISTANCE_KM) {
              return false;
            }
            return true;
          });
          
          // Sort by distance (nearest first)
          filtered.sort((a: any, b: any) => a.distance - b.distance);
          
          // Extract features
          features = filtered.map(({ feature, distance }: { feature: any; distance: number }) => {
            console.log(`[PHOTON-PROXY] POI: ${feature.properties?.name || 'Unknown'} - ${distance.toFixed(2)}km away`);
            return feature;
          });
          
          console.log(`[PHOTON-PROXY] Distance filtering: ${data.features?.length || 0} -> ${features.length} results within ${MAX_DISTANCE_KM}km, sorted by distance`);
        }
        
        // Limit final results
        const limitNum = parseInt(limit as string || '10');
        features = features.slice(0, limitNum);
        
        console.log('[PHOTON-PROXY] Success:', features.length, 'results returned');
        res.json({ ...data, features });
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('[PHOTON-PROXY] Timeout after 5 seconds');
          return res.status(504).json({ 
            message: 'Request timeout after 5 seconds',
            features: []
          });
        }
        
        throw fetchError;
      }
      
    } catch (error) {
      console.error("[PHOTON-PROXY] Proxy error:", error);
      res.status(500).json({ 
        message: "Failed to fetch autocomplete results",
        features: []
      });
    }
  });

  // TomTom Search API Proxy - Address Autocomplete & POI Search
  app.get("/api/tomtom-search", async (req: Request, res: Response) => {
    try {
      const { q, limit, searchType, categorySet, lat, lon, countrySet, radius } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      const TOMTOM_API_KEY = process.env.VITE_TOMTOM_API_KEY;
      
      if (!TOMTOM_API_KEY) {
        console.error('[TOMTOM-PROXY] API key not found');
        return res.status(500).json({ message: "TomTom API key not configured" });
      }
      
      const type = searchType === 'poi' ? 'poiSearch' : 'search'; // POI or fuzzy search
      const tomtomUrl = new URL(`https://api.tomtom.com/search/2/${type}/${encodeURIComponent(q)}.json`);
      
      tomtomUrl.searchParams.set('key', TOMTOM_API_KEY);
      tomtomUrl.searchParams.set('limit', limit as string || '10');
      tomtomUrl.searchParams.set('typeahead', 'true'); // Enable typeahead for autocomplete
      
      // Add GPS coordinates for location-biased search
      const userLat = lat && typeof lat === 'string' ? parseFloat(lat) : null;
      const userLon = lon && typeof lon === 'string' ? parseFloat(lon) : null;
      
      if (userLat !== null && userLon !== null && !isNaN(userLat) && !isNaN(userLon)) {
        tomtomUrl.searchParams.set('lat', userLat.toString());
        tomtomUrl.searchParams.set('lon', userLon.toString());
        console.log(`[TOMTOM-PROXY] Location-biased search: lat=${userLat}, lon=${userLon}`);
      }
      
      // Add search radius in meters (e.g., 6 miles = 9656 meters)
      if (radius && typeof radius === 'string') {
        const radiusMeters = parseInt(radius, 10);
        if (!isNaN(radiusMeters) && radiusMeters > 0) {
          tomtomUrl.searchParams.set('radius', radiusMeters.toString());
          console.log(`[TOMTOM-PROXY] Search radius: ${radiusMeters}m (${(radiusMeters / 1609.34).toFixed(1)} miles)`);
        }
      }
      
      // Add POI category filter
      if (categorySet && typeof categorySet === 'string') {
        tomtomUrl.searchParams.set('categorySet', categorySet);
      }
      
      // Add country filter
      if (countrySet && typeof countrySet === 'string') {
        tomtomUrl.searchParams.set('countrySet', countrySet);
      }
      
      console.log('[TOMTOM-PROXY] Request URL:', tomtomUrl.toString().replace(TOMTOM_API_KEY, '***'));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const tomtomResponse = await fetch(tomtomUrl.toString(), {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TruckNav-Pro/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!tomtomResponse.ok) {
          const errorText = await tomtomResponse.text();
          console.error(`[TOMTOM-PROXY] API error: HTTP ${tomtomResponse.status}`, errorText);
          return res.status(tomtomResponse.status).json({ 
            message: `TomTom API error: HTTP ${tomtomResponse.status}`,
            results: []
          });
        }
        
        const data = await tomtomResponse.json();
        const results = data.results || [];
        
        console.log('[TOMTOM-PROXY] Success:', results.length, 'results returned');
        res.json(data);
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('[TOMTOM-PROXY] Timeout after 8 seconds');
          return res.status(504).json({ 
            message: 'Request timeout after 8 seconds',
            results: []
          });
        }
        
        throw fetchError;
      }
      
    } catch (error) {
      console.error("[TOMTOM-PROXY] Proxy error:", error);
      res.status(500).json({ 
        message: "Failed to fetch TomTom search results",
        results: []
      });
    }
  });

  // Enhanced Speed Limit & Road Info Lookup using OpenStreetMap Overpass API
  app.get("/api/speed-limit", async (req: Request, res: Response) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }
      
      // Query OpenStreetMap Overpass API for detailed road information
      const radius = 100; // Increased from 50m to 100m for better coverage
      const query = `
        [out:json][timeout:5];
        (
          way[highway](around:${radius},${latitude},${longitude});
          node[highway=motorway_junction](around:500,${latitude},${longitude});
        );
        out tags;
      `;
      
      const overpassResponse = await fetch(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`
        }
      );
      
      if (!overpassResponse.ok) {
        console.warn('[SPEED-LIMIT] Overpass API error:', overpassResponse.status);
        return res.json({ speedLimit: null, source: 'unavailable' });
      }
      
      const data = await overpassResponse.json();
      
      // Helper function to estimate speed limits based on road type
      const estimateSpeedLimit = (roadType: string): number | null => {
        const speedEstimates: Record<string, number> = {
          'motorway': 120,
          'motorway_link': 80,
          'trunk': 100,
          'trunk_link': 70,
          'primary': 80,
          'primary_link': 60,
          'secondary': 60,
          'tertiary': 50,
          'residential': 30,
          'living_street': 20,
          'service': 20,
          'unclassified': 50
        };
        return speedEstimates[roadType] || null;
      };
      
      // Extract road information from nearest road
      if (data.elements && data.elements.length > 0) {
        // Separate ways (roads) from nodes (junctions)
        const ways = data.elements.filter((el: any) => el.type === 'way');
        const junctions = data.elements.filter((el: any) => el.type === 'node' && el.tags?.highway === 'motorway_junction');
        
        // Find nearest road
        const nearestRoad = ways.length > 0 ? ways[0] : null;
        
        if (nearestRoad?.tags) {
          const tags = nearestRoad.tags;
          const maxspeed = tags.maxspeed;
          const roadType = tags.highway;
          
          // Parse speed limit (handles formats like "50", "50 mph", "50 km/h")
          let speedKmh: number | null = null;
          let speedSource: string = 'not_found';
          
          if (maxspeed) {
            if (maxspeed === 'none' || maxspeed === 'signals') {
              // No speed limit or variable speed limit
              speedKmh = null;
              speedSource = 'variable';
            } else if (maxspeed.includes('mph')) {
              // Convert mph to km/h
              const mph = parseInt(maxspeed.replace(/[^0-9]/g, ''));
              speedKmh = Math.round(mph * 1.60934);
              speedSource = 'openstreetmap';
            } else {
              // Assume km/h
              speedKmh = parseInt(maxspeed.replace(/[^0-9]/g, ''));
              speedSource = 'openstreetmap';
            }
          } else if (roadType) {
            // Fallback: estimate based on road type
            speedKmh = estimateSpeedLimit(roadType);
            speedSource = 'estimated';
          }
          
          // Extract road reference (e.g., "M25", "A1", "I-95")
          const roadRef = tags.ref || null;
          
          // Extract road name
          let roadName = tags.name || null;
          
          // If we have a ref, prioritize it over name for motorways
          if (roadRef && (roadType === 'motorway' || roadType === 'trunk')) {
            roadName = roadRef;
          }
          
          // Extract junction information
          let junctionInfo = null;
          if (junctions.length > 0) {
            const nearestJunction = junctions[0];
            junctionInfo = {
              name: nearestJunction.tags?.name || null,
              ref: nearestJunction.tags?.ref || null,
              exitTo: nearestJunction.tags?.exit_to || nearestJunction.tags?.destination || null
            };
          }
          
          // Extract destination/direction information
          const destination = tags.destination || tags['destination:ref'] || null;
          const destinationRef = tags['destination:ref'] || null;
          
          return res.json({
            speedLimit: speedKmh,
            source: speedSource,
            confidence: speedSource === 'openstreetmap' ? 'high' : speedSource === 'estimated' ? 'medium' : 'low',
            roadType: roadType,
            roadName: roadName,
            roadRef: roadRef,
            destination: destination,
            destinationRef: destinationRef,
            junction: junctionInfo,
            lanes: tags.lanes ? parseInt(tags.lanes) : null,
            surface: tags.surface || null,
            oneway: tags.oneway === 'yes'
          });
        }
      }
      
      // No road data found - return null with fallback info
      console.log('[SPEED-LIMIT] No road data found near coordinates');
      res.json({ speedLimit: null, source: 'not_found', confidence: 'none' });
      
    } catch (error) {
      console.error("[SPEED-LIMIT] Lookup error:", error);
      res.status(500).json({ message: "Failed to get speed limit", speedLimit: null, source: 'error' });
    }
  });

  // Journey Management
  app.get("/api/journeys", requireSubscription, validatePagination, validateRequest, async (req: Request, res: Response) => {
    try {
      const { limit, offset } = req.query;
      const parsedLimit = limit ? parseInt(limit as string) : undefined;
      const parsedOffset = offset ? parseInt(offset as string) : undefined;
      
      const journeys = await storage.getJourneyHistory(parsedLimit, parsedOffset);
      res.json(journeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to get journey history" });
    }
  });

  app.get("/api/journeys/last", requireSubscription, async (req: Request, res: Response) => {
    try {
      const journey = await storage.getLastJourney();
      if (!journey) {
        return res.status(404).json({ message: "No journeys found" });
      }
      
      res.json(journey);
    } catch (error) {
      res.status(500).json({ message: "Failed to get last journey" });
    }
  });

  // Get active journey for current session (no auth required - PWA needs this)
  app.get("/api/journeys/active", async (req: Request, res: Response) => {
    try {
      const sessionId = req.sessionID || 'anonymous';
      console.log(`[JOURNEY-ACTIVE] Checking for active journey for session: ${sessionId.substring(0, 8)}...`);
      
      // Get the most recent journey for this session
      const journey = await storage.getLastJourney();
      
      if (!journey) {
        console.log('[JOURNEY-ACTIVE] No journeys found');
        return res.status(404).json({ message: "No active journey" });
      }
      
      // Only return if journey is active or planned
      if (journey.status === 'active' || journey.status === 'planned') {
        console.log(`[JOURNEY-ACTIVE] Found ${journey.status} journey ${journey.id}`);
        res.json(journey);
      } else {
        console.log(`[JOURNEY-ACTIVE] Journey ${journey.id} has status ${journey.status}, not active`);
        res.status(404).json({ message: "No active journey" });
      }
    } catch (error) {
      console.error("[JOURNEY-ACTIVE] Error:", error);
      res.status(500).json({ message: "Failed to get active journey" });
    }
  });

  // Get journey by ID with route data
  app.get("/api/journeys/:id", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const journey = await storage.getJourney(parseInt(id));
      if (!journey) {
        return res.status(404).json({ message: "Journey not found" });
      }
      
      // Fetch the associated route
      const route = await storage.getRoute(journey.routeId);
      
      // Return journey with route embedded
      res.json({
        ...journey,
        route: route || null
      });
    } catch (error) {
      console.error(`[JOURNEY-GET] Error fetching journey:`, error);
      res.status(500).json({ message: "Failed to get journey" });
    }
  });

  // Navigation endpoints support anonymous users - no auth required (uses session tracking)
  app.post("/api/journeys/start", validateJourney, validateRequest, async (req: Request, res: Response) => {
    try {
      const { routeId } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;
      
      // Validate that the route exists
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Check for existing journey with same route (idempotency) 
      if (idempotencyKey) {
        const sessionId = req.sessionID || 'anonymous';
        const existingJourney = await storage.getJourneyByIdempotencyKey(idempotencyKey, sessionId);
        if (existingJourney) {
          // Validate invariant: existing journey must match requested routeId
          if (existingJourney.routeId !== routeId) {
            return res.status(409).json({ 
              error: 'Idempotency key conflict: route mismatch',
              details: `Key was used for route ${existingJourney.routeId}, but requested ${routeId}`
            });
          }
          return res.json(existingJourney);
        }
      }
      
      const sessionId = req.sessionID || 'anonymous';
      const journey = await storage.startJourney(routeId, idempotencyKey, sessionId);
      res.json(journey);
    } catch (error) {
      res.status(500).json({ message: "Failed to start journey" });
    }
  });

  // Navigation endpoints support anonymous users - no subscription required
  app.patch("/api/journeys/:id/activate", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    const { id } = req.params;
    const idempotencyKey = req.headers['idempotency-key'] as string;
    console.log(`[JOURNEY ACTIVATION] Starting activation for journey ${id} with key: ${idempotencyKey}`);
    
    try {
      
      // Check for duplicate activation with same key
      if (idempotencyKey) {
        const sessionId = req.sessionID || 'anonymous';
        const existingJourney = await storage.getJourneyByIdempotencyKey(idempotencyKey, sessionId);
        if (existingJourney && existingJourney.status === 'active') {
          // Validate invariant: existing journey must match requested ID
          if (existingJourney.id !== parseInt(id)) {
            return res.status(409).json({
              error: 'Idempotency key conflict: journey ID mismatch', 
              details: `Key was used for journey ${existingJourney.id}, but requested ${id}`
            });
          }
          return res.json(existingJourney);
        }
      }
      
      const sessionId = req.sessionID || 'anonymous';
      const journey = await storage.activateJourney(parseInt(id), idempotencyKey, sessionId);
      if (!journey) {
        return res.status(404).json({ message: "Journey not found" });
      }
      
      res.json(journey);
    } catch (error) {
      const journeyId = req.params.id;
      console.error(`[JOURNEY ACTIVATION ERROR] Journey ${journeyId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[JOURNEY ACTIVATION ERROR] Details: ${errorMessage}`);
      res.status(500).json({ 
        message: "Failed to activate journey",
        error: errorMessage 
      });
    }
  });

  // Navigation endpoints support anonymous users - no subscription required
  app.patch("/api/journeys/:id/complete", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // CRITICAL LOGGING: Track who's completing journeys
      console.log('====================================');
      console.log(`[JOURNEY-COMPLETE] 🔴 JOURNEY ${id} IS BEING COMPLETED!`);
      console.log(`[JOURNEY-COMPLETE] Session ID: ${req.sessionID || 'anonymous'}`);
      console.log(`[JOURNEY-COMPLETE] User-Agent: ${req.headers['user-agent']}`);
      console.log(`[JOURNEY-COMPLETE] Referer: ${req.headers['referer']}`);
      console.log(`[JOURNEY-COMPLETE] Origin: ${req.headers['origin']}`);
      console.log(`[JOURNEY-COMPLETE] Request body:`, req.body);
      console.log('====================================');
      
      const journey = await storage.completeJourney(parseInt(id));
      if (!journey) {
        return res.status(404).json({ message: "Journey not found" });
      }
      
      console.log(`[JOURNEY-COMPLETE] ✅ Journey ${id} marked as completed at ${journey.completedAt}`);
      res.json(journey);
    } catch (error) {
      console.error(`[JOURNEY-COMPLETE] ❌ Error completing journey ${id}:`, error);
      res.status(500).json({ message: "Failed to complete journey" });
    }
  });

  // Initialize Stripe (will be available when user provides API keys)
  let stripe: Stripe | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY;
  if (stripeKey) {
    stripe = new Stripe(stripeKey);
  }

  // Subscription Plans
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription plans" });
    }
  });

  // Zod schema for checkout request
  const checkoutSchema = z.object({
    planId: z.string().min(1, "Plan ID is required"),
    userEmail: z.string().email("Valid email is required"),
  });

  // Stripe Checkout Session Creation
  app.post("/api/stripe/checkout", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Stripe not configured. Please add STRIPE_SECRET_KEY environment variable." });
    }

    try {
      const result = checkoutSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.errors });
      }
      
      const { planId, userEmail } = result.data;

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Find or create user
      let user = await storage.getUserByEmail(userEmail);
      if (!user) {
        user = await storage.createUser({ email: userEmail });
      }

      // Create Stripe Checkout Session
      const sessionOptions: Stripe.Checkout.SessionCreateParams = {
        customer_email: userEmail,
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        mode: plan.isLifetime ? 'payment' : 'subscription',
        success_url: `${process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : (req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5000')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : (req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5000')}/subscription/plans`,
        metadata: {
          planId: plan.id,
          userId: user.id,
        },
      };

      const session = await stripe.checkout.sessions.create(sessionOptions);
      
      res.json({ 
        sessionId: session.id,
        url: session.url 
      });
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      res.status(500).json({ message: "Failed to create checkout session", error: error.message });
    }
  });

  // Stripe Webhook Handler
  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Stripe not configured" });
    }

    try {
      const sig = req.headers['stripe-signature'];
      let event: Stripe.Event;

      if (process.env.STRIPE_WEBHOOK_SECRET) {
        // Verify webhook signature using raw body
        event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
      } else if (process.env.NODE_ENV === 'development') {
        // Only allow unverified webhooks in development
        event = JSON.parse(req.body.toString());
      } else {
        return res.status(400).json({ message: "Webhook signature verification required. Please configure STRIPE_WEBHOOK_SECRET." });
      }

      // Check for duplicate events (idempotency)
      const eventId = event.id;
      // In production, you'd store processed event IDs in database to prevent reprocessing
      
      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const { planId, userId } = session.metadata || {};
          
          if (planId && userId) {
            const plan = await storage.getSubscriptionPlan(planId);
            if (plan) {
              // Check if subscription already exists to avoid duplicates
              const existingSub = await storage.getUserSubscriptionByUserId(userId);
              if (!existingSub) {
                await storage.createUserSubscription({
                  userId,
                  planId,
                  stripeSubscriptionId: session.subscription as string || session.id,
                  status: 'active',
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: plan.isLifetime ? null : new Date(Date.now() + (plan.durationMonths! * 30 * 24 * 60 * 60 * 1000)),
                });
              }
            }
          }
          break;

        case 'payment_intent.succeeded':
          // Handle successful one-time payments (lifetime plans)
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          if (paymentIntent.metadata?.planId && paymentIntent.metadata?.userId) {
            const plan = await storage.getSubscriptionPlan(paymentIntent.metadata.planId);
            if (plan?.isLifetime) {
              const existingSub = await storage.getUserSubscriptionByUserId(paymentIntent.metadata.userId);
              if (!existingSub) {
                await storage.createUserSubscription({
                  userId: paymentIntent.metadata.userId,
                  planId: paymentIntent.metadata.planId,
                  stripeSubscriptionId: paymentIntent.id,
                  status: 'active',
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: null, // Lifetime has no end
                });
              }
            }
          }
          break;

        case 'invoice.paid':
          // Handle successful subscription renewals
          const paidInvoice = event.data.object as Stripe.Invoice;
          const paidSubscriptionId = (paidInvoice as any).subscription;
          if (paidSubscriptionId) {
            const userSub = await storage.getUserSubscriptionByStripeId(paidSubscriptionId);
            if (userSub) {
              await storage.updateUserSubscription(userSub.id, {
                status: 'active',
                currentPeriodStart: new Date((paidInvoice as any).period_start * 1000),
                currentPeriodEnd: new Date((paidInvoice as any).period_end * 1000),
              });
            }
          }
          break;

        case 'invoice.payment_failed':
          // Handle failed payments
          const failedInvoice = event.data.object as Stripe.Invoice;
          const failedSubscriptionId = (failedInvoice as any).subscription;
          if (failedSubscriptionId) {
            const userSub = await storage.getUserSubscriptionByStripeId(failedSubscriptionId);
            if (userSub) {
              await storage.updateUserSubscription(userSub.id, {
                status: 'past_due',
              });
            }
          }
          break;

        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object as Stripe.Subscription;
          const userSubUpdated = await storage.getUserSubscriptionByStripeId(updatedSubscription.id);
          
          if (userSubUpdated) {
            const status = updatedSubscription.status === 'active' ? 'active' : 
                          updatedSubscription.status === 'canceled' ? 'canceled' : 
                          updatedSubscription.status === 'past_due' ? 'past_due' : 'inactive';
            
            await storage.updateUserSubscription(userSubUpdated.id, {
              status,
              currentPeriodStart: (updatedSubscription as any).current_period_start ? new Date((updatedSubscription as any).current_period_start * 1000) : null,
              currentPeriodEnd: (updatedSubscription as any).current_period_end ? new Date((updatedSubscription as any).current_period_end * 1000) : null,
              cancelAt: (updatedSubscription as any).cancel_at ? new Date((updatedSubscription as any).cancel_at * 1000) : null,
              canceledAt: (updatedSubscription as any).canceled_at ? new Date((updatedSubscription as any).canceled_at * 1000) : null,
            });
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          const userSubDeleted = await storage.getUserSubscriptionByStripeId(deletedSubscription.id);
          
          if (userSubDeleted) {
            await storage.updateUserSubscription(userSubDeleted.id, {
              status: 'canceled',
              canceledAt: new Date(),
            });
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).json({ message: "Webhook error", error: error.message });
    }
  });

  // User Subscription Status
  app.get("/api/subscription/status", async (req, res) => {
    try {
      const { userId, email } = req.query;
      
      let user = null;
      if (userId) {
        user = await storage.getUser(userId as string);
      } else if (email) {
        user = await storage.getUserByEmail(email as string);
      } else {
        return res.status(400).json({ message: "userId or email parameter required" });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const subscription = await storage.getUserSubscriptionByUserId(user.id);
      let subscriptionWithPlan = null;
      
      if (subscription) {
        const plan = await storage.getSubscriptionPlan(subscription.planId);
        subscriptionWithPlan = {
          ...subscription,
          plan: plan || null,
        };
      }
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
        },
        subscription: subscriptionWithPlan,
        hasActiveSubscription: subscription?.status === 'active',
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  // =============================================================================
  // TRAFFIC RE-ROUTING SYSTEM API ENDPOINTS
  // =============================================================================

  // Traffic Conditions
  app.get("/api/traffic/current-conditions/:routeId", async (req: Request, res: Response) => {
    try {
      const { routeId } = req.params;
      const route = await storage.getRoute(routeId);
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      const routePath = route.routePath as Array<{ lat: number; lng: number }>;
      const vehicleProfile = route.vehicleProfileId 
        ? await storage.getVehicleProfile(route.vehicleProfileId)
        : undefined;

      const conditions = await trafficService.getTrafficConditions(routePath, vehicleProfile);
      
      // Store conditions for analysis
      await storage.storeTrafficConditions(routeId, conditions);

      res.json({ routeId, conditions });
    } catch (error) {
      console.error('Error getting traffic conditions:', error);
      res.status(500).json({ message: "Failed to get traffic conditions" });
    }
  });

  app.get("/api/traffic/history/:routeId", async (req: Request, res: Response) => {
    try {
      const { routeId } = req.params;
      const hours = parseInt(req.query.hours as string) || 24;
      
      const history = await storage.getTrafficHistory(routeId, hours);
      res.json({ routeId, history });
    } catch (error) {
      console.error('Error getting traffic history:', error);
      res.status(500).json({ message: "Failed to get traffic history" });
    }
  });

  // Alternative Routes
  app.post("/api/traffic/alternatives", validateRequest, async (req: Request, res: Response) => {
    try {
      const { routeId, vehicleProfileId, forceRecalculate = false } = req.body;
      
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      const vehicleProfile = await storage.getVehicleProfile(vehicleProfileId || route.vehicleProfileId!);
      if (!vehicleProfile) {
        return res.status(404).json({ message: "Vehicle profile not found" });
      }

      // Check for existing active alternatives first (unless forcing recalculation)
      if (!forceRecalculate) {
        const existingAlternatives = await storage.getActiveAlternativeRoutes(routeId);
        if (existingAlternatives.length > 0) {
          return res.json({ 
            routeId, 
            alternatives: existingAlternatives,
            cached: true,
            calculatedAt: existingAlternatives[0].calculatedAt,
          });
        }
      }

      // Calculate new alternatives
      const routePath = route.routePath as Array<{ lat: number; lng: number }>;
      const request = {
        start: routePath[0],
        end: routePath[routePath.length - 1],
        vehicleProfile,
        currentTime: new Date(),
      };

      const result = await trafficService.calculateAlternativeRoutes(request);
      
      // Store alternatives in database
      const storedAlternatives = await Promise.all(
        result.alternatives.map(async (alt) => {
          return await storage.createAlternativeRoute({
            originalRouteId: routeId,
            routePath: alt.routePath,
            distance: alt.distance,
            duration: alt.duration,
            durationWithoutTraffic: alt.durationWithoutTraffic,
            timeSavingsMinutes: alt.timeSavingsMinutes,
            confidenceLevel: alt.confidenceLevel,
            trafficConditions: alt.trafficConditions,
            restrictionsAvoided: alt.restrictionsAvoided,
            viabilityScore: alt.viabilityScore,
            reasonForSuggestion: alt.reasonForSuggestion,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          });
        })
      );

      res.json({
        routeId,
        alternatives: storedAlternatives,
        originalConditions: result.originalRouteConditions,
        calculationTime: result.calculationTime,
        confidence: result.confidence,
        cached: false,
      });
    } catch (error) {
      console.error('Error calculating alternatives:', error);
      res.status(500).json({ message: "Failed to calculate alternative routes" });
    }
  });

  // Route Monitoring
  app.post("/api/traffic/monitor/start", validateRequest, async (req: Request, res: Response) => {
    try {
      const { routeId, journeyId, checkInterval, alertThreshold, autoApply = false } = req.body;
      
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      const vehicleProfile = route.vehicleProfileId 
        ? await storage.getVehicleProfile(route.vehicleProfileId)
        : await storage.getVehicleProfile("default-profile");

      if (!vehicleProfile) {
        return res.status(404).json({ message: "Vehicle profile not found" });
      }

      // Check if monitoring already exists for this route/journey
      const existingMonitoring = journeyId 
        ? await storage.getRouteMonitoringByJourney(journeyId)
        : await storage.getRouteMonitoringByRoute(routeId);

      if (existingMonitoring) {
        return res.json({ 
          message: "Monitoring already active", 
          monitoringId: existingMonitoring.id 
        });
      }

      // Create route monitoring entry
      const monitoring = await storage.createRouteMonitoring({
        routeId,
        journeyId: journeyId || null,
        vehicleProfileId: vehicleProfile.id,
        checkInterval: checkInterval || 300, // 5 minutes default
        alertThreshold: alertThreshold || 5,
        userPreferences: {
          autoApply,
          minTimeSavings: alertThreshold || 5,
        },
      });

      // Start monitoring with route monitor service
      let journey = undefined;
      if (journeyId) {
        journey = await storage.getJourney(journeyId);
      }

      const monitoringId = await routeMonitorService.startMonitoring(
        route,
        vehicleProfile,
        journey,
        {
          checkInterval: (checkInterval || 300) * 1000, // Convert to milliseconds
          alertThreshold: alertThreshold || 5,
          autoApply,
          minTimeSavings: alertThreshold || 5,
        }
      );

      res.json({ 
        message: "Route monitoring started", 
        monitoringId: monitoring.id,
        serviceMonitoringId: monitoringId,
      });
    } catch (error) {
      console.error('Error starting route monitoring:', error);
      res.status(500).json({ message: "Failed to start route monitoring" });
    }
  });

  app.post("/api/traffic/monitor/stop/:monitoringId", validateRequest, async (req: Request, res: Response) => {
    try {
      const { monitoringId } = req.params;
      
      // Stop monitoring in storage
      const stopped = await storage.stopRouteMonitoring(monitoringId);
      if (!stopped) {
        return res.status(404).json({ message: "Monitoring session not found" });
      }

      // Stop monitoring in service
      routeMonitorService.stopMonitoring(monitoringId);

      res.json({ message: "Route monitoring stopped", monitoringId });
    } catch (error) {
      console.error('Error stopping route monitoring:', error);
      res.status(500).json({ message: "Failed to stop route monitoring" });
    }
  });

  app.get("/api/traffic/monitor/status", async (req: Request, res: Response) => {
    try {
      const sessions = routeMonitorService.getMonitoringStatus();
      res.json({ sessions });
    } catch (error) {
      console.error('Error getting monitoring status:', error);
      res.status(500).json({ message: "Failed to get monitoring status" });
    }
  });

  // Re-routing
  app.post("/api/traffic/reroute/apply", validateRequest, async (req: Request, res: Response) => {
    try {
      const { monitoringId, alternativeRouteId, journeyId } = req.body;
      
      if (!monitoringId || !alternativeRouteId) {
        return res.status(400).json({ message: "monitoringId and alternativeRouteId are required" });
      }

      // Get the alternative route
      const alternativeRoute = await storage.getAlternativeRoute(alternativeRouteId);
      if (!alternativeRoute || !alternativeRoute.isActive) {
        return res.status(404).json({ message: "Alternative route not found or expired" });
      }

      // Apply the re-route through the monitoring service
      const result = await routeMonitorService.acceptReRoute(monitoringId, alternativeRouteId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error || "Failed to apply re-route" });
      }

      // Log the re-routing event
      await storage.createReRoutingEvent({
        originalRouteId: alternativeRoute.originalRouteId,
        alternativeRouteId,
        journeyId: journeyId || null,
        triggerReason: "user_requested",
        timeSavingsOffered: alternativeRoute.timeSavingsMinutes,
        userResponse: "accepted",
        appliedAt: new Date(),
      });

      res.json({ 
        message: "Re-route applied successfully", 
        newRoute: result.newRoute,
        timeSavings: alternativeRoute.timeSavingsMinutes,
      });
    } catch (error) {
      console.error('Error applying re-route:', error);
      res.status(500).json({ message: "Failed to apply re-route" });
    }
  });

  app.post("/api/traffic/reroute/decline", validateRequest, async (req: Request, res: Response) => {
    try {
      const { monitoringId, alternativeRouteId, journeyId } = req.body;
      
      if (!monitoringId || !alternativeRouteId) {
        return res.status(400).json({ message: "monitoringId and alternativeRouteId are required" });
      }

      // Get the alternative route
      const alternativeRoute = await storage.getAlternativeRoute(alternativeRouteId);
      if (!alternativeRoute) {
        return res.status(404).json({ message: "Alternative route not found" });
      }

      // Decline the re-route
      routeMonitorService.declineReRoute(monitoringId, alternativeRouteId);

      // Log the declined event
      await storage.createReRoutingEvent({
        originalRouteId: alternativeRoute.originalRouteId,
        alternativeRouteId,
        journeyId: journeyId || null,
        triggerReason: "user_requested",
        timeSavingsOffered: alternativeRoute.timeSavingsMinutes,
        userResponse: "declined",
        appliedAt: null,
      });

      res.json({ message: "Re-route declined" });
    } catch (error) {
      console.error('Error declining re-route:', error);
      res.status(500).json({ message: "Failed to decline re-route" });
    }
  });

  // Statistics and Analytics
  app.get("/api/traffic/stats", async (req: Request, res: Response) => {
    try {
      const { routeId, timeframe = 'week' } = req.query;
      
      const stats = await storage.getReRoutingStats(
        routeId as string | undefined,
        timeframe as 'day' | 'week' | 'month'
      );

      res.json({ stats, timeframe, routeId });
    } catch (error) {
      console.error('Error getting traffic stats:', error);
      res.status(500).json({ message: "Failed to get traffic statistics" });
    }
  });

  app.get("/api/traffic/incidents/:routeId", async (req: Request, res: Response) => {
    try {
      const { routeId } = req.params;
      const { radiusKm = 5 } = req.query;
      
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      const routePath = route.routePath as Array<{ lat: number; lng: number }>;
      const incidents = await trafficService.getTrafficIncidents(routePath, Number(radiusKm));

      res.json({ routeId, incidents, radiusKm: Number(radiusKm) });
    } catch (error) {
      console.error('Error getting traffic incidents:', error);
      res.status(500).json({ message: "Failed to get traffic incidents" });
    }
  });

  // Cleanup and maintenance endpoints
  app.post("/api/traffic/cleanup", validateRequest, async (req: Request, res: Response) => {
    try {
      const expiredAlternatives = await storage.cleanupExpiredAlternatives();
      const cleanedHistory = await storage.cleanupTrafficHistory(48); // Keep 48 hours
      
      res.json({ 
        message: "Cleanup completed",
        expiredAlternatives,
        cleanedHistoryEntries: cleanedHistory,
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
      res.status(500).json({ message: "Failed to perform cleanup" });
    }
  });

  // =============================================================================
  // END TRAFFIC RE-ROUTING SYSTEM
  // =============================================================================

  // =============================================================================
  // ENTERTAINMENT SYSTEM API ROUTES
  // =============================================================================

  // Entertainment Stations
  app.get("/api/entertainment/stations", async (req: Request, res: Response) => {
    try {
      const { platform, type, trucking, limit, search } = req.query;
      
      let stations;
      
      if (search && typeof search === 'string') {
        // Search stations
        stations = await storage.searchEntertainmentStations(search, {
          platform: platform as string,
          type: type as string,
          limit: limit ? parseInt(limit as string) : undefined,
        });
      } else {
        // Get all stations with filters
        stations = await storage.getAllEntertainmentStations({
          platform: platform as string,
          type: type as string,
          trucking: trucking === 'true',
          limit: limit ? parseInt(limit as string) : undefined,
        });
      }
      
      res.json(stations);
    } catch (error) {
      console.error('Error getting entertainment stations:', error);
      res.status(500).json({ message: "Failed to get entertainment stations" });
    }
  });

  app.get("/api/entertainment/stations/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const station = await storage.getEntertainmentStation(id);
      
      if (!station) {
        return res.status(404).json({ message: "Entertainment station not found" });
      }
      
      res.json(station);
    } catch (error) {
      console.error('Error getting entertainment station:', error);
      res.status(500).json({ message: "Failed to get entertainment station" });
    }
  });

  app.post("/api/entertainment/stations", validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertEntertainmentStationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid entertainment station data", 
          errors: result.error.errors 
        });
      }
      
      const station = await storage.createEntertainmentStation(result.data);
      res.json(station);
    } catch (error) {
      console.error('Error creating entertainment station:', error);
      res.status(500).json({ message: "Failed to create entertainment station" });
    }
  });

  app.patch("/api/entertainment/stations/:id", validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const station = await storage.updateEntertainmentStation(id, req.body);
      
      if (!station) {
        return res.status(404).json({ message: "Entertainment station not found" });
      }
      
      res.json(station);
    } catch (error) {
      console.error('Error updating entertainment station:', error);
      res.status(500).json({ message: "Failed to update entertainment station" });
    }
  });

  app.delete("/api/entertainment/stations/:id", validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteEntertainmentStation(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Entertainment station not found" });
      }
      
      res.json({ message: "Entertainment station deleted successfully" });
    } catch (error) {
      console.error('Error deleting entertainment station:', error);
      res.status(500).json({ message: "Failed to delete entertainment station" });
    }
  });

  // Entertainment Presets
  app.get("/api/entertainment/presets", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      const presets = await storage.getAllEntertainmentPresets(userId as string);
      
      // Enrich presets with station data
      const enrichedPresets = await Promise.all(
        presets.map(async (preset) => {
          const station = await storage.getEntertainmentStation(preset.stationId);
          return { ...preset, station };
        })
      );
      
      res.json(enrichedPresets);
    } catch (error) {
      console.error('Error getting entertainment presets:', error);
      res.status(500).json({ message: "Failed to get entertainment presets" });
    }
  });

  app.get("/api/entertainment/presets/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const preset = await storage.getEntertainmentPreset(parseInt(id));
      
      if (!preset) {
        return res.status(404).json({ message: "Entertainment preset not found" });
      }
      
      // Enrich with station data
      const station = await storage.getEntertainmentStation(preset.stationId);
      res.json({ ...preset, station });
    } catch (error) {
      console.error('Error getting entertainment preset:', error);
      res.status(500).json({ message: "Failed to get entertainment preset" });
    }
  });

  app.post("/api/entertainment/presets", validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertEntertainmentPresetSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid entertainment preset data", 
          errors: result.error.errors 
        });
      }
      
      const preset = await storage.createEntertainmentPreset(result.data);
      res.json(preset);
    } catch (error) {
      console.error('Error creating entertainment preset:', error);
      res.status(500).json({ message: "Failed to create entertainment preset" });
    }
  });

  app.patch("/api/entertainment/presets/:id", validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const preset = await storage.updateEntertainmentPreset(parseInt(id), req.body);
      
      if (!preset) {
        return res.status(404).json({ message: "Entertainment preset not found" });
      }
      
      res.json(preset);
    } catch (error) {
      console.error('Error updating entertainment preset:', error);
      res.status(500).json({ message: "Failed to update entertainment preset" });
    }
  });

  app.delete("/api/entertainment/presets/:id", validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteEntertainmentPreset(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ message: "Entertainment preset not found" });
      }
      
      res.json({ message: "Entertainment preset deleted successfully" });
    } catch (error) {
      console.error('Error deleting entertainment preset:', error);
      res.status(500).json({ message: "Failed to delete entertainment preset" });
    }
  });

  // Entertainment History
  app.get("/api/entertainment/history", async (req: Request, res: Response) => {
    try {
      const { userId, limit } = req.query;
      const history = await storage.getEntertainmentHistory(
        userId as string,
        limit ? parseInt(limit as string) : undefined
      );
      
      // Enrich history with station data
      const enrichedHistory = await Promise.all(
        history.map(async (item) => {
          const station = await storage.getEntertainmentStation(item.stationId);
          return { ...item, station };
        })
      );
      
      res.json(enrichedHistory);
    } catch (error) {
      console.error('Error getting entertainment history:', error);
      res.status(500).json({ message: "Failed to get entertainment history" });
    }
  });

  app.post("/api/entertainment/history", validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertEntertainmentHistorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid entertainment history data", 
          errors: result.error.errors 
        });
      }
      
      const history = await storage.createEntertainmentHistory(result.data);
      res.json(history);
    } catch (error) {
      console.error('Error creating entertainment history:', error);
      res.status(500).json({ message: "Failed to create entertainment history" });
    }
  });

  app.delete("/api/entertainment/history", validateRequest, async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      const clearedCount = await storage.clearEntertainmentHistory(userId as string);
      
      res.json({ 
        message: "Entertainment history cleared successfully",
        clearedCount 
      });
    } catch (error) {
      console.error('Error clearing entertainment history:', error);
      res.status(500).json({ message: "Failed to clear entertainment history" });
    }
  });

  // Entertainment Playback State
  app.get("/api/entertainment/playback-state", async (req: Request, res: Response) => {
    try {
      const state = await storage.getEntertainmentPlaybackState();
      res.json(state || null);
    } catch (error) {
      console.error('Error getting entertainment playback state:', error);
      res.status(500).json({ message: "Failed to get entertainment playback state" });
    }
  });

  app.post("/api/entertainment/playback-state", validateRequest, async (req: Request, res: Response) => {
    try {
      const result = insertEntertainmentPlaybackStateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid entertainment playback state data", 
          errors: result.error.errors 
        });
      }
      
      const state = await storage.updateEntertainmentPlaybackState(result.data);
      res.json(state);
    } catch (error) {
      console.error('Error updating entertainment playback state:', error);
      res.status(500).json({ message: "Failed to update entertainment playback state" });
    }
  });

  // Entertainment Settings
  app.get("/api/entertainment/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getEntertainmentSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error getting entertainment settings:', error);
      res.status(500).json({ message: "Failed to get entertainment settings" });
    }
  });

  app.patch("/api/entertainment/settings", validateRequest, async (req: Request, res: Response) => {
    try {
      const settings = await storage.updateEntertainmentSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error('Error updating entertainment settings:', error);
      res.status(500).json({ message: "Failed to update entertainment settings" });
    }
  });

  // =============================================================================
  // END ENTERTAINMENT SYSTEM API ROUTES
  // =============================================================================

  // =============================================================================
  // FLEET MANAGEMENT SYSTEM API ROUTES (Desktop-only)
  // =============================================================================

  // Fleet Vehicles
  app.get("/api/fleet/vehicles", async (req: Request, res: Response) => {
    try {
      const vehicles = await storage.getAllFleetVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error('Error getting fleet vehicles:', error);
      res.status(500).json({ message: "Failed to get fleet vehicles" });
    }
  });

  app.get("/api/fleet/vehicles/active", async (req: Request, res: Response) => {
    try {
      const vehicles = await storage.getActiveFleetVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error('Error getting active fleet vehicles:', error);
      res.status(500).json({ message: "Failed to get active fleet vehicles" });
    }
  });

  app.get("/api/fleet/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const vehicle = await storage.getFleetVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error('Error getting fleet vehicle:', error);
      res.status(500).json({ message: "Failed to get fleet vehicle" });
    }
  });

  app.post("/api/fleet/vehicles", validateRequest, async (req: Request, res: Response) => {
    try {
      const vehicle = await storage.createFleetVehicle(req.body);
      res.status(201).json(vehicle);
    } catch (error) {
      console.error('Error creating fleet vehicle:', error);
      res.status(500).json({ message: "Failed to create fleet vehicle" });
    }
  });

  app.put("/api/fleet/vehicles/:id", validateRequest, async (req: Request, res: Response) => {
    try {
      const vehicle = await storage.updateFleetVehicle(req.params.id, req.body);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error('Error updating fleet vehicle:', error);
      res.status(500).json({ message: "Failed to update fleet vehicle" });
    }
  });

  app.delete("/api/fleet/vehicles/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteFleetVehicle(req.params.id);
      res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
      console.error('Error deleting fleet vehicle:', error);
      res.status(500).json({ message: "Failed to delete fleet vehicle" });
    }
  });

  // Operators
  app.get("/api/fleet/operators", async (req: Request, res: Response) => {
    try {
      const operators = await storage.getAllOperators();
      res.json(operators);
    } catch (error) {
      console.error('Error getting operators:', error);
      res.status(500).json({ message: "Failed to get operators" });
    }
  });

  app.get("/api/fleet/operators/active", async (req: Request, res: Response) => {
    try {
      const operators = await storage.getActiveOperators();
      res.json(operators);
    } catch (error) {
      console.error('Error getting active operators:', error);
      res.status(500).json({ message: "Failed to get active operators" });
    }
  });

  app.get("/api/fleet/operators/:id", async (req: Request, res: Response) => {
    try {
      const operator = await storage.getOperator(req.params.id);
      if (!operator) {
        return res.status(404).json({ message: "Operator not found" });
      }
      res.json(operator);
    } catch (error) {
      console.error('Error getting operator:', error);
      res.status(500).json({ message: "Failed to get operator" });
    }
  });

  app.post("/api/fleet/operators", validateRequest, async (req: Request, res: Response) => {
    try {
      const operator = await storage.createOperator(req.body);
      res.status(201).json(operator);
    } catch (error) {
      console.error('Error creating operator:', error);
      res.status(500).json({ message: "Failed to create operator" });
    }
  });

  app.put("/api/fleet/operators/:id", validateRequest, async (req: Request, res: Response) => {
    try {
      const operator = await storage.updateOperator(req.params.id, req.body);
      if (!operator) {
        return res.status(404).json({ message: "Operator not found" });
      }
      res.json(operator);
    } catch (error) {
      console.error('Error updating operator:', error);
      res.status(500).json({ message: "Failed to update operator" });
    }
  });

  app.delete("/api/fleet/operators/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteOperator(req.params.id);
      res.json({ message: "Operator deleted successfully" });
    } catch (error) {
      console.error('Error deleting operator:', error);
      res.status(500).json({ message: "Failed to delete operator" });
    }
  });

  // Service Records
  app.get("/api/fleet/service-records/vehicle/:vehicleId", async (req: Request, res: Response) => {
    try {
      const records = await storage.getServiceRecordsByVehicle(req.params.vehicleId);
      res.json(records);
    } catch (error) {
      console.error('Error getting service records:', error);
      res.status(500).json({ message: "Failed to get service records" });
    }
  });

  app.get("/api/fleet/service-records/upcoming", async (req: Request, res: Response) => {
    try {
      const daysAhead = req.query.days ? parseInt(req.query.days as string) : 30;
      const records = await storage.getUpcomingServices(daysAhead);
      res.json(records);
    } catch (error) {
      console.error('Error getting upcoming services:', error);
      res.status(500).json({ message: "Failed to get upcoming services" });
    }
  });

  app.post("/api/fleet/service-records", validateRequest, async (req: Request, res: Response) => {
    try {
      const record = await storage.createServiceRecord(req.body);
      res.status(201).json(record);
    } catch (error) {
      console.error('Error creating service record:', error);
      res.status(500).json({ message: "Failed to create service record" });
    }
  });

  app.put("/api/fleet/service-records/:id", validateRequest, async (req: Request, res: Response) => {
    try {
      const record = await storage.updateServiceRecord(req.params.id, req.body);
      if (!record) {
        return res.status(404).json({ message: "Service record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error('Error updating service record:', error);
      res.status(500).json({ message: "Failed to update service record" });
    }
  });

  app.delete("/api/fleet/service-records/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteServiceRecord(req.params.id);
      res.json({ message: "Service record deleted successfully" });
    } catch (error) {
      console.error('Error deleting service record:', error);
      res.status(500).json({ message: "Failed to delete service record" });
    }
  });

  // Fuel Logs
  app.get("/api/fleet/fuel-logs/vehicle/:vehicleId", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getFuelLogsByVehicle(req.params.vehicleId, limit);
      res.json(logs);
    } catch (error) {
      console.error('Error getting fuel logs:', error);
      res.status(500).json({ message: "Failed to get fuel logs" });
    }
  });

  app.get("/api/fleet/fuel-logs/vehicle/:vehicleId/efficiency", async (req: Request, res: Response) => {
    try {
      const efficiency = await storage.getVehicleFuelEfficiency(req.params.vehicleId);
      res.json(efficiency);
    } catch (error) {
      console.error('Error getting fuel efficiency:', error);
      res.status(500).json({ message: "Failed to get fuel efficiency" });
    }
  });

  app.post("/api/fleet/fuel-logs", validateRequest, async (req: Request, res: Response) => {
    try {
      const log = await storage.createFuelLog(req.body);
      res.status(201).json(log);
    } catch (error) {
      console.error('Error creating fuel log:', error);
      res.status(500).json({ message: "Failed to create fuel log" });
    }
  });

  app.put("/api/fleet/fuel-logs/:id", validateRequest, async (req: Request, res: Response) => {
    try {
      const log = await storage.updateFuelLog(req.params.id, req.body);
      if (!log) {
        return res.status(404).json({ message: "Fuel log not found" });
      }
      res.json(log);
    } catch (error) {
      console.error('Error updating fuel log:', error);
      res.status(500).json({ message: "Failed to update fuel log" });
    }
  });

  app.delete("/api/fleet/fuel-logs/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteFuelLog(req.params.id);
      res.json({ message: "Fuel log deleted successfully" });
    } catch (error) {
      console.error('Error deleting fuel log:', error);
      res.status(500).json({ message: "Failed to delete fuel log" });
    }
  });

  // Vehicle Assignments
  app.post("/api/fleet/assignments", validateRequest, async (req: Request, res: Response) => {
    try {
      const assignment = await storage.assignVehicle(req.body);
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      res.status(500).json({ message: "Failed to assign vehicle" });
    }
  });

  app.post("/api/fleet/assignments/unassign/:vehicleId", async (req: Request, res: Response) => {
    try {
      await storage.unassignVehicle(req.params.vehicleId);
      res.json({ message: "Vehicle unassigned successfully" });
    } catch (error) {
      console.error('Error unassigning vehicle:', error);
      res.status(500).json({ message: "Failed to unassign vehicle" });
    }
  });

  app.get("/api/fleet/assignments/vehicle/:vehicleId", async (req: Request, res: Response) => {
    try {
      const assignment = await storage.getActiveAssignment(req.params.vehicleId);
      res.json(assignment || null);
    } catch (error) {
      console.error('Error getting vehicle assignment:', error);
      res.status(500).json({ message: "Failed to get vehicle assignment" });
    }
  });

  app.get("/api/fleet/assignments/operator/:operatorId", async (req: Request, res: Response) => {
    try {
      const assignment = await storage.getOperatorAssignment(req.params.operatorId);
      res.json(assignment || null);
    } catch (error) {
      console.error('Error getting operator assignment:', error);
      res.status(500).json({ message: "Failed to get operator assignment" });
    }
  });

  // =============================================================================
  // END FLEET MANAGEMENT SYSTEM API ROUTES
  // =============================================================================

  // =============================================================================
  // SOCIAL NETWORK API ROUTES (Phase 1 - Profiles, Connections, Shared Routes)
  // =============================================================================

  // Rate limiter for connection requests (max 10 per hour per user)
  const connectionRequestRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
      error: 'Too many connection requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString(),
    },
    // Use user ID if authenticated, otherwise use request IP (handled by default)
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Driver Profile Management
  app.get("/api/social/profile/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      const profile = await storage.getUserProfile(req.params.userId, currentUserId);
      if (!profile) {
        return res.status(403).json({ message: "This profile is private" });
      }
      res.json(profile);
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ message: "Failed to get user profile" });
    }
  });

  app.put("/api/social/profile/:userId", requireAuth, validateRequest, async (req: Request, res: Response) => {
    try {
      if (req.params.userId !== req.user?.id) {
        return res.status(403).json({ message: "Cannot update another user's profile" });
      }
      
      // Validate and coerce the request body using the updateUserProfileSchema
      const validationResult = updateUserProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: validationResult.error.errors 
        });
      }
      
      const profile = await storage.updateUserProfile(req.params.userId, validationResult.data);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  app.get("/api/social/drivers/search", requireAuth, async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string || '';
      const limit = parseInt(req.query.limit as string) || 20;
      const currentUserId = req.user?.id;
      const drivers = await storage.searchDrivers(query, currentUserId, limit);
      res.json(drivers);
    } catch (error) {
      console.error('Error searching drivers:', error);
      res.status(500).json({ message: "Failed to search drivers" });
    }
  });

  // Driver Connections
  app.post("/api/social/connections/request", requireAuth, connectionRequestRateLimit, validateRequest, async (req: Request, res: Response) => {
    try {
      const { receiverId } = req.body;
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.user.id === receiverId) {
        return res.status(400).json({ message: "Cannot send connection request to yourself" });
      }
      const connection = await storage.sendConnectionRequest(req.user.id, receiverId);
      res.status(201).json(connection);
    } catch (error: any) {
      console.error('Error sending connection request:', error);
      if (error.message === 'Connection request already exists') {
        return res.status(409).json({ message: error.message });
      }
      if (error.message === 'This user has disabled connection requests') {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to send connection request" });
    }
  });

  app.put("/api/social/connections/:id/accept", requireAuth, async (req: Request, res: Response) => {
    try {
      const connection = await storage.acceptConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ message: "Connection request not found" });
      }
      res.json(connection);
    } catch (error) {
      console.error('Error accepting connection:', error);
      res.status(500).json({ message: "Failed to accept connection" });
    }
  });

  app.put("/api/social/connections/:id/reject", requireAuth, async (req: Request, res: Response) => {
    try {
      const connection = await storage.rejectConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ message: "Connection request not found" });
      }
      res.json(connection);
    } catch (error) {
      console.error('Error rejecting connection:', error);
      res.status(500).json({ message: "Failed to reject connection" });
    }
  });

  app.get("/api/social/connections", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const connections = await storage.getConnections(req.user.id);
      res.json(connections);
    } catch (error) {
      console.error('Error getting connections:', error);
      res.status(500).json({ message: "Failed to get connections" });
    }
  });

  app.get("/api/social/connections/pending", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const requests = await storage.getPendingRequests(req.user.id);
      res.json(requests);
    } catch (error) {
      console.error('Error getting pending requests:', error);
      res.status(500).json({ message: "Failed to get pending requests" });
    }
  });

  // Shared Routes
  app.post("/api/social/routes/share", requireAuth, validateRequest, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { routeId, title, description, isPublic, shareWithConnections, tags } = req.body;
      const sharedRoute = await storage.shareRoute(req.user.id, routeId, {
        title,
        description,
        isPublic,
        shareWithConnections,
        tags
      });
      res.status(201).json(sharedRoute);
    } catch (error) {
      console.error('Error sharing route:', error);
      res.status(500).json({ message: "Failed to share route" });
    }
  });

  app.get("/api/social/routes/shared", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const routes = await storage.getSharedRoutes(req.user.id);
      res.json(routes);
    } catch (error) {
      console.error('Error getting shared routes:', error);
      res.status(500).json({ message: "Failed to get shared routes" });
    }
  });

  app.get("/api/social/routes/public", requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const routes = await storage.getPublicRoutes(limit);
      res.json(routes);
    } catch (error) {
      console.error('Error getting public routes:', error);
      res.status(500).json({ message: "Failed to get public routes" });
    }
  });

  app.get("/api/social/routes/connections", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const routes = await storage.getConnectionRoutes(req.user.id);
      res.json(routes);
    } catch (error) {
      console.error('Error getting connection routes:', error);
      res.status(500).json({ message: "Failed to get connection routes" });
    }
  });

  app.post("/api/social/routes/:id/save", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const savedRoute = await storage.saveSharedRoute(req.user.id, req.params.id);
      res.status(201).json(savedRoute);
    } catch (error) {
      console.error('Error saving route:', error);
      res.status(500).json({ message: "Failed to save route" });
    }
  });

  app.delete("/api/social/routes/:id/unsave", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      await storage.unsaveSharedRoute(req.user.id, req.params.id);
      res.json({ message: "Route unsaved successfully" });
    } catch (error) {
      console.error('Error unsaving route:', error);
      res.status(500).json({ message: "Failed to unsave route" });
    }
  });

  app.get("/api/social/routes/saved", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const routes = await storage.getSavedRoutes(req.user.id);
      res.json(routes);
    } catch (error) {
      console.error('Error getting saved routes:', error);
      res.status(500).json({ message: "Failed to get saved routes" });
    }
  });

  app.post("/api/social/routes/:id/comment", requireAuth, validateRequest, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { comment, rating } = req.body;
      const routeComment = await storage.commentOnRoute(req.params.id, req.user.id, comment, rating);
      res.status(201).json(routeComment);
    } catch (error) {
      console.error('Error commenting on route:', error);
      res.status(500).json({ message: "Failed to comment on route" });
    }
  });

  app.get("/api/social/routes/:id/comments", requireAuth, async (req: Request, res: Response) => {
    try {
      const comments = await storage.getRouteComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error('Error getting route comments:', error);
      res.status(500).json({ message: "Failed to get route comments" });
    }
  });

  // Fleet Notifications API endpoints
  app.get("/api/fleet/notifications", async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getFleetNotifications?.('active') || [];
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/fleet/notifications/:id/dismiss", async (req: Request, res: Response) => {
    try {
      const success = await storage.dismissFleetNotification?.(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ message: "Notification dismissed" });
    } catch (error) {
      console.error('Error dismissing notification:', error);
      res.status(500).json({ message: "Failed to dismiss notification" });
    }
  });

  app.post("/api/fleet/notifications/:id/resolve", async (req: Request, res: Response) => {
    try {
      const success = await storage.resolveFleetNotification?.(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ message: "Notification resolved" });
    } catch (error) {
      console.error('Error resolving notification:', error);
      res.status(500).json({ message: "Failed to resolve notification" });
    }
  });

  // Vehicle Documents API endpoints
  app.post("/api/fleet/documents/upload", multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }).single('file'), async (req: Request, res: Response) => {
    try {
      performance.mark('api-document-upload-start');
      console.log('[PERF-API] 📤 Document upload start');
      
      if (!req.file || !req.body.vehicleId) {
        return res.status(400).json({ message: "Missing file or vehicleId" });
      }

      // Get object storage details
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      const privateDir = process.env.PRIVATE_OBJECT_DIR || '.private';
      
      if (!bucketId) {
        return res.status(500).json({ message: "Object storage not configured" });
      }

      // Create object path
      const objectPath = `${privateDir}/fleet-documents/${req.body.vehicleId}/${Date.now()}-${req.file.originalname}`;

      // Create attachment record
      const attachment = await storage.createVehicleAttachment({
        vehicleId: req.body.vehicleId,
        fileName: req.file.originalname,
        fileType: req.body.fileType || 'other',
        objectPath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user?.id,
        description: req.body.description,
      });

      performance.mark('api-document-upload-end');
      performance.measure('api-document-upload', 'api-document-upload-start', 'api-document-upload-end');
      console.log('[PERF-API] ✅ Document uploaded in', performance.getEntriesByName('api-document-upload')[0].duration.toFixed(0), 'ms');

      res.json(attachment);
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get("/api/fleet/documents/:vehicleId", async (req: Request, res: Response) => {
    try {
      performance.mark('api-documents-fetch-start');
      console.log('[PERF-API] 📄 Fetching documents for vehicle:', req.params.vehicleId);
      
      const attachments = await storage.getVehicleAttachments(req.params.vehicleId);
      
      performance.mark('api-documents-fetch-end');
      performance.measure('api-documents-fetch', 'api-documents-fetch-start', 'api-documents-fetch-end');
      console.log('[PERF-API] ✅ Documents fetched in', performance.getEntriesByName('api-documents-fetch')[0].duration.toFixed(0), 'ms');
      
      res.json(attachments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/fleet/documents/download/:id", async (req: Request, res: Response) => {
    try {
      performance.mark('api-document-download-start');
      console.log('[PERF-API] 📥 Downloading document:', req.params.id);
      
      const attachment = await storage.getVehicleAttachment(req.params.id);
      if (!attachment) {
        return res.status(404).json({ message: "Document not found" });
      }

      // TODO: Implement actual file download from object storage
      // For now, return document metadata
      performance.mark('api-document-download-end');
      performance.measure('api-document-download', 'api-document-download-start', 'api-document-download-end');
      console.log('[PERF-API] ✅ Document prepared in', performance.getEntriesByName('api-document-download')[0].duration.toFixed(0), 'ms');
      
      res.json(attachment);
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  app.delete("/api/fleet/documents/:id", async (req: Request, res: Response) => {
    try {
      performance.mark('api-document-delete-start');
      console.log('[PERF-API] 🗑️ Deleting document:', req.params.id);
      
      const attachment = await storage.getVehicleAttachment(req.params.id);
      if (!attachment) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Delete from storage
      await storage.deleteVehicleAttachment(req.params.id);

      performance.mark('api-document-delete-end');
      performance.measure('api-document-delete', 'api-document-delete-start', 'api-document-delete-end');
      console.log('[PERF-API] ✅ Document deleted in', performance.getEntriesByName('api-document-delete')[0].duration.toFixed(0), 'ms');
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Incidents API
  app.post("/api/fleet/incidents", async (req: Request, res: Response) => {
    try {
      const incident = await storage.createIncident(req.body);
      res.json(incident);
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ message: "Failed to create incident" });
    }
  });

  app.get("/api/fleet/incidents/vehicle/:vehicleId", async (req: Request, res: Response) => {
    try {
      const incidents = await storage.getIncidentsByVehicle(req.params.vehicleId);
      res.json(incidents);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      res.status(500).json({ message: "Failed to fetch incidents" });
    }
  });

  // Cost Analytics API
  app.post("/api/fleet/costs", async (req: Request, res: Response) => {
    try {
      const cost = await storage.createCostRecord(req.body);
      res.json(cost);
    } catch (error) {
      console.error('Error creating cost record:', error);
      res.status(500).json({ message: "Failed to create cost record" });
    }
  });

  app.get("/api/fleet/costs/vehicle/:vehicleId", async (req: Request, res: Response) => {
    try {
      const costs = await storage.getCostsByVehicle(req.params.vehicleId);
      res.json(costs);
    } catch (error) {
      console.error('Error fetching costs:', error);
      res.status(500).json({ message: "Failed to fetch costs" });
    }
  });

  app.get("/api/fleet/analytics/total-costs/:vehicleId", async (req: Request, res: Response) => {
    try {
      const totals = await storage.getVehicleTotalCosts(req.params.vehicleId);
      res.json(totals);
    } catch (error) {
      console.error('Error fetching total costs:', error);
      res.status(500).json({ message: "Failed to fetch total costs" });
    }
  });

  // Trip Tracking API
  app.post("/api/fleet/trips", async (req: Request, res: Response) => {
    try {
      const trip = await storage.createTrip(req.body);
      res.json(trip);
    } catch (error) {
      console.error('Error creating trip:', error);
      res.status(500).json({ message: "Failed to create trip" });
    }
  });

  app.get("/api/fleet/trips/vehicle/:vehicleId", async (req: Request, res: Response) => {
    try {
      const trips = await storage.getTripsByVehicle(req.params.vehicleId);
      res.json(trips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  app.get("/api/fleet/analytics/trips", async (req: Request, res: Response) => {
    try {
      const analytics = await storage.getFleetTripAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching trip analytics:', error);
      res.status(500).json({ message: "Failed to fetch trip analytics" });
    }
  });

  app.patch("/api/fleet/trips/:id", async (req: Request, res: Response) => {
    try {
      const trip = await storage.updateTrip(req.params.id, req.body);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      res.json(trip);
    } catch (error) {
      console.error('Error updating trip:', error);
      res.status(500).json({ message: "Failed to update trip" });
    }
  });

  // Maintenance Predictions API
  app.get("/api/fleet/predictions/vehicle/:vehicleId", async (req: Request, res: Response) => {
    try {
      const predictions = await storage.getPredictionsByVehicle(req.params.vehicleId);
      res.json(predictions);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });

  app.get("/api/fleet/predictions/high-risk", async (req: Request, res: Response) => {
    try {
      const predictions = await storage.getHighRiskPredictions();
      res.json(predictions);
    } catch (error) {
      console.error('Error fetching high-risk predictions:', error);
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });

  // Compliance API
  app.get("/api/fleet/compliance/vehicle/:vehicleId", async (req: Request, res: Response) => {
    try {
      const records = await storage.getComplianceByVehicle(req.params.vehicleId);
      res.json(records);
    } catch (error) {
      console.error('Error fetching compliance records:', error);
      res.status(500).json({ message: "Failed to fetch compliance records" });
    }
  });

  app.get("/api/fleet/compliance/non-compliant", async (req: Request, res: Response) => {
    try {
      const records = await storage.getNonCompliantRecords();
      res.json(records);
    } catch (error) {
      console.error('Error fetching non-compliant records:', error);
      res.status(500).json({ message: "Failed to fetch non-compliant records" });
    }
  });

  // =============================================================================
  // END SOCIAL NETWORK API ROUTES
  // =============================================================================

  const httpServer = createServer(app);
  return httpServer;
}

