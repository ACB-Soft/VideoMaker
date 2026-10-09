import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-pink-500/20 hover:opacity-95 active:scale-95 transition-all"
        title="Uygulamayı Cihazınıza Yükleyin"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Uygulamayı Yükle</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
          title="iOS Safari'de Yükle"
        >
          <Smartphone className="w-3.5 h-3.5 text-pink-400" />
          <span>iOS'a Yükle</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-amber-500 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-white">iPhone / iPad'e Yükle</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 rounded-xl bg-slate-800/60 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-500/20 text-xs font-bold text-pink-400">1</span>
                  <p>Safari tarayıcısının altındaki <strong className="text-white inline-flex items-center gap-1"><Share className="w-3.5 h-3.5" /> Paylaş</strong> butonuna dokunun.</p>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-800/60 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-500/20 text-xs font-bold text-pink-400">2</span>
                  <p>Açılan menüde aşağı kaydırıp <strong className="text-white inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5" /> Ana Ekrana Ekle</strong> seçeneğini seçin.</p>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-800/60 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-500/20 text-xs font-bold text-pink-400">3</span>
                  <p>Sağ üstteki <strong>Ekle</strong> butonuna basarak tam ekran PWA deneyimine kavuşun.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-pink-600 hover:bg-pink-500 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-pink-600/30"
              >
                Anladım
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
