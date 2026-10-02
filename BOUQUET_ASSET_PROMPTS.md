# Bouquet asset prompts

These are the exact built-in image-generation prompts used for the Phase 2 pilot family. `bouquet.png` was supplied as a style and palette reference only.

## Position-neutral color expansion

The following production stems were generated on 2026-10-02 to broaden the catalog without creating flowers that only look correct on one side of a bouquet. Each request used the same prompt below, replacing the bracketed subject and palette lines with the listed variant.

```text
Use case: stylized-concept
Asset type: transparent reusable flower stem for the Bloom bouquet builder
Input image: bouquet.png is a style and palette reference only, not an edit target
Primary request: create one [variant] stem as a production asset
Subject: one full-length [flower description] facing directly toward viewer, mostly straight centered stem, balanced leaves
Style/medium: delicate watercolor realism on translucent paper, matching reference
Composition: isolated vertical, front-facing, position-neutral, no left/right lean, complete stem visible, base centered, transparent padding
Lighting: soft diffuse, quiet romantic
Palette: [variant palette]
Constraints: genuine transparent background, clean semitransparent edges, no glow/halo/backdrop/haze, one stem only, no vase/wrap/ribbon/hands/text/UI/watermark
Avoid: side-facing, diagonal, strong bend, multiple flowers, photographic cutout, hard vector/cartoon/shadow/oversaturation
```

- Ivory Rose: `variant: ivory garden rose` / `flower description: open warm-ivory garden rose with a small blush heart and two restrained sage leaves` / `variant palette: warm ivory, pale blush, muted sage, soft olive`
- Crimson Rose: `variant: deep crimson garden rose` / `flower description: open velvet-crimson garden rose with two restrained sage leaves` / `variant palette: dusty crimson, wine red, warm highlights, muted sage`
- Coral Peony: `variant: coral peony` / `flower description: lush open coral-peach peony with layered petals, one small bud, and balanced sage leaves` / `variant palette: coral, peach blush, warm cream, muted sage`
- Lavender Tulip: `variant: lavender tulip` / `flower description: softly open lavender tulip cup with a straight slender stem and two balanced tapered leaves` / `variant palette: dusty lavender, pale lilac, muted sage and olive`
- Blue Hydrangea: `variant: powder-blue hydrangea` / `flower description: rounded powder-blue hydrangea cluster with many small florets, a straight stem, and two balanced broad leaves` / `variant palette: powder blue, periwinkle, pale lilac, muted sage`
- Ivory Anemone: `variant: ivory anemone` / `flower description: open ivory anemone with a dark plum center, a straight fine stem, and balanced restrained leaves` / `variant palette: warm ivory, muted plum, pale blush, sage green`

The Ivory Rose request used the same wording but omitted `no glow/halo/backdrop/haze` from the constraints. All six outputs were normalized through the repository’s bouquet asset processor before use.

## Rose

```text
Use case: stylized-concept
Asset type: transparent botanical stem for a mobile bouquet composition canvas
Input image: bouquet.png is a style and palette reference only, not an edit target
Primary request: create one complete blush garden rose stem as an isolated production asset
Subject: a romantic open rose bloom in dusty blush pink with a slender natural green stem and two small leaves; complete silhouette and stem base visible
Style/medium: delicate watercolor botanical realism on translucent paper, matching the reference board's refined hand-painted flower catalog; fine petal detail, subtle pigment blooms, graceful natural asymmetry, restrained saturation
Composition/framing: single upright stem, front-facing three-quarter botanical angle, centered, generous transparent padding, no crop; stem base centered near the lower edge
Lighting/mood: soft diffuse light from upper left, tender and intimate
Color palette: blush pink, muted rose, soft sage, warm cream highlights
Constraints: genuinely transparent background with clean semitransparent watercolor edges and transparent holes between leaves and stem; no white matte; no cast background; no vase; no wrapping; no ribbon; no text; no labels; no border; no UI; no watermark
Avoid: clip art, cartoon outlines, photoreal product photography, hard shadows, oversaturation, cropped petals, extra detached objects
```

## Tulip

