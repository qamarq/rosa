import { cropLabel } from "@/lib/crops"
import type {
  Analysis,
  AnalysisRequest,
  Cause,
  ConfidenceLevel,
  DataSource,
  DroughtLevel,
  Recommendation,
  SourceStatus,
} from "@/lib/types"
import { formatDatePl } from "@/lib/validation"
import type { ParcelRecord } from "@/server/sources/parcel"
import type { SoilCategory } from "@/server/sources/soil"
import type { TerrainSummary } from "@/server/sources/terrain"
import { CROP_PROFILES, MONTHS_GEN_PL } from "./crop-profiles"
import type { BalanceResult } from "./water-balance"

export type EngineInput = {
  id: string
  request: AnalysisRequest
  parcel: ParcelRecord
  balance: BalanceResult
  soil: SoilCategory | null
  terrain: TerrainSummary | null
  failed: { soil: boolean; terrain: boolean }
  fetchedAt: string
  historyYears: number
}

const LEVEL_LABELS: Record<DroughtLevel, string> = {
  1: "Mokro",
  2: "W normie",
  3: "Susza umiarkowana",
  4: "Susza silna",
  5: "Susza ekstremalna",
}

const SOIL_SHIFT: Record<number, number> = { 1: -0.3, 2: -0.15, 3: 0, 4: 0.15, 5: 0.1 }

const NON_AGRICULTURAL_LAND_USE = /^(Ls|Lz|W|Wp|Ws|Wsr|B|Ba|Bi|Bp|Bz|dr|Tk|Ti|Tp|N)\b/

function minus(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : `${n}`
}

function droughtLevel(z: number): DroughtLevel {
  if (z >= 0.8) return 1
  if (z > -0.5) return 2
  if (z > -1.0) return 3
  if (z > -1.6) return 4
  return 5
}

function capitalize(s: string): string {
  return s.charAt(0).toLocaleUpperCase("pl-PL") + s.slice(1)
}

function round5(n: number): number {
  return Math.round(n / 5) * 5
}

