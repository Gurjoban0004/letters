# Digital Bouquet — data, persistence, and access contract

Status: Phase 0 contract, approved and revised on October 1, 2026 for the unified studio architecture.

## 1. Storage strategy

| Data | Location | Mutability | Reader |
| --- | --- | --- | --- |
| Working draft | IndexedDB/local device, partitioned by account | editable | owner only |
| Published bouquet and composition | Firestore `bouquets/{bouquetId}` | immutable except delivery receipts | pairing members only |

Drafts stay local to match the existing Letters privacy and recovery model. Publishing produces one immutable snapshot inside the pair's shared garden. The shipped asset catalog renders that composition directly, so v1 needs neither preview-image storage nor a public delivery endpoint.

## 2. Domain types

```ts
type BouquetProgress = 1 | 2 | 3 | 4 | 5
type BouquetTool = 'flowers' | 'greenery' | 'decor' | 'wrapping'
type BouquetStudioMode = 'compose' | 'message' | 'review'
type BouquetStatus = 'draft' | 'publishing' | 'sent'

type BouquetItemV1 = {
  id: string
  assetId: string
  x: number
  y: number
  scale: number
  rotation: number
  flipX: boolean
  z: number
}

type BouquetNoteV1 = {
  to: string
  body: string
  from: string
}

type BouquetCompositionV1 = {
  version: 1
  items: BouquetItemV1[]
  wrapId: string | null
  ribbonId: string | null
  bouquetStyle: 'classic' | 'meadow' | 'tall'
  note: BouquetNoteV1
}

type BouquetDraftV1 = BouquetCompositionV1 & {
  id: string
  ownerId: string
  pairingId: string
  title: string
  progress: BouquetProgress
  activeTool: BouquetTool
  studioMode: BouquetStudioMode
  status: BouquetStatus
  createdAt: number
  updatedAt: number
  clientPublicationId: string | null
}

type PublishedBouquetV1 = {
  version: 1
  id: string
  pairingId: string
  senderId: string
  recipientId: string
  title: string
  itemCount: number
  createdAt: unknown
  receivedAt: unknown | null
  viewedAt: unknown | null
  composition: BouquetCompositionV1
}
```

## 3. Coordinate system

- `x` and `y` are normalized canvas coordinates from 0 to 1.
- The item anchor is the normalized stem-base point declared in the asset manifest.
- `scale` is clamped from 0.35 to 2.5 relative to the asset’s default scale.
- `rotation` is normalized to -180 through 180 degrees.
- `z` is a unique integer ordering within the draft and is compacted after reorder operations.
- `flipX` is the only reflection supported in v1.
- Rendering must be deterministic from composition JSON plus the versioned asset manifest.

The editor may keep transient pixel coordinates while dragging, but persisted state always uses normalized values so desktop and mobile render the same arrangement.

## 4. Validation contract

### Draft

- `id`, `ownerId`, and `pairingId` must be non-empty trusted identifiers.
- Title: 0–80 Unicode characters.
- Items: 0–30 while drafting; 3–30 when publishing.
- Item IDs must be unique.
- `assetId` must exist in the shipped manifest.
- Numeric transform values must be finite and within documented bounds.
- `wrapId` and `ribbonId` must be null or valid manifest IDs.
- `bouquetStyle` must be `classic`, `meadow`, or `tall`; legacy drafts default to `classic`.
- To and From: 1–60 trimmed Unicode characters at publication.
- Note body: 1–500 trimmed Unicode characters at publication.
- Encoded composition maximum: 128 KB.

Unknown keys are discarded when decoding. Invalid items are rejected rather than silently placed at a fallback position. Recovery keeps the last valid autosave.

### Published record

- Sender must be the authenticated creator and a member of `pairingId`.
- Recipient must be the other current pairing member.
- `clientPublicationId` is 16–80 URL-safe characters and makes publishing idempotent.
- Composition, sender, recipient, title, item count, and creation time are immutable after creation.
- Only `receivedAt` and `viewedAt` may change, and only by the recipient under field-specific rules.

## 5. Local draft persistence

Recommended key space:

```text
letters:bouquets:v1:{ownerId}:{draftId}
letters:bouquets:index:v1:{ownerId}
```

IndexedDB is preferred over `localStorage` because compositions and history can grow beyond simple string settings. The adapter must expose a storage interface so tests can use an in-memory implementation.

Phase 3 currently uses that storage interface with `localStorage` for the small composition JSON only. This keeps recovery testable and account-partitioned without blocking the touch prototype; the adapter remains the migration seam for IndexedDB before larger histories or attachments are persisted.

Autosave triggers:

- 400–800 ms after a meaningful edit settles;
- immediately when progress, active tool, or studio mode changes;
- immediately on `visibilitychange` to hidden;
- before starting publication.

Undo history is session-local and not required after reopening. The latest valid composition, progress, active tool, studio mode, and publication ID are restored. Picker expansion is ephemeral UI state and is not persisted.

The legacy route-shaped step names map during draft decoding as follows: `flowers` and `arrange` → `compose`; `decorate` → `compose` with its closest tool selected; `message` → `message`; `send` → `review`. The migration never changes composition geometry.

## 6. Publish transaction

1. Validate and normalize the local draft.
2. Freeze a `BouquetCompositionV1` snapshot.
3. Write one Firestore document containing metadata and the immutable composition, keyed by the idempotent publication ID.
4. Remove the local draft only after the write succeeds.

A retry reuses the same document ID and creation timestamp. Writing the same payload again is a safe no-op, while any attempt to rewrite an already-published bouquet with different content is denied.

## 7. Access rules

### Pairing access

- Authenticated pairing members can read published bouquets for their pairing.
- Only the authenticated sender can create a bouquet.
- No client can modify published composition content.
- The recipient may set `receivedAt` and `viewedAt` once.
- Sent bouquets cannot be deleted in v1.
- Anonymous users and signed-in users outside the pairing cannot read a bouquet.

## 8. Versioning and migration

- Every composition, draft, and published bouquet includes an integer `version`.
- Decode with a dedicated sanitizer before state reaches the renderer.
- Preserve the original stored payload; migration creates a normalized in-memory vCurrent value.
- Write only the newest schema for new or edited drafts.
- Published bouquets remain immutable and render through their version adapter.
- Missing manifest assets render a deliberate unavailable-stem placeholder in the editor and a stable fallback in old published bouquets.

## 9. Required Phase 3 and Phase 5 tests

- v1 round trip and sanitizer bounds;
- invalid and unknown asset IDs;
- Unicode note limits;
- 0, 3, 10, and 30 item compositions;
- duplicate item IDs and invalid z ordering;
- normalized rendering across desktop and mobile canvas sizes;
- autosave recovery and per-account isolation;
- idempotent publication retry;
- owner, paired recipient, unrelated signed-in user, and anonymous access;
- sent, delivered, and opened receipt transitions;
- immutable published composition;
- strict isolation between pairings.

## Approval gate

This model is the approved contract implemented by the bouquet runtime, Firestore collection, security rules, and runtime types.
