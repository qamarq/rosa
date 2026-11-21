# ROSA: Retencja · Opady · Susza · Analiza

Narzędzie webowe dla rolnika: wpisujesz numer działki ewidencyjnej, wybierasz uprawę i dzień analizy, a ROSA w kilka sekund ocenia sytuację wodną działki na tle ostatnich 10 lat, wyjaśnia przyczyny niedoboru wody i podpowiada, jak zatrzymać wodę na polu (retencja → agrotechnika → ewentualnie nawadnianie). Wynik można pobrać lub wydrukować jako raport PDF (A4).

**Wersja działająca (zalecana do oceny):** https://rosa.kamilmarczak.pl — pełne dane dla całej Polski. Uruchomienie lokalne bez bazy danych daje tylko tryb demonstracyjny (sekcja 1).

Zadanie: Krajowy Ośrodek Wsparcia Rolnictwa, „Zatrzymaj Wodę, Chroń Plony”, HackNation 2026.

---

## 1. Instrukcja uruchomienia

### Wymagania
- Node.js 22+ i pnpm 11 (`corepack enable`)
- PostgreSQL 16+ z PostGIS 3.4+ z zaimportowanymi danymi (sekcja 5). Bez bazy aplikacja działa w **trybie demonstracyjnym**: obsługuje wyłącznie działkę przykładową, wynik ma widoczny baner „Dane przykładowe”, a każdy inny numer działki dostaje komunikat z odnośnikiem do wersji działającej. Tryb demonstracyjny nie jest oceną dowolnej działki.
- Docker (opcjonalnie: obraz produkcyjny i skrypty importu)

### Lokalnie
```bash
cd web
cp .env.example .env.local        # uzupełnij DATABASE_URL
pnpm install
pnpm db:migrate                   # tabele cache, stacji IMGW, wodowskazów i hydrologii (Drizzle)
pnpm dev                          # http://localhost:3000
```

Produkcyjnie:
```bash
pnpm build && node .next/standalone/server.js
# albo
docker build -t rosa-web ./web && docker run -p 3000:3000 -e DATABASE_URL=... rosa-web
```

Wdrożenie produkcyjne: Coolify na własnym serwerze, aplikacja budowana z `web/Dockerfile`, baza w tej samej sieci Dockera. Każdy push do gałęzi `main` uruchamia nowe wdrożenie (webhook GitHub → Coolify).

### Zmienne środowiskowe
| Zmienna | Opis |
|---|---|
| `DATABASE_URL` | Połączenie z PostgreSQL/PostGIS (`postgres://user:hasło@host:port/baza`). Brak = tryb demonstracyjny. |
| `ROSA_DATA_MODE=mock` | Wymusza tryb demonstracyjny (tylko działka przykładowa, z banerem „Dane przykładowe”), np. do prezentacji bez sieci. |
| `ROSA_SATELLITE_BUDGET_MS` | Limit czasu na pobranie zdjęcia Sentinel-2 w tle (domyślnie 15000 ms, na produkcji 20000 ms). |

### Import danych do bazy (jednorazowo, potem okresowo w tle)
```bash
./scripts/import_parcels.sh /dane                    # działki EGiB z GUGiK (Parquet, ~4,6 GB)
docker run --rm -e DATABASE_URL=... -v $PWD/scripts:/w python:3.12-slim \
  sh -c "pip install 'psycopg[binary]' && python /w/import_imgw.py"   # dane dobowe IMGW 2006–dziś
docker run --rm -e DATABASE_URL=... -v $PWD/scripts:/w python:3.12-slim \
  sh -c "pip install 'psycopg[binary]' && python /w/import_imgw_hydro.py"   # stany rzek IMGW, lata hydrologiczne 2006–ostatni
docker run --rm -e PGHOST=... -e PGPASSWORD=... -v /dane/bdot:/work -v $PWD/scripts:/s \
  ghcr.io/osgeo/gdal:ubuntu-full-latest python3 /s/import_bdot.py    # rowy i wody z BDOT10k (lista powiatów w /work/codes.txt)
./scripts/server/rosa-update.sh places                # indeks nazw obrębów i gmin do wyszukiwarki (z tabeli działek, ~3 min)
```

---

## 2. Opis funkcji

1. **Wybór działki**: numer działki ewidencyjnej (walidacja formatu na bieżąco) albo wskazanie na mapie, uprawa (pszenica, kukurydza, rzepak, ziemniaki, buraki, łąka) i dzień analizy: dziś lub dowolny dzień z ostatnich 10 lat.
   - **Mapa** (ortofotomapa GUGiK, granice działek z naszej bazy jako kafelki wektorowe, numery działek z KIEG): kliknięcie w pole zaznacza działkę.
   - **Wyszukiwarka na mapie**: wieś lub obręb i gmina (podpowiedzi od 2 liter, bez polskich znaków), adres z numerem („Poznań, Głogowska 10”, „Małachowo 12”), ulica, „obręb + numer działki” („Małachowo 399”) albo pełny identyfikator działki.
