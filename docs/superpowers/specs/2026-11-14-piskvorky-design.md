# Piškvorky a seznam her v záložce Hra – návrh

## Záměr

Záložka „Hra“ v sekci „Čtení na trůn“ (index.html) dnes nabízí jedinou hru, Rulíčku na útěku. Uživatel chce, aby z ní byl rozcestník pro více her, a jako druhou hru přidat piškvorky (pět v řadě) proti počítači. Cíl je stejný jako u Rulíčky: krátká zábava během sezení na záchodě, hlavně na mobilu, bez přerušení stopek sezení.

## Cíle

- Záložka Hra zobrazuje **seznam her** (nahoře) a pod ním **oddělenou spodní část s detailem** vybrané hry: název, popis, statistika/rekord a tlačítko „Zahraj si“. Klik na hru v seznamu jen přepne obsah spodní části, nic se neotevírá. (Rozhodnutí uživatele.)
- Rulíčka se přesune do seznamu beze změny chování (hraní v boxu, přepínač na celou obrazovku, rekord).
- **Piškvorky proti počítači** (rozhodnutí uživatele), vítězí pět v řadě.
- **Hratelné na mobilu, hrací pole se dá posouvat** (rozhodnutí uživatele).
- Stopky sezení běží dál, hra je nikdy nezastaví ani nevynuluje; varování po 20 minutách se zobrazí nad hrou stejně jako u Rulíčky.

## Mimo rozsah

- Hra dvou lidí na jednom telefonu, online hra.
- Vracení tahů (undo), nápověda tahu, uložení rozehrané partie přes obnovení stránky.
- Přiblížení dvěma prsty.
- Pravidla typu renju/swap, zakázané tahy.

## Anti-cíle

- Hra nesmí ovlivnit stopky, výpočet výdělku ani jejich uložení v localStorage.
- Ťuknutí při posouvání pole nesmí omylem položit kámen.
- Počítač nesmí znatelně zaseknout UI (tah musí být spočítán do ~100 ms i na slabším telefonu).
- Chyba v jedné hře nesmí shodit druhou ani zbytek stránky.

## Omezení (dané projektem)

- Vše v jednom `index.html`, čisté HTML/CSS/JS ve stylu ES5, žádné závislosti ani build, české UI, světlý i tmavý režim přes CSS proměnné, mobile-first.
- Čistá logika ve vlastním `<script id="…">` bloku, testovaná v Node (`node --test`, bez argumentu adresáře) přes `tests/load-block.mjs`.
- Vrstva na celou obrazovku přes existující `window.Vrstvy` (history, Esc, zámek scrollu), stejně jako Rulíčka.
- Varování po 20 minutách má z-index 61/62, nad vrstvou hry (50); klávesy hry se ignorují, když je hra uvnitř `[inert]`.

## Přístupy k posouvatelnému poli

1. **Mřížka tlačítek ve scrollovacím boxu (zvoleno).** Pole 25×25 jako mřížka `<button>` uvnitř kontejneru s `overflow: auto`. Posun, setrvačnost a rozlišení ťuknutí od posunu řeší prohlížeč; pole je ovladatelné klávesnicí a čtečkou. 625 prvků telefon zvládne. Navrženo jako moje doporučení, uživatel nenamítal.
2. Canvas s vlastním posouváním (jako Rulíčka): umožní zoom, ale posun, setrvačnost a rozpoznání tapu by se psaly ručně, víc práce a rizika.
3. Nekonečné rozšiřující se pole: zbytečné, 25×25 na pět v řadě stačí.

## Návrh

### Záložka Hra: seznam + detail

```
┌ Hra ─────────────────────────────┐
│ ● Rulíčka na útěku               │  ← seznam (vybraná hra zvýrazněná)
│   Piškvorky                      │
├──────────────────────────────────┤
│ Piškvorky                        │  ← spodní část (detail)
│ Pět v řadě proti počítači. …     │
│ Výhry 3 · Prohry 5 · Remízy 0    │
│          [ Zahraj si ]           │
└──────────────────────────────────┘
```

- Seznam: položka = název + jednořádkový podtitul. Výběr se ovládá klikem i klávesnicí; vybraná položka má vizuální zvýraznění a `aria-pressed`/`aria-current` (sémantika na builderovi).
- Výchozí výběr: první hra (Rulíčka). Moje volba: poslední vybraná hra se pamatuje v localStorage (`zachodova-hry-vyber-v1`), chyba čtení = první hra.
- Detail Rulíčky: dosavadní text + rekord. Detail piškvorek: popis + výhry/prohry/remízy + volba obtížnosti.
- Po kliku na „Zahraj si“ se seznam i detail skryjí a v boxu běží vybraná hra (jako dnes `#hraUvod` → `#hraSlot`). Po ukončení hry („Ukončit hru“) se vrátí seznam + detail s aktuální statistikou a fokus jde na „Zahraj si“.
- Současně je otevřená nanejvýš jedna hra. Odchod ze záložky Hra pozastaví Rulíčku (jako dnes); piškvorky jsou tahové, není co pozastavit.
- Když jedna hra selže při inicializaci, zmizí jen její položka; když selžou obě, skryje se záložka Hra (dnešní `hideEntry` se zobecní).

