import {
  AspectRatioType,
  CaptionStyle,
  IntroConfig,
  OutroConfig,
  TransitionType,
  VideoResolutionQuality,
  VideoSlide,
} from '../types/video';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  time: number; // Current playback time in seconds
  intro: IntroConfig;
  slides: VideoSlide[];
  outro: OutroConfig;
  aspectRatio: AspectRatioType;
  captionStyle: CaptionStyle;
  resolutionQuality: VideoResolutionQuality;
}

export interface SegmentInfo {
  type: 'intro' | 'slide' | 'outro';
  slideIndex?: number;
  slide?: VideoSlide;
  startTime: number;
  endTime: number;
  duration: number;
  transition: TransitionType;
  transitionDuration: number;
}

export class VideoRenderer {
  private imageCache = new Map<string, HTMLImageElement>();
  private pendingLoads = new Set<string>();
  private currentIntroConfig: IntroConfig | null = null;
  private currentOutroConfig: OutroConfig | null = null;

  public getResolution(
    aspect: AspectRatioType,
    quality: VideoResolutionQuality = '1080p'
  ): { width: number; height: number } {
    if (quality === '360p') {
      switch (aspect) {
        case '9:16':
          return { width: 360, height: 640 };
        case '1:1':
          return { width: 360, height: 360 };
        case '4:5':
          return { width: 360, height: 450 };
        case '16:9':
          return { width: 640, height: 360 };
        default:
          return { width: 360, height: 640 };
      }
    }

    if (quality === '720p') {
      switch (aspect) {
        case '9:16':
          return { width: 720, height: 1280 };
        case '1:1':
          return { width: 720, height: 720 };
        case '4:5':
          return { width: 720, height: 900 };
        case '16:9':
          return { width: 1280, height: 720 };
        default:
          return { width: 720, height: 1280 };
      }
    }

    // Default: 1080p Full HD
    switch (aspect) {
      case '9:16':
        return { width: 1080, height: 1920 };
      case '1:1':
        return { width: 1080, height: 1080 };
      case '4:5':
        return { width: 1080, height: 1350 };
      case '16:9':
        return { width: 1920, height: 1080 };
      default:
        return { width: 1080, height: 1920 };
    }
  }

