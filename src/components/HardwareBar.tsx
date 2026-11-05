import React, { useState } from 'react';
import { GpuPreset, QuantKey, QuantLevelInfo } from '../types/models';
import { getEstimatedUsableVram } from '../utils/vram';
import {
  HardDrive,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Zap,
  RotateCcw,
  Info,
} from 'lucide-react';

interface HardwareBarProps {
  gpus: GpuPreset[];
  selectedGpu: GpuPreset;
  onSelectGpu: (gpu: GpuPreset) => void;
  quantLevels: QuantLevelInfo[];
  selectedQuant: QuantKey;
  onSelectQuant: (q: QuantKey) => void;
  contextK: number;
  onSelectContextK: (k: number) => void;
  kvQuantQ8: boolean;
  onToggleKvQuant: () => void;
  fittingCount: number;
  totalCount: number;
  onResetDefaults?: () => void;
}

const CONTEXT_OPTIONS = [8, 32, 64, 128];

export const HardwareBar: React.FC<HardwareBarProps> = ({
  gpus,
  selectedGpu,
  onSelectGpu,
  quantLevels,
  selectedQuant,
  onSelectQuant,
  contextK,
  onSelectContextK,
  kvQuantQ8,
  onToggleKvQuant,
  fittingCount,
  totalCount,
  onResetDefaults,
}) => {
  const [showVramInfo, setShowVramInfo] = useState(false);
  const [showQuantInfo, setShowQuantInfo] = useState(false);
  const [showContextInfo, setShowContextInfo] = useState(false);

  const activeQuantInfo = quantLevels.find((q) => q.key === selectedQuant);
  const fitRatio = totalCount > 0 ? Math.round((fittingCount / totalCount) * 100) : 0;
  const { physicalGb, systemReserveGb, usableGb } = getEstimatedUsableVram(selectedGpu);

  const isDefaultConfig =
    selectedGpu.vramGb === 24 &&
    selectedQuant === 'q4' &&
    contextK === 32 &&
    !kvQuantQ8;

  const handleReset = () => {
    if (onResetDefaults) {
      onResetDefaults();
    } else {
      const g24 = gpus.find((g) => g.vramGb === 24);
      if (g24) onSelectGpu(g24);
      onSelectQuant('q4');
      onSelectContextK(32);
      if (kvQuantQ8) onToggleKvQuant();
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-[#11151f]">
      {/* Top Header & Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-slate-50/70 px-5 py-3 dark:border-slate-800/70 dark:bg-[#0c0f17]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </div>
            <span className="font-display text-xs font-bold tracking-tight text-slate-900 uppercase dark:text-white">
              Hardware Sizing Engine
            </span>
          </div>
          <span className="hidden text-[11px] text-slate-400 lg:inline">
            — Hardware budget, precision quantization &amp; context memory
          </span>
        </div>

        {/* Telemetry & Reset Controls */}
        <div className="flex items-center gap-3">
          {/* Runnable Count Pill */}
          <div className="flex items-center gap-2 rounded-lg border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-800 dark:text-teal-300">
            <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="font-mono-num">
              {fittingCount}/{totalCount} runnable ({fitRatio}%)
            </span>
          </div>

          {/* Reset to Default Button */}
          <button
            type="button"
            onClick={handleReset}
            disabled={isDefaultConfig}
            title="Reset configuration to 24 GB, Q4, 32K context"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
              isDefaultConfig
                ? 'cursor-not-allowed border-transparent text-slate-400 opacity-50 dark:text-slate-500'
                : 'border-slate-300 bg-white text-slate-700 shadow-2xs hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600'
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Visual Memory Allocation & Headroom Bar */}
      <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-2.5 dark:border-slate-800/40 dark:bg-[#0e121b]">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-medium text-slate-500 dark:text-slate-400">Memory Budget:</span>
            <span className="font-mono-num font-bold text-slate-900 dark:text-white">
              {physicalGb >= 1024 ? `${physicalGb / 1024} TB` : `${physicalGb} GB`} Physical
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="font-mono-num font-semibold text-teal-600 dark:text-teal-400">
              ~{usableGb >= 1024 ? `${(usableGb / 1024).toFixed(1)} TB` : `${usableGb} GB`} Usable for Weights + KV
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="font-mono-num text-slate-400 dark:text-slate-500">
              ~{systemReserveGb} GB OS / Driver Reserve
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
            <Zap className="h-3 w-3 text-amber-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedGpu.bandwidthGbS} GB/s</span>
            <span>bus bandwidth</span>
          </div>
        </div>

        {/* Visual Allocation Strip */}
        <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${Math.round((usableGb / physicalGb) * 100)}%` }}
            title={`Usable for Model: ${usableGb} GB (${Math.round((usableGb / physicalGb) * 100)}%)`}
          />
          <div
            className="h-full bg-slate-400/50 dark:bg-slate-600 transition-all duration-300"
            style={{ width: `${Math.round((systemReserveGb / physicalGb) * 100)}%` }}
            title={`System & Display Buffer: ${systemReserveGb} GB (${Math.round((systemReserveGb / physicalGb) * 100)}%)`}
          />
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-12">
        {/* 1. GPU / Unified Memory Selector */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <HardDrive className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                1. Local VRAM / Unified Memory
              </span>
              <button
                type="button"
                onClick={() => setShowVramInfo((v) => !v)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                title="Explain physical vs usable VRAM"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>

            {showVramInfo && (
              <div className="mb-2 rounded-lg border border-teal-500/20 bg-teal-500/5 p-2 text-[11px] text-slate-600 dark:text-slate-300">
                <strong>Physical vs. Usable VRAM:</strong> The operating system, display server (Windows DWM / macOS Quartz / Wayland), and CUDA context consume ~0.8–2.4 GB. Calculations budget for total footprint so you don&apos;t hit an out-of-memory crash.
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">
              {gpus.map((gpu) => {
                const active = gpu.id === selectedGpu.id;
                return (
                  <button
                    key={gpu.id}
                    type="button"
                    onClick={() => onSelectGpu(gpu)}
                    title={`${gpu.name} — ${gpu.examples} (${gpu.bandwidthGbS} GB/s)`}
                    className={`relative rounded-lg py-2 px-2 text-center font-mono-num text-[11px] font-semibold transition-all duration-150 ${
                      active
                        ? 'border border-teal-600 bg-teal-600 text-white shadow-xs ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-500 dark:text-slate-950'
                        : 'border border-slate-200/90 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {gpu.shortLabel}
                    {active && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-teal-400 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-2.5 truncate text-[11px] text-slate-400 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {selectedGpu.category}:
            </span>{' '}
            {selectedGpu.examples}
          </p>
        </div>

        {/* 2. Weight Quantization Bit-Depth */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <Layers className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                2. Weight Quantization
              </span>
              <button
                type="button"
                onClick={() => setShowQuantInfo((v) => !v)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                title="Explain quantization bpw & quality retention"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>

            {showQuantInfo && (
              <div className="mb-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-[11px] text-slate-600 dark:text-slate-300">
                <strong>Quantization (bits-per-weight):</strong> Q4 (4.65 bpw) saves ~70% VRAM while retaining ~99% coding capability. Q8 offers lossless precision but doubles memory requirements.
              </div>
            )}

            <div className="grid grid-cols-6 gap-1.5">
              {quantLevels.map((q) => {
                const active = q.key === selectedQuant;
                const isRec = q.key === 'q4';
                return (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => onSelectQuant(q.key)}
                    title={`${q.label} (~${q.bitsPerWeight} bpw, ~${q.codingRetentionPct}% code quality)`}
                    className={`relative rounded-lg py-2 font-mono-num text-[11px] font-bold uppercase transition-all duration-150 ${
                      active
                        ? 'border border-cyan-600 bg-cyan-600 text-white shadow-xs ring-2 ring-cyan-500/20 dark:border-cyan-400 dark:bg-cyan-500 dark:text-slate-950'
                        : 'border border-slate-200/90 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {q.key}
                    {isRec && !active && (
                      <span
                        className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-teal-500"
                        title="Sweet-spot recommended precision"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="font-mono-num font-medium text-cyan-700 dark:text-cyan-300">
              {activeQuantInfo?.ggufTag} (~{activeQuantInfo?.bitsPerWeight} bpw)
            </span>
            <span className="text-slate-400 dark:text-slate-400">
              {activeQuantInfo?.vramSavingsPct}% saved vs 16-bit
            </span>
          </div>
        </div>

        {/* 3. Context Window & KV Cache Compression */}
        <div className="lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  3. Context Window
                </span>
                <button
                  type="button"
                  onClick={() => setShowContextInfo((v) => !v)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  title="Explain context window memory usage"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={onToggleKvQuant}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono-num text-[10px] font-semibold transition-all ${
                  kvQuantQ8
                    ? 'border border-teal-500/40 bg-teal-500/15 text-teal-800 shadow-2xs dark:text-teal-300'
                    : 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400'
                }`}
                title="Enable 8-bit KV Cache (-ctk q8_0 -ctv q8_0) to cut context memory in half"
              >
                <Sparkles className="h-2.5 w-2.5" />
                Q8 KV: {kvQuantQ8 ? 'ON' : 'OFF'}
              </button>
            </div>

            {showContextInfo && (
              <div className="mb-2 rounded-lg border border-teal-500/20 bg-teal-500/5 p-2 text-[11px] text-slate-600 dark:text-slate-300">
                <strong>Context &amp; KV Cache:</strong> Attention key-value states grow linearly with sequence length. Activating Q8 KV compression reduces memory by ~46% with imperceptible precision loss.
              </div>
            )}

            <div className="grid grid-cols-4 gap-1.5">
              {CONTEXT_OPTIONS.map((k) => {
                const active = contextK === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onSelectContextK(k)}
                    className={`rounded-lg py-2 font-mono-num text-[11px] font-semibold transition-all duration-150 ${
                      active
                        ? 'border border-slate-900 bg-slate-900 text-white shadow-xs dark:border-white dark:bg-white dark:text-slate-950'
                        : 'border border-slate-200/90 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {k}K
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-2.5 truncate text-[11px] text-slate-400 dark:text-slate-400">
            {kvQuantQ8 ? 'Q8_0 KV (-50% context VRAM)' : 'FP16 KV Cache (standard precision)'}
          </p>
        </div>
      </div>
    </div>
  );
};
