# Feed novinek, upozornění po 20 minutách a hodiny – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat do Záchodové kalkulačky RSS feed se záložkami Svět a Peníze, detail článku, upozornění po 20 minutách sezení (varianta B) a hodiny s datem vpravo nahoře.

**Architecture:** Vše zůstává v jediném `index.html`. Čistá logika (parsování RSS, řazení, formátování času) žije v samostatném `<script>` bloku ohraničeném značkami `/* ZK-CORE:START */` a `/* ZK-CORE:END */` a publikuje objekt `window.ZK`. Node testy tento blok vyříznou a spustí ve `vm`, bez závislostí. UI části (hodiny, feed, detail, upozornění) jsou v hlavním skriptu a ověřují se v prohlížeči.

**Tech Stack:** HTML, CSS, vanilla JS (ES5 styl jako stávající kód), Node 22 `node --test` pro testy jádra, `python -m http.server` pro lokální náhled.

**Spec:** [docs/superpowers/specs/2026-11-13-feed-upozorneni-hodiny-design.md](../specs/2026-11-13-feed-upozorneni-hodiny-design.md)

## Global Constraints

- Jeden soubor `index.html`, žádné runtime závislosti ani build. Testy a fixtures smí být v `tests/`.
- Rozhraní česky. Stávající styl: CSS proměnné z `:root`, světlý i tmavý režim, písma Bricolage Grotesque / Atkinson Hyperlegible.
- Zdroje RSS přesně podle tabulky ve spec (6 URL, 3 na záložku).
- Obsah z RSS je nedůvěryhodný: do DOM jen přes `textContent` / atributy, nikdy `innerHTML`. Odkazy a obrázky jen `https:`.
- Odkaz na celý článek: `target="_blank" rel="noopener noreferrer"`, text `Číst celý článek na {zdroj} ↗`.
- Stránkování po 10. Konec seznamu: `To je všechno, spláchni a jdi pracovat.`
- Chyba všech zdrojů: `Zprávy se nepodařilo načíst` + tlačítko `Zkusit znovu`.
- Upozornění: po 20 minutách (`20 * 60 * 1000` ms) běžících stopek, text `Sedíš tu už 20 minut` / `Není čas vrátit se k práci?`, tlačítko `Zavřít`, `role="alertdialog"`. Stopky, déšť bankovek i text výdělku běží dál.
- Hodiny: formát `pá 13. 11. 2026 · 15:42`, `position: fixed` vpravo nahoře, odsazené o šířku pruhu deště `max(44px, calc((100vw - 980px) / 2))`.
- Zalomení ≥ 820 px je stávající breakpoint pro desktop.

## Review Focus

1. **Položka bez obrázku nebo bez `pubDate`** (ČT24 nemá obrázky): karta i detail bez prázdného `<img>`, položka bez data se řadí na konec. Test v Task 1 a 2.
2. **HTML nebo skript v titulku či perexu** (`<img src=x onerror=alert(1)>`, `&lt;b&gt;`): zobrazí se jako čistý text, nic se nespustí. Test v Task 1, kontrola v Task 4.
3. **Jeden zdroj nedostupný, všechny nedostupné, offline:** zobrazí se zbytek, případně chybová hláška se `Zkusit znovu`. Kalkulačka funguje dál. Kontrola v Task 4.
4. **Tlačítko Zpět v telefonu při otevřeném detailu:** zavře detail, neopustí stránku. Kontrola v Task 5.
5. **Karta prohlížeče na pozadí během sezení** (časovače se tam zpomalují): po návratu se upozornění ukáže, pokud uplynulo ≥ 20 min, protože se počítá z `Date.now() - timerStart`, ne z počtu tiků. Spláchnutí před 20 min upozornění nespustí. Kontrola v Task 6.

---

### Task 1: Testovací harness a parsování RSS

**Files:**
- Modify: `index.html` (nový `<script>` blok před stávajícím `<script>` na řádku 463)
- Create: `tests/core.test.mjs`, `tests/load-core.mjs`
- Create: `tests/fixtures/irozhlas.xml`, `tests/fixtures/ct24.xml`, `tests/fixtures/idnes.xml`
- Commit spolu s tím: `docs/`, `TODO.md`, `.gitignore` (zatím necommitnuté)