```text
Use case: stylized-concept
Asset type: transparent botanical stem for a mobile bouquet composition canvas
Input image: bouquet.png is a style and palette reference only, not an edit target
Primary request: create one complete rose-pink tulip stem as an isolated production asset in the same illustrated family as the approved blush rose pilot
Subject: a graceful single tulip with a softly closed-to-opened rose-pink cup, long slender natural green stem, and two elegant tapered leaves; complete silhouette and stem base visible
Style/medium: delicate watercolor botanical realism on translucent paper matching the reference board; fine petal detail, subtle pigment blooms, graceful natural asymmetry, restrained saturation
Composition/framing: single upright stem, front-facing three-quarter botanical angle, centered, generous transparent padding, no crop; stem base centered near lower edge; maintain realistic relative scale beside a garden rose
Lighting/mood: soft diffuse light from upper left, tender and intimate
Color palette: muted rose pink, blush highlights, soft sage and olive green
Constraints: genuinely transparent background with clean semitransparent watercolor edges and transparent holes between leaves and stem; no white matte; no glow or cast background; no vase; no wrapping; no ribbon; no text; no labels; no border; no UI; no watermark
Avoid: clip art, cartoon outlines, photoreal product photography, hard shadows, oversaturation, cropped leaves, extra detached objects
```

## Daisy

```text
Use case: stylized-concept
Asset type: transparent botanical stem for a mobile bouquet composition canvas
Input image: bouquet.png is a style and palette reference only, not an edit target
Primary request: create one complete cream daisy spray as an isolated production asset in the same illustrated family as the blush rose and rose-pink tulip pilots
Subject: one main ivory daisy bloom with a warm butter-gold center, one smaller side bloom and a tiny bud on branching slender stems with restrained soft green leaves; complete silhouette and stem base visible
Style/medium: delicate watercolor botanical realism on translucent paper matching the reference board; fine petal detail, subtle pigment blooms, graceful natural asymmetry, restrained saturation
Composition/framing: upright airy stem, front-facing three-quarter botanical angle, centered, generous transparent padding, no crop; stem base centered near lower edge; slightly shorter visual mass than rose and tulip
Lighting/mood: soft diffuse light from upper left, tender and intimate
Color palette: warm ivory, soft cream, butter yellow, muted sage and olive green
Constraints: genuinely transparent background with clean semitransparent watercolor edges and transparent holes between petals, leaves, and stems; no white matte; no glow or cast background; no vase; no wrapping; no ribbon; no text; no labels; no border; no UI; no watermark
Avoid: clip art, cartoon outlines, photoreal product photography, hard shadows, oversaturation, cropped petals, extra detached objects
```

## Approved-family expansion

The remaining flowers were generated with one of the following exact shared prompt blocks plus the asset-specific lines listed below.

### Shared flower prompt A

```text
Use case: stylized-concept
Asset type: transparent botanical stem for the approved Bloom mobile bouquet composition canvas
Input image: bouquet.png is the approved style and palette reference only, not an edit target
Style/medium: delicate watercolor botanical realism on translucent paper in the approved rose, tulip, daisy, and peony family; fine natural detail, subtle pigment blooms, graceful asymmetry, restrained saturation
Composition/framing: one isolated upright botanical stem, front-facing three-quarter angle, centered with generous transparent padding and no crop; complete silhouette and stem base centered near the lower edge
Lighting/mood: soft diffuse light from upper left, tender and intimate
Constraints: genuinely transparent background with clean semitransparent watercolor edges and transparent holes; no white matte or glow; no vase; no wrapping; no ribbon; no text; no labels; no border; no UI; no watermark
Avoid: clip art, cartoon outlines, photographic cutout, hard shadows, oversaturation, cropped petals or leaves, detached objects
```

This block was combined with:

- Sunflower: `Primary request: create one complete butter-yellow sunflower stem as an isolated production asset` / `Subject: one warm golden sunflower bloom with a detailed umber center, a tall natural green stem, and two broad restrained leaves; realistic scale slightly taller than the approved rose` / `Color palette: butter yellow, warm ochre, muted umber, sage and olive green`
- Lily: `Primary request: create one complete blush-white lily stem as an isolated production asset` / `Subject: one elegant open lily bloom with warm ivory petals washed with the palest blush, subtle stamens, one small side bud, a long natural stem, and restrained lance leaves; realistic scale slightly taller than the approved rose` / `Color palette: warm ivory, pale blush, muted peach stamens, sage and olive green`
- Dahlia: `Primary request: create one complete coral-pink dahlia stem as an isolated production asset` / `Subject: one structured layered dahlia bloom with many softly pointed watercolor petals, a slender natural stem, and two restrained leaves; realistic scale slightly shorter than the approved rose` / `Color palette: dusty coral pink, rose shadows, warm cream highlights, muted sage green`
- Hydrangea: `Primary request: create one complete lilac hydrangea stem as an isolated production asset` / `Subject: one rounded airy hydrangea cluster made of many small four-petal florets, a natural green stem, and two broad restrained leaves; realistic scale slightly shorter than the approved rose` / `Color palette: dusty lilac, periwinkle, pale blush accents, muted sage green`

