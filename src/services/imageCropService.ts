import { ImageCropData } from '../types/video';

export interface CropPreset {
  id: string;
  label: string;
  ratio?: number; // width / height
  description: string;
}

export const CROP_PRESETS: CropPreset[] = [
  { id: 'free', label: 'Serbest', description: 'Serbest Boyutlandırma' },
  { id: '1:1', label: '1:1 Kare', ratio: 1 / 1, description: 'Instagram Kare Akış' },
  { id: '4:3', label: '4:3', ratio: 4 / 3, description: 'Standart Fotoğraf' },
  { id: '16:9', label: '16:9', ratio: 16 / 9, description: 'Geniş Ekran / Sinematik' },
  { id: '9:16', label: '9:16', ratio: 9 / 16, description: 'Dikey Reels / Story / Shorts' },
  { id: '4:5', label: '4:5', ratio: 4 / 5, description: 'Instagram Dikey Portre' },
  { id: '3:4', label: '3:4', ratio: 3 / 4, description: 'Dikey Standart' },
];

/**
 * Calculates centered crop coordinates (in percentages 0-100) for a given aspect ratio
 */
export function calculateCenteredCrop(
  naturalWidth: number,
  naturalHeight: number,
  aspectKey: string
): ImageCropData {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { x: 0, y: 0, width: 100, height: 100, aspect: aspectKey, rotation: 0, zoom: 1 };
  }

  const preset = CROP_PRESETS.find((p) => p.id === aspectKey);
  if (!preset || !preset.ratio) {
    // Free aspect
    return { x: 0, y: 0, width: 100, height: 100, aspect: 'free', rotation: 0, zoom: 1 };
  }

  const targetRatio = preset.ratio;
  const currentRatio = naturalWidth / naturalHeight;

  let cropW: number;
  let cropH: number;

  if (currentRatio > targetRatio) {
    // Image is wider than target ratio: match height, crop width
    cropH = naturalHeight;
    cropW = cropH * targetRatio;
  } else {
    // Image is taller than target ratio: match width, crop height
    cropW = naturalWidth;
    cropH = cropW / targetRatio;
  }

  const x = Math.max(0, ((naturalWidth - cropW) / 2 / naturalWidth) * 100);
  const y = Math.max(0, ((naturalHeight - cropH) / 2 / naturalHeight) * 100);
  const width = Math.min(100, (cropW / naturalWidth) * 100);
  const height = Math.min(100, (cropH / naturalHeight) * 100);

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
    aspect: aspectKey,
    rotation: 0,
    zoom: 1,
  };
}

/**
 * Performs high-resolution canvas cropping of an image
 * Returns a high-quality JPEG Data URL
 */
export async function cropImageCanvas(
  imageSource: string,
  crop: ImageCropData
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;

        const rotation = (crop.rotation || 0) % 360;

        // Calculate source rectangle in pixel coordinates from percentages
        const xPercent = Math.max(0, Math.min(100, crop.x));
        const yPercent = Math.max(0, Math.min(100, crop.y));
        const wPercent = Math.max(1, Math.min(100 - xPercent, crop.width));
        const hPercent = Math.max(1, Math.min(100 - yPercent, crop.height));

        const srcX = Math.round((xPercent / 100) * naturalW);
        const srcY = Math.round((yPercent / 100) * naturalH);
        const srcW = Math.max(10, Math.round((wPercent / 100) * naturalW));
        const srcH = Math.max(10, Math.round((hPercent / 100) * naturalH));

        const canvas = document.createElement('canvas');

        // Swap dimensions if rotated 90 or 270 degrees
        if (rotation === 90 || rotation === 270) {
          canvas.width = srcH;
          canvas.height = srcW;
        } else {
          canvas.width = srcW;
          canvas.height = srcH;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSource);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (rotation !== 0) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          if (rotation === 90 || rotation === 270) {
            ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcH / 2, -srcW / 2, srcH, srcW);
          } else {
            ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
          }
        } else {
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas cropping failed, using original source:', err);
        resolve(imageSource);
      }
    };

    img.onerror = () => {
      resolve(imageSource);
    };

    img.src = imageSource;
  });
}
