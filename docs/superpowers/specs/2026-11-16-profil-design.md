# Profil a oddělení kalkulačky od deníku – návrh

## Záměr
Deník má počítat výdělek z osobního nastavení, které se nemění tím, že si někdo v kalkulačce zkouší jiná čísla. Kalkulačka se vrací k jednorázovému výpočtu „co kdyby“ a s deníkem ji spojuje jen tlačítko „Zapsat do deníku“. K osobnímu nastavení přibude přezdívka a avatar, aby aplikace působila jako „moje“.

## Cíle (rozhodnutí uživatele)
- Záložky nahoře jsou jen dvě: „Kalkulačka“ a „Deník“.
- V kalkulačce se mezi MD sazbou a měsíčním platem přepíná dvěma přepínači (radio).
- Kalkulačka si nechává + a −. Logika kalkulačky je oddělená od deníku. Kalkulačka slouží k jednorázovému výpočtu a případně k zápisu („Zapsat do deníku“).
- V deníku nejsou + a −. Tlačítko „Jdu na záchod“ zůstává.
- Vpravo nahoře je ikona uživatele, která otevře profil.
- Profil se otevírá jako vrstva přes stránku (jako hry nebo „Svolej poradu!“).
- V profilu je nastavení pro deník (MD sazba, nebo měsíční plat), přezdívka a avatar.
- Vše se ukládá jen v zařízení (localStorage).

## Mimo rozsah
- Vlastní fotka jako avatar.
- Více profilů, účty, synchronizace.
- Přepočet starších zápisů po změně profilu.

## Anti-cíle
- Změna sazby v kalkulačce ani v profilu nesmí změnit uložené zápisy.
- Nesmí se ztratit deník ani nastavení kalkulačky.
- Nesmí se rozbít stopky (včetně obnovení po znovunačtení stránky), varování po 20 minutách, hodiny v liště ani hry.
- Ikona profilu se nesmí překrývat s hodinami ani na šířce 320 px.
- Nikde dlouhá pomlčka.

## Omezení (dané projektem)
- Vše v `index.html` (HTML/CSS/JS ve stylu ES5, bez závislostí a buildu), česky, mobile-first, světlý i tmavý režim přes CSS proměnné.
- Čistá logika ve vlastním `<script id="...">` bloku, testy `node --test` přes `tests/load-block.mjs`.

## Přístupy
1. **Profil jako vrstva přes stránku (zvoleno).** Stejný vzor jako hry: dost místa pro formulář i na telefonu, zavírá se křížkem a Esc, přístupnost (focus, `aria-modal`) už je v projektu vyřešená.
2. Rozbalovací panel pod ikonou. Rychlejší na pohled, ale na úzkém displeji těsný a může překrýt lištu se stopkami.

Sazba: zvoleno oddělit profil od kalkulačky (deník počítá z profilu, kalkulačka ze svých polí). Sdílené hodnoty by znamenaly, že pokus v kalkulačce změní budoucí zápisy.

## Návrh

### Záložky a kalkulačka
- Řádek záložek: „Kalkulačka“, „Deník“ (stejné chování jako dnes: tablist, šipky, pamatuje se otevřená). Uložený pohled `md` nebo `sal` z dřívějška se načte jako kalkulačka.
- Nahoře v panelu „Tvoje údaje“ skupina přepínačů „Způsob odměny“: MD sazba / Měsíční plat. Chová se jako dnešní přepínání (mění popisek a nápovědu pole, každý způsob si pamatuje svou částku).
- Počítadlo + / − mění jen počet návštěv za den v kalkulačce (nejméně 0), ukládá se do klíče kalkulačky. Nesouvisí s deníkem a o půlnoci se nenuluje.
- Výsledky kalkulačky jsou odhad: den = počet × průměr na návštěvu × výdělek za minutu, měsíc a rok z toho jako dřív. Fakta také z počtu v kalkulačce.
- „Zapsat do deníku“ zapíše jednu návštěvu: začátek teď, délka z „Průměr na návštěvu“, částka a měna podle kalkulačky, zdroj „ručně“. Pravidla prázdné délky a potvrzení zůstávají.
- „Vrátit výchozí hodnoty“ vrací jen kalkulačku.

### Stopky
- „Jdu na záchod“ je v kalkulačce i v deníku (jeden blok, přesouvá se jako dnes). Počítadlo se z bloku stopek oddělí a zůstane v kalkulačce.
- Zápis ze stopek počítá částku a měnu z **profilu**. Nemění počet ani průměr v kalkulačce.
- Částka v horní liště při běžících stopkách se počítá z profilu.
- Když má profil nulový výdělek za minutu, zápis se přesto uloží (s částkou 0) a poznámka u tlačítka řekne „Zapsáno bez částky. Nastav si sazbu v profilu.“

