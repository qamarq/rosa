import type { Metadata } from "next"
import { Suspense } from "react"
import { AnalysisLoader, LoadingFallback } from "@/components/loading/analysis-loader"

export const metadata: Metadata = {
  title: "Sprawdzamy Twoje pole · ROSA",
}

export default function AnalysisLoadingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AnalysisLoader />
    </Suspense>
  )
}
