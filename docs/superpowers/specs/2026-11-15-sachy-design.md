# Šachy proti počítači – návrh

## Záměr
Do záložky „Hry“ v sekci „Čtení na trůn“ (index.html) přibude třetí hra: šachy proti počítači. Je to krátká zábava během sezení, hlavně na mobilu. Šachová partie bývá delší než jedno sezení, proto se rozehraná partie ukládá a dá se v ní pokračovat při další návštěvě.

## Cíle (rozhodnutí uživatele)
- Šachy hraje hráč proti počítači.
- Hráč si vybere barvu, za kterou hraje.
- Hráč si vybere obtížnost: **Lehká** a **Těžká**. Těžká má být „střední“ síla. Silný soupeř bude později podle zpětné vazby a zapíše se do `TODO.md`.
- Rozehraná partie se ukládá i přes zavření stránky.

## Mimo rozsah
- Silný soupeř (Stockfish apod.), hra dvou lidí, online.
- Vracení tahů, nabídka remízy, nápověda, zápis tahů, šachové hodiny.
- Knihovny třetích stran a obrázky figur od cizích autorů.

## Anti-cíle
- Hra nesmí ovlivnit stopky, výdělek ani jejich uložení.
- Přemýšlení počítače nesmí zaseknout stránku (UI zůstane plynulé, stopky tikají).
- Nelegální tah nesmí projít a legální tah nesmí chybět, pravidla musí být úplná a správná.
- Chyba šachů nesmí shodit ostatní hry ani stránku.

## Omezení (dané projektem)
- Vše je v jediném `index.html` s čistým HTML/CSS/JS ve stylu ES5, bez závislostí a bez buildu. UI je česky, mobile-first, světlý i tmavý režim jde přes CSS proměnné. Nikde nesmí být dlouhá pomlčka (em dash).
- Čistá logika je ve vlastním `<script id="…">` bloku a testuje se v Node (`node --test` bez argumentu) přes `tests/load-block.mjs`.
- Hra se napojí na `window.HrySeznam` (seznam + detail, `zobrazMenu`, `skryjMenu`, `odeber`, `vyber`, `vybrana`) a na rám her stejný jako u Piškvorek: hraje se v boxu `#hraSlot`, přes celou obrazovku jde přes `window.Vrstvy`, stopky v hlavičce, varování po 20 minutách nad hrou (z-index 61/62 > 50), klávesy se ignorují uvnitř `[inert]`.

## Přístupy
1. **Mřížka 8×8 tlačítek + vlastní engine (zvoleno).** Ťukání na mobilu, klávesnice i čtečka fungují a rám převezme od Piškvorek. Engine je vlastní, testovaný v Node.
2. Canvas jako u Rulíčky: nic nepřináší, protože se nic neanimuje plynule, a byl by horší pro přístupnost.
3. Stockfish (WASM): silný, ale je to externí závislost a síla není teď potřeba. Odloženo do TODO.

## Návrh

### Seznam her a detail
- Do seznamu přibude položka „Šachy“ s podtitulem „Zahraj si proti počítači“.
- Detail obsahuje:
  - popis „Zahraj si šachy proti počítači. Rozehranou partii si pamatuju, i když stránku zavřeš. Stopky sezení běží dál.“;
  - statistiku „Výhry X · Prohry Y · Remízy Z“;
  - volbu barvy (Bílé / Černé);
  - volbu obtížnosti (Lehká / Těžká);
  - tlačítko „Zahraj si“.
- Když existuje rozehraná partie, tlačítko se jmenuje „Pokračovat“ a pod ním je vedlejší tlačítko „Nová partie“. Volba barvy a obtížnosti platí pro novou partii. Rozehraná partie si nese svou barvu i obtížnost.

### Pravidla (úplná)
- Všechny tahy figur, rošáda (obě strany, ne přes ohrožené pole, ne ze šachu, ne do šachu), braní mimochodem a proměna pěšce. Hráč si vybere dámu, věž, střelce nebo jezdce, počítač si vybírá sám.
- Šach a mat: hráč nesmí zahrát tah, po kterém je jeho král v šachu.
- Konec partie nastane při matu, patu, nedostatku materiálu (K proti K, K+S proti K, K+J proti K, K+S proti K+S se střelci na polích stejné barvy), trojím opakování pozice nebo podle pravidla 50 tahů. Remízy se uzavírají automaticky, bez nabídky. Další možnost je, že se hráč vzdá.
- Přesnost pravidel ověří testy, mimo jiné perft na známých pozicích.

