import { GpuPreset, LocalAIModel, QuantKey } from '../types/models';

export const QUANT_BPW: Record<QuantKey, number> = {
  q2: 2.45,
  q3: 3.55,
  q4: 4.65,
  q6: 6.56,
  q8: 8.5,
  bf16: 16.0,
};

export type FitStatus =
  | 'comfortable'
  | 'tight'
  | 'offload'
  | 'unsupported'
  | 'optimal' // Alias for backward compatibility
  | 'exceeds'; // Alias for backward compatibility

export interface VramEstimate {
  weightsGb: number;
  kvCacheGb: number;
  overheadGb: number;
  totalVramGb: number;
  physicalVramGb: number;
  systemReserveGb: number;
  usableGpuVramGb: number;
  headroomGb: number;
  usableHeadroomGb: number;
  utilizationPct: number;
  fitStatus: 'comfortable' | 'tight' | 'offload' | 'unsupported';
  fitLabel: 'Comfortable Fit' | 'Tight Fit' | 'Requires Offloading' | 'Not Supported';
  minTierLabel: string;
  estTokensPerSec: number | null;
  incompatibilityReason: string | null;
  isRunnable: boolean;
}

export function formatParamsB(paramsB: number): string {
  if (paramsB >= 1000) {
    const t = paramsB / 1000;
    return `${Number.isInteger(t) ? t.toFixed(1) : parseFloat(t.toFixed(2))}T`;
  }
  return `${paramsB}B`;
}

