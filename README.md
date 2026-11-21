# ROSA: Retencja · Opady · Susza · Analiza

Narzędzie webowe dla rolnika: wpisujesz numer działki ewidencyjnej, wybierasz uprawę i dzień analizy, a ROSA w kilka sekund ocenia sytuację wodną działki na tle ostatnich 10 lat, wyjaśnia przyczyny niedoboru wody i podpowiada, jak zatrzymać wodę na polu (retencja → agrotechnika → ewentualnie nawadnianie). Wynik można pobrać jako raport A4 (PDF lub wydruk).

Zadanie: Krajowy Ośrodek Wsparcia Rolnictwa, „Zatrzymaj Wodę, Chroń Plony”, HackNation 2026.

---

## 1. Instrukcja uruchomienia

### Wymagania
- Node.js 22+ i pnpm 11 (`corepack enable`)
- PostgreSQL 16+ z PostGIS 3.4+ z zaimportowanymi danymi (sekcja 5). Bez bazy aplikacja działa w trybie demonstracyjnym na danych przykładowych.
- Docker (opcjonalnie: obraz produkcyjny i skrypty importu)

### Lokalnie
```bash
cd web
cp .env.example .env.local        # uzupełnij DATABASE_URL
pnpm install
pnpm db:migrate                   # tabele cache, stacji IMGW i hydrologii (Drizzle)
pnpm dev                          # http://localhost:3000
```

Produkcyjnie:
```bash
pnpm build && node .next/standalone/server.js
# albo
docker build -t rosa-web ./web && docker run -p 3000:3000 -e DATABASE_URL=... rosa-web
```

### Zmienne środowiskowe
| Zmienna | Opis |
|---|---|
| `DATABASE_URL` | Połączenie z PostgreSQL/PostGIS (`postgres://user:hasło@host:port/baza`). Brak = tryb demonstracyjny. |
| `ROSA_DATA_MODE=mock` | Wymusza dane przykładowe, np. do prezentacji bez sieci. |
| `ROSA_SATELLITE_BUDGET_MS` | Limit czasu na pobranie zdjęcia Sentinel-2 w tle (domyślnie 15000 ms). |

### Import danych do bazy (jednorazowo, potem okresowo w tle)
```bash
./scripts/import_parcels.sh /dane                    # działki EGiB z GUGiK (Parquet, ~4,6 GB)
docker run --rm -e DATABASE_URL=... -v $PWD/scripts:/w python:3.12-slim \
  sh -c "pip install 'psycopg[binary]' && python /w/import_imgw.py"   # dane dobowe IMGW 2006–dziś
docker run --rm -e PGHOST=... -e PGPASSWORD=... -v /dane/bdot:/work -v $PWD/scripts:/s \
  ghcr.io/osgeo/gdal:ubuntu-full-latest python3 /s/import_bdot.py    # rowy i wody z BDOT10k (lista powiatów w /work/codes.txt)
```

---

## 2. Opis funkcji

1. **Wybór działki**: numer działki ewidencyjnej (walidacja formatu na bieżąco), uprawa (pszenica, kukurydza, rzepak, ziemniaki, buraki, łąka) i dzień analizy: dziś lub dowolny dzień z ostatnich 10 lat.
2. **Ładowanie jako opowieść (~2–5 s)**: animacja pokazuje kolejne źródła danych; jeśli któreś nie odpowie, widać to od razu, a analiza idzie dalej.
3. **Stan wody teraz**: poziom suszy w skali 1–5 (Mokro, W normie, Susza umiarkowana / silna / ekstremalna) z bilansu wodnego (opad minus parowanie) z 45 dni przed dniem analizy, porównanego z tym samym okresem w 10 poprzednich latach i skorygowanego o podatność gleby na suszę.
4. **Na tle 10 lat**: wykres odchyleń bilansu wodnego rok po roku, liczba lat z deficytem i najbardziej narażone miesiące.
5. **Dlaczego brakuje wody**: przyczyny wyliczone z danych: mniej deszczu niż zwykle, upał, lekka gleba, spływ wody po spadku terenu, okres krytyczny uprawy.
6. **Co zrobić**: rekomendacje w kolejności wymaganej przez KOWR:
   - zatrzymanie wody: zastawka na rowie przy działce (gdy BDOT10k pokazuje rów do 30 m od działki), zatrzymanie spływu w dolnej części pola (spadek ≥ 1,5%), utrzymanie wody gruntowej na glebach organicznych;
   - agrotechnika: międzyplon, resztki pożniwne, ograniczenie orki, wysokość koszenia łąki;
   - nawadnianie (opcjonalnie): dawka z zapotrzebowania uprawy (ET0 × Kc wg FAO-56) minus opad z ostatnich 7 dni.
   Każda rekomendacja ma „Dlaczego to polecamy” z liczbami i źródłem. Kliknięcie pokazuje działanie na scenie (diorama działki).
