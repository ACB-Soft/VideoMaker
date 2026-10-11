import {
  InstagramPost,
  VideoSlide,
  MediaGroup,
  IntroConfig,
  OutroConfig,
  AspectRatioType,
  CaptionStyle,
} from '../types/video';

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
  imageUrl?: string; // Optional (if present from previous base64 or relative url)
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
    return post.filename.trim();
  }
  if (post.imageUrl && !post.imageUrl.startsWith('data:') && !post.imageUrl.startsWith('blob:')) {
    const clean = post.imageUrl.split('?')[0].replace(/\\/g, '/');
    const leaf = clean.split('/').pop();
    if (leaf && leaf.includes('.')) return leaf.toLowerCase().trim();
  }
  return `foto_${index + 1}.jpg`;
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
    };
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
  } catch (err: any) {
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
      ? parsed.items
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
  // Map files by lowercase clean name
  const fileMap = new Map<string, File>();
  const baseNameMap = new Map<string, File>();

  files.forEach((f) => {
    const fullName = f.name.toLowerCase().trim();
    const leaf = fullName.split('/').pop()?.split('\\').pop() || fullName;
    fileMap.set(leaf, f);

    // Also index basename without extension (e.g. "pics1" for "pics1.jpg")
    const base = leaf.replace(/\.[^/.]+$/, '');
    baseNameMap.set(base, f);
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

    // 2. Basename match without extension
    if (!file) {
      file = baseNameMap.get(targetBase);
    }

    if (file) {
      usedFileNames.add(file.name.toLowerCase().trim());
      const objectUrl = URL.createObjectURL(file);
      matchedPosts.push({
        id: `backup-post-${idx}-${Date.now()}`,
        filename: file.name,
        imageUrl: objectUrl,
        caption: item.caption,
        groupTitle: item.groupTitle,
        groupName: item.groupName,
        groupId: item.groupId,
        duration: item.duration,
        date: item.date,
        tags: item.tags,
      });
    } else if (item.imageUrl && (item.imageUrl.startsWith('data:') || item.imageUrl.startsWith('http'))) {
      matchedPosts.push({
        id: `backup-post-${idx}-${Date.now()}`,
        filename: item.filename,
        imageUrl: item.imageUrl,
        caption: item.caption,
        groupTitle: item.groupTitle,
        groupName: item.groupName,
        groupId: item.groupId,
        duration: item.duration,
        date: item.date,
        tags: item.tags,
      });
    } else {
      missingFilenames.push(item.filename);
    }
  });

  // Calculate how many files were ignored (i.e. not in the backup)
  const ignoredCount = Math.max(0, files.length - usedFileNames.size);

  return {
    posts: matchedPosts,
    matchedCount: matchedPosts.length,
    ignoredCount,
    missingFilenames,
  };
}
