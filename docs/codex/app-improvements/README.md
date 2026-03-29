# Track 1: App Improvements

Core tracker functionality, modernization, and UX polish. The app needs to be great on its own — the Woodland Grove is a reward layer, not a substitute for a solid health tracker.

## Areas

- **Modernization**: Keeping dependencies current, improving performance, cleaning up legacy code
- **UX Polish**: Micro-interactions, animations, responsive design, accessibility
- **Core Features**: Anything that makes the tracker better at tracking (meal logging, history, streaks, insights)
- **Infrastructure**: Caching, PWA improvements, offline support

## Priorities

### Up Next
- **Cache architecture refactor** — Extract client integrations (storage, broadcast, connectivity) from the React provider into a standalone service layer. See [`docs/plans/cache-architecture-refactor.md`](../../plans/cache-architecture-refactor.md)
- **Multi-tab sync** — BroadcastChannel API so changes in one tab appear in others
- **Health check endpoint** — `GET /api/health` for connectivity detection and uptime monitoring
- **Remaining micro-interactions** — Save button checkmark animation, active tab indicator, smooth number transitions

### Future
- **Offline support** — Queue writes when offline, replay on reconnect
- **Streak tracking** — Visual streak counter for consecutive logging days

## Completed

### PWA Safe Areas & Viewport (Mar 28–29)
- `viewport-fit: cover` in root layout for edge-to-edge display
- `env(safe-area-inset-top)` padding on sticky header (fixes iOS status bar overlap)
- `env(safe-area-inset-bottom)` padding on bottom nav
- Maskable icon entries in PWA manifest

### Unified Log Cache (Mar 28)
- `log-cache-provider.tsx` replacing `DataCacheProvider` + cookie cache
- localStorage persistence — instant render from cache on app open
- Optimistic writes — save updates UI immediately, API syncs in background
- Request deduplication per date — prevents race condition on rapid saves
- Removed `data-cache-provider.tsx` and all cookie cache functions

### Micro-Interactions (Mar 28)
- Framer Motion page transitions via `template.tsx` (fade + rise, 150ms enter / 100ms exit)
- Skeleton loaders on dashboard and history pages (replacing "Loading..." text)
- Button press feedback (`active:scale-[0.97]`) on all buttons and nav tabs
- Collapsible calendar — collapsed by default, date bar toggle, auto-close on date pick

### Toast Notifications (Mar 28)
- Right-aligned toast (`top-4 right-4`) with card styling (`bg-card border-border`)
- PawPrint icon for success, X icon for errors
- Framer Motion slide-in from right, auto-dismiss after 2.5s
- `role="alert"` on error toasts for screen readers
- Replaces inline text feedback that caused layout shifts

### Bottom Tab Navigation (Mar 27)
- Fixed bottom bar with 5 tabs: Log, History, Dashboard, Badges, Profile
- Solid `bg-background` (replaced glass blur for readability)
- Active tab highlighting via `usePathname()`
- `active:scale-95` press feedback on all tabs
- Hidden on desktop (`sm:hidden`), desktop nav hidden on mobile

### Weight Stepper (Mar 27)
- Custom stepper replacing standard number input
- Arrow buttons for ±0.1 (large, primary action), text buttons for ±1 (small, secondary)
- Auto-fills from most recent weight entry (14-day lookback)
- Delta badge shows change from previous entry (green loss / red gain)
- Tap center number for keyboard fallback

### Accessibility (Mar 28)
- Skip-to-content link before header
- `id="main-content"` on `<main>` element
- `role="alert"` on error messages
- `aria-hidden` on decorative raccoon
- 44px minimum touch targets on all interactive elements (documented in CLAUDE.md)

### Auth Flow (Mar 28)
- Disabled Supabase email verification (personal app, unnecessary friction)
- Sign-up auto-signs-in and redirects to home (removed intermediate "go sign in" screen)

### Performance (Mar 28)
- Dark mode CSS gradient moved from `background-attachment: fixed` on body to fixed pseudo-element (eliminates repaint on scroll)
- Three `useEffect` fetches on log page replaced with `useMemo` derivations from cache (synchronous reads vs async API calls)

### Macro Screenshot Button (Mar 27)
- Redesigned from dashed border/muted text to solid `bg-secondary` button
- 44px touch target, "Snap macros from photo" label

### Cleanup (Mar 27)
- Removed `.sfdx/` directory, added to `.gitignore`
