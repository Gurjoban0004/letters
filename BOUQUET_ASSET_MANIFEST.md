# Digital Bouquet — asset manifest and style bible

Status: Phase 2 implementation complete. The approved rose, tulip, and daisy pilots anchor a complete 12-flower and five-greenery watercolor family, a registered four-color wrap/ribbon system, and the full recipient-experience artwork set.

## 1. Shared botanical style bible

Every flower and greenery asset must read as part of one bouquet when layered together.

Required art direction:

- delicate watercolor realism on translucent paper;
- romantic botanical illustration rather than photography or cartoon clip art;
- soft, diffuse light from the upper left;
- consistent front-facing three-quarter camera angle;
- complete stem visible with the stem base centered near the lower edge;
- graceful natural asymmetry, fine petal detail, and restrained saturation;
- no vase, wrapping, ribbon, cast background, labels, text, border, or UI;
- no cropped petals or leaves;
- transparent background with clean semitransparent watercolor edges;
- enough tonal separation to remain readable on cream, blush, lavender, and sage paper.

The rose, tulip, and daisy are the pilot set. They must be approved side by side before the remaining catalog is produced.

## 2. Export contract

| Variant | Format | Dimensions | Budget | Purpose |
| --- | --- | --- | --- | --- |
| Full botanical | WebP with alpha | 1024 px longest side | ≤150 KB target | Canvas composition |
| Catalog thumbnail | WebP with alpha | 192×192 px box | ≤15 KB target | Picker and lists |
| Opaque texture | WebP | Native reference ratio, minimum 2× display size | case-by-case | Background or paper |
| Envelope/reveal plate | WebP with alpha where isolated | minimum 2× largest display size | case-by-case | Recipient ritual |

Files are tightly trimmed, then padded to keep transforms from clipping. Full assets and thumbnails share the same crop and stem anchor. Do not chroma-key white backgrounds; cleanup must preserve real alpha and semitransparent watercolor edges.

Every manifest entry eventually records:

```json
{
  "id": "flower_rose_blush",
  "category": "flower",
  "file": "/bouquets/flowers/rose-blush.webp",
  "thumb": "/bouquets/thumbs/rose-blush.webp",
  "anchor": { "x": 0.5, "y": 0.94 },
  "defaultScale": 1,
  "relativeHeight": 1,
  "popular": true
}
```

Anchor coordinates are normalized from 0 to 1 and identify the stem base where wrapping closes around the arrangement.

## 3. Flower catalog

| ID | Display name | Role | Relative height | Pilot | Popular |
| --- | --- | --- | ---: | --- | --- |
| `flower_rose_blush` | Rose | focal | 1.00 | yes | yes |
| `flower_rose_ivory` | Ivory Rose | focal | 1.00 | no | yes |
| `flower_rose_crimson` | Crimson Rose | focal | 1.00 | no | yes |
| `flower_peony_pink` | Peony | focal | 0.96 | no | yes |
| `flower_peony_coral` | Coral Peony | focal | 0.96 | no | yes |
| `flower_tulip_rose` | Tulip | line | 1.02 | yes | yes |
| `flower_tulip_lavender` | Lavender Tulip | line | 1.02 | no | yes |
| `flower_daisy_cream` | Daisy | accent | 0.88 | yes | yes |
| `flower_sunflower_butter` | Sunflower | focal | 1.08 | no | yes |
| `flower_lily_blush` | Lily | focal | 1.10 | no | no |
| `flower_dahlia_rose` | Dahlia | focal | 0.94 | no | no |
| `flower_hydrangea_lilac` | Hydrangea | volume | 0.90 | no | no |
| `flower_hydrangea_blue` | Blue Hydrangea | volume | 0.90 | no | no |
| `flower_anemone_ivory` | Ivory Anemone | accent | 1.00 | no | no |
| `flower_ranunculus_peach` | Ranunculus | accent | 0.92 | no | no |
| `flower_cosmos_pink` | Cosmos | accent | 1.00 | no | no |
| `flower_lavender` | Lavender | line/filler | 1.12 | no | yes |
| `flower_babys_breath` | Baby’s Breath | filler | 1.04 | no | yes |

The relative heights are starting values for normalization, not final art judgments. Phase 2 approves them by comparing the full catalog together.

## 4. Greenery and fillers

| ID | Display name | Role | Relative height |
| --- | --- | --- | ---: |
| `greenery_eucalyptus` | Eucalyptus | rounded filler | 1.08 |
| `greenery_fern` | Fern | broad filler | 1.02 |
| `greenery_ivy` | Ivy | trailing filler | 1.12 |
| `greenery_olive` | Olive Branch | airy filler | 1.14 |
| `greenery_ruscus` | Ruscus | structural filler | 1.08 |

## 5. Wrapping and ribbon system

One approved wrap geometry and one approved bow geometry are recolored to preserve perfect alignment.

### Wrap layers

Each wrap has a back plate and front plate with the same registration box:

