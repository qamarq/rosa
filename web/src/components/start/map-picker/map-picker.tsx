"use client"

import { useSyncExternalStore } from "react"
import dynamic from "next/dynamic"
import type { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { SheetContent } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import type { LocatedParcel } from "./types"

export type { LocatedParcel } from "./types"

const ParcelMap = dynamic(() => import("./parcel-map"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center gap-2.5 rounded-[20px] border-2 border-border bg-sand text-[15px] font-bold text-ink-soft">
      <Spinner aria-hidden="true" className="size-5 text-primary" />
      Wczytuję mapę…
    </div>
  ),
})

const DESKTOP = "(min-width: 640px)"

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DESKTOP)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

function useDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => true
  )
}

type MapPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (parcels: LocatedParcel[]) => void
  finalFocus?: DialogPrimitive.Popup.Props["finalFocus"]
}

export function MapPicker({ open, onOpenChange, onSelect, finalFocus }: MapPickerProps) {
  const desktop = useDesktop()

  const body = (
    <>
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
        <div className="flex min-w-0 flex-col gap-1">
          <DialogTitle className="text-[22px] leading-tight font-extrabold text-foreground sm:text-2xl">
            Wskaż swoje pole
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-snug text-ink-soft">
            Przybliż mapę i kliknij w swoje pole
          </DialogDescription>
        </div>
        <DialogClose
          aria-label="Zamknij mapę"
          className="rosa-btn flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border-2 border-border bg-card text-foreground focus-visible:border-primary focus-visible:outline-none"
        >
          <XIcon aria-hidden="true" className="size-5" strokeWidth={2.6} />
        </DialogClose>
      </div>
      <div className="min-h-0 flex-1 px-3 pb-3 sm:px-4 sm:pb-4">
        <ParcelMap onSelect={onSelect} />
      </div>
    </>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {desktop ? (
        <DialogContent
          showCloseButton={false}
          finalFocus={finalFocus}
          className="flex h-[min(880px,calc(100dvh-4rem))] w-[min(1180px,calc(100vw-4rem))] max-w-none flex-col gap-0 overflow-hidden rounded-[28px] bg-card p-0 text-foreground ring-border sm:max-w-none"
        >
          {body}
        </DialogContent>
      ) : (
        <SheetContent
          side="bottom"
          showCloseButton={false}
          finalFocus={finalFocus}
          className="data-[side=bottom]:h-[94dvh] gap-0 overflow-hidden rounded-t-[28px] border-t-0 bg-card p-0 text-foreground"
        >
          {body}
        </SheetContent>
      )}
    </Dialog>
  )
}
