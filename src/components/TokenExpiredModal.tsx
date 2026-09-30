import React, { useEffect } from 'react';
import { ExpiredNotification } from '../types';
import { AlertTriangle, Clock, RefreshCw, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { playClickSound } from '../services/sound';

interface TokenExpiredModalProps {
  notification: ExpiredNotification | null;
  onClose: () => void;
}

export const TokenExpiredModal: React.FC<TokenExpiredModalProps> = ({
  notification,
  onClose,
}) => {
  // Auto-dismiss after 15 seconds if unhandled
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 15000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg bg-white border border-rose-200 rounded-3xl p-7 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expired-modal-title"
      >
        {/* Glow ambient background accents */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-rose-100 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-100 rounded-full blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 p-2.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Notice Header with Alert Icon */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="w-7 h-7 text-rose-600 animate-bounce" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase tracking-wider font-mono">
                Timeout Alert
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {notification.counterName}
              </span>
            </div>
            <h2 id="expired-modal-title" className="text-2xl font-black text-slate-900 tracking-tight">
              Token Auto-Expired &amp; Reissued
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {notification.restaurantName}
            </p>
          </div>
        </div>

        {/* Comparison: Expired Token vs New Auto-Reissued Token */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Old Expired Token */}
          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-rose-700">
              <span>Expired Pass</span>
              <span className="text-rose-600 font-mono">Missed</span>
            </div>
            <div className="font-mono text-2xl font-black text-slate-900 line-through decoration-rose-500 decoration-2">
              {notification.oldTokenNumber}
            </div>
            <p className="text-[11px] text-slate-600">
              Did not arrive at counter within {notification.timeoutSeconds}s window
            </p>
          </div>

          {/* New Reissued Token */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-1.5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-emerald-600" />
                <span>New Pass</span>
              </span>
              <span className="text-emerald-800 font-mono font-bold">ACTIVE</span>
            </div>
            <div className="font-mono text-2xl font-black text-emerald-700">
              {notification.newTokenNumber}
            </div>
            <p className="text-[11px] text-emerald-800 font-medium">
              Auto-generated so you keep your place in line!
            </p>
          </div>

        </div>

        {/* Explanation message */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Why did this happen?</span>
          </div>
          <p>
            To keep queues moving fast for everyone, token calls have a {notification.timeoutSeconds}-second arrival duration. Because you couldn&apos;t reach {notification.counterName} in time, the queue advanced to the next party.
          </p>
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Good news: You did not lose your spot! Your new pass {notification.newTokenNumber} is holding your place.</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition-all shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>View New Pass ({notification.newTokenNumber})</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
