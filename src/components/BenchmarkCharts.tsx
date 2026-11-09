import React, { useMemo, useState } from 'react';
import { FRONTIER_BASELINE, GpuPreset, LocalAIModel, QuantKey } from '../types/models';
import { formatParamsB, VramEstimate } from '../utils/vram';
import { CompatibilityBadge } from './CompatibilityBadge';
import {
  BarChart3,
  Brain,
  Code2,
  Compass,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  ZoomIn,
  Check,
  Plus,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export interface EnrichedModel {
  model: LocalAIModel;
  vram: VramEstimate;
}

interface BenchmarkChartsProps {
  items: EnrichedModel[];
  selectedGpu: GpuPreset;
  selectedQuant: QuantKey;
  contextK: number;
  onSelectModel: (model: LocalAIModel) => void;
  selectedCompareIds?: string[];
  onToggleCompare?: (modelId: string) => void;
}

type ChartTab = 'scatter' | 'dual-bars' | 'vram-stack';
type YMetric = 'coding' | 'intelligence';
type ArchFilter = 'all' | 'Dense' | 'MoE';
type FitFilter = 'all' | 'runnable-only';

const GPU_TIER_LINES = [8, 16, 24, 64, 128, 256, 1024];

function getShortChartLabel(name: string): string {
  return name
    .replace(' (Frontier Reference)', '')
    .replace(' (Reasoning)', '')
    .replace(' (Xhigh)', '')
    .replace(' (Max)', '')
    .replace(' (2.8T-A104B)', '')
    .replace('-Flash-RL', ' Flash')
    .replace('-Instruct', '');
}

export const BenchmarkCharts: React.FC<BenchmarkChartsProps> = ({
  items,
  selectedGpu,
  selectedQuant,
  contextK,
  onSelectModel,
  selectedCompareIds = [],
  onToggleCompare,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('scatter');
  const [yMetric, setYMetric] = useState<YMetric>('coding');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [archFilter, setArchFilter] = useState<ArchFilter>('all');
  const [fitFilter, setFitFilter] = useState<FitFilter>('all');
  const [zoomToRig, setZoomToRig] = useState<boolean>(false);

  // Telemetry highlights
  const fittingModels = useMemo(
    () => items.filter((x) => x.vram.isRunnable),
    [items]
  );

  const bestOverallForGpu = useMemo(() => {
    return (
      [...fittingModels].sort(
        (a, b) =>
          b.model.codingScore +
          b.model.intelligenceScore * 1.5 -
          (a.model.codingScore + a.model.intelligenceScore * 1.5)
      )[0] ?? null
    );
  }, [fittingModels]);

  const bestCoderForGpu = useMemo(() => {
    return [...fittingModels].sort((a, b) => b.model.codingScore - a.model.codingScore)[0] ?? null;
  }, [fittingModels]);

  // When bestCoder is identical to bestOverall, provide high-value diversity:
  // Best VRAM Efficiency (highest coding score per GB VRAM used)
  const bestEfficiencyForGpu = useMemo(() => {
    const candidates = fittingModels.filter(
      (m) => m.model.id !== bestOverallForGpu?.model.id && m.model.codingScore >= 40
    );
    return (
      [...candidates].sort(
        (a, b) =>
          b.model.codingScore / b.vram.totalVramGb -
          a.model.codingScore / a.vram.totalVramGb
      )[0] ?? null
    );
  }, [fittingModels, bestOverallForGpu]);

  const showEfficiencyTile = Boolean(
    bestCoderForGpu &&
      bestOverallForGpu &&
      bestCoderForGpu.model.id === bestOverallForGpu.model.id &&
      bestEfficiencyForGpu
    );

  const topIntelOverall = useMemo(() => {
    return (
      [...items]
        .sort((a, b) => b.model.intelligenceScore - a.model.intelligenceScore)[0] ?? null
    );
  }, [items]);

  const fastestFitting = useMemo(() => {
    return (
      [...fittingModels].sort(
        (a, b) => (b.vram.estTokensPerSec ?? 0) - (a.vram.estTokensPerSec ?? 0)
      )[0] ?? null
    );
  }, [fittingModels]);

  // Filtered items for scatter visualization based on active UI filters
  const filteredScatterItems = useMemo(() => {
    return items.filter((entry) => {
      if (archFilter !== 'all' && entry.model.architecture !== archFilter) return false;
      if (fitFilter === 'runnable-only' && !entry.vram.isRunnable) return false;
      if (zoomToRig && entry.vram.totalVramGb > selectedGpu.vramGb * 1.25) return false;
      return true;
    });
  }, [items, archFilter, fitFilter, zoomToRig, selectedGpu.vramGb]);

  // Scatter coordinate math
  const scatterData = useMemo(() => {
    const minGb = 2.5;
    const maxGb = zoomToRig ? Math.max(16, selectedGpu.vramGb * 1.3) : 2000;
    const logMin = Math.log2(minGb);
    const logMax = Math.log2(maxGb);

    const xPct = (gb: number) => {
      const clamped = Math.max(minGb, Math.min(maxGb, gb));
      return ((Math.log2(clamped) - logMin) / (logMax - logMin)) * 100;
    };

    const yMax = yMetric === 'coding' ? 100 : 70;
    const yMin = yMetric === 'coding' ? 35 : 0;

    const yPct = (val: number) => {
      const clamped = Math.max(yMin, Math.min(yMax, val));
      return 100 - ((clamped - yMin) / (yMax - yMin)) * 100;
    };

    const sortedByVram = [...filteredScatterItems].sort(
      (a, b) => a.vram.totalVramGb - b.vram.totalVramGb
    );
    const paretoIds = new Set<string>();
    const paretoPoints: { x: number; y: number; id: string; score: number }[] = [];
    let bestSoFar = -Infinity;

    for (const entry of sortedByVram) {
      const score = yMetric === 'coding' ? entry.model.codingScore : entry.model.intelligenceScore;
      if (score > bestSoFar) {
        bestSoFar = score;
        paretoIds.add(entry.model.id);
        paretoPoints.push({
          id: entry.model.id,
          x: xPct(entry.vram.totalVramGb),
          y: yPct(score),
          score,
        });
      }
    }

    // Smart Label Selection: Avoid label overlapping on the frontier
    const labeledIds = new Set<string>();
    const labelLayout: Record<
      string,
      { placement: 'top' | 'bottom'; align: 'center' | 'left' | 'right'; offsetClass: string }
    > = {};

    if (paretoPoints.length > 0) {
      const peakPoint = paretoPoints[paretoPoints.length - 1];
      labeledIds.add(peakPoint.id);

      if (bestOverallForGpu && paretoIds.has(bestOverallForGpu.model.id)) {
        labeledIds.add(bestOverallForGpu.model.id);
      }

      let lastLabeledX = -100;
      let stagger = 0;

      for (let i = 0; i < paretoPoints.length; i++) {
        const pt = paretoPoints[i];
        const isPeak = i === paretoPoints.length - 1;
        const isBestFit = pt.id === bestOverallForGpu?.model.id;
        const distFromLast = pt.x - lastLabeledX;

        if (isPeak || isBestFit || distFromLast >= 8) {
          const nextPt = paretoPoints[i + 1];
          if (!isPeak && !isBestFit && nextPt && nextPt.x - pt.x < 5 && nextPt.score - pt.score >= 4) {
            continue;
          }

          labeledIds.add(pt.id);
          lastLabeledX = pt.x;

          const placement: 'top' | 'bottom' = pt.y < 16 ? 'bottom' : 'top';
          const align: 'center' | 'left' | 'right' = pt.x > 84 ? 'right' : pt.x < 12 ? 'left' : 'center';
          const offsetClass =
            placement === 'bottom'
              ? 'top-full mt-2'
              : stagger % 2 === 0
              ? 'bottom-full mb-1.5'
              : 'bottom-full mb-3.5';
          stagger++;

          labelLayout[pt.id] = { placement, align, offsetClass };
        }
      }
    }

    return { xPct, yPct, paretoIds, paretoPoints, labeledIds, labelLayout };
  }, [filteredScatterItems, yMetric, bestOverallForGpu, zoomToRig, selectedGpu.vramGb]);

  const hoveredItem = useMemo(
    () => items.find((i) => i.model.id === hoveredId) ?? null,
    [items, hoveredId]
  );

  const dualBarItems = useMemo(() => {
    return [...items].sort((a, b) =>
      yMetric === 'coding'
        ? b.model.codingScore - a.model.codingScore
        : b.model.intelligenceScore - a.model.intelligenceScore
    );
  }, [items, yMetric]);

  const stackBarItems = useMemo(() => {
    return [...items].sort((a, b) => a.vram.totalVramGb - b.vram.totalVramGb);
  }, [items]);

  const maxStackScaleGb = useMemo(() => {
    const highest = Math.max(...items.map((i) => i.vram.totalVramGb), selectedGpu.vramGb, 24);
    if (highest <= 36) return 36;
    if (highest <= 72) return 72;
    if (highest <= 140) return 140;
    return Math.min(1600, Math.ceil(highest / 128) * 128);
  }, [items, selectedGpu.vramGb]);

  return (
    <section id="visualizer" className="scroll-mt-20 space-y-6">
      {/* 4-Card Hardware Telemetry Spotlight Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Best Overall Fit */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-2xs transition-all hover:border-teal-500/50 hover:shadow-md dark:border-slate-800 dark:bg-[#11151f]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-teal-600 uppercase dark:text-teal-400">
                Best Overall Fit ({selectedGpu.shortLabel})
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Cpu className="h-3.5 w-3.5" />
              </span>
            </div>

            {bestOverallForGpu ? (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => onSelectModel(bestOverallForGpu.model)}
                  className="truncate text-left font-display text-base font-bold text-slate-950 transition hover:text-teal-600 dark:text-white dark:hover:text-teal-400"
                >
                  {bestOverallForGpu.model.name}
                </button>

                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  Top reasoning &amp; code balance within {selectedGpu.shortLabel} VRAM.
                </p>

                {/* VRAM Gauge */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-mono-num">
                    <span className="text-slate-700 dark:text-slate-300">
                      {bestOverallForGpu.vram.totalVramGb} GB / {selectedGpu.vramGb} GB
                    </span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      +{bestOverallForGpu.vram.headroomGb} GB headroom
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((bestOverallForGpu.vram.totalVramGb / selectedGpu.vramGb) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="mt-3 flex items-center justify-between font-mono-num text-xs">
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    Code {bestOverallForGpu.model.codingScore} · Intel {bestOverallForGpu.model.intelligenceScore}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {bestOverallForGpu.vram.estTokensPerSec ? `~${bestOverallForGpu.vram.estTokensPerSec} tok/s` : 'Bandwidth bound'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-400">No model fits current filter</div>
            )}
          </div>

          {bestOverallForGpu && onToggleCompare && (
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onSelectModel(bestOverallForGpu.model)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
              >
                <span>View Details</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onToggleCompare(bestOverallForGpu.model.id)}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition ${
                  selectedCompareIds.includes(bestOverallForGpu.model.id)
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {selectedCompareIds.includes(bestOverallForGpu.model.id) ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Selected</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    <span>Compare</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Best VRAM Efficiency or Top Local Coder */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-2xs transition-all hover:border-cyan-500/50 hover:shadow-md dark:border-slate-800 dark:bg-[#11151f]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-cyan-600 uppercase dark:text-cyan-400">
                {showEfficiencyTile ? `Best VRAM Efficiency (${selectedGpu.shortLabel})` : `Top Local Coder (${selectedGpu.shortLabel})`}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                {showEfficiencyTile ? <Sparkles className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
              </span>
            </div>

            {showEfficiencyTile && bestEfficiencyForGpu ? (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => onSelectModel(bestEfficiencyForGpu.model)}
                  className="truncate text-left font-display text-base font-bold text-slate-950 transition hover:text-cyan-600 dark:text-white dark:hover:text-cyan-400"
                >
                  {bestEfficiencyForGpu.model.name}
                </button>

                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  Highest coding capability per GB of memory footprint.
                </p>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-mono-num">
                    <span className="text-slate-700 dark:text-slate-300">
                      {bestEfficiencyForGpu.vram.totalVramGb} GB used
                    </span>
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                      {(bestEfficiencyForGpu.model.codingScore / bestEfficiencyForGpu.vram.totalVramGb).toFixed(1)} pts/GB
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((bestEfficiencyForGpu.vram.totalVramGb / selectedGpu.vramGb) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between font-mono-num text-xs">
                  <span className="font-bold text-cyan-700 dark:text-cyan-300">
                    Score: {bestEfficiencyForGpu.model.codingScore}/100
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    +{bestEfficiencyForGpu.vram.headroomGb}G free
                  </span>
                </div>
              </div>
            ) : bestCoderForGpu ? (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => onSelectModel(bestCoderForGpu.model)}
                  className="truncate text-left font-display text-base font-bold text-slate-950 transition hover:text-cyan-600 dark:text-white dark:hover:text-cyan-400"
                >
                  {bestCoderForGpu.model.name}
                </button>

                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  Highest absolute coding benchmark score that fits completely.
                </p>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-mono-num">
                    <span className="text-slate-700 dark:text-slate-300">
                      {bestCoderForGpu.vram.totalVramGb} GB / {selectedGpu.vramGb} GB
                    </span>
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                      Score: {bestCoderForGpu.model.codingScore}/100
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((bestCoderForGpu.vram.totalVramGb / selectedGpu.vramGb) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between font-mono-num text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {bestCoderForGpu.model.architecture} ({bestCoderForGpu.model.activeParamsB}B act)
                  </span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">
                    +{bestCoderForGpu.vram.headroomGb} GB headroom
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-400">Try larger GPU or lower quant</div>
            )}
          </div>

          {(showEfficiencyTile ? bestEfficiencyForGpu : bestCoderForGpu) && onToggleCompare && (
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() =>
                  onSelectModel(
                    (showEfficiencyTile ? bestEfficiencyForGpu! : bestCoderForGpu!).model
                  )
                }
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400"
              >
                <span>View Details</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onToggleCompare(
                    (showEfficiencyTile ? bestEfficiencyForGpu! : bestCoderForGpu!).model.id
                  )
                }
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition ${
                  selectedCompareIds.includes(
                    (showEfficiencyTile ? bestEfficiencyForGpu! : bestCoderForGpu!).model.id
                  )
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {selectedCompareIds.includes(
                  (showEfficiencyTile ? bestEfficiencyForGpu! : bestCoderForGpu!).model.id
                ) ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Selected</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    <span>Compare</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Card 3: Fastest on Selected GPU */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-2xs transition-all hover:border-amber-500/50 hover:shadow-md dark:border-slate-800 dark:bg-[#11151f]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                Fastest Model ({selectedGpu.shortLabel})
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Zap className="h-3.5 w-3.5" />
              </span>
            </div>

            {fastestFitting ? (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => onSelectModel(fastestFitting.model)}
                  className="truncate text-left font-display text-base font-bold text-slate-950 transition hover:text-amber-600 dark:text-white dark:hover:text-amber-400"
                >
                  {fastestFitting.model.name}
                </button>

                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  Peak tokens/sec decode throughput on this hardware bus.
                </p>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-mono-num">
                    <span className="text-slate-700 dark:text-slate-300">
                      {fastestFitting.vram.totalVramGb} GB footprint
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      ~{fastestFitting.vram.estTokensPerSec} tok/s
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((fastestFitting.vram.totalVramGb / selectedGpu.vramGb) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between font-mono-num text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {fastestFitting.model.activeParamsB}B active params
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Code {fastestFitting.model.codingScore}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-400">Exceeds memory ceiling</div>
            )}
          </div>

          {fastestFitting && onToggleCompare && (
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onSelectModel(fastestFitting.model)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
              >
                <span>View Details</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onToggleCompare(fastestFitting.model.id)}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition ${
                  selectedCompareIds.includes(fastestFitting.model.id)
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {selectedCompareIds.includes(fastestFitting.model.id) ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Selected</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    <span>Compare</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Card 4: Tier Ceiling (Reasoning Target) */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-2xs transition-all hover:border-indigo-500/50 hover:shadow-md dark:border-slate-800 dark:bg-[#11151f]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                Tier Ceiling (Reasoning)
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Brain className="h-3.5 w-3.5" />
              </span>
            </div>

            {topIntelOverall ? (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => onSelectModel(topIntelOverall.model)}
                  className="truncate text-left font-display text-base font-bold text-slate-950 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                >
                  {topIntelOverall.model.name}
                </button>

                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  Global reasoning benchmark ceiling in the open-weights catalog.
                </p>

                {/* Status Indicator: clearly communicates non-runnable on current hardware */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-mono-num">
                    <span className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-3 w-3" />
                      Requires {topIntelOverall.vram.minTierLabel}+
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      Intel: {topIntelOverall.model.intelligenceScore}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between font-mono-num text-xs">
                  <span className="text-slate-400 dark:text-slate-500">
                    {topIntelOverall.vram.totalVramGb} GB footprint
                  </span>
                  <span className="rounded bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                    Exceeds {selectedGpu.shortLabel}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-400">—</div>
            )}
          </div>

          {topIntelOverall && onToggleCompare && (
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onSelectModel(topIntelOverall.model)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
              >
                <span>View Details</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onToggleCompare(topIntelOverall.model.id)}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition ${
                  selectedCompareIds.includes(topIntelOverall.model.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {selectedCompareIds.includes(topIntelOverall.model.id) ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Selected</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    <span>Compare</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Workbench Data Visualization Workbench */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-[#11151f]">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-5 py-3 dark:border-slate-800/80 dark:bg-[#0c0f16]">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'scatter'}
              onClick={() => setActiveTab('scatter')}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'scatter'
                  ? 'bg-teal-600 text-white shadow-2xs dark:bg-teal-500 dark:text-slate-950'
                  : 'bg-white/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              GPU Memory vs. Score Map
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'dual-bars'}
              onClick={() => setActiveTab('dual-bars')}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'dual-bars'
                  ? 'bg-teal-600 text-white shadow-2xs dark:bg-teal-500 dark:text-slate-950'
                  : 'bg-white/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Coding &amp; Intelligence Ranking
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'vram-stack'}
              onClick={() => setActiveTab('vram-stack')}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'vram-stack'
                  ? 'bg-teal-600 text-white shadow-2xs dark:bg-teal-500 dark:text-slate-950'
                  : 'bg-white/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              VRAM Allocation Stack
            </button>
          </div>

          {/* Metric Selector Toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/70 p-1 dark:border-slate-800 dark:bg-slate-900/80">
            <button
              type="button"
              onClick={() => setYMetric('coding')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                yMetric === 'coding'
                  ? 'bg-cyan-600 font-semibold text-white shadow-2xs dark:bg-cyan-500 dark:text-slate-950'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Coding Score
            </button>
            <button
              type="button"
              onClick={() => setYMetric('intelligence')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                yMetric === 'intelligence'
                  ? 'bg-indigo-600 font-semibold text-white shadow-2xs dark:bg-indigo-500 dark:text-slate-950'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Intelligence Score
            </button>
          </div>
        </div>

        {/* VIEW 1: GPU MEMORY VS SCORE SCATTER PLOT */}
        {activeTab === 'scatter' && (
          <div className="p-5 sm:p-6">
            {/* Scatter Controls & Filter Bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800/80">
              <div>
                <h3 className="font-display text-base font-bold text-slate-950 sm:text-lg dark:text-white">
                  Local {yMetric === 'coding' ? 'Coding' : 'Intelligence'} Capability by Hardware Footprint
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Total footprint includes {selectedQuant.toUpperCase()} weights + {contextK}K KV cache + runtime overhead buffer.
                </p>
              </div>

              {/* In-chart filter controls */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Architecture Filter */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900">
                  {(['all', 'Dense', 'MoE'] as ArchFilter[]).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setArchFilter(a)}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                        archFilter === a
                          ? 'bg-white font-semibold text-slate-950 shadow-2xs dark:bg-slate-800 dark:text-white'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {a === 'all' ? 'All Arch' : a}
                    </button>
                  ))}
                </div>

                {/* Compatibility Filter */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setFitFilter('all')}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                      fitFilter === 'all'
                        ? 'bg-white font-semibold text-slate-950 shadow-2xs dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    All Tiers
                  </button>
                  <button
                    type="button"
                    onClick={() => setFitFilter('runnable-only')}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                      fitFilter === 'runnable-only'
                        ? 'bg-white font-semibold text-teal-700 shadow-2xs dark:bg-slate-800 dark:text-teal-400'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Fits {selectedGpu.shortLabel}
                  </button>
                </div>

                {/* Zoom / Reset to rig */}
                <button
                  type="button"
                  onClick={() => setZoomToRig((z) => !z)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                    zoomToRig
                      ? 'border-teal-500/50 bg-teal-500/10 text-teal-700 dark:text-teal-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                  title={zoomToRig ? 'Reset zoom to full catalog (up to 1.5TB)' : `Zoom in on models fitting around ${selectedGpu.shortLabel}`}
                >
                  <ZoomIn className="h-3 w-3" />
                  <span>{zoomToRig ? 'Reset Zoom' : `Focus ≤${selectedGpu.shortLabel}`}</span>
                </button>
              </div>
            </div>

            {/* Semantic Legend Strip */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-500 ring-2 ring-teal-500/30" />
                  Comfortable Fit
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Tight Fit
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  Requires Offloading
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400 opacity-60 dark:bg-slate-600" />
                  Not Supported
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t-2 border-dashed border-cyan-500" />
                  Optimal Frontier (Pareto)
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                  <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" />
                  Frontier Baseline ({FRONTIER_BASELINE.name})
                </span>
              </div>

              <div className="text-[11px] font-mono-num text-slate-400">
                Showing {filteredScatterItems.length} models
              </div>
            </div>

            {/* Scatter Canvas Container */}
            <div className="relative flex flex-col justify-between h-[440px] w-full select-none rounded-2xl border border-slate-200/90 bg-[#f8fafc] pt-7 pr-4 pb-4 pl-12 sm:h-[480px] dark:border-slate-800/90 dark:bg-[#090c13]">
              <div className="relative flex-1 w-full mb-7">
                {/* Runnable Hardware Zone Shading */}
                <div
                  className="pointer-events-none absolute top-0 bottom-0 left-0 rounded-l-lg bg-gradient-to-r from-teal-500/[0.04] to-teal-500/[0.14] transition-all duration-300 dark:from-teal-500/[0.03] dark:to-teal-500/[0.15]"
                  style={{
                    width: `${Math.min(100, Math.max(0, scatterData.xPct(selectedGpu.vramGb)))}%`,
                  }}
                />

                {/* Y Axis Grid Lines & Numeric Labels */}
                {(yMetric === 'coding' ? [40, 55, 70, 85, 100] : [0, 15, 30, 45, 60, 70]).map((tick) => {
                  const top = scatterData.yPct(tick);
                  return (
                    <div
                      key={tick}
                      className="pointer-events-none absolute right-0 left-0 border-t border-slate-200/70 dark:border-slate-800/70"
                      style={{ top: `${top}%` }}
                    >
                      <span className="absolute -top-2 -left-10 w-8 text-right font-mono-num text-[10px] text-slate-400">
                        {tick}
                      </span>
                    </div>
                  );
                })}

                {/* Frontier Reference Baseline Horizontal Guideline */}
                {(() => {
                  const baselineScore =
                    yMetric === 'coding' ? FRONTIER_BASELINE.codingScore : FRONTIER_BASELINE.intelligenceScore;
                  const top = scatterData.yPct(baselineScore);
                  return (
                    <div
                      key="frontier-guideline"
                      className="pointer-events-none absolute right-0 left-0 z-15 border-t-2 border-dashed border-amber-500/80 dark:border-amber-400/80"
                      style={{ top: `${top}%` }}
                    >
                      <span className="absolute -top-3.5 right-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50/95 px-2.5 py-0.5 font-mono-num text-[10px] font-bold text-amber-900 shadow-xs backdrop-blur-xs dark:border-amber-400/40 dark:bg-amber-950/90 dark:text-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Frontier Baseline: {FRONTIER_BASELINE.name} ({baselineScore} {yMetric === 'coding' ? 'Coding' : 'Intel'})
                      </span>
                    </div>
                  );
                })()}

                {/* GPU Hardware Tier Vertical Lines */}
                {GPU_TIER_LINES.map((tierGb) => {
                  if (zoomToRig && tierGb > selectedGpu.vramGb * 1.3) return null;
                  const left = scatterData.xPct(tierGb);
                  const isSelected = tierGb === selectedGpu.vramGb;
                  const topTierLabel = tierGb >= 1024 ? `${tierGb / 1024}T` : `${tierGb}G`;
                  const bottomTierLabel = tierGb >= 1024 ? `${tierGb / 1024}TB` : `${tierGb}GB`;

                  return (
                    <div
                      key={tierGb}
                      className={`pointer-events-none absolute top-0 bottom-0 border-l transition-colors ${
                        isSelected
                          ? 'z-10 border-solid border-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]'
                          : 'border-dashed border-slate-300/60 dark:border-slate-800'
                      }`}
                      style={{ left: `${left}%` }}
                    >
                      <span
                        className={`absolute -top-5 -translate-x-1/2 rounded-md px-1.5 py-0.5 font-mono-num text-[10px] whitespace-nowrap ${
                          isSelected
                            ? 'bg-teal-600 font-bold text-white shadow-2xs dark:bg-teal-500 dark:text-slate-950'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {isSelected ? `RIG ${topTierLabel}` : topTierLabel}
                      </span>
                      <span
                        className={`absolute -bottom-5 -translate-x-1/2 font-mono-num text-[10px] whitespace-nowrap transition-colors ${
                          isSelected
                            ? 'font-bold text-teal-600 dark:text-teal-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {bottomTierLabel}
                      </span>
                    </div>
                  );
                })}

                {/* Pareto Optimal Polyline */}
                {scatterData.paretoPoints.length > 1 && (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                  >
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                      className="text-cyan-600/70 dark:text-cyan-400/70"
                      points={scatterData.paretoPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  </svg>
                )}

                {/* Plotted Models */}
                {filteredScatterItems.map(({ model, vram }) => {
                  const score = yMetric === 'coding' ? model.codingScore : model.intelligenceScore;
                  const x = scatterData.xPct(vram.totalVramGb);
                  const y = scatterData.yPct(score);
                  const isPareto = scatterData.paretoIds.has(model.id);
                  const isLabeled = scatterData.labeledIds.has(model.id);
                  const isHovered = hoveredId === model.id;
                  const isCompared = selectedCompareIds.includes(model.id);
                  const layout = scatterData.labelLayout[model.id] ?? {
                    placement: 'top',
                    align: 'center',
                    offsetClass: 'bottom-full mb-1.5',
                  };

                  const alignClass =
                    layout.align === 'right'
                      ? 'right-0 translate-x-1'
                      : layout.align === 'left'
                      ? 'left-0 -translate-x-1'
                      : 'left-1/2 -translate-x-1/2';

                  // Semantic dot styling based on 4 compatibility tiers
                  let dotRingClass = '';
                  let dotBg = model.creatorColor;

                  if (vram.fitStatus === 'comfortable') {
                    dotRingClass = 'ring-2 ring-teal-500/70 border-white dark:border-slate-950 shadow-sm';
                  } else if (vram.fitStatus === 'tight') {
                    dotRingClass = 'ring-2 ring-amber-500/70 border-white dark:border-slate-950 shadow-sm';
                  } else if (vram.fitStatus === 'offload') {
                    dotRingClass = 'ring-2 ring-indigo-500/60 border-white dark:border-slate-950 opacity-80';
                  } else {
                    dotRingClass = 'border-white/70 opacity-45 dark:border-slate-900';
                  }

                  if (isCompared) {
                    dotRingClass = 'ring-4 ring-cyan-400 border-white dark:border-slate-950 scale-125';
                  }

                  return (
                    <div
                      key={model.id}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                        isHovered ? 'z-40' : isCompared ? 'z-30' : isPareto ? 'z-20' : 'z-10'
                      }`}
                    >
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredId(model.id)}
                        onMouseLeave={() => setHoveredId((prev) => (prev === model.id ? null : prev))}
                        onFocus={() => setHoveredId(model.id)}
                        onBlur={() => setHoveredId(null)}
                        onClick={() => onSelectModel(model)}
                        aria-label={`${model.name}: ${score} score, ${vram.totalVramGb} GB VRAM (${vram.fitLabel})`}
                        className={`group relative flex items-center justify-center rounded-full transition-transform duration-150 ${
                          isHovered ? 'scale-140' : 'hover:scale-125'
                        }`}
                      >
                        <span
                          className={`block rounded-full border-2 transition ${
                            isPareto ? 'h-4 w-4' : 'h-3.5 w-3.5'
                          } ${dotRingClass}`}
                          style={{ backgroundColor: dotBg }}
                        />

                        {(isLabeled || isHovered || isCompared) && (
                          <span
                            className={`pointer-events-none absolute ${layout.offsetClass} ${alignClass} rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-all ${
                              isHovered
                                ? 'z-40 bg-slate-950 text-white shadow-lg ring-1 ring-slate-800 dark:bg-white dark:text-slate-950'
                                : isCompared
                                ? 'z-30 bg-cyan-600 text-white shadow-md'
                                : 'z-20 bg-white/95 text-slate-800 shadow-2xs ring-1 ring-slate-200/90 dark:bg-slate-900/95 dark:text-slate-200 dark:ring-slate-700/80'
                            }`}
                          >
                            {getShortChartLabel(model.name)}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}

                {/* Rich Floating Telemetry Card on Hover */}
                {hoveredItem && (
                  <div className="pointer-events-auto absolute right-3 bottom-3 z-50 w-80 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-[#121622]/95 animate-fade-in">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: hoveredItem.model.creatorColor }}
                          />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {hoveredItem.model.creator}
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-bold text-slate-950 dark:text-white line-clamp-1">
                          {hoveredItem.model.name}
                        </h4>
                      </div>

                      <CompatibilityBadge
                        status={hoveredItem.vram.fitStatus}
                        label={hoveredItem.vram.fitLabel}
                        size="xs"
                      />
                    </div>

                    {/* Quick Specs Strip */}
                    <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatParamsB(hoveredItem.model.totalParamsB)}</span>
                      {hoveredItem.model.architecture === 'MoE' && (
                        <span>({hoveredItem.model.activeParamsB}B act)</span>
                      )}
                      <span>·</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {hoveredItem.model.architecture}
                      </span>
                      <span>·</span>
                      <span className="uppercase">{selectedQuant}</span>
                    </div>

                    {/* 3 Metric Grid */}
                    <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-50 p-2 font-mono-num text-xs dark:bg-slate-900/80">
                      <div>
                        <div className="text-[10px] text-slate-400">Coding</div>
                        <div className="font-bold text-cyan-600 dark:text-cyan-400">
                          {hoveredItem.model.codingScore}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Intel (AA)</div>
                        <div className="font-bold text-indigo-600 dark:text-indigo-400">
                          {hoveredItem.model.intelligenceScore}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Total VRAM</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {hoveredItem.vram.totalVramGb}G
                        </div>
                      </div>
                    </div>

                    {/* VRAM Breakdown & Headroom */}
                    <div className="mt-2.5 space-y-1 text-[11px] font-mono-num">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>Weights + KV + Overhead:</span>
                        <span>
                          {hoveredItem.vram.weightsGb}G + {hoveredItem.vram.kvCacheGb}G + {hoveredItem.vram.overheadGb}G
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Available Headroom:</span>
                        <span
                          className={`font-semibold ${
                            hoveredItem.vram.headroomGb >= 0
                              ? 'text-teal-600 dark:text-teal-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {hoveredItem.vram.headroomGb >= 0
                            ? `+${hoveredItem.vram.headroomGb} GB`
                            : `${hoveredItem.vram.headroomGb} GB deficit`}
                        </span>
                      </div>
                    </div>

                    {/* Incompatibility explanation if not comfortable */}
                    {hoveredItem.vram.incompatibilityReason && (
                      <p className="mt-2 rounded-lg bg-amber-500/10 p-2 text-[10px] text-amber-800 dark:text-amber-300">
                        {hoveredItem.vram.incompatibilityReason}
                      </p>
                    )}

                    {/* Interactive Action Buttons */}
                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => onSelectModel(hoveredItem.model)}
                        className="text-[11px] font-semibold text-teal-600 hover:underline dark:text-teal-400"
                      >
                        Inspect Model Details →
                      </button>

                      {onToggleCompare && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCompare(hoveredItem.model.id);
                          }}
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition ${
                            selectedCompareIds.includes(hoveredItem.model.id)
                              ? 'bg-teal-500 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {selectedCompareIds.includes(hoveredItem.model.id) ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Compared</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              <span>+ Compare</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* X Axis Description */}
              <div className="text-center font-mono-num text-[11px] text-slate-400 dark:text-slate-500">
                Required Memory Footprint (Weights + KV Cache + Overhead in GB · Logarithmic Scale)
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DUAL CAPABILITY BARS */}
        {activeTab === 'dual-bars' && (
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-950 sm:text-xl dark:text-white">
                  Head-to-Head Coding &amp; Intelligence Ranking
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sorted by {yMetric === 'coding' ? 'Coding Score (0–100)' : 'Intelligence Score'} · Tagged with live {selectedQuant.toUpperCase()} memory footprint
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-600 dark:bg-cyan-400" />
                  Coding (0–100)
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                  Intelligence (scaled)
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-2 locai-scrollbar">
              {/* Frontier Reference Baseline Card */}
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/[0.06] p-3 text-left transition dark:border-amber-500/25 dark:bg-amber-950/20">
                <div className="grid w-full grid-cols-12 items-center gap-3">
                  <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-display text-xs font-bold text-amber-950 dark:text-amber-200">
                        {FRONTIER_BASELINE.name}
                      </span>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 uppercase dark:text-amber-300">
                        Ceiling
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-amber-800/80 dark:text-amber-400/80">
                      {FRONTIER_BASELINE.creator} · Closed Cloud Frontier API
                    </div>
                  </div>

                  <div className="col-span-9 sm:col-span-6 lg:col-span-7 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-amber-200/50 dark:bg-amber-950/60">
                        <div
                          className="h-full rounded-full bg-cyan-600 dark:bg-cyan-400"
                          style={{ width: `${Math.min(100, FRONTIER_BASELINE.codingScore)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono-num text-xs font-bold text-cyan-700 dark:text-cyan-300">
                        {FRONTIER_BASELINE.codingScore}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-amber-200/50 dark:bg-amber-950/60">
                        <div
                          className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono-num text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        {FRONTIER_BASELINE.intelligenceScore}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-3 sm:col-span-2 text-right">
                    <span className="font-mono-num text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                      Closed API
                    </span>
                    <div className="text-[10px] text-amber-700/70 dark:text-amber-400/70">
                      0 GB Local VRAM
                    </div>
                  </div>
                </div>
              </div>

              {dualBarItems.map(({ model, vram }) => {
                const fits = vram.isRunnable;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onSelectModel(model)}
                    className="group grid w-full grid-cols-12 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 text-left transition hover:border-teal-500/40 hover:bg-white dark:border-slate-800/70 dark:bg-slate-900/40 dark:hover:bg-slate-900"
                  >
                    <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                      <div className="truncate font-display text-xs font-bold text-slate-950 group-hover:text-teal-600 dark:text-slate-100 dark:group-hover:text-teal-400">
                        {model.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {model.creator} ·{' '}
                        {model.architecture === 'MoE'
                          ? `${formatParamsB(model.totalParamsB)} (${model.activeParamsB}B act)`
                          : formatParamsB(model.totalParamsB)}
                      </div>
                    </div>

                    <div className="col-span-9 sm:col-span-6 lg:col-span-7 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-cyan-600 dark:bg-cyan-400"
                            style={{ width: `${Math.min(100, model.codingScore)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono-num text-xs font-bold text-cyan-700 dark:text-cyan-300">
                          {model.codingScore}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                            style={{ width: `${Math.min(100, (model.intelligenceScore / FRONTIER_BASELINE.intelligenceScore) * 100)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono-num text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          {model.intelligenceScore}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex flex-col items-end">
                      <span
                        className={`rounded-lg px-2 py-0.5 font-mono-num text-xs font-semibold ${
                          fits
                            ? 'bg-teal-500/15 text-teal-800 dark:text-teal-300'
                            : 'bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {vram.totalVramGb} GB
                      </span>
                      <span className="mt-0.5 text-[10px] text-slate-400">
                        {fits ? `Fits ${selectedGpu.shortLabel}` : `Min ${vram.minTierLabel}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: STACKED MEMORY ALLOCATION */}
        {activeTab === 'vram-stack' && (
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-950 sm:text-xl dark:text-white">
                  VRAM Allocation Stack ({selectedQuant.toUpperCase()} + {contextK}K Context)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visualizes how Weights, KV Context Cache, and Driver Overhead add up against your{' '}
                  <strong className="text-teal-700 dark:text-teal-400">{selectedGpu.name}</strong> ceiling (0–{maxStackScaleGb} GB scale).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-600 dark:bg-teal-500" />
                  Weights
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  KV Cache ({contextK}K)
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Driver Overhead
                </span>
              </div>
            </div>

            <div className="relative max-h-[480px] space-y-2 overflow-y-auto pr-2 locai-scrollbar">
              {stackBarItems.map(({ model, vram }) => {
                const wPct = Math.min(100, (vram.weightsGb / maxStackScaleGb) * 100);
                const kvPct = Math.min(100 - wPct, (vram.kvCacheGb / maxStackScaleGb) * 100);
                const ohPct = Math.min(100 - wPct - kvPct, (vram.overheadGb / maxStackScaleGb) * 100);
                const gpuLinePct = Math.min(100, (selectedGpu.vramGb / maxStackScaleGb) * 100);
                const fits = vram.isRunnable;

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onSelectModel(model)}
                    className="group grid w-full grid-cols-12 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2 text-left transition hover:border-teal-500/40 hover:bg-white dark:border-slate-800/70 dark:bg-slate-900/40"
                  >
                    <div className="col-span-12 sm:col-span-3 truncate">
                      <span className="font-display text-xs font-bold text-slate-950 group-hover:text-teal-600 dark:text-slate-100">
                        {model.name}
                      </span>
                      <span className="ml-1.5 font-mono-num text-[10px] text-slate-400">
                        {formatParamsB(model.totalParamsB)}
                      </span>
                    </div>

                    <div className="relative col-span-9 sm:col-span-7 flex h-4 items-center overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/90">
                      <div
                        className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-rose-500"
                        style={{ left: `${gpuLinePct}%` }}
                        title={`${selectedGpu.name} limit`}
                      />
                      <div
                        className="h-full bg-teal-600 transition-all dark:bg-teal-500"
                        style={{ width: `${wPct}%` }}
                      />
                      <div
                        className="h-full bg-cyan-400 transition-all"
                        style={{ width: `${kvPct}%` }}
                      />
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${ohPct}%` }}
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1.5 font-mono-num text-xs">
                      <span className="font-bold text-slate-950 dark:text-white">
                        {vram.totalVramGb > maxStackScaleGb ? `${vram.totalVramGb}G+` : `${vram.totalVramGb} GB`}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          fits ? 'bg-teal-500' : 'bg-rose-500'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>
                Vertical red marker indicates your selected <strong>{selectedGpu.name}</strong> ceiling
              </span>
              <span>Click any row to inspect full Q2–BF16 sizing</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
