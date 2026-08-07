# ScanQuest

A camera-based scavenger hunt. Admin places QR markers around a room/building
and writes a clue for each; players open the site, scan markers in order with
their phone camera, get a popup clue after each one, and see a final winning
message after the last marker.

100% static — no server, no database, no API keys. Free to host anywhere that
serves static files over HTTPS (camera access requires HTTPS, except on
`localhost`).

## Files

```
index.html    Player app — camera scanner + clue popups + win screen
admin.html    Admin panel — write clues, generate/print QR markers
style.css     Shared styling
app.js        Player logic
admin.js      Admin logic
data/hunt.json  The live hunt config that index.html loads by default
```

## How it works

- `data/hunt.json` holds the hunt: a title, intro text, an ordered list of
  `stops` (each with a `qrValue` marker code and a `clue`), and a win message.
- Players must scan markers **in order**. Scanning the correct next marker
  shows that stop's clue in a popup, which should tell them where to find the
  *next* marker. After the last marker, they see the win screen.
- Progress is saved per-device in `localStorage`, so closing the tab and
  reopening resumes where they left off.
- QR scanning uses [html5-qrcode](https://github.com/mebjas/html5-qrcode)
  (loaded from a free CDN) — entirely client-side, nothing is uploaded.
- Admin's QR codes are generated client-side with
  [qrcodejs](https://github.com/davidshimjs/qrcodejs).

## Setting up a hunt

1. Open `admin.html` (locally or once deployed).
2. Fill in the title, briefing text, and win message.
3. Add a marker for each physical stop. Each marker needs:
   - A **code** (any short unique string — the default suggestions are fine).
   - A **clue** shown after that marker is scanned, describing where the
     *next* marker is hidden.
4. Click **Save to test mode** to try the flow immediately in `index.html`
   (works in the same browser, no deploy needed).
5. When you're happy, click **Download hunt.json** and replace
   `data/hunt.json` in this folder with the downloaded file.
6. Scroll down to **Printable markers**, click **Print all markers**, and
   print or screenshot each QR code. Tape/place each one at its real-world
   spot.
7. Deploy the folder (see below) so players can open it on their phones.

## Deploying for free

Any static host works. Three easy options:

### GitHub Pages
1. Create a new GitHub repo and push this folder's contents to it.
2. Repo Settings → Pages → Deploy from branch → pick `main` and `/root`.
3. Your site will be live at `https://<username>.github.io/<repo>/`.

### Netlify
1. Go to netlify.com → **Add new site** → **Deploy manually**.
2. Drag this whole folder into the upload area.
3. You get a free `https://your-site-name.netlify.app` URL immediately.

### Cloudflare Pages / Vercel
Both offer a free tier with the same "connect a repo or drag a folder"
workflow and automatic HTTPS.

## Notes

- Camera access needs HTTPS (or `localhost` for local testing) — every host
  above provides HTTPS automatically.
- There's a **manual code entry** field under the scanner as a fallback for
  devices without camera access, or for testing without printing anything —
  just type the marker's code and hit Check.
- To run a *second, different* hunt, duplicate this whole folder and edit its
  own `data/hunt.json` — each deployed copy is independent.
