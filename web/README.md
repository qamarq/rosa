# ROSA web

Frontend ROSA (Next.js 16, App Router, Tailwind v4, shadcn/ui na base-ui). Na razie działa na danych przykładowych (mock), ale z docelowym kontraktem API.

## Uruchomienie

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build && pnpm start
```

## Struktura

- `src/app/page.tsx`: start (numer działki, uprawa, dzień analizy)
- `src/app/analiza`: ładowanie jako opowieść (~4,5 s), potem przekierowanie do wyniku
- `src/app/dzialka/[id]`: wynik (scena + 5 sekcji, kliknięcie rekomendacji zmienia scenę)
- `src/app/raport/[id]`: raport A4 do druku/PDF (`?druk=1` otwiera okno drukowania)
- `src/app/api/analyses`: `POST` (analiza) i `GET /api/analyses/[id]`
- `src/components/diorama`: izometryczna scena SVG z trybami `hero | susza | zastawka | miedzyplon | nawadnianie`
- `src/lib/types.ts`: kontrakt `Analysis`; `src/lib/analysis-service.ts`: miejsce, w którym mock zostanie zastąpiony prawdziwym backendem
- Designy źródłowe: `../docs/design/`

## Mock

- Każdy poprawny numer działki zwraca dane przykładowe z Mórki (`src/lib/mock/morka.ts`).
- Numer kończący się na `.9999` zwraca „działka nie znaleziona”.
- Identyfikator analizy: `<numer działki>~<uprawa>~<RRRR-MM-DD>`.

## Tryb lekki

Przełącznik w nagłówku; włącza się sam przy `prefers-reduced-motion` albo wolnym łączu. Scena jest wtedy statyczna, a wynik bez zmian.
