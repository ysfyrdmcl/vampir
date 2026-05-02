---
name: Nocturnal Omen
colors:
  surface: '#16130b'
  surface-dim: '#16130b'
  surface-bright: '#3d392f'
  surface-container-lowest: '#110e06'
  surface-container-low: '#1e1b13'
  surface-container: '#221f16'
  surface-container-high: '#2d2a20'
  surface-container-highest: '#38342b'
  on-surface: '#e9e2d3'
  on-surface-variant: '#dcc0bd'
  inverse-surface: '#e9e2d3'
  inverse-on-surface: '#343026'
  outline: '#a38b88'
  outline-variant: '#554240'
  surface-tint: '#ffb4aa'
  primary: '#ffb4aa'
  on-primary: '#5f1410'
  primary-container: '#4a0404'
  on-primary-container: '#d26a5f'
  inverse-primary: '#9d4139'
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#c9c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#222121'
  on-tertiary-container: '#8a8888'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#7e2b23'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c9c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#16130b'
  on-background: '#e9e2d3'
  surface-variant: '#38342b'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 42px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
  title-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-safe: 20px
  gutter: 12px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  touch-target: 48px
---

## Brand & Style

The brand personality of this design system is rooted in the "Gothic Mystery" aesthetic—a sophisticated blend of dark fantasy and historical Turkish village folklore. It targets a mature audience that values strategic depth and immersive storytelling. The emotional response is one of suspense, elegance, and tactile presence.

The chosen design style is **Tactile Skeuomorphism blended with Glassmorphism**. This approach uses realistic textures like weathered stone and old parchment to ground the digital experience in a physical, "found artifact" reality. High-end finishings, such as gold filigree and candle-lit glows, are layered over semi-transparent surfaces to maintain a modern, mobile-first performance while evoking a sense of ancient luxury.

## Colors

The palette is anchored in a high-contrast, nocturnal atmosphere. Deep black (#0a0a0a) serves as the "Void" background, providing a canvas for the "Blood" burgundy (#4a0404) and "Holy" gold (#d4af37) accents. Ivory (#fdf5e6) is reserved for high-readability text, mimicking aged paper.

Role-specific accents are used sparingly to identify players and game states without breaking the gothic immersion:
- **Purple (Seer):** Mysticism and wisdom.
- **Emerald (Hunter):** Nature and precision.
- **Amber (Traitor):** Danger and deception.
- **Steel Blue (Guardian):** Protection and cold iron.

Interactive elements use the primary burgundy with gold highlights, while inactive states utilize desaturated stone-grey tones.

## Typography

This design system employs a dual-font strategy to balance theme with legibility. 

**Newsreader** (Headings): Chosen for its literary, authoritative serif character. It is used for game titles, role names, and phase announcements. Larger headings should utilize "Optical Sizing" to maintain the elegance of the serifs.

**Manrope** (Body & UI): A modern, balanced sans-serif that ensures high legibility on mobile screens, even in low-light environments. It handles the dense information required for ability descriptions and chat logs without visual fatigue. All labels and functional text are set in Manrope to provide a clean contrast against the ornate headings.

## Layout & Spacing

The layout philosophy follows a **Dynamic Portrait Grid** optimized for single-handed mobile play. Elements are arranged based on safe-area awareness to avoid occlusion by notches or home indicators.

- **Vertical Rhythm:** Spacing follows a 4px baseline, with larger 32px gaps between major functional sections (e.g., Player List vs. Action Bar).
- **Margins:** A consistent 20px horizontal margin ensures content is never cramped against the device edges.
- **Safe Zones:** Critical interaction zones are kept within the middle 60% of the screen height to allow for comfortable thumb reach.
- **Grids:** For card-based role selection, a 2-column fluid grid is used, maintaining a 12px gutter.

## Elevation & Depth

Visual hierarchy is established through **Atmospheric Layering**:

1.  **The Abyss (Level 0):** The base background, a deep #0a0a0a black with a subtle stone texture overlay.
2.  **The Chamber (Level 1):** Large UI panels using semi-transparent dark burgundy or black (80% opacity) with a 20px background blur (Backdrop Filter).
3.  **The Artifacts (Level 2):** Interactive cards and buttons. These use "Candle-lit" shadows—extra-diffused, soft #000000 shadows with a subtle #d4af37 (Gold) outer glow (2px) to simulate light hitting an edge.
4.  **The Divine (Level 3):** Modals and pop-ups. These feature a 1px solid gold border and a heavier inner drop shadow to create a recessed, framed effect.

## Shapes

The shape language reflects the "Village Gothic" theme. We avoid overly sharp industrial edges in favor of **Rounded-LG (1rem)** for main containers and cards, which suggests the worn edges of old books or smooth masonry.

Functional buttons use a slightly tighter radius to feel more precise. Secondary icons are housed within circular frames to represent coins or wax seals.

## Components

- **Buttons:** Primary buttons are "Seal-style"—deep burgundy backgrounds with gold inline borders and Newsreader Medium text. Secondary buttons are "Ghost-style" with ivory outlines. Minimum touch target is always 48px.
- **Role Cards:** These are the centerpiece. They feature a weathered parchment texture background, a gold-foiled border, and the character illustration. The card title is centered in Newsreader.
- **Status Chips:** Small, semi-transparent pills with role-specific accent borders (e.g., a purple border for Seer-related status).
- **Input Fields:** Styled as "Ledger Lines"—no box, just a subtle ivory bottom border with a flickering gold cursor.
- **Lists:** Player lists are separated by thin, low-opacity gold dividers. Active players are highlighted with a soft candle-glow effect behind their avatar.
- **Action Bar:** A fixed bottom component using a heavy blur and a 1px gold top border, housing the primary game-loop interactions.