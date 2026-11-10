import React, { useState } from 'react';
import { FaqItem } from '../types/models';
import { BookOpen, ChevronDown, Database, ExternalLink, FileJson, HelpCircle } from 'lucide-react';

interface FaqAndSourcesProps {
  faqs: FaqItem[];
}

const REFERENCE_SOURCES = [
  {
    name: 'Unsloth Docs & Dynamic GGUF Hub',
    url: 'https://docs.unsloth.ai/',
    tag: 'VRAM & Dynamic Quants',
    description:
      'Measured local VRAM/Unified Memory tables across 1-bit to 16-bit precisions and sensitivity-calibrated UD-Q4_K_XL weights.',
  },
  {
    name: 'Artificial Analysis Open-Weights',
    url: 'https://artificialanalysis.ai/models/open-source',
    tag: 'Reasoning & Coding Benchmarks',
    description:
      'Independent benchmark evaluations used as a reference source for general intelligence and coding agent indices.',
  },
  {
    name: 'Hugging Face GGUF Repos (unsloth / bartowski)',
    url: 'https://huggingface.co/unsloth',
    tag: 'GGUF Shards & I-Matrix',
    description:
      'Exact quantized file sizes, imatrix calibration metadata, and llama.cpp / Ollama / MLX deployment support.',
  },
];

export const FaqAndSources: React.FC<FaqAndSourcesProps> = ({ faqs }) => {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    [faqs[0]?.id ?? '']: true,
    [faqs[1]?.id ?? '']: true,
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const categories = ['All', 'VRAM & Hardware', 'Quantization', 'Benchmarks & Coding', 'MoE & Context'];

  const visibleFaqs =
    categoryFilter === 'All' ? faqs : faqs.filter((f) => f.category === categoryFilter);

  const toggleFaq = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="faq" className="scroll-mt-20 space-y-12">
      {/* FAQs */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
              Local LLM &amp; Quantization FAQs
            </h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm dark:text-slate-400">
              Answers on VRAM overhead math, KV cache compression, MoE RAM offloading, and coding retention.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  categoryFilter === cat
                    ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-500/40 dark:border-slate-800 dark:bg-[#11151f] dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:divide-slate-800 dark:border-slate-800 dark:bg-[#11151f]">
          {visibleFaqs.map((item) => {
            const isOpen = !!openIds[item.id];
            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleFaq(item.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                >
                  <div className="flex items-start gap-3">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                    <div>
                      <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
                        {item.question}
                      </span>
                      <span className="ml-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 pl-12 text-xs leading-relaxed whitespace-pre-line text-slate-700 sm:text-sm dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-300">
                    {item.answer.split('**').map((chunk, i) => {
                      const renderCodes = (text: string) =>
                        text.split('`').map((sub, j) =>
                          j % 2 === 1 ? (
                            <code
                              key={j}
                              className="rounded bg-teal-500/10 px-1 py-0.5 font-mono-num text-[11px] font-semibold text-teal-800 dark:text-teal-300"
                            >
                              {sub}
                            </code>
                          ) : (
                            <React.Fragment key={j}>{sub}</React.Fragment>
                          )
                        );

                      return i % 2 === 1 ? (
                        <strong key={i} className="font-semibold text-slate-950 dark:text-white">
                          {renderCodes(chunk)}
                        </strong>
                      ) : (
                        <React.Fragment key={i}>{renderCodes(chunk)}</React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reference Sources & Static JSON Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Benchmark &amp; Hardware Data Sources
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {REFERENCE_SOURCES.map((src) => (
              <a
                key={src.name}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 transition hover:border-teal-500/50 hover:shadow-xs dark:border-slate-800 dark:bg-[#121620]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-800 dark:text-cyan-300">
                      {src.tag}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-teal-600 dark:group-hover:text-teal-400" />
                  </div>
                  <h4 className="mt-2 font-display text-sm font-bold text-slate-950 group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
                    {src.name}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {src.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Manual JSON Maintenance Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 lg:col-span-4 dark:border-slate-800 dark:bg-[#121620]">
          <div>
            <div className="flex items-center gap-2 font-display text-sm font-bold text-slate-950 dark:text-white">
              <Database className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              100% Static &amp; Manually Curated
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              No live scraping or external backend APIs. Every benchmark score and GGUF memory footprint is stored in version-controlled local JSON files for easy manual updates:
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <FileJson className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                <span>
                  <strong className="font-mono-num text-slate-900 dark:text-white">src/data/models.json</strong>{' '}
                  — Model catalog, Coding &amp; Intelligence scores, and GGUF sizes.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <FileJson className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                <span>
                  <strong className="font-mono-num text-slate-900 dark:text-white">src/data/gpus.json</strong>{' '}
                  — Hardware VRAM tiers &amp; rig presets.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <FileJson className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                <span>
                  <strong className="font-mono-num text-slate-900 dark:text-white">src/data/bandwidth.json</strong>{' '}
                  — Apple, NVIDIA &amp; AMD memory bandwidth leaderboard.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 font-mono-num text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <div className="text-[10px] text-slate-400">// Smart fallback math:</div>
            <div>totalParamsB + activeParamsB</div>
            <div className="text-teal-600 dark:text-teal-400">→ Auto-estimates Q2..BF16 + KV</div>
          </div>
        </div>
      </div>
    </section>
  );
};
