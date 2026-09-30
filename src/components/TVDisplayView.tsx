import React, { useState, useEffect } from 'react';
import { Restaurant, QueueToken } from '../types';
import { 
  Tv, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Users, 
  Sparkles, 
  Bell, 
  Clock, 
  Store,
  ChevronDown
} from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playCustomerTurnAlert, playClickSound } from '../services/sound';

interface TVDisplayViewProps {
  restaurants: Restaurant[];
  selectedRestaurantId: string;
  onSelectRestaurant: (restaurantId: string) => void;
  activeQueue: QueueToken[];
  currentlyServing?: QueueToken;
}

export const TVDisplayView: React.FC<TVDisplayViewProps> = ({
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  activeQueue,
  currentlyServing,
}) => {
  const currentRestaurant = restaurants.find((r) => r.id === selectedRestaurantId) || restaurants[0];
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    playClickSound();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleSound = () => {
    playClickSound();
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const handleTestChime = () => {
    playClickSound();
    const num = currentlyServing?.tokenNumber || 'BL-105';
    const counter = currentlyServing?.calledToCounter || 'Counter 3';
    playCustomerTurnAlert(num, counter);
  };

  const waitingTokens = activeQueue.filter((t) => t.status === 'waiting');

  return (
    <div className="w-full min-h-[75vh] flex flex-col justify-between rounded-3xl bg-slate-950 text-white p-6 sm:p-10 shadow-2xl border border-slate-800 relative overflow-hidden select-none">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TV TOP BAR: Venue Selector, Live Clock, and Screen Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        
        {/* Left: Venue Switcher */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Overhead Calling Board
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                SMCHS Karachi
              </span>
            </div>
            
            <div className="relative mt-1">
              <select
                value={selectedRestaurantId}
                onChange={(e) => {
                  playClickSound();
                  onSelectRestaurant(e.target.value);
                }}
                className="bg-slate-900 border border-slate-700 hover:border-slate-500 text-white text-base sm:text-lg font-black rounded-xl px-3 py-1 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.name} ({r.category})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Right: Controls & Time */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-base font-bold text-slate-200 shadow-inner">
            {currentTime}
          </div>

          <button
            type="button"
            onClick={handleTestChime}
            title="Test announcement bell chime"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-blue-400 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Test Speaker</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            title={soundOn ? 'Mute TV Chime' : 'Unmute TV Chime'}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle TV Fullscreen"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. TV CENTERPIECE: HUGE "NOW CALLING" DISPLAY */}
      <div className="relative z-10 py-10 sm:py-16 text-center space-y-6">
        
        {currentlyServing ? (
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-black tracking-widest uppercase text-sm sm:text-base animate-pulse shadow-lg shadow-emerald-950/60">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <span>NOW CALLING · STEP UP TO COUNTER</span>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-7xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 tracking-tight drop-shadow-2xl">
                {currentlyServing.tokenNumber}
              </div>

              <div className="flex items-center justify-center gap-4 text-xl sm:text-3xl font-extrabold text-blue-400">
                <span>Please proceed to</span>
                <span className="px-5 py-1.5 rounded-2xl bg-blue-600 text-white font-mono font-black shadow-xl shadow-blue-600/40">
                  {currentlyServing.calledToCounter || 'Counter 3'}
                </span>
              </div>

              <p className="text-sm sm:text-base text-slate-400 font-medium pt-2">
                Guest: <strong className="text-white">{currentlyServing.customerName}</strong> · Party of {currentlyServing.partySize}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-12 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 animate-spin-slow" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-300">
              Station Ready · Waiting for Next Guest
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Counter staff at {currentRestaurant.name} will press &apos;SERVE NEXT&apos; to dispatch upcoming diners.
            </p>
          </div>
        )}

      </div>

      {/* 3. TV BOTTOM STRIP: "NEXT IN LINE" TICKER */}
      <div className="relative z-10 pt-6 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Up Next in Queue ({waitingTokens.length} Waiting)
            </span>
          </div>

          <span className="text-xs text-slate-500 font-mono">
            Average service pace: ~{currentRestaurant.avgWaitPerPartyMin}m
          </span>
        </div>

        {waitingTokens.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500">
            No guests currently waiting in line.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {waitingTokens.slice(0, 6).map((tok, idx) => (
              <div
                key={tok.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  idx === 0
                    ? 'bg-blue-950/60 border-blue-500/60 text-white ring-1 ring-blue-500/30'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                  <span>#{idx + 1} {idx === 0 ? 'UP NEXT' : ''}</span>
                  <span className="font-mono text-slate-400">{tok.partySize}p</span>
                </div>
                <div className="font-mono text-xl font-black text-white">
                  {tok.tokenNumber}
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {tok.customerName}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
