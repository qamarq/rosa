import type { Analysis } from "@/lib/types"
import { cn } from "@/lib/utils"

export function DemoBanner({ analysis, className }: { analysis: Analysis; className?: string }) {
  if (!analysis.demo) return null
  return (
    <div role="status" className={cn("flex flex-col gap-1.5 rounded-2xl border-2 border-[#E8B9A6] bg-[#FBEDE6] p-3.5 text-[#7A2E18]", className)}>
      <strong className="text-base font-bold">Dane przykładowe (tryb demonstracyjny)</strong>
      <span className="text-sm leading-[1.45]">
        Aplikacja działa bez bazy danych, więc pokazuje zapisany przykład. Analiza dowolnej działki na prawdziwych danych:{" "}
        <a href="https://rosa.kamilmarczak.pl" className="font-bold text-[#7A2E18] underline">rosa.kamilmarczak.pl</a>
      </span>
    </div>
  )
}
