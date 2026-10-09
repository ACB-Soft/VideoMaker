import React, { useState } from 'react';
import {
  AspectRatioType,
  CaptionStyle,
  IntroConfig,
  OutroConfig,
  VideoResolutionQuality,
  VideoSlide,
} from '../types/video';
import { videoExporter, ExportProgress } from '../services/videoExporter';
import { videoRenderer } from '../services/videoRenderer';
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Video,
  Film,
  Sparkles,
  Music,
  Share2,
  RefreshCw,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  intro: IntroConfig;
  slides: VideoSlide[];
  outro: OutroConfig;
  aspectRatio: AspectRatioType;
  captionStyle: CaptionStyle;
  audioTrackId: string;
  isMuted: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  intro,
  slides,
  outro,
  aspectRatio,
  captionStyle,
  audioTrackId,
  isMuted,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [resolutionQuality, setResolutionQuality] = useState<VideoResolutionQuality>('1080p');
  const [progressData, setProgressData] = useState<ExportProgress | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedFilename, setExportedFilename] = useState<string>('instagram-tanitim.mp4');
  const [exportError, setExportError] = useState<string | null>(null);
  const [targetFps, setTargetFps] = useState<number>(30);

  if (!isOpen) return null;

  const currentRes = videoRenderer.getResolution(aspectRatio, resolutionQuality);

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportedVideoUrl(null);
    setProgressData({
      progress: 0.05,
      currentTime: 0,
      totalDuration: 1,
      statusText: 'İşlem başlatılıyor...',
    });

    try {
      const result = await videoExporter.exportMP4({
        intro,
        slides,
        outro,
        aspectRatio,
        resolutionQuality,
        captionStyle,
        audioTrackId,
        isMuted,
        fps: targetFps,
        onProgress: (p) => setProgressData(p),
      });

      setExportedVideoUrl(result.url);
      setExportedFilename(result.filename);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportError(err?.message || 'Video dışa aktarılırken bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportedVideoUrl) return;
    const a = document.createElement('a');
    a.href = exportedVideoUrl;
    a.download = exportedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">MP4 Tanıtım Videosunu Dışa Aktar</h3>
              <p className="text-xs text-slate-400">
                Instagram Reels, TikTok veya Hikayeler için hazır format
              </p>
            </div>
          </div>

          {!isExporting && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="mt-5 space-y-5">
          {/* If already finished exporting */}
          {exportedVideoUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>MP4 formatındaki videonuz başarıyla işlendi ve indirilmeye hazır!</span>
              </div>

              {/* Video Player Preview */}
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center max-h-72">
                <video
                  src={exportedVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-72 w-full object-contain"
                />
              </div>

              {/* Download CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-500/25 active:scale-95 transition"
                >
                  <Download className="h-4 w-4" />
                  <span>MP4 Videosunu Cihazına İndir</span>
                </button>

                <button
                  onClick={handleStartExport}
                  className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-3 text-xs font-semibold text-slate-200 transition"
                >
                  Yeniden Oluştur
                </button>
              </div>
            </div>
          ) : isExporting ? (
            /* Progress state */
            <div className="space-y-4 py-4 text-center">
              <div className="flex justify-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Video Oluşturuluyor...</h4>
                <p className="mt-1 text-xs text-slate-400">
                  {progressData?.statusText || 'Görseller ve geçişler MP4 formatında işleniyor.'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full space-y-1.5">
                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-emerald-400 transition-all duration-150"
                    style={{ width: `${Math.round((progressData?.progress || 0) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>İşlenen: %{Math.round((progressData?.progress || 0) * 100)}</span>
                  <span>
                    {progressData?.currentTime.toFixed(1)}s / {progressData?.totalDuration.toFixed(1)}s
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Lütfen işlem tamamlanana kadar sekmeyi kapatmayın.
              </p>
            </div>
          ) : (
            /* Configuration view before export */
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">En/Boy Oranı:</span>
                  <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                    {aspectRatio} ({aspectRatio === '9:16' ? 'Reels / Hikaye' : aspectRatio === '1:1' ? 'Kare Post' : aspectRatio === '4:5' ? 'Dikey Akış' : 'Yatay'})
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Çıktı Formatı:</span>
                  <span className="font-bold text-rose-400">MP4 (H.264 Video + Web Audio)</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Slayt & Gönderi Sayısı:</span>
                  <span className="font-bold text-white">{slides.length} Gönderi</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Giriş / Çıkış:</span>
                  <span className="font-bold text-slate-200">
                    {intro.enabled ? '✓ Intro' : '✗ Intro'} | {outro.enabled ? '✓ Outro' : '✗ Outro'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Arka Plan Müziği:</span>
                  <span className="font-bold text-emerald-400">
                    {isMuted || audioTrackId === 'track-none' ? 'Sessiz' : '✓ Dinamik Web Audio Parçası'}
                  </span>
                </div>
              </div>

              {/* Quality & Resolution & FPS Setting */}
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Film className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Video Çıktı Çözünürlüğü:</span>
                    </label>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {currentRes.width} × {currentRes.height} px
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {/* 360p */}
                    <button
                      type="button"
                      onClick={() => setResolutionQuality('360p')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                        resolutionQuality === '360p'
                          ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-sm ring-1 ring-emerald-500'
                          : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold">360p (SD)</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Kompakt / Hızlı</span>
                    </button>

                    {/* 720p */}
                    <button
                      type="button"
                      onClick={() => setResolutionQuality('720p')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                        resolutionQuality === '720p'
                          ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-sm ring-1 ring-emerald-500'
                          : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold">720p (HD)</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Dengeli Kalite</span>
                    </button>

                    {/* 1080p */}
                    <button
                      type="button"
                      onClick={() => setResolutionQuality('1080p')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                        resolutionQuality === '1080p'
                          ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-sm ring-1 ring-emerald-500'
                          : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold">1080p (Full HD)</span>
                      <span className="text-[10px] text-emerald-400 font-medium mt-0.5">Yüksek Netlik</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Kare Hızı (FPS)
                    </label>
                    <select
                      value={targetFps}
                      onChange={(e) => setTargetFps(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white focus:outline-none"
                    >
                      <option value={30}>30 FPS (Standart & Hızlı)</option>
                      <option value={60}>60 FPS (Ultra Akıcı)</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Hedef Platform
                    </label>
                    <div className="text-xs font-semibold text-slate-300 p-2 truncate">
                      {aspectRatio === '9:16' ? 'Reels / Shorts / TikTok' : aspectRatio === '1:1' ? 'Instagram Akış' : 'Tüm Ekranlar'}
                    </div>
                  </div>
                </div>
              </div>

              {exportError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleStartExport}
                  disabled={slides.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 disabled:opacity-40 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-500/25 active:scale-95 transition"
                >
                  <Video className="h-4 w-4" />
                  <span>Hemen MP4 Tanıtım Videosu Üret</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
