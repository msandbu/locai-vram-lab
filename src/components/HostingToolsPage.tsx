import React, { useMemo, useState } from 'react';
import { HostingTool, OperatingSystem, ToolCategory } from '../types/hosting';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Github,
  Monitor,
  Search,
  Server,
} from 'lucide-react';

interface HostingToolsPageProps {
  tools: HostingTool[];
  onBackToWorkbench: () => void;
}

const OS_OPTIONS: { id: 'all' | OperatingSystem; label: string; hint: string }[] = [
  { id: 'all', label: 'All Platforms', hint: 'Cross-platform suite' },
  { id: 'macOS', label: 'macOS', hint: 'Apple Silicon Metal & Unified Memory' },
  { id: 'Windows', label: 'Windows', hint: 'NVIDIA CUDA, DirectML & Vulkan' },
  { id: 'Linux', label: 'Linux', hint: 'CUDA, ROCm & Headless Servers' },
];

const CATEGORY_OPTIONS: { id: 'all' | ToolCategory; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  { id: 'desktop-gui', label: 'Desktop GUIs' },
  { id: 'developer-cli', label: 'CLI & Daemons' },
  { id: 'high-throughput', label: 'Inference Servers' },
  { id: 'web-ui', label: 'Web Frontends & RAG' },
  { id: 'distributed', label: 'Distributed Clusters' },
];

