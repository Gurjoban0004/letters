# iOS-style UI/UX pass — 15 October 2026

Letters, Bouquets, Drafts and Settings now share system typography, 34px page titles, consistent margins, grouped surfaces, compact navigation headers and one blush background. The stationery and bouquet artwork remain the focal content.

## Changes
- Replaced overlapping three-tab/four-tab CSS with one equal-column navigation bar. Icons are centered, labels are visible, and badges have consistent placement.
- Positioned the 64px tab bar at the greater of 4px or the bottom safe-area inset. Content clearance uses the same dimensions.
- Kept tab selection in the URL, preserved each tab’s scroll position and the letterbox filters, and made re-tapping the active tab scroll to its top.
- Removed duplicate introductory sections, direction badges and repeated settings/sound controls.
- Added letterbox search using the existing filtering behavior and clarified empty states.
- Used grouped settings and accessible switches, and made the underlying screen inert while a letter is open.
- Unified the letter editor, reader and bouquet studio headers. Corrected the bouquet progress display to three actual stages.
- Fixed bouquet note/review tray sizing and preserved the canvas throughout composition.
- Kept the editor open when a draft fails to save, instead of dismissing unsaved writing.
- Updated PWA theme colors to match the app background.

## Verified
- Production build, existing five test suites and clean whitespace check.
- Design detector: no findings on the changed UI targets.
- Browser checks: four visible navigation labels, icon centering within 0.5px, at least 44px navigation touch targets, 4px bottom gap without a safe-area inset.
- Search, clearing search, settings switches, URL selection, tab scroll restoration and active-tab scrolling.
- Sample letter: compose, customize, preview, seal, send and return to Letters. Reader: open envelope, read and return.
- Sample bouquet: flower library, note, preview, send and appearance in the shared letterbox.
- Forced storage failure: editor and writing remain available with an error message.
- No horizontal overflow at widths of 320, 375, 430, 768 and 1440px. Phone landscape was inspected.
- Simulated 59px top / 34px bottom safe areas; the navigation bar respects the bottom inset.

## Limits
Browser checks used local Chrome with mobile viewports and sample data. Physical iPhone Safari, an installed iOS PWA, the software keyboard, VoiceOver, live sign-in, push permission prompts and authenticated cloud delivery still require device/account verification. No production deployment or live messages were sent.

Reference: [Apple layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout).
