import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  X,
} from 'lucide-react';

export interface EnrichedModel {
  model: LocalAIModel;
  vram: VramEstimate;
}

export type FitFilter = 'runnable-only' | 'with-offload' | 'all';

interface BenchmarkChartsProps {
  items: EnrichedModel[];
  selectedGpu: GpuPreset;
  selectedQuant: QuantKey;
  contextK: number;
  onSelectModel: (model: LocalAIModel) => void;
  selectedCompareIds?: string[];
  onToggleCompare?: (modelId: string) => void;
  fitFilter?: FitFilter;
  onChangeFitFilter?: (filter: FitFilter) => void;
}

type ChartTab = 'scatter' | 'dual-bars' | 'vram-stack';
type YMetric = 'coding' | 'intelligence';
type ArchFilter = 'all' | 'Dense' | 'MoE';

const CANDIDATE_GPU_TIER_LINES = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 256, 512, 1024];

function getShortChartLabel(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, '')
    .replace(' Super VL 120B-A12B', ' 120B')
    .replace(' Lightning 32B', ' 32B')
    .replace(' Bolt 74B-A9B', ' 74B')
    .replace(' Flash Next', ' Next')
    .replace('-Flash-RL', ' Flash')
    .replace('-Instruct', '')
    .replace(' Instruct', '');
}

