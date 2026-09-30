# Digital Bouquet — product and experience specification

Status: Phase 0 contract, ready for approval.

Visual authority: `bouquet.png`, extended through the established tactile, private, blush-paper world of Letters.

## 1. Job and audience

Digital Bouquet lets either person in an existing private Letters pairing assemble and send a keepsake bouquet when a full letter is not the right shape for the moment. The builder is an **Operate** surface: the bouquet must stay beautiful while the sender completes a precise touch task. The receiving reveal is an **Experience** surface: the bouquet and note lead while interface chrome recedes.

The product-specific truth is the same as Letters: one person makes something slowly and intentionally for one other person. This is not a florist storefront, public feed, or generic collage editor.

## 2. Locked v1 decisions

- Bouquets are standalone keepsakes beside Letters, not attachments inside a letter.
- Existing private pairings remain the primary relationship and default destination.
- A received bouquet is view-only. The recipient can keep and revisit it but cannot alter the original.
- Public share links are optional, read-only, revocable, and expose a sanitized published payload through a server endpoint.
- There is no public Explore gallery in v1. Curated starter bouquets provide inspiration without moderation or privacy scope.
- Drafts remain editable JSON. Preview images are derived artifacts and never replace composition data.
- The bouquet reference establishes the visual hierarchy, flower catalog, five-step flow, wrapping, note, send state, and cinematic receive state.

## 3. Navigation and routes

The current application has no route library. Phase 1 should introduce the smallest URL-backed routing layer that supports browser history, deep links, and PWA reopening without changing the existing Letters entry flow.

| Route | Surface | Purpose |
| --- | --- | --- |
| `/bloom` | Bouquet home | Start a bouquet, resume a draft, or open My Bouquets |
| `/bloom/create/flowers` | Step 1 | Choose flowers and greenery |
| `/bloom/create/arrange` | Step 2 | Position, size, rotate, and layer stems |
| `/bloom/create/decorate` | Step 3 | Choose wrapping and ribbon |
| `/bloom/create/message` | Step 4 | Write the accompanying note |
| `/bloom/create/send` | Step 5 | Review, select destination, and send/share |
| `/bloom/mine` | My Bouquets | Reopen drafts and revisit sent bouquets |
| `/b/:shareId` | Recipient reveal | Open a published bouquet from a private share link |

Mobile bouquet navigation follows the reference: Home / Create / Bouquets. This navigation belongs only to the bouquet area; it must not replace the existing Letters / Drafts / Settings control.

## 4. Core flow

### Bouquet home

The first viewport leads with “Make someone a bouquet.” and a complete reference-quality hero bouquet. Primary action: Create Bouquet. Secondary content explains Choose flowers → Arrange your bouquet → Send your gift. Returning users also see one resumable draft and a link to My Bouquets.

States:

- first visit with no drafts;
- returning visit with a draft;
- signed-out public visitor, who may view a shared bouquet but cannot create until signed in;
- offline with a local draft available;
- offline without a cached shell.

### Step 1 — Flowers

The sender chooses from Flowers, Greenery, Popular, and Filler categories. Desktop uses a left catalog with a compact “Your Bouquet” list. Mobile uses a bottom sheet that preserves the full bouquet canvas above it.

Rules:

- A bouquet requires at least 3 items before the sender can continue.
- Recommended composition: 8–15 items.
- Hard limit: 30 items, including duplicates.
- Tapping an asset adds it to the next guided fan-layout slot.
- Every catalog entry shows its real illustration, name, category, and add action.

States: loading thumbnails, failed asset, no search results, selected, disabled at item limit, and restored local draft.

### Step 2 — Arrange

The canvas is the dominant surface. A selected stem exposes drag, rotate, resize, delete, move forward, and move backward actions. Undo and redo remain available throughout the builder.

Desktop uses the reference three-part composition: catalog/list, canvas, selection inspector. Mobile uses floating undo/delete controls plus a compact action strip. Touching an item manipulates the item; it does not scroll the page. A non-gesture control must exist for every transform.

### Step 3 — Decorate

The sender chooses one wrapping style and one ribbon. Wrapping renders in two layers: a back layer behind the stems and a front layer above the stem bases. This overlap is mandatory because it is what makes the result read as a bouquet rather than a sticker collage.

The initial catalog contains four wrap colors and four matching ribbon colors from the reference. None is selected until the sender enters this step; the recommended blush pairing is visibly suggested.

### Step 4 — Message

The note uses the reference’s paper-card presentation with three fields:

- To: 1–60 characters;
- Message: 1–500 characters;
- From: 1–60 characters.

The paired recipient and sender names prefill when available but remain editable for the published note. Validation must preserve the draft and move focus to the first invalid field. Keyboard opening must not hide the focused field or Continue action.

### Step 5 — Send

The final review uses the same renderer and geometry as the editor. It shows bouquet, wrapping, ribbon, note, recipient, and a single Send Bouquet action. Copy Link and Web Share appear only after publication succeeds.

Sending is explicit and idempotent. While publishing, controls are disabled and progress copy explains the active step. A retry must reuse the same client publication ID so a network interruption cannot create duplicates.

### Recipient reveal

The recipient first sees the dark, quiet envelope scene from the reference with “Someone sent you a bouquet…” and an Open it action. Opening transitions to the bouquet, then the note. Reduced-motion mode replaces the staged transforms with a short crossfade.

After reveal, the recipient can:

- read the full note;
- view the full bouquet;
- keep it in the paired account when signed in;
- revisit the same link;
- copy or share the link when the sender allowed public sharing.

Invalid, revoked, unavailable, and expired links receive distinct recovery copy and never reveal recipient or sender identity from a failed lookup.

### My Bouquets

Three quiet groups: Drafts, Sent, and Kept. Draft actions are Continue, Duplicate, Rename, and Delete. Sent bouquets are immutable; actions are View, Duplicate as Draft, Copy Link when active, and Revoke Link. Kept bouquets are received, view-only compositions that can be revisited or removed from the device-local keepsake list. Deletion uses confirmation and applies only to local drafts in v1; sent bouquet records are retained.

## 5. Responsive structure

### Desktop

- Top navigation follows the reference: Create and My Bouquets; Explore is replaced by Starters.
- Builder uses catalog / canvas / inspector columns.
- Canvas stays visually central and never shrinks below a usable manipulation area.
- Note and send steps may narrow to a centered paper column but retain the step indicator.

### Mobile and installed PWA

- One explicit scrolling region per screen.
- Respect `100dvh`, safe-area insets, visual viewport changes, and the home indicator.
- Canvas remains above the flower bottom sheet.
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

## Approval gate

Phase 0 passes when this specification, `BOUQUET_ASSET_MANIFEST.md`, and `BOUQUET_DATA_MODEL.md` are approved together. Phase 1 must not begin before that approval.
