import { NotFoundView } from "@/components/result/not-found-view"
import { analysisIdFor } from "@/lib/analysis-service"
import { DEMO_PARCEL_ID, morkaAnalysis } from "@/lib/mock/morka"

export default function ParcelNotFound() {
  const demoId = analysisIdFor({ ...morkaAnalysis.request, parcelId: DEMO_PARCEL_ID })
  return <NotFoundView demoHref={`/dzialka/${demoId}`} />
}
