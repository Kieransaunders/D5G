# Divi5 Generator — .org screenshot plan (6 shots)

Matches the `== Screenshots ==` list already added to `readme.txt`. Capture at
1280×800 (2x retina = 2560×1600) on the Mac, save as
`plugin/divi5-generator/.wordpress-org/screenshot-1.png` … `screenshot-6.png`
(create `.wordpress-org/` if it doesn't exist — that's the folder .org pulls
listing assets from, separate from the shipped plugin zip).

1. **Chat-driven brief** — open the Divi5 Generator app (`/divi5generate:launch`
   or `npm start` in `app/`), start a new chat, show the brief prompt with a
   real example typed in (e.g. "landing page for a roofing company in Exeter").
2. **Proposal card** — the generated page outline/structure card shown before
   any Divi JSON is built (mid-chat, after the brief).
3. **Mockup preview** — the Stage 1 HTML mockup in the canvas, approved state.
4. **Import card** — the generated Divi 5 JSON landing in the WordPress
   preview/import step (the app's import confirmation UI).
5. **Live page** — the finished, published Divi 5 page open on the target
   WordPress site's front end.
6. **Settings → Divi5 Generator** — the plugin's own admin screen (Settings →
   Divi5 Generator on a real WP install) showing the site URL + API key panel.

Once captured, run the readme validator against the updated file:
https://wordpress.org/plugins/developers/readme-validator/
