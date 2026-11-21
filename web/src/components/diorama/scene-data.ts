import type { SceneMode } from "@/lib/types"

type Palette = {
  g1: string
  g2: string
  n1: string
  n2: string
  n3: string
  n4: string
  n5: string
  row: string
  p1: string
  p2: string
  edge: string
  stem: string
  leaf: string
  tassel: string
  treeL: string
  treeD: string
  water: string
  ww: number
}

type Pt = readonly [number, number]

export type SceneData = {
  c: Palette
  ariaLabel: string
  parcelPts: string
  ditch: string
  fencePosts: string
  corn: { s0: string; s1: string; s2: string; l0: string; l1: string; l2: string; t0: string; t1: string; t2: string }
  cover: { stub: string; sprout: string }
  tr: { x: number; y: number; cls: string; seed: boolean; driver: boolean }
  dog: { x: number; y: number }
  dew: { x: number; y: number }[]
  d: {
    corn: boolean
    cover: boolean
    cracks: boolean
    heat: boolean
    gust: boolean
    twinkle: boolean
    sunHot: boolean
    sunGold: boolean
    clouds: boolean
    particles: boolean
    marker: boolean
    markLabel: boolean
    gate: boolean
    gateLabel: boolean
    irr: boolean
    hl: boolean
    dew: boolean
  }
  f: {
    x: number
    y: number
    cls: string
    down: boolean
    wipe: boolean
    cheer: boolean
    eyeY: number
    glintY: number
    brows: string
    mouth: string
  }
}

const LUSH: Palette = {
  g1: "#C6C383",
  g2: "#A9AC66",
  n1: "#93A957",
  n2: "#C9B35E",
  n3: "#8FA14F",
  n4: "#D7BF6A",
  n5: "#9DB25C",
  row: "#5E6B2E",
  p1: "#86AE4A",
  p2: "#5F8E36",
  edge: "#FFF4D8",
  stem: "#4C7A2A",
  leaf: "#7DB047",
  tassel: "#E7C567",
  treeL: "#93C25A",
  treeD: "#4E7A2C",
  water: "#3FA3B0",
  ww: 7,
}

const DRY: Palette = {
  g1: "#D9C38E",
  g2: "#C3A870",
  n1: "#BDA866",
  n2: "#D8BE7A",
  n3: "#B3A45E",
  n4: "#E0C67C",
  n5: "#C7B06A",
  row: "#8A6E3C",
  p1: "#CDAA5C",
  p2: "#A9773F",
  edge: "#FFF1D2",
  stem: "#8E7A3A",
  leaf: "#C0A04E",
  tassel: "#DCC07E",
  treeL: "#B4BE68",
  treeD: "#6E7A34",
  water: "#4E9BA3",
  ww: 4,
}

const ARIA: Record<SceneMode, string> = {
  hero: "Diorama pola kukurydzy o złotej godzinie: zielone uprawy, stodoła z silosem, traktor, bele siana, rów z wodą, rolnik z psem.",
  susza:
    "Działka w suszy: spieczona kukurydza, pęknięcia gleby, upał. Rolnik ociera pot. Woda spływa w stronę rowu na wschodzie, znacznik pokazuje, gdzie ją zatrzymać.",
  zastawka: "Na rowie stoi zastawka, woda podnosi się w rowie, koparka kończy pracę, rolnik się cieszy.",
  miedzyplon: "Po zbiorze: traktor z siewnikiem wysiewa międzyplon, na polu kiełkują rośliny okrywowe.",
  nawadnianie: "Zraszacz nawadnia środek pola, gleba wokół ciemnieje od wody.",
}

const P = (u: number, v: number): Pt => [450 + 370 * u - 370 * v, 120 + 185 * u + 185 * v]

const POLY: Pt[] = (
  [
    [0.18, 0.22],
    [0.72, 0.15],
    [0.8, 0.62],
    [0.55, 0.8],
    [0.22, 0.7],
  ] as const
).map(([u, v]) => P(u, v))

