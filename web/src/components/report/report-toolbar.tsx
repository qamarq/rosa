"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ReportToolbar({ backHref }: { backHref: string }) {
  const autoPrint = useSearchParams().get("druk") === "1"

  useEffect(() => {
    if (!autoPrint) return
    const timer = window.setTimeout(() => window.print(), 600)
    return () => window.clearTimeout(timer)
  }, [autoPrint])

  return (
    <div className="no-print sticky top-0 z-10 bg-[#E7E2D9]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[794px] items-center justify-between gap-3 px-4 py-3 sm:px-0">
        <Button variant="outline" size="lg" nativeButton={false} render={<Link href={backHref} />}>
          <ArrowLeft data-icon="inline-start" />
          Wróć do wyniku
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={() => window.print()}>
            <Printer data-icon="inline-start" />
            Drukuj
          </Button>
          <Button size="lg" nativeButton={false} render={<a href={`${backHref.replace("/dzialka/", "/api/analyses/")}/pdf`} download />}>
            <Download data-icon="inline-start" />
            Pobierz PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
