# Záložka Vtipy – krátký návrh

## Rozhodnutí uživatele
- Nová záložka „Vtipy“ v „Čtení na trůn“ před „Hry“. Vtip jako text, nový přes tlačítko „Další vtip“.
- Vtipy musí být česky, zdroj je vedlejší a může se kombinovat.

## Přístupy
1. **Vlastní česká sbírka v aplikaci + české vtipy z JokeAPI (zvoleno).** Veřejné API s českými vtipy prakticky neexistuje (JokeAPI má 2 bezpečné české vtipy).
2. Anglické vtipy (icanhazdadjoke, JokeAPI) strojově přeložené přes MyMemory. Slovní hříčky se překladem ztrácejí, denní limit.
3. Kombinace 1 a 2. Kolísající kvalita.

## Moje volby
- Sbírka 125 krátkých slušných vtipů napsaných pro aplikaci (práce, porady, peníze, programátoři, záchod, Pepíček, zvířata) v bloku `vtipy-data`.
- JokeAPI `?lang=cs&safe-mode` se zavolá při prvním otevření záložky, jeho vtipy se přidají ke sbírce. Bez sítě stačí sbírka.
- Výběr: náhodně z dosud neviděných, po projití všech znovu od začátku, ale nikdy hned stejný vtip. Viděné vtipy v `zachodova-vtipy-v1`.
- Dialogy na víc řádků (`\n`, `white-space: pre-line`).
- Na telefonech do 400 px se záložky zúží, aby se čtyři vešly i na 320 px.