**Interfaces:**
- Produces:
  - `loadCore(): ZK` v `tests/load-core.mjs`. Načte `index.html`, vyřízne text mezi `/* ZK-CORE:START */` a `/* ZK-CORE:END */`, spustí ho ve `vm.createContext({})` a vrátí `context.ZK`.
  - Typ `Article = { id: string, title: string, link: string, perex: string, image: string|null, category: string|null, date: number|null, source: string }`. `date` jsou ms od epochy, `id` je `link`.
  - `ZK.decodeEntities(s: string): string`: `&amp; &lt; &gt; &quot; &apos; &#39; &nbsp;` (na obyčejnou mezeru) a číselné `&#NNN;` / `&#xHH;`.
  - `ZK.stripTags(s: string): string`: odstraní CDATA obal, HTML značky, dekóduje entity, sloučí bílé znaky, ořízne.
  - `ZK.safeUrl(u: string|null): string|null`: vrátí URL jen pokud začíná `https://`, jinak `null`.
  - `ZK.parseRss(xml: string, sourceName: string): Article[]`: regexové parsování `<item>…</item>` (žádný DOMParser, aby to běželo i v Node). Obrázek z `<enclosure url>` nebo prvního `<media:content url>`. Rubrika z prvního `<category>`. Položky bez titulku nebo bez platného `https` odkazu zahodí.
  - Blok končí `root.ZK = ZK;` uvnitř `(function (root) { … })(typeof window !== "undefined" ? window : globalThis);`.

- [ ] **Step 1: Ulož fixtures.** Stáhni curlem tři feedy „Svět“ ze spec a každý zkrať na hlavičku kanálu a první 3 položky. Do `ct24.xml` přidej ručně čtvrtou položku bez `<pubDate>` a s titulkem `<![CDATA[<img src=x onerror=alert(1)>Test &amp; titulek]]>`.

- [ ] **Step 2: Napiš padající testy** v `tests/core.test.mjs` (`node:test`, `node:assert/strict`):
  - `decodeEntities`: `"A&nbsp;&amp;&#269;&#x161;"` → `"A &čš"`.
  - `stripTags`: `"<![CDATA[<p>Ahoj&nbsp;<b>světe</b></p>]]>"` → `"Ahoj světe"`.
  - `safeUrl`: `"https://a.cz/x"` → beze změny; `"http://a.cz"`, `"javascript:alert(1)"`, `null` → `null`.
  - `parseRss(irozhlas.xml, "iROZHLAS")`: 3 položky, `image` začíná `https://www.irozhlas.cz/`, `category === null`, `date` je číslo, `source === "iROZHLAS"`.
  - `parseRss(ct24.xml, "ČT24")`: 4 položky, všechny `image === null`, první `category` je neprázdný řetězec, perex neobsahuje `&nbsp;` ani `<`. Položka bez data má `date === null`. Zlý titulek je přesně `"Test & titulek"` (značka odstraněná, entita dekódovaná).
  - `parseRss(idnes.xml, "iDNES")`: `image` začíná `https://1gr.cz/`.
  - `parseRss("<rss></rss>", "X")` → `[]`; `parseRss("nesmysl", "X")` → `[]`.

- [ ] **Step 3: Spusť testy, musí padat.** Run: `node --test tests/` Expected: FAIL, `ZK` je `undefined` nebo blok nenalezen.

- [ ] **Step 4: Implementuj blok `ZK-CORE`** v `index.html` a `tests/load-core.mjs` podle Interfaces.

- [ ] **Step 5: Spusť testy.** Run: `node --test tests/` Expected: všechny PASS.

- [ ] **Step 6: Commit**
```bash
git add index.html tests/ docs/ TODO.md .gitignore
git commit -m "feat: add RSS parsing core with node tests"
```

### Task 2: Řazení, relativní čas a formát hodin

**Files:**
- Modify: `index.html` (blok `ZK-CORE`)
- Modify: `tests/core.test.mjs`

