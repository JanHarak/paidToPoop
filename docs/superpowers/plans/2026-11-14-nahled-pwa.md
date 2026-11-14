# Share preview and PWA – implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a share preview (OG and Twitter meta with a generated image), an installable PWA (manifest, icons, service worker), and a mobile install banner.

**Architecture:** The static files sit in the repo root next to `index.html`: `og.png`, `icons/*`, `manifest.webmanifest` and `sw.js`. A Pillow script in `tools/` generates the images. The banner logic is split in two:
- the pure decision function, in `<script id="instalace-logika">`, tested in Node;
- the DOM part, in `<script id="instalace-ui">`.

**Tech Stack:** Plain HTML/CSS/ES5 JS, Python 3 + Pillow 12 for image generation, and `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-14-nahled-pwa-design.md`

## Global Constraints

- The primary URL is `https://seraber.vercel.app/`. Absolute OG URLs use it. Every path inside the app is relative (`./…`), so the site also works on `https://janharak.github.io/paidToPoop/`.
- The app name is "Záchodová kalkulačka", for both `name` and `short_name`.
- "Teď ne" snoozes the banner for 24 h (86 400 000 ms). The localStorage key is `zachodova-instalace-v1`, with JSON `{odlozenoDo:number, nainstalovano:bool}`. Every access is wrapped in try/catch.
- Never use an em dash anywhere. JS is ES5 style, and the UI is in Czech.
- Colours come from the existing CSS variables:
  - light: `--tile #e6f1f2`, `--grout #cfe0e2`, `--porcelain #fff`, `--ink #0e3b43`;
  - brass: read the `--brass` value from `index.html`;
  - dark background: read it from the dark block in `index.html`.
- Tests run with `node --test` (no directory argument). There are currently 78.

## Review Focus

1. Deploying a new `index.html` must not leave users stuck on a stale copy. Navigation is network-first, and the cache name carries a version (`zachodova-v1`). Old caches are deleted on `activate`.
2. The service worker must work under the GitHub Pages subpath. Register it with `navigator.serviceWorker.register("./sw.js")`, and keep every URL inside `sw.js` relative to its own location.
3. Cross-origin RSS fetches must never be served from cache or intercepted. `sw.js` returns early for any request that is not GET, or that is cross-origin and not Google Fonts.
4. Inside in-app browsers on iOS (Messenger, Instagram), "Přidat na plochu" isn't available. Show the iOS hint only in real Safari: the UA contains `Safari` and does not contain `CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line`. The Task 3 test covers this.
5. The banner must never cover the game in fullscreen, an open layer, or the 20-minute warning. Hide it while `document.documentElement.classList.contains("zamceno")` (the Vrstvy scroll lock) or while `#warnModal` is not hidden. Re-check this on a 1 s tick while the banner is eligible.

---

### Task 1: Preview image, icons, meta tags

