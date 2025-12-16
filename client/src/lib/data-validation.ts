import { z } from 'zod';

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const vehicleProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  height: z.number().min(1).max(30),
  width: z.number().min(1).max(15),
  length: z.number().min(1).max(100),
  weight: z.number().min(0).max(100).optional(),
  type: z.string(),
});

export const routeDataSchema = z.object({
  id: z.string().optional(),
  startLocation: z.string().min(1),
  endLocation: z.string().min(1),
  startCoordinates: coordinatesSchema.optional(),
  endCoordinates: coordinatesSchema.optional(),
  distance: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
});

export const facilitySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.string(),
  coordinates: coordinatesSchema,
  address: z.string().optional(),
});

export const trafficIncidentSchema = z.object({
  id: z.string(),
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1),
  coordinates: coordinatesSchema,
});

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    const errors = result.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    );
    
    console.warn(`[DATA-VALIDATION] ${context || 'Validation'} failed:`, errors);
    
    return { success: false, errors };
  } catch (error) {
    console.error(`[DATA-VALIDATION] Schema validation error:`, error);
    return { 
      success: false, 
      errors: ['Unexpected validation error'] 
    };
  }
}

export function validateCoordinates(coords: unknown): ValidationResult<{ lat: number; lng: number }> {
  return validateData(coordinatesSchema, coords, 'Coordinates');
}

export function validateVehicleProfile(profile: unknown): ValidationResult<z.infer<typeof vehicleProfileSchema>> {
  return validateData(vehicleProfileSchema, profile, 'Vehicle Profile');
}

export function validateRouteData(route: unknown): ValidationResult<z.infer<typeof routeDataSchema>> {
  return validateData(routeDataSchema, route, 'Route Data');
}

export function validateFacility(facility: unknown): ValidationResult<z.infer<typeof facilitySchema>> {
  return validateData(facilitySchema, facility, 'Facility');
}

export function validateTrafficIncident(incident: unknown): ValidationResult<z.infer<typeof trafficIncidentSchema>> {
  return validateData(trafficIncidentSchema, incident, 'Traffic Incident');
}

export function sanitizeUserInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>'"&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
        '&': '&amp;',
      };
      return entities[char] || char;
    })
    .trim()
    .slice(0, 1000);
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\d\s\-+()]{7,20}$/;
  return phoneRegex.test(phone);
}
