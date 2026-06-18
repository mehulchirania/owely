---
name: Owely Design System
description: India-first freemium expense-splitting app. Dark, app-like, UPI-native, touch-first.
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
  accent: "#8b7bff"
  primary: "#8b7bff"
  accent2: "#45e0c8"
  mint: "#54e0a0"
  mint-soft: "#7fcfa6"
  coral: "#ff7a8a"
  coral-soft: "#e09aa2"
  cat-pink: "#ff6fb5"
  cat-cyan: "#45d0e0"
  cat-yellow: "#ffc24b"
  cat-orange: "#ff8a5b"
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
    backgroundColor: "{colors.accent}"
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

Owely is an India-first freemium expense-splitting app for Android and Web. The
product should feel like a quiet, premium money utility rather than a marketing
site once the user is signed in: dense enough for repeated use, calm enough for
trust, and clear enough for poor-network mobile sessions.

The design language is a dark dashboard app with UPI-native money semantics:
mint means "you are owed", coral means "you owe", violet is the primary action
color, and teal is used for secondary positive emphasis. The UI should always
make the real workflow visible first: groups, people, expenses, balances,
settlements, personal expenses, recurring rules, settings, and admin tools.

## Token Source

Runtime tokens live in `src/app/globals.css` under Tailwind v4 `@theme`.
`DESIGN.md` mirrors those values for handoff and review. Use the Tailwind token
names in implementation:

- `bg-ink`, `bg-surface`, `bg-card`, `bg-elevated`, `bg-segment`
- `text-hi`, `text-strong`, `text-muted`, `text-dim`, `text-faint`
- `bg-accent`, `bg-accent2`, `text-mint`, `text-coral`
- `font-sans` for UI text and `font-display` for amounts/headlines

`primary` is retained in the frontmatter as a compatibility alias for older
handoff tooling, but product code should prefer `accent`.

## Color Rules

- Layer surfaces from darkest to lightest: page `ink`, app background `surface`,
  repeated items `card`, transient or hover surfaces `elevated`, controls
  `segment`.
- Use violet `accent` for primary submits and selected navigation.
- Use teal `accent2` sparingly for secondary success affordances.
- Use mint only for positive money position, settled/active status, or "owed to
  you" summaries.
- Use coral only for debt, destructive actions, validation errors, or disputed
  settlement states.
- Category colors are accents, not page themes. Avoid making a whole screen read
  as one category color.

## Typography

- Use Plus Jakarta Sans for forms, labels, body text, cards, navigation, and
  admin surfaces.
- Use Space Grotesk for money amounts, dashboard totals, hero headings, and
  compact display metrics.
- Do not scale font size with viewport width. Use fixed responsive steps and
  `clamp()` only in marketing/landing typography where already established.
- Letter spacing should be zero except small uppercase labels, which may use
  `tracking-[0.08em]`.

## App Shell

The signed-in app should open directly into the working product, not a landing
or explanatory screen. Desktop uses a stable sidebar and constrained content
width; mobile uses bottom/compact navigation and must fit at 375px without
horizontal scroll.

Navigation labels:

- Groups: standard shared ledgers.
- People: direct 1:1 ledgers backed by the same group engine.
- Personal: private own expenses and own recurring rules.
- Settings: profile, plan tools, category management, currency controls.

Use active nav color plus a surface change. Do not rely on color alone: active
items should also have weight, border, or filled surface.

## Core Surfaces

### Groups And People

Group and direct relationship cards should be compact, scannable, and action
oriented. Show name, category, members/peer, and current net position. A direct
relationship is not a separate visual system; it is a two-person group with
person-first copy.

### Expenses

Expense forms should surface reconciliation before submit. Split controls use
segmented buttons or tabs, member chips have 44px minimum hit targets, and money
inputs accept rupee decimals only. Never expose paise in a user input.

Expense rows should prioritize:

1. Title/category
2. Amount
3. Paid by
4. Recurring/receipt/status metadata

### Balances And Settle

Balances should read from stored simplified transfers. Settlement cards should
show who pays whom, exact amount, UPI/cash method, and a clear manual
confirmation step. UPI links open externally; the user returns to Owely to mark
payment made.

### Personal Ledger

The `/own` surface is private and unshared. It should visually sit near the main
expense workflow but avoid debt/split language. It has:

- Monthly personal spent summary
- Add/edit/delete private expense CRUD
- Monthly recurring personal rules for SIPs, insurance, rent, subscriptions, and
  similar fixed obligations
- Day-of-month selector from 1 to 28 to avoid invalid-month drift

Free users can see the affordance for recurring rules but cannot create or
update paid-only recurring definitions.

### Recurring Rules

Recurring rules are definitions, not generated expenses. The UI should label
them as monthly rules and show active/paused state, amount, day of month, and
last generated month when available. Avoid implying a rule has written an
expense until the scheduled generator has actually run.

### Admin

Admin screens are operational tools, not marketing surfaces. Use dense tables,
small controls, and clear edit states. Production admin login must depend on
configured env credentials, not default demo credentials.

## States

Every async surface needs loading, success, empty, and error states.

- Empty groups: prompt for adding an expense or inviting people.
- Empty personal ledger: prompt for a private expense or recurring rule.
- Empty recurring list: explain that no monthly rules exist yet.
- Error messages should be inline and human-readable; never surface Firebase raw
  codes to users.
- Paid-required states should route to Settings or show a clear Pro affordance.

## Accessibility

- Minimum touch target is 44 by 44px.
- Keyboard focus must be visible on every button, input, select, link, menu item,
  chip, and icon button.
- Body text contrast must meet WCAG AA: 4.5:1. Large text and UI components must
  meet 3:1.
- Do not remove native outlines without replacing them.
- Motion must respect `prefers-reduced-motion`. Landing animations already
  reduce to near-zero duration through global CSS.

## Layout Rules

- No horizontal scroll at 375px.
- Avoid nested cards. Use cards for repeated items, modals, and framed tools.
- Do not use decorative gradient blobs/orbs in app surfaces.
- Keep dashboards practical: fewer hero sections, more scannable information.
- Page sections should be full-width bands or constrained layouts, not floating
  card stacks.

## Money And Trust Rules

- Display money through `formatPaise` at the edge.
- Never format paise inline in components.
- Never use floats for stored or intermediate money values.
- Positive positions use mint; negative positions use coral.
- Cash and UPI are the only settlement methods.
- Payment aggregation, wallets, cards, stored value, or gateway flows are out of
  scope and should not appear in UI concepts.

## Implementation Checklist

Before considering a screen done:

- Check 375px viewport with no horizontal scroll.
- Check keyboard focus.
- Check long names, long category labels, and large amounts.
- Check loading, empty, error, and paid-required states.
- Check money is formatted by shared utilities.
- Check Server Actions enforce auth, membership, and paid entitlements where
  required; UI paywalls alone are insufficient.
