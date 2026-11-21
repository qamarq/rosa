import { NotFoundView } from "@/components/result/not-found-view"
import { analysisIdFor } from "@/lib/analysis-service"
import { DEMO_REQUEST } from "@/lib/demo"

export default function ParcelNotFound() {
  const demoId = analysisIdFor(DEMO_REQUEST)
  return <NotFoundView demoHref={`/dzialka/${demoId}`} />
}
