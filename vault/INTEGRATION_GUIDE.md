# Letters (HG) — Comprehensive Asset & Integration Guide

> **Architecture, Physics Engine, Chroma Keying Pipeline, and React Implementation**  
> *Prepared for the Letters (HG) Project • Strictly self-contained inside `/vault`*

---

## Table of Contents
1. [Executive Summary & Vault Structure](#1-executive-summary--vault-structure)
2. [Complete Asset Inventory (5 Envelopes × 5 Papers)](#2-complete-asset-inventory-5-envelopes--5-papers)
3. [The 3-Layer CSS Sandwich Architecture](#3-the-3-layer-css-sandwich-architecture)
4. [Paper Physics & Motion Mechanics](#4-paper-physics--motion-mechanics)
   - [Tuck & Unfold Mathematical Curve](#tuck--unfold-mathematical-curve)
   - [Precision X / Y Offsets & 3D Tilt](#precision-x--y-offsets--3d-tilt)
   - [The Anti-Bleed Pocket Containment Formula (`clipPath`)](#the-anti-bleed-pocket-containment-formula-clippath)
5. [Chroma-Key Extraction Pipeline Reference](#5-chroma-key-extraction-pipeline-reference)
6. [CSS Tokens & Utility Classes](#6-css-tokens--utility-classes)
7. [HG React Integration Blueprint (Composer vs. Reader)](#7-hg-react-integration-blueprint-composer-vs-reader)
   - [Current Sprite System vs. Vault Alpha Assets](#current-sprite-system-vs-vault-alpha-assets)
   - [Mapping to HG's Phase Architecture](#mapping-to-hgs-phase-architecture)
   - [Copy-Paste React Components](#copy-paste-react-components)
     - [`LayeredEnvelope.tsx`](#component-1-layeredenvelopetsx)
     - [`StationeryPaper.tsx` (Typing & Reading Surface)](#component-2-stationerypapertsx-typing--reading-surface)
     - [`EnvelopeSealed.tsx`](#component-3-envelopesealedtsx)
     - [Updated Type Definitions for `letters.ts`](#updated-type-definitions-for-lettersts)

---

## 1. Executive Summary & Vault Structure

The `/vault` workspace is a standalone laboratory and asset processing workshop built to extract, calibrate, and assemble ultra-realistic stationery components for the Letters (HG) web application.

```
vault/
├── raw_inputs/              # Untouched source images copied from /better
├── pipeline/
│   ├── extract.py           # Multi-space chroma key & V-cut pocket extraction pipeline
│   └── requirements.txt     # Pillow, numpy, scipy
├── processed/               # High-res master outputs (WebP + PNG) + metadata.json
├── production_assets/       # Categorized folders per asset + manifest.json + tokens.css
│   ├── env_1_rose_silk/     # 4 layers (closed, open_full, open_front, open_back)
│   ├── env_2_ceramic_flower/
│   ├── env_3_botanical_stamp/
│   ├── env_4_pink_heart/
│   ├── env_5_lavender_floral/
│   ├── paper_1_botanical/   # 1 layer (paper_1.webp)
│   ├── paper_2_sparkle_bow/
│   ├── paper_3_floral_border/
│   ├── paper_4_lavender_lined/
│   ├── paper_5_cherry_blossom/
│   ├── tokens.css           # Drop-in CSS custom properties
│   └── manifest.json        # Machine-readable dimension & physics metadata
├── lab/                     # Interactive calibration workbench
│   ├── index.html           # Live desk workbench UI
│   ├── style.css            # Desk themes & layout styles
│   ├── app.js               # Physics controller & slider event logic
│   └── serve.py             # Local dev server (port 3030)
└── INTEGRATION_GUIDE.md     # This comprehensive guide
```

---

## 2. Complete Asset Inventory (5 Envelopes × 5 Papers)

Every envelope is extracted into **4 distinct layers**, allowing any letter paper to be physically slipped inside:

### Envelopes

| ID | Title & Aesthetic | BG Chroma | Closed Dimensions (Aspect) | Open Dimensions (Aspect) | Pocket Fold Rim (Cut Y / Center V) |
|---|---|---|---|---|---|
| **`env_1`** | **Rose Silk Ribbon & Bow**<br>Pink handmade paper, vertical & horizontal ribbon, knotted bow, gold heart pin | Blue `#0020ff` | 1197 × 1008 px (`1.188 : 1`) | 1060 × 1170 px (`0.906 : 1`) | `y = 345` → `y = 720` |
| **`env_2`** | **Ceramic Floral Brooch & Golden Twig**<br>Artisanal blush paper, sculpted ceramic blossom, tucked brass twig | Kelly Green `#03ab45` | 1166 × 872 px (`1.337 : 1`) | 1136 × 1218 px (`0.933 : 1`) | `y = 340` → `y = 710` |
| **`env_3`** | **Pressed Botanical & Vintage Stamp**<br>Speckled paper, dried floral branches, engraved rose stamp, cursive script | Chartreuse `[175, 251, 4]` | 1293 × 1169 px (`1.106 : 1`) | 1238 × 1364 px (`0.908 : 1`) | `y = 380` → `y = 790` |
| **`env_4`** | **Pink Floral Heart Envelope**<br>Handmade pink paper, fine botanical branches, 3D heart seal | Lime-Yellow `[205, 250, 1]` | 1704 × 1375 px (`1.239 : 1`) | 1369 × 1479 px (`0.926 : 1`) | `y = 510` → `y = 970` |
| **`env_5`** | **Lavender Floral Cosmos Envelope**<br>Lilac paper, 3D cosmos blossoms, golden leaves, botanical stamp & postmark | Dusty Rose `[245, 220, 215]` | 2277 × 1788 px (`1.274 : 1`) | 1291 × 1402 px (`0.921 : 1`) | `y = 475` → `y = 910` |

### Papers

| ID | Title & Aesthetic | Dimensions | Aspect Ratio | Safe Writing Margin (Padding) |
|---|---|---|---|---|
| **`paper_1`** | **Deckled Botanical Stationery**<br>Soft pink handmade paper, dried flower sprig, translucent washi tape | 1332 × 1398 px | `0.953 : 1` | `top: 12%`, `left: 14%`, `right: 16%`, `bottom: 18%` |
| **`paper_2`** | **Pink Sparkle Bow Stationery**<br>Blush deckled paper, 4-point sparkle stars, delicate ribbon bow | 1557 × 1417 px | `1.099 : 1` | `top: 14%`, `left: 14%`, `right: 14%`, `bottom: 18%` |
| **`paper_3`** | **Floral Border Botanical Paper**<br>Artisanal paper, continuous decorative border of pink buds and berries | 1353 × 1396 px | `0.969 : 1` | `top: 16%`, `left: 18%`, `right: 18%`, `bottom: 16%` |
| **`paper_4`** | **Lavender Lined Stationery**<br>Soft lilac paper with faint ruled writing lines, taped lavender sprig | 1397 × 1422 px | `0.982 : 1` | `top: 12%`, `left: 14%`, `right: 14%`, `bottom: 22%` |
| **`paper_5`** | **Cherry Blossom Deckled Paper**<br>Ivory handmade deckled paper, blooming cherry blossom corners, pink frame | 1560 × 1438 px | `1.085 : 1` | `top: 16%`, `left: 18%`, `right: 18%`, `bottom: 16%` |

> **Universal Permutation Rule**: Every one of the 5 papers can be inserted into any of the 5 envelopes (25 possible combinations).

---

## 3. The 3-Layer CSS Sandwich Architecture

To create the optical illusion of real paper slipping inside a physical pocket without 3D WebGL rendering, we use a 3-layer CSS sandwich:

```
                  ┌──────────────────────────────────────────────┐
                  │              .envelope-assembly               │
                  │       (position: relative, aspect-ratio)     │
                  └──────────────────────────────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
 ┌───────────────┐               ┌───────────────┐               ┌───────────────┐
 │  LAYER 1: BACK│               │ LAYER 2: PAPER│               │ LAYER 3: FRONT│
 │ (z-index: 1)  │               │ (z-index: 2)  │               │ (z-index: 3)  │
 ├───────────────┤               ├───────────────┤               ├───────────────┤
 │ Back interior │               │ Moving letter │               │ Front V-pocket│
 │ wall + open   │               │ sheet with    │               │ + ribbon bow /│
 │ top flap.     │               │ typed text.   │               │ ceramic seal. │
 └───────────────┘               └───────────────┘               └───────────────┘
```

### Downward V-Cut Pocket Geometry

In real envelopes, the front pocket forms a downward "V" shape (high at the edges, deep in the center). In `extract.py`, the pocket mask is calculated via:

```python
# w = width of open envelope, h = height of open envelope
# cut_y_start = where the fold starts on left/right edges
# v_center_y  = deepest point of the V in the middle
slope = (v_center_y - cut_y_start) / (w / 2.0)
dist_from_edge = np.minimum(x_grid, w - 1 - x_grid)
fold_rim = cut_y_start + dist_from_edge * slope

# Pixels below the fold rim belong to the front pocket
front_mask = (y_grid >= fold_rim)
```

Because `layer-front` sits at `z-index: 3` and contains only the pixels below this fold line, any paper placed at `z-index: 2` naturally slips *behind* the front flap and *in front of* the back flap.

---

## 4. Paper Physics & Motion Mechanics

### Tuck & Unfold Mathematical Curve

The lab converts a single normalized slider (`0` to `100%`) into smooth physical insertion:

$$\text{baseTopPercent} = 58.0 - \left(\frac{\text{tuck}}{100.0}\right) \times 78.0$$

- **`tuck = 0%` (Tucked Deep)**: `top: 58%` — The letter rests deep inside the envelope pocket. Only the top header peeks out.
- **`tuck = 50%` (Peeking Out)**: `top: 19%` — Halfway exposed, inviting the user to pull.
- **`tuck = 100%` (Reading Focus)**: `top: -20%` — Completely pulled out of the pocket, floating above the envelope for effortless reading.

#### Optical Pull / Scale Boost
To simulate pulling the paper closer to the viewer's eyes:
$$\text{effectiveScale} = \left(\frac{\text{scale}}{100.0}\right) \times \left(1.0 + \left(\frac{\text{tuck}}{100.0}\right) \times 0.08\right)$$
As the paper unfolds, it enlarges by up to 8% and casts a deeper drop-shadow.

### Precision X / Y Offsets & 3D Tilt

To ensure pixel-perfect positioning across differently shaped envelopes:
```javascript
rigPaper.style.top = `calc(${baseTopPercent}% + ${paperY}px)`;
rigPaper.style.left = `calc(50% + ${paperX}px)`;
rigPaper.style.width = `${effectiveScale * 100}%`;
rigPaper.style.transform = `translate(-50%, 0) rotate(${tiltVal}deg)`;
```

- **`paperY` (`-220px` to `+180px`)**: Shifts insertion depth up or down without breaking the tuck animation.
- **`paperX` (`-160px` to `+160px`)**: Adjusts horizontal centering.
- **`tilt` (`-12°` to `+12°`)**: Adds organic casualness to the letter placement.

### The Anti-Bleed Pocket Containment Formula (`clipPath`)

> [!IMPORTANT]
> When a tall paper sheet is inserted deep into an envelope (or tilted), its bottom corners can poke out beneath the bottom edge of the envelope.

Because `overflow: hidden` on the envelope container would clip the top flap and the unfolded paper, we apply a **dynamic bottom-only `clipPath`** on the paper element itself:

```javascript
// Measure bottom overflow relative to envelope body
const envH = envelopeRig.offsetHeight;
const paperTopPx = rigPaper.offsetTop;
const paperHPx = rigPaper.offsetHeight;
const overflowBottom = (paperTopPx + paperHPx) - envH;

if (overflowBottom > 0) {
  // Inset order: top, right, bottom, left
  // Negative values on top & sides ensure paper can stick out of the pocket
  // Only the bottom edge is clipped flush with the envelope base!
  rigPaper.style.clipPath = `inset(-600px -200px ${Math.ceil(overflowBottom)}px -200px)`;
} else {
  rigPaper.style.clipPath = 'none';
}
```

---

## 5. Chroma-Key Extraction Pipeline Reference

The Python pipeline in `vault/pipeline/extract.py` utilizes tailored keying algorithms for each studio background:

1. **`blue_screen_key` (`env_1`)**: Pure blue dominance. Keyed via `alpha = 1.0 - (B - max(R, G) - low) / (high - low)`. Includes blue despill to remove color bounce on paper edges.
2. **`kelly_green_key` (`env_2`)**: Green dominance. Keyed via `alpha = 1.0 - (G - max(R, B) - low) / (high - low)`.
3. **`chartreuse_key` (`env_3`, `env_4`)**: Euclidean color distance from studio reference `[175, 251, 4]` or `[205, 250, 1]`.
4. **`dusty_rose_key` (`env_5`)**: Warm blush Euclidean distance keying for non-green backgrounds.
5. **`paper_green_key` (All 5 Papers)**:
   - Evaluates Euclidean distance and `G - R` color gradient.
   - Extracts largest connected component (`ndimage.label`).
   - Fills internal holes (`ndimage.binary_fill_holes`).
   - Performs **binary erosion (2 iterations)** to cut 2px inward past the green halo.
   - Applies **Gaussian smoothing (`sigma=0.75`)** for natural feathered deckled paper edges.
   - Selectively despills green on semi-transparent edge pixels.

To re-run extraction at any time:
```bash
python3 vault/pipeline/extract.py
```

---

## 6. CSS Tokens & Utility Classes

Include `vault/production_assets/tokens.css` or paste into your global stylesheet.

### CSS Custom Properties
```css
/* Envelope dimensions & URLs */
--env-1-closed-aspect: 1197 / 1008;
--env-1-open-aspect: 1060 / 1170;
--env-1-closed-url: url('/production_assets/env_1_rose_silk/env_1_closed.webp');
--env-1-open-back-url: url('/production_assets/env_1_rose_silk/env_1_open_back.webp');
--env-1-open-front-url: url('/production_assets/env_1_rose_silk/env_1_open_front.webp');

/* Papers */
--paper-1-aspect: 1332 / 1398;
--paper-1-url: url('/production_assets/paper_1_botanical/paper_1.webp');
--paper-1-safe-area: 10% 12% 18% 12%;

/* Physics Controls */
--paper-tuck-top: 48%;
--paper-unfold-top: -20%;
--paper-y-offset: 0px;
--paper-x-offset: 0px;
```

---

## 7. HG React Integration Blueprint (Composer vs. Reader)

### Current Sprite System vs. Vault Alpha Assets

In the current HG app:
- `src/lib/letters.ts` uses sprite sheets (`envelopes-wide.jpg`, `envelopes-square.jpg`).
- `src/components/StationeryArt.tsx` computes sprite offset coordinates (`backgroundPosition: ...`).
- Envelopes cannot open with layered depth because they are flat sprite frames.

The Vault replaces this with **true multi-layer transparent WebP assets** that seamlessly support interactive reading, writing, and sealing flows.

### Mapping to HG's Phase Architecture

The HG composer screen (`src/screens/Stationery.tsx`) operates in distinct phases:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ phase: 'write'  │ ───►  │  phase: 'seal'  │ ───►  │  phase: 'open'  │
│ (Letter Composer)│       │ (Sealed Preview)│       │ (Reading Reveal)│
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
  <StationeryPaper>        <EnvelopeSealed>          <LayeredEnvelope>
   Flat high-res sheet      Closed envelope with      Full 3-layer sandwich.
   with live typing,        wax seal / ribbon.        Clicking causes paper
   safe margins, and        Hover tilt & shadows.     to glide out of pocket.
   handwriting font.
```

---

### Copy-Paste React Components

The following components are designed with **React + Framer Motion + TypeScript** for drop-in use in your HG project:

#### Component 1: `LayeredEnvelope.tsx`
*Use this in reading phase or mailbox reveal:*

```tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface LayeredEnvelopeProps {
  envelopeId?: 'env_1' | 'env_2' | 'env_3' | 'env_4' | 'env_5';
  paperId?: 'paper_1' | 'paper_2' | 'paper_3' | 'paper_4' | 'paper_5';
  initialUnfolded?: boolean;
  children?: React.ReactNode;
}

const ENVELOPE_DATA = {
  env_1: {
    back: '/stationery/env_1_rose_silk/env_1_open_back.webp',
    front: '/stationery/env_1_rose_silk/env_1_open_front.webp',
    aspect: '1060 / 1170',
    scale: 0.775,
  },
  env_2: {
    back: '/stationery/env_2_ceramic_flower/env_2_open_back.webp',
    front: '/stationery/env_2_ceramic_flower/env_2_open_front.webp',
    aspect: '1136 / 1218',
    scale: 0.76,
  },
  env_3: {
    back: '/stationery/env_3_botanical_stamp/env_3_open_back.webp',
    front: '/stationery/env_3_botanical_stamp/env_3_open_front.webp',
    aspect: '1238 / 1364',
    scale: 0.75,
  },
  env_4: {
    back: '/stationery/env_4_pink_heart/env_4_open_back_clean.webp',
    front: '/stationery/env_4_pink_heart/env_4_open_front.webp',
    aspect: '1369 / 1479',
    scale: 0.76,
  },
  env_5: {
    back: '/stationery/env_5_lavender_floral/env_5_open_back_clean.webp',
    front: '/stationery/env_5_lavender_floral/env_5_open_front.webp',
    aspect: '1291 / 1402',
    scale: 0.77,
  },
};

const PAPER_DATA = {
  paper_1: { url: '/stationery/paper_1_botanical/paper_1.webp', aspect: '1332 / 1398' },
  paper_2: { url: '/stationery/paper_2_sparkle_bow/paper_2.webp', aspect: '1557 / 1417' },
  paper_3: { url: '/stationery/paper_3_floral_border/paper_3.webp', aspect: '1353 / 1396' },
  paper_4: { url: '/stationery/paper_4_lavender_lined/paper_4.webp', aspect: '1397 / 1422' },
  paper_5: { url: '/stationery/paper_5_cherry_blossom/paper_5.webp', aspect: '1560 / 1438' },
};

export const LayeredEnvelope: React.FC<LayeredEnvelopeProps> = ({
  envelopeId = 'env_1',
  paperId = 'paper_1',
  initialUnfolded = false,
  children,
}) => {
  const [unfolded, setUnfolded] = useState(initialUnfolded);
  const env = ENVELOPE_DATA[envelopeId];
  const paper = PAPER_DATA[paperId];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 520,
        aspectRatio: env.aspect,
        margin: '0 auto',
        cursor: 'pointer',
      }}
      onClick={() => setUnfolded(!unfolded)}
    >
      {/* LAYER 1: Back Wall & Flap */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage: `url(${env.back})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center bottom',
          pointerEvents: 'none',
        }}
      />

      {/* LAYER 2: Sliding Letter Paper */}
      <motion.div
        animate={{
          top: unfolded ? '-22%' : '48%',
          scale: unfolded ? 1.05 : 1.0,
        }}
        transition={{ type: 'spring', damping: 24, stiffness: 180 }}
        style={{
          position: 'absolute',
          zIndex: 2,
          left: '50%',
          width: `${env.scale * 100}%`,
          aspectRatio: paper.aspect,
          transform: 'translateX(-50%)',
          backgroundImage: `url(${paper.url})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          boxShadow: unfolded
            ? '0 24px 48px -12px rgba(81, 54, 61, 0.38)'
            : '0 8px 20px -8px rgba(81, 54, 61, 0.25)',
          padding: '10% 12% 16% 12%',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {children}
      </motion.div>

      {/* LAYER 3: Front Pocket */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          backgroundImage: `url(${env.front})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center bottom',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 6px 14px rgba(81, 54, 61, 0.12))',
        }}
      />
    </div>
  );
};
```

---

#### Component 2: `StationeryPaper.tsx` (Typing & Reading Surface)
*Use this in `phase === 'write'` for live typing with handwriting fonts:*

```tsx
import React from 'react';

interface StationeryPaperProps {
  paperId?: 'paper_1' | 'paper_2' | 'paper_3' | 'paper_4' | 'paper_5';
  fontFamily?: 'Caveat' | 'Newsreader' | 'Instrument Serif';
  value: string;
  onChange?: (text: string) => void;
  readOnly?: boolean;
}

const PAPER_CONFIGS = {
  paper_1: { url: '/stationery/paper_1_botanical/paper_1.webp', padding: '12% 14% 18% 14%' },
  paper_2: { url: '/stationery/paper_2_sparkle_bow/paper_2.webp', padding: '12% 10% 14% 10%' },
  paper_3: { url: '/stationery/paper_3_floral_border/paper_3.webp', padding: '14% 14% 14% 14%' },
  paper_4: { url: '/stationery/paper_4_lavender_lined/paper_4.webp', padding: '10% 12% 20% 12%' },
  paper_5: { url: '/stationery/paper_5_cherry_blossom/paper_5.webp', padding: '10% 12% 14% 12%' },
};

export const StationeryPaper: React.FC<StationeryPaperProps> = ({
  paperId = 'paper_1',
  fontFamily = 'Caveat',
  value,
  onChange,
  readOnly = false,
}) => {
  const config = PAPER_CONFIGS[paperId];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 580,
        aspectRatio: '1 / 1.08',
        margin: '0 auto',
        backgroundImage: `url(${config.url})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        boxShadow: '0 12px 36px -10px rgba(81, 54, 61, 0.22)',
        padding: config.padding,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {readOnly ? (
        <div
          style={{
            fontFamily: fontFamily,
            fontSize: '22px',
            lineHeight: 1.7,
            color: '#51363d',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            width: '100%',
            height: '100%',
            overflowY: 'auto',
          }}
        >
          {value}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Pour your heart onto the page..."
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: fontFamily,
            fontSize: '22px',
            lineHeight: 1.7,
            color: '#51363d',
          }}
        />
      )}
    </div>
  );
};
```

---

#### Component 3: `EnvelopeSealed.tsx`
*Use this in `phase === 'seal'` or in your letter index grid:*

```tsx
import React from 'react';
import { motion } from 'framer-motion';

interface EnvelopeSealedProps {
  envelopeId?: 'env_1' | 'env_2' | 'env_3' | 'env_4' | 'env_5';
  onClick?: () => void;
}

const SEALED_DATA = {
  env_1: { url: '/stationery/env_1_rose_silk/env_1_closed.webp', aspect: '1197 / 1008' },
  env_2: { url: '/stationery/env_2_ceramic_flower/env_2_closed.webp', aspect: '1166 / 872' },
  env_3: { url: '/stationery/env_3_botanical_stamp/env_3_closed.webp', aspect: '1293 / 1169' },
  env_4: { url: '/stationery/env_4_pink_heart/env_4_closed.webp', aspect: '2125 / 1375' },
  env_5: { url: '/stationery/env_5_lavender_floral/env_5_closed.webp', aspect: '2348 / 1789' },
};

export const EnvelopeSealed: React.FC<EnvelopeSealedProps> = ({
  envelopeId = 'env_1',
  onClick,
}) => {
  const item = SEALED_DATA[envelopeId];

  return (
    <motion.div
      whileHover={{ y: -6, rotate: -1, filter: 'drop-shadow(0 20px 32px rgba(81, 54, 61, 0.24))' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      onClick={onClick}
      style={{
        width: '100%',
        maxWidth: 520,
        aspectRatio: item.aspect,
        backgroundImage: `url(${item.url})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        filter: 'drop-shadow(0 14px 24px rgba(81, 54, 61, 0.16))',
        cursor: 'pointer',
        margin: '0 auto',
      }}
    />
  );
};
```

---

#### Updated Type Definitions for `letters.ts`

When ready to integrate into HG, update the `Envelope` interface to reference individual assets:

```typescript
export interface VaultEnvelope {
  id: string;
  name: string;
  badge: string;
  closedUrl: string;
  openBackUrl: string;
  openFrontUrl: string;
  closedAspect: string;
  openAspect: string;
  defaultScale: number;
}

export const VAULT_ENVELOPES: VaultEnvelope[] = [
  {
    id: 'env_1',
    name: 'Rose Silk Ribbon & Bow',
    badge: 'Silk Bow',
    closedUrl: '/stationery/env_1_rose_silk/env_1_closed.webp',
    openBackUrl: '/stationery/env_1_rose_silk/env_1_open_back.webp',
    openFrontUrl: '/stationery/env_1_rose_silk/env_1_open_front.webp',
    closedAspect: '1197 / 1008',
    openAspect: '1060 / 1170',
    defaultScale: 0.775,
  },
  {
    id: 'env_2',
    name: 'Ceramic Floral Brooch',
    badge: 'Ceramic Brooch',
    closedUrl: '/stationery/env_2_ceramic_flower/env_2_closed.webp',
    openBackUrl: '/stationery/env_2_ceramic_flower/env_2_open_back.webp',
    openFrontUrl: '/stationery/env_2_ceramic_flower/env_2_open_front.webp',
    closedAspect: '1166 / 872',
    openAspect: '1136 / 1218',
    defaultScale: 0.76,
  },
  {
    id: 'env_3',
    name: 'Pressed Botanical Stamp',
    badge: 'Vintage Stamp',
    closedUrl: '/stationery/env_3_botanical_stamp/env_3_closed.webp',
    openBackUrl: '/stationery/env_3_botanical_stamp/env_3_open_back.webp',
    openFrontUrl: '/stationery/env_3_botanical_stamp/env_3_open_front.webp',
    closedAspect: '1293 / 1169',
    openAspect: '1238 / 1364',
    defaultScale: 0.75,
  },
  {
    id: 'env_4',
    name: 'Pink Floral Heart',
    badge: 'Heart Seal',
    closedUrl: '/stationery/env_4_pink_heart/env_4_closed.webp',
    openBackUrl: '/stationery/env_4_pink_heart/env_4_open_back.webp',
    openFrontUrl: '/stationery/env_4_pink_heart/env_4_open_front.webp',
    closedAspect: '2125 / 1375',
    openAspect: '1978 / 1479',
    defaultScale: 0.76,
  },
  {
    id: 'env_5',
    name: 'Lavender Floral Cosmos',
    badge: 'Lavender Blooms',
    closedUrl: '/stationery/env_5_lavender_floral/env_5_closed.webp',
    openBackUrl: '/stationery/env_5_lavender_floral/env_5_open_back.webp',
    openFrontUrl: '/stationery/env_5_lavender_floral/env_5_open_front.webp',
    closedAspect: '2348 / 1789',
    openAspect: '2752 / 1536',
    defaultScale: 0.77,
  },
];
```
