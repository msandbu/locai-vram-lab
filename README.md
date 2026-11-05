# LOCAI // Local VRAM Lab ⚡

[![Live Site](https://img.shields.io/badge/Live%20Site-locai.msandbu.org-teal?style=flat-square)](https://locai.msandbu.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Cloudflare](https://img.shields.io/badge/Hosted%20on-Cloudflare-F38020?style=flat-square&logo=cloudflare)](https://locai.msandbu.org)

> **Independent Local AI Hardware Sizing, VRAM Calculation & Performance Matrix**  
> Helps developers, ML engineers, and self-hosters determine which open-weights LLMs can run on their GPUs, compare coding and reasoning capabilities, understand KV cache VRAM scaling, and choose the right quantization precision.

---

## 🌐 Live Service
- **Primary Domain:** **[https://locai.msandbu.org](https://locai.msandbu.org)**
- **Workers Fallback:** [https://locai-vram-lab.msandbu.workers.dev](https://locai-vram-lab.msandbu.workers.dev)

---

## ✨ Features

- **Hardware Sizing Engine**:
  - Live calculations distinguishing **Physical VRAM** from **Usable VRAM** and OS/display server reserve buffers.
  - Multi-tier GPU selection (NVIDIA RTX 4090/3090, RTX 5090, Apple M2/M3/M4 Max Unified Memory, multi-GPU rigs, and cluster scales).
  - Context window scaling (8K, 32K, 64K, 128K) with optional **Q8 KV cache compression** (-46% context VRAM).
  - Weight quantization simulation: Q2, Q3, Q4 (sweet spot), Q6, Q8, and BF16.

- **4-Tier Hardware Compatibility Indicators**:
  - **Comfortable Fit**: Fits inside GPU VRAM with healthy headroom (>10%), zero risk of CUDA OOM.
  - **Tight Fit**: Fits in GPU memory with limited headroom (<10%); flags context spike risks.
  - **Requires Offloading**: Exceeds GPU memory; supports partial CPU RAM offloading (e.g. `llama.cpp -ngl`).
  - **Not Supported**: Exceeds hardware memory limits.

- **GPU Memory vs. Score Map**:
  - Interactive scatter plot mapping total memory footprint against Coding Score and Artificial Analysis Intelligence Index.
  - **Optimal Performance Frontier (Pareto curve)** connecting top models across hardware classes.
  - Highlights user's specific GPU VRAM budget boundary line and shaded runnable hardware zone.
  - Filterable by architecture (Dense vs. MoE) and compatibility tiers.

- **Side-by-Side Model Comparison**:
  - Select up to 4 models from the chart, recommendation cards, or matrix table.
  - Compare VRAM weights, KV cache, runtime buffers, headroom, coding/reasoning scores, and efficiency (`pts/GB`).
  - One-click copy for CLI execution commands (`ollama run ...`).

- **Hosting Tools Directory**:
  - Curated guide for hosting LLMs on Windows, macOS, and Linux (Foundry Local, Ollama, LM Studio, Jan, Open WebUI, llama.cpp, vLLM, MLX, KoboldCpp, and more).

- **Quantization Guide & Memory Bandwidth Leaderboards**:
  - Deep-dive into GGUF, EXL2, AWQ, and bits-per-weight tradeoffs.
  - Memory bandwidth ranking across NVIDIA GPUs, Apple Silicon, and AMD cards.

---

## 🛠️ How to Add or Update Models

We welcome contributions from the community!

1. **Via the Web Interface**: Click **"Suggest Model"** on the live dashboard. It generates a pre-formatted GitHub Issue with the exact JSON definition ready for merging.
2. **Via Pull Request**: Edit [`src/data/models.json`](./src/data/models.json) directly. See [CONTRIBUTING.md](./CONTRIBUTING.md) for field definitions and guidelines.

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/msandbu/locai-vram-lab.git
cd locai-vram-lab

# Install dependencies
npm install

# Start local dev server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy
```

---

## 📄 License

MIT © [Marius Sandbu](https://github.com/msandbu)
