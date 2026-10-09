import React, { useState, useEffect } from 'react';
import {
  AspectRatioType,
  CaptionStyle,
  InstagramPost,
  IntroConfig,
  OutroConfig,
  VideoSlide,
} from './types/video';
import { videoRenderer } from './services/videoRenderer';
import { Header } from './components/Header';
import { MediaImporter } from './components/MediaImporter';
import { IntroOutroEditor } from './components/IntroOutroEditor';
import { VideoTimelineEditor } from './components/VideoTimelineEditor';
import { ExportModal } from './components/ExportModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Layers, Sparkles, SlidersHorizontal } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'import' | 'intro-outro' | 'editor'>('import');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('9:16');
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('card-glass');

  // Media Items State (Clean, user-added only)
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  // Audio State
  const [audioTrackId, setAudioTrackId] = useState<string>('track-corporate-innovation');
  const [audioVolume, setAudioVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Intro Config
  const [intro, setIntro] = useState<IntroConfig>({
    enabled: true,
    logoUrl: 'LOGO.png',
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
    logoUrl: 'LOGO.png',
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

  // Helper to build grouped slides (multi-image in same group shown simultaneously)
  const buildGroupedSlides = (
    allPosts: InstagramPost[],
    selectedIds: string[],
    slideDuration: number
  ): VideoSlide[] => {
    const selected = allPosts.filter((p) => selectedIds.includes(p.id));
    if (selected.length === 0) return [];

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
        const sharedTitle = primary.groupTitle || primary.groupName || primary.title || 'Faaliyet Tanıtımı';
        const sharedCaption = primary.caption || '';

        if (chunk.length === 1) {
          // Tek görsel
          resultSlides.push({
            id: `slide-${primary.id}-${c}`,
            type: 'image',
            post: primary,
            posts: [primary],
            duration: primary.duration || slideDuration,
            transition: 'fade', // Silinerek geçiş (Fade / Cross-dissolve)
            transitionDuration: 0.6,
            groupTitle: sharedTitle,
            groupName: sharedTitle,
            captionText: primary.caption || sharedCaption,
            showCaption: true,
            showAuthorBadge: false,
            zoomEffect: 'static',
            groupId: primary.groupId,
          });
        } else {
          // Çoklu görsel (Eski 3'lü yapı: en çok 3 görsel)
          resultSlides.push({
            id: `slide-group-${gKey}-${c}`,
            type: 'group-collage',
            post: primary,
            posts: chunk, // Sayfada 3 fotoğrafa kadar
            duration: Math.max(slideDuration, (primary.duration || slideDuration) + 0.5),
            transition: 'fade', // Silinerek geçiş (Fade / Cross-dissolve)
            transitionDuration: 0.6,
            groupTitle: sharedTitle, // Üstte logo sağında fotoğraflarla ortalı grup başlığı
            groupName: sharedTitle,
            captionText: sharedCaption, // Altta fotoğrafların altında açıklama yazısı
            showCaption: true,
            showAuthorBadge: false,
            zoomEffect: 'static',
            groupId: gKey,
          });
        }
        idx++;
      }
    });

    return resultSlides;
  };

  // Synchronize slides automatically whenever posts, selectedPostIds, or defaultSlideDuration changes
  useEffect(() => {
    setSlides(buildGroupedSlides(posts, selectedPostIds, defaultSlideDuration));
  }, [posts, selectedPostIds, defaultSlideDuration]);

  // Sync logo and background theme across intro, outro, and all slides
  const handleUpdateSharedBranding = (updates: Partial<IntroConfig>) => {
    setIntro((prev) => ({ ...prev, ...updates }));
    setOutro((prev) => ({ ...prev, ...updates }));
  };

  // Toggle single post selection
  const togglePostSelection = (post: InstagramPost) => {
    setSelectedPostIds((prev) =>
      prev.includes(post.id) ? prev.filter((id) => id !== post.id) : [...prev, post.id]
    );
  };

  // Select all posts
  const selectAllPosts = (postList: InstagramPost[]) => {
    const ids = postList.map((p) => p.id);
    setSelectedPostIds(ids);
  };

  // Reverse posts and selections order
  const handleReversePostsOrder = () => {
    setPosts((prev) => [...prev].reverse());
    setSelectedPostIds((prev) => [...prev].reverse());
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

  const { totalDuration } = videoRenderer.calculateSegments(intro, slides, outro);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Bar */}
      <Header
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        selectedCount={selectedPostIds.length}
        totalDuration={totalDuration}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

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
          />
        )}
      </main>

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
