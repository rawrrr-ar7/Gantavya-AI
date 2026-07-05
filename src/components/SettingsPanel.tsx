import { Settings as SettingsIcon, Moon, Sun, ShieldAlert, RotateCcw, HelpCircle } from 'lucide-react';
import { Settings } from '../types';

interface SettingsPanelProps {
  settings: Settings;
  setSettings: (val: Settings) => void;
  onResetStats: () => void;
}

export default function SettingsPanel({ settings, setSettings, onResetStats }: SettingsPanelProps) {
  const toggleUnit = (unit: 'kmh' | 'mph') => {
    // If we transition to mph, scale down warning limit, or vice versa
    let nextWarning = settings.warningSpeed;
    if (unit === 'mph' && settings.units === 'kmh') {
      nextWarning = Math.round(settings.warningSpeed * 0.621371);
    } else if (unit === 'kmh' && settings.units === 'mph') {
      nextWarning = Math.round(settings.warningSpeed / 0.621371);
    }

    setSettings({
      ...settings,
      units: unit,
      warningSpeed: nextWarning,
    });
  };

  const setWarningLimit = (limit: number) => {
    setSettings({
      ...settings,
      warningSpeed: Math.max(10, Math.min(240, limit)),
    });
  };

  const toggleTheme = (theme: 'dark' | 'light') => {
    setSettings({
      ...settings,
      theme,
    });
  };

  return (
    <div id="settings-section" className="flex flex-col gap-6 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/15">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div className="flex flex-col text-left">
          <h2 className="font-sans text-xl font-bold text-white tracking-tight">PREFERENCES</h2>
          <p className="text-xs text-white/50">Personalize speedometer and safety parameters</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Toggle Theme Row */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5">
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-white/90">Appearance Theme</span>
            <span className="text-[10px] font-mono text-white/40 mt-0.5">Select your driving canvas view</span>
          </div>
          <div className="flex p-0.5 rounded-xl bg-zinc-800/80 border border-white/5">
            <button
              onClick={() => toggleTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                settings.theme === 'dark'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => toggleTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                settings.theme === 'light'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light</span>
            </button>
          </div>
        </div>

        {/* Toggle Units Row */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5">
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-white/90">Speed Tracking Units</span>
            <span className="text-[10px] font-mono text-white/40 mt-0.5">Toggle kilometers or miles standard</span>
          </div>
          <div className="flex p-0.5 rounded-xl bg-zinc-800/80 border border-white/5">
            <button
              onClick={() => toggleUnit('kmh')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                settings.units === 'kmh'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              KM/H
            </button>
            <button
              onClick={() => toggleUnit('mph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                settings.units === 'mph'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              MPH
            </button>
          </div>
        </div>

        {/* Auto Start Trip Row */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5">
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-white/90">Auto Start Trip Logging</span>
            <span className="text-[10px] font-mono text-white/40 mt-0.5">
              Sustained speed {settings.units === 'kmh' ? '> 15 km/h' : '> 9.3 mph'} for 10s automatically starts trip
            </span>
          </div>
          <button
            onClick={() => setSettings({ ...settings, autoStartTrip: !settings.autoStartTrip })}
            className={`relative inline-flex h-6.5 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
              settings.autoStartTrip ? 'bg-sky-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                settings.autoStartTrip ? 'translate-x-5.5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Overspeed limit slider */}
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/30 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-white/90">Overspeed Limit Threshold</span>
              <span className="text-[10px] font-mono text-white/40 mt-0.5">Triggers auditory warnings and flashes</span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-baseline gap-0.5">
              <span className="text-sm font-bold text-sky-400 font-sans">{settings.warningSpeed}</span>
              <span className="text-[9px] font-mono text-sky-400/50 uppercase">
                {settings.units === 'kmh' ? 'km/h' : 'mph'}
              </span>
            </div>
          </div>
          <input
            type="range"
            min="30"
            max={settings.units === 'kmh' ? '180' : '110'}
            value={settings.warningSpeed}
            onChange={(e) => setWarningLimit(Number(e.target.value))}
            className="w-full accent-sky-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-mono">
            <ShieldAlert className="h-3 w-3 text-sky-400" />
            <span>Automobile active safety warnings will play above this speed.</span>
          </div>
        </div>

        {/* Reset / Erase Card */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-red-400">Erase Statistics</span>
            <span className="text-[10px] font-mono text-red-400/50 mt-0.5">Clear all registered trip histories</span>
          </div>
          <button
            onClick={onResetStats}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
