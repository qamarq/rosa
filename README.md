# ROSA: Retencja · Opady · Susza · Analiza

**Aplikacja (zalecana do oceny):** https://rosa.kamilmarczak.pl

[![Film prezentujący ROSA](https://img.youtube.com/vi/J658jmTHVJM/maxresdefault.jpg)](https://youtu.be/J658jmTHVJM)

**Pitch deck:** [docs/pitch/ROSA-pitch.pdf](docs/pitch/ROSA-pitch.pdf)

Narzędzie webowe dla rolnika: wpisujesz numer działki ewidencyjnej, wybierasz uprawę i dzień analizy, a ROSA w kilka sekund ocenia sytuację wodną działki na tle ostatnich 10 lat, wyjaśnia przyczyny niedoboru wody i podpowiada, jak zatrzymać wodę na polu (retencja → agrotechnika → ewentualnie nawadnianie). Wynik można pobrać lub wydrukować jako raport PDF (A4).

Wersja działająca ma pełne dane dla całej Polski. Uruchomienie lokalne bez bazy danych daje tylko tryb demonstracyjny (sekcja 1).

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
| `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` | Klucze aplikacji z Inngest Cloud (harmonogram pobierania bieżących pomiarów IMGW). Klucz podpisu weryfikuje każde wywołanie `/api/inngest`. Na produkcji ustawiane w Coolify skryptem `scripts/server/coolify-inngest-env.sh` z `~/rosa-data/rosa.env`. |
| `INNGEST_DEV=1` | Tylko lokalnie: łączy aplikację z Inngest Dev Server (`npx inngest-cli dev -u http://localhost:3000/api/inngest`) zamiast z chmurą. |

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

1. **Wybór działki**: numer działki ewidencyjnej (walidacja formatu na bieżąco) albo wskazanie na mapie, uprawa (6 najczęstszych na wierzchu: pszenica, kukurydza, rzepak, ziemniaki, buraki, łąka; pod „Inna uprawa” z wyszukiwarką kolejne 14: pszenica jara, jęczmień ozimy i jary, żyto, pszenżyto, owies, kukurydza na kiszonkę, chmiel, tytoń, strączkowe, warzywa gruntowe, truskawki, krzewy owocowe, sad) i dzień analizy: dziś lub dowolny dzień z ostatnich 10 lat.
   - **Mapa** (ortofotomapa GUGiK, granice działek z naszej bazy jako kafelki wektorowe, numery działek z KIEG): kliknięcie w pole zaznacza działkę.
   - **Pole z kilku działek**: po znalezieniu działki „Dodaj sąsiednią działkę” pozwala doklikać sąsiednie działki (kliknięcie zaznaczonej ją odznacza, każdą można usunąć z listy; widać liczbę działek i łączną powierzchnię). W polu numeru można też wpisać kilka numerów oddzielonych przecinkiem, spacją lub plusem. Najwyżej 10 działek z jednego województwa, każda najwyżej 30 m od pozostałych. Domyślna i najprostsza ścieżka to nadal jedna działka („Wybierz tę działkę”).
   - **Wyszukiwarka na mapie**: wieś lub obręb i gmina (podpowiedzi od 2 liter, bez polskich znaków), adres z numerem („Poznań, Głogowska 10”, „Małachowo 12”), ulica, „obręb + numer działki” („Małachowo 399”) albo pełny identyfikator działki.
2. **Przelot do działki (~5 s, jedno ujęcie 3D)**: kamera leci nad Polską do pinezki, obrys działki rysuje się na ortofotomapie, teren unosi się w 3D, źródła danych „przylatują”, a na końcu panel wyniku wjeżdża z prawej bez przeładowania strony. Animacja ładuje dane w trakcie: jeśli dany etap nie jest gotowy, ujęcie płynnie czeka (kamera krąży, scena żyje), bez widocznych wskaźników ładowania. Opcjonalne dźwięki (Web Audio, generowane w kodzie) z przyciskiem wyciszenia. Bez WebGL, w trybie lekkim lub przy ograniczonym ruchu: wersja SVG.
3. **Model 3D działki**: budowany na żywo z danych tej działki: teren z NMT GUGiK (siatka 33×33 punkty, rzeźba przewyższona ×1,5–12 z informacją o krotności), granica działki i sąsiednie działki z EGiB, rowy, cieki i zbiorniki z BDOT10k, kierunek spływu, uprawa wybrana przez użytkownika w kolorze wynikającym z NDVI lub poziomu suszy, pogoda z wyniku analizy. Farma, drzewa, postacie i maszyny są poglądowe. Obrót przeciąganiem, przybliżanie gestem (pinch, kółko, touchpad) i przyciskami.
4. **Kondycja roślin z satelity, z uwzględnieniem uprawy**: NDVI z Sentinel-2 porównujemy z typowym NDVI wybranej uprawy w danym miesiącu (profile dla 20 upraw). Gdy rośliny są wyraźnie słabsze niż typowo (poniżej 80% normy), a bilans wodny pokazuje suszę, pojawia się przyczyna „Rośliny już reagują na brak wody” i rośnie pewność wyniku. Gdy satelita i bilans wodny się nie zgadzają albo uprawa w tym okresie nie pokrywa pola (np. ściernisko po żniwach), informujemy o tym w „Czego nie wiemy” zamiast wyciągać wnioski. Poziom suszy liczymy metodą IUNG z bilansu wodnego, a NDVI jej nie zastępuje.
5. **Wskaźnik kompletności danych** na scenie: „Dane: komplet ✓”, „6/7 · dociągam zdjęcie satelitarne” albo „6/7 · brak: …”, z listą źródeł i ich stanem po kliknięciu.
6. **Stan wody teraz** (dla dat z przeszłości: „Stan wody <data>”): poziom suszy w skali 1–5 (Mokro, W normie, Susza umiarkowana / silna / ekstremalna). W sezonie (21.III–30.IX) liczony metodą IUNG z rozporządzenia MRiRW: klimatyczny bilans wodny z 60 dni porównany z progiem dla uprawy i kategorii gleby (im dalej poniżej progu, tym wyższy poziom). Progi mamy dla wszystkich 14 grup upraw z rozporządzenia (zboża ozime i jare, kukurydza na ziarno i na kiszonkę, rzepak i rzepik, ziemniak, burak cukrowy, chmiel, tytoń, warzywa gruntowe, krzewy owocowe, drzewa owocowe, truskawki, rośliny strączkowe). Poza sezonem albo gdy IUNG nie wyznacza progu: bilans wodny porównany z tym samym okresem w 10 poprzednich latach.
7. **Na tle 10 lat**: wykres odchyleń bilansu wodnego rok po roku, liczba lat z deficytem i najbardziej narażone miesiące.
8. **Dlaczego brakuje wody**: przyczyny wyliczone z danych: mniej deszczu niż zwykle, upał, niski stan rzeki (najbliższy wodowskaz IMGW w 15% najniższych stanów dla tej pory roku z 10 lat), lekka gleba, głęboko położone wody gruntowe (PIG-PIB, ≥ 5 m przy suszy), spływ wody po spadku terenu, okres krytyczny uprawy, słabsza niż typowo roślinność na zdjęciu satelitarnym.
9. **Co zrobić**: rekomendacje w kolejności wymaganej przez KOWR:
   - zatrzymanie wody: zastawka na rowie przy działce (gdy BDOT10k pokazuje rów do 30 m od działki), zatrzymanie spływu w dolnej części pola (spadek ≥ 1,5%), utrzymanie wody gruntowej na glebach organicznych oraz przy płytkiej wodzie gruntowej (≤ 1,5 m w najbliższym punkcie PIG-PIB) i rowie do 150 m od działki;
   - agrotechnika: międzyplon, resztki pożniwne, ograniczenie orki (uprawy jednoroczne), ściółka w rzędach i murawa w międzyrzędziach (sad, krzewy owocowe, truskawki, chmiel), wysokość koszenia łąki;
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
                 │       GET/POST/PUT /api/inngest ◄── Inngest Cloud (harmonogram: pomiary IMGW co 5 min, agregacja dobowa)
                 └─ web/src/server
                     ├─ sources/   działka, pogoda, gleba, teren, hydrologia, rzeki, wody gruntowe, satelita
                     ├─ analysis/  bilans wodny, poziom suszy, przyczyny, rekomendacje (silnik regułowy)
                     ├─ ingest/    bieżące pomiary IMGW (próbki 10-minutowe → wartości dobowe)
                     ├─ inngest/   funkcje uruchamiane przez Inngest Cloud
                     └─ db/        Drizzle ORM ──► PostgreSQL + PostGIS
```

- **Jedna aplikacja** (frontend i backend w Next.js), jedno wdrożenie (Docker, `output: "standalone"`).
- **Pole z kilku działek**: identyfikator analizy ma w pierwszym członie posortowane numery działek złączone znakiem „+” (np. `/dzialka/302602_5.0008.399%2B302602_5.0008.401%2F28~kukurydza~2022-08-10`); pojedyncza działka ma identyfikator jak dotąd. `POST /api/analyses` przyjmuje `parcelIds: string[]` albo `parcelId`. Serwer (`findField` w `server/sources/parcel.ts`) sprawdza spójność zbioru (`ST_ClusterDBSCAN` z promieniem 30 m w EPSG:2180, błąd 422 z komunikatem po polsku) i łączy geometrie `ST_Union` w jedno pole: powierzchnia z sumy, punkt reprezentatywny, próbki NMT i maska NDVI z całego pola, obręb i gmina z największej działki. Klucze cache zawierają pełną listę działek.
- **Przebieg analizy**: działka z bazy → równolegle pogoda (bazowa), gleba, teren, hydrologia, rzeki, wody gruntowe → silnik → wynik. Zdjęcie Sentinel-2 liczy się w tle i dociąga się do wyniku, gdy jest gotowe; analiza na nie nie czeka.
- **Cache** (`rosa_cache`): gotowe analizy (3 h dla ostatnich dni, 30 dni dla dat historycznych), odpowiedzi źródeł zewnętrznych i NDVI. Klucz zawiera wersję silnika, więc zmiana algorytmu unieważnia stare wyniki.
- **Harmonogram w Inngest Cloud**: bieżące pomiary IMGW pobiera funkcja `meteo-live-ingest` (cron `TZ=Europe/Warsaw */5 * * * *`; każdy 10-minutowy pomiar jest „najnowszy” w API przez ok. 10 min, więc odpytywanie co 5 min nie gubi pomiarów, a duplikaty odrzuca klucz stacja + czas pomiaru), a dobę z próbek liczy `meteo-live-aggregate` (`TZ=Europe/Warsaw 25 0 * * *`, poprzedni dzień; ręcznie zdarzeniem `rosa/meteo.aggregate` z `{ "day": "RRRR-MM-DD" }`). Obie mają współbieżność 1 i ponawianie (2 i 5 prób), a kroki (`step.run`) są idempotentne. Importy z archiwów (IMGW, EGiB, BDOT10k) zostają w cronie serwera, bo uruchamiają kontenery Dockera obok bazy.
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
| Bieżące pomiary meteorologiczne | IMGW-PIB, API `danepubliczne.imgw.pl/api/data/meteo` (788 stacji telemetrycznych; opad 10-minutowy i temperatura powietrza) | od 21.11.2026; próbki 10-minutowe odpytywane co 5 min (trzymane 10 dni) i wartości dobowe w tabeli `meteo_daily_live` | dni po końcu archiwum IMGW: bilans wodny i upał dla analiz „na dziś” |
| Ostatnie dni pogody (zapasowo) | Open-Meteo (API prognozowe, `past_days`) | tylko dni bez danych IMGW: dziś i luka 01.11–20.11.2026 przed startem pobierania bieżącego | analiza „na dziś”, gdy brakuje dni z IMGW |
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
| Progi suszy rolniczej (KBW) | Rozporządzenie MRiRW z 11.04.2019 w sprawie wartości klimatycznego bilansu wodnego (Dz.U. 2019 poz. 739), załącznik; te same wartości publikuje SMSR IUNG-PIB (susza.iung.pulawy.pl/progi) | 14 grup upraw × 4 kategorie gleby × 14 okresów | poziom suszy w sezonie (`web/src/server/analysis/iung-thresholds.ts`) |
| Współczynniki upraw Kc, okresy krytyczne | FAO-56 (Allen i in.), uproszczone dla Polski | 20 upraw | nawadnianie, przyczyna „okres krytyczny” |
| Typowe NDVI upraw w miesiącach | profile własne na podstawie typowych krzywych NDVI dla upraw w Europie Środkowej (fenologia: siew, pełnia wegetacji, dojrzewanie, zbiór) | 20 upraw × 12 miesięcy | interpretacja NDVI zależna od uprawy (`web/src/server/analysis/crop-profiles.ts`) |

---

## 5. Dane pobierane wcześniej i na żywo

### Pobrane wcześniej do bazy (PostGIS)
| Dane | Data pobrania | Stan danych | Skrypt |
|---|---|---|---|
| Działki EGiB (GUGiK) | 21.11.2026 | eksport z 21.11.2026, 03:03 | `scripts/import_parcels.sh` |
| Dane dobowe IMGW-PIB + współrzędne stacji | 21.11.2026 | 2006-01-01 – 2026-10-31 | `scripts/import_imgw.py` |
| Bieżące pomiary IMGW-PIB (API telemetryczne) | na bieżąco od 21.11.2026, co 5 min | próbki z ostatnich 10 dni, wartości dobowe od 21.11.2026 | `web/src/server/ingest/meteo-live.ts` (funkcje Inngest) |
| Dane hydrologiczne dobowe IMGW-PIB (stany rzek) + wodowskazy z API | 21.11.2026 | 01.11.2005 – 31.10.2025 (lata hydrologiczne 2006–2025) | `scripts/import_imgw_hydro.py` (`rosa-update.sh hydro-rivers`) |
| BDOT10k: rowy, cieki, kanały, wody | 21.11.2026 | wersje obiektów wg powiatów (np. 31.12.2023 dla pow. śremskiego) | `scripts/import_bdot.py` |
| Indeks nazw obrębów i gmin (`rosa_place`) | 21.11.2026 | z tabeli działek EGiB | `scripts/server/rosa-update.sh places` (też automatycznie po każdej aktualizacji działek) |

Aktualizacja w tle: importy archiwów robi `scripts/server/rosa-update.sh` uruchamiany z crona na serwerze (`scripts/server/crontab.txt`), a bieżące pomiary IMGW pobiera aplikacja na wywołanie z Inngest Cloud (sekcja 3). Każdy import ładuje dane do tabeli `*_next` i podmienia ją z bieżącą w jednej transakcji, więc aplikacja nie widzi pustych tabel w trakcie aktualizacji.

| Zadanie | Harmonogram |
|---|---|
| Bieżące pomiary IMGW: próbki z API telemetrycznego (Inngest Cloud) | co 5 minut |
| Bieżące pomiary IMGW: wartości dobowe za poprzedni dzień i usunięcie próbek starszych niż 10 dni (Inngest Cloud) | codziennie 00:25 czasu polskiego |
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
| Ostatnie dni pogody (Open-Meteo, zapasowo) | gdy między końcem archiwum IMGW a wczorajszym dniem są dni bez wartości dobowych z API IMGW | 3 h |
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
| inngest (SDK) | 4.26 | Apache-2.0 | funkcje harmonogramu uruchamiane przez Inngest Cloud (`/api/inngest`) |

### Usługi zewnętrzne
GUGiK (opendata.geoportal.gov.pl, services.gugik.gov.pl), IMGW-PIB (danepubliczne.imgw.pl: archiwa, API meteorologiczne i hydrologiczne), PIG-PIB (cbdgmapa.pgi.gov.pl, ArcGIS REST), IUNG-PIB (sgeo.iung.pl), Open-Meteo (api.open-meteo.com, tylko zapasowo), Inngest Cloud (inngest.com, harmonogram zadań: ok. 8,7 tys. uruchomień funkcji miesięcznie), Earth Search STAC (earth-search.aws.element84.com) i AWS Open Data (sentinel-cogs), Microsoft Planetary Computer (STAC i anonimowy token SAS), OpenStreetMap (kafelki mapy), GUGiK UUG (geokodowanie), GUGiK ORTO i KIEG (WMS). Żadna nie wymaga klucza ani płatności.

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
- **Open-Meteo**: dane na licencji CC BY 4.0; darmowe API wyłącznie do użytku niekomercyjnego. Od 21.11.2026 ostatnie dni pogody liczymy z bieżących pomiarów IMGW, a Open-Meteo jest tylko zapasem dla dni bez danych IMGW (dziś oraz luka 01.11–20.11.2026). Przy wyniku pokazujemy je jako osobne źródło tylko wtedy, gdy zostało użyte.
- **Inngest Cloud**: usługa harmonogramu (warunki inngest.com); nie przetwarza danych użytkowników, tylko wywołuje funkcje pobierające dane IMGW.
- **FAO-56**: publikacja naukowa, cytowana jako źródło metody.

---

## 8. Znane ograniczenia

- **Pogoda ze stacji, nie z pola**: wartości to interpolacja (odwrotność kwadratu odległości) z 5 najbliższych stacji opadowych i 4 temperaturowych w promieniu 80 km. Współrzędne mamy dla ok. 40% stacji opadowych IMGW (lista telemetryczna), więc najbliższa stacja jest zwykle 6–30 km od działki.
- **Parowanie metodą Hargreavesa** (FAO-56, tylko z temperatury), skalibrowane współczynnikiem 0,95 do wykazów suszy IUNG (metoda Penmana); przy wartościach bilansu bliskich progowi nasza ocena może różnić się od IUNG (F1 0,65).
- **Archiwum IMGW ma opóźnienie** około 1–2 miesięcy; dni po jego końcu liczymy z bieżących pomiarów telemetrycznych IMGW (od 21.11.2026). Wartości dobowe z próbek 10-minutowych mogą się nieco różnić od oficjalnego archiwum (np. przerwy w transmisji; dobę liczymy od północy do północy czasu polskiego), które je zastępuje po publikacji. Do doby wymagamy ≥ 80% (116 ze 144) 10-minutowych pomiarów opadu oraz ≥ 12 pomiarów temperatury w co najmniej 6 z 8 trzygodzinnych przedziałów. Dni 01.11–20.11.2026 (przed startem pobierania) i bieżący dzień nadal pochodzą z Open-Meteo (inny model, inna metoda parowania).
- **NDVI**: liczymy tylko z pikseli 10 m, których środek leży w granicach działki (maska z geometrii EGiB) i które maska SCL oznacza jako bezchmurne; przy bardzo wąskich działkach (< 20 m) pikseli jest mało. Zdjęcie jest z 30 dni przed datą analizy (dla starszych dat z 60 dni) i może go nie być przy dużym zachmurzeniu. Dla dat sprzed 2017 r. zdjęć Sentinel-2 L2A jest mało (archiwum Planetary Computer od 2016). Pobieranie zdjęć z amerykańskiego S3 bywa bardzo wolne z niektórych sieci; na serwerze produkcyjnym trwa kilka sekund, a wynik dociąga się w tle.
- **Model 3D jest poglądowy w części elementów**: teren, granice, sąsiednie działki i wody są z danych, ale rzeźba jest przewyższona (krotność pokazujemy przy źródłach), a farma, drzewa, postacie, maszyny i kolory pól sąsiadów są ilustracją.
- **Wyszukiwanie adresów** zależy od zapisu w rejestrze GUGiK (np. nazwa ulicy bez „ul.”); nie każdy wariant nazwy zostanie znaleziony.
- **Brak danych o rzeczywistym stanie urządzeń melioracyjnych** (BDOT10k pokazuje przebieg rowów, nie ich drożność).
- **Stan rzeki z najbliższego wodowskazu IMGW** (do 25 km): wodowskaz może leżeć na innej rzece lub w innej zlewni niż działka, a duża rzeka niesie wodę z daleka. Percentyl liczymy z pomiarów tego samego wodowskazu (±15 dni wokół tej samej daty w 10 poprzednich latach); zmiana zera wodowskazu w tym czasie może go zniekształcić. Archiwum dobowe kończy się 31.10.2025 (rok hydrologiczny 2025, publikowany z opóźnieniem); dla dziś i wczoraj bierzemy bieżący stan z API IMGW, a dla dat pomiędzy stanu rzek nie oceniamy.
- **Wody gruntowe z najbliższego punktu monitoringu PIG-PIB** (do 20 km) i z ostatniego pomiaru w tym punkcie, a nie spod działki ani z dnia analizy; poziom wody gruntowej mocno zależy od rzeźby terenu i budowy gleby. Punkty ze zwierciadłem napiętym (pod warstwą nieprzepuszczalną) pokazujemy, ale nie wyciągamy z nich wniosków.
- **Uprawy a grupy IUNG**: rozporządzenie podaje progi dla grup, nie gatunków, więc pszenica ozima, żyto, pszenżyto i jęczmień ozimy dostają próg zbóż ozimych, a pszenica jara, jęczmień jary i owies próg zbóż jarych; „Strączkowe”, „Warzywa”, „Krzewy owocowe” i „Sad” mają jeden próg dla całej grupy (np. ten sam dla porzeczki i borówki). Łąki i pastwiska nie mają progu IUNG, więc dla łąki poziom liczymy względem średniej z 10 lat. Kc, okresy krytyczne i typowe NDVI dla nowych upraw to uogólnione wartości FAO-56 i fenologii, nie kalibracja na polskich polach; dla sadu, krzewów i chmielu zakładamy międzyrzędzia z murawą.
- **Rekomendacje są ogólne**: nie zastępują doradcy rolniczego ani pozwoleń wodnoprawnych (zastawki, pobór wody), o czym przypominamy przy rekomendacjach.
- **Limity zewnętrznych API dotyczą głównie aktualizacji danych w tle, a nie pracy użytkownika**: analizy czytają działki, pogodę i hydrologię z naszej bazy, a źródła zewnętrzne odświeżamy okresowo (np. raz na dobę lub miesiąc). Przy pierwszej analizie nowej działki pytamy na żywo tylko kilka lekkich usług (IUNG, NMT, PIG-PIB, ostatnie dni z Open-Meteo tylko przy braku danych IMGW, bieżący stan wodowskazu IMGW, Sentinel-2) i zapisujemy wynik w cache. Ich limity: darmowe Open-Meteo do 10 000 wywołań dziennie na adres IP (10 lat danych dziennych to ok. 260 wywołań, dlatego historia jest z IMGW, a nie z Open-Meteo); Earth Search i AWS bez limitu, ale z opóźnieniem z Europy (~4 s), więc NDVI dociąga się w tle; usługi GUGiK, IUNG, PIG-PIB i API IMGW bez publikowanych limitów.
- **Pole z kilku działek liczymy jak jedną działkę**: pogoda, gleba (IUNG w punkcie reprezentatywnym), wody gruntowe i rzeki są z jednego punktu pola, a spadek, NDVI i odległość do rowu z całego połączonego obrysu; nie rozróżniamy sytuacji na poszczególnych działkach. Limit 10 działek; każda musi leżeć najwyżej 30 m od pozostałych (przerwy na drogę lub rów są dozwolone, odległe działki nie).
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
- **Zgodność z SMSR IUNG-PIB**: w sezonie (21.III–30.IX) poziom suszy liczymy metodą z Rozporządzenia MRiRW z 11.04.2019 (KBW z 60 dni vs. progi IUNG dla uprawy i kategorii gleby). Porównanie z oficjalnymi wykazami IUNG dla 39 losowych gmin z lat 2020–2025 (53 346 porównań): trafność 97,4%, precyzja 0,72, czułość 0,60, F1 0,65 przy współczynniku parowania k = 0,95 (walidacja objęła 6 grup: zboża ozime i jare, kukurydzę na ziarno, ziemniak, rzepak, burak cukrowy). Szczegóły i skrypt: `docs/walidacja-iung.md`, `web/scripts/validate-iung.mjs`.
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
  - usługi płatne przy wdrożeniu komercyjnym: Open-Meteo jest już tylko zapasem (ostatnie dni pochodzą z bieżących pomiarów IMGW), więc można go wyłączyć lub wykupić plan komercyjny; Inngest Cloud wg planu dla ok. 8,7 tys. uruchomień miesięcznie (albo samodzielnie hostowany serwer Inngest); własny serwer kafelków mapy zamiast publicznych kafelków OpenStreetMap. Dane GUGiK, IMGW, IUNG i Copernicus są bezpłatne.
- **Wąskie gardła i plan**: pobieranie zdjęć Sentinel-2 (transfer z AWS/Azure; alternatywa: Sentinel Hub w Copernicus Data Space, który zwraca gotowe NDVI dla poligonu); pierwsze wywołania NMT dla nowych działek (można wstępnie policzyć siatki dla działek rolnych); limit zapytań na użytkownika (do dodania w proxy).

---

## 11. Bezpieczeństwo

- **Brak kont i danych osobowych**: aplikacja nie wymaga logowania i nie zbiera danych osobowych. Numer działki i jej granice to publiczne dane ewidencyjne. Nie używamy plików cookie śledzących; zapamiętujemy tylko ustawienia interfejsu (tryb lekki, dźwięk) w przeglądarce.
- **Walidacja danych wejściowych** na serwerze:
  - numer działki (format TERYT; przy polu z kilku działek każdy numer, najwyżej 10 działek z jednego województwa i spójność zbioru), uprawa z zamkniętej listy, data w zakresie ostatnich 10 lat;
  - współrzędne w granicach Polski, współrzędne kafelków w dozwolonym zakresie;
  - zapytanie wyszukiwarki skrócone do 80 znaków.
- **Baza danych**: wszystkie zapytania są parametryzowane (Drizzle ORM, szablony `sql`), bez sklejania tekstu SQL z danymi użytkownika. Aplikacja łączy się z bazą przez wewnętrzną sieć Dockera. Publiczny port bazy, używany w czasie budowy rozwiązania, należy wyłączyć przy wdrożeniu u KOWR.
- **Źródła zewnętrzne**:
  - stałe adresy usług; użytkownik przekazuje tylko zakodowane parametry, nie adresy URL (brak SSRF);
  - każde wywołanie ma limit czasu, a awaria źródła nie przerywa analizy;
  - komunikaty błędów dla użytkownika nie ujawniają szczegółów technicznych.
- **Harmonogram (Inngest)**: endpoint `/api/inngest` przyjmuje tylko wywołania podpisane kluczem `INNGEST_SIGNING_KEY` (SDK weryfikuje podpis każdego żądania); nie ma publicznego endpointu, który uruchamia pobieranie danych. Funkcje mają współbieżność 1, a zapisy w bazie są idempotentne (klucz stacja + czas pomiaru, przeliczenie doby nadpisuje ją w całości).
- **Sekrety**: hasło do bazy i tokeny tylko w zmiennych środowiskowych (Coolify, `.env.local` poza repozytorium); w repozytorium jest wyłącznie `.env.example` z pustym szablonem.
- **Transport**: HTTPS z certyfikatem Let's Encrypt (Traefik w Coolify).
- **Do dodania przed wdrożeniem**: limit liczby zapytań na adres IP (rate limiting w proxy), nagłówki bezpieczeństwa (Content-Security-Policy) i regularny audyt zależności (`pnpm audit`).
