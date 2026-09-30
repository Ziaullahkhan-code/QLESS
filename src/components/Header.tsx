import React from 'react';
import { ActiveView } from '../types';
import { Users, LayoutDashboard, SplitSquareVertical, Volume2, VolumeX, MapPin, RotateCcw, Tv } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playClickSound } from '../services/sound';
import { Logo } from './Logo';

interface HeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  waitingCount: number;
  hasUserToken: boolean;
  gpsStatus: 'idle' | 'locating' | 'granted' | 'denied' | 'preset';
  onOpenGpsModal: () => void;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  waitingCount,
  hasUserToken,
  gpsStatus,
  onOpenGpsModal,
  onResetDemo,
}) => {
  const [soundOn, setSoundOn] = React.useState(isSoundEnabled());

  const toggleSound = () => {
    playClickSound();
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const handleViewClick = (view: ActiveView) => {
    playClickSound();
    onViewChange(view);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
        
        {/* Brand & Live Sync Status */}
        <div className="flex items-center gap-4 shrink-0">
          <Logo size="md" showTagline={true} />
        </div>

        {/* View Switcher: Light Mode Segmented Control with Click Sound */}
        <nav aria-label="Main Navigation" className="flex items-center p-1.5 bg-slate-100 border border-slate-200 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => handleViewClick('customer')}
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeView === 'customer'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer View</span>
            {hasUserToken && (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleViewClick('business')}
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeView === 'business'
                ? 'bg-slate-900 text-white shadow-md font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Staff Dashboard</span>
            {waitingCount > 0 && (
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-bold ${
                activeView === 'business' 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {waitingCount}
              </span>
            )}
          </button>

          {/* Split Mode */}
          <button
            type="button"
            onClick={() => handleViewClick('split')}
            title="Inspect Customer & Staff side-by-side"
            className={`hidden md:flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeView === 'split'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <SplitSquareVertical className="w-4 h-4" />
            <span>Side-by-Side</span>
          </button>

          {/* TV / Calling Screen Display */}
          <button
            type="button"
            onClick={() => handleViewClick('display')}
            title="Overhead Counter Display for TV Screens"
            className={`hidden lg:flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeView === 'display'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>TV Display</span>
          </button>
        </nav>

        {/* Global Utilities */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenGpsModal();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Karachi anchor settings"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden lg:inline">SMCHS Anchor</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute turn alerts' : 'Enable turn alerts'}
            title={soundOn ? 'Voice announcements active' : 'Voice announcements muted'}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onResetDemo();
            }}
            title="Refill queue with sample diners"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Refill Sample</span>
          </button>
        </div>

      </div>
    </header>
  );
};
