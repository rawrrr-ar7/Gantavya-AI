import { useState, useEffect } from 'react';
import { ShieldCheck, Eye, Compass, HeartPulse, Sparkles, AlertTriangle } from 'lucide-react';

interface SafetyCardProps {
  speed: number | null; // in km/h
  warningSpeed: number; // in current units
  units: 'kmh' | 'mph';
}

const STATIC_SAFETY_TIPS = [
  { icon: Eye, text: 'Maintain a safe 3-second following distance from the vehicle ahead.' },
  { icon: ShieldCheck, text: 'Keep both hands on the steering wheel at the 9 and 3 o\'clock positions.' },
  { icon: Compass, text: 'Stay focused on the road. Avoid looking at mobile devices while driving.' },
  { icon: HeartPulse, text: 'Take a breaks on long trips. Rest every 2 hours or 100 miles of driving.' },
  { icon: Sparkles, text: 'Avoid sudden lane changes or rapid braking to maintain a high safety score.' },
];

export default function SafetyCard({ speed, warningSpeed, units }: SafetyCardProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Convert warning speed to km/h if unit is mph for comparison
  const warningSpeedKmh = units === 'mph' ? warningSpeed / 0.621371 : warningSpeed;
  const currentSpeed = speed || 0;
  const ratio = currentSpeed / warningSpeedKmh;

  // Rotate static tips every 12 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % STATIC_SAFETY_TIPS.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // Determine active tip based on speed severity
  let speedAlertState: 'safe' | 'moderate' | 'high' | 'overspeed' = 'safe';
  let dynamicTip = '';
  let tipIconColor = 'text-emerald-400';
  let bannerBg = 'bg-emerald-500/10 border-emerald-500/20';

  if (ratio > 1.0) {
    speedAlertState = 'overspeed';
    dynamicTip = `Overspeed warning! You have exceeded the ${warningSpeed}${units === 'kmh' ? ' km/h' : ' mph'} safety limit. Reduce speed immediately.`;
    tipIconColor = 'text-red-500 animate-pulse';
    bannerBg = 'bg-red-500/20 border-red-500/40 animate-pulse';
  } else if (ratio > 0.9) {
    speedAlertState = 'high';
    dynamicTip = 'Nearing speed limit. Prepare to ease off the accelerator to maintain safety compliance.';
    tipIconColor = 'text-orange-400';
    bannerBg = 'bg-orange-500/10 border-orange-500/20';
  } else if (ratio > 0.7) {
    speedAlertState = 'moderate';
    dynamicTip = 'Moderate speed. Drive smoothly and anticipate traffic flows to prevent sudden stops.';
    tipIconColor = 'text-yellow-400';
    bannerBg = 'bg-yellow-500/10 border-yellow-500/20';
  } else {
    // Show normal rotating tip
    const activeTip = STATIC_SAFETY_TIPS[currentTipIndex];
    dynamicTip = activeTip.text;
    tipIconColor = 'text-sky-400';
    bannerBg = 'bg-white/5 border-white/10';
  }

  const ActiveIcon = speedAlertState === 'overspeed' 
    ? AlertTriangle 
    : speedAlertState === 'high' 
      ? AlertTriangle 
      : STATIC_SAFETY_TIPS[currentTipIndex].icon;

  return (
    <div id="safety-widget" className={`flex items-start gap-4 p-5 rounded-3xl border backdrop-blur-md transition-all duration-500 ${bannerBg}`}>
      <div className={`p-3 rounded-2xl bg-black/40 border border-white/5 flex-shrink-0 ${tipIconColor}`}>
        <ActiveIcon className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-mono text-white/40 tracking-wider uppercase">
          {speedAlertState === 'overspeed' ? 'Safety Threat Alert' : 'Live Safety Assistant'}
        </span>
        <p className="text-sm font-medium text-white/90 leading-relaxed font-sans mt-0.5">
          {dynamicTip}
        </p>
      </div>
    </div>
  );
}