**Interfaces:**
- Consumes: `Article`, `loadCore()` z Task 1.
- Produces:
  - `ZK.mergeArticles(lists: Article[][]): Article[]`: spojí, odstraní duplicity podle `link`, seřadí podle `date` sestupně, `null` na konec.
  - `ZK.relTime(dateMs: number|null, nowMs: number): string`: `< 60 s` → `právě teď`; `< 60 min` → `před X min`; `< 24 h` → `před X h`; jinak `D. M. HH:MM` (místní čas, hodiny a minuty dvoumístně, např. `13. 11. 15:42`); `null` → `""`.
  - `ZK.formatClock(d: Date): string`: `{den} {D}. {M}. {YYYY} · {HH}:{MM}`, dny `["ne","po","út","st","čt","pá","so"]`, např. `pá 13. 11. 2026 · 15:42`.
  - `ZK.WARN_AFTER_MS = 1200000`.

- [ ] **Step 1: Napiš padající testy:**
  - `mergeArticles([[a(10), a(null)], [a(30), dupLinkOf(a10)]])` → data `[30, 10, null]`, délka 3.
  - `relTime(now - 30e3, now)` → `"právě teď"`; `now - 12*60e3` → `"před 12 min"`; `now - 5*3600e3` → `"před 5 h"`; `new Date(2026,10,10,9,5).getTime()` proti `now = new Date(2026,10,13,15,42)` → `"10. 11. 09:05"`; `null` → `""`.
  - `formatClock(new Date(2026,10,13,15,42))` → `"pá 13. 11. 2026 · 15:42"`; `formatClock(new Date(2026,0,4,7,5))` → `"ne 4. 1. 2026 · 07:05"`.
  - `WARN_AFTER_MS === 1200000`.

- [ ] **Step 2: Spusť, musí padat.** Run: `node --test tests/` Expected: FAIL na nových testech.

- [ ] **Step 3: Implementuj** tři funkce a konstantu.

- [ ] **Step 4: Spusť testy.** Run: `node --test tests/` Expected: vše PASS.

- [ ] **Step 5: Commit** `git commit -am "feat: add article merging, relative time and clock format"`

### Task 3: Hodiny vpravo nahoře

**Files:**
- Modify: `index.html` (CSS, `<header>`, hlavní skript)
- Create: `.claude/launch.json` (náhled `python -m http.server 8000`, port 8000)

**Interfaces:**
- Consumes: `ZK.formatClock`.
- Produces: element `<div class="clock" id="clock" aria-live="off">` jako první potomek `<body>`; funkce `tickClock()` v hlavním skriptu.

- [ ] **Step 1: Přidej launch.json** a spusť náhled přes `preview_start` s názvem konfigurace. Ověř, že stránka běží na `http://localhost:8000/`.

- [ ] **Step 2: Implementuj hodiny.** Pilulka ve stylu `.panel` (`var(--porcelain)`, `var(--shadow)`, `border-radius: 999px`), `position: fixed`, `top: calc(.75rem + env(safe-area-inset-top, 0px))`, `right: calc(max(44px, calc((100vw - 980px) / 2)) + .5rem)`, `z-index: 6` (nad deštěm, který má 5). Číslice `font-variant-numeric: tabular-nums`. Hlavička dostane horní odsazení, aby se `h1` na šířce 375 px nepodjel pod hodiny. `tickClock()` se volá hned a pak `setInterval(tickClock, 1000)`. Text se přepisuje jen při změně.

- [ ] **Step 3: Ověř v prohlížeči** při šířce 375 px i na desktopu, ve světlém i tmavém režimu. Přes `javascript_tool`: `document.getElementById("clock").textContent` odpovídá `/^(po|út|st|čt|pá|so|ne) \d{1,2}\. \d{1,2}\. \d{4} · \d{2}:\d{2}$/`. Bounding box hodin se nepřekrývá s `h1` a pravý okraj hodin je vlevo od `.rain-r`. Spusť stopky a ověř, že bankovky padají vedle hodin, ne přes ně.

- [ ] **Step 4: Commit** `git add index.html .claude/launch.json && git commit -m "feat: add date and time clock in top right corner"`

### Task 4: Feed „Čtení na trůn“

**Files:**
- Modify: `index.html` (CSS, nová `<section>` za `.grid`, hlavní skript)

