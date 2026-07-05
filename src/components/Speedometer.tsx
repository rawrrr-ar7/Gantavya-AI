import { motion } from 'motion/react';
import { Compass, Zap } from 'lucide-react';

interface SpeedometerProps {
  speed: number | null; // km/h
  maxSpeed: number; // km/h
  avgSpeed: number; // km/h
  units: 'kmh' | 'mph';
  warningSpeed: number; // in unit preference
  compassDir: string;
}

export default function Speedometer({
  speed,
  maxSpeed,
  avgSpeed,
  units,
  warningSpeed,
  compassDir,
}: SpeedometerProps) {
  // Convert speed values to display unit if necessary
  const toDisplayValue = (kmh: number | null) => {
    if (kmh === null) return 0;
    if (units === 'mph') {
      return kmh * 0.621371;
    }
    return kmh;
  };

  const displaySpeed = Math.round(toDisplayValue(speed));
  const displayMax = Math.round(toDisplayValue(maxSpeed));
  const displayAvg = Math.round(toDisplayValue(avgSpeed));

  const unitLabel = units === 'kmh' ? 'km/h' : 'mph';
  
  // Calculate warning limits in km/h for the safety thresholds
  const warningSpeedKmh = units === 'mph' ? warningSpeed / 0.621371 : warningSpeed;
  const currentSpeedKmh = speed || 0;

  // Set colors based on percentage of warning speed limit
  const ratio = currentSpeedKmh / warningSpeedKmh;
  let speedColorClass = 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]';
  let speedArcColor = '#34d399'; // Emerald-400
  let speedStatusLabel = 'SAFE';

  if (ratio > 1.0) {
    speedColorClass = 'text-red-500 animate-pulse drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]';
    speedArcColor = '#ef4444'; // Red-500
    speedStatusLabel = 'OVERSPEED';
  } else if (ratio > 0.9) {
    speedColorClass = 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]';
    speedArcColor = '#fb923c'; // Orange-400
    speedStatusLabel = 'WARNING';
  } else if (ratio > 0.7) {
    speedColorClass = 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]';
    speedArcColor = '#facc15'; // Yellow-400
    speedStatusLabel = 'MODERATE';
  }

  // Speedometer graphic config
  const minAngle = -120;
  const maxAngle = 120;
  const maxDialSpeed = units === 'kmh' ? 180 : 120; // Maximum speed shown on the gauge dial
  const speedPercentage = Math.min((displaySpeed / maxDialSpeed) * 100, 100);
  const needleAngle = minAngle + (speedPercentage / 100) * (maxAngle - minAngle);

  // Circle path for the speedometer gauge ring
  // Center (150, 150), Radius (120)
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  // Arc angle is 240 degrees (240 / 360) * circumference
  const arcLength = (240 / 360) * circumference;
  const strokeDashoffset = arcLength - (speedPercentage / 100) * arcLength;

  // Custom tick marks
  const ticks = Array.from({ length: 13 }).map((_, i) => {
    const tickSpeed = (i / 12) * maxDialSpeed;
    const angle = minAngle + (i / 12) * (maxAngle - minAngle);
    const angleRad = (angle - 90) * (Math.PI / 180);
    const x1 = 150 + (radius - 10) * Math.cos(angleRad);
    const y1 = 150 + (radius - 10) * Math.sin(angleRad);
    const x2 = 150 + radius * Math.cos(angleRad);
    const y2 = 150 + radius * Math.sin(angleRad);

    const isMajor = i % 2 === 0;
    const labelX = 150 + (radius - 24) * Math.cos(angleRad);
    const labelY = 150 + (radius - 24) * Math.sin(angleRad);

    return { x1, y1, x2, y2, isMajor, tickSpeed, labelX, labelY, angle };
  });

  return (
    <div id="speedometer-widget" className="relative flex flex-col items-center justify-center p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden select-none">
      {/* Background glow matching the current speed warning state */}
      <div 
        className="absolute inset-0 -z-10 opacity-10 blur-3xl transition-colors duration-500 rounded-full"
        style={{
          background: `radial-gradient(circle, ${speedArcColor} 0%, transparent 70%)`
        }}
      />

      {/* Safety Status Banner */}
      <div className="absolute top-4 px-3 py-1 text-[10px] font-mono tracking-widest rounded-full border border-white/10 bg-black/40 flex items-center gap-1.5">
        <span 
          className="h-2 w-2 rounded-full animate-ping" 
          style={{ backgroundColor: speedArcColor }} 
        />
        <span style={{ color: speedArcColor }}>{speedStatusLabel}</span>
      </div>

      <div className="relative w-[300px] h-[300px] mt-2">
        <svg viewBox="0 0 300 300" className="w-full h-full">
          <defs>
            <linearGradient id="needleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Core circular tracks */}
          {/* Unfilled dial arc track */}
          <path
            d="M 64.8 235.2 A 120 120 0 1 1 235.2 235.2"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Colored dynamic speed arc fill */}
          <path
            d="M 64.8 235.2 A 120 120 0 1 1 235.2 235.2"
            fill="none"
            stroke={speedArcColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{
              strokeDashoffset: strokeDashoffset + (circumference - arcLength),
              transition: 'stroke 0.5s ease, stroke-dashoffset 0.15s ease-out'
            }}
          />

          {/* Ticks and Labels */}
          {ticks.map((tick, index) => (
            <g key={index}>
              <line
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={tick.isMajor ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={tick.isMajor ? '2' : '1'}
              />
              {tick.isMajor && (
                <text
                  x={tick.labelX}
                  y={tick.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-sans text-[10px] font-medium fill-white/50"
                >
                  {Math.round(tick.tickSpeed)}
                </text>
              )}
            </g>
          ))}

          {/* Rotating Needle */}
          <motion.g
            animate={{ rotate: needleAngle }}
            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            style={{ originX: '150px', originY: '150px' }}
          >
            {/* Elegant glassmorphic center cap ring */}
            <circle cx="150" cy="150" r="14" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            
            {/* Sleek needle line */}
            <line
              x1="150"
              y1="150"
              x2="150"
              y2="45"
              stroke="url(#needleGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#glow)"
            />
            
            {/* Center pointer accent */}
            <circle cx="150" cy="150" r="4" fill="#ffffff" />
          </motion.g>
        </svg>

        {/* Central HUD text layer overlayed inside the SVG space */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pointer-events-none">
          <motion.h1 
            key={displaySpeed}
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`font-sans font-bold text-7xl tracking-tighter ${speedColorClass} tabular-nums transition-colors duration-500`}
          >
            {displaySpeed}
          </motion.h1>
          <p className="text-xs font-mono tracking-widest text-white/50 uppercase mt-0.5">{unitLabel}</p>
          
          {/* GPS Compass bearing widget */}
          <div className="flex items-center gap-1 mt-4 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-mono text-white/70">
            <Compass className="h-3 w-3 text-sky-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span>{compassDir || 'N'}</span>
          </div>
        </div>
      </div>

      {/* Mini dashboard stats in-line with the speedometer */}
      <div className="w-full grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-white/5">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-white/40 tracking-wider uppercase">MAX SPEED</span>
          <div className="flex items-baseline gap-0.5 mt-1">
            <span className="text-lg font-semibold text-white/90 font-sans tracking-tight">{displayMax}</span>
            <span className="text-[9px] text-white/40 font-mono">{unitLabel}</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-white/40 tracking-wider uppercase">AVG SPEED</span>
          <div className="flex items-baseline gap-0.5 mt-1">
            <span className="text-lg font-semibold text-white/90 font-sans tracking-tight">{displayAvg}</span>
            <span className="text-[9px] text-white/40 font-mono">{unitLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
