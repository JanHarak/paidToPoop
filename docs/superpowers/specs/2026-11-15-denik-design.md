# Deník sezení – návrh

## Záměr
Kalkulačka dnes ukazuje jen odhad a počítadlo „návštěv dnes“, které se samo nenuluje a nic si nepamatuje. Deník zaznamená každé sezení na záchodě (čas, délku, výdělek) a k němu ukáže vlastní vyúčtování ze skutečných zápisů. Deník je jediný zdroj pravdy pro „dnešek“.

## Cíle (rozhodnutí uživatele)
- Zapisují se jen sezení na záchodě.
- Přepínání na deník je třetí záložka vedle „MD sazba“ a „Měsíční plat“.
- Každé dokončení stopek („Hotovo, spláchnout“) vytvoří zápis.
- Ruční jednorázový zápis: uživatel zadá parametry v kalkulačce a ve vyúčtování (panel „Výdělek na záchodě“) klepne na „Zapsat do deníku“.
- Zápisy lze mazat.
- Deník má vlastní zobrazení vyúčtování.
- „Návštěv dnes“ se počítá ze zápisů. Smazání zápisu ubere návštěvu a přepočítá průměrnou délku.
- Tlačítko **+** zapíše návštěvu s průměrnou délkou (jako „Zapsat do deníku“), tlačítko **−** smaže poslední dnešní zápis a nabídne „Vrátit“.

## Mimo rozsah
- Úprava existujícího zápisu (délka, čas), poznámky k zápisům.
- Export (CSV), synchronizace mezi zařízeními, účty.
- Jiné aktivity než sezení na záchodě.
- Grafy.

## Anti-cíle
- Starší zápisy se nesmí měnit, když uživatel později změní sazbu, měnu nebo způsob odměny.
- Nesmí se ztratit data kvůli poškozenému záznamu jinde (kalkulačka, hry).
- Deník nesmí rozbít stopky, varování po 20 minutách ani hry.
- Nikde dlouhá pomlčka.

## Omezení (dané projektem)
- Vše v `index.html` jako HTML/CSS/JS ve stylu ES5, bez závislostí a bez buildu. Česky, mobile-first, světlý i tmavý režim přes CSS proměnné.
- Čistá logika ve vlastním `<script id="denik-logika">` a testy v Node (`node --test` bez argumentu) přes `tests/load-block.mjs`.
- Data jen v localStorage tohoto prohlížeče.

## Přístupy
1. **Třetí záložka v řádku způsobu odměny (zvoleno uživatelem).** „Deník“ přepne oba panely: levý na seznam zápisů, pravý na vyúčtování deníku. Pro výpočet nových zápisů platí naposledy zvolený způsob odměny.
2. Samostatný přepínač „Kalkulačka | Deník“ nad panely. Čistší oddělení pohledu od způsobu odměny, ale uživatel chtěl záložku u MD sazby.
3. Deník jako další položka v „Čtení na trůn“. Odtržené od kalkulačky, kam stopky patří.

## Návrh

### Záložky
- Řádek nad údaji má tři tlačítka: „MD sazba“, „Měsíční plat“, „Deník“.
- MD sazba a Měsíční plat fungují jako dnes (zobrazí kalkulačku, nastaví způsob odměny).
- Deník zobrazí deník a nezmění způsob odměny. Zvýrazněná je jen aktivní záložka. Způsob odměny použitý pro zápisy je ten naposledy zvolený.
- Poslední otevřená záložka se pamatuje (včetně Deníku).

### Zápis
- Obsahuje čas začátku (ms), délku v minutách, částku a měnu (zmrazené v okamžiku zápisu) a zdroj („stopky“ nebo „ručně“) a jednoznačné id.
- Částka = výdělek za minutu podle aktuálních parametrů × délka.
- **Ze stopek:** začátek je čas spuštění stopek, délka změřená. Sezení kratší než 10 sekund se nezapíše a poznámka u tlačítka řekne „Moc krátké, do deníku nezapsáno.“
- **Ručně** („Zapsat do deníku“ nebo **+**): začátek je teď, délka je hodnota pole „Průměr na návštěvu“. Když je délka 0, zápis se neprovede a uživatel dostane krátkou zprávu, ať vyplní průměr.
- Po zápisu krátké potvrzení („Zapsáno do deníku: 4,5 min, 98 Kč“).

### Návštěvy dnes a průměr
- „Návštěv dnes“ = počet zápisů se začátkem v dnešním místním dni. O půlnoci se samo vynuluje (přepočítá se při vykreslení, při návratu na stránku a aspoň jednou za minutu).
- Částka „Dnes“ ve výsledcích kalkulačky je součet částek dnešních zápisů (po měnách, viz Měny). Podtitul ukáže počet návštěv a součet minut.
- Měsíc a rok v kalkulačce zůstávají odhad: dnešní počet návštěv × průměr × dny.
- **−** smaže poslední dnešní zápis (podle času začátku) a ukáže lištu „Smazáno · Vrátit“. Bez dnešních zápisů je − neaktivní.
- **Průměr na návštěvu** se přepočítá jako průměr délek všech zápisů v deníku po každém přidání ze stopek a po každém smazání. Ruční zápis průměr nemění (zapisuje průměr). Prázdný deník průměr nemění. Uživatel může pole dál ručně přepsat.

