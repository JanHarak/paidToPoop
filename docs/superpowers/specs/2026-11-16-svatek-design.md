# Pozdrav se jmeninami a státními svátky – krátký návrh

## Rozhodnutí uživatele
- Zdroj: veřejné API (aplikace bez internetu stejně nejde používat). Zvoleno `https://svatkyapi.cz/api/day/RRRR-MM-DD`, jedním dotazem vrací jméno i státní svátek, CORS povolen.
- Text: „Ahoj *přezdívka*, dnes má svátek *jméno*.“, bez přezdívky „Dnes má svátek *jméno*.“
- Státní svátek: když má den jméno, ukáže se jen jméno. Svátek jen ve dny bez jména („dnes je státní svátek: *název*.“). (Původně varianta A, uživatel změnil.)
- Umístění: na řádku s datem a časem vlevo, dokud se tam vejde na jeden řádek (počítá se i s delší lištou při běžících stopkách). Jinak pod lištou a nad nadpisem. Hlavní cíl jsou mobily.

## Přístupy
1. **svatkyapi.cz (zvoleno).** Jméno i svátek v jedné odpovědi, jen pro ČR.
2. abalin.net (jména, i jiné státy) + nager.at (svátky). Dva dotazy, jméno a svátek smíchané v jednom textu.
3. Vložený kalendář. Bez závislosti na síti, uživatel ho nechtěl.

## Moje volby
- API dává ve dny bez jména do `name` název svátku („Nový rok“, „Boží hod vánoční“). Jméno = slova s velkým písmenem spojená „ a “ (Otmar, Adam a Eva) a zároveň jiné než název svátku.
- Přezdívka se nesklání.
- Odpověď se uloží pro dnešní datum (`zachodova-svatek-v1`), API se volá jednou denně. O půlnoci se pozdrav přepne (kontrola každou minutu a při návratu na stránku).
- Když API selže nebo nic nevrátí, pozdrav se neukáže.
- O umístění rozhoduje skript podle změřené šířky textu a polohy hodin (při změně velikosti okna i hodin).
