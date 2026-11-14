# Rulíčka: ovládací tlačítka na telefonu – krátký návrh

## Záměr
Rulíčka jde na telefonu ovládat tažením prstem po ploše, jenže to uživatel nevěděl. Chce proto viditelná tlačítka pod hrou a vysvětlení, že hra jde ovládat i tažením.

## Rozhodnutí uživatele
- Tažení po ploše zůstane beze změny.
- Pod hrací plochu přibudou tlačítka.
- Na stránce bude vysvětleno, že hra jde hrát i tažením.

## Postup
Zvolený postup je ovládací kříž ze 4 tlačítek (▲ ◀ ▶ ▼) pod `#hraPole`. Zamítnuté varianty:
- Virtuální joystick ovládá diskrétní směry hůř než kříž.
- Tlačítka přes hrací plochu by zakrývala bludiště.

## Návrh
- Tlačítka mají asi 56 px a `aria-label` „Nahoru“, „Doleva“, „Doprava“ a „Dolů“.
  - Při `pointerdown` se nastaví stejný vstup jako šipka na klávesnici (`input = dir`) a zavolá se `preventDefault`. Reakce je tak okamžitá, bez zoomu a bez kradení fokusu.
  - Klávesová aktivace (click s `detail === 0`) funguje také.
- Kříž je vidět jen na dotykových zařízeních (`@media (pointer: coarse)`), v boxu i přes celou obrazovku. Na počítači je skrytý.
- Moje volba: v boxu se na dotykových zařízeních sníží maximální výška plochy, aby se plocha i kříž vešly na obrazovku. Přes celou obrazovku se plocha zmenší sama (flex).
- Pod křížem bude text „Šipkami, nebo táhni prstem po ploše“.
- Do popisu Rulíčky v seznamu her přibude věta „Na telefonu hraješ tlačítky pod hrou, nebo tahem prstu po hrací ploše.“

## Mimo rozsah
Klávesnice a logika hry zůstávají beze změny.
