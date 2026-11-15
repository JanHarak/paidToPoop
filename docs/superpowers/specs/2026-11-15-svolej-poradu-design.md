# Svolej poradu! – návrh

## Záměr
Do záložky „Hry“ přibude pátá hra: akční bludiště ve stylu „polož a uteč“. Hráč je manažer v obleku s kravatou. Místo bomb svolává porady (kalendář s odpočtem), které po chvíli „vybuchnou“ do kříže. Je to krátká zábava během sezení, hlavně na mobilu. Hra je vlastní a nekopíruje žádnou existující hru, ani názvem, ani postavami, ani vzhledem.

## Cíle (rozhodnutí uživatele)
- Hlavní postava je manažer: postavička v obleku s kravatou.
- Místo bomb klade porady s motivem kalendáře a času.
- Hraje se varianta „patra kanceláře“: hráč čistí patro od kolegů a postupuje výtahem výš.
- Souboj proti počítačovým manažerům v aréně (původní představa uživatele) se odkládá do `TODO.md`.

## Mimo rozsah
- Aréna proti počítačovým manažerům, hra více lidí.
- Zvuky, hudba, obrázky třetích stran.
- Ukládání rozehrané hry přes obnovení stránky.

## Anti-cíle
- Hra nesmí ovlivnit stopky ani výdělek.
- Napodobení konkrétní existující hry (název, postavy, vzhled) je vyloučené.
- Ovládání na mobilu nesmí posouvat stránku a hra nesmí zamrzat.
- Chyba hry nesmí shodit ostatní hry.
- Hra nesmí běžet (ani nepřátelé, ani odpočty porad), když není vidět.

## Omezení (dané projektem)
- Vše je v `index.html` jako HTML/CSS/JS ve stylu ES5, bez závislostí a bez buildu. Hra je česky a mobile-first, světlý i tmavý režim jde přes CSS proměnné. Nikde nesmí být dlouhá pomlčka.
- Čistá logika je ve vlastním `<script id="…">` bloku a testuje se v Node (`node --test` bez argumentu) přes `tests/load-block.mjs`.
- Napojení na `window.HrySeznam` a na rám her stejný jako u Piškvorek, Šachů a Spláchni to:
  - hraní v boxu `#hraSlot`;
  - celá obrazovka přes `window.Vrstvy`;
  - stopky v hlavičce;
  - varování po 20 minutách nad hrou;
  - klávesy se ignorují uvnitř `[inert]` a když hra není horní vrstva;
  - hra vystavuje `isOpen()` a přidá se do `blokovano()` v `#instalace-ui`.

## Přístupy
1. **Canvas s vlastní herní smyčkou (zvoleno).** Postavičky se hýbou plynule a nepřátel je víc najednou. Kreslí se stejně jako Rulíčka (`requestAnimationFrame`). Logika běží v pevných krocích a je oddělená od kreslení, takže jde testovat v Node.
2. Mřížka tlačítek jako u šachů. Plynulý pohyb mnoha postav by se musel řešit přes desítky přechodů CSS a pro akční hru to nic nepřináší.

## Návrh

### Seznam her a detail
- V seznamu je položka „Svolej poradu!“ s podtitulem „Zavři kolegy v poradě“.
- Detail obsahuje:
  - popis „Jsi manažer. Pokládej porady, rozbíjej krabice a zavři všechny kolegy v poradě. Pak jeď výtahem o patro výš. Pozor, porada zasáhne i tebe. Stopky sezení běží dál.“;
  - rekord „Rekord: 7. patro“ (nebo „Rekord: zatím žádný“);
  - tlačítko „Zahraj si“.

### Patro
- Mřížka 13 sloupců × 11 řádků.
- Okraj tvoří pevné zdi a uvnitř jsou pevné přepážky na každém druhém poli (sudý řádek a sudý sloupec), takže vzniká síť chodeb.
- Krabice s papíry 📦 se rozmístí náhodně na zbylá volná pole s hustotou zhruba 40 až 50 %.
- Levý horní roh (start) a pole hned vedle něj zůstanou volná, aby hráč mohl položit první poradu a utéct.
- Pod jednou náhodnou krabicí je schovaný výtah 🛗. Je vidět, až se krabice rozbije. Výtah je zavřený, dokud na patře zbývá kolega. Pak se otevře (změní vzhled) a vstup do něj znamená postup o patro výš.

