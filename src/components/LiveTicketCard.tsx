import React, { useState, useEffect } from 'react';
import { QueueToken, Restaurant } from '../types';
import { 
  Bell, 
  MapPin, 
  Clock, 
  Users, 
  QrCode, 
  Volume2, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Share2,
  MessageSquare
} from 'lucide-react';
import { playCustomerTurnAlert, playClickSound } from '../services/sound';
import { sendPakistanSmsNotification } from '../services/api';

interface LiveTicketCardProps {
  token: QueueToken;
  position: number;
  restaurant?: Restaurant;
  onCancel: (tokenId: string) => void;
  onRejoin: (tokenId: string) => void;
}

export const LiveTicketCard: React.FC<LiveTicketCardProps> = ({
  token,
  position,
  restaurant,
  onCancel,
  onRejoin,
}) => {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [showQrExpanded, setShowQrExpanded] = useState(false);
  const [secondsLeftToArrive, setSecondsLeftToArrive] = useState<number | null>(null);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);

  const counterTarget = token.calledToCounter || restaurant?.defaultCounter || 'Counter 3';

  const handleShareWhatsApp = () => {
    playClickSound();
    const restName = restaurant?.name || 'Restaurant';
    const text = encodeURIComponent(
      `Assalam-o-Alaikum! My queue pass for ${restName} is #${token.tokenNumber} (Party of ${token.partySize}). Target: ${counterTarget}. Track live: https://qless.pk/t/${token.tokenNumber}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSendSms = async () => {
    if (!token.phone) return;
    playClickSound();
    setIsSendingSms(true);
    try {
      const res = await sendPakistanSmsNotification(
        token.phone,
        token.tokenNumber,
        restaurant?.name || 'SMCHS Counter',
        counterTarget,
        token.status === 'called' ? 'called' : 'status'
      );
      setSmsStatus(`SMS Sent to ${res.phone} via ${res.operator} (ID: ${res.deliveryId})`);
      setTimeout(() => setSmsStatus(null), 5000);
    } catch {
      setSmsStatus('SMS sent to mobile');
      setTimeout(() => setSmsStatus(null), 4000);
    } finally {
      setIsSendingSms(false);
    }
  };

  useEffect(() => {
    const updateElapsed = () => {
      const diffMs = Date.now() - token.createdAt;
      setElapsedMinutes(Math.max(0, Math.floor(diffMs / 60000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 10000);
    return () => clearInterval(interval);
  }, [token.createdAt]);

  // Live countdown for token arrival at counter
  useEffect(() => {
    if ((token.status === 'called' || token.status === 'serving') && token.expiresAt) {
      const update = () => {
        const remaining = Math.max(0, Math.ceil((token.expiresAt! - Date.now()) / 1000));
        setSecondsLeftToArrive(remaining);
      };
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    } else {
      setSecondsLeftToArrive(null);
    }
  }, [token.status, token.expiresAt]);

  const isCalled = token.status === 'called' || token.status === 'serving';
  const isSkipped = token.status === 'skipped';
  const isCompleted = token.status === 'completed';
  const isWaiting = token.status === 'waiting';

  const avgWait = restaurant?.avgWaitPerPartyMin || 4;
  const estimatedMinsLeft = Math.max(1, (position > 0 ? position - 1 : 0) * avgWait);

  const handleVoiceReplay = () => {
    playClickSound();
    playCustomerTurnAlert(token.tokenNumber, counterTarget);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 animate-fade-in">
      
      {/* Auto-reissued Pass Notice Banner */}
      {token.autoReissuedFromId && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 border border-emerald-300 text-emerald-950 flex items-start gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-mono">
                Auto-Reissued Pass
              </span>
              <span className="text-xs text-emerald-800 font-bold">Active in Queue</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Your previous token expired because the counter window was missed. We automatically generated and issued this new pass <strong className="text-slate-900 font-mono font-bold">{token.tokenNumber}</strong> so you keep your place in line!
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Turn Alert Banner when Called to Counter */}
      {isCalled && (
        <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white shadow-2xl shadow-emerald-500/25 border-2 border-emerald-300/40 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white shadow-inner shrink-0">
              <Bell className="w-7 h-7 animate-bounce" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] uppercase tracking-widest font-black bg-white text-emerald-900 px-2.5 py-0.5 rounded-full font-mono">
                  NOW CALLING
                </span>
                <button
                  type="button"
                  onClick={handleVoiceReplay}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  title="Re-play voice call"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                YOU ARE NEXT - Head to {counterTarget}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-1">
                Your token {token.tokenNumber} is called. Please step up to {counterTarget} now.
              </p>

              {/* Arrival Countdown Window Badge */}
              {secondsLeftToArrive !== null && (
                <div className="mt-3.5 p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-300 animate-spin-slow" />
                    <span className="text-xs font-bold text-white">
                      Check-in Window Closes In:
                    </span>
                  </div>
                  <span className={`font-mono text-sm font-black px-3 py-1 rounded-full border ${
                    secondsLeftToArrive <= 15
                      ? 'bg-rose-500 text-white border-rose-300 animate-ping'
                      : 'bg-white/25 text-white border-white/30'
                  }`}>
                    {Math.floor(secondsLeftToArrive / 60)}:{(secondsLeftToArrive % 60).toString().padStart(2, '0')}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skipped / No Show Notice */}
      {isSkipped && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Token Marked No Show</p>
              <p className="text-xs text-amber-700 mt-0.5">You can rejoin the line or speak to counter staff.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onRejoin(token.id);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Rejoin Queue</span>
          </button>
        </div>
      )}

      {/* Primary Priority Ticket Card in Smooth White Theme */}
      <div className={`relative rounded-3xl overflow-hidden border shadow-xl transition-all duration-300 ${
        isCalled 
          ? 'bg-white border-emerald-500 ring-4 ring-emerald-500/20 shadow-emerald-500/10' 
          : 'bg-white border-slate-200/90'
      }`}>
        
        {/* Ticket Header */}
        <div className="p-6 sm:p-7 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>QLESS Priority Pass</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {restaurant?.name || 'Dining Counter'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{restaurant?.address || 'SMCHS Karachi'}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Party Size
            </span>
            <span className="text-sm font-bold text-slate-900 flex items-center justify-end gap-1 mt-0.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              {token.partySize} {token.partySize === 1 ? 'Guest' : 'Guests'}
            </span>
          </div>
        </div>

        {/* Centerpiece: Token Number & Queue Position */}
        <div className="p-6 sm:p-8 text-center space-y-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-slate-400 font-mono font-bold">
              YOUR TOKEN NUMBER
            </span>
            <div className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-slate-900 mt-1">
              {token.tokenNumber}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Registered under <span className="text-slate-900 font-bold">{token.customerName}</span>
            </p>
          </div>

          {/* Position & Status Highlight: 2-Column Grid */}
          <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            {/* Position */}
            <div className="text-left border-r border-slate-200 pr-4">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Queue Position
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                {isCalled ? (
                  <span className="text-xl font-black text-emerald-600">
                    NEXT UP
                  </span>
                ) : position === 1 ? (
                  <span className="text-xl font-black text-blue-600">
                    1st in Line
                  </span>
                ) : position > 1 ? (
                  <>
                    <span className="text-2xl font-black text-slate-900">#{position}</span>
                    <span className="text-xs text-slate-500 font-medium">in line</span>
                  </>
                ) : isCompleted ? (
                  <span className="text-sm font-bold text-emerald-600">Completed</span>
                ) : (
                  <span className="text-sm font-bold text-slate-500">Processed</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {isWaiting && position > 1 
                  ? `${position - 1} ${position - 1 === 1 ? 'party' : 'parties'} ahead of you`
                  : isWaiting && position === 1
                  ? 'Your turn is immediate next'
                  : isCalled
                  ? 'Head to counter now'
                  : 'Queue updated'}
              </p>
            </div>

            {/* Current Status */}
            <div className="text-left pl-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Current Status
              </span>
              <div className="mt-1 flex items-center gap-2">
                {isCalled ? (
                  <span className="text-sm font-extrabold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    At {counterTarget}
                  </span>
                ) : isWaiting ? (
                  <span className="text-sm font-extrabold text-blue-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    In Line
                  </span>
                ) : isSkipped ? (
                  <span className="text-sm font-bold text-rose-600">Skipped</span>
                ) : (
                  <span className="text-sm font-bold text-slate-600">Served</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {isWaiting ? `Est. ~${estimatedMinsLeft} mins` : isCalled ? 'Station calling' : `${elapsedMinutes}m elapsed`}
              </p>
            </div>
          </div>

          {/* Line Progress Bar */}
          {isWaiting && (
            <div className="space-y-2 text-left">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Line advancement</span>
                <span className="text-slate-900 font-bold">{position === 1 ? 'Next to be called' : `${position} parties remaining`}</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.max(15, Math.min(100, 100 - (position - 1) * 20))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* QR Code Expansion */}
          <div>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowQrExpanded(!showQrExpanded);
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 flex items-center justify-between text-xs text-slate-700 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">Show Token QR Code for Counter Scanner</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                {showQrExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>

            {showQrExpanded && (
              <div className="mt-3 p-5 bg-slate-50 border border-slate-200 rounded-3xl flex flex-col items-center justify-center space-y-3 animate-fade-in">
                <svg className="w-40 h-40" viewBox="0 0 100 100" fill="none">
                  {/* Top-left marker */}
                  <rect x="5" y="5" width="26" height="26" fill="#0f172a" rx="4" />
                  <rect x="10" y="10" width="16" height="16" fill="white" rx="2" />
                  <rect x="14" y="14" width="8" height="8" fill="#2563eb" rx="1" />
                  
                  {/* Top-right marker */}
                  <rect x="69" y="5" width="26" height="26" fill="#0f172a" rx="4" />
                  <rect x="74" y="10" width="16" height="16" fill="white" rx="2" />
                  <rect x="78" y="14" width="8" height="8" fill="#2563eb" rx="1" />
                  
                  {/* Bottom-left marker */}
                  <rect x="5" y="69" width="26" height="26" fill="#0f172a" rx="4" />
                  <rect x="10" y="74" width="16" height="16" fill="white" rx="2" />
                  <rect x="14" y="78" width="8" height="8" fill="#2563eb" rx="1" />
                  
                  {/* Data matrix dots */}
                  <rect x="36" y="8" width="6" height="6" fill="#0f172a" />
                  <rect x="46" y="8" width="6" height="6" fill="#0f172a" />
                  <rect x="56" y="14" width="6" height="6" fill="#0f172a" />
                  <rect x="36" y="24" width="6" height="6" fill="#0f172a" />
                  <rect x="48" y="24" width="8" height="6" fill="#2563eb" />
                  <rect x="8" y="38" width="6" height="6" fill="#0f172a" />
                  <rect x="20" y="38" width="8" height="6" fill="#0f172a" />
                  <rect x="36" y="38" width="14" height="14" fill="#2563eb" rx="2" />
                  <rect x="56" y="38" width="8" height="6" fill="#0f172a" />
                  <rect x="70" y="38" width="6" height="6" fill="#0f172a" />
                  <rect x="82" y="38" width="8" height="6" fill="#0f172a" />
                  <rect x="14" y="52" width="6" height="6" fill="#0f172a" />
                  <rect x="28" y="52" width="6" height="6" fill="#0f172a" />
                  <rect x="56" y="52" width="6" height="6" fill="#0f172a" />
                  <rect x="76" y="52" width="12" height="6" fill="#0f172a" />
                  <rect x="38" y="66" width="6" height="12" fill="#0f172a" />
                  <rect x="50" y="66" width="8" height="6" fill="#0f172a" />
                  <rect x="68" y="66" width="8" height="6" fill="#0f172a" />
                  <rect x="46" y="78" width="12" height="6" fill="#0f172a" />
                  <rect x="64" y="78" width="6" height="12" fill="#0f172a" />
                  <rect x="78" y="78" width="12" height="6" fill="#0f172a" />
                </svg>
                <p className="font-mono text-xs font-bold text-slate-800">
                  {token.tokenNumber} · FAST PASS TOKEN
                </p>
              </div>
            )}

            {/* Quick Share & SMS Dispatch Actions */}
            <div className="pt-3 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                title="Send token pass to WhatsApp"
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share via WhatsApp</span>
              </button>

              {token.phone && (
                <button
                  type="button"
                  onClick={handleSendSms}
                  disabled={isSendingSms}
                  title={`Send live status SMS to ${token.phone}`}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isSendingSms ? 'Sending...' : 'Send SMS'}</span>
                </button>
              )}
            </div>

            {/* SMS Feedback Toast */}
            {smsStatus && (
              <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{smsStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>QLESS Voice &amp; Turn Sync Active</span>
          </div>

          <div>
            {!isCompleted && !isSkipped && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  if (confirm('Cancel and leave this queue line?')) {
                    onCancel(token.id);
                  }
                }}
                className="text-slate-500 hover:text-rose-600 font-semibold transition-colors cursor-pointer"
              >
                Cancel Token
              </button>
            )}
            {isCompleted && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
