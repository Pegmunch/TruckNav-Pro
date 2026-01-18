import { storage } from "../storage";
import { type TrafficPredictionResponse, type TrafficSegmentPrediction, type HistoricalTrafficData } from "@shared/schema";

interface PredictionResult {
  predictedDuration: number;
  baselineDuration: number;
  predictedDelay: number;
  congestionScore: number;
  confidence: number;
  segmentAnalysis: TrafficSegmentPrediction[];
  bestDepartureTime: string | null;
  alternativeTimes: Array<{
    time: string;
    predictedDuration: number;
    predictedDelay: number;
    congestionScore: number;
  }>;
  dataQuality: 'high' | 'medium' | 'low' | 'insufficient';
}

export class PredictiveTrafficService {
  private readonly SEGMENT_HASH_PRECISION = 3; // Decimal places for lat/lng hashing

  generateRoadSegmentId(lat: number, lng: number): string {
    const latHash = lat.toFixed(this.SEGMENT_HASH_PRECISION);
    const lngHash = lng.toFixed(this.SEGMENT_HASH_PRECISION);
    return `seg_${latHash}_${lngHash}`;
  }

  async recordObservation(
    lat: number,
    lng: number,
    observedSpeed: number,
    freeFlowSpeed?: number,
    source: string = 'user',
    journeyId?: number
  ): Promise<void> {
    const roadSegmentId = this.generateRoadSegmentId(lat, lng);
    
    await storage.recordTrafficObservation({
      roadSegmentId,
      latitude: lat,
      longitude: lng,
      observedSpeed,
      freeFlowSpeed: freeFlowSpeed || observedSpeed * 1.2,
      congestionLevel: freeFlowSpeed ? Math.max(0, 1 - (observedSpeed / freeFlowSpeed)) : 0,
      source,
      journeyId,
    });
  }

  async predictTrafficForRoute(
    routeId: string,
    routePath: Array<{ lat: number; lng: number }>,
    departureTime?: Date,
    baselineDurationMinutes?: number
  ): Promise<PredictionResult> {
    const targetTime = departureTime || new Date();
    const dayOfWeek = targetTime.getDay();
    const hourOfDay = targetTime.getHours();

    const cached = await storage.getTrafficPrediction(routeId, targetTime);
    if (cached) {
      return {
        predictedDuration: cached.predictedDuration,
        baselineDuration: cached.baselineDuration,
        predictedDelay: cached.predictedDelay,
        congestionScore: cached.congestionScore,
        confidence: cached.confidence,
        segmentAnalysis: cached.segmentPredictions || [],
        bestDepartureTime: null,
        alternativeTimes: [],
        dataQuality: this.determineDataQuality(cached.confidence),
      };
    }

    const segmentPredictions: TrafficSegmentPrediction[] = [];
    let totalDelay = 0;
    let totalConfidence = 0;
    let segmentsWithData = 0;

    for (const point of routePath) {
      const segmentId = this.generateRoadSegmentId(point.lat, point.lng);
      const historicalData = await storage.aggregateHistoricalData(segmentId, dayOfWeek, hourOfDay);
      
      if (historicalData && historicalData.sampleCount >= 3) {
        const prediction: TrafficSegmentPrediction = {
          roadSegmentId: segmentId,
          roadName: historicalData.roadName,
          latitude: point.lat,
          longitude: point.lng,
          predictedSpeed: historicalData.averageSpeed,
          freeFlowSpeed: historicalData.freeFlowSpeed,
          congestionLevel: historicalData.congestionLevel,
          predictedDelay: historicalData.averageDelayMinutes || 0,
          confidence: Math.min(1, historicalData.sampleCount / 20),
        };
        
        segmentPredictions.push(prediction);
        totalDelay += prediction.predictedDelay;
        totalConfidence += prediction.confidence;
        segmentsWithData++;
      } else {
        segmentPredictions.push({
          roadSegmentId: segmentId,
          roadName: null,
          latitude: point.lat,
          longitude: point.lng,
          predictedSpeed: 50, // Default speed assumption
          freeFlowSpeed: 60,
          congestionLevel: 0.2, // Assume light congestion by default
          predictedDelay: 0.5,
          confidence: 0.1,
        });
        totalConfidence += 0.1;
      }
    }

    const avgConfidence = routePath.length > 0 ? totalConfidence / routePath.length : 0;
    const congestionScore = this.calculateOverallCongestion(segmentPredictions);
    const baseline = baselineDurationMinutes || this.estimateBaselineDuration(routePath);
    const predictedDuration = baseline + totalDelay;

    const alternativeTimes = await this.calculateAlternativeDepartureTimes(
      routePath,
      targetTime,
      baseline
    );

    const bestTime = this.findBestDepartureTime(alternativeTimes, targetTime);

    const result: PredictionResult = {
      predictedDuration: Math.round(predictedDuration),
      baselineDuration: Math.round(baseline),
      predictedDelay: Math.round(totalDelay),
      congestionScore: Math.round(congestionScore * 100) / 100,
      confidence: Math.round(avgConfidence * 100) / 100,
      segmentAnalysis: segmentPredictions,
      bestDepartureTime: bestTime,
      alternativeTimes,
      dataQuality: this.determineDataQuality(avgConfidence),
    };

    await storage.cacheTrafficPrediction({
      routeId,
      predictionTime: targetTime,
      predictedDuration: result.predictedDuration,
      baselineDuration: result.baselineDuration,
      predictedDelay: result.predictedDelay,
      congestionScore: result.congestionScore,
      confidence: result.confidence,
      segmentPredictions: result.segmentAnalysis,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    return result;
  }

  private calculateOverallCongestion(segments: TrafficSegmentPrediction[]): number {
    if (segments.length === 0) return 0;
    const totalCongestion = segments.reduce((sum, s) => sum + s.congestionLevel, 0);
    return totalCongestion / segments.length;
  }

  private estimateBaselineDuration(routePath: Array<{ lat: number; lng: number }>): number {
    if (routePath.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < routePath.length; i++) {
      totalDistance += this.haversineDistance(routePath[i - 1], routePath[i]);
    }
    
    const avgSpeedKmH = 50; // Assume average speed of 50 km/h
    return (totalDistance / 1000) / avgSpeedKmH * 60; // Duration in minutes
  }

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

    return R * c;
  }

  private async calculateAlternativeDepartureTimes(
    routePath: Array<{ lat: number; lng: number }>,
    targetTime: Date,
    baselineDuration: number
  ): Promise<Array<{ time: string; predictedDuration: number; predictedDelay: number; congestionScore: number }>> {
    const alternatives: Array<{ time: string; predictedDuration: number; predictedDelay: number; congestionScore: number }> = [];
    
    // Check 3 hours before and after in 1-hour increments
    for (let hourOffset = -3; hourOffset <= 3; hourOffset++) {
      if (hourOffset === 0) continue; // Skip current time
      
      const altTime = new Date(targetTime);
      altTime.setHours(altTime.getHours() + hourOffset);
      
      const dayOfWeek = altTime.getDay();
      const hourOfDay = altTime.getHours();
      
      let totalDelay = 0;
      let totalCongestion = 0;
      let segmentCount = 0;
      
      for (const point of routePath.slice(0, 10)) { // Sample first 10 points for speed
        const segmentId = this.generateRoadSegmentId(point.lat, point.lng);
        const historical = await storage.aggregateHistoricalData(segmentId, dayOfWeek, hourOfDay);
        
        if (historical) {
          totalDelay += historical.averageDelayMinutes || 0;
          totalCongestion += historical.congestionLevel;
          segmentCount++;
        }
      }
      
      const avgCongestion = segmentCount > 0 ? totalCongestion / segmentCount : 0.2;
      const estimatedDelay = segmentCount > 0 ? totalDelay * (routePath.length / 10) : baselineDuration * 0.1;
      
      alternatives.push({
        time: altTime.toISOString(),
        predictedDuration: Math.round(baselineDuration + estimatedDelay),
        predictedDelay: Math.round(estimatedDelay),
        congestionScore: Math.round(avgCongestion * 100) / 100,
      });
    }
    
    // Sort by predicted duration
    return alternatives.sort((a, b) => a.predictedDuration - b.predictedDuration);
  }

  private findBestDepartureTime(
    alternatives: Array<{ time: string; predictedDuration: number; predictedDelay: number; congestionScore: number }>,
    originalTime: Date
  ): string | null {
    if (alternatives.length === 0) return null;
    
    const best = alternatives[0];
    const originalHour = originalTime.getHours();
    const bestHour = new Date(best.time).getHours();
    
    // Only suggest if it saves at least 5 minutes
    if (best.predictedDelay < 5) {
      return best.time;
    }
    
    return null;
  }

  private determineDataQuality(confidence: number): 'high' | 'medium' | 'low' | 'insufficient' {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.4) return 'medium';
    if (confidence >= 0.2) return 'low';
    return 'insufficient';
  }

