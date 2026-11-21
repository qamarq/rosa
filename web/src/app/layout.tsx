import type { Metadata } from "next"
import { Bricolage_Grotesque, Figtree } from "next/font/google"
import { LiteModeProvider } from "@/components/lite-mode"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin", "latin-ext"] })

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
})

export const metadata: Metadata = {
  title: "ROSA: sprawdź, ile wody ma Twoje pole",
  description: "Retencja · Opady · Susza · Analiza. Ocena sytuacji wodnej działki i rekomendacje retencji.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${figtree.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LiteModeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </LiteModeProvider>
      </body>
    </html>
  )
}