### Shared flower prompt B

```text
Use case: stylized-concept
Asset type: transparent botanical stem for the approved Bloom mobile bouquet composition canvas
Input image: bouquet.png is the approved style and palette reference only, not an edit target
Style/medium: delicate watercolor botanical realism on translucent paper in the approved Bloom flower family; fine natural detail, subtle pigment blooms, graceful asymmetry, restrained saturation
Composition/framing: one isolated upright botanical stem, front-facing three-quarter angle, centered with generous transparent padding and no crop; complete silhouette and stem base centered near the lower edge
Lighting/mood: soft diffuse light from upper left, tender and intimate
Constraints: genuinely transparent background with clean semitransparent watercolor edges and transparent holes; no white matte or glow; no vase; no wrapping; no ribbon; no text; no labels; no border; no UI; no watermark
Avoid: clip art, cartoon outlines, photographic cutout, hard shadows, oversaturation, cropped petals or leaves, detached objects
```

This block was combined with:

- Ranunculus: `Primary request: create one complete peach-blush ranunculus stem as an isolated production asset` / `Subject: one many-layered round ranunculus bloom with delicate curled petals, a slender natural stem, one tiny side bud, and restrained leaves; realistic scale slightly shorter than the approved rose` / `Color palette: pale peach, blush pink, warm cream highlights, muted sage green`
- Cosmos: `Primary request: create one complete soft pink cosmos stem as an isolated production asset` / `Subject: one airy open cosmos bloom with eight delicate petals and a small butter-gold center, a fine branching natural stem, one smaller side bloom, and feathery restrained leaves; realistic scale matching the approved rose` / `Color palette: soft pink, pale blush, butter gold, muted sage green`
- Lavender: `Primary request: create one complete lavender spray as an isolated production asset` / `Subject: three slender lavender flower spikes on one gathered natural stem with narrow restrained leaves; airy line-and-filler silhouette, realistic scale taller than the approved rose` / `Color palette: dusty lavender, muted violet, soft sage and olive green`
- Baby’s Breath: `Primary request: create one complete baby's breath spray as an isolated production asset` / `Subject: an airy branching spray of many tiny warm-white blossoms and buds on fine natural green stems with very small restrained leaves; filler silhouette, realistic scale slightly taller than the approved rose` / `Color palette: warm white, cream, palest blush, muted sage green`

### Peony prompt

```text
Use case: stylized-concept
Asset type: transparent botanical stem for the approved Bloom mobile bouquet composition canvas
Input image: bouquet.png is the approved style and palette reference only, not an edit target
Primary request: create one complete soft pink peony stem as an isolated production asset in the approved rose, tulip, and daisy watercolor family
Subject: one lush open peony with layered pale-pink petals, a slender natural green stem, one small side bud, and two restrained leaves; complete silhouette and stem base visible
Style/medium: delicate watercolor botanical realism on translucent paper, fine petal detail, subtle pigment blooms, graceful natural asymmetry, restrained saturation
Composition/framing: single upright stem, front-facing three-quarter botanical angle, centered, generous transparent padding, no crop; stem base centered near lower edge; realistic scale beside the approved rose
Lighting/mood: soft diffuse light from upper left, tender and intimate
Color palette: pale peony pink, blush shadows, warm cream highlights, muted sage green
Constraints: genuinely transparent background with clean semitransparent watercolor edges and transparent holes; no white matte or glow; no vase; no wrapping; no ribbon; no text; no labels; no border; no UI; no watermark
Avoid: clip art, cartoon outlines, photographic cutout, hard shadows, oversaturation, cropped petals, detached objects
```

## Greenery family

```text
Use case: stylized-concept
Asset type: transparent greenery stem for the approved Bloom mobile bouquet composition canvas
Input image: bouquet.png is the approved style and palette reference only, not an edit target
Style/medium: delicate watercolor botanical realism on translucent paper in the approved Bloom flower family; fine natural leaf detail, subtle pigment blooms, graceful asymmetry, restrained saturation
Composition/framing: one isolated upright greenery stem, front-facing three-quarter botanical angle, centered with generous transparent padding and no crop; complete silhouette and stem base centered near the lower edge
Lighting/mood: soft diffuse light from upper left, tender and intimate
Color palette: muted sage, dusty eucalyptus, quiet olive, soft moss, warm gray-green
Constraints: genuinely transparent background with clean semitransparent watercolor edges and transparent holes between leaves and stems; no white matte or glow; no flowers unless botanically inherent; no vase; no wrapping; no ribbon; no text; no labels; no border; no UI; no watermark
Avoid: clip art, cartoon outlines, photographic cutout, hard shadows, neon green, oversaturation, cropped leaves, detached objects
```