  public preloadImages(urls: string[]): Promise<void> {
    const promises = urls
      .filter(url => url && !this.imageCache.has(url))
      .map(url => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          if (url.startsWith('http://') || url.startsWith('https://')) {
            img.crossOrigin = 'anonymous';
          }
          img.onload = () => {
            this.imageCache.set(url, img);
            resolve();
          };
          img.onerror = () => {
            // Fallback: try loading without crossOrigin
            const fallback = new Image();
            fallback.onload = () => {
              this.imageCache.set(url, fallback);
              resolve();
            };
            fallback.onerror = () => {
              resolve();
            };
            fallback.src = url;
          };
          img.src = url;
        });
      });
    return Promise.all(promises).then(() => {});
  }

  public getImage(url: string | null): HTMLImageElement | null {
    if (!url) return null;
    let img = this.imageCache.get(url);
    if (!img && !this.pendingLoads.has(url)) {
      this.pendingLoads.add(url);
      const newImg = new Image();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        newImg.crossOrigin = 'anonymous';
      }
      newImg.onload = () => {
        this.imageCache.set(url, newImg);
        this.pendingLoads.delete(url);
      };
      newImg.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => {
          this.imageCache.set(url, fallback);
          this.pendingLoads.delete(url);
        };
        fallback.onerror = () => {
          this.pendingLoads.delete(url);
        };
        fallback.src = url;
      };
      newImg.src = url;
    }
    return img || null;
  }

  public calculateSegments(
    intro: IntroConfig,
    slides: VideoSlide[],
    outro: OutroConfig
  ): { segments: SegmentInfo[]; totalDuration: number } {
    const segments: SegmentInfo[] = [];
    let currentTime = 0;

    // 1. Intro
    if (intro.enabled && intro.duration > 0) {
      segments.push({
        type: 'intro',
        startTime: currentTime,
        endTime: currentTime + intro.duration,
        duration: intro.duration,
        transition: intro.transition,
        transitionDuration: Math.min(0.8, intro.duration * 0.4),
      });
      currentTime += intro.duration;
    }

    // 2. Slides
    slides.forEach((slide, idx) => {
      const dur = slide.duration || 3.0;
      segments.push({
        type: 'slide',
        slideIndex: idx,
        slide,
        startTime: currentTime,
        endTime: currentTime + dur,
        duration: dur,
        transition: slide.transition || 'fade',
        transitionDuration: Math.min(slide.transitionDuration || 0.6, dur * 0.4),
      });
      currentTime += dur;
    });

    // 3. Outro
    if (outro.enabled && outro.duration > 0) {
      segments.push({
        type: 'outro',
        startTime: currentTime,
        endTime: currentTime + outro.duration,
        duration: outro.duration,
        transition: outro.transition,
        transitionDuration: Math.min(0.8, outro.duration * 0.4),
      });
      currentTime += outro.duration;
    }

    return { segments, totalDuration: Math.max(0.1, currentTime) };
  }

  public renderFrame(ctxProps: RenderContext) {
    const { canvas, time, intro, slides, outro, aspectRatio, captionStyle, resolutionQuality } = ctxProps;
    this.currentIntroConfig = intro;
    this.currentOutroConfig = outro;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = this.getResolution(aspectRatio, resolutionQuality);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    const { segments, totalDuration } = this.calculateSegments(intro, slides, outro);
    if (segments.length === 0) {
      // Empty state
      this.drawEmptyPlaceholder(ctx, width, height);
      ctx.restore();
      return;
    }

    const clampedTime = Math.max(0, Math.min(time, totalDuration));

    // Find current active segment
    let activeIndex = segments.findIndex(
      seg => clampedTime >= seg.startTime && clampedTime <= seg.endTime
    );
    if (activeIndex === -1) {
      activeIndex = clampedTime >= totalDuration ? segments.length - 1 : 0;
    }

    const currentSeg = segments[activeIndex];
    const segElapsed = clampedTime - currentSeg.startTime;
    const segProgress = Math.max(0, Math.min(1, segElapsed / currentSeg.duration));

    // Check if we are in transition window into next segment
    const nextSeg = segments[activeIndex + 1];
    const transDur = currentSeg.transitionDuration;
    const timeUntilEnd = currentSeg.endTime - clampedTime;
    const isTransitioning = nextSeg && timeUntilEnd <= transDur;

    if (isTransitioning) {
      const transProgress = 1 - timeUntilEnd / transDur; // 0 to 1
      this.renderTransition(
        ctx,
        width,
        height,
        currentSeg,
        nextSeg,
        segProgress,
        transProgress,
        captionStyle,
        aspectRatio
      );
    } else {
      // Render single segment
      this.renderSegment(ctx, width, height, currentSeg, segProgress, captionStyle, aspectRatio);
    }

    ctx.restore();
  }

  private renderSegment(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    seg: SegmentInfo,
    progress: number,
    captionStyle: CaptionStyle,
    aspect: AspectRatioType
  ) {
    switch (seg.type) {
      case 'intro':
        this.drawIntro(ctx, width, height, seg, progress);
        break;
      case 'slide':
        if (seg.slide) {
          this.drawSlide(ctx, width, height, seg.slide, progress, captionStyle, aspect);
        }
        break;
      case 'outro':
        this.drawOutro(ctx, width, height, seg, progress);
        break;
    }
  }

  private renderTransition(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    fromSeg: SegmentInfo,
    toSeg: SegmentInfo,
    fromProgress: number,
    transProgress: number,
    captionStyle: CaptionStyle,
    aspect: AspectRatioType
  ) {
    const transitionType = fromSeg.transition;

    // Flash transition special handling
    if (transitionType === 'flash') {
      const targetSeg = transProgress < 0.5 ? fromSeg : toSeg;
      const prog = transProgress < 0.5 ? fromProgress : 0.05;
      this.renderSegment(ctx, width, height, targetSeg, prog, captionStyle, aspect);
      
      const flashAlpha = transProgress < 0.5 ? transProgress * 2 : (1 - transProgress) * 2;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, flashAlpha * 0.95)})`;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    // Prepare offscreen canvas or layered rendering
    // Layer 1: Render 'from'
    if (transitionType === 'fade') {
      // Silinerek Geçiş (Smooth Cross-Dissolve):
      // Draw the unified background first so canvas stays solid and vivid
      this.drawUnifiedBackground(ctx, width, height);

      // Departing slide smoothly fades out
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - transProgress);
      this.renderSegment(ctx, width, height, fromSeg, fromProgress, captionStyle, aspect);
      ctx.restore();

      // Incoming slide smoothly fades in
      ctx.save();
      ctx.globalAlpha = Math.min(1, transProgress);
      this.renderSegment(ctx, width, height, toSeg, 0.05, captionStyle, aspect);
      ctx.restore();
      return;
    }

    ctx.save();
    if (transitionType === 'slide-left') {
      ctx.translate(-transProgress * width, 0);
    } else if (transitionType === 'slide-right') {
      ctx.translate(transProgress * width, 0);
    } else if (transitionType === 'zoom-out') {
      const scale = 1 - transProgress * 0.25;
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = 1 - transProgress;
    } else {
      ctx.globalAlpha = 1;
    }
    this.renderSegment(ctx, width, height, fromSeg, fromProgress, captionStyle, aspect);
    ctx.restore();

    // Layer 2: Render 'to'
    ctx.save();
    if (transitionType === 'slide-left') {
      ctx.translate((1 - transProgress) * width, 0);
    } else if (transitionType === 'slide-right') {
      ctx.translate(-(1 - transProgress) * width, 0);
    } else if (transitionType === 'zoom-in') {
      const scale = 1.3 - transProgress * 0.3;
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = transProgress;
    } else if (transitionType === 'wipe-right') {
      ctx.beginPath();
      ctx.rect(0, 0, width * transProgress, height);
      ctx.clip();
    } else if (transitionType === 'blur') {
      ctx.globalAlpha = transProgress;
    } else {
      ctx.globalAlpha = transProgress;
    }

    this.renderSegment(ctx, width, height, toSeg, 0.05, captionStyle, aspect);
    ctx.restore();
  }

  private renderSingleImageFit(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | null,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    if (!img || !img.complete || img.naturalWidth <= 0) return;

    // Real dimensions fit (contain - preserving exact aspect ratio without cropping)
    const fitScale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const drawW = Math.round(img.naturalWidth * fitScale);
    const drawH = Math.round(img.naturalHeight * fitScale);
    const drawX = Math.round(x + (w - drawW) / 2);
    const drawY = Math.round(y + (h - drawH) / 2);

    ctx.save();
    // Soft shadow behind photo
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;

    // Dark frame backing
    this.roundRect(ctx, drawX, drawY, drawW, drawH, 16);
    ctx.fillStyle = '#020617';
    ctx.fill();

    // Clip to rounded rect and draw image
    ctx.save();
    this.roundRect(ctx, drawX, drawY, drawW, drawH, 16);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Subtle crisp border outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, drawX, drawY, drawW, drawH, 16);
    ctx.stroke();

    ctx.restore();
  }

  private drawUnifiedBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const intro = this.currentIntroConfig;
    const bgStyle = intro?.backgroundStyle || 'gradient-dark';

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (bgStyle === 'gradient-purple') {
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(0.5, '#4c1d95');
      bgGrad.addColorStop(1, '#0f172a');
    } else if (bgStyle === 'gradient-sunset') {
      bgGrad.addColorStop(0, '#431407');
      bgGrad.addColorStop(0.5, '#831843');
      bgGrad.addColorStop(1, '#1e1b4b');
    } else if (bgStyle === 'solid-black') {
      bgGrad.addColorStop(0, '#000000');
      bgGrad.addColorStop(1, '#090d16');
    } else if (bgStyle === 'gradient-light-slate') {
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(0.5, '#f1f5f9');
      bgGrad.addColorStop(1, '#e2e8f0');
    } else if (bgStyle === 'gradient-light-blue') {
      bgGrad.addColorStop(0, '#f0f9ff');
      bgGrad.addColorStop(0.5, '#e0f2fe');
      bgGrad.addColorStop(1, '#bae6fd');
    } else if (bgStyle === 'gradient-light-warm') {
      bgGrad.addColorStop(0, '#fffbe0');
      bgGrad.addColorStop(0.5, '#fef2f2');
      bgGrad.addColorStop(1, '#ffedd5');
    } else if (bgStyle === 'solid-white') {
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(1, '#f8fafc');
    } else {
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const isLight = bgStyle.startsWith('gradient-light') || bgStyle === 'solid-white';

    // Decorative soft ambient glows (identical across all slides, intro and outro)
    const glow1 = ctx.createRadialGradient(width * 0.25, height * 0.3, 10, width * 0.25, height * 0.3, width * 0.65);
    glow1.addColorStop(0, isLight ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.12)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width * 0.75, height * 0.7, 10, width * 0.75, height * 0.7, width * 0.65);
    glow2.addColorStop(0, isLight ? 'rgba(244, 63, 94, 0.20)' : 'rgba(244, 63, 94, 0.10)');
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);
  }

  private drawSlide(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    slide: VideoSlide,
    progress: number,
    captionStyle: CaptionStyle,
    aspect: AspectRatioType
  ) {
    const scale = width / 1080;

    // 1. Ortak Arkaplan Teması (Tüm sayfalarda aynı)
    this.drawUnifiedBackground(ctx, width, height);

    // 2. Sol Üst Kurumsal Logo (Büyük, prestijli ve net köşe logosu)
    const intro = this.currentIntroConfig;
    const logoImg = intro?.logoUrl ? this.getImage(intro.logoUrl) : null;
    const cornerLogoMultiplier = Math.min(1.5, Math.max(0.7, (intro?.logoScale || 3.2) / 2.5));
    const cornerLogoSize = Math.round(148 * scale * cornerLogoMultiplier);
    const cornerX = Math.round(width * 0.05 + cornerLogoSize / 2);
    const cornerY = Math.round(height * 0.035 + cornerLogoSize / 2);

    this.drawLogoPlateAndImage(
      ctx,
      logoImg,
      cornerX,
      cornerY,
      cornerLogoSize,
      'transparent',
      'none',
      0,
      intro?.logoCropPercent || 0
    );

    // 2.5. Grup Başlığı: Sol üstteki logonun hemen sağında, büyük punto ile
    const groupTitle = (slide.groupTitle || slide.groupName || slide.post.groupTitle || slide.post.groupName || 'Faaliyet Tanıtımı').trim();
    if (groupTitle) {
      this.drawGroupTitle(ctx, width, height, groupTitle, cornerX, cornerLogoSize, cornerY, scale);
    }

    // Determine images in this slide (Eski 3'lü yapı: her sayfada en çok 3 görsel)
    const rawPosts = (slide.posts && slide.posts.length > 0) ? slide.posts : [slide.post];
    const slidePosts = rawPosts.slice(0, 3); // En çok 3 görsel (eski 3'lü yapı)
    const imageCount = slidePosts.length;

    // Content area for image(s): below the top logo and group title, leaving space for bottom caption
    const hasCaption = !!(slide.captionText && slide.showCaption !== false && slide.captionText.trim().length > 0);
    const contentX = Math.round(width * 0.05);
    const contentY = Math.max(Math.round(cornerY + cornerLogoSize / 2 + 16 * scale), Math.round(height * 0.118));
    const contentW = Math.round(width * 0.90);
    // Arkaplan dolgusu olmadığı için altyazıya ayrılan kompakt alt boşluk (~65px)
    const estimatedCardHeight = hasCaption ? Math.round(65 * scale) : 0;
    const contentH = hasCaption
      ? Math.max(120, height - contentY - estimatedCardHeight - Math.round(16 * scale))
      : Math.max(150, height - contentY - Math.round(16 * scale));

    const gap = Math.round(14 * scale);

    if (imageCount === 1) {
      // 1 Görsel: ortalı ve gerçek boyutlarında (kırpma olmadan)
      const img = this.getImage(slidePosts[0].imageUrl);
      if (img && img.complete && img.naturalWidth > 0) {
        this.renderSingleImageFit(ctx, img, contentX, contentY, contentW, contentH);
      } else {
        this.drawLoadingIndicator(ctx, width, height);
      }
    } else if (imageCount === 2) {
      // 2 Görsel: Dikey oranlarda alt alta, yatayda yan yana
      if (aspect === '9:16' || aspect === '4:5') {
        const slotH = (contentH - gap) / 2;
        const img1 = this.getImage(slidePosts[0].imageUrl);
        const img2 = this.getImage(slidePosts[1].imageUrl);
        this.renderSingleImageFit(ctx, img1, contentX, contentY, contentW, slotH);
        this.renderSingleImageFit(ctx, img2, contentX, contentY + slotH + gap, contentW, slotH);
      } else {
        const slotW = (contentW - gap) / 2;
        const img1 = this.getImage(slidePosts[0].imageUrl);
        const img2 = this.getImage(slidePosts[1].imageUrl);
        this.renderSingleImageFit(ctx, img1, contentX, contentY, slotW, contentH);
        this.renderSingleImageFit(ctx, img2, contentX + slotW + gap, contentY, slotW, contentH);
      }
    } else {
      // 3 Görsel (Eski 3'lü yapı): Yatayda 3 sütun, dikeyde Üst 1 + Alt 2 düzeni
      if (aspect === '16:9') {
        const slotW = (contentW - gap * 2) / 3;
        const img1 = this.getImage(slidePosts[0].imageUrl);
        const img2 = this.getImage(slidePosts[1].imageUrl);
        const img3 = this.getImage(slidePosts[2].imageUrl);
        this.renderSingleImageFit(ctx, img1, contentX, contentY, slotW, contentH);
        this.renderSingleImageFit(ctx, img2, contentX + slotW + gap, contentY, slotW, contentH);
        this.renderSingleImageFit(ctx, img3, contentX + (slotW + gap) * 2, contentY, slotW, contentH);
      } else {
        const rowH = (contentH - gap) / 2;
        const slotW = (contentW - gap) / 2;
        const img1 = this.getImage(slidePosts[0].imageUrl);
        const img2 = this.getImage(slidePosts[1].imageUrl);
        const img3 = this.getImage(slidePosts[2].imageUrl);
        // Üst 1 tam genişlikte fit
        this.renderSingleImageFit(ctx, img1, contentX, contentY, contentW, rowH);
        // Alt 2 yan yana
        this.renderSingleImageFit(ctx, img2, contentX, contentY + rowH + gap, slotW, rowH);
        this.renderSingleImageFit(ctx, img3, contentX + slotW + gap, contentY + rowH + gap, slotW, rowH);
      }
    }

    // 3. Caption Overlay: Fotoğrafların altında, arkaplan dolgusu olmadan saf modern yazı
    if (hasCaption) {
      this.drawCaption(ctx, width, height, slide, progress, captionStyle);
    }
  }

  /**
   * Grup Başlığı: Sol üstteki logonun hemen sağında, büyük punto ile
   * Arkaplan dolgusu ve kırmızı nokta kaldırılmıştır.
   */
  private drawGroupTitle(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    title: string,
    cornerX: number,
    cornerLogoSize: number,
    centerY: number,
    scale: number
  ) {
    // Büyük ve prestijli punto (1080p'de 30px)
    const fontSize = Math.max(18, Math.round(30 * scale));

    ctx.save();
    ctx.font = `800 ${fontSize}px "Outfit", "Plus Jakarta Sans", sans-serif`;

    // Sol üstteki logonun hemen sağından başlar
    const titleX = cornerX + cornerLogoSize / 2 + Math.round(20 * scale);
    const maxTitleWidth = Math.max(150 * scale, width * 0.95 - titleX);

    let displayTitle = title;
    if (ctx.measureText(displayTitle).width > maxTitleWidth) {
      while (displayTitle.length > 3 && ctx.measureText(displayTitle + '...').width > maxTitleWidth) {
        displayTitle = displayTitle.slice(0, -1);
      }
      displayTitle += '...';
    }

    // Arkaplan dolgusu yok, kırmızı nokta yok: Logonun sağında saf, büyük ve okunaklı beyaz tipografi
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 14 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * scale;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayTitle, titleX, centerY);

    ctx.restore();
  }

  /**
   * Fotoğraf gruplarına ait açıklama yazısı: Fotoğrafların altında, arkaplan dolgusu olmadan, zarif ve modern punto ile
   */
  private drawCaption(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    slide: VideoSlide,
    progress: number,
    style: CaptionStyle
  ) {
    const text = slide.captionText?.trim();
    if (!text) return;

    const scale = width / 1080;

    // Küçültülmüş punto, modern ve zarif tipografi (1080p'de 16px)
    const fontSize = Math.max(12, Math.round(16 * scale));
    const lineHeight = Math.max(16, Math.round(24 * scale));
    const maxLines = 3;

    const marginX = Math.round(44 * scale);
    const availableWidth = width - marginX * 2;

    ctx.save();
    ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;

    const lines = this.wrapText(ctx, text, availableWidth, maxLines);
    if (lines.length === 0) {
      ctx.restore();
      return;
    }

    const textBlockHeight = lines.length * lineHeight;
    const startY = height - textBlockHeight - Math.round(22 * scale);

    // Arkaplan dolgusu yok: Saf ve şık gölgeli modern metin
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 12 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * scale;
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        width / 2,
        startY + fontSize * 0.9 + i * lineHeight
      );
    });

    ctx.restore();
  }

  private colorToRgba(colorStr: string, alpha: number): string {
    if (!colorStr || colorStr === 'transparent') return 'rgba(0,0,0,0)';
    if (colorStr.startsWith('#')) {
      let hex = colorStr.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map((c) => c + c).join('');
      }
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (colorStr.startsWith('rgb')) {
      const match = colorStr.match(/\d+/g);
      if (match && match.length >= 3) {
        return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
      }
    }
    return colorStr;
  }

  private drawLogoPlateAndImage(
    ctx: CanvasRenderingContext2D,
    logoImg: HTMLImageElement | null,
    centerX: number,
    centerY: number,
    logoSize: number,
    bgColor: string | undefined,
    bgBlend: 'soft-radial' | 'frosted-glass' | 'solid-circle' | 'none' | undefined,
    pulseOffset: number = 0,
    cropPercent: number = 0
  ) {
    const effectiveBg = bgColor && bgColor !== 'transparent' ? bgColor : null;
    const effectiveBlend = bgBlend || 'soft-radial';

    // 1. Soft-blended background plate that smoothly transitions into the video background
    if (effectiveBg && effectiveBlend !== 'none') {
      ctx.save();
      const plateRadius = (logoSize / 2) * 1.45;

      if (effectiveBlend === 'soft-radial') {
        // Feathered radial gradient: center is solid, outer perimeter fades completely to transparent
        const radial = ctx.createRadialGradient(
          centerX,
          centerY,
          plateRadius * 0.35,
          centerX,
          centerY,
          plateRadius
        );
        radial.addColorStop(0, this.colorToRgba(effectiveBg, 0.95));
        radial.addColorStop(0.65, this.colorToRgba(effectiveBg, 0.65));
        radial.addColorStop(0.85, this.colorToRgba(effectiveBg, 0.25));
        radial.addColorStop(1, this.colorToRgba(effectiveBg, 0));

        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(centerX, centerY, plateRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (effectiveBlend === 'frosted-glass') {
        ctx.fillStyle = this.colorToRgba(effectiveBg, 0.85);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 24;
        this.roundRect(
          ctx,
          centerX - plateRadius * 0.9,
          centerY - plateRadius * 0.9,
          plateRadius * 1.8,
          plateRadius * 1.8,
          32
        );
        ctx.fill();
        ctx.stroke();
      } else {
        // Solid circle with soft shadow
        ctx.fillStyle = effectiveBg;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(centerX, centerY, plateRadius * 0.88, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Draw Logo or Brand Mark
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 20;

      // Köşelerden / kenarlardan yüzdesel daraltma ve kırpma (0% - 45%)
      const clampedCrop = Math.max(0, Math.min(45, cropPercent || 0)) / 100;
      const sx = Math.round(logoImg.naturalWidth * clampedCrop);
      const sy = Math.round(logoImg.naturalHeight * clampedCrop);
      const sw = Math.max(1, Math.round(logoImg.naturalWidth * (1 - 2 * clampedCrop)));
      const sh = Math.max(1, Math.round(logoImg.naturalHeight * (1 - 2 * clampedCrop)));

      // Kırpılmış alanı tam en-boy oranını koruyarak yerleştir
      const fitScale = Math.min(logoSize / sw, logoSize / sh);
      const drawW = Math.round(sw * fitScale);
      const drawH = Math.round(sh * fitScale);

      ctx.drawImage(
        logoImg,
        sx,
        sy,
        sw,
        sh,
        centerX - drawW / 2,
        centerY - drawH / 2,
        drawW,
        drawH
      );
      ctx.restore();
    } else {
      this.drawLogoMark(ctx, centerX, centerY, logoSize + pulseOffset);
    }
  }

  private drawIntro(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    seg: SegmentInfo,
    progress: number
  ) {
    const intro = this.currentIntroConfig;
    const bgStyle = intro?.backgroundStyle || 'gradient-dark';
    const isLight = bgStyle.startsWith('gradient-light') || bgStyle === 'solid-white';

    // Ortak Arkaplan Teması (Tüm sayfalarda aynı)
    this.drawUnifiedBackground(ctx, width, height);

    // Dynamic scale/opacity
    const animScale = 0.9 + Math.min(progress * 1.5, 1) * 0.1;
    const animAlpha = Math.min(progress * 2, 1);
    const pulse = Math.sin(progress * Math.PI) * 15;

    ctx.save();
    ctx.globalAlpha = animAlpha;
    ctx.translate(width / 2, height / 2);
    ctx.scale(animScale, animScale);

    const scale = width / 1080;

    // Calculate logo size with smart scaling across all resolutions
    const rawScale = intro?.logoScale || 1.0;
    const baseLogoSize = Math.round(110 * rawScale * scale);
    const logoSize = Math.min(width * 0.70, baseLogoSize);
    const logoY = -logoSize / 2 - Math.round(35 * scale);

    const customLogoImg = intro?.logoUrl ? this.getImage(intro.logoUrl) : null;

    this.drawLogoPlateAndImage(
      ctx,
      customLogoImg,
      0,
      logoY,
      logoSize,
      intro?.logoBgColor,
      intro?.logoBgBlend,
      pulse * 0.2,
      intro?.logoCropPercent || 0
    );

    // Title (Giriş Ana Başlığı)
    const titleFontSize = Math.max(14, Math.round((intro?.titleFontSize || 56) * scale));
    const subtitleFontSize = Math.max(11, Math.round((intro?.subtitleFontSize || 32) * scale));

    const titleY = logoY + logoSize / 2 + Math.round(55 * scale);
    ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
    ctx.font = `800 ${titleFontSize}px "${intro?.fontFamily || 'Outfit'}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(intro?.title || 'FAALİYET TANITIMI', 0, titleY);

    // Subtitle (Giriş Alt Metni)
    if (intro?.subtitle) {
      ctx.fillStyle = isLight ? '#334155' : '#e2e8f0';
      ctx.font = `600 ${subtitleFontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(intro.subtitle, 0, titleY + Math.round(titleFontSize * 0.55 + subtitleFontSize * 0.75));
    }

    // Accent line
    const lineY = titleY + (intro?.subtitle ? Math.round(titleFontSize * 0.55 + subtitleFontSize * 1.7) : 55);
    const lineGrad = ctx.createLinearGradient(-150, 0, 150, 0);
    lineGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    lineGrad.addColorStop(0.5, '#38bdf8');
    lineGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-150, lineY);
    ctx.lineTo(150, lineY);
    ctx.stroke();

    ctx.restore();
  }

  private drawOutro(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    seg: SegmentInfo,
    progress: number
  ) {
    const outro = this.currentOutroConfig;
    const bgStyle = outro?.backgroundStyle || 'gradient-dark';
    const isLight = bgStyle.startsWith('gradient-light') || bgStyle === 'solid-white';

    // Ortak Arkaplan Teması (Giriş ile birebir aynı)
    this.drawUnifiedBackground(ctx, width, height);

    const animAlpha = Math.min(progress * 2, 1);

    ctx.save();
    ctx.globalAlpha = animAlpha;
    ctx.translate(width / 2, height / 2);

    const scale = width / 1080;

    // Calculate logo size with smart scaling (Giriş ile birebir aynı boyutta)
    const rawScale = outro?.logoScale || 1.0;
    const baseLogoSize = Math.round(110 * rawScale * scale);
    const logoSize = Math.min(width * 0.70, baseLogoSize);
    const logoY = -logoSize / 2 - Math.round(35 * scale);

    const customLogoImg = outro?.logoUrl ? this.getImage(outro.logoUrl) : null;

    this.drawLogoPlateAndImage(
      ctx,
      customLogoImg,
      0,
      logoY,
      logoSize,
      outro?.logoBgColor,
      outro?.logoBgBlend,
      0,
      outro?.logoCropPercent || 0
    );

    // Title (Kapanış Ana Başlığı - Giriş ile birebir aynı seçenek yapısı)
    const titleFontSize = Math.max(14, Math.round((outro?.titleFontSize || 56) * scale));
    const subtitleFontSize = Math.max(11, Math.round((outro?.subtitleFontSize || 32) * scale));
    const outroTitle = (outro?.title || outro?.headline || 'TEŞEKKÜRLER').trim();
    const outroSubtitle = (outro?.subtitle || outro?.callToAction || '').trim();

    const titleY = logoY + logoSize / 2 + Math.round(55 * scale);
    ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
    ctx.font = `800 ${titleFontSize}px "${outro?.fontFamily || 'Outfit'}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(outroTitle, 0, titleY);

    // Subtitle (Kapanış Alt Metni - Giriş ile birebir aynı)
    if (outroSubtitle) {
      ctx.fillStyle = isLight ? '#334155' : '#e2e8f0';
      ctx.font = `600 ${subtitleFontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(outroSubtitle, 0, titleY + Math.round(titleFontSize * 0.55 + subtitleFontSize * 0.75));
    }

    // Accent line (Giriş ile aynı estetik çizgi)
    const lineY = titleY + (outroSubtitle ? Math.round(titleFontSize * 0.55 + subtitleFontSize * 1.7) : 55);
    const lineGrad = ctx.createLinearGradient(-150, 0, 150, 0);
    lineGrad.addColorStop(0, 'rgba(244, 63, 94, 0)');
    lineGrad.addColorStop(0.5, '#f43f5e');
    lineGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-150, lineY);
    ctx.lineTo(150, lineY);
    ctx.stroke();

    ctx.restore();
  }

  private drawLogoMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    const half = size / 2;
    ctx.save();
    ctx.translate(x, y);

    // Rounded glowing squircle
    const grad = ctx.createLinearGradient(-half, half, half, -half);
    grad.addColorStop(0, '#f09433');
    grad.addColorStop(0.25, '#e6683c');
    grad.addColorStop(0.5, '#dc2743');
    grad.addColorStop(0.75, '#cc2366');
    grad.addColorStop(1, '#bc1888');

    ctx.fillStyle = grad;
    this.roundRect(ctx, -half, -half, size, size, size * 0.28);
    ctx.fill();

    // Camera white contour
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.08;
    this.roundRect(ctx, -half * 0.65, -half * 0.65, size * 0.65, size * 0.65, size * 0.18);
    ctx.stroke();

    // Lens
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
    ctx.stroke();

    // Flash dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(half * 0.45, -half * 0.45, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawEmptyPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Gönderi Seçilmedi', width / 2, height / 2 - 20);

    ctx.font = '400 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Lütfen sol sekmeden Instagram gönderilerini seçin.', width / 2, height / 2 + 25);
  }

  private drawLoadingIndicator(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Fotoğraf Yükleniyor...', width / 2, height / 2);
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
        if (lines.length === maxLines - 1) {
          break;
        }
      }
    }
    if (currentLine) {
      if (lines.length >= maxLines - 1 && words.length > lines.join(' ').split(' ').length) {
        lines.push(currentLine + '...');
      } else {
        lines.push(currentLine);
      }
    }
    return lines.slice(0, maxLines);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

export const videoRenderer = new VideoRenderer();
