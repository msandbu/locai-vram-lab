import React, { useMemo, useState } from 'react';
import {
  MemoryArchitecture,
  SiliconBandwidthEntry,
  SiliconVendor,
} from '../types/models';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Cpu,
  Gauge,
  Layers,
  Zap,
} from 'lucide-react';

interface BandwidthLeaderboardProps {
  entries: SiliconBandwidthEntry[];
}

type ArchFilter = 'all' | MemoryArchitecture;
type VendorFilter = 'all' | SiliconVendor;
type BandwidthSortField = 'bandwidth' | 'memory' | 'bus' | 'toks' | 'tdp';
type SortDir = 'asc' | 'desc';

interface ReferenceWorkload {
  id: string;
  label: string;
  shortDesc: string;
  requiredGb: number;
  activeWeightsGb: number;
}

const WORKLOADS: ReferenceWorkload[] = [
  {
    id: '14b-dense',
    label: '14B Dense (Q4)',
    shortDesc: '~9.5 GB total · 8.5 GB active',
    requiredGb: 9.5,
    activeWeightsGb: 8.5,
  },
  {
    id: '35b-moe',
    label: '35B-A3B MoE (Q4)',
    shortDesc: '~22 GB total · 2.3 GB active',
    requiredGb: 22,
    activeWeightsGb: 2.3,
  },
  {
    id: '70b-dense',
    label: '70B Dense (Q4)',
    shortDesc: '~43 GB total · 40.5 GB active',
    requiredGb: 43,
    activeWeightsGb: 40.5,
  },
  {
    id: '120b-moe',
    label: '120B MoE (Q4)',
    shortDesc: '~68 GB total · 4.2 GB active',
    requiredGb: 68,
    activeWeightsGb: 4.2,
  },
];

const VENDOR_STYLES: Record<
  SiliconVendor,
  {
    badge: string;
    bar: string;
    dot: string;
    monogramBg: string;
  }
> = {
  NVIDIA: {
    badge: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border-emerald-500/25',
    bar: 'from-emerald-500 to-teal-500',
    dot: 'bg-emerald-500',
    monogramBg: '#16a34a',
  },
  AMD: {
    badge: 'bg-rose-500/12 text-rose-800 dark:text-rose-300 border-rose-500/25',
    bar: 'from-rose-500 to-orange-500',
    dot: 'bg-rose-500',
    monogramBg: '#e11d48',
  },
  Apple: {
    badge: 'bg-indigo-500/12 text-indigo-800 dark:text-indigo-300 border-indigo-500/25',
    bar: 'from-indigo-500 to-cyan-500',
    dot: 'bg-indigo-500',
    monogramBg: '#4f46e5',
  },
};

function estimateHardwareTokPerSec(
  entry: SiliconBandwidthEntry,
  workload: ReferenceWorkload
): number | null {
  if (workload.requiredGb > entry.usableVramGb) {
    return null;
  }
  const busEfficiency =
    entry.vendor === 'NVIDIA'
      ? entry.architecture === 'Discrete VRAM'
        ? 0.74
        : 0.68
      : entry.vendor === 'Apple'
      ? 0.68
      : 0.65;

  const raw = (entry.bandwidthGbS * busEfficiency) / (workload.activeWeightsGb + 0.35);
  return Math.max(2, Math.round(raw));
}

