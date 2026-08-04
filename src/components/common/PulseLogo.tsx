import React from 'react';

interface PulseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'lockup' | 'mark-only' | 'wordmark-only';
  className?: string;
  showTagline?: boolean;
}

export const PulseLogoMark: React.FC<{ sizeClass?: string; className?: string }> = ({
  sizeClass = 'w-8 h-8',
  className = '',
}) => {
  return (
    <div
      className={`relative rounded-xl bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 text-white flex items-center justify-center p-1.5 shadow-md shadow-sky-500/20 group-hover:shadow-sky-500/30 group-hover:scale-105 transition-all duration-200 shrink-0 ${sizeClass} ${className}`}
    >
      {/* Outer Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-sky-400/20 blur-sm group-hover:blur-md transition-all opacity-0 group-hover:opacity-100" />

      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-white relative z-10"
      >
        {/* Background Subtle Grid / Radar Rings */}
        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
        <circle cx="16" cy="16" r="8" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="2 2" />

        {/* Pulse Waveform + Structural "P" Geometry */}
        {/* Stem of P */}
        <path
          d="M8.5 7.5V24.5"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
        />

        {/* Dynamic Pulse Signal Wave looping to form top loop of P */}
        <path
          d="M8.5 7.5H16.5C19.8137 7.5 22.5 10.1863 22.5 13.5C22.5 16.8137 19.8137 19.5 16.5 19.5H8.5"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Waveform Signal (The Pulse of News) */}
        <path
          d="M10 13.5L12.5 11.5L14.5 15.5L17.5 10.5L19.5 14L21 13.5"
          stroke="#38BDF8"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* AI Signal Intelligence Node (Active Pulse Dot) */}
        <circle cx="20" cy="8" r="2.25" fill="#38BDF8" />
        <circle cx="20" cy="8" r="3.75" stroke="#38BDF8" strokeOpacity="0.5" strokeWidth="1" />
      </svg>
    </div>
  );
};

export const PulseLogo: React.FC<PulseLogoProps> = ({
  size = 'md',
  variant = 'lockup',
  className = '',
  showTagline = true,
}) => {
  const sizeMap = {
    sm: { mark: 'w-7 h-7', text: 'text-base', tagline: 'text-[9px]' },
    md: { mark: 'w-8 h-8', text: 'text-lg', tagline: 'text-[10px]' },
    lg: { mark: 'w-10 h-10', text: 'text-xl', tagline: 'text-[11px]' },
    xl: { mark: 'w-12 h-12', text: 'text-2xl', tagline: 'text-[12px]' },
  };

  const currentSize = sizeMap[size];

  if (variant === 'mark-only') {
    return <PulseLogoMark sizeClass={currentSize.mark} className={className} />;
  }

  return (
    <div className={`flex items-center gap-2.5 text-left group cursor-pointer ${className}`}>
      <PulseLogoMark sizeClass={currentSize.mark} />

      {variant !== 'mark-only' && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1 leading-none">
            <span className={`font-serif font-extrabold tracking-tight text-slate-900 dark:text-slate-100 ${currentSize.text}`}>
              Pulse
            </span>
            <span className={`font-sans font-black tracking-normal text-sky-600 dark:text-sky-400 ${currentSize.text}`}>
              AI
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse ml-0.5" />
          </div>

          {showTagline && (
            <span className={`hidden sm:block font-mono text-slate-500 dark:text-slate-400 tracking-wider uppercase font-semibold mt-0.5 ${currentSize.tagline}`}>
              News Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );
};
