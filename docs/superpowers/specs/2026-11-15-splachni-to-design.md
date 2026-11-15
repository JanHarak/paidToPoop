# Spláchni to! – návrh

## Záměr
Do záložky „Hry“ přibude čtvrtá hra: vlastní logická hra typu „spoj tři stejné“ v záchodově kancelářském tématu. Nemá kopírovat existující hru (Candy Crush, Bejeweled), ani názvem, ani vzhledem. Kancelářské otravnosti se „spláchnou“. Je to krátká zábava během sezení, hlavně na mobilu.

## Cíle (rozhodnutí uživatele)
- Hra se jmenuje „Spláchni to!“ a má kancelářské téma.
- Je to mechanika „spoj tři stejné“: prohození sousedních dlaždic, zmizení řad tří a více stejných, padání nových shora.
- Hráč si vybere ze tří režimů: **Tahy**, **Na čas** a **Nekonečná**.

## Mimo rozsah
- Úrovně s cíli a překážkami, mapa úrovní, životy, nákupy.
- Zvuky.
- Obrázky třetích stran.

## Anti-cíle
- Hra nesmí ovlivnit stopky ani výdělek.
- Napodobení konkrétní existující hry (název, postavy, vzhled) je vyloučené.
- Ťukání ani tažení nesmí posouvat stránku místo hry a stránka nesmí zamrzat během animací.
- Chyba hry nesmí shodit ostatní hry.

## Omezení (dané projektem)
- Vše je v `index.html` jako HTML/CSS/JS ve stylu ES5, bez závislostí a bez buildu. Hra je česky a mobile-first, světlý i tmavý režim jde přes CSS proměnné. Nikde nesmí být dlouhá pomlčka.
- Čistá logika je ve vlastním `<script id="…">` bloku a testuje se v Node (`node --test` bez argumentu) přes `tests/load-block.mjs`.
- Napojení na `window.HrySeznam` a na rám her stejný jako u Piškvorek a Šachů:
  - hraní v boxu `#hraSlot`;
  - celá obrazovka přes `window.Vrstvy`;
  - stopky v hlavičce;
  - varování po 20 minutách nad hrou;
  - klávesy se ignorují uvnitř `[inert]`;
  - hra vystavuje `isOpen()`, aby ji nepřekryl pruh s nabídkou instalace (`blokovano()` v `#instalace-ui`).

## Přístupy
1. **Dlaždice jako tlačítka s CSS animacemi (zvoleno).** Emoji se vykreslí ostře, ťukání a tažení i klávesnice fungují přirozeně a rám se převezme. Animace dělají CSS přechody (`transform`).
2. Canvas jako Rulíčka. Animace i ovládání by se musely psát ručně a byl by horší pro klávesnici. Při 64 dlaždicích nepřináší výkonový přínos.

## Návrh

### Seznam her a detail
- V seznamu je položka „Spláchni to!“ s podtitulem „Spoj tři stejné otravnosti“.
- Detail obsahuje:
  - popis „Prohazuj sousední věci z kanceláře. Tři a víc stejných v řadě spláchneš. Stopky sezení běží dál.“;
  - volbu režimu (Tahy / Na čas / Nekonečná) se stručným vysvětlením zvoleného režimu;
  - rekord zvoleného režimu „Rekord: 1 240“;
  - tlačítko „Zahraj si“.
- Pro Nekonečnou, když existuje uložená hra: „Pokračovat“ a vedlejší „Nová hra“ s potvrzením, stejně jako u šachů.
- Pamatuje se poslední zvolený režim.

### Hrací plocha a dlaždice
- Plocha má 8×8 dlaždic a šest druhů: 📎 sponka, ☕ káva, 📧 mail, 📊 graf, 🗓️ porada, 🖨️ tiskárna (emoji). Každý druh má i jemně odlišnou barvu podkladu, aby se daly rozlišit i podle barvy.
- Popisky pro čtečku jsou například „Řádek 3, sloupec 5, káva“.
- Na začátku ani po zamíchání nesmí plocha obsahovat hotovou řadu a musí existovat aspoň jeden možný tah.

