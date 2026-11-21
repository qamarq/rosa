import "server-only"
import { cached } from "@/server/cache"
import { fetchJson } from "@/server/http"

export type SoilCategory = {
  code: number
  label: string
  susceptibility: "bardzo wysoka" | "wysoka" | "średnia" | "niska" | "organiczna" | null
  agricultural: boolean
  texture: string
}

const CATEGORIES: Record<number, Omit<SoilCategory, "code">> = {
  1: { label: "Kategoria 1", susceptibility: "bardzo wysoka", agricultural: true, texture: "Gleba bardzo lekka, piaszczysta" },
  2: { label: "Kategoria 2", susceptibility: "wysoka", agricultural: true, texture: "Gleba lekka" },
  3: { label: "Kategoria 3", susceptibility: "średnia", agricultural: true, texture: "Gleba średnia" },
  4: { label: "Kategoria 4", susceptibility: "niska", agricultural: true, texture: "Gleba ciężka" },
  5: { label: "Gleby organiczne", susceptibility: "organiczna", agricultural: true, texture: "Gleba organiczna (torfowa, murszowa)" },
  11: { label: "Lasy, zadrzewienia", susceptibility: null, agricultural: false, texture: "Las lub zadrzewienie" },
  12: { label: "Wody", susceptibility: null, agricultural: false, texture: "Wody" },
  13: { label: "Tereny zabudowane", susceptibility: null, agricultural: false, texture: "Teren zabudowany" },
  14: { label: "Tereny komunikacyjne, nieużytki", susceptibility: null, agricultural: false, texture: "Teren komunikacyjny lub nieużytek" },
}

type FeatureInfo = { features: { properties: { GRAY_INDEX?: number } }[] }

export async function loadSoilCategory(x2180: number, y2180: number): Promise<SoilCategory | null> {
  const key = `${Math.round(x2180 / 25) * 25},${Math.round(y2180 / 25) * 25}`
  return cached("iung-katgl", key, null, async () => {
    const url =
      "https://sgeo.iung.pl/geoserver/Susza/wms?" +
      new URLSearchParams({
        SERVICE: "WMS",
        VERSION: "1.1.1",
        REQUEST: "GetFeatureInfo",
        LAYERS: "Susza:katgl_landuse2024",
        QUERY_LAYERS: "Susza:katgl_landuse2024",
        SRS: "EPSG:2180",
        BBOX: [x2180 - 50, y2180 - 50, x2180 + 50, y2180 + 50].join(","),
        WIDTH: "101",
        HEIGHT: "101",
        X: "50",
        Y: "50",
        INFO_FORMAT: "application/json",
      })
    const info = await fetchJson<FeatureInfo>(url, 5000)
    const code = info.features[0]?.properties.GRAY_INDEX
    if (code === undefined || !CATEGORIES[code]) return null
    return { code, ...CATEGORIES[code] }
  })
}