**Files:**
- Create: `tools/generuj-obrazky.py`, `og.png`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`, `icons/apple-touch-icon.png` (180), `icons/favicon-32.png`, `icons/favicon.svg`
- Modify: `index.html` `<head>`

**Interfaces:**
- Produces: the icon paths above, which Task 2 uses in the manifest.

- [ ] **Step 1: Write `tools/generuj-obrazky.py`.** It must:
  - be run from the repo root;
  - use Pillow;
  - load the font from `C:/Windows/Fonts/segoeuib.ttf`, falling back to `arialbd.ttf` and then to PIL's default.
- [ ] **Step 2: Draw `og.png` (1200×630).**
  - Background: `--tile` with a `--grout` tile grid of 60 px squares, 2 px lines.
  - Centre: a `--porcelain` rounded card with radius 36 and margins of about 90 px.
  - On the card:
    - "Záchodová kalkulačka" in `--ink`, about 84 px;
    - "Kolik ti zaplatí za čas na porcelánu?" in a muted ink colour, about 40 px;
    - a brass pill with "Kč", positioned to the top right of the title.
  - All Czech diacritics must render.
- [ ] **Step 3: Draw the icon.** It is a `--ink` square with a brass "Kč" glyph in the middle.
  - Save it at 512 px and 192 px. These two icons and the 32 px favicon keep a 12% corner radius with a transparent outside.
  - The maskable 512 px version is full-bleed with the glyph inside the central 80% safe zone.
  - `apple-touch-icon` is 180 px, full-bleed and opaque.
  - `favicon.svg` is the same design as SVG with text.
- [ ] **Step 4: Run** `python tools/generuj-obrazky.py`, then check every file's size with Pillow (`Image.open(p).size`). Expected: the sizes listed above. View `og.png` and the 512 px icon with the Read tool to check them visually.
- [ ] **Step 5: Add the meta tags.** Put them in `<head>` after `<title>`:
  - `description`, using the spec's shortened intro text, under 160 characters;
  - `og:type`, `og:site_name`, `og:title`, `og:description` and `og:url`, with `og:url` set to `https://seraber.vercel.app/`;
  - `og:image`, set to `https://seraber.vercel.app/og.png`, plus `og:image:width` 1200, `og:image:height` 630 and `og:image:alt`;
  - `og:locale cs_CZ`;
  - `twitter:card summary_large_image` and `twitter:image`;
  - `link rel=canonical`;
  - `theme-color` twice, with `media="(prefers-color-scheme: light)"` and `media="(prefers-color-scheme: dark)"`, using the light `--tile` and the dark background colours;
  - `link rel=icon` for the SVG and the PNG-32, and `link rel=apple-touch-icon`.
- [ ] **Step 6: Run** `node --test`. Expected: 78 pass. Then commit:
  ```
  feat: nahled pri sdileni a ikony
  ```

### Task 2: Manifest and service worker

**Files:**
- Create: `manifest.webmanifest`, `sw.js`
- Modify: `index.html`, adding the `<link rel="manifest" href="manifest.webmanifest">` tag and a small registration script at the end of `<body>`

**Interfaces:**
- Consumes: the Task 1 icon paths.

- [ ] **Step 1: Write the manifest.**
  - `name` and `short_name`: "Záchodová kalkulačka"
  - `id`: "./"
  - `start_url`: "./"
  - `scope`: "./"
  - `display`: "standalone"
  - `lang`: "cs"
  - `background_color` and `theme_color`: the light `--tile`
  - `description`: same text as the meta description
  - `icons`: 192 any, 512 any, and maskable-512 with `purpose: "maskable"`
- [ ] **Step 2: Write `sw.js`.**
  - `CACHE = "zachodova-v1"`. The app shell is `["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"]`.
  - `install` pre-caches the shell and calls `skipWaiting()`. `activate` deletes the other caches and calls `clients.claim()`.
  - `fetch` handling:
    - Ignore anything that is not GET.
    - Navigation requests go to the network first and update the cache. On failure, serve the cached request or `./index.html`.
    - Same-origin GET requests are cache-first, then network.
    - `fonts.googleapis.com` and `fonts.gstatic.com` use stale-while-revalidate.
    - Leave everything else alone, with no `respondWith`.
- [ ] **Step 3: Register the worker.** In `index.html`, call `if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js")` after `load`, wrapped in try/catch, with errors going only to `console.warn`.
- [ ] **Step 4: Browser check.** Use the preview `static` on `http://localhost:8000/`, which counts as a secure context:
  - `navigator.serviceWorker.controller` is set after one reload;
  - `caches.keys()` contains `zachodova-v1`;
  - fetching `manifest.webmanifest` returns JSON whose `name` matches;
  - the console has no errors;
  - the RSS feed still loads after the worker takes control.
- [ ] **Step 5: Commit.** Run `node --test`, then commit:
  ```
  feat: PWA manifest a service worker
  ```

### Task 3: Install banner

**Files:**
- Modify: `index.html`, adding `<script id="instalace-logika">`, the banner markup `#instalace` before `#warnLayer`, the CSS, and `<script id="instalace-ui">`
- Test: `tests/instalace.test.mjs`

