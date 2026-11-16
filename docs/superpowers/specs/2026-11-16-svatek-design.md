# Pozdrav se jmeninami a státními svátky – krátký návrh

## Rozhodnutí uživatele
- Zdroj: veřejné API (aplikace bez internetu stejně nejde používat). Zvoleno `https://svatkyapi.cz/api/day/RRRR-MM-DD`, jedním dotazem vrací jméno i státní svátek, CORS povolen.
- Text: „Ahoj *přezdívka*, dnes má svátek *jméno*.“, bez přezdívky „Dnes má svátek *jméno*.“
- Státní svátek: varianta A, tedy obojí („… Je státní svátek: *název*.“). Ve dny bez jména „dnes je státní svátek: *název*.“
- Umístění: na širokém displeji vlevo na úrovni data a času, na mobilu pod lištou s datem a nad nadpisem.

## Přístupy
1. **svatkyapi.cz (zvoleno).** Jméno i svátek v jedné odpovědi, jen pro ČR.
2. abalin.net (jména, i jiné státy) + nager.at (svátky). Dva dotazy, jméno a svátek smíchané v jednom textu.
3. Vložený kalendář. Bez závislosti na síti, uživatel ho nechtěl.

## Moje volby
- API dává ve dny bez jména do `name` název svátku („Nový rok“, „Boží hod vánoční“). Jméno = slova s velkým písmenem spojená „ a “ (Otmar, Adam a Eva) a zároveň jiné než název svátku.
- Přezdívka se nesklání.
- Odpověď se uloží pro dnešní datum (`zachodova-svatek-v1`), API se volá jednou denně. O půlnoci se pozdrav přepne (kontrola každou minutu a při návratu na stránku).
- Když API selže nebo nic nevrátí, pozdrav se neukáže.
- Hranice pro umístění vlevo nahoře 1100 px. Dlouhý text se tam zkrátí trojtečkou, celý je v popisku.
