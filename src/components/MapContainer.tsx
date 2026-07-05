import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface MapContainerProps {
  latitude: number | null;
  longitude: number | null;
  route: [number, number][];
  autoCenter: boolean;
  setAutoCenter: (val: boolean) => void;
  theme: 'dark' | 'light';
}

export default function MapContainer({
  latitude,
  longitude,
  route,
  autoCenter,
  setAutoCenter,
  theme,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use default coordinates if not loaded yet (New York as fallback, or middle of world)
    const initialLat = latitude || 40.7128;
    const initialLng = longitude || -74.0060;

    const mapInstance = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false, // We will render our own elegant Apple-style zoom controls
      attributionControl: false,
    });

    mapRef.current = mapInstance;

    // CartoDB Dark Matter tiles (or Positron for light theme)
    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
    });
    tileLayer.addTo(mapInstance);

    // Create custom pulsing marker for GPS
    const pulseIcon = L.divIcon({
      className: 'custom-gps-marker',
      html: `
        <div class="relative flex items-center justify-center h-6 w-6">
          <span class="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-30 animate-ping"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500 border border-white shadow-md"></span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const markerInstance = L.marker([initialLat, initialLng], { icon: pulseIcon });
    markerInstance.addTo(mapInstance);
    markerRef.current = markerInstance;

    // Create polyline for route trail
    const polylineInstance = L.polyline([], {
      color: '#38bdf8', // sky-400
      weight: 4,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    });
    polylineInstance.addTo(mapInstance);
    pathRef.current = polylineInstance;

    // Listen to user map interactions to automatically disable auto-centering
    mapInstance.on('dragstart', () => {
      setAutoCenter(false);
    });

    setMapReady(true);

    return () => {
      mapInstance.remove();
      mapRef.current = null;
      markerRef.current = null;
      pathRef.current = null;
      setMapReady(false);
    };
  }, []); // Run once on mount

  // Watch for dynamic theme shifts and update map tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);
  }, [theme, mapReady]);

  // Update marker position and map center when GPS coordinates change
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;

    if (!map || !marker || latitude === null || longitude === null || !mapReady) return;

    const newLatLng: L.LatLngExpression = [latitude, longitude];
    
    // Smoothly animate marker move
    marker.setLatLng(newLatLng);

    if (autoCenter) {
      map.setView(newLatLng, map.getZoom(), { animate: true, duration: 1 });
    }
  }, [latitude, longitude, autoCenter, mapReady]);

  // Update Route Polyline
  useEffect(() => {
    const polyline = pathRef.current;
    if (!polyline || !mapReady) return;

    const leafletCoords = route.map((coord) => [coord[0], coord[1]] as L.LatLngExpression);
    polyline.setLatLngs(leafletCoords);
  }, [route, mapReady]);

  // Handle Zoom operations
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    setAutoCenter(true);
    if (mapRef.current && latitude !== null && longitude !== null) {
      mapRef.current.setView([latitude, longitude], mapRef.current.getZoom(), {
        animate: true,
        duration: 0.8,
      });
    }
  };

  return (
    <div id="map-widget" className="relative w-full h-[320px] rounded-3xl overflow-hidden border border-white/10 bg-black/20 shadow-xl">
      {/* Map Rendering Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Apple-style controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className={`p-3 rounded-full border shadow-lg backdrop-blur-md transition-all active:scale-95 duration-200 ${
            autoCenter
              ? 'bg-sky-500/95 text-white border-sky-400'
              : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
          }`}
          title="Recenter Map"
        >
          <Crosshair className={`h-5 w-5 ${autoCenter ? 'animate-pulse' : ''}`} />
        </button>

        {/* Zoom controls card */}
        <div className="flex flex-col rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 overflow-hidden shadow-lg">
          <button
            onClick={handleZoomIn}
            className="p-3 text-white hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5"
            title="Zoom In"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-3 text-white hover:bg-white/5 active:bg-white/10 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mini coordinates tag */}
      <div className="absolute top-4 left-4 z-[1000] px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white/80 shadow-md flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
        {latitude !== null && longitude !== null ? (
          <span>
            {latitude.toFixed(5)}°, {longitude.toFixed(5)}°
          </span>
        ) : (
          <span className="animate-pulse">Awaiting GPS Lock...</span>
        )}
      </div>
    </div>
  );
}