### Počítač
- Hledání alfa-beta s jednoduchým ohodnocením (materiál + tabulky polí figur).
- **Lehká**: mělké hledání (hloubka 1 až 2) a často slabší tah, s náhodou. Má být porazitelná i pro občasného hráče.
- **Těžká**: hloubka kolem 3 až 4 s klidovým dohledáním braní, časový limit zhruba 1,5 s na tah. Má hrát rozumně a nepřehlédnout jednotahové hrozby.
- Výpočet běží mimo hlavní vlákno (Web Worker vytvořený ze stejného script bloku). Když Worker není k dispozici, výpočet běží v hlavním vlákně a obě úrovně musí být dost rychlé, aby to nevadilo.
- Počítač táhne s krátkou prodlevou, aby byl jeho tah vidět.

### Šachovnice a ovládání
- Mřížka 8×8 tlačítek. Když hráč hraje za černé, šachovnice je otočená.
- Figury jsou šachové symboly z písma. Bílé i černé figury jsou tvarově stejné a liší se jen barvou podle CSS proměnných. Vynucení textové (ne emoji) podoby zajistí U+FE0E.
- Ovládání ťuknutím: ťuknutí na vlastní figuru ji vybere a zvýrazní její legální cíle. Ťuknutí na cíl táhne, ťuknutí jinam výběr zruší nebo vybere jinou figuru. Zvýrazněný je poslední tah a král v šachu.
- Klávesnice: šipky po polích (roving tabindex), Enter nebo mezerník vybírá a táhne. Popisky polí jsou pro čtečku, například „e4, bílý jezdec“. Tah počítače se oznámí ve stavovém řádku.
- Stavový řádek ukazuje: „Jsi na tahu“, „Šach!“, „Počítač přemýšlí…“, „Počítač: Je7-f5. Jsi na tahu“, „Mat, vyhrál jsi!“, „Mat, prohrál jsi“, „Remíza: pat“ (případně důvod remízy) a „Vzdal ses“.
- Hlavička obsahuje název, výhry a prohry, stopky, tlačítko „Celá obrazovka“, tlačítko „Vzdát“ (s potvrzením) a tlačítko „Ukončit hru“. Po konci partie se zobrazí „Nová partie“.
- Šachovnice je čtvercová a v boxu se vejde na šířku telefonu. Přes celou obrazovku vyplní dostupný prostor.

### Ukládání
- localStorage `zachodova-sachy-v1` obsahuje:
  - `{vyhry, prohry, remizy, barva, obtiznost}`, kde `barva` je `"b"` nebo `"c"` a `obtiznost` je `"lehka"` nebo `"tezka"`;
  - a `partie`, což je null nebo `{barva, obtiznost, tahy}`. Partie je uložená jako seznam tahů od výchozí pozice (UCI zápis, například `e2e4`, `e7e8q`), z něj se pozice i historie pro opakování obnoví přehráním.
- Partie se ukládá po každém tahu. Po konci partie se `partie` smaže a statistika se zvýší.
- Poškozená data znamenají výchozí hodnoty. Neplatný seznam tahů znamená, že se partie zahodí.
- Pokud je při obnovení na tahu počítač, počítač táhne.

## Drobná rozhodnutí (moje volby)
- Obě barvy si volí hráč, náhodná volba nebude.
- Vzdání se počítá jako prohra. Rozehraná partie se počítá až po konci.
- Poslední zvolená barva a obtížnost se pamatují.

## Na builderovi
- Vnitřní reprezentace šachovnice a generátor tahů, přesné váhy ohodnocení, hloubky a časové limity v rámci výše uvedeného.
- Vzhled polí a figur v rámci CSS proměnných, názvy prvků a tříd.
- Struktura bloků (doporučení: `#sachy-logika` pro pravidla a engine, `#sachy-ui` pro UI).
