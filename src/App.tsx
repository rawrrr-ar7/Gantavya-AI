import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Square,
  Navigation,
  Compass,
  Zap,
  Timer,
  Activity,
  HeartPulse,
  Settings as SettingsIcon,
  Map as MapIcon,
  Info,
  ChevronRight,
  Sparkles,
  Download,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

import { Trip, GPSStats, Settings, TripStatus } from './types';
import {
  calculateDistance,
  calculateBearing,
  getCompassDirection,
  calculateSpeedFromCoords,
  estimateCalories,
  calculateDrivingScore
} from './utils/geo';
import { playOverspeedWarning, playClick } from './utils/audio';

import Speedometer from './components/Speedometer';
import MapContainer from './components/MapContainer';
import EmergencyModal from './components/EmergencyModal';
import SafetyCard from './components/SafetyCard';
import SummaryModal from './components/SummaryModal';
import HistoryList from './components/HistoryList';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  // --- 1. Load Local Storage Initializers ---
  const [tripsHistory, setTripsHistory] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('gantavya_trips');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('gantavya_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        autoStartTrip: parsed.autoStartTrip ?? false,
      };
    }
    return {
      units: 'kmh',
      warningSpeed: 80,
      theme: 'dark',
      autoStartTrip: false,
    };
  });

  // --- 2. Live Geolocation States ---
  const [gpsStats, setGpsStats] = useState<GPSStats>({
    speed: null,
    avgSpeed: 0,
    maxSpeed: 0,
    distance: 0,
    latitude: null,
    longitude: null,
    accuracy: null,
    heading: null,
    altitude: null,
  });

  const [tripStatus, setTripStatus] = useState<TripStatus>('idle');
  const [route, setRoute] = useState<[number, number][]>([]);
  const [autoCenter, setAutoCenter] = useState(true);

  // --- 3. Diagnostics and Alerts ---
  const [tripDuration, setTripDuration] = useState(0);
  const [overspeedSeconds, setOverspeedSeconds] = useState(0);
  const [suddenBrakingCount, setSuddenBrakingCount] = useState(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isOverspeeding, setIsOverspeeding] = useState(false);
  const [summaryTrip, setSummaryTrip] = useState<Trip | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // --- 4. System Hooks and Refs ---
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<{ latitude: number; longitude: number; speed: number; timestamp: number } | null>(null);
  const speedHistoryRef = useRef<{ speed: number; timestamp: number }[]>([]);
  const highSpeedStartTimeRef = useRef<number | null>(null);
  const tripStatusRef = useRef<TripStatus>('idle');
  tripStatusRef.current = tripStatus;
  const autoStartTripRef = useRef<boolean>(settings.autoStartTrip ?? false);
  autoStartTripRef.current = settings.autoStartTrip ?? false;

  // PWA Install Prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // --- 5. Sync Settings to LocalStorage & Class theme ---
  useEffect(() => {
    localStorage.setItem('gantavya_settings', JSON.stringify(settings));
    
    // Toggle dark/light document class for styling
    const rootEl = document.documentElement;
    if (settings.theme === 'light') {
      rootEl.classList.remove('dark');
      rootEl.style.backgroundColor = '#f4f4f5'; // Light grey
    } else {
      rootEl.classList.add('dark');
      rootEl.style.backgroundColor = '#09090b'; // Zinc-950
    }
  }, [settings]);

  // Sync Trips History
  useEffect(() => {
    localStorage.setItem('gantavya_trips', JSON.stringify(tripsHistory));
  }, [tripsHistory]);

  // --- 6. PWA Installation Listeners ---
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration skipped:', err);
      });
    }
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  // --- 7. Chrono Trip Timer System ---
  useEffect(() => {
    if (tripStatus === 'tracking') {
      timerRef.current = setInterval(() => {
        setTripDuration((prev) => prev + 1);

        // Track overspeeding seconds
        setGpsStats((currentStats) => {
          if (currentStats.speed !== null) {
            const warningSpeedKmh = settings.units === 'mph' ? settings.warningSpeed / 0.621371 : settings.warningSpeed;
            if (currentStats.speed > warningSpeedKmh) {
              setOverspeedSeconds((prev) => prev + 1);
              setIsOverspeeding(true);
              // Synthesize warning audio tone
              playOverspeedWarning();
            } else {
              setIsOverspeeding(false);
            }
          }
          return currentStats;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsOverspeeding(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tripStatus, settings.warningSpeed, settings.units]);

  // --- 8. Geolocation Tracking System ---
  const startGPSTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsError(null);

    const handleGPSUpdate = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, heading, altitude } = position.coords;
      let rawSpeed = position.coords.speed; // Speed in m/s from GPS
      const timestamp = position.timestamp;

      let speedKmh = rawSpeed !== null ? rawSpeed * 3.6 : null;
      let isManualSpeed = false;

      // Fallback manual speed calculation if GPS speed is unavailable or null
      if (speedKmh === null && lastPositionRef.current) {
        const calculated = calculateSpeedFromCoords(
          lastPositionRef.current.latitude,
          lastPositionRef.current.longitude,
          lastPositionRef.current.timestamp,
          latitude,
          longitude,
          timestamp
        );
        speedKmh = calculated;
        isManualSpeed = true;
      }

      // Static noise filter and adaptive drift thresholding
      let driftThreshold = 3.0; // Default threshold of 3 km/h
      if (accuracy !== null && accuracy > 30) {
        // If GPS accuracy is poor (>30m), scale the threshold dynamically or ignore minor jumps entirely
        // For example, with 50m accuracy, threshold becomes 3.0 + 20 * 0.1 = 5.0 km/h
        driftThreshold = Math.min(10.0, 3.0 + (accuracy - 30) * 0.1);
      }

      // Apply thresholding to force speed to 0 if below drift threshold
      if (speedKmh !== null) {
        if (isManualSpeed || rawSpeed === null) {
          if (speedKmh < driftThreshold) {
            speedKmh = 0;
          }
        } else {
          // For raw GPS speed, apply a slightly scaled baseline threshold if accuracy is poor
          const rawDriftThreshold = accuracy !== null && accuracy > 30 ? 2.5 : 1.5;
          if (speedKmh < rawDriftThreshold) {
            speedKmh = 0;
          }
        }
      }

      // Check for sudden brakes (e.g., deceleration > 12 km/h per update/sec)
      if (speedKmh !== null && lastPositionRef.current) {
        const timeDelta = (timestamp - lastPositionRef.current.timestamp) / 1000;
        if (timeDelta > 0 && timeDelta < 2.5) {
          const speedDelta = lastPositionRef.current.speed - speedKmh;
          // Deceleration rate normalized to per-second
          const decelerationPerSec = speedDelta / timeDelta;
          if (decelerationPerSec > 12) {
            setSuddenBrakingCount((prev) => prev + 1);
          }
        }
      }

      // Compute headings (if missing, estimate from coordinate trajectory)
      let resolvedHeading = heading;
      if ((resolvedHeading === null || isNaN(resolvedHeading)) && lastPositionRef.current && speedKmh && speedKmh > 3) {
        resolvedHeading = calculateBearing(
          lastPositionRef.current.latitude,
          lastPositionRef.current.longitude,
          latitude,
          longitude
        );
      }

      // Save as latest reference position
      lastPositionRef.current = {
        latitude,
        longitude,
        speed: speedKmh || 0,
        timestamp,
      };

      // Auto Start Trip logging logic
      if (autoStartTripRef.current && tripStatusRef.current === 'idle') {
        if (speedKmh !== null && speedKmh >= 15) {
          if (highSpeedStartTimeRef.current === null) {
            highSpeedStartTimeRef.current = timestamp;
          } else if (timestamp - highSpeedStartTimeRef.current >= 10000) {
            // Reset high speed timer to prevent duplicate starts
            highSpeedStartTimeRef.current = null;
            // Trigger automatic trip start
            handleStartTripRef.current();
          }
        } else {
          highSpeedStartTimeRef.current = null;
        }
      } else {
        highSpeedStartTimeRef.current = null;
      }

      // State Updates
      setGpsStats((prev) => {
        // Core metric aggregates
        const isTracking = tripStatus === 'tracking';
        let newDistance = prev.distance;

        if (isTracking && prev.latitude !== null && prev.longitude !== null) {
          const increment = calculateDistance(prev.latitude, prev.longitude, latitude, longitude);
          // Accumulate distance (ensure distance jitter doesn't spike while completely stationary)
          if (speedKmh && speedKmh > 1) {
            newDistance += increment;
          }
        }

        const newMaxSpeed = speedKmh !== null ? Math.max(prev.maxSpeed, speedKmh) : prev.maxSpeed;
        
        // Calculate cumulative moving average speed
        let newAvgSpeed = prev.avgSpeed;
        if (isTracking && speedKmh !== null && speedKmh > 0.5) {
          speedHistoryRef.current.push({ speed: speedKmh, timestamp });
          const totalSpeed = speedHistoryRef.current.reduce((sum, item) => sum + item.speed, 0);
          newAvgSpeed = totalSpeed / speedHistoryRef.current.length;
        }

        return {
          speed: speedKmh,
          maxSpeed: newMaxSpeed,
          avgSpeed: newAvgSpeed,
          distance: newDistance,
          latitude,
          longitude,
          accuracy,
          heading: resolvedHeading,
          altitude,
        };
      });

      // Update route trajectory if currently tracking active trip
      if (tripStatus === 'tracking') {
        setRoute((prev) => [...prev, [latitude, longitude]]);
      }
    };

    const handleGPSError = (error: GeolocationPositionError) => {
      console.warn('GPS position error code:', error.code, error.message);
      if (error.code === error.PERMISSION_DENIED) {
        setGpsError('GPS Access Denied. Please enable high accuracy location services in your browser settings to run speedometer.');
      } else {
        setGpsError(`GPS Status: ${error.message} (Searching for high precision signal...)`);
      }
    };

    // Watcher options
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handleGPSUpdate, handleGPSError, options);
  };

  // Start GPS watch on first load
  useEffect(() => {
    startGPSTracking();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [tripStatus]);

  // --- 9. Core Trip State Controllers ---
  const handleStartTrip = () => {
    playClick();
    setTripStatus('tracking');
    setTripDuration(0);
    setOverspeedSeconds(0);
    setSuddenBrakingCount(0);
    speedHistoryRef.current = [];
    
    const lat = lastPositionRef.current?.latitude ?? gpsStats.latitude;
    const lng = lastPositionRef.current?.longitude ?? gpsStats.longitude;
    const speed = lastPositionRef.current?.speed ?? gpsStats.speed;

    if (lat !== null && lng !== null && lat !== undefined && lng !== undefined) {
      setRoute([[lat, lng]]);
    } else {
      setRoute([]);
    }

    setGpsStats((prev) => ({
      ...prev,
      distance: 0,
      avgSpeed: 0,
      maxSpeed: speed || prev.speed || 0,
    }));
  };

  const handleStartTripRef = useRef(handleStartTrip);
  handleStartTripRef.current = handleStartTrip;

  const handlePauseTrip = () => {
    playClick();
    setTripStatus('paused');
  };

  const handleResumeTrip = () => {
    playClick();
    setTripStatus('tracking');
  };

  const handleStopTrip = () => {
    playClick();
    setTripStatus('stopped');

    const totalSeconds = tripDuration;
    const caloriesBurned = estimateCalories(totalSeconds, gpsStats.avgSpeed);
    
    const safetyScore = calculateDrivingScore({
      overspeedSeconds,
      totalSeconds,
      suddenBrakes: suddenBrakingCount,
      avgSpeed: gpsStats.avgSpeed,
      maxSpeed: gpsStats.maxSpeed,
    });

    const finishedTrip: Trip = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      duration: totalSeconds,
      distance: gpsStats.distance,
      avgSpeed: gpsStats.avgSpeed,
      maxSpeed: gpsStats.maxSpeed,
      calories: caloriesBurned,
      score: safetyScore,
      route,
    };

    // Save to device history list
    setTripsHistory((prev) => [finishedTrip, ...prev]);
    setSummaryTrip(finishedTrip);
    setShowSummaryModal(true);
    setTripStatus('idle');
  };

  // --- 10. Preference Operations ---
  const handleDeleteTrip = (id: string) => {
    playClick();
    setTripsHistory((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearAllHistory = () => {
    playClick();
    if (window.confirm('Are you sure you want to clear all driving history metrics?')) {
      setTripsHistory([]);
    }
  };

  const handleResetCurrentStats = () => {
    playClick();
    if (window.confirm('Reset current maximum and average statistics?')) {
      setGpsStats((prev) => ({
        ...prev,
        maxSpeed: prev.speed || 0,
        avgSpeed: prev.speed || 0,
        distance: 0,
      }));
      setTripDuration(0);
      setOverspeedSeconds(0);
      setSuddenBrakingCount(0);
      setRoute([]);
    }
  };

  // Conversions for UI
  const formatAltitude = (meters: number | null) => {
    if (meters === null || isNaN(meters)) return 'N/A';
    if (settings.units === 'mph') {
      return `${Math.round(meters * 3.28084)} ft`; // Feet
    }
    return `${Math.round(meters)} m`; // Meters
  };

  const formatDistance = (km: number) => {
    if (settings.units === 'mph') {
      return `${(km * 0.621371).toFixed(2)} mi`;
    }
    return `${km.toFixed(2)} km`;
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  const currentThemeClasses = settings.theme === 'light'
    ? 'bg-zinc-100 text-zinc-900 border-zinc-200'
    : 'bg-[#09090b] text-white border-zinc-900';

  const dashboardCardBg = settings.theme === 'light'
    ? 'bg-white/80 border-zinc-200/80 text-zinc-800'
    : 'bg-white/5 border-white/10 text-white/90';

  return (
    <div 
      className={`min-h-screen w-full flex flex-col p-4 md:p-8 transition-colors duration-500 overflow-x-hidden ${currentThemeClasses} ${
        isOverspeeding ? 'overspeed-flash-active' : ''
      }`}
    >
      {/* Dynamic Title / Header Area */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between mb-6">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-mono tracking-widest text-sky-500 font-bold uppercase flex items-center gap-1">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Active Driver Co-Pilot
          </span>
          <h1 className="font-display text-2xl font-black tracking-tight mt-0.5">GANTAVYA AI</h1>
        </div>

        {/* Action tags */}
        <div className="flex items-center gap-2">
          {showInstallBtn && (
            <button
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </button>
          )}

          {/* Quick status dot */}
          <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${gpsError ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping'}`} />
            <span>{gpsError ? 'SIGNAL GPS LOST' : 'GPS LOCKED'}</span>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-4xl mx-auto w-full flex flex-col gap-6 flex-1">
        
        {/* Permission / Geolocation Warning Alert Banners */}
        {gpsError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-sans flex items-start gap-3">
            <Info className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="flex flex-col gap-1 text-left">
              <span className="font-semibold uppercase tracking-wider text-[9px] font-mono">Location Diagnostic</span>
              <p className="leading-relaxed text-amber-300/90">{gpsError}</p>
              <button 
                onClick={startGPSTracking}
                className="mt-2 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-[10px] font-mono hover:bg-amber-500/25 max-w-max transition-all"
              >
                Force Recalibrate Signal
              </button>
            </div>
          </div>
        )}

        {/* UPPER GRID: Speedometer (Primary Visual) and Live Safety Banner */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Speedometer Gauges (3 cols) */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <Speedometer
              speed={gpsStats.speed}
              maxSpeed={gpsStats.maxSpeed}
              avgSpeed={gpsStats.avgSpeed}
              units={settings.units}
              warningSpeed={settings.warningSpeed}
              compassDir={getCompassDirection(gpsStats.heading)}
            />
            {/* Contextual Assistant Tips */}
            <SafetyCard
              speed={gpsStats.speed}
              warningSpeed={settings.warningSpeed}
              units={settings.units}
            />
          </div>

          {/* Interactive OSM Dark-Themed Map Canvas (2 cols) */}
          <div className="md:col-span-2 flex flex-col gap-4 h-full">
            <MapContainer
              latitude={gpsStats.latitude}
              longitude={gpsStats.longitude}
              route={route}
              autoCenter={autoCenter}
              setAutoCenter={setAutoCenter}
              theme={settings.theme}
            />

            {/* Tracking Controller Bar - Glassmorphism buttons */}
            <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/40 tracking-wider uppercase">Trip Diagnostics</span>
                {tripStatus !== 'idle' && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono">
                    <span className="animate-pulse">●</span>
                    <span>RECORDING</span>
                  </div>
                )}
              </div>

              {/* Dynamic state engine controllers */}
              <div className="flex gap-3">
                {tripStatus === 'idle' && (
                  <button
                    onClick={handleStartTrip}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-lg hover:shadow-sky-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="h-4.5 w-4.5" />
                    <span>Start Active Trip</span>
                  </button>
                )}

                {tripStatus === 'tracking' && (
                  <>
                    <button
                      onClick={handlePauseTrip}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold active:scale-95 transition-all border border-white/10 cursor-pointer"
                    >
                      <Pause className="h-4.5 w-4.5" />
                      <span>Pause Trip</span>
                    </button>
                    <button
                      onClick={handleStopTrip}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Square className="h-4.5 w-4.5" />
                      <span>Stop Trip</span>
                    </button>
                  </>
                )}

                {tripStatus === 'paused' && (
                  <>
                    <button
                      onClick={handleResumeTrip}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold active:scale-95 transition-all cursor-pointer"
                    >
                      <Play className="h-4.5 w-4.5" />
                      <span>Resume</span>
                    </button>
                    <button
                      onClick={handleStopTrip}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Square className="h-4.5 w-4.5" />
                      <span>Stop</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Grid metrics widgets (Bento Grid Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          {/* Trip Duration */}
          <div className={`p-4 rounded-3xl border flex items-center gap-3.5 transition-all ${dashboardCardBg}`}>
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400">
              <Timer className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono text-white/30 tracking-wider uppercase">Trip Time</span>
              <span className="text-base font-bold font-sans tracking-tight mt-0.5">{formatTime(tripDuration)}</span>
            </div>
          </div>

          {/* Cumulative distance */}
          <div className={`p-4 rounded-3xl border flex items-center gap-3.5 transition-all ${dashboardCardBg}`}>
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400">
              <Navigation className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono text-white/30 tracking-wider uppercase">Distance</span>
              <span className="text-base font-bold font-sans tracking-tight mt-0.5">{formatDistance(gpsStats.distance)}</span>
            </div>
          </div>

          {/* Altitude */}
          <div className={`p-4 rounded-3xl border flex items-center gap-3.5 transition-all ${dashboardCardBg}`}>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono text-white/30 tracking-wider uppercase">Altitude</span>
              <span className="text-base font-bold font-sans tracking-tight mt-0.5">{formatAltitude(gpsStats.altitude)}</span>
            </div>
          </div>

          {/* GPS Accuracy */}
          <div className={`p-4 rounded-3xl border flex items-center gap-3.5 transition-all ${dashboardCardBg}`}>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono text-white/30 tracking-wider uppercase">Accuracy</span>
              <span className="text-base font-bold font-sans tracking-tight mt-0.5">
                {gpsStats.accuracy ? `±${Math.round(gpsStats.accuracy)}m` : 'N/A'}
              </span>
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: Splits settings panel, emergency SOS triggers, and historical details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Historical Trips List */}
          <HistoryList
            trips={tripsHistory}
            units={settings.units}
            onDeleteTrip={handleDeleteTrip}
            onClearAll={handleClearAllHistory}
          />

          {/* Parameter Configuration Preferences panel */}
          <SettingsPanel
            settings={settings}
            setSettings={setSettings}
            onResetStats={handleResetCurrentStats}
          />
        </div>

      </main>

      {/* Floating emergency SOS button with details popup */}
      <EmergencyModal
        latitude={gpsStats.latitude}
        longitude={gpsStats.longitude}
        accuracy={gpsStats.accuracy}
      />

      {/* Speed limit exceeded warnings overlays */}
      <AnimatePresence>
        {isOverspeeding && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[10005] bg-red-600 border border-red-500 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce"
          >
            <AlertTriangle className="h-5 w-5 text-white animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono font-bold text-red-200 tracking-wider uppercase">Overspeed Limit warning</span>
              <p className="text-sm font-bold text-white mt-0.5">
                SLOW DOWN! You are exceeding {settings.warningSpeed} {settings.units === 'kmh' ? 'km/h' : 'mph'} limit.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trip Completed Diagnostic Summary Modal */}
      <AnimatePresence>
        {showSummaryModal && summaryTrip && (
          <SummaryModal
            trip={summaryTrip}
            units={settings.units}
            onClose={() => setShowSummaryModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
