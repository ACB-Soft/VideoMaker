import React from 'react';
import { AspectRatioType } from '../types/video';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Download,
  Smartphone,
  Square,
  RectangleVertical,
  Monitor,
  Clapperboard,
} from 'lucide-react';

interface HeaderProps {
  aspectRatio: AspectRatioType;
  setAspectRatio: (aspect: AspectRatioType) => void;
  selectedCount?: number;
  totalDuration: number;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  aspectRatio,
  setAspectRatio,
  selectedCount = 0,
  totalDuration,
  onOpenExport,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-rose-500 shadow-lg shadow-indigo-500/20">
            <Clapperboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-['Outfit']">
                Video <span className="text-rose-400">Maker</span>
              </h1>
              <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                Tanıtım Videosu
              </span>
            </div>
          </div>
        </div>

        {/* Right Tools: Aspect Ratio & PWA Install & Export */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Aspect Ratio Selector */}
          <div className="hidden md:flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setAspectRatio('9:16')}
              title="Dikey Video (9:16 - Reels / Shorts / Hikaye)"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                aspectRatio === '9:16'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>9:16</span>
            </button>
            <button
              onClick={() => setAspectRatio('1:1')}
              title="Kare Video (1:1)"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                aspectRatio === '1:1'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              <span>1:1</span>
            </button>
            <button
              onClick={() => setAspectRatio('4:5')}
              title="Dikey Portre (4:5)"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                aspectRatio === '4:5'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RectangleVertical className="h-3.5 w-3.5" />
              <span>4:5</span>
            </button>
            <button
              onClick={() => setAspectRatio('16:9')}
              title="Yatay Video (16:9 - YouTube / Sunum / TV)"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                aspectRatio === '16:9'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>16:9</span>
            </button>
          </div>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Export MP4 Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">MP4 Dışa Aktar</span>
            <span className="sm:hidden">İndir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
