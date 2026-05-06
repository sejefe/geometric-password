# Geometric Password

> *Geometric Randomness* — SHA-256 seeded · CSPRNG salted · geometrically permuted · 100% client-side

A password generator that uses real cryptographic primitives (Web Crypto API) combined with geometric mathematics to produce strong, unique passwords. No data is ever sent to a server.

---

## Live Demo

Once deployed to GitHub Pages, your site will be at:
```
https://<your-username>.github.io/geometric-password/
```

---

## Cryptographic pipeline

```
User seed (text or number)
        │
        ▼
   SHA-256(seed)                          ← Web Crypto API
        │
        ├─── + crypto.getRandomValues()   ← 128-bit CSPRNG salt (unique per generation)
        ├─── + Unix timestamp (seconds)
        └─── + Geometry ID (auto-selected)
                │
                ▼
        SHA-256(all combined)             ← Master key (256 bits)
                │
                ▼
    HMAC-SHA-256 counter mode             ← Cryptographically secure byte stream
                │
                ▼
    Geometric XOR permutation             ← Fibonacci / Dodecahedron / Tetrahedron
                │
                ▼
    Rejection sampling → charset          ← No modulo bias
                │
                ▼
           Password ✓
```

**The geometry is selected automatically** by the crypto engine from the SHA-256 of the seed + a fresh random salt. Users cannot influence which shape is chosen — it is revealed only after generation.

---

## Features

- 🔐 **SHA-256 seed hashing** — seed text is cryptographically hashed before entering the pipeline
- 🎲 **128-bit CSPRNG salt** — unique per generation via `crypto.getRandomValues()`
- 🔑 **HMAC-SHA-256 counter mode** — provably secure key derivation (similar to HKDF-Expand)
- 📐 **Geometric permutation layer** — Fibonacci spiral, Dodecahedron faces, Tetrahedron edges
- 🚫 **Rejection sampling** — eliminates modulo bias in character mapping
- 🔒 **Zero server contact** — everything runs in the browser
- 📋 **Passphrase mode** — NIST-aligned word sequences
- 📱 **QR code export** — transfer to mobile without typing
- 🧾 **Cryptographic provenance** — full audit trail of every derivation input
- 📖 **Breach dictionary check** — local check against common passwords
- 🕐 **Session history** — last 10 generated passwords (in-memory only)

---

## File structure

```
geometric-password/
├── index.html                  ← Main page
├── css/
│   └── style.css               ← All styles
├── js/
│   ├── crypto-engine.js        ← SHA-256, CSPRNG, master key, stream generation
│   ├── geometry.js             ← Geometric data and permutation kernels
│   ├── canvas.js               ← Animated 3D shape rendering
│   ├── ui.js                   ← DOM helpers, display logic
│   └── app.js                  ← Application orchestrator, event listeners
└── data/
    └── breach-dictionary.js    ← Common password blocklist (update regularly)
```

---

## Deploying to GitHub Pages

### Step 1 — Create the repository

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click the **+** icon → **New repository**.
3. Name it exactly: `geometric-password`
4. Set visibility to **Public**.
5. Leave all other options as default.
6. Click **Create repository**.

### Step 2 — Upload the files

**Option A — GitHub web interface (no Git required):**

1. On your new repository page, click **uploading an existing file**.
2. Drag and drop the entire contents of the `geometric-password/` folder.
   > ⚠️ Upload the *contents* of the folder, not the folder itself.
   > GitHub needs to see `index.html` at the root level.
3. Scroll down, add a commit message like `Initial upload`, click **Commit changes**.

**Option B — Git command line:**

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
5. Wait ~60 seconds. Refresh the page.
6. A green banner will appear: *"Your site is live at https://your-username.github.io/geometric-password/"*

> **HTTPS is automatic and free** on GitHub Pages. The Web Crypto API (required for SHA-256 and CSPRNG) only works over HTTPS, so this is essential.

---

## Updating the breach dictionary

The breach dictionary is a plain JavaScript file at `data/breach-dictionary.js`.

### Via GitHub web interface (easiest)

1. Navigate to `data/breach-dictionary.js` in your repository.
2. Click the **pencil icon ✏️** (Edit this file).
3. Find the `BREACH_PASSWORDS` array and add new entries:
   ```javascript
   'mynewpassword',
   'anotherweakone',
   ```
4. Scroll down → click **Commit changes** → **Commit changes** again.
5. GitHub Pages redeploys automatically in ~60 seconds.

### Via Git

```bash
# Edit the file locally
nano data/breach-dictionary.js

# Commit and push
git add data/breach-dictionary.js
git commit -m "Update breach dictionary - $(date +%Y-%m-%d)"
git push
```

### Entry format rules

- Each entry: single quotes + comma: `'example',`
- Checks are case-insensitive (`'Password'` also catches `'PASSWORD'`)
- Don't modify the `window.BREACH_LIST = new Set(...)` line at the bottom

### Where to find new breach data

| Source | URL |
|--------|-----|
| SecLists (top 1000) | https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/10-million-password-list-top-1000.txt |
| NCSC UK blocklist | https://www.ncsc.gov.uk/blog-post/passwords-passwords-everywhere |
| HIBP top passwords | https://haveibeenpwned.com/Passwords |

---

## Updating other content

### Change the site name or tagline

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
  --accent: #e8553e;   /* orange-red — main highlight colour */
  --blue:   #3d6cfa;   /* blue — active states */
  --green:  #18a96a;   /* green — success states */
  --purple: #7c3aed;   /* purple — crypto provenance */
  --ink:    #1a1b26;   /* dark — hero background */
}
```

### Expand the wordlist (passphrase mode)

Edit the `WORDS` array in `js/ui.js`. Keep words short (4–8 letters), common English, no proper nouns.

---

## Requirements

- **HTTPS** — required for Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`). GitHub Pages provides this automatically.
- **Modern browser** — Chrome 60+, Firefox 60+, Safari 12+, Edge 79+.
- **No backend** — pure static site, no Node.js, no server configuration needed.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Site not updating after edit | Hard refresh: `Ctrl+Shift+R` (Win) / `Cmd+Shift+R` (Mac) |
| Copy button not working | Must be served over HTTPS. GitHub Pages does this automatically. |
| QR code blank | QR library CDN may be blocked. Check browser console for errors. |
| Breach check always safe | Check `data/breach-dictionary.js` path is correct and file loaded (browser console). |
| Fonts look wrong | Google Fonts CDN blocked (corporate network). Fonts fall back to system sans-serif. |
| Generation error in console | Web Crypto API unavailable. Confirm URL starts with `https://`. |

---

## Security notes

- **Nothing is logged.** The site has no analytics, no cookies, no localStorage usage.
- **The seed is never stored.** It exists only in the browser's memory during the session.
- **The salt is never reused.** A fresh 128-bit salt is generated via CSPRNG on every generation.
- **The geometry is not secret.** It is a permutation layer that scrambles an already-secure stream — security does not depend on keeping the algorithm secret (Kerckhoffs's principle).
- **The breach dictionary is local.** No network request is made for breach checking.

---

## Licence

MIT — free to use, modify, and distribute.
