import { InstagramPost } from '../types/video';

export interface ParsedInstagramMediaItem {
  uri: string;
  filename: string;
  title: string;
  timestamp?: number;
  formattedDate?: string;
  matchedFile?: File;
  previewUrl?: string;
}

export interface ParsedInstagramPost {
  id: string;
  title: string;
  timestamp?: number;
  formattedDate: string;
  mediaItems: ParsedInstagramMediaItem[];
}

/**
 * Fixes Meta/Instagram JSON export encoding bug where UTF-8 bytes were exported as ISO-8859-1
 */
export function decodeMetaString(str: string): string {
  if (!str) return '';
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

/**
 * Formats a Unix timestamp (seconds or ms) into a clean Turkish date string
 */
export function formatInstagramTimestamp(timestamp?: number): string {
  if (!timestamp) return 'Instagram Gönderisi';
  const ms = timestamp > 1e11 ? timestamp : timestamp * 1000;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return 'Instagram Gönderisi';
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Extracts filename from URI, e.g. "media/posts/202310/3847291_1.jpg" -> "3847291_1.jpg"
 */
export function extractFilename(uri: string): string {
  if (!uri) return '';
  const parts = uri.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1].toLowerCase().trim();
}

/**
 * Parses raw Instagram export JSON string or parsed object
 */
export function parseInstagramExportJson(rawContent: string): ParsedInstagramPost[] {
  let data: any;
  try {
    data = JSON.parse(rawContent);
  } catch (err: any) {
    throw new Error('Geçersiz JSON formatı. Lütfen Instagram\'dan indirilen geçerli bir .json dosyası seçin.');
  }

  // Handle various wrapper shapes: Array directly, { posts: [...] }, { items: [...] }, { media: [...] }
  let rawList: any[] = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.posts)) rawList = data.posts;
    else if (Array.isArray(data.ig_posts)) rawList = data.ig_posts;
    else if (Array.isArray(data.items)) rawList = data.items;
    else if (Array.isArray(data.media)) rawList = data.media;
    else if (Array.isArray(data.photos)) rawList = data.photos;
    else {
      // Maybe an object with numeric keys or single item
      const values = Object.values(data);
      if (values.length > 0 && Array.isArray(values[0])) {
        rawList = values[0] as any[];
      }
    }
  }

  if (rawList.length === 0) {
    throw new Error('JSON dosyasında gönderi verisi bulunamadı. Lütfen "posts_1.json" veya "your_posts_1.json" dosyasını seçtiğinizden emin olun.');
  }

  const results: ParsedInstagramPost[] = [];

  rawList.forEach((item, index) => {
    if (!item) return;

    // Common fields
    const rawTitle = item.title || item.caption || item.text || '';
    const cleanTitle = decodeMetaString(rawTitle);
    const timestamp = item.creation_timestamp || item.taken_at || item.timestamp;
    const formattedDate = formatInstagramTimestamp(timestamp);

    const mediaItems: ParsedInstagramMediaItem[] = [];

    // Case 1: item has `media` array (Meta standard)
    if (Array.isArray(item.media) && item.media.length > 0) {
      item.media.forEach((m: any) => {
        const uri = m.uri || m.path || m.url || '';
        const mTitle = decodeMetaString(m.title || cleanTitle);
        const mTimestamp = m.creation_timestamp || timestamp;
        if (uri) {
          mediaItems.push({
            uri,
            filename: extractFilename(uri),
            title: mTitle || cleanTitle,
            timestamp: mTimestamp,
            formattedDate: formatInstagramTimestamp(mTimestamp),
          });
        }
      });
    }

    // Case 2: item has direct `uri` or `path`
    if (mediaItems.length === 0 && (item.uri || item.path || item.url)) {
      const uri = item.uri || item.path || item.url;
      mediaItems.push({
        uri,
        filename: extractFilename(uri),
        title: cleanTitle,
        timestamp,
        formattedDate,
      });
    }

    // Case 3: carousel or children
    if (Array.isArray(item.carousel_media) && item.carousel_media.length > 0) {
      item.carousel_media.forEach((c: any) => {
        const uri = c.uri || c.path || c.url || (c.image_versions2?.candidates?.[0]?.url) || '';
        if (uri) {
          mediaItems.push({
            uri,
            filename: extractFilename(uri),
            title: cleanTitle,
            timestamp,
            formattedDate,
          });
        }
      });
    }

    // Even if no media uri was parsed, if there's a title, create a record so images can be attached
    if (mediaItems.length === 0) {
      mediaItems.push({
        uri: `post_${index + 1}.jpg`,
        filename: `post_${index + 1}.jpg`,
        title: cleanTitle || `Instagram Gönderisi #${index + 1}`,
        timestamp,
        formattedDate,
      });
    }

    results.push({
      id: `ig-json-${Date.now()}-${index}`,
      title: cleanTitle || `Instagram Gönderisi #${index + 1}`,
      timestamp,
      formattedDate,
      mediaItems,
    });
  });

  return results;
}

