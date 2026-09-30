import React, { useState, useMemo } from 'react';
import { Restaurant, QueueToken, RestaurantCategory, SortFilterOption } from '../types';
import { GeoCoordinates, calculateDistanceKm } from '../hooks/useGeolocation';
import { RestaurantCard } from './RestaurantCard';
import { RestaurantDetailsModal } from './RestaurantDetailsModal';
import { LiveTicketCard } from './LiveTicketCard';
import { KarachiMap } from './KarachiMap';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Zap, 
  Clock, 
  Map as MapIcon,
  LayoutGrid,
  Filter,
  ArrowUpDown,
  Coins,
  Star,
  Flame,
  Sparkles
} from 'lucide-react';
import { playClickSound } from '../services/sound';

interface CustomerViewProps {
  restaurants: Restaurant[];
  coords: GeoCoordinates;
  gpsStatus: 'idle' | 'locating' | 'granted' | 'denied' | 'preset';
  errorMessage: string | null;
  userToken: QueueToken | null;
  userPosition: number;
  userRestaurant?: Restaurant;
  allTokens: QueueToken[];
  onOpenGpsModal: () => void;
  onClaimToken: (restaurantId: string, partySize: number, name?: string, phone?: string) => void;
  onCancelToken: (tokenId: string) => void;
  onRejoinQueue: (tokenId: string) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  restaurants,
  coords,
  userToken,
  userPosition,
  userRestaurant,
  allTokens,
  onOpenGpsModal,
  onClaimToken,
  onCancelToken,
  onRejoinQueue,
}) => {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // View mode requested by user: Grid View vs Map View
  const [displayView, setDisplayView] = useState<'grid' | 'map'>('grid');
  
  // Standard Filtering & Ordering System
  const [radiusFilter, setRadiusFilter] = useState<'200m' | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortFilterOption>('distanceAsc');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [queueFilter, setQueueFilter] = useState<'all' | 'short'>('all');

  // Compute live queue count and wait maps
  const { waitingCountMap, estimatedWaitMap } = useMemo(() => {
    const wMap: Record<string, number> = {};
    const eMap: Record<string, number> = {};

    restaurants.forEach((r) => {
      const waiting = allTokens.filter(
        (t) => t.restaurantId === r.id && t.status === 'waiting'
      );
      wMap[r.id] = waiting.length;
      eMap[r.id] = Math.max(0, waiting.length * r.avgWaitPerPartyMin);
    });

    return { waitingCountMap: wMap, estimatedWaitMap: eMap };
  }, [restaurants, allTokens]);

  // Compute distances and attach live metrics
  const restaurantsWithMetrics = useMemo(() => {
    return restaurants.map((r) => {
      const dist = calculateDistanceKm(coords.lat, coords.lng, r.lat, r.lng);
      const distMeters = Math.round(dist * 1000);
      const isInside200m = distMeters <= 200;
      const waitingCount = waitingCountMap[r.id] || 0;
      const estimatedWaitMinutes = estimatedWaitMap[r.id] || 0;

      // Price numerical weight for sorting (₨ = 1, ₨₨ = 2, ₨₨₨ = 3)
      const priceWeight = r.priceRange === '₨' ? 1 : r.priceRange === '₨₨' ? 2 : 3;

      return {
        ...r,
        distanceKm: dist,
        distanceMeters: distMeters,
        isInside200m,
        waitingCount,
        estimatedWaitMinutes,
        priceWeight,
      };
    });
  }, [restaurants, coords, waitingCountMap, estimatedWaitMap]);

  // Filter and sort based on standard filters
  const filteredRestaurants = useMemo(() => {
    return restaurantsWithMetrics
      .filter((r) => {
        if (radiusFilter === '200m' && !r.isInside200m) {
          return false;
        }

        if (selectedCategory !== 'All' && r.category !== selectedCategory) {
          return false;
        }

        if (queueFilter === 'short' && r.estimatedWaitMinutes >= 10) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            r.name.toLowerCase().includes(q) ||
            r.cuisine.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q) ||
            r.address.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'distanceAsc':
            return a.distanceMeters - b.distanceMeters;
          case 'distanceDesc':
            return b.distanceMeters - a.distanceMeters;
          case 'priceAsc':
            return a.priceWeight - b.priceWeight || a.distanceMeters - b.distanceMeters;
          case 'priceDesc':
            return b.priceWeight - a.priceWeight || a.distanceMeters - b.distanceMeters;
          case 'prepTimeAsc':
            return a.avgPreparationTimeMin - b.avgPreparationTimeMin;
          case 'waitAsc':
            return a.estimatedWaitMinutes - b.estimatedWaitMinutes;
          case 'ratingDesc':
            return b.rating - a.rating;
          default:
            return a.distanceMeters - b.distanceMeters;
        }
      });
  }, [restaurantsWithMetrics, radiusFilter, selectedCategory, queueFilter, searchQuery, sortOption]);

  const categories: Array<'All' | RestaurantCategory> = [
    'All',
    'Fast Food',
    'Cafes',
    'Popular Restaurants',
  ];

  const inside200mCount = restaurantsWithMetrics.filter((r) => r.isInside200m).length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      
      {/* 1. CLAIMED LIVE TICKET CARD */}
      {userToken && (
        <section aria-labelledby="live-ticket-heading" className="pt-2">
          <h2 id="live-ticket-heading" className="sr-only">Your Live Ticket</h2>
          <LiveTicketCard
            token={userToken}
            position={userPosition}
            restaurant={userRestaurant}
            onCancel={onCancelToken}
            onRejoin={onRejoinQueue}
          />
        </section>
      )}

      {/* 2. TRENDY HERO & KARACHI ANCHOR BAR */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/40 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        
        {/* Soft background decor */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-100/40 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                SMCHS &amp; Bahadurabad Karachi 🇵🇰
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                24.8716°N, 67.0598°E
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Karachi Street Bites &amp; Live Line Passes</span>
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-400 hidden sm:inline" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-normal">
              10 Famous Karachi spots · Real spatial distance from Sindhi Muslim center · Auto-advancing queues
            </p>
          </div>
        </div>

        {/* View Switcher: GRID VIEW vs MAP VIEW Toggle */}
        <div className="flex items-center gap-3 shrink-0 relative">
          <div className="flex items-center p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setDisplayView('grid');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                displayView === 'grid'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Grid View</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setDisplayView('map');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                displayView === 'map'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Map View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenGpsModal();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Anchor coordinates & accuracy"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Anchor Info</span>
          </button>
        </div>
      </div>

      {/* 3. MAP VIEW (When active, displayed prominently with interactive pins) */}
      {displayView === 'map' && (
        <section aria-label="Interactive SMCHS Karachi Radar Map" className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <MapIcon className="w-4 h-4 text-blue-600" />
              <span>Interactive Radar Map View (SMCHS Karachi)</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Click any pin to inspect wait times and claim your pass
            </span>
          </div>

          <KarachiMap
            centerCoords={coords}
            restaurants={restaurants}
            selectedRestaurantId={selectedRestaurant?.id}
            onSelectRestaurant={(r) => {
              playClickSound();
              setSelectedRestaurant(r);
            }}
            waitingCountMap={waitingCountMap}
            estimatedWaitMap={estimatedWaitMap}
          />
        </section>
      )}

      {/* 4. COMPREHENSIVE FILTERING & STANDARD ORDERING SYSTEM */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-5">
        
        {/* Top Filter Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs uppercase font-black tracking-wider text-slate-800">
              Filter &amp; Sort Restaurants
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Showing <strong className="text-slate-900 font-bold">{filteredRestaurants.length}</strong> of {restaurants.length} spots</span>
          </div>
        </div>

        {/* Row 1: Search, 200m Radius Walk Toggle, and Standard Sort Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Search by spot name, cuisine, address */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Burger Lab, Okra, Jan's Broast, FLOC..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:bg-white focus:outline-none text-xs text-slate-900 placeholder-slate-400 shadow-2xs font-medium"
            />
          </div>

          {/* RADIUS TOGGLE: 'Within 200m Walk' vs 'All Karachi Spots' */}
          <div className="md:col-span-4 flex items-center p-1 bg-slate-100 border border-slate-200 rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setRadiusFilter('all');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                radiusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Spots (10)
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setRadiusFilter('200m');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                radiusFilter === '200m'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Within 200m ({inside200mCount})</span>
            </button>
          </div>

          {/* STANDARD ORDERING / SORT FILTER (Distance, Price, Prep Time, Wait Time, Rating) */}
          <div className="md:col-span-3 space-y-1">
            <div className="relative">
              <div className="absolute left-3 top-3 pointer-events-none text-blue-600">
                <ArrowUpDown className="w-4 h-4" />
              </div>
              <select
                value={sortOption}
                onChange={(e) => {
                  playClickSound();
                  setSortOption(e.target.value as SortFilterOption);
                }}
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none cursor-pointer appearance-none shadow-2xs"
              >
                <option value="distanceAsc">📍 Distance: Nearest First</option>
                <option value="distanceDesc">📍 Distance: Furthest First</option>
                <option value="priceAsc">💰 Price: ₨ Low to High</option>
                <option value="priceDesc">💎 Price: ₨₨₨ High to Low</option>
                <option value="prepTimeAsc">⏱️ Prep Time: Fastest Kitchen (~4-8m)</option>
                <option value="waitAsc">⏳ Queue: Shortest Line Wait</option>
                <option value="ratingDesc">⭐ Rating: Highest Rated (4.9★)</option>
              </select>
            </div>
          </div>

        </div>

        {/* Row 2: Category Filter Tabs & Short Queue Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  playClickSound();
                  setSelectedCategory(cat);
                }}
                className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {cat === 'All' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          {/* Quick Filter Buttons: Prep Time, Budget, & Short Queue */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Quick Sort: Fastest Prep Kitchen */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setSortOption(sortOption === 'prepTimeAsc' ? 'distanceAsc' : 'prepTimeAsc');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                sortOption === 'prepTimeAsc'
                  ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Fast Prep (&lt;10m)</span>
            </button>

            {/* Quick Sort: Budget Friendly ₨ */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setSortOption(sortOption === 'priceAsc' ? 'distanceAsc' : 'priceAsc');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                sortOption === 'priceAsc'
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>₨ Budget First</span>
            </button>

            {/* Live Queue Status Filter */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setQueueFilter(queueFilter === 'short' ? 'all' : 'short');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                queueFilter === 'short'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Short Line (&lt;10m)</span>
            </button>

          </div>

        </div>
      </div>

      {/* 5. RESTAURANTS DIRECTORY GRID (Showcased in Grid View & as List in Map View) */}
      <div>
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {displayView === 'map' ? 'Karachi Spot Passes' : 'Explore Places & Line Lengths'}
            </h2>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-mono">
              {filteredRestaurants.length} Available
            </span>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            Sorted by: <strong className="text-slate-900">
              {sortOption === 'distanceAsc' ? 'Nearest First' : 
               sortOption === 'distanceDesc' ? 'Furthest First' :
               sortOption === 'priceAsc' ? 'Lowest Price' :
               sortOption === 'priceDesc' ? 'Highest Price' :
               sortOption === 'prepTimeAsc' ? 'Quickest Prep' :
               sortOption === 'waitAsc' ? 'Shortest Wait' : 'Highest Rating'}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredRestaurants.map((restaurant) => {
            const isUserHoldingTokenForThis = userToken?.restaurantId === restaurant.id && 
              (userToken.status === 'waiting' || userToken.status === 'called' || userToken.status === 'serving');

            return (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                distanceKm={restaurant.distanceKm}
                waitingCount={restaurant.waitingCount}
                estimatedWaitMinutes={restaurant.estimatedWaitMinutes}
                hasActiveUserToken={Boolean(isUserHoldingTokenForThis)}
                onSelect={(r) => {
                  playClickSound();
                  setSelectedRestaurant(r);
                }}
              />
            );
          })}
        </div>
      </div>

      {filteredRestaurants.length === 0 && (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <p className="text-lg font-bold text-slate-900">No spots match your active filter</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try switching from &apos;Within 200m Walk&apos; to &apos;All Karachi Spots&apos; or reset your search and queue filters.
          </p>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setRadiusFilter('all');
              setSelectedCategory('All');
              setQueueFilter('all');
              setSortOption('distanceAsc');
              setSearchQuery('');
            }}
            className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* 6. RESTAURANT DETAILS & LIVE TOKEN BOOKING MODAL */}
      {selectedRestaurant && (
        <RestaurantDetailsModal
          restaurant={selectedRestaurant}
          isOpen={Boolean(selectedRestaurant)}
          onClose={() => setSelectedRestaurant(null)}
          distanceKm={
            restaurantsWithMetrics.find((r) => r.id === selectedRestaurant.id)?.distanceKm || 0.1
          }
          waitingCount={
            restaurantsWithMetrics.find((r) => r.id === selectedRestaurant.id)?.waitingCount || 0
          }
          estimatedWaitMinutes={
            restaurantsWithMetrics.find((r) => r.id === selectedRestaurant.id)?.estimatedWaitMinutes || 0
          }
          currentlyServing={allTokens.find(
            (t) => t.restaurantId === selectedRestaurant.id && (t.status === 'called' || t.status === 'serving')
          )}
          userToken={userToken}
          onClaimToken={onClaimToken}
        />
      )}

    </div>
  );
};