### Pravidla
- **Tah:** prohodí se dvě sousední dlaždice (vodorovně nebo svisle). Když nevznikne žádná řada, dlaždice se vrátí zpět a tah se nepočítá (v režimu Tahy se neodečte).
- **Spláchnutí:** všechny vodorovné i svislé řady tří a více stejných zmizí najednou. Dlaždice nad nimi spadnou dolů a prázdná místa se doplní shora náhodnými dlaždicemi. Nové řady vzniklé pádem se spláchnou automaticky jako řetězová reakce.
- **Speciální dlaždice:**
  - Řada přesně čtyř vytvoří 🚽 na místě tahu, případně na jednom z políček řady. 🚽 je pořád spojitelný se svou barvou, protože si drží druh, ze kterého vznikl. Když se spláchne, spláchne celý řádek, pokud byla řada vodorovná, nebo sloupec, pokud byla svislá.
  - Řada pěti a více, nebo křížení tvaru L a T, vytvoří 🧽, který nemá druh. 🧽 se aktivuje prohozením s libovolnou sousední dlaždicí a spláchne všechny dlaždice jejího druhu.
  - Speciální dlaždice spláchnuté jinou speciální se aktivují také.
- **Body:** každá spláchnutá dlaždice dává 10 bodů. Násobek řetězové reakce je ×1, ×2, ×3 a dál. Bonus je +50 za vytvoření 🚽 a +100 za vytvoření 🧽.
- **Žádný možný tah:** plocha se zamíchá se zprávou „Žádný tah, míchám…“. Body ani tahy se nemění.

### Režimy
- **Tahy:** 25 tahů a co nejvíc bodů. Konec nastane po posledním tahu, až doběhnou řetězové reakce.
- **Na čas:** 90 sekund. Čas běží jen tehdy, když je hra otevřená a viditelná. Zastaví se, když hra není otevřená, když je záložka Hry skrytá, když je stránka na pozadí a když je zobrazené varování po 20 minutách. Hra má tlačítko Pauza. Konec nastane, když čas vyprší a doběhnou řetězové reakce.
- **Nekonečná:** bez konce. Stav (plocha, body) se ukládá po každém dokončeném tahu a obnoví se i po zavření stránky. Rekord se aktualizuje průběžně. Hra nabízí „Nová hra“.
- Po konci partie v režimech Tahy a Na čas se zobrazí výsledek („Spláchnuto: 1 240“, případně „Nový rekord!“) a tlačítka „Hrát znovu“ a „Ukončit hru“.
- Rozehraná hra v režimech Tahy a Na čas se po zavření hry pamatuje jen do obnovení stránky, stejně jako u Piškvorek.

### Ovládání
- **Tažení:** prst na dlaždici a posun alespoň o třetinu dlaždice směrem k sousedovi prohodí dlaždice. Během tažení se stránka neposouvá (`touch-action: none` na ploše).
- **Ťuknutí:** první ťuknutí vybere dlaždici, ťuknutí na sousední prohodí, ťuknutí jinam změní výběr.
- **Klávesnice:** šipky přesouvají fokus po mřížce (roving tabindex), Enter nebo mezerník vybere, šipka s vybranou dlaždicí prohodí. Klávesy se ignorují mimo hru, uvnitř `[inert]` a při celé obrazovce, pokud hra není horní vrstva.
- Během animací se vstup ignoruje, dokud se plocha neustálí.

### Animace
- Prohození, zmizení (zmenšení a zprůhlednění) a pád trvají každý zhruba 150 až 250 ms přes CSS `transform` a `opacity`.
- Respektuje se `prefers-reduced-motion`: animace se zkrátí na minimum.

### Ukládání
- localStorage `zachodova-splachni-v1` obsahuje:
  - `rezim`: `"tahy"`, `"cas"` nebo `"nekonecna"`;
  - `rekordy`: `{tahy, cas, nekonecna}`;
  - `nekonecna`: `null`, nebo `{deska, body}`, kde `deska` má 64 kódů dlaždic.
- Poškozená data dávají výchozí hodnoty. Neplatná deska znamená, že se uložená hra zahodí.

## Drobná rozhodnutí (moje volby)
- Druhá speciální dlaždice je 🧽 (houbička, „vyčistí všechno“).
- Rekord se zobrazuje jako „Spláchnuto: N“.
- Pořadí režimů a výchozí režim je Tahy.

## Na builderovi
- Generování desky bez hotových řad a s aspoň jedním tahem, přesná struktura stavu a kódy dlaždic.
- Barvy podkladů dlaždic v rámci CSS proměnných, časování animací v rámci uvedeného rozsahu.
- Struktura bloků (doporučení: `#splachni-logika` pro čistou logiku, `#splachni-ui` pro UI).
