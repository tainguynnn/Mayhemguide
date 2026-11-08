import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  FileJson,
  FlaskConical,
  RefreshCw,
  RotateCcw,
  Trash2,
  Trophy,
  Upload,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import { createBackupPayload, parseBackupPayload } from '../../services/buildStorage';
import {
  getDefaultGameDataBundle,
  isValidGameDataBundle,
} from '../../services/gameDataRepository';
import {
  getDefaultMetaStatsBundle,
  isValidMetaStatsBundle,
} from '../../services/metaStatsRepository';
import type { MayhemBuild } from '../../types/build';
import { formatCompactNumber, formatDateVi } from '../../utils/formatters';
import { ConfirmDialog } from '../ui/ConfirmDialog';

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DataManagerView() {
  const {
    gameData,
    metaStats,
    library,
    notify,
    importBackup,
    restoreSampleBuilds,
    clearAllBuilds,
    updateGameDataBundle,
    resetGameDataBundle,
    updateMetaStatsBundle,
    resetMetaStatsBundle,
  } = useLibrary();

  const backupInputRef = useRef<HTMLInputElement>(null);
  const gameDataInputRef = useRef<HTMLInputElement>(null);
  const metaStatsInputRef = useRef<HTMLInputElement>(null);

  const [pendingImport, setPendingImport] = useState<{
    builds: MayhemBuild[];
    favoriteChampionIds: number[];
    fileName: string;
  } | null>(null);
  const [importError, setImportError] = useState('');
  const [gameDataError, setGameDataError] = useState('');
  const [metaStatsError, setMetaStatsError] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleExportBackup = () => {
    const payload = createBackupPayload(library);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadJsonFile(`aram-mayhem-builds-${dateStr}.json`, payload);
    notify(`Đã xuất ${library.builds.length} bộ build ra file JSON`);
  };

  const handleSelectBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    try {
      const text = await file.text();
      const parsed = parseBackupPayload(text);
      if (!parsed.ok) {
        setImportError(parsed.error);
        return;
      }
      setPendingImport({
        builds: parsed.builds,
        favoriteChampionIds: parsed.favoriteChampionIds,
        fileName: file.name,
      });
    } catch {
      setImportError('Không thể đọc file đã chọn.');
    }
  };

  const handleExportGameDataTemplate = () => {
    const bundle = gameData.isCustomOverride
      ? gameData.bundle
      : getDefaultGameDataBundle();
    downloadJsonFile(`aram-mayhem-gamedata-v${bundle.manifest.version}.json`, bundle);
    notify('Đã xuất gói dữ liệu Game JSON');
  };

  const handleImportGameDataFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setGameDataError('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isValidGameDataBundle(parsed)) {
        setGameDataError(
          'File dữ liệu Game JSON không hợp lệ (cần có manifest, champions, augments, items, summonerSpells, statShards).'
        );
        return;
      }
      updateGameDataBundle(parsed);
    } catch {
      setGameDataError('Không thể phân tích cú pháp file dữ liệu Game JSON.');
    }
  };

  const handleExportMetaStats = () => {
    const bundle = metaStats.isCustomOverride
      ? metaStats.bundle
      : getDefaultMetaStatsBundle();
    downloadJsonFile(`aram-mayhem-metastats-${bundle.patch}.json`, bundle);
    notify('Đã xuất gói thống kê Meta JSON');
  };

  const handleImportMetaStatsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMetaStatsError('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isValidMetaStatsBundle(parsed)) {
        setMetaStatsError(
          'File thống kê Meta JSON không hợp lệ (cần có patch, dataDate, source, champions, augments).'
        );
        return;
      }
      updateMetaStatsBundle({
        ...parsed,
        dataKind: parsed.dataKind || 'manual',
      });
    } catch {
      setMetaStatsError('Không thể phân tích cú pháp file thống kê Meta JSON.');
    }
  };

  const dataKindMeta = t.dataKind[metaStats.bundle.dataKind || 'real'];

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Header */}
      <section className="liquid-glass rounded-3xl p-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.08] border border-white/15">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">
              Sao Lưu &amp; Quản Lý Dữ Liệu
            </h1>
            <p className="text-xs sm:text-sm text-white/55 mt-1">
              Kiến trúc tách biệt hoàn toàn giữa Dữ liệu Build cá nhân, Dữ liệu Thống kê Meta và Dữ liệu Game ARAM: Mayhem.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: User Library Backup */}
        <section className="liquid-glass rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">
                1. Sao Lưu Thư Viện Build Cá Nhân
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Hiện có <span className="font-mono-num text-white/85">{library.builds.length}</span>{' '}
                bộ build và{' '}
                <span className="font-mono-num text-white/85">
                  {library.favoriteChampionIds.length}
                </span>{' '}
                tướng yêu thích.
              </p>
            </div>
            <FileJson className="h-5 w-5 text-white/40" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white text-black hover:bg-white/90 px-4 py-3 text-xs font-semibold transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Xuất JSON Sao Lưu (Export)</span>
            </button>

            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/15 px-4 py-3 text-xs font-semibold text-white transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Nhập từ JSON (Import)</span>
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleSelectBackupFile}
              className="hidden"
            />
          </div>

          {importError && (
            <div className="rounded-xl bg-white/10 border border-white/30 px-3.5 py-2.5 text-xs text-white">
              {importError}
            </div>
          )}

          {pendingImport && (
            <div className="liquid-glass-subtle rounded-2xl p-4 space-y-3 border-white/25">
              <div className="text-xs font-semibold text-white">
                Sẵn sàng nhập từ &ldquo;{pendingImport.fileName}&rdquo;
              </div>
              <p className="text-xs text-white/65">
                Tìm thấy <strong className="font-mono-num">{pendingImport.builds.length}</strong>{' '}
                bộ build và{' '}
                <strong className="font-mono-num">
                  {pendingImport.favoriteChampionIds.length}
                </strong>{' '}
                tướng yêu thích. Chọn phương thức nhập:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    importBackup(
                      pendingImport.builds,
                      pendingImport.favoriteChampionIds,
                      'merge'
                    );
                    setPendingImport(null);
                  }}
                  className="rounded-xl bg-white text-black px-3.5 py-2 text-xs font-semibold"
                >
                  Gộp vào thư viện hiện tại
                </button>
                <button
                  type="button"
                  onClick={() => {
                    importBackup(
                      pendingImport.builds,
                      pendingImport.favoriteChampionIds,
                      'replace'
                    );
                    setPendingImport(null);
                  }}
                  className="rounded-xl bg-white/[0.1] hover:bg-white/[0.18] border border-white/20 px-3.5 py-2 text-xs font-medium text-white"
                >
                  Thay thế toàn bộ
                </button>
                <button
                  type="button"
                  onClick={() => setPendingImport(null)}
                  className="rounded-xl px-3 py-2 text-xs text-white/55 hover:text-white"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={restoreSampleBuilds}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 px-3 py-2 text-xs text-white/80 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Nạp bộ build mẫu ARAM: Mayhem</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Xóa toàn bộ thư viện</span>
            </button>
          </div>
        </section>

        {/* Column 2: Meta Statistics Layer */}
        <section className="liquid-glass rounded-3xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-white">
                  2. Lớp Dữ Liệu Thống Kê Meta (Tier List)
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] border border-white/15 px-2.5 py-0.5 text-[10px] text-white/90">
                  {metaStats.bundle.dataKind === 'real' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <FlaskConical className="h-3 w-3" />
                  )}
                  <span>{dataKindMeta.badge}</span>
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">{dataKindMeta.desc}</p>
            </div>
            <Trophy className="h-5 w-5 text-white/40 shrink-0" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              ['Phiên bản', metaStats.bundle.patch],
              ['Ngày dữ liệu', formatDateVi(metaStats.bundle.dataDate)],
              ['Số trận', formatCompactNumber(metaStats.bundle.totalMatches)],
              ['Tướng / Lõi', `${metaStats.bundle.champions.length} / ${metaStats.bundle.augments.length}`],
            ].map(([label, val]) => (
              <div
                key={String(label)}
                className="liquid-glass-subtle rounded-xl p-3 space-y-0.5"
              >
                <div className="text-[10px] uppercase tracking-wider text-white/45">
                  {label}
                </div>
                <div className="font-mono-num text-sm font-semibold text-white truncate">
                  {val}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 text-xs text-white/70 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white/85">
                Nguồn thống kê: {metaStats.bundle.source.name}
              </span>
              <a
                href={metaStats.bundle.source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-white/70 hover:text-white"
              >
                <span>Mở nguồn</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {metaStats.bundle.source.note && (
              <p className="text-[11px] text-white/50 leading-relaxed">
                {metaStats.bundle.source.note}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-white/[0.08] space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportMetaStats}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 px-3.5 py-2 text-xs font-medium text-white transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Tải gói Meta Stats JSON</span>
              </button>

              <button
                type="button"
                onClick={() => metaStatsInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 px-3.5 py-2 text-xs font-medium text-white transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Cập nhật Meta Stats JSON</span>
              </button>
              <input
                ref={metaStatsInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportMetaStatsFile}
                className="hidden"
              />

              {metaStats.isCustomOverride && (
                <button
                  type="button"
                  onClick={resetMetaStatsBundle}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 px-3 py-2 text-xs text-white/80 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Về thống kê thực tế gốc</span>
                </button>
              )}
            </div>

            {metaStatsError && (
              <div className="rounded-xl bg-white/10 border border-white/30 px-3 py-2 text-xs text-white">
                {metaStatsError}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Row 2: Game Data Layer */}
      <section className="liquid-glass rounded-3xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                3. Lớp Dữ Liệu Game ARAM: Mayhem (Game Data Layer)
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] border border-white/15 px-2.5 py-0.5 font-mono-num text-[10px] text-white/85">
                <CheckCircle2 className="h-3 w-3" />
                v{gameData.bundle.manifest.version}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Dữ liệu Tướng, Trang bị, Phép bổ trợ, Mảnh chỉ số &amp; Lõi Công Nghệ ARAM: Mayhem tách rời khỏi giao diện để dễ cập nhật khi game đổi phiên bản.
            </p>
          </div>
        </div>

        {/* Verified Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            ['Tướng (Champions)', gameData.bundle.champions.length],
            ['Lõi Mayhem (Augments)', gameData.bundle.augments.length],
            ['Trang bị (Items)', gameData.bundle.items.length],
            ['Phép bổ trợ (Spells)', gameData.bundle.summonerSpells.length],
            ['Mảnh chỉ số (Shards)', gameData.bundle.statShards.length],
          ].map(([label, val]) => (
            <div
              key={String(label)}
              className="liquid-glass-subtle rounded-xl p-3 space-y-0.5"
            >
              <div className="text-[10px] uppercase tracking-wider text-white/45">
                {label}
              </div>
              <div className="font-mono-num text-lg font-semibold text-white">{val}</div>
            </div>
          ))}
        </div>

        {/* Sources */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-white/50">
            Nguồn dữ liệu game chính thống đã xác minh:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {gameData.bundle.manifest.sources.map((src) => (
              <a
                key={src.name}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] px-3 py-2 text-xs text-white/75 hover:text-white transition-colors"
              >
                <span>{src.name}</span>
                <ExternalLink className="h-3.5 w-3.5 text-white/40" />
              </a>
            ))}
          </div>
        </div>

        {/* Runtime Game Data Update */}
        <div className="pt-3 border-t border-white/[0.08] space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportGameDataTemplate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 px-3.5 py-2 text-xs font-medium text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Tải gói Dữ liệu Game JSON</span>
            </button>

            <button
              type="button"
              onClick={() => gameDataInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 px-3.5 py-2 text-xs font-medium text-white transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Cập nhật Dữ liệu Game JSON</span>
            </button>
            <input
              ref={gameDataInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportGameDataFile}
              className="hidden"
            />

            {gameData.isCustomOverride && (
              <button
                type="button"
                onClick={resetGameDataBundle}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 px-3 py-2 text-xs text-white/80 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Về dữ liệu gốc</span>
              </button>
            )}
          </div>

          {gameDataError && (
            <div className="rounded-xl bg-white/10 border border-white/30 px-3 py-2 text-xs text-white">
              {gameDataError}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Xóa toàn bộ thư viện bộ build?"
        description="Tất cả các bộ build và tướng yêu thích đã lưu trên trình duyệt sẽ bị xóa. Bạn nên Xuất JSON sao lưu trước khi tiếp tục."
        confirmLabel="Xóa toàn bộ"
        danger
        onConfirm={() => {
          clearAllBuilds();
          setConfirmClearOpen(false);
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
