# Walidacja oceny suszy względem SMSR IUNG-PIB

Data: 21.11.2026. Skrypt: `web/scripts/validate-iung.mjs` (uruchomienie: `cd web && SAMPLE=40 node scripts/validate-iung.mjs`).

## Metoda

- **Wzorzec**: wykazy gmin z zagrożeniem suszą rolniczą publikowane przez IUNG-PIB (https://susza.iung.pulawy.pl/wykazy/), dla 14 okresów sześciodekadowych (21.III–30.IX), upraw i kategorii gleb I–IV, zgodnie z Rozporządzeniem MRiRW z 11.04.2019.
- **Próba**: 39 losowo wybranych gmin z całej Polski, lata 2020–2025, uprawy: zboża ozime, zboża jare, kukurydza na ziarno, ziemniak, rzepak, burak cukrowy. Razem **53 346** par (gmina, rok, okres, uprawa, kategoria gleby). IUNG wskazał suszę w 4% z nich.
- **Nasza ocena**: klimatyczny bilans wodny (KBW) = opad − k × ET0 Hargreavesa z 60 dni, z 5 najbliższych stacji opadowych i 4 temperaturowych IMGW (ważenie 1/d²), porównany z progiem IUNG dla uprawy i kategorii gleby. Susza = KBW poniżej progu.
- **Kalibracja**: współczynnik k (korekta Hargreavesa do metody Penmana stosowanej przez IUNG) dobrany na siatce 0,50–1,20.

## Wyniki

| k | trafność | precyzja | czułość | F1 |
|---|---|---|---|---|
| 0,85 | 96,8% | 0,91 | 0,24 | 0,37 |
| 0,90 | 97,3% | 0,84 | 0,41 | 0,55 |
| **0,95** | **97,4%** | **0,72** | **0,60** | **0,65** |
| 1,00 | 96,5% | 0,55 | 0,75 | 0,64 |
| 1,05 | 94,5% | 0,41 | 0,87 | 0,56 |

Przyjęto **k = 0,95** (`web/src/server/analysis/calibration.ts`).

Trafność sama w sobie mało mówi (odpowiedź „nigdy nie ma suszy” daje 96%), dlatego kalibrujemy według F1: przy k = 0,95 wykrywamy 60% przypadków suszy wskazanych przez IUNG, a 72% naszych alarmów pokrywa się z IUNG.

## Ograniczenia walidacji i dalsze kroki

- IUNG liczy KBW z innego zestawu stacji i metodą Penmana; my z interpolacji 5 stacji i Hargreavesa. Rozbieżności skupiają się przy wartościach blisko progu.
- Losowa próba 39 gmin; warto powtórzyć na wszystkich gminach i osobno dla każdego roku i regionu.
- Możliwe ulepszenia: ET0 metodą Penmana-Monteitha ze stacji synoptycznych (wiatr, wilgotność, usłonecznienie z danych terminowych IMGW), kalibracja k osobno dla miesięcy.

## Surowe wyniki

```json
{
 "gminas": 39,
 "observations": 53346,
 "droughtShare": 0.04,
 "best": {
  "k": 0.95,
  "acc": 97.4,
  "precision": 0.72,
  "recall": 0.6,
  "f1": 0.65
 },
 "results": [
  {
   "k": 0.5,
   "acc": 96,
   "precision": 0,
   "recall": 0,
   "f1": 0
  },
  {
   "k": 0.55,
   "acc": 96,
   "precision": 0,
   "recall": 0,
   "f1": 0
  },
  {
   "k": 0.6,
   "acc": 96,
   "precision": 0,
   "recall": 0,
   "f1": 0
  },
  {
   "k": 0.65,
   "acc": 96,
   "precision": 1,
   "recall": 0,
   "f1": 0
  },
  {
   "k": 0.7,
   "acc": 96,
   "precision": 1,
   "recall": 0.01,
   "f1": 0.02
  },
  {
   "k": 0.75,
   "acc": 96.1,
   "precision": 1,
   "recall": 0.05,
   "f1": 0.09
  },
  {
   "k": 0.8,
   "acc": 96.4,
   "precision": 0.95,
   "recall": 0.12,
   "f1": 0.21
  },
  {
   "k": 0.85,
   "acc": 96.8,
   "precision": 0.91,
   "recall": 0.24,
   "f1": 0.37
  },
  {
   "k": 0.9,
   "acc": 97.3,
   "precision": 0.84,
   "recall": 0.41,
   "f1": 0.55
  },
  {
   "k": 0.95,
   "acc": 97.4,
   "precision": 0.72,
   "recall": 0.6,
   "f1": 0.65
  },
  {
   "k": 1,
   "acc": 96.5,
   "precision": 0.55,
   "recall": 0.75,
   "f1": 0.64
  },
  {
   "k": 1.05,
   "acc": 94.5,
   "precision": 0.41,
   "recall": 0.87,
   "f1": 0.56
  },
  {
   "k": 1.1,
   "acc": 91,
   "precision": 0.3,
   "recall": 0.93,
   "f1": 0.46
  },
  {
   "k": 1.15,
   "acc": 86.6,
   "precision": 0.23,
   "recall": 0.96,
   "f1": 0.37
  },
  {
   "k": 1.2,
   "acc": 81.2,
   "precision": 0.17,
   "recall": 0.98,
   "f1": 0.3
  }
 ]
}
```
