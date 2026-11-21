import fs from "node:fs"
import postgres from "postgres"

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const sql = postgres(env.match(/^DATABASE_URL=(.+)$/m)[1].trim(), { max: 4 })
const YEARS = (process.env.YEARS ?? "2020,2021,2022,2023,2024,2025").split(",").map(Number)
const SAMPLE = Number(process.env.SAMPLE ?? 30)
const CROPS = ["Zboża ozime", "Zboża jare", "Kukurydza na ziarno", "Ziemniak", "Rzepak i rzepik", "Burak cukrowy"]
const PERIODS = [["03-21","05-20"],["04-01","05-31"],["04-11","06-10"],["04-21","06-20"],["05-01","06-30"],["05-11","07-10"],["05-21","07-20"],["06-01","07-31"],["06-11","08-10"],["06-21","08-20"],["07-01","08-31"],["07-11","09-10"],["07-21","09-20"],["08-01","09-30"]]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

async function thresholds() {
  const html = await (await fetch("https://susza.iung.pulawy.pl/progi/")).text()
  const cells = [...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => strip(m[1]))
  const out = {}
  let crop = null
  for (let i = 0; i < cells.length; i++) {
    if (CROPS.includes(cells[i]) || ["Kukurydza na kiszonkę","Chmiel","Tytoń","Warzywa gruntowe","Krzewy owocowe","Drzewa owocowe","Truskawki","Rośliny strączkowe"].includes(cells[i])) { crop = cells[i]; continue }
    if (crop && ["I","II","III","IV"].includes(cells[i])) {
      const vals = cells.slice(i + 1, i + 15).map((v) => (/^-?\d+$/.test(v) ? Number(v) : null))
      ;(out[crop] ??= {})[cells[i]] = vals
      i += 14
    }
  }
  return out
}

async function iungTable(year, gmina) {
  const html = await (await fetch(`https://susza.iung.pulawy.pl/wykazy/${year},${gmina}/`)).text()
  const text = strip(html.replace(/<\/(td|th)>/g, " | "))
  const out = {}
  for (const cat of ["IV", "III", "II", "I"]) {
    const idx = text.indexOf(`Kategoria gleby ${cat} `)
    if (idx < 0) continue
    const seg = text.slice(idx, text.indexOf("Kategoria gleby", idx + 10) > 0 ? text.indexOf("Kategoria gleby", idx + 10) : undefined)
    for (const crop of CROPS) {
      const ci = seg.indexOf(crop + " |")
      if (ci < 0) continue
      const marks = seg.slice(ci + crop.length).split("|").map((s) => s.trim()).filter(Boolean).slice(0, 14)
      ;(out[cat] ??= {})[crop] = marks
    }
  }
  return out
}

function ra(lat, iso) {
  const phi = (lat * Math.PI) / 180
  const d = new Date(iso + "T00:00:00Z")
  const j = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000)
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * j) / 365)
  const dl = 0.409 * Math.sin((2 * Math.PI * j) / 365 - 1.39)
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dl))))
  return 0.408 * ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(dl) + Math.cos(phi) * Math.cos(dl) * Math.sin(ws))
}

