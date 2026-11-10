import React from 'react';
import { GpuPreset, LocalAIModel, QuantLevelInfo } from '../types/models';
import { estimateModelVram, getCreatorInitials } from '../utils/vram';
import { CompatibilityBadge } from './CompatibilityBadge';
import { ExternalLink, X, Cpu, Check, Copy } from 'lucide-react';

interface ModelDetailModalProps {
  model: LocalAIModel | null;
  onClose: () => void;
  selectedGpu: GpuPreset;
  quantLevels: QuantLevelInfo[];
  contextK: number;
  kvQuantQ8: boolean;
}

export const ModelDetailModal: React.FC<ModelDetailModalProps> = ({
  model,
  onClose,
  selectedGpu,
  quantLevels,
  contextK,
  kvQuantQ8,
}) => {
  const [copied, setCopied] = React.useState(false);
  if (!model) return null;

  const handleCopyCommand = () => {
    const cmd = model.runCommand || `ollama run ${model.id.toLowerCase()}`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-model-title"
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl locai-scrollbar dark:border-slate-800 dark:bg-[#11151f]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-start gap-3.5">
            <div
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-display text-sm font-bold text-white shadow-xs"
              style={{ backgroundColor: model.creatorColor }}
            >
              {getCreatorInitials(model.creator)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="modal-model-title"
                  className="font-display text-2xl font-bold text-slate-950 dark:text-white"
                >
                  {model.name}
                </h3>
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 font-mono-num text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {model.architecture === 'MoE'
                    ? `${model.totalParamsB >= 1000 ? `${(model.totalParamsB / 1000).toFixed(1)}T` : `${model.totalParamsB}B`} (${model.activeParamsB}B active)`
                    : `${model.totalParamsB}B Dense`}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                By <strong className="text-slate-800 dark:text-slate-200">{model.creator}</strong> •{' '}
                {model.releaseDate} • License:{' '}
                <strong className="text-slate-800 dark:text-slate-200">{model.license}</strong> • Max Context:{' '}
                <span className="font-mono-num">
                  {model.contextWindowK >= 1000 ? `${model.contextWindowK / 1000}M` : `${model.contextWindowK}K`}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Hardware Verdict & Quick Run Command */}
        <div className="mt-4 space-y-3">
          {model.notes && (
            <div className="rounded-xl border border-teal-500/25 bg-teal-500/[0.06] p-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <strong className="text-teal-900 dark:text-teal-300">Local Hardware Verdict: </strong>
              {model.notes}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-950 px-3.5 py-2.5 text-xs dark:border-slate-800">
            <code className="truncate font-mono-num text-[11px] text-teal-300">
              {model.runCommand || `ollama run ${model.id.toLowerCase()}`}
            </code>
            <button
              type="button"
              onClick={handleCopyCommand}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 font-mono-num text-[11px] font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
            >
              {copied ? <Check className="h-3 w-3 text-teal-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy CLI'}</span>
            </button>
          </div>
        </div>

        {/* Score Cards */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Overall Coding Score
              </span>
              <span className="font-mono-num text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {model.codingScore}
                <span className="text-xs font-normal text-slate-400"> / 100</span>
              </span>
            </div>
            {model.codingBreakdown && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/80 pt-2.5 font-mono-num text-xs dark:border-slate-800">
                {model.codingBreakdown.liveCodeBench !== undefined && (
                  <div>
                    <div className="text-[10px] text-slate-400">LiveCodeBench</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {model.codingBreakdown.liveCodeBench}%
                    </div>
                  </div>
                )}
                {model.codingBreakdown.sweBenchVerified !== undefined && (
                  <div>
                    <div className="text-[10px] text-slate-400">SWE-bench</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {model.codingBreakdown.sweBenchVerified}%
                    </div>
                  </div>
                )}
                {model.codingBreakdown.aiderPolyglot !== undefined && (
                  <div>
                    <div className="text-[10px] text-slate-400">Aider Polyglot</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {model.codingBreakdown.aiderPolyglot}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Intelligence Score
              </span>
              <span className="font-mono-num text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {model.intelligenceScore}
                <span className="text-xs font-normal text-slate-400"> (Scale 0–48)</span>
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>
                Recommended GGUF Quant:{' '}
                <strong className="font-mono-num text-slate-900 dark:text-white">
                  {model.recommendedQuant}
                </strong>
              </span>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="inline-flex items-center gap-1 rounded font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Command Copied' : 'Copy Run Command'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* All-Quantization Matrix */}
        <div className="mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-wider text-slate-900 uppercase dark:text-white">
              <Cpu className="h-3.5 w-3.5 text-teal-500" />
              VRAM Footprint by Quantization ({contextK}K Context)
            </h4>
            <span className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
              Target: {selectedGpu.name} ({selectedGpu.vramGb} GB)
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-3.5 py-2.5">Precision</th>
                  <th className="px-3 py-2.5">Weights</th>
                  <th className="px-3 py-2.5">Total VRAM</th>
                  <th className="px-3 py-2.5">Headroom</th>
                  <th className="px-3 py-2.5">Code Ret.</th>
                  <th className="px-3.5 py-2.5 text-right">Fit on {selectedGpu.shortLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quantLevels.map((q) => {
                  const est = estimateModelVram(model, q.key, contextK, kvQuantQ8, selectedGpu);
                  return (
                    <tr
                      key={q.key}
                      className={
                        q.key === 'q4'
                          ? 'bg-teal-500/[0.05] dark:bg-teal-500/[0.08]'
                          : 'bg-white dark:bg-transparent'
                      }
                    >
                      <td className="px-3.5 py-2.5 font-mono-num font-semibold text-slate-900 dark:text-white">
                        {q.ggufTag}
                        {q.key === 'q4' && (
                          <span className="ml-1.5 rounded bg-teal-500/15 px-1.5 py-0.5 text-[9px] font-bold text-teal-800 uppercase dark:text-teal-300">
                            Sweet Spot
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono-num text-slate-600 dark:text-slate-300">
                        {est.weightsGb} GB
                      </td>
                      <td className="px-3 py-2.5 font-mono-num font-bold text-slate-900 dark:text-white">
                        {est.totalVramGb} GB
                      </td>
                      <td className="px-3 py-2.5 font-mono-num text-slate-600 dark:text-slate-300">
                        <span className={est.headroomGb >= 0 ? 'text-teal-600 dark:text-teal-400 font-medium' : 'text-rose-500 font-medium'}>
                          {est.headroomGb >= 0 ? `+${est.headroomGb} GB` : `${est.headroomGb} GB`}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono-num text-slate-600 dark:text-slate-300">
                        ~{q.codingRetentionPct}%
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono-num">
                        <CompatibilityBadge
                          status={est.fitStatus}
                          label={est.fitLabel}
                          size="xs"
                          tooltipText={est.incompatibilityReason || undefined}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reference Links */}
        {model.sources && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Benchmark &amp; Weight Sources:</span>
            <div className="flex flex-wrap items-center gap-2">
              {model.sources.unsloth && (
                <a
                  href={model.sources.unsloth}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1 font-semibold text-slate-700 transition hover:border-teal-500/50 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-teal-300"
                >
                  Unsloth <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {model.sources.huggingFace && (
                <a
                  href={model.sources.huggingFace}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1 font-semibold text-slate-700 transition hover:border-teal-500/50 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-teal-300"
                >
                  Hugging Face <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {model.sources.artificialAnalysis && (
                <a
                  href={model.sources.artificialAnalysis}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1 font-semibold text-slate-700 transition hover:border-teal-500/50 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-teal-300"
                >
                  Benchmark Ref <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