### Pohled Deník
- Bez + a −. Nahoře blok stopek, pod ním řádek „Počítám podle profilu: 🦆 Přezdívka · 1 250 Kč / MD“ (nebo „/ měsíc“) s tlačítkem „Upravit“, které otevře profil.
- Ostatní (seznam, mazání s „Vrátit“, vyúčtování „Vyděláno“) beze změny.

### Ikona a vrstva profilu
- Kulaté tlačítko vpravo nahoře (pevná pozice jako hodiny), hodiny se posunou vlevo od něj. Ukazuje zvolený avatar, bez avataru obecnou ikonu uživatele. Popisek pro čtečku „Profil“, s přezdívkou „Profil: Přezdívka“.
- Vrstva „Profil“:
  - náhled avataru a přezdívky;
  - pole Přezdívka (nejvýš 24 znaků, může být prázdná);
  - výběr avataru: skupina přepínačů s 8 emoji (🧻 🚽 👑 🦆 💩 🐻 🦄 🚀) a „Žádný“;
  - sekce „Pro deník“: přepínače MD sazba / Měsíční plat, částka, měna, délka pracovního dne (hod) a u platu pracovních dní / měsíc;
  - tlačítko „Hotovo“ a křížek zavřou vrstvu. Změny se ukládají průběžně.
- Výdělek za minutu z profilu: MD sazba / (hodiny × 60), plat / dny / (hodiny × 60); chybějící nebo nulová hodnota dá 0.

### Ukládání
- Nový klíč `zachodova-profil-v1`: `{ prezdivka, avatar, mode, castka, mena, hodiny, dni }`.
- Když klíč chybí, profil se jednou naplní z uložené kalkulačky (způsob odměny, jeho částka, měna, hodiny, dny / měsíc) a uloží. Bez kalkulačky začíná s nulami a měnou Kč.
- Neplatné jednotlivé hodnoty se nahradí výchozími, ostatní zůstanou. Neznámý avatar = žádný.
- Změna profilu v jiné otevřené kartě se načte (událost `storage`).
- Deník a jeho klíč beze změny.

## Drobná rozhodnutí (moje volby)
- Avatar jen z emoji, ne fotka.
- Profil se při prvním spuštění předvyplní z kalkulačky.
- Stopky nezvyšují počet v kalkulačce a nemění její průměr.
- Řádek „Počítám podle profilu“ v deníku, aby bylo vidět, z čeho se zápisy počítají.
- Nulová sazba v profilu zápis neblokuje.

## Upřesnění po kontrole (moje volby)
- **Počet v kalkulačce:** načte se zase z uloženého `count` v klíči kalkulačky (výchozí 0). Neplatná hodnota = 0.
- **„Dnes“ v kalkulačce:** odhad v měně kalkulačky (počet × průměr × výdělek za minutu), podtitul počet návštěv a minuty. Součet dnešních zápisů a spojené měny („312 Kč + 4 €“) z kalkulačky mizí. Panel „Vyděláno“ v deníku zůstává beze změny (zmrazené částky zápisů).
- **Automatický přepočet „Průměr na návštěvu“ ze zápisů se ruší úplně** (po stopkách, smazání i „Vrátit“). Pole mění jen uživatel.
- **Ruční zápis vs. profil:** zápis z kalkulačky má částku a měnu kalkulačky, i když se liší od profilu. Je to záměr, součty po měnách to už umí.
- **Výchozí profil a validace:** `mode` „md“, `castka` 0, `mena` jen CZK / EUR / USD (jinak CZK), `hodiny` 0 až 24 (výchozí 0), `dni` celé 0 až 31 (výchozí 0), záporné nebo nečíselné hodnoty = výchozí, `prezdivka` oříznutá na 24 znaků.
- **Poškozený profil:** když klíč existuje, ale nejde přečíst, použijí se v paměti výchozí hodnoty a nic se přes něj neuloží, dokud uživatel v profilu něco nezmění (stejně jako u deníku). Z kalkulačky se plní jen při chybějícím klíči.
- **Pohled:** uložený `pohled` „md“ nebo „sal“ se načte jako „kalk“, způsob odměny kalkulačky (`mode`) zůstává uložený zvlášť jako dosud.
- **Vrstvy:** profil jde otevřít jen z hlavní stránky. Když je otevřená hra nebo jiná vrstva, ikona je zakrytá nebo neaktivní. Dvě vrstvy najednou nejsou.

## Na builderovi
- Logika profilu jako `window.ProfilLogika` (výchozí hodnoty, parsování, naplnění z kalkulačky, výdělek za minutu) s testy.
- Přesné rozmístění ikony a hodin, vzhled výběru avataru v rámci stávajících CSS proměnných.
