import React from 'react';

interface LogoProps {
  compact?: boolean;
  darkSurface?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ compact = false, darkSurface = false }) => {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <svg
        width={compact ? 32 : 38}
        height={compact ? 32 : 38}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          width="40"
          height="40"
          rx="10"
          fill={darkSurface ? '#1D4ED8' : '#0B1F3A'}
        />
        <path
          d="M12 20.5H16.5L19 13.5L22 26.5L24.5 20.5H28.5"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="28.5" cy="13.5" r="2.2" fill="#60A5FA" />
      </svg>
      <div className="min-w-0">
        <div
          className={`font-display font-bold tracking-tight leading-tight whitespace-nowrap ${
            compact ? 'text-sm' : 'text-base'
          } ${darkSurface ? 'text-white' : 'text-[#0B1F3A]'}`}
        >
          FISIO ASSESSMENT PRO
        </div>
        {!compact && (
          <div
            className={`text-[11px] font-medium whitespace-nowrap ${
              darkSurface ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            Avaliação Fisioterapêutica Multidisciplinar
          </div>
        )}
      </div>
    </div>
  );
};
