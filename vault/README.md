# HG Vault: Stationery Lab & Asset Production Pipeline

A dedicated, isolated laboratory and production pipeline environment for extracting, assembling, calibrating, and dialing in stationery assets (envelopes & deckled papers) for the **Letters (HG)** application.

> **Zero Changes Rule**: Everything inside this directory (`vault/`) is 100% self-contained and clean. It does not modify any source code in the main HG application.

---

## 📖 Comprehensive Integration Guide

For the full architectural breakdown, physics formulas, anti-bleed `clipPath` mathematics, and drop-in React components:
👉 **[Read `vault/INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md)**

---

## 📁 Vault Structure

```
vault/
├── raw_inputs/                 # Clean copies of source mockup images from /better
│   ├── env_1.jpeg … env_5_*.jpeg
│   └── paper_1.png … paper_5.jpeg
├── pipeline/                   # Production extraction pipeline
│   ├── extract.py              # Multi-space chroma-keying, despill, feathering & layer slicing
│   └── requirements.txt        # Pillow, numpy, scipy
├── processed/                  # Extracted transparent WebP + PNG layers
│   ├── env_1_* through env_5_* (closed, open_full, open_front, open_back)
│   ├── paper_1 through paper_5 (high-res WebP + PNG)
│   └── metadata.json           # Aspect ratios, dimensions, safe areas, and tuck coordinates
├── lab/                        # Interactive Visual Workbench (Standalone Web Application)
│   ├── index.html              # Lab UI: assembly physics, typography preview, edge inspector
│   ├── app.js                  # Physics controller, layer sliders, typography bindings
│   ├── style.css               # Warm desk aesthetic matching Letters design tokens
│   └── serve.py                # Zero-dependency local development server (port 3030)
├── production_assets/          # Final dialed-in bundle ready for the HG application
│   ├── env_1_rose_silk/        # 4 layers per envelope
│   ├── env_2_ceramic_flower/
│   ├── env_3_botanical_stamp/
│   ├── env_4_pink_heart/
│   ├── env_5_lavender_floral/
│   ├── paper_1_botanical/      # 1 layer per stationery paper
│   ├── paper_2_sparkle_bow/
│   ├── paper_3_floral_border/
│   ├── paper_4_lavender_lined/
│   ├── paper_5_cherry_blossom/
│   ├── manifest.json           # Full asset manifest
│   └── tokens.css              # Drop-in CSS classes and variables ready for HG
└── INTEGRATION_GUIDE.md        # Complete technical & React integration manual
```

---

## 🚀 How to Launch the Lab

### Option 1: Double-Click / Direct Browser Open (Zero Setup)
Simply open `vault/lab/index.html` directly in your browser:
```
file:///Users/gurjobansingh/Desktop/Projects/HG/vault/lab/index.html
```

### Option 2: Run via Local Server
Run the lightweight server from terminal:
```bash
python3 vault/lab/serve.py 3030
```
Then visit:
```
http://localhost:3030/lab/index.html
```

---

## 🔬 Lab Features & Capabilities

1. **Universal Permutations**: Choose any of the **5 envelopes** and pair it with any of the **5 papers** (25 combinations).
2. **Interactive Assembly & Physics Stage**:
   - **🎯 Snap & Center**: Instantly places the paper in the exact center ($X=0$) with the natural tuck depth.
   - **Envelope Y Offset Slider**: Adjusts envelope vertical framing ($-120\text{px}$ to $+120\text{px}$).
   - **Paper Y Axis Slider (Insertion Depth)**: Fine-tune how deeply the letter is tucked into the envelope pocket ($-220\text{px}$ to $+180\text{px}$).
   - **Paper X Axis Slider (Horizontal Centering)**: Control horizontal placement ($-160\text{px}$ to $+160\text{px}$) to avoid shifting or bleeding to either side.
   - **🛡️ Pocket Containment (No Bleed)**: Automatically clips any portion of the paper that would otherwise peek out from underneath the envelope's bottom edge using `clipPath: inset(...)`.
   - **✨ Clean Lining Mode**: Hides the studio mockup's card so that `paper_1` is the sole letter inside the envelope.
   - **Tuck / Pull Out Slider (0% to 100%)**: Physically slide the paper in and out of the real envelope pocket behind the front seal/ribbon.
   - **Envelope States**: Toggle between *Open (Layered Pocket)*, *Closed (Sealed / Ribbon)*, and *Open (Static Card)*.
   - **Paper Scale, Tilt & 3D Perspective**: Fine-tune rotation angle, scale percentage, and desk perspective.
   - **Real-Time Typography**: Live-edit letter prose on the paper using *Caveat* (Handwritten), *Newsreader* (Literary), *Instrument Serif*, or *System Sans*.
   - **Safe Area Overlay**: Toggle visual dashed bounding box to verify that text never collides with flowers, borders, or washi tape.

3. **Component & Mask Inspector**:
   - High-contrast background switcher:
     - **Milky Blush** (`#f8eeee` - Letters default desk)
     - **Ivory Surface** (`#fffafa` - Letters surface)
     - **Pure White** (`#ffffff` - Inspects dark edge bleeding)
     - **Dark Velvet** (`#1a0f13` - Scrutinizes any white/light halo or fringe)
     - **Checkerboard** (Verifies 100% alpha transparency)
   - Inspect all 5 envelope sets and 5 papers side-by-side.

4. **Production Specs & Drop-In Code**:
   - View and copy `tokens.css` with exact aspect ratios, z-indexes, and drop-shadows calibrated for HG.
   - Component manifest (`manifest.json`).

---

## ⚙️ Running the Extraction Pipeline via Terminal

To re-run the extraction pipeline anytime:
```bash
python3 vault/pipeline/extract.py
```
Outputs are automatically placed into `vault/processed/` and `vault/production_assets/`.
