# Feed novinek, upozornění po 20 minutách a hodiny

Datum: 2026-11-13

## Proč

Záchodová kalkulačka ([index.html](../../../index.html)) je vtipná statická stránka. Spočítá, kolik člověk vydělá za čas na záchodě, a má stopky „Jdu na záchod“ s deštěm bankovek. Aplikace bude **veřejná pro kohokoli** a hlavně na mobilu. Přidáváme:

1. **Feed novinek**, aby měl člověk na záchodě co číst: zprávy ze světa a politiky a články o penězích a investování.
2. **Upozornění po 20 minutách** sezení, s humorným popíchnutím, jestli není čas vrátit se k práci.
3. **Datum a čas** v pravém horním rohu.

## Cíle

- Feed se dvěma záložkami **Svět** a **Peníze**, detail článku v aplikaci a postupné načítání dalších článků. Na mobilu se musí dát pohodlně ovládat palcem.
- Výrazné upozornění po 20 minutách běžících stopek, které jde zavřít.
- Hodiny s datem, které jsou vidět pořád.

## Ne-cíle

- **Celý text článku v aplikaci.** Aplikace je veřejná a přebírání celých textů z českých webů porušuje podmínky vydavatelů. iROZHLAS, ČT24, iDNES, Peníze.cz i Měšec.cz navíc blokují vložení do iframe. Celý článek je proto za odkazem na web vydavatele. Přechod na zdroj s legálním celým textem je zapsaný v [TODO.md](../../../TODO.md).
- Serverová část nebo proxy. Stránka zůstává jeden statický soubor bez buildu.
- Finanční weby bez CORS (Peníze.cz, Měšec.cz, E15, HN, Kurzy.cz, Finparáda, Roklen24). Přijdou později přes proxy, viz TODO.md.
- Push notifikace nebo zvuk při upozornění.

## Anti-cíle (selhání, i když to technicky funguje)

- Stahování a zobrazování celých textů článků (právní riziko pro veřejnou aplikaci).
- Feed, který rozbije nebo zpomalí kalkulačku. Když zdroje nejdou načíst, kalkulačka musí fungovat beze změny.
- Upozornění, které zastaví nebo vynuluje stopky.
- Nepoužitelnost na mobilu: malé cíle pro klepnutí, vodorovné posouvání stránky, detail, ze kterého se nedá vrátit.

## Omezení

- Jeden soubor `index.html`, čisté HTML, CSS a JS, žádné závislosti ani build. Navazuje na stávající styl: obkladačkové pozadí, „porcelánové“ panely, písma Bricolage Grotesque a Atkinson Hyperlegible, CSS proměnné a světlý i tmavý režim.
- Rozhraní je česky.
- Zdroje se načítají přímo z prohlížeče. Ověřené feedy s hlavičkou `Access-Control-Allow-Origin: *` k 2026-11-13:

| Záložka | Zdroj | URL | Článků |
|---|---|---|---|
| Svět | iROZHLAS | `https://www.irozhlas.cz/rss/irozhlas` | 20 |
| Svět | ČT24 (výběr redakce) | `https://ct24.ceskatelevize.cz/rss/hlavni-zpravy` | 30 |
| Svět | iDNES Zpravodaj | `https://servis.idnes.cz/rss.aspx?c=zpravodaj` | 30 |
| Peníze | iROZHLAS Ekonomika | `https://www.irozhlas.cz/rss/irozhlas/section/ekonomika` | 20 |
| Peníze | ČT24 Ekonomika | `https://ct24.ceskatelevize.cz/rss/ekonomika` | 30 |
| Peníze | iDNES Ekonomika | `https://servis.idnes.cz/rss.aspx?c=ekonomikah` | 30 |

- Obsah RSS: všechny zdroje mají `title`, `link`, `description` (perex) a `pubDate`. Obrázek má iROZHLAS v `<enclosure url>` a iDNES v `<media:content url>`. ČT24 obrázek v položce nemá. Perex ČT24 je v CDATA a obsahuje HTML entity (`&nbsp;`).

## Rozhodnutí uživatele

### Feed

- Zdroj je RSS ze zdrojů výše. Detail ukazuje základní informace a celý článek je za odkazem.
- Témata: zprávy ze světa a politika plus investování, peníze a ekonomika.
- Detail článku se otevírá v aplikaci. Načítání dalších článků musí být uživatelsky přívětivé, i na mobilu.
- Odsouhlasený vzhled (mockup):
  - Panel **„Čtení na trůn“** pod kalkulačkou, přes celou šířku `.wrap`.
  - Přepínač záložek **Svět / Peníze** ve stylu stávajícího `.seg`.
  - Karta článku: náhled obrázku vlevo (pokud je), titulek tučně, pod ním „zdroj · relativní čas“ (například „iROZHLAS · před 12 min“).
  - Pod seznamem tlačítko **„Načíst další“**.
  - **Detail** přes celou obrazovku: lišta „← Zpět“ se jménem zdroje, velký obrázek (pokud je), řádek „zdroj · rubrika · čas“, titulek, celý perex a tlačítko **„Číst celý článek na {zdroj} ↗“**, které otevře odkaz v nové kartě.