export function buildAnalysis(input: EngineInput): Analysis {
  const { request, parcel, balance, soil, terrain, historyYears } = input
  const month = Number(request.date.slice(5, 7))
  const year = Number(request.date.slice(0, 4))
  const crop = CROP_PROFILES[request.crop]
  const cropName = cropLabel(request.crop)
  const fetched = formatDatePl(input.fetchedAt)
  const W = balance.windowDays
  const zSoil = balance.z + (soil ? (SOIL_SHIFT[soil.code] ?? 0) : 0)
  const level = droughtLevel(zSoil)
  const dry = balance.precipDeficitPct <= -15
  const wet = balance.precipDeficitPct >= 20
  const hot = balance.tmaxAnomaly >= 1.5
  const inCritical = crop.critical.includes(month)
  const agricultural = soil ? soil.agricultural : !NON_AGRICULTURAL_LAND_USE.test(parcel.landUse ?? "")

  const headline = hot && dry ? "Upał, bez deszczu" : dry ? "Mało deszczu" : hot ? "Upał" : wet ? "Dużo deszczu" : "Pogoda w normie"
  const precipPhrase =
    balance.precipDeficitPct <= -10
      ? `Od ${W} dni spadło ${Math.abs(balance.precipDeficitPct)}% mniej deszczu niż zwykle`
      : balance.precipDeficitPct >= 10
        ? `Od ${W} dni spadło ${balance.precipDeficitPct}% więcej deszczu niż zwykle`
        : `Opady z ostatnich ${W} dni są blisko normy`
  const summary = precipPhrase + (hot ? ", a upał przyspiesza parowanie." : level >= 3 && !dry ? ", ale parowanie było większe niż zwykle." : ".")

  const yearsShown = [...balance.previous.slice(-(historyYears - 1)), balance.current]
  const history = {
    deficitYears: yearsShown.filter((w) => w.balance - balance.normal.balance < -0.5 * balance.normal.balanceSd).length,
    totalYears: yearsShown.length,
    riskMonths: balance.riskMonths,
    windowLabel: `Opad minus parowanie, ${W} dni przed ${request.date.slice(8, 10)}.${request.date.slice(5, 7)}, względem średniej`,
    years: yearsShown.map((w) => ({ year: w.year, balanceMm: Math.round(w.balance - balance.normal.balance) })),
    source: `Open-Meteo (ERA5), ${yearsShown[0]?.year ?? year - historyYears}–${year} · pobrano ${fetched} · CC BY 4.0`,
  }

  const causes: Cause[] = []
  if (balance.precipDeficitPct <= -15) {
    causes.push({
      id: "opady",
      kind: "opady",
      value: `${minus(balance.precipDeficitMm)} mm`,
      title: "Mniej deszczu niż zwykle",
      detail: `Od ${W} dni o ${Math.abs(balance.precipDeficitPct)}% mniej opadów niż średnio w tym okresie w latach ${balance.previous[0]?.year}–${year - 1}.`,
      source: "Open-Meteo (ERA5)",
    })
  }
  if (hot) {
    causes.push({
      id: "upal",
      kind: "upal",
      value: `+${balance.tmaxAnomaly.toLocaleString("pl-PL")} °C`,
      title: "Upał przyspiesza parowanie",
      detail: `Temperatura maksymalna była średnio o ${balance.tmaxAnomaly.toLocaleString("pl-PL")} °C wyższa niż zwykle, a z pola wyparowało ok. ${Math.round(balance.current.et0)} mm wody.`,
      source: "Open-Meteo (ERA5)",
    })
  }
  if (soil && soil.agricultural && soil.susceptibility) {
    const detail: Record<string, string> = {
      "bardzo wysoka": "Bardzo słabo trzyma wodę, susza pojawia się tu najwcześniej.",
      wysoka: "Słabo trzyma wodę, szybko przesycha.",
      średnia: "Średnio trzyma wodę.",
      niska: "Dobrze trzyma wodę, susza dotyka ją później niż lżejsze gleby.",
      organiczna: "Przesuszona gleba organiczna traci wodę trwale (murszeje).",
    }
    causes.push({
      id: "gleba",
      kind: "gleba",
      value: soil.susceptibility === "organiczna" ? "Organiczna" : capitalize(soil.susceptibility),
      title: soil.texture,
      detail: `${detail[soil.susceptibility]} Podatność na suszę wg IUNG: ${soil.susceptibility === "organiczna" ? "gleba organiczna" : soil.susceptibility}.`,
      source: "IUNG-PIB",
    })
  }
  if (terrain && terrain.slopePct >= 1) {
    causes.push({
      id: "spadek",
      kind: "spadek",
      value: `${terrain.slopePct.toLocaleString("pl-PL")}%`,
      title: terrain.slopePct >= 3 ? "Woda szybko spływa" : "Woda spływa po polu",
      detail: `Pole opada w kierunku: ${terrain.downslope} (różnica wysokości ${terrain.reliefM.toLocaleString("pl-PL")} m), więc część deszczu ucieka z działki.`,
      source: "GUGiK NMT",
    })
  }
  if (inCritical && level >= 3 && agricultural) {
    causes.push({
      id: "uprawa",
      kind: "uprawa",
      value: MONTHS_GEN_PL[month - 1],
      title: `${cropName}: okres krytyczny`,
      detail: `To okres ${crop.criticalLabel}, kiedy ${cropName.toLocaleLowerCase("pl-PL")} najbardziej potrzebuje wody.`,
      source: "FAO-56, wiedza agronomiczna",
    })
  }

  const recs: Recommendation[] = []
  const soilWhy = soil?.agricultural && soil.susceptibility
    ? `${soil.texture}: podatność na suszę ${soil.susceptibility === "organiczna" ? "jak dla gleb organicznych" : soil.susceptibility} (IUNG-PIB).`
    : null
  if (terrain && terrain.slopePct >= 1.5) {
    recs.push({
      id: "zatrzymaj-splyw",
      group: "woda",
      title: "Zatrzymaj wodę w dolnej części pola",
      text: `Woda spływa na ${terrain.downslope}. W najniższym miejscu działki zatrzymaj ją: pas zieleni, płytkie zagłębienie albo niski wał w poprzek spadku.`,
      when: "Przed jesiennymi i wiosennymi opadami",
      sceneMode: "zastawka",
      sceneCaption: "Woda zatrzymana w obniżeniu wsiąka w pole zamiast z niego odpływać.",
      why: [
        `Pole opada o ok. ${terrain.slopePct.toLocaleString("pl-PL")}% na ${terrain.downslope}, różnica wysokości to ${terrain.reliefM.toLocaleString("pl-PL")} m (GUGiK NMT).`,
        ...(soilWhy ? [soilWhy] : []),
      ],
      note: "Przed pracami przy rowach lub ciekach zapytaj spółkę wodną albo Wody Polskie, czy potrzebna jest zgoda.",
    })
  }
  if (soil?.code === 5) {
    recs.push({
      id: "woda-gruntowa",
      group: "woda",
      title: "Utrzymuj wysoki poziom wody gruntowej",
      text: "Gleba organiczna nie może przeschnąć. Zastawki na rowach odpływowych zatrzymają wodę w profilu glebowym.",
      when: "Wiosną, zanim woda odpłynie",
      sceneMode: "zastawka",
      sceneCaption: "Zastawka podnosi wodę w rowie, więc gleba organiczna nie przesycha.",
      why: ["Przesuszona gleba organiczna murszeje i traci zdolność zatrzymywania wody (IUNG-PIB)."],
      note: "Budowa zastawki może wymagać zgody wodnoprawnej.",
    })
  }
  if (agricultural && request.crop !== "laka") {
    const light = soil ? soil.code <= 2 : false
    if (light || level >= 3) {
      recs.push({
        id: "miedzyplon",
        group: "gleba",
        title: "Międzyplon po zbiorze",
        text: `${crop.afterHarvest} wysiej międzyplon: okryje glebę, ograniczy parowanie i poprawi strukturę.`,
        when: crop.afterHarvest,
        sceneMode: "miedzyplon",
        sceneCaption: "Siewnik wysiewa międzyplon, a rośliny okrywają gołą glebę.",
        why: [
          ...(soilWhy ? [soilWhy] : []),
          `Deficyt wody w tym okresie wystąpił tu w ${history.deficitYears} z ${history.totalYears} lat (Open-Meteo ERA5).`,
        ],
      })
    }
    recs.push({
      id: "resztki",
      group: "gleba",
      title: "Zostaw resztki pożniwne",
      text: "Rozdrobnione resztki zostaw na polu jako ściółkę.",
      when: "Przy zbiorze",
      sceneMode: "miedzyplon",
      sceneCaption: "Resztki na polu osłaniają glebę przed słońcem i wiatrem.",
      why: [
        "Ściółka osłania glebę przed słońcem i wiatrem, więc mniej wody paruje.",
        ...(terrain && terrain.slopePct >= 1 ? [`Na spadku ${terrain.slopePct.toLocaleString("pl-PL")}% resztki spowalniają spływ wody po deszczu (GUGiK NMT).`] : []),
      ],
    })
    if (!soil || soil.code <= 3) {
      recs.push({
        id: "orka",
        group: "gleba",
        title: "Ogranicz orkę",
        text: "Zamiast głębokiej orki wybierz uprawę uproszczoną.",
        when: "Jesień",
        sceneMode: "miedzyplon",
        sceneCaption: "Mniej orki to mniej przesuszonej wierzchniej warstwy gleby.",
        why: ["Każda orka przesusza wierzchnią warstwę gleby.", ...(soilWhy ? [soilWhy] : [])],
      })
    }
  }
  if (request.crop === "laka" && agricultural) {
    recs.push({
      id: "koszenie",
      group: "gleba",
      title: "Nie koś za nisko",
      text: "Zostaw ok. 7–8 cm runi. Wyższa darń osłania glebę i szybciej odrasta po suszy.",
      when: "Przy każdym pokosie",
      sceneMode: "miedzyplon",
      sceneCaption: "Wyższa ruń osłania glebę przed wysychaniem.",
      why: ["Niskie koszenie odsłania glebę i zwiększa parowanie."],
    })
  }
  const kc = crop.kc[month]
  if (agricultural && level >= 3 && kc) {
    const etc = balance.last7.et0 * kc
    const dose = Math.min(35, Math.max(15, round5(etc - balance.last7.precip)))
    recs.push({
      id: "nawadnianie",
      group: "irr",
      title: `Nawadnianie ok. ${dose} mm`,
      text: `Jeśli masz dostęp do wody, podlej pole jedną dawką ok. ${dose} mm.`,
      when: "W ciągu 7 dni",
      sceneMode: "nawadnianie",
      sceneCaption: `Zraszacz podaje ok. ${dose} mm wody na pole.`,
      why: [
        `W ostatnich 7 dniach ${cropName.toLocaleLowerCase("pl-PL")} zużyła ok. ${Math.round(etc)} mm wody, a spadło ${Math.round(balance.last7.precip)} mm (Open-Meteo ERA5, FAO-56).`,
        ...(inCritical ? [`To okres ${crop.criticalLabel}, kiedy uprawa najbardziej potrzebuje wody.`] : []),
      ],
      note: "Pobór wody do nawadniania może wymagać zgody wodnoprawnej.",
    })
  }

  const unknowns = [
    "Dane pogodowe pochodzą z siatki ok. 9 km, a nie ze stacji na Twoim polu.",
    "Zdjęć satelitarnych (kondycji roślin) jeszcze nie analizujemy w tej wersji.",
    "Rowów i cieków przy działce jeszcze nie sprawdzamy.",
    "Nie znamy poziomu wód gruntowych pod działką.",
  ]
  if (!soil) unknowns.push(input.failed.soil ? "Mapa gleb IUNG nie odpowiedziała; ocena nie uwzględnia rodzaju gleby." : "Brak kategorii gleby IUNG dla tego miejsca.")
  if (!terrain) unknowns.push("Nie udało się pobrać wysokości terenu, więc nie oceniamy spływu wody.")
  if (!agricultural) unknowns.unshift(`W ewidencji to ${soil && !soil.agricultural ? soil.texture.toLocaleLowerCase("pl-PL") : "teren nierolniczy"}. Rekomendacje dotyczą upraw i mogą tu nie pasować.`)
  if (month <= 2 || month >= 11) unknowns.push("Poza sezonem wegetacji ocena suszy ma mniejsze znaczenie dla upraw.")

  const missing = (soil ? 0 : 1) + (terrain ? 0 : 1)
  const confidence: ConfidenceLevel = missing === 0 ? "srednia" : missing === 1 ? "srednia" : "niska"

  const sources: DataSource[] = [
    { key: "pogoda", name: "Open-Meteo (ERA5)", what: `opady, parowanie i temperatura ${history.years[0]?.year ?? year}–${year}`, license: "CC BY 4.0", fetchedAt: input.fetchedAt },
    { key: "gleba", name: "IUNG-PIB", what: "kategoria podatności gleby na suszę", license: "dane publiczne IUNG-PIB (do potwierdzenia)", fetchedAt: input.fetchedAt },
    { key: "teren", name: "GUGiK (EGiB, NMT)", what: "granice działki i wysokości terenu", license: "dane otwarte GUGiK", fetchedAt: input.fetchedAt },
  ]
  const sourceStatus: SourceStatus[] = [
    { key: "pogoda", label: "Pogoda · 10 lat", ok: true },
    { key: "satelita", label: "Sentinel-2", ok: false, message: "Analiza zdjęć satelitarnych będzie dostępna wkrótce." },
    { key: "gleba", label: "Gleba", ok: !!soil, message: soil ? undefined : "Mapa gleb IUNG nie odpowiedziała." },
    { key: "teren", label: "Teren (NMT)", ok: !!terrain, message: terrain ? undefined : "Brak danych wysokościowych." },
    { key: "hydrologia", label: "Hydrologia", ok: false, message: "Rowy i cieki dodamy wkrótce." },
  ]

  return {
    id: input.id,
    request,
    cropLabel: cropName,
    parcel: { id: parcel.id, obreb: parcel.obreb, gmina: parcel.gmina, wojewodztwo: parcel.wojewodztwo, areaHa: parcel.areaHa },
    status: {
      level,
      label: LEVEL_LABELS[level],
      summary,
      windowDays: W,
      precipDeficitMm: balance.precipDeficitMm,
      precipDeficitPct: balance.precipDeficitPct,
      headline,
      source: `Open-Meteo (ERA5), siatka ok. 9 km · pobrano ${fetched} · CC BY 4.0`,
    },
    history,
    causes: causes.slice(0, 4),
    vegetation: null,
    recommendations: recs,
    confidence: { level: confidence, unknowns },
    sources,
    sourceStatus,
    generatedAt: new Date().toISOString(),
  }
}
