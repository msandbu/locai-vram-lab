import React from 'react';
import { QuantFormatInfo, QuantKey, QuantLevelInfo, FaqItem } from '../types/models';
import { QuantizationGuide } from './QuantizationGuide';
import { FaqAndSources } from './FaqAndSources';
import { ArrowLeft, BookOpen, HelpCircle, Layers } from 'lucide-react';

interface GuidePageProps {
  levels: QuantLevelInfo[];
  formats: QuantFormatInfo[];
  selectedQuant: QuantKey;
  onSelectQuant: (q: QuantKey) => void;
  faqs: FaqItem[];
  onBackToWorkbench: () => void;
}

export const GuidePage: React.FC<GuidePageProps> = ({
  levels,
  formats,
  selectedQuant,
  onSelectQuant,
  faqs,
  onBackToWorkbench,
}) => {
  return (
    <div className="space-y-16">
      {/* Knowledge Base Hero Header */}
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

            {/* In-page Jump Tabs */}
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/70 p-1 text-xs backdrop-blur-sm dark:border-slate-800/80 dark:bg-[#121620]/70">
              <a
                href="#quant-guide"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Layers className="h-3 w-3 text-cyan-500" />
                Quantization Guide
              </a>
              <a
                href="#faq"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <HelpCircle className="h-3 w-3 text-teal-500" />
                FAQs &amp; Sources
              </a>
            </div>
          </div>

          <div className="mt-6 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-teal-600 uppercase dark:text-teal-400">
              <BookOpen className="h-4 w-4" />
              <span>Technical Knowledge Base &amp; Documentation</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Quantization Deep-Dive &amp; Methodology
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Everything you need to know about GGUF precision scaling, bits-per-weight loss trade-offs, VRAM sizing equations, and open-weight evaluation benchmarks.
            </p>
          </div>
        </div>
      </section>

      {/* Guide & FAQ Sections */}
      <div className="mx-auto max-w-7xl space-y-20 px-4 pb-16 sm:px-6 lg:px-8">
        <QuantizationGuide
          levels={levels}
          formats={formats}
          selectedQuant={selectedQuant}
          onSelectQuant={onSelectQuant}
        />

        <div className="border-t border-slate-200/70 pt-16 dark:border-slate-800/70">
          <FaqAndSources faqs={faqs} />
        </div>
      </div>
    </div>
  );
};
