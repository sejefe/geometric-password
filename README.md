# Geometric Password

> **Geometric Randomness** — SHA-256 seeded · 128-bit CSPRNG salt · geometric XOR permutation · 100% client-side

A cryptographically sound password generator that uses the Web Crypto API combined with geometric mathematics to produce strong, unique passwords. Nothing is ever sent to a server.

---

## Live site

After deploying to GitHub Pages your site will be at:

```
https://<your-username>.github.io/geometric-password/
```

---

## Cryptographic pipeline

```
User seed (text or number)
        │
        ▼
   SHA-256(seed)                         ← crypto.subtle.digest
        │
        ├── + crypto.getRandomValues()   ← 128-bit CSPRNG salt (unique every time)
        ├── + Unix timestamp (seconds)
        └── + Geometry ID (auto-selected, not user-controlled)
                │
                ▼
        SHA-256(all combined)            ← 256-bit master key
                │
                ▼
   HMAC-SHA-256 counter mode             ← secure pseudorandom byte stream
                │
                ▼
   Geometric XOR permutation             ← Fibonacci / Dodecahedron / Tetrahedron
                │
                ▼
   Rejection sampling → charset          ← no modulo bias
                │
                ▼
          Password ✓
```

The geometry is selected automatically by the engine — the user has no control over which shape is picked. It is revealed in the provenance panel only after generation.

---

## Key design decisions

| Decision | Reason |
|----------|--------|
| All logic in `js/app.js` (one file) | No module bundler, no load-order issues, GitHub Pages works out of the box |
| IIFE wrapping | Keeps all variables private, no global namespace pollution |
| Rejection sampling for charset | Eliminates modulo bias — every character has exactly equal probability |
| HMAC-SHA-256 counter mode | Standard KDF construction, provably secure stream expansion |
| 128-bit CSPRNG salt | Same seed + same time never repeats |
| Geometry as XOR permutation | Scrambles an already-secure stream; security does not depend on keeping the algorithm secret (Kerckhoffs's principle) |

---

## File structure

```
geometric-password/
├── index.html                  ← page structure and script loading order
├── css/
│   └── style.css               ← all styles and CSS variables
├── js/
│   └── app.js                  ← entire application: crypto, geometry, canvas, UI, events
└── data/
    └── breach-dictionary.js    ← common password blocklist (update regularly)
```

---

## Deploy to GitHub Pages

### Step 1 — Create the repository

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click **+** → **New repository**.
3. Name it `geometric-password`, set to **Public**, leave all other options as default.
4. Click **Create repository**.

### Step 2 — Upload the files

**Via the GitHub web interface (no Git required):**

1. On your new repository page, click **"uploading an existing file"**.
2. Drag and drop the **contents** of this folder.

   > ⚠️ Upload the *contents* — GitHub needs `index.html` at the root level, not inside a subfolder.

3. Add a commit message such as `Initial upload` → click **Commit changes**.

**Via Git command line:**

```bash
cd geometric-password
git init
git add .
git commit -m "Initial upload"
git branch -M main
git remote add origin https://github.com/<your-username>/geometric-password.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. In your repository, click **Settings** (top tab row).
2. In the left sidebar, click **Pages**.
3. Under **Source**, select:
   - Branch: **main**
   - Folder: **/ (root)**
4. Click **Save**.
5. Wait ~60 seconds, then refresh — a green banner will show your live URL.

> **HTTPS is automatic and free** on GitHub Pages. The Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`) requires HTTPS — this is why GitHub Pages is the simplest hosting choice.

---

## Updating the breach dictionary

The breach list lives entirely in `data/breach-dictionary.js`.

### Via the GitHub web interface (easiest — no Git needed)

1. Navigate to `data/breach-dictionary.js` in your repository.
2. Click the **pencil icon ✏️**.
3. Add new entries inside the `BREACH_PASSWORDS` array:
   ```javascript
   'mynewpassword',
   'anotherweakone',
   ```
4. Click **Commit changes** → **Commit changes**.

GitHub Pages redeploys automatically within ~60 seconds.

### Via Git

```bash
# Edit locally
nano data/breach-dictionary.js   # or use any text editor

# Commit and push
git add data/breach-dictionary.js
git commit -m "Update breach dictionary $(date +%Y-%m-%d)"
git push
```

### Entry format rules

- Each entry: single quotes + comma: `'example',`
- Checks are case-insensitive — `'Password'` also catches `'PASSWORD'` and `'password'`
- Do **not** modify the `window.BREACH_LIST = new Set(...)` line at the bottom of the file

### Sources for new entries

| Source | Link |
|--------|------|
| SecLists top 1 000 | https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/10-million-password-list-top-1000.txt |
| NCSC UK password guidance | https://www.ncsc.gov.uk/blog-post/passwords-passwords-everywhere |
| Have I Been Pwned top passwords | https://haveibeenpwned.com/Passwords |

---

## Making other changes

### Change site name or tagline

Edit `index.html`:
```html
<div class="site-eyebrow">Geometric Password</div>
<h1 class="headline">Geometric<br><em>Randomness</em></h1>
<p class="tagline">// SHA-256 · CSPRNG · geometric permutation · unique every time</p>
```

### Change colours

Edit the `:root` block at the top of `css/style.css`:
```css
:root {
  --accent:  #e8553e;   /* orange-red — main highlights */
  --blue:    #3d6cfa;   /* blue — active states */
  --green:   #18a96a;   /* green — success */
  --purple:  #7c3aed;   /* purple — crypto provenance */
  --ink:     #1a1b26;   /* dark — hero background */
}
```

### Expand the passphrase wordlist

Edit the `WORDS` array near the top of `js/app.js`. Keep entries short (4–8 letters), common English, no proper nouns.

### Add a new geometry

1. In `js/app.js`, add the shape name to the `SHAPES` array and a description to `SHAPE_METHODS`.
2. Add a `drawXxx(t)` canvas function and call it from the `runAnimation` frame loop.
3. Add an `xorXxx(stream)` permutation function and add a case in `applyPermutation`.

---

## Requirements

- **HTTPS** — required for `crypto.subtle` and `crypto.getRandomValues`. GitHub Pages provides this automatically.
- **Modern browser** — Chrome 60+, Firefox 60+, Safari 12+, Edge 79+.
- **No backend** — pure static site, zero server-side code.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Site not updating after a commit | Hard refresh: `Ctrl+Shift+R` (Win/Linux) / `Cmd+Shift+R` (Mac) |
| Copy button not working | Must be served over HTTPS. Local `file://` URLs won't work — use GitHub Pages. |
| QR code blank | CDN may be temporarily unavailable. Try refreshing. Check browser console. |
| Breach check always green | Verify `data/breach-dictionary.js` loaded — check browser console for 404 errors. |
| Generation fails with error | Confirm URL starts with `https://` — Web Crypto requires a secure context. |
| Fonts not loading | Google Fonts CDN blocked (some corporate networks). Text falls back to system sans-serif — everything still works. |

---

## Security notes

- **Nothing is logged.** No analytics, no cookies, no `localStorage` usage.
- **The seed is never stored** beyond the browser's memory for the current session.
- **The salt is never reused.** 128 bits from `crypto.getRandomValues()` on every generation.
- **Geometry is not secret.** It is a permutation layer on top of an already-secure stream. Per Kerckhoffs's principle, security does not depend on hiding the algorithm.
- **Breach checking is fully offline.** No network request is made.

---

## Licence

MIT — free to use, modify, and distribute.
