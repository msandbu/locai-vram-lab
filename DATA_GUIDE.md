# Manual Data Update Guide (`LOCAI`)

This site uses **100% static JSON files** with zero backend or external API dependencies. Updating benchmark scores, adding newly released open-weight models, or adding new GPUs only requires editing JSON files inside `src/data/` and running `npm run build` (or `npm run dev`).

---

## 1. Where to Collect Numbers Manually

1. **Intelligence Score & Parameter Counts:**
   - [Artificial Analysis — Open Source](https://artificialanalysis.ai/models/open-source) (and its `/tiny`, `/small`, `/medium`, `/large` tabs).
   - Copy the **Artificial Analysis Intelligence Index (v5)** into `intelligenceScore`.
   - Check total vs. active inference parameters (`totalParamsB` and `activeParamsB`). For Dense models, set both to the same value.

2. **Overall Coding Score (`0–100`):**
   - Check the **AA Coding Index** on Artificial Analysis, plus local-model coding leaderboards:
     - [LiveCodeBench](https://livecodebench.github.io/) (algorithmic problem solving)
     - [Aider Polyglot Leaderboard](https://aider.chat/docs/leaderboards/) (multi-file code editing & diff reliability)
     - [SWE-bench Verified](https://www.swebench.com/) (repository-level bug fixing)
   - Record your overall `0–100` coding rating in `codingScore` (and optionally add sub-scores in `codingBreakdown`).

3. **Real-World Quantized Weight Sizes (VRAM):**
   - [Unsloth Docs](https://docs.unsloth.ai/) & [Unsloth Hugging Face GGUFs](https://huggingface.co/unsloth)
   - [Bartowski Hugging Face GGUFs](https://huggingface.co/bartowski)
   - Enter exact GGUF shard sizes (in GB) inside `weightsGbByQuant` (`q2`, `q3`, `q4`, `q6`, `q8`, `bf16`).
   - **Tip:** `weightsGbByQuant` and `kvPer32kGb` are **optional**! If you omit them when adding a model quickly, `src/utils/vram.ts` automatically estimates weights and KV cache from `totalParamsB`, `activeParamsB`, and `architecture`.

---

## 2. Minimal Template to Add a New Model (`src/data/models.json`)

Append an entry like this to `src/data/models.json`:

```json
{
  "id": "example-model-32b",
  "name": "ExampleCoder 32B",
  "creator": "Alibaba",
  "creatorColor": "#ff7018",
  "releaseDate": "2026-11",
  "license": "Apache 2.0",
  "licensePermissive": true,
  "architecture": "Dense",
  "totalParamsB": 32.0,
  "activeParamsB": 32.0,
  "sizeTier": "small",
  "reasoning": true,
  "contextWindowK": 256,
  "intelligenceScore": 21,
  "codingScore": 85,
  "codingBreakdown": {
    "liveCodeBench": 80,
    "sweBenchVerified": 70,
    "aiderPolyglot": 82
  },
  "recommendedQuant": "UD-Q4_K_XL",
  "weightsGbByQuant": {
    "q4": 19.4,
    "q8": 34.5
  },
  "sources": {
    "artificialAnalysis": "https://artificialanalysis.ai/models/open-source/small",
    "unsloth": "https://huggingface.co/unsloth"
  },
  "runCommand": "llama-server -hf unsloth/ExampleCoder-32B-GGUF:UD-Q4_K_XL -c 32768",
  "notes": "Fits 24GB RTX 3090/4090 at Q4 with Q8_0 KV cache."
}
```

### Size Tier Classification Rules (matching Artificial Analysis)
- `"tiny"`: `≤ 4B` total parameters
- `"small"`: `> 4B` to `40B` total parameters
- `"medium"`: `> 40B` to `150B` total parameters
- `"large"`: `> 150B` total parameters

---

## 3. Editing GPUs, Memory Bandwidth, Feedback Repo & FAQs
- **GitHub Feedback Repo URL:** Edit `src/data/siteConfig.json` (`githubRepoUrl` and `issueLabels`) so the **Suggest Model** form opens issues directly on your GitHub repository.
- **Hardware Presets:** Edit `src/data/gpus.json` (`vramGb`, `bandwidthGbS`, `examples`).
- **Unified & GPU Memory Bandwidth Leaderboard:** Edit `src/data/bandwidth.json` (`vendor`, `architecture`, `busWidthBits`, `usableVramGb`, `bandwidthGbS`, `tdpWatts`).
- **Quantization Guide & FAQs:** Edit `src/data/quantization.json` (`levels`, `formats`, `faqs`).
