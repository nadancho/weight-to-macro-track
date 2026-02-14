# Theme

## Design concept

The app uses an **Instagram-inspired dark mode** as the primary thematic direction:

- **Background:** Dark gray (not pure black) to reduce eye strain; ~7–8% lightness in HSL.
- **Cards/surfaces:** Slightly lighter than background (~10–12% lightness) for hierarchy.
- **Foreground:** High-contrast light gray / white for text and icons.
- **Borders/muted:** Subtle grays for borders and secondary text.

## Semantic tokens

All UI uses Tailwind semantic tokens so light/dark switch only changes CSS variables:

| Token | Role |
|-------|------|
| `background` | Page and main surface |
| `foreground` | Primary text and icons |
| `card` | Card background |
| `card-foreground` | Card text |
| `muted` / `muted-foreground` | Secondary surfaces and text |
| `accent` / `accent-foreground` | Hover states, nav highlight |
| `border` / `input` / `ring` | Borders and focus ring |
| `primary` / `destructive` | Buttons and alerts |

Use only these in components (e.g. `bg-background`, `text-foreground`, `bg-card`, `border-border`). Avoid hard-coded colors so theme stays consistent.

## Icons

Nav and actions use **wire-like (outline)** icons for a clean, minimal look. We use **lucide-react**; its outline variants match this style. Icon + label layout: icon on the left, text on the right, with consistent spacing.
