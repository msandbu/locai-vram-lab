# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are developers, ML engineers, and self-hosters evaluating and configuring open-weight LLMs to run on local GPU rigs or unified-memory hardware (NVIDIA RTX consumer/workstation GPUs, AMD Radeon cards, Apple Silicon M-series Macs, and multi-GPU setups). Their primary job-to-be-done is determining which open-weight models fit within their real usable VRAM budget at a chosen quantization and context window, comparing coding and reasoning capabilities per gigabyte of VRAM, and copying a ready-to-run local execution command.

## Product Purpose

LOCAI // Local VRAM Lab (`locai.msandbu.org`) is an independent, interactive hardware sizing engine, VRAM calculator, and performance benchmark matrix for local open-weight LLMs. It eliminates trial-and-error out-of-memory failures and fragmented benchmark hunting by combining realistic VRAM accounting (model weights + KV cache scaling + OS/compute reserve) with coding and reasoning scores, memory bandwidth token-generation estimates, quantization trade-offs, and local hosting runtime guides.

## Positioning

Unlike rough parameter-multiplier calculators or generic cloud LLM leaderboards, LOCAI separates **physical VRAM** from **usable VRAM** (accounting for OS/display server reserve and runtime CUDA/Metal buffers), models **KV cache scaling** across context lengths (`8K`–`128K`) and `Q8_0` KV cache quantization (`-46%` context VRAM), distinguishes **Dense vs. MoE** active parameter bandwidth speeds (`estTokensPerSec`), and maps every model against an interactive **GPU Memory vs. Score Pareto Frontier** for the user's exact hardware budget—all in a 100% static, zero-backend web workbench.

## Operating Context

- **GPU Workbench (`#/`)**: Users select their hardware tier (`8 GB` to `1.5 TB+`), weight quantization (`Q2` through `BF16`), context window (`8K`–`128K`), and `Q8` KV cache compression, then inspect the 4-tier compatibility status (`Comfortable Fit`, `Tight Fit`, `Requires Offloading`, `Not Supported`), Pareto frontier chart, searchable/sortable model leaderboard, side-by-side comparison tray (up to 4 models), detail modal with one-click CLI commands (`llama-server`, `ollama run`), and Silicon Memory Bandwidth Leaderboard.
- **Host LLMs Locally (`#/hosting`)**: Users filter and compare local inference engines, CLI servers, and desktop UIs across Windows, macOS, and Linux (Ollama, LM Studio, `llama.cpp`, vLLM, MLX, Open WebUI, Foundry Local, Jan, KoboldCpp).
- **Quantization Guide & FAQ (`#/guide`)**: Users reference bits-per-weight (`BPW`) retention trade-offs across `Q2`–`BF16` and compare quantization formats (`GGUF`, `EXL2`, `AWQ`, `GPTQ`, `MLX`).
- **Community Model Contributions (`FeedbackModal`)**: Users submit missing or updated models via a guided form that generates a pre-formatted GitHub Issue with a ready-to-merge JSON payload for `msandbu/locai-vram-lab`.

## Capabilities and Constraints

- **100% Static JSON Architecture**: Zero backend, database, or runtime external API calls. All catalog and benchmark data lives in versioned static JSON files under `src/data/` (`models.json`, `gpus.json`, `bandwidth.json`, `quantization.json`, `hostingTools.json`, `siteConfig.json`), built with React 19, TypeScript, Vite, and Tailwind CSS v4, and deployed statically to Cloudflare Workers (`locai.msandbu.org`).
- **Formula-Backed & Explicit VRAM Math (`src/utils/vram.ts`)**: Uses real GGUF shard sizes (`weightsGbByQuant`) when recorded in `models.json` and falls back to calibrated bits-per-weight (`QUANT_BPW`) + KV cache scaling (`kvPer32kGb`, Dense vs. MoE active-parameter formulas) + OS reserve and runtime buffer calculations.
- **4-Tier Compatibility Taxonomy**:
  - `Comfortable Fit`: Total VRAM ≤ 92% of usable GPU VRAM.
  - `Tight Fit`: Fits within physical VRAM with minimal headroom; flags context-spike/display OOM risk.
  - `Requires Offloading`: Exceeds dedicated VRAM within partial CPU RAM offload thresholds (`llama.cpp -ngl`).
  - `Not Supported`: Exceeds hardware tier limits.
- **Size Tier Classification (aligned with Artificial Analysis)**:
  - `tiny`: `≤ 4B` total parameters (`Edge`)
  - `small`: `> 4B` to `40B` total parameters (`Desktop`)
  - `medium`: `> 40B` to `150B` total parameters (`Workstation`)
  - `large`: `> 150B` total parameters (`Cluster / Ultra`)

## Brand Commitments

- **Name**: `LOCAI // Local VRAM Lab` (short name `LOCAI`).
- **Voice & Posture**: Independent, technical, transparent, and vendor-neutral. Numbers and compatibility ratings are strictly derived from public benchmarks and memory formulas without sponsored placements.

## Evidence on Hand

- **Model Catalog (`src/data/models.json`)**: Curated open-weight LLMs with parameter counts (total vs. active), architectures (`Dense` / `MoE`), licenses, context windows, Artificial Analysis Intelligence Index (`intelligenceScore`), Coding scores (`codingScore` and `codingBreakdown`: `liveCodeBench`, `sweBenchVerified`, `aiderPolyglot`), recommended quantizations, explicit GGUF sizes (`weightsGbByQuant`), source links, and runnable CLI commands.
- **Hardware & Bandwidth Data (`src/data/gpus.json`, `src/data/bandwidth.json`)**: Consumer, workstation, Apple Unified Memory, and multi-GPU presets with physical VRAM, memory bus width, TDP, and memory bandwidth (`GB/s`).
- **Quantization & Hosting Reference (`src/data/quantization.json`, `src/data/hostingTools.json`)**: Structured reference data for quantization levels, formats, FAQs, and local hosting tools.
- **Data Provenance (`DATA_GUIDE.md`, `CONTRIBUTING.md`)**: Benchmarks and shard sizes are sourced from Artificial Analysis (`artificialanalysis.ai/models/open-source`), LiveCodeBench, SWE-bench Verified, Aider Polyglot Leaderboard, Unsloth (`docs.unsloth.ai`, `huggingface.co/unsloth`), and Bartowski GGUFs (`huggingface.co/bartowski`). Do not fabricate unverified benchmark scores, customer testimonials, or cloud hosting telemetry.

## Product Principles

1. **Usable VRAM Over Marketing Specs**: Always account for OS display reserves, runtime compute buffers, and KV cache growth so a "fits on 24 GB" recommendation actually runs without CUDA/Metal OOMs.
2. **Static, Auditable Simplicity**: Keep all model, hardware, and benchmark data in human-editable static JSON (`src/data/`) with zero backend dependencies and deterministic client-side calculations.
3. **Efficiency at the Forefront**: Evaluate models not just by raw peak score, but by intelligence and coding capability relative to memory footprint (`pts/GB`), active parameters (MoE vs. Dense), and memory bandwidth (`tok/s`).
4. **Actionable Local Execution**: Move users directly from hardware sizing to running the model locally via copy-ready CLI commands (`llama-server`, `ollama run`), recommended quantizations, and OS-appropriate hosting tools.
