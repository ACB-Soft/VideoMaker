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
  applySavedCropsToPosts,
} from './services/projectBackup';
import {
  buildPostGroupedSlides,
  detectPostDimensions,
  isWidePhoto,
} from './services/photoGroupingService';
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
    return buildPostGroupedSlides(allPosts, selectedIds, slideDuration, existingSlides);
  };

  // Handler when new posts are imported or uploaded
  const handleBatchImport = async (newItems: InstagramPost[]) => {
    const taggedItems = await detectPostDimensions(newItems);

    setPosts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const filtered = taggedItems.filter((p) => !existingIds.has(p.id));
      const combined = [...filtered, ...prev];
      return combined;
    });

    const newIds = taggedItems.map((p) => p.id);
    setSelectedPostIds((prev) => {
      const merged = Array.from(new Set([...prev, ...newIds]));
      setSlides((prevSlides) => {
        const allPostsCombined = [...taggedItems, ...posts];
        return buildPostGroupedSlides(allPostsCombined, merged, defaultSlideDuration, prevSlides);
      });
      return merged;
    });
  };

  // Handler when a single photo is deleted (from MediaImporter or VideoTimelineEditor)
  // Shifts next photo from subsequent group of the SAME post to refill the group.
  // NEVER shifts photos from a different post!
  const handleDeletePost = (postId: string) => {
    setPosts((prevPosts) => {
      const updatedPosts = prevPosts.filter((p) => p.id !== postId);
      setSelectedPostIds((prevIds) => {
        const updatedSelected = prevIds.filter((id) => id !== postId);
        setSlides((prevSlides) => {
          return buildPostGroupedSlides(
            updatedPosts,
            updatedSelected,
            defaultSlideDuration,
            prevSlides
          );
        });
        return updatedSelected;
      });
      return updatedPosts;
    });
  };

  // Handler when post is edited in MediaImporter or Timeline
  const handleSavePostEdit = (updatedPost: InstagramPost, updateWholeGroup: boolean) => {
    setPosts((prev) => {
      const updatedList = prev.map((p) => {
        if (p.id === updatedPost.id) {
          return {
            ...p,
            ...updatedPost,
          };
        }
        if (updateWholeGroup && updatedPost.groupId && p.groupId === updatedPost.groupId) {
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
      });

      // Re-group slides so wide photos (16:9) become standalone and 3-groups stay balanced
      setSlides((prevSlides) => {
        return buildPostGroupedSlides(
          updatedList,
          selectedPostIds,
          defaultSlideDuration,
          prevSlides
        );
      });

      return updatedList;
    });
  };

  // Handler when user groups selected photos
  const handleGroupSelectedPosts = (
    newGroupId: string,
    groupTitle: string,
    caption: string,
    duration: number
  ) => {
    setPosts((prev) => {
      const updatedPosts = prev.map((p) => {
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

      setSlides((prevSlides) => {
        return buildPostGroupedSlides(
          updatedPosts,
          selectedPostIds,
          defaultSlideDuration,
          prevSlides
        );
      });

      return updatedPosts;
    });
  };

  // Handler when user deletes a slide in VideoTimelineEditor
  const handleDeleteSlide = (slideId: string, postIdsToRemove: string[]) => {
    setPosts((prevPosts) => {
      const updatedPosts = prevPosts.filter((p) => !postIdsToRemove.includes(p.id));
      setSelectedPostIds((prevIds) => {
        const updatedSelected = prevIds.filter((id) => !postIdsToRemove.includes(id));
        setSlides((prevSlides) => {
          return buildPostGroupedSlides(
            updatedPosts,
            updatedSelected,
            defaultSlideDuration,
            prevSlides.filter((s) => s.id !== slideId)
          );
        });
        return updatedSelected;
      });
      return updatedPosts;
    });
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

  const handleCompleteRestoreWithPosts = async (
    restoredPosts: InstagramPost[],
    backup: ProjectBackupPayload,
    ignoredCount?: number
  ) => {
    // Automatically apply saved crops from backup JSON
    const postsWithCrops = await applySavedCropsToPosts(restoredPosts);

    setPosts(postsWithCrops);
    const selIds = postsWithCrops.map((p) => p.id);
    setSelectedPostIds(selIds);

    // Reconstruct slides preserving custom user edits, titles, captions, crops and group collages
    const reconstructed = reconstructSlidesFromBackup(
      backup,
      postsWithCrops,
      backup.defaultSlideDuration || defaultSlideDuration
    );
    setSlides(reconstructed);

    setActiveRestoreBackup(null);
    // Instantly take user to preview screen
    setActiveTab('editor');

    const cropNotice = postsWithCrops.some((p) => p.crop) ? ' (kayıtlı kırpma oranları uygulandı)' : '';
    const ignoredMsg =
      ignoredCount && ignoredCount > 0
        ? ` (Yedekte ismi bulunmayan ${ignoredCount} fotoğraf koruma gereği elendi)`
        : '';
    setBackupToast({
      message: `✓ Harika! Yalnızca yedekteki ${postsWithCrops.length} fotoğraf başarıyla eşleştirildi${cropNotice} ve önizleme ekranına aktarıldı!${ignoredMsg}`,
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
            onDeletePost={handleDeletePost}
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