export const BandwidthLeaderboard: React.FC<BandwidthLeaderboardProps> = ({ entries }) => {
  const [archFilter, setArchFilter] = useState<ArchFilter>('all');
  const [vendorFilter, setVendorFilter] = useState<VendorFilter>('all');
  const [selectedWorkloadId, setSelectedWorkloadId] = useState<string>('70b-dense');
  const [sortField, setSortField] = useState<BandwidthSortField>('bandwidth');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const activeWorkload =
    WORKLOADS.find((w) => w.id === selectedWorkloadId) ?? WORKLOADS[2];

  const handleSort = (field: BandwidthSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir(field === 'tdp' ? 'asc' : 'desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const filtered = entries
      .filter((item) => {
        if (archFilter !== 'all' && item.architecture !== archFilter) return false;
        if (vendorFilter !== 'all' && item.vendor !== vendorFilter) return false;
        return true;
      })
      .map((entry) => ({
        entry,
        estTokS: estimateHardwareTokPerSec(entry, activeWorkload),
      }));

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'bandwidth':
          cmp = a.entry.bandwidthGbS - b.entry.bandwidthGbS;
          break;
        case 'memory':
          cmp = a.entry.usableVramGb - b.entry.usableVramGb;
          break;
        case 'bus':
          cmp = a.entry.busWidthBits - b.entry.busWidthBits;
          break;
        case 'tdp':
          cmp = a.entry.tdpWatts - b.entry.tdpWatts;
          break;
        case 'toks':
          cmp = (a.estTokS ?? -1) - (b.estTokS ?? -1);
          break;
      }
      if (cmp === 0) {
        cmp = a.entry.bandwidthGbS - b.entry.bandwidthGbS;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return filtered;
  }, [entries, archFilter, vendorFilter, activeWorkload, sortField, sortDir]);

  const maxVisibleBandwidth = useMemo(() => {
    const peak = Math.max(...filteredAndSorted.map((x) => x.entry.bandwidthGbS), 300);
    return peak;
  }, [filteredAndSorted]);

  const getAriaSort = (field: BandwidthSortField): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortIcon = (field: BandwidthSortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-45" />;
    return sortDir === 'desc' ? (
      <ArrowDown className="h-3 w-3 text-teal-600 dark:text-teal-400" />
    ) : (
      <ArrowUp className="h-3 w-3 text-teal-600 dark:text-teal-400" />
    );
  };

  const unifiedCount = useMemo(
    () => entries.filter((e) => e.architecture === 'Unified Memory').length,
    [entries]
  );
  const discreteCount = entries.length - unifiedCount;

  return (
    <section id="bandwidth" className="scroll-mt-20 space-y-6">
      {/* Section Header + Live Workload Simulator Selector */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
            Unified &amp; GPU Memory Bandwidth Leaderboard
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-slate-600 sm:text-sm dark:text-slate-400">
            LLM token generation scales linearly with memory bandwidth (<code className="font-mono-num text-slate-800 dark:text-slate-300">GB/s ÷ active weights</code>), while memory capacity dictates maximum model size. Compare how <strong>Apple</strong>, <strong>NVIDIA</strong>, and <strong>AMD</strong> balance unified pools vs. discrete GDDR buses.
          </p>
        </div>

        {/* Simulated LLM Workload Picker */}
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-2 shadow-2xs backdrop-blur-sm dark:border-slate-800/80 dark:bg-[#11151f]/70">
          <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              <Zap className="h-3 w-3 text-teal-500" />
              Simulate Decode Speed
            </span>
            <span className="font-mono-num text-[10px] text-teal-700 dark:text-teal-400">
              {activeWorkload.shortDesc}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {WORKLOADS.map((wl) => {
              const active = wl.id === activeWorkload.id;
              return (
                <button
                  key={wl.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedWorkloadId(wl.id)}
                  className={`rounded-lg px-2.5 py-1 font-mono-num text-[11px] font-medium transition-all ${
                    active
                      ? 'bg-teal-600 font-semibold text-white shadow-2xs dark:bg-teal-500 dark:text-slate-950'
                      : 'border border-slate-200/80 bg-slate-50/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-800/80 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  {wl.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3-Vendor Architecture Breakdown Cards (Apple vs NVIDIA vs AMD) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Apple Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#11151f]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                Apple Silicon
              </h3>
            </div>
            <span className="rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 font-mono-num text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
              100% Unified Bus
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 font-mono-num dark:bg-slate-900/70">
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Peak Unified BW</div>
              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                1,228 GB/s
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">M5 Ultra (1024-bit)</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Max Local Pool</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                512 GB
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">~448 GB GPU-wired</div>
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Pairs massive unified RAM with ultra-wide 512-bit (<code className="font-mono-num">M4/M5 Max</code>) and 1024-bit (<code className="font-mono-num">Ultra</code>) buses—delivering <strong>2.2x–4.8x</strong> faster decode than 256-bit unified PCs.
          </p>
        </div>

        {/* NVIDIA Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#11151f]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                NVIDIA (RTX &amp; DGX Spark)
              </h3>
            </div>
            <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono-num text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              GDDR7 + GB10 Unified
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 font-mono-num dark:bg-slate-900/70">
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Discrete / Unified</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                1,792 / 273 GB/s
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">RTX 5090 vs GB10</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Max Local Pool</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                96G VRAM / 128G UMA
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">PRO 6000 / DGX Spark</div>
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Unmatched discrete GDDR7 speed &amp; CUDA prompt prefill, but consumer GPUs cap at 32 GB—while unified <code className="font-mono-num">DGX Spark (128 GB)</code> is throttled by a 256-bit bus (<code className="font-mono-num">273 GB/s</code>).
          </p>
        </div>

        {/* AMD Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#11151f]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                AMD (Strix Halo &amp; Radeon)
              </h3>
            </div>
            <span className="rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 font-mono-num text-[10px] font-semibold text-rose-700 dark:text-rose-300">
              x86 UMA + GDDR6
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 font-mono-num dark:bg-slate-900/70">
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Discrete / Unified</div>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                960 / 256 GB/s
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">7900 XTX vs Strix Halo</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Max Local Pool</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                48G VRAM / 128G UMA
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">W7900 / AI Max+ 395</div>
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <code className="font-mono-num">Ryzen AI Max+ 395</code> brings affordable 128 GB unified RAM to Windows/Linux PCs—great for sparse MoEs (<code className="font-mono-num">30B-A3B</code>), while <code className="font-mono-num">7900 XTX / W7900</code> push fast discrete ROCm.
          </p>
        </div>
      </div>

      {/* Main Leaderboard Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800/80 dark:bg-[#11151f]">
        {/* Filter Bar */}
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200/70 bg-slate-50/50 px-5 py-3 sm:flex-row sm:items-center dark:border-slate-800/70 dark:bg-[#0c0f16]">
          {/* Architecture Mode Tabs */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200/80 bg-white/60 p-0.5 dark:border-slate-800/80 dark:bg-slate-900/50">
            <button
              type="button"
              aria-pressed={archFilter === 'all'}
              onClick={() => setArchFilter('all')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                archFilter === 'all'
                  ? 'bg-slate-950 font-semibold text-white shadow-2xs dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              All Silicon ({entries.length})
            </button>
            <button
              type="button"
              aria-pressed={archFilter === 'Unified Memory'}
              onClick={() => setArchFilter('Unified Memory')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                archFilter === 'Unified Memory'
                  ? 'bg-teal-600 font-semibold text-white shadow-2xs dark:bg-teal-500 dark:text-slate-950'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              Unified Memory ({unifiedCount})
            </button>
            <button
              type="button"
              aria-pressed={archFilter === 'Discrete VRAM'}
              onClick={() => setArchFilter('Discrete VRAM')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                archFilter === 'Discrete VRAM'
                  ? 'bg-slate-950 font-semibold text-white shadow-2xs dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Gauge className="h-3.5 w-3.5" />
              Discrete GPUs ({discreteCount})
            </button>
          </div>

          {/* Vendor Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            {(['all', 'Apple', 'NVIDIA', 'AMD'] as VendorFilter[]).map((v) => {
              const active = vendorFilter === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setVendorFilter(v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
                    active
                      ? 'border border-teal-500/30 bg-teal-500/10 font-semibold text-teal-800 dark:text-teal-300'
                      : 'border border-slate-200/80 bg-white/70 text-slate-600 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  {v !== 'all' && (
                    <span className={`h-1.5 w-1.5 rounded-full ${VENDOR_STYLES[v].dot}`} />
                  )}
                  {v === 'all' ? 'All Vendors' : v}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto locai-scrollbar">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800/70 dark:bg-[#0c0f16] dark:text-slate-400">
                <th className="w-12 px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">Hardware &amp; Memory Type</th>
                <th className="px-3 py-3" aria-sort={getAriaSort('memory')}>
                  <button
                    type="button"
                    onClick={() => handleSort('memory')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    Max Usable Pool {renderSortIcon('memory')}
                  </button>
                </th>
                <th className="px-3 py-3" aria-sort={getAriaSort('bus')}>
                  <button
                    type="button"
                    onClick={() => handleSort('bus')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    Bus Width {renderSortIcon('bus')}
                  </button>
                </th>
                <th className="w-[320px] px-4 py-3" aria-sort={getAriaSort('bandwidth')}>
                  <button
                    type="button"
                    onClick={() => handleSort('bandwidth')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    Memory Bandwidth (GB/s) {renderSortIcon('bandwidth')}
                  </button>
                </th>
                <th className="px-3 py-3" aria-sort={getAriaSort('tdp')}>
                  <button
                    type="button"
                    onClick={() => handleSort('tdp')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    Power {renderSortIcon('tdp')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right" aria-sort={getAriaSort('toks')}>
                  <button
                    type="button"
                    onClick={() => handleSort('toks')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    Est. {activeWorkload.label} {renderSortIcon('toks')}
                  </button>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {filteredAndSorted.map(({ entry, estTokS }, idx) => {
                const style = VENDOR_STYLES[entry.vendor];
                const bwPct = Math.min(
                  100,
                  Math.max(4, (entry.bandwidthGbS / maxVisibleBandwidth) * 100)
                );
                const isUnified = entry.architecture === 'Unified Memory';
                const gbPerSecPer100W = Math.round((entry.bandwidthGbS / entry.tdpWatts) * 100);

                return (
                  <tr
                    key={entry.id}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/35"
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 text-center font-mono-num text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Hardware & Architecture */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg font-display text-[10px] font-bold text-white shadow-2xs ring-1 ring-black/5 dark:ring-white/10"
                          style={{ backgroundColor: style.monogramBg }}
                        >
                          {entry.vendor === 'NVIDIA'
                            ? 'NV'
                            : entry.vendor === 'Apple'
                            ? 'AP'
                            : 'AMD'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
                              {entry.name}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                                isUnified
                                  ? 'border-teal-500/25 bg-teal-500/10 text-teal-800 dark:text-teal-300'
                                  : 'border-slate-200 bg-slate-100/70 text-slate-600 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300'
                              }`}
                            >
                              {entry.architecture}
                            </span>
                          </div>
                          <p className="mt-0.5 max-w-md text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                            {entry.notes}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Max Usable Memory */}
                    <td className="px-3 py-3">
                      <div className="font-mono-num text-xs font-bold text-slate-900 dark:text-white">
                        {entry.usableVramGb} GB{' '}
                        {entry.usableVramGb < entry.maxMemoryGb && (
                          <span className="font-normal text-slate-500 dark:text-slate-400">
                            / {entry.maxMemoryGb}G
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {entry.memoryType}
                      </div>
                    </td>

                    {/* Bus Width */}
                    <td className="px-3 py-3">
                      <span className="font-mono-num text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {entry.busWidthBits}-bit
                      </span>
                      <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        {entry.formFactor}
                      </div>
                    </td>

                    {/* Memory Bandwidth Visual Bar */}
                    <td className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono-num text-xs font-bold text-slate-950 dark:text-white">
                          {entry.bandwidthGbS.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">GB/s</span>
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono-num text-[10px] font-medium ${style.badge}`}
                        >
                          {entry.vendor}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${style.bar}`}
                          style={{ width: `${bwPct}%` }}
                        />
                      </div>
                    </td>

                    {/* Power & Efficiency */}
                    <td className="px-3 py-3.5">
                      <div className="font-mono-num text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {entry.tdpWatts}W
                      </div>
                      <div className="mt-0.5 font-mono-num text-[10px] text-slate-500 dark:text-slate-400">
                        {gbPerSecPer100W} GB/s/100W
                      </div>
                    </td>

                    {/* Simulated LLM Decode Speed */}
                    <td className="px-4 py-3.5 text-right">
                      {estTokS !== null ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-teal-500/12 px-2.5 py-1 font-mono-num text-xs font-bold text-teal-800 dark:text-teal-300">
                            <Zap className="h-3 w-3" />~{estTokS} tok/s
                          </span>
                          <span className="mt-0.5 font-mono-num text-[10px] text-slate-500 dark:text-slate-400">
                            {Math.round((activeWorkload.requiredGb / entry.usableVramGb) * 100)}% mem used
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-end">
                          <span className="rounded-lg bg-rose-500/12 px-2.5 py-1 font-mono-num text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                            VRAM OOM
                          </span>
                          <span className="mt-0.5 font-mono-num text-[10px] text-slate-500 dark:text-slate-400">
                            Needs {activeWorkload.requiredGb}G &gt; {entry.usableVramGb}G
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
          <span>
            <strong>Why Unified Memory differs:</strong> Apple scales unified LPDDR5X width up to 1024-bit (<code className="font-mono-num">1,228 GB/s</code>), whereas current x86/ARM unified APUs (<code className="font-mono-num">Strix Halo</code>, <code className="font-mono-num">DGX Spark</code>) use 256-bit buses (<code className="font-mono-num">256–273 GB/s</code>).
          </span>
          <span className="font-mono-num text-[10px] text-slate-500 dark:text-slate-400">
            Source file: src/data/bandwidth.json
          </span>
        </div>
      </div>
    </section>
  );
};
