import {
  InstagramPost,
  VideoSlide,
  MediaGroup,
  IntroConfig,
  OutroConfig,
  AspectRatioType,
  CaptionStyle,
} from '../types/video';

export interface ProjectBackupPayload {
  type: 'instagram-video-project-backup';
  version: '1.0';
  exportDate: string;
  projectName: string;
  totalPosts: number;
  totalSlides: number;
  defaultSlideDuration: number;
  aspectRatio: AspectRatioType;
  captionStyle: CaptionStyle;
  selectedPostIds: string[];
  groups: MediaGroup[];
  posts: InstagramPost[];
  slides: VideoSlide[];
  intro?: IntroConfig;
  outro?: OutroConfig;
  audioTrackId?: string;
  audioVolume?: number;
  isMuted?: boolean;
  // Instagram compatible format for external parser compatibility
  ig_posts?: Array<{
    title: string;
    caption: string;
    groupTitle?: string;
    duration?: number;
    creation_timestamp?: number;
    media: Array<{
      uri: string;
      title: string;
      duration?: number;
    }>;
  }>;
}

/**
 * Converts a blob URL or remote URL to a base64 Data URL so the backup is 100% self-contained
 */
async function convertUrlToDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : url);
      };
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Görsel base64 dönüşümü atlandı, orijinal URL korunuyor:', url, err);
    return url;
  }
}

/**
 * Prepares the backup payload by converting active post images to base64
 */
export async function createProjectBackupData(params: {
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
  onProgress?: (progress: number, total: number) => void;
}): Promise<ProjectBackupPayload> {
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
    onProgress,
  } = params;

  // Process posts and convert images to persistent data URLs
  const persistentPosts: InstagramPost[] = [];
  const total = posts.length;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    if (onProgress) onProgress(i + 1, total);

    let persistentImageUrl = post.imageUrl;
    if (post.imageUrl && (post.imageUrl.startsWith('blob:') || !post.imageUrl.startsWith('data:'))) {
      persistentImageUrl = await convertUrlToDataUrl(post.imageUrl);
    }

    persistentPosts.push({
      ...post,
      imageUrl: persistentImageUrl,
    });
  }

  // Create an image lookup map for fast slide updating
  const postImageMap = new Map<string, string>();
  persistentPosts.forEach((p) => postImageMap.set(p.id, p.imageUrl));

  // Sync slides with persistent images
  const persistentSlides: VideoSlide[] = slides.map((slide) => {
    const updatedPost = slide.post
      ? {
          ...slide.post,
          imageUrl: postImageMap.get(slide.post.id) || slide.post.imageUrl,
        }
      : slide.post;

    const updatedPosts = slide.posts
      ? slide.posts.map((p) => ({
          ...p,
          imageUrl: postImageMap.get(p.id) || p.imageUrl,
        }))
      : undefined;

    return {
      ...slide,
      post: updatedPost,
      posts: updatedPosts,
    };
  });

  // Build Instagram-compatible array for standard IG parsers
  const igPosts = persistentPosts.map((p, idx) => ({
    title: p.caption || p.title || p.groupTitle || `Gönderi #${idx + 1}`,
    caption: p.caption || '',
    groupTitle: p.groupTitle || p.groupName || 'Faaliyet Tanıtımı',
    duration: p.duration || defaultSlideDuration,
    creation_timestamp: Math.floor(Date.now() / 1000),
    media: [
      {
        uri: p.imageUrl || `post_${idx + 1}.jpg`,
        title: p.groupTitle || p.caption || '',
        duration: p.duration || defaultSlideDuration,
      },
    ],
  }));

  const payload: ProjectBackupPayload = {
    type: 'instagram-video-project-backup',
    version: '1.0',
    exportDate: new Date().toISOString(),
    projectName: 'Instagram Video Proje Yedeği',
    totalPosts: persistentPosts.length,
    totalSlides: persistentSlides.length,
    defaultSlideDuration,
    aspectRatio,
    captionStyle,
    selectedPostIds,
    groups,
    posts: persistentPosts,
    slides: persistentSlides,
    intro,
    outro,
    audioTrackId,
    audioVolume,
    isMuted,
    ig_posts: igPosts,
  };

  return payload;
}

/**
 * Triggers browser download of the backup JSON file
 */
export async function downloadProjectBackup(
  params: Parameters<typeof createProjectBackupData>[0],
  fileNamePrefix: string = 'instagram_video_duzenleme_yedegi'
): Promise<ProjectBackupPayload> {
  const data = await createProjectBackupData(params);
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
 * Validates and restores project backup data from raw JSON content
 */
export function parseProjectBackup(rawJson: string): ProjectBackupPayload {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err: any) {
    throw new Error('Geçersiz JSON formatı. Lütfen geçerli bir .json dosyası seçin.');
  }

  // Check if it's our direct backup format
  if (
    parsed &&
    (parsed.type === 'instagram-video-project-backup' ||
      (Array.isArray(parsed.posts) && parsed.posts.length > 0 && parsed.posts[0].imageUrl))
  ) {
    return {
      type: 'instagram-video-project-backup',
      version: parsed.version || '1.0',
      exportDate: parsed.exportDate || new Date().toISOString(),
      projectName: parsed.projectName || 'Instagram Video Projesi',
      totalPosts: parsed.posts.length,
      totalSlides: Array.isArray(parsed.slides) ? parsed.slides.length : 0,
      defaultSlideDuration: parsed.defaultSlideDuration || 3.0,
      aspectRatio: parsed.aspectRatio || '9:16',
      captionStyle: parsed.captionStyle || 'card-glass',
      selectedPostIds: Array.isArray(parsed.selectedPostIds)
        ? parsed.selectedPostIds
        : parsed.posts.map((p: any) => p.id),
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      posts: parsed.posts,
      slides: Array.isArray(parsed.slides) ? parsed.slides : [],
      intro: parsed.intro,
      outro: parsed.outro,
      audioTrackId: parsed.audioTrackId,
      audioVolume: parsed.audioVolume,
      isMuted: parsed.isMuted,
      ig_posts: parsed.ig_posts,
    };
  }

  throw new Error(
    'Seçilen dosya bu uygulamaya ait bir proje yedeği formatında değil. Standart Instagram indirme dosyası için "Instagram .JSON İçe Aktar" seçeneğini kullanabilirsiniz.'
  );
}
