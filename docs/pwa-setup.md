# PWA (Progressive Web App) Setup

This document explains the PWA configuration for the Restaurant Management System.

## Overview

The application is configured as a Progressive Web App, which means:
- ✅ Users can install it on their devices (mobile, tablet, desktop)
- ✅ Works offline with cached data
- ✅ Fast loading with service workers
- ✅ Native app-like experience
- ✅ Push notifications support (future)

## Files & Configuration

### Core Files

#### `public/manifest.json`
Defines the PWA metadata:
- **name**: Full application name
- **short_name**: Name shown on home screen
- **description**: App description
- **start_url**: Entry point when launched
- **display**: `standalone` (hides browser UI)
- **theme_color**: Primary color (`#3b82f6` - blue)
- **background_color**: Loading screen color
- **icons**: Array of icon sizes for different devices

#### `next.config.ts`
Configured with `next-pwa` plugin:
```typescript
withPWA({
  dest: "public",              // Service worker output location
  register: true,              // Auto-register service worker
  skipWaiting: true,           // Activate new SW immediately
  disable: process.env.NODE_ENV === "development", // Disabled in dev
})
```

#### `app/layout.tsx`
Root layout includes PWA meta tags:
- Manifest link
- Theme color
- Apple-specific meta tags
- Icon references
- Viewport configuration for mobile

### Generated Files (Git Ignored)

When built for production, `next-pwa` generates:
- `public/sw.js` - Service worker for caching
- `public/workbox-*.js` - Workbox runtime files
- `public/worker-*.js` - Additional worker files
- Source maps for all above

These are listed in `.gitignore` and should NOT be committed.

## Icons

### Required Sizes

The PWA requires icons in these sizes (defined in `manifest.json`):
- 72x72 - Android small
- 96x96 - Android medium
- 128x128 - Android large
- 144x144 - Android extra large
- 152x152 - iOS/iPad
- 192x192 - Android baseline (required)
- 384x384 - Android high-res
- 512x512 - Splash screens (required)

### Icon Generation

Three options available:

#### Option 1: Online Tool (Recommended)
1. Visit [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Upload your logo (512x512 recommended)
3. Configure options
4. Download and extract to `public/` folder
5. Ensure files are named: `icon-72x72.png`, `icon-96x96.png`, etc.

#### Option 2: Automated Script
1. Install sharp: `npm install --save-dev sharp`
2. Place source image at `public/icon-source.png` (512x512)
3. Edit `scripts/generate-icons.js` (uncomment the sharp code)
4. Run: `node scripts/generate-icons.js`

#### Option 3: Manual Creation
Create PNG files manually using design software:
- Use `public/icon.svg` as a template
- Export to required sizes
- Name as: `icon-[size]x[size].png`

## Development vs Production

### Development Mode
```bash
npm run dev
```
- PWA features are **DISABLED** by default
- No service worker generated
- Faster builds and hot reload
- To enable PWA in dev: Set `disable: false` in `next.config.ts`

### Production Mode
```bash
npm run build
npm start
```
- PWA features are **ENABLED**
- Service worker active
- Full offline support
- Installable on all devices

## Testing the PWA

### Local Testing

1. Build for production:
   ```bash
   npm run build
   npm start
   ```

2. Open browser (Chrome/Edge recommended):
   ```
   http://localhost:3000
   ```

3. Open DevTools (F12):
   - **Application tab → Manifest**: Check manifest loaded correctly
   - **Application tab → Service Workers**: Verify worker is registered
   - **Lighthouse tab**: Run PWA audit (should score 90+)

4. Test installation:
   - Look for install icon in address bar
   - Click to install
   - App should open in standalone window

### Mobile Testing

1. Connect device to same network
2. Access via device: `http://[your-ip]:3000`
3. On mobile browser, tap "Add to Home Screen"
4. Open installed app
5. Test offline: Enable airplane mode, app should still work

## Customization

### Change Theme Color

Edit in **two places**:

1. `public/manifest.json`:
   ```json
   "theme_color": "#3b82f6",
   "background_color": "#ffffff"
   ```

2. `app/layout.tsx`:
   ```tsx
   <meta name="theme-color" content="#3b82f6" />
   ```

### Change App Name

1. `public/manifest.json`:
   ```json
   "name": "Your Restaurant Name",
   "short_name": "Restaurant"
   ```

2. `app/layout.tsx`:
   ```tsx
   export const metadata: Metadata = {
     title: "Your Restaurant Name",
     description: "Your description",
   }
   ```

### Advanced Service Worker Configuration

For custom caching strategies, create `public/sw.js` manually:
```javascript
// Example: Cache API responses
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

See [next-pwa documentation](https://github.com/shadowwalker/next-pwa) for more options.

## Deployment Considerations

### Prerequisites
- ✅ HTTPS is **REQUIRED** for PWA in production
- ✅ All icons must be present
- ✅ Manifest must be valid JSON

### Vercel/Netlify
PWA works out-of-the-box, no special config needed.

### Custom Server
Ensure your server:
1. Serves `manifest.json` with correct MIME type: `application/manifest+json`
2. Serves service worker files: `sw.js`, `workbox-*.js`
3. Has HTTPS enabled
4. Doesn't cache service worker files (set proper headers)

### Headers Configuration
```nginx
# Nginx example
location = /sw.js {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location = /manifest.json {
  add_header Content-Type "application/manifest+json";
}
```

## Troubleshooting

### PWA not installing
- Check HTTPS is enabled (required)
- Verify all required icons exist
- Check manifest.json is valid (use Chrome DevTools)
- Ensure service worker registered (check Application tab)

### Service worker not updating
- Clear site data in DevTools
- Unregister old service workers
- Hard refresh (Ctrl+Shift+R)
- Check `skipWaiting: true` in config

### Icons not showing
- Verify file names match manifest exactly
- Check file paths are correct (`/icon-192x192.png`)
- Clear browser cache
- Use absolute paths in manifest

### Offline mode not working
- Build for production first (`npm run build`)
- Check service worker is active
- Verify Network tab shows cached responses
- Test with throttling in DevTools

## Resources

- [Next PWA Documentation](https://github.com/shadowwalker/next-pwa)
- [PWA Builder](https://www.pwabuilder.com/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)

## Future Enhancements

Potential PWA features to add:
- 🔔 Push notifications for new orders
- 📲 Web Share API for sharing reservations
- 📍 Geolocation for branch finding
- 📷 Camera API for product photos
- 🔄 Background sync for offline orders
- 💾 IndexedDB for offline data storage
