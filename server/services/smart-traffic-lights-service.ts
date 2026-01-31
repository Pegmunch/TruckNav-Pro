/**
 * Smart Traffic Lights Service
 * 
 * Provides traffic signal timing predictions and green wave optimization for routes.
 * Uses simulated signal data based on typical urban traffic patterns and time of day.
 * In production, this would integrate with real traffic signal APIs (e.g., SPAT/MAP, GLOSA).
 */

export interface TrafficLight {
  id: string;
  coordinates: { lat: number; lng: number };
  name: string;
  currentPhase: 'green' | 'yellow' | 'red';
  timeToNextPhase: number; // seconds until phase change
  cycleDuration: number; // total cycle time in seconds
  greenDuration: number; // green phase duration
  yellowDuration: number; // yellow phase duration
  redDuration: number; // red phase duration
  isAdaptive: boolean; // whether signal uses adaptive timing
  direction: string; // direction this signal applies to (e.g., "northbound")
}

export interface TrafficLightPrediction {
  trafficLight: TrafficLight;
  distanceFromStart: number; // meters from route start
  estimatedArrivalTime: number; // seconds from now
  predictedPhase: 'green' | 'yellow' | 'red';
  waitTime: number; // expected wait time in seconds (0 if green)
  confidence: number; // 0-1 prediction confidence
  speedRecommendation?: {
    minSpeed: number; // km/h - slow down to catch green
    maxSpeed: number; // km/h - speed limit
    action: 'maintain' | 'slow_down' | 'prepare_to_stop';
  };
}

export interface GreenWaveAnalysis {
  routeId: string;
  totalTrafficLights: number;
  greenLightPercentage: number; // percentage likely to be green on arrival
  estimatedWaitTime: number; // total estimated wait time in seconds
  optimalSpeed: number; // km/h for best green wave
  recommendations: string[];
  predictions: TrafficLightPrediction[];
}

// Simulated traffic light database (in production, this would be from a real API)
// Based on typical UK urban traffic patterns
const SIMULATED_TRAFFIC_LIGHTS: Map<string, Omit<TrafficLight, 'currentPhase' | 'timeToNextPhase'>> = new Map();

// Generate simulated traffic lights along major routes
function generateSimulatedLights(routeCoordinates: Array<{ lat: number; lng: number }>): TrafficLight[] {
  const lights: TrafficLight[] = [];
  
  if (routeCoordinates.length < 2) return lights;
  
  // Calculate total route distance
  let totalDistance = 0;
  for (let i = 1; i < routeCoordinates.length; i++) {
    totalDistance += haversineDistance(
      routeCoordinates[i - 1].lat,
      routeCoordinates[i - 1].lng,
      routeCoordinates[i].lat,
      routeCoordinates[i].lng
    );
  }
  
  // In urban areas, traffic lights typically every 200-500 meters
  // For this simulation, place lights approximately every 400 meters
  const lightSpacing = 400; // meters
  const numLights = Math.floor(totalDistance / lightSpacing);
  
  if (numLights === 0) return lights;
  
  // Get current time for phase calculation
  const now = new Date();
  const secondsIntoHour = now.getMinutes() * 60 + now.getSeconds();
  
  // Distribute lights along the route
  let accumulatedDistance = 0;
  let lightIndex = 0;
  
  for (let i = 1; i < routeCoordinates.length && lightIndex < numLights; i++) {
    const segmentDistance = haversineDistance(
      routeCoordinates[i - 1].lat,
      routeCoordinates[i - 1].lng,
      routeCoordinates[i].lat,
      routeCoordinates[i].lng
    );
    
    while (accumulatedDistance + segmentDistance >= (lightIndex + 1) * lightSpacing && lightIndex < numLights) {
      // Interpolate position along segment
      const targetDistance = (lightIndex + 1) * lightSpacing;
      const ratio = (targetDistance - accumulatedDistance) / segmentDistance;
      
      const lat = routeCoordinates[i - 1].lat + ratio * (routeCoordinates[i].lat - routeCoordinates[i - 1].lat);
      const lng = routeCoordinates[i - 1].lng + ratio * (routeCoordinates[i].lng - routeCoordinates[i - 1].lng);
      
      // Generate realistic cycle times (60-120 seconds typical in UK)
      const cycleDuration = 60 + Math.floor(Math.random() * 60);
      const greenRatio = 0.35 + Math.random() * 0.25; // 35-60% green time
      const greenDuration = Math.floor(cycleDuration * greenRatio);
      const yellowDuration = 3; // Standard 3 seconds
      const redDuration = cycleDuration - greenDuration - yellowDuration;
      
      // Calculate current phase based on time and offset
      const phaseOffset = (lightIndex * 17) % cycleDuration; // Stagger lights
      const timeIntoCycle = (secondsIntoHour + phaseOffset) % cycleDuration;
      
      let currentPhase: 'green' | 'yellow' | 'red';
      let timeToNextPhase: number;
      
      if (timeIntoCycle < greenDuration) {
        currentPhase = 'green';
        timeToNextPhase = greenDuration - timeIntoCycle;
      } else if (timeIntoCycle < greenDuration + yellowDuration) {
        currentPhase = 'yellow';
        timeToNextPhase = greenDuration + yellowDuration - timeIntoCycle;
      } else {
        currentPhase = 'red';
        timeToNextPhase = cycleDuration - timeIntoCycle;
      }
      
      lights.push({
        id: `tl_${lightIndex}_${lat.toFixed(4)}_${lng.toFixed(4)}`,
        coordinates: { lat, lng },
        name: `Traffic Light ${lightIndex + 1}`,
        currentPhase,
        timeToNextPhase,
        cycleDuration,
        greenDuration,
        yellowDuration,
        redDuration,
        isAdaptive: Math.random() > 0.7, // 30% are adaptive
        direction: getDirection(routeCoordinates[i - 1], routeCoordinates[i])
      });
      
      lightIndex++;
    }
    
    accumulatedDistance += segmentDistance;
  }
  
  return lights;
}