This block was combined with:

- Eucalyptus: `Primary request: create one complete eucalyptus stem as an isolated production asset` / `Subject: an airy branching eucalyptus sprig with rounded coin-shaped leaves in varied sizes; realistic scale slightly taller than the approved rose`
- Fern: `Primary request: create one complete fern frond as an isolated production asset` / `Subject: one elegant arching fern frond with delicate alternating leaflets and a natural tapered tip; realistic scale matching the approved rose`
- Ivy: `Primary request: create one complete ivy stem as an isolated production asset` / `Subject: one graceful trailing ivy vine presented upright with a gentle curve, several small lobed leaves, and visible spaces between them; realistic scale taller than the approved rose`
- Olive Branch: `Primary request: create one complete olive branch as an isolated production asset` / `Subject: one airy olive branch with many narrow silver-green leaves and a few tiny muted olive fruits; realistic scale taller than the approved rose`
- Ruscus: `Primary request: create one complete ruscus stem as an isolated production asset` / `Subject: one structural ruscus stem with alternating pointed oval leaves and clean negative space; realistic scale slightly taller than the approved rose`

## Wrapping paper

```text
Use case: stylized-concept
Asset type: transparent bouquet wrapping artwork for the approved Bloom composition canvas
Input image: bouquet.png is the approved style, geometry, and palette reference only, not an edit target
Primary request: create one empty blush bouquet paper wrap as a reusable isolated production asset, with no flowers or stems
Subject: a front-facing romantic florist paper cradle with two softly folded upper side flaps, an open central pocket for stems, layered translucent blush tissue, and a tapered gathered lower section; clean symmetrical registration with gentle hand-folded asymmetry
Style/medium: delicate watercolor realism on translucent paper, subtle paper fibers, soft pigment variation, refined and tactile
Composition/framing: centered upright wrap, full silhouette visible, generous transparent padding, lower closure centered near the bottom; designed to sit behind flower heads and in front of stem bases
Lighting/mood: soft diffuse light from upper left
Color palette: blush pink, petal pink, warm cream highlights
Constraints: genuinely transparent background with clean semitransparent watercolor edges; no flowers; no greenery; no stems; no bow; no ribbon; no hands; no vase; no text; no labels; no border; no UI; no watermark
Avoid: sharp digital polygons, flat vector art, gift bag, envelope, photographic cutout, hard shadows, oversaturation
```

## Ribbon bow

```text
Use case: stylized-concept
Asset type: transparent ribbon bow artwork for the approved Bloom bouquet composition canvas
Input image: bouquet.png is the approved style, geometry, and palette reference only, not an edit target
Primary request: create one rose-blush florist ribbon bow as a reusable isolated production asset
Subject: a front-facing hand-tied satin bow with a soft central knot, two rounded loops, and two graceful trailing tails; refined romantic proportions matching the reference bouquet
Style/medium: delicate watercolor realism on translucent paper, soft satin sheen, restrained pigment blooms, tactile fabric folds
Composition/framing: centered horizontal bow, complete silhouette visible, generous transparent padding, no crop; clean anchor at the knot center
Lighting/mood: soft diffuse light from upper left
Color palette: dusty rose, blush, warm cream highlights
Constraints: genuinely transparent background with clean semitransparent edges; bow only; no wrapping paper; no flowers; no stems; no hands; no text; no labels; no border; no UI; no watermark
Avoid: cartoon bow, hard vector edges, gift-box bow, photographic cutout, hard shadows, oversaturation
```

## Closed envelope

```text
Use case: stylized-concept
Asset type: transparent closed-envelope artwork for the Bloom bouquet recipient reveal
Primary request: create one closed romantic florist envelope as a reusable isolated production asset
Subject: a front-facing landscape envelope made from warm cream handmade paper, with a gently pointed back flap and a small circular dusty-rose wax seal centered on the flap; subtle paper fibers and faint blush edge tint
Style/medium: delicate watercolor realism on translucent paper, refined tactile stationery matching a romantic blush-and-sage botanical app
Composition/framing: centered horizontal envelope, complete silhouette visible, generous transparent padding, no crop; straight-on view with a very slight top-down angle
Lighting/mood: soft diffuse light from upper left, tender and intimate
Color palette: warm cream, pale blush, dusty rose seal, restrained shadows
Constraints: genuinely transparent background with clean semitransparent edges; envelope closed; no flowers; no loose paper; no hands; no text; no labels; no border; no UI; no watermark
Avoid: clip art, cartoon outlines, vector-flat geometry, photographic cutout, hard shadow, oversaturation, gift card, mailing label
```

