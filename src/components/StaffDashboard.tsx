import React, { useState, useEffect } from 'react';
import { QueueToken, Restaurant, QueueMetrics } from '../types';
import { 
  Bell, 
  UserX, 
  Volume2, 
  Plus, 
  Clock, 
  Users, 
  ChevronDown, 
  Sparkles, 
  CheckCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { WalkInModal } from './WalkInModal';
import { playClickSound, playCustomerTurnAlert } from '../services/sound';
import { downloadAnalyticsCsv } from '../services/api';

interface StaffDashboardProps {
  restaurants: Restaurant[];
  selectedRestaurantId: string;
  onSelectRestaurant: (restaurantId: string) => void;
  activeQueue: QueueToken[];
  currentlyServing?: QueueToken;
  metrics: QueueMetrics;
  counterTimeoutSeconds?: number;
  onSetTimeout?: (seconds: number) => void;
  onServeNext: (restaurantId: string, counterName: string) => void;
  onSkipToken: (tokenId: string, reason?: string) => void;
  onCompleteService: (tokenId: string) => void;
  onRecallToken: (tokenId: string, counterName?: string) => void;
  onAddWalkIn: (restaurantId: string, partySize: number, name?: string, notes?: string) => void;
  onResetQueue: (restaurantId: string) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  activeQueue,
  currentlyServing,
  metrics,
  counterTimeoutSeconds = 60,
  onSetTimeout,
  onServeNext,
  onSkipToken,
  onCompleteService,
  onRecallToken,
  onAddWalkIn,
  onResetQueue,
}) => {
  const currentRestaurant = restaurants.find((r) => r.id === selectedRestaurantId) || restaurants[0];
  
  const [activeCounter, setActiveCounter] = useState<string>(
    currentRestaurant?.defaultCounter || 'Counter 3'
  );

  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  // Keyboard shortcut: Spacebar to Serve Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handleServeNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRestaurantId, activeCounter, activeQueue]);

  const handleServeNext = () => {
    playClickSound();
    const waitingTokens = activeQueue.filter((t) => t.status === 'waiting');
    if (waitingTokens.length === 0) {
      setLastActionMessage('Queue is currently clear. No waiting guests.');
      setTimeout(() => setLastActionMessage(null), 3000);
      return;
    }
    const nextInLine = waitingTokens[0];
    onServeNext(currentRestaurant.id, activeCounter);
    setLastActionMessage(`Calling: Token number ${nextInLine.tokenNumber}, please proceed to ${activeCounter}`);
    setTimeout(() => setLastActionMessage(null), 4000);
  };

  const handleComplete = (tokenId: string) => {
    playClickSound();
    onCompleteService(tokenId);
  };

  const handleRecall = (tokenId: string) => {
    playClickSound();
    onRecallToken(tokenId, activeCounter);
    setLastActionMessage(`Re-called token to ${activeCounter} with voice announcement`);
    setTimeout(() => setLastActionMessage(null), 3500);
  };

  const handleSkip = (tokenId: string) => {
    playClickSound();
    onSkipToken(tokenId, 'No show / skipped by staff');
  };

  const nextUp = activeQueue.find((t) => t.status === 'waiting');
  const waitingTokensOnly = activeQueue.filter((t) => t.status === 'waiting');

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      
      {/* 1. Station Control Header: Clean White */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Restaurant Station & Counter Pickers */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="space-y-1.5">
            <label htmlFor="staff-restaurant-selector" className="text-xs uppercase tracking-wider font-bold text-slate-500 block">
              Venue Station
            </label>
            <div className="relative">
              <select
                id="staff-restaurant-selector"
                value={currentRestaurant.id}
                onChange={(e) => {
                  playClickSound();
                  onSelectRestaurant(e.target.value);
                }}
                className="w-72 sm:w-84 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm focus:border-blue-600 focus:outline-none appearance-none cursor-pointer pr-10 shadow-2xs"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="staff-counter-selector" className="text-xs uppercase tracking-wider font-bold text-slate-500 block">
              My Calling Counter
            </label>
            <div className="relative">
              <select
                id="staff-counter-selector"
                value={activeCounter}
                onChange={(e) => {
                  playClickSound();
                  setActiveCounter(e.target.value);
                }}
                className="w-44 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-blue-700 font-mono font-bold text-sm focus:border-blue-600 focus:outline-none appearance-none cursor-pointer pr-9 shadow-2xs"
              >
                <option value="Counter 3">Counter 3 (Default)</option>
                <option value="Counter 1">Counter 1</option>
                <option value="Counter 2">Counter 2</option>
                <option value="Counter 4">Counter 4</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Configurable Token Auto-Expire Duration Selector */}
          <div className="space-y-1.5">
            <label htmlFor="staff-timeout-selector" className="text-xs uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span>Auto-Expire Window</span>
            </label>
            <div className="relative">
              <select
                id="staff-timeout-selector"
                value={counterTimeoutSeconds}
                onChange={(e) => {
                  playClickSound();
                  if (onSetTimeout) {
                    onSetTimeout(Number(e.target.value));
                    setLastActionMessage(`Arrival timeout updated to ${e.target.value}s`);
                    setTimeout(() => setLastActionMessage(null), 3000);
                  }
                }}
                className="w-48 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-rose-700 font-mono font-bold text-sm focus:border-rose-500 focus:outline-none appearance-none cursor-pointer pr-9 shadow-2xs"
              >
                <option value={30}>30s (Rapid Testing)</option>
                <option value={45}>45s (Fast Pace)</option>
                <option value={60}>60s (Standard 1 Min)</option>
                <option value={90}>90s (1.5 Mins)</option>
                <option value={120}>120s (2 Mins)</option>
                <option value={180}>180s (3 Mins)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Quick Operations: Issue Walk-in & Refill */}
        <div className="flex items-center gap-3 self-start lg:self-end">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsWalkInOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Walk-in Token</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              downloadAnalyticsCsv();
              setLastActionMessage('Daily Queue CSV downloaded successfully');
              setTimeout(() => setLastActionMessage(null), 3000);
            }}
            title="Download Daily Queue CSV Report"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              const num = currentlyServing?.tokenNumber || 'BL-105';
              playCustomerTurnAlert(num, activeCounter);
              setLastActionMessage(`Testing speaker chime for ${activeCounter}`);
              setTimeout(() => setLastActionMessage(null), 3000);
            }}
            title="Test announcement bell speaker chime"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Test Speaker</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onResetQueue(currentRestaurant.id);
            }}
            title="Refill queue with sample diners"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refill Sample Queue</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner with Voice Text */}
      {lastActionMessage && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2.5 animate-fade-in shadow-2xs">
          <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{lastActionMessage}</span>
        </div>
      )}

      {/* 2. Queue Operational Metrics in Clean White */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 space-y-1.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Waiting in Line</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">{metrics.totalWaiting}</span>
            <span className="text-xs text-slate-500">parties</span>
          </div>
          <p className="text-[11px] text-slate-400">Live active tokens</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 space-y-1.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Est. Line Wait</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600 font-mono">
              {metrics.totalWaiting === 0 ? '0' : `~${metrics.estimatedWaitMinutes}`}
            </span>
            <span className="text-xs text-slate-500">mins</span>
          </div>
          <p className="text-[11px] text-slate-400">~{metrics.averageWaitTimeMinutes}m average pace</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 space-y-1.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Served Today</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 font-mono">{metrics.servedCountToday}</span>
            <span className="text-xs text-slate-500">completed</span>
          </div>
          <p className="text-[11px] text-slate-400">Guests processed</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 space-y-1.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No-Shows / Skipped</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-700 font-mono">{metrics.skippedCountToday}</span>
            <span className="text-xs text-slate-500">skipped</span>
          </div>
          <p className="text-[11px] text-slate-400">Unanswered calls</p>
        </div>
      </div>

      {/* 3. PRIMARY OPERATIONAL DISPATCH: SERVE NEXT & ACTIVE STATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* Left Column: Prominent SERVE NEXT Command Center */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-blue-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Primary Dispatch Station
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  Target: {activeCounter}
                </span>
              </div>

              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Live Dispatch Controller
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Clicking &apos;SERVE NEXT&apos; calls out: <strong className="text-slate-800">&quot;Token number {nextUp?.tokenNumber || '...'}, please proceed to {activeCounter}&quot;</strong> and alerts the customer.
              </p>
            </div>

            {/* Next in Line Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                  Next in Queue:
                </span>
                {nextUp ? (
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="font-mono text-2xl font-black text-slate-900">{nextUp.tokenNumber}</span>
                    <span className="text-xs text-slate-700 font-bold">{nextUp.customerName}</span>
                    <span className="text-xs text-slate-500">· Party of {nextUp.partySize}</span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-slate-500 mt-0.5 block">No guests waiting in queue</span>
                )}
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {waitingTokensOnly.length} Waiting
              </span>
            </div>

            {/* THE PROMINENT SERVE NEXT BUTTON: Tactile Blue with Voice Announcement */}
            <button
              type="button"
              onClick={handleServeNext}
              disabled={waitingTokensOnly.length === 0}
              className={`w-full py-5 px-6 rounded-2xl font-black text-lg sm:text-xl tracking-wide flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl active:scale-[0.99] ${
                waitingTokensOnly.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Bell className="w-6 h-6 stroke-[2.5] animate-bounce" />
              <span>
                {waitingTokensOnly.length > 0 
                  ? `SERVE NEXT → ${nextUp?.tokenNumber || ''}`
                  : 'QUEUE IS CLEAR'}
              </span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Press <kbd className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700 border border-slate-300">Space</kbd> on keyboard to dispatch</span>
              <span>Calls out to: <strong className="text-slate-900">{activeCounter}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Currently Serving Station */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xl flex flex-col justify-between h-full space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Currently Serving
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {currentlyServing ? currentlyServing.calledToCounter || activeCounter : activeCounter}
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Active Station Counter
              </h2>
            </div>

            {currentlyServing ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                      Token Number
                    </span>
                    <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 tracking-tight block mt-1">
                      {currentlyServing.tokenNumber}
                    </span>
                    <p className="text-base font-bold text-slate-900 mt-1.5">
                      {currentlyServing.customerName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Party of {currentlyServing.partySize} {currentlyServing.notes ? `· ${currentlyServing.notes}` : ''}
                    </p>
                    {currentlyServing.expiresAt && (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 mt-2 w-fit">
                        <Clock className="w-3 h-3 text-rose-600 animate-pulse" />
                        <span>Auto-expires if diner doesn&apos;t arrive ({counterTimeoutSeconds}s timeout)</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      AT COUNTER
                    </span>
                  </div>
                </div>

                {/* Operations on Active Token */}
                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleComplete(currentlyServing.id)}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-600/25 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Service</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRecall(currentlyServing.id)}
                    title="Repeat voice announcement: Token number B-105, please proceed to Counter 3"
                    className="py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-2 transition-colors border border-slate-300 cursor-pointer shadow-2xs"
                  >
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    <span>Re-Call Voice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSkip(currentlyServing.id)}
                    className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserX className="w-4 h-4" />
                    <span>No Show / Skip</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-10 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2.5">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">Station is available</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Click &apos;SERVE NEXT&apos; on the left to summon the next party to {activeCounter}.
                </p>
              </div>
            )}

            <div className="text-xs text-slate-400">
              Station operating at {currentRestaurant.name}
            </div>
          </div>
        </div>

      </div>

      {/* 4. ACTIVE QUEUE LIST: Uncongested & Filled with Diners */}
      <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Queue Line</h2>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {waitingTokensOnly.length} Waiting
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time waiting tokens. Hit &apos;Call Now&apos; or &apos;No Show / Skip&apos; on any guest.
            </p>
          </div>

          <div className="text-xs text-slate-500">
            Average Pace: <strong className="text-slate-900">~{metrics.averageWaitTimeMinutes}m / party</strong>
          </div>
        </div>

        {waitingTokensOnly.length === 0 ? (
          <div className="p-14 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200">
            <Users className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Queue is clear</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No customers are currently in line. You can enqueue a walk-in guest or refill sample diners to simulate traffic.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsWalkInOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
              >
                + Add Walk-in
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onResetQueue(currentRestaurant.id);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors border border-slate-200 cursor-pointer"
              >
                Refill Sample Diners
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {waitingTokensOnly.map((tok, idx) => {
              const waitMins = Math.max(1, Math.floor((Date.now() - tok.createdAt) / 60000));
              const isNext = idx === 0;

              return (
                <div
                  key={tok.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5 ${
                    isNext
                      ? 'bg-blue-50/60 border-blue-300 shadow-sm ring-1 ring-blue-400/20'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {/* Left: Position, Token #, Customer info */}
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs font-mono shrink-0 ${
                      isNext ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700'
                    }`}>
                      #{idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-2xl font-black text-slate-900">
                          {tok.tokenNumber}
                        </span>
                        {isNext && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                            Up Next
                          </span>
                        )}
                        {tok.isCurrentClientToken && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                            Your Ticket
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="text-slate-900 font-bold">{tok.customerName}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span>Party of {tok.partySize}</span>
                        {tok.notes && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="text-blue-700 italic">{tok.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Wait duration */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Waiting {waitMins}m</span>
                  </div>

                  {/* Right Actions: Call Directly & NO SHOW / SKIP BUTTON */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onServeNext(currentRestaurant.id, activeCounter);
                      }}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isNext
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{isNext ? `Call to ${activeCounter}` : 'Call Now'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSkip(tok.id)}
                      title={`Skip token ${tok.tokenNumber} as no show`}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>No Show / Skip</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Walk-in Modal */}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        restaurant={currentRestaurant}
        onAddWalkIn={onAddWalkIn}
      />
    </div>
  );
};
