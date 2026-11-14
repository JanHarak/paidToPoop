# Náhled při sdílení a PWA – krátký návrh

## Záměr
Odkaz na kalkulačku má při sdílení ukázat hezký náhled. Na mobilu má jít aplikaci přidat na plochu, a když ještě není nainstalovaná, má to stránka sama nabídnout.

## Rozhodnutí uživatele
- Primární adresa je `https://seraber.vercel.app/`. GitHub Pages (`https://janharak.github.io/paidToPoop/`) zůstává jako záloha.
- Název aplikace je „Záchodová kalkulačka“.
- „Teď ne“ schová nabídku instalace na **1 den**.
- Ostatní body návrhu odsouhlasil uživatel.

## Náhled
- `<meta name="description">` dostane text z úvodu stránky (zkrácený).
- `og:title`, `og:description`, `og:type=website`, `og:url` a `og:site_name` se nastaví takto:
  - `og:locale` je `cs_CZ`.
  - `og:image` je `https://seraber.vercel.app/og.png`, rozměr 1200×630, s alt textem.
  - Přidá se `twitter:card=summary_large_image`.
  - `<link rel="canonical">` míří na primární adresu.
- `theme-color` se nastaví pro světlý i tmavý režim.
- `og.png` je v barvách aplikace: kachličky, nápis „Záchodová kalkulačka“, podtitul „Kolik ti zaplatí za čas na porcelánu?“ a zlatý akcent „Kč“. Vyrobí ho skript `tools/generuj-obrazky.py` (Pillow), který vytvoří i ikony.

## PWA
- Manifest `manifest.webmanifest` nastavuje:
  - `name` a `short_name` „Záchodová kalkulačka“ (moje volba, na ploše se název může zkrátit);
  - `start_url` a `scope` jako `./`, aby fungovaly na Vercelu i na GitHub Pages;
  - `display: standalone`, barvy aplikace a jazyk `cs`;
  - ikony 192 a 512 a k nim maskovatelnou ikonu 512.
- Dále přibudou `apple-touch-icon` 180 px a favicona (PNG 32 a SVG).
- Service worker `sw.js` obsluhuje požadavky takto:
  - Stránka (navigace) jde nejdřív ze sítě a bez sítě z cache.
  - Manifest a ikony jdou z cache.
  - Google Fonts se ukládají za běhu.
  - Zprávy z RSS a další cizí požadavky service worker neobsluhuje.
  - Při změně se mění verze cache.

## Nabídka instalace
- Zobrazí se jen na mobilu (`pointer: coarse` a úzký displej), jen když aplikace neběží jako nainstalovaná a jen když neplatí odklad.
- Android/Chromium: stránka zachytí `beforeinstallprompt` a pár sekund po načtení ukáže dolní pruh „Přidej si kalkulačku na plochu“ s tlačítky „Nainstalovat“ (vyvolá systémový dialog) a „Teď ne“.
- iOS Safari: pruh ukáže návod „Klepni na Sdílet a pak Přidat na plochu“ a tlačítko „Teď ne“.
- „Teď ne“ uloží do localStorage (`zachodova-instalace-v1`) čas a nabídka se 24 h neukáže. Po instalaci (`appinstalled`) se pruh schová a víckrát se neukáže.
- Pruh se neukáže a zmizí, když je otevřená vrstva (hra přes celou obrazovku, detail článku) nebo varování po 20 minutách. Stopky ani hry neovlivní.

## Mimo rozsah
- Push notifikace a offline čtení zpráv.
