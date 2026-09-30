import React from 'react';
import { GeoCoordinates, PRESET_LOCATIONS } from '../hooks/useGeolocation';
import { MapPin, Navigation, Check, X, AlertCircle } from 'lucide-react';
import { playClickSound } from '../services/sound';

interface GpsLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  coords: GeoCoordinates;
  status: 'idle' | 'locating' | 'granted' | 'denied' | 'preset';
  errorMessage: string | null;
  activePresetId: string | null;
  onRequestGps: () => void;
  onSelectPreset: (presetId: string) => void;
}

export const GpsLocationModal: React.FC<GpsLocationModalProps> = ({
  isOpen,
  onClose,
  coords,
  status,
  errorMessage,
  activePresetId,
  onRequestGps,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-7 shadow-2xl space-y-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Karachi Anchor &amp; GPS Settings</h2>
              <p className="text-xs text-slate-500">Fixed Anchor: SMCHS / Bahadurabad (24.8716°N, 67.0598°E)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Coordinates Banner */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Coordinates</span>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {status === 'granted' ? 'Live HTML5 Device GPS' : 'SMCHS Karachi Anchor'}
            </span>
          </div>
          <div className="font-mono text-sm text-slate-800 flex items-center gap-5">
            <div>
              <span className="text-slate-400 text-xs mr-1.5">LAT</span>
              {coords.lat.toFixed(5)}
            </div>
            <div>
              <span className="text-slate-400 text-xs mr-1.5">LNG</span>
              {coords.lng.toFixed(5)}
            </div>
          </div>
          {coords.accuracy && (
            <p className="text-[11px] text-slate-500">
              Estimated GPS accuracy: ±{Math.round(coords.accuracy)} meters
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Action: Use Real Device GPS */}
        <div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onRequestGps();
            }}
            disabled={status === 'locating'}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/25 cursor-pointer"
          >
            <Navigation className={`w-4 h-4 ${status === 'locating' ? 'animate-spin' : ''}`} />
            <span>{status === 'locating' ? 'Acquiring GPS Signal...' : 'Refresh Device Geolocation'}</span>
          </button>
        </div>

        {/* Preset Culinary Hubs */}
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Karachi Focal Points:
          </p>
          <div className="space-y-2.5">
            {PRESET_LOCATIONS.map((preset) => {
              const isSelected = activePresetId === preset.id || (!activePresetId && preset.id === 'karachi-smchs');
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onSelectPreset(preset.id);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 text-blue-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{preset.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{preset.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
