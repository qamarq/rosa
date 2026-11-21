# ROSA: koncept

**R**etencja · **O**pady · **S**usza · **A**naliza
*„ROSA: sprawdź, ile wody ma Twoje pole.”*

HackNation 2026, zadanie Krajowego Ośrodka Wsparcia Rolnictwa „Zatrzymaj Wodę, Chroń Plony”. Stan na 21.11.2026.

## 1. O co chodzi

Rolnik podaje numer działki (albo klika ją na mapie), wybiera uprawę i datę. ROSA w kilka sekund:
1. ocenia sytuację wodną działki: teraz i na tle ostatnich 10 lat,
2. tłumaczy, **dlaczego** brakuje wody (opady i upał, lekka gleba, spływ ze stoku, wrażliwa uprawa),
3. podpowiada, jak **zatrzymać wodę** (retencja krajobrazowa i glebowa),
4. podpowiada **zabiegi agrotechniczne**,
5. opcjonalnie mówi, czy, kiedy i ile nawadniać,
6. oddaje raport do pobrania lub wydruku, ze źródłami danych i uczciwie opisaną niepewnością.

Rolnik nie musi znać GIS-u, niczego instalować ani za nic płacić.

## 2. Wymagania KOWR, które nas wiążą

- Aplikacja webowa, działa na Windowsie w Chrome, Firefoksie, Edge'u, Safari i Operze; telefon to plus.
- **Dowolna działka w Polsce i dowolna data z ostatnich 10 lat.** Jury samo wpisuje numery działek i daty i porównuje wynik z danymi referencyjnymi.
- Wynik **liczony z pobranych danych**; gotowe, wcześniej przygotowane rekomendacje nie spełniają wymagań.
- Kolejność: ocena → przyczyny → retencja → agrotechnika → (nawadnianie).
- Wymagane kategorie danych: meteo, satelita, gleba, hydrologia, dane przestrzenne.
- Preferowane **≤ 30 s** na działkę. **Nasz cel: ok. 5 s.**
- Oddajemy: prywatne repozytorium, README z 9 wymaganymi punktami, PDF do 10 slajdów, film do 3 min, przykładowe raporty.

Kryteria oceny: wartość praktyczna 25%, dane i wiarygodność 25%, innowacyjność 20%, prostota obsługi 15%, prototyp i jakość techniczna 15%.

## 3. Czy to jest wykonalne? Tak.

Wszystkie kategorie danych mają darmowe i działające źródła (sprawdzone 21.11.2026). Rdzeń, czyli działka → ocena → rekomendacje → raport, mieści się w czasie i zakresie hackathonu.

### Pewne
- Działka po numerze z całej Polski (ULDK GUGiK albo lokalny Parquet EGiB).
- Meteo z 10 lat w jednym zapytaniu, ok. 1 s, w tym ewapotranspiracja wg FAO-56, czyli rdzeń bilansu wodnego.
- Gleba (IUNG), teren (NMT GUGiK), cieki i zbiorniki (BDOT10k).
- ok. 5 s na analizę, jeśli część danych trzymamy lokalnie.

### Ryzyka
| # | Ryzyko | Co robimy |
|---|---|---|
| 1 | Historia satelitarna z 10 lat na żywo trwa 25–38 s | Statistical API w Copernicus Data Space albo liczenie w tle i cache; w ostateczności podatność wieloletnia z meteo i gleby (też spełnia wymagania) |
| 2 | Jakość rekomendacji (25% oceny) wymaga wiedzy agronomicznej | Reguły oparte na literaturze z załącznika KOWR; konsultacje z mentorami: dr inż. Tymoteusz Bolewski (susza, bilans wodny), dr hab. Dariusz Gozdowski (agrotechnika, satelita) |
| 3 | Nie wiemy, z czym jury porównuje wyniki | Najpewniej z monitoringiem suszy IUNG, więc kalibrujemy się do niego |
| 4 | Hosting: lokalna baza działek ma 4,6 GB, a jury musi mieć działający link | Wybrać hosting wcześnie; ULDK jako zapas zamiast lokalnych działek |

Żadne z nich nie blokuje projektu. Ryzyka 1 i 4 to kilka godzin pracy technicznej. Ryzyka 2 i 3 decydują o tym, czy wygramy, a nie o tym, czy rozwiązanie działa.

## 4. Dane i czasy (pomiar 21.11.2026)

Działka testowa `302604_5.0017.5196` (Mórka, gm. Śrem, 17,6 ha), data 2025-07-15, źródła odpytywane równolegle.

