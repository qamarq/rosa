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
import type { RecentCoverage, RecentWeather, WeatherStation } from "@/server/sources/meteo"
import type { GroundwaterReading } from "@/server/sources/groundwater"
import type { HydroSummary } from "@/server/sources/hydro"
import type { RiverSummary } from "@/server/sources/rivers"
import type { SatelliteResult } from "@/server/sources/satellite"
import type { SoilCategory } from "@/server/sources/soil"
import type { TerrainSummary } from "@/server/sources/terrain"
import { CROP_PROFILES, MONTHS_PL, expectedNdvi, NDVI_SEASON_MIN, type CropProfile } from "./crop-profiles"
import { iungAssessment } from "./iung-thresholds"
import type { BalanceResult } from "./water-balance"

export type EngineInput = {
  id: string
  request: AnalysisRequest
  parcel: ParcelRecord
  balance: BalanceResult
  weather: { stations: WeatherStation[]; recent: RecentWeather }
  soil: SoilCategory | null
  terrain: TerrainSummary | null
  hydro: HydroSummary | null
  rivers: RiverSummary | null
  groundwater: GroundwaterReading | null
  failed: { soil: boolean; terrain: boolean; hydro: boolean; rivers: boolean; groundwater: boolean }
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

const IMGW_LICENSE =
  "Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy. Dane Instytutu Meteorologii i Gospodarki Wodnej – Państwowego Instytutu Badawczego zostały przetworzone."

const SOIL_SHIFT: Record<number, number> = { 1: -0.3, 2: -0.15, 3: 0, 4: 0.15, 5: 0.1 }

const NON_AGRICULTURAL_LAND_USE = /^(Ls|Lz|W|Wp|Ws|Wsr|B|Ba|Bi|Bp|Bz|dr|Tk|Ti|Tp|N)\b/

const USED_VERB: Record<CropProfile["gender"], string> = { m: "zużył", f: "zużyła", n: "zużyło", pl: "zużyły" }

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

function daysSpan(c: RecentCoverage): string {
  if (c.from === c.to) return `dzień ${formatDatePl(c.from)}`
  const span = Math.round((Date.parse(c.to) - Date.parse(c.from)) / 86400000) + 1
  return c.days === span ? `dni od ${formatDatePl(c.from)} do ${formatDatePl(c.to)}` : `${c.days} dni z okresu ${formatDatePl(c.from)}–${formatDatePl(c.to)}`
}

function km(n: number): string {
  return `${n.toLocaleString("pl-PL")} km`
}

function metres(n: number): string {
  return `${n.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} m`
}

export function buildAnalysis(input: EngineInput): Analysis {
  const { request, parcel, balance, soil, terrain, historyYears, weather, hydro, groundwater } = input
  const ditchClose = hydro?.ditchM != null && hydro.ditchM <= 30
  const river = input.rivers?.reading ?? null
  const riverName = river ? (river.river ? `rzeki ${river.river}` : "wody") : ""
  const riverPct = river ? Math.min(99, Math.max(1, Math.round(river.percentile * 100))) : 0
  const gwPoint = groundwater ? `${groundwater.place ? `${groundwater.place}, ` : ""}${km(groundwater.distanceKm)}` : ""
  const gwWhen = groundwater?.measuredAt ? `pomiar ${formatDatePl(groundwater.measuredAt)}` : "data pomiaru nieznana"
  const gwShallow = !!groundwater?.unconfined && groundwater.depthM <= 1.5

  const nearest = weather.stations[0]
  const stationNames = weather.stations.slice(0, 3).map((s) => `${s.name.charAt(0)}${s.name.slice(1).toLocaleLowerCase("pl-PL")} (${s.distanceKm.toLocaleString("pl-PL")} km)`).join(", ")
  const meteoSource = weather.recent.openMeteo ? "IMGW-PIB, Open-Meteo" : "IMGW-PIB"
  const month = Number(request.date.slice(5, 7))
  const year = Number(request.date.slice(0, 4))
  const crop = CROP_PROFILES[request.crop]
  const cropName = cropLabel(request.crop)
  const fetched = formatDatePl(input.fetchedAt)
  const W = balance.windowDays
  const zSoil = balance.z + (soil ? (SOIL_SHIFT[soil.code] ?? 0) : 0)
  const kbw = Math.round(balance.current.precip - balance.current.et0)
  const iung = soil?.agricultural ? iungAssessment(request.crop, soil.code, request.date) : null
  const iungThreshold = iung?.reason === "ok" ? iung.threshold : null
  const level: DroughtLevel =
    iungThreshold !== null
      ? kbw < iungThreshold
        ? kbw / iungThreshold >= 1.35
          ? 5
          : kbw / iungThreshold >= 1.15
            ? 4
            : 3
        : balance.z >= 0.8
          ? 1
          : 2
      : droughtLevel(zSoil)
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
  const kbwSentence =
    iungThreshold !== null
      ? ` Bilans wodny z ${W} dni: ${minus(kbw)} mm, a próg suszy IUNG dla ${iung!.cropLabel} na glebie kat. ${iung!.soilCategory} to ${minus(iungThreshold)} mm.`
      : ""
  const summary = precipPhrase + (hot ? ", a upał przyspiesza parowanie." : level >= 3 && !dry ? ", ale parowanie było większe niż zwykle." : ".") + kbwSentence

  const yearsShown = [...balance.previous.slice(-(historyYears - 1)), balance.current]
  const history = {
    deficitYears: yearsShown.filter((w) => w.balance - balance.normal.balance < -0.5 * balance.normal.balanceSd).length,
    totalYears: yearsShown.length,
    riskMonths: balance.riskMonths,
    windowLabel: `Opad minus parowanie, ${W} dni przed ${request.date.slice(8, 10)}.${request.date.slice(5, 7)}, względem średniej`,
    years: yearsShown.map((w) => ({ year: w.year, balanceMm: Math.round(w.balance - balance.normal.balance) })),
    source: `${meteoSource}, stacje: ${stationNames} · ${yearsShown[0]?.year ?? year - historyYears}–${year} · pobrano ${fetched}`,
  }

  const causes: Cause[] = []
  if (balance.precipDeficitPct <= -15) {
    causes.push({
      id: "opady",
      kind: "opady",
      value: `${minus(balance.precipDeficitMm)} mm`,
      title: "Mniej deszczu niż zwykle",
      detail: `Od ${W} dni o ${Math.abs(balance.precipDeficitPct)}% mniej opadów niż średnio w tym okresie w latach ${balance.previous[0]?.year}–${year - 1}.`,
      source: meteoSource,
    })
  }
  if (hot) {
    causes.push({
      id: "upal",
      kind: "upal",
      value: `+${balance.tmaxAnomaly.toLocaleString("pl-PL")} °C`,
      title: "Upał przyspiesza parowanie",
      detail: `Temperatura maksymalna była średnio o ${balance.tmaxAnomaly.toLocaleString("pl-PL")} °C wyższa niż zwykle, a z pola wyparowało ok. ${Math.round(balance.current.et0)} mm wody.`,
      source: meteoSource,
    })
  }
  if (river && river.percentile <= 0.15) {
    causes.push({
      id: "rzeka",
      kind: "rzeka",
      value: `${Math.max(5, Math.ceil(river.percentile * 20) * 5)}% najniższych`,
      title: "Niski stan rzeki",
      detail: `Stan ${riverName} na wodowskazie ${river.gauge} (${km(river.distanceKm)}) to ${river.levelCm} cm (${formatDatePl(river.day)}). Tak nisko bywało w tej porze roku tylko w ok. ${riverPct}% dni z ${river.sampleYears} poprzednich lat.`,
      source: "IMGW-PIB (dane hydrologiczne)",
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
  if (groundwater?.unconfined && groundwater.depthM >= 5 && level >= 3) {
    causes.push({
      id: "gruntowe",
      kind: "gruntowe",
      value: metres(groundwater.depthM),
      title: "Wody gruntowe głęboko",
      detail: `W najbliższym punkcie monitoringu PIG-PIB (${gwPoint}) woda gruntowa jest ${metres(groundwater.depthM)} pod terenem (ostatni ${gwWhen}). Korzenie upraw tam nie sięgają, więc rośliny zależą od deszczu.`,
      source: "PIG-PIB",
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
      value: capitalize(MONTHS_PL[month - 1]),
      title: `${cropName}: okres krytyczny`,
      detail: `To okres ${crop.criticalLabel}, kiedy ${crop.noun} najbardziej ${crop.gender === "pl" ? "potrzebują" : "potrzebuje"} wody.`,
      source: "FAO-56, wiedza agronomiczna",
    })
  }

  const recs: Recommendation[] = []
  const soilWhy = soil?.agricultural && soil.susceptibility
    ? `${soil.texture}: podatność na suszę ${soil.susceptibility === "organiczna" ? "jak dla gleb organicznych" : soil.susceptibility} (IUNG-PIB).`
    : null
  if (ditchClose && hydro) {
    const ditchName = hydro.features.find((f) => f.kind === "rów" || f.kind === "kanał")
    recs.push({
      id: "zastawka",
      group: "woda",
      title: ditchName?.kind === "kanał" ? "Zastawka na kanale przy polu" : "Zastawka na rowie melioracyjnym",
      text: `Postaw zastawkę na ${ditchName?.kind === "kanał" ? "kanale" : "rowie"}${hydro.ditchSide ? ` przy ${hydro.ditchSide} granicy` : " przy działce"}, żeby woda nie uciekała z pola.`,
      when: "Jak najszybciej, przed kolejnymi opadami",
      sceneMode: "zastawka",
      sceneCaption: "Zastawka podnosi wodę w rowie, więc wsiąka ona w pole zamiast odpływać.",
      why: [
        `${ditchName?.kind === "kanał" ? "Kanał" : "Rów melioracyjny"} biegnie ${hydro.ditchM != null && hydro.ditchM <= 2 ? "tuż przy działce" : `ok. ${hydro.ditchM} m od działki`}${hydro.ditchSide ? `, po stronie ${hydro.ditchSide}` : ""} (BDOT10k).`,
        ...(terrain && terrain.slopePct >= 1 ? [`Pole opada o ok. ${terrain.slopePct.toLocaleString("pl-PL")}% na ${terrain.downslope} (GUGiK NMT).`] : []),
        ...(soilWhy ? [soilWhy] : []),
        ...(gwShallow ? [`Woda gruntowa jest płytko: ${metres(groundwater!.depthM)} pod terenem w najbliższym punkcie monitoringu (${gwPoint}, ${gwWhen}, PIG-PIB), więc zatrzymana woda zostaje w zasięgu korzeni.`] : []),
      ],
      note: "Przed budową zapytaj spółkę wodną lub Wody Polskie, czy potrzebna jest zgoda.",
    })
  }
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
  const gwWhy = gwShallow
    ? `W najbliższym punkcie monitoringu PIG-PIB (${gwPoint}) woda gruntowa jest ${metres(groundwater!.depthM)} pod terenem (${gwWhen}); pod działką poziom może być inny.`
    : null
  if (soil?.code === 5) {
    recs.push({
      id: "woda-gruntowa",
      group: "woda",
      title: "Utrzymuj wysoki poziom wody gruntowej",
      text: "Gleba organiczna nie może przeschnąć. Zastawki na rowach odpływowych zatrzymają wodę w profilu glebowym.",
      when: "Wiosną, zanim woda odpłynie",
      sceneMode: "zastawka",
      sceneCaption: "Zastawka podnosi wodę w rowie, więc gleba organiczna nie przesycha.",
      why: ["Przesuszona gleba organiczna murszeje i traci zdolność zatrzymywania wody (IUNG-PIB).", ...(gwWhy ? [gwWhy] : [])],
      note: "Budowa zastawki może wymagać zgody wodnoprawnej.",
    })
  } else if (gwWhy && agricultural && !ditchClose && hydro?.ditchM != null && hydro.ditchM <= 150) {
    recs.push({
      id: "woda-gruntowa",
      group: "woda",
      title: "Utrzymuj wysoki poziom wody gruntowej",
      text: "Woda gruntowa jest tu płytko. Zastawka na pobliskim rowie odpływowym spowolni jej odpływ, żeby została w zasięgu korzeni.",
      when: "Wiosną, zanim woda odpłynie",
      sceneMode: "zastawka",
      sceneCaption: "Zastawka podnosi wodę w rowie, więc poziom wody gruntowej opada wolniej.",
      why: [gwWhy, `Najbliższy rów jest ok. ${hydro.ditchM} m od działki (BDOT10k).`],
      note: "Budowa zastawki może wymagać zgody wodnoprawnej i zgody właściciela rowu.",
    })
  }
  if (agricultural && !crop.perennial) {
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
          `Deficyt wody w tym okresie wystąpił tu w ${history.deficitYears} z ${history.totalYears} lat (${meteoSource}).`,
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
  if (agricultural && crop.perennial && request.crop !== "laka") {
    recs.push({
      id: "sciolka",
      group: "gleba",
      title: "Ściółka w rzędach, murawa w międzyrzędziach",
      text: "Wyściel rzędy ściółką (słoma, kora, zrębki), a międzyrzędzia utrzymuj jako niską, koszoną murawę.",
      when: "Wiosną, zanim gleba przeschnie",
      sceneMode: "miedzyplon",
      sceneCaption: "Okryta gleba w rzędach mniej paruje.",
      why: [
        "Ściółka osłania glebę przed słońcem i wiatrem, więc mniej wody paruje.",
        ...(terrain && terrain.slopePct >= 1 ? [`Na spadku ${terrain.slopePct.toLocaleString("pl-PL")}% murawa w międzyrzędziach spowalnia spływ wody po deszczu (GUGiK NMT).`] : []),
        ...(soilWhy ? [soilWhy] : []),
      ],
    })
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
        `W ostatnich 7 dniach ${crop.noun} ${USED_VERB[crop.gender]} ok. ${Math.round(etc)} mm wody, a spadło ${Math.round(balance.last7.precip)} mm (${meteoSource}, FAO-56).`,
        ...(inCritical ? [`To okres ${crop.criticalLabel}, kiedy uprawa najbardziej potrzebuje wody.`] : []),
        ...(hydro?.waterBodyM != null && hydro.waterBodyM <= 300 ? [`Najbliższy zbiornik wodny jest ok. ${hydro.waterBodyM} m od działki (BDOT10k).`] : []),
      ],
      note: "Pobór wody do nawadniania może wymagać zgody wodnoprawnej.",
    })
  }

  const unknowns = [
    `Pogodę liczymy z ${weather.stations.length} najbliższych stacji IMGW (najbliższa ${nearest ? nearest.distanceKm.toLocaleString("pl-PL") + " km" : "–"}), a nie z pomiaru na Twoim polu.`,
    "Parowanie liczymy metodą Hargreavesa (FAO-56) z temperatury; to przybliżenie.",
    ...(weather.recent.live ? [`Pogodę po końcu archiwum IMGW (${daysSpan(weather.recent.live)}) liczymy z bieżących pomiarów telemetrycznych IMGW; oficjalne archiwum może się od nich nieco różnić i zastąpi je po publikacji.`] : []),
    groundwater
      ? `Wody gruntowe znamy z najbliższego punktu monitoringu PIG-PIB (${km(groundwater.distanceKm)}) i z ostatniego pomiaru (${groundwater.measuredAt ? formatDatePl(groundwater.measuredAt) : "data nieznana"}), a nie z dnia analizy; pod działką poziom może być inny.`
      : input.failed.groundwater
        ? "Serwis PIG-PIB nie odpowiedział; nie znamy poziomu wód gruntowych pod działką."
        : "Brak punktu monitoringu wód podziemnych PIG-PIB w promieniu 20 km.",
  ]
  if (river) unknowns.push(`Stan rzeki to pomiar z najbliższego wodowskazu IMGW (${km(river.distanceKm)}); rzeka może odprowadzać wodę z innego obszaru niż Twoje pole.`)
  else if (input.failed.rivers) unknowns.push("Dane hydrologiczne IMGW nie odpowiedziały; stanu rzek nie oceniamy.")
  else if (!input.rivers?.gaugesNearby) unknowns.push("Brak wodowskazu IMGW w promieniu 25 km; stanu rzek nie oceniamy.")
  else unknowns.push(`Brak pomiaru z wodowskazów IMGW na ten dzień${input.rivers.archiveEnd ? ` (archiwum dobowe IMGW sięga do ${formatDatePl(input.rivers.archiveEnd)})` : ""}; stanu rzek nie oceniamy.`)
  if (river && river.percentile >= 0.85 && level >= 3) unknowns.push(`Stan ${riverName} na wodowskazie ${river.gauge} jest wysoki jak na tę porę roku mimo suszy na polu; rzeka może nieść wodę z dalszej, wilgotniejszej części zlewni.`)
  if (groundwater && !groundwater.unconfined) unknowns.push("Najbliższy punkt PIG-PIB mierzy wodę pod warstwą nieprzepuszczalną (zwierciadło napięte), więc nie mówi wiele o wodzie dostępnej dla korzeni.")
  if (!soil) unknowns.push(input.failed.soil ? "Mapa gleb IUNG nie odpowiedziała; ocena nie uwzględnia rodzaju gleby." : "Brak kategorii gleby IUNG dla tego miejsca.")
  if (!terrain) unknowns.push("Nie udało się pobrać wysokości terenu, więc nie oceniamy spływu wody.")
  if (!hydro) unknowns.push("Nie udało się sprawdzić rowów i cieków przy działce.")
  if (!agricultural) unknowns.unshift(`W ewidencji to ${soil && !soil.agricultural ? soil.texture.toLocaleLowerCase("pl-PL") : "teren nierolniczy"}. Rekomendacje dotyczą upraw i mogą tu nie pasować.`)
  if (month <= 2 || month >= 11) unknowns.push("Poza sezonem wegetacji ocena suszy ma mniejsze znaczenie dla upraw.")
  if (agricultural && iungThreshold === null) {
    unknowns.push(
      iung?.reason === "no-effect"
        ? "W tym okresie susza zwykle nie obniża plonów tej uprawy (IUNG), więc poziom liczymy względem średniej z 10 lat."
        : iung?.reason === "not-recommended"
          ? "Na tej kategorii gleby IUNG nie zaleca tej uprawy, więc poziom liczymy względem średniej z 10 lat."
          : "Poza okresem 21.III–30.IX lub dla tej uprawy IUNG nie wyznacza progu suszy; poziom liczymy względem średniej z 10 lat.",
    )
  }

  const missing = (soil ? 0 : 1) + (terrain ? 0 : 1) + (hydro ? 0 : 1)
  const confidence: ConfidenceLevel = missing === 0 && weather.stations[0] && weather.stations[0].distanceKm <= 15 ? "wysoka" : missing <= 1 ? "srednia" : "niska"

  const sources: DataSource[] = [
    { key: "pogoda", name: "IMGW-PIB", what: `dobowe opady i temperatury ze stacji: ${stationNames}`, license: IMGW_LICENSE, fetchedAt: input.fetchedAt },
    ...(weather.recent.live
      ? [{ key: "pogoda" as const, name: "IMGW-PIB (pomiary bieżące z API)", what: `doby zsumowane z pomiarów 10-minutowych stacji telemetrycznych, jeszcze poza archiwum IMGW: ${daysSpan(weather.recent.live)}`, license: IMGW_LICENSE, fetchedAt: input.fetchedAt }]
      : []),
    ...(weather.recent.openMeteo
      ? [{ key: "pogoda" as const, name: "Open-Meteo", what: `zapasowo, bez danych IMGW: ${daysSpan(weather.recent.openMeteo)}`, license: "CC BY 4.0", fetchedAt: input.fetchedAt }]
      : []),
    { key: "gleba", name: "IUNG-PIB", what: "kategoria podatności gleby na suszę", license: "dane publiczne IUNG-PIB (do potwierdzenia)", fetchedAt: input.fetchedAt },
    { key: "teren", name: "GUGiK (EGiB, NMT)", what: "granice działki i wysokości terenu", license: "dane otwarte GUGiK", fetchedAt: input.fetchedAt },
    { key: "hydrologia", name: "BDOT10k (GUGiK)", what: "rowy, cieki, kanały i zbiorniki w promieniu 500 m", license: "dane otwarte GUGiK", fetchedAt: input.fetchedAt },
    ...(river
      ? [{ key: "rzeki" as const, name: "IMGW-PIB (dane hydrologiczne)", what: `stan ${riverName} na wodowskazie ${river.gauge} (${km(river.distanceKm)}): ${river.levelCm} cm ${river.live ? "teraz" : `w dniu ${formatDatePl(river.day)}`}, ${riverPct}. percentyl dla tej pory roku (${river.sampleYears} lat pomiarów)`, license: IMGW_LICENSE, fetchedAt: input.fetchedAt }]
      : []),
    ...(groundwater
      ? [{ key: "gruntowe" as const, name: "PIG-PIB, monitoring wód podziemnych", what: `zwierciadło wód gruntowych${groundwater.unconfined ? "" : " (napięte)"} ${groundwater.depthM.toLocaleString("pl-PL")} m p.p.t. w punkcie ${groundwater.place || "bez nazwy"} (${km(groundwater.distanceKm)}), ${gwWhen}`, license: "dane PIG-PIB (Państwowa Służba Hydrogeologiczna), udostępniane publicznie", fetchedAt: input.fetchedAt }]
      : []),
  ]
  const sourceStatus: SourceStatus[] = [
    { key: "pogoda", label: "Pogoda · 10 lat", ok: true },
    { key: "satelita", label: "Sentinel-2", ok: true, pending: true, message: "Zdjęcie satelitarne wczytuje się w tle." },
    { key: "gleba", label: "Gleba", ok: !!soil, message: soil ? undefined : "Mapa gleb IUNG nie odpowiedziała." },
    { key: "teren", label: "Teren (NMT)", ok: !!terrain, message: terrain ? undefined : "Brak danych wysokościowych." },
    { key: "hydrologia", label: "Hydrologia", ok: !!hydro, message: hydro ? undefined : "Nie udało się sprawdzić rowów i cieków." },
    {
      key: "rzeki",
      label: "Rzeki (IMGW)",
      ok: !input.failed.rivers,
      message: river ? undefined : input.failed.rivers ? "Dane hydrologiczne IMGW nie odpowiedziały." : input.rivers?.gaugesNearby ? "Brak pomiaru z wodowskazów na ten dzień." : "Brak wodowskazu IMGW w promieniu 25 km.",
    },
    {
      key: "gruntowe",
      label: "Wody gruntowe",
      ok: !input.failed.groundwater,
      message: groundwater ? undefined : input.failed.groundwater ? "Serwis PIG-PIB nie odpowiedział." : "Brak punktu monitoringu PIG-PIB w promieniu 20 km.",
    },
  ]

  return {
    id: input.id,
    request,
    cropLabel: cropName,
    parcel: {
      id: parcel.id,
      obreb: parcel.obreb,
      gmina: parcel.gmina,
      wojewodztwo: parcel.wojewodztwo,
      areaHa: parcel.areaHa,
      ...(parcel.parcelIds.length > 1 ? { parcelIds: parcel.parcelIds } : {}),
    },
    status: {
      level,
      label: LEVEL_LABELS[level],
      summary,
      windowDays: W,
      precipDeficitMm: balance.precipDeficitMm,
      precipDeficitPct: balance.precipDeficitPct,
      headline,
      source: `${meteoSource}, najbliższa stacja ${nearest ? nearest.distanceKm.toLocaleString("pl-PL") + " km" : "–"}${iungThreshold !== null ? " · metoda: KBW i progi IUNG (Rozp. MRiRW z 11.04.2019)" : ""} · pobrano ${fetched}`,
    },
    history,
    causes: causes.slice(0, 4),
    vegetation: null,
    recommendations: recs,
    confidence: { level: confidence, unknowns },
    sources,
    sourceStatus,
    scene: { slopePct: terrain ? terrain.slopePct : null, ditchNearby: hydro ? hydro.ditchM !== null && hydro.ditchM <= 50 : null },
    generatedAt: new Date().toISOString(),
  }
}

const CONFIDENCE_ORDER: ConfidenceLevel[] = ["niska", "srednia", "wysoka"]

function assessVegetation(analysis: Analysis, satellite: SatelliteResult) {
  const crop = analysis.request.crop
  const expected = expectedNdvi(crop, satellite.imageDate)
  const month = MONTHS_PL[Number(satellite.imageDate.slice(5, 7)) - 1]
  const cropName = analysis.cropLabel.toLowerCase()
  const ndviPl = satellite.ndvi.toLocaleString("pl-PL")
  const expectedPl = expected.toLocaleString("pl-PL")
  if (expected < NDVI_SEASON_MIN) {
    return {
      expected,
      assessment: "poza-sezonem" as const,
      label: satellite.ndvi >= 0.5 ? "zielono" : "poza sezonem",
      note: `w tym okresie uprawa (${cropName}, ${month}) zwykle jeszcze lub już nie pokrywa pola (typowe NDVI ok. ${expectedPl}), więc zdjęcie nie ocenia jej kondycji.`,
    }
  }
  const ratio = satellite.ndvi / expected
  const assessment = ratio < 0.8 ? ("ponizej" as const) : ("norma" as const)
  return {
    expected,
    assessment,
    label: ratio < 0.65 ? "słaba" : ratio < 0.8 ? "osłabiona" : "dobra",
    note: `NDVI ${ndviPl} przy typowym ok. ${expectedPl} (${cropName}, ${month}).`,
  }
}

export function applySatellite(analysis: Analysis, satellite: SatelliteResult | null, failed: boolean): Analysis {
  const fetchedAt = new Date().toISOString().slice(0, 10)
  const ageDays = satellite ? Math.max(0, Math.round((Date.parse(analysis.request.date) - Date.parse(satellite.imageDate)) / 86400000)) : 0
  const assessed = satellite ? assessVegetation(analysis, satellite) : null
  const vegetation = satellite && assessed
    ? { ndvi: satellite.ndvi, label: assessed.label, imageDate: satellite.imageDate, imageAgeDays: ageDays, expected: assessed.expected, assessment: assessed.assessment, note: assessed.note }
    : null
  const baseLevel = analysis.confidence.baseLevel ?? analysis.confidence.level
  let level = baseLevel
  const causes = analysis.causes.filter((c) => c.kind !== "rosliny")
  const unknowns = analysis.confidence.unknowns.filter((u) => !u.includes("satelit") && !u.startsWith("NDVI"))
  const dry = analysis.status.level >= 3
  const noteBare = vegetation?.note?.replace(/\.$/, "") ?? ""
  if (!satellite) unknowns.push(failed ? "Zdjęcia satelitarne nie odpowiedziały na czas; kondycji roślin nie oceniamy." : "Brak bezchmurnego zdjęcia satelitarnego z 30 dni (dla starszych dat: 60 dni) przed datą analizy.")
  else if (vegetation) {
    if (ageDays > 10) unknowns.push(`Ostatnie bezchmurne zdjęcie satelitarne jest sprzed ${ageDays} dni.`)
    if (vegetation.assessment === "poza-sezonem") unknowns.push(`Zdjęcie satelitarne: ${vegetation.note}`)
    else if (vegetation.assessment === "ponizej" && dry) {
      causes.push({
        id: "rosliny",
        kind: "rosliny",
        value: `NDVI ${vegetation.ndvi.toLocaleString("pl-PL")}`,
        title: "Rośliny już reagują na brak wody",
        detail: `Zdjęcie satelitarne z ${formatDatePl(vegetation.imageDate)}: ${vegetation.note} Słabsza zieleń potwierdza niedobór wody na polu.`,
        source: "Copernicus Sentinel-2",
      })
      level = CONFIDENCE_ORDER[Math.min(2, CONFIDENCE_ORDER.indexOf(baseLevel) + 1)]
    } else if (vegetation.assessment === "ponizej") {
      unknowns.push(`Zdjęcie satelitarne pokazuje słabsze rośliny niż typowo (${noteBare}), choć bilans wodny tego nie tłumaczy: przyczyną może być np. inna uprawa niż wybrana, choroby lub nawożenie.`)
    } else if (dry) {
      unknowns.push(`Zdjęcie satelitarne pokazuje rośliny w normie mimo deficytu wody (${noteBare}): możliwe nawadnianie, głębokie korzenie albo początek suszy.`)
    }
  }
  return {
    ...analysis,
    vegetation,
    causes,
    confidence: { ...analysis.confidence, level, baseLevel, unknowns },
    sources: [
      ...analysis.sources.filter((s) => s.key !== "satelita"),
      ...(satellite
        ? [{ key: "satelita" as const, name: "Copernicus Sentinel-2", what: `kondycja roślin (NDVI), zdjęcie z ${formatDatePl(satellite.imageDate)}`, license: `zawiera zmodyfikowane dane Copernicus Sentinel, wolny dostęp${satellite.provider === "planetary-computer" ? " (archiwum: Microsoft Planetary Computer)" : " (Earth Search, Element 84)"}`, fetchedAt }]
        : []),
    ],
    sourceStatus: analysis.sourceStatus.map((s) =>
      s.key !== "satelita"
        ? s
        : { key: "satelita", label: "Sentinel-2", ok: !!satellite, message: satellite ? undefined : failed ? "Zdjęcia satelitarne nie odpowiedziały na czas." : "Brak bezchmurnego zdjęcia z 30–60 dni przed datą." },
    ),
  }
}
