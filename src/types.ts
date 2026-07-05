export interface Trip {
  id: string;
  date: string;
  duration: number; // in seconds
  distance: number; // in km
  maxSpeed: number; // in km/h
  avgSpeed: number; // in km/h
  calories: number;
  score: number; // out of 100
  route: [number, number][]; // coordinates path
}

export interface GPSStats {
  speed: number | null; // in km/h
  avgSpeed: number;
  maxSpeed: number;
  distance: number; // in km
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null; // in meters
  heading: number | null; // in degrees
  altitude: number | null; // in meters
}

export interface Settings {
  units: 'kmh' | 'mph';
  warningSpeed: number; // in km/h or mph depending on unit
  theme: 'dark' | 'light';
  autoStartTrip?: boolean; // automatically start logging when speed is > 15 km/h for > 10s
}

export type TripStatus = 'idle' | 'tracking' | 'paused' | 'stopped';
