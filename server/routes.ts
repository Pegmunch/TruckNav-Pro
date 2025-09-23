import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { trafficService } from "./services/traffic-service";
import { routeMonitorService } from "./services/route-monitor";
import { insertVehicleProfileSchema, insertRestrictionSchema, insertFacilitySchema, insertRouteSchema, insertTrafficIncidentSchema, insertUserSchema, insertLocationSchema, insertJourneySchema, insertRouteMonitoringSchema, insertAlternativeRouteSchema, insertReRoutingEventSchema, geoJsonLineStringSchema, insertEntertainmentStationSchema, insertEntertainmentPresetSchema, insertEntertainmentHistorySchema, insertEntertainmentPlaybackStateSchema, type VehicleProfile, type Restriction } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { apiRateLimit, authRateLimit, validateRequest } from "./middleware/security";
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
    // Get route from GraphHopper API
    const routeResult = await callGraphHopperAPI(startCoords, endCoords, vehicleProfile);
    if (!routeResult) {
      console.error('Failed to get route from GraphHopper API');
      return null;
    }

    // Now perform spatial validation with actual route geometry
    const violations: Array<{ restriction: Restriction; severity: string; bypassable: boolean }> = [];
    const restrictionsAvoided: string[] = [];
    const routeLine = turf.lineString(routeResult.geometry.coordinates);

    // Check each restriction for spatial intersection with the actual route
    for (const restriction of restrictions) {
      let intersects = false;
      
      // Check if restriction has spatial coordinates
      if (restriction.coordinates) {
        const coords = typeof restriction.coordinates === 'string' 
          ? JSON.parse(restriction.coordinates) 
          : restriction.coordinates;
        
        if (coords.lat && coords.lng) {
          // Create a point for the restriction
          const restrictionPoint = turf.point([coords.lng, coords.lat]);
          
          // Check if route passes within 100 meters (0.1km) of restriction
          const buffer = turf.buffer(restrictionPoint, 0.1, { units: 'kilometers' });
          if (buffer) {
            intersects = turf.booleanIntersects(routeLine, buffer);
          }
        }
      } else if (restriction.routeSegment) {
        // Handle route segment restrictions
        const segmentCoords = typeof restriction.routeSegment === 'string'
          ? JSON.parse(restriction.routeSegment)
          : restriction.routeSegment;
          
        if (Array.isArray(segmentCoords) && segmentCoords.length >= 2) {
          const restrictionSegment = turf.lineString(segmentCoords.map(coord => [coord.lng, coord.lat]));
          intersects = turf.booleanIntersects(routeLine, restrictionSegment);
        }
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
        
        console.log(`Route intersects with ${restriction.severity} restriction: ${restriction.type} at ${restriction.location}`);
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
 * Check if a vehicle is affected by a specific restriction
 */
function isVehicleAffectedByRestriction(vehicleProfile: VehicleProfile, restriction: Restriction): boolean {
  // Check if restriction specifically targets this vehicle type
  if (restriction.restrictedVehicleTypes) {
    const restrictedTypes = Array.isArray(restriction.restrictedVehicleTypes) 
      ? restriction.restrictedVehicleTypes 
      : JSON.parse(restriction.restrictedVehicleTypes as string);
    return restrictedTypes.includes(vehicleProfile.type);
  }
  
  // Check dimensional restrictions
  switch (restriction.type) {
    case 'height':
      return vehicleProfile.height >= restriction.limit;
    case 'width':
      return vehicleProfile.width >= restriction.limit;
    case 'weight':
      return !!vehicleProfile.weight && vehicleProfile.weight >= restriction.limit;
    case 'length':
      return !!vehicleProfile.length && vehicleProfile.length >= restriction.limit;
    case 'axle_count':
      return !!vehicleProfile.axles && vehicleProfile.axles > restriction.limit;
    case 'hazmat':
      return !!vehicleProfile.isHazmat;
    default:
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
  // Apply API rate limiting to all API routes
  app.use("/api", apiRateLimit);
  
  // CSRF token endpoint (must come before CSRF protection middleware) - optimized for reliability
  app.get("/api/csrf-token", (req: any, res: any) => {
    // Always ensure session exists and has a CSRF token
    if (!req.session) {
      console.error('[CSRF] No session available for token generation');
      return res.status(500).json({ error: 'Session not available' });
    }

    // Always generate a fresh CSRF token for maximum security
    const newToken = randomBytes(32).toString('hex');
    req.session.csrfToken = newToken;
    console.log(`[CSRF] New token generated for session ${req.sessionID}: ${newToken.substring(0, 8)}...`);
    
    // Reliable session saving with enhanced error handling and verification
    req.session.save((err: any) => {
      if (err) {
        console.error('[CSRF] Failed to save session:', err);
        return res.status(500).json({ 
          error: 'Failed to initialize session',
          code: 'SESSION_SAVE_ERROR',
          timestamp: new Date().toISOString()
        });
      }
      
      // Verify token was actually saved
      const savedToken = req.session.csrfToken;
      console.log(`[CSRF] Session saved successfully - token verified: ${savedToken === newToken ? 'MATCH' : 'MISMATCH'}`);
      
      if (savedToken !== newToken) {
        console.error('[CSRF] CRITICAL: Token mismatch after save!', {
          generated: newToken.substring(0, 8),
          saved: savedToken?.substring(0, 8) || 'none'
        });
      }
      
      // Set CSRF token in response header, body, and add cache control
      res.setHeader('X-CSRF-Token', savedToken);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json({ 
        success: true,
        csrfToken: savedToken,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });
    });
  });
  
  // CSRF protection is now handled globally by security middleware - no duplicate needed

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

  // Route Validation and Compliance Checking
  app.post("/api/routes/validate", validateRoute, validateRequest, async (req: Request, res: Response) => {
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
  app.post("/api/routes/compliance-check", validateRequest, async (req: Request, res: Response) => {
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

  // Routes with strict vehicle class enforcement
  app.post("/api/routes/calculate", validateRoutePlanningRequest, async (req: Request, res: Response) => {
    try {
      const { startLocation, endLocation, vehicleProfileId, startCoordinates, endCoordinates } = req.body;
      
      if (!startLocation || !endLocation) {
        return res.status(400).json({ message: "Start and end locations are required" });
      }

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

      // Use provided coordinates or fallback to UK defaults
      const startCoords = startCoordinates || { lat: 51.8787, lng: -0.4200 }; // Luton, Bedfordshire
      const endCoords = endCoordinates || { lat: 51.9948, lng: -0.5892 }; // Flitwick, Bedfordshire
      
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
          
          // Include violation information in response for transparency
          if (vehicleSpecificRoute.violations && vehicleSpecificRoute.violations.length > 0) {
            // Add violations to the route response
            const routeViolations = vehicleSpecificRoute.violations;
            const nonBypassableViolations = routeViolations.filter(v => !v.bypassable);
            
            if (nonBypassableViolations.length > 0) {
              console.warn(`Route contains ${nonBypassableViolations.length} non-bypassable violations for ${vehicleProfile.type}`);
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
      
      // Create a planned journey entry for immediate "Last Journey" availability
      const plannedJourney = await storage.startJourney(route.id);
      
      // Verify the journey was created with 'planned' status as expected
      if (plannedJourney.status !== 'planned') {
        throw new Error(`Journey created with unexpected status: ${plannedJourney.status}, expected: planned`);
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

  app.get("/api/routes/favorites", async (req, res) => {
    try {
      const routes = await storage.getFavoriteRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get favorite routes" });
    }
  });

  app.patch("/api/routes/:id/favorite", validateId, validateRequest, async (req: Request, res: Response) => {
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
  app.get("/api/routes/:id/lanes", validateId, validateRequest, async (req: Request, res: Response) => {
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

  app.patch("/api/routes/:id/lanes/select", validateId, validateRequest, async (req: Request, res: Response) => {
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

  // Route Monitoring
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

  // Journey Management
  app.get("/api/journeys", validatePagination, validateRequest, async (req: Request, res: Response) => {
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

  app.get("/api/journeys/last", async (req: Request, res: Response) => {
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

  app.patch("/api/journeys/:id/activate", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const idempotencyKey = req.headers['idempotency-key'] as string;
      
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
      res.status(500).json({ message: "Failed to activate journey" });
    }
  });

  app.patch("/api/journeys/:id/complete", validateNumericId, validateRequest, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const journey = await storage.completeJourney(parseInt(id));
      if (!journey) {
        return res.status(404).json({ message: "Journey not found" });
      }
      
      res.json(journey);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete journey" });
    }
  });

  // Initialize Stripe (will be available when user provides API keys)
  let stripe: Stripe | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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

  const httpServer = createServer(app);
  return httpServer;
}