### Piškvorky: pravidla

- Pole 25×25, hráč má vždy **×**, počítač **○**.
- Výhra: **pět nebo více** v řadě vodorovně, svisle nebo úhlopříčně (volná pravidla). Plné pole bez výherce = remíza.
- Začínající se střídá: první partie začíná hráč, další začíná ten, kdo minule nezačínal. Když začíná počítač, hraje doprostřed.
- Počítač táhne po krátké prodlevě (~300 ms), aby byl tah vidět; během ní hráč nemůže táhnout.
- Obtížnost (moje volba): **Lehká** a **Těžší**, volí se v detailu, pamatuje se. Změna platí od další partie.

### Piškvorky: počítač

- Heuristika bez prohledávání do hloubky: kandidáti jsou prázdná políčka do vzdálenosti 2 od nějakého kamene; každé se ohodnotí podle vzorů, které by vytvořilo pro sebe (útok) a které by zablokovalo soupeři (obrana), ve všech 4 směrech (pětka, otevřená čtyřka, čtyřka, otevřená trojka, …).
- Pořadí priorit: vlastní výhra > blok soupeřovy pětky > vlastní otevřená čtyřka > blok soupeřovy otevřené čtyřky > zbytek podle skóre.
- Těžší: vždy nejlepší tah (shoda skóre se rozhodne náhodně). Lehká: výhru a blok pětky zahraje vždy, jinak náhodně z několika nejlepších kandidátů a obranu váží slaběji, takže je porazitelná.
- Logika je čistá a deterministicky testovatelná (náhoda se předává jako funkce).

### Piškvorky: UI

- Hra používá stejný rám jako Rulíčka: hlavička s výhrami/prohrami, stopkami sezení, tlačítky „Celá obrazovka“ a „Ukončit hru“; tělo je scrollovací box s mřížkou.
- V boxu má pole pevnou výšku (cca jako Rulíčka, max ~72vh); na celé obrazovce vyplní zbytek obrazovky. Přechod mezi režimy zachová rozehranou partii i pozici posunu.
- Políčko ~34 px. Při startu partie se pole vycentruje; po tahu počítače se jeho kámen posune do viditelné části, pokud je mimo.
- Zvýraznění posledního tahu počítače a po konci partie výherní řady.
- Stavová lišta pod hlavičkou: „Jsi na tahu“, „Počítač přemýšlí…“, „Vyhrál jsi!“, „Prohrál jsi“, „Remíza“ (oznamováno přes `role="status"`). Po konci partie tlačítko „Nová hra“.
- Klávesnice: šipky přesouvají fokus po mřížce (roving tabindex), Enter/mezerník pokládá kámen.
- Statistiky v localStorage `zachodova-piskvorky-v1`: `{vyhry, prohry, remizy, obtiznost}`; poškozená data = výchozí hodnoty. Rozehraná partie žije jen v paměti stránky: ukončení hry a nové otevření partii obnoví; obnovení stránky ji zahodí.
- Partie ukončená uprostřed se nepočítá jako prohra (moje volba).

## Drobná rozhodnutí (moje volby po kontrole)

- Piškvorky mají vlastní prvek hry (`#pisk`) se sdíleným vzhledem rámu; DOM Rulíčky se nesdílí.
- Kdo začíná, se pamatuje jen v paměti; po obnovení stránky začíná hráč.
- Statistiky jsou společné pro obě obtížnosti.
- Chyba hry za běhu (ne jen při inicializaci) skryje jen položku dané hry; záložka zmizí, až když nefunguje žádná hra.
- Když zapamatovaná hra není dostupná, vybere se první funkční.
- Detail Rulíčky nově ukazuje i rekord.

## Na builderovi

- Přesná struktura script bloků (doporučení: `#pisk-logika` + `#pisk-ui`, společná správa seznamu her), názvy prvků a CSS tříd.
- Konkrétní váhy heuristiky, pokud splní pořadí priorit a tempo do ~100 ms.
- Vzhled kamenů, barvy v rámci existujících proměnných, ikony.
- Testy: logika piškvorek (detekce výhry ve všech směrech a na okrajích, remíza, priority počítače, výchozí tah), načtení/uložení statistik.
