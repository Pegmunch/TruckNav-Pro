// TruckNav Pro - Input Validation Security
// Patent-protected by Bespoke Marketing.Ai Ltd

import { body, param, query } from 'express-validator';

// Vehicle profile validation
export const validateVehicleProfile = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Vehicle name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage('Vehicle name contains invalid characters'),
  
  body('height')
    .isFloat({ min: 8, max: 20 })
    .withMessage('Height must be between 8 and 20 feet'),
  
  body('width')
    .isFloat({ min: 6, max: 12 })
    .withMessage('Width must be between 6 and 12 feet'),
  
  body('length')
    .isFloat({ min: 15, max: 75 })
    .withMessage('Length must be between 15 and 75 feet'),
  
  body('weight')
    .optional()
    .isFloat({ min: 3, max: 80 })
    .withMessage('Weight must be between 3 and 80 tons'),
  
  body('axles')
    .optional()
    .isInt({ min: 2, max: 10 })
    .withMessage('Axles must be between 2 and 10'),
  
  body('isHazmat')
    .optional()
    .isBoolean()
    .withMessage('Hazmat flag must be boolean')
];

// Route validation - More flexible for real-world location data
export const validateRoute = [
  body('startLocation')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Start location is required')
    .matches(/^[a-zA-Z0-9\s\-_\.,\/\(\)\+\°\'\"\&\@\#\:\;]+$/)
    .withMessage('Start location contains invalid characters'),
  
  body('endLocation')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('End location is required')
    .matches(/^[a-zA-Z0-9\s\-_\.,\/\(\)\+\°\'\"\&\@\#\:\;]+$/)
    .withMessage('End location contains invalid characters'),
  
  body('vehicleProfileId')
    .optional()
    .isUUID()
    .withMessage('Vehicle profile ID must be a valid UUID')
];

// Traffic incident validation
export const validateTrafficIncident = [
  body('type')
    .isIn(['accident', 'breakdown', 'roadwork', 'closure', 'weather', 'hazard', 'congestion'])
    .withMessage('Invalid incident type'),
  
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.,!\?]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.,!\?\n\r]+$/)
    .withMessage('Description contains invalid characters'),
  
  body('coordinates.lat')
    .isFloat({ min: 49.5, max: 61.0 })
    .withMessage('Latitude must be within UK/Europe bounds'),
  
  body('coordinates.lng')
    .isFloat({ min: -11.0, max: 3.0 })
    .withMessage('Longitude must be within UK/Europe bounds'),
  
  body('roadName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Road name must not exceed 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Road name contains invalid characters'),
  
  body('direction')
    .optional()
    .isIn(['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'])
    .withMessage('Invalid direction'),
  
  body('affectedLanes')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Affected lanes must be between 0 and 10'),
  
  body('totalLanes')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Total lanes must be between 1 and 10'),
  
  body('estimatedDuration')
    .optional()
    .isInt({ min: 5, max: 1440 })
    .withMessage('Estimated duration must be between 5 minutes and 24 hours'),
  
  body('reporterName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Reporter name must not exceed 50 characters')
    .matches(/^[a-zA-Z\s\-\.]+$/)
    .withMessage('Reporter name contains invalid characters'),
  
  body('truckWarnings')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 truck warnings allowed'),
  
  body('truckWarnings.*')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Each warning must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.,!\?]+$/)
    .withMessage('Warning contains invalid characters')
];

// Facility search validation
export const validateFacilitySearch = [
  query('lat')
    .isFloat({ min: 49.5, max: 61.0 })
    .withMessage('Latitude must be within UK/Europe bounds'),
  
  query('lng')
    .isFloat({ min: -11.0, max: 3.0 })
    .withMessage('Longitude must be within UK/Europe bounds'),
  
  query('radius')
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage('Radius must be between 1 and 100 km'),
  
  query('type')
    .optional()
    .isIn(['fuel', 'parking', 'restaurant', 'hotel', 'truck_stop', 'rest_area', 'service'])
    .withMessage('Invalid facility type')
];

// Subscription validation
export const validateSubscription = [
  body('planType')
    .isIn(['3month', '6month', '12month', 'lifetime'])
    .withMessage('Invalid subscription plan type'),
  
  body('paymentMethodId')
    .matches(/^pm_[a-zA-Z0-9]+$/)
    .withMessage('Invalid Stripe payment method ID')
];

// ID parameter validation
export const validateId = [
  param('id')
    .isUUID()
    .withMessage('ID must be a valid UUID')
];

// Coordinates validation for general use
export const validateCoordinates = [
  body('coordinates.lat')
    .isFloat({ min: 49.5, max: 61.0 })
    .withMessage('Latitude must be within UK/Europe bounds'),
  
  body('coordinates.lng')
    .isFloat({ min: -11.0, max: 3.0 })
    .withMessage('Longitude must be within UK/Europe bounds')
];

// Location validation
export const validateLocation = [
  body('label')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Location label must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.,\/]+$/)
    .withMessage('Location label contains invalid characters'),
  
  body('coordinates.lat')
    .isFloat({ min: 49.5, max: 61.0 })
    .withMessage('Latitude must be within UK/Europe bounds'),
  
  body('coordinates.lng')
    .isFloat({ min: -11.0, max: 3.0 })
    .withMessage('Longitude must be within UK/Europe bounds'),
  
  body('isFavorite')
    .optional()
    .isBoolean()
    .withMessage('isFavorite must be a boolean')
];

// Journey validation
export const validateJourney = [
  body('routeId')
    .isUUID()
    .withMessage('Route ID must be a valid UUID'),
  
  body('status')
    .optional()
    .isIn(['planned', 'active', 'completed'])
    .withMessage('Invalid journey status')
];

// Numeric ID validation (for locations and journeys)
export const validateNumericId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
];

// Pagination validation
export const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

// Postcode search validation
export const validatePostcodeSearch = [
  query('postcode')
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage('Postcode must be between 3 and 10 characters')
    .matches(/^[A-Z0-9\s\-]{3,10}$/i)
    .withMessage('Postcode contains invalid characters'),
  
  query('country')
    .optional()
    .isIn(['UK', 'US', 'CA', 'AU', 'DE', 'FR'])
    .withMessage('Unsupported country code. Supported: UK, US, CA, AU, DE, FR'),
  
  query('strict')
    .optional()
    .isBoolean()
    .withMessage('Strict validation flag must be boolean')
];

// Postcode geocoding validation
export const validatePostcodeGeocoding = [
  body('postcode')
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage('Postcode must be between 3 and 10 characters')
    .matches(/^[A-Z0-9\s\-]{3,10}$/i)
    .withMessage('Postcode contains invalid characters'),
  
  body('country')
    .optional()
    .isIn(['UK', 'US', 'CA', 'AU', 'DE', 'FR'])
    .withMessage('Unsupported country code. Supported: UK, US, CA, AU, DE, FR')
];