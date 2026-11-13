# TODO

## Feed novinek

- [ ] **Celé články přímo v aplikaci.** Feed teď bere zprávy z RSS (iROZHLAS, ČT24, iDNES) a ukazuje jen titulek, perex, obrázek a odkaz na celý článek u vydavatele. Časem přejít na zdroj, který dovoluje legálně zobrazit celý text ve veřejné aplikaci.
  - Kandidáti: The Guardian Open Platform (celý text, ale anglicky, free klíč je nekomerční, ověřit podmínky), placené licencované API (World News API, NewsData.io, ověřit licenci k veřejnému zobrazení).
  - Proč ne stahování textu z českých webů: aplikace je veřejná a vydavatelé přebírání obsahu zakazují. iROZHLAS, ČT24, iDNES, Peníze.cz a Měšec.cz navíc blokují vložení do iframe.
- [ ] **Víc finančních zdrojů.** Peníze.cz, Měšec.cz, E15, HN Byznys, Kurzy.cz, Finparáda, Roklen24 mají RSS, ale bez CORS. Načíst je půjde až přes malou serverovou funkci (proxy), například na Vercelu.