| Źródło | Czas | Werdykt |
|---|---|---|
| ULDK (obrys działki) | 0,6–1,1 s | ✅ |
| Open-Meteo, 10 lat dziennie | 0,6–1,5 s | ✅ |
| IUNG, kategoria gleby (WMS GetFeatureInfo) | 0,5–0,7 s | ✅ (legenda kategorii do ustalenia) |
| NMT GUGiK, 64 punkty | 0,9–1,3 s | ✅ |
| NMT GUGiK, raster 1 m (WCS) | ok. 18 s | ❌ |
| Copernicus DEM 30 m | 1,5–1,8 s | ✅ zapas |
| BDOT10k (cieki, zbiorniki) | paczka ok. 25 MB / powiat | ✅ lokalnie |
| OpenStreetMap (Overpass), Wody Polskie | brak odpowiedzi / 401 | ❌ |
| SoilGrids | 11–15 s | ⚠️ tylko lokalnie |
| Sentinel-2, 1 bieżąca scena | ok. 4,5 s | ⚠️ główny koszt |
| Sentinel-2, 10 lat | 25–38 s | ❌ nie na żywo; w 4 z 11 lat brak sceny w oknie |

### Plan na ~5 s
- **Lokalnie (PostgreSQL + PostGIS):** działki z `0_dzialki.parquet` (4,6 GB, aktualizowany codziennie), BDOT10k, wycinek SoilGrids dla Polski.
- **Na żywo, równolegle:** Open-Meteo, IUNG, punkty NMT, jedna bieżąca scena Sentinel-2.
- **Historia NDVI:** poza ścieżką zapytania (Statistical API lub tło + cache).

## 5. Doświadczenie użytkownika (kierunek)

ROSA ma być **piękna i szybka**. Wybór działki to moment „wow”: działka pojawia się w 3D z prawdziwym ukształtowaniem terenu, pogoda i woda dzieją się na niej na żywo, a sympatyczne postacie rolników i maszyn pokazują, co warto zrobić. Czas ładowania (ok. 5 s) jest częścią opowieści: każde źródło danych „przylatuje” na scenę. Pod spodem zawsze jest prosty raport w zwykłym języku. Szczegóły w `design-prompt.md`.

## 6. Regulamin KOWR: co z niego wynika

- **Nagroda: 25 000 zł netto**, tylko za 1. miejsce, dzielona po równo (chyba że zespół złoży wspólne oświadczenie o innym podziale).
- **Przeniesienie praw:** zwycięzcy nieodpłatnie przenoszą na KOWR autorskie prawa majątkowe do kodu i dokumentacji. Umowę podpisuje każdy członek zespołu w ciągu 7 dni; brak jednego podpisu = cały zespół traci nagrodę na rzecz kolejnego z listy.
- **Licencje:** wolno używać otwartych bibliotek, danych publicznych i narzędzi AI, ale tylko jeśli ich licencje pozwalają KOWR korzystać z rozwiązania. Unikamy AGPL/GPL w kodzie, który przekazujemy; sprawdzamy warunki API (darmowe Open-Meteo jest niekomercyjne, dane CC BY 4.0). Wszystko z licencjami w README.
- **Repozytorium prywatne** co najmniej do końca wydarzenia, a u zwycięzcy do przekazania kodu KOWR.
- **Ocena:** jury (min. 3 osoby, skład ogłoszony najpóźniej w dniu startu) ocenia na platformie, wynik to średnia ważona kryteriów. Próg: bez nagrody, jeśli nikt nie przekroczy 50% punktów lub nie spełni wymagań formalnych.
- **Finał:** 3–5 zespołów, pitch **2–3 min + do 2 min pytań**. Demo musi być bardzo zwarte.
- **Możliwa wstępna wersja rozwiązania w pierwszym dniu** (termin na platformie).
- **Zespół 1–6 osób**; liczy się skład na platformie w chwili zamknięcia zgłoszeń. Nazwa zespołu najlepiej bez imion i nazwisk.
- Rozwiązanie ma powstać w trakcie wydarzenia; nagrywanie finału tylko za osobną zgodą.

## 7. Następne kroki
- [ ] Konto w Copernicus Data Space i test Statistical API (historia NDVI w 1 zapytaniu).
- [x] Import Parquetu z działkami do PostGIS na serwerze: 38,9 mln działek, 17 GB, wyszukiwanie po numerze ok. 60 ms, po punkcie ok. 90 ms.
- [ ] Ostrzeżenie, gdy działka nie jest rolna (klasy użytków EGiB, np. testowa działka w Mórce to las „Ls”).
- [ ] Legenda kategorii glebowych IUNG.
- [ ] Lista upraw z współczynnikami Kc i okresami krytycznymi (FAO-56).
- [ ] Reguły przyczyn i rekomendacji; konsultacja z mentorami KOWR.
- [ ] Wybór hostingu.
- [ ] Designy (Claude Design) → frontend.

Szczegóły techniczne: `architektura.md`.
