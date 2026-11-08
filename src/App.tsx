import { useState } from 'react';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { t } from './i18n/vi';
import { TopNav, type AppRoute } from './components/layout/TopNav';
import { TierListView } from './components/tierlist/TierListView';
import { ChampionLibraryView } from './components/champions/ChampionLibraryView';
import { AugmentLibraryView } from './components/augments/AugmentLibraryView';
import { ChampionBuildsView } from './components/builds/ChampionBuildsView';
import { MyBuildsView } from './components/builds/MyBuildsView';
import { BuildEditorView } from './components/editor/BuildEditorView';
import { DataManagerView } from './components/data/DataManagerView';
import { BuildDetailModal } from './components/builds/BuildDetailModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { ToastContainer } from './components/ui/ToastContainer';
import type { MayhemBuild } from './types/build';

function AppShell() {
  const { library, deleteBuild, duplicateBuild } = useLibrary();
  const [route, setRoute] = useState<AppRoute>({ view: 'tier-list' });
  const [championSearchPrefill, setChampionSearchPrefill] = useState('');
  const [detailBuildId, setDetailBuildId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MayhemBuild | null>(null);

  const detailBuild = detailBuildId
    ? library.builds.find((b) => b.id === detailBuildId) ?? null
    : null;

  const editingBuild =
    route.view === 'editor' && route.buildId
      ? library.builds.find((b) => b.id === route.buildId)
      : undefined;

  const navigate = (next: AppRoute) => {
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="mayhem-backdrop" />

      <TopNav route={route} onNavigate={navigate} />

      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {route.view === 'tier-list' && (
          <TierListView
            onSelectChampion={(championId) =>
              navigate({ view: 'champion-builds', championId })
            }
            onCreateBuild={(championId, augmentId) =>
              navigate({
                view: 'editor',
                preselectedChampionId: championId,
                preselectedAugmentId: augmentId,
              })
            }
            onOpenAugmentLibrary={(augmentId) =>
              navigate({ view: 'augments', initialAugmentId: augmentId })
            }
            onOpenDataManager={() => navigate({ view: 'data' })}
          />
        )}

        {route.view === 'champions' && (
          <ChampionLibraryView
            initialSearch={championSearchPrefill}
            onSelectChampion={(championId) => {
              setChampionSearchPrefill('');
              navigate({ view: 'champion-builds', championId });
            }}
          />
        )}

        {route.view === 'augments' && (
          <AugmentLibraryView
            initialAugmentId={route.initialAugmentId}
            onSelectChampion={(championId) =>
              navigate({ view: 'champion-builds', championId })
            }
            onCreateBuildWithAugment={(augmentId, championId) =>
              navigate({
                view: 'editor',
                preselectedChampionId: championId,
                preselectedAugmentId: augmentId,
              })
            }
          />
        )}

        {route.view === 'my-builds' && (
          <MyBuildsView
            onOpenChampionBuilds={(championId) =>
              navigate({ view: 'champion-builds', championId })
            }
            onCreateBuild={(championId) =>
              navigate({ view: 'editor', preselectedChampionId: championId })
            }
            onEditBuild={(b) => navigate({ view: 'editor', buildId: b.id })}
            onViewBuild={(b) => setDetailBuildId(b.id)}
            onRequestDelete={(b) => setPendingDelete(b)}
            onOpenDataManager={() => navigate({ view: 'data' })}
          />
        )}

        {route.view === 'champion-builds' && (
          <ChampionBuildsView
            championId={route.championId}
            onBack={() => navigate({ view: 'champions' })}
            onCreateBuild={(championId) =>
              navigate({ view: 'editor', preselectedChampionId: championId })
            }
            onEditBuild={(b) => navigate({ view: 'editor', buildId: b.id })}
            onViewBuild={(b) => setDetailBuildId(b.id)}
            onRequestDelete={(b) => setPendingDelete(b)}
          />
        )}

        {route.view === 'editor' && (
          <BuildEditorView
            key={
              route.buildId ||
              `new-${route.preselectedChampionId || 'default'}-${route.preselectedAugmentId || 'none'}`
            }
            existingBuild={editingBuild}
            preselectedChampionId={route.preselectedChampionId}
            preselectedAugmentId={route.preselectedAugmentId}
            onCancel={() => {
              if (editingBuild) {
                navigate({
                  view: 'champion-builds',
                  championId: editingBuild.championId,
                });
              } else if (route.preselectedChampionId) {
                navigate({
                  view: 'champion-builds',
                  championId: route.preselectedChampionId,
                });
              } else {
                navigate({ view: 'my-builds' });
              }
            }}
            onSaved={(saved) =>
              navigate({ view: 'champion-builds', championId: saved.championId })
            }
          />
        )}

        {route.view === 'data' && <DataManagerView />}
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-5 px-4 sm:px-6 lg:px-8 text-center text-[11px] text-white/35">
        {t.brand.footer}
      </footer>

      <BuildDetailModal
        build={detailBuild}
        onClose={() => setDetailBuildId(null)}
        onEdit={(b) => navigate({ view: 'editor', buildId: b.id })}
        onDuplicate={(b) => duplicateBuild(b.id)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Xóa bộ build này?"
        description={
          pendingDelete
            ? `Bạn chắc chắn muốn xóa bộ build "${pendingDelete.name}"? Hành động này không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xóa bộ build"
        danger
        onConfirm={() => {
          if (pendingDelete) {
            if (detailBuildId === pendingDelete.id) setDetailBuildId(null);
            deleteBuild(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <LibraryProvider>
      <AppShell />
    </LibraryProvider>
  );
}
