import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import { ResultSkeleton } from "@/components/result/result-skeleton"
import { ResultView } from "@/components/result/result-view"
import { requestFromId, runAnalysis } from "@/lib/analysis-service"
import { isCropId } from "@/lib/crops"

export default function ParcelPage({ params }: PageProps<"/dzialka/[id]">) {
  return (
    <Suspense fallback={<ResultSkeleton />}>
      {params.then(({ id }) => (
        <ParcelResult id={id} />
      ))}
    </Suspense>
  )
}

async function ParcelResult({ id }: { id: string }) {
  await connection()
  let req: ReturnType<typeof requestFromId> = null
  try {
    req = requestFromId(id)
  } catch {
    notFound()
  }
  if (!req || !isCropId(req.crop)) notFound()
  const result = await runAnalysis(req)
  if (!result.ok) notFound()
  return <ResultView analysis={result.analysis} />
}
