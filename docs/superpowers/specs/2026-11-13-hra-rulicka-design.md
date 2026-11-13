# Hra „Rulička na útěku“

Datum: 2026-11-13

## Proč

Záchodová kalkulačka ([index.html](../../../index.html)) je vtipná veřejná stránka, hlavně pro mobil. Spočítá, kolik člověk vydělá za čas na záchodě, a má stopky „Jdu na záchod“. Chystá se feed novinek ([spec](2026-11-13-feed-upozorneni-hodiny-design.md)), aby měl člověk na záchodě co číst. Hra je další zábava na sezení: krátká arkáda typu „bludiště a honička“, která tematicky navazuje na kalkulačku (sbíráš peníze, utíkáš před prací).

## Cíle

- Hratelná hra přímo v `index.html`, spustitelná tlačítkem z kalkulačky, ovladatelná palcem na mobilu i šipkami na počítači.
- Téma navázané na projekt: rulička toaletního papíru v kancelářském bludišti, mince jako tečky, kolegové z kanceláře jako nepřátelé.
- Skóre ukázané jako peníze v měně, kterou má uživatel zvolenou v kalkulačce, a uložený nejlepší výsledek.
- **Hra nepřeruší běžící stopky sezení.** Typický hráč spustí „Jdu na záchod“ a pak si zahraje. Stopky musí běžet dál během hry, po jejím zavření i po obnovení nebo znovuotevření stránky, a čas sezení musí sedět.

## Ne-cíle

- Zvuky a hudba.
- Online žebříček, účty, sdílení skóre.
- Editor bludišť nebo víc různých bludišť (stačí jedno, úrovně se liší rychlostí).
- Propojení se stopkami (hra je nespouští ani nezastavuje).

## Anti-cíle (selhání, i když to technicky funguje)

- **Kopie existující hry.** Hra nesmí převzít jméno, postavy, vzhled, bludiště ani zvuky Pac-Mana nebo jiné konkrétní hry. Žádný žlutý kruh s ústy, žádní „duchové“ s klasickými jmény a barvami, žádné klasické bludiště. Všechno je vlastní a v kancelářsko-záchodovém tématu.
- **Rozbitá kalkulačka.** Chyba ve hře nesmí shodit ani zpomalit kalkulačku, stopky ani budoucí feed. Hra nesmí měnit stav kalkulačky ani její uložená data.
- **Ztracené sezení.** Stopky se zastaví, vynulují nebo ukážou špatný čas kvůli hře, kvůli tlačítku Zpět, obnovení stránky nebo tomu, že mobilní prohlížeč kartu na pozadí uspí nebo zahodí.
- **Hra žere výkon, i když není vidět.** Herní smyčka běží jen při otevřené hře.
- **Nepoužitelnost na mobilu:** stránka se při tažení prstem posouvá, hrací plocha přetéká obrazovku, z hry se nedá vrátit.

## Omezení

- Všechno v jednom souboru `index.html`, čisté HTML, CSS a JS, žádné závislosti ani build (rozhodnutí uživatele). Kód hry je v **samostatném `<script>` bloku** s vlastní IIFE, odděleně od kalkulačky.
- Vzhled navazuje na stávající styl: CSS proměnné (`--tile`, `--porcelain`, `--ink`, `--brass` a další), písma Bricolage Grotesque a Atkinson Hyperlegible, světlý i tmavý režim.
- Rozhraní je česky.

## Rozhodnutí uživatele

- **Téma** (odsouhlasené):
  - Hrdina: rulička toaletního papíru, která se kutálí bludištěm kanceláře (chodby mezi stoly, kuchyňka, zasedačka).
  - Tečky: mince a bankovky. Skóre se ukazuje jako „vydělal jsi X Kč“.
  - Čtyři nepřátelé z kanceláře, každý se chová jinak: **Šéf** jde rovnou po tobě, **Projektový manažer** ti nadbíhá, **Kolega „máš chvilku?“** bloudí náhodně, **HR** hlídá u východů.
  - Power-up **„Porada zrušena!“**: na pár sekund se role otočí a nepřátelé před tebou utíkají.
  - Vzhled převzatý z kalkulačky včetně tmavého režimu.
  - Ovládání: šipky na počítači, tažení prstem na mobilu.
