import path from "node:path"
import { Document, Font, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer"
import type { ParcelScene, Ring } from "@/lib/scene3d"
import type { Analysis, Recommendation } from "@/lib/types"
import { formatDatePl, statusTitle } from "@/lib/validation"

const FONT_DIR = path.join(process.cwd(), "public", "fonts", "pdf")

let fontsReady = false
function registerFonts() {
  if (fontsReady) return
  Font.register({
    family: "Figtree",
    fonts: [400, 600, 700, 800].map((w) => ({ src: path.join(FONT_DIR, `Figtree-${w}.ttf`), fontWeight: w })),
  })
  Font.register({
    family: "Bricolage",
    fonts: [700, 800].map((w) => ({ src: path.join(FONT_DIR, `BricolageGrotesque-${w}.ttf`), fontWeight: w })),
  })
  Font.registerHyphenationCallback((word) => [word])
  fontsReady = true
}

const INK = "#2A2118"
const MUTED = "#5B4D3E"
const LINE = "#E3D3B8"
const TEAL = "#0E6E73"
const LEVEL_COLORS = ["#3FA3B0", "#6E9B3A", "#D9A52E", "#D9822F", "#A8432A"]
const GROUPS: { id: Recommendation["group"]; title: string }[] = [
  { id: "woda", title: "Zatrzymaj wodę" },
  { id: "gleba", title: "Zadbaj o glebę" },
  { id: "irr", title: "Nawadnianie (opcjonalnie)" },
]

const s = StyleSheet.create({
  page: { fontFamily: "Figtree", fontSize: 9.5, color: INK, paddingTop: 34, paddingBottom: 46, paddingHorizontal: 38, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: INK, paddingBottom: 8, marginBottom: 10 },
  brand: { fontFamily: "Bricolage", fontWeight: 800, fontSize: 22, color: TEAL, lineHeight: 1.15 },
  tagline: { fontSize: 8, color: MUTED },
  title: { fontFamily: "Bricolage", fontWeight: 800, fontSize: 15, textAlign: "right", lineHeight: 1.2, marginBottom: 2 },
  meta: { fontSize: 8, color: MUTED, textAlign: "right" },
  parcelLine: { fontSize: 9.5, marginBottom: 10 },
  bold: { fontWeight: 700 },
  row: { flexDirection: "row", gap: 14 },
  section: { marginBottom: 12 },
  h2: { fontFamily: "Bricolage", fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6, lineHeight: 1.2 },
  box: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 10 },
  levelBig: { fontFamily: "Bricolage", fontWeight: 800, fontSize: 26, lineHeight: 1.15 },
  small: { fontSize: 8, color: MUTED },
  card: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 8, flexGrow: 1, flexBasis: 0 },
  recTitle: { fontWeight: 700, fontSize: 10 },
  bullet: { flexDirection: "row", gap: 4, marginTop: 2 },
  note: { marginTop: 4, padding: 5, backgroundColor: "#FBF1DA", borderRadius: 4, fontSize: 8.5 },
  footer: { position: "absolute", bottom: 18, left: 38, right: 38, height: 14, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MUTED },
  th: { fontWeight: 700, fontSize: 8, borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 3 },
  td: { fontSize: 8, paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: LINE },
})

function ringPath(ring: Ring, tx: (x: number, y: number) => [number, number], close = true): string {
  return ring.map(([x, y], i) => { const [px, py] = tx(x, y); return `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}` }).join(" ") + (close ? " Z" : "")
}

function ParcelPlan({ scene, width, height }: { scene: ParcelScene; width: number; height: number }) {
  const pts = scene.parcel.flat()
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.9 || 200
  const k = Math.min(width, height) / span
  const tx = (x: number, y: number): [number, number] => [width / 2 + (x - cx) * k, height / 2 - (y - cy) * k]
  const inView = (r: Ring) => r.some(([x, y]) => Math.abs(x - cx) < span && Math.abs(y - cy) < span)
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={`M0 0 H${width} V${height} H0 Z`} fill="#FBF6EC" />
      {scene.neighbors.filter(inView).map((r, i) => <Path key={"n" + i} d={ringPath(r, tx)} fill="#F3E9D6" stroke="#CDBB9C" strokeWidth={0.5} />)}
      {scene.waterAreas.filter(inView).map((r, i) => <Path key={"a" + i} d={ringPath(r, tx)} fill="#BFE3E8" stroke="#3FA3B0" strokeWidth={0.6} />)}
      {scene.waterLines.filter((w) => inView(w.points)).map((w, i) => <Path key={"w" + i} d={ringPath(w.points, tx, false)} fill="none" stroke="#2F8FA0" strokeWidth={w.kind === "rów" ? 1.1 : 1.6} />)}
      {scene.parcel.map((r, i) => <Path key={"p" + i} d={ringPath(r, tx)} fill="#D9C38E" fillOpacity={0.75} stroke={INK} strokeWidth={1.6} />)}
      <Path d={`M${width - 14} 20 L${width - 10} 8 L${width - 6} 20 Z`} fill={INK} />
    </Svg>
  )
}

