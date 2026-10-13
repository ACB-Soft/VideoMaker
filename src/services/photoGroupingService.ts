import { InstagramPost, VideoSlide } from '../types/video';

// In-memory aspect cache for fast synchronous lookups
const imageAspectCache = new Map<string, number>();

/**
 * Checks if a given post is considered a "wide" photo (e.g. 16:9, 4:3 landscape, or ratio >= 1.25).
 * Wide photos MUST always be isolated in their own standalone slide (single photo),
 * never bundled into 2 or 3 photo groups.
 */
export function isWidePhoto(post: InstagramPost): boolean {
  if (post.isWide !== undefined) {
    return post.isWide;
  }

  // Check crop aspect ratio
  if (post.crop) {
    const aspect = post.crop.aspect;
    if (['16:9', '4:3', '3:2', '21:9', '16:10'].includes(aspect)) {
      return true;
    }
    if (['9:16', '1:1', '4:5', '3:4'].includes(aspect)) {
      return false;
    }
    if (post.crop.width && post.crop.height) {
      // If width % is substantially larger than height % in free crop
      const cropRatio = post.crop.width / post.crop.height;
      if (cropRatio >= 1.25) return true;
    }
  }

  // Check explicit aspect ratio property
  if (post.aspectRatio !== undefined) {
    return post.aspectRatio >= 1.25;
  }

  // Check cached natural dimensions
  if (post.imageUrl) {
    const cached = imageAspectCache.get(post.imageUrl);
    if (cached !== undefined) {
      return cached >= 1.25;
    }
  }

  return false;
}

/**
 * Registers an image aspect ratio into the fast cache
 */
export function registerImageAspect(url: string, naturalWidth: number, naturalHeight: number): boolean {
  if (!url || !naturalWidth || !naturalHeight) return false;
  const ratio = naturalWidth / naturalHeight;
  imageAspectCache.set(url, ratio);
  return ratio >= 1.25;
}

/**
 * Asynchronously detects image dimensions for a list of posts
 * and returns updated posts with isWide and aspectRatio set.
 */
export async function detectPostDimensions(posts: InstagramPost[]): Promise<InstagramPost[]> {
  const updates = await Promise.all(
    posts.map(async (post) => {
      if (post.isWide !== undefined && post.aspectRatio !== undefined) {
        return post;
      }
      if (!post.imageUrl || post.imageUrl.startsWith('data:image/svg+xml')) {
        return post;
      }

      return new Promise<InstagramPost>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const nw = img.naturalWidth || 1;
          const nh = img.naturalHeight || 1;
          const ratio = nw / nh;
          const isWide = isWidePhoto({ ...post, aspectRatio: ratio });
          registerImageAspect(post.imageUrl, nw, nh);
          resolve({
            ...post,
            aspectRatio: ratio,
            isWide,
          });
        };
        img.onerror = () => {
          resolve(post);
        };
        img.src = post.imageUrl;
      });
    })
  );

  return updates;
}

/**
 * Builds grouped slides according to strict rules:
 * 1. Photos are grouped by post (groupId).
 * 2. Photos belonging to the same post are grouped in 3s (up to 3 non-wide photos per slide).
 * 3. Wide photos (e.g. 16:9, ratio >= 1.25) are NEVER placed in multi-photo groups;
 *    each wide photo becomes its own standalone slide!
 * 4. When a photo is deleted from a group, the remaining non-wide photos from that SAME post
 *    naturally slide/refill into earlier groups so groups stay packed at 3.
 * 5. Photos belonging to other posts are NEVER shifted across post boundaries!
 */