### Manažer
- Postavička v obleku s kravatou je nakreslená na canvasu (tvary, ne emoji): hlava, tmavý oblek, bílá košile a výrazná kravata. Natáčí se podle směru chůze.
- Pohybuje se plynule po chodbách. Drží se mřížky: když hráč zatáčí kousek vedle křižovatky, postava se do chodby sama dorovná (velkorysá tolerance).
- Projde přes volná pole a otevřený výtah. Neprojde přes zdi, přepážky, krabice ani porady (kromě porady, kterou právě položil a ze které ještě neodešel).

### Porada
- Položí se na pole, na kterém manažer stojí. Vypadá jako kalendář 📅 s ubývajícím odpočtem (hodinky nebo vizuální ručička).
- Za 2,5 s „vybuchne“ do kříže (nahoru, dolů, vlevo, vpravo) na vzdálenost dosahu. Výchozí dosah je 1 pole.
- Výbuch zastaví pevná zeď nebo přepážka. Krabici rozbije a dál nepokračuje.
- Výbuch zasáhne kolegy, manažera i bonusy ležící na zemi (bonus zmizí). Zasažená porada vybuchne hned (řetězení).
- Výbuch je vidět zhruba 0,5 s (např. „bubliny“ s textem nebo záblesk v barvě porady) a po celou tu dobu zasahuje.
- Výchozí počet porad položených naráz je 1.

### Kolegové
- **Stážista:** bloumá náhodně po chodbách a na křižovatkách občas mění směr.
- **Kolega na minutku:** když je hráč do vzdálenosti zhruba 5 polí, jde k němu nejkratší cestou. Jinak bloumá.
- Kolegové neprojdou zdmi, krabicemi ani poradami.
- Dotyk kolegy s manažerem znamená ztrátu života.
- Zasažený kolega „odchází na poradu“ (krátká animace) a zmizí. Za každého je 100 bodů.
- **Obtížnost podle patra:** na 1. patře 3 kolegové, převážně stážisté. S každým patrem přibývá kolegů (do rozumného maxima, např. 8), roste podíl kolegů na minutku a mírně se zvyšuje jejich rychlost. Kolegové se nikdy neobjeví blízko startu.

### Bonusy
- Při rozbití krabice padne s určitou pravděpodobností (zhruba 20 až 25 %) bonus:
  - ☕ káva zvýší rychlost chůze (do maxima);
  - 📅 přidá jednu poradu naráz (do maxima, např. 5);
  - 📢 megafon prodlouží dosah porady o 1 (do maxima, např. 6).
- Sebere se vstupem na pole. Bonusy platí do konce hry, tedy i v dalších patrech. Ztráta života je nebere.

### Životy, konec a body
- Hráč má 3 životy.
- Po ztrátě života začíná manažer znovu na startu stejného patra. Rozbité krabice zůstanou, porady na ploše zmizí a kolegové se přesunou pryč od startu. Krátce (zhruba 2 s) je nezranitelný a bliká.
- Po posledním životě hra končí výsledkem „Dostal ses do 4. patra · 1 200 bodů“, případně „Nový rekord!“, a tlačítky „Hrát znovu“ a „Ukončit hru“.
- Za dokončené patro je bonus 500 bodů.
- Rekordem je nejvyšší dosažené patro. Při shodě rozhodují vyšší body.
- Hlavička ukazuje patro, životy, body a stopky.

### Ovládání
- **Klávesnice:** šipky nebo WASD pro pohyb (pohyb trvá, dokud je klávesa držená) a mezerník nebo Enter pro poradu. Klávesy se ignorují mimo hru, uvnitř `[inert]` a při celé obrazovce, pokud hra není horní vrstva.
- **Dotyk:**
  - pod plochou jsou šipková tlačítka, pohyb trvá, dokud je tlačítko držené;
  - velké tlačítko „Svolat poradu“ je vedle nich;
  - ovládací prvky mají `touch-action: none` a nesmí posouvat stránku.
- Plocha i tlačítka jsou vidět i v boxu na šířku telefonu (375 px). V celé obrazovce se plocha zvětší.

