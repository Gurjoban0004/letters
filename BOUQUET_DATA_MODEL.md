# Digital Bouquet — data, persistence, and access contract

Status: Phase 0 contract, ready for approval.

## 1. Storage strategy

| Data | Location | Mutability | Reader |
| --- | --- | --- | --- |
| Working draft | IndexedDB/local device, partitioned by account | editable | owner only |
| Kept bouquet IDs | local device, partitioned by account | editable | current account only |
| Published bouquet metadata | Firestore `bouquets/{bouquetId}` | immutable except receipts and share status | pairing members |
| Published composition | Firestore `bouquets/{bouquetId}/content/published` | immutable | pairing members and trusted server |
| Preview image | Firebase Storage `pairings/{pairingId}/bouquets/{bouquetId}/preview.webp` | immutable | pairing members or trusted server |
| Public share record | Firestore `bouquetShares/{shareHash}` | revocable metadata only | server only |
| Public sanitized response | `/api/bouquets/:shareId` | read-only | anyone holding an active link |

Drafts stay local to match the existing Letters privacy and recovery model. Publishing produces an immutable snapshot so an old link never changes when a sender edits a duplicate later.

## 2. Domain types

```ts
type BouquetStep = 'flowers' | 'arrange' | 'decorate' | 'message' | 'send'
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
  note: BouquetNoteV1
}

type BouquetDraftV1 = BouquetCompositionV1 & {
  id: string
  ownerId: string
  pairingId: string
  title: string
  step: BouquetStep
  status: BouquetStatus
  createdAt: number
  updatedAt: number
  clientPublicationId: string | null
}

type PublishedBouquetV1 = {
  version: 1
  bouquetId: string
  pairingId: string
  senderId: string
  recipientId: string
  title: string
  itemCount: number
  previewPath: string
  createdAt: unknown
  receivedAt: unknown | null
  viewedAt: unknown | null
  shareEnabled: boolean
  shareRevokedAt: unknown | null
}

type BouquetShareV1 = {
  version: 1
  bouquetId: string
  shareHash: string
  createdBy: string
  createdAt: unknown
  revokedAt: unknown | null
}
```

The public API never returns `pairingId`, Firebase user IDs, storage paths, share hashes, or unpublished fields.

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
- To and From: 1–60 trimmed Unicode characters at publication.
- Note body: 1–500 trimmed Unicode characters at publication.
- Encoded composition maximum: 128 KB.

Unknown keys are discarded when decoding. Invalid items are rejected rather than silently placed at a fallback position. Recovery keeps the last valid autosave.

### Published record

- Sender must be the authenticated creator and a member of `pairingId`.
- Recipient must be the other current pairing member.
- `clientPublicationId` is 16–80 URL-safe characters and makes publishing idempotent.
- Composition, sender, recipient, and preview path are immutable after creation.
- Only `receivedAt`, `viewedAt`, `shareEnabled`, and `shareRevokedAt` may change, under field-specific rules.

## 5. Local draft persistence

Recommended key space:

```text
letters:bouquets:v1:{ownerId}:{draftId}
letters:bouquets:index:v1:{ownerId}
```

IndexedDB is preferred over `localStorage` because compositions and history can grow beyond simple string settings. The adapter must expose a storage interface so tests can use an in-memory implementation.

Autosave triggers:

- 400–800 ms after a meaningful edit settles;
- immediately on step change;
- immediately on `visibilitychange` to hidden;
- before starting publication.

Undo history is session-local and not required after reopening. The latest valid composition, current step, and publication ID are restored.

Kept received bouquets follow the existing Letters keepsake rule: store only bouquet IDs in a device-local list partitioned by account. Removing an ID from that list does not delete or alter the published bouquet.

## 6. Publish transaction

1. Validate and normalize the local draft.
2. Freeze a `BouquetCompositionV1` snapshot.
3. Render a preview from the same composition renderer.
4. Upload the preview to the pairing-scoped Storage path.
5. Commit bouquet metadata and published content in one Firestore batch keyed by the idempotent publication ID.
6. Mark the local draft sent only after the batch succeeds.
7. Optionally create a public share token through the server endpoint.

If preview upload succeeds but the Firestore batch fails, retry reuses the same object path. A scheduled cleanup job is out of v1; uploads are overwritten by the idempotent retry.

## 7. Access rules

### Pairing access

- Authenticated pairing members can read published bouquets for their pairing.
- Only the authenticated sender can create a bouquet.
- No client can modify published composition content.
- The recipient may set `receivedAt` and `viewedAt` once.
- The sender may enable or revoke a public share.
- Sent bouquets cannot be deleted in v1.

### Public links

- Generate at least 128 bits of cryptographic randomness and expose it as a URL-safe `shareId`.
- Store only a SHA-256 hash of the raw token in `bouquetShares`.
- Deny all direct client reads and writes to `bouquetShares` in Firestore rules.
- Resolve links through a Vercel server endpoint using Firebase Admin.
- Return only the immutable composition, note, safe display names, created date, and a short-lived preview URL or proxied preview.
- Use the same endpoint to render Open Graph metadata.
- Revocation takes effect at the server lookup; a revoked link returns a generic unavailable state.
- Do not reveal whether an unavailable token once existed.

The unguessable token is an access capability, not a substitute for Firestore rules. Private pairing data remains unreadable from the public client SDK.

## 8. Versioning and migration

- Every composition, draft, published payload, and share record includes an integer `version`.
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
- active, revoked, malformed, and nonexistent share tokens;
- public response field allow-list;
- immutable published composition and preview path.

## Approval gate

This model is a contract, not an implementation. Firestore collections, Storage paths, rules, API handlers, and runtime types must wait until all Phase 0 documents are approved.