export const BenchmarkCharts: React.FC<BenchmarkChartsProps> = ({
  items,
  selectedGpu,
  selectedQuant,
  contextK,
  onSelectModel,
  selectedCompareIds = [],
  onToggleCompare,
  fitFilter: controlledFitFilter,
  onChangeFitFilter,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('scatter');
  const [yMetric, setYMetric] = useState<YMetric>('coding');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [archFilter, setArchFilter] = useState<ArchFilter>('all');
  const [internalFitFilter, setInternalFitFilter] = useState<FitFilter>('runnable-only');
  const [zoomToRig, setZoomToRig] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const hoverClearTimerRef = useRef<number | null>(null);

  const fitFilter = controlledFitFilter ?? internalFitFilter;
  const setFitFilter = (next: FitFilter) => {
    setInternalFitFilter(next);
    onChangeFitFilter?.(next);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const activateHover = (id: string) => {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }
    setHoveredId(id);
  };

  const cancelHoverClear = () => {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }
  };

  const scheduleHoverClear = (delayMs = 200) => {
    cancelHoverClear();
    hoverClearTimerRef.current = window.setTimeout(() => {
      setHoveredId(null);
      hoverClearTimerRef.current = null;
    }, delayMs);
  };

  useEffect(() => {
    return () => cancelHoverClear();
  }, []);

  // Telemetry highlights
  const fittingModels = useMemo(
    () => items.filter((x) => x.vram.isRunnable),
    [items]
  );

  const runnableWithOffloadModels = useMemo(
    () => items.filter((x) => x.vram.isRunnable || x.vram.fitStatus === 'offload'),
    [items]
  );

  // If the current weight tier filter has 0 runnable models for this GPU (e.g. 150B+ tier on 16GB GPU),
  // gracefully show all models in that tier rather than an empty chart.
  const effectiveFitFilter: FitFilter = useMemo(() => {
    if (fitFilter === 'runnable-only' && fittingModels.length === 0) {
      return runnableWithOffloadModels.length > 0 ? 'with-offload' : 'all';
    }
    if (fitFilter === 'with-offload' && runnableWithOffloadModels.length === 0) {
      return 'all';
    }
    return fitFilter;
  }, [fitFilter, fittingModels.length, runnableWithOffloadModels.length]);

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

  // Filtered items for visualizations based on active UI filters
  const filteredScatterItems = useMemo(() => {
    return items.filter((entry) => {
      if (archFilter !== 'all' && entry.model.architecture !== archFilter) return false;
      if (effectiveFitFilter === 'runnable-only' && !entry.vram.isRunnable) return false;
      if (
        effectiveFitFilter === 'with-offload' &&
        !entry.vram.isRunnable &&
        entry.vram.fitStatus !== 'offload'
      ) {
        return false;
      }
      if (zoomToRig && entry.vram.totalVramGb > selectedGpu.vramGb * 1.25) return false;
      return true;
    });
  }, [items, archFilter, effectiveFitFilter, zoomToRig, selectedGpu.vramGb]);

  // Scatter coordinate math with automatic X-axis scaling & 2D collision-free labels
  const scatterData = useMemo(() => {
    const vrams = filteredScatterItems.map((e) => e.vram.totalVramGb);
    const highestVisibleGb = vrams.length > 0 ? Math.max(...vrams) : selectedGpu.vramGb;
    const lowestVisibleGb = vrams.length > 0 ? Math.min(...vrams) : 2.5;

    const minGb = Math.max(1.8, Math.min(2.5, lowestVisibleGb * 0.78));
    let maxGb: number;
    if (zoomToRig || effectiveFitFilter === 'runnable-only') {
      maxGb = Math.max(8, selectedGpu.vramGb * 1.22, highestVisibleGb * 1.12);
    } else if (effectiveFitFilter === 'with-offload') {
      maxGb = Math.max(16, selectedGpu.vramGb * 1.35, highestVisibleGb * 1.15);
    } else {
      maxGb = Math.max(selectedGpu.vramGb * 1.22, highestVisibleGb * 1.15, 16);
    }

    const logMin = Math.log2(minGb);
    const logMax = Math.log2(Math.max(minGb * 2, maxGb));

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

    // Build de-overlapped X-axis GPU tier lines so labels never collide on mobile or desktop
    const allCandidateTiers = Array.from(
      new Set([...CANDIDATE_GPU_TIER_LINES, selectedGpu.vramGb])
    ).sort((a, b) => a - b);

    const minTierSpacingPct = isMobile ? 16 : 9;
    const visibleTierLines: number[] = [];

    const selectedLeft = xPct(selectedGpu.vramGb);
    if (selectedGpu.vramGb >= minGb && selectedGpu.vramGb <= maxGb && selectedLeft >= 3 && selectedLeft <= 97) {
      visibleTierLines.push(selectedGpu.vramGb);
    }

    for (const tierGb of allCandidateTiers) {
      if (tierGb === selectedGpu.vramGb) continue;
      if (tierGb < minGb * 1.05 || tierGb > maxGb * 0.96) continue;
      const left = xPct(tierGb);
      if (left < 6 || left > 93) continue;
      const tooClose = visibleTierLines.some(
        (kept) => Math.abs(xPct(kept) - left) < minTierSpacingPct
      );
      if (!tooClose) {
        visibleTierLines.push(tierGb);
      }
    }
    visibleTierLines.sort((a, b) => a - b);

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

    // 2D Bounding-Box Collision-Free Label Selection
    const labeledIds = new Set<string>();
    const labelLayout: Record<
      string,
      { placement: 'top' | 'bottom'; align: 'center' | 'left' | 'right'; offsetClass: string }
    > = {};

    const placedBoxes: { x: number; y: number; w: number; h: number }[] = [];
    const boxH = isMobile ? 11 : 8.5;
    const maxStaticLabels = isMobile ? 6 : 12;

    const tryPlaceLabel = (id: string, px: number, py: number, labelText: string): boolean => {
      if (labeledIds.has(id) || labeledIds.size >= maxStaticLabels) return false;
      const boxW = Math.max(isMobile ? 22 : 13, labelText.length * (isMobile ? 1.55 : 0.92));
      const align: 'center' | 'left' | 'right' =
        px > 82 ? 'right' : px < 16 ? 'left' : 'center';
      const boxCenterX =
        align === 'right' ? px - boxW * 0.42 : align === 'left' ? px + boxW * 0.42 : px;

      const candidatePlacements: ('top' | 'bottom')[] =
        py < 18 ? ['bottom', 'top'] : py > 84 ? ['top', 'bottom'] : ['top', 'bottom'];

      for (const placement of candidatePlacements) {
        const boxCenterY = placement === 'top' ? py - (isMobile ? 7.5 : 6) : py + (isMobile ? 7.5 : 6);
        if (boxCenterY < 6 || boxCenterY > 95) continue;

        // Avoid colliding with the top-left Frontier Baseline pill on mobile
        if (isMobile && boxCenterY < 15 && boxCenterX < 62) continue;

        const collidesDot = filteredScatterItems.some((other) => {
          if (other.model.id === id) return false;
          const ox = xPct(other.vram.totalVramGb);
          const oy = yPct(
            yMetric === 'coding' ? other.model.codingScore : other.model.intelligenceScore
          );
          return Math.abs(ox - boxCenterX) < boxW * 0.45 && Math.abs(oy - boxCenterY) < boxH * 0.55;
        });
        if (collidesDot) continue;

        const collidesLabel = placedBoxes.some(
          (b) =>
            Math.abs(b.x - boxCenterX) < (b.w + boxW) * 0.52 &&
            Math.abs(b.y - boxCenterY) < (b.h + boxH) * 0.58
        );
        if (!collidesLabel) {
          labeledIds.add(id);
          placedBoxes.push({ x: boxCenterX, y: boxCenterY, w: boxW, h: boxH });
          labelLayout[id] = {
            placement,
            align,
            offsetClass: placement === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
          };
          return true;
        }
      }
      return false;
    };

    // Priority 1: Best overall fitting model for selected GPU + Pareto frontier peak
    const priorityIds: string[] = [];
    if (bestOverallForGpu && filteredScatterItems.some((e) => e.model.id === bestOverallForGpu.model.id)) {
      priorityIds.push(bestOverallForGpu.model.id);
    }
    if (paretoPoints.length > 0) {
      priorityIds.push(paretoPoints[paretoPoints.length - 1].id);
      priorityIds.push(paretoPoints[0].id);
    }
    // Priority 2: Other Pareto points from highest to lowest
    for (let i = paretoPoints.length - 2; i >= 1; i--) {
      priorityIds.push(paretoPoints[i].id);
    }
    // Priority 3: Featured spotlight models if space permits
    for (const spotId of [
      'inkling-2-small',
      'inkling-2-mini',
      'glm-5-3-max',
      'mistral-large-4',
      'nemotron-3-5-super-vl',
      'bonsai-27b',
      'qwen3-8-27b',
    ]) {
      priorityIds.push(spotId);
    }

    for (const pid of priorityIds) {
      const entry = filteredScatterItems.find((e) => e.model.id === pid);
      if (!entry) continue;
      const score = yMetric === 'coding' ? entry.model.codingScore : entry.model.intelligenceScore;
      tryPlaceLabel(
        entry.model.id,
        xPct(entry.vram.totalVramGb),
        yPct(score),
        getShortChartLabel(entry.model.name)
      );
    }

    return {
      xPct,
      yPct,
      minGb,
      maxGb,
      visibleTierLines,
      paretoIds,
      paretoPoints,
      labeledIds,
      labelLayout,
    };
  }, [
    filteredScatterItems,
    yMetric,
    bestOverallForGpu,
    zoomToRig,
    effectiveFitFilter,
    selectedGpu.vramGb,
    isMobile,
  ]);

  const hoveredItem = useMemo(
    () => items.find((i) => i.model.id === hoveredId) ?? null,
    [items, hoveredId]
  );

  const dualBarItems = useMemo(() => {
    return [...filteredScatterItems].sort((a, b) =>
      yMetric === 'coding'
        ? b.model.codingScore - a.model.codingScore
        : b.model.intelligenceScore - a.model.intelligenceScore
    );
  }, [filteredScatterItems, yMetric]);

  const stackBarItems = useMemo(() => {
    return [...filteredScatterItems].sort((a, b) => a.vram.totalVramGb - b.vram.totalVramGb);
  }, [filteredScatterItems]);

  const maxStackScaleGb = useMemo(() => {
    const highest = Math.max(
      ...filteredScatterItems.map((i) => i.vram.totalVramGb),
      selectedGpu.vramGb,
      16
    );
    if (highest <= 20) return 20;
    if (highest <= 36) return 36;
    if (highest <= 72) return 72;
    if (highest <= 140) return 140;
    return Math.min(1600, Math.ceil(highest / 128) * 128);
  }, [filteredScatterItems, selectedGpu.vramGb]);

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
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
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
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
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
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
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

                {/* Status Indicator: accurately communicates runnable vs non-runnable on current hardware */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-mono-num">
                    {topIntelOverall.vram.isRunnable ? (
                      <span className="font-semibold text-teal-700 dark:text-teal-400">
                        +{topIntelOverall.vram.headroomGb} GB headroom
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-3 w-3" />
                        Requires {topIntelOverall.vram.minTierLabel}+
                      </span>
                    )}
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      Intel: {topIntelOverall.model.intelligenceScore}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{
                        width: topIntelOverall.vram.isRunnable
                          ? `${Math.min(
                              100,
                              Math.round((topIntelOverall.vram.totalVramGb / selectedGpu.vramGb) * 100)
                            )}%`
                          : '100%',
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between font-mono-num text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {topIntelOverall.vram.totalVramGb} GB footprint
                  </span>
                  {topIntelOverall.vram.isRunnable ? (
                    <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                      Fits {selectedGpu.shortLabel}
                    </span>
                  ) : (
                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                      Exceeds {selectedGpu.shortLabel}
                    </span>
                  )}
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
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
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
                  : 'bg-white/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
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
                  : 'bg-white/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
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
                  : 'bg-white/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
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

        {/* Universal Mobile-Friendly Hardware Fit & Architecture Filter Bar (applies to all 3 chart views) */}
        <div className="flex flex-col gap-2.5 border-b border-slate-200/70 bg-slate-50/40 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 dark:border-slate-800/70 dark:bg-[#0e121b]">
          {/* Primary Hardware Fit Segmented Control */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Show:
            </span>
            <div className="grid flex-1 grid-cols-3 gap-1 rounded-xl border border-slate-200/90 bg-white p-1 sm:flex sm:flex-initial dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setFitFilter('runnable-only')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  effectiveFitFilter === 'runnable-only'
                    ? 'bg-teal-600 text-white shadow-2xs dark:bg-teal-500 dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span>Fits {selectedGpu.shortLabel}</span>
                <span
                  className={`rounded px-1.5 py-0.2 font-mono-num text-[10px] ${
                    effectiveFitFilter === 'runnable-only'
                      ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {fittingModels.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFitFilter('with-offload')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  effectiveFitFilter === 'with-offload'
                    ? 'bg-indigo-600 text-white shadow-2xs dark:bg-indigo-500 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span>+ Offload</span>
                <span
                  className={`rounded px-1.5 py-0.2 font-mono-num text-[10px] ${
                    effectiveFitFilter === 'with-offload'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {runnableWithOffloadModels.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFitFilter('all')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  effectiveFitFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span>All Models</span>
                <span
                  className={`rounded px-1.5 py-0.2 font-mono-num text-[10px] ${
                    effectiveFitFilter === 'all'
                      ? 'bg-white/20 text-white dark:bg-slate-950/15 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {items.length}
                </span>
              </button>
            </div>
          </div>

          {/* Secondary Architecture & Axis Zoom Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:justify-end">
            <div className="flex items-center rounded-xl border border-slate-200/90 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
              {(['all', 'Dense', 'MoE'] as ArchFilter[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArchFilter(a)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    archFilter === a
                      ? 'bg-slate-900 font-semibold text-white shadow-2xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {a === 'all' ? 'All Arch' : a}
                </button>
              ))}
            </div>

            {effectiveFitFilter !== 'runnable-only' && (
              <button
                type="button"
                onClick={() => setZoomToRig((z) => !z)}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition ${
                  zoomToRig
                    ? 'border-teal-500/50 bg-teal-500/10 text-teal-700 dark:text-teal-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
                title={
                  zoomToRig
                    ? 'Reset zoom to all visible models'
                    : `Zoom X-axis to ${selectedGpu.shortLabel}`
                }
              >
                <ZoomIn className="h-3 w-3" />
                <span>{zoomToRig ? 'Reset Zoom' : `Zoom ≤${selectedGpu.shortLabel}`}</span>
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: GPU MEMORY VS SCORE SCATTER PLOT */}
        {activeTab === 'scatter' && (
          <div className="p-4 sm:p-6">
            {/* Scatter Header */}
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-slate-950 sm:text-lg dark:text-white">
                  Local {yMetric === 'coding' ? 'Coding' : 'Intelligence'} Capability by Hardware Footprint
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {effectiveFitFilter === 'runnable-only'
                    ? `Showing only models that fit ${selectedGpu.name} (${selectedGpu.shortLabel}) at ${selectedQuant.toUpperCase()} + ${contextK}K context.`
                    : effectiveFitFilter === 'with-offload'
                    ? `Showing models runnable natively or via CPU/RAM offload on ${selectedGpu.shortLabel}.`
                    : `Total footprint includes ${selectedQuant.toUpperCase()} weights + ${contextK}K KV cache + runtime overhead buffer.`}
                </p>
              </div>

              <div className="rounded-lg bg-slate-100/80 px-2.5 py-1 font-mono-num text-[11px] font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                Showing {filteredScatterItems.length} of {items.length} models
              </div>
            </div>

            {/* Semantic Legend Strip */}
            <div className="mb-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px] text-slate-600 sm:text-xs dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-500 ring-2 ring-teal-500/30" />
                Comfortable Fit
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Tight Fit
              </span>
              {effectiveFitFilter !== 'runnable-only' && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    Requires Offloading
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400 opacity-60 dark:bg-slate-600" />
                    Not Supported
                  </span>
                </>
              )}
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 border-t-2 border-dashed border-cyan-500" />
                Optimal Frontier (Pareto)
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                <span className="h-0.5 w-3.5 border-t-2 border-dashed border-amber-500" />
                Ceiling: {FRONTIER_BASELINE.name} (
                {yMetric === 'coding'
                  ? FRONTIER_BASELINE.codingScore
                  : FRONTIER_BASELINE.intelligenceScore}
                )
              </span>
            </div>

            {/* Scatter Canvas Container */}
            <div
              onMouseLeave={() => scheduleHoverClear(180)}
              onMouseEnter={cancelHoverClear}
              onClick={() => setHoveredId(null)}
              className="relative flex h-[380px] w-full flex-col justify-between rounded-2xl border border-slate-200/90 bg-[#f8fafc] pt-7 pr-3 pb-4 pl-9 select-none sm:h-[480px] sm:pr-4 sm:pl-12 dark:border-slate-800/90 dark:bg-[#090c13]"
            >
              <div className="relative mb-6 flex-1 w-full sm:mb-7">
                {/* Runnable Hardware Zone Shading */}
                <div
                  className="pointer-events-none absolute top-0 bottom-0 left-0 rounded-l-lg bg-gradient-to-r from-teal-500/[0.04] to-teal-500/[0.14] transition-all duration-300 dark:from-teal-500/[0.03] dark:to-teal-500/[0.15]"
                  style={{
                    width: `${Math.min(100, Math.max(0, scatterData.xPct(selectedGpu.vramGb)))}%`,
                  }}
                />

                {/* Y Axis Grid Lines & Numeric Labels */}
                {(yMetric === 'coding' ? [40, 55, 70, 85, 100] : [0, 15, 30, 45, 60, 70]).map(
                  (tick) => {
                    const top = scatterData.yPct(tick);
                    return (
                      <div
                        key={tick}
                        className="pointer-events-none absolute right-0 left-0 border-t border-slate-200/70 dark:border-slate-800/70"
                        style={{ top: `${top}%` }}
                      >
                        <span className="absolute -top-2 -left-8 w-6 text-right font-mono-num text-[10px] text-slate-500 sm:-left-10 sm:w-8 dark:text-slate-400">
                          {tick}
                        </span>
                      </div>
                    );
                  }
                )}

                {/* Frontier Reference Baseline Horizontal Guideline */}
                {(() => {
                  const baselineScore =
                    yMetric === 'coding'
                      ? FRONTIER_BASELINE.codingScore
                      : FRONTIER_BASELINE.intelligenceScore;
                  const top = scatterData.yPct(baselineScore);
                  return (
                    <div
                      key="frontier-guideline"
                      className="pointer-events-none absolute right-0 left-0 z-15 border-t-2 border-dashed border-amber-500/80 dark:border-amber-400/80"
                      style={{ top: `${top}%` }}
                    >
                      <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-50/95 px-2 py-0.5 font-mono-num text-[9px] font-bold whitespace-nowrap text-amber-900 shadow-2xs backdrop-blur-xs sm:-top-3.5 sm:right-2 sm:left-auto sm:gap-1.5 sm:px-2.5 sm:text-[10px] dark:border-amber-400/40 dark:bg-amber-950/90 dark:text-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className="sm:hidden">
                          {FRONTIER_BASELINE.name} ({baselineScore})
                        </span>
                        <span className="hidden sm:inline">
                          Frontier Baseline: {FRONTIER_BASELINE.name} ({baselineScore}{' '}
                          {yMetric === 'coding' ? 'Coding' : 'Intel'})
                        </span>
                      </span>
                    </div>
                  );
                })()}

                {/* De-overlapped GPU Hardware Tier Vertical Lines */}
                {scatterData.visibleTierLines.map((tierGb) => {
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
                        className={`absolute -top-5 -translate-x-1/2 rounded-md px-1.5 py-0.5 font-mono-num text-[9px] whitespace-nowrap sm:text-[10px] ${
                          isSelected
                            ? 'bg-teal-600 font-bold text-white shadow-2xs dark:bg-teal-500 dark:text-slate-950'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isSelected ? `RIG ${topTierLabel}` : topTierLabel}
                      </span>
                      <span
                        className={`absolute -bottom-5 -translate-x-1/2 font-mono-num text-[9px] whitespace-nowrap transition-colors sm:text-[10px] ${
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
                  const fallbackPlacement = y < 16 ? 'bottom' : 'top';
                  const fallbackAlign = x > 82 ? 'right' : x < 16 ? 'left' : 'center';
                  const layout = scatterData.labelLayout[model.id] ?? {
                    placement: fallbackPlacement,
                    align: fallbackAlign,
                    offsetClass:
                      fallbackPlacement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
                  };

                  const alignClass =
                    layout.align === 'right'
                      ? 'right-0 translate-x-1'
                      : layout.align === 'left'
                      ? 'left-0 -translate-x-1'
                      : 'left-1/2 -translate-x-1/2';

                  // Semantic dot styling based on 4 compatibility tiers
                  let dotRingClass = '';
                  const dotBg = model.creatorColor;

                  if (vram.fitStatus === 'comfortable') {
                    dotRingClass =
                      'ring-2 ring-teal-500/70 border-white dark:border-slate-950 shadow-sm';
                  } else if (vram.fitStatus === 'tight') {
                    dotRingClass =
                      'ring-2 ring-amber-500/70 border-white dark:border-slate-950 shadow-sm';
                  } else if (vram.fitStatus === 'offload') {
                    dotRingClass =
                      'ring-2 ring-indigo-500/60 border-white dark:border-slate-950 opacity-80';
                  } else {
                    dotRingClass = 'border-white/70 opacity-45 dark:border-slate-900';
                  }

                  if (isCompared) {
                    dotRingClass =
                      'ring-4 ring-cyan-400 border-white dark:border-slate-950 scale-125';
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
                        onMouseEnter={() => activateHover(model.id)}
                        onFocus={() => activateHover(model.id)}
                        onBlur={() => scheduleHoverClear(150)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isMobile && hoveredId !== model.id) {
                            activateHover(model.id);
                          } else {
                            onSelectModel(model);
                          }
                        }}
                        aria-label={`${model.name}: ${score} score, ${vram.totalVramGb} GB VRAM (${vram.fitLabel})`}
                        className="group relative flex h-7 w-7 items-center justify-center rounded-full sm:h-6 sm:w-6"
                      >
                        <span
                          className={`block rounded-full border-2 transition-transform duration-150 ${
                            isPareto ? 'h-4 w-4' : 'h-3.5 w-3.5'
                          } ${isHovered ? 'scale-125' : 'group-hover:scale-125'} ${dotRingClass}`}
                          style={{ backgroundColor: dotBg }}
                        />

                        {(isLabeled || isHovered || isCompared) && (
                          <span
                            className={`pointer-events-none absolute ${layout.offsetClass} ${alignClass} rounded-md px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap transition-all sm:px-2 sm:text-[10px] ${
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

                {/* Rich Floating Telemetry Card on Hover (Desktop >= 640px) */}
                {hoveredItem &&
                  (() => {
                    const hoveredX = scatterData.xPct(hoveredItem.vram.totalVramGb);
                    const placeCardLeft = hoveredX > 52;
                    return (
                      <div
                        onMouseEnter={cancelHoverClear}
                        onClick={(e) => e.stopPropagation()}
                        className={`pointer-events-auto absolute bottom-3 hidden sm:block ${
                          placeCardLeft ? 'left-3' : 'right-3'
                        } animate-fade-in z-50 w-80 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-[#121622]/95`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: hoveredItem.model.creatorColor }}
                              />
                              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                {hoveredItem.model.creator}
                              </span>
                            </div>
                            <h4 className="font-display line-clamp-1 text-sm font-bold text-slate-950 dark:text-white">
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
                        <div className="mt-2.5 space-y-1 font-mono-num text-[11px]">
                          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                            <span>Weights + KV + Overhead:</span>
                            <span>
                              {hoveredItem.vram.weightsGb}G + {hoveredItem.vram.kvCacheGb}G +{' '}
                              {hoveredItem.vram.overheadGb}G
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">
                              Available Headroom:
                            </span>
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
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
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
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
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
                    );
                  })()}
              </div>

              {/* X Axis Description */}
              <div className="text-center font-mono-num text-[10px] text-slate-500 sm:text-[11px] dark:text-slate-400">
                Required Memory Footprint (Weights + KV Cache + Overhead in GB · Log Scale)
              </div>
            </div>

            {/* Mobile Docked Telemetry Card Below Chart (< 640px) so it never covers plotted dots */}
            {hoveredItem ? (
              <div className="animate-fade-in mt-3 rounded-2xl border border-teal-500/30 bg-slate-50/90 p-3.5 shadow-sm sm:hidden dark:border-teal-500/25 dark:bg-[#141926]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: hoveredItem.model.creatorColor }}
                      />
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                        {hoveredItem.model.creator} · {formatParamsB(hoveredItem.model.totalParamsB)}
                        {hoveredItem.model.architecture === 'MoE'
                          ? ` (${hoveredItem.model.activeParamsB}B act)`
                          : ''}
                      </span>
                    </div>
                    <h4 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                      {hoveredItem.model.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <CompatibilityBadge
                      status={hoveredItem.vram.fitStatus}
                      label={hoveredItem.vram.fitLabel}
                      size="xs"
                    />
                    <button
                      type="button"
                      onClick={() => setHoveredId(null)}
                      aria-label="Close model preview"
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-xl bg-white p-2 font-mono-num text-xs dark:bg-slate-900/90">
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
                    <div className="text-[10px] text-slate-400">VRAM ({selectedQuant.toUpperCase()})</div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {hoveredItem.vram.totalVramGb} GB
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectModel(hoveredItem.model)}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs dark:bg-teal-500 dark:text-slate-950"
                  >
                    <span>Inspect Details</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>

                  {onToggleCompare && (
                    <button
                      type="button"
                      onClick={() => onToggleCompare(hoveredItem.model.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        selectedCompareIds.includes(hoveredItem.model.id)
                          ? 'bg-cyan-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {selectedCompareIds.includes(hoveredItem.model.id) ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Compared</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>+ Compare</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-center text-[11px] text-slate-400 sm:hidden">
                Tap any plotted dot to preview VRAM breakdown, or tap twice for full specs.
              </p>
            )}
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
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 uppercase dark:text-amber-300">
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
                    className="group grid w-full grid-cols-12 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2 text-left transition hover:border-teal-500/40 hover:bg-white dark:border-slate-800/70 dark:bg-slate-900/40 dark:hover:bg-slate-900"
                  >
                    <div className="col-span-12 sm:col-span-3 truncate">
                      <span className="font-display text-xs font-bold text-slate-950 group-hover:text-teal-600 dark:text-slate-100 dark:group-hover:text-teal-400">
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