- **Umístění:** přímo v `index.html` (ne samostatný soubor).
- **Stopky sezení:** když má uživatel spuštěné stopky „Jdu na záchod“, hra je nesmí přerušit. Aplikace si případně uchová vlastní časové stopky (viz „Trvalé stopky“ níže). Tím se mění rozhodnutí ze [specu feedu](2026-11-13-feed-upozorneni-hodiny-design.md), že se stopky po obnovení stránky nepamatují.

## Přístupy

| Přístup | Výhody | Nevýhody |
|---|---|---|
| A) Samostatný `hra.html`, odkaz z kalkulačky | Kalkulačka zůstane malá, hra ji nemůže rozbít, vývoj zvlášť | Dva soubory, barvy zkopírované dvakrát |
| **B) Přímo v `index.html` (zvoleno)** | Jeden soubor, jako zbytek projektu; hra přímo čte měnu a téma stránky | Soubor naroste zhruba na dvojnásobek, riziko, že chyba ve hře ovlivní stránku |
| C) Samostatná sdílená stránka mimo repozitář | Rychlé vyzkoušení a sdílení odkazem | Do projektu by se stejně musela přenést |

Uživatel zvolil B. Riziko B se tlumí izolací kódu (viz Omezení a Na stavitelovi).

## Na stavitelovi

Tyto věci jsou moje rozhodnutí (Claude), ne výslovné zadání uživatele. Stavitel je smí upravit, pokud k tomu má dobrý důvod:

- **Název:** „Rulička na útěku“.
- **Vstup do hry:** tlačítko „Zahraj si“ v hlavičce kalkulačky (pod úvodním odstavcem), ve stylu stávajících tlačítek. Hra se otevře **přes celou obrazovku** jako vrstva nad stránkou (`role="dialog"`, `aria-modal`, zámek scrollu pozadí). Zavírá se křížkem, klávesou Esc a tlačítkem Zpět v prohlížeči (přes `history.pushState`), stejně jako detail článku ve feedu. Na širokých obrazovkách je hrací plocha vycentrovaná.
- **Hlavička hry:** skóre (peníze), nejlepší výsledek, počet životů (malé ruličky), číslo úrovně a tlačítko pauzy.
- **Bludiště:** vlastní návrh na mřížce zhruba 19 × 21 políček, symetrické podle svislé osy, bez slepých uliček. Uprostřed **zasedačka** (výchozí místo nepřátel s dveřmi), dole startovní místo ruličky. Volitelně jeden boční průchod, kterým se vyjde na druhé straně. Zdi kreslené jako kancelářské stoly a příčky, ne jako neonové čáry.
- **Mince a power-upy:** mince na každém volném políčku chodby (kromě zasedačky a startu), čtyři power-upy „Porada zrušena!“ (přeškrtnutá pozvánka do kalendáře) poblíž rohů.
- **Vrstvy a tlačítko Zpět:** feed novinek zatím v `index.html` není. Hra proto zavede malý sdílený pomocník pro vrstvy přes celou obrazovku (otevření, zavření, zámek scrollu, jeden společný `popstate` handler, Esc, vrácení fokusu), který později převezme i detail článku ve feedu. Zpět tak vždy zavře jen nejvrchnější vrstvu a zámek scrollu se uvolní až po zavření poslední.
- **Chování nepřátel:** rozhodují se na křižovatkách, nesmí se otočit o 180° (výjimka: v okamžiku sebrání power-upu se všichni otočí). Žádné časované střídání honičky a ústupu do rohů, jediný zvláštní režim je power-up. Cíle:
  - Šéf: políčko ruličky.
  - Projektový manažer: 4 políčka před ruličkou ve směru jejího pohybu.
  - Kolega „máš chvilku?“: náhodný směr na každé křižovatce.
  - HR: když je rulička dál než 8 políček, jde k nejbližšímu bočnímu průchodu nebo okraji bludiště (pevně zvolené hlídací políčko) a hlídá tam; když je blíž, honí ji.
  - Nepřátelé opouštějí zasedačku postupně (Šéf hned, ostatní po několika sekundách).
