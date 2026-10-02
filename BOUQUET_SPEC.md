# Digital Bouquet — product and experience specification

Status: Phase 0 contract, approved and revised on October 1, 2026 for the unified studio architecture.

Visual authority: `bouquet.png`, extended through the established tactile, private, blush-paper world of Letters.

## 1. Job and audience

Digital Bouquet lets either person in an existing private Letters pairing assemble and send a keepsake bouquet when a full letter is not the right shape for the moment. The builder is an **Operate** surface: the bouquet must stay beautiful while the sender completes a precise touch task. The receiving reveal is an **Experience** surface: the bouquet and note lead while interface chrome recedes.

The product-specific truth is the same as Letters: one person makes something slowly and intentionally for one other person. This is not a florist storefront, public feed, or generic collage editor.

## 2. Locked v1 decisions

- Bouquets are standalone keepsakes beside Letters, not attachments inside a letter.
- Existing private pairings remain the primary relationship and default destination.
- A received bouquet is view-only. The recipient can keep and revisit it but cannot alter the original.
- Bouquets stay inside the existing private two-person pairing. There are no public links or external share actions in v1.
- There is no public Explore gallery in v1. Curated starter bouquets provide inspiration without moderation or privacy scope.
- Drafts remain editable JSON, and sent bouquets keep an immutable composition snapshot rendered by the same in-app artwork system.
- The bouquet reference establishes the visual hierarchy, flower catalog, unified studio, wrapping, note, send state, and cinematic receive state.
- Bouquet creation is one persistent workspace. Progress may change what the tray emphasizes, but it must never navigate through five separate builder pages or remount the bouquet canvas.

## 3. Navigation and routes

The current application has no route library. Phase 1 should introduce the smallest URL-backed routing layer that supports browser history, deep links, and PWA reopening without changing the existing Letters entry flow.

| Route | Surface | Purpose |
| --- | --- | --- |
| `/bloom` | Bouquet home | Start a bouquet, resume a draft, or open My Bouquets |
| `/bloom/create` | Unified bouquet studio | Choose, arrange, decorate, write, review, and send without leaving the canvas |
| `/bloom/mine` | My Bouquets | Reopen drafts and revisit sent bouquets |
| `/bloom/bouquet/:bouquetId` | Recipient reveal | Open a bouquet from the shared in-app garden |

Mobile bouquet navigation follows the reference: Home / Create / Bouquets. This navigation belongs only to the bouquet area; it must not replace the existing Letters / Drafts / Settings control.

## 4. Core flow

### Bouquet home

The first viewport leads with “Make someone a bouquet.” and a complete reference-quality hero bouquet. Primary action: Create Bouquet. Secondary content explains Choose flowers → Arrange your bouquet → Send your gift. Returning users also see one resumable draft and a link to My Bouquets.

States:

- first visit with no drafts;
- returning visit with a draft;
- signed-out visitor, who returns to the existing Letters sign-in flow;
- offline with a local draft available;
- offline without a cached shell.

### Unified bouquet studio

The builder is one immersive, viewport-locked workspace. Its stable reading order is header, bouquet canvas, docked tool tray, then the bouquet-area bottom navigation. The bouquet remains mounted and visually dominant while the sender chooses, arranges, decorates, writes, reviews, and sends.

The header contains a back action, a truly centered “Your Bouquet” title, and a compact `n / 5` progress counter. The counter communicates overall completion inside the same workspace; it is not a page number and never maps to a separate route.

The docked tray overlaps the canvas and contains:

- Flowers / Greenery / Decor / Wrapping tool tabs;
- one horizontally scrolling row of compact assets;
- one full-width Continue action.

Continue advances the studio’s completion state or brings the next incomplete requirement into the tray. It may replace the tray body with the note or review controls, but the header, canvas, selection, and bottom navigation stay spatially fixed.

Expanding the tray dims only the canvas region. A bounded sheet rises above the persistent bottom navigation with a drag handle, current tool title, close action, the same tool tabs, and a four-column vertically scrolling asset grid. Closing it restores the docked tray without changing the bouquet or scroll position.

The sender chooses from Flowers, Greenery, Decor, and Wrapping categories. Popular and Filler remain asset metadata or secondary filters inside Flowers rather than top-level studio modes.

Rules:

- A bouquet requires at least 3 items before the sender can continue.
- Recommended composition: 8–15 items.
- Hard limit: 30 items, including duplicates.
- Tapping an asset adds it to the next guided fan-layout slot.
- Every catalog entry shows its real illustration, name, category, and add action.

States: loading thumbnails, failed asset, no search results, selected, disabled at item limit, and restored local draft.

### Arrangement behavior

The canvas is the dominant surface. A selected stem exposes drag, rotate, resize, delete, move forward, and move backward actions. Undo and redo remain available throughout the builder. A persistent thumbnail strip provides a guaranteed selection path for every stem, including flowers hidden by overlapping blooms. The sender may rebalance the same stems into Classic, Meadow, or Garden silhouettes without leaving the studio.

