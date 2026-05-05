# Geometric Password — Deployment & Maintenance Guide

---

## File Structure

```
geometric-password/
├── index.html                  ← Main page (never needs editing)
├── css/
│   └── style.css               ← All styles (edit to restyle)
├── js/
│   └── app.js                  ← All logic (edit to add features)
└── data/
    └── breach-dictionary.js    ← Breach list (edit regularly)
```

---

## Part 1 — Uploading to the Web

### Option A: Netlify (Recommended — Free, Instant)

1. Go to https://netlify.com and create a free account.
2. From your Netlify dashboard click **"Add new site"** → **"Deploy manually"**.
3. Drag and drop the entire `geometric-password/` folder onto the upload zone.
4. Netlify assigns you a URL like `https://amazing-newton-abc123.netlify.app`.
5. To use a custom domain (e.g. `geometricpassword.com`):
   - Go to **Site settings** → **Domain management** → **Add custom domain**.
   - Follow the DNS instructions for your domain registrar.
6. Every future update: drag and drop the folder again, or use the Netlify CLI.

### Option B: GitHub Pages (Free, Version-controlled)

1. Create a free account at https://github.com.
2. Click **"New repository"** → name it `geometric-password` → set it **Public**.
3. Upload all files maintaining the folder structure (drag into the repository page).
4. Go to **Settings** → **Pages** → under **Source** select **"main"** branch, folder **"/ (root)"**.
5. Click **Save**. Your site is live at `https://yourusername.github.io/geometric-password/`.
6. To update: edit the file on GitHub directly, or push changes via Git.

### Option C: Traditional Web Hosting (cPanel / FTP)

1. Log in to your hosting control panel (cPanel, Plesk, etc.).
2. Open **File Manager** and navigate to `public_html/`.
3. Create a folder called `geometric-password/` inside `public_html/`.
4. Upload all files maintaining the exact folder structure:
   ```
   public_html/
   └── geometric-password/
       ├── index.html
       ├── css/style.css
       ├── js/app.js
       └── data/breach-dictionary.js
   ```
5. Visit `https://yourdomain.com/geometric-password/` to confirm it works.
6. For FTP access: use FileZilla (free). Host = your domain, Port = 21,
   user/password = your hosting credentials.

### Option D: Vercel (Free, Fast CDN)

1. Go to https://vercel.com and sign up (GitHub login works).
2. Click **"Add New Project"** → **"Browse"** → select your `geometric-password/` folder.
3. Click **Deploy**. Done. Live in ~30 seconds.

---

## Part 2 — Updating the Breach Dictionary

The breach dictionary lives entirely in one file:
```
data/breach-dictionary.js
```

### How to add new passwords

1. Open `data/breach-dictionary.js` in any plain text editor
   (Notepad on Windows, TextEdit on Mac, VS Code, etc.).

2. Find the `BREACH_PASSWORDS` array. It looks like this:
   ```javascript
   const BREACH_PASSWORDS = [
     'password', '123456', 'qwerty',
     // ... more entries ...
   ];
   ```

3. Add new passwords inside the array, one per line, each in single quotes followed by a comma:
   ```javascript
   'mynewbadpassword',
   'another_weak_one',
   'CompanyName2024',
   ```

4. Save the file.

5. Re-upload **only** `data/breach-dictionary.js` to your server
   (you do not need to re-upload index.html, style.css, or app.js).

### Rules for entries

- Each entry must be wrapped in **single quotes**: `'example'`
- Each entry must end with a **comma**: `'example',`
- Entries are checked case-insensitively, so `'Password'` will also catch `'PASSWORD'` and `'password'`
- No spaces inside the quotes unless the password itself has a space
- Do not delete the lines at the bottom of the file (the `window.BREACH_LIST = new Set(...)` part)

### Where to find new breach data

- **SecLists** (free, GitHub): https://github.com/danielmiessler/SecLists/tree/master/Passwords
  → Look for `10-million-password-list-top-1000.txt` for the most impactful additions.
- **NCSC UK Password Blocklist**: https://www.ncsc.gov.uk/blog-post/passwords-passwords-everywhere
- **Have I Been Pwned Top 100**: https://haveibeenpwned.com/Passwords
  → Sort by prevalence, copy the top entries you haven't already included.

### Recommended update schedule

| Trigger                        | Action                                      |
|-------------------------------|---------------------------------------------|
| Major breach in the news       | Add the leaked common passwords immediately |
| Every 3 months (routine)       | Pull top 50 from SecLists, add any new ones |
| New product launch / rebranding| Add `ProductName + year` combinations       |

---

## Part 3 — Making Other Changes

### Change the site name or tagline

Open `index.html` and find:
```html
<div class="site-eyebrow">Geometric Password</div>
<div class="headline">Geometric<br><em>Randomness</em></div>
<div class="tagline">// seed + shape + time → unique cipher every time</div>
```
Edit the text between the tags. Save and re-upload `index.html`.

### Change colors

Open `css/style.css`. At the top is a `:root` block with all color variables:
```css
:root {
  --accent: #e8553e;   /* orange-red — used for highlights */
  --blue:   #3d6cfa;   /* blue — used for active states    */
  --green:  #18a96a;   /* green — used for success states  */
  --ink:    #1a1b26;   /* near-black — hero background     */
  ...
}
```
Change any hex value and re-upload `css/style.css`.

### Add a new geometry shape

1. In `js/app.js`, add a new entry to `SHAPE_KEYS`, `SHAPE_LABELS`, and `METHOD`.
2. Add a `drawXxx(seed, t)` function for the canvas animation.
3. Add a `genXxx(cseed, len, cs)` function for password generation.
4. Add a new `<button class="shape-btn">` in `index.html`.

### Change the wordlist (passphrase mode)

In `js/app.js`, find the `WORDS` array near the top and edit it.
Each word should be short (4–8 letters), common English, no proper nouns.

---

## Part 4 — Troubleshooting

| Problem                          | Cause & Fix                                                                 |
|----------------------------------|-----------------------------------------------------------------------------|
| Site shows but QR code is blank  | QR library CDN blocked. Check browser console. Try again after page reload. |
| Breach check always shows safe   | `breach-dictionary.js` not loading. Check file path is exactly `data/breach-dictionary.js`. |
| Fonts look wrong                 | Google Fonts CDN blocked. Add local font files or use system fonts.         |
| Canvas animation is choppy       | Low-end device. Normal — no fix needed.                                     |
| Site not updating after upload   | Browser cache. Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to force refresh. |
| `navigator.clipboard` error      | Site must be served over HTTPS. Netlify/Vercel/GitHub Pages all do this automatically. |

---

## Part 5 — HTTPS Requirement

The **Copy to clipboard** feature requires the site to be served over **HTTPS**, not plain HTTP.

- Netlify: HTTPS is automatic and free.
- GitHub Pages: HTTPS is automatic and free.
- Vercel: HTTPS is automatic and free.
- Traditional hosting: Enable **Let's Encrypt** SSL in your cPanel (free, one-click).

---

*Last updated: 2024. No server-side code required — this is a fully static site.*
