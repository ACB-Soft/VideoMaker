import React, { useState, useEffect, useRef } from 'react';
import { InstagramPost, MediaGroup } from '../types/video';
import {
  Upload,
  FolderUp,
  Plus,
  Trash2,
  Edit3,
  Check,
  FolderPlus,
  Sparkles,
  Layers,
  Tag,
  ArrowRight,
  ArrowDownUp,
  Filter,
  Clock,
  FileText,
  FileCode,
  FolderArchive,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Info,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import {
  parseInstagramExportJson,
  matchFilesWithInstagramPosts,
  ParsedInstagramPost,
} from '../services/instagramJsonParser';

interface MediaImporterProps {
  posts: InstagramPost[];
  setPosts: React.Dispatch<React.SetStateAction<InstagramPost[]>>;
  selectedPostIds: string[];
  togglePostSelection: (post: InstagramPost) => void;
  selectAllPosts: (posts: InstagramPost[]) => void;
  clearSelection: () => void;
  onReverseOrder?: () => void;
  onContinue: () => void;
  defaultDuration: number;
  onUpdateDefaultDuration: (dur: number) => void;
  onDeletePost?: (postId: string) => void;
  onSavePostEdit?: (updatedPost: InstagramPost, updateWholeGroup: boolean) => void;
  onGroupSelectedPosts?: (newGroupId: string, groupTitle: string, caption: string, duration: number) => void;
  onBatchImport?: (newPosts: InstagramPost[]) => void;
}

export const MediaImporter: React.FC<MediaImporterProps> = ({
  posts,
  setPosts,
  selectedPostIds,
  togglePostSelection,
  selectAllPosts,
  clearSelection,
  onReverseOrder,
  onContinue,
  defaultDuration,
  onUpdateDefaultDuration,
  onDeletePost,
  onSavePostEdit,
  onGroupSelectedPosts,
  onBatchImport,
}) => {
  // Default Groups
  const [groups, setGroups] = useState<MediaGroup[]>([
    { id: 'group-default', name: 'Genel Tanıtım', color: 'rose' },
    { id: 'group-activities', name: 'Faaliyetler & Projeler', color: 'sky' },
    { id: 'group-highlights', name: 'Öne Çıkanlar', color: 'amber' },
  ]);

  const [activeGroupId, setActiveGroupId] = useState<string>('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);

  // Active Import Tab
  const [importMode, setImportMode] = useState<'upload' | 'json'>('upload');

  // Instagram JSON Export State
  const [parsedIgPosts, setParsedIgPosts] = useState<ParsedInstagramPost[]>([]);
  const [jsonFileName, setJsonFileName] = useState<string>('');
  const [jsonStatusMessage, setJsonStatusMessage] = useState<string>('');
  const [jsonErrorMessage, setJsonErrorMessage] = useState<string | null>(null);
  const [isProcessingJson, setIsProcessingJson] = useState(false);
  const [matchedPostsPreview, setMatchedPostsPreview] = useState<InstagramPost[]>([]);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const mediaFolderInputRef = useRef<HTMLInputElement>(null);
  const combinedJsonMediaInputRef = useRef<HTMLInputElement>(null);

  // Edit Caption Modal State
  const [editingPost, setEditingPost] = useState<InstagramPost | null>(null);
  const [editGroupTitle, setEditGroupTitle] = useState('');
  const [editCaptionText, setEditCaptionText] = useState('');
  const [editPostGroup, setEditPostGroup] = useState('');
  const [editPostDuration, setEditPostDuration] = useState<number>(3.0);

  // Group Photos Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupTitleInput, setGroupTitleInput] = useState('');
  const [groupCaptionText, setGroupCaptionText] = useState('');
  const [groupSlideDuration, setGroupSlideDuration] = useState<number>(4.0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch File Upload
  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const newItems: InstagramPost[] = [];
    const targetGroup = activeGroupId !== 'all' ? activeGroupId : 'group-default';
    const foundGroup = groups.find((g) => g.id === targetGroup);

    fileList.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          const groupTitle = foundGroup?.name || 'Genel Tanıtım';
          const post: InstagramPost = {
            id: `media-${Date.now()}-${index}`,
            imageUrl: event.target.result,
            caption: cleanName.length > 2 ? cleanName : `Tanıtım Görseli #${index + 1}`,
            groupTitle: groupTitle,
            groupId: targetGroup,
            groupName: groupTitle,
            duration: defaultDuration,
            date: 'Yeni',
            tags: ['tanitim'],
          };
          newItems.push(post);
        }

        loadedCount++;
        if (loadedCount === fileList.length) {
          registerPostGroups(newItems);
          if (onBatchImport) {
            onBatchImport(newItems);
          } else {
            setPosts((prev) => [...newItems, ...prev]);
            selectAllPosts(newItems);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Automatically register unique groups from newly imported posts
  const registerPostGroups = (newItems: InstagramPost[]) => {
    const gMap = new Map<string, string>();
    newItems.forEach((p) => {
      if (p.groupId && p.groupName && !gMap.has(p.groupId)) {
        gMap.set(p.groupId, p.groupName);
      }
    });
    if (gMap.size > 0) {
      setGroups((prev) => {
        const existingIds = new Set(prev.map((g) => g.id));
        const toAdd: MediaGroup[] = [];
        const colors = ['sky', 'indigo', 'rose', 'amber', 'emerald', 'purple'];
        let cIdx = prev.length;
        gMap.forEach((name, id) => {
          if (!existingIds.has(id)) {
            toAdd.push({ id, name, color: colors[cIdx % colors.length] });
            cIdx++;
          }
        });
        return [...prev, ...toAdd];
      });
    }
  };

  // Create New Group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const colors = ['rose', 'sky', 'emerald', 'amber', 'purple', 'indigo'];
    const newGroup: MediaGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      color: colors[groups.length % colors.length],
    };

    setGroups((prev) => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
    setNewGroupName('');
    setShowNewGroupInput(false);
  };

  // Open Edit Modal
  const openEditModal = (post: InstagramPost) => {
    setEditingPost(post);
    setEditGroupTitle(post.groupTitle || post.groupName || '');
    setEditCaptionText(post.caption || '');
    setEditPostGroup(post.groupId || 'group-default');
    setEditPostDuration(post.duration || defaultDuration);
  };

  // Save Edit Caption & Group & Duration
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    const targetGroup = groups.find((g) => g.id === editPostGroup);
    const resolvedGroupTitle = editGroupTitle.trim() || targetGroup?.name || editingPost.groupName || 'Tanıtım';

    const updatedPost: InstagramPost = {
      ...editingPost,
      groupTitle: resolvedGroupTitle,
      caption: editCaptionText,
      groupId: editPostGroup,
      groupName: targetGroup?.name || resolvedGroupTitle,
      duration: editPostDuration,
    };

    if (onSavePostEdit) {
      onSavePostEdit(updatedPost, true);
    } else {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingPost.id || (editingPost.groupId && p.groupId === editingPost.groupId)
            ? {
                ...p,
                groupTitle: resolvedGroupTitle,
                caption: editCaptionText,
                groupId: editPostGroup,
                groupName: targetGroup?.name || resolvedGroupTitle,
                duration: editPostDuration,
              }
            : p
        )
      );
    }

    setEditingPost(null);
  };

  // Open Group Modal for Selected Photos
  const handleOpenGroupModal = () => {
    const selected = posts.filter((p) => selectedPostIds.includes(p.id));
    if (selected.length === 0) return;

    const firstTitle = selected[0]?.groupTitle || selected[0]?.groupName || `${selected.length}'li Fotoğraf Grubu`;
    const firstCaption = selected[0]?.caption || '';
    setGroupTitleInput(firstTitle);
    setGroupCaptionText(firstCaption);
    setGroupSlideDuration(4.0);
    setIsGroupModalOpen(true);
  };

  // Save Grouping for Selected Photos
  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPostIds.length === 0) return;

    const newGroupId = `group-custom-${Date.now()}`;
    const newTitle = groupTitleInput.trim() || `${selectedPostIds.length}'li Fotoğraf Grubu`;

    // Add to groups list if not already present
    if (!groups.some((g) => g.id === newGroupId)) {
      setGroups((prev) => [
        ...prev,
        { id: newGroupId, name: newTitle, color: 'sky' },
      ]);
    }

    if (onGroupSelectedPosts) {
      onGroupSelectedPosts(newGroupId, newTitle, groupCaptionText, groupSlideDuration);
    } else {
      // Update all selected posts with shared groupId, groupTitle, groupName, caption, and duration
      setPosts((prev) =>
        prev.map((p) => {
          if (selectedPostIds.includes(p.id)) {
            return {
              ...p,
              groupId: newGroupId,
              groupTitle: newTitle,
              groupName: newTitle,
              caption: groupCaptionText,
              duration: groupSlideDuration,
            };
          }
          return p;
        })
      );
    }

    setIsGroupModalOpen(false);
  };

  // Handle Instagram JSON file selection
  const handleJsonFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingJson(true);
    setJsonErrorMessage(null);
    setJsonStatusMessage('');

    try {
      const fileList = Array.from(files);
      const jsonFile = fileList.find((f) => f.name.toLowerCase().endsWith('.json'));
      const imageFiles = fileList.filter((f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name));

      if (!jsonFile) {
        throw new Error('Lütfen Instagram veri indirme paketindeki geçerli bir .json dosyası (örneğin "posts_1.json") seçin.');
      }

      setJsonFileName(jsonFile.name);
      const text = await jsonFile.text();
      const parsed = parseInstagramExportJson(text);
      setParsedIgPosts(parsed);

      let msg = `"${jsonFile.name}" dosyasından ${parsed.length} gönderi başarıyla okundu!`;

      // If user also selected images simultaneously
      if (imageFiles.length > 0) {
        const { postsWithMedia, matchedCount } = matchFilesWithInstagramPosts(parsed, imageFiles);
        if (postsWithMedia.length > 0) {
          registerPostGroups(postsWithMedia);
          setMatchedPostsPreview(postsWithMedia);
          if (onBatchImport) {
            onBatchImport(postsWithMedia);
          } else {
            setPosts((prev) => [...postsWithMedia, ...prev]);
            selectAllPosts(postsWithMedia);
          }
          msg += ` ve ${matchedCount} görsel otomatik eşleştirilip videoya eklendi!`;
        }
      } else {
        msg += ' Şimdi bu gönderilerin fotoğraflarını eşleştirmek için "Fotoğrafları Eşleştir" butonundan fotoğrafları veya "media" klasörünü seçin.';
      }

      setJsonStatusMessage(msg);
    } catch (err: any) {
      console.error('Instagram JSON okuma hatası:', err);
      setJsonErrorMessage(err?.message || 'JSON dosyası işlenirken bir hata oluştu.');
    } finally {
      setIsProcessingJson(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle matching media folder or photos with already parsed JSON
  const handleMatchMediaFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || parsedIgPosts.length === 0) return;

    setIsProcessingJson(true);
    setJsonErrorMessage(null);

    try {
      const fileList = Array.from(files);
      const { postsWithMedia, matchedCount } = matchFilesWithInstagramPosts(parsedIgPosts, fileList);

      if (matchedCount === 0) {
        setJsonErrorMessage(
          `Seçilen ${fileList.length} dosya arasında JSON'daki dosya isimleriyle ("${parsedIgPosts[0]?.mediaItems[0]?.filename || 'ör. 38491.jpg'}") eşleşen görsel bulunamadı. Lütfen Instagram ZIP içindeki "media/posts" klasöründeki fotoğrafları seçtiğinizden emin olun.`
        );
      } else {
        registerPostGroups(postsWithMedia);
        setMatchedPostsPreview(postsWithMedia);
        if (onBatchImport) {
          onBatchImport(postsWithMedia);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOnes = postsWithMedia.filter((p) => !existingIds.has(p.id));
            return [...newOnes, ...prev];
          });
          selectAllPosts(postsWithMedia);
        }
        setJsonStatusMessage(`✓ Harika! ${matchedCount} adet fotoğraf ve Instagram açıklaması başarıyla eşleştirildi ve videoya eklendi!`);
      }
    } catch (err: any) {
      console.error('Medya eşleştirme hatası:', err);
      setJsonErrorMessage(err?.message || 'Görseller eşleştirilirken bir hata oluştu.');
    } finally {
      setIsProcessingJson(false);
      if (e.target) e.target.value = '';
    }
  };

  // Load a demo Instagram JSON for immediate testing
  const handleLoadDemoInstagramJson = () => {
    const demoJson = JSON.stringify([
      {
        title: "Mimar ve Mühendisler Grubu Bursa Şubesi olarak 30. Yıl faaliyetlerimizi gururla sürdürüyoruz. Geleceğe değer katan projeler ve güçlü birliktelik. #mmg #muhendislik #mimarlik",
        creation_timestamp: Math.floor(Date.now() / 1000) - 86400 * 5,
        media: [
          {
            uri: "media/posts/202310/mmg_30_yil_1.jpg",
            title: "30. Yıl Faaliyetleri ve Proje Değerlendirmeleri"
          }
        ]
      },
      {
        title: "Şubemizde düzenlediğimiz teknik seminer ve vizyon buluşması. Katılım sağlayan tüm değerli üyelerimize teşekkür ederiz. #teknoloji #inovasyon",
        creation_timestamp: Math.floor(Date.now() / 1000) - 86400 * 12,
        media: [
          {
            uri: "media/posts/202310/mmg_seminer_2.jpg",
            title: "Teknik Seminer ve Vizyon Buluşması"
          }
        ]
      },
      {
        title: "Sürdürülebilir şehirler ve depreme dayanıklı yapılar çalıştayı başarıyla tamamlandı. #bursa #mimarlik #deprem",
        creation_timestamp: Math.floor(Date.now() / 1000) - 86400 * 20,
        media: [
          {
            uri: "media/posts/202310/surdurulebilir_yapi_3.jpg",
            title: "Depreme Dayanıklı Yapılar Çalıştayı"
          }
        ]
      }
    ]);

    setJsonFileName("ornek_instagram_posts.json");
    const parsed = parseInstagramExportJson(demoJson);
    setParsedIgPosts(parsed);
    setJsonStatusMessage(`Örnek Instagram verisinden ${parsed.length} gönderi okundu! Fotoğrafları eşleştirmek için "Fotoğrafları Eşleştir" butonuna basabilir veya mevcut fotoğraflarınızla deneyebilirsiniz.`);
    setJsonErrorMessage(null);
  };

  // Delete Single Post
  const handleDeletePost = (postId: string) => {
    if (onDeletePost) {
      onDeletePost(postId);
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  // Filtered Posts
  const filteredPosts =
    activeGroupId === 'all'
      ? posts
      : posts.filter((p) => p.groupId === activeGroupId || (!p.groupId && activeGroupId === 'group-default'));

  return (
    <div className="space-y-6">
      {/* Top Banner: Import Tools */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                <FolderUp className="h-4 w-4" />
              </span>
              Görselleri İçe Aktar & Grupla
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Tanıtım videosunda yer alacak fotoğrafları yükleyin, bölümlere göre gruplayın ve altyazı açıklamalarını belirleyin.
            </p>
          </div>

          {/* Import Modes */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setImportMode('upload')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                importMode === 'upload'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderUp className="h-3.5 w-3.5" />
              <span>Dosyadan Seç</span>
            </button>
            <button
              onClick={() => setImportMode('json')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                importMode === 'json'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
                  : 'text-sky-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Instagram .JSON İçe Aktar</span>
            </button>
          </div>
        </div>

        {/* Import Mode 1: File Upload */}
        {importMode === 'upload' && (
          <div className="mt-4 space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={handleBatchFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 hover:border-rose-500 bg-slate-800/40 hover:bg-slate-800/80 p-8 text-center cursor-pointer transition group"
            >
              <FolderUp className="h-10 w-10 text-slate-400 group-hover:text-rose-400 mb-2 transition" />
              <span className="text-sm font-bold text-white group-hover:text-rose-300">
                Fotoğrafları Seçin veya Buraya Sürükleyin
              </span>
              <span className="mt-1 text-xs text-slate-400">
                Birden fazla fotoğrafı aynı anda seçip otomatik video slaytlarına dönüştürebilirsiniz.
              </span>
            </div>
          </div>
        )}

        {/* Import Mode 2: Instagram .JSON File & Media Importer */}
        {importMode === 'json' && (
          <div className="mt-4 space-y-4">
            {/* Hidden Inputs */}
            <input
              type="file"
              ref={jsonFileInputRef}
              accept=".json,application/json"
              onChange={handleJsonFileSelect}
              className="hidden"
            />
            <input
              type="file"
              ref={mediaFolderInputRef}
              multiple
              accept="image/*"
              onChange={handleMatchMediaFiles}
              className="hidden"
            />
            <input
              type="file"
              ref={combinedJsonMediaInputRef}
              multiple
              onChange={handleJsonFileSelect}
              className="hidden"
            />

            {/* Step 1: Upload JSON Dropzone */}
            <div className="rounded-2xl border-2 border-dashed border-sky-500/30 hover:border-sky-400 bg-sky-950/20 hover:bg-sky-950/30 p-6 sm:p-8 text-center transition">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20 mb-3">
                <FileCode className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-white">
                Instagram Veri İndirme (.json) Dosyasını Yükleyin
              </h3>
              <p className="mt-1 text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                Instagram hesabınızdan indirdiğiniz ZIP paketi içerisindeki <strong className="text-sky-400 font-bold">posts_1.json</strong> veya <strong className="text-sky-400 font-bold">your_posts_1.json</strong> dosyasını seçin. Gönderi altyazıları, başlıklar ve tarihler otomatik okunur.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => jsonFileInputRef.current?.click()}
                  disabled={isProcessingJson}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/25 transition active:scale-95 disabled:opacity-50"
                >
                  <FolderUp className="h-4 w-4" />
                  <span>.JSON Dosyası Seç</span>
                </button>

                <button
                  type="button"
                  onClick={() => combinedJsonMediaInputRef.current?.click()}
                  disabled={isProcessingJson}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition"
                  title="Hem JSON dosyasını hem fotoğrafları aynı anda seçin"
                >
                  <FolderArchive className="h-4 w-4 text-sky-400" />
                  <span>JSON + Fotoğrafları Birlikte Seç</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadDemoInstagramJson}
                  className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 px-3.5 py-2.5 text-xs font-semibold text-sky-300 transition"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                  <span>Örnek Veri ile Dene</span>
                </button>
              </div>
            </div>

            {/* Error Message if any */}
            {jsonErrorMessage && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-rose-300">Bir Hata Oluştu</div>
                  <div className="mt-0.5">{jsonErrorMessage}</div>
                </div>
              </div>
            )}

            {/* Success Status & Photo Matching Step */}
            {jsonStatusMessage && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200 space-y-3">
                <div className="flex items-center gap-2.5 font-bold text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>{jsonStatusMessage}</span>
                </div>

                {parsedIgPosts.length > 0 && (
                  <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-emerald-300">
                      Toplanan {parsedIgPosts.length} gönderi metni için Instagram ZIP içindeki görselleri bağlayın:
                    </div>
                    <button
                      type="button"
                      onClick={() => mediaFolderInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/25 transition active:scale-95"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>Fotoğrafları Eşleştir (Çoklu Fotoğraf Seç)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Parsed Posts Preview List */}
            {parsedIgPosts.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <FileText className="h-4 w-4 text-sky-400" />
                    <span>Okunan Instagram Gönderileri ({parsedIgPosts.length} Adet)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Dosya: <strong className="text-slate-200">{jsonFileName || 'posts_1.json'}</strong>
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/60">
                  {parsedIgPosts.slice(0, 15).map((ig, idx) => (
                    <div key={ig.id || idx} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[11px] text-sky-400 font-semibold">
                          <Calendar className="h-3 w-3" />
                          <span>{ig.formattedDate}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400 truncate">
                            {ig.mediaItems.length} Medya: {ig.mediaItems.map((m) => m.filename).join(', ')}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-200 line-clamp-2 text-[11px] leading-relaxed">
                          {ig.title || 'Açıklama belirtilmemiş'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {parsedIgPosts.length > 15 && (
                    <div className="pt-2 text-center text-[11px] text-slate-500">
                      ve {parsedIgPosts.length - 15} gönderi daha...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Duration & Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Fotoğraf Gösterim Süresi:</span>
              <span className="text-rose-400 font-extrabold text-sm">{defaultDuration.toFixed(1)} sn</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Her fotoğrafın videoda kaç saniye ekranda kalacağını belirleyin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[2.0, 2.5, 3.0, 4.0, 5.0, 6.0].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => onUpdateDefaultDuration(sec)}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-bold border transition ${
                Math.abs(defaultDuration - sec) < 0.1
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {sec.toFixed(1)}s
            </button>
          ))}
        </div>
      </div>

      {/* Groups Filter & Management Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mr-1">
            <Filter className="h-3.5 w-3.5 text-rose-400" />
            <span>Gruplar:</span>
          </div>

          <button
            onClick={() => setActiveGroupId('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition border ${
              activeGroupId === 'all'
                ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            Tüm Görseller ({posts.length})
          </button>

          {groups.map((group) => {
            const count = posts.filter(
              (p) => p.groupId === group.id || (!p.groupId && group.id === 'group-default')
            ).length;
            const isSelected = activeGroupId === group.id;

            return (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition border ${
                  isSelected
                    ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                    : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <span>{group.name}</span>
                <span className="rounded-full bg-black/30 px-1.5 py-0.2 text-[10px] text-white/80">
                  {count}
                </span>
              </button>
            );
          })}

          {showNewGroupInput ? (
            <form onSubmit={handleCreateGroup} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Grup Adı..."
                className="rounded-lg border border-rose-500 bg-slate-800 px-2.5 py-1 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-600"
              >
                Ekle
              </button>
              <button
                type="button"
                onClick={() => setShowNewGroupInput(false)}
                className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-white"
              >
                İptal
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowNewGroupInput(true)}
              className="flex items-center gap-1 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition"
            >
              <FolderPlus className="h-3.5 w-3.5 text-rose-400" />
              <span>Yeni Grup</span>
            </button>
          )}
        </div>

        {/* Quick Selection Actions */}
        {posts.length > 0 && (
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (onReverseOrder) {
                  onReverseOrder();
                } else {
                  setPosts((prev) => [...prev].reverse());
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:text-white px-3 py-1.5 text-xs font-semibold text-slate-200 transition shadow-sm"
              title="Fotoğrafların gösterim ve eklenme sırasını tersine çevir"
            >
              <ArrowDownUp className="h-3.5 w-3.5 text-rose-400" />
              <span>Sıralamayı Tersine Döndür</span>
            </button>
            <button
              onClick={() => selectAllPosts(filteredPosts)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
            >
              Gruptakileri Seç ({filteredPosts.length})
            </button>
            <button
              onClick={clearSelection}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Temizle
            </button>
          </div>
        )}
      </div>

      {/* Grid or Empty State */}
      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/30 p-8 sm:p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 text-rose-400 mb-4 border border-slate-700">
            <Layers className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">
            {posts.length === 0 ? 'Henüz Görsel Yüklenmedi' : 'Bu Grupta Henüz Görsel Yok'}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {posts.length === 0
              ? 'Yukarıdaki alandan fotoğraflarınızı seçerek veya Ctrl+V ile yapıştırarak videonuzu hazırlamaya başlayın.'
              : 'Görselleri bu gruba atamak için aşağıdaki kartlardan "Açıklama / Grup Düzenle" butonunu kullanabilirsiniz.'}
          </p>

          {posts.length === 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/25 transition"
              >
                <FolderUp className="h-4 w-4" />
                <span>Fotoğraf Seç & Yükle</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPosts.map((post) => {
            const isSelected = selectedPostIds.includes(post.id);
            const selectIndex = selectedPostIds.indexOf(post.id);
            const currentGroup = groups.find((g) => g.id === post.groupId);
            const durationDisplay = post.duration || defaultDuration;

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

                  {/* Top-Right Sequence Badge */}
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

                  {/* Top-Left Action Buttons */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(post);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-slate-300 hover:text-white hover:bg-black/90 backdrop-blur-sm border border-white/10"
                      title="Açıklama, Süre ve Grubu Düzenle"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePost(post.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-slate-300 hover:text-red-400 hover:bg-black/90 backdrop-blur-sm border border-white/10"
                      title="Görseli Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Duration & Group Tag on Image */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between">
                    <span className="rounded-lg bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold text-rose-300 border border-white/10 truncate max-w-[65%]">
                      📁 {currentGroup?.name || post.groupName || 'Genel'}
                    </span>
                    <span className="rounded-lg bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-sky-300 border border-white/10">
                      ⏱ {durationDisplay.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Caption & Details below Image */}
                <div className="p-3.5 flex flex-col justify-between flex-1">
                  <div>
                    {/* Grup Başlığı */}
                    <div className="flex items-center gap-1 mb-1">
                      <Tag className="h-3 w-3 text-rose-400 shrink-0" />
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide truncate">
                        {post.groupTitle || post.groupName || 'Tanıtım'}
                      </span>
                    </div>

                    {/* Grup Açıklaması */}
                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                      {post.caption || 'Açıklama girilmedi'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px]">
                    <span className="text-slate-400">
                      {isSelected ? 'Sıra: #' + (selectIndex + 1) : 'Seçilmedi'}
                    </span>
                    <span
                      className={`font-semibold ${
                        isSelected ? 'text-rose-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    >
                      {isSelected ? '✓ Videoda' : '+ Videoya Ekle'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Floating Step Banner */}
      <div className="sticky bottom-4 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl shadow-black/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 font-black">
            {selectedPostIds.length}
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {selectedPostIds.length > 0
                ? `${selectedPostIds.length} Görsel Seçildi`
                : 'Lütfen En Az 1 Görsel Seçin'}
            </div>
            <p className="text-xs text-slate-400">
              Görseller ve açıklamaları seçtiğiniz sırada videoda oynatılacaktır.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedPostIds.length >= 2 && (
            <button
              type="button"
              onClick={handleOpenGroupModal}
              className="flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/20 hover:bg-sky-500/30 px-4 py-2.5 text-xs font-bold text-sky-300 transition shadow-lg shadow-sky-500/10"
            >
              <Layers className="h-4 w-4 text-sky-400" />
              <span>Seçilen {selectedPostIds.length} Fotoğrafı Grupla & Açıklama Yaz</span>
            </button>
          )}

          <button
            onClick={onContinue}
            disabled={selectedPostIds.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-40 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/25 active:scale-95 transition"
          >
            <span>Logo & Açılış Sekmesine Geç</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Edit Caption & Group & Duration Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-rose-400" />
              Grup Başlığı ve Açıklama Düzenle
            </h3>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div className="relative h-36 w-full rounded-xl overflow-hidden border border-slate-700 bg-black">
                <img
                  src={editingPost.imageUrl}
                  alt="Önizleme"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* 1. Grup Başlığı (Fotoğrafların Üstünde - Logonun Sağında) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-rose-400" />
                    <span>Grup Başlığı (Fotoğrafların Üstünde)</span>
                  </span>
                  <span className="text-[10px] text-rose-400 font-medium">Logonun yanında ortalı</span>
                </label>
                <input
                  type="text"
                  value={editGroupTitle}
                  onChange={(e) => setEditGroupTitle(e.target.value)}
                  placeholder="Örn: FAALİYET TANITIMI"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Videoda fotoğrafların üstünde logonun sağında fotoğraflarla ortalı görünen başlık.
                </p>
              </div>

              {/* 2. Grup Açıklaması (Fotoğrafların Altında) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-sky-400" />
                    <span>Grup Açıklaması (Fotoğrafların Altında)</span>
                  </span>
                  <span className="text-[10px] text-sky-400 font-medium">Altta modern altyazı</span>
                </label>
                <textarea
                  value={editCaptionText}
                  onChange={(e) => setEditCaptionText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  placeholder="Fotoğrafların altında yer alacak detaylı açıklama metni..."
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Videoda fotoğrafların altında zarif punto tasarımıyla yer alacak altyazı metni.
                </p>
              </div>

              {/* Duration Setting */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-sky-400" />
                    <span>Bu Fotoğrafın Ekranda Kalma Süresi:</span>
                  </span>
                  <span className="text-sky-400 font-extrabold">{editPostDuration.toFixed(1)} saniye</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={10.0}
                  step={0.5}
                  value={editPostDuration}
                  onChange={(e) => setEditPostDuration(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Group */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Ait Olduğu Grup / Bölüm
                </label>
                <select
                  value={editPostGroup}
                  onChange={(e) => setEditPostGroup(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-500 hover:bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-500/25"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Selected Photos & Set Video Caption Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-sky-500/30 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-sky-400" />
              <span>Seçilen {selectedPostIds.length} Fotoğrafı Grupla</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Seçilen fotoğraflar aynı sayfada (3 fotoğrafa kadar kolaj) gösterilir. Üstte grup başlığı, altta grup açıklaması yer alır.
            </p>

            <form onSubmit={handleSaveGroup} className="mt-4 space-y-4">
              {/* Photo Thumbnails Preview */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Gruplanacak Fotoğraflar ({selectedPostIds.length} Adet):
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-28 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {posts
                    .filter((p) => selectedPostIds.includes(p.id))
                    .map((p, idx) => (
                      <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700">
                        <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                        <span className="absolute top-1 left-1 bg-black/80 text-sky-300 font-bold text-[9px] px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* 1. Grup Başlığı (Fotoğrafların Üstünde) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-rose-400" />
                    <span>Grup Başlığı (Fotoğrafların Üstünde)</span>
                  </span>
                  <span className="text-[10px] text-rose-400 font-medium">Logonun yanında ortalı</span>
                </label>
                <input
                  type="text"
                  value={groupTitleInput}
                  onChange={(e) => setGroupTitleInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  placeholder="Örn: FAALİYET TANITIMI"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Fotoğrafların üstünde logonun sağında fotoğraflar ile ortalı olarak gösterilecek başlık.
                </p>
              </div>

              {/* 2. Grup Açıklaması (Fotoğrafların Altında) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-sky-400" />
                    <span>Grup Açıklaması (Fotoğrafların Altında)</span>
                  </span>
                  <span className="text-[10px] text-sky-400 font-medium">Fotoğrafların altında modern altyazı</span>
                </label>
                <textarea
                  value={groupCaptionText}
                  onChange={(e) => setGroupCaptionText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  placeholder="Videoda fotoğrafların altında yer alacak detaylı açıklama metni..."
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Fotoğrafların altında zarif punto tasarımıyla yer alacak altyazı metni.
                </p>
              </div>

              {/* Slayt Gösterim Süresi */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Slayt Gösterim Süresi:</span>
                  <span className="text-sky-400 font-extrabold">{groupSlideDuration.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={2.0}
                  max={10.0}
                  step={0.5}
                  value={groupSlideDuration}
                  onChange={(e) => setGroupSlideDuration(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/25"
                >
                  Grubu Oluştur & Kaydet (3'lü Kolaj)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
