import React, { useEffect } from 'react';
import { QueueToken, Restaurant } from '../types';
import { CheckCircle2, Heart, Sparkles, X, Star } from 'lucide-react';
import { playClickSound } from '../services/sound';

interface OrderCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: QueueToken | null;
  restaurant?: Restaurant;
}

export const OrderCompleteModal: React.FC<OrderCompleteModalProps> = ({
  isOpen,
  onClose,
  token,
  restaurant,
}) => {
  // Auto close after 7 seconds
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen || !token) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-7 sm:p-8 shadow-2xl text-center space-y-6 relative overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle celebratory background decoration */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-100 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-blue-100 rounded-full blur-2xl pointer-events-none" />

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebratory Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
          <Heart className="w-8 h-8 fill-white animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600">
            <Sparkles className="w-4 h-4" />
            <span>Order Completed</span>
          </div>

          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Thanks!
          </h2>

          <p className="text-sm text-slate-600 max-w-xs mx-auto">
            Thank you for dining with us at <strong className="text-slate-900">{restaurant?.name || 'our counter'}</strong>!
          </p>
        </div>

        {/* Token Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Completed Token
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Served
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-slate-900">
              {token.tokenNumber}
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {token.customerName}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center justify-between">
            <span>Counter: {token.calledToCounter || 'Counter 3'}</span>
            <span>Party of {token.partySize}</span>
          </p>
        </div>

        {/* Star Rating Delight */}
        <div className="flex items-center justify-center gap-1 text-amber-400">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="w-5 h-5 fill-amber-400" />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition-all shadow-lg shadow-blue-600/25 cursor-pointer"
        >
          Great, Thank You!
        </button>
      </div>
    </div>
  );
};
