"use client"

import { useRef, useState } from "react"
import { ChevronDownIcon, PlusIcon, SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { CROP_GROUPS, CROPS, FEATURED_CROPS, cropLabel, isCropId, type CropOption } from "@/lib/crops"
import type { CropId } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CropIcon } from "./crop-icons"

const SPRING =
  "transition-[translate,scale,background-color,border-color,color] duration-[320ms] ease-spring hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[.96] active:duration-[80ms]"

const FEATURED = FEATURED_CROPS.map((id) => CROPS.find((c) => c.id === id)!)

function normalize(text: string): string {
  return text.toLocaleLowerCase("pl-PL").replace(/ł/g, "l").normalize("NFD").replace(/\p{Diacritic}/gu, "")
}

function matches(crop: CropOption, query: string): boolean {
  if (!query) return true
  return normalize([crop.label, crop.hint ?? "", ...(crop.aliases ?? [])].join(" ")).includes(query)
}

export function CropPicker({ value, onChange }: { value: CropId; onChange: (crop: CropId) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const featured = FEATURED_CROPS.includes(value)
  const q = normalize(query.trim())
  const groups = CROP_GROUPS.map((g) => ({ ...g, crops: CROPS.filter((c) => c.group === g.id && matches(c, q)) })).filter((g) => g.crops.length > 0)

  function pick(crop: CropId) {
    onChange(crop)
    setOpen(false)
    setQuery("")
  }

  return (
    <>
      <ToggleGroup
        value={featured ? [value] : []}
        onValueChange={(next) => {
          const id = next[0]
          if (typeof id === "string" && isCropId(id)) onChange(id)
        }}
        className="grid w-full grid-cols-3 gap-[7px] sm:grid-cols-6"
      >
        {FEATURED.map((c) => (
          <ToggleGroupItem
            key={c.id}
            value={c.id}
            className={cn(
              SPRING,
              "h-[84px] w-full min-w-0 shrink flex-col gap-1 rounded-[18px] border-2 border-input bg-card px-0 text-[13px] font-semibold text-foreground hover:bg-card hover:text-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:hover:bg-accent"
            )}
          >
            <CropIcon crop={c.id} className="size-9" />
            {c.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery("")
        }}
      >
        <PopoverTrigger
          data-selected={!featured || undefined}
          className={cn(
            "rosa-btn flex h-14 w-full cursor-pointer items-center [contain:inline-size] gap-2.5 rounded-[18px] border-2 border-input bg-card pr-3.5 pl-2.5 text-left text-foreground data-selected:border-primary data-selected:bg-accent",
            open && "border-primary"
          )}
        >
          {featured ? (
            <>
              <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-xl bg-muted text-primary">
                <PlusIcon className="size-5" strokeWidth={2.6} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                Inna uprawa
                <span className="font-normal text-ink-soft"> · zboża jare, strączkowe, sad…</span>
              </span>
            </>
          ) : (
            <>
              <CropIcon crop={value} className="size-9 flex-none" />
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{cropLabel(value)}</span>
              <span className="text-sm font-semibold text-primary">zmień</span>
            </>
          )}
          <ChevronDownIcon aria-hidden="true" className={cn("size-5 flex-none text-ink-soft transition-transform", open && "rotate-180")} />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          initialFocus={(type) => (type === "touch" ? false : searchRef.current)}
          aria-label="Wybierz uprawę"
          className="max-h-[min(34rem,var(--available-height))] w-[min(30rem,calc(100vw-2rem))] gap-3 overflow-y-auto overscroll-contain rounded-[20px] p-3 shadow-[0_24px_48px_-24px_rgba(110,70,30,0.4)] ring-border"
        >
          <label className="relative block">
            <span className="sr-only">Szukaj uprawy</span>
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-ink-soft" />
            <Input
              ref={searchRef}
              type="search"
              autoComplete="off"
              placeholder="Szukaj, np. owies, jabłoń, groch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const first = groups[0]?.crops[0]
                  if (first) pick(first.id)
                }
              }}
              className="h-11 rounded-[14px] border-2 border-border bg-white pr-3 pl-9 text-base font-semibold focus-visible:border-primary focus-visible:ring-0 md:text-base"
            />
          </label>
          {groups.length === 0 && <p className="m-0 px-1 text-sm text-ink-soft">Nie ma takiej uprawy na liście. Wybierz najbliższą, np. „Warzywa” albo „Sad”.</p>}
          {groups.map((g) => (
            <section key={g.id} aria-label={g.label} className="flex flex-col gap-1.5">
              <h3 className="m-0 px-1 text-xs font-bold tracking-wide text-ink-soft uppercase">{g.label}</h3>
              <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 sm:grid-cols-3">
                {g.crops.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={c.id === value}
                      onClick={() => pick(c.id)}
                      className="flex h-full w-full cursor-pointer items-center gap-2 rounded-[14px] border-2 border-transparent bg-card p-1.5 text-left text-[13px] font-semibold text-foreground hover:border-input hover:bg-muted focus-visible:border-primary focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-accent"
                    >
                      <CropIcon crop={c.id} className="size-8 flex-none" />
                      <span className="min-w-0 leading-tight">
                        {c.short ?? c.label}
                        {c.hint && <span className="block truncate text-[11px] font-normal text-ink-soft">{c.hint}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </PopoverContent>
      </Popover>
    </>
  )
}
