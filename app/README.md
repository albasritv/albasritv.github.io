# BSR static delivery architecture

User pages read only GitHub Pages static files.

- Home: app/data/sections.json
- Section: app/data/categories/<section-id>.json
- Servers are embedded inside the selected category JSON.
- No user-side request goes to Firebase.
- No user-side request goes to Cloudflare Worker.

Firebase remains the admin source only. GitHub Actions mirrors the current LIVE catalog every 5 minutes.

Required repository secrets:
- FIREBASE_DATABASE_URL
- FIREBASE_AUTH_TOKEN (optional if Firebase read rules allow public reads)

The sync reads only:
- /bsr_player/catalog_categories
- /bsr_player/catalog_channels

It does not read bsr_backups.

Important: this repository is public. Server URLs, headers, cookies and DRM fields in generated files are public.