- **Power-up:** po sebrání 7 s (s každou úrovní o 1 s méně, minimálně 3 s) nepřátelé zblednou, zpomalí a utíkají. Poslední 2 s blikají. Chycený nepřítel se vrátí do zasedačky a znovu vyjde. Body za chycení během jednoho power-upu: 200, 400, 800, 1600.
- **Skóre jako peníze:** mince = 10, power-up = 50, chycený nepřítel podle tabulky výše. Zobrazuje se jako částka v měně zvolené v kalkulačce (čte se z `#cur` při otevření hry, formát přes `Intl.NumberFormat("cs-CZ")`), například „Vydělal jsi 1 230 Kč“. Hodnoty jsou herní body, s sazbou z kalkulačky se nepřepočítávají.
- **Životy a úrovně:** 3 životy. Po vysbírání všech mincí krátká hláška („Úroveň hotová, šéf nic nepoznal“) a další úroveň: nepřátelé rychlejší (+5 % za úroveň, strop zhruba rychlost ruličky), power-up kratší. Konec hry ukáže skóre, nejlepší výsledek a tlačítka „Hrát znovu“ a „Zpět ke kalkulačce“. Vtipné hlášky při ztrátě života („Šéf: Máš chvilku?“).
- **Trvalé stopky:** stopky se dnes počítají z `timerStart = Date.now()` v paměti. Nově se čas startu uloží do `localStorage` (vlastní klíč `zachodova-stopky-v1`, `try/catch`) při spuštění a smaže se při „Hotovo, spláchnout“. Při načtení stránky, když je uložený start, se stopky obnoví: tlačítko ve stavu „Hotovo, spláchnout“, běží text „Sedíš X:XX a už máš …“ i déšť bankovek. Uplynulý čas se vždy počítá jako `Date.now() - start`, takže sedí i po uspání karty. Když je uložený start starší než 12 hodin (zapomenuté stopky), neobnoví se a smaže se. Když `localStorage` nejde, stopky fungují jako dnes jen v paměti.
- **Stopky během hry:** hra stopky nespouští, nezastavuje ani nemění. Herní smyčka a pauza hry na ně nemají vliv (běží na vlastním intervalu kalkulačky). Když stopky běží, hlavička hry ukazuje malý řádek „Sedíš 4:12 · 37 Kč“ se stejným výpočtem jako kalkulačka, aby hráč o sezení nepřišel. Tlačítko Zpět nebo Esc ve hře zavře jen hru a stránku neopustí.
- **Upozornění po 20 minutách během hry** (až bude feed spec hotový): okno se ukáže nad hrou a hra se při něm pozastaví. Po zavření okna zůstane hra v pauze, dokud ji hráč nepustí.
- **Ovládání:** šipky i WASD, pauza mezerníkem nebo P. Na mobilu tažení prstem po hrací ploše (práh zhruba 20 px), na ploše `touch-action: none`, aby se stránka neposouvala. Zadaný směr se pamatuje a provede se, jakmile to bludiště dovolí (plynulé zatáčení).
- **Smyčka a výkon:** `requestAnimationFrame` s pevným krokem logiky (například 60 kroků za sekundu) nezávislým na obnovovací frekvenci. Smyčka běží jen při otevřené hře. Při skrytí karty (`visibilitychange`) nebo zavření se hra pozastaví. Canvas se škáluje na dostupný prostor se zohledněním `devicePixelRatio` a změny velikosti okna.
- **Barvy a téma:** barvy se čtou z CSS proměnných přes `getComputedStyle` při otevření a při změně barevného schématu, aby hra seděla do světlého i tmavého režimu. Postavy jsou jednoduché vlastní kresby na canvasu (rulička s otáčející se kresbou, nepřátelé jako postavičky s rozlišující věcí: kravata, notebook, hrnek, desky). Každý nepřítel má jinou barvu z palety stránky, aby se daly rozlišit.
- **Uložení:** nejlepší výsledek v `localStorage` pod vlastním klíčem `zachodova-hra-v1`, čtení a zápis v `try/catch`. Klíč kalkulačky `zachodova-kalkulacka-v1` hra nečte ani nemění.
- **Izolace chyb:** inicializace hry v `try/catch`. Když selže, tlačítko „Zahraj si“ se skryje a kalkulačka funguje dál.
- **Přístupnost a pohyb:** fokus po otevření na hrací plochu, po zavření zpět na tlačítko „Zahraj si“. Při `prefers-reduced-motion` bez blikání a otřesů (power-up končí změnou barvy místo blikání).
- **Ověření:** ruční otestování v prohlížeči na šířce mobilu (375 px) i desktopu, ve světlém i tmavém režimu; kontrola, že kalkulačka a stopky fungují během hry i po ní a že po zavření hry neběží smyčka. Zvlášť scénář: spustit stopky, otevřít hru, hrát, zavřít Zpět, obnovit stránku; stopky musí běžet dál se správným časem a spláchnutí přičte návštěvu.