### Pauza
- Hra se pozastaví, když:
  - není otevřená;
  - záložka Hry je skrytá;
  - stránka je na pozadí;
  - je zobrazené varování po 20 minutách.
- Hra má tlačítko Pauza.
- Po návratu z pauzy pokračuje plynule, bez skoku v čase (velký časový krok se nesmí promítnout do logiky).

### Ukládání
- localStorage `zachodova-porada-v1` obsahuje `{rekordPatro, rekordBody}`.
- Poškozená data znamenají výchozí hodnoty.
- Rozehraná hra se po zavření hry pamatuje jen do obnovení stránky, stejně jako u Piškvorek.

### Přístupnost
- Stavový řádek pro čtečku (`aria-live`) oznamuje patro, ztrátu života, otevření výtahu a konec hry.

## Drobná rozhodnutí (moje volby)
- Název hry je „Svolej poradu!“ a podtitul „Zavři kolegy v poradě“.
- Mřížka je 13×11 s klasickou sítí přepážek.
- Porada vybuchne za 2,5 s.
- Hráč má 3 životy. Bonusy jsou ☕, 📅 a 📢.
- Rekord je nejvyšší patro, při shodě rozhodují body.

## Upřesnění po kontrole (moje volby)
- **Velikost na telefonu:** 13×11 při šířce 375 px dává políčka zhruba 27 px. To stačí, protože se neovládá ťukáním do plochy, ale tlačítky. Canvas se přizpůsobí šířce boxu a v celé obrazovce se zvětší. Plocha se neposouvá ani neořezává.
- **Rychlost:** základní rychlost manažera je zhruba 3 pole/s, s kávou nejvýš kolem 5,5 pole/s. Kolegové začínají pomaleji než manažer (zhruba 1,5 až 2 pole/s) a ani na vyšších patrech nepřekročí základní rychlost manažera.
- **Únik na startu je závazný:** levý horní roh a pole vpravo a pod ním jsou vždy volná. Se základními hodnotami (dosah 1, základní rychlost) jde z prvního položení na startu vždy utéct za roh. Při větším dosahu je únik na hráči.
- **Výtah:**
  - krabice s výtahem nikdy neskrývá bonus;
  - na pole s výtahem (zavřeným i otevřeným) může jen manažer, kolegové ho obcházejí;
  - výbuch přes výtah projde a nic na něm neničí;
  - poradu na výtah položit nejde;
  - vstup do otevřeného výtahu hned znamená postup do dalšího patra.
- **Generování a dosažitelnost:** stačí statická kontrola, tedy že výtah i všichni kolegové jsou ze startu dosažitelní, když se odmyslí krabice. Kolegové se objeví jen na volných polích (ne na krabicích) ve vzdálenosti aspoň 5 polí cesty od startu.
- **Porady:**
  - na pole s poradou nejde položit druhou;
  - řetězově odpálená porada vybuchne okamžitě se svým vlastním dosahem a její 0,5 s výbuchu běží od okamžiku odpálení.
- **Zásah manažera:** jeden zásah (výbuchem nebo dotykem) bere nejvýš jeden život. Nezranitelnost po ztrátě života chrání před výbuchem i dotykem.
- **Po ztrátě života:** přeživší kolegové se přesunou na náhodná volná pole aspoň 5 polí cesty od startu. Bonusy zůstávají.
- **Hrát znovu:** začíná od 1. patra se 3 životy a bez bonusů.
- **Rekord:** ukládá se průběžně, hned po dosažení nového patra, a znovu na konci hry, aby se neztratil při zavření stránky uprostřed hry.
- **Pauza a varování:** pauza zapnutá tlačítkem zůstane zapnutá i po zavření varování. Automatické pauzy (skrytí, pozadí, varování) po svém skončení pokračují samy.

## Na builderovi
- Herní smyčka s pevným krokem logiky a interpolací kreslení, přesné rychlosti, maxima bonusů a pravděpodobnosti v rámci uvedených hodnot.
- Algoritmus pronásledování (např. BFS po mřížce) a generování patra s ověřením, že výtah i všichni kolegové jsou dosažitelní po rozbití krabic.
- Kresba manažera, kolegů, porad a výbuchu v rámci CSS proměnných.
- Struktura bloků (doporučení: `#porada-logika` pro čistou logiku, `#porada-ui` pro canvas a UI).
