import { motion } from 'motion/react';
import { Award, Timer, Navigation, Zap, Flame, ShieldAlert, Check } from 'lucide-react';
import { Trip } from '../types';

interface SummaryModalProps {
  trip: Trip;
  units: 'kmh' | 'mph';
  onClose: () => void;
}

export default function SummaryModal({ trip, units, onClose }: SummaryModalProps) {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const toDisplayValue = (km: number) => {
    if (units === 'mph') {
      return km * 0.621371;
    }
    return km;
  };

  const displayDistance = toDisplayValue(trip.distance).toFixed(2);
  const displayAvgSpeed = Math.round(toDisplayValue(trip.avgSpeed));
  const displayMaxSpeed = Math.round(toDisplayValue(trip.maxSpeed));
  const unitLabel = units === 'kmh' ? 'km/h' : 'mph';
  const distLabel = units === 'kmh' ? 'km' : 'mi';

  // Score color determinations
  let scoreColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
  let scoreText = 'Excellent Safe Driver';
  let scoreProgressColor = '#10b981';

  if (trip.score < 70) {
    scoreColor = 'text-red-500 border-red-500/20 bg-red-500/5';
    scoreText = 'Aggressive Driving Detected';
    scoreProgressColor = '#ef4444';
  } else if (trip.score < 90) {
    scoreColor = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
    scoreText = 'Good Smooth Driving';
    scoreProgressColor = '#facc15';
  }

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative w-full max-w-lg overflow-hidden bg-zinc-950 border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col gap-6"
      >
        {/* Decorative ambient background */}
        <div className="absolute inset-x-0 -top-40 -z-10 h-80 bg-sky-500/10 blur-3xl rounded-full" />

        {/* Header Summary Accent */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 border border-sky-500/30 mb-3 text-sky-400">
            <Award className="h-6 w-6" />
          </div>
          <h2 className="font-sans text-2xl font-bold text-white tracking-tight">TRIP SUMMARY REPORT</h2>
          <p className="text-xs text-white/50 mt-0.5">Gantavya AI smart driver diagnostics and metrics</p>
        </div>

        {/* Driving Score Circle / Meter */}
        <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${scoreColor}`}>
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={scoreProgressColor}
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={(2 * Math.PI * 40) * (1 - trip.score / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-sans tracking-tight text-white">{trip.score}</span>
              <span className="text-[9px] font-mono tracking-widest text-white/50 uppercase">SCORE</span>
            </div>
          </div>
          <span className="font-sans text-xs font-semibold text-white mt-3 uppercase tracking-wide">
            {scoreText}
          </span>
        </div>

        {/* Grid Stats cards */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Duration Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Timer className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase">DURATION</span>
              <span className="text-sm font-semibold text-white/90 mt-0.5">{formatTime(trip.duration)}</span>
            </div>
          </div>

          {/* Distance Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Navigation className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase">DISTANCE</span>
              <span className="text-sm font-semibold text-white/90 mt-0.5">
                {displayDistance} {distLabel}
              </span>
            </div>
          </div>

          {/* Average Speed Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase">AVG SPEED</span>
              <span className="text-sm font-semibold text-white/90 mt-0.5">
                {displayAvgSpeed} {unitLabel}
              </span>
            </div>
          </div>

          {/* Max Speed Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase">MAX SPEED</span>
              <span className="text-sm font-semibold text-white/90 mt-0.5">
                {displayMaxSpeed} {unitLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Calories Burned Inline Card */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-400">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Flame className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono text-amber-400/50 uppercase">ENERGY EXPENDED</span>
              <span className="text-xs text-white/85">Driving cognitive focus calories</span>
            </div>
          </div>
          <span className="font-sans text-lg font-bold text-white tracking-tight">
            {trip.calories} <span className="text-xs font-normal text-white/50">kcal</span>
          </span>
        </div>

        {/* Confirm / Close Button */}
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-medium shadow-lg hover:shadow-sky-500/10 active:scale-98 transition-all cursor-pointer"
        >
          <Check className="h-4 w-4" />
          <span>Save Trip Details</span>
        </button>
      </motion.div>
    </div>
  );
}