2. **Przelot do działki (~5 s, jedno ujęcie 3D)**: kamera leci nad Polską do pinezki, obrys działki rysuje się na ortofotomapie, teren unosi się w 3D, źródła danych „przylatują”, a na końcu panel wyniku wjeżdża z prawej bez przeładowania strony. Animacja ładuje dane w trakcie: jeśli dany etap nie jest gotowy, ujęcie płynnie czeka (kamera krąży, scena żyje), bez widocznych wskaźników ładowania. Opcjonalne dźwięki (Web Audio, generowane w kodzie) z przyciskiem wyciszenia. Bez WebGL, w trybie lekkim lub przy ograniczonym ruchu: wersja SVG.
3. **Model 3D działki**: budowany na żywo z danych tej działki: teren z NMT GUGiK (siatka 33×33 punkty, rzeźba przewyższona ×1,5–12 z informacją o krotności), granica działki i sąsiednie działki z EGiB, rowy, cieki i zbiorniki z BDOT10k, kierunek spływu, uprawa wybrana przez użytkownika w kolorze wynikającym z NDVI lub poziomu suszy, pogoda z wyniku analizy. Farma, drzewa, postacie i maszyny są poglądowe. Obrót przeciąganiem, przybliżanie gestem (pinch, kółko, touchpad) i przyciskami.
4. **Kondycja roślin z satelity, z uwzględnieniem uprawy**: NDVI z Sentinel-2 porównujemy z typowym NDVI wybranej uprawy w danym miesiącu (profile dla 6 upraw). Gdy rośliny są wyraźnie słabsze niż typowo (poniżej 80% normy), a bilans wodny pokazuje suszę, pojawia się przyczyna „Rośliny już reagują na brak wody” i rośnie pewność wyniku. Gdy satelita i bilans wodny się nie zgadzają albo uprawa w tym okresie nie pokrywa pola (np. ściernisko po żniwach), informujemy o tym w „Czego nie wiemy” zamiast wyciągać wnioski. Poziom suszy liczymy metodą IUNG z bilansu wodnego, a NDVI jej nie zastępuje.
5. **Wskaźnik kompletności danych** na scenie: „Dane: komplet ✓”, „6/7 · dociągam zdjęcie satelitarne” albo „6/7 · brak: …”, z listą źródeł i ich stanem po kliknięciu.
6. **Stan wody teraz** (dla dat z przeszłości: „Stan wody <data>”): poziom suszy w skali 1–5 (Mokro, W normie, Susza umiarkowana / silna / ekstremalna). W sezonie (21.III–30.IX) liczony metodą IUNG z rozporządzenia MRiRW: klimatyczny bilans wodny z 60 dni porównany z progiem dla uprawy i kategorii gleby (im dalej poniżej progu, tym wyższy poziom). Poza sezonem albo gdy IUNG nie wyznacza progu: bilans wodny porównany z tym samym okresem w 10 poprzednich latach.
7. **Na tle 10 lat**: wykres odchyleń bilansu wodnego rok po roku, liczba lat z deficytem i najbardziej narażone miesiące.
8. **Dlaczego brakuje wody**: przyczyny wyliczone z danych: mniej deszczu niż zwykle, upał, niski stan rzeki (najbliższy wodowskaz IMGW w 15% najniższych stanów dla tej pory roku z 10 lat), lekka gleba, głęboko położone wody gruntowe (PIG-PIB, ≥ 5 m przy suszy), spływ wody po spadku terenu, okres krytyczny uprawy, słabsza niż typowo roślinność na zdjęciu satelitarnym.
9. **Co zrobić**: rekomendacje w kolejności wymaganej przez KOWR:
   - zatrzymanie wody: zastawka na rowie przy działce (gdy BDOT10k pokazuje rów do 30 m od działki), zatrzymanie spływu w dolnej części pola (spadek ≥ 1,5%), utrzymanie wody gruntowej na glebach organicznych oraz przy płytkiej wodzie gruntowej (≤ 1,5 m w najbliższym punkcie PIG-PIB) i rowie do 150 m od działki;
   - agrotechnika: międzyplon, resztki pożniwne, ograniczenie orki, wysokość koszenia łąki;
   - nawadnianie (opcjonalnie): dawka z zapotrzebowania uprawy (ET0 × Kc wg FAO-56) minus opad z ostatnich 7 dni.
   Każda rekomendacja ma „Dlaczego to polecamy” z liczbami i źródłem. Kliknięcie pokazuje działanie na modelu 3D działki (np. koparka przy zastawce na najbliższym prawdziwym rowie), bez zmiany ujęcia kamery.
10. **Pewność i „Czego nie wiemy”**: jawny poziom pewności i lista ograniczeń dla tej konkretnej analizy (odległość do stacji, brak zdjęcia satelitarnego, działka nierolnicza itd.).
11. **Raport**: plik PDF generowany na serwerze jednym kliknięciem („Pobierz PDF”, `GET /api/analyses/<id>/pdf`: plan działki z rowami, stan wody, historia, przyczyny, rekomendacje, źródła z datami pobrania i licencjami). „Drukuj” otwiera ten sam PDF w nowej karcie, więc wydruk i pobrany plik są identyczne; stary adres `/raport/<id>` przekierowuje do PDF. Każda analiza ma stały link `/dzialka/<id>`.
12. **Tryb lekki**: bez animacji, dla słabszych komputerów i wolnego łącza; włącza się sam przy `prefers-reduced-motion` lub wolnym połączeniu.

---

## 3. Architektura

```
przeglądarka ──► Next.js 16 (App Router, React 19)
                 ├─ strony: / · /analiza · /dzialka/[id] (· /raport/[id] → PDF)
                 ├─ API: POST /api/analyses · GET /api/analyses/[id] · …/[id]/satellite · …/[id]/scene · …/[id]/pdf
                 │       GET /api/parcels/locate · /api/parcels/[id] · /api/places/search · /api/tiles/parcels/{z}/{x}/{y}
                 └─ web/src/server
                     ├─ sources/   działka, pogoda, gleba, teren, hydrologia, rzeki, wody gruntowe, satelita
                     ├─ analysis/  bilans wodny, poziom suszy, przyczyny, rekomendacje (silnik regułowy)
                     └─ db/        Drizzle ORM ──► PostgreSQL + PostGIS
```

- **Jedna aplikacja** (frontend i backend w Next.js), jedno wdrożenie (Docker, `output: "standalone"`).
- **Przebieg analizy**: działka z bazy → równolegle pogoda (bazowa), gleba, teren, hydrologia, rzeki, wody gruntowe → silnik → wynik. Zdjęcie Sentinel-2 liczy się w tle i dociąga się do wyniku, gdy jest gotowe; analiza na nie nie czeka.
- **Cache** (`rosa_cache`): gotowe analizy (3 h dla ostatnich dni, 30 dni dla dat historycznych), odpowiedzi źródeł zewnętrznych i NDVI. Klucz zawiera wersję silnika, więc zmiana algorytmu unieważnia stare wyniki.
- **Odporność**: każde źródło ma własny limit czasu; awaria źródła obniża pewność wyniku i trafia do „Czego nie wiemy”, ale nie przerywa analizy. Jedynym źródłem krytycznym jest pogoda.
- **Silnik jest deterministyczny i regułowy**: ten sam wejściowy zestaw danych zawsze daje ten sam wynik, a każda liczba w raporcie ma źródło.

Szczegóły: `docs/architektura.md`, `docs/concept.md`.

---

## 4. Źródła i zakresy danych

| Dane | Źródło | Zakres | Do czego |
|---|---|---|---|
| Granice i powierzchnia działek, obręb, gmina | GUGiK, EGiB: eksport `0_dzialki.parquet` (opendata.geoportal.gov.pl) | cała Polska, 38 909 091 działek, EPSG:2180 | identyfikacja działki, geometria do pozostałych analiz |
| Dobowe opady, Tmax, Tmin | IMGW-PIB, dane publiczne: archiwum dobowe synop, klimat, opad | 2006-01-01 – 2026-10-31; 533 stacje ze współrzędnymi (207 z temperaturą); 2,3 mln pomiarów | bilans wodny, historia 10 lat, upał, dawka nawadniania |
| Współrzędne stacji | IMGW-PIB, wykaz stacji telemetrycznych (`kody_stacji.csv`) | 800 stacji | interpolacja pogody dla działki |
| Ostatnie dni pogody | Open-Meteo (API prognozowe, `past_days`) | dni po ostatnim dniu w archiwum IMGW | analiza „na dziś” |
| Kategoria podatności gleby na suszę | IUNG-PIB, SMSR: warstwa `Susza:katgl_landuse2024` (WMS) | cała Polska | przyczyna „gleba”, korekta poziomu suszy, wykrycie terenów nierolniczych |
| Wysokości terenu | GUGiK, NMT (usługa `GetHByPointList`) | 48 punktów w obrębie działki; siatka 33×33 punkty wokół działki dla modelu 3D | spadek, kierunek spływu, różnica wysokości, teren sceny 3D |
| Ortofotomapa | GUGiK, WMS ORTO StandardResolution | cała Polska | podkład mapy wyboru działki, obrys działki w animacji przelotu |
| Numery działek na mapie | GUGiK, KIEG (WMS Krajowej Integracji Ewidencji Gruntów) | cała Polska | etykiety numerów przy dużym przybliżeniu mapy |
| Podkład mapy | OpenStreetMap (kafelki tile.openstreetmap.org) | świat | mapa przy małym przybliżeniu |
| Adresy i ulice | GUGiK, Usługa Geokodowania (UUG, `services.gugik.gov.pl/uug`), dane PRG | cała Polska | wyszukiwanie adresu z numerem i ulicy |
| Nazwy obrębów i gmin | wyliczone z tabeli działek EGiB (tabela `rosa_place`) | 54 144 obręby, 3 221 jednostek gminnych | wyszukiwarka nazw z podpowiedziami |
| Rowy melioracyjne, cieki, kanały, wody powierzchniowe | GUGiK, BDOT10k (paczki GPKG na powiat, warstwy `OT_SWRM_L`, `OT_SWRS_L`, `OT_SWKN_L`, `OT_PTWP_A`) | cała Polska, 380 powiatów: 1,64 mln rowów, 506 tys. cieków, 8,9 tys. kanałów, 606 tys. wód powierzchniowych (1,1 GB) | zastawka na rowie, sąsiedztwo wody |
| Stany wody na rzekach (dobowe) | IMGW-PIB, dane publiczne: archiwum hydrologiczne dobowe (`dane_hydrologiczne/dobowe`, pliki `codz_*`) | lata hydrologiczne 2006–2025 (01.11.2005 – 31.10.2025); 889 wodowskazów; 5,6 mln pomiarów (506 MB) | przyczyna „niski stan rzeki”: percentyl stanu wody na najbliższym wodowskazie (do 25 km) względem ±15 dni tej samej pory roku z 10 poprzednich lat |
| Wykaz wodowskazów i bieżący stan wody | IMGW-PIB, API `danepubliczne.imgw.pl/api/data/hydro` | 913 stacji (współrzędne, stany ostrzegawcze i alarmowe); stan bieżący | współrzędne wodowskazów; stan rzeki dla analizy „na dziś” i „na wczoraj” |
| Głębokość zwierciadła wód gruntowych | PIG-PIB (Państwowa Służba Hydrogeologiczna), monitoring wód podziemnych: ArcGIS REST `hydrogeologia/mwp` (cbdgmapa.pgi.gov.pl) | punkty monitoringu w promieniu 20 km, ostatni pomiar w punkcie | przyczyna „wody gruntowe głęboko”, uzasadnienie zatrzymania wody przy płytkiej wodzie gruntowej, „Czego nie wiemy” |
| Kondycja roślin (NDVI) | Copernicus Sentinel-2 L2A: COG z rejestru AWS Open Data (katalog STAC Earth Search, Element 84) oraz archiwum Microsoft Planetary Computer (zdjęcia od 2016) | najnowsza scena z 30 dni przed dniem analizy (dla dat starszych niż 30 dni: z 60 dni), zachmurzenie < 60%, min. 50% bezchmurnych pikseli w granicy działki | kondycja roślin względem typowej dla uprawy i miesiąca; przyczyna „rośliny reagują na brak wody”, korekta pewności |
| Współczynniki upraw Kc, okresy krytyczne | FAO-56 (Allen i in.), uproszczone dla Polski | 6 upraw | nawadnianie, przyczyna „okres krytyczny” |
| Typowe NDVI upraw w miesiącach | profile własne na podstawie typowych krzywych NDVI dla upraw w Europie Środkowej (fenologia: siew, pełnia wegetacji, dojrzewanie, zbiór) | 6 upraw × 12 miesięcy | interpretacja NDVI zależna od uprawy (`web/src/server/analysis/crop-profiles.ts`) |

