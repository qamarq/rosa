"use client"

import { useLiteMode } from "@/components/lite-mode"
import { cn } from "@/lib/utils"

export function LiteBanner({ className }: { className?: string }) {
  const { auto } = useLiteMode()
  if (!auto) return null
  return (
    <div role="status" className={cn("flex flex-col gap-1.5 rounded-2xl bg-accent p-3.5 text-foreground", className)}>
      <strong className="text-base font-bold">Wolne łącze — włączyliśmy tryb lekki</strong>
      <span className="text-sm leading-[1.45]">
        Wynik jest ten sam. Zamiast sceny 3D pokazujemy obrazek, żeby strona szybciej się wczytała.
      </span>
    </div>
  )
}