async function weather(lat, lon, year) {
  const st = await sql`
    WITH p AS (SELECT ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) g)
    (SELECT code, ST_DistanceSphere(geom, p.g) d, true AS is_p, false AS is_t FROM meteo_station, p ORDER BY geom <-> p.g LIMIT 5)
    UNION ALL
    (SELECT code, ST_DistanceSphere(geom, p.g) d, false, true FROM meteo_station, p WHERE has_temperature = 1 ORDER BY geom <-> p.g LIMIT 4)`
  const rows = await sql`
    WITH st AS (SELECT * FROM jsonb_to_recordset(${sql.json(st.map((s) => ({ code: s.code, w: 1 / Math.max(1000, s.d) ** 2, is_p: s.is_p, is_t: s.is_t })))}) AS x(code text, w float8, is_p bool, is_t bool))
    SELECT to_char(day,'YYYY-MM-DD') AS day,
      sum(precip_mm*w) FILTER (WHERE is_p AND precip_mm IS NOT NULL)/nullif(sum(w) FILTER (WHERE is_p AND precip_mm IS NOT NULL),0) p,
      sum(tmax_c*w) FILTER (WHERE is_t AND tmax_c IS NOT NULL)/nullif(sum(w) FILTER (WHERE is_t AND tmax_c IS NOT NULL),0) tx,
      sum(tmin_c*w) FILTER (WHERE is_t AND tmin_c IS NOT NULL)/nullif(sum(w) FILTER (WHERE is_t AND tmin_c IS NOT NULL),0) tn
    FROM meteo_daily d JOIN st ON st.code = d.station_code
    WHERE day BETWEEN ${year + "-03-15"} AND ${year + "-09-30"} GROUP BY day`
  const m = new Map()
  for (const r of rows) {
    const tx = r.tx === null ? null : Number(r.tx), tn = r.tn === null ? null : Number(r.tn)
    const et = tx !== null && tn !== null ? Math.max(0, 0.0023 * ra(lat, r.day) * ((tx + tn) / 2 + 17.8) * Math.sqrt(Math.max(0, tx - tn))) : 0
    m.set(r.day, { p: r.p === null ? 0 : Number(r.p), et })
  }
  return m
}

function sums(days, year, [a, b]) {
  let p = 0, et = 0
  for (const [d, v] of days) if (d >= `${year}-${a}` && d <= `${year}-${b}`) { p += v.p; et += v.et }
  return { p, et }
}

const progi = await thresholds()
const sample = await sql`
  SELECT DISTINCT ON (left(id_dzialki, 8)) left(id_dzialki, 8) AS jedn,
    ST_Y(ST_Transform(ST_PointOnSurface(geom), 4326)) lat, ST_X(ST_Transform(ST_PointOnSurface(geom), 4326)) lon
  FROM dzialki TABLESAMPLE SYSTEM (0.02) WHERE id_dzialki ~ '^[0-9]{6}_[1-5]'`
const shuffled = sample.sort(() => Math.random() - 0.5).slice(0, SAMPLE)
const obs = []
for (const s of shuffled) {
  const t = s.jedn[7]
  const gmina = s.jedn.slice(0, 6) + (t === "4" || t === "5" ? "3" : t)
  for (const year of YEARS) {
    let table
    try { table = await iungTable(year, gmina) } catch { continue }
    await sleep(250)
    if (!Object.keys(table).length) continue
    const days = await weather(s.lat, s.lon, year)
    PERIODS.forEach((per, pi) => {
      const { p, et } = sums(days, year, per)
      for (const cat of Object.keys(table)) for (const crop of Object.keys(table[cat])) {
        const mark = table[cat][crop][pi]
        const thr = progi[crop]?.[cat]?.[pi]
        if ((mark !== "+" && mark !== "-") || thr == null) continue
        obs.push({ gmina, year, pi, cat, crop, p, et, thr, iung: mark === "+" })
      }
    })
  }
  process.stderr.write(".")
}
await sql.end()

const results = []
for (let k = 0.5; k <= 1.21; k += 0.05) {
  let tp = 0, fp = 0, fn = 0, tn = 0
  for (const o of obs) {
    const ours = o.p - k * o.et < o.thr
    if (ours && o.iung) tp++; else if (ours) fp++; else if (o.iung) fn++; else tn++
  }
  const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn)
  results.push({ k: Math.round(k * 100) / 100, acc: Math.round(((tp + tn) / obs.length) * 1000) / 10, precision: Math.round(precision * 100) / 100, recall: Math.round(recall * 100) / 100, f1: Math.round(((2 * precision * recall) / Math.max(1e-9, precision + recall)) * 100) / 100 })
}
const best = results.reduce((a, b) => (b.f1 > a.f1 ? b : a))
console.log(JSON.stringify({ gminas: new Set(obs.map((o) => o.gmina)).size, observations: obs.length, droughtShare: Math.round((obs.filter((o) => o.iung).length / obs.length) * 100) / 100, best, results }, null, 1))