---

## 5. Dane pobierane wcześniej i na żywo

### Pobrane wcześniej do bazy (PostGIS)
| Dane | Data pobrania | Stan danych | Skrypt |
|---|---|---|---|
| Działki EGiB (GUGiK) | 21.11.2026 | eksport z 21.11.2026, 03:03 | `scripts/import_parcels.sh` |
| Dane dobowe IMGW-PIB + współrzędne stacji | 21.11.2026 | 2006-01-01 – 2026-10-31 | `scripts/import_imgw.py` |
| Dane hydrologiczne dobowe IMGW-PIB (stany rzek) + wodowskazy z API | 21.11.2026 | 01.11.2005 – 31.10.2025 (lata hydrologiczne 2006–2025) | `scripts/import_imgw_hydro.py` (`rosa-update.sh hydro-rivers`) |
| BDOT10k: rowy, cieki, kanały, wody | 21.11.2026 | wersje obiektów wg powiatów (np. 31.12.2023 dla pow. śremskiego) | `scripts/import_bdot.py` |
| Indeks nazw obrębów i gmin (`rosa_place`) | 21.11.2026 | z tabeli działek EGiB | `scripts/server/rosa-update.sh places` (też automatycznie po każdej aktualizacji działek) |

Aktualizacja w tle: `scripts/server/rosa-update.sh` uruchamiany z crona na serwerze (`scripts/server/crontab.txt`). Każdy import ładuje dane do tabeli `*_next` i podmienia ją z bieżącą w jednej transakcji, więc aplikacja nie widzi pustych tabel w trakcie aktualizacji.

| Zadanie | Harmonogram |
|---|---|
| Czyszczenie przeterminowanego cache | codziennie 03:30 |
| IMGW (pełne przeładowanie 2006–dziś) | 6. dnia miesiąca 02:00 |
| IMGW hydrologia: stany rzek (pełne przeładowanie 2006–ostatni rok hydrologiczny) | 7. dnia miesiąca 02:30 |
| Działki EGiB | 15. dnia miesiąca 01:00 |
| BDOT10k (wody) | 1 stycznia, kwietnia, lipca, października 04:00 |

Instalacja na serwerze: skopiuj `scripts/` do `~/rosa/scripts`, utwórz `~/rosa-data/rosa.env` z `DB_CONTAINER=<nazwa kontenera PostGIS>` i wykonaj `crontab ~/rosa/scripts/server/crontab.txt`. Logi trafiają do `~/rosa-data/logs`.

### Pobierane na żywo (przy pierwszej analizie danej działki, potem z cache)
| Dane | Kiedy | Cache |
|---|---|---|
| Kategoria gleby IUNG (WMS GetFeatureInfo) | pierwsza analiza w danym miejscu | bez wygasania |
| Wysokości NMT (GUGiK) | pierwsza analiza działki | bez wygasania |
| Ostatnie dni pogody (Open-Meteo) | gdy dzień analizy jest nowszy niż archiwum IMGW | 3 h |
| Stan rzeki i jego percentyl (z bazy, a bieżący stan wodowskazu z API IMGW) | każda analiza; API tylko gdy dzień analizy to dziś lub wczoraj i jest nowszy niż archiwum | 3 h dla ostatnich dni, 30 dni dla dat historycznych |
| Punkty monitoringu wód podziemnych PIG-PIB (ArcGIS REST) | pierwsza analiza w danym miejscu (siatka 0,02°) | 30 dni |
| Sentinel-2 NDVI (Earth Search i Planetary Computer, COG) | w tle po każdej nowej analizie | 7 dni |
| Model 3D: siatka NMT, sąsiednie działki, wody w otoczeniu | pierwsze otwarcie sceny działki | bez wygasania (wersjonowany klucz) |
| Adresy i ulice (GUGiK UUG) | przy wpisywaniu w wyszukiwarkę | 24 h (cache HTTP) |
| Kafelki granic działek | generowane z naszej bazy przy przeglądaniu mapy | 24 h w przeglądarce |
| Ortofotomapa, numery działek KIEG, kafelki OSM | pobierane bezpośrednio przez przeglądarkę | cache przeglądarki |