### Upozornění po 20 minutách (varianta B)

- Spouští ho běžící stopky „Jdu na záchod“, když od startu uplyne 20 minut.
- Celá obrazovka dostane **červený okraj a červené zbarvení**, blok se stopkami zčervená a uprostřed se ukáže **modální okno**: „Sedíš tu už 20 minut. Není čas vrátit se k práci?“ s tlačítkem **Zavřít**.
- Po zavření červené zvýraznění zmizí. **Stopky běží dál po celou dobu**, i když je okno otevřené, a dál běží i déšť bankovek a text „Sedíš X:XX a už máš …“.

### Hodiny

- Datum a čas v **pravém horním rohu**, ve formátu z mockupu: `pá 13. 11. 2026 · 15:42`.

## Na stavitelovi

Tyto věci jsou moje rozhodnutí (Claude), ne výslovné zadání uživatele. Stavitel je smí upravit, pokud k tomu má dobrý důvod:

- **Pořadí a stránkování:** všechny tři zdroje záložky se načtou paralelně, položky se spojí a seřadí podle `pubDate` od nejnovější. Zobrazí se prvních 10 a „Načíst další“ odkryje dalších 10. Když už nic nezbývá, tlačítko zmizí a místo něj se ukáže „To je všechno, spláchni a jdi pracovat.“ Nekonečné posouvání ne, protože nad feedem je kalkulačka a uživatel se k ní musí snadno vrátit.
- **Načítání:** záložka se načte až při prvním zobrazení. Feed Svět se načítá líně, až když se panel blíží do viewportu (IntersectionObserver), aby nezdržoval kalkulačku. Výsledek se drží v paměti po dobu života stránky. Při čekání se ukazuje několik šedých kostrových karet.
- **Chyby:** když jeden zdroj selže, zobrazí se ostatní. Když selžou všechny, panel ukáže „Zprávy se nepodařilo načíst“ a tlačítko „Zkusit znovu“.
- **Bezpečnost:** obsah z RSS je nedůvěryhodný. Titulky a perexy se vkládají jako text, ne jako HTML. Perex se zbaví HTML značek a entity se dekódují (DOMParser). Odkazy se otevírají s `target="_blank" rel="noopener noreferrer"` a povolené jsou jen `https:` URL.
- **Detail na mobilu:** otevře se přes celou obrazovku, pozadí se nepohne (zámek scrollu), zavírá se šipkou zpět, klávesou Esc i tlačítkem Zpět v prohlížeči (přes `history.pushState`). Na širokých obrazovkách (≥ 820 px) je detail vycentrovaný panel s max. šířkou zhruba 640 px.
- **Bez obrázku** (ČT24): karta je bez náhledu a titulek dostane celou šířku. Detail je bez velkého obrázku.
- **Relativní čas:** „právě teď“, „před X min“, „před X h“, starší než 24 h jako „13. 11. 15:42“.
- **Upozornění:** ukáže se jednou za návštěvu. Po spláchnutí se všechno vynuluje a další návštěva může upozornit znovu. Okno je modální, takže než uživatel klepne na „Hotovo, spláchnout“, musí ho zavřít. Okno má `role="alertdialog"`, při otevření dostane fokus tlačítko Zavřít a Esc ho zavře. Při `prefers-reduced-motion` je bez animace.
- **Hodiny:** aktualizují se každou sekundu, zobrazuje se ale jen minuta. Formátují se přes `Intl.DateTimeFormat("cs-CZ")`. Jsou pevně v pravém horním rohu (`position: fixed`) se zohledněním `safe-area-inset`, ve stylu malé „porcelánové“ pilulky. Nesmí překrýt nadpis ani přistát přes déšť bankovek: pruhy deště mají šířku `max(44px, calc((100vw - 980px) / 2))`, takže hodiny se odsadí o tuto šířku od pravého okraje a hlavička dostane nahoře místo, aby je titulek nepodjel.
- **Rubrika v detailu:** bere se z `<category>`, pokud ho zdroj má. Když chybí, řádek je jen „zdroj · čas“.
- **Stopky po obnovení stránky:** dnes se nepamatují (běží jen v paměti) a tohle se nemění.
