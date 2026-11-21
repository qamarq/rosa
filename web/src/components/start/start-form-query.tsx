"use client"

import { useSearchParams } from "next/navigation"
import { isCropId } from "@/lib/crops"
import { StartForm, type StartFormInitial } from "./start-form"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function StartFormFromQuery({ className }: { className?: string }) {
  const params = useSearchParams()
  const parcel = params.get("parcel")?.trim()
  const crop = params.get("crop")
  const date = params.get("date")
  const initial: StartFormInitial = {
    parcel: parcel || undefined,
    crop: crop && isCropId(crop) ? crop : undefined,
    date: date && ISO_DATE.test(date) ? date : undefined,
    openMap: params.get("mapa") === "1",
  }
  return <StartForm key={params.toString()} initial={initial} className={className} />
}
