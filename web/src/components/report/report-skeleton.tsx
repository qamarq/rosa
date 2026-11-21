import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import styles from "@/components/report/report.module.css"

export function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6 pt-[60px] pb-10" aria-busy="true" aria-label="Wczytywanie raportu">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[794px] flex-col gap-4 bg-white px-4 pt-6 pb-5 sm:min-h-[1123px] sm:px-12 sm:pt-11 sm:pb-9",
          styles.sheet
        )}
      >
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex flex-col gap-5 sm:flex-row">
          <Skeleton className="aspect-[900/640] sm:w-[330px]" />
          <Skeleton className="h-56 flex-1" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
