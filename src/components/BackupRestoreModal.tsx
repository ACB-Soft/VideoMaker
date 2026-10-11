import React, { useRef, useState } from 'react';
import {
  ProjectBackupPayload,
  matchFilesWithBackup,
} from '../services/projectBackup';
import { InstagramPost, VideoSlide } from '../types/video';
import {
  FolderUp,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  backup: ProjectBackupPayload;
  onCompleteRestore: (posts: InstagramPost[], backup: ProjectBackupPayload, ignoredCount?: number) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  backup,
  onCompleteRestore,
}) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [matchedCount, setMatchedCount] = useState<number>(0);
  const [matchedPosts, setMatchedPosts] = useState<InstagramPost[]>([]);
  const [missingList, setMissingList] = useState<string[]>([]);
  const [hasTriedMatching, setHasTriedMatching] = useState(false);

  if (!isOpen) return null;

  const handlePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const { posts, matchedCount: count, ignoredCount, missingFilenames } = matchFilesWithBackup(backup, fileList);

    setMatchedCount(count);
    setMatchedPosts(posts);
    setMissingList(missingFilenames);
    setHasTriedMatching(true);

    if (count > 0) {
      onCompleteRestore(posts, backup, ignoredCount);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Proje Yedeği Yüklendi ({backup.items.length} Fotoğraf)
              </h3>
              <p className="text-xs text-slate-400">
                Açıklamalar, başlıklar ve süreleriniz hazır. Şimdi fotoğrafları bağlayın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="rounded-xl border border-sky-500/25 bg-sky-950/20 p-3.5 text-xs text-slate-300 space-y-1.5">
          <div className="font-semibold text-sky-300 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
            <span>JSON Yedeğindeki Ayarlar Okundu:</span>
          </div>
          <div className="text-[11px] text-slate-400 grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
            <div>Toplam Fotoğraf: <strong className="text-white">{backup.items.length} Adet</strong></div>
            <div>Varsayılan Süre: <strong className="text-white">{backup.defaultSlideDuration}s</strong></div>
            <div>Format Oranı: <strong className="text-white">{backup.aspectRatio}</strong></div>
            <div>Gruplar: <strong className="text-white">{backup.groups.length} Grup</strong></div>
          </div>
        </div>

        {/* Expected Photos List */}
        <div className="flex-1 min-h-0 flex flex-col space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Eşleştirilecek Fotoğraflar ({backup.items.length} Adet):</span>
            <span className="text-[10px] text-slate-400 font-normal">Dosya adlarıyla otomatik eşleşir</span>
          </label>

          <div className="flex-1 overflow-y-auto max-h-48 rounded-xl border border-slate-800 bg-slate-950/60 p-2 space-y-1.5 divide-y divide-slate-800/60 pr-1">
            {backup.items.map((item, idx) => {
              const isMatched = matchedPosts.some(
                (p) =>
                  p.filename?.toLowerCase() === item.filename.toLowerCase() &&
                  !p.imageUrl.startsWith('data:image/svg+xml')
              );

              return (
                <div
                  key={idx}
                  className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-500 w-5">#{idx + 1}</span>
                    <span className="font-mono text-[11px] text-sky-300 truncate font-semibold">
                      {item.filename}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 shrink-0">
                      {item.groupTitle || item.groupName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {item.duration}s
                    </span>

                    {hasTriedMatching && (
                      isMatched ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Bağlandı</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[10px]">
                          Eksik
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Photo Selection Area */}
        <div className="pt-2 space-y-2">
          {/* Security & Filter Note */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 text-[11px] text-slate-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 font-bold shrink-0">
              ✓
            </span>
            <span>
              <strong>Filtreleme Koruması:</strong> Sadece bu listedeki <strong className="text-white">{backup.items.length} adet fotoğraf</strong> yüklenecektir. Bilgisayardan tüm klasörü seçseniz bile yedekte ismi olmayan fotoğraflar <strong>otomatik olarak elenir ve projeye dahil edilmez</strong>.
            </span>
          </div>

          {hasTriedMatching && matchedCount === 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-950/60 border border-amber-500/40 p-2.5 text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                Seçilen dosyalar yedekteki dosya adlarıyla eşleşmedi. Lütfen fotoğrafların ({backup.items[0]?.filename} vb.) bulunduğu klasörü seçin.
              </span>
            </div>
          )}

          <input
            type="file"
            ref={photoInputRef}
            multiple
            accept="image/*"
            onChange={handlePhotosSelected}
            className="hidden"
          />

          <div
            onClick={() => photoInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-sky-500/40 hover:border-sky-400 bg-sky-950/20 hover:bg-sky-950/30 p-5 text-center cursor-pointer transition group"
          >
            <FolderUp className="h-8 w-8 text-sky-400 group-hover:scale-110 transition mb-1.5" />
            <span className="text-xs font-bold text-white group-hover:text-sky-300">
              Fotoğrafları Bilgisayardan Seçin (Tüm Klasörü Seçebilirsiniz)
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Yedekteki isimlerle ({backup.items.slice(0, 3).map((i) => i.filename).join(', ')} vb.) eşleşen fotoğraflar anında bağlanır, fazlalıklar elenir.
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/25 transition active:scale-95"
          >
            <FolderUp className="h-4 w-4" />
            <span>Fotoğrafları Seç & Eşleştir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
