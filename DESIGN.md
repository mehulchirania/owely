---
name: Owely Design System
description: India-first freemium expense-splitting app. Deep cool-black surfaces, playful UPI-native accents.
colors:
  ink: "#0b0a0e"
  surface: "#100f15"
  card: "#17151f"
  elevated: "#1d1b26"
  segment: "#262333"
  hi: "#f4f2fa"
  strong: "#d9d6e4"
  muted: "#a7a3b8"
  dim: "#807c92"
  faint: "#56536a"
  primary: "#8b7bff"
  accent2: "#45e0c8"
  mint: "#54e0a0"
  mint-soft: "#7fcfa6"
  coral: "#ff7a8a"
  coral-soft: "#e09aa2"
typography:
  sans:
    fontFamily: Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif
  display:
    fontFamily: Space Grotesk, ui-sans-serif, system-ui, sans-serif
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  page:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.hi}"
  surface-base:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.strong}"
  surface-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.hi}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
  surface-elevated:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.strong}"
    rounded: "{rounded.lg}"
  segment-control:
    backgroundColor: "{colors.segment}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
    typography: "{typography.sans}"
  button-secondary:
    backgroundColor: "{colors.accent2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
    typography: "{typography.sans}"
  owed-amount:
    textColor: "{colors.mint}"
    typography: "{typography.display}"
  owe-amount:
    textColor: "{colors.coral}"
    typography: "{typography.display}"
  text-dim:
    textColor: "{colors.dim}"
  text-faint:
    textColor: "{colors.faint}"
  text-mint-soft:
    textColor: "{colors.mint-soft}"
  text-coral-soft:
    textColor: "{colors.coral-soft}"
  touch-target:
    height: 44px
    width: 44px
---

## Overview

Owely is an India-first freemium expense-splitting app. The UI evokes a playful yet highly premium, modern, and trustworthy aesthetic. It relies on a dark, UPI-native visual system prioritizing accessibility and touch interaction on mobile devices.

## Colors

The palette is rooted in deep cool-black surfaces (layered lightest-on-top) paired with energetic semantic brand colors:
- **Surfaces**: Descending layers from `ink` to `segment`.
- **Text**: Descending emphasis from `hi` (headings) down to `faint`.
- **Brand / Accent**: Violet (`primary`) and Teal (`accent2`) for primary calls to action.
- **Semantic Money**: Mint / Green (`mint`) means "you're owed" (positive cash flow), Coral / Red (`coral`) means "you owe" (negative cash flow).

## Typography

- **Plus Jakarta Sans** (`sans`): UI body, crisp legibility at small scale.
- **Space Grotesk** (`display`): Numbers, amounts, and large display headings. Display typography communicates exactness and UPI-readiness.

## Responsiveness & Sizing

- **Mobile First**: Every screen must work at a 375px viewport (iPhone SE width) without horizontal scroll. Test at small viewports first.
- **Touch Targets**: Minimum **44×44px** hit area. No exceptions for icons, split-type selectors, or member chips. Never make touch targets smaller.

## Interaction & Accessibility

- **Focus States**: Interactive elements must have a visible focus state (e.g., `outline: 2px solid var(--color-primary); outline-offset: 3px; border-radius: 12px;`). Don't remove outlines without replacing them.
- **Motion**: Wrap animated transitions in checks for `@media (prefers-reduced-motion: reduce)`. 
- **Contrast**: Minimum AA compliance. 4.5:1 for body text against surfaces, 3:1 for large text and UI components.