7. **Pewność i „Czego nie wiemy”**: jawny poziom pewności i lista ograniczeń dla tej konkretnej analizy (odległość do stacji, brak zdjęcia satelitarnego, działka nierolnicza itd.).
8. **Raport A4**: pełny wynik do druku lub PDF, ze źródłami, datami pobrania i licencjami.
9. **Tryb lekki**: bez animacji, dla słabszych komputerów i wolnego łącza; włącza się sam przy `prefers-reduced-motion` lub wolnym połączeniu.

---

## 3. Architektura

```
przeglądarka ──► Next.js 16 (App Router, React 19)
                 ├─ strony: / · /analiza · /dzialka/[id] · /raport/[id]
                 ├─ API: POST /api/analyses · GET /api/analyses/[id] · GET /api/analyses/[id]/satellite
                 └─ web/src/server
                     ├─ sources/   działka, pogoda, gleba, teren, hydrologia, satelita
                     ├─ analysis/  bilans wodny, poziom suszy, przyczyny, rekomendacje (silnik regułowy)
                     └─ db/        Drizzle ORM ──► PostgreSQL + PostGIS
```

- **Jedna aplikacja** (frontend i backend w Next.js), jedno wdrożenie (Docker, `output: "standalone"`).
- **Przebieg analizy**: działka z bazy → równolegle pogoda (bazowa), gleba, teren, hydrologia → silnik → wynik. Zdjęcie Sentinel-2 liczy się w tle i dociąga się do wyniku, gdy jest gotowe; analiza na nie nie czeka.
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
| Wysokości terenu | GUGiK, NMT (usługa `GetHByPointList`) | 48 punktów w obrębie działki | spadek, kierunek spływu, różnica wysokości |
| Rowy melioracyjne, cieki, kanały, wody powierzchniowe | GUGiK, BDOT10k (paczki GPKG na powiat, warstwy `OT_SWRM_L`, `OT_SWRS_L`, `OT_SWKN_L`, `OT_PTWP_A`) | cała Polska, 380 powiatów: 1,64 mln rowów, 506 tys. cieków, 8,9 tys. kanałów, 606 tys. wód powierzchniowych (1,1 GB) | zastawka na rowie, sąsiedztwo wody |
| Kondycja roślin (NDVI) | Copernicus Sentinel-2 L2A, COG z rejestru AWS Open Data, katalog STAC Earth Search (Element 84) | najnowsza scena z 30 dni przed dniem analizy, zachmurzenie < 60%, min. 50% bezchmurnych pikseli | kondycja roślin na scenie i w raporcie |
| Współczynniki upraw Kc, okresy krytyczne | FAO-56 (Allen i in.), uproszczone dla Polski | 6 upraw | nawadnianie, przyczyna „okres krytyczny” |

---

## 5. Dane pobierane wcześniej i na żywo

