# Digital Bouquet — phased delivery plan

Source of truth: `bouquet.png` and the approved Letters visual world.

The bouquet experience is a new keepsake inside Letters. It does not replace letters, change the private two-person relationship, or introduce a public social feed. Each phase ships on its own branch and must pass its iPhone gate before the next phase begins.

## Delivery rules

- One phase per `codex/bouquet-phase-*` branch.
- Restate the phase scope and acceptance gate before changing code.
- Keep bouquet composition as editable JSON; exported images are previews, never the source of truth.
- Test the installed PWA on a real iPhone at the end of every phase.
- Do not start the next phase until the current gate passes.
- Explore is not part of v1. Use curated starter bouquets that people can remix.

## UI foundation — Letters polish

- [x] Use a consistent rounded corner language across shared surfaces.
- [x] Soften the mobile collection and letter rows.
- [x] Improve mobile collection and letter-title typography.
- [x] Tint and reduce the three-option liquid bottom bar so it belongs to Letters.
- [x] Verify the mobile and desktop layouts and confirm that visual assets load.

Gate: the current Letters screen must remain readable and functional at iPhone width, with no missing images, horizontal overflow, or bottom-bar overlap.

## Phase 0 — lock the contracts

Phase status: approved on September 30, 2026 — the implementation gate has passed.

Create and approve these documents before bouquet runtime code:

- [x] `BOUQUET_SPEC.md`: Home, Flowers, Arrange, Decorate, Message, Send, Receive, and My Bouquets screens.
- [x] `BOUQUET_ASSET_MANIFEST.md`: every flower, greenery, wrapping, ribbon, envelope, note, and background asset.
- [x] `BOUQUET_DATA_MODEL.md`: versioned draft, published bouquet, share record, and migration rules.
- [x] Define navigation: `/bloom`, `/bloom/create/*`, `/bloom/mine`, and recipient route `/b/:shareId`.
- [x] Define access: owners edit; the paired recipient can keep; public share links expose only a sanitized published payload through a high-entropy token.
- [x] Define product decisions: bouquets are standalone keepsakes beside Letters, and received bouquets are view-only.
- [x] User approves the three contracts and closes the Phase 0 gate.

The authoritative composition, persistence, and access contract now lives in `BOUQUET_DATA_MODEL.md`; this checklist intentionally does not duplicate the schema.

Gate: all contracts are reviewed and approved before dependencies, routes, storage collections, or UI are added.

## Phase 1 — bouquet design system and iOS-safe shell

- [ ] Add the reference palette: `#FFF7F8`, `#FCEAEC`, `#EEB5BE`, `#D96F80`, `#A94153`, `#FFFDF9`, `#FBF7F1`, `#E9DDE0`, `#796D70`, `#A8B8A0`, `#B7A4C8`, `#F2D58A`, and `#E8A18D`.
- [ ] Use Cormorant Garamond for emotional headings and Inter/system sans for controls and forms.
- [ ] Build bouquet buttons, inputs, flower cards, filter chips, bottom sheet, and five-step indicator.
- [ ] Add Home / Create / Bouquets navigation without changing the existing Letters flow.
- [ ] Centralize `100dvh`, safe-area, keyboard, scroll-lock, and overscroll behavior.
- [ ] Add a private kitchen-sink route using placeholder flower circles only.

Gate: the installed PWA handles notch, home indicator, keyboard, rotation, and scrolling correctly on a real iPhone.

## Phase 2 — cohesive botanical asset pipeline

- [ ] Write one style bible covering watercolor realism, camera angle, soft top-left light, color treatment, and transparent-background cleanup.
- [ ] Pilot rose, tulip, and daisy; approve them together before generating more assets.
- [ ] Produce 12 flowers: Rose, Peony, Tulip, Daisy, Sunflower, Lily, Dahlia, Hydrangea, Ranunculus, Cosmos, Lavender, and Baby’s Breath.
- [ ] Produce five greenery pieces: Eucalyptus, Fern, Ivy, Olive Branch, and Ruscus.
- [ ] Produce the wrap, bow, closed/open envelope, heart seal, note paper, hero bouquet, botanical corner, and paper background.
- [ ] Build a repeatable cleanup step: remove background, trim, pad, normalize, resize, and export WebP plus thumbnail.
- [ ] Record `id`, category, full asset, thumbnail, stem anchor, default scale, and dimensions in a JSON manifest.
- [ ] Recolor a single approved wrap and bow geometry into the four reference colors.
- [ ] Keep stems at or below 150 KB and thumbnails at or below 15 KB.

