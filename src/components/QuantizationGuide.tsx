import React, { useState } from 'react';
import { QuantFormatInfo, QuantKey, QuantLevelInfo } from '../types/models';
import { AlertTriangle, Check, Info, Layers, ShieldCheck, X } from 'lucide-react';

interface QuantizationGuideProps {
  levels: QuantLevelInfo[];
  formats: QuantFormatInfo[];
  selectedQuant: QuantKey;
  onSelectQuant: (q: QuantKey) => void;
}

export const QuantizationGuide: React.FC<QuantizationGuideProps> = ({
  levels,
  formats,
  selectedQuant,
  onSelectQuant,
}) => {
  const [activeFormatId, setActiveFormatId] = useState<string>(formats[0]?.id ?? 'unsloth-ud');
  const activeFormat = formats.find((f) => f.id === activeFormatId) ?? formats[0];

  return (
    <section id="quant-guide" className="scroll-mt-20 space-y-7">
      {/* Section Header */}
      <div>
        <span className="font-mono-num text-[11px] font-semibold tracking-widest text-cyan-600 uppercase dark:text-cyan-400">
          // PRECISION &amp; COMPRESSION GUIDE
        </span>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
          Quantization Levels &amp; Runtime Formats Explained
        </h2>
        <p className="mt-1.5 max-w-3xl text-xs text-slate-500 sm:text-sm dark:text-slate-400">
          Quantization packs 16-bit weights into compact bit-depths so large open-weight models fit consumer VRAM while accelerating memory-bandwidth-bound token generation. Click any precision card below to simulate it across the entire workbench.
        </p>
      </div>

      {/* Part 1: Precision Cards Grid (Original 2x3 Interactive Bit-Depth Cards!) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {levels.map((lvl) => {
          const isSelected = lvl.key === selectedQuant;
          const isSweetSpot = lvl.key === 'q4';

          return (
            <button
              key={lvl.key}
              type="button"
              onClick={() => onSelectQuant(lvl.key)}
              className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition ${
                isSelected
                  ? 'border-teal-500 bg-teal-500/[0.05] ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-500/[0.08]'
                  : 'border-slate-200/90 bg-white hover:border-teal-500/40 dark:border-slate-800 dark:bg-[#121620]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 font-mono-num text-xs font-bold uppercase ${
                      isSelected
                        ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950'
                        : 'bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {lvl.ggufTag}
                  </span>
                  {isSweetSpot ? (
                    <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 dark:text-teal-300">
                      Sweet Spot
                    </span>
                  ) : (
                    <span className="font-mono-num text-[11px] text-slate-400">
                      ~{lvl.bitsPerWeight} bpw
                    </span>
                  )}
                </div>

                <h3 className="mt-3 font-display text-sm font-bold text-slate-950 dark:text-white">
                  {lvl.badge}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lvl.summary}
                </p>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">General Quality</span>
                    <span className="font-mono-num font-bold text-slate-900 dark:text-white">
                      {lvl.qualityRetentionPct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-500"
                      style={{ width: `${lvl.qualityRetentionPct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Coding Retention</span>
                    <span
                      className={`font-mono-num font-bold ${
                        lvl.codingRetentionPct >= 96
                          ? 'text-cyan-700 dark:text-cyan-300'
                          : lvl.codingRetentionPct >= 88
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {lvl.codingRetentionPct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        lvl.codingRetentionPct >= 96
                          ? 'bg-cyan-500'
                          : lvl.codingRetentionPct >= 88
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${lvl.codingRetentionPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 font-mono-num text-[10px] text-slate-400">
                  <span>VRAM saved vs 16-bit: {lvl.vramSavingsPct}%</span>
                  <span className="font-semibold text-teal-600 group-hover:underline dark:text-teal-400">
                    {isSelected ? 'Active ✓' : 'Simulate →'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Practical Hardware Rules */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-teal-500/25 bg-teal-500/[0.05] p-5 dark:bg-teal-500/[0.07]">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-teal-900 dark:text-teal-300">
            <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Larger Model @ Q4 Beats Smaller Model @ Q8/BF16
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            On a <strong>24 GB GPU</strong>, a <strong>27B–32B model at 4-bit</strong> (
            <code className="rounded bg-teal-500/15 px-1 py-0.5 font-mono-num text-[11px]">
              UD-Q4_K_XL
            </code>
            , ~20 GB) decisively beats a <strong>12B model at unquantized BF16 (~24 GB)</strong> on coding and logic. Always maximize parameter class first, then spend remaining VRAM on{' '}
            <code className="rounded bg-teal-500/15 px-1 py-0.5 font-mono-num text-[11px]">Q6_K</code>{' '}
            or longer context.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-5 dark:bg-amber-500/[0.07]">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-amber-900 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Avoid Sub-4-Bit on Small Dense Coding Models
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Massive 400B–750B MoEs handle dynamic 2-bit/3-bit well due to sparse redundancy, but squeezing a <strong>7B–32B dense coding model below 3.5 bpw</strong> triggers syntax hallucinations and broken diff patches. Stick to{' '}
            <code className="rounded bg-amber-500/15 px-1 py-0.5 font-mono-num text-[11px]">
              UD-Q4_K_XL
            </code>{' '}
            /{' '}
            <code className="rounded bg-amber-500/15 px-1 py-0.5 font-mono-num text-[11px]">
              Q4_K_M
            </code>{' '}
            or higher for coding agents.
          </p>
        </div>
      </div>

      {/* Visual GGUF Filename Tag Decoder */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#121620]">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Decoding GGUF Filenames:{' '}
            <code className="rounded-lg bg-cyan-500/10 px-2 py-0.5 font-mono-num text-base text-cyan-700 dark:text-cyan-300">
              UD-Q4_K_XL
            </code>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            What each part of a Hugging Face quant tag means
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="font-mono-num text-sm font-bold text-teal-600 dark:text-teal-400">
              UD- <span className="text-xs font-normal text-slate-400">(Prefix)</span>
            </div>
            <div className="mt-1 font-display text-xs font-bold text-slate-900 dark:text-white">
              Unsloth Dynamic Calibration
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Per-layer sensitivity profiling keeps fragile attention, router &amp; output tensors at 6–8 bits.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="font-mono-num text-sm font-bold text-cyan-600 dark:text-cyan-400">
              Q4 <span className="text-xs font-normal text-slate-400">vs.</span> IQ4
            </div>
            <div className="mt-1 font-display text-xs font-bold text-slate-900 dark:text-white">
              Linear vs. I-Matrix Codebook
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              <strong>Q4</strong> = fast block rounding. <strong>IQ4</strong> = non-linear vector lookup guided by an importance matrix.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="font-mono-num text-sm font-bold text-indigo-600 dark:text-indigo-400">
              _K <span className="text-xs font-normal text-slate-400">vs.</span> _0
            </div>
            <div className="mt-1 font-display text-xs font-bold text-slate-900 dark:text-white">
              Super-Block Scaling
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              <strong>_0</strong> is flat legacy scaling (great at <code className="font-mono-num">Q8_0</code>). <strong>_K</strong> uses modern grouped super-block scales.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="font-mono-num text-sm font-bold text-amber-600 dark:text-amber-400">
              _XS / _S / _M / _XL
            </div>
            <div className="mt-1 font-display text-xs font-bold text-slate-900 dark:text-white">
              Layer Promotion Budget
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Controls how many sensitive layers get higher precision. <strong>_M</strong> and <strong>_XL</strong> are safest for coding.
            </p>
          </div>
        </div>
      </div>

      {/* Part 2: Runtime Ecosystem Formats */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#121620]">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Runtime Format Comparison: GGUF vs. EXL2/EXL3 vs. AWQ vs. MLX
          </h3>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {formats.map((fmt) => {
            const active = fmt.id === activeFormat.id;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setActiveFormatId(fmt.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? 'bg-teal-600 text-white shadow-2xs dark:bg-teal-500 dark:text-slate-950'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-500/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {fmt.name}
              </button>
            );
          })}
        </div>

        {activeFormat && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800">
              <div>
                <h4 className="font-display text-base font-bold text-slate-950 dark:text-white">
                  {activeFormat.name}
                </h4>
                <p className="mt-0.5 text-xs font-medium text-teal-700 dark:text-teal-400">
                  {activeFormat.tagline}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {activeFormat.ecosystems.map((eco) => (
                  <span
                    key={eco}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 font-mono-num text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {eco}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-3.5 text-xs leading-relaxed text-slate-700 sm:text-sm dark:text-slate-300">
              {activeFormat.description}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Info className="h-3.5 w-3.5 text-teal-500" />
              Best Hardware Target:{' '}
              <strong className="text-slate-900 dark:text-white">{activeFormat.hardwareTarget}</strong>
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-[#121620]">
                <div className="mb-2 text-[11px] font-bold tracking-wider text-teal-700 uppercase dark:text-teal-400">
                  Advantages
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {activeFormat.pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-[#121620]">
                <div className="mb-2 text-[11px] font-bold tracking-wider text-rose-600 uppercase dark:text-rose-400">
                  Limitations
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {activeFormat.cons.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
