import React, { useRef } from 'react';
import { IntroConfig, OutroConfig, TransitionType } from '../types/video';
import {
  Sparkles,
  Upload,
  Trash2,
  Clock,
  Shuffle,
  Layers,
  Check,
  AtSign,
  Globe,
  Sliders,
  Maximize2,
  ShieldCheck,
  LayoutGrid,
  Type,
  Crop,
  Wand2,
} from 'lucide-react';

interface IntroOutroEditorProps {
  intro: IntroConfig;
  setIntro: React.Dispatch<React.SetStateAction<IntroConfig>>;
  outro: OutroConfig;
  setOutro: React.Dispatch<React.SetStateAction<OutroConfig>>;
  updateSharedBranding: (updates: Partial<IntroConfig>) => void;
  onContinue: () => void;
}

export const IntroOutroEditor: React.FC<IntroOutroEditorProps> = ({
  intro,
  setIntro,
  outro,
  setOutro,
  updateSharedBranding,
  onContinue,
}) => {
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const transitionOptions: { value: TransitionType; label: string }[] = [
    { value: 'fade', label: 'Silinerek Geçiş (Fade)' },
    { value: 'zoom-in', label: 'Yakınlaşma (Zoom In)' },
    { value: 'zoom-out', label: 'Uzaklaşma (Zoom Out)' },
    { value: 'slide-left', label: 'Sola Kayma' },
    { value: 'slide-right', label: 'Sağa Kayma' },
    { value: 'blur', label: 'Bulanık Geçiş (Blur)' },
    { value: 'flash', label: 'Işık Parıltısı (Flash)' },
    { value: 'wipe-right', label: 'Sağa Silme (Wipe)' },
  ];

  const backgroundOptions: {
    value: IntroConfig['backgroundStyle'];
    label: string;
    preview: string;
  }[] = [
    { value: 'gradient-dark', label: 'Gece Mavisi (Koyu)', preview: 'from-slate-950 via-slate-900 to-indigo-950' },
    { value: 'gradient-purple', label: 'Zengin Mor (Koyu)', preview: 'from-indigo-950 via-purple-900 to-slate-950' },
    { value: 'gradient-sunset', label: 'Gün Batımı Amber (Koyu)', preview: 'from-amber-950 via-rose-900 to-slate-950' },
    { value: 'solid-black', label: 'Saf Koyu Siyah', preview: 'from-black to-slate-950' },
    { value: 'gradient-light-slate', label: 'Kristal Beyaz & Gri (Açık)', preview: 'from-slate-100 via-white to-slate-200' },
    { value: 'gradient-light-blue', label: 'Gökyüzü Mavisi (Açık)', preview: 'from-sky-100 via-blue-50 to-indigo-100' },
    { value: 'gradient-light-warm', label: 'Sıcak Krem & Şampanya (Açık)', preview: 'from-amber-50 via-rose-50 to-orange-100' },
    { value: 'solid-white', label: 'Saf Minimal Beyaz (Açık)', preview: 'from-white to-slate-50' },
  ];

  const handleSharedLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        updateSharedBranding({ logoUrl: event.target.result, logoBgColor: 'transparent' });
      }
    };
    reader.readAsDataURL(file);
  };

  const sharedLogoUrl = intro.logoUrl || outro.logoUrl;
  const currentScale = intro.logoScale || 1.0;
  const currentCrop = intro.logoCropPercent ?? 0;
  const currentTheme = intro.backgroundStyle || 'gradient-dark';

  const handleAutoCropDetect = () => {
    if (!sharedLogoUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const w = canvas.width;
        const h = canvas.height;

        const isBlank = (x: number, y: number) => {
          const idx = (y * w + x) * 4;
          const a = data[idx + 3];
          if (a < 25) return true; // transparent
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          // Near-white or near-black empty edge padding
          if (r > 248 && g > 248 && b > 248) return true;
          return false;
        };

        let top = 0;
        let bottom = h - 1;
        let left = 0;
        let right = w - 1;

        topLoop: for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (!isBlank(x, y)) {
              top = y;
              break topLoop;
            }
          }
        }

        bottomLoop: for (let y = h - 1; y >= 0; y--) {
          for (let x = 0; x < w; x++) {
            if (!isBlank(x, y)) {
              bottom = y;
              break bottomLoop;
            }
          }
        }

        leftLoop: for (let x = 0; x < w; x++) {
          for (let y = 0; y < h; y++) {
            if (!isBlank(x, y)) {
              left = x;
              break leftLoop;
            }
          }
        }

        rightLoop: for (let x = w - 1; x >= 0; x--) {
          for (let y = 0; y < h; y++) {
            if (!isBlank(x, y)) {
              right = x;
              break rightLoop;
            }
          }
        }

        const topMargin = top / h;
        const bottomMargin = (h - 1 - bottom) / h;
        const leftMargin = left / w;
        const rightMargin = (w - 1 - right) / w;

        const autoMargin = Math.min(topMargin, bottomMargin, leftMargin, rightMargin);
        const percent = Math.min(40, Math.max(0, Math.round(autoMargin * 100)));
        const finalPercent = percent > 0 ? percent : 12;
        updateSharedBranding({ logoCropPercent: finalPercent });
      } catch {
        updateSharedBranding({ logoCropPercent: 15 });
      }
    };
    img.src = sharedLogoUrl;
  };

  return (
    <div className="space-y-6">
      {/* ================= SECTION 1: KURUMSAL LOGO & ORTAK TEMA ================= */}
      <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                <ShieldCheck className="h-4 w-4" />
              </span>
              Kurumsal Logo & Ortak Video Teması
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Bu logo giriş ve kapanış sayfalarında büyük olarak, her görsel sayfasının ise <strong className="text-white">sol üst köşesinde</strong> yer alacaktır. Arkaplan teması tüm sayfalarda birebir aynı uygulanır.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-xl">
            <Check className="h-3.5 w-3.5" />
            <span>Tüm Sayfalarla Senkronize</span>
          </div>
        </div>

        {/* Logo Upload & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo Preview & Upload Box */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 p-5 text-center">
            <div
              className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/60 p-2.5 shadow-inner transition mb-3 overflow-hidden"
            >
              {sharedLogoUrl ? (
                <div
                  className="h-full w-full flex items-center justify-center overflow-hidden"
                  style={{
                    transform: currentCrop > 0 ? `scale(${1 / (1 - 2 * (currentCrop / 100))})` : 'none',
                    transition: 'transform 0.15s ease-out',
                  }}
                >
                  <img
                    src={sharedLogoUrl}
                    alt="Kurumsal Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-14 w-14 rounded-xl bg-gradient-to-tr from-sky-400 via-indigo-500 to-rose-500 flex items-center justify-center text-white text-xs font-black shadow-lg">
                  LOGO
                </div>
              )}
              {currentCrop > 0 && (
                <div className="absolute bottom-1 right-1 rounded bg-sky-500/80 px-1 py-0.2 text-[8px] font-bold text-white shadow">
                  -%{currentCrop}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={logoFileInputRef}
                accept="image/*"
                onChange={handleSharedLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoFileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-500/20 transition"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{sharedLogoUrl ? 'Logoyu Değiştir' : 'Kurumsal Logo Yükle'}</span>
              </button>

              {sharedLogoUrl && (
                <button
                  type="button"
                  onClick={() => updateSharedBranding({ logoUrl: null })}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition"
                  title="Logoyu Kaldır"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-2">
              PNG (şeffaf zeminli) veya JPG formatında logo
            </span>
          </div>

          {/* Logo Büyüklüğü ve Renk Ayarları */}
          <div className="lg:col-span-2 space-y-4">
            {/* Logo Büyüklüğü */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Maximize2 className="h-3.5 w-3.5 text-rose-400" />
                  <span>Logo Büyüklüğü:</span>
                </span>
                <span className="text-rose-400 font-bold">%{Math.round(currentScale * 100)}</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.5}
                  max={4.0}
                  step={0.1}
                  value={currentScale}
                  onChange={(e) => updateSharedBranding({ logoScale: parseFloat(e.target.value) })}
                  className="flex-1 accent-rose-500 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  {[0.8, 1.2, 1.8, 2.5, 3.2, 4.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateSharedBranding({ logoScale: s })}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition ${
                        Math.abs(currentScale - s) < 0.05
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Logoyu Köşelerden Daralt / Yüzdesel Kırpma */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Crop className="h-3.5 w-3.5 text-sky-400" />
                  <span>Logoyu Köşelerden Daralt / Kırp:</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-400 border border-sky-500/30">
                    %{currentCrop} Kırpma
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoCropDetect}
                    title="Logonun kenarlarındaki şeffaf veya beyaz boşlukları analiz edip otomatik kırpar"
                    className="flex items-center gap-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/30 px-2 py-0.5 text-[11px] font-bold text-sky-300 transition active:scale-95"
                  >
                    <Wand2 className="h-3 w-3 text-sky-400" />
                    <span>Otomatik Kırp</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={currentCrop}
                  onChange={(e) => updateSharedBranding({ logoCropPercent: parseInt(e.target.value) })}
                  className="flex-1 accent-sky-500 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  {[0, 5, 10, 15, 20, 25, 30].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateSharedBranding({ logoCropPercent: c })}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition ${
                        currentCrop === c
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      %{c}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Logonun kenarlarındaki gereksiz boşlukları veya çerçeveyi yüzdesel olarak köşelerden içe doğru kırpar ve logoyu netleştirir.
              </p>
            </div>

            {/* Ortak Video Arkaplan Teması (Tüm sayfalarda aynı) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-300 block flex items-center gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5 text-rose-400" />
                <span>Ortak Video Arkaplan Teması (Giriş, Slaytlar ve Kapanışta Birebir Aynı):</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {backgroundOptions.map((bg) => (
                  <button
                    key={bg.value}
                    type="button"
                    onClick={() => updateSharedBranding({ backgroundStyle: bg.value })}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition ${
                      currentTheme === bg.value
                        ? 'border-rose-500 bg-rose-500/10 text-white shadow-sm ring-1 ring-rose-500'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-lg bg-gradient-to-br ${bg.preview} border border-white/20 shrink-0`}
                    />
                    <span className="truncate">{bg.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 2: GİRİŞ (INTRO) & KAPANIŞ (OUTRO) SEÇENEKLERİ (AYNI YAPIDA) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. GİRİŞ (INTRO) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                1
              </span>
              <h3 className="text-base font-bold text-white">Giriş Bölümü (Intro)</h3>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-slate-400">Aktif:</span>
              <input
                type="checkbox"
                checked={intro.enabled}
                onChange={(e) => setIntro((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 rounded accent-rose-500"
              />
            </label>
          </div>

          <div className={`mt-4 space-y-4 flex-1 ${!intro.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {/* Giriş Ana Başlığı */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Giriş Ana Başlığı
              </label>
              <input
                type="text"
                value={intro.title}
                onChange={(e) => setIntro((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Örn: KURUMSAL TANITIM"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Giriş Ana Başlık Puntosu */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-rose-400" />
                  <span>Başlık Puntosu:</span>
                </span>
                <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30">
                  {intro.titleFontSize || 56} pt
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={24}
                  max={76}
                  step={2}
                  value={intro.titleFontSize || 56}
                  onChange={(e) => setIntro((prev) => ({ ...prev, titleFontSize: parseInt(e.target.value) }))}
                  className="flex-1 accent-rose-500 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  {[32, 40, 48, 56, 64, 72].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setIntro((prev) => ({ ...prev, titleFontSize: pt }))}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition ${
                        (intro.titleFontSize || 56) === pt
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Giriş Alt Metni */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Giriş Alt Metni
              </label>
              <input
                type="text"
                value={intro.subtitle}
                onChange={(e) => setIntro((prev) => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Örn: Faaliyet & Proje Vitrini"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Giriş Alt Metin Puntosu */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-sky-400" />
                  <span>Alt Metin Puntosu:</span>
                </span>
                <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-400 border border-sky-500/30">
                  {intro.subtitleFontSize || 32} pt
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={14}
                  max={44}
                  step={2}
                  value={intro.subtitleFontSize || 32}
                  onChange={(e) => setIntro((prev) => ({ ...prev, subtitleFontSize: parseInt(e.target.value) }))}
                  className="flex-1 accent-sky-500 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  {[18, 24, 28, 32, 36, 40].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setIntro((prev) => ({ ...prev, subtitleFontSize: pt }))}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition ${
                        (intro.subtitleFontSize || 32) === pt
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Geçiş Efekti ve Süre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Shuffle className="h-3 w-3 text-rose-400" />
                  <span>Geçiş Efekti</span>
                </label>
                <select
                  value={intro.transition}
                  onChange={(e) =>
                    setIntro((prev) => ({ ...prev, transition: e.target.value as TransitionType }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  {transitionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-rose-400" />
                  <span>Süre: {intro.duration.toFixed(1)} sn</span>
                </label>
                <input
                  type="range"
                  min={1.5}
                  max={5.0}
                  step={0.5}
                  value={intro.duration}
                  onChange={(e) =>
                    setIntro((prev) => ({ ...prev, duration: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-rose-500 mt-2 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. KAPANIŞ (OUTRO) - GİRİŞ İLE BİREBİR AYNI SEÇENEKLER VE PUNTO AYARLARI */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                2
              </span>
              <h3 className="text-base font-bold text-white">Kapanış Bölümü (Outro)</h3>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-slate-400">Aktif:</span>
              <input
                type="checkbox"
                checked={outro.enabled}
                onChange={(e) => setOutro((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 rounded accent-rose-500"
              />
            </label>
          </div>

          <div className={`mt-4 space-y-4 flex-1 ${!outro.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {/* Kapanış Ana Başlığı */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Kapanış Ana Başlığı
              </label>
              <input
                type="text"
                value={outro.title ?? outro.headline ?? ''}
                onChange={(e) =>
                  setOutro((prev) => ({
                    ...prev,
                    title: e.target.value,
                    headline: e.target.value,
                  }))
                }
                placeholder="Örn: TEŞEKKÜRLER"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Kapanış Ana Başlık Puntosu */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-rose-400" />
                  <span>Başlık Puntosu:</span>
                </span>
                <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30">
                  {outro.titleFontSize || 56} pt
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={24}
                  max={76}
                  step={2}
                  value={outro.titleFontSize || 56}
                  onChange={(e) => setOutro((prev) => ({ ...prev, titleFontSize: parseInt(e.target.value) }))}
                  className="flex-1 accent-rose-500 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  {[32, 40, 48, 56, 64, 72].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setOutro((prev) => ({ ...prev, titleFontSize: pt }))}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition ${
                        (outro.titleFontSize || 56) === pt
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Kapanış Alt Metni */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Kapanış Alt Metni
              </label>
              <input
                type="text"
                value={outro.subtitle ?? outro.callToAction ?? ''}
                onChange={(e) =>
                  setOutro((prev) => ({
                    ...prev,
                    subtitle: e.target.value,
                    callToAction: e.target.value,
                  }))
                }
                placeholder="Örn: Mimar ve Mühendisler Grubu Derneği"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Kapanış Alt Metin Puntosu */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-sky-400" />
                  <span>Alt Metin Puntosu:</span>
                </span>
                <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-400 border border-sky-500/30">
                  {outro.subtitleFontSize || 32} pt
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={14}
                  max={44}
                  step={2}
                  value={outro.subtitleFontSize || 32}
                  onChange={(e) => setOutro((prev) => ({ ...prev, subtitleFontSize: parseInt(e.target.value) }))}
                  className="flex-1 accent-sky-500 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  {[18, 24, 28, 32, 36, 40].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setOutro((prev) => ({ ...prev, subtitleFontSize: pt }))}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition ${
                        (outro.subtitleFontSize || 32) === pt
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Geçiş Efekti ve Süre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Shuffle className="h-3 w-3 text-rose-400" />
                  <span>Geçiş Efekti</span>
                </label>
                <select
                  value={outro.transition}
                  onChange={(e) =>
                    setOutro((prev) => ({ ...prev, transition: e.target.value as TransitionType }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  {transitionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-rose-400" />
                  <span>Süre: {outro.duration.toFixed(1)} sn</span>
                </label>
                <input
                  type="range"
                  min={1.5}
                  max={5.0}
                  step={0.5}
                  value={outro.duration}
                  onChange={(e) =>
                    setOutro((prev) => ({ ...prev, duration: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-rose-500 mt-2 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar */}
      <div className="sticky bottom-4 z-30 flex items-center justify-between rounded-2xl border border-rose-500/30 bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl">
        <div>
          <h4 className="text-sm font-bold text-white">Logo ve Başlıklar Hazır</h4>
          <p className="text-xs text-slate-400">
            Açılış logosu ve kapanış metinleri belirlendi.
          </p>
        </div>

        <button
          onClick={onContinue}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/25 active:scale-95 transition"
        >
          <span>3. Adım: Zaman Çizelgesi & Önizlemeye Geç</span>
          <span className="text-base">→</span>
        </button>
      </div>
    </div>
  );
};
