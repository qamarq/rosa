import { Suspense } from "react"
import { HeroScene } from "@/components/start/hero-scene"
import { StartForm } from "@/components/start/start-form"
import { StartFormFromQuery } from "@/components/start/start-form-query"
import { SiteHeader } from "@/components/site-header"
import { analysisIdFor } from "@/lib/analysis-service"
import { DEMO_PARCEL_ID, morkaAnalysis } from "@/lib/mock/morka"

const DEMO_HREF = `/dzialka/${analysisIdFor({ parcelId: DEMO_PARCEL_ID, crop: "kukurydza", date: "2025-07-15" })}`

const { parcel, cropLabel } = morkaAnalysis
const DEMO_AREA = parcel.areaHa.toLocaleString("pl-PL")

export default function StartPage() {
  return (
    <div className="flex flex-1 flex-col bg-sand-deep">
      <section className="relative overflow-hidden bg-sand xl:min-h-[900px]">
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-[210px] bg-sand-deep xl:block" />
        <div className="relative mx-auto flex max-w-[1440px] flex-col xl:min-h-[900px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-[200px] -right-[280px] size-[620px] rounded-full bg-[radial-gradient(circle,rgba(255,201,120,0.6)_0%,rgba(255,201,120,0)_62%)] xl:-top-[260px] xl:-right-[220px] xl:size-[1000px]"
          />
          <SiteHeader className="relative z-20 px-4 pt-4 sm:px-8 sm:pt-6 xl:px-[72px] xl:pt-7" />

          <main className="relative z-10 flex flex-col gap-[18px] px-4 pt-6 sm:px-8 md:mx-auto md:w-full md:max-w-[600px] md:px-0 xl:mx-0 xl:ml-[72px] xl:w-[520px] xl:max-w-none xl:pt-7 xl:pb-[72px]">
            <p className="rosa-in m-0 text-[13px] font-extrabold tracking-[.12em] text-primary uppercase sm:text-sm">
              Retencja · Opady · Susza · Analiza
            </p>
            <h1 className="rosa-in m-0 font-heading text-[44px] leading-[.98] font-extrabold tracking-[-0.025em] text-balance [animation-delay:120ms] sm:text-[56px] xl:text-[62px]">
              Sprawdź, ile <span className="text-primary">wody</span> ma&nbsp;Twoje pole
            </h1>
            <p className="rosa-in m-0 max-w-[480px] text-[17px] leading-[1.45] text-muted-foreground [animation-delay:240ms] sm:text-[19px]">
              Wpisz numer działki. Pokażemy, ile wody jest w glebie, dlaczego jej brakuje i jak ją zatrzymać.
            </p>
            <div className="rosa-in [animation-delay:360ms]">
              <Suspense fallback={<StartForm />}>
                <StartFormFromQuery />
              </Suspense>
            </div>
          </main>

          <HeroScene
            demoHref={DEMO_HREF}
            demoLabel={
              <>
                Przykład:{" "}
                <strong className="text-foreground">
                  {parcel.obreb}, gm. {parcel.gmina}
                </strong>{" "}
                · {cropLabel.toLowerCase()} · {DEMO_AREA} ha
              </>
            }
          />

          <footer
            id="zrodla"
            className="relative z-10 bg-sand-deep px-4 pt-2 pb-6 sm:px-8 xl:absolute xl:bottom-[26px] xl:left-[72px] xl:bg-transparent xl:p-0"
          >
            <p className="m-0 text-[13px] leading-[1.5] text-muted-foreground">
              Otwarte dane: Open-Meteo (ERA5) · Copernicus Sentinel-2 · IUNG-PIB · GUGiK (ULDK, NMT) · BDOT10k
            </p>
          </footer>
        </div>
      </section>
    </div>
  )
}
