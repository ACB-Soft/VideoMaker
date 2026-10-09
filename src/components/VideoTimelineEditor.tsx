import React, { useEffect, useRef, useState } from 'react';
import {
  AspectRatioType,
  CaptionStyle,
  IntroConfig,
  OutroConfig,
  TransitionType,
  VideoSlide,
} from '../types/video';
import { videoRenderer } from '../services/videoRenderer';
import { audioEngine, AUDIO_TRACKS } from '../services/audioEngine';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Music,
  Download,
  Clock,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  Layers,
  Sparkles,
  ArrowDownUp,
  Maximize2,
  Settings2,
  Sliders,
  Type,
  Eye,
  EyeOff,
  MoveHorizontal,
  Upload,
  Tag,
} from 'lucide-react';

interface VideoTimelineEditorProps {
  slides: VideoSlide[];
  setSlides: React.Dispatch<React.SetStateAction<VideoSlide[]>>;
  intro: IntroConfig;
  setIntro: React.Dispatch<React.SetStateAction<IntroConfig>>;
  outro: OutroConfig;
  setOutro: React.Dispatch<React.SetStateAction<OutroConfig>>;
  aspectRatio: AspectRatioType;
  setAspectRatio: (aspect: AspectRatioType) => void;
  captionStyle: CaptionStyle;
  setCaptionStyle: (style: CaptionStyle) => void;
  audioTrackId: string;
  setAudioTrackId: (id: string) => void;
  audioVolume: number;
  setAudioVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  onOpenExport: () => void;
}