// Calculate direction from two points
function getDirection(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
  const bearing = Math.atan2(
    Math.sin((to.lng - from.lng) * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180),
    Math.cos(from.lat * Math.PI / 180) * Math.sin(to.lat * Math.PI / 180) -
    Math.sin(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
    Math.cos((to.lng - from.lng) * Math.PI / 180)
  ) * 180 / Math.PI;
  
  const normalized = (bearing + 360) % 360;
  
  if (normalized < 45 || normalized >= 315) return 'northbound';
  if (normalized >= 45 && normalized < 135) return 'eastbound';
  if (normalized >= 135 && normalized < 225) return 'southbound';
  return 'westbound';
}

// Haversine formula for distance calculation
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get traffic lights along a route with current timing
 */
export function getTrafficLightsAlongRoute(
  routeCoordinates: Array<{ lat: number; lng: number }>
): TrafficLight[] {
  return generateSimulatedLights(routeCoordinates);
}

/**
 * Predict traffic light phases at arrival time
 */
export function predictTrafficLightPhases(
  trafficLights: TrafficLight[],
  averageSpeed: number, // km/h
  startDistances: number[] // distance of each light from route start in meters
): TrafficLightPrediction[] {
  const predictions: TrafficLightPrediction[] = [];
  
  for (let i = 0; i < trafficLights.length; i++) {
    const light = trafficLights[i];
    const distance = startDistances[i] || (i + 1) * 400; // fallback spacing
    
    // Calculate arrival time in seconds
    const arrivalTimeSeconds = (distance / 1000) / averageSpeed * 3600;
    
    // Predict phase at arrival
    const totalSeconds = light.timeToNextPhase + 
      (arrivalTimeSeconds > light.timeToNextPhase 
        ? Math.floor((arrivalTimeSeconds - light.timeToNextPhase) / light.cycleDuration) * light.cycleDuration 
        : 0);
    
    const timeIntoCycle = arrivalTimeSeconds % light.cycleDuration;
    
    let predictedPhase: 'green' | 'yellow' | 'red';
    let waitTime = 0;
    
    // Calculate which phase we'll arrive in
    const phaseOffset = (light.cycleDuration - light.timeToNextPhase + 
      (light.currentPhase === 'green' ? 0 : light.currentPhase === 'yellow' ? light.greenDuration : light.greenDuration + light.yellowDuration)) % light.cycleDuration;
    
    const arrivalTimeInCycle = (phaseOffset + arrivalTimeSeconds) % light.cycleDuration;
    
    if (arrivalTimeInCycle < light.greenDuration) {
      predictedPhase = 'green';
      waitTime = 0;
    } else if (arrivalTimeInCycle < light.greenDuration + light.yellowDuration) {
      predictedPhase = 'yellow';
      waitTime = light.yellowDuration + light.redDuration - (arrivalTimeInCycle - light.greenDuration);
    } else {
      predictedPhase = 'red';
      waitTime = light.cycleDuration - arrivalTimeInCycle;
    }
    
    // Calculate speed recommendation for green wave
    let speedRecommendation: TrafficLightPrediction['speedRecommendation'];
    
    if (predictedPhase === 'red' || predictedPhase === 'yellow') {
      // Calculate speed to catch next green
      const timeToGreen = waitTime + (predictedPhase === 'yellow' ? light.yellowDuration : 0);
      const optimalArrivalTime = arrivalTimeSeconds + timeToGreen;
      const recommendedSpeed = (distance / 1000) / (optimalArrivalTime / 3600);
      
      if (recommendedSpeed < averageSpeed * 0.7) {
        speedRecommendation = {
          minSpeed: Math.max(20, Math.round(recommendedSpeed)),
          maxSpeed: Math.round(averageSpeed),
          action: 'slow_down'
        };
      } else if (recommendedSpeed < averageSpeed * 0.9) {
        speedRecommendation = {
          minSpeed: Math.round(recommendedSpeed),
          maxSpeed: Math.round(averageSpeed),
          action: 'slow_down'
        };
      } else {
        speedRecommendation = {
          minSpeed: Math.round(averageSpeed * 0.8),
          maxSpeed: Math.round(averageSpeed),
          action: 'prepare_to_stop'
        };
      }
    } else {
      speedRecommendation = {
        minSpeed: Math.round(averageSpeed * 0.9),
        maxSpeed: Math.round(averageSpeed),
        action: 'maintain'
      };
    }
    
    // Confidence decreases with distance (predictions are less reliable for distant lights)
    const confidence = Math.max(0.3, 1 - (distance / 10000) * 0.5);
    
    predictions.push({
      trafficLight: light,
      distanceFromStart: distance,
      estimatedArrivalTime: arrivalTimeSeconds,
      predictedPhase,
      waitTime: Math.round(waitTime),
      confidence: Math.round(confidence * 100) / 100,
      speedRecommendation
    });
  }
  
  return predictions;
}

/**
 * Analyze green wave potential for a route
 */
export function analyzeGreenWave(
  routeCoordinates: Array<{ lat: number; lng: number }>,
  averageSpeed: number = 50 // km/h default for urban driving
): GreenWaveAnalysis {
  const trafficLights = getTrafficLightsAlongRoute(routeCoordinates);
  
  if (trafficLights.length === 0) {
    return {
      routeId: `route_${Date.now()}`,
      totalTrafficLights: 0,
      greenLightPercentage: 100,
      estimatedWaitTime: 0,
      optimalSpeed: averageSpeed,
      recommendations: ['No traffic lights detected on this route segment.'],
      predictions: []
    };
  }
  
  // Calculate distances for each light
  const distances: number[] = [];
  let accDistance = 0;
  let lightIdx = 0;
  
  for (let i = 1; i < routeCoordinates.length && lightIdx < trafficLights.length; i++) {
    const segmentDist = haversineDistance(
      routeCoordinates[i - 1].lat,
      routeCoordinates[i - 1].lng,
      routeCoordinates[i].lat,
      routeCoordinates[i].lng
    );
    
    // Check if this light falls within this segment
    while (lightIdx < trafficLights.length) {
      const lightDist = (lightIdx + 1) * 400;
      if (lightDist <= accDistance + segmentDist) {
        distances.push(lightDist);
        lightIdx++;
      } else {
        break;
      }
    }
    
    accDistance += segmentDist;
  }
  
  // Fill remaining distances if needed
  while (distances.length < trafficLights.length) {
    distances.push((distances.length + 1) * 400);
  }
  
  // Get predictions at different speeds to find optimal
  const testSpeeds = [30, 35, 40, 45, 50, 55, 60];
  let bestSpeed = averageSpeed;
  let bestGreenCount = 0;
  let bestWaitTime = Infinity;
  
  for (const speed of testSpeeds) {
    const predictions = predictTrafficLightPhases(trafficLights, speed, distances);
    const greenCount = predictions.filter(p => p.predictedPhase === 'green').length;
    const totalWait = predictions.reduce((sum, p) => sum + p.waitTime, 0);
    
    if (greenCount > bestGreenCount || (greenCount === bestGreenCount && totalWait < bestWaitTime)) {
      bestGreenCount = greenCount;
      bestWaitTime = totalWait;
      bestSpeed = speed;
    }
  }
  
  const predictions = predictTrafficLightPhases(trafficLights, bestSpeed, distances);
  const greenPercentage = (predictions.filter(p => p.predictedPhase === 'green').length / predictions.length) * 100;
  const totalWaitTime = predictions.reduce((sum, p) => sum + p.waitTime, 0);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (bestSpeed !== averageSpeed) {
    recommendations.push(`Adjust speed to ${bestSpeed} km/h for optimal green wave timing.`);
  }
  
  if (greenPercentage >= 70) {
    recommendations.push('Excellent green wave potential on this route!');
  } else if (greenPercentage >= 50) {
    recommendations.push('Moderate green wave opportunity - some stops expected.');
  } else {
    recommendations.push('Multiple signal stops expected. Consider alternate route if available.');
  }
  
  const nextRed = predictions.find(p => p.predictedPhase === 'red' || p.predictedPhase === 'yellow');
  if (nextRed && nextRed.speedRecommendation) {
    if (nextRed.speedRecommendation.action === 'slow_down') {
      recommendations.push(`Slow to ${nextRed.speedRecommendation.minSpeed} km/h at ${nextRed.trafficLight.name} to catch green.`);
    }
  }
  
  // Check for adaptive signals
  const adaptiveCount = trafficLights.filter(l => l.isAdaptive).length;
  if (adaptiveCount > 0) {
    recommendations.push(`${adaptiveCount} adaptive signal(s) detected - timing may adjust based on traffic.`);
  }
  
  return {
    routeId: `route_${Date.now()}`,
    totalTrafficLights: trafficLights.length,
    greenLightPercentage: Math.round(greenPercentage),
    estimatedWaitTime: Math.round(totalWaitTime),
    optimalSpeed: bestSpeed,
    recommendations,
    predictions
  };
}

/**
 * Get recommended speed for upcoming traffic light
 */
export function getSpeedRecommendation(
  currentPosition: { lat: number; lng: number },
  nextLight: TrafficLight,
  currentSpeed: number // km/h
): { speed: number; action: 'maintain' | 'accelerate' | 'decelerate' | 'stop'; message: string } {
  const distance = haversineDistance(
    currentPosition.lat,
    currentPosition.lng,
    nextLight.coordinates.lat,
    nextLight.coordinates.lng
  );
  
  // Time to reach light at current speed
  const timeToLight = (distance / 1000) / currentSpeed * 3600; // seconds
  
  // Calculate predicted phase at arrival
  let predictedPhase = nextLight.currentPhase;
  let timeRemaining = nextLight.timeToNextPhase;
  
  if (timeToLight > timeRemaining) {
    const excessTime = timeToLight - timeRemaining;
    const cycles = Math.floor(excessTime / nextLight.cycleDuration);
    const remainder = excessTime % nextLight.cycleDuration;
    
    // Advance through phases
    const phases: Array<'green' | 'yellow' | 'red'> = ['green', 'yellow', 'red'];
    let currentIdx = phases.indexOf(nextLight.currentPhase);
    
    currentIdx = (currentIdx + 1) % 3;
    predictedPhase = phases[currentIdx];
    
    if (remainder < (predictedPhase === 'green' ? nextLight.greenDuration : 
        predictedPhase === 'yellow' ? nextLight.yellowDuration : nextLight.redDuration)) {
      // Stay in this phase
    } else {
      currentIdx = (currentIdx + 1) % 3;
      predictedPhase = phases[currentIdx];
    }
  }
  
  if (predictedPhase === 'green') {
    return {
      speed: currentSpeed,
      action: 'maintain',
      message: 'Maintain speed - green light ahead'
    };
  }
  
  if (distance < 50) {
    return {
      speed: 0,
      action: 'stop',
      message: 'Prepare to stop - red light'
    };
  }
  
  // Calculate speed to catch next green
  const timeToNextGreen = nextLight.currentPhase === 'red' 
    ? nextLight.timeToNextPhase 
    : nextLight.cycleDuration - nextLight.greenDuration + nextLight.timeToNextPhase;
  
  const optimalSpeed = (distance / 1000) / (timeToNextGreen / 3600);
  
  if (optimalSpeed > currentSpeed * 1.1) {
    return {
      speed: Math.min(currentSpeed * 1.1, 60), // Don't exceed speed limit
      action: 'accelerate',
      message: 'Accelerate slightly to catch green'
    };
  } else if (optimalSpeed < currentSpeed * 0.7) {
    return {
      speed: Math.max(optimalSpeed, 20),
      action: 'decelerate',
      message: `Slow to ${Math.round(optimalSpeed)} km/h to catch green`
    };
  }
  
  return {
    speed: Math.round(optimalSpeed),
    action: 'decelerate',
    message: 'Adjust speed for green light timing'
  };
}
