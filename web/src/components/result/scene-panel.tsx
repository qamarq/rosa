"use client"

import { baseSceneMode, sceneFacts } from "@/lib/scene"
import type { Analysis, Recommendation } from "@/lib/types"
import { cn } from "@/lib/utils"
import { DataStatusPill } from "./data-status"
import { DioramaStage, useCamera } from "./diorama-stage"
import { daysPl, groupTint, ndviPosition, signed } from "./format"
import { EyeIcon, LayersIcon, MinusIcon, PlusIcon, RainDeficitIcon, SunIcon } from "./icons"
import styles from "./result.module.css"

export function SceneToast({ selected, onClear, className }: { selected: Recommendation; onClear: () => void; className?: string }) {
  return (
    <div
      key={selected.id}
      role="status"
      className={cn(
        styles.toast,
        "flex items-center gap-3.5 rounded-[22px] bg-paper py-3.5 pr-3.5 pl-[18px] shadow-[0_20px_40px_-20px_rgba(60,40,20,.45)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-11 flex-none items-center justify-center rounded-[14px]"
        style={{ background: groupTint(selected.group) }}
      >
        <EyeIcon />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-extrabold tracking-[.06em] text-water-deep uppercase">Pokazujemy na polu</span>
        <span className="text-[17px] font-extrabold">{selected.title}</span>
        <span className="text-[15px] leading-[1.35] text-muted-foreground">{selected.sceneCaption}</span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="rosa-btn h-11 flex-none cursor-pointer rounded-[14px] border-2 border-border bg-paper px-3.5 text-sm font-bold whitespace-nowrap text-foreground"
      >
        Pokaż suszę
      </button>
    </div>
  )
}

function CameraButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rosa-btn flex size-12 cursor-pointer items-center justify-center rounded-2xl bg-background disabled:cursor-default disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export function DesktopScene({
  analysis,
  selected,
  onClear,
}: {
  analysis: Analysis
  selected: Recommendation | null
  onClear: () => void
}) {
  const cam = useCamera()
  const { status, vegetation } = analysis

  return (
    <section aria-label="Scena 3D działki" className="@container relative min-w-0 flex-1 overflow-hidden rounded-[28px] bg-[#F3D9AE]">
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[300px] bg-[#E9C996]" />
      <DioramaStage
        analysis={analysis}
        mode={selected?.sceneMode ?? baseSceneMode(analysis.status)}
        facts={sceneFacts(analysis)}
        labels
        camera={cam.camera}
        onRotate={cam.setRotation}
        onZoom={cam.setZoom}
        className={cn("absolute inset-x-5 bottom-[104px] transition-[top] duration-500 ease-spring", selected ? "top-32" : "top-28")}
      />

      {selected ? (
        <SceneToast
          selected={selected}
          onClear={onClear}
          className="absolute top-5 left-1/2 w-[600px] max-w-[calc(100%-40px)] -translate-x-1/2"
        />
      ) : (
        <div className="pointer-events-none absolute inset-x-5 top-5 flex flex-wrap items-start justify-between gap-2.5">
          <div className="flex flex-wrap gap-2.5">
            <span className="flex h-11 items-center gap-2 rounded-2xl bg-paper pr-4 pl-2.5 text-[15px] font-bold">
              <SunIcon />
              {status.headline}
            </span>
            <span className="flex h-11 items-center gap-2 rounded-2xl bg-paper pr-4 pl-2.5 text-[15px] font-bold tabular-nums">
              <RainDeficitIcon />
              {daysPl(status.windowDays)}: {signed(status.precipDeficitPct)}% deszczu
            </span>
          </div>
          <DataStatusPill analysis={analysis} />
        </div>
      )}

      {selected ? (
        <div className="absolute bottom-5 left-5 flex h-11 max-w-[calc(100%-260px)] items-center rounded-2xl bg-paper/85 px-3.5 text-sm text-muted-foreground @max-[700px]:hidden">
          Kliknij działanie po prawej, a pokażemy je na scenie
        </div>
      ) : vegetation ? (
        <div className="absolute bottom-5 left-5 flex w-[300px] flex-col gap-2.5 rounded-[20px] bg-paper px-[18px] py-4 @max-[560px]:w-[240px]">
          <span className="text-sm font-extrabold">Kondycja roślin (NDVI)</span>
          <div
            aria-hidden="true"
            className="relative h-3.5 rounded-[7px] bg-[linear-gradient(90deg,#8A4B26_0%,#C89A4A_35%,#D9C66A_55%,#8DB54A_80%,#3F8A3A_100%)]"
          >
            <span
              className="absolute -top-[5px] h-6 w-1.5 -translate-x-1/2 rounded-[3px] bg-foreground shadow-[0_0_0_2px_#FFFDF8]"
              style={{ left: `${ndviPosition(vegetation.ndvi)}%` }}
            />
          </div>
          <div className="flex justify-between gap-2 text-[13px] text-muted-foreground">
            <span>spieczone</span>
            <strong className="text-foreground">Twoje pole: {vegetation.label}</strong>
            <span>soczyste</span>
          </div>
          {vegetation.note && <span className="text-xs leading-snug text-muted-foreground">{vegetation.note}</span>}
        </div>
      ) : null}

      <div role="toolbar" aria-label="Sterowanie kamerą" className="absolute right-5 bottom-5 flex items-center gap-2 rounded-[22px] bg-paper p-2">
        {!selected && <span className="hidden px-2.5 text-sm text-muted-foreground @min-[860px]:inline">Przeciągnij, aby obrócić</span>}
        <CameraButton label="Przybliż" onClick={cam.zoomIn} disabled={!cam.canZoomIn}>
          <PlusIcon />
        </CameraButton>
        <CameraButton label="Oddal" onClick={cam.zoomOut} disabled={!cam.canZoomOut}>
          <MinusIcon />
        </CameraButton>
        <button
          type="button"
          aria-pressed={cam.camera.topView}
          aria-label="Widok z góry"
          onClick={cam.toggleTopView}
          className={cn(
            "rosa-btn flex h-12 cursor-pointer items-center gap-2 rounded-2xl px-4 text-[15px] font-bold",
            cam.camera.topView ? "bg-primary text-white" : "bg-foreground text-paper",
          )}
        >
          <LayersIcon />
          <span className="hidden @min-[620px]:inline">Widok z góry</span>
        </button>
      </div>
    </section>
  )
}
