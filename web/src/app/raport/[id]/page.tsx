import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { runAnalysis, requestFromId } from "@/lib/analysis-service"
import type { AnalysisRequest } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ReportDocument } from "@/components/report/report-document"
import { ReportSkeleton } from "@/components/report/report-skeleton"
import { ReportToolbar } from "@/components/report/report-toolbar"
import styles from "@/components/report/report.module.css"

export const metadata: Metadata = {
  title: "Raport stanu wody · ROSA",
}

function parseId(id: string): AnalysisRequest | null {
  try {
    return requestFromId(id)
  } catch {
    return null
  }
}

async function Report({ id }: { id: string }) {
  await connection()
  const request = parseId(id)
  if (!request) notFound()
  const result = await runAnalysis(request)
  if (!result.ok) notFound()
  const { analysis } = result
  return (
    <div className="flex flex-col pb-10 print:pb-0">
      <ReportToolbar backHref={`/dzialka/${analysis.id}`} />
      <ReportDocument analysis={analysis} />
    </div>
  )
}

export default function ReportPage({ params }: PageProps<"/raport/[id]">) {
  return (
    <main className={cn("flex-1", styles.screen)}>
      <Suspense fallback={<ReportSkeleton />}>{params.then(({ id }) => <Report id={id} />)}</Suspense>
    </main>
  )
}