export function getCreatorInitials(creator: string): string {
  const clean = creator.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function getEstimatedUsableVram(gpu: GpuPreset): {
  physicalGb: number;
  systemReserveGb: number;
  usableGb: number;
} {
  const physicalGb = gpu.vramGb;
  let systemReserveGb = 1.2;

  if (physicalGb <= 8) {
    systemReserveGb = 0.8;
  } else if (physicalGb <= 16) {
    systemReserveGb = 1.0;
  } else if (physicalGb <= 24) {
    systemReserveGb = 1.2;
  } else if (physicalGb <= 48) {
    systemReserveGb = 1.6;
  } else if (physicalGb <= 128) {
    systemReserveGb = 2.4;
  } else {
    systemReserveGb = 3.2;
  }

  const usableGb = Number(Math.max(1, physicalGb - systemReserveGb).toFixed(1));
  return { physicalGb, systemReserveGb, usableGb };
}

export function getModelWeightsGb(model: LocalAIModel, quant: QuantKey): number {
  const explicit = model.weightsGbByQuant?.[quant];
  if (typeof explicit === 'number' && explicit > 0) {
    return Number(explicit.toFixed(1));
  }
  const bpw = QUANT_BPW[quant];
  const rawGb = ((model.totalParamsB * bpw) / 8) * 1.05;
  return Number(rawGb.toFixed(1));
}

export function getMinimumGpuTier(totalVramGb: number): string {
  if (totalVramGb <= 6) return '6 GB';
  if (totalVramGb <= 8) return '8 GB';
  if (totalVramGb <= 12) return '12 GB';
  if (totalVramGb <= 16) return '16 GB';
  if (totalVramGb <= 24) return '24 GB';
  if (totalVramGb <= 32) return '32 GB';
  if (totalVramGb <= 48) return '48 GB';
  if (totalVramGb <= 64) return '64 GB';
  if (totalVramGb <= 96) return '96 GB';
  if (totalVramGb <= 128) return '128 GB';
  if (totalVramGb <= 256) return '256 GB';
  if (totalVramGb <= 512) return '512 GB';
  if (totalVramGb <= 1024) return '1 TB';
  return '1.5 TB+';
}

export function estimateModelVram(
  model: LocalAIModel,
  quant: QuantKey,
  contextK: number,
  kvQuantQ8: boolean,
  gpu: GpuPreset
): VramEstimate {
  const weightsGb = getModelWeightsGb(model, quant);

  const effectiveContextK = Math.min(contextK, model.contextWindowK);
  const baseKv32k =
    typeof model.kvPer32kGb === 'number'
      ? model.kvPer32kGb
      : model.architecture === 'MoE'
      ? Math.max(0.8, model.activeParamsB * 0.09)
      : Math.max(0.6, model.totalParamsB * 0.085);

  const kvMultiplier = kvQuantQ8 ? 0.54 : 1.0;
  const kvCacheGb = Number((baseKv32k * (effectiveContextK / 32) * kvMultiplier).toFixed(1));

  // Runtime CUDA / Metal compute buffer & OS display headroom
  const overheadGb = Number(
    Math.min(4.0, Math.max(0.8, 0.7 + weightsGb * 0.02)).toFixed(1)
  );

  const totalVramGb = Number((weightsGb + kvCacheGb + overheadGb).toFixed(1));
  const { systemReserveGb, usableGb } = getEstimatedUsableVram(gpu);

  const headroomGb = Number((gpu.vramGb - totalVramGb).toFixed(1));
  const usableHeadroomGb = Number((usableGb - totalVramGb).toFixed(1));
  const utilizationPct = Math.round((totalVramGb / gpu.vramGb) * 100);

  let fitStatus: 'comfortable' | 'tight' | 'offload' | 'unsupported';
  let fitLabel: 'Comfortable Fit' | 'Tight Fit' | 'Requires Offloading' | 'Not Supported';
  let incompatibilityReason: string | null = null;

  if (totalVramGb <= usableGb * 0.92) {
    fitStatus = 'comfortable';
    fitLabel = 'Comfortable Fit';
    incompatibilityReason = null;
  } else if (totalVramGb <= gpu.vramGb) {
    fitStatus = 'tight';
    fitLabel = 'Tight Fit';
    incompatibilityReason = `VRAM headroom is minimal (${headroomGb} GB). Running desktop displays or background CUDA tasks may risk out-of-memory.`;
  } else if (
    (model.architecture === 'MoE' && totalVramGb <= gpu.vramGb * 2.2) ||
    totalVramGb <= gpu.vramGb * 1.35
  ) {
    fitStatus = 'offload';
    fitLabel = 'Requires Offloading';
    incompatibilityReason = `Exceeds dedicated VRAM by ${(totalVramGb - gpu.vramGb).toFixed(1)} GB. Requires partial CPU system RAM offloading (e.g. llama.cpp -ngl), which throttles generation speed.`;
  } else {
    fitStatus = 'unsupported';
    fitLabel = 'Not Supported';
    incompatibilityReason = `Hardware tier exceeded. Requires minimum ${getMinimumGpuTier(totalVramGb)} VRAM to load this model at ${quant.toUpperCase()}.`;
  }

  const isRunnable = fitStatus === 'comfortable' || fitStatus === 'tight';

  let estTokensPerSec: number | null = null;
  if (isRunnable) {
    const bpw = QUANT_BPW[quant];
    const activeWeightsGb = Math.max(0.5, ((model.activeParamsB * bpw) / 8) * 1.05);
    const efficiency = gpu.category === 'Apple Unified Memory' ? 0.66 : 0.72;
    const rawTokS = (gpu.bandwidthGbS * efficiency) / (activeWeightsGb + kvCacheGb * 0.18);
    estTokensPerSec = Math.max(4, Math.min(340, Math.round(rawTokS)));
  }

  return {
    weightsGb,
    kvCacheGb,
    overheadGb,
    totalVramGb,
    physicalVramGb: gpu.vramGb,
    systemReserveGb,
    usableGpuVramGb: usableGb,
    headroomGb,
    usableHeadroomGb,
    utilizationPct,
    fitStatus,
    fitLabel,
    minTierLabel: getMinimumGpuTier(totalVramGb),
    estTokensPerSec,
    incompatibilityReason,
    isRunnable,
  };
}
