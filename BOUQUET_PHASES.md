# Digital Bouquet — phased delivery plan

Source of truth: `bouquet.png` and the approved Letters visual world.

Architecture revision, October 1, 2026: bouquet creation is one persistent studio at `/bloom/create`. The compact `n / 5` value is progress inside that studio, not five routed pages.

The bouquet experience is a new keepsake inside Letters. It does not replace letters, change the private two-person relationship, or introduce a public social feed. Each phase ships on its own branch and must pass its iPhone gate before the next phase begins.

## Delivery rules

- One phase per `codex/bouquet-phase-*` branch.
- Restate the phase scope and acceptance gate before changing code.
- Keep bouquet composition as editable JSON; the shared in-app renderer remains the source of visual truth.
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

- [x] `BOUQUET_SPEC.md`: Home, unified bouquet studio, Receive, and My Bouquets screens.
- [x] `BOUQUET_ASSET_MANIFEST.md`: every flower, greenery, wrapping, ribbon, envelope, note, and background asset.
- [x] `BOUQUET_DATA_MODEL.md`: versioned drafts, immutable published bouquets, receipts, and migration rules.
- [x] Define navigation: `/bloom`, `/bloom/create`, `/bloom/mine`, and paired recipient route `/bloom/bouquet/:bouquetId`.
- [x] Define access: owners edit local drafts; only the two pairing members can read a sent bouquet; only the recipient can add delivery receipts.
- [x] Define product decisions: bouquets are standalone keepsakes beside Letters, and received bouquets are view-only.
- [x] User approves the three contracts and closes the Phase 0 gate.

The authoritative composition, persistence, and access contract now lives in `BOUQUET_DATA_MODEL.md`; this checklist intentionally does not duplicate the schema.

Gate: all contracts are reviewed and approved before dependencies, routes, storage collections, or UI are added.

## Phase 1 — bouquet design system and iOS-safe shell

Phase status: browser verified — awaiting the installed-PWA gate on a physical iPhone.

- [x] Add the reference palette: `#FFF7F8`, `#FCEAEC`, `#EEB5BE`, `#D96F80`, `#A94153`, `#FFFDF9`, `#FBF7F1`, `#E9DDE0`, `#796D70`, `#A8B8A0`, `#B7A4C8`, `#F2D58A`, and `#E8A18D`.
- [x] Use Cormorant Garamond for emotional headings and Inter/system sans for controls and forms.
- [x] Build bouquet buttons, inputs, flower cards, filter chips, docked tray, expanded sheet, and compact progress counter.
- [x] Add Home / Create / Bouquets navigation without changing the existing Letters flow.
- [x] Centralize `100dvh`, safe-area, keyboard, scroll-lock, and overscroll behavior.
- [x] Add a private kitchen-sink route using placeholder flower circles only.

Gate: the installed PWA handles notch, home indicator, keyboard, rotation, and scrolling correctly on a real iPhone.

## Phase 2 — cohesive botanical asset pipeline

Phase status: implementation complete on October 1, 2026 — the approved family now includes the full botanical catalog, registered wrap/ribbon system, and recipient-experience artwork. The private kitchen sink provides the final visual approval surface.

- [x] Write one style bible covering watercolor realism, camera angle, soft top-left light, color treatment, and transparent-background cleanup.
- [x] Generate and normalize the rose, tulip, and daisy pilot set.
- [x] Approve the three pilots together before generating more assets.
- [x] Produce 12 flowers: Rose, Peony, Tulip, Daisy, Sunflower, Lily, Dahlia, Hydrangea, Ranunculus, Cosmos, Lavender, and Baby’s Breath.
- [x] Produce five greenery pieces: Eucalyptus, Fern, Ivy, Olive Branch, and Ruscus.
- [x] Produce the closed/open envelope, heart seal, note paper, hero bouquet, botanical corner, and paper background.
- [x] Build a repeatable cleanup step: validate alpha, trim, pad, normalize, resize, and export WebP plus thumbnail.
- [x] Record pilot `id`, category, full asset, thumbnail, stem anchor, default scale, dimensions, byte size, and provenance in a JSON manifest.
- [x] Recolor a single approved wrap and bow geometry into the four reference colors.
- [x] Keep stems at or below 150 KB and thumbnails at or below 15 KB.

Gate: the three pilot flowers—and then the full catalog—look like one illustrated family with no halos, mismatched lighting, or incorrect relative scale.

## Phase 3 — builder core

Phase status: browser verified on October 1, 2026 — awaiting the installed-PWA gate on a physical iPhone.

