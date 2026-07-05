import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Copy, ExternalLink, Check, X } from 'lucide-react';

interface EmergencyModalProps {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

export default function EmergencyModal({ latitude, longitude, accuracy }: EmergencyModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const googleMapsUrl = latitude && longitude 
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : '';

  const handleCopyLocation = () => {
    if (!latitude || !longitude) return;
    const textToCopy = `Emergency SOS!\nMy GPS coordinates:\nLatitude: ${latitude.toFixed(6)}\nLongitude: ${longitude.toFixed(6)}\nAccuracy: ±${accuracy ? Math.round(accuracy) : 'N/A'}m\nMap Link: ${googleMapsUrl}`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Red Pulse Floating SOS Trigger Button */}
      <button
        id="sos-trigger-button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-[999] flex items-center justify-center h-14 w-14 rounded-full bg-red-600 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-transform hover:bg-red-500 cursor-pointer"
      >
        <span className="absolute inset-0 rounded-full bg-red-600 opacity-20 animate-ping" />
        <span className="font-sans font-black text-sm text-white tracking-wider">SOS</span>
      </button>

      {/* Emergency Coordinates Modal Panel */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md overflow-hidden bg-zinc-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl text-center"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 mb-4 animate-pulse">
                <ShieldAlert className="h-8 w-8 text-red-500" />
              </div>

              <h2 className="font-sans text-2xl font-bold text-white tracking-tight mb-1">EMERGENCY ASSISTANCE</h2>
              <p className="text-xs text-white/50 mb-6">Instantly access and share your exact location with emergency services or family.</p>

              {/* Coordinates Box */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mb-6 text-left font-mono">
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
                  <span className="text-white/40 text-xs uppercase">LATITUDE</span>
                  <span className="col-span-2 text-white font-medium text-sm text-right">
                    {latitude ? latitude.toFixed(6) : 'Awaiting GPS lock...'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
                  <span className="text-white/40 text-xs uppercase">LONGITUDE</span>
                  <span className="col-span-2 text-white font-medium text-sm text-right">
                    {longitude ? longitude.toFixed(6) : 'Awaiting GPS lock...'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1.5">
                  <span className="text-white/40 text-xs uppercase">ACCURACY</span>
                  <span className="col-span-2 text-white font-medium text-sm text-right">
                    {accuracy ? `±${Math.round(accuracy)} meters` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Buttons Action Group */}
              <div className="flex flex-col gap-3">
                {/* Copy Info Button */}
                <button
                  onClick={handleCopyLocation}
                  disabled={!latitude || !longitude}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white text-black hover:bg-white/90 font-medium active:scale-98 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Copied Location details</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy Coordinates & Link</span>
                    </>
                  )}
                </button>

                {/* View on Google Maps Button */}
                {latitude && longitude && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium active:scale-98 transition-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Open in Google Maps</span>
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
