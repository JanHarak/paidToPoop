# Měření času v kalkulačce – krátký návrh

## Záměr
Do kalkulačky se vrací stopky jako zkušební měření. Počítají podle profilu, ne podle polí kalkulačky. Samy do deníku nic nezapíšou, výsledek se ukáže ve výsledcích a uživatel ho může zapsat sám.

## Rozhodnutí uživatele
- V kalkulačce bude oddělovač „nebo měř čas“ a tlačítko „Jdu na záchod“.
- Tlačítko je aktivní, jen když má uživatel nastavený profil, jinak výzva k nastavení profilu.
- Po zastavení se výsledek ukáže v panelu „Výdělek na záchodě“.
- Měření z kalkulačky se samo do deníku nezapíše (varianta 2). Do deníku jde přes tlačítko, které zapíše změřený čas.

## Přístupy
1. **Jedny stopky, které si pamatují, kde byly spuštěny (zvoleno).** Horní lišta, varování po 20 minutách a obnovení po načtení stránky fungují beze změny.
2. Dvoje nezávislé stopky. Dvojí stav, dvě lišty a dvě varování. Zbytečně složité.

## Návrh (moje volby schválené uživatelem)
- **Zdroj běhu:** při spuštění se uloží `kalk` nebo `denik` (klíč `zachodova-stopky-zdroj-v1`). Chybějící nebo neznámá hodnota = `denik`. Zastavit jde z obou míst, o zápisu rozhoduje zdroj.
- **Nastavený profil** = `Profil.zaMinutu() > 0`. Bez něj jsou obě tlačítka „Jdu na záchod“ (kalkulačka i Deník) neaktivní, pod nimi „Nejdřív si nastav sazbu v profilu.“ a tlačítko „Nastavit profil“. Běžící stopky jdou zastavit vždy.
- **Výsledek měření:** rámeček v panelu „Výdělek na záchodě“: „Změřeno: 4:12 · 70 Kč (podle profilu)“ a tlačítko „Zapsat měření do deníku“. Zápis: začátek měření, změřená délka, částka a měna podle profilu v okamžiku zastavení, zdroj „stopky“. Po zápisu „✓ Zapsáno“ a tlačítko neaktivní. Výsledek se uloží do klíče kalkulačky (`mereni`) a přežije načtení stránky, nahradí ho další měření.
- **Krátké měření** (pod 10 s): poznámka „Moc krátké, nic se nezměřilo.“, předchozí výsledek zůstává.
- Stávající „Zapsat do deníku“ dál zapisuje odhad z kalkulačky.

## Anti-cíle
- Měření nemění pole ani počítadlo kalkulačky.
- Běh spuštěný v Deníku se chová jako dosud.
- Nikde dlouhá pomlčka.
