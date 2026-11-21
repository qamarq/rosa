import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROSA: sprawdź, ile wody ma Twoje pole",
    short_name: "ROSA",
    description: "Retencja · Opady · Susza · Analiza: stan wody na działce rolnej i co z tym zrobić.",
    start_url: "/",
    display: "standalone",
    background_color: "#F1E5D2",
    theme_color: "#0E6E73",
    lang: "pl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
