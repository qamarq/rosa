Zaprojektuj aplikację webową **ROSA** (Retencja · Opady · Susza · Analiza): narzędzie dla polskiego rolnika, które po wybraniu działki pokazuje, ile wody ma jego pole, dlaczego jej brakuje i jak ją zatrzymać. Hasło: „ROSA: sprawdź, ile wody ma Twoje pole”. Cały interfejs po polsku.

## Klimat i ambicja
Ma wyglądać jak najlepsze produkty z Awwwards, a nie jak urzędowa aplikacja. Ciepło, ziemia i woda. Żywa scena 3D zamiast płaskiej mapy, płynne animacje, poczucie zabawy, a jednocześnie powaga danych. Inspiracja nastrojem: dioramy w stylu „tiny world”, miękkie światło złotej godziny, materiały jak z gliny i żelu. Postacie i styl mają być **w pełni oryginalne**.

## Użytkownik
Rolnik z Polski, często 45+, bez wiedzy o GIS-ie, czasem na słabszym laptopie z Windowsem. Duże przyciski, prosty język, zero żargonu. Drugi odbiorca to jury hackathonu: muszą zobaczyć „wow” w pierwszych 10 sekundach.

## Przepływ i ekrany

1. **Start / hero**
   - Pełnoekranowa scena: mała diorama pola w 3D, delikatny wiatr w uprawach, kropla rosy spływająca po liściu, logo ROSA.
   - Jedno duże pole: „Wpisz numer działki” (format np. `302604_5.0017.5196`) + przycisk „albo wskaż na mapie”.
   - Wybór uprawy (ikony: pszenica, kukurydza, rzepak, ziemniaki, buraki, łąka…) i data analizy (domyślnie dziś, możliwa dowolna z ostatnich 10 lat).

2. **Ładowanie (ok. 5 s) jako opowieść, nie spinner**
   - Kamera leci nad Polską i zbliża się do działki; obrys działki rysuje się świecącą linią.
   - Każde źródło danych „przylatuje” na scenę jako mała animacja z etykietą i ✓: chmura (pogoda, 10 lat), satelita przelatujący nad polem (Sentinel-2), przekrój gleby wysuwający się spod ziemi (gleba), siatka wysokości (teren), niebieskie nitki cieków (hydrologia).
   - Jeśli któreś źródło nie odpowie, jego ikona robi się szara z uczciwym komunikatem, a analiza idzie dalej.

3. **Scena działki 3D (serce aplikacji)**
   - Prawdziwy kształt działki wytłoczony na terenie z rzeczywistym ukształtowaniem (przesadzona skala pionowa, żeby spadki były widoczne); kolor i tekstura zależne od uprawy i jej kondycji (NDVI: od soczystej zieleni do spieczonego brązu).
   - Otoczenie jako stylizowana diorama: sąsiednie pola, drzewa, rowy i cieki jako animowana woda.
   - **Pogoda na żywo na scenie**: deszcz z intensywnością z danych, migotanie upału przy wysokich temperaturach, chmury, pęknięcia suchej gleby przy suszy, rosa o poranku.
   - **Woda w ruchu**: cząsteczki wody spływające po stoku do obniżeń; tam, gdzie warto ją zatrzymać, pojawia się pulsujący znacznik.
   - **Galaretowate, sprężyste postacie rolników** (miękkie, bouncy, z „jelly” fizyką) i **sprzęt** (traktor, siewnik do międzyplonów, zraszacz, koparka kopiąca oczko wodne). Postacie reagują na wynik: przy suszy ocierają pot i patrzą w niebo, przy rekomendacji „międzyplon” podjeżdża siewnik i sieje, przy „oczko wodne” powstaje mały zbiornik, przy nawadnianiu zraszacz zaczyna pracować.
   - Kamera: orbitowanie myszą/palcem, przybliżanie, przycisk „widok z góry”.

4. **Panel wyniku obok sceny** (w kolejności wymaganej przez KOWR)
   - **Stan wody teraz**: jeden duży wskaźnik (np. 5-stopniowa skala od „mokro” do „susza ekstremalna”) + jedno zdanie po ludzku.
   - **Na tle 10 lat**: oś czasu / mini-wykres bilansu wodnego (opad minus parowanie) z zaznaczonym bieżącym rokiem; „takie lato zdarza się tu średnio co 3 lata”.
   - **Dlaczego**: 2–4 karty przyczyn z ikoną i liczbą, z której wynikają (np. „Od 45 dni o 38% mniej opadów niż zwykle”, „Gleba lekka, piaszczysta, słabo trzyma wodę”, „Spadek 4%, woda szybko spływa”).
   - **Co zrobić**: karty rekomendacji w trzech grupach: Zatrzymaj wodę (retencja) → Zadbaj o glebę (agrotechnika) → Nawadnianie (opcjonalnie). Każda karta: tytuł, 1 zdanie, kiedy, „dlaczego to polecamy” (rozwijane, z danymi), i kliknięcie podświetla miejsce na scenie 3D + odpala animację postaci.
   - **Pewność i ograniczenia**: czytelny wskaźnik pewności, lista „czego nie wiemy” (np. „Brak bezchmurnych zdjęć satelitarnych z ostatnich 20 dni”). Brak danych pokazany wprost, bez pozornej precyzji.
   - **Źródła**: dyskretna stopka z nazwą źródła, datą pobrania i licencją przy każdej liczbie.