function inside(x: number, y: number): boolean {
  let c = false
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [xi, yi] = POLY[i]
    const [xj, yj] = POLY[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

const fits = (x: number, y: number) =>
  inside(x, y) && inside(x - 7, y) && inside(x + 7, y) && inside(x, y - 5) && inside(x, y + 3)

const r = (n: number) => n.toFixed(1)

const PARCEL_PTS = POLY.map(([x, y]) => r(x) + "," + r(y)).join(" ")

const FENCE_POSTS = (() => {
  let fence = ""
  for (let x = 100; x <= 298; x += 22) fence += "M" + x + " " + r(305 + (x - 80) * 0.5 - 1) + "v-14"
  return fence
})()

export const DITCH = "M752 287 C 700 312, 690 330, 640 345 S 560 380, 520 400 S 450 440, 416 456"

export function buildScene(mode: SceneMode): SceneData {
  const hero = mode === "hero"
  const isCover = mode === "miedzyplon"
  const h = hero ? 17 : 12
  const s = ["", "", ""]
  const l = ["", "", ""]
  const t = ["", "", ""]
  const plants: Pt[] = []
  let stub = ""
  let sprout = ""
  let i = 0
  for (let u = 0.2; u < 0.8; u += 0.034) {
    for (let v = 0.17; v < 0.8; v += 0.046) {
      const [x, y] = P(u, v)
      if (!fits(x, y)) continue
      plants.push([x, y])
      const g = i++ % 3
      s[g] += "M" + r(x) + " " + r(y) + "v" + -h
      if (hero) {
        l[g] +=
          "M" + r(x) + " " + r(y - h * 0.35) + "q5 -4 9 -1M" + r(x) + " " + r(y - h * 0.6) + "q-5 -4 -9 -1M" + r(x) + " " + r(y - h * 0.82) + "q4 -3 6 0"
        t[g] += "M" + r(x) + " " + r(y - h) + "l-2 -4M" + r(x) + " " + r(y - h) + "l2 -4"
      } else {
        l[g] += "M" + r(x) + " " + r(y - h * 0.4) + "q5 -1 8 4M" + r(x) + " " + r(y - h * 0.65) + "q-5 -1 -8 4"
        t[g] += "M" + r(x) + " " + r(y - h) + "l1 -3"
      }
      stub += "M" + r(x) + " " + r(y) + "v-3"
      if (u < 0.52) sprout += "M" + r(x + 3) + " " + r(y + 1) + "q-2 -3 -4 -4M" + r(x + 3) + " " + r(y + 1) + "q2 -3 4 -4"
    }
  }

  const front = [...plants].sort((a, b) => b[1] - a[1])
  const dew = hero ? [front[0], front[3]].filter(Boolean).map(([x, y]) => ({ x: +r(x + 4.75), y: +r(y - h * 0.35 - 4.2) })) : []

  const c: Palette = { ...(hero ? LUSH : DRY) }
  if (isCover) {
    c.p1 = "#BC9C69"
    c.p2 = "#9F7B4D"
  }
  if (mode === "zastawka") c.ww = 6

  const pose = mode === "susza" ? "wipe" : mode === "zastawka" || mode === "nawadnianie" ? "cheer" : "down"
  const fp: Pt = mode === "zastawka" ? [548, 432] : mode === "nawadnianie" ? [380, 402] : [330, 414]
  const happy = pose !== "wipe"

  return {
    c,
    ariaLabel: ARIA[mode],
    parcelPts: PARCEL_PTS,
    ditch: DITCH,
    fencePosts: FENCE_POSTS,
    corn: { s0: s[0], s1: s[1], s2: s[2], l0: l[0], l1: l[1], l2: l[2], t0: t[0], t1: t[1], t2: t[2] },
    cover: { stub, sprout },
    tr: isCover ? { x: 300, y: 292, cls: "drive", seed: true, driver: true } : { x: 604, y: 238, cls: "", seed: false, driver: false },
    dog: { x: fp[0] + 28, y: fp[1] + 4 },
    dew,
    d: {
      corn: !isCover,
      cover: isCover,
      cracks: mode === "susza" || mode === "zastawka",
      heat: mode === "susza",
      gust: hero || mode === "susza",
      twinkle: hero,
      sunHot: !hero,
      sunGold: hero,
      clouds: hero,
      particles: !isCover,
      marker: mode === "susza" || mode === "zastawka",
      markLabel: mode === "susza",
      gate: mode === "zastawka",
      gateLabel: mode === "zastawka",
      irr: mode === "nawadnianie",
      hl: isCover || mode === "nawadnianie",
      dew: hero,
    },
    f: {
      x: fp[0],
      y: fp[1],
      cls: pose === "cheer" ? "hop" : "jelly",
      down: pose === "down",
      wipe: pose === "wipe",
      cheer: pose === "cheer",
      eyeY: happy ? -58.5 : -60.5,
      glintY: happy ? -59.5 : -61.5,
      brows: happy ? "M-7.5 -63.5 q 2.5 -2 5 0 M2.5 -63.5 q 2.5 -2 5 0" : "M-7.5 -64 l 5 -1.8 M2.5 -65.8 l 5 1.8",
      mouth: happy ? "M-3.5 -47.5 Q 0 -44.5 3.5 -47.5" : "M-3 -46 Q 0 -48 3 -46",
    },
  }
}
