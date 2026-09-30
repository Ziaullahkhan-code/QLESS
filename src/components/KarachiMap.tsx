import React, { useState, useMemo } from 'react';
import { Restaurant } from '../types';
import { GeoCoordinates, calculateDistanceKm } from '../hooks/useGeolocation';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Zap, 
  Compass,
  Maximize2
} from 'lucide-react';
import { playClickSound } from '../services/sound';

interface KarachiMapProps {
  centerCoords: GeoCoordinates;
  restaurants: Restaurant[];
  selectedRestaurantId?: string | null;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  waitingCountMap: Record<string, number>;
  estimatedWaitMap: Record<string, number>;
}

export const KarachiMap: React.FC<KarachiMapProps> = ({
  centerCoords,
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  waitingCountMap,
  estimatedWaitMap,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredRestaurantId, setHoveredRestaurantId] = useState<string | null>(null);
  const [showRadiusOnly, setShowRadiusOnly] = useState<boolean>(false);
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);

  const width = 800;
  const height = isMapExpanded ? 520 : 380;
  const centerX = width / 2;
  const centerY = height / 2;

  const pixelsPerMeter = 1.15 * zoomLevel;
  const radius200Pixels = 200 * pixelsPerMeter;

  const projectedSpots = useMemo(() => {
    return restaurants.map((r) => {
      const distKm = calculateDistanceKm(centerCoords.lat, centerCoords.lng, r.lat, r.lng);
      const distMeters = Math.round(distKm * 1000);
      const isInside200m = distMeters <= 200;

      const deltaLatMeters = (r.lat - centerCoords.lat) * 111000;
      const deltaLngMeters = (r.lng - centerCoords.lng) * 100700;

      const x = centerX + deltaLngMeters * pixelsPerMeter;
      const y = centerY - deltaLatMeters * pixelsPerMeter;

      return {
        ...r,
        distMeters,
        isInside200m,
        x,
        y,
      };
    });
  }, [restaurants, centerCoords, pixelsPerMeter, centerX, centerY]);

  return (
    <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-xl transition-all duration-300">
      
      {/* Top Map Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-blue-600 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">SMCHS / Bahadurabad Anchor Map</h2>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Karachi, PK (24.8716°N, 67.0598°E)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live spatial radar with 200m walk perimeter &amp; real spot queues
            </p>
          </div>
        </div>

        {/* Map Action Buttons */}
        <div className="flex items-center gap-2">
          {/* 200m Perimeter Filter Toggle */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowRadiusOnly(!showRadiusOnly);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              showRadiusOnly
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>200m Zone Only</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setZoomLevel((z) => Math.min(1.6, z + 0.15));
              }}
              aria-label="Zoom in"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setZoomLevel((z) => Math.max(0.7, z - 0.15));
              }}
              aria-label="Zoom out"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setZoomLevel(1);
              }}
              title="Reset Zoom"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Expand/Collapse Map Height */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsMapExpanded(!isMapExpanded);
            }}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
            title={isMapExpanded ? 'Collapse Map' : 'Expand Map'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Map Canvas: Clean Light Mode Graphics */}
      <div className="relative w-full overflow-hidden bg-[#f8fafc] select-none">
        
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          style={{ maxHeight: isMapExpanded ? '520px' : '380px' }}
        >
          <defs>
            {/* Radial glow for 200m zone in light mode */}
            <radialGradient id="radiusGradientLight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </radialGradient>

            {/* User anchor beacon gradient */}
            <radialGradient id="centerBeaconLight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </radialGradient>

            {/* Subtle grid pattern */}
            <pattern id="streetGridLight" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect width={width} height={height} fill="#f8fafc" />
          <rect width={width} height={height} fill="url(#streetGridLight)" />

          {/* Street Arteries for SMCHS / Bahadurabad */}
          <g stroke="#e2e8f0" strokeLinecap="round">
            {/* Shahrah-e-Qaideen diagonal artery */}
            <line x1="60" y1="40" x2="740" y2="480" stroke="#cbd5e1" strokeWidth="7" />
            <line x1="60" y1="40" x2="740" y2="480" stroke="#ffffff" strokeWidth="3" />
            
            {/* SMCHS Main Commercial Boulevard */}
            <line x1="80" y1="280" x2="720" y2="280" stroke="#cbd5e1" strokeWidth="6" />
            <line x1="80" y1="280" x2="720" y2="280" stroke="#ffffff" strokeWidth="2.5" />
            
            {/* Bahadurabad Connection road */}
            <line x1="400" y1="40" x2="400" y2="500" stroke="#cbd5e1" strokeWidth="6" />
            <line x1="400" y1="40" x2="400" y2="500" stroke="#ffffff" strokeWidth="2.5" />

            {/* Cross street lanes */}
            <line x1="200" y1="80" x2="200" y2="460" stroke="#e2e8f0" strokeWidth="3" />
            <line x1="600" y1="80" x2="600" y2="460" stroke="#e2e8f0" strokeWidth="3" />
            <line x1="120" y1="180" x2="680" y2="180" stroke="#e2e8f0" strokeWidth="3" />
            <line x1="120" y1="380" x2="680" y2="380" stroke="#e2e8f0" strokeWidth="3" />
          </g>

          {/* Street Name Labels */}
          <text x="410" y="70" fill="#64748b" fontSize="10" fontFamily="sans-serif" fontWeight="700">
            Bahadurabad Chowrangi →
          </text>
          <text x="610" y="270" fill="#64748b" fontSize="10" fontFamily="sans-serif" fontWeight="700">
            Commercial Area A
          </text>
          <text x="80" y="270" fill="#64748b" fontSize="10" fontFamily="sans-serif" fontWeight="700">
            ← Sindhi Muslim Housing Society
          </text>
          <text x="560" y="440" fill="#64748b" fontSize="10" fontFamily="sans-serif" fontWeight="700" transform="rotate(30, 560, 440)">
            Shahrah-e-Qaideen
          </text>

          {/* 100m Sub-Radius circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={100 * pixelsPerMeter}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          <text
            x={centerX + 100 * pixelsPerMeter + 4}
            y={centerY - 6}
            fill="#64748b"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            100m
          </text>

          {/* 200-METER VISUAL RADIUS CIRCLE */}
          <g>
            <circle
              cx={centerX}
              cy={centerY}
              r={radius200Pixels}
              fill="url(#radiusGradientLight)"
            />

            <circle
              cx={centerX}
              cy={centerY}
              r={radius200Pixels}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              opacity="0.9"
            />

            <g transform={`translate(${centerX}, ${centerY - radius200Pixels})`}>
              <rect x="-105" y="-22" width="210" height="22" rx="11" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
              <text x="0" y="-7" textAnchor="middle" fill="#065f46" fontSize="10.5" fontWeight="800" fontFamily="sans-serif">
                ⚡ 200m Walk Perimeter (Grab &amp; Go)
              </text>
            </g>
          </g>

          {/* 'You Are Here (Karachi Center)' MAP PIN */}
          <g transform={`translate(${centerX}, ${centerY})`} className="cursor-pointer">
            <circle r={28 * zoomLevel} fill="url(#centerBeaconLight)" className="animate-ping opacity-50" />
            <circle r={14} fill="#3b82f6" opacity="0.2" />
            
            <circle r="7.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
            <circle r="2.5" fill="#ffffff" />

            <g transform="translate(0, 18)">
              <rect
                x="-82"
                y="0"
                width="164"
                height="24"
                rx="12"
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth="2"
                filter="drop-shadow(0 4px 8px rgba(15,23,42,0.12))"
              />
              <circle cx="-66" cy="12" r="3.5" fill="#10b981" />
              <text
                x="0"
                y="15.5"
                textAnchor="middle"
                fill="#0f172a"
                fontSize="10"
                fontWeight="900"
                fontFamily="sans-serif"
              >
                You Are Here (Karachi Center)
              </text>
            </g>
          </g>

          {/* RESTAURANT PINS */}
          {projectedSpots.map((spot) => {
            const isHovered = hoveredRestaurantId === spot.id;
            const isSelected = selectedRestaurantId === spot.id;
            const waitTime = estimatedWaitMap[spot.id] || 0;
            const waitCount = waitingCountMap[spot.id] || 0;

            if (showRadiusOnly && !spot.isInside200m) {
              return null;
            }

            return (
              <g
                key={spot.id}
                transform={`translate(${spot.x}, ${spot.y})`}
                onClick={() => {
                  playClickSound();
                  onSelectRestaurant(spot);
                }}
                onMouseEnter={() => setHoveredRestaurantId(spot.id)}
                onMouseLeave={() => setHoveredRestaurantId(null)}
                className="cursor-pointer transition-all duration-200"
              >
                {(isSelected || isHovered) && (
                  <circle
                    r="22"
                    fill="none"
                    stroke={spot.isInside200m ? '#059669' : '#2563eb'}
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    className="animate-spin-slow"
                  />
                )}

                <circle
                  r={isSelected || isHovered ? 14 : 11}
                  fill={isSelected ? '#2563eb' : spot.isInside200m ? '#059669' : '#475569'}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  filter="drop-shadow(0 2px 5px rgba(15,23,42,0.2))"
                />

                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={isSelected || isHovered ? '11' : '9'}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {spot.isInside200m ? '⚡' : spot.name.charAt(0)}
                </text>

                {/* Spot Label */}
                <g transform="translate(0, -18)">
                  <rect
                    x="-65"
                    y="-15"
                    width="130"
                    height="20"
                    rx="10"
                    fill={isSelected ? '#2563eb' : isHovered ? '#0f172a' : '#ffffff'}
                    stroke={spot.isInside200m ? '#10b981' : '#cbd5e1'}
                    strokeWidth={isSelected || isHovered ? '2' : '1.2'}
                    filter="drop-shadow(0 2px 4px rgba(15,23,42,0.08))"
                  />
                  <text
                    x="0"
                    y="-2"
                    textAnchor="middle"
                    fill={isSelected || isHovered ? '#ffffff' : '#0f172a'}
                    fontSize="9.5"
                    fontWeight="800"
                    fontFamily="sans-serif"
                  >
                    {spot.name.length > 15 ? `${spot.name.slice(0, 14)}…` : spot.name} ({spot.distMeters}m)
                  </text>
                </g>

                {/* Hover Tooltip Card */}
                {isHovered && (
                  <g transform="translate(0, -62)" filter="drop-shadow(0 10px 20px rgba(15,23,42,0.25))">
                    <rect x="-95" y="-38" width="190" height="44" rx="12" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                    <text x="0" y="-18" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">
                      {spot.name} · {spot.category}
                    </text>
                    <text x="0" y="-4" textAnchor="middle" fill="#64748b" fontSize="9.5">
                      {spot.distMeters}m away · {waitCount} waiting · {waitCount === 0 ? 'No wait' : `~${waitTime}m`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 text-[11px] text-slate-700 pointer-events-auto shadow-md">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Karachi Center (SMCHS)</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-extrabold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>⚡ Within 200m (7 Spots)</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-slate-500">Click any pin to book token</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 text-[10px] text-slate-500 shadow-sm">
            <span>Grid scale: ~1m / pixel</span>
          </div>
        </div>

      </div>
    </div>
  );
};