export function buildPostGroupedSlides(
  allPosts: InstagramPost[],
  selectedIds: string[],
  defaultSlideDuration: number,
  existingSlides: VideoSlide[] = []
): VideoSlide[] {
  const selected = allPosts.filter((p) => selectedIds.includes(p.id));
  if (selected.length === 0) return [];

  // Index existing slide customizations (duration, custom captions, transitions)
  // Keyed by slide id, post id, and groupId+chunkIndex
  const existingBySlideId = new Map<string, VideoSlide>();
  const existingByPostId = new Map<string, VideoSlide>();
  const existingByGroupChunk = new Map<string, VideoSlide>();

  existingSlides.forEach((s) => {
    existingBySlideId.set(s.id, s);
    if (s.post?.id) existingByPostId.set(s.post.id, s);
    if (s.posts) {
      s.posts.forEach((p) => existingByPostId.set(p.id, s));
    }
    if (s.groupId) {
      // Find chunk index from id if present (e.g. slide-group-gKey-0)
      const parts = s.id.split('-');
      const lastPart = parts[parts.length - 1];
      const chunkIdx = parseInt(lastPart, 10);
      if (!isNaN(chunkIdx)) {
        existingByGroupChunk.set(`${s.groupId}__chunk_${chunkIdx}`, s);
      }
    }
  });

  // Group selected posts by post/groupId
  // Maintain the natural order of posts as selected
  const groupsMap = new Map<string, InstagramPost[]>();
  selected.forEach((p) => {
    const gKey = p.groupId || `group-single-${p.id}`;
    if (!groupsMap.has(gKey)) {
      groupsMap.set(gKey, []);
    }
    groupsMap.get(gKey)!.push(p);
  });

  const resultSlides: VideoSlide[] = [];

  groupsMap.forEach((groupPosts, gKey) => {
    // Separate wide photos and standard photos within THIS POST ONLY
    const widePosts: InstagramPost[] = [];
    const standardPosts: InstagramPost[] = [];

    groupPosts.forEach((p) => {
      if (isWidePhoto(p)) {
        widePosts.push(p);
      } else {
        standardPosts.push(p);
      }
    });

    // Chunk standard photos into groups of at most 3
    // Because photos belonging to the same post are collected here,
    // when a photo is deleted, the remaining standard photos of THIS post
    // automatically refill earlier chunks up to 3!
    const maxPerGroup = 3;
    const standardChunks: InstagramPost[][] = [];
    for (let i = 0; i < standardPosts.length; i += maxPerGroup) {
      standardChunks.push(standardPosts.slice(i, i + maxPerGroup));
    }

    // Now construct slides for this post.
    // 1. Standard groups (up to 3 photos each)
    let chunkCounter = 0;
    standardChunks.forEach((chunk) => {
      const primary = chunk[0];
      const chunkKey = `${gKey}__chunk_${chunkCounter}`;

      // Check if user previously customized this slide or one of its photos
      const existing =
        existingByGroupChunk.get(chunkKey) ||
        existingByPostId.get(primary.id) ||
        existingBySlideId.get(`slide-group-${gKey}-${chunkCounter}`);

      const sharedTitle =
        existing?.groupTitle ||
        primary.groupTitle ||
        primary.groupName ||
        'Faaliyet Tanıtımı';
      const sharedCaption =
        existing?.captionText !== undefined
          ? existing.captionText
          : (primary.caption || '');
      const dur =
        existing?.duration ||
        primary.duration ||
        defaultSlideDuration;
      const trans = existing?.transition || 'fade';
      const transDur = existing?.transitionDuration || 0.6;
      const zoom = existing?.zoomEffect || 'static';
      const showCap =
        existing?.showCaption !== undefined ? existing.showCaption : true;

      if (chunk.length === 1) {
        // Single standard photo
        resultSlides.push({
          id: existing?.id || `slide-${primary.id}-${chunkCounter}`,
          type: 'image',
          post: primary,
          posts: [primary],
          duration: dur,
          transition: trans,
          transitionDuration: transDur,
          groupTitle: sharedTitle,
          groupName: sharedTitle,
          captionText: primary.caption || sharedCaption,
          showCaption: showCap,
          showAuthorBadge: false,
          zoomEffect: zoom,
          groupId: gKey,
        });
      } else {
        // Multi photo group (2 or 3 photos)
        resultSlides.push({
          id: existing?.id || `slide-group-${gKey}-${chunkCounter}`,
          type: 'group-collage',
          post: primary,
          posts: chunk,
          duration: Math.max(dur, defaultSlideDuration),
          transition: trans,
          transitionDuration: transDur,
          groupTitle: sharedTitle,
          groupName: sharedTitle,
          captionText: sharedCaption,
          showCaption: showCap,
          showAuthorBadge: false,
          zoomEffect: zoom,
          groupId: gKey,
        });
      }

      chunkCounter++;
    });

    // 2. Wide photos for this post: ALWAYS standalone 1-photo slides
    widePosts.forEach((widePost, wIdx) => {
      const existing =
        existingByPostId.get(widePost.id) ||
        existingBySlideId.get(`slide-wide-${widePost.id}`);

      const sharedTitle =
        existing?.groupTitle ||
        widePost.groupTitle ||
        widePost.groupName ||
        'Faaliyet Tanıtımı';
      const sharedCaption =
        existing?.captionText !== undefined
          ? existing.captionText
          : (widePost.caption || '');
      const dur =
        existing?.duration ||
        widePost.duration ||
        defaultSlideDuration;
      const trans = existing?.transition || 'fade';
      const transDur = existing?.transitionDuration || 0.6;
      const zoom = existing?.zoomEffect || 'static';
      const showCap =
        existing?.showCaption !== undefined ? existing.showCaption : true;

      resultSlides.push({
        id: existing?.id || `slide-wide-${widePost.id}`,
        type: 'image',
        post: widePost,
        posts: [widePost],
        duration: dur,
        transition: trans,
        transitionDuration: transDur,
        groupTitle: sharedTitle,
        groupName: sharedTitle,
        captionText: sharedCaption,
        showCaption: showCap,
        showAuthorBadge: false,
        zoomEffect: zoom,
        groupId: gKey,
      });
    });
  });

  return resultSlides;
}
