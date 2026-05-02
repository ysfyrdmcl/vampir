---
name: Sanguine Court
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e3beb8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#aa8984'
  outline-variant: '#5a403c'
  surface-tint: '#ffb4a8'
  primary: '#ffb4a8'
  on-primary: '#690000'
  primary-container: '#8b0000'
  on-primary-container: '#ff907f'
  inverse-primary: '#b52619'
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#d1c5b3'
  on-tertiary: '#372f23'
  tertiary-container: '#494133'
  on-tertiary-container: '#b9ad9b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#920703'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#eee1ce'
  tertiary-fixed-dim: '#d1c5b3'
  on-tertiary-fixed: '#211b0f'
  on-tertiary-fixed-variant: '#4e4638'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  h1:
    fontFamily: Newsreader
    fontSize: 34px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  safe-margin: 20px
---

## Brand & Style

The design system is rooted in **Gothic Minimalism** with a **Tactile/Skeuomorphic** edge. It is designed to evoke a sense of dread, nobility, and mystery, characteristic of a high-stakes vampire social deduction game. The UI should feel like a physical artifact—an ancient chest or a candlelit table—while maintaining the precision of a modern premium mobile application.

The emotional response is one of "Atmospheric Tension." Every interaction should feel deliberate and heavy. We achieve this by blending ultra-dark backgrounds with rich, physical textures like aged parchment, cold iron, and gold filigree. Subtle animations, such as flickering candle light and moonlight glows, provide a living pulse to the interface without cluttering the mobile screen.

## Colors

The color palette of this design system is heavily weighted toward the dark end of the spectrum to ensure a "True Black" experience on OLED mobile screens. 

- **Backgrounds:** Use `#050505` for the deepest layers. Transitions to `#0A0E1A` (Navy) indicate moonlit areas or "Town" phases, while `#1A0A0A` (Burgundy) is reserved for the "Coven" or high-tension "Night" phases.
- **Accents:** Blood Red is used for active states and critical calls to action. Gold is used for "Exalted" UI elements, such as winners, VIP players, or legendary cards.
- **Surface:** The Muted Parchment is never used as a full-screen background; instead, it is reserved for modals and physical card faces to provide high-contrast readability against the dark environment.

## Typography

This design system utilizes a high-contrast typographic pairing to balance flavor with functionality.

- **Newsreader** serves as our "Cinematic" font. It mimics the look of traditional serif printing. Use this for player names, role titles, and game phase announcements.
- **Manrope** is our workhorse. Its modern, geometric construction ensures that even in small mobile lists or dense action logs, the text remains perfectly legible.

**Styling Note:** For H1 and H2 headers, apply a subtle "Moonlight" drop shadow (1px Y-offset, 2px blur, 40% opacity white) to make text appear etched into the dark background.

## Layout & Spacing

This design system uses a **Fluid Grid** model optimized for one-handed mobile play. 

- **Safe Areas:** A minimum of 20px horizontal margin is required to accommodate edge-to-edge screen curves on modern mobile devices.
- **Vertical Rhythm:** Elements are spaced in multiples of 4px. Use `lg` (24px) spacing between distinct sections (e.g., between the player list and the action buttons) and `sm` (8px) for internal grouping (e.g., between a player's avatar and their status).
- **Interactive Zones:** All primary action buttons must be at least 48px in height to ensure high hit-rate during fast-paced deduction phases.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Moonlight Glows** rather than standard shadows.

1.  **Base Level:** The near-black ground.
2.  **Surface Level:** Dark Navy or Dark Burgundy containers with a 1px inner border of Gold (10% opacity) to define edges.
3.  **Floating Level (Cards/Modals):** These use the Parchment texture. Depth is conveyed via a soft, wide-dispersion "Ambient Shadow" (Black, 60% opacity) and a very thin Blood Red outer glow when a card is selected.
4.  **The Glow:** Use radial gradients of Gold or Dark Navy behind important elements to simulate a faint candle or moonlight source behind the UI.

## Shapes

The shape language is **Soft** but controlled. We avoid fully round or "bubble" aesthetics to maintain the serious, Gothic tone.

- **Standard Elements:** Buttons and small containers use a `0.25rem` (4px) radius.
- **Cards & Modals:** Large surfaces use a `0.75rem` (12px) radius to feel more like physical playing cards or scrolls.
- **Avatars:** Player portraits should be hexagonal or octagonal with a 1px Gold stroke, reinforcing the "courtly" feel.

## Components

- **Primary Action Button:** Background is Blood Red (#8B0000). Use Newsreader for the label in Warm White. Add a subtle top-down gradient and a 1px top-border of lighter red to simulate a physical edge.
- **Player Cards:** Face-down cards use a Dark Navy texture with a Gold filigree pattern. Face-up cards use the Parchment background with etched Manrope text.
- **Status Chips:** Small, pill-shaped markers. "Alive" uses a faint Green glow; "Deceased" uses a Crimson slash across the chip.
- **Modals:** These should slide up from the bottom (iOS style) and use the Parchment texture. The backdrop should be a 70% blur of the current game state.
- **Input Fields:** Minimalist. A single 1px Gold underline that glows when focused. No background fill.
- **Deduction List:** Use a Dark Burgundy row style with Gold dividers. Swipe-left actions are accented with Blood Red for "Accuse."