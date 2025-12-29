## Design System v0

This project uses a two-theme system powered by `next-themes` with **dark as the default**. Themes are applied via the `class` attribute on `<html>` and consume CSS variables defined in `app/globals.css`.

### Themes
- **Default:** Dark (`class="dark"`) with a near-black violet-tinted background and light, high-contrast text.
- **Light:** Soft, violet-tinted neutrals for backgrounds with the same violet primary.
- Theme switching is handled by the global `ThemeProvider` and `ThemeToggle` button in the shell header.

### Color tokens
- `--primary`: violet-indigo accent used for actions and focus rings.
- Surfaces: `--background` (page), `--card` (panels/popovers), `--popover`.
- Supporting: `--secondary` (quiet UI), `--muted` (subtle backgrounds/text), `--accent` (decorative), `--destructive` (alerts).
- Text pairs: `--foreground`, and matching `*-foreground` tokens for each surface/action.
- Borders/inputs/ring: `--border`, `--input`, `--ring` ensure consistent outlines and focus.

### Radii and spacing
- Base radius `--radius` ≈14px, with derived tokens to keep components softly rounded (12–16px range). Use Tailwind radius utilities (`rounded-lg`, `rounded-xl`, etc.) to stay on-scale.
- Maintain 4/8px spacing cadence for padding and gaps in new components.

### Typography
- Headings are bold and oversized for clarity:
  - `h1`: `text-4xl` `font-extrabold`
  - `h2`: `text-3xl` `font-bold`
  - `h3`: `text-xl` `font-bold`
- Body copy: `text-base` with `leading-relaxed`, weights 400–500.
- Base font stack is Inter → system sans via `--font-sans` in globals.

### Interaction and focus
- Buttons, inputs, and interactive elements should:
  - Use the shared `Button` component variants where possible.
  - On hover: gentle elevation or tone shift, no harsh transitions.
  - On focus: visible ring tinted with the primary violet (`--ring`) plus background offset.
  - Disabled: reduced opacity and `cursor-not-allowed`.

### Layout & components
- Surfaces should use `bg-background` for pages and `bg-card` for panels, with `border-border`.
- Text defaults to `text-foreground`, while muted text uses `text-muted-foreground`.
- Reuse shadcn/ui patterns and tokens for any new component styling; avoid bespoke color codes.

### Usage rule
- All new pages and components must rely on these tokens and shadcn/ui primitives. Do not introduce new color constants or divergent radii without updating the tokens first.
