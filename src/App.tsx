import React, { useState, useEffect } from 'react';
import {
  AspectRatioType,
  CaptionStyle,
  InstagramPost,
  IntroConfig,
  OutroConfig,
  VideoSlide,
  MediaGroup,
} from './types/video';
import { videoRenderer } from './services/videoRenderer';
import { Header } from './components/Header';
import { MediaImporter } from './components/MediaImporter';
import { IntroOutroEditor } from './components/IntroOutroEditor';
import { VideoTimelineEditor } from './components/VideoTimelineEditor';
import { ExportModal } from './components/ExportModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  downloadProjectBackup,
  ProjectBackupPayload,
  createRestoredPostsFromBackup,
  reconstructSlidesFromBackup,
} from './services/projectBackup';
import { Layers, Sparkles, SlidersHorizontal, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'import' | 'intro-outro' | 'editor'>('import');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('9:16');
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('card-glass');

  // Media Items State (Clean, user-added only)
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  // User Groups State
  const [groups, setGroups] = useState<MediaGroup[]>([
    { id: 'group-default', name: 'Genel Tanıtım', color: 'rose' },
    { id: 'group-activities', name: 'Faaliyetler & Projeler', color: 'sky' },
    { id: 'group-highlights', name: 'Öne Çıkanlar', color: 'amber' },
  ]);

  // Project Backup Toast / Loading / Restore Modal State
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [backupToast, setBackupToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [activeRestoreBackup, setActiveRestoreBackup] = useState<ProjectBackupPayload | null>(null);
  const [lastRestoredBackup, setLastRestoredBackup] = useState<ProjectBackupPayload | null>(null);

  // Audio State
  const [audioTrackId, setAudioTrackId] = useState<string>('track-corporate-innovation');
  const [audioVolume, setAudioVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Intro Config
  const [intro, setIntro] = useState<IntroConfig>({
    enabled: true,
    logoUrl: '/LOGO.png',
    logoScale: 3.2,
    logoCropPercent: 0,
    logoBgColor: 'transparent',
    logoBgBlend: 'none',
    title: 'FAALİYET TANITIMI',
    subtitle: 'Mimar ve Mühendisler Grubu Derneği',
    titleFontSize: 56,
    subtitleFontSize: 32,
    duration: 5.0,
    transition: 'fade',
    backgroundStyle: 'gradient-dark',
    fontFamily: 'Outfit',
  });

  // Outro Config
  const [outro, setOutro] = useState<OutroConfig>({
    enabled: true,
    logoUrl: '/LOGO.png',
    logoScale: 3.2,
    logoCropPercent: 0,
    logoBgColor: 'transparent',
    logoBgBlend: 'none',
    title: 'TEŞEKKÜRLER',
    subtitle: 'Mimar ve Mühendisler Grubu Derneği',
    headline: 'TEŞEKKÜRLER',
    callToAction: 'Mimar ve Mühendisler Grubu Derneği',
    titleFontSize: 56,
    subtitleFontSize: 32,
    socialHandle: '@mmgbursa',
    websiteUrl: '',
    duration: 5.0,
    transition: 'fade',
    backgroundStyle: 'gradient-dark',
    fontFamily: 'Outfit',
  });

  // Slides State
  const [slides, setSlides] = useState<VideoSlide[]>([]);
  const [defaultSlideDuration, setDefaultSlideDuration] = useState<number>(3.0);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Helper to build grouped slides while preserving user custom edits (titles, captions, durations)
  const buildGroupedSlides = (
    allPosts: InstagramPost[],
    selectedIds: string[],
    slideDuration: number,
    existingSlides: VideoSlide[] = []
  ): VideoSlide[] => {
    const selected = allPosts.filter((p) => selectedIds.includes(p.id));
    if (selected.length === 0) return [];

    const existingMap = new Map<string, VideoSlide>();
    existingSlides.forEach((s) => {
      if (s.groupId) existingMap.set(s.groupId, s);
      if (s.post?.id) existingMap.set(s.post.id, s);
      if (s.posts) {
        s.posts.forEach((p) => existingMap.set(p.id, s));
      }
    });

    // Group selected posts by groupId
    const groupsMap = new Map<string, InstagramPost[]>();
    selected.forEach((p) => {
      const gKey = p.groupId || 'group-single-' + p.id;
      if (!groupsMap.has(gKey)) {
        groupsMap.set(gKey, []);
      }
      groupsMap.get(gKey)!.push(p);
    });

    const resultSlides: VideoSlide[] = [];
    let idx = 0;

    groupsMap.forEach((groupPosts, gKey) => {
      const maxPerGroup = 3; // Her sayfada en çok 3 görsel (eski 3'lü yapı)
      for (let c = 0; c < groupPosts.length; c += maxPerGroup) {
        const chunk = groupPosts.slice(c, c + maxPerGroup);
        const primary = chunk[0];
        
        // Find existing slide if customized by user
        const existing = existingMap.get(gKey) || existingMap.get(primary.id);

        const sharedTitle = existing?.groupTitle || primary.groupTitle || primary.groupName || 'Faaliyet Tanıtımı';
        const sharedCaption = existing?.captionText || primary.caption || '';
        const dur = existing?.duration || primary.duration || slideDuration;
        const trans = existing?.transition || 'fade';
        const transDur = existing?.transitionDuration || 0.6;
        const zoom = existing?.zoomEffect || 'static';
        const showCap = existing?.showCaption !== undefined ? existing.showCaption : true;

        if (chunk.length === 1) {
          // Tek görsel
          resultSlides.push({
            id: existing?.id || `slide-${primary.id}-${c}`,
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
            groupId: primary.groupId,
          });
        } else {
          // Çoklu görsel (Eski 3'lü yapı: en çok 3 görsel)
          resultSlides.push({
            id: existing?.id || `slide-group-${gKey}-${c}`,
            type: 'group-collage',
            post: primary,
            posts: chunk,
            duration: Math.max(dur, slideDuration),
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
        idx++;
      }
    });

    return resultSlides;
  };

  // Handler when new posts are imported or uploaded
  const handleBatchImport = (newItems: InstagramPost[]) => {
    setPosts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const filtered = newItems.filter((p) => !existingIds.has(p.id));
      const combined = [...filtered, ...prev];
      return combined;
    });

    const newIds = newItems.map((p) => p.id);
    setSelectedPostIds((prev) => {
      const merged = Array.from(new Set([...prev, ...newIds]));
      setSlides((prevSlides) => {
        const allPostsCombined = [...newItems, ...posts];
        return buildGroupedSlides(allPostsCombined, merged, defaultSlideDuration, prevSlides);
      });
      return merged;
    });
  };

  // Handler when a single photo is deleted (from MediaImporter)
  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPostIds((prev) => prev.filter((id) => id !== postId));
    setSlides((prevSlides) => {
      const updated: VideoSlide[] = [];
      for (const s of prevSlides) {
        if (s.posts && s.posts.length > 0) {
          const remaining = s.posts.filter((p) => p.id !== postId);
          if (remaining.length > 0) {
            updated.push({
              ...s,
              post: remaining[0],
              posts: remaining,
            });
          }
        } else if (s.post && s.post.id !== postId) {
          updated.push(s);
        }
      }
      return updated;
    });
  };

  // Handler when post is edited in MediaImporter
  const handleSavePostEdit = (updatedPost: InstagramPost, updateWholeGroup: boolean) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === updatedPost.id || (updateWholeGroup && updatedPost.groupId && p.groupId === updatedPost.groupId)) {
          return {
            ...p,
            groupTitle: updatedPost.groupTitle,
            groupName: updatedPost.groupTitle,
            caption: updatedPost.caption,
            groupId: updatedPost.groupId,
            duration: updatedPost.duration,
          };
        }
        return p;
      })
    );

    // Update slides directly so changes are instantly reflected in preview and video export
    setSlides((prevSlides) =>
      prevSlides.map((s) => {
        const matchesGroup = updatedPost.groupId && s.groupId === updatedPost.groupId;
        const matchesPost = s.post?.id === updatedPost.id || s.posts?.some((p) => p.id === updatedPost.id);
        if (matchesGroup || matchesPost) {
          return {
            ...s,
            groupTitle: updatedPost.groupTitle,
            groupName: updatedPost.groupTitle,
            captionText: updatedPost.caption,
            duration: updatedPost.duration || s.duration,
            post: s.post?.id === updatedPost.id ? updatedPost : s.post,
            posts: s.posts?.map((p) => (p.id === updatedPost.id ? updatedPost : p)) || [updatedPost],
          };
        }
        return s;
      })
    );
  };

  // Handler when user groups selected photos
  const handleGroupSelectedPosts = (
    newGroupId: string,
    groupTitle: string,
    caption: string,
    duration: number
  ) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (selectedPostIds.includes(p.id)) {
          return {
            ...p,
            groupId: newGroupId,
            groupTitle: groupTitle,
            groupName: groupTitle,
            caption: caption,
            duration: duration,
          };
        }
        return p;
      })
    );

    setSlides((prevSlides) => {
      const updatedPosts = posts.map((p) => {
        if (selectedPostIds.includes(p.id)) {
          return {
            ...p,
            groupId: newGroupId,
            groupTitle: groupTitle,
            groupName: groupTitle,
            caption: caption,
            duration: duration,
          };
        }
        return p;
      });
      return buildGroupedSlides(updatedPosts, selectedPostIds, defaultSlideDuration, prevSlides);
    });
  };

  // Handler when user deletes a slide in VideoTimelineEditor
  const handleDeleteSlide = (slideId: string, postIdsToRemove: string[]) => {
    setSlides((prev) => prev.filter((s) => s.id !== slideId));
    setSelectedPostIds((prev) => prev.filter((id) => !postIdsToRemove.includes(id)));
  };

  // Handler when user edits a slide in VideoTimelineEditor
  const handleUpdateSlide = (updatedSlide: VideoSlide) => {
    setSlides((prev) => prev.map((s) => (s.id === updatedSlide.id ? updatedSlide : s)));

    // Synchronize corresponding posts
    const targetIds = updatedSlide.posts ? updatedSlide.posts.map((p) => p.id) : [updatedSlide.post.id];
    setPosts((prev) =>
      prev.map((p) => {
        if (targetIds.includes(p.id)) {
          return {
            ...p,
            caption: updatedSlide.captionText,
            groupTitle: updatedSlide.groupTitle,
            groupName: updatedSlide.groupTitle,
            duration: updatedSlide.duration,
          };
        }
        return p;
      })
    );
  };

  // Sync logo and background theme across intro, outro, and all slides
  const handleUpdateSharedBranding = (updates: Partial<IntroConfig>) => {
    setIntro((prev) => ({ ...prev, ...updates }));
    setOutro((prev) => ({ ...prev, ...updates }));
  };

  // Toggle single post selection
  const togglePostSelection = (post: InstagramPost) => {
    const isCurrentlySelected = selectedPostIds.includes(post.id);
    const nextSelected = isCurrentlySelected
      ? selectedPostIds.filter((id) => id !== post.id)
      : [...selectedPostIds, post.id];

    setSelectedPostIds(nextSelected);

    if (isCurrentlySelected) {
      setSlides((prevSlides) => {
        const updated: VideoSlide[] = [];
        for (const s of prevSlides) {
          if (s.posts && s.posts.length > 0) {
            const rem = s.posts.filter((p) => p.id !== post.id);
            if (rem.length > 0) {
              updated.push({ ...s, post: rem[0], posts: rem });
            }
          } else if (s.post?.id !== post.id) {
            updated.push(s);
          }
        }
        return updated;
      });
    } else {
      setSlides((prevSlides) => buildGroupedSlides(posts, nextSelected, defaultSlideDuration, prevSlides));
    }
  };

  // Select all posts
  const selectAllPosts = (postList: InstagramPost[]) => {
    const ids = Array.from(new Set([...selectedPostIds, ...postList.map((p) => p.id)]));
    setSelectedPostIds(ids);
    setSlides((prevSlides) => buildGroupedSlides(posts, ids, defaultSlideDuration, prevSlides));
  };

  // Reverse posts and selections order
  const handleReversePostsOrder = () => {
    setPosts((prev) => [...prev].reverse());
    setSelectedPostIds((prev) => [...prev].reverse());
    setSlides((prev) => [...prev].reverse());
  };

  // Update duration for all photos
  const handleUpdateAllSlideDurations = (dur: number) => {
    setDefaultSlideDuration(dur);
    setPosts((prev) => prev.map((p) => ({ ...p, duration: dur })));
    setSlides((prev) => prev.map((s) => ({ ...s, duration: dur })));
  };

  // Clear all post selections
  const clearSelection = () => {
    setSelectedPostIds([]);
    setSlides([]);
  };

  // Export all edits and data to persistent project JSON backup
  const handleExportBackup = async () => {
    if (posts.length === 0) {
      setBackupToast({
        message: 'Yedeklenecek fotoğraf veya içerik bulunmuyor. Önce görsel ekleyin.',
        type: 'error',
      });
      setTimeout(() => setBackupToast(null), 4000);
      return;
    }

    try {
      setIsExportingBackup(true);
      await downloadProjectBackup({
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
      });

      setBackupToast({
        message: `✓ Proje yedeğiniz başarıyla .json olarak indirildi! (${posts.length} fotoğraf, tüm açıklamalar, başlıklar ve süreleriniz dahil)`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Yedek dışa aktarma hatası:', err);
      setBackupToast({
        message: 'Yedek oluşturulurken bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata'),
        type: 'error',
      });
    } finally {
      setIsExportingBackup(false);
      setTimeout(() => setBackupToast(null), 6000);
    }
  };

  // Restore project from JSON backup
  const handleRestoreBackup = (backup: ProjectBackupPayload) => {
    setLastRestoredBackup(backup);

    // 1. Immediately restore global project settings, themes and groups
    if (backup.groups && backup.groups.length > 0) {
      setGroups(backup.groups);
    }
    if (backup.intro) setIntro(backup.intro);
    if (backup.outro) setOutro(backup.outro);
    if (backup.aspectRatio) setAspectRatio(backup.aspectRatio);
    if (backup.defaultSlideDuration) setDefaultSlideDuration(backup.defaultSlideDuration);
    if (backup.captionStyle) setCaptionStyle(backup.captionStyle);
    if (backup.audioTrackId) setAudioTrackId(backup.audioTrackId);
    if (backup.audioVolume !== undefined) setAudioVolume(backup.audioVolume);
    if (backup.isMuted !== undefined) setIsMuted(backup.isMuted);

    // 2. Check if posts already have working image URLs from previous base64/remote
    const legacyPosts = backup.posts?.filter(
      (p) => p.imageUrl && (p.imageUrl.startsWith('data:') || p.imageUrl.startsWith('http'))
    );
    if (legacyPosts && legacyPosts.length > 0) {
      handleCompleteRestoreWithPosts(legacyPosts, backup);
      return;
    }

    // 3. IMMEDIATELY create restored posts and reconstruct slides so the preview screen is NEVER blank!
    const restoredPosts = createRestoredPostsFromBackup(backup);
    setPosts(restoredPosts);
    const restoredIds = restoredPosts.map((p) => p.id);
    setSelectedPostIds(restoredIds);

    const initialSlides = reconstructSlidesFromBackup(
      backup,
      restoredPosts,
      backup.defaultSlideDuration || defaultSlideDuration
    );
    setSlides(initialSlides);

    // Check if any items need real image files from computer
    const needsLocalImages = restoredPosts.some((p) => p.imageUrl.startsWith('data:image/svg+xml'));

    if (!needsLocalImages) {
      // All images are already present! Switch directly to preview
      setActiveRestoreBackup(null);
      setActiveTab('editor');
      setBackupToast({
        message: `✓ Proje yedeğiniz tüm fotoğraflarıyla (${restoredPosts.length} adet), açıklamalar ve başlıklarla eksiksiz önizleme ekranına yüklendi!`,
        type: 'success',
      });
      setTimeout(() => setBackupToast(null), 6000);
      return;
    }

    // Open photo selection modal so computer photos can be linked
    setActiveRestoreBackup(backup);
    setBackupToast({
      message: `✓ JSON yedeği okundu (${restoredPosts.length} fotoğraf). Tüm başlıklar, açıklamalar ve süreler önizlemeye aktarıldı. Bilgisayarınızdan fotoğrafları seçerek görselleri bağlayabilirsiniz.`,
      type: 'info',
    });
    setTimeout(() => setBackupToast(null), 6000);
  };

  const handleCompleteRestoreWithPosts = (
    restoredPosts: InstagramPost[],
    backup: ProjectBackupPayload,
    ignoredCount?: number
  ) => {
    setPosts(restoredPosts);
    const selIds = restoredPosts.map((p) => p.id);
    setSelectedPostIds(selIds);

    // Reconstruct slides preserving custom user edits, titles, captions and group collages
    const reconstructed = reconstructSlidesFromBackup(
      backup,
      restoredPosts,
      backup.defaultSlideDuration || defaultSlideDuration
    );
    setSlides(reconstructed);

    setActiveRestoreBackup(null);
    // Instantly take user to preview screen
    setActiveTab('editor');

    const ignoredMsg =
      ignoredCount && ignoredCount > 0
        ? ` (Yedekte ismi bulunmayan ${ignoredCount} fotoğraf koruma gereği elendi)`
        : '';
    setBackupToast({
      message: `✓ Harika! Yalnızca yedekteki ${restoredPosts.length} fotoğraf başarıyla eşleştirildi ve önizleme ekranına aktarıldı!${ignoredMsg}`,
      type: 'success',
    });
    setTimeout(() => setBackupToast(null), 6000);
  };

  const { totalDuration } = videoRenderer.calculateSegments(intro, slides, outro);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Bar */}
      <Header
        selectedCount={selectedPostIds.length}
        totalDuration={totalDuration}
        hasContent={posts.length > 0}
        isExportingBackup={isExportingBackup}
        onExportBackup={handleExportBackup}
        onRestoreBackup={handleRestoreBackup}
      />

      {/* Backup Notification Toast */}
      {backupToast && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 max-w-md">
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md ${
              backupToast.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/95 text-emerald-200'
                : backupToast.type === 'error'
                ? 'border-rose-500/40 bg-rose-950/95 text-rose-200'
                : 'border-sky-500/40 bg-slate-900/95 text-slate-200'
            }`}
          >
            {backupToast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />}
            {backupToast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />}
            {backupToast.type === 'info' && <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />}
            <div className="flex-1 text-xs leading-relaxed font-medium">
              {backupToast.message}
            </div>
            <button
              onClick={() => setBackupToast(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Step Navigation Bar (Başlığın dışında, içerik geçiş adımları) */}
      <div className="w-full bg-slate-900/60 border-b border-slate-800/80 px-3 py-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <nav className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 shadow-sm">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'import'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>1. Görseller & Gruplar</span>
              {selectedPostIds.length > 0 && (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                  {selectedPostIds.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('intro-outro')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'intro-outro'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>2. Logo & Açılış</span>
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'editor'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>3. Zaman Çizelgesi & Önizleme</span>
            </button>
          </nav>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span>Video Süresi:</span>
            <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              {totalDuration.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      {/* Photo Connect Needed Banner for Restored Backups */}
      {posts.some((p) => p.imageUrl.startsWith('data:image/svg+xml')) && (
        <div className="w-full bg-sky-950/50 border-b border-sky-500/30 px-3 py-2 sm:px-6 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-sky-200">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-bold shrink-0 text-[11px]">
                📷
              </span>
              <span>
                <strong>Yedek verileriniz hazır:</strong> {posts.filter((p) => p.imageUrl.startsWith('data:image/svg+xml')).length} fotoğraf için bilgisayardan görsel bağlantısı bekleniyor (başlıklar ve açıklamalar önizlemeye yüklendi).
              </span>
            </div>
            <div className="flex items-center gap-2">
              {lastRestoredBackup && (
                <button
                  type="button"
                  onClick={() => setActiveRestoreBackup(lastRestoredBackup)}
                  className="rounded-lg bg-sky-500 hover:bg-sky-600 px-3 py-1 text-xs font-bold text-white shadow transition active:scale-95"
                >
                  Fotoğrafları Bilgisayardan Bağla
                </button>
              )}
              {activeTab !== 'editor' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                >
                  Önizleme Ekranına Git →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 py-6 sm:px-6">
        {activeTab === 'import' && (
          <MediaImporter
            posts={posts}
            setPosts={setPosts}
            selectedPostIds={selectedPostIds}
            togglePostSelection={togglePostSelection}
            selectAllPosts={selectAllPosts}
            clearSelection={clearSelection}
            onReverseOrder={handleReversePostsOrder}
            onContinue={() => setActiveTab('intro-outro')}
            defaultDuration={defaultSlideDuration}
            onUpdateDefaultDuration={handleUpdateAllSlideDurations}
            onDeletePost={handleDeletePost}
            onSavePostEdit={handleSavePostEdit}
            onGroupSelectedPosts={handleGroupSelectedPosts}
            onBatchImport={handleBatchImport}
            groups={groups}
            setGroups={setGroups}
            onExportBackup={handleExportBackup}
            onRestoreBackup={handleRestoreBackup}
            isExportingBackup={isExportingBackup}
          />
        )}

        {activeTab === 'intro-outro' && (
          <IntroOutroEditor
            intro={intro}
            setIntro={setIntro}
            outro={outro}
            setOutro={setOutro}
            updateSharedBranding={handleUpdateSharedBranding}
            onContinue={() => setActiveTab('editor')}
          />
        )}

        {activeTab === 'editor' && (
          <VideoTimelineEditor
            slides={slides}
            setSlides={setSlides}
            intro={intro}
            setIntro={setIntro}
            outro={outro}
            setOutro={setOutro}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            captionStyle={captionStyle}
            setCaptionStyle={setCaptionStyle}
            audioTrackId={audioTrackId}
            setAudioTrackId={setAudioTrackId}
            audioVolume={audioVolume}
            setAudioVolume={setAudioVolume}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            onOpenExport={() => setIsExportModalOpen(true)}
            onDeleteSlide={handleDeleteSlide}
            onUpdateSlide={handleUpdateSlide}
          />
        )}
      </main>

      {/* Project Backup Photo Match Modal */}
      {activeRestoreBackup && (
        <BackupRestoreModal
          isOpen={true}
          onClose={() => setActiveRestoreBackup(null)}
          backup={activeRestoreBackup}
          onCompleteRestore={handleCompleteRestoreWithPosts}
        />
      )}

      {/* MP4 Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        intro={intro}
        slides={slides}
        outro={outro}
        aspectRatio={aspectRatio}
        captionStyle={captionStyle}
        audioTrackId={audioTrackId}
        isMuted={isMuted}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
