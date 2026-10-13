import {
  InstagramPost,
  VideoSlide,
  MediaGroup,
  IntroConfig,
  OutroConfig,
  AspectRatioType,
  CaptionStyle,
  ImageCropData,
} from '../types/video';
import { cropImageCanvas } from './imageCropService';
import { isWidePhoto, buildPostGroupedSlides } from './photoGroupingService';

export interface BackupItemMetadata {
  filename: string;
  groupTitle: string;
  groupName: string;
  groupId?: string;
  caption: string;
  duration: number;
  order: number;
  date?: string;
  tags?: string[];
  imageUrl?: string; // Optional (if present from data url or previous export)
  crop?: ImageCropData; // Crop metadata (aspect ratio, coordinates)
  isWide?: boolean; // Standalone wide photo flag (e.g. 16:9)
  aspectRatio?: number;
}

export interface BackupSlideMetadata {
  id: string;
  type: 'post' | 'image' | 'group-collage';
  filenames: string[];
  duration: number;
  transition?: string;
  groupTitle?: string;
  groupName?: string;
  captionText: string;
  showCaption?: boolean;
  zoomEffect?: string;
  groupId?: string;
}

export interface ProjectBackupPayload {
  type: 'instagram-video-project-backup';
  version: '2.0';
  exportDate: string;
  projectName: string;
  totalPosts: number;
  totalSlides: number;
  defaultSlideDuration: number;
  aspectRatio: AspectRatioType;
  captionStyle: CaptionStyle;
  selectedPostIds?: string[];
  selectedFilenames?: string[];
  groups: MediaGroup[];
  items: BackupItemMetadata[];
  slides?: BackupSlideMetadata[];
  intro?: IntroConfig;
  outro?: OutroConfig;
  audioTrackId?: string;
  audioVolume?: number;
  isMuted?: boolean;
  // Legacy compatibility
  posts?: InstagramPost[];
}

/**
 * Extracts clean filename from post or path
 */
export function extractPostFilename(post: InstagramPost, index: number): string {
  if (post.filename && post.filename.trim()) {
    const raw = post.filename.trim();
    const leaf = raw.split('/').pop()?.split('\\').pop() || raw;
    return leaf;
  }
  if (post.imageUrl && !post.imageUrl.startsWith('data:') && !post.imageUrl.startsWith('blob:')) {
    const clean = post.imageUrl.split('?')[0].replace(/\\/g, '/');
    const leaf = clean.split('/').pop();
    if (leaf && leaf.includes('.')) return leaf.toLowerCase().trim();
  }
  return `foto_${index + 1}.jpg`;
}

/**
 * Generates an SVG Data URL placeholder card for backup items
 * so they render immediately in timeline and preview even before
 * the user links their local files.
 */