- [x] Prototype direct manipulation with native Pointer Events before adding a canvas dependency; keep `react-konva` deferred unless physical-device testing exposes a concrete need.
- [x] Build the persistent desktop studio with canvas, docked tools, and selection controls.
- [x] Build the mobile canvas with docked and expanded catalog states above the persistent tab bar.
- [x] Add All / Popular / Filler / Greenery catalog filters and search.
- [x] Add flowers into guided fan-layout slots before allowing free adjustment.
- [x] Add a persistent per-stem selector and Classic / Meadow / Garden silhouette controls.
- [x] Support touch drag, rotate, resize, delete, undo, redo, zoom, and layer order.
- [x] Keep page scrolling disabled only while manipulating the canvas.
- [x] Autosave versioned drafts locally, partitioned by account.

Gate: build a ten-flower bouquet entirely by touch on an iPhone with stable handles, no accidental page scroll, and smooth interaction.

## Phase 4 — decorate, message, and preview

Phase status: browser verified on October 1, 2026 — awaiting the installed-PWA gate on a physical iPhone.

- [x] Add wrapping and ribbon selectors matching the reference.
- [x] Render wrapping as back and front layers so stems sit inside it instead of on top of it.
- [x] Add the tactile note card with To, message, and From fields.
- [x] Set and test a message character limit during Phase 0 contract approval.
- [x] Keep composition, message, and review inside the persistent studio; Continue changes studio state without route navigation or canvas remounting. Sending remains Phase 5.
- [x] Require at least three bouquet items before continuing.
- [x] Make the final preview use the exact same composition renderer as the editor.

Gate: an empty draft can become a fully wrapped bouquet and note, and preview geometry exactly matches the editor.

## Phase 5 — send and receive

Phase status: browser/demo verified on October 1, 2026 — awaiting the paired-account security and physical-iPhone gate.

- [x] Publish immutable bouquet JSON to a pairing-scoped Firestore document.
- [x] Add the private `/bloom/bouquet/:bouquetId` recipient experience.
- [x] Reuse the Letters relationship model, push delivery, and sent / delivered / opened receipts.
- [x] Keep bouquets in-app only, with no public links, Web Share, WhatsApp, or external delivery surface.
- [x] Build the dark envelope arrival, Open it action, bouquet reveal, note reveal, and revisit state.
- [x] Respect reduced motion and provide loading and unavailable states without leaking pairing identity.

Gate: send between two signed-in paired accounts, open on the recipient device, and confirm unrelated or anonymous accounts cannot read it. Browser/demo verification is complete; the two-account device and security-rule gate remains for release hardening.

## Phase 6 — Home and My Bouquets

Phase status: browser verified on October 1, 2026 — awaiting the installed-PWA gate on a physical iPhone.

- [x] Build the “Make someone a bouquet” home hero.
- [x] Add the three-step Choose flowers / Arrange / Send explanation.
- [x] Add My Bouquets with Drafts, Received, and Sent groups.
- [x] Support duplicate, rename, continue editing, and confirmed draft deletion.
- [x] Add curated starter bouquets that can be remixed.

Gate: a first-time user can start from scratch or a starter, leave, return to the draft, and find the sent bouquet later.

## Phase 7 — iOS hardening and product polish

Phase status: responsive browser and production-PWA checks passed on October 2, 2026. Physical-device, low-power, and real keyboard checks remain release gates.

- [x] Test portrait, landscape, browser tab, offline reopen, and reduced-motion behavior in the production PWA build.
- [ ] Confirm standalone safe areas, the real software keyboard, and low-power behavior on a physical iPhone.
- [x] Test 320px and 390px phones, 844×390 landscape, 834px iPad, and 1440px desktop layouts.
- [x] Add accessible names, focus restoration, 44px target sizes, and non-gesture arrangement controls.
- [x] Complete loading, empty, disabled, success, permission, offline, and recoverable error states.
- [x] Reduce the eager PWA cache from roughly 24 MB to roughly 7 MB and cache stationery artwork on demand.
- [ ] Profile canvas frame rate and memory on a physical iPhone in normal and low-power modes.

Gate: the complete device checklist passes without lost drafts, blocked controls, clipped content, missing assets, or interaction jank.

## Phase 8 — release

Phase status: code and local production build are release-ready on October 2, 2026. External preview and production deployment remain intentionally gated.

- [x] Test Firestore security rules against sender, paired recipient, unrelated signed-in user, and anonymous access.
- [ ] Deploy and approve a preview environment.
- [ ] Run the full send/receive flow against production-like services.
- [ ] Deploy production and monitor the first real bouquet flows.
- [x] Deliver bouquet push notifications with the same private pairing semantics as letters.
- [ ] Keep seasonal packs, public Explore, public/external sharing, and extra flower variants on the post-v1 backlog.

Gate: production passes the same end-to-end iPhone send/receive test as Phase 5, with security rules verified.
