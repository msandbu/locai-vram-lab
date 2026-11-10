import React, { useEffect, useMemo, useRef, useState } from 'react';
import modelsRaw from './data/models.json';
import gpusRaw from './data/gpus.json';
import bandwidthRaw from './data/bandwidth.json';
import quantRaw from './data/quantization.json';
import siteConfigRaw from './data/siteConfig.json';
import {
  FaqItem,
  GpuPreset,
  LocalAIModel,
  QuantFormatInfo,
  QuantKey,
  QuantLevelInfo,
  SiliconBandwidthEntry,
  SizeTier,
} from './types/models';
import { estimateModelVram } from './utils/vram';
import { Navbar } from './components/Navbar';
import { HardwareBar } from './components/HardwareBar';
import { BenchmarkCharts, EnrichedModel } from './components/BenchmarkCharts';
import { ModelLeaderboard } from './components/ModelLeaderboard';
import { BandwidthLeaderboard } from './components/BandwidthLeaderboard';
import { GuidePage } from './components/GuidePage';
import { HostingToolsPage } from './components/HostingToolsPage';
import { ModelDetailModal } from './components/ModelDetailModal';
import { FeedbackModal } from './components/FeedbackModal';
import { ModelCompareModal, ComparedModelItem } from './components/ModelCompareModal';
import hostingToolsRaw from './data/hostingTools.json';
import { HostingTool } from './types/hosting';
import { Layers, ArrowRight, X, Trash2 } from 'lucide-react';

const MODELS = modelsRaw as LocalAIModel[];
const GPUS = gpusRaw as GpuPreset[];
const BANDWIDTH_ENTRIES = bandwidthRaw as SiliconBandwidthEntry[];
const QUANT_LEVELS = quantRaw.levels as QuantLevelInfo[];
const QUANT_FORMATS = quantRaw.formats as QuantFormatInfo[];
const FAQS = quantRaw.faqs as FaqItem[];
const HOSTING_TOOLS = hostingToolsRaw as HostingTool[];

type TierFilter = 'all' | SizeTier;
type ActivePage = 'workbench' | 'guide' | 'hosting';

const TIER_TABS: { key: TierFilter; label: string; hint: string }[] = [
  { key: 'all', label: 'All Weights', hint: 'Full catalog' },
  { key: 'tiny', label: 'Edge (≤4B)', hint: 'Laptops & iGPUs' },
  { key: 'small', label: 'Desktop (7B–35B)', hint: '8GB–32GB GPUs' },
  { key: 'medium', label: 'Workstation (40B–130B)', hint: '48GB–128GB rigs' },
  { key: 'large', label: 'Cluster / Ultra (150B+)', hint: '256GB+ MoEs' },
];

