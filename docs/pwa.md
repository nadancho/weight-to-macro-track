# PWA setup

The app is configured for installability as a Progressive Web App (e.g. “Add to Home Screen” on iOS/Android).

## What’s in place

- **Manifest** (`src/app/manifest.ts`): `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`, `scope`, and icons (SVG fallback + 192×192 and 512×512 PNG).
- **Root layout** (`src/app/layout.tsx`): `viewport` (device-width, themeColor), `manifest` link, and `appleWebApp` metadata for iOS.
- **Icons**: `public/icon.svg` is used as a fallback. For best support on all devices (especially splash screens and install prompts), add PNG icons.

## Adding PNG icons

The manifest references `public/icon-192.png` (192×192) and `public/icon-512.png` (512×512). To generate them:

1. **From design**: Export 192×192 and 512×512 PNGs and save as `public/icon-192.png` and `public/icon-512.png`.
2. **From `public/icon.svg`**: Use an image editor, [Squoosh](https://squoosh.app/), or a script (e.g. with `sharp`: resize the SVG to 192 and 512 and write PNGs to `public/`).

Until those files exist, the manifest still works using the SVG icon where supported.

## Testing

- **Chrome/Edge**: DevTools → Application → Manifest; check “Install” or “Add to Home Screen”.
- **Safari (iOS)**: Share → “Add to Home Screen”. Ensure the site is served over HTTPS (or localhost).
