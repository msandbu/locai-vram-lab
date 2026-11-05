# Contributing to LOCAI // Local VRAM Lab

Thank you for helping keep **LOCAI** the most accurate and up-to-date local AI model sizing and benchmark matrix!

---

## 🚀 How to Add a New Model

You can contribute a new model through either the **Web Interface** or by submitting a **Pull Request**.

### Method 1: Via the Dashboard (Fastest & No Git Required)

1. Open [https://locai-vram-lab.msandbu.workers.dev](https://locai-vram-lab.msandbu.workers.dev)
2. Click the **Suggest Model** button in the top navigation bar (or "Missing a model?" in the Model Matrix).
3. Fill out the model details (parameters, architecture, context window, benchmark scores).
4. Click **Submit via GitHub Issue**. This will auto-populate a pre-formatted GitHub issue with the exact JSON configuration entry ready to be merged!

---

### Method 2: Direct Pull Request (for Developers)

All model definitions live in [`src/data/models.json`](./src/data/models.json).

#### 1. Fork and Clone
```bash
git clone https://github.com/msandbu/locai-vram-lab.git
cd locai-vram-lab
npm install
```

#### 2. Add Your Model to `src/data/models.json`
Append your model entry into the array in `src/data/models.json`:

```json
{
  "id": "my-model-name-32b",
  "name": "My Model 32B (Instruct)",
  "creator": "Organization Name",
  "creatorColor": "#0d9488",
  "releaseDate": "2026-11",
  "license": "Apache 2.0",
  "licensePermissive": true,
  "architecture": "Dense",
  "totalParamsB": 32.5,
  "activeParamsB": 32.5,
  "sizeTier": "small",
  "reasoning": true,
  "contextWindowK": 128,
  "intelligenceScore": 38,
  "codingScore": 82,
  "codingBreakdown": {
    "liveCodeBench": 52.4,
    "sweBenchVerified": 41.2
  },
  "recommendedQuant": "Q4_K_M",
  "weightsGbByQuant": {
    "q4": 19.8,
    "q8": 34.2
  },
  "sources": {
    "huggingFace": "https://huggingface.co/org/model-name",
    "unsloth": "https://huggingface.co/unsloth/model-name-GGUF"
  },
  "runCommand": "ollama run my-model:32b",
  "notes": "Excellent performance on 24GB GPUs at Q4_K_M with 32K context."
}
```

#### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique lowercase slug (e.g. `qwen3-8b`) |
| `name` | string | Yes | Display name |
| `creator` | string | Yes | Model lab / creator (e.g. `Qwen`, `Meta`, `Mistral`) |
| `creatorColor` | string | Yes | Hex accent color for the monogram and chart dots |
| `releaseDate` | string | Yes | `YYYY-MM` release date |
| `license` | string | Yes | License name (e.g. `Apache 2.0`, `MIT`) |
| `licensePermissive`| boolean | Yes | `true` if OSI approved / commercial-friendly |
| `architecture` | `Dense` \| `MoE` | Yes | Model architecture type |
| `totalParamsB` | number | Yes | Total parameter count in Billions |
| `activeParamsB` | number | Yes | Active parameter count during decode (equals total for Dense) |
| `sizeTier` | string | Yes | `tiny` (≤4B), `small` (7–35B), `medium` (40–130B), `large` (150B+) |
| `reasoning` | boolean | Yes | `true` if model produces `<think>` reasoning traces |
| `contextWindowK`| number | Yes | Max native context length in Thousands (e.g. `128`) |
| `intelligenceScore`| number | Yes | Artificial Analysis Intelligence Index (v5 scale, 0–48) |
| `codingScore` | number | Yes | Composite coding capability score (0–100) |
| `codingBreakdown` | object | No | Specific benchmark scores (LCB, SWE-bench, Aider) |
| `recommendedQuant` | string | Yes | Sweet-spot precision (e.g. `Q4_K_M`) |
| `weightsGbByQuant` | object | No | Measured GGUF file sizes in GB (falls back to formula if omitted) |
| `sources` | object | No | Links to Hugging Face, Unsloth, or benchmarks |
| `runCommand` | string | No | CLI execution command (`ollama run ...` or `vllm`) |
| `notes` | string | No | Hardware verdict and memory characteristics |

#### 3. Test and Build
Ensure there are no TypeScript or schema errors:
```bash
npm run build
```

#### 4. Open a Pull Request
Push your branch and submit a PR to `main`. Once reviewed, it will be automatically deployed to the live Cloudflare site!
