import type { CropId } from "@/lib/types"

type Cat = "I" | "II" | "III" | "IV"
type Row = (number | null)[]

export const IUNG_PERIODS: [string, string][] = [
  ["03-21", "05-20"], ["04-01", "05-31"], ["04-11", "06-10"], ["04-21", "06-20"], ["05-01", "06-30"], ["05-11", "07-10"], ["05-21", "07-20"],
  ["06-01", "07-31"], ["06-11", "08-10"], ["06-21", "08-20"], ["07-01", "08-31"], ["07-11", "09-10"], ["07-21", "09-20"], ["08-01", "09-30"],
]

const THRESHOLDS: Record<string, Record<Cat, Row>> = {
  "zbozaOzime": {
    I: [
      -129,
      -132,
      -137,
      -145,
      -154,
      -165,
      -180,
      -199,
      -220,
      null,
      null,
      null,
      null,
      null
    ],
    II: [
      -150,
      -153,
      -158,
      -166,
      -175,
      -186,
      -201,
      -220,
      -241,
      null,
      null,
      null,
      null,
      null
    ],
    III: [
      -188,
      -191,
      -196,
      -204,
      -213,
      -224,
      -239,
      -258,
      -279,
      null,
      null,
      null,
      null,
      null
    ],
    IV: [
      -215,
      -218,
      -223,
      -231,
      -240,
      -251,
      -266,
      -285,
      -306,
      null,
      null,
      null,
      null,
      null
    ]
  },
  "zbozaJare": {
    I: [
      -125,
      -127,
      -130,
      -135,
      -142,
      -153,
      -169,
      -186,
      -207,
      null,
      null,
      null,
      null,
      null
    ],
    II: [
      -144,
      -146,
      -149,
      -154,
      -161,
      -172,
      -188,
      -205,
      -226,
      null,
      null,
      null,
      null,
      null
    ],
    III: [
      -174,
      -176,
      -179,
      -184,
      -191,
      -202,
      -218,
      -235,
      -256,
      null,
      null,
      null,
      null,
      null
    ],
    IV: [
      -194,
      -196,
      -199,
      -204,
      -211,
      -222,
      -238,
      -255,
      -276,
      null,
      null,
      null,
      null,
      null
    ]
  },
  "kukurydzaZiarno": {
    I: [
      null,
      null,
      null,
      -168,
      -161,
      -156,
      -153,
      -152,
      -153,
      -154,
      -156,
      -158,
      -161,
      -164
    ],
    II: [
      null,
      null,
      null,
      -200,
      -193,
      -188,
      -185,
      -184,
      -185,
      -186,
      -188,
      -190,
      -193,
      -196
    ],
    III: [
      null,
      null,
      null,
      -236,
      -229,
      -224,
      -221,
      -220,
      -221,
      -222,
      -224,
      -226,
      -229,
      -232
    ],
    IV: [
      null,
      null,
      null,
      -271,
      -264,
      -259,
      -256,
      -255,
      -256,
      -257,
      -259,
      -261,
      -264,
      -267
    ]
  },
  "rzepak": {
    I: [
      -207,
      -187,
      -170,
      -155,
      -142,
      -132,
      null,
      null,
      null,
      null,
      null,
      null,
      -138,
      -138
    ],
    II: [
      -232,
      -211,
      -193,
      -177,
      -165,
      -155,
      null,
      null,
      null,
      null,
      null,
      null,
      -158,
      -158
    ],
    III: [
      -275,
      -254,
      -236,
      -220,
      -208,
      -198,
      null,
      null,
      null,
      null,
      null,
      null,
      -205,
      -205
    ],
    IV: [
      -297,
      -276,
      -258,
      -242,
      -230,
      -220,
      null,
      null,
      null,
      null,
      null,
      null,
      -230,
      -230
    ]
  },
  "ziemniak": {
    I: [
      null,
      null,
      -238,
      -232,
      -226,
      -219,
      -210,
      -200,
      -189,
      -178,
      -168,
      -157,
      -147,
      null
    ],
    II: [
      null,
      null,
      -257,
      -251,
      -245,
      -238,
      -229,
      -219,
      -208,
      -197,
      -187,
      -176,
      -166,
      null
    ],
    III: [
      null,
      null,
      -286,
      -280,
      -274,
      -267,
      -258,
      -248,
      -237,
      -226,
      -216,
      -205,
      -195,
      null
    ],
    IV: [
      null,
      null,
      -306,
      -300,
      -294,
      -287,
      -278,
      -268,
      -257,
      -246,
      -236,
      -225,
      -215,
      null
    ]
  },
  "burak": {
    I: [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    II: [
      -250,
      -248,
      -245,
      -241,
      -237,
      -232,
      -226,
      -220,
      -212,
      -202,
      -192,
      -182,
      -169,
      -155
    ],
    III: [
      -277,
      -275,
      -272,
      -268,
      -264,
      -259,
      -253,
      -247,
      -239,
      -229,
      -219,
      -209,
      -196,
      -182
    ],
    IV: [
      -296,
      -294,
      -291,
      -287,
      -283,
      -278,
      -272,
      -266,
      -258,
      -248,
      -238,
      -228,
      -215,
      -201
    ]
  }
}

const CROP_GROUP: Partial<Record<CropId, { key: string; label: string }>> = {
  pszenica: { key: "zbozaOzime", label: "zbóż ozimych" },
  kukurydza: { key: "kukurydzaZiarno", label: "kukurydzy na ziarno" },
  rzepak: { key: "rzepak", label: "rzepaku" },
  ziemniaki: { key: "ziemniak", label: "ziemniaka" },
  buraki: { key: "burak", label: "buraka cukrowego" },
}

const CATS: Record<number, Cat> = { 1: "I", 2: "II", 3: "III", 4: "IV" }

export type IungAssessment = {
  periodIndex: number
  period: [string, string]
  threshold: number | null
  cropLabel: string
  soilCategory: Cat
  reason: "ok" | "no-effect" | "not-recommended"
}

function dayOfSeason(iso: string): number {
  const d = new Date(iso + "T00:00:00Z")
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000)
}

export function iungAssessment(crop: CropId, soilCode: number | null | undefined, date: string): IungAssessment | null {
  const group = CROP_GROUP[crop]
  const cat = soilCode ? CATS[soilCode] : undefined
  if (!group || !cat) return null
  const year = date.slice(0, 4)
  const target = dayOfSeason(date)
  let best = -1
  let bestDist = Infinity
  IUNG_PERIODS.forEach(([, end], i) => {
    const dist = Math.abs(dayOfSeason(`${year}-${end}`) - target)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  })
  if (best < 0 || bestDist > 10) return null
  const raw = THRESHOLDS[group.key]?.[cat]?.[best]
  return {
    periodIndex: best,
    period: IUNG_PERIODS[best],
    threshold: raw ?? null,
    cropLabel: group.label,
    soilCategory: cat,
    reason: raw === null || raw === undefined ? (THRESHOLDS[group.key]?.[cat]?.every((v) => v === null) ? "not-recommended" : "no-effect") : "ok",
  }
}
