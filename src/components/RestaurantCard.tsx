import React from 'react';
import { Restaurant } from '../types';
import { MapPin, Users, Clock, Star, ArrowUpRight, Zap, Coins, Flame } from 'lucide-react';
import { formatDistance } from '../hooks/useGeolocation';
import { playClickSound } from '../services/sound';

interface RestaurantCardProps {
  restaurant: Restaurant;
  distanceKm: number;
  waitingCount: number;
  estimatedWaitMinutes: number;
  hasActiveUserToken: boolean;
  onSelect: (restaurant: Restaurant) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  distanceKm,
  waitingCount,
  estimatedWaitMinutes,
  hasActiveUserToken,
  onSelect,
}) => {
  const distanceMeters = Math.round(distanceKm * 1000);
  const isInside200m = distanceMeters <= 200;
  const isHighDemand = waitingCount >= 3;

  const handleClick = () => {
    playClickSound();
    onSelect(restaurant);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      className={`group relative bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1 ${
        isInside200m 
          ? 'border-emerald-300/80 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-400/20' 
          : 'border-slate-200/90 hover:border-blue-500 hover:ring-2 hover:ring-blue-400/20'
      }`}
    >
      <div>
        {/* Cover Photo with Vibrant Overlays */}
        <div className="relative h-52 w-full overflow-hidden bg-slate-100">
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-black/20" />
          
          {/* Overlaid Badges: Distance & Category */}
          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md font-bold shadow-md border border-white/10">
              <MapPin className={`w-3.5 h-3.5 ${isInside200m ? 'text-emerald-400' : 'text-blue-400'}`} />
              <span className="font-mono text-[11px]">{formatDistance(distanceKm)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-slate-200 border border-white/10">
                {restaurant.category}
              </span>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md font-extrabold text-[11px] shadow-md border border-white/10">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{restaurant.rating}</span>
              </div>
            </div>
          </div>

          {/* Bottom Photo Badges: Grab & Go or High Demand */}
          <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between">
            {isInside200m ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-lg backdrop-blur-md border border-emerald-400/40">
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>⚡ 2-min Walk — Grab &amp; Go</span>
              </div>
            ) : isHighDemand ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black shadow-lg backdrop-blur-md border border-rose-400/40">
                <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>🔥 High Demand Line</span>
              </div>
            ) : <div />}

            <div className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-slate-300 font-mono text-[11px] font-bold">
              {restaurant.defaultCounter}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1.5">
              <span className="text-blue-600 font-bold uppercase tracking-wider text-[11px]">{restaurant.cuisine}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{restaurant.hours}</span>
            </div>
            
            <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight line-clamp-1">
              {restaurant.name}
            </h3>
            
            <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
              {restaurant.tagline}
            </p>
          </div>

          {/* Quick Metrics Tags: Prep Time & Price Tier */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>~{restaurant.avgPreparationTimeMin}m Prep</span>
            </span>

            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <Coins className="w-3 h-3 text-emerald-600" />
              <span>{restaurant.priceRange}</span>
              <span className="text-slate-400 font-normal">({restaurant.priceDescription})</span>
            </span>
          </div>

          {/* Live Queue & Wait Time Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Queue</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {waitingCount === 0 ? 'Clear line' : `${waitingCount} waiting`}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-100 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Est. Wait</span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {waitingCount === 0 ? 'Immediate' : `~${estimatedWaitMinutes} mins`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-6 pb-6 pt-1 flex items-center justify-between text-xs font-extrabold text-blue-600 group-hover:text-blue-700 transition-colors">
        <span className="flex items-center gap-1">
          {hasActiveUserToken ? (
            <span className="text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              You Have Active Token
            </span>
          ) : (
            'Get Fast Pass Token'
          )}
        </span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-xs ${
          hasActiveUserToken
            ? 'bg-emerald-600 text-white'
            : isInside200m 
            ? 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white' 
            : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
        }`}>
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
