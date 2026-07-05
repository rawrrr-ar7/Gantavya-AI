/**
 * Calculates the distance between two coordinates in kilometers using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculates compass bearing between two coordinates in degrees (0 - 360).
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = deg2rad(lon2 - lon1);
  const lat1Rad = deg2rad(lat1);
  const lat2Rad = deg2rad(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let brng = Math.atan2(y, x);
  brng = rad2deg(brng);
  return (brng + 360) % 360;
}

function rad2deg(rad: number): number {
  return rad * (180 / Math.PI);
}

/**
 * Returns compass direction string from degrees (e.g. N, NE, E, SE, etc.).
 */
export function getCompassDirection(degrees: number | null): string {
  if (degrees === null || isNaN(degrees)) return 'N/A';
  const val = Math.floor(degrees / 22.5 + 0.5);
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return arr[val % 16];
}

/**
 * Speed calculations when GPS returns null speed.
 */
export function calculateSpeedFromCoords(
  lat1: number,
  lon1: number,
  time1: number,
  lat2: number,
  lon2: number,
  time2: number
): number {
  const dist = calculateDistance(lat1, lon1, lat2, lon2); // in km
  const timeDiff = (time2 - time1) / 1000; // in seconds
  if (timeDiff <= 0) return 0;
  
  // Speed in km/s -> km/h
  const speedKmh = (dist / timeDiff) * 3600;
  
  // Sanity check: GPS jitter could cause unrealistically high speeds. Limit to 300 km/h.
  return Math.min(speedKmh, 300);
}

/**
 * Estimate calories burned during trip (driving takes concentration and light physical effort).
 * Average calorie burn is ~2.0 kcal/min depending on speed and intensity.
 */
export function estimateCalories(durationSeconds: number, avgSpeedKmh: number): number {
  const durationMinutes = durationSeconds / 60;
  // Dynamic factor: higher speeds or fast driving requires more cognitive load/heart rate elevation
  const factor = avgSpeedKmh > 100 ? 2.5 : avgSpeedKmh > 50 ? 2.0 : 1.6;
  return Math.round(durationMinutes * factor * 10) / 10;
}

/**
 * Calculate driving safety score (starts at 100, drops for high decelerations, overspeed and variance)
 */
export function calculateDrivingScore(stats: {
  overspeedSeconds: number;
  totalSeconds: number;
  suddenBrakes: number;
  avgSpeed: number;
  maxSpeed: number;
}): number {
  if (stats.totalSeconds <= 5) return 100;
  
  let score = 100;

  // 1. Overspeed penalty (percentage of trip spent speeding)
  const overspeedRatio = stats.overspeedSeconds / stats.totalSeconds;
  const overspeedPenalty = overspeedRatio * 40; // Max 40 points penalty
  score -= overspeedPenalty;

  // 2. Sudden brakes penalty
  const brakingPenalty = stats.suddenBrakes * 8; // 8 points penalty per sudden brake
  score -= brakingPenalty;

  // 3. Extreme speed penalty (if max speed is way above average, showing erratic driving)
  if (stats.maxSpeed > stats.avgSpeed * 2.2 && stats.avgSpeed > 15) {
    score -= 10;
  }

  // Bound score between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}