const getInitialPage = (): ActivePage => {
  if (typeof window === 'undefined') return 'workbench';
  const hash = window.location.hash.toLowerCase();
  if (
    hash.startsWith('#/hosting') ||
    hash.startsWith('#hosting') ||
    hash.startsWith('#/tools') ||
    hash.startsWith('#tools')
  ) {
    return 'hosting';
  }
  if (
    hash.startsWith('#/guide') ||
    hash.startsWith('#guide') ||
    hash.startsWith('#faq') ||
    hash.startsWith('#quant-guide')
  ) {
    return 'guide';
  }
  return 'workbench';
};

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<ActivePage>(getInitialPage);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('locai-theme') === 'dark';
    }
    return false;
  });

  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [selectedGpu, setSelectedGpu] = useState<GpuPreset>(
    () => GPUS.find((g) => g.vramGb === 24) ?? GPUS[0]
  );
  const [selectedQuant, setSelectedQuant] = useState<QuantKey>('q4');
  const [contextK, setContextK] = useState<number>(32);
  const [kvQuantQ8, setKvQuantQ8] = useState<boolean>(false);
  const [inspectedModel, setInspectedModel] = useState<LocalAIModel | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);
  const [suggestedModelName, setSuggestedModelName] = useState<string>('');

  // Multi-model side-by-side comparison state
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const openFeedbackModal = (prefillName = '') => {
    setSuggestedModelName(prefillName);
    setFeedbackOpen(true);
  };

  const toggleCompare = (modelId: string) => {
    setSelectedCompareIds((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), modelId];
      }
      return [...prev, modelId];
    });
  };

  const removeCompareModel = (modelId: string) => {
    setSelectedCompareIds((prev) => prev.filter((id) => id !== modelId));
  };

  const clearCompare = () => {
    setSelectedCompareIds([]);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('locai-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('locai-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (
        hash.startsWith('#/hosting') ||
        hash.startsWith('#hosting') ||
        hash.startsWith('#/tools') ||
        hash.startsWith('#tools')
      ) {
        setCurrentPage('hosting');
      } else if (
        hash.startsWith('#/guide') ||
        hash.startsWith('#guide') ||
        hash.startsWith('#faq') ||
        hash.startsWith('#quant-guide')
      ) {
        setCurrentPage('guide');
      } else {
        setCurrentPage('workbench');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: ActivePage, anchor?: string) => {
    setCurrentPage(page);
    if (page === 'hosting') {
      window.location.hash = anchor ? `#/hosting#${anchor}` : '#/hosting';
    } else if (page === 'guide') {
      window.location.hash = anchor ? `#/guide#${anchor}` : '#/guide';
    } else {
      window.location.hash = anchor ? `#${anchor}` : '#/';
    }
    if (anchor) {
      setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const isAnyModalOpen = Boolean(inspectedModel) || compareModalOpen || feedbackOpen;
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [inspectedModel, compareModalOpen, feedbackOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        focusSearch();
      } else if (e.key === 'Escape') {
        setInspectedModel(null);
        setFeedbackOpen(false);
        setCompareModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentPage]);

  const focusSearch = () => {
    if (currentPage !== 'workbench') {
      navigateTo('workbench');
      setTimeout(() => {
        searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInputRef.current?.focus();
      }, 250);
    } else {
      searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }
  };

  const enrichedItems: EnrichedModel[] = useMemo(() => {
    const subset =
      tierFilter === 'all' ? MODELS : MODELS.filter((m) => m.sizeTier === tierFilter);
    return subset.map((model) => ({
      model,
      vram: estimateModelVram(model, selectedQuant, contextK, kvQuantQ8, selectedGpu),
    }));
  }, [tierFilter, selectedQuant, contextK, kvQuantQ8, selectedGpu]);

  const fittingCount = useMemo(
    () => enrichedItems.filter((i) => i.vram.isRunnable).length,
    [enrichedItems]
  );

  // Compared models list for comparison modal
  const comparedModelItems: ComparedModelItem[] = useMemo(() => {
    return selectedCompareIds
      .map((id) => {
        const found = MODELS.find((m) => m.id === id);
        if (!found) return null;
        return {
          model: found,
          vram: estimateModelVram(found, selectedQuant, contextK, kvQuantQ8, selectedGpu),
        };
      })
      .filter((item): item is ComparedModelItem => item !== null);
  }, [selectedCompareIds, selectedQuant, contextK, kvQuantQ8, selectedGpu]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 transition-colors dark:bg-[#090b10] dark:text-slate-100">
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onFocusSearch={focusSearch}
        onOpenFeedback={() => openFeedbackModal('')}
        modelCount={MODELS.length}
        currentPage={currentPage}
        onNavigate={navigateTo}
      />

      {currentPage === 'workbench' ? (
        <>
          {/* Silicon Workbench Rig Header with Blueprint Grid */}
          <section className="bg-workbench-grid relative border-b border-slate-200/80 pt-6 pb-6 dark:border-slate-800/80">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* Hardware Class Selector Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <nav
                  aria-label="Hardware parameter classes"
                  className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200/80 bg-white/70 p-1 backdrop-blur-sm dark:border-slate-800/80 dark:bg-[#11151f]/80"
                >
                  {TIER_TABS.map((tab) => {
                    const active = tierFilter === tab.key;
                    const count =
                      tab.key === 'all'
                        ? MODELS.length
                        : MODELS.filter((m) => m.sizeTier === tab.key).length;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setTierFilter(tab.key)}
                        title={tab.hint}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                          active
                            ? 'bg-slate-950 font-semibold text-white shadow-2xs dark:bg-white dark:text-slate-950'
                            : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono-num text-[10px] ${
                            active
                              ? 'bg-white/20 text-white dark:bg-slate-950/15 dark:text-slate-950'
                              : 'bg-slate-200/60 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </nav>

                <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Step 1:</span> Choose Hardware Budget &amp; Precision
                </div>
              </div>

              {/* Rig Configuration Deck */}
              <div className="mt-4">
                <HardwareBar
                  gpus={GPUS}
                  selectedGpu={selectedGpu}
                  onSelectGpu={setSelectedGpu}
                  quantLevels={QUANT_LEVELS}
                  selectedQuant={selectedQuant}
                  onSelectQuant={setSelectedQuant}
                  contextK={contextK}
                  onSelectContextK={setContextK}
                  kvQuantQ8={kvQuantQ8}
                  onToggleKvQuant={() => setKvQuantQ8((v) => !v)}
                  fittingCount={fittingCount}
                  totalCount={enrichedItems.length}
                />
              </div>
            </div>
          </section>

          {/* Main Workbench Content */}
          <main className="mx-auto max-w-7xl space-y-12 sm:space-y-14 px-4 py-8 sm:px-6 lg:px-8">
            <BenchmarkCharts
              items={enrichedItems}
              selectedGpu={selectedGpu}
              selectedQuant={selectedQuant}
              contextK={contextK}
              onSelectModel={setInspectedModel}
              selectedCompareIds={selectedCompareIds}
              onToggleCompare={toggleCompare}
            />

            <ModelLeaderboard
              items={enrichedItems}
              selectedGpu={selectedGpu}
              selectedQuant={selectedQuant}
              contextK={contextK}
              searchInputRef={searchInputRef}
              onSelectModel={setInspectedModel}
              onRequestMissingModel={(name) => openFeedbackModal(name ?? '')}
              selectedCompareIds={selectedCompareIds}
              onToggleCompare={toggleCompare}
            />

            <BandwidthLeaderboard entries={BANDWIDTH_ENTRIES} />
          </main>
        </>
      ) : currentPage === 'hosting' ? (
        <main>
          <HostingToolsPage
            tools={HOSTING_TOOLS}
            onBackToWorkbench={() => navigateTo('workbench')}
          />
        </main>
      ) : (
        <main>
          <GuidePage
            levels={QUANT_LEVELS}
            formats={QUANT_FORMATS}
            selectedQuant={selectedQuant}
            onSelectQuant={setSelectedQuant}
            faqs={FAQS}
            onBackToWorkbench={() => navigateTo('workbench')}
          />
        </main>
      )}

      {/* Floating Comparison Dock Bar when models are selected */}
      {selectedCompareIds.length > 0 && (
        <aside
          aria-label="Model comparison tray"
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-[#0d111a]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md animate-fade-in text-white"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-teal-400" />
            <span className="text-xs font-semibold">
              Comparing ({selectedCompareIds.length}/4):
            </span>
          </div>

          <div className="flex items-center gap-1.5 max-w-[280px] sm:max-w-md overflow-x-auto no-scrollbar py-0.5">
            {selectedCompareIds.map((id) => {
              const m = MODELS.find((mod) => mod.id === id);
              if (!m) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-200"
                >
                  <span className="max-w-[100px] truncate">{m.name}</span>
                  <button
                    type="button"
                    onClick={() => removeCompareModel(id)}
                    className="text-slate-400 hover:text-white"
                    title={`Remove ${m.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-l border-slate-700/80 pl-2">
            <button
              type="button"
              disabled={selectedCompareIds.length < 2}
              onClick={() => setCompareModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <span>Compare Side-by-Side</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={clearCompare}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Clear comparison list"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-10 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#0b0e14] dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
              LOCAI // VRAM LAB
            </span>{' '}
            — Independent local AI hardware sizing &amp; benchmark matrix.
          </div>
          <div className="flex flex-wrap items-center gap-4 font-medium">
            <button
              type="button"
              onClick={() => navigateTo('workbench')}
              className="hover:text-teal-600 dark:hover:text-teal-400"
            >
              GPU Workbench
            </button>
            <button
              type="button"
              onClick={() => navigateTo('hosting')}
              className="hover:text-teal-600 dark:hover:text-teal-400"
            >
              Host LLMs Locally
            </button>
            <button
              type="button"
              onClick={() => navigateTo('guide')}
              className="hover:text-teal-600 dark:hover:text-teal-400"
            >
              Quantization Guide &amp; FAQ
            </button>
            <a
              href="https://github.com/msandbu/locai-vram-lab"
              target="_blank"
              rel="noreferrer"
              className="hover:text-teal-600 dark:hover:text-teal-400 font-semibold"
            >
              GitHub Repo
            </a>
            <button
              type="button"
              onClick={() => openFeedbackModal('')}
              className="font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              Suggest Missing Model
            </button>
            <a
              href="https://docs.unsloth.ai/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-teal-600 dark:hover:text-teal-400"
            >
              Unsloth Docs
            </a>
            <a
              href="https://huggingface.co/unsloth"
              target="_blank"
              rel="noreferrer"
              className="hover:text-teal-600 dark:hover:text-teal-400"
            >
              Hugging Face GGUF
            </a>
            <a
              href="https://artificialanalysis.ai/models/open-source"
              target="_blank"
              rel="noreferrer"
              className="hover:text-teal-600 dark:hover:text-teal-400"
            >
              Artificial Analysis
            </a>
          </div>
        </div>
      </footer>

      {/* Model Detail Modal */}
      <ModelDetailModal
        model={inspectedModel}
        onClose={() => setInspectedModel(null)}
        selectedGpu={selectedGpu}
        quantLevels={QUANT_LEVELS}
        contextK={contextK}
        kvQuantQ8={kvQuantQ8}
      />

      {/* Model Side-by-Side Comparison Modal */}
      <ModelCompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        models={comparedModelItems}
        selectedGpu={selectedGpu}
        selectedQuant={selectedQuant}
        onRemoveModel={removeCompareModel}
        onOpenDetails={(m) => {
          setCompareModalOpen(false);
          setInspectedModel(m);
        }}
      />

      {/* Suggest Missing Model Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        githubRepoUrl={siteConfigRaw.githubRepoUrl}
        issueLabels={siteConfigRaw.issueLabels}
        initialModelName={suggestedModelName}
      />
    </div>
  );
};

export default App;