export const VideoTimelineEditor: React.FC<VideoTimelineEditorProps> = ({
  slides,
  setSlides,
  intro,
  setIntro,
  outro,
  setOutro,
  aspectRatio,
  setAspectRatio,
  captionStyle,
  setCaptionStyle,
  audioTrackId,
  setAudioTrackId,
  audioVolume,
  setAudioVolume,
  isMuted,
  setIsMuted,
  onOpenExport,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(slides[0]?.id || null);
  const [editingSlide, setEditingSlide] = useState<VideoSlide | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await audioEngine.loadCustomAudioFile(file);
      setAudioTrackId('track-custom');
      if (isMuted) setIsMuted(false);
    } catch (err) {
      console.error('Audio upload error:', err);
      alert('Müzik dosyası yüklenirken bir hata oluştu.');
    }
  };

  const { segments, totalDuration } = videoRenderer.calculateSegments(intro, slides, outro);

  // Preload images whenever slides change
  useEffect(() => {
    const urls: string[] = [];
    slides.forEach((s) => {
      if (s.post?.imageUrl) urls.push(s.post.imageUrl);
      if (s.posts) {
        s.posts.forEach((p) => {
          if (p.imageUrl) urls.push(p.imageUrl);
        });
      }
    });
    if (intro.logoUrl) urls.push(intro.logoUrl);
    if (outro.logoUrl) urls.push(outro.logoUrl);
    videoRenderer.preloadImages(urls);
  }, [slides, intro.logoUrl, outro.logoUrl]);

  // Audio engine synchronization
  useEffect(() => {
    audioEngine.setVolume(isMuted ? 0 : audioVolume);
  }, [audioVolume, isMuted]);

  useEffect(() => {
    if (isPlaying && !isMuted) {
      audioEngine.play(audioTrackId);
    } else {
      audioEngine.stop();
    }
  }, [isPlaying, audioTrackId, isMuted]);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimestampRef.current = null;
      return;
    }

    const loop = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setCurrentTime((prev) => {
        const nextTime = prev + delta;
        if (nextTime >= totalDuration) {
          setIsPlaying(false);
          return 0; // loop or stop
        }
        return nextTime;
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  // Render Frame on Canvas whenever currentTime, slides, or configs change
  useEffect(() => {
    if (!canvasRef.current) return;
    videoRenderer.renderFrame({
      canvas: canvasRef.current,
      time: currentTime,
      intro,
      slides,
      outro,
      aspectRatio,
      captionStyle,
      resolutionQuality: '1080p',
    });
  }, [currentTime, intro, slides, outro, aspectRatio, captionStyle]);

  const togglePlay = () => {
    if (currentTime >= totalDuration - 0.1) {
      setCurrentTime(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(Math.max(0, Math.min(newTime, totalDuration)));
  };

  const moveSlide = (index: number, direction: 'left' | 'right') => {
    if (
      (direction === 'left' && index === 0) ||
      (direction === 'right' && index === slides.length - 1)
    ) {
      return;
    }
    const newSlides = [...slides];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;
    setSlides(newSlides);
  };

  const removeSlide = (id: string) => {
    setSlides((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSlideConfig = (updated: VideoSlide) => {
    setSlides((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingSlide(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get canvas aspect container style
  const getAspectContainerStyle = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[580px]';
      case '1:1':
        return 'aspect-square max-h-[520px]';
      case '4:5':
        return 'aspect-[4/5] max-h-[540px]';
      case '16:9':
        return 'aspect-[16/9] max-h-[460px] w-full';
      default:
        return 'aspect-[9/16] max-h-[580px]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        {/* Caption Style Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Type className="h-3.5 w-3.5 text-rose-400" />
            <span>Altyazı Stili:</span>
          </span>
          <select
            value={captionStyle}
            onChange={(e) => setCaptionStyle(e.target.value as CaptionStyle)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white focus:border-rose-500 focus:outline-none"
          >
            <option value="card-glass">Buzlu Cam Kartı (Glassmorphism)</option>
            <option value="bottom-banner">Alt Şerit (Cine Banner)</option>
            <option value="minimal-dark">Minimal Koyu Rozet</option>
          </select>
        </div>

        {/* Music Sound Selector */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={audioFileInputRef}
            accept="audio/*"
            onChange={handleAudioFileUpload}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            <Music className="h-3.5 w-3.5 text-rose-400" />
            <select
              value={audioTrackId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'track-custom' && !audioEngine.getCustomAudioName()) {
                  audioFileInputRef.current?.click();
                } else {
                  setAudioTrackId(val);
                }
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white focus:border-rose-500 focus:outline-none"
            >
              {AUDIO_TRACKS.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.id === 'track-custom' && audioEngine.getCustomAudioName()
                    ? `🎵 ${audioEngine.getCustomAudioName()} (Yüklendi)`
                    : `${track.name} (${track.genre})`}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition"
              title="Kendi MP3/WAV Müzik Dosyanı Yükle"
            >
              <Upload className="h-3 w-3 text-rose-400" />
              <span>MP3 Yükle</span>
            </button>
          </div>

          {/* Mute & Volume */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="rounded-lg p-1.5 text-slate-300 hover:text-white hover:bg-slate-800"
              title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-red-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-emerald-400" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : audioVolume}
              onChange={(e) => {
                setAudioVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 accent-rose-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Action: Export Modal Trigger */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
        >
          <Download className="h-4 w-4" />
          <span>MP4 Dışa Aktar</span>
        </button>
      </div>

      {/* Main Studio Viewport (Canvas Player) */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl">
        {/* Video Canvas Container */}
        <div
          className={`relative overflow-hidden rounded-2xl border-2 border-slate-800 bg-black shadow-2xl flex items-center justify-center ${getAspectContainerStyle()}`}
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full object-contain"
          />

          {/* Click canvas to toggle play/pause */}
          <button
            onClick={togglePlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/80 backdrop-blur-md text-white shadow-xl">
              {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
            </div>
          </button>
        </div>

        {/* Player Controls Bar */}
        <div className="mt-5 w-full max-w-2xl space-y-2">
          {/* Scrubber Progress Bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold text-rose-400">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={totalDuration}
              step={0.05}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <span className="text-xs font-mono font-medium text-slate-400">
              {formatTime(totalDuration)}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={() => handleSeek(0)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Başa Sar"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={togglePlay}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-500/30 hover:brightness-110 active:scale-95 transition"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Durdur</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Oynat</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Timeline & Storyboard Strip */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Video Zaman Çizelgesi (Storyboard)</h3>
            <span className="text-xs text-slate-400">({totalDuration.toFixed(1)} saniye)</span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSlides((prev) => [...prev].reverse())}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white px-2.5 py-1 text-xs font-semibold text-slate-200 border border-slate-700 transition shadow-sm"
              title="Slaytların sırasını baştan sona tersine çevir"
            >
              <ArrowDownUp className="h-3.5 w-3.5 text-rose-400" />
              <span>Sırayı Ters Çevir</span>
            </button>
            <span className="text-xs font-semibold text-slate-300 ml-1">Tüm Slayt Süresi:</span>
            <div className="flex items-center gap-1">
              {[2.0, 3.0, 4.0, 5.0].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setSlides((prev) => prev.map((s) => ({ ...s, duration: dur })))}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[11px] font-bold text-slate-200 border border-slate-700 transition"
                  title={`Tüm fotoğrafların süresini ${dur} sn yap`}
                >
                  {dur.toFixed(1)}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal Timeline Track */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-1 px-1">
          {/* 1. Intro Card (if enabled) */}
          {intro.enabled && (
            <div className="relative flex shrink-0 flex-col items-center justify-between rounded-xl border border-rose-500/40 bg-slate-950 p-2.5 w-32 h-36 shadow-lg shadow-rose-500/5">
              <div className="flex items-center justify-between w-full text-[10px] font-bold text-rose-400">
                <span>GİRİŞ</span>
                <span>{intro.duration.toFixed(1)}s</span>
              </div>
              <div className="flex flex-col items-center justify-center my-auto text-center">
                <Sparkles className="h-6 w-6 text-rose-400 mb-1" />
                <span className="text-[11px] font-bold text-white line-clamp-1">
                  {intro.title || 'Açılış'}
                </span>
                <span className="text-[9px] text-slate-400">{intro.transition}</span>
              </div>
              <div className="text-[9px] text-slate-500 uppercase font-semibold">Intro Kartı</div>
            </div>
          )}

          {/* Connector arrow */}
          {intro.enabled && slides.length > 0 && (
            <div className="flex items-center text-slate-600 shrink-0">
              <Shuffle className="h-3.5 w-3.5 text-rose-400" />
            </div>
          )}

          {/* 2. Slide Cards */}
          {slides.map((slide, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === slides.length - 1;

            return (
              <React.Fragment key={slide.id}>
                <div
                  onClick={() => setSelectedSlideId(slide.id)}
                  className={`group relative flex shrink-0 flex-col overflow-hidden rounded-xl border transition-all w-36 h-40 bg-slate-950 cursor-pointer ${
                    selectedSlideId === slide.id
                      ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-xl'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Slide Image */}
                  <div className="relative h-24 w-full overflow-hidden bg-slate-900">
                    {slide.posts && slide.posts.length > 1 ? (
                      <div className="grid grid-cols-2 h-full w-full gap-0.5">
                        {slide.posts.slice(0, 4).map((p, pIdx) => (
                          <img
                            key={pIdx}
                            src={p.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ))}
                      </div>
                    ) : (
                      <img
                        src={slide.post.imageUrl}
                        alt={slide.captionText}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      #{idx + 1}
                    </div>
                    <div className="absolute top-1 right-1 rounded bg-rose-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {slide.duration.toFixed(1)}s
                    </div>
                    {slide.posts && slide.posts.length > 1 && (
                      <div className="absolute bottom-1 left-1 rounded bg-sky-500/90 px-1.5 py-0.5 text-[8px] font-bold text-white shadow">
                        Grup ({slide.posts.length} Görsel)
                      </div>
                    )}
                  </div>

                  {/* Slide Caption snippet & Controls */}
                  <div className="p-2 flex flex-col justify-between flex-1">
                    <div>
                      {slide.groupTitle && (
                        <span className="block text-[9px] font-bold text-rose-400 line-clamp-1 truncate">
                          🏷 {slide.groupTitle}
                        </span>
                      )}
                      <p className="text-[10px] text-slate-300 line-clamp-1">
                        {slide.captionText || 'Açıklama'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSlide(idx, 'left');
                          }}
                          disabled={isFirst}
                          className="rounded p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
                          title="Sola Taşı"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSlide(idx, 'right');
                          }}
                          disabled={isLast}
                          className="rounded p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
                          title="Sağa Taşı"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSlide(slide);
                          }}
                          className="rounded p-1 text-slate-400 hover:text-rose-400"
                          title="Süreyi ve Metni Düzenle"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSlide(slide.id);
                          }}
                          className="rounded p-1 text-slate-400 hover:text-red-400"
                          title="Slaytı Sil"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transition Indicator between slides */}
                {!isLast && (
                  <div className="flex flex-col items-center justify-center shrink-0 text-slate-500">
                    <Shuffle className="h-3.5 w-3.5 text-rose-400" />
                    <span className="text-[9px] text-slate-400 font-semibold">{slide.transition}</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Connector arrow */}
          {outro.enabled && slides.length > 0 && (
            <div className="flex items-center text-slate-600 shrink-0">
              <Shuffle className="h-3.5 w-3.5 text-rose-400" />
            </div>
          )}

          {/* 3. Outro Card (if enabled) */}
          {outro.enabled && (
            <div className="relative flex shrink-0 flex-col items-center justify-between rounded-xl border border-rose-500/40 bg-slate-950 p-2.5 w-32 h-36 shadow-lg shadow-rose-500/5">
              <div className="flex items-center justify-between w-full text-[10px] font-bold text-rose-400">
                <span>ÇIKIŞ</span>
                <span>{outro.duration.toFixed(1)}s</span>
              </div>
              <div className="flex flex-col items-center justify-center my-auto text-center">
                <Sparkles className="h-6 w-6 text-rose-400 mb-1" />
                <span className="text-[11px] font-bold text-white line-clamp-1">
                  {outro.title || outro.headline || 'TEŞEKKÜRLER'}
                </span>
                <span className="text-[9px] text-slate-400">{outro.transition}</span>
              </div>
              <div className="text-[9px] text-slate-500 uppercase font-semibold">Outro Kartı</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Slide Quick Edit */}
      {editingSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-rose-400" />
                Slayt Ayarlarını Düzenle
              </h3>
              <button
                onClick={() => setEditingSlide(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Kapat
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Duration */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Fotoğraf Gösterim Süresi:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold">{editingSlide.duration.toFixed(1)} sn</span>
                    <button
                      type="button"
                      onClick={() => {
                        const dur = editingSlide.duration;
                        setSlides((prev) => prev.map((s) => ({ ...s, duration: dur })));
                      }}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-0.5 text-[10px] font-medium transition"
                      title="Bu süreyi tüm slaytlara uygula"
                    >
                      Tümüne Uygula
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={10.0}
                  step={0.5}
                  value={editingSlide.duration}
                  onChange={(e) =>
                    setEditingSlide({ ...editingSlide, duration: parseFloat(e.target.value) })
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              {/* 1. Grup Başlığı (Fotoğrafların Üstünde) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-rose-400" />
                    <span>Grup Başlığı (Fotoğrafların Üstünde)</span>
                  </span>
                  <span className="text-[10px] text-rose-400 font-medium">Logonun yanında ortalı</span>
                </label>
                <input
                  type="text"
                  value={editingSlide.groupTitle || ''}
                  onChange={(e) =>
                    setEditingSlide({
                      ...editingSlide,
                      groupTitle: e.target.value,
                      groupName: e.target.value,
                    })
                  }
                  placeholder="Örn: FAALİYET TANITIMI"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Fotoğrafların üstünde logonun sağında fotoğraflar ile ortalı olarak gösterilecek başlık.
                </p>
              </div>

              {/* 2. Grup Açıklaması (Fotoğrafların Altında) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5 text-sky-400" />
                    <span>Grup Açıklaması (Fotoğrafların Altında)</span>
                  </span>
                  <span className="text-[10px] text-sky-400 font-medium">Fotoğrafların altında modern altyazı</span>
                </label>
                <textarea
                  value={editingSlide.captionText}
                  onChange={(e) =>
                    setEditingSlide({ ...editingSlide, captionText: e.target.value })
                  }
                  rows={3}
                  placeholder="Videoda fotoğrafların altında yer alacak detaylı açıklama..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Fotoğrafların altında zarif punto tasarımıyla yer alacak altyazı metni.
                </p>
              </div>

              {/* Transition effect */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Bu Slayttan Sonraki Geçiş Efekti</span>
                  <button
                    type="button"
                    onClick={() => {
                      const trans = editingSlide.transition;
                      setSlides((prev) => prev.map((s) => ({ ...s, transition: trans })));
                    }}
                    className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-0.5 text-[10px] font-medium transition"
                    title="Bu geçiş efektini tüm slaytlara uygula"
                  >
                    Tümüne Uygula
                  </button>
                </div>
                <select
                  value={editingSlide.transition}
                  onChange={(e) =>
                    setEditingSlide({
                      ...editingSlide,
                      transition: e.target.value as TransitionType,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="fade">Silinerek Geçiş (Fade / Cross-Dissolve)</option>
                  <option value="zoom-in">Yakınlaşma (Zoom In)</option>
                  <option value="zoom-out">Uzaklaşma (Zoom Out)</option>
                  <option value="slide-left">Sola Kayma</option>
                  <option value="slide-right">Sağa Kayma</option>
                  <option value="blur">Bulanıklık (Blur)</option>
                  <option value="flash">Beyaz Flaş (Flash)</option>
                  <option value="wipe-right">Sağa Silme (Wipe)</option>
                </select>
              </div>

              {/* Ken Burns Motion */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Kamera Hareketi (Ken Burns)
                </label>
                <select
                  value={editingSlide.zoomEffect}
                  onChange={(e) =>
                    setEditingSlide({
                      ...editingSlide,
                      zoomEffect: e.target.value as VideoSlide['zoomEffect'],
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="ken-burns-in">Yavaşça Yakınlaş (Zoom In)</option>
                  <option value="ken-burns-out">Yavaşça Uzaklaş (Zoom Out)</option>
                  <option value="static">Sabit Kamera</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSlide.showCaption}
                    onChange={(e) =>
                      setEditingSlide({ ...editingSlide, showCaption: e.target.checked })
                    }
                    className="accent-rose-500"
                  />
                  <span>Altyazıyı Göster</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSlide.showAuthorBadge}
                    onChange={(e) =>
                      setEditingSlide({ ...editingSlide, showAuthorBadge: e.target.checked })
                    }
                    className="accent-rose-500"
                  />
                  <span>Yazar Rozetini Göster</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingSlide(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => updateSlideConfig(editingSlide)}
                className="rounded-xl bg-rose-500 hover:bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-500/25"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
