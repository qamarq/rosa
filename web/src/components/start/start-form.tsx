"use client"

import { useRef, useState, useSyncExternalStore, useTransition } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { ArrowRightIcon, CalendarDaysIcon, MapPinIcon, XIcon } from "lucide-react"
import { pl } from "react-day-picker/locale"
import { cn } from "@/lib/utils"
import { DEMO_REQUEST } from "@/lib/demo"
import type { CropId } from "@/lib/types"
import { dateRange, formatDatePl, isValidParcelId, parcelSelectionProblem, splitParcelIds, toIsoDate } from "@/lib/validation"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CropPicker } from "./crop-picker"
import type { LocatedParcel } from "./map-picker/types"

const loadMapPicker = () => import("./map-picker/map-picker")
const MapPicker = dynamic(() => loadMapPicker().then((m) => m.MapPicker), { ssr: false })

type DayMode = "dzis" | "inny"
type DateError = "format" | "early" | "late"

const DEFAULT_OTHER_DATE = "15.07.2025"

const noopSubscribe = () => () => {}

function useToday(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => toIsoDate(new Date()),
    () => null
  )
}

function parsePlDate(text: string): string | null {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text.trim())
  if (!m) return null
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return toIsoDate(date)
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const SPRING =
  "transition-[translate,scale,background-color,border-color,color] duration-[320ms] ease-spring hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[.96] active:duration-[80ms]"

const OUTLINE_BTN =
  "rosa-btn flex cursor-pointer items-center justify-center border-2 border-border bg-card font-bold text-foreground"

const DAY_ITEM = cn(
  SPRING,
  "h-12 rounded-[14px] border-2 border-foreground bg-card px-[18px] text-[15px] font-bold text-foreground hover:bg-card hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-card aria-pressed:hover:bg-foreground aria-pressed:hover:text-card"
)

const QUICK_BTN =
  "rosa-btn h-11 cursor-pointer rounded-[14px] border-2 border-foreground bg-card px-3.5 text-[15px] font-bold text-foreground tabular-nums"

function ErrorBadge() {
  return (
    <span
      aria-hidden="true"
      className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-destructive text-[13px] font-extrabold text-white"
    >
      !
    </span>
  )
}

export type StartFormInitial = {
  parcel?: string
  crop?: CropId
  date?: string
  openMap?: boolean
}