### Pohled Deník
- **Levý panel „Deník“:**
  - nahoře tlačítko stopek se stejným stavem jako v kalkulačce (jedny stopky, dvě místa ovládání);
  - zápisy seskupené po dnech, nejnovější nahoře; hlavička dne „Dnes“, „Včera“, jinak „po 10. 11.“ (s rokem, když není letošní) a součet dne (počet a částka);
  - řádek zápisu: čas začátku, délka, částka, značka pro ruční zápis, tlačítko smazat (s popiskem pro čtečku);
  - prázdný stav: „Zatím žádné zápisy. Spusť stopky nebo zapiš návštěvu z kalkulačky.“;
  - dole „Smazat celý deník“ s potvrzením.
  - Zobrazí se posledních 30 dní se zápisy, starší přes „Zobrazit starší“.
- **Pravý panel „Vyúčtování“:**
  - Dnes, Tento týden (od pondělí), Tento měsíc, Celkem: počet návštěv, minuty a částka;
  - průměrná délka návštěvy a průměrná částka na den se zápisem.
- **Mazání:** jedním klepnutím, lišta „Smazáno · Vrátit“ asi 6 sekund. Další smazání lištu nahradí (vrátit jde jen poslední).

### Měny
- Zápis si drží svou měnu. Součty se počítají zvlášť pro každou měnu a zobrazí se spojené, např. „312 Kč + 4 €“.

### Ukládání
- localStorage `zachodova-denik-v1`: `{ zapisy: [{ id, start, min, castka, mena, zdroj }] }`.
- Neplatné jednotlivé zápisy se při načtení vynechají, zbytek zůstane. Nečitelná data dají prázdný deník a neuloží se přes ně nic, dokud uživatel nezapíše (aby šlo data ručně zachránit).
- Klíč kalkulačky `zachodova-kalkulacka-v1` dál ukládá parametry. Uložené `count` se ignoruje. Deník po nasazení začíná prázdný.
- „Vrátit výchozí hodnoty“ deník nemaže.

## Drobná rozhodnutí (moje volby)
- Práh 10 sekund pro zápis ze stopek.
- Týden od pondělí, den podle místního času zařízení.
- Průměr ze všech zápisů (ne jen posledních).
- Lišta „Vrátit“ 6 sekund.
- 30 dní na první stránce deníku.

## Upřesnění po kontrole (moje volby)
- **Kalkulačka:** počítadlo s + a − zůstává v levém panelu, tlačítko „Zapsat do deníku“ je v pravém panelu pod řádky výsledků (nad „Čtení“ faktů). + a „Zapsat do deníku“ dělají totéž záměrně. Odhady měsíc, rok a fakta (`fPct`, `fHours`, `fMd`) počítají s dnešním počtem z deníku.
- **Pohled Deník:** blok stopek (`.timer-block` s `#flush` a `#timerNote`) se při přepnutí přesune do levého panelu deníku a zpět. Jde o jeden DOM uzel, žádný klon. „Čtení na trůn“ se nemění.
- **Záložky:** naposledy zvolený způsob odměny (`mode`) zůstává uložený jako dosud. Otevřený pohled (`md`, `sal`, `denik`) se uloží do klíče kalkulačky jako `pohled`.
- **Zápis ze stopek:** použije začátek stopek (i po obnovení stránky ze `Stopky.KEY`) a parametry v okamžiku zastavení.
- **Průměr na návštěvu:** počítá se jen z délek zápisů ze stopek. Přepočítá se po zápisu ze stopek, po smazání a po „Vrátit“. Bez zápisů ze stopek se pole nemění. První zápis ze stopek nahradí ručně nastavený průměr.
- **Měny:** velká částka „Dnes“ ukáže součet po měnách („312 Kč + 4 €“). Ostatní řádky kalkulačky jsou odhad v aktuální měně.
- **Délka:** ukládá se nezaokrouhlená (minuty jako desetinné číslo), zobrazuje se na 0,1 min. Den a týden se určují podle místního času v okamžiku zobrazení.

## Na builderovi
- Struktura logiky (doporučení: `window.DenikLogika` s funkcemi pro vytvoření zápisu, parsování, součty za období, seskupení po dnech, počet dnešních zápisů a průměr) a její testy.
- Přesná ARIA role řádku záložek (tablist nebo radiogroup) tak, aby šlo ovládat klávesnicí.
- Jak sdílet stav stopek mezi dvěma tlačítky.
- Vzhled řádků a lišty „Vrátit“ v rámci stávajících CSS proměnných.