5. **Raport do druku / PDF**
   - Czysty, czarno-biały-przyjazny układ A4: mapa działki (statyczny render sceny), stan, przyczyny, rekomendacje, źródła z datami, ograniczenia. Przycisk „Pobierz PDF” i „Drukuj”.

6. **Stany brzegowe**: zły numer działki, działka nie znaleziona, data spoza zakresu, wolne łącze, źródło nie odpowiada.

## Styl wizualny
- Paleta: ciepła ziemia i zboże (piasek, ochra, oliwkowa zieleń) + woda jako akcent (głęboki turkus / błękit rosy); skala suszy od chłodnej zieleni przez żółć do spalonej terakoty. Tryb jasny jako główny, ciemny opcjonalnie.
- Typografia: wyrazisty, nowoczesny krój display do nagłówków + bardzo czytelny bezszeryfowy do treści; duże liczby jako bohaterowie.
- Ikony i ilustracje w jednym spójnym, miękkim, „claymorphic” stylu, pasującym do postaci 3D.
- Mikrointerakcje: sprężyste przyciski, karty wjeżdżające z lekkim bounce, liczby odliczające się do wartości.

## Wydajność i dostępność (twarde wymagania)
- Ma **śmigać** na przeciętnym laptopie z Windowsem w Chrome, Edge'u, Firefoksie, Safari i Operze; płynnie 60 fps, w razie potrzeby automatyczne obniżenie jakości (mniej cząsteczek, prostsze cienie).
- Tryb lekki: przy `prefers-reduced-motion` lub słabym GPU scena 3D zastępowana pięknym statycznym renderem/2D, a wszystkie informacje nadal dostępne.
- Wynik czytelny także bez sceny 3D (panel wyniku jest samodzielny). Kontrast WCAG AA, obsługa klawiaturą, duże cele kliknięcia.
- Desktop jako główny widok; mobile jako wersja z sceną u góry i wynikiem pod spodem.

## Technologia, pod którą projektujesz
Frontend w Next.js + shadcn/ui, scena 3D w React Three Fiber (three.js) z shaderami dla wody, deszczu i upału, mapa wyboru działki w MapLibre GL z ortofoto. Postacie jako lekkie modele low-poly z prostą fizyką sprężystą. Projektuj tak, żeby dało się to zbudować w 24–48 godzin hackathonu: reużywalne elementy, ograniczona liczba unikalnych modeli.

## Przykładowe dane do makiet
Działka `302604_5.0017.5196`, Mórka, gm. Śrem, wielkopolskie, 17,6 ha, kukurydza, data 15.07.2025.
- Stan: susza umiarkowana (3/5). „Od 45 dni spadło 38% mniej deszczu niż zwykle, a upał przyspiesza parowanie.”
- Na tle 10 lat: deficyt w tym okresie wystąpił w 6 z 10 lat; najbardziej narażone: maj–lipiec.
- Przyczyny: deficyt opadów (−62 mm względem normy), gleba lekka (kategoria podatności IUNG: wysoka), spadek terenu 3–4% w stronę rowu na wschodzie.
- Rekomendacje: zastawka na rowie melioracyjnym przy wschodniej granicy; międzyplon po zbiorze; pozostawienie resztek pożniwnych; ograniczenie orki; nawadnianie: zasadne w ciągu 7 dni, ok. 25 mm.
- Pewność: średnia. Ograniczenia: dane pogodowe w siatce ok. 9 km; ostatnie bezchmurne zdjęcie satelitarne sprzed 12 dni.
- Źródła: Open-Meteo (ERA5), Copernicus Sentinel-2, IUNG-PIB, GUGiK (ULDK, NMT), BDOT10k.

Pokaż: hero, sekwencję ładowania (kilka klatek), główny ekran działki ze sceną 3D i panelem wyniku (stan suszy i stan po kliknięciu rekomendacji), widok mobilny i stronę raportu A4. Do kluczowych animacji dodaj krótkie opisy ruchu (timing, easing).