### Pobrane wcześniej do bazy (PostGIS)
| Dane | Data pobrania | Stan danych | Skrypt |
|---|---|---|---|
| Działki EGiB (GUGiK) | 21.11.2026 | eksport z 21.11.2026, 03:03 | `scripts/import_parcels.sh` |
| Dane dobowe IMGW-PIB + współrzędne stacji | 21.11.2026 | 2006-01-01 – 2026-10-31 | `scripts/import_imgw.py` |
| BDOT10k: rowy, cieki, kanały, wody | 21.11.2026 | wersje obiektów wg powiatów (np. 31.12.2023 dla pow. śremskiego) | `scripts/import_bdot.py` |

Aktualizacja w tle (docelowo, np. cronem w Coolify): IMGW raz w miesiącu po publikacji kolejnego miesiąca, działki EGiB raz na dobę lub tydzień (GUGiK odświeża eksport codziennie), BDOT10k raz na kwartał.

### Pobierane na żywo (przy pierwszej analizie danej działki, potem z cache)
| Dane | Kiedy | Cache |
|---|---|---|
| Kategoria gleby IUNG (WMS GetFeatureInfo) | pierwsza analiza w danym miejscu | bez wygasania |
| Wysokości NMT (GUGiK) | pierwsza analiza działki | bez wygasania |
| Ostatnie dni pogody (Open-Meteo) | gdy dzień analizy jest nowszy niż archiwum IMGW | 3 h |
| Sentinel-2 NDVI (Earth Search + COG) | w tle po każdej nowej analizie | 7 dni |

Każdy wynik pokazuje datę pobrania danych przy źródle (sekcje wyniku i raport A4).

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
| Figtree, Bricolage Grotesque (`next/font`) | – | SIL OFL 1.1 | kroje pisma (hostowane lokalnie) |
| PostgreSQL + PostGIS | 18.7 / 3.7 | PostgreSQL License / GPL-2.0 | baza danych przestrzennych (serwer, nie dystrybuowana z kodem) |
| GDAL/OGR (`ogr2ogr`, obraz `osgeo/gdal`) | 3.x | MIT | import Parquet i GPKG |
| Python 3.12 + psycopg | 3.12 / 3.x | PSF / LGPL-3.0 | skrypt importu IMGW (narzędzie, poza aplikacją) |

### Usługi zewnętrzne
GUGiK (opendata.geoportal.gov.pl, services.gugik.gov.pl), IMGW-PIB (danepubliczne.imgw.pl), IUNG-PIB (sgeo.iung.pl), Open-Meteo (api.open-meteo.com), Earth Search STAC (earth-search.aws.element84.com) i AWS Open Data (sentinel-cogs). Żadna nie wymaga klucza ani płatności.

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
- **IMGW-PIB**: dane publiczne; warunek: podanie źródła „Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy”, a przetworzone dane oznaczamy jako przetworzone. W aplikacji źródło jest podane przy każdej wartości pogodowej.
- **IUNG-PIB**: warstwa udostępniona publicznie w usłudze WMS systemu SMSR; warunki ponownego wykorzystania **do potwierdzenia z IUNG-PIB**.
- **Copernicus Sentinel-2**: wolny, pełny i otwarty dostęp (polityka danych Copernicus); oznaczenie „zawiera zmodyfikowane dane Copernicus Sentinel”.
- **Open-Meteo**: dane na licencji CC BY 4.0; darmowe API wyłącznie do użytku niekomercyjnego. W ROSA służy tylko do kilku ostatnich dni pogody; do wdrożenia u KOWR: plan komercyjny Open-Meteo, własna instancja Open-Meteo albo dane IMGW z mniejszym opóźnieniem.
- **FAO-56**: publikacja naukowa, cytowana jako źródło metody.

---

## 8. Znane ograniczenia

