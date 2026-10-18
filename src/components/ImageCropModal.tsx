import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  RotateCw,
  RotateCcw,
  Crop,
  Layers,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Maximize2,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { InstagramPost, ImageCropData } from '../types/video';
import {
  CROP_PRESETS,
  calculateCenteredCrop,
  cropImageCanvas,
} from '../services/imageCropService';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: InstagramPost;
  onSaveCrop: (updatedPost: InstagramPost) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  post,
  onSaveCrop,
}) => {
  // Use original image if available to allow re-cropping without loss of quality
  const sourceImageUrl = post.originalImageUrl || post.imageUrl;

  const [activeAspect, setActiveAspect] = useState<string>(post.crop?.aspect || 'free');
  const [rotation, setRotation] = useState<number>(post.crop?.rotation || 0);
  const [crop, setCrop] = useState<ImageCropData>({
    x: post.crop?.x ?? 0,
    y: post.crop?.y ?? 0,
    width: post.crop?.width ?? 100,
    height: post.crop?.height ?? 100,
    aspect: post.crop?.aspect || 'free',
    rotation: post.crop?.rotation || 0,
    zoom: post.crop?.zoom || 1,
  });

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef<{
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    initialCrop: ImageCropData;
  } | null>(null);

  // Load natural dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    setNaturalSize({ width: nw, height: nh });

    // If no existing crop or full crop, and a default aspect was requested
    if (!post.crop && activeAspect !== 'free') {
      const initial = calculateCenteredCrop(nw, nh, activeAspect);
      setCrop(initial);
    }
  };

  // Switch aspect ratio preset
  const handleSelectPreset = (presetId: string) => {
    setActiveAspect(presetId);
    if (naturalSize.width > 0 && naturalSize.height > 0) {
      const newCrop = calculateCenteredCrop(naturalSize.width, naturalSize.height, presetId);
      setCrop({
        ...newCrop,
        rotation,
      });
    } else {
      setCrop((prev) => ({ ...prev, aspect: presetId }));
    }
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    setCrop((prev) => ({ ...prev, rotation: nextRot }));
  };

  // Reset to full image
  const handleResetCrop = () => {
    setActiveAspect('free');
    setRotation(0);
    setCrop({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      aspect: 'free',
      rotation: 0,
      zoom: 1,
    });
  };

  // Generate live preview when crop changes
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    const timer = setTimeout(async () => {
      try {
        const preview = await cropImageCanvas(sourceImageUrl, crop);
        if (!isCancelled) {
          setPreviewDataUrl(preview);
        }
      } catch {
        // ignore preview failure
      }
    }, 120);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [crop, sourceImageUrl, isOpen]);

  // Handle pointer down (drag / resize)
  const handlePointerDown = (
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w',
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...crop },
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current || !imageRef.current) return;
      const { mode, startX, startY, initialCrop } = isDraggingRef.current;

      const rect = imageRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const deltaXPercent = ((e.clientX - startX) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - startY) / rect.height) * 100;

      const preset = CROP_PRESETS.find((p) => p.id === activeAspect);
      const targetRatio = preset?.ratio;

      if (mode === 'move') {
        let newX = initialCrop.x + deltaXPercent;
        let newY = initialCrop.y + deltaYPercent;

        // Boundary clamp
        newX = Math.max(0, Math.min(newX, 100 - initialCrop.width));
        newY = Math.max(0, Math.min(newY, 100 - initialCrop.height));

        setCrop((prev) => ({
          ...prev,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
        }));
      } else {
        // Resizing
        let nextX = initialCrop.x;
        let nextY = initialCrop.y;
        let nextW = initialCrop.width;
        let nextH = initialCrop.height;

        if (mode.includes('e')) {
          nextW = Math.max(5, Math.min(100 - initialCrop.x, initialCrop.width + deltaXPercent));
        }
        if (mode.includes('s')) {
          nextH = Math.max(5, Math.min(100 - initialCrop.y, initialCrop.height + deltaYPercent));
        }
        if (mode.includes('w')) {
          const maxLeftDelta = initialCrop.x;
          const maxRightDelta = initialCrop.width - 5;
          const actualDelta = Math.max(-maxLeftDelta, Math.min(maxRightDelta, deltaXPercent));
          nextX = initialCrop.x + actualDelta;
          nextW = initialCrop.width - actualDelta;
        }
        if (mode.includes('n')) {
          const maxTopDelta = initialCrop.y;
          const maxBottomDelta = initialCrop.height - 5;
          const actualDelta = Math.max(-maxTopDelta, Math.min(maxBottomDelta, deltaYPercent));
          nextY = initialCrop.y + actualDelta;
          nextH = initialCrop.height - actualDelta;
        }

        // If locked aspect ratio, enforce aspect ratio based on natural image aspect
        if (targetRatio && naturalSize.width > 0 && naturalSize.height > 0) {
          const imageRatio = naturalSize.width / naturalSize.height;
          // In percentage space: (w% * imgW) / (h% * imgH) = targetRatio
          // => w% / h% = targetRatio / imageRatio
          const percentRatio = targetRatio / imageRatio;

          if (mode.includes('e') || mode.includes('w')) {
            nextH = nextW / percentRatio;
            if (nextY + nextH > 100) {
              nextH = 100 - nextY;
              nextW = nextH * percentRatio;
            }
          } else {
            nextW = nextH * percentRatio;
            if (nextX + nextW > 100) {
              nextW = 100 - nextX;
              nextH = nextW / percentRatio;
            }
          }
        }

        // Final boundary checks
        nextX = Math.max(0, Math.min(100 - 5, nextX));
        nextY = Math.max(0, Math.min(100 - 5, nextY));
        nextW = Math.max(5, Math.min(100 - nextX, nextW));
        nextH = Math.max(5, Math.min(100 - nextY, nextH));

        setCrop((prev) => ({
          ...prev,
          x: Math.round(nextX * 10) / 10,
          y: Math.round(nextY * 10) / 10,
          width: Math.round(nextW * 10) / 10,
          height: Math.round(nextH * 10) / 10,
        }));
      }
    },
    [activeAspect, naturalSize]
  );

  const handlePointerUp = () => {
    isDraggingRef.current = null;
  };

  // Save and apply crop
  const handleSave = async () => {
    try {
      setIsProcessing(true);
      const croppedUrl = await cropImageCanvas(sourceImageUrl, crop);

      const isWide =
        activeAspect === '16:9' ||
        activeAspect === '21:9' ||
        (activeAspect === 'free' && crop.width / crop.height >= 1.7);

      const updated: InstagramPost = {
        ...post,
        originalImageUrl: post.originalImageUrl || post.imageUrl,
        imageUrl: croppedUrl,
        isWide,
        crop: {
          ...crop,
          aspect: activeAspect,
          rotation,
        },
      };

      onSaveCrop(updated);
      onClose();
    } catch (err) {
      console.error('Kırpma kaydedilemedi:', err);
      alert('Görsel kırpılırken bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <Crop className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Fotoğrafı Kırp & Oranla</span>
                {naturalSize.width > 0 && (
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                    {naturalSize.width} × {naturalSize.height}px
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-1">
                {post.filename || post.caption || 'Fotoğraf Düzenleme'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRotate}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition"
              title="90° Saat Yönünde Döndür"
            >
              <RotateCw className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden sm:inline">Döndür (90°)</span>
            </button>

            <button
              type="button"
              onClick={handleResetCrop}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition"
              title="Kırpmayı Sıfırla (Tam Boyut)"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Sıfırla</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Crop Presets Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-400 mr-2">
              <span className="font-semibold text-slate-300">Hızlı Oranlar:</span>
            </div>

            <div className="flex items-center flex-wrap gap-1.5">
              {CROP_PRESETS.map((preset) => {
                const isActive = activeAspect === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition shadow-sm ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sky-500/25 ring-1 ring-sky-400'
                        : 'border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title={preset.description}
                  >
                    {preset.id === '1:1' && <Square className="h-3.5 w-3.5" />}
                    {preset.id === '16:9' && <RectangleHorizontal className="h-3.5 w-3.5" />}
                    {preset.id === '9:16' && <Smartphone className="h-3.5 w-3.5" />}
                    {preset.id === '4:3' && <RectangleHorizontal className="h-3.5 w-3.5" />}
                    {preset.id === '4:5' && <RectangleVertical className="h-3.5 w-3.5" />}
                    {preset.id === '3:4' && <RectangleVertical className="h-3.5 w-3.5" />}
                    {preset.id === 'free' && <Maximize2 className="h-3.5 w-3.5" />}
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Interactive Workspace */}
        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-hidden flex flex-col md:flex-row gap-5 items-center justify-center bg-slate-950">
          {/* Main Cropper Container */}
          <div
            ref={containerRef}
            className="relative flex-1 h-full w-full max-h-[520px] flex items-center justify-center overflow-hidden rounded-xl border border-slate-800/80 bg-black/60 select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="relative inline-block max-h-full max-w-full">
              <img
                ref={imageRef}
                src={sourceImageUrl}
                alt="Kırpılacak görsel"
                onLoad={handleImageLoad}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  maxHeight: '480px',
                  maxWidth: '100%',
                }}
                className="block object-contain transition-transform duration-200 pointer-events-none"
              />

              {/* Dimmed backdrop outside the crop frame (4 surrounding rectangles) */}
              {/* Top mask */}
              <div
                style={{ top: 0, left: 0, right: 0, height: `${crop.y}%` }}
                className="absolute bg-black/70 pointer-events-none transition-all"
              />
              {/* Bottom mask */}
              <div
                style={{
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${Math.max(0, 100 - crop.y - crop.height)}%`,
                }}
                className="absolute bg-black/70 pointer-events-none transition-all"
              />
              {/* Left mask */}
              <div
                style={{
                  top: `${crop.y}%`,
                  height: `${crop.height}%`,
                  left: 0,
                  width: `${crop.x}%`,
                }}
                className="absolute bg-black/70 pointer-events-none transition-all"
              />
              {/* Right mask */}
              <div
                style={{
                  top: `${crop.y}%`,
                  height: `${crop.height}%`,
                  right: 0,
                  width: `${Math.max(0, 100 - crop.x - crop.width)}%`,
                }}
                className="absolute bg-black/70 pointer-events-none transition-all"
              />

              {/* The Active Crop Box */}
              <div
                style={{
                  top: `${crop.y}%`,
                  left: `${crop.x}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`,
                }}
                onPointerDown={(e) => handlePointerDown('move', e)}
                className="absolute border-2 border-sky-400 shadow-2xl cursor-move touch-none"
              >
                {/* Rule-of-Thirds Grid */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div className="border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div className="border-b border-white/25" />
                  <div className="border-r border-white/25" />
                  <div className="border-r border-white/25" />
                  <div />
                </div>

                {/* Corner Resizing Handles */}
                {/* Top-Left */}
                <div
                  onPointerDown={(e) => handlePointerDown('nw', e)}
                  className="absolute -top-1.5 -left-1.5 h-4 w-4 rounded-sm bg-sky-400 border border-white cursor-nwse-resize shadow-md"
                />
                {/* Top-Right */}
                <div
                  onPointerDown={(e) => handlePointerDown('ne', e)}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-sm bg-sky-400 border border-white cursor-nesw-resize shadow-md"
                />
                {/* Bottom-Left */}
                <div
                  onPointerDown={(e) => handlePointerDown('sw', e)}
                  className="absolute -bottom-1.5 -left-1.5 h-4 w-4 rounded-sm bg-sky-400 border border-white cursor-nesw-resize shadow-md"
                />
                {/* Bottom-Right */}
                <div
                  onPointerDown={(e) => handlePointerDown('se', e)}
                  className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-sm bg-sky-400 border border-white cursor-nwse-resize shadow-md"
                />

                {/* Edge Handles */}
                <div
                  onPointerDown={(e) => handlePointerDown('n', e)}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-6 rounded bg-sky-400 cursor-ns-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown('s', e)}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-6 rounded bg-sky-400 cursor-ns-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown('w', e)}
                  className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 rounded bg-sky-400 cursor-ew-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown('e', e)}
                  className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 rounded bg-sky-400 cursor-ew-resize shadow"
                />
              </div>
            </div>
          </div>

          {/* Right Preview Column (Desktop) */}
          <div className="w-full md:w-56 shrink-0 flex flex-col items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="w-full text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Sonuç Önizlemesi
              </span>

              <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-700 bg-black/80 flex items-center justify-center">
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Kırpılmış önizleme"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-[11px] text-slate-500">Yükleniyor...</div>
                )}
              </div>

              <div className="mt-2 text-[11px] text-slate-300 font-mono">
                Oran:{' '}
                <strong className="text-sky-300">
                  {activeAspect === 'free' ? 'Serbest' : activeAspect}
                </strong>
                {rotation !== 0 && <span className="text-rose-400 ml-1.5">({rotation}°)</span>}
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center leading-relaxed">
              Mavi çerçeveyi sürükleyerek alanı kaydırabilir, köşelerden tutarak boyutu değiştirebilirsiniz.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3 bg-slate-950/70">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Vazgeç
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/25 transition active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Kırpılıyor...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Kırp & Uygula</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