Każdy wynik pokazuje datę pobrania danych przy źródle (sekcje wyniku i raport PDF).

---

## 6. Biblioteki, usługi i narzędzia AI

### Biblioteki i komponenty
| Komponent | Wersja | Licencja | Do czego |
|---|---|---|---|
| Next.js | 16.4.6 | MIT | aplikacja i API |
| React / React DOM | 19.3.0 | MIT | interfejs |
| TypeScript | 5.9 | Apache-2.0 | język |
| Tailwind CSS | 4.3 | MIT | style |
| shadcn/ui + Base UI (`@base-ui/react`), `cn` | 4.23 / 1.9 / 0.5 | MIT | komponenty interfejsu |
| lucide-react | 1.77 | ISC | ikony |
| motion | 14.14 | MIT | animacje |
| react-day-picker, date-fns | 10.0 / 4.4 | MIT | kalendarz |
| sonner | 2.0 | MIT | powiadomienia |
| Drizzle ORM, drizzle-kit | 0.45 / 0.31 | Apache-2.0 | dostęp do bazy, migracje |
| postgres (postgres.js) | 4.1 | Unlicense | sterownik PostgreSQL |
| geotiff (geotiff.js) | 3.0.5 | MIT | odczyt wycinków zdjęć Sentinel-2 (COG) |
| three.js | 0.187 | MIT | grafika 3D |
| @react-three/fiber, @react-three/drei | 9.8 / 10.7 | MIT | scena 3D w React |
| MapLibre GL JS | 6.19 | BSD-3-Clause | mapa wyboru działki |
| Playwright (z systemowym Chrome) | – | Apache-2.0 | testy wizualne animacji i sceny 3D na GPU (narzędzie deweloperskie, poza aplikacją) |
| @react-pdf/renderer | 4.9.0 | MIT | generowanie raportu PDF po stronie serwera (`/api/analyses/<id>/pdf`) |
| Figtree, Bricolage Grotesque (`next/font`, pliki TTF w `web/public/fonts/pdf`) | – | SIL OFL 1.1 | kroje pisma (hostowane lokalnie, osadzane w PDF) |
| PostgreSQL + PostGIS | 18.7 / 3.7 | PostgreSQL License / GPL-2.0 | baza danych przestrzennych (serwer, nie dystrybuowana z kodem) |
| GDAL/OGR (`ogr2ogr`, obraz `osgeo/gdal`) | 3.x | MIT | import Parquet i GPKG |
| Python 3.12 + psycopg | 3.12 / 3.x | PSF / LGPL-3.0 | skrypty importu IMGW: meteo i hydrologia (narzędzie, poza aplikacją) |

### Usługi zewnętrzne
GUGiK (opendata.geoportal.gov.pl, services.gugik.gov.pl), IMGW-PIB (danepubliczne.imgw.pl, archiwum i API hydrologiczne), PIG-PIB (cbdgmapa.pgi.gov.pl, ArcGIS REST), IUNG-PIB (sgeo.iung.pl), Open-Meteo (api.open-meteo.com), Earth Search STAC (earth-search.aws.element84.com) i AWS Open Data (sentinel-cogs), Microsoft Planetary Computer (STAC i anonimowy token SAS), OpenStreetMap (kafelki mapy), GUGiK UUG (geokodowanie), GUGiK ORTO i KIEG (WMS). Żadna nie wymaga klucza ani płatności.

### Narzędzia AI i jak ich użyto
- **W działaniu aplikacji nie ma AI ani modeli językowych.** Ocena suszy i rekomendacje to deterministyczny silnik regułowy (`web/src/server/analysis`), oparty na bilansie wodnym, FAO-56 i danych IUNG, GUGiK, IMGW. Każdy wniosek ma przypięte liczby i źródło.
- **Przy tworzeniu rozwiązania** zespół korzystał z asystenta AI Claude (Anthropic):
  - Claude Code: generowanie i refaktoryzacja kodu (frontend, API, silnik, skrypty importu), przegląd wymagań i regulaminu, testy wydajności źródeł danych;
  - Claude Design: makiety ekranów i diorama, przeniesione potem do kodu.
  Kod i reguły były przeglądane, uruchamiane i weryfikowane przez zespół (sekcja 9); decyzje merytoryczne (progi, kolejność rekomendacji) podejmował zespół.

---

## 7. Licencje i warunki korzystania

**Kod źródłowy**: własność zespołu; w razie wygranej przekazywany KOWR zgodnie z regulaminem zadania. Wszystkie użyte komponenty mają licencje pozwalające na dalsze korzystanie z rozwiązania (MIT, Apache-2.0, ISC, Unlicense, OFL); komponenty GPL/LGPL (PostGIS, psycopg) są tylko narzędziami po stronie serwera i importu, nie są częścią dystrybuowanego kodu aplikacji.

