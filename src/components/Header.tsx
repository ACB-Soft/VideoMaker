import React, { useRef } from 'react';
import { Clapperboard, Download, Upload, FileCode, Loader2 } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { parseProjectBackup, ProjectBackupPayload } from '../services/projectBackup';

interface HeaderProps {
  selectedCount?: number;
  totalDuration?: number;
  hasContent?: boolean;
  isExportingBackup?: boolean;
  onExportBackup?: () => void;
  onRestoreBackup?: (backup: ProjectBackupPayload) => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasContent,
  isExportingBackup,
  onExportBackup,
  onRestoreBackup,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onRestoreBackup) return;

    try {
      const text = await file.text();
      const backup = parseProjectBackup(text);
      onRestoreBackup(backup);
    } catch (err: any) {
      alert(err?.message || 'Proje yedeği dosyası okunamadı.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-rose-500 shadow-lg shadow-indigo-500/20">
            <Clapperboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-['Outfit']">
              Video <span className="text-rose-400">Maker</span>
            </h1>
          </div>
        </div>

        {/* Right Tools: Project Backup (.json) & PWA Install */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Backup Restore Button */}
          {onRestoreBackup && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm"
              title="Daha önce indirilen proje yedeğini (.json) yükle ve devam et"
            >
              <Upload className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden sm:inline">Yedek Yükle</span>
              <span className="sm:hidden text-[11px]">Yükle</span>
            </button>
          )}

          {/* Backup Export Button */}
          {onExportBackup && (
            <button
              type="button"
              onClick={onExportBackup}
              disabled={isExportingBackup || !hasContent}
              className={`flex items-center gap-1.5 rounded-xl border transition px-2.5 sm:px-3.5 py-1.5 text-xs font-bold shadow-sm ${
                hasContent
                  ? 'border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200'
                  : 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed'
              }`}
              title="Tüm düzenlemelerinizi, fotoğrafları ve ayarları .json dosyası olarak indirin"
            >
              {isExportingBackup ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                  <span className="text-[11px]">Paketleniyor...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Düzenlemeleri Yedekle (.json)</span>
                  <span className="sm:hidden text-[11px]">Yedekle</span>
                </>
              )}
            </button>
          )}

          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};

