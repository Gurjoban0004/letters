# LETTERS — a little closer

## Scene
Someone settles into a softly lit room to write to their favorite person; a pale pink stationery desk gives their words space.

## Visual language
Restrained rose interface on a milky blush surface, with tactile artwork carrying the emotional weight. The source of truth is the `inspo/` folder: `paper.png` supplies desktop stationery, `paper_9-16.png` supplies portrait/mobile stationery, and both `letter.png` and `image.png` supply the envelope drawer. The app uses optimized crops of those exact boards, never stretched across aspect ratios. Never use the former newspaper layout.

Bloom extends this world into a dedicated watercolor flower studio. Its visual authority is `bouquet.png`: cream and blush paper, shared system-sans interface headings and controls, rounded trays, clean monoline symbols, and transparent botanical illustrations carrying the focal weight. The builder stays in one viewport-locked workspace with a persistent bouquet canvas, docked tools, and a shared compact navigation header. The letterbox’s Bouquets tab opens this focused workspace; composing, adding a note, and previewing stay in the same canvas.

## Tokens
Interface ink #432d36; secondary #71515c; rose #c13a67; app background #f8f2f3; surface #fffcfc; separator #e9dfe2. System sans for app titles, controls and list content; Instrument Serif for intimate reading moments, Caveat for handwriting, Newsreader for letter prose. App titles are 34px semibold/bold, body 16px, supporting copy 13–15px and tab labels 11px. Spacing: 4, 8, 12, 16, 24, 32, 48, 64px.

## Layout and components
A slim desktop navigation rail and one shared iOS-style shell for Letters, Bouquets, Drafts and Settings. Use 20px phone margins, 24px wider margins, consistent large titles, inset grouped lists, native-style switches and a quiet blush background. Keep illustrations inside the keepsakes and compose prompts. On mobile, four equal-width labeled tabs sit in a 64px translucent capsule at max(4px, safe-area-inset-bottom), with content clearance derived from the same dimensions. Tab changes fade, retain their scroll position and filters, and tapping the active tab returns to its top. Composition and reading hide the tabs and make the background inert; utility headers have consistent back actions. Utility controls use 14px corners and grouped surfaces use 16–20px corners. Composition remains a single paper column using the portrait 9:16 artwork. Letter content keeps a generous safe area so florals, tape, stamps, and bows never compete with typing. A draft starts with one compact text block; arrange actions live behind a small ellipsis menu. Envelope choice persists from composition through the sealed letter and letterbox thumbnail. No nested decorative cards.

## Motion
Utility controls: 180–220ms. Opening: envelope lifts and letter unfolds in under one second. Sending: fold, seal, then explicit send. Reduced motion removes transforms. Sound is optional and off by default.

Bloom uses brief functional motion for sheets and direct manipulation. Its only cinematic sequence belongs to the recipient reveal.

## Persistence
Cloud letters retain the existing private Firebase relationship. Drafts and keepsakes are device-local, partitioned by account. Demo is explicitly labeled and never sends to cloud. Rich content is versioned inside the protected letter body, so scheduled text and media share the same access gate.