/**
 * Matches a list of uploaded File objects to parsed Instagram posts by filename
 */
export function matchFilesWithInstagramPosts(
  parsedPosts: ParsedInstagramPost[],
  files: File[]
): {
  postsWithMedia: InstagramPost[];
  matchedCount: number;
  totalParsedMedia: number;
} {
  // Index files by lowercase filename
  const fileMap = new Map<string, File>();
  files.forEach((file) => {
    const name = file.name.toLowerCase().trim();
    fileMap.set(name, file);
    // Also index without extension or with partial relative path
    const parts = (file as any).webkitRelativePath
      ? (file as any).webkitRelativePath.toLowerCase().replace(/\\/g, '/').split('/')
      : [name];
    const cleanLeafName = parts[parts.length - 1];
    fileMap.set(cleanLeafName, file);
  });

  const postsWithMedia: InstagramPost[] = [];
  let matchedCount = 0;
  let totalParsedMedia = 0;

  parsedPosts.forEach((post, postIdx) => {
    // Generate a unique, consistent group for photos belonging to this same Instagram post
    const postGroupId = post.id || `ig-post-${postIdx}-${post.timestamp || Date.now()}`;
    const cleanPostName = post.title
      ? (post.title.length > 32 ? post.title.slice(0, 32).trim() + '...' : post.title)
      : (post.formattedDate ? `${post.formattedDate} Gönderisi` : `Gönderi #${postIdx + 1}`);

    post.mediaItems.forEach((mediaItem, mediaIdx) => {
      totalParsedMedia++;
      const targetFilename = mediaItem.filename.toLowerCase();

      // Look up matched file
      let matchedFile = fileMap.get(targetFilename);

      // If not directly found, try substring matching
      if (!matchedFile) {
        for (const [fname, file] of fileMap.entries()) {
          if (fname.includes(targetFilename) || targetFilename.includes(fname)) {
            matchedFile = file;
            break;
          }
        }
      }

      if (matchedFile) {
        matchedCount++;
        const objectUrl = URL.createObjectURL(matchedFile);
        const caption = mediaItem.title || post.title || 'Instagram Gönderisi';

        // Extract tags
        const tags = caption.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g)?.map((t) => t.replace('#', '')) || ['instagram'];

        postsWithMedia.push({
          id: `ig-media-${postIdx}-${mediaIdx}-${Date.now()}`,
          imageUrl: objectUrl,
          caption: caption,
          title: post.title,
          groupTitle: cleanPostName,
          groupId: postGroupId,
          groupName: cleanPostName,
          duration: 3.5,
          date: mediaItem.formattedDate || post.formattedDate,
          tags: tags.slice(0, 5),
          author: {
            username: 'instagram_export',
            fullName: 'Instagram',
            isVerified: true,
          },
        });
      }
    });
  });

  return {
    postsWithMedia,
    matchedCount,
    totalParsedMedia,
  };
}
