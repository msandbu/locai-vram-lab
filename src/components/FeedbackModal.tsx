import React, { useEffect, useMemo, useState } from 'react';
import { ArchitectureType, SizeTier } from '../types/models';
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  GitPullRequest,
  MessageSquarePlus,
  X,
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubRepoUrl: string;
  issueLabels?: string[];
  initialModelName?: string;
}

type SubmissionMode = 'missing-model' | 'correction';

function inferSizeTier(totalParamsB: number): SizeTier {
  if (totalParamsB <= 4) return 'tiny';
  if (totalParamsB <= 40) return 'small';
  if (totalParamsB <= 150) return 'medium';
  return 'large';
}

function slugifyModelId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'new-open-model';
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  githubRepoUrl,
  issueLabels = ['model-request'],
  initialModelName = '',
}) => {
  const [mode, setMode] = useState<SubmissionMode>('missing-model');
  const [modelName, setModelName] = useState('');
  const [creator, setCreator] = useState('');
  const [repoOrHfUrl, setRepoOrHfUrl] = useState('');
  const [architecture, setArchitecture] = useState<ArchitectureType>('Dense');
  const [totalParamsB, setTotalParamsB] = useState('32');
  const [activeParamsB, setActiveParamsB] = useState('32');
  const [contextWindowK, setContextWindowK] = useState('128');
  const [license, setLicense] = useState('Apache 2.0');
  const [reasoning, setReasoning] = useState(true);
  const [codingScore, setCodingScore] = useState('');
  const [intelligenceScore, setIntelligenceScore] = useState('');
  const [q4WeightsGb, setQ4WeightsGb] = useState('');
  const [notes, setNotes] = useState('');
  const [showJsonPreview, setShowJsonPreview] = useState(true);
  const [copiedJson, setCopiedJson] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialModelName.trim()) {
      setModelName(initialModelName.trim());
    }
  }, [isOpen, initialModelName]);

  const parsedTotalB = Math.max(0.5, Number(totalParamsB) || 7);
  const parsedActiveB =
    architecture === 'Dense'
      ? parsedTotalB
      : Math.min(parsedTotalB, Math.max(0.5, Number(activeParamsB) || 3));
  const parsedContextK = Math.max(4, Number(contextWindowK) || 128);

  const generatedJsonSnippet = useMemo(() => {
    const cleanName = modelName.trim() || 'Example-Model-32B';
    const cleanCreator = creator.trim() || 'Open Source Lab';
    const cleanUrl = repoOrHfUrl.trim() || 'https://github.com/org/model-repo';
    const cleanLicense = license.trim() || 'Apache 2.0';
    const isPermissive = /apache|mit|bsd|cc0|qwen/i.test(cleanLicense);

    const now = new Date();
    const releaseMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const entry: Record<string, unknown> = {
      id: slugifyModelId(cleanName),
      name: cleanName,
      creator: cleanCreator,
      creatorColor: '#0d9488',
      releaseDate: releaseMonth,
      license: cleanLicense,
      licensePermissive: isPermissive,
      architecture,
      totalParamsB: parsedTotalB,
      activeParamsB: parsedActiveB,
      sizeTier: inferSizeTier(parsedTotalB),
      reasoning,
      contextWindowK: parsedContextK,
      intelligenceScore: Number(intelligenceScore) || 20,
      codingScore: Number(codingScore) || 80,
      recommendedQuant: 'UD-Q4_K_XL',
      ...(Number(q4WeightsGb) > 0
        ? {
            weightsGbByQuant: {
              q4: Number(q4WeightsGb),
            },
          }
        : {}),
      sources: {
        huggingFace: cleanUrl,
      },
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    return JSON.stringify(entry, null, 2);
  }, [
    modelName,
    creator,
    repoOrHfUrl,
    license,
    architecture,
    parsedTotalB,
    parsedActiveB,
    reasoning,
    parsedContextK,
    intelligenceScore,
    codingScore,
    q4WeightsGb,
    notes,
  ]);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(generatedJsonSnippet);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1800);
  };

  const handleSubmitGitHubIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) {
      setErrorMsg('Please enter the missing model name.');
      return;
    }
    if (mode === 'missing-model' && !repoOrHfUrl.trim()) {
      setErrorMsg('Please provide a GitHub or Hugging Face link to the model weights/repo.');
      return;
    }
    setErrorMsg(null);

    const normalizedRepo = githubRepoUrl.replace(/\/+$/, '');
    const issueTitle =
      mode === 'missing-model'
        ? `[Model Request] Add ${modelName.trim()}${creator.trim() ? ` (${creator.trim()})` : ''}`
        : `[Data Correction] ${modelName.trim()}`;

    const issueBodyLines = [
      mode === 'missing-model'
        ? `### Missing Open-Weight Model Submission`
        : `### Model Benchmark / VRAM Correction`,
      '',
      `- **Model Name:** ${modelName.trim()}`,
      creator.trim() ? `- **Creator / Org:** ${creator.trim()}` : null,
      repoOrHfUrl.trim() ? `- **GitHub / Hugging Face URL:** ${repoOrHfUrl.trim()}` : null,
      mode === 'missing-model'
        ? `- **Architecture:** ${architecture} (${parsedTotalB}B total${
            architecture === 'MoE' ? ` / ${parsedActiveB}B active` : ''
          })`
        : null,
      mode === 'missing-model' ? `- **Max Context:** ${parsedContextK}K` : null,
      mode === 'missing-model' ? `- **License:** ${license.trim() || 'Unspecified'}` : null,
      codingScore.trim() ? `- **Reported Coding Score:** ${codingScore.trim()}` : null,
      intelligenceScore.trim()
        ? `- **Reported Intelligence Score:** ${intelligenceScore.trim()}`
        : null,
      q4WeightsGb.trim() ? `- **Measured Q4 GGUF Size:** ${q4WeightsGb.trim()} GB` : null,
      notes.trim() ? `\n### Notes / Benchmark Sources\n${notes.trim()}` : null,
      '',
      '### Ready-to-Paste `src/data/models.json` Entry',
      '```json',
      generatedJsonSnippet,
      '```',
    ].filter((line): line is string => line !== null);

    const params = new URLSearchParams({
      title: issueTitle,
      body: issueBodyLines.join('\n'),
    });
    if (issueLabels.length > 0) {
      params.set('labels', issueLabels.join(','));
    }

    const issueUrl = `${normalizedRepo}/issues/new?${params.toString()}`;
    window.open(issueUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl locai-scrollbar dark:border-slate-800 dark:bg-[#121620]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-xs">
              <MessageSquarePlus className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="feedback-modal-title"
                className="font-display text-xl font-bold text-slate-950 dark:text-white"
              >
                Suggest Missing GitHub / HF Model
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Generates a pre-filled GitHub Issue and a ready-to-paste{' '}
                <code className="font-mono-num text-teal-700 dark:text-teal-300">models.json</code>{' '}
                entry.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback modal"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Submission Type Switcher */}
        <div className="mt-4 inline-flex rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setMode('missing-model')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'missing-model'
                ? 'bg-white text-slate-950 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Missing Open-Weight Model
          </button>
          <button
            type="button"
            onClick={() => setMode('correction')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'correction'
                ? 'bg-white text-slate-950 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Score / VRAM Correction
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmitGitHubIssue} className="mt-4 space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Primary Info */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Model Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. DeepSeek-Coder-V3 32B"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 outline-none focus:border-teal-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Creator / GitHub Org
              </label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="e.g. Moonshot AI, Alibaba, Mistral"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 outline-none focus:border-teal-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              GitHub Repo or Hugging Face GGUF URL{' '}
              {mode === 'missing-model' && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="url"
              value={repoOrHfUrl}
              onChange={(e) => setRepoOrHfUrl(e.target.value)}
              placeholder="https://github.com/... or https://huggingface.co/unsloth/..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono-num text-xs text-slate-900 outline-none focus:border-teal-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
            />
          </div>

          {/* Architecture & Parameter Specs */}
          {mode === 'missing-model' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Architecture
                </label>
                <select
                  value={architecture}
                  onChange={(e) => setArchitecture(e.target.value as ArchitectureType)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
                >
                  <option value="Dense">Dense</option>
                  <option value="MoE">MoE (Sparse)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Total Params (B)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={totalParamsB}
                  onChange={(e) => setTotalParamsB(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono-num text-xs text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Active Params (B)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  disabled={architecture === 'Dense'}
                  value={architecture === 'Dense' ? totalParamsB : activeParamsB}
                  onChange={(e) => setActiveParamsB(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono-num text-xs text-slate-900 outline-none focus:border-teal-500 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Max Context (K)
                </label>
                <input
                  type="number"
                  step="1"
                  min="2"
                  value={contextWindowK}
                  onChange={(e) => setContextWindowK(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono-num text-xs text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Optional Scores, License & Measured Q4 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Coding Score
              </label>
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                value={codingScore}
                onChange={(e) => setCodingScore(e.target.value)}
                placeholder="Optional (0–100)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono-num text-xs text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Intelligence
              </label>
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                value={intelligenceScore}
                onChange={(e) => setIntelligenceScore(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono-num text-xs text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Q4 Size (GB)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={q4WeightsGb}
                onChange={(e) => setQ4WeightsGb(e.target.value)}
                placeholder="Auto-est."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono-num text-xs text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                License
              </label>
              <input
                type="text"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                placeholder="Apache 2.0 / MIT"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
              />
            </div>
          </div>

          {mode === 'missing-model' && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={reasoning}
                onChange={(e) => setReasoning(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-teal-600"
              />
              Supports extended reasoning / thinking chains
            </label>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes / Benchmark Links / Hardware Tested
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes on quantization quality, VRAM observations, or benchmark citations..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 outline-none focus:border-teal-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-white"
            />
          </div>

          {/* Auto-Generated JSON Entry Preview */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowJsonPreview((v) => !v)}
                className="inline-flex items-center gap-1.5 font-mono-num text-[11px] font-semibold text-slate-700 hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400"
              >
                <Code2 className="h-3.5 w-3.5 text-teal-500" />
                {showJsonPreview ? 'Hide' : 'Show'} Auto-Generated models.json Snippet
              </button>

              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono-num text-[11px] font-semibold text-slate-700 transition hover:border-teal-500/50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {copiedJson ? (
                  <Check className="h-3 w-3 text-teal-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copiedJson ? 'Copied JSON' : 'Copy JSON'}
              </button>
            </div>

            {showJsonPreview && (
              <pre className="mt-2.5 max-h-40 overflow-auto rounded-lg bg-[#090b10] p-3 font-mono-num text-[11px] leading-relaxed text-slate-200 locai-scrollbar">
                {generatedJsonSnippet}
              </pre>
            )}
          </div>

          {/* Submit Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">
              Opens a pre-filled issue on GitHub with this JSON attached.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
              >
                <GitPullRequest className="h-3.5 w-3.5" />
                Open GitHub Issue
                <ExternalLink className="h-3 w-3 opacity-80" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
