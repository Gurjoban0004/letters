# LETTERS — a little closer

## Scene
Someone settles into a softly lit room to write to their favorite person; a pale pink stationery desk gives their words space.

## Visual language
Restrained rose interface on a milky blush surface, with tactile artwork carrying the emotional weight. The source of truth is the `inspo/` folder: `paper.png` supplies desktop stationery, `paper_9-16.png` supplies portrait/mobile stationery, and both `letter.png` and `image.png` supply the envelope drawer. The app uses optimized crops of those exact boards, never stretched across aspect ratios. Never use the former newspaper layout.

Bloom extends this world into a dedicated watercolor flower studio. Its visual authority is `bouquet.png`: cream and blush paper, Cormorant Garamond emotional headings, quiet sans-serif controls, rounded petal-soft trays, clean monoline symbols, and transparent botanical illustrations carrying the focal weight. The builder stays in one viewport-locked workspace with a persistent bouquet canvas, docked tools, and Home / Create / Bouquets navigation; it never becomes a routed step-by-step wizard.

## Tokens
Ink #51363d; secondary #79575f; rose #a34b62; blush #f8eeee; surface #fffafa. CSS uses OKLCH equivalents. Instrument Serif for display, system sans for navigation, Caveat for handwriting, Newsreader for letter prose. Spacing: 4, 8, 12, 16, 24, 32, 48, 64px.

## Layout and components
A slim desktop navigation rail, airy desk, envelope-led mailbox, compact sorting and filtering. On mobile, navigation becomes a bottom bar and composition a single paper column using the portrait 9:16 artwork. Paper is square edged; utility controls use 8px radius or pill buttons. Letter content keeps a generous safe area so florals, tape, stamps, and bows never compete with typing. A draft starts with one compact text block; arrange actions live behind a small ellipsis menu. Envelope choice persists from composition through the sealed letter and letterbox thumbnail. No nested decorative cards.

## Motion
Utility controls: 180–220ms. Opening: envelope lifts and letter unfolds in under one second. Sending: fold, seal, then explicit send. Reduced motion removes transforms. Sound is optional and off by default.

Bloom uses brief functional motion for sheets and direct manipulation. Its only cinematic sequence belongs to the recipient reveal.

## Persistence
Cloud letters retain the existing private Firebase relationship. Drafts and keepsakes are device-local, partitioned by account. Demo is explicitly labeled and never sends to cloud. Rich content is versioned inside the protected letter body, so scheduled text and media share the same access gate.