Desktop may widen the tray or selection controls, but it keeps the same persistent studio and single `/bloom/create` route. Mobile uses floating undo/delete controls over the canvas. Touching an item manipulates the item; it does not scroll the page. A non-gesture control must exist for every transform.

### Decoration and wrapping

The sender chooses one wrapping style and one ribbon. Wrapping renders in two layers: a back layer behind the stems and a front layer above the stem bases. This overlap is mandatory because it is what makes the result read as a bouquet rather than a sticker collage.

The initial catalog contains four wrap colors and four matching ribbon colors from the reference. The recommended blush pairing is visibly suggested without forcing the sender out of the canvas.

### Message tray

Continue can bring the note into the same docked/expanded tray. The note uses the reference’s paper-card presentation with three fields:

- To: 1–60 characters;
- Message: 1–500 characters;
- From: 1–60 characters.

The paired recipient and sender names prefill when available but remain editable for the published note. Validation must preserve the draft and move focus to the first invalid field. Keyboard opening must not hide the focused field or Continue action.

### Review and send tray

The final review remains inside the persistent studio and uses the same renderer and geometry as the editor. It shows bouquet, wrapping, ribbon, note, recipient, and a single Send Bouquet action. A successful send places the bouquet in the pair's private Sent and Received collections.

Sending is explicit and idempotent. While publishing, controls are disabled and progress copy explains the active step. A retry must reuse the same client publication ID so a network interruption cannot create duplicates.

### Recipient reveal

The recipient first sees the dark, quiet envelope scene from the reference with “Someone sent you a bouquet…” and an Open it action. Opening transitions to the bouquet, then the note. Reduced-motion mode replaces the staged transforms with a short crossfade.

After reveal, the recipient can:

- read the full note;
- view the full bouquet;
- keep it in the paired account;
- revisit it from My Bouquets.

Missing bouquets and bouquets outside the current pairing receive generic unavailable copy and never reveal recipient or sender identity.

### My Bouquets

Three quiet groups: Drafts, Received, and Sent. Draft actions are Continue, Duplicate, Rename, and Delete. Received bouquets are view-only and can be revisited or remixed as a new draft without altering the original. Sent bouquets are immutable; actions are View and Duplicate as Draft. Deletion uses confirmation and applies only to local drafts in v1; sent and received bouquet records are retained.

## 5. Responsive structure

### Desktop

- Top navigation follows the reference: Create and My Bouquets; Explore is replaced by Starters.
- Builder remains a single persistent studio; the docked tray may widen into a side dock when that gives the canvas more usable space.
- Canvas stays visually central and never shrinks below a usable manipulation area.
- Note and review controls occupy the tray or an adjacent inspector without replacing the canvas.

### Mobile and installed PWA

- The builder itself does not document-scroll. Docked assets scroll horizontally; the expanded grid scrolls vertically.
- Respect `100dvh`, safe-area insets, visual viewport changes, and the home indicator.
- Canvas remains above the docked tray and behind the bounded expanded sheet.
- Sheets have a visible handle, title, close action, bounded height, and contained scrolling.
- Primary progression is never hidden behind the bouquet-area bottom navigation or keyboard.
- Minimum touch target: 44×44 CSS pixels.

## 6. Visual direction

- Preserve the reference palette and soft watercolor botanical artwork.
- Use Cormorant Garamond for emotional headings, quotes, and the note; use a clear sans for controls, labels, forms, and numeric values.
- The bouquet is the focal object. Controls use soft paper surfaces and restrained rose accents.
- Cards and sheets share the rounded language now established in Letters; avoid sharp rectangular panels, excessive glass, and nested decorative cards.
- The signature interaction is guided assembly: each added stem arrives in a pleasing fan slot, then remains fully adjustable.
- The receiving reveal is the only cinematic moment. Builder motion stays brief and functional.

## 7. Accessibility and performance contract

- Full keyboard operation on desktop, including selection, nudge, layer, rotate, resize, and delete.
- Screen-reader labels identify the selected item, item count, current step, transform values, and validation errors.
- Reduced motion removes bouquet entrance, envelope opening transforms, and selector squash.
- Do not encode category or selection through color alone.
- Lazy-load full botanical assets; use thumbnails in the catalog.
- Target smooth direct manipulation on a supported iPhone with a 10-item bouquet.
- Autosave after meaningful edits and on visibility change; recovery must never depend on the user pressing Save.

## 8. Explicit anti-goals for v1

- Public Explore feed, likes, comments, follows, moderation, or discovery ranking.
- Payments, physical flower fulfillment, subscriptions, or product inventory.
- Collaborative simultaneous editing.
- Recipient remixing of the original bouquet.
- Seasonal packs, push campaigns, scheduling, or expiring bouquets.
- Arbitrary uploaded flower cutouts.
- Public bouquet URLs, WhatsApp/iMessage sharing, Web Share, and social distribution.

## Approval gate

Phase 0 passes when this specification, `BOUQUET_ASSET_MANIFEST.md`, and `BOUQUET_DATA_MODEL.md` are approved together. Phase 1 must not begin before that approval.