export function createPlaceholderImageSvg(filename: string, groupTitle?: string): string {
  const safeFilename = filename.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const title = (groupTitle || 'Yedek Verisi').trim();
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0b1120"/>
        <stop offset="50%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="100%" stop-color="#38bdf8"/>
      </linearGradient>
    </defs>
    
    <rect width="1080" height="1080" fill="url(#bgGrad)"/>
    
    <!-- Central Frame -->
    <rect x="70" y="70" width="940" height="940" rx="40" fill="url(#cardGrad)" stroke="#38bdf8" stroke-width="3" stroke-opacity="0.35" stroke-dasharray="16 10"/>
    
    <!-- Camera Icon Circle -->
    <g transform="translate(540, 410)">
      <circle cx="0" cy="0" r="90" fill="#38bdf8" fill-opacity="0.12" stroke="#38bdf8" stroke-width="3" stroke-opacity="0.5"/>
      <path d="M -38 -16 L -22 -36 L 22 -36 L 38 -16 L 54 -16 C 60 -16 65 -11 65 -5 L 65 42 C 65 48 60 53 54 53 L -54 53 C -60 53 -65 48 -65 42 L -65 -5 C -65 -11 -60 -16 -54 -16 Z" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="0" cy="18" r="24" fill="none" stroke="#38bdf8" stroke-width="6"/>
      <circle cx="38" cy="-3" r="5" fill="#38bdf8"/>
    </g>

    <!-- Filename text -->
    <text x="540" y="580" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" fill="#f8fafc" text-anchor="middle" letter-spacing="1">${safeFilename}</text>
    
    <!-- Group Badge -->
    <g transform="translate(540, 645)">
      <rect x="-260" y="-30" width="520" height="60" rx="30" fill="#0284c7" fill-opacity="0.22" stroke="#38bdf8" stroke-width="2.5" stroke-opacity="0.6"/>
      <text x="0" y="10" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700" fill="#38bdf8" text-anchor="middle">${safeTitle}</text>
    </g>

    <!-- Instructions -->
    <text x="540" y="760" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" fill="#94a3b8" text-anchor="middle">Fotoğraf Bağlantısı Bekleniyor</text>
    <text x="540" y="805" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#64748b" text-anchor="middle">Yedek yüklendi - Bilgisayardan dosya seçilince görsel anında aktif olur</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Creates lightweight, metadata-only JSON backup (no base64 overhead!)
 */
export function createLightweightBackupData(params: {
  posts: InstagramPost[];
  slides: VideoSlide[];
  selectedPostIds: string[];
  groups: MediaGroup[];
  intro: IntroConfig;
  outro: OutroConfig;
  aspectRatio: AspectRatioType;
  captionStyle: CaptionStyle;
  defaultSlideDuration: number;
  audioTrackId?: string;
  audioVolume?: number;
  isMuted?: boolean;
}): ProjectBackupPayload {
  const {
    posts,
    slides,
    selectedPostIds,
    groups,
    intro,
    outro,
    aspectRatio,
    captionStyle,
    defaultSlideDuration,
    audioTrackId,
    audioVolume,
    isMuted,
  } = params;

  // Create lightweight item entries with exact filenames, titles, captions, and durations
  const postToFilenameMap = new Map<string, string>();

  const items: BackupItemMetadata[] = posts.map((post, idx) => {
    const filename = extractPostFilename(post, idx);
    postToFilenameMap.set(post.id, filename);

    return {
      filename,
      groupTitle: post.groupTitle || post.groupName || 'Faaliyet Tanıtımı',
      groupName: post.groupName || post.groupTitle || 'Faaliyet Tanıtımı',
      groupId: post.groupId,
      caption: post.caption || '',
      duration: post.duration || defaultSlideDuration,
      order: idx + 1,
      date: post.date,
      tags: post.tags,
      crop: post.crop,
      isWide: isWidePhoto(post),
      aspectRatio: post.aspectRatio,
    };
  });

  // Track filenames of selected posts
  const selectedFilenames: string[] = [];
  posts.forEach((p, idx) => {
    if (selectedPostIds.includes(p.id)) {
      selectedFilenames.push(extractPostFilename(p, idx));
    }
  });

  // Export slides with their assigned filenames and customized slide properties
  const backupSlides: BackupSlideMetadata[] = slides.map((slide, sIdx) => {
    const slideFilenames: string[] = [];
    if (slide.posts && slide.posts.length > 0) {
      slide.posts.forEach((p) => {
        const fn = postToFilenameMap.get(p.id) || extractPostFilename(p, 0);
        slideFilenames.push(fn);
      });
    } else if (slide.post) {
      const fn = postToFilenameMap.get(slide.post.id) || extractPostFilename(slide.post, 0);
      slideFilenames.push(fn);
    }

    return {
      id: slide.id || `slide-${sIdx}`,
      type: slide.type || 'image',
      filenames: slideFilenames,
      duration: slide.duration || defaultSlideDuration,
      transition: slide.transition,
      groupTitle: slide.groupTitle || slide.groupName,
      groupName: slide.groupName || slide.groupTitle,
      captionText: slide.captionText || '',
      showCaption: slide.showCaption !== undefined ? slide.showCaption : true,
      zoomEffect: slide.zoomEffect,
      groupId: slide.groupId,
    };
  });

  return {
    type: 'instagram-video-project-backup',
    version: '2.0',
    exportDate: new Date().toISOString(),
    projectName: 'Instagram Video Proje Yedeği',
    totalPosts: items.length,
    totalSlides: backupSlides.length,
    defaultSlideDuration,
    aspectRatio,
    captionStyle,
    selectedPostIds,
    selectedFilenames,
    groups,
    items,
    slides: backupSlides,
    intro,
    outro,
    audioTrackId,
    audioVolume,
    isMuted,
  };
}

/**
 * Triggers instant download of the lightweight .json file
 */
export function downloadProjectBackup(
  params: Parameters<typeof createLightweightBackupData>[0],
  fileNamePrefix: string = 'instagram_video_duzenleme_yedegi'
): ProjectBackupPayload {
  const data = createLightweightBackupData(params);
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `${fileNamePrefix}_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return data;
}

/**
 * Parses and validates project backup JSON
 */
export function parseProjectBackup(rawJson: string): ProjectBackupPayload {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Geçersiz JSON formatı. Lütfen geçerli bir .json dosyası seçin.');
  }

  // Handle v2.0 (items based) or v1.0 (posts based)
  if (
    parsed &&
    (parsed.type === 'instagram-video-project-backup' ||
      Array.isArray(parsed.items) ||
      Array.isArray(parsed.posts))
  ) {
    const rawItems: BackupItemMetadata[] = Array.isArray(parsed.items)
      ? parsed.items.map((it: any, idx: number) => ({
          filename: it.filename || `foto_${idx + 1}.jpg`,
          groupTitle: it.groupTitle || it.groupName || 'Tanıtım',
          groupName: it.groupName || it.groupTitle || 'Tanıtım',
          groupId: it.groupId,
          caption: it.caption || '',
          duration: it.duration || 3.0,
          order: it.order || idx + 1,
          date: it.date,
          tags: it.tags,
          imageUrl: it.imageUrl,
          crop: it.crop,
          isWide: it.isWide,
          aspectRatio: it.aspectRatio,
        }))
      : Array.isArray(parsed.posts)
      ? parsed.posts.map((p: any, idx: number) => ({
          filename: p.filename || extractPostFilename(p, idx),
          groupTitle: p.groupTitle || p.groupName || 'Tanıtım',
          groupName: p.groupName || p.groupTitle || 'Tanıtım',
          groupId: p.groupId,
          caption: p.caption || '',
          duration: p.duration || 3.0,
          order: idx + 1,
          date: p.date,
          tags: p.tags,
          imageUrl: p.imageUrl,
          crop: p.crop,
          isWide: p.isWide,
          aspectRatio: p.aspectRatio,
        }))
      : [];

    return {
      type: 'instagram-video-project-backup',
      version: parsed.version || '2.0',
      exportDate: parsed.exportDate || new Date().toISOString(),
      projectName: parsed.projectName || 'Instagram Video Projesi',
      totalPosts: rawItems.length,
      totalSlides: Array.isArray(parsed.slides) ? parsed.slides.length : 0,
      defaultSlideDuration: parsed.defaultSlideDuration || 3.0,
      aspectRatio: parsed.aspectRatio || '9:16',
      captionStyle: parsed.captionStyle || 'card-glass',
      selectedPostIds: parsed.selectedPostIds,
      selectedFilenames: parsed.selectedFilenames,
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      items: rawItems,
      slides: parsed.slides,
      intro: parsed.intro,
      outro: parsed.outro,
      audioTrackId: parsed.audioTrackId,
      audioVolume: parsed.audioVolume,
      isMuted: parsed.isMuted,
      posts: parsed.posts,
    };
  }

  throw new Error('Seçilen dosya geçerli bir proje yedeği formatında değil.');
}

/**
 * Creates immediately usable InstagramPost items from a backup payload.
 * If an item has no image URL yet, it receives a clean SVG placeholder
 * containing its filename and group title so timeline/preview never renders blank.
 */
export function createRestoredPostsFromBackup(backup: ProjectBackupPayload): InstagramPost[] {
  const items = backup.items || [];
  return items.map((item, idx) => {
    const hasRealImage =
      item.imageUrl &&
      (item.imageUrl.startsWith('data:') ||
        item.imageUrl.startsWith('blob:') ||
        item.imageUrl.startsWith('http'));

    const imgUrl = hasRealImage
      ? item.imageUrl!
      : createPlaceholderImageSvg(item.filename, item.groupTitle);

    return {
      id: `restored-post-${idx}`,
      filename: item.filename,
      imageUrl: imgUrl,
      caption: item.caption || '',
      groupTitle: item.groupTitle || item.groupName || 'Faaliyet Tanıtımı',
      groupName: item.groupName || item.groupTitle || 'Faaliyet Tanıtımı',
      groupId: item.groupId || 'group-default',
      duration: item.duration || backup.defaultSlideDuration || 3.0,
      date: item.date || 'Yedek',
      tags: item.tags || ['tanitim'],
      crop: item.crop,
      isWide: item.isWide,
      aspectRatio: item.aspectRatio,
    };
  });
}

/**
 * Reconstructs VideoSlide items from backup metadata and active posts.
 * Guarantees that slides are restored with exact user captions, durations,
 * group collages (3-in-1), and transitions.
 */
export function reconstructSlidesFromBackup(
  backup: ProjectBackupPayload,
  posts: InstagramPost[],
  defaultDuration: number
): VideoSlide[] {
  if (posts.length === 0) return [];

  // Index posts by filename and basename
  const postByFilename = new Map<string, InstagramPost>();
  const postByBasename = new Map<string, InstagramPost>();
  posts.forEach((p) => {
    if (p.filename) {
      const clean = p.filename.toLowerCase().trim();
      const leaf = clean.split('/').pop()?.split('\\').pop() || clean;
      const base = leaf.replace(/\.[^/.]+$/, '');
      postByFilename.set(leaf, p);
      postByBasename.set(base, p);
    }
  });

  // Strategy A: Reconstruct from saved backup.slides
  if (backup.slides && Array.isArray(backup.slides) && backup.slides.length > 0) {
    const slides: VideoSlide[] = [];

    backup.slides.forEach((bs, sIdx) => {
      const slidePosts: InstagramPost[] = [];
      if (Array.isArray(bs.filenames)) {
        bs.filenames.forEach((fn) => {
          const cleanFn = fn.toLowerCase().trim();
          const leaf = cleanFn.split('/').pop()?.split('\\').pop() || cleanFn;
          const base = leaf.replace(/\.[^/.]+$/, '');
          const match = postByFilename.get(leaf) || postByBasename.get(base);
          if (match && !slidePosts.some((p) => p.id === match.id)) {
            slidePosts.push(match);
          }
        });
      }

      if (slidePosts.length > 0) {
        // Enforce rule: wide photos (e.g. 16:9) must be standalone groups!
        const wideInSlide = slidePosts.filter(isWidePhoto);
        const standardInSlide = slidePosts.filter((p) => !isWidePhoto(p));

        const sharedTitle =
          bs.groupTitle ||
          bs.groupName ||
          slidePosts[0].groupTitle ||
          slidePosts[0].groupName ||
          'Faaliyet Tanıtımı';
        const sharedCaption =
          bs.captionText !== undefined ? bs.captionText : (slidePosts[0].caption || '');
        const duration =
          bs.duration || slidePosts[0].duration || backup.defaultSlideDuration || defaultDuration;

        // 1. Add standard photos if any
        if (standardInSlide.length > 0) {
          const primary = standardInSlide[0];
          slides.push({
            id: bs.id || `slide-restored-${sIdx}`,
            type: standardInSlide.length > 1 ? 'group-collage' : 'image',
            post: primary,
            posts: standardInSlide,
            duration,
            transition: (bs.transition as any) || 'fade',
            transitionDuration: 0.6,
            groupTitle: sharedTitle,
            groupName: sharedTitle,
            captionText: sharedCaption,
            showCaption: bs.showCaption !== undefined ? bs.showCaption : true,
            showAuthorBadge: false,
            zoomEffect: (bs.zoomEffect as any) || 'static',
            groupId: bs.groupId || primary.groupId,
          });
        }

        // 2. Add wide photos as standalone slides
        wideInSlide.forEach((wp, wIdx) => {
          slides.push({
            id: `slide-wide-${wp.id}-${sIdx}-${wIdx}`,
            type: 'image',
            post: wp,
            posts: [wp],
            duration,
            transition: (bs.transition as any) || 'fade',
            transitionDuration: 0.6,
            groupTitle: sharedTitle,
            groupName: sharedTitle,
            captionText: wp.caption || sharedCaption,
            showCaption: bs.showCaption !== undefined ? bs.showCaption : true,
            showAuthorBadge: false,
            zoomEffect: (bs.zoomEffect as any) || 'static',
            groupId: bs.groupId || wp.groupId,
          });
        });
      }
    });

    if (slides.length > 0) {
      return slides;
    }
  }

  // Strategy B: Group posts using buildPostGroupedSlides ensuring wide photos are alone
  // and photos belonging to the same post are grouped in 3s and shift cleanly on delete
  return buildPostGroupedSlides(
    posts,
    posts.map((p) => p.id),
    backup.defaultSlideDuration || defaultDuration
  );
}

/**
 * Matches computer image files with backup item metadata strictly by filename.
 * IMPORTANT: Only files listed in backup.items are loaded. Any extra files selected
 * from computer that are NOT in the backup are strictly ignored and filtered out.
 */
export function matchFilesWithBackup(
  backup: ProjectBackupPayload,
  files: File[]
): {
  posts: InstagramPost[];
  matchedCount: number;
  ignoredCount: number;
  missingFilenames: string[];
} {
  // Map files by lowercase clean name and basename
  const fileMap = new Map<string, File>();
  const baseNameMap = new Map<string, File>();

  files.forEach((f) => {
    const fullName = f.name.toLowerCase().trim();
    const leaf = fullName.split('/').pop()?.split('\\').pop() || fullName;
    fileMap.set(leaf, f);

    try {
      const decoded = decodeURIComponent(leaf);
      fileMap.set(decoded, f);
    } catch {}

    // Index without extension
    const base = leaf.replace(/\.[^/.]+$/, '');
    baseNameMap.set(base, f);

    // Also index relative path leaf if present (e.g. webkitRelativePath)
    if ((f as any).webkitRelativePath) {
      const rel = (f as any).webkitRelativePath.toLowerCase().replace(/\\/g, '/');
      const relLeaf = rel.split('/').pop();
      if (relLeaf) {
        fileMap.set(relLeaf, f);
        baseNameMap.set(relLeaf.replace(/\.[^/.]+$/, ''), f);
      }
    }
  });

  const matchedPosts: InstagramPost[] = [];
  const missingFilenames: string[] = [];
  const usedFileNames = new Set<string>();

  backup.items.forEach((item, idx) => {
    const target = item.filename.toLowerCase().trim();
    const targetLeaf = target.split('/').pop()?.split('\\').pop() || target;
    const targetBase = targetLeaf.replace(/\.[^/.]+$/, '');

    // 1. Exact full filename match
    let file = fileMap.get(targetLeaf);

    // 2. Basename match without extension (e.g. pics1.jpg vs pics1.png or pics1)
    if (!file) {
      file = baseNameMap.get(targetBase);
    }

    if (file) {
      usedFileNames.add(file.name.toLowerCase().trim());
      const objectUrl = URL.createObjectURL(file);
      matchedPosts.push({
        id: `restored-post-${idx}`,
        filename: file.name,
        imageUrl: objectUrl,
        originalImageUrl: objectUrl,
        crop: item.crop,
        caption: item.caption || '',
        groupTitle: item.groupTitle || item.groupName || 'Faaliyet Tanıtımı',
        groupName: item.groupName || item.groupTitle || 'Faaliyet Tanıtımı',
        groupId: item.groupId || 'group-default',
        duration: item.duration || backup.defaultSlideDuration || 3.0,
        date: item.date || 'Yedek',
        tags: item.tags,
      });
    } else if (item.imageUrl && (item.imageUrl.startsWith('data:') || item.imageUrl.startsWith('http'))) {
      matchedPosts.push({
        id: `restored-post-${idx}`,
        filename: item.filename,
        imageUrl: item.imageUrl,
        originalImageUrl: item.imageUrl,
        crop: item.crop,
        caption: item.caption || '',
        groupTitle: item.groupTitle || item.groupName || 'Faaliyet Tanıtımı',
        groupName: item.groupName || item.groupTitle || 'Faaliyet Tanıtımı',
        groupId: item.groupId || 'group-default',
        duration: item.duration || backup.defaultSlideDuration || 3.0,
        date: item.date || 'Yedek',
        tags: item.tags,
      });
    } else {
      // Keep as placeholder post so items are never lost from project
      missingFilenames.push(item.filename);
      matchedPosts.push({
        id: `restored-post-${idx}`,
        filename: item.filename,
        imageUrl: createPlaceholderImageSvg(item.filename, item.groupTitle),
        crop: item.crop,
        caption: item.caption || '',
        groupTitle: item.groupTitle || item.groupName || 'Faaliyet Tanıtımı',
        groupName: item.groupName || item.groupTitle || 'Faaliyet Tanıtımı',
        groupId: item.groupId || 'group-default',
        duration: item.duration || backup.defaultSlideDuration || 3.0,
        date: item.date || 'Yedek',
        tags: item.tags,
      });
    }
  });

  const actualConnectedCount = usedFileNames.size;
  const ignoredCount = Math.max(0, files.length - actualConnectedCount);

  return {
    posts: matchedPosts,
    matchedCount: actualConnectedCount,
    ignoredCount,
    missingFilenames,
  };
}

/**
 * Asynchronously applies saved crop rectangles to posts whose images are loaded.
 */
export async function applySavedCropsToPosts(posts: InstagramPost[]): Promise<InstagramPost[]> {
  const updated: InstagramPost[] = [];
  for (const p of posts) {
    if (p.crop && p.imageUrl && !p.imageUrl.startsWith('data:image/svg+xml')) {
      try {
        const croppedUrl = await cropImageCanvas(p.originalImageUrl || p.imageUrl, p.crop);
        updated.push({
          ...p,
          originalImageUrl: p.originalImageUrl || p.imageUrl,
          imageUrl: croppedUrl,
        });
        continue;
      } catch (err) {
        console.warn('Failed to apply crop on post:', p.filename, err);
      }
    }
    updated.push(p);
  }
  return updated;
}