## Open envelope

```text
Use case: stylized-concept
Asset type: transparent open-envelope artwork for the Bloom bouquet recipient reveal
Primary request: create one open romantic florist envelope as a reusable isolated production asset that pairs exactly in spirit with a warm cream handmade-paper closed envelope
Subject: a front-facing landscape envelope opened upward, its pointed back flap lifted and the inner pocket visible with believable paper depth; warm cream handmade paper with subtle fibers and faint blush edge tint; no letter inserted
Style/medium: delicate watercolor realism on translucent paper, refined tactile stationery matching a romantic blush-and-sage botanical app
Composition/framing: centered horizontal envelope, complete silhouette visible, generous transparent padding, no crop; straight-on view with a slight top-down angle, open flap clearly separated from the pocket
Lighting/mood: soft diffuse light from upper left, tender and intimate
Color palette: warm cream, pale blush, restrained warm-gray shadows
Constraints: genuinely transparent background with clean semitransparent edges; envelope open and empty; no wax seal; no flowers; no loose paper; no hands; no text; no labels; no border; no UI; no watermark
Avoid: clip art, cartoon outlines, vector-flat geometry, photographic cutout, hard shadow, oversaturation, gift card, mailing label
```

## Heart seal

```text
Use case: stylized-concept
Asset type: transparent wax-seal artwork for the Bloom bouquet recipient reveal
Primary request: create one small dusty-rose heart wax seal as a reusable isolated production asset
Subject: a softly irregular circular sealing-wax medallion with a simple debossed heart in the center, hand-poured edge, restrained glossy highlights, and believable wax depth
Style/medium: delicate watercolor realism with tactile stationery detail, romantic and refined
Composition/framing: centered front-facing seal, complete silhouette visible, generous transparent padding, no crop; perfectly usable over an envelope flap
Lighting/mood: soft diffuse light from upper left
Color palette: dusty rose, muted berry shadows, pale blush highlight
Constraints: genuinely transparent background with clean semitransparent edges; seal only; one heart symbol only; no envelope; no ribbon; no flowers; no text; no labels; no border; no UI; no watermark
Avoid: cartoon sticker, hard vector edge, plastic, metallic gold, photographic cutout, hard shadow, oversaturation
```

## Note paper

```text
Use case: stylized-concept
Asset type: transparent blank note-card artwork for the Bloom bouquet message and recipient reveal
Primary request: create one blank tactile keepsake note card as a reusable isolated production asset
Subject: a portrait-oriented warm-cream handmade paper card with softly deckled rounded edges, very subtle blush watercolor wash near the corners, faint paper fibers, and a tiny pressed-petal accent confined to the lower-right corner
Style/medium: delicate watercolor realism and refined stationery, quiet and romantic
Composition/framing: centered upright blank card, complete silhouette visible, generous transparent padding, no crop; mostly empty writing area
Lighting/mood: soft diffuse light from upper left, tender and intimate
Color palette: warm cream, palest blush, muted dusty rose accent
Constraints: genuinely transparent background with clean semitransparent edges; blank writable surface; no words; no lines; no handwriting; no envelope; no ribbon; no hands; no border around the image; no UI; no watermark
Avoid: greeting-card typography, ruled notebook paper, ornate frame, busy florals, cartoon, flat vector, photographic cutout, hard shadow, oversaturation
```

## Soft paper background

```text
Use case: stylized-concept
Asset type: subtle opaque paper background texture for Bloom bouquet screens
Primary request: create a quiet full-frame handmade paper texture that can sit behind interface content
Scene/backdrop: edge-to-edge warm cream paper with extremely soft cloudy blush watercolor blooms and fine natural fibers; low contrast and evenly distributed
Style/medium: refined handmade watercolor paper scan, tactile but understated
Composition/framing: seamless-feeling full bleed texture with no focal object, no vignette, no visible border, no hard edge, and balanced detail across the entire frame
Lighting/mood: soft diffuse ambient light, calm and intimate
Color palette: warm cream, porcelain, palest blush, a whisper of peach
Constraints: opaque background; no flowers; no leaves; no envelope; no card; no objects; no text; no labels; no border; no UI; no watermark; preserve generous quiet areas for readable interface text
Avoid: strong stains, obvious repeating pattern, grunge, canvas weave, marble, high contrast, dark corners, hard shadows, oversaturation
```

The hero bouquet and botanical corner were composed by `scripts/process_bouquet_experience_assets.py` from the approved generated botanical, wrap, and ribbon exports; no separate generation prompt was used for those two derivative assets.
