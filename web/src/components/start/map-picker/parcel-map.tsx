"use client"

import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useRef, useState } from "react"
import { AttributionControl, Map as MapLibre, setWorkerUrl, type GeoJSONSource } from "maplibre-gl"
import { CheckIcon, CrosshairIcon, LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLiteMode } from "@/components/lite-mode"
import { Spinner } from "@/components/ui/spinner"
import { mapStyle, PARCELS_ZOOM, PICK_ZOOM, POLAND_BOUNDS, POLAND_CENTER, POLAND_ZOOM } from "./map-style"
import { PlaceSearch, type PlaceHit } from "./place-search"
import { formatArea, parcelBounds, parcelPlace, type LocatedParcel } from "./types"

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href)

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; parcel: LocatedParcel }
  | { kind: "missing" }
  | { kind: "outside" }
  | { kind: "error" }

const EMPTY = { type: "FeatureCollection" as const, features: [] }

let remembered: LocatedParcel | null = null

const CONTROL_BTN =
  "rosa-btn pointer-events-auto flex size-11 cursor-pointer items-center justify-center rounded-[14px] border-2 border-border bg-card text-foreground shadow-[0_10px_20px_-12px_rgba(110,70,30,0.55)] disabled:cursor-wait"

const MAP_LABEL =
  "Mapa. Strzałki przesuwają mapę, plus i minus przybliżają, Enter sprawdza działkę na środku mapy."

function inPoland(lng: number, lat: number): boolean {
  const [[w, s], [e, n]] = POLAND_BOUNDS
  return lng > w && lng < e && lat > s && lat < n
}

function source(map: MapLibre, id: "parcel" | "point"): GeoJSONSource | undefined {
  return map.getSource<GeoJSONSource>(id)
}

function fitPadding(map: MapLibre) {
  const { clientWidth: w, clientHeight: h } = map.getContainer()
  const narrow = w < 640
  return {
    top: 72,
    right: narrow ? 64 : 80,
    left: narrow ? 32 : 80,
    bottom: Math.round(Math.min(narrow ? 230 : 190, h * 0.45)),
  }
}

function showParcel(map: MapLibre, parcel: LocatedParcel, durationMs: number) {
  source(map, "point")?.setData(EMPTY)
  source(map, "parcel")?.setData({ type: "Feature", properties: {}, geometry: parcel.geometry })
  map.fitBounds(parcelBounds(parcel.geometry), { padding: fitPadding(map), maxZoom: 17.5, duration: durationMs })
}

