"use client"

import { useEffect, useId, useRef, useState } from "react"
import { HouseIcon, MapPinIcon, SearchIcon, SquareDashedIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import type { PlaceHit } from "@/app/api/places/search/route"

export type { PlaceHit }

export function PlaceSearch({ onPick, className }: { onPick: (hit: PlaceHit) => void; className?: string }) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PlaceHit[]>([])
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setBusy(true)
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        const data = (await res.json()) as { results: PlaceHit[] }
        setResults(data.results)
        setActive(0)
        setEmpty(data.results.length === 0)
        setOpen(true)
      } catch {
        if (!controller.signal.aborted) setResults([])
      } finally {
        if (!controller.signal.aborted) setBusy(false)
      }
    }, 180)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  function pick(hit: PlaceHit) {
    setOpen(false)
    setQuery(hit.kind === "parcel" || hit.kind === "address" ? `${hit.label}, ${hit.detail}` : hit.label)
    inputRef.current?.blur()
    onPick(hit)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % results.length)
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (event.key === "Enter" && open && results[active]) {
      event.preventDefault()
      pick(results[active])
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  const showList = open && query.trim().length >= 2 && (results.length > 0 || empty)

  return (
    <div className={cn("pointer-events-auto relative", className)}>
      <div className="flex h-12 items-center gap-2 rounded-2xl border-2 border-border bg-card pr-1.5 pl-3.5 shadow-[0_10px_20px_-12px_rgba(110,70,30,0.55)] focus-within:border-primary">
        {busy ? <Spinner aria-hidden="true" className="size-5 shrink-0 text-primary" /> : <SearchIcon aria-hidden="true" className="size-5 shrink-0 text-ink-soft" strokeWidth={2.4} />}
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          aria-label="Szukaj miejscowości, adresu, gminy albo działki"
          placeholder="Wieś, adres („Poznań, Głogowska 10”) albo działka"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            if (event.target.value.trim().length < 2) {
              setResults([])
              setOpen(false)
              setEmpty(false)
            }
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-ink-soft/80 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="Wyczyść wyszukiwanie"
            onClick={() => {
              setQuery("")
              setResults([])
              setOpen(false)
              inputRef.current?.focus()
            }}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink-soft hover:bg-sand"
          >
            <XIcon aria-hidden="true" className="size-4" strokeWidth={2.6} />
          </button>
        )}
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-10 m-0 max-h-[min(360px,50vh)] list-none overflow-y-auto rounded-2xl border-2 border-border bg-card p-1.5 shadow-[0_18px_30px_-16px_rgba(110,70,30,0.6)]"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-[15px] text-ink-soft">Nic nie znaleźliśmy. Spróbuj „wieś numer”, „miasto, ulica numer” albo numeru działki.</li>
          ) : (
            results.map((hit, i) => (
              <li
                key={hit.kind + hit.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(hit)}
                onMouseEnter={() => setActive(i)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2", i === active && "bg-sand")}
              >
                {hit.kind === "parcel" ? (
                  <SquareDashedIcon aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={2.4} />
                ) : hit.kind === "address" ? (
                  <HouseIcon aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={2.2} />
                ) : (
                  <MapPinIcon aria-hidden="true" className="size-5 shrink-0 text-ink-soft" strokeWidth={2.2} />
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-bold text-foreground">{hit.label}</span>
                  <span className="truncate text-[13px] text-ink-soft">{hit.detail}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
