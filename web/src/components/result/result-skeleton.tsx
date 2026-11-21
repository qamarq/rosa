import { Skeleton } from "@/components/ui/skeleton"

export function ResultSkeleton() {
  return (
    <div aria-busy="true" aria-label="Wczytujemy wynik analizy" className="flex min-h-dvh flex-col bg-[#F1E5D2] lg:h-dvh">
      <div className="flex h-[76px] flex-none items-center gap-4 border-b border-input bg-[#FBF6EC] px-4 lg:px-6">
        <Skeleton className="size-7 rounded-full bg-sand-deep" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-48 bg-sand-deep" />
          <Skeleton className="h-3.5 w-64 bg-sand" />
        </div>
        <span className="flex-1" />
        <Skeleton className="hidden h-12 w-36 rounded-2xl bg-sand-deep lg:block" />
        <Skeleton className="h-12 w-12 rounded-2xl bg-sand-deep lg:w-36" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row lg:p-5">
        <Skeleton className="h-[300px] rounded-none bg-[#F3D9AE] lg:h-auto lg:flex-1 lg:rounded-[28px]" />
        <div className="flex flex-col gap-5 bg-paper p-4 lg:w-[460px] lg:rounded-[28px] lg:p-7 xl:w-[540px]">
          <Skeleton className="h-7 w-52 bg-muted" />
          <div className="flex items-center gap-4">
            <Skeleton className="size-[132px] rounded-full bg-muted" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-8 w-3/4 bg-muted" />
              <Skeleton className="h-4 w-full bg-muted" />
              <Skeleton className="h-4 w-5/6 bg-muted" />
            </div>
          </div>
          <Skeleton className="h-4 w-full rounded-full bg-muted" />
          <Skeleton className="h-7 w-40 bg-muted" />
          <Skeleton className="h-44 w-full rounded-[18px] bg-muted" />
        </div>
      </div>
    </div>
  )
}