export const HostingToolsPage: React.FC<HostingToolsPageProps> = ({
  tools,
  onBackToWorkbench,
}) => {
  const [selectedOS, setSelectedOS] = useState<'all' | OperatingSystem>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(tools[0]?.id ?? 'ollama');

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tools.filter((tool) => {
      if (selectedOS !== 'all' && !tool.supportedOS.includes(selectedOS)) {
        return false;
      }
      if (selectedCategory !== 'all' && tool.category !== selectedCategory) {
        return false;
      }
      if (q) {
        const haystack = `${tool.name} ${tool.tagline} ${tool.hardwareAcceleration} ${tool.modelFormats.join(' ')} ${tool.bestFor} ${tool.license}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tools, selectedOS, selectedCategory, searchQuery]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Header */}
      <section className="bg-workbench-grid relative border-b border-slate-200/80 py-8 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBackToWorkbench}
              className="group inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs backdrop-blur-sm transition hover:border-teal-500/50 hover:text-teal-600 dark:border-slate-800/80 dark:bg-[#121620]/80 dark:text-slate-300 dark:hover:text-teal-400"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to GPU Workbench</span>
            </button>

            {/* Quick OS Pills */}
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/70 p-1 text-xs backdrop-blur-sm dark:border-slate-800/80 dark:bg-[#121620]/70">
              {OS_OPTIONS.map((os) => {
                const active = selectedOS === os.id;
                return (
                  <button
                    key={os.id}
                    type="button"
                    onClick={() => setSelectedOS(os.id)}
                    className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                      active
                        ? 'bg-slate-950 font-semibold text-white shadow-2xs dark:bg-white dark:text-slate-950'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {os.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-teal-600 uppercase dark:text-teal-400">
              <Server className="h-4 w-4" />
              <span>Local Deployment Guide &amp; Runtime Directory</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Tools to Host LLMs Locally on macOS, Windows &amp; Linux
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              From zero-configuration desktop chat applications to enterprise-grade inference backends with continuous batching. Compare memory acceleration, model formats, and one-click install commands.
            </p>
          </div>
        </div>
      </section>

      {/* OS Fast Decision Cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          // QUICK PLATFORM RECOMMENDATIONS
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* macOS Pick */}
          <div className="rounded-xl border border-indigo-500/25 bg-white/70 p-4 shadow-2xs dark:border-indigo-500/20 dark:bg-[#121620]">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
                macOS (Apple Silicon)
              </span>
              <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono-num text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                Metal + UMA
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Apple Silicon shares unified RAM directly between CPU &amp; GPU. Use <strong>LM Studio</strong> or <strong>Jan</strong> for instant GUI chat, <strong>Ollama</strong> for developer APIs, and <strong>MLX-LM</strong> for the absolute highest native token generation speed on M-series chips.
            </p>
          </div>

          {/* Windows Pick */}
          <div className="rounded-xl border border-emerald-500/25 bg-white/70 p-4 shadow-2xs dark:border-emerald-500/20 dark:bg-[#121620]">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
                Windows (RTX / NPU)
              </span>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono-num text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                Foundry &amp; CUDA
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Run <strong>Foundry Local (Windows Foundry)</strong> for native NPU &amp; DirectML hardware mapping, <strong>LM Studio</strong> or <strong>Ollama</strong> for fast CUDA acceleration on RTX GPUs, and <strong>TabbyAPI</strong> or <strong>KoboldCpp</strong> for portable single-user speed.
            </p>
          </div>

          {/* Linux Pick */}
          <div className="rounded-xl border border-rose-500/25 bg-white/70 p-4 shadow-2xs dark:border-rose-500/20 dark:bg-[#121620]">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
                Linux (Server &amp; Workstation)
              </span>
              <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono-num text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                vLLM &amp; Docker
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              The premier OS for high-throughput multi-user inference. Use <strong>vLLM</strong> with PagedAttention and continuous batching for maximum production throughput, paired with <strong>Open WebUI</strong> in Docker for an enterprise ChatGPT-style portal.
            </p>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-2.5 backdrop-blur-sm dark:border-slate-800/80 dark:bg-[#121620]/70">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools, formats (GGUF, AWQ, EXL2)..."
              className="h-8.5 w-full rounded-lg border border-slate-200/80 bg-slate-50/50 pr-3 pl-8.5 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none dark:border-slate-800/80 dark:bg-slate-900/50 dark:text-white"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            {CATEGORY_OPTIONS.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? 'border border-teal-500/30 bg-teal-500/10 font-semibold text-teal-800 dark:text-teal-300'
                      : 'border border-slate-200/80 bg-white/70 text-slate-600 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tool Cards Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredTools.map((tool) => {
            const isExpanded = expandedId === tool.id;

            return (
              <div
                key={tool.id}
                className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs transition-all hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#121620] dark:hover:border-slate-700"
              >
                {/* Header */}
                <div className="border-b border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/60 dark:bg-[#0c0f16]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                          {tool.name}
                        </h3>
                        <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.2 font-mono-num text-[10px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                          {tool.category.toUpperCase().replace('-', ' ')}
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0.2 font-mono-num text-[10px] font-semibold ${
                            tool.difficulty === 'Beginner'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                              : tool.difficulty === 'Intermediate'
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                              : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300'
                          }`}
                        >
                          {tool.difficulty}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {tool.tagline}
                      </p>
                    </div>

                    {/* Official External Links */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {tool.github && (
                        <a
                          href={tool.github}
                          target="_blank"
                          rel="noreferrer"
                          title="View GitHub Repository"
                          className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          <Github className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <a
                        href={tool.website}
                        target="_blank"
                        rel="noreferrer"
                        title="Visit Official Website"
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Badges: Supported OS & Acceleration */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {tool.supportedOS.map((os) => (
                      <span
                        key={os}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-200/70 px-2 py-0.5 font-mono-num text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Monitor className="h-2.5 w-2.5" />
                        {os}
                      </span>
                    ))}
                    <span className="rounded-md border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 font-mono-num text-[10px] font-medium text-teal-800 dark:text-teal-300">
                      {tool.hardwareAcceleration}
                    </span>
                    {tool.openAiApiCompatible && (
                      <span className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 font-mono-num text-[10px] font-medium text-cyan-800 dark:text-cyan-300">
                        OpenAI API Compatible
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4 text-xs">
                  {/* Formats and Best For */}
                  <div className="rounded-lg bg-slate-50/70 p-3 dark:bg-slate-900/50">
                    <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      Recommended For
                    </span>
                    <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                      {tool.bestFor}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="font-semibold text-slate-400">Supported Weights:</span>
                      {tool.modelFormats.map((fmt) => (
                        <span
                          key={fmt}
                          className="rounded bg-slate-200/80 px-1.5 py-0.2 font-mono-num text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {fmt}
                        </span>
                      ))}
                      <span className="text-slate-400">• License: {tool.license}</span>
                    </div>
                  </div>

                  {/* Quick-Start Terminal Command */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      <span>Quick-Start Command</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tool.quickStart, `${tool.id}-quick`)}
                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 dark:text-teal-400"
                      >
                        {copiedId === `${tool.id}-quick` ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="mt-1 overflow-x-auto rounded-lg border border-slate-200/80 bg-slate-950 p-2.5 font-mono-num text-[11px] text-teal-300 locai-scrollbar">
                      <code>{tool.quickStart}</code>
                    </pre>
                  </div>

                  {/* Toggle Deep-Dive Details */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : tool.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
                    >
                      <span>{isExpanded ? 'Hide Details & Install Guide' : 'Show OS Install Guide & Trade-Offs'}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Collapsible Install Guides & Pros/Cons */}
                  {isExpanded && (
                    <div className="mt-3 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800/60">
                      {/* OS Install Snippets */}
                      <div>
                        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                          OS-Specific Installation
                        </span>
                        <div className="mt-2 space-y-2">
                          {tool.installCommands.macos && (
                            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800/80 dark:bg-slate-900/60">
                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                <span>macOS</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(tool.installCommands.macos!, `${tool.id}-mac`)}
                                  className="text-teal-600 hover:underline dark:text-teal-400"
                                >
                                  {copiedId === `${tool.id}-mac` ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <code className="mt-1 block font-mono-num text-[11px] text-slate-800 dark:text-slate-200">
                                {tool.installCommands.macos}
                              </code>
                            </div>
                          )}

                          {tool.installCommands.windows && (
                            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800/80 dark:bg-slate-900/60">
                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                <span>Windows</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(tool.installCommands.windows!, `${tool.id}-win`)}
                                  className="text-teal-600 hover:underline dark:text-teal-400"
                                >
                                  {copiedId === `${tool.id}-win` ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <code className="mt-1 block font-mono-num text-[11px] text-slate-800 dark:text-slate-200">
                                {tool.installCommands.windows}
                              </code>
                            </div>
                          )}

                          {tool.installCommands.linux && (
                            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800/80 dark:bg-slate-900/60">
                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                <span>Linux</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(tool.installCommands.linux!, `${tool.id}-nix`)}
                                  className="text-teal-600 hover:underline dark:text-teal-400"
                                >
                                  {copiedId === `${tool.id}-nix` ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <code className="mt-1 block font-mono-num text-[11px] text-slate-800 dark:text-slate-200">
                                {tool.installCommands.linux}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pros & Cons */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                            Key Advantages
                          </span>
                          <ul className="mt-1.5 space-y-1 text-slate-600 dark:text-slate-300">
                            {tool.pros.map((p, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5">✓</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                          <span className="font-semibold text-rose-800 dark:text-rose-300">
                            Trade-Offs &amp; Limitations
                          </span>
                          <ul className="mt-1.5 space-y-1 text-slate-600 dark:text-slate-300">
                            {tool.cons.map((c, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-rose-500 mt-0.5">✗</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Matrix Table */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800/80 dark:bg-[#121620]">
          <div className="border-b border-slate-200/70 bg-slate-50/50 px-5 py-3 dark:border-slate-800/70 dark:bg-[#0c0f16]">
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
              Complete Cross-Platform Feature Matrix
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Overview of all 12 local LLM runners, GUI clients, and serving engines.
            </p>
          </div>

          <div className="overflow-x-auto locai-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:border-slate-800/70 dark:bg-[#0c0f16]">
                  <th className="px-5 py-3">Tool</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Supported OS</th>
                  <th className="px-3 py-3">Hardware Acceleration</th>
                  <th className="px-3 py-3">Model Formats</th>
                  <th className="px-3 py-3">OpenAI API</th>
                  <th className="px-3 py-3">License</th>
                  <th className="px-4 py-3 text-right">Website</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {tools.map((t) => (
                  <tr
                    key={t.id}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/35"
                  >
                    <td className="px-5 py-3 font-semibold text-slate-950 dark:text-white">
                      {t.name}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                      {t.category.replace('-', ' ')}
                    </td>
                    <td className="px-3 py-3 font-mono-num text-[11px] text-slate-600 dark:text-slate-300">
                      {t.supportedOS.join(', ')}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                      {t.hardwareAcceleration}
                    </td>
                    <td className="px-3 py-3 font-mono-num text-[10px] text-slate-600 dark:text-slate-300">
                      {t.modelFormats.join(', ')}
                    </td>
                    <td className="px-3 py-3">
                      {t.openAiApiCompatible ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                      {t.license}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={t.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
