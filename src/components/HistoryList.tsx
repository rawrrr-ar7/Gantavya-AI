import { Trash2, Calendar, Map, Award, Clock } from 'lucide-react';
import { Trip } from '../types';

interface HistoryListProps {
  trips: Trip[];
  units: 'kmh' | 'mph';
  onDeleteTrip: (id: string) => void;
  onClearAll: () => void;
}

export default function HistoryList({ trips, units, onDeleteTrip, onClearAll }: HistoryListProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const toDisplayDistance = (km: number) => {
    if (units === 'mph') return `${(km * 0.621371).toFixed(1)} mi`;
    return `${km.toFixed(1)} km`;
  };

  const toDisplaySpeed = (kmh: number) => {
    if (units === 'mph') return `${Math.round(kmh * 0.621371)} mph`;
    return `${Math.round(kmh)} km/h`;
  };

  return (
    <div id="history-section" className="flex flex-col gap-4 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="font-sans text-xl font-bold text-white tracking-tight">TRIP HISTORY</h2>
          <p className="text-xs text-white/50">Local tracking history on this device</p>
        </div>
        {trips.length > 0 && (
          <button
            onClick={onClearAll}
            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 text-[10px] font-mono tracking-wider uppercase transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/10 rounded-2xl">
          <Map className="h-10 w-10 text-white/25 mb-3" />
          <p className="text-sm font-medium text-white/60">No Recorded Trips</p>
          <p className="text-xs text-white/40 max-w-[200px] mt-1">Start and stop your trip tracking to view safety records here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 max-h-[380px] overflow-y-auto pr-1">
          {trips.map((trip) => {
            let scoreBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            if (trip.score < 70) scoreBg = 'bg-red-500/10 text-red-400 border-red-500/20';
            else if (trip.score < 90) scoreBg = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';

            return (
              <div
                key={trip.id}
                className="group relative flex flex-col gap-3 p-4 bg-black/30 border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-200 overflow-hidden"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60 text-xs font-mono">
                    <Calendar className="h-3.5 w-3.5 text-sky-400" />
                    <span>{trip.date}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Score badge */}
                    <div className={`px-2 py-0.5 rounded-full border text-[10px] font-mono flex items-center gap-1 ${scoreBg}`}>
                      <Award className="h-3 w-3" />
                      <span>Score: {trip.score}</span>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteTrip(trip.id)}
                      className="p-1.5 rounded-lg bg-white/0 hover:bg-white/5 text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete trip"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 text-left">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-white/30 uppercase">DISTANCE</span>
                    <span className="text-sm font-semibold text-white/85 mt-0.5">
                      {toDisplayDistance(trip.distance)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-white/30 uppercase">DURATION</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-sky-400" />
                      <span className="text-sm font-semibold text-white/85">
                        {formatTime(trip.duration)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-white/30 uppercase">AVG SPEED</span>
                    <span className="text-sm font-semibold text-white/85 mt-0.5">
                      {toDisplaySpeed(trip.avgSpeed)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
