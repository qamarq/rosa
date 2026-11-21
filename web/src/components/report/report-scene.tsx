"use client"

import { Diorama } from "@/components/diorama/diorama"
import type { SceneMode } from "@/lib/types"
import { cn } from "@/lib/utils"
import styles from "@/components/report/report.module.css"

export function ReportScene({ mode, label }: { mode: SceneMode; label: string }) {
  return (
    <div className={cn(styles.staticScene, "overflow-hidden border border-[#111111] bg-white")} role="img" aria-label={label}>
      <Diorama mode={mode} labels animate={false} className="block w-full" />
    </div>
  )
}
