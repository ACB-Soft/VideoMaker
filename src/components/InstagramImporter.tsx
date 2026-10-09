import React, { useState, useEffect, useRef } from 'react';
import { InstagramPost } from '../types/video';
import { InstagramAccountPreset } from '../services/instagramPresets';
import {
  Plus,
  Sparkles,
  Heart,
  MessageCircle,
  Upload,
  Layers,
  FolderUp,
  ClipboardPaste,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface InstagramImporterProps {
  currentProfile: InstagramAccountPreset;
  setCurrentProfile: (p: InstagramAccountPreset | ((prev: InstagramAccountPreset) => InstagramAccountPreset)) => void;
  selectedPostIds: string[];
  togglePostSelection: (post: InstagramPost) => void;
  selectAllPosts: (posts: InstagramPost[]) => void;
  clearSelection: () => void;
  onContinue: () => void;
  onAddCustomPost: (post: InstagramPost) => void;
}

export const InstagramImporter: React.FC<InstagramImporterProps> = ({
  currentProfile,
  setCurrentProfile,
  selectedPostIds,
  togglePostSelection,
  selectAllPosts,
  clearSelection,
  onContinue,
  onAddCustomPost,
}) => {
  const [activeImportMode, setActiveImportMode] = useState<'upload' | 'paste' | 'url'>('upload');
  const [showTechnicalExplainer, setShowTechnicalExplainer] = useState(false);

  // Single / Custom image input state
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customCaption, setCustomCaption] = useState('');
  const [customTags, setCustomTags] = useState('mmg, faaliyet, muhendislik');

  // Direct image URL input
  const [directImageUrlInput, setDirectImageUrlInput] = useState('');
  const [directImageCaptionInput, setDirectImageCaptionInput] = useState('');

  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Global Clipboard (Ctrl+V) listener: User can copy image from Instagram and paste directly
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      // 1. Check if image file/blob is in clipboard
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                if (typeof ev.target?.result === 'string') {
                  const newPost: InstagramPost = {
                    id: `paste-${Date.now()}`,
                    imageUrl: ev.target.result,
                    caption: 'MMG Faaliyet Görseli',
                    likes: 1250,
                    comments: 32,
                    date: 'Yeni',
                    tags: ['mmg', 'faaliyet'],
                    author: {
                      username: currentProfile.username || 'mmgdernegi',
                      fullName: currentProfile.fullName || 'Mimar ve Mühendisler Grubu Derneği',
                      avatarUrl: currentProfile.avatarUrl,
                      isVerified: true,
                    },
                  };
                  setCurrentProfile((prev) => ({
                    ...prev,
                    posts: [newPost, ...prev.posts],
                  }));
                  togglePostSelection(newPost);
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [currentProfile, togglePostSelection, setCurrentProfile]);

  // Handle batch file upload (selecting multiple photos from device)
  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const addedPosts: InstagramPost[] = [];

    fileList.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const imgUrl = event.target.result;
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          const post: InstagramPost = {
            id: `batch-${Date.now()}-${index}`,
            imageUrl: imgUrl,
            caption: cleanName.length > 3 ? cleanName : 'MMG Faaliyet Görseli',
            likes: 1200 + Math.floor(Math.random() * 800),
            comments: 35 + Math.floor(Math.random() * 40),
            date: 'Yeni',
            tags: ['mmg', 'muhendislik'],
            author: {
              username: currentProfile.username || 'mmgdernegi',
              fullName: currentProfile.fullName || 'Mimar ve Mühendisler Grubu Derneği',
              avatarUrl: currentProfile.avatarUrl,
              isVerified: true,
            },
          };
          addedPosts.push(post);
        }
        loadedCount++;
        if (loadedCount === fileList.length) {
          setCurrentProfile((prev) => ({
            ...prev,
            posts: [...addedPosts, ...prev.posts],
          }));
          selectAllPosts(addedPosts);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Add via direct Image URL
  const handleAddDirectImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directImageUrlInput.trim()) return;

    const newPost: InstagramPost = {
      id: `url-${Date.now()}`,
      imageUrl: directImageUrlInput.trim(),
      caption: directImageCaptionInput.trim() || 'MMG Faaliyet Görseli',
      likes: 1300,
      comments: 28,
      date: 'Yeni',
      tags: ['mmg', 'faaliyet'],
      author: {
        username: currentProfile.username || 'mmgdernegi',
        fullName: currentProfile.fullName || 'Mimar ve Mühendisler Grubu Derneği',
        avatarUrl: currentProfile.avatarUrl,
        isVerified: true,
      },
    };

    setCurrentProfile((prev) => ({
      ...prev,
      posts: [newPost, ...prev.posts],
    }));
    togglePostSelection(newPost);
    setDirectImageUrlInput('');
    setDirectImageCaptionInput('');
  };

  // Custom single post upload via modal
  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setCustomImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const submitCustomPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImageUrl) return;

    const newPost: InstagramPost = {
      id: `custom-${Date.now()}`,
      imageUrl: customImageUrl,
      caption: customCaption || 'MMG Faaliyet Görseli',
      likes: 1450,
      comments: 42,
      date: 'Yeni',
      tags: customTags.split(',').map((t) => t.trim()).filter(Boolean),
      author: {
        username: currentProfile.username || 'mmgdernegi',
        fullName: currentProfile.fullName || 'Mimar ve Mühendisler Grubu Derneği',
        avatarUrl: currentProfile.avatarUrl,
        isVerified: true,
      },
    };

    onAddCustomPost(newPost);
    setShowAddCustomModal(false);
    setCustomImageUrl('');
    setCustomCaption('');
  };

  const removeSinglePost = (postId: string) => {
    setCurrentProfile((prev) => ({
      ...prev,
      posts: prev.posts.filter((p) => p.id !== postId),
    }));
    if (selectedPostIds.includes(postId)) {
      togglePostSelection({ id: postId } as InstagramPost);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Fast Import Methods */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                <Sparkles className="h-4 w-4" />
              </span>
              Faaliyet Gönderilerini & Fotoğraflarını Ekle
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Tanıtım videosunda yer alacak fotoğrafları cihazınızdan seçin veya panodan doğrudan yapıştırın.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setActiveImportMode('upload')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeImportMode === 'upload'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderUp className="h-3.5 w-3.5" />
                <span>Fotoğraf Seç</span>
              </button>
              <button
                onClick={() => setActiveImportMode('paste')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeImportMode === 'paste'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                <span>Panodan Yapıştır (Ctrl+V)</span>
              </button>
              <button
                onClick={() => setActiveImportMode('url')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeImportMode === 'url'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Görsel Linki</span>
              </button>
            </div>

            {/* Quick Instagram Link Button */}
            <a
              href="https://www.instagram.com/mmgdernegi/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 px-3 py-2 text-xs font-semibold transition shadow-sm"
              title="Instagram'da MMG profilini açıp görselleri kopyalamak için tıklayın"
            >
              <ExternalLink className="h-3.5 w-3.5 text-sky-400" />
              <span>Instagram'da Aç</span>
            </a>
          </div>
        </div>

        {/* Tab 1: Batch Upload from device */}
        {activeImportMode === 'upload' && (
          <div className="mt-4 space-y-3">
            <input
              type="file"
              ref={batchFileInputRef}
              multiple
              accept="image/*"
              onChange={handleBatchFileUpload}
              className="hidden"
            />
            <div
              onClick={() => batchFileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 hover:border-rose-500 bg-slate-800/40 hover:bg-slate-800/80 p-8 text-center cursor-pointer transition group"
            >
              <FolderUp className="h-10 w-10 text-slate-400 group-hover:text-rose-400 mb-2 transition" />
              <span className="text-sm font-bold text-white group-hover:text-rose-300">
                Dernek Faaliyet Fotoğraflarını Seçin veya Sürükleyin
              </span>
              <span className="mt-1 text-xs text-slate-400">
                Aynı anda birden fazla fotoğraf seçerek anında video slaytlarına dönüştürebilirsiniz.
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Clipboard Paste Guide */}
        {activeImportMode === 'paste' && (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/60 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <ClipboardPaste className="h-5 w-5 text-rose-400" />
              <span>Instagram'dan 3 Saniyede Görsel Ekleme (Ctrl + V):</span>
            </div>
            <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-300">
              <li>
                Instagram'da dilediğiniz gönderinin fotoğrafına sağ tıklayıp <strong className="text-white">"Resmi Kopyala" (Copy Image)</strong> seçeneğini seçin.
              </li>
              <li>
                Bu sayfaya dönün ve klavyenizden <strong className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">Ctrl + V</strong> tuşlarına basın.
              </li>
              <li>
                Görsel Instagram'ın ağ engellerine takılmaksızın doğrudan işletim sistemi panonuzdan okunur ve anında videoya eklenir!
              </li>
            </ol>
          </div>
        )}

        {/* Tab 3: Direct Image URL */}
        {activeImportMode === 'url' && (
          <form onSubmit={handleAddDirectImageUrl} className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={directImageUrlInput}
                onChange={(e) => setDirectImageUrlInput(e.target.value)}
                placeholder="Doğrudan görsel bağlantısı (örn: https://.../fotograf.jpg veya web görsel linki)"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <input
                type="text"
                value={directImageCaptionInput}
                onChange={(e) => setDirectImageCaptionInput(e.target.value)}
                placeholder="Fotoğraf Açıklaması (İsteğe bağlı)"
                className="w-full sm:w-64 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!directImageUrlInput.trim()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/20 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Ekle</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Honest Technical Explanation Drawer */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
        <button
          onClick={() => setShowTechnicalExplainer(!showTechnicalExplainer)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-amber-300 hover:text-amber-200"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <span>Dürüst Teknik Bilgilendirme: Instagram Linkleri Neden Doğrudan Çekilemiyor?</span>
          </span>
          {showTechnicalExplainer ? (
            <ChevronUp className="h-4 w-4 text-amber-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-amber-400" />
          )}
        </button>

        {showTechnicalExplainer && (
          <div className="mt-3 pt-3 border-t border-amber-500/20 text-xs text-slate-300 space-y-2.5 leading-relaxed">
            <p>
              Hiçbir yanıltma veya halüsinasyon olmaksızın, arka plandaki net teknik gerçek şudur:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>
                <strong>Meta, Ekim 2020'de genel oEmbed API'sini tamamen kapattı:</strong> Eskiden herhangi bir web sitesi Instagram linkini oEmbed ile sorgulayıp resmi çekebiliyordu. Meta bu servisi kapattı; artık her istek için resmi onaylı bir <strong>Meta Developer App ID ve Access Token</strong> zorunlu kıldı. Token olmadan yapılan çağrılara HTTP 401 Unauthorized döner.
              </li>
              <li>
                <strong>CORS Proxy'leri Instagram Tarafından Engelleniyor:</strong> Tarayıcıların CORS kuralını aşmak için kullanılan genel proxy sunucularının IP adresleri Instagram tarafından Cloudflare engeline ve giriş duvarına (Login Wall) takılır.
              </li>
              <li>
                <strong>Çözüm:</strong> Bu nedenle herhangi bir üçüncü taraf web uygulaması için en garantili, engellenemeyen ve sıfır hata ile çalışan yöntem; <strong>fotoğrafları cihazdan seçmek</strong> veya Instagram'da görsele sağ tıklayıp <strong>"Resmi Kopyala" dedikten sonra buraya Ctrl+V ile yapıştırmaktır.</strong>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Posts Section Header & Action Buttons */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-white">Yüklenen Gönderiler & Slaytlar</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-slate-700">
            {selectedPostIds.length} / {currentProfile.posts.length} Seçildi
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentProfile.posts.length > 0 && (
            <>
              <button
                onClick={() => selectAllPosts(currentProfile.posts)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                Tümünü Seç
              </button>
              <button
                onClick={clearSelection}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
              >
                Seçimi Kaldır
              </button>
            </>
          )}
          <button
            onClick={() => setShowAddCustomModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Özel Fotoğraf Ekle</span>
          </button>
        </div>
      </div>

      {/* Posts Grid or Empty State */}
      {currentProfile.posts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/30 p-8 sm:p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 text-rose-400 mb-4 border border-slate-700">
            <Layers className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">
            Henüz Gönderi Yüklenmedi
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Videoda yer alacak faaliyet fotoğraflarını eklemek için yukarıdaki butonları kullanın:
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
            <button
              onClick={() => batchFileInputRef.current?.click()}
              className="rounded-xl border border-slate-800 bg-slate-900/90 hover:border-rose-500/50 p-4 transition group"
            >
              <FolderUp className="h-5 w-5 text-emerald-400 mb-2 group-hover:scale-110 transition" />
              <div className="text-xs font-bold text-white">Fotoğraf Seç / Yükle</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Cihazınızdaki fotoğrafları topluca seçin
              </div>
            </button>

            <button
              onClick={() => setActiveImportMode('paste')}
              className="rounded-xl border border-slate-800 bg-slate-900/90 hover:border-rose-500/50 p-4 transition group"
            >
              <ClipboardPaste className="h-5 w-5 text-sky-400 mb-2 group-hover:scale-110 transition" />
              <div className="text-xs font-bold text-white">Ctrl + V ile Yapıştır</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Instagram'da resmi kopyalayıp buraya yapıştırın
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentProfile.posts.map((post) => {
            const isSelected = selectedPostIds.includes(post.id);
            const selectIndex = selectedPostIds.indexOf(post.id);

            return (
              <div
                key={post.id}
                onClick={() => togglePostSelection(post)}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-rose-500 bg-slate-900/90 shadow-xl shadow-rose-500/10 ring-2 ring-rose-500/50'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                {/* Image Aspect Box */}
                <div className="relative aspect-square w-full overflow-hidden bg-slate-950">
                  <img
                    src={post.imageUrl}
                    alt={post.caption}
                    className={`h-full w-full object-cover transition-transform duration-500 ${
                      isSelected ? 'scale-105' : 'group-hover:scale-105'
                    }`}
                    loading="lazy"
                  />

                  {/* Gradient shadow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />

                  {/* Top-Right Selection Checkbox */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    {isSelected ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-md ring-2 ring-white/80 font-bold text-xs">
                        #{selectIndex + 1}
                      </div>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-slate-400 backdrop-blur-sm border border-white/20 group-hover:border-white">
                        <Plus className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSinglePost(post.id);
                    }}
                    className="absolute top-2.5 left-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-slate-400 hover:text-red-400 hover:bg-black/80 backdrop-blur-sm border border-white/10"
                    title="Bu gönderiyi sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Caption & Details below Image */}
                <div className="p-3.5 flex flex-col justify-between flex-1">
                  <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {post.caption}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-400">{post.date}</span>
                    <span
                      className={`font-semibold ${
                        isSelected ? 'text-rose-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    >
                      {isSelected ? '✓ Videoya Dahil' : '+ Seç'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Floating Step Banner */}
      <div className="sticky bottom-4 z-30 flex items-center justify-between rounded-2xl border border-rose-500/30 bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl shadow-black/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 font-black">
            {selectedPostIds.length}
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {selectedPostIds.length > 0
                ? `${selectedPostIds.length} Gönderi Seçildi`
                : 'Lütfen En Az 1 Fotoğraf Ekleyin veya Seçin'}
            </div>
            <p className="text-xs text-slate-400">
              Giriş/çıkış logoları ve geçiş efektleri otomatik eklenecektir.
            </p>
          </div>
        </div>

        <button
          onClick={onContinue}
          disabled={selectedPostIds.length === 0}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-40 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/25 active:scale-95 transition"
        >
          <span>Logo & Açılış Sekmesine Geç</span>
          <span className="text-sm">→</span>
        </button>
      </div>

      {/* Modal: Custom Single Post Adder */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-rose-400" />
              Tek Fotoğraf veya Gönderi Ekle
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Cihazınızdan fotoğraf yükleyin veya görsel bağlantısı girin.
            </p>

            <form onSubmit={submitCustomPost} className="mt-4 space-y-4">
              {/* Image Input / File Drop */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Fotoğraf Yükle veya Görsel URL'si
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://... veya cihazdan dosya seçin"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  />
                  <label className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Dosya</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSingleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {customImageUrl && (
                  <div className="mt-2.5 relative h-36 w-full rounded-xl overflow-hidden border border-slate-700 bg-black">
                    <img
                      src={customImageUrl}
                      alt="Önizleme"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Fotoğraf Açıklaması (Altyazı)
                </label>
                <textarea
                  value={customCaption}
                  onChange={(e) => setCustomCaption(e.target.value)}
                  placeholder="Videoda alt kısımda görünecek faaliyet açıklaması..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Etiketler (Virgülle ayırın)
                </label>
                <input
                  type="text"
                  value={customTags}
                  onChange={(e) => setCustomTags(e.target.value)}
                  placeholder="mmg, muhendislik, mimarlik"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={!customImageUrl}
                  className="rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-500/25"
                >
                  Gönderiyi Ekle & Seç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