function RecCard({ r, n, nested = false }: { r: Recommendation; n: number | undefined; nested?: boolean }) {
  return (
    <View style={[s.box, { marginBottom: 5 }]} wrap={nested ? undefined : false}>
      <Text style={s.recTitle}>{n}. {r.title} <Text style={s.small}>· {r.when}</Text></Text>
      <Text>{r.text}</Text>
      {r.why.map((w, i) => (
        <View key={i} style={s.bullet}>
          <Text>•</Text>
          <Text style={{ flex: 1 }}>{w}</Text>
        </View>
      ))}
      {r.note && <Text style={s.note}>Uwaga: {r.note}</Text>}
    </View>
  )
}

function SourceRow({ src }: { src: Analysis["sources"][number] }) {
  return (
    <View style={{ flexDirection: "row" }} wrap={false}>
      <Text style={[s.td, { width: "24%", fontWeight: 700 }]}>{src.name}</Text>
      <Text style={[s.td, { width: "34%" }]}>{src.what}</Text>
      <Text style={[s.td, { width: "12%" }]}>{formatDatePl(src.fetchedAt)}</Text>
      <Text style={[s.td, { width: "30%" }]}>{src.license}</Text>
    </View>
  )
}

function HistoryBars({ analysis }: { analysis: Analysis }) {
  const years = analysis.history.years
  const max = Math.max(10, ...years.map((y) => Math.abs(y.balanceMm)))
  const current = Number(analysis.request.date.slice(0, 4))
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 70, marginTop: 4 }}>
      {years.map((y) => {
        const h = (Math.abs(y.balanceMm) / max) * 30
        const cur = y.year === current
        return (
          <View key={y.year} style={{ flexGrow: 1, flexBasis: 0, alignItems: "center" }}>
            <View style={{ height: 31, justifyContent: "flex-end" }}>
              {y.balanceMm > 0 && <View style={{ height: h, width: 14, backgroundColor: "#3FA3B0" }} />}
            </View>
            <View style={{ height: 1, width: 18, backgroundColor: INK }} />
            <View style={{ height: 31, justifyContent: "flex-start" }}>
              {y.balanceMm <= 0 && <View style={{ height: h, width: 14, backgroundColor: cur ? "#A8432A" : "#D9822F" }} />}
            </View>
            <Text style={{ fontSize: 7, fontWeight: cur ? 800 : 400 }}>{String(y.year).slice(2)}</Text>
          </View>
        )
      })}
    </View>
  )
}

