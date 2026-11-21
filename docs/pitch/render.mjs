import { chromium } from "playwright-core"
import { execFileSync } from "node:child_process"
import path from "node:path"
const dir = process.argv[2] ?? path.dirname(new URL(import.meta.url).pathname)
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
await p.goto("file://" + dir + "/index.html", { waitUntil: "networkidle" })
await p.evaluate(() => document.fonts.ready)
const slides = await p.locator(".slide").all()
for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: dir + "/prev/slide-" + String(i + 1).padStart(2, "0") + ".png" })
await b.close()
execFileSync("python3", ["-c", `
from PIL import Image
import glob
fs = sorted(glob.glob("${dir}/prev/slide-*.png"))
ims = [Image.open(f).convert("RGB") for f in fs]
ims[0].save("${dir}/ROSA-pitch.pdf", save_all=True, append_images=ims[1:], resolution=144, quality=90)
`])
console.log(slides.length + " slides")
