import React, { useState } from 'react';
import { Restaurant, QueueToken } from '../types';
import { 
  X, 
  MapPin, 
  Ticket, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Zap,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatDistance } from '../hooks/useGeolocation';
import { playClickSound } from '../services/sound';
import { 
  formatPakistanPhone, 
  validatePakistanPhone, 
  PK_PHONE_GUIDANCE 
} from '../utils/pakistanPhone';

interface RestaurantDetailsModalProps {
  restaurant: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
  distanceKm: number;
  waitingCount: number;
  estimatedWaitMinutes: number;
  currentlyServing?: QueueToken;
  userToken?: QueueToken | null;
  onClaimToken: (restaurantId: string, partySize: number, name?: string, phone?: string) => void;
}

export const RestaurantDetailsModal: React.FC<RestaurantDetailsModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  distanceKm,
  waitingCount,
  estimatedWaitMinutes,
  currentlyServing,
  userToken,
  onClaimToken,
}) => {
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('0300-1234567');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !restaurant) return null;

  const distanceMeters = Math.round(distanceKm * 1000);
  const isInside200m = distanceMeters <= 200;

  const phoneValidation = validatePakistanPhone(phone);

  const hasActiveTokenForThisRest = userToken && 
    userToken.restaurantId === restaurant.id && 
    (userToken.status === 'waiting' || userToken.status === 'called' || userToken.status === 'serving');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPakistanPhone(e.target.value);
    setPhone(formatted);
    if (!phoneTouched) setPhoneTouched(true);
  };

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneTouched(true);
    
    if (!phoneValidation.isValid) {
      return;
    }

    playClickSound();
    setIsSubmitting(true);
    setTimeout(() => {
      onClaimToken(restaurant.id, partySize, customerName, phoneValidation.formatted);
      setIsSubmitting(false);
      onClose();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-2xl my-8 space-y-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-restaurant-name"
      >
        {/* Cover Header with Rich Brand Overlay */}
        <div className="relative h-60 sm:h-64 w-full bg-slate-100 overflow-hidden">
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/20" />

          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-colors cursor-pointer z-10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badges on Hero */}
          <div className="absolute bottom-5 left-6 right-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-slate-900 text-xs font-black shadow-md">
                {restaurant.category}
              </span>
              {isInside200m && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-lg border border-emerald-400/40">
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>⚡ 2-min Walk — Grab &amp; Go</span>
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-amber-300 text-xs font-bold border border-amber-400/20">
                ⭐ {restaurant.rating} ({restaurant.reviewCount.toLocaleString()} reviews)
              </span>
            </div>

            <h2 id="modal-restaurant-name" className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              {restaurant.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-200 font-medium mt-1">
              <span>{restaurant.cuisine}</span>
              <span aria-hidden="true" className="text-white/60">·</span>
              <span>{formatDistance(distanceKm)} from SMCHS Karachi Center</span>
            </div>
          </div>
        </div>

        {/* Details & Line Metrics Section */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{restaurant.address}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{restaurant.hours}</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              {restaurant.tagline}
            </p>
          </div>

          {/* 4-Box Trendy Key Metrics Grid: Line, Wait, Prep Time & Price */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200">
            {/* 1. Line Length */}
            <div className="space-y-1 p-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold block">
                Line Length
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{waitingCount}</span>
                <span className="text-xs text-slate-500 font-medium">in queue</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Live active passes</p>
            </div>

            {/* 2. Est. Line Wait */}
            <div className="space-y-1 p-2 sm:border-l sm:border-slate-200 sm:pl-3">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold block">
                Est. Line Wait
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-600">
                  {waitingCount === 0 ? '0' : `~${estimatedWaitMinutes}`}
                </span>
                <span className="text-xs text-slate-500 font-medium">mins</span>
              </div>
              <p className="text-[10px] text-slate-400">~{restaurant.avgWaitPerPartyMin}m / party</p>
            </div>

            {/* 3. Order Prep Time */}
            <div className="space-y-1 p-2 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-3">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>Prep Time</span>
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-600">
                  ~{restaurant.avgPreparationTimeMin}
                </span>
                <span className="text-xs text-slate-500 font-medium">mins</span>
              </div>
              <p className="text-[10px] text-slate-400">Kitchen speed</p>
            </div>

            {/* 4. Price Tier */}
            <div className="space-y-1 p-2 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-3">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold flex items-center gap-1">
                <Coins className="w-3 h-3 text-emerald-600" />
                <span>Pricing</span>
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-emerald-700">
                  {restaurant.priceRange}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate" title={restaurant.priceDescription}>
                {restaurant.priceDescription}
              </p>
            </div>
          </div>

          {/* Currently serving at counter badge */}
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Currently Calling Station:</span>
            <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {currentlyServing ? `${currentlyServing.tokenNumber} at ${currentlyServing.calledToCounter || restaurant.defaultCounter}` : `${restaurant.defaultCounter} ready`}
            </span>
          </div>

          {/* If already has a ticket */}
          {hasActiveTokenForThisRest ? (
            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 space-y-4">
              <div className="flex items-center gap-2.5 text-blue-900 font-extrabold text-sm">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>You already hold an active pass for {restaurant.name}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Token <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{userToken?.tokenNumber}</span> is registered. Real-time voice alerts will notify you when called to the counter.
              </p>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition-colors shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Live Pass Card</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Get Token Form with Strict Pakistan Mobile Standard */
            <form onSubmit={handleClaim} className="space-y-5">
              
              {/* Party Size Selector */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                  Select Party Size
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setPartySize(num);
                      }}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                        partySize === num
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/25 scale-[1.02]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {num}{num === 6 ? '+' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Mobile Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Customer Name */}
                <div className="space-y-1.5">
                  <label htmlFor="customer-name-input" className="text-xs font-bold text-slate-700">
                    Your Name
                  </label>
                  <input
                    id="customer-name-input"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Hamza Farooqi"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:outline-none text-sm text-slate-900 placeholder-slate-400 transition-colors"
                  />
                </div>

                {/* Pakistan Mobile Number with Operator Detection & Live Validation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="customer-phone-input" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Mobile Number</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        PK Standard 🇵🇰
                      </span>
                    </label>
                    {phoneValidation.operator && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${phoneValidation.operatorColor}`}>
                        {phoneValidation.operator}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      id="customer-phone-input"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      onBlur={() => setPhoneTouched(true)}
                      placeholder="0300-1234567"
                      maxLength={12}
                      className={`w-full px-4 py-3 rounded-xl bg-slate-50 border font-mono text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-colors ${
                        phoneTouched && !phoneValidation.isValid
                          ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20 ring-1 ring-rose-300'
                          : phoneValidation.isValid
                          ? 'border-emerald-400 focus:border-emerald-500 bg-emerald-50/10'
                          : 'border-slate-200 focus:border-blue-600'
                      }`}
                    />
                    {phoneValidation.isValid && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3.5" />
                    )}
                  </div>
                </div>

              </div>

              {/* SPECIFICATION GUIDANCE TEXT FOR PAKISTAN MOBILE */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800">
                      Pakistan Mobile Number Requirement:
                    </span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {PK_PHONE_GUIDANCE}
                    </p>
                  </div>
                </div>

                {phoneTouched && !phoneValidation.isValid && phoneValidation.error && (
                  <p className="text-rose-600 font-bold text-xs pt-1 flex items-center gap-1.5 pl-6">
                    <span>⚠️ {phoneValidation.error}</span>
                  </p>
                )}
              </div>

              {/* Prominent GET TOKEN Button */}
              <button
                type="submit"
                disabled={isSubmitting || (phoneTouched && !phoneValidation.isValid)}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base tracking-wide flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/30 cursor-pointer active:scale-[0.99]"
              >
                <Ticket className="w-5 h-5 stroke-[2.5]" />
                <span>{isSubmitting ? 'GENERATING PASS...' : 'GET TOKEN NOW'}</span>
              </button>
            </form>
          )}

          <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Digital token issues immediately · Auto-expires if counter arrival is missed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