- **Pogoda ze stacji, nie z pola**: wartości to interpolacja (odwrotność kwadratu odległości) z 5 najbliższych stacji opadowych i 4 temperaturowych w promieniu 80 km. Współrzędne mamy dla ok. 40% stacji opadowych IMGW (lista telemetryczna), więc najbliższa stacja jest zwykle 6–30 km od działki.
- **Parowanie metodą Hargreavesa** (FAO-56, tylko z temperatury) latem zwykle zawyża parowanie względem metody Penmana-Monteitha; progi poziomu suszy wymagają kalibracji z monitoringiem IUNG.
- **Archiwum IMGW ma opóźnienie** około 1–2 miesięcy; ostatnie dni uzupełniamy z Open-Meteo (inny model, inna metoda parowania).
- **NDVI dla prostokąta działki**: zdjęcie liczymy dla prostokąta obejmującego działkę, więc przy wąskich działkach brzeg może obejmować sąsiednie pola. Zdjęcie jest z ostatnich 30 dni i może go nie być przy dużym zachmurzeniu.
- **Brak danych o wodach gruntowych** i o rzeczywistym stanie urządzeń melioracyjnych (BDOT10k pokazuje przebieg rowów, nie ich drożność).
- **Rekomendacje są ogólne**: nie zastępują doradcy rolniczego ani pozwoleń wodnoprawnych (zastawki, pobór wody), o czym przypominamy przy rekomendacjach.
- **Limity zewnętrznych API dotyczą głównie aktualizacji danych w tle, a nie pracy użytkownika**: analizy czytają działki, pogodę i hydrologię z naszej bazy, a źródła zewnętrzne odświeżamy okresowo (np. raz na dobę lub miesiąc). Przy pierwszej analizie nowej działki pytamy na żywo tylko kilka lekkich usług (IUNG, NMT, ostatnie dni z Open-Meteo, Sentinel-2) i zapisujemy wynik w cache. Ich limity: darmowe Open-Meteo do 10 000 wywołań dziennie na adres IP (10 lat danych dziennych to ok. 260 wywołań, dlatego historia jest z IMGW, a nie z Open-Meteo); Earth Search i AWS bez limitu, ale z opóźnieniem z Europy (~4 s), więc NDVI dociąga się w tle; usługi GUGiK i IUNG bez publikowanych limitów.
- **Prototyp**: działka nierolnicza (las, woda, zabudowa wg IUNG) dostaje ostrzeżenie zamiast rekomendacji upraw; ewidencyjne klasy użytków (`klasouzytki_egib`) są w eksporcie GUGiK najczęściej puste.

---

## 9. Weryfikacja wyników i rekomendacji

- **Testy na działkach z różnych regionów** (Wielkopolska, Małopolska, Dolny Śląsk, Podlasie, Lubuskie) i różnych dat, w tym znanych okresów suszy. Przykład: czerwiec 2019 w gm. Dolsk daje „Susza ekstremalna” z upałem +3,3 °C, co zgadza się z rekordowo gorącym i suchym czerwcem 2019; lipiec 2025 w okolicy Śremu daje „W normie”.
- **Spójność danych wejściowych**: wysokości NMT porównane z ukształtowaniem terenu (kolejność osi sprawdzona na znanym punkcie: 103,6 m n.p.m. w Mórce), kategoria IUNG porównana z ewidencją (działka testowa w Mórce: IUNG „lasy” = EGiB „Ls”), NDVI w zakresie typowym dla upraw w maju–czerwcu.
- **Przejrzystość**: każda przyczyna i rekomendacja pokazuje liczby, z których wynika, i źródło; sekcja „Czego nie wiemy” wymienia ograniczenia konkretnej analizy. Pozwala to rolnikowi i ekspertowi sprawdzić rozumowanie krok po kroku.
- **Wydajność i niezawodność**: logi czasu każdego źródła (`[rosa] source …`); nowa analiza 0,7–2,5 s przy bazie zdalnej, z cache ~0,15 s; awaria źródła nie przerywa analizy (sprawdzone na przypadkach braku zdjęcia i limitu Open-Meteo).
- **Do zrobienia przed wdrożeniem**: porównanie poziomu suszy z klimatycznym bilansem wodnym IUNG-PIB (SMSR) dla gmin i tych samych okresów; przegląd reguł rekomendacji z ekspertami KOWR (agrotechnika, retencja); kalibracja progów poziomu suszy na danych z lat 2016–2025.