**Dane**:
- **GUGiK (EGiB, NMT, BDOT10k)**: dane udostępniane bezpłatnie do dowolnego wykorzystania (art. 40a ustawy Prawo geodezyjne i kartograficzne, od 31.07.2020).
- **IMGW-PIB** (Regulamin Udostępniania Danych, https://danepubliczne.imgw.pl): dane bezpłatne do celów prywatnych, a dane o wysokiej wartości (rozporządzenie wykonawcze KE 2023/138, m.in. pomiary ze stacji meteorologicznych) w każdym celu. Wykorzystanie w działalności gospodarczej lub do „osłony hydrologiczno-meteorologicznej rolnictwa” poza danymi o wysokiej wartości wymaga umowy z IMGW-PIB (§ 3, § 5). Warunek: przy każdym produkcie formułki „Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy” oraz „Dane Instytutu Meteorologii i Gospodarki Wodnej – Państwowego Instytutu Badawczego zostały przetworzone”. Obie pokazujemy w wyniku i w raporcie, także przy danych hydrologicznych (stany rzek z archiwum i API), które pokazujemy jako osobne źródło „IMGW-PIB (dane hydrologiczne)”. **Do potwierdzenia z IMGW**, czy dobowe archiwum stacji zalicza się do danych o wysokiej wartości (zapytanie: `docs/zapytania-licencyjne.md`).
- **IUNG-PIB**: warstwa kategorii glebowych SMSR jest udostępniana publicznie w usłudze WMS bez opłat i ograniczeń dostępu (GetCapabilities: `Fees: NONE`, `AccessConstraints: NONE`); SMSR prowadzony jest przez IUNG-PIB na zlecenie MRiRW, a progi KBW pochodzą z Rozporządzenia MRiRW z 11.04.2019. Jako informacja sektora publicznego podlega ponownemu wykorzystaniu (ustawa z 11.08.2021 o otwartych danych); podajemy źródło przy każdym wyniku. Formalnej licencji IUNG nie publikuje; **zapytanie o warunki i ewentualne udostępnienie rastra**: `docs/zapytania-licencyjne.md`.
- **PIG-PIB (monitoring wód podziemnych)**: dane publiczne PIG-PIB, który pełni funkcję Państwowej Służby Hydrogeologicznej, udostępniane w publicznej usłudze ArcGIS REST (cbdgmapa.pgi.gov.pl) bez logowania i opłat. Strona z zasadami udostępniania danych PIG-PIB nie była dostępna dla zapytań automatycznych, więc **warunki do potwierdzenia**; przy wyniku podajemy źródło („dane PIG-PIB (Państwowa Służba Hydrogeologiczna), udostępniane publicznie”).
- **Copernicus Sentinel-2**: wolny, pełny i otwarty dostęp (polityka danych Copernicus); oznaczenie „zawiera zmodyfikowane dane Copernicus Sentinel” (przy wyniku podajemy też, czy scena pochodzi z Earth Search, czy z archiwum Planetary Computer). Planetary Computer udostępnia dane na warunkach ich licencji źródłowej (Copernicus) i własnych Warunkach korzystania Microsoft.
- **OpenStreetMap**: dane © współtwórcy OpenStreetMap, licencja ODbL; oznaczenie widoczne na mapie. Publiczne kafelki tile.openstreetmap.org mają politykę dozwolonego użycia; przy wdrożeniu produkcyjnym u KOWR należy użyć własnego serwera kafelków lub komercyjnego dostawcy.
- **GUGiK ortofotomapa, KIEG, usługa geokodowania (PRG)**: jak wyżej, dane GUGiK udostępniane bezpłatnie; oznaczenia źródła widoczne na mapie.
- **Open-Meteo**: dane na licencji CC BY 4.0; darmowe API wyłącznie do użytku niekomercyjnego. W ROSA służy tylko do kilku ostatnich dni pogody; do wdrożenia u KOWR: plan komercyjny Open-Meteo, własna instancja Open-Meteo albo dane IMGW z mniejszym opóźnieniem.
- **FAO-56**: publikacja naukowa, cytowana jako źródło metody.

---

## 8. Znane ograniczenia

- **Pogoda ze stacji, nie z pola**: wartości to interpolacja (odwrotność kwadratu odległości) z 5 najbliższych stacji opadowych i 4 temperaturowych w promieniu 80 km. Współrzędne mamy dla ok. 40% stacji opadowych IMGW (lista telemetryczna), więc najbliższa stacja jest zwykle 6–30 km od działki.
- **Parowanie metodą Hargreavesa** (FAO-56, tylko z temperatury), skalibrowane współczynnikiem 0,95 do wykazów suszy IUNG (metoda Penmana); przy wartościach bilansu bliskich progowi nasza ocena może różnić się od IUNG (F1 0,65).
- **Archiwum IMGW ma opóźnienie** około 1–2 miesięcy; ostatnie dni uzupełniamy z Open-Meteo (inny model, inna metoda parowania).
- **NDVI**: liczymy tylko z pikseli 10 m, których środek leży w granicach działki (maska z geometrii EGiB) i które maska SCL oznacza jako bezchmurne; przy bardzo wąskich działkach (< 20 m) pikseli jest mało. Zdjęcie jest z 30 dni przed datą analizy (dla starszych dat z 60 dni) i może go nie być przy dużym zachmurzeniu. Dla dat sprzed 2017 r. zdjęć Sentinel-2 L2A jest mało (archiwum Planetary Computer od 2016). Pobieranie zdjęć z amerykańskiego S3 bywa bardzo wolne z niektórych sieci; na serwerze produkcyjnym trwa kilka sekund, a wynik dociąga się w tle.
- **Model 3D jest poglądowy w części elementów**: teren, granice, sąsiednie działki i wody są z danych, ale rzeźba jest przewyższona (krotność pokazujemy przy źródłach), a farma, drzewa, postacie, maszyny i kolory pól sąsiadów są ilustracją.
- **Wyszukiwanie adresów** zależy od zapisu w rejestrze GUGiK (np. nazwa ulicy bez „ul.”); nie każdy wariant nazwy zostanie znaleziony.
- **Brak danych o rzeczywistym stanie urządzeń melioracyjnych** (BDOT10k pokazuje przebieg rowów, nie ich drożność).
- **Stan rzeki z najbliższego wodowskazu IMGW** (do 25 km): wodowskaz może leżeć na innej rzece lub w innej zlewni niż działka, a duża rzeka niesie wodę z daleka. Percentyl liczymy z pomiarów tego samego wodowskazu (±15 dni wokół tej samej daty w 10 poprzednich latach); zmiana zera wodowskazu w tym czasie może go zniekształcić. Archiwum dobowe kończy się 31.10.2025 (rok hydrologiczny 2025, publikowany z opóźnieniem); dla dziś i wczoraj bierzemy bieżący stan z API IMGW, a dla dat pomiędzy stanu rzek nie oceniamy.
- **Wody gruntowe z najbliższego punktu monitoringu PIG-PIB** (do 20 km) i z ostatniego pomiaru w tym punkcie, a nie spod działki ani z dnia analizy; poziom wody gruntowej mocno zależy od rzeźby terenu i budowy gleby. Punkty ze zwierciadłem napiętym (pod warstwą nieprzepuszczalną) pokazujemy, ale nie wyciągamy z nich wniosków.
- **Rekomendacje są ogólne**: nie zastępują doradcy rolniczego ani pozwoleń wodnoprawnych (zastawki, pobór wody), o czym przypominamy przy rekomendacjach.
- **Limity zewnętrznych API dotyczą głównie aktualizacji danych w tle, a nie pracy użytkownika**: analizy czytają działki, pogodę i hydrologię z naszej bazy, a źródła zewnętrzne odświeżamy okresowo (np. raz na dobę lub miesiąc). Przy pierwszej analizie nowej działki pytamy na żywo tylko kilka lekkich usług (IUNG, NMT, PIG-PIB, ostatnie dni z Open-Meteo, bieżący stan wodowskazu IMGW, Sentinel-2) i zapisujemy wynik w cache. Ich limity: darmowe Open-Meteo do 10 000 wywołań dziennie na adres IP (10 lat danych dziennych to ok. 260 wywołań, dlatego historia jest z IMGW, a nie z Open-Meteo); Earth Search i AWS bez limitu, ale z opóźnieniem z Europy (~4 s), więc NDVI dociąga się w tle; usługi GUGiK, IUNG, PIG-PIB i API IMGW bez publikowanych limitów.
- **Prototyp**: działka nierolnicza (las, woda, zabudowa wg IUNG) dostaje ostrzeżenie zamiast rekomendacji upraw; ewidencyjne klasy użytków (`klasouzytki_egib`) są w eksporcie GUGiK najczęściej puste.

---

## 9. Weryfikacja wyników i rekomendacji

- **Testy na działkach z różnych regionów** (Wielkopolska, Małopolska, Dolny Śląsk, Podlasie, Lubuskie) i różnych dat, w tym znanych okresów suszy. Przykład: czerwiec 2019 w gm. Dolsk daje „Susza ekstremalna” z upałem +3,3 °C, co zgadza się z rekordowo gorącym i suchym czerwcem 2019; lipiec 2025 w okolicy Śremu daje „W normie”.
- **Spójność danych wejściowych**: wysokości NMT porównane z ukształtowaniem terenu (kolejność osi sprawdzona na znanym punkcie: 103,6 m n.p.m. w Mórce), kategoria IUNG porównana z ewidencją (działka testowa w Mórce: IUNG „lasy” = EGiB „Ls”), NDVI w zakresie typowym dla upraw w maju–czerwcu.
- **Rzeki i wody gruntowe** (działka 302602_5.0008.399, gm. Dolsk): 20.06.2019 wodowskaz Śrem na Warcie (16,6 km) pokazuje 161 cm, 2. percentyl dla tej pory roku z 10 lat, co zgadza się z niżówką 2019 r.; 10.08.2022 ten sam wodowskaz: 183 cm, 48. percentyl. Dla analizy „na dziś” (21.11.2026, działka 300902_2.0026.AR_1.4/2) stan bieżący z API IMGW: Noteć w Łysku 150 cm, 68. percentyl. Najbliższy punkt PIG-PIB ze zwierciadłem swobodnym dla Dolska: Studzianna (4,2 km), 0,91 m p.p.t. (pomiar 28.09.2026).
- **Przejrzystość**: każda przyczyna i rekomendacja pokazuje liczby, z których wynika, i źródło; sekcja „Czego nie wiemy” wymienia ograniczenia konkretnej analizy. Pozwala to rolnikowi i ekspertowi sprawdzić rozumowanie krok po kroku.
- **Animacja i scena 3D**: sprawdzone w przeglądarce z GPU (Playwright + Chrome) klatka po klatce, także przy sztucznie spowolnionych danych (animacja czeka na etapach), przy awarii źródła sceny (przejście na wersję SVG) i na telefonie (390×844).
- **Wyszukiwarka**: sprawdzona na nazwach z polskimi znakami i bez, adresach z numerem, „obręb + numer działki” i pełnych identyfikatorach; czas odpowiedzi 0,1–0,5 s.
- **Wydajność i niezawodność**: logi czasu każdego źródła (`[rosa] source …`); nowa analiza 0,7–2,5 s przy bazie zdalnej, z cache ~0,15 s; awaria źródła nie przerywa analizy (sprawdzone na przypadkach braku zdjęcia i limitu Open-Meteo).
- **Zgodność z SMSR IUNG-PIB**: w sezonie (21.III–30.IX) poziom suszy liczymy metodą z Rozporządzenia MRiRW z 11.04.2019 (KBW z 60 dni vs. progi IUNG dla uprawy i kategorii gleby). Porównanie z oficjalnymi wykazami IUNG dla 39 losowych gmin z lat 2020–2025 (53 346 porównań): trafność 97,4%, precyzja 0,72, czułość 0,60, F1 0,65 przy współczynniku parowania k = 0,95. Szczegóły i skrypt: `docs/walidacja-iung.md`, `web/scripts/validate-iung.mjs`.
- **NDVI względem uprawy**: progi pochodzą z typowych profili, nie z pomiarów na tej działce; kolejny krok to porównanie z NDVI tej samej działki z lat 2017+ (archiwum Sentinel-2) i kalibracja profili na danych IUNG lub ARiMR.
- **Do zrobienia przed wdrożeniem**: przegląd reguł rekomendacji z ekspertami KOWR (agrotechnika, retencja); ET0 metodą Penmana-Monteitha ze stacji synoptycznych zamiast Hargreavesa.

---

## 10. Skalowalność i koszty

- **Architektura pod wielu użytkowników**: aplikacja jest bezstanowa (Next.js w kontenerze Docker), więc można uruchomić wiele instancji za load balancerem. Stan i wyniki są w PostgreSQL (tabela `rosa_cache`). Ciężkie dane (38,9 mln działek, 2,8 mln obiektów wodnych, 2,3 mln pomiarów meteorologicznych i 5,6 mln dobowych stanów rzek IMGW) są w bazie z indeksami przestrzennymi, a nie pobierane z zewnętrznych usług przy każdym zapytaniu.
- **Zmierzone czasy** (serwer produkcyjny, baza na tym samym serwerze):
  - nowa analiza: 0,7–2,5 s; ponownie ta sama: ok. 0,15 s (cache);
  - zdjęcie satelitarne w tle: kilka sekund;
  - kafelek granic działek: 60–200 ms;
  - wyszukiwarka: 0,1–0,5 s;
  - raport PDF: 0,5–1,7 s.
- **Co rośnie z ruchem**: pierwsze otwarcie nowej działki pyta GUGiK (NMT, około 10 zapytań), IUNG i Sentinel-2. Wyniki trafiają do cache, więc kolejne analizy tej samej działki i okolicy są tanie. Pogoda, stany rzek, działki i wody są w bazie i odświeżane w tle (sekcja 5), więc liczba użytkowników nie zwiększa liczby zapytań do IMGW ani GUGiK.
- **Infrastruktura i koszt (szacunek)**:
  - obecnie: 1 serwer VPS (4 vCPU, 8 GB RAM, 75 GB SSD; baza ok. 20 GB z indeksami; zwykle kilkadziesiąt zł miesięcznie); wystarcza na tysiące analiz dziennie;
  - dla dziesiątek tysięcy rolników: 2–3 instancje aplikacji, baza 8 vCPU / 32 GB RAM z repliką do odczytu, CDN przed kafelkami i plikami statycznymi; rząd kilkuset zł miesięcznie;
  - usługi płatne przy wdrożeniu komercyjnym: Open-Meteo (plan komercyjny, tylko ostatnie dni pogody) albo zastąpienie go danymi IMGW; własny serwer kafelków mapy zamiast publicznych kafelków OpenStreetMap. Dane GUGiK, IMGW, IUNG i Copernicus są bezpłatne.
- **Wąskie gardła i plan**: pobieranie zdjęć Sentinel-2 (transfer z AWS/Azure; alternatywa: Sentinel Hub w Copernicus Data Space, który zwraca gotowe NDVI dla poligonu); pierwsze wywołania NMT dla nowych działek (można wstępnie policzyć siatki dla działek rolnych); limit zapytań na użytkownika (do dodania w proxy).

---

## 11. Bezpieczeństwo

- **Brak kont i danych osobowych**: aplikacja nie wymaga logowania i nie zbiera danych osobowych. Numer działki i jej granice to publiczne dane ewidencyjne. Nie używamy plików cookie śledzących; zapamiętujemy tylko ustawienia interfejsu (tryb lekki, dźwięk) w przeglądarce.
- **Walidacja danych wejściowych** na serwerze:
  - numer działki (format TERYT), uprawa z zamkniętej listy, data w zakresie ostatnich 10 lat;
  - współrzędne w granicach Polski, współrzędne kafelków w dozwolonym zakresie;
  - zapytanie wyszukiwarki skrócone do 80 znaków.
- **Baza danych**: wszystkie zapytania są parametryzowane (Drizzle ORM, szablony `sql`), bez sklejania tekstu SQL z danymi użytkownika. Aplikacja łączy się z bazą przez wewnętrzną sieć Dockera. Publiczny port bazy, używany w czasie budowy rozwiązania, należy wyłączyć przy wdrożeniu u KOWR.
- **Źródła zewnętrzne**:
  - stałe adresy usług; użytkownik przekazuje tylko zakodowane parametry, nie adresy URL (brak SSRF);
  - każde wywołanie ma limit czasu, a awaria źródła nie przerywa analizy;
  - komunikaty błędów dla użytkownika nie ujawniają szczegółów technicznych.
- **Sekrety**: hasło do bazy i tokeny tylko w zmiennych środowiskowych (Coolify, `.env.local` poza repozytorium); w repozytorium jest wyłącznie `.env.example` z pustym szablonem.
- **Transport**: HTTPS z certyfikatem Let's Encrypt (Traefik w Coolify).
- **Do dodania przed wdrożeniem**: limit liczby zapytań na adres IP (rate limiting w proxy), nagłówki bezpieczeństwa (Content-Security-Policy) i regularny audyt zależności (`pnpm audit`).