export default function ParcelMap({ onSelect }: { onSelect: (parcel: LocatedParcel) => void }) {
  const { lite } = useLiteMode()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const chooseRef = useRef<HTMLButtonElement>(null)
  const liteRef = useRef(lite)
  const pickRef = useRef<(lng: number, lat: number) => void>(() => {})

  const [status, setStatus] = useState<Status>(() =>
    remembered ? { kind: "found", parcel: remembered } : { kind: "idle" }
  )
  const [zoom, setZoom] = useState(() => (remembered ? PARCELS_ZOOM + 1 : POLAND_ZOOM))
  const [notice, setNotice] = useState<string | null>(null)
  const [geoBusy, setGeoBusy] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)

  function duration(ms: number) {
    return liteRef.current ? 0 : ms
  }

  function clearParcel(map: MapLibre) {
    source(map, "parcel")?.setData(EMPTY)
    source(map, "point")?.setData(EMPTY)
  }

  async function locate(lng: number, lat: number) {
    const map = mapRef.current
    if (!map) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setNotice(null)
    source(map, "parcel")?.setData(EMPTY)
    source(map, "point")?.setData({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lng, lat] } })
    setStatus({ kind: "loading" })
    try {
      const res = await fetch(`/api/parcels/locate?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}`, {
        signal: controller.signal,
      })
      if (res.status === 404) return setStatus({ kind: "missing" })
      if (res.status === 400) return setStatus({ kind: "outside" })
      if (!res.ok) return setStatus({ kind: "error" })
      const parcel = (await res.json()) as LocatedParcel
      if (controller.signal.aborted) return
      showParcel(map, parcel, duration(900))
      setStatus({ kind: "found", parcel })
    } catch {
      if (!controller.signal.aborted) setStatus({ kind: "error" })
    }
  }

  function pick(lng: number, lat: number) {
    const map = mapRef.current
    if (!map) return
    const current = map.getZoom()
    if (current < PICK_ZOOM) {
      setNotice(null)
      map.easeTo({ center: [lng, lat], zoom: current < 9 ? current + 4 : PARCELS_ZOOM + 0.5, duration: duration(700) })
      return
    }
    void locate(lng, lat)
  }

  useEffect(() => {
    liteRef.current = lite
    pickRef.current = pick
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const start = remembered
    const map = new MapLibre({
      container,
      style: mapStyle,
      center: POLAND_CENTER,
      zoom: POLAND_ZOOM,
      bounds: start ? parcelBounds(start.geometry) : undefined,
      fitBoundsOptions: { padding: 80, maxZoom: 17 },
      maxBounds: POLAND_BOUNDS,
      minZoom: 4,
      maxZoom: 19,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      fadeDuration: liteRef.current ? 0 : 300,
      locale: {
        "Map.Title": MAP_LABEL,
        "AttributionControl.ToggleAttribution": "Pokaż źródła mapy",
      },
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.addControl(new AttributionControl({ compact: true }), "bottom-right")
    mapRef.current = map

    const canvas = map.getCanvas()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      const center = map.getCenter()
      pickRef.current(center.lng, center.lat)
    }
    const onFocus = () => setKeyboardFocus(canvas.matches(":focus-visible"))
    const onBlur = () => setKeyboardFocus(false)
    canvas.addEventListener("keydown", onKey)
    canvas.addEventListener("focus", onFocus)
    canvas.addEventListener("blur", onBlur)

    map.on("load", () => {
      if (start) showParcel(map, start, 0)
      setZoom(map.getZoom())
    })
    map.on("zoomend", () => setZoom(map.getZoom()))
    map.on("click", (event) => pickRef.current(event.lngLat.lng, event.lngLat.lat))

    return () => {
      abortRef.current?.abort()
      canvas.removeEventListener("keydown", onKey)
      canvas.removeEventListener("focus", onFocus)
      canvas.removeEventListener("blur", onBlur)
      map.remove()
      mapRef.current = null
    }
  }, [])

  const found = status.kind === "found" ? status.parcel : null

  useEffect(() => {
    if (found) chooseRef.current?.focus({ preventScroll: true })
  }, [found])

  function zoomBy(delta: number) {
    const map = mapRef.current
    if (!map) return
    if (delta > 0) map.zoomIn({ duration: duration(300) })
    else map.zoomOut({ duration: duration(300) })
  }

  function pickCenter() {
    const center = mapRef.current?.getCenter()
    if (center) pick(center.lng, center.lat)
  }

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setNotice("Ta przeglądarka nie podaje lokalizacji. Przybliż mapę ręcznie.")
      return
    }
    setGeoBusy(true)
    setNotice(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoBusy(false)
        const { longitude, latitude } = position.coords
        if (!inPoland(longitude, latitude)) {
          setNotice("Jesteś poza Polską. Przybliż mapę ręcznie do swojego pola.")
          return
        }
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16, duration: duration(1400) })
      },
      (error) => {
        setGeoBusy(false)
        setNotice(
          error.code === error.PERMISSION_DENIED
            ? "Nie mamy zgody na lokalizację. Przybliż mapę ręcznie albo zezwól na lokalizację w przeglądarce."
            : "Nie udało się ustalić lokalizacji. Przybliż mapę ręcznie."
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    )
  }

  function goToPlace(hit: PlaceHit) {
    const map = mapRef.current
    if (!map) return
    setNotice(null)
    if (hit.kind === "parcel" || hit.kind === "address") {
      map.flyTo({ center: [hit.lon, hit.lat], zoom: Math.max(map.getZoom(), 16.5), duration: duration(1400) })
      void locate(hit.lon, hit.lat)
      return
    }
    clearParcel(map)
    setStatus({ kind: "idle" })
    if (hit.bbox) {
      const [w, s, e, n] = hit.bbox
      map.fitBounds([[w, s], [e, n]], { padding: fitPadding(map), maxZoom: hit.kind === "gmina" ? 12.5 : 15, duration: duration(1400) })
    } else {
      map.flyTo({ center: [hit.lon, hit.lat], zoom: 14, duration: duration(1400) })
    }
  }

  function reject() {
    const map = mapRef.current
    if (map) clearParcel(map)
    setStatus({ kind: "idle" })
    mapRef.current?.getCanvas().focus()
  }

  function choose(parcel: LocatedParcel) {
    remembered = parcel
    onSelect(parcel)
  }

  let message: string | null = null
  let warn = false
  if (status.kind === "loading") message = "Szukam działki…"
  else if (status.kind === "missing") {
    message = "W tym miejscu nie ma działki ewidencyjnej — kliknij w pole"
    warn = true
  } else if (status.kind === "outside") {
    message = "Ten punkt jest poza Polską — kliknij w pole w Polsce"
    warn = true
  } else if (status.kind === "error") {
    message = "Nie udało się sprawdzić działki. Kliknij jeszcze raz."
    warn = true
  } else if (notice) {
    message = notice
    warn = true
  } else if (status.kind === "idle") {
    if (zoom < PICK_ZOOM) message = "Przybliż mapę do swojego pola"
    else if (zoom < PARCELS_ZOOM) message = "Przybliż jeszcze, żeby zobaczyć granice działek"
    else message = "Kliknij w swoje pole"
  }

  const place = found ? parcelPlace(found) : ""
  const area = found ? formatArea(found.areaHa) : ""

  return (
    <div className="relative size-full overflow-hidden rounded-[20px] border-2 border-border bg-sand">
      <div
        ref={containerRef}
        className="size-full [&_.maplibregl-canvas]:cursor-crosshair [&_.maplibregl-canvas:focus-visible]:outline-none"
      />

      {keyboardFocus && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[18px] ring-4 ring-primary ring-inset">
          <div className="absolute top-1/2 left-1/2 size-10 -translate-1/2 rounded-full border-[3px] border-primary bg-white/30" />
          <div className="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full bg-primary" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:max-w-[440px]">
        <PlaceSearch onPick={goToPlace} className="w-full" />
        <div role="status" aria-live="polite" className="min-w-0">
          {message && (
            <p
              className={cn(
                "m-0 inline-flex max-w-full items-center gap-2 rounded-2xl border-2 px-3.5 py-2 text-[15px] leading-snug font-bold shadow-[0_10px_20px_-12px_rgba(110,70,30,0.55)]",
                warn ? "border-[#E8B9A6] bg-[#FBEDE6] text-[#7A2E18]" : "border-border bg-card text-foreground"
              )}
            >
              {status.kind === "loading" && <Spinner aria-hidden="true" className="size-4 shrink-0 text-primary" />}
              {message}
            </p>
          )}
          {found && <span className="sr-only">{`Znaleziono działkę ${found.id} · ${place} · ${area}`}</span>}
        </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={locateMe}
            disabled={geoBusy}
            aria-busy={geoBusy || undefined}
            aria-label="Moja lokalizacja"
            className={cn(CONTROL_BTN, "w-auto gap-2 px-3 text-[15px] font-bold max-sm:w-11 max-sm:px-0")}
          >
            {geoBusy ? (
              <Spinner aria-hidden="true" className="size-5 text-primary" />
            ) : (
              <LocateFixedIcon aria-hidden="true" className="size-5 text-primary" strokeWidth={2.2} />
            )}
            <span className="max-sm:sr-only" aria-hidden="true">
              Moja lokalizacja
            </span>
          </button>
          <button type="button" onClick={() => zoomBy(1)} aria-label="Przybliż mapę" className={CONTROL_BTN}>
            <PlusIcon aria-hidden="true" className="size-5" strokeWidth={2.6} />
          </button>
          <button type="button" onClick={() => zoomBy(-1)} aria-label="Oddal mapę" className={CONTROL_BTN}>
            <MinusIcon aria-hidden="true" className="size-5" strokeWidth={2.6} />
          </button>
          <button
            type="button"
            onClick={pickCenter}
            aria-label="Sprawdź działkę na środku mapy"
            title="Sprawdź działkę na środku mapy"
            className={CONTROL_BTN}
          >
            <CrosshairIcon aria-hidden="true" className="size-5 text-primary" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {found && (
        <div className="absolute inset-x-3 bottom-11 sm:right-auto sm:bottom-4 sm:left-4 sm:w-[440px]">
          <section
            aria-label={`Działka ${found.id}`}
            className="rosa-clay animate-in rounded-3xl bg-card p-4 duration-300 fade-in-0 slide-in-from-bottom-3 sm:p-5"
          >
            <p className="m-0 text-[13px] font-extrabold tracking-wide text-primary uppercase">To Twoje pole?</p>
            <h3 className="mt-1 text-[19px] leading-tight font-extrabold break-all text-foreground tabular-nums sm:text-[21px]">
              Działka {found.id}
            </h3>
            <p className="m-0 mt-1 text-[15px] text-ink-soft">
              {place} · <span className="tabular-nums">{area}</span>
            </p>
            <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
              <button
                ref={chooseRef}
                type="button"
                onClick={() => choose(found)}
                className="rosa-btn rosa-claybtn flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[16px] bg-primary px-4 text-base font-extrabold text-white sm:flex-1 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
              >
                <CheckIcon aria-hidden="true" className="size-5" strokeWidth={2.8} />
                Wybierz tę działkę
              </button>
              <button
                type="button"
                onClick={reject}
                className="rosa-btn flex h-12 cursor-pointer items-center justify-center rounded-[16px] border-2 border-border bg-card px-5 text-base font-bold text-foreground focus-visible:border-primary focus-visible:outline-none"
              >
                To nie ta
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