export function ReportPdf({ analysis, scene, generatedAt }: { analysis: Analysis; scene: ParcelScene | null; generatedAt: string }) {
  registerFonts()
  const { parcel, status, history, causes, recommendations, confidence, sources, vegetation } = analysis
  const ordered = GROUPS.map((g) => ({ ...g, items: recommendations.filter((r) => r.group === g.id) })).filter((g) => g.items.length)
  const numbering = new Map(ordered.flatMap((g) => g.items).map((r, i) => [r.id, i + 1]))
  return (
    <Document title={`ROSA — działka ${parcel.id}`} author="ROSA" subject="Raport stanu wody na działce" language="pl">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            <Text style={s.brand}>ROSA</Text>
            <Text style={s.tagline}>Retencja · Opady · Susza · Analiza</Text>
          </View>
          <View>
            <Text style={s.title}>Raport stanu wody na działce</Text>
            <Text style={s.meta}>Dzień analizy: {formatDatePl(analysis.request.date)} · wygenerowano: {generatedAt}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>ROSA · raport wygenerowany automatycznie; rekomendacje nie zastępują doradcy rolniczego ani pozwoleń wodnoprawnych.</Text>
        </View>

        <Text style={s.parcelLine}>
          <Text style={s.bold}>Działka {parcel.id}</Text> · {parcel.obreb}, gm. {parcel.gmina}, woj. {parcel.wojewodztwo} · {parcel.areaHa.toLocaleString("pl-PL")} ha · uprawa: {analysis.cropLabel.toLowerCase()}
        </Text>

        <View style={[s.row, s.section]}>
          <View style={{ width: 230 }}>
            {scene ? <ParcelPlan scene={scene} width={230} height={180} /> : <View style={{ width: 230, height: 180, backgroundColor: "#FBF6EC" }} />}
            <Text style={[s.small, { marginTop: 3 }]}>Ryc. 1. Plan działki (EGiB), sąsiednie działki, rowy i wody (BDOT10k). Północ u góry.</Text>
          </View>
          <View style={[s.box, { flexGrow: 1, flexBasis: 0 }]}>
            <Text style={s.h2}>1. {statusTitle(analysis.request.date, analysis.generatedAt)}</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
              <Text style={[s.levelBig, { color: LEVEL_COLORS[status.level - 1] }]}>{status.level}/5</Text>
              <Text style={{ fontFamily: "Bricolage", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{status.label}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 2, marginVertical: 6 }}>
              {LEVEL_COLORS.map((c, i) => <View key={c} style={{ flexGrow: 1, height: 6, borderRadius: 3, backgroundColor: c, opacity: i + 1 === status.level ? 1 : 0.35 }} />)}
            </View>
            <Text>{status.summary}</Text>
            {vegetation && <Text style={[s.small, { marginTop: 4 }]}>Kondycja roślin (NDVI): {vegetation.ndvi.toLocaleString("pl-PL")}, {vegetation.label} · zdjęcie z {formatDatePl(vegetation.imageDate)}{vegetation.note ? ` · ${vegetation.note}` : ""}</Text>}
            <Text style={[s.small, { marginTop: 4 }]}>{status.source}</Text>
          </View>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>2. Na tle {history.totalYears} lat</Text>
          <Text>Deficyt wody w tym okresie wystąpił tu w <Text style={s.bold}>{history.deficitYears} z {history.totalYears} lat</Text>. Najbardziej narażone miesiące: <Text style={s.bold}>{history.riskMonths}</Text>.</Text>
          <HistoryBars analysis={analysis} />
          <Text style={s.small}>{history.windowLabel}. Słupki w dół: deficyt, w górę: nadmiar. {history.source}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>3. {status.level >= 3 ? "Dlaczego brakuje wody" : "Co wpływa na wodę na polu"}</Text>
          {causes.length === 0 ? <Text>Opady i parowanie są blisko normy, a gleba i teren nie zwiększają ryzyka suszy.</Text> : (
            <View style={[s.row, { flexWrap: "wrap" }]}>
              {causes.map((c) => (
                <View key={c.id} style={[s.card, { minWidth: 150 }]} wrap={false}>
                  <Text style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{c.value}</Text>
                  <Text style={s.bold}>{c.title}</Text>
                  <Text>{c.detail}</Text>
                  <Text style={s.small}>Źródło: {c.source}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={s.section} break>
          {ordered.length === 0 && (
            <View wrap={false}>
              <Text style={s.h2}>4. Co zrobić</Text>
              <Text>Dla tej działki nie mamy rekomendacji upraw.</Text>
            </View>
          )}
          {ordered.map((g, gi) => (
            <View key={g.id} style={{ marginBottom: 6 }}>
              <View wrap={false}>
                {gi === 0 && <Text style={s.h2}>4. Co zrobić</Text>}
                <Text style={{ fontWeight: 800, color: TEAL, marginBottom: 3 }}>{g.title}</Text>
                <RecCard r={g.items[0]} n={numbering.get(g.items[0].id)} nested />
              </View>
              {g.items.slice(1).map((r) => <RecCard key={r.id} r={r} n={numbering.get(r.id)} />)}
            </View>
          ))}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>5. Pewność wyniku: {confidence.level === "wysoka" ? "wysoka" : confidence.level === "srednia" ? "średnia" : "niska"}</Text>
          {confidence.unknowns.map((u, i) => (
            <View key={i} style={s.bullet}>
              <Text>•</Text>
              <Text style={{ flex: 1 }}>{u}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <View wrap={false}>
            <Text style={s.h2}>6. Źródła danych</Text>
            <View style={{ flexDirection: "row" }}>
              <Text style={[s.th, { width: "24%" }]}>Źródło</Text>
              <Text style={[s.th, { width: "34%" }]}>Zakres</Text>
              <Text style={[s.th, { width: "12%" }]}>Pobrano</Text>
              <Text style={[s.th, { width: "30%" }]}>Licencja / warunki</Text>
            </View>
            {sources.slice(0, 1).map((src, i) => <SourceRow key={i} src={src} />)}
          </View>
          {sources.slice(1).map((src, i) => <SourceRow key={i} src={src} />)}
        </View>

      </Page>
    </Document>
  )
}
