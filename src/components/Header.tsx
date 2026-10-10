import React from 'react';
import { Clapperboard } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  selectedCount?: number;
  totalDuration?: number;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-rose-500 shadow-lg shadow-indigo-500/20">
            <Clapperboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-['Outfit']">
              Video <span className="text-rose-400">Maker</span>
            </h1>
          </div>
        </div>

        {/* Right Tools: PWA Install */}
        <div className="flex items-center gap-2 sm:gap-3">
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