**Interfaces:**
- Consumes: `ZK.parseRss`, `ZK.mergeArticles`, `ZK.relTime`, `ZK.safeUrl`.
- Produces:
  - `FEEDS = { svet: [{name, url}×3], penize: [{name, url}×3] }` přesně podle spec.
  - Stav `feedState[tab] = { status: "idle"|"loading"|"ok"|"error", items: Article[], shown: number }`.
  - `loadTab(tab: "svet"|"penize"): Promise<void>`: `Promise.allSettled` přes 3 `fetch` + `parseRss`. Pokud všechny selžou nebo nevrátí nic, `status = "error"`.
  - `renderFeed()`, `showTab(tab)`.
  - Každá karta je `<button class="news-card" data-id="{link}">`. Klik volá `openDetail(article)` z Task 5 (do té doby jen otevře odkaz).

- [ ] **Step 1: Markup a styl.** Panel `.panel.feed` s `h2` `Čtení na trůn`, přepínač záložek `Svět` / `Peníze` se stávající třídou `.seg` a `role="tablist"`/`role="tab"`, seznam `<div class="news-list" role="tabpanel">`, tlačítko `.more` `Načíst další`. Karta: náhled 72×54 px (`object-fit: cover`, `loading="lazy"`, jen když `image`), titulek tučně, řádek `{zdroj} · {relTime}`. Celá karta je cíl klepnutí s výškou aspoň 44 px. Tři šedé kostrové karty při `loading`.

- [ ] **Step 2: Logika.** První načtení záložky Svět spustí `IntersectionObserver` na panelu (`rootMargin: "300px"`). Záložka Peníze se načte při prvním klepnutí. Výsledky drží paměť. `Načíst další` zvýší `shown` o 10. Když `shown >= items.length`, tlačítko zmizí a zobrazí se `To je všechno, spláchni a jdi pracovat.` Chyba: hláška a `Zkusit znovu`, které zavolá `loadTab` znovu. Relativní časy se přepočítají při každém `renderFeed()`.

- [ ] **Step 3: Ověř v prohlížeči (živé feedy):** po doscrollování k panelu je v Svět 10 karet seřazených od nejnovější a jsou tam aspoň 2 různé zdroje. `Načíst další` přidá 10. Po vyčerpání se ukáže koncová hláška. Peníze načtou jiné články. Karty ČT24 nemají `<img>`.

- [ ] **Step 4: Ověř chyby (Review Focus 2 a 3)** přes `javascript_tool` po obnovení stránky. Před načtením podstrč `window.fetch`, které pro URL ČT24 vrátí zamítnutí: zobrazí se zbylé dva zdroje. Pak `fetch`, které zamítne vše: hláška `Zprávy se nepodařilo načíst`, `Zkusit znovu` po obnovení `fetch` načte data. Kalkulačka po celou dobu reaguje na vstupy. Podstrč odpověď s titulkem `<img src=x onerror="window.__pwned=1">` a ověř, že `window.__pwned` je `undefined` a titulek je vidět jako text.

- [ ] **Step 5: Commit** `git commit -am "feat: add news feed with tabs and load more"`

### Task 5: Detail článku

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `Article`, karty z Task 4, `ZK.safeUrl`.
- Produces: `openDetail(article: Article): void`, `closeDetail(fromPopstate?: boolean): void`, jeden `<div class="detail" role="dialog" aria-modal="true" aria-labelledby="detailTitle" hidden>` v `<body>`.

- [ ] **Step 1: Implementuj.** Na mobilu (< 820 px) přes celou obrazovku, na desktopu vycentrovaný panel s `max-width: 640px` nad ztmavením. Lišta `← Zpět` + jméno zdroje. Velký obrázek jen pokud `image`. Řádek `zdroj · rubrika · čas`, rubrika jen když existuje. Titulek `#detailTitle`, celý perex, odkaz `Číst celý článek na {zdroj} ↗`. Otevření: `history.pushState({detail: true}, "")`, zámek scrollu na `body`, fokus na `← Zpět`. Zavření šipkou nebo Esc volá `history.back()`; handler `popstate` volá `closeDetail(true)`. Po zavření vrátí fokus na kartu, ze které se detail otevřel. Klik na ztmavení na desktopu zavře.