  async getTrafficPatternSummary(
    bounds: { north: number; south: number; east: number; west: number },
    dayOfWeek?: number,
    hourOfDay?: number
  ): Promise<{
    averageCongestion: number;
    worstHours: Array<{ hour: number; congestion: number }>;
    bestHours: Array<{ hour: number; congestion: number }>;
    dataPoints: number;
  }> {
    const now = new Date();
    const targetDay = dayOfWeek ?? now.getDay();
    const targetHour = hourOfDay ?? now.getHours();
    
    const data = await storage.getHistoricalDataForTimeSlot(targetDay, targetHour, bounds);
    
    if (data.length === 0) {
      return {
        averageCongestion: 0,
        worstHours: [],
        bestHours: [],
        dataPoints: 0,
      };
    }
    
    const avgCongestion = data.reduce((sum, d) => sum + d.congestionLevel, 0) / data.length;
    
    // Get congestion by hour for the same day
    const hourlyData: Map<number, number[]> = new Map();
    for (let h = 0; h < 24; h++) {
      const hourData = await storage.getHistoricalDataForTimeSlot(targetDay, h, bounds);
      if (hourData.length > 0) {
        const avgHourCongestion = hourData.reduce((sum, d) => sum + d.congestionLevel, 0) / hourData.length;
        hourlyData.set(h, [avgHourCongestion]);
      }
    }
    
    const hourlyAvg = Array.from(hourlyData.entries())
      .map(([hour, values]) => ({ hour, congestion: values[0] }))
      .sort((a, b) => a.congestion - b.congestion);
    
    return {
      averageCongestion: Math.round(avgCongestion * 100) / 100,
      worstHours: hourlyAvg.slice(-3).reverse(),
      bestHours: hourlyAvg.slice(0, 3),
      dataPoints: data.length,
    };
  }
}

export const predictiveTrafficService = new PredictiveTrafficService();