export function StartForm({ className, initial }: { className?: string; initial?: StartFormInitial }) {
  const router = useRouter()
  const today = useToday()
  const [isPending, startTransition] = useTransition()

  const parcelRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const cropSetRef = useRef<HTMLFieldSetElement>(null)
  const pickedRef = useRef(false)

  const initialDate = initial?.date
  const [parcel, setParcel] = useState(initial?.parcel ?? "")
  const [parcelTouched, setParcelTouched] = useState(!!initial?.parcel)
  const [crop, setCrop] = useState<CropId>(initial?.crop ?? "kukurydza")
  const [dayChoice, setDay] = useState<DayMode | null>(initialDate ? null : "dzis")
  const [dateText, setDateText] = useState(initialDate ? formatDatePl(initialDate) : DEFAULT_OTHER_DATE)
  const [dateTouched, setDateTouched] = useState(!!initialDate)
  const [mapOpen, setMapOpen] = useState(!!initial?.openMap)
  const [mapMounted, setMapMounted] = useState(!!initial?.openMap)

  const day: DayMode = dayChoice ?? (today && initialDate === today ? "dzis" : "inny")
  const [calendarOpen, setCalendarOpen] = useState(false)

  const parcelIds = splitParcelIds(parcel)
  const parcelProblem = parcelSelectionProblem(parcelIds)
  const parcelError = parcel.trim() === "" ? "empty" : !parcelProblem ? null : parcelIds.length > 1 ? "multi" : "format"
  const showParcelError = parcelTouched && parcelError !== null

  const range = today ? dateRange(isoToDate(today)) : null
  const dateIso = parsePlDate(dateText)
  let dateError: DateError | null = null
  if (day === "inny") {
    if (!dateIso) dateError = "format"
    else if (range && dateIso < range.min) dateError = "early"
    else if (range && dateIso > range.max) dateError = "late"
  }
  const showDateError = dateTouched && dateError !== null

  const minDate = range ? isoToDate(range.min) : undefined
  const maxDate = range ? isoToDate(range.max) : undefined
  const selectedDate = dateIso && !dateError ? isoToDate(dateIso) : undefined

  function fillDemo() {
    setParcel(DEMO_REQUEST.parcelId)
    setParcelTouched(false)
  }

  function openMap() {
    pickedRef.current = false
    setMapMounted(true)
    setMapOpen(true)
  }

  function pickParcel(picked: LocatedParcel[]) {
    pickedRef.current = true
    setParcel(splitParcelIds(picked.map((p) => p.id).join(" ")).join(", "))
    setParcelTouched(true)
    setMapOpen(false)
  }

  function focusAfterMap(): HTMLElement | boolean {
    if (!pickedRef.current) return true
    return cropSetRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? true
  }

  function pickIso(iso: string) {
    setDay("inny")
    setDateText(formatDatePl(iso))
    setDateTouched(false)
  }

  function pickToday() {
    setDay("dzis")
    setDateTouched(false)
  }

  function yearAgo(): string | null {
    if (!today) return null
    const d = isoToDate(today)
    d.setFullYear(d.getFullYear() - 1)
    return toIsoDate(d)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (parcelError) {
      setParcelTouched(true)
      parcelRef.current?.focus()
      return
    }
    if (dateError) {
      setDateTouched(true)
      dateRef.current?.focus()
      return
    }
    const date = day === "dzis" ? today : dateIso
    if (!date) return
    const params = new URLSearchParams({ parcel: parcelIds.join("+"), crop, date })
    startTransition(() => router.push(`/analiza?${params.toString()}`))
  }

  const ago = yearAgo()

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label="Sprawdź pole"
      className={cn(
        "rosa-clay flex flex-col gap-4 rounded-3xl bg-card p-[18px] sm:rounded-[28px] sm:p-[22px]",
        className
      )}
    >
      <Field className="gap-2">
        <FieldLabel htmlFor="nr" className="text-base leading-normal font-bold">
          Numer działki
        </FieldLabel>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            ref={parcelRef}
            id="nr"
            name="parcel"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="np. 302604_5.0017.5196"
            value={parcel}
            onChange={(e) => setParcel(e.target.value)}
            onBlur={() => {
              if (parcel.trim() !== "") setParcelTouched(true)
            }}
            aria-invalid={showParcelError || undefined}
            aria-describedby={showParcelError ? "nr-msg" : "nr-hint"}
            className="h-14 w-full min-w-0 shrink-0 rounded-[18px] sm:w-auto sm:flex-1 border-2 border-border bg-white px-[18px] py-0 text-[19px] font-semibold text-foreground tabular-nums placeholder:text-[#7A6A56] focus-visible:border-primary focus-visible:ring-0 aria-invalid:border-destructive aria-invalid:ring-0 sm:h-[62px] sm:text-[21px] md:text-[21px]"
          />
          <button
            type="button"
            onClick={openMap}
            onPointerEnter={() => void loadMapPicker()}
            onFocus={() => void loadMapPicker()}
            aria-haspopup="dialog"
            aria-expanded={mapOpen}
            className={cn(OUTLINE_BTN, "h-[52px] gap-2 rounded-[18px] px-4 text-[15px] whitespace-nowrap sm:h-[62px]")}
          >
            <MapPinIcon aria-hidden="true" className="size-[22px] text-primary" strokeWidth={2.2} />
            albo wskaż na mapie
          </button>
          {mapMounted && (
            <MapPicker open={mapOpen} onOpenChange={setMapOpen} onSelect={pickParcel} finalFocus={focusAfterMap} />
          )}
        </div>
        {showParcelError ? (
          <FieldError id="nr-msg" className="flex gap-2 text-[15px] leading-[1.45] text-[#7A2E18]">
            <ErrorBadge />
            {parcelError === "empty" ? (
              <span>
                Wpisz numer działki, np. <strong>{DEMO_REQUEST.parcelId}</strong>.
              </span>
            ) : parcelError === "multi" ? (
              <span>{parcelProblem}</span>
            ) : (
              <span>
                To nie wygląda na numer działki. Powinien mieć podkreślnik i dwie kropki, np.{" "}
                <strong>{DEMO_REQUEST.parcelId}</strong>.
              </span>
            )}
          </FieldError>
        ) : (
          <p id="nr-hint" className="m-0 text-sm text-ink-soft">
            Numer znajdziesz w wypisie z rejestru gruntów. Pole z kilku działek? Oddziel numery przecinkami.{" "}
            <button
              type="button"
              onClick={fillDemo}
              className="cursor-pointer text-primary underline underline-offset-2 hover:text-[#094F53]"
            >
              Wpisz przykład
            </button>
          </p>
        )}
        {parcelIds.length > 1 && (
          <ul aria-label="Działki pola" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {parcelIds.map((id) => (
              <li
                key={id}
                className={cn(
                  "flex h-9 items-center gap-1 rounded-xl border-2 bg-paper pr-1 pl-2.5 text-sm font-bold tabular-nums",
                  isValidParcelId(id) ? "border-border" : "border-destructive text-[#7A2E18]"
                )}
              >
                {id}
                <button
                  type="button"
                  onClick={() => setParcel(parcelIds.filter((other) => other !== id).join(", "))}
                  aria-label={`Usuń działkę ${id}`}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-ink-soft hover:bg-sand hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <XIcon aria-hidden="true" className="size-4" strokeWidth={2.6} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <FieldSet ref={cropSetRef} className="gap-2">
        <FieldLegend className="mb-2 text-base font-bold">Co rośnie na polu?</FieldLegend>
        <CropPicker value={crop} onChange={setCrop} />
      </FieldSet>

      <FieldSet className="flex-row flex-wrap items-center gap-2.5">
        <FieldLegend className="mb-2 text-base font-bold">Dzień analizy</FieldLegend>
        <ToggleGroup
          value={[day]}
          onValueChange={(value) => {
            const next = value[0]
            if (next === "dzis" || next === "inny") {
              setDay(next)
              setDateTouched(false)
            }
          }}
          className="gap-2.5"
        >
          <ToggleGroupItem value="dzis" className={DAY_ITEM}>
            Dziś
          </ToggleGroupItem>
          <ToggleGroupItem value="inny" className={DAY_ITEM}>
            Inny dzień
          </ToggleGroupItem>
        </ToggleGroup>

        {day === "inny" && (
          <div className="flex items-center gap-2">
            <label htmlFor="data" className="sr-only">
              Data analizy, dzień.miesiąc.rok
            </label>
            <Input
              ref={dateRef}
              id="data"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="dd.mm.rrrr"
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
              onBlur={() => setDateTouched(true)}
              aria-invalid={showDateError || undefined}
              aria-describedby={showDateError ? "data-msg" : "data-hint"}
              className="h-12 w-[132px] rounded-[14px] border-2 border-border bg-white px-3 py-0 text-base font-semibold text-foreground tabular-nums focus-visible:border-primary focus-visible:ring-0 aria-invalid:border-destructive aria-invalid:ring-0 md:text-base"
            />
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger aria-label="Wybierz dzień z kalendarza" className={cn(OUTLINE_BTN, "size-12 rounded-[14px]")}>
                <CalendarDaysIcon aria-hidden="true" className="size-[22px] text-primary" strokeWidth={2.2} />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-auto rounded-[20px] p-2 shadow-[0_24px_48px_-24px_rgba(110,70,30,0.4)] ring-border"
              >
                <Calendar
                  mode="single"
                  locale={pl}
                  captionLayout="dropdown"
                  selected={selectedDate}
                  defaultMonth={selectedDate ?? maxDate}
                  startMonth={minDate}
                  endMonth={maxDate}
                  disabled={minDate && maxDate ? [{ before: minDate }, { after: maxDate }] : undefined}
                  onSelect={(d) => {
                    if (!d) return
                    setDateText(formatDatePl(toIsoDate(d)))
                    setDateTouched(false)
                    setCalendarOpen(false)
                  }}
                  className="[--cell-size:--spacing(10)]"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {showDateError ? (
          <div className="flex basis-full flex-col gap-2.5">
            <FieldError id="data-msg" className="text-[15px] leading-[1.45] text-[#7A2E18]">
              {dateError === "format" || !range ? (
                <>
                  Wpisz dzień jako dzień.miesiąc.rok, np. <strong>{DEFAULT_OTHER_DATE}</strong>.
                </>
              ) : (
                <>
                  Mamy dane z ostatnich 10 lat: <strong>od {formatDatePl(range.min)} do dziś</strong>.{" "}
                  {dateError === "early" ? "Wybierz późniejszy dzień." : "Wybierz dzień nie późniejszy niż dziś."}
                </>
              )}
            </FieldError>
            {dateError !== "format" && range && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={pickToday} className={cn(QUICK_BTN, "bg-foreground text-card")}>
                  Dziś
                </button>
                {ago && (
                  <button type="button" onClick={() => pickIso(ago)} className={QUICK_BTN}>
                    Rok temu
                  </button>
                )}
                <button type="button" onClick={() => pickIso(range.min)} className={QUICK_BTN}>
                  {formatDatePl(range.min)}
                </button>
              </div>
            )}
          </div>
        ) : (
          <span id="data-hint" className="text-sm text-ink-soft">
            {day === "dzis" ? (today ? `dziś, ${formatDatePl(today)}` : "dziś") : "dowolny dzień z ostatnich 10 lat"}
          </span>
        )}
      </FieldSet>

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending || undefined}
        className="rosa-btn rosa-claybtn flex h-16 cursor-pointer items-center justify-center gap-3 rounded-[20px] bg-primary text-xl font-extrabold text-white disabled:cursor-wait"
      >
        Sprawdź pole
        {isPending ? (
          <Spinner aria-label="Wczytywanie" className="size-[22px]" />
        ) : (
          <ArrowRightIcon aria-hidden="true" className="size-[22px]" strokeWidth={2.6} />
        )}
      </button>
    </form>
  )
}