Gate: the three pilot flowers—and then the full catalog—look like one illustrated family with no halos, mismatched lighting, or incorrect relative scale.

## Phase 3 — builder core

- [ ] Add the canvas dependency only after a touch prototype confirms the choice; `react-konva` is the leading option.
- [ ] Build the desktop library / canvas / selection-panel layout from the reference.
- [ ] Build the mobile canvas with a bottom-sheet catalog.
- [ ] Add All / Popular / Filler / Greenery catalog filters and search.
- [ ] Add flowers into guided fan-layout slots before allowing free adjustment.
- [ ] Support touch drag, rotate, resize, delete, undo, redo, zoom, and layer order.
- [ ] Keep page scrolling disabled only while manipulating the canvas.
- [ ] Autosave versioned drafts locally, partitioned by account.

Gate: build a ten-flower bouquet entirely by touch on an iPhone with stable handles, no accidental page scroll, and smooth interaction.

## Phase 4 — decorate, message, and preview

- [ ] Add wrapping and ribbon selectors matching the reference.
- [ ] Render wrapping as back and front layers so stems sit inside it instead of on top of it.
- [ ] Add the tactile note card with To, message, and From fields.
- [ ] Set and test a message character limit during Phase 0 contract approval.
- [ ] Implement Flowers → Arrange → Decorate → Message → Send navigation with back/forward preservation.
- [ ] Require at least three bouquet items before continuing.
- [ ] Make the final preview use the exact same composition renderer as the editor.

Gate: an empty draft can become a fully wrapped bouquet and note, and preview geometry exactly matches the editor.

## Phase 5 — send and receive

- [ ] Publish immutable bouquet JSON to Firestore and a preview image to Storage.
- [ ] Create an unguessable share record and `/b/:shareId` recipient experience.
- [ ] Keep direct Firestore access private; the public endpoint returns only the sanitized published payload.
- [ ] Add Copy Link and Web Share actions.
- [ ] Add server-rendered Open Graph metadata so WhatsApp and iMessage show the bouquet preview.
- [ ] Build the dark envelope arrival, Open it action, bouquet reveal, note reveal, and View Full Bouquet state.
- [ ] Respect reduced motion and provide invalid, revoked, and unavailable-link states.

Gate: send from one phone and open in a private browser on another device without signing in; the preview and reveal must both work.

## Phase 6 — Home and My Bouquets

- [ ] Build the “Make someone a bouquet” home hero.
- [ ] Add the three-step Choose flowers / Arrange / Send explanation.
- [ ] Add My Bouquets with drafts and sent bouquets.
- [ ] Support duplicate, rename, continue editing, and confirmed deletion.
- [ ] Add curated starter bouquets that can be remixed.

Gate: a first-time user can start from scratch or a starter, leave, return to the draft, and find the sent bouquet later.

## Phase 7 — iOS hardening and product polish

- [ ] Test portrait, landscape, keyboard-open, standalone PWA, browser tab, offline reopen, reduced motion, and low-power mode.
- [ ] Test small and large iPhone widths and at least one iPad width.
- [ ] Add accessible names, focus order, contrast, target sizes, and non-gesture alternatives.
- [ ] Complete loading, empty, disabled, success, permission, offline, and recoverable error states.
- [ ] Profile asset loading, canvas frame rate, memory, exported preview size, and service-worker caching.

Gate: the complete device checklist passes without lost drafts, blocked controls, clipped content, missing assets, or interaction jank.

## Phase 8 — release

- [ ] Test Firestore and Storage security rules against owner, recipient, anonymous-link, revoked-link, and unauthorized cases.
- [ ] Deploy and approve a preview environment.
- [ ] Run the full send/receive flow against production-like services.
- [ ] Deploy production and monitor the first real bouquet flows.
- [ ] Keep push notifications, seasonal packs, public Explore, and extra flower variants on the post-v1 backlog.

Gate: production passes the same end-to-end iPhone send/receive test as Phase 5, with security rules verified.
