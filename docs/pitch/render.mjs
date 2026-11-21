import { chromium } from "playwright-core"
import path from "node:path"
const dir = path.dirname(new URL(import.meta.url).pathname)
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
await p.goto("file://" + dir + "/index.html", { waitUntil: "networkidle" })
await p.evaluate(() => document.fonts.ready)
const slides = await p.locator(".slide").all()
for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: dir + "/prev/slide-" + String(i + 1).padStart(2, "0") + ".png" })
await p.pdf({ path: dir + "/ROSA-pitch.pdf", width: "1920px", height: "1080px", printBackground: true })
await b.close()
console.log(slides.length + " slides")
