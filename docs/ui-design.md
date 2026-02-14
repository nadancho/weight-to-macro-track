# UI design guidelines

## Icons and structural planning

The app uses **Lucide React** (`lucide-react`) for icons. Use icons to support actions and structure:

- **Primary actions:** Prefer icon + label (e.g. `<Save />` + "Save log", `<LogIn />` + "Sign in"). Keeps buttons scannable and consistent.
- **Placement:** Leading icon only; use `className="size-4 shrink-0"` and `aria-hidden` on decorative icons so screen readers focus on the label.
- **Structural planning:** Use `Card` + `CardHeader` / `CardContent` for sections; keep one main action per card when possible. Use `space-y-*` and `gap-*` for rhythm. Nav and CTAs use `flex`/`flex-wrap` for layout.

## Color and gradients

- **Primary:** Silver (cool neutral) in light and dark. Applied with a gentle white gradient on default buttons (`from-white/15 to-transparent`) for depth.
- **Semantic tokens:** Use `bg-primary`, `text-primary-foreground`, `border-border`, `text-muted-foreground` etc. so dark mode and future theming stay consistent.

## Inputs

- Number inputs use the same visual style as text/date: native spinners are hidden in `globals.css` so all inputs share the same border, background, and focus ring.
