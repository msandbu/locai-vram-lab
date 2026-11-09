import React, { useMemo, useState } from 'react';
import { ArchitectureType, GpuPreset, LocalAIModel, QuantKey } from '../types/models';
import { EnrichedModel } from './BenchmarkCharts';
import { CompatibilityBadge } from './CompatibilityBadge';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  Filter,
  MessageSquarePlus,
  Search,
  Sparkles,
  Check,
} from 'lucide-react';

interface ModelLeaderboardProps {
  items: EnrichedModel[];
  selectedGpu: GpuPreset;
  selectedQuant: QuantKey;
  contextK: number;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectModel: (model: LocalAIModel) => void;
  onRequestMissingModel: (suggestedName?: string) => void;
  selectedCompareIds?: string[];
  onToggleCompare?: (modelId: string) => void;
}

type SortField = 'coding' | 'intelligence' | 'vram' | 'params' | 'context' | 'speed';
type SortDir = 'asc' | 'desc';

function getCreatorInitials(creator: string): string {
  const clean = creator.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export const ModelLeaderboard: React.FC<ModelLeaderboardProps> = ({
  items,
  selectedGpu,
  selectedQuant,
  contextK,
  searchInputRef,
  onSelectModel,
  onRequestMissingModel,
  selectedCompareIds = [],
  onToggleCompare,
}) => {
  const [query, setQuery] = useState('');
  const [onlyFitsGpu, setOnlyFitsGpu] = useState(false);
  const [archFilter, setArchFilter] = useState<'All' | ArchitectureType>('All');
  const [permissiveOnly, setPermissiveOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('coding');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir(field === 'vram' ? 'asc' : 'desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(({ model, vram }) => {
        if (onlyFitsGpu && !vram.isRunnable) return false;
        if (archFilter !== 'All' && model.architecture !== archFilter) return false;
        if (permissiveOnly && !model.licensePermissive) return false;
        if (q) {
          const hay = `${model.name} ${model.creator} ${model.license} ${model.architecture} ${model.recommendedQuant}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case 'coding':
            cmp = a.model.codingScore - b.model.codingScore;
            break;
          case 'intelligence':
            cmp = a.model.intelligenceScore - b.model.intelligenceScore;
            break;
          case 'vram':
            cmp = a.vram.totalVramGb - b.vram.totalVramGb;
            break;
          case 'params':
            cmp = a.model.totalParamsB - b.model.totalParamsB;
            break;
          case 'context':
            cmp = a.model.contextWindowK - b.model.contextWindowK;
            break;
          case 'speed':
            cmp = (a.vram.estTokensPerSec ?? -1) - (b.vram.estTokensPerSec ?? -1);
            break;
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
  }, [items, query, onlyFitsGpu, archFilter, permissiveOnly, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-35" />;
    return sortDir === 'desc' ? (
      <ArrowDown className="h-3 w-3 text-teal-600 dark:text-teal-400" />
    ) : (
      <ArrowUp className="h-3 w-3 text-teal-600 dark:text-teal-400" />
    );
  };

  return (
    <section id="models" className="scroll-mt-20 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono-num text-[11px] font-semibold tracking-widest text-teal-600 uppercase dark:text-teal-400">
            // HARDWARE COMPATIBILITY MATRIX
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
            Local Model Matrix &amp; VRAM Sizer
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Sorted by capability with live memory gauges simulated at{' '}
            <span className="font-mono-num font-semibold text-slate-800 dark:text-slate-200">
              {selectedQuant.toUpperCase()}
            </span>{' '}
            ({contextK}K context) for{' '}
            <span className="font-mono-num font-semibold text-teal-700 dark:text-teal-400">
              {selectedGpu.name}
            </span>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onRequestMissingModel(query)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-500/20 dark:text-teal-300"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Missing a model?
          </button>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono-num text-xs text-slate-600 dark:border-slate-800 dark:bg-[#11151f] dark:text-slate-400">
            Showing <strong className="text-slate-950 dark:text-white">{filteredAndSorted.length}</strong> / {items.length}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-2.5 backdrop-blur-sm dark:border-slate-800/80 dark:bg-[#11151f]/70">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search model, creator, license..."
            className="h-8.5 w-full rounded-lg border border-slate-200/80 bg-slate-50/50 pr-3 pl-8.5 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none dark:border-slate-800/80 dark:bg-slate-900/50 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOnlyFitsGpu((v) => !v)}
            className={`inline-flex h-8.5 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all duration-150 ${
              onlyFitsGpu
                ? 'border-teal-600 bg-teal-600 text-white shadow-2xs dark:border-teal-500 dark:bg-teal-500 dark:text-slate-950 font-semibold'
                : 'border-slate-200/80 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-800/80 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Fits {selectedGpu.shortLabel} Only
          </button>

          <div className="inline-flex h-8.5 items-center rounded-lg border border-slate-200/80 bg-slate-50/50 p-0.5 text-xs dark:border-slate-800/80 dark:bg-slate-900/50">
            {(['All', 'Dense', 'MoE'] as const).map((arch) => (
              <button
                key={arch}
                type="button"
                onClick={() => setArchFilter(arch)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  archFilter === arch
                    ? 'bg-white font-semibold text-slate-950 shadow-2xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {arch}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPermissiveOnly((v) => !v)}
            className={`inline-flex h-8.5 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all duration-150 ${
              permissiveOnly
                ? 'border-cyan-600 bg-cyan-600 text-white font-semibold shadow-2xs dark:border-cyan-500 dark:bg-cyan-500 dark:text-slate-950'
                : 'border-slate-200/80 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-800/80 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Filter className="h-3 w-3" />
            Apache / MIT
          </button>
        </div>
      </div>

      {/* Clean Modern Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800/80 dark:bg-[#11151f]">
        <div className="overflow-x-auto locai-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:border-slate-800/70 dark:bg-[#0c0f16]">
                {onToggleCompare && <th className="w-10 px-3 py-3 text-center" aria-label="Compare Checkbox">Cmp</th>}
                <th className="min-w-[240px] px-4 py-3">Model</th>
                <th className="min-w-[125px] px-3 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('params')}
                    className="inline-flex items-center gap-1 uppercase hover:text-slate-950 dark:hover:text-white"
                  >
                    Architecture <SortIcon field="params" />
                  </button>
                </th>
                <th className="min-w-[145px] px-3 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('coding')}
                    className="inline-flex items-center gap-1 uppercase hover:text-slate-950 dark:hover:text-white"
                  >
                    Coding Score <SortIcon field="coding" />
                  </button>
                </th>
                <th className="min-w-[135px] px-3 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('intelligence')}
                    className="inline-flex items-center gap-1 uppercase hover:text-slate-950 dark:hover:text-white"
                  >
                    Intelligence <SortIcon field="intelligence" />
                  </button>
                </th>
                <th className="min-w-[270px] px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('vram')}
                    className="inline-flex items-center gap-1 uppercase hover:text-slate-950 dark:hover:text-white"
                  >
                    VRAM Footprint &amp; Headroom <SortIcon field="vram" />
                  </button>
                </th>
                <th className="min-w-[130px] px-3 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('context')}
                    className="inline-flex items-center gap-1 uppercase hover:text-slate-950 dark:hover:text-white"
                  >
                    Context / Tag <SortIcon field="context" />
                  </button>
                </th>
                <th className="w-12 px-4 py-3 text-right" aria-label="Inspect" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={onToggleCompare ? 8 : 7} className="px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                    <div>
                      No models match your active search or hardware filters.
                    </div>
                    <button
                      type="button"
                      onClick={() => onRequestMissingModel(query)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      {query.trim()
                        ? `Request "${query.trim()}" via Feedback Form`
                        : 'Suggest a Missing Model'}
                    </button>
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map(({ model, vram }) => {
                  const totalSlots = 12;
                  const usedRatio = vram.totalVramGb / selectedGpu.vramGb;
                  const filledSlots = Math.min(totalSlots, Math.max(1, Math.round(usedRatio * totalSlots)));
                  const isCompared = selectedCompareIds.includes(model.id);

                  const slotColor =
                    vram.fitStatus === 'comfortable'
                      ? 'bg-teal-500 dark:bg-teal-400'
                      : vram.fitStatus === 'tight'
                      ? 'bg-amber-500 dark:bg-amber-400'
                      : vram.fitStatus === 'offload'
                      ? 'bg-indigo-500 dark:bg-indigo-400'
                      : 'bg-rose-500/85';

                  return (
                    <tr
                      key={model.id}
                      onClick={() => onSelectModel(model)}
                      className={`group cursor-pointer transition-colors ${
                        isCompared
                          ? 'bg-teal-500/[0.04] dark:bg-teal-500/[0.06]'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/35'
                      }`}
                    >
                      {/* Compare Checkbox */}
                      {onToggleCompare && (
                        <td
                          className="px-3 py-3 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCompare(model.id);
                          }}
                        >
                          <button
                            type="button"
                            className={`flex h-4.5 w-4.5 mx-auto items-center justify-center rounded border transition ${
                              isCompared
                                ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-500 dark:text-slate-950'
                                : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800'
                            }`}
                            aria-label={`Toggle comparison for ${model.name}`}
                          >
                            {isCompared && <Check className="h-3 w-3 stroke-[3]" />}
                          </button>
                        </td>
                      )}

                      {/* 1. Creator Monogram + Model Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-[11px] font-bold text-white shadow-2xs ring-1 ring-black/5 dark:ring-white/10"
                            style={{ backgroundColor: model.creatorColor }}
                          >
                            {getCreatorInitials(model.creator)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-display text-sm font-bold text-slate-950 transition-colors group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
                                {model.name}
                              </span>
                              {model.isProprietaryBaseline && (
                                <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                                  Frontier Baseline
                                </span>
                              )}
                              {model.reasoning && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300"
                                  title="Supports extended reasoning / thinking chains"
                                >
                                  <Sparkles className="h-2.5 w-2.5" />
                                  Think
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>{model.creator}</span>
                              <span>•</span>
                              <span>{model.license}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Params & Architecture */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono-num text-xs font-bold text-slate-900 dark:text-slate-100">
                            {model.totalParamsB >= 1000
                              ? `${(model.totalParamsB / 1000).toFixed(1)}T`
                              : `${model.totalParamsB}B`}
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                              model.architecture === 'MoE'
                                ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {model.architecture}
                          </span>
                        </div>
                        <div className="mt-0.5 font-mono-num text-[11px] text-slate-400">
                          {model.architecture === 'MoE'
                            ? `${model.activeParamsB}B active`
                            : 'Dense weights'}
                        </div>
                      </td>

                      {/* 3. Coding Score */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono-num text-sm font-bold text-cyan-700 dark:text-cyan-300">
                            {model.codingScore}
                            <span className="text-[10px] font-normal text-slate-400">/100</span>
                          </span>
                          {model.codingBreakdown?.liveCodeBench && (
                            <span className="font-mono-num text-[10px] text-slate-400">
                              LCB {model.codingBreakdown.liveCodeBench}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                            style={{ width: `${Math.min(100, model.codingScore)}%` }}
                          />
                        </div>
                      </td>

                      {/* 4. Intelligence Score */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono-num text-sm font-bold text-slate-950 dark:text-white">
                            {model.intelligenceScore}
                          </span>
                          <span className="text-[10px] text-slate-400">Index</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                            style={{
                              width: `${Math.min(100, (model.intelligenceScore / 46) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* 5. VRAM Footprint & Standardized Compatibility Badge */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-num text-xs font-bold text-slate-950 dark:text-white">
                            {vram.totalVramGb} GB{' '}
                            <span className="font-normal text-slate-400">/ {selectedGpu.vramGb}G</span>
                          </span>
                          <CompatibilityBadge
                            status={vram.fitStatus}
                            label={vram.fitLabel}
                            size="xs"
                            tooltipText={vram.incompatibilityReason || undefined}
                          />
                        </div>

                        {/* 12-Cell Silicon Memory Bank Bar */}
                        <div className="mt-1.5 grid grid-cols-12 gap-0.5" aria-hidden="true">
                          {Array.from({ length: totalSlots }).map((_, idx) => {
                            const active = idx < filledSlots;
                            return (
                              <span
                                key={idx}
                                className={`h-1.5 rounded-[1px] transition-colors ${
                                  active ? slotColor : 'bg-slate-100 dark:bg-slate-800'
                                }`}
                              />
                            );
                          })}
                        </div>

                        <div className="mt-1 flex items-center justify-between font-mono-num text-[10px] text-slate-400">
                          <span>
                            {vram.weightsGb}G wt + {vram.kvCacheGb}G kv
                          </span>
                          {vram.headroomGb >= 0 ? (
                            <span className="text-teal-600 dark:text-teal-400 font-medium">
                              +{vram.headroomGb}G headroom
                            </span>
                          ) : (
                            <span className="text-rose-500 dark:text-rose-400 font-medium">
                              Min {vram.minTierLabel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Context & Quant Tag */}
                      <td className="px-3 py-3.5">
                        <div className="font-mono-num text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {model.contextWindowK >= 1000
                            ? `${(model.contextWindowK / 1000).toFixed(0)}M max`
                            : `${model.contextWindowK}K max`}
                        </div>
                        <div className="mt-0.5 truncate font-mono-num text-[10px] text-cyan-700 dark:text-cyan-400">
                          {model.recommendedQuant}
                        </div>
                      </td>

                      {/* 7. Chevron Action */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition group-hover:border-teal-500 group-hover:bg-teal-500 group-hover:text-white dark:border-slate-800 dark:group-hover:text-slate-950">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