**Interfaces:**
- Produces `window.InstalaceLogika`:
  - `ODKLAD_MS = 86400000`
  - `platforma(ua: string) -> "ios-safari" | "ios-jiny" | "jiny"`
    - `"ios-safari"`: the UA matches `/iPhone|iPad|iPod/`, contains `Safari`, and has no in-app or other-browser token (`CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line`).
    - `"ios-jiny"`: the other iOS cases.
  - `parse(raw: string|null) -> {odlozenoDo:number, nainstalovano:boolean}`, with defaults `{0, false}` on invalid input.
  - `maZobrazit(o: {mobil:bool, standalone:bool, nainstalovano:bool, odlozenoDo:number, ted:number, rezim:"prompt"|"ios"|null}) -> bool`. It returns true only when all of these hold: `mobil`, `!standalone`, `!nainstalovano`, `ted >= odlozenoDo`, and `rezim !== null`.

- [ ] **Step 1: Write the failing tests.**
  - `platforma` cases:
    - iPhone Safari UA gives `"ios-safari"`;
    - iPhone CriOS gives `"ios-jiny"`;
    - an iPhone UA containing `FBAV` gives `"ios-jiny"`;
    - Android Chrome gives `"jiny"`.
  - `parse` cases:
    - `null` gives the defaults;
    - `"{bad"` gives the defaults;
    - a valid string is read back correctly.
  - `maZobrazit` cases:
    - all conditions true returns true;
    - each single false condition returns false (`mobil:false`, `standalone:true`, `nainstalovano:true`, `rezim:null`);
    - `odlozenoDo = ted + 1` returns false;
    - snoozing at `t` with `t + ODKLAD_MS - 1` returns false, and with `t + ODKLAD_MS` returns true.
- [ ] **Step 2: Run** `node --test`. Expected: FAIL with "Script block not found: instalace-logika".
- [ ] **Step 3: Implement `#instalace-logika`.** Then run `node --test`. Expected: all pass.
- [ ] **Step 4: Build the banner markup and CSS.**
  - `#instalace` is `role="dialog"`, `aria-labelledby` its title, and `hidden`.
  - It is fixed to the bottom with `env(safe-area-inset-bottom)` padding, a `--porcelain` card, a `--line` border and 14 px radius.
  - Its z-index is 40: below the game layer (50) and the warning (61/62).
  - Contents:
    - title "Přidej si kalkulačku na plochu";
    - text, depending on mode: prompt mode says "Otevřeš ji jedním klepnutím jako aplikaci.", iOS mode says "Klepni na Sdílet a pak Přidat na plochu.";
    - button "Nainstalovat", prompt mode only;
    - button "Teď ne".
  - Both themes come from the CSS variables.
- [ ] **Step 5: Implement `#instalace-ui`.**
  - `mobil` is `matchMedia("(pointer: coarse)").matches && innerWidth <= 820`.
  - `standalone` is `matchMedia("(display-mode: standalone)").matches || navigator.standalone === true`.
  - `beforeinstallprompt`: call `preventDefault`, store the event, set `rezim = "prompt"`, and evaluate.
  - `ios-safari` sets `rezim = "ios"`.
  - First evaluation happens 4 s after `load`. After that, while the banner is eligible, a 1 s tick hides it when blocked (Review Focus 5) and shows it when unblocked.
  - "Nainstalovat" calls `deferred.prompt()` and then `userChoice`. On `"accepted"`, hide the banner. On dismissal, snooze it as if the user pressed "Teď ne".
  - "Teď ne" stores `odlozenoDo = Date.now() + ODKLAD_MS` and hides the banner.
  - `appinstalled` stores `nainstalovano: true` and hides the banner.
  - Every storage access is wrapped in try/catch.
- [ ] **Step 6: Browser check** with `resize_window` preset `mobile` (it emulates touch and a mobile UA):
  - To force the iOS mode, temporarily override the UA in the console, or call the UI's evaluation with `rezim` `"ios"`. The banner appears with the iOS copy after about 4 s.
  - "Teď ne" hides it, and localStorage holds `odlozenoDo` about 24 h ahead. After a reload it stays hidden.
  - With a cleared key, opening Rulíčka fullscreen hides the banner, and closing it shows the banner again.
  - On the desktop preset the banner never appears.
  - The console is clean in light and dark mode.
  - Reset the viewport to desktop at the end.
- [ ] **Step 7: Commit.** Run `node --test`, then commit:
  ```
  feat: nabidka instalace aplikace na mobilu
  ```