- [ ] **Step 2: Ověř v prohlížeči (Review Focus 4)** při šířce 375 px: klepnutí na kartu otevře detail přes celou obrazovku a stránka pod ním se neposouvá. `history.back()` (simulace tlačítka Zpět) detail zavře a URL ani stránka se nezmění. Esc zavře. Odkaz má `target="_blank"` a `rel="noopener noreferrer"` a `href` začíná `https://`. Detail článku ČT24 nemá `<img>`. Na desktopu je detail vycentrovaný.

- [ ] **Step 3: Commit** `git commit -am "feat: add article detail view"`

### Task 6: Upozornění po 20 minutách (varianta B)

**Files:**
- Modify: `index.html` (CSS, nový dialog, handler `#flush` na řádcích 607–635)

**Interfaces:**
- Consumes: `ZK.WARN_AFTER_MS`, stávající `timerStart`, `timerTick`, `rateMin()`, `money()`.
- Produces:
  - `warnAfterMs`: `ZK.WARN_AFTER_MS`, ale pokud URL obsahuje `?warnAfter=N`, pak `N * 1000` (jen pro ruční testování).
  - `warned: boolean` (vynuluje se při spláchnutí a při startu stopek), `showWarning()`, `hideWarning()`.
  - Třída `body.warn` zapne červený okraj `box-shadow: inset 0 0 0 6px #d93a2b, inset 0 0 60px rgba(217,58,43,.45)` na fixní vrstvě přes celou obrazovku (`pointer-events: none`), červený blok se stopkami a červené tlačítko `.flush`.
  - Dialog `<div class="warn-modal" role="alertdialog" aria-modal="true" aria-labelledby="warnTitle" aria-describedby="warnText" hidden>` se ztmavením.

- [ ] **Step 1: Implementuj.** Kontrola v existujícím `setInterval` stopek: `if (!warned && Date.now() - timerStart >= warnAfterMs) showWarning()`. Kontrola se navíc provede při `visibilitychange`, když se stránka vrátí do popředí. `showWarning`: `warned = true`, `body.warn`, dialog, fokus na `Zavřít`. `hideWarning` (tlačítko i Esc) odebere zvýraznění i dialog. Stopky, `timerTick` ani déšť se nezastavují. Při spláchnutí se zavolá `hideWarning()` a `warned = false`. Bez animace při `prefers-reduced-motion`.

- [ ] **Step 2: Ověř v prohlížeči** s `?warnAfter=5`: spusť stopky, po 5 s se ukáže dialog a červená. Text `Sedíš X:XX a už máš …` dál přibývá a bankovky padají. `Zavřít` odstraní červenou i dialog a stopky běží dál. Za tutéž návštěvu se upozornění už nevrátí. Spláchnutí a nový start s čekáním 5 s ho ukáže znovu. Spláchnutí před 5 s ho neukáže.

- [ ] **Step 3: Ověř kartu na pozadí (Review Focus 5):** s `?warnAfter=5` spusť stopky. Přes `javascript_tool` posuň `timerStart` o 10 s do minulosti a vyvolej `document.dispatchEvent(new Event("visibilitychange"))`: upozornění se ukáže hned, nečeká se na tik.

- [ ] **Step 4: Ověř bez parametru,** že `warnAfterMs === 1200000`.

- [ ] **Step 5: Commit** `git commit -am "feat: add 20 minute toilet warning"`

### Task 7: Celková kontrola

- [ ] **Step 1:** Run: `node --test tests/` Expected: vše PASS.
- [ ] **Step 2:** V prohlížeči při 375 px a na desktopu, ve světlém i tmavém režimu: žádné vodorovné posouvání (`document.documentElement.scrollWidth <= innerWidth`), žádné chyby v konzoli, kalkulačka počítá jako dřív (zadej sazbu 6000, 8 h, 7 min, 3 návštěvy a ověř „Za jednu minutu“ 12,50 Kč).
- [ ] **Step 3:** Commit jen pokud byly opravy. Nepushovat bez pokynu uživatele.
