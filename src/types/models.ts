export type SizeTier = 'tiny' | 'small' | 'medium' | 'large';

export type ArchitectureType = 'Dense' | 'MoE';

export type QuantKey = 'q2' | 'q3' | 'q4' | 'q6' | 'q8' | 'bf16';

export interface QuantWeightsMap {
  q2?: number;
  q3?: number;
  q4?: number;
  q6?: number;
  q8?: number;
  bf16?: number;
}

export interface CodingBreakdown {
  aaCodingIndex?: number;
  liveCodeBench?: number;
  sweBenchVerified?: number;
  aiderPolyglot?: number;
}

export interface ModelSources {
  artificialAnalysis?: string;
  unsloth?: string;
  huggingFace?: string;
}

export interface LocalAIModel {
  id: string;
  name: string;
  creator: string;
  creatorColor: string;
  releaseDate: string;
  license: string;
  licensePermissive: boolean;
  architecture: ArchitectureType;
  totalParamsB: number;
  activeParamsB: number;
  sizeTier: SizeTier;
  reasoning: boolean;
  contextWindowK: number;
  /** Artificial Analysis Intelligence Index (v5 scale) */
  intelligenceScore: number;
  /** Overall Coding Score (0-100 composite across AA Coding, LiveCodeBench, SWE-bench & Aider) */
  codingScore: number;
  codingBreakdown?: CodingBreakdown;
  recommendedQuant: string;
  /** Optional measured weight sizes in GB from Unsloth / HuggingFace GGUF. Falls back to formula if omitted. */
  weightsGbByQuant?: QuantWeightsMap;
  /** Optional FP16 KV cache GB at 32K context. Falls back to GQA/MLA architecture estimate if omitted. */
  kvPer32kGb?: number;
  sources?: ModelSources;
  runCommand?: string;
  notes?: string;
}

export interface FrontierBaseline {
  id: string;
  name: string;
  creator: string;
  creatorColor: string;
  intelligenceScore: number;
  codingScore: number;
  notes: string;
  sourceUrl: string;
}

export const FRONTIER_BASELINE: FrontierBaseline = {
  id: 'claude-fable-5-2',
  name: 'Claude Fable 5.2',
  creator: 'Anthropic',
  creatorColor: '#d97706',
  intelligenceScore: 65,
  codingScore: 100,
  notes: 'Anthropic closed-weights proprietary cloud flagship (AA Intel: 65 · Coding: 100). Serves as the external frontier baseline to measure open-source progress against.',
  sourceUrl: 'https://artificialanalysis.ai/models/claude-fable-5-2',
};

export interface GpuPreset {
  id: string;
  name: string;
  shortLabel: string;
  vramGb: number;
  bandwidthGbS: number;
  category: 'Consumer GPU' | 'Multi-GPU / Workstation' | 'Apple Unified Memory';
  examples: string;
}

export interface QuantLevelInfo {
  key: QuantKey;
  label: string;
  shortLabel: string;
  ggufTag: string;
  bitsPerWeight: number;
  qualityRetentionPct: number;
  codingRetentionPct: number;
  vramSavingsPct: number;
  badge: string;
  summary: string;
  whenToUse: string;
  codingImpact: string;
}

export interface QuantFormatInfo {
  id: string;
  name: string;
  tagline: string;
  ecosystems: string[];
  hardwareTarget: string;
  pros: string[];
  cons: string[];
  description: string;
}

export interface FaqItem {
  id: string;
  category: 'VRAM & Hardware' | 'Quantization' | 'Benchmarks & Coding' | 'MoE & Context';
  question: string;
  answer: string;
}

export type SiliconVendor = 'NVIDIA' | 'AMD' | 'Apple';

export type MemoryArchitecture = 'Unified Memory' | 'Discrete VRAM';

export interface SiliconBandwidthEntry {
  id: string;
  name: string;
  vendor: SiliconVendor;
  architecture: MemoryArchitecture;
  memoryType: string;
  busWidthBits: number;
  maxMemoryGb: number;
  usableVramGb: number;
  bandwidthGbS: number;
  tdpWatts: number;
  releaseYear: number;
  formFactor: string;
  notes: string;
}

