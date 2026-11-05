import React from 'react';
import { ArrowLeft, BookOpen, Cpu, MessageSquarePlus, Moon, Search, Server, Sun } from 'lucide-react';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onFocusSearch: () => void;
  onOpenFeedback: () => void;
  modelCount: number;
  currentPage: 'workbench' | 'guide' | 'hosting';
  onNavigate: (page: 'workbench' | 'guide' | 'hosting', anchor?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  onFocusSearch,
  onOpenFeedback,
  modelCount,
  currentPage,
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0b0e14]/85 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Mark */}
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('workbench');
          }}
          className="group flex items-center gap-3 shrink-0"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs transition-transform duration-200 group-hover:scale-105 dark:bg-teal-500 dark:text-slate-950">
            <Cpu className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold tracking-tight text-slate-950 dark:text-white">
                LOCAI
              </span>
              <span className="rounded-md border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-teal-700 dark:text-teal-300">
                VRAM LAB
              </span>
            </div>
            <span className="hidden text-[10px] text-slate-400 sm:block">
              Local Model Sizing &amp; Benchmarks
            </span>
          </div>
        </a>

        {/* Dynamic Contextual Navigation Links */}
        <nav aria-label="Main sections" className="hidden items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-1 text-xs font-medium md:flex dark:border-slate-800/80 dark:bg-[#11151f]/80">
          {currentPage === 'workbench' ? (
            <>
              <a
                href="#visualizer"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('workbench', 'visualizer');
                }}
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                GPU Map &amp; Charts
              </a>
              <a
                href="#models"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('workbench', 'models');
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <span>Model Matrix</span>
                <span className="rounded bg-slate-200/80 px-1.5 py-0.2 font-mono-num text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {modelCount}
                </span>
              </a>
              <a
                href="#bandwidth"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('workbench', 'bandwidth');
                }}
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Memory Bandwidth
              </a>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
              <button
                type="button"
                onClick={() => onNavigate('hosting')}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-700 transition hover:bg-white hover:text-teal-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-400"
              >
                <Server className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                <span>Host LLMs Locally</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('guide')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/20 bg-teal-500/8 px-3 py-1.5 font-semibold text-teal-700 transition hover:bg-teal-500/15 dark:border-teal-400/25 dark:bg-teal-500/10 dark:text-teal-300"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Guides &amp; FAQ</span>
              </button>
            </>
          ) : currentPage === 'hosting' ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('workbench')}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-white hover:text-teal-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>GPU Workbench</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-semibold text-teal-700 shadow-2xs dark:bg-slate-800 dark:text-teal-300"
              >
                <Server className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                <span>Host LLMs Locally</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('guide')}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-white hover:text-teal-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-400"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Quantization &amp; FAQ</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigate('workbench')}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-white hover:text-teal-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>GPU Workbench</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('hosting')}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-white hover:text-teal-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-400"
              >
                <Server className="h-3.5 w-3.5" />
                <span>Host LLMs Locally</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-semibold text-teal-700 shadow-2xs dark:bg-slate-800 dark:text-teal-300"
              >
                <BookOpen className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                <span>Guides &amp; FAQ</span>
              </button>
            </>
          )}
        </nav>

        {/* Search, Feedback & Theme Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onFocusSearch}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200/90 bg-white/80 px-3 text-xs text-slate-500 shadow-2xs transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-[#11151f] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
            title="Jump to model search (/)"
          >
            <Search className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span className="hidden lg:inline">Quick search...</span>
            <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-slate-500 lg:inline-block dark:bg-slate-800 dark:text-slate-400">
              /
            </kbd>
          </button>

          <button
            type="button"
            onClick={onOpenFeedback}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950"
            title="Suggest a new model to add to the benchmark"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Suggest Model</span>
          </button>

          <a
            href="https://github.com/msandbu/locai-vram-lab"
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-[#11151f] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="View on GitHub"
            title="GitHub Repository"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>

          <button
            type="button"
            onClick={onToggleDarkMode}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-[#11151f] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
