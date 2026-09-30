import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
  variant = 'light',
}) => {
  const iconDimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }[size];

  const titleSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Bespoke QLESS Emblem */}
      <div className={`relative ${iconDimensions} shrink-0 group`}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 blur-md opacity-40 group-hover:opacity-75 transition-opacity" />
        
        {/* Core Vector Icon Mark */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-sm"
        >
          <defs>
            <linearGradient id="qlessGradPrimary" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="50%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>

            <linearGradient id="qlessGradAccent" x1="16" y1="12" x2="38" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>

            <filter id="qlessShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1e1b4b" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Rounded Squircle Container */}
          <rect
            x="2"
            y="2"
            width="44"
            height="44"
            rx="14"
            fill="url(#qlessGradPrimary)"
          />

          {/* Inner Geometric "Q" with Speed Loop & Forward Lane Pass */}
          {/* Main Ring of the Q */}
          <path
            d="M24 10C16.8203 10 11 15.8203 11 23C11 30.1797 16.8203 36 24 36C26.892 36 29.562 35.056 31.724 33.456L34.586 36.318C35.367 37.099 36.633 37.099 37.414 36.318C38.195 35.537 38.195 34.271 37.414 33.49L34.552 30.628C36.082 28.514 37 25.864 37 23C37 15.8203 31.1797 10 24 10ZM24 15C28.4183 15 32 18.5817 32 23C32 27.4183 28.4183 31 24 31C19.5817 31 16 27.4183 16 23C16 18.5817 19.5817 15 24 15Z"
            fill="#FFFFFF"
            fillRule="evenodd"
            clipRule="evenodd"
            filter="url(#qlessShadow)"
          />

          {/* Swift Pass Arrow / Streamline Inside the Q Loop */}
          <path
            d="M21 20L27 23L21 26"
            stroke="url(#qlessGradAccent)"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Glowing Priority Dispatch Sparkle */}
          <circle cx="34" cy="14" r="2.25" fill="#FDE047" />
        </svg>
      </div>

      {/* Typographic Identity */}
      <div>
        <div className="flex items-center gap-2 leading-none">
          <span
            className={`font-black tracking-tight font-sans ${titleSize} ${
              variant === 'dark' ? 'text-white' : 'text-slate-900'
            }`}
          >
            QLESS
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Pass
          </span>
        </div>

        {showTagline && (
          <p
            className={`text-[11px] font-medium tracking-normal mt-1 leading-none ${
              variant === 'dark' ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            Real-Time Queue &amp; Priority Dispatch
          </p>
        )}
      </div>
    </div>
  );
};