- `wrap_blush_back` / `wrap_blush_front`
- `wrap_parchment_back` / `wrap_parchment_front`
- `wrap_lavender_back` / `wrap_lavender_front`
- `wrap_sage_back` / `wrap_sage_front`

The back plate sits behind every stem. The front plate sits above stem bases and below the ribbon. The closure anchor and canvas center are identical for every color.

### Ribbon variants

- `ribbon_rose`
- `ribbon_peach`
- `ribbon_lavender`
- `ribbon_sage`

Every ribbon uses the same bow silhouette, shadow, anchor, and dimensions. Only material color changes.

## 6. Experience and supporting assets

| ID | Asset | Background | Use |
| --- | --- | --- | --- |
| `hero_bouquet` | Complete reference bouquet | transparent | Bouquet home hero |
| `botanical_corner` | Loose botanical corner | transparent | Home and empty states |
| `paper_bouquet_soft` | Soft cream/blush paper | opaque, tileable | Bouquet screens |
| `note_paper` | Small tactile note card | opaque | Message and reveal |
| `envelope_closed` | Closed bouquet envelope | transparent | Recipient arrival |
| `envelope_open` | Open envelope with depth | transparent | Recipient transition |
| `heart_seal` | Rose heart wax seal | transparent | Envelope closure |
| `wrap_shadow` | Subtle grounding shadow | transparent | Bouquet depth, if required after asset QA |

Do not manufacture hero or botanical illustrations from CSS shapes or decorative SVG approximations. Geometry-only UI icons may remain SVG.

## 7. Asset pipeline

1. Generate the three pilot botanicals from one shared prompt prefix.
2. Remove backgrounds without destroying translucent edges.
3. Trim and apply consistent transparent padding.
4. Normalize the stem base anchor and relative physical scale.
5. Export full and thumbnail WebP variants.
6. Record provenance, exact generation prompt, dimensions, byte size, anchor, and default scale.
7. Test on cream, blush, lavender, sage, and dark reveal backgrounds.
8. Approve the pilot family before producing the remaining catalog.
9. Generate the remainder, then approve the complete contact sheet.
10. Recolor the single approved wrap and ribbon geometry programmatically.

## 8. Per-asset QA gate

- no white or colored halo;
- transparent corners and clean holes between stems/leaves;
- consistent upper-left light;
- complete silhouette with no accidental crop;
- correct anchor at the stem base;
- believable size beside rose, tulip, and daisy references;
- readable thumbnail at 192 px;
- full and thumbnail budgets met;
- file paths and manifest entry valid;
- generation or source provenance embedded or recorded.

Phase 2 cannot pass while any required asset lacks a valid manifest entry or QA result.

## 9. Phase 2 production record

The exact built-in generation prompts are recorded in `BOUQUET_ASSET_PROMPTS.md`. Normalized runtime metadata for all 23 botanicals, the registered wrap/ribbon variants, and the seven experience assets lives in `src/bouquet/assets/manifest.json`. `scripts/process_bouquet_asset.py` is the repeatable botanical alpha validation, trim, registration, resize, WebP, thumbnail, and budget step; `scripts/process_bouquet_support_asset.py` creates the aligned wrap plates and ribbon recolors; `scripts/process_bouquet_experience_assets.py` normalizes reveal artwork and composes the hero and corner directly from the approved botanical family.

| Asset | Full export | Thumbnail | Anchor | QA |
| --- | ---: | ---: | --- | --- |
| Rose | 99,068 B · 768×1024 | 8,224 B · 192×192 | 0.50, 0.94 | Alpha, crop, scale, and budget pass |
| Tulip | 69,756 B · 768×1024 | 7,100 B · 192×192 | 0.50, 0.94 | Alpha, crop, scale, and budget pass |
| Daisy | 112,438 B · 768×1024 | 9,524 B · 192×192 | 0.50, 0.94 | Alpha, crop, scale, and budget pass |

The approved catalog now contains 18 flowers and five greenery pieces. Every full export uses a 768×1024 transparent registration canvas with a shared stem anchor at 0.50, 0.94; every full asset is below 150 KB and every 192×192 thumbnail is below 15 KB. Baby’s Breath uses a 0.78 default scale to retain its airy filler role and meet the edge-heavy watercolor budget without changing its shared canvas.

The wrap system now has four registered back/front plate pairs (blush, parchment, lavender, and sage), and the ribbon system has four color variants (rose, peach, lavender, and sage). The studio renderer sandwiches stems between the wrap plates and places the bow above the closure.

The recipient-experience set contains closed and open envelopes, an isolated heart seal, blank note paper, a composed hero bouquet, a composed botanical corner, and a soft opaque paper texture. Transparent assets were validated for real alpha and every output is recorded with dimensions, byte size, and provenance in the JSON manifest.

Open gate: review the complete set together in the private kitchen sink and approve Phase 2 before beginning the interactive builder core.
