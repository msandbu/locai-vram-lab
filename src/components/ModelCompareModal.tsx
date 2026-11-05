import React from 'react';
import { LocalAIModel, GpuPreset, QuantKey } from '../types/models';
import { VramEstimate, formatParamsB } from '../utils/vram';
import { CompatibilityBadge } from './CompatibilityBadge';
import { X, Layers, Code2, Brain, ArrowRight, Check, Copy, Sparkles } from 'lucide-react';

export interface ComparedModelItem {
  model: LocalAIModel;
  vram: VramEstimate;
}

interface ModelCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ComparedModelItem[];
  selectedGpu: GpuPreset;
  selectedQuant: QuantKey;
  onRemoveModel: (modelId: string) => void;
  onOpenDetails: (model: LocalAIModel) => void;
}

export const ModelCompareModal: React.FC<ModelCompareModalProps> = ({
  isOpen,
  onClose,
  models,
  selectedGpu,
  selectedQuant,
  onRemoveModel,
  onOpenDetails,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen || models.length === 0) return null;

  const handleCopyCommand = (model: LocalAIModel) => {
    const cmd = model.runCommand || `ollama run ${model.id.toLowerCase()}`;
    navigator.clipboard.writeText(cmd);
    setCopiedId(model.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0e121a]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Layers className="h-3.5 w-3.5" />
              </span>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Side-by-Side Model Comparison
              </h2>
              <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono-num text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                {models.length} of 4 selected
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Evaluated on {selectedGpu.name} ({selectedGpu.vramGb} GB · {selectedGpu.bandwidthGbS} GB/s) at {selectedQuant.toUpperCase()} precision
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close comparison"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comparison Columns Container */}
        <div className="overflow-x-auto overflow-y-auto p-6">
          <div className="grid min-w-[640px] grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {models.map(({ model, vram }) => {
              const usedPct = Math.min(100, Math.round((vram.totalVramGb / selectedGpu.vramGb) * 100));
              const ptsPerGb = (model.codingScore / vram.totalVramGb).toFixed(1);

              return (
                <div
                  key={model.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 transition-all dark:border-slate-800/90 dark:bg-[#131722]"
                >
                  {/* Model Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: model.creatorColor }}
                        />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {model.creator}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveModel(model.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="Remove from comparison"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <h3 className="mt-1.5 font-display text-base font-bold text-slate-900 line-clamp-1 dark:text-white">
                      {model.name}
                    </h3>

                    {/* Compatibility Badge */}
                    <div className="mt-2.5">
                      <CompatibilityBadge
                        status={vram.fitStatus}
                        label={vram.fitLabel}
                        size="sm"
                        tooltipText={vram.incompatibilityReason || undefined}
                      />
                    </div>

                    {/* Memory Footprint & Bar */}
                    <div className="mt-4 rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-800/70 dark:bg-[#0c0f16]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Total VRAM Footprint
                        </span>
                        <span className="font-mono-num font-bold text-slate-900 dark:text-white">
                          {vram.totalVramGb} GB
                        </span>
                      </div>

                      {/* Bar Gauge */}
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            vram.fitStatus === 'comfortable'
                              ? 'bg-teal-500'
                              : vram.fitStatus === 'tight'
                              ? 'bg-amber-500'
                              : vram.fitStatus === 'offload'
                              ? 'bg-indigo-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] font-mono-num">
                        <span className="text-slate-400">
                          {vram.headroomGb >= 0 ? `+${vram.headroomGb} GB headroom` : `${vram.headroomGb} GB deficit`}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {usedPct}% of rig
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] font-mono-num text-slate-400">
                        <span>Weights: {vram.weightsGb}G</span>
                        <span>KV: {vram.kvCacheGb}G</span>
                        <span>Buf: {vram.overheadGb}G</span>
                      </div>
                    </div>

                    {/* Benchmark Scores */}
                    <div className="mt-3.5 space-y-2">
                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs dark:bg-[#0c0f16]">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Code2 className="h-3.5 w-3.5 text-cyan-500" />
                          Coding Score
                        </span>
                        <span className="font-mono-num font-bold text-cyan-600 dark:text-cyan-400">
                          {model.codingScore} / 100
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs dark:bg-[#0c0f16]">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Brain className="h-3.5 w-3.5 text-indigo-500" />
                          Intelligence (AA v5)
                        </span>
                        <span className="font-mono-num font-bold text-indigo-600 dark:text-indigo-400">
                          {model.intelligenceScore}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs dark:bg-[#0c0f16]">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          VRAM Efficiency
                        </span>
                        <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                          {ptsPerGb} pts/GB
                        </span>
                      </div>
                    </div>

                    {/* Architecture & Specs */}
                    <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400">Architecture</span>
                        <span className="font-semibold">{model.architecture}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400">Parameters</span>
                        <span className="font-mono-num">
                          {formatParamsB(model.totalParamsB)}
                          {model.architecture === 'MoE' && ` (${model.activeParamsB}B active)`}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400">Context Window</span>
                        <span className="font-mono-num">{model.contextWindowK}K tokens</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400">Speed (Decode)</span>
                        <span className="font-mono-num font-semibold">
                          {vram.estTokensPerSec ? `~${vram.estTokensPerSec} tok/s` : 'Not available'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">License</span>
                        <span className="truncate max-w-[120px] text-right font-medium">{model.license}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 space-y-2 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleCopyCommand(model)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
                    >
                      {copiedId === model.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-teal-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          <span>Copy Run Command</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenDetails(model)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950"
                    >
                      <span>Full Specifications</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
