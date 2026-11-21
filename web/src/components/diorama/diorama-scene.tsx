import type { SceneData } from "./scene-data"
import styles from "./diorama.module.css"

const k = (names: string) =>
  names
    .split(" ")
    .filter(Boolean)
    .map((n) => styles[n])
    .join(" ") || undefined

type DioramaSceneProps = {
  v: SceneData
  uid: string
  labels: boolean
  facts?: SceneFacts
}

export type SceneFacts = { areaHa?: number; slopePct?: number | null; ditch?: boolean | null }

function plNumber(n: number): string {
  return n.toLocaleString("pl-PL", { maximumFractionDigits: 1 })
}

export function DioramaScene({ v, uid, labels, facts }: DioramaSceneProps) {
  const areaLabel = facts ? (facts.areaHa ? `Twoja działka · ${plNumber(facts.areaHa)} ha` : "Twoja działka") : "Twoja działka · 17,6 ha"
  const slopeLabel = facts ? (facts.slopePct != null && facts.slopePct >= 0.5 ? `Spadek ${plNumber(facts.slopePct)}%` : null) : "Spadek 3–4%"
  const showDitch = facts ? facts.ditch === true : true
  const gateText = facts ? "Woda zostaje na polu" : "Zastawka: woda zostaje"
  const i = (name: string) => uid + name
  const u = (name: string) => "url(#" + uid + name + ")"
  return (
    <>
    <defs>
      <linearGradient id={i("Parcel")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={v.c.p1} />
        <stop offset="1" stopColor={v.c.p2} />
      </linearGradient>
      <linearGradient id={i("Top")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={v.c.g1} />
        <stop offset="1" stopColor={v.c.g2} />
      </linearGradient>
      <radialGradient id={i("Warm")} cx="0.12" cy="0.08" r="0.95">
        <stop offset="0" stopColor="#FFD596" stopOpacity="0.42" />
        <stop offset="0.6" stopColor="#FFD596" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={i("Spot")} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#E9FBFF" stopOpacity="0.95" />
        <stop offset="1" stopColor="#E9FBFF" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={i("GRed")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#E8804F" />
        <stop offset="1" stopColor="#A9432A" />
      </linearGradient>
      <linearGradient id={i("GYellow")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F8CF66" />
        <stop offset="1" stopColor="#CF8B27" />
      </linearGradient>
      <linearGradient id={i("GOlive")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#A3B05E" />
        <stop offset="1" stopColor="#5F6B2E" />
      </linearGradient>
      <linearGradient id={i("GHay")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F3D67E" />
        <stop offset="1" stopColor="#C4953A" />
      </linearGradient>
      <linearGradient id={i("Glass")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#E9FBFE" />
        <stop offset="1" stopColor="#84C0CD" />
      </linearGradient>
      <linearGradient id={i("Silo")} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#F4EFE5" />
        <stop offset="1" stopColor="#A39B8E" />
      </linearGradient>
      <linearGradient id={i("Barn")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#D6683E" />
        <stop offset="1" stopColor="#A9432A" />
      </linearGradient>
      <radialGradient id={i("Tyre")} cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#5E4E3E" />
        <stop offset="1" stopColor="#1F1812" />
      </radialGradient>
      <radialGradient id={i("Skin")} cx="0.38" cy="0.32" r="0.75">
        <stop offset="0" stopColor="#FFE4CC" />
        <stop offset="1" stopColor="#E7A67C" />
      </radialGradient>
      <linearGradient id={i("Over")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4AAAB2" />
        <stop offset="1" stopColor="#1E5A60" />
      </linearGradient>
      <linearGradient id={i("Shirt")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F09163" />
        <stop offset="1" stopColor="#C2562F" />
      </linearGradient>
      <radialGradient id={i("Hat")} cx="0.4" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#FADC86" />
        <stop offset="1" stopColor="#CC922F" />
      </radialGradient>
      <radialGradient id={i("Fur")} cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#E7AD6C" />
        <stop offset="1" stopColor="#B57437" />
      </radialGradient>
      <radialGradient id={i("Tree")} cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor={v.c.treeL} />
        <stop offset="1" stopColor={v.c.treeD} />
      </radialGradient>
      <filter id={i("Blur")} x="-20%" y="-60%" width="140%" height="220%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
      <filter id={i("Soft")} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      <clipPath id={i("Clip")}>
        <polygon points={v.parcelPts} />
      </clipPath>
    </defs>
    <ellipse cx="450" cy="566" rx="400" ry="52" fill="#6B4523" opacity="0.24" filter={u("Blur")} />
    {v.d.sunGold && (
      <g>
        <circle cx="118" cy="92" r="72" fill="#FFC978" opacity=".28" />
        <circle cx="118" cy="92" r="30" fill="#F8C56C" />
        <circle cx="110" cy="84" r="9" fill="#FFE7B8" opacity=".8" />
      </g>
    )}
    {v.d.sunHot && (
      <g>
        <circle cx="806" cy="70" r="66" fill="#F6B444" opacity=".22" />
        <circle cx="806" cy="70" r="34" fill="#F4A93A" />
        <circle cx="796" cy="60" r="10" fill="#FFE1A6" opacity=".7" />
      </g>
    )}
    {v.d.clouds && (
      <g className={k("drift")} fill="#FFF8EC">
        <ellipse cx="640" cy="106" rx="56" ry="8" fill="#EAD8BD" />
        <ellipse cx="640" cy="90" rx="46" ry="20" />
        <ellipse cx="608" cy="98" rx="30" ry="15" />
        <ellipse cx="676" cy="99" rx="30" ry="13" />
        <ellipse cx="320" cy="78" rx="34" ry="5" fill="#EAD8BD" />
        <ellipse cx="320" cy="66" rx="28" ry="13" />
        <ellipse cx="298" cy="72" rx="18" ry="9" />
      </g>
    )}
    <polygon points="80,305 450,490 450,566 80,381" fill="#B9834F" />
    <polygon points="450,490 820,305 820,381 450,566" fill="#946139" />
    <polygon points="80,305 450,490 450,505 80,320" fill="#6E4726" opacity=".55" />
    <polygon points="450,490 820,305 820,320 450,505" fill="#5E3B20" opacity=".5" />
    <polygon points="80,336 450,521 450,532 80,347" fill="#E4C38F" opacity=".45" />
    <polygon points="450,521 820,336 820,347 450,532" fill="#D8B37E" opacity=".35" />
    <g fill="#E8CFA6" opacity=".8">
      <circle cx="150" cy="362" r="3" />
      <circle cx="262" cy="426" r="2.5" />
      <circle cx="386" cy="478" r="3" />
      <circle cx="604" cy="452" r="2.6" />
      <circle cx="732" cy="386" r="3" />
    </g>
    <g stroke="#7A5230" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".55">
      <path d="M200 388 q 4 14 -2 24 M560 470 q -3 12 3 22 M700 408 q 4 10 0 20" />
    </g>
    <polygon points="450,120 820,305 450,490 80,305" fill={u("Top")} stroke={v.c.g1} strokeWidth="8" strokeLinejoin="round" />
    <polyline points="80,305 450,490 820,305" fill="none" stroke="#FFF3DC" strokeOpacity=".5" strokeWidth="2" />
    <polygon points="443,131 494,157 324,242 272,216" fill={v.c.n1} />
    <polygon points="258,224 309,250 154,327 102,301" fill={v.c.n2} />
    <polygon points="768,294 798,309 457,479 428,464" fill={v.c.n3} />
    <polygon points="517,161 753,279 716,298 480,179" fill={v.c.n4} />
    <polygon points="213,312 443,427 395,451 165,337" fill={v.c.n5} />
    <path d="M468 144 L298 229 M481 151 L311 236 M271 231 L115 308 M284 237 L128 314 M778 299 L438 469 M788 304 L448 474 M505 168 L740 286 M492 174 L728 292 M200 318 L430 433 M186 325 L416 440" stroke={v.c.row} strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" fill="none" />
    <polygon points={v.parcelPts} fill={u("Parcel")} stroke={v.c.edge} strokeWidth="2.5" strokeLinejoin="round" />
    <g clipPath={u("Clip")} fill="none" stroke="#FFFFFF" strokeOpacity=".3" strokeWidth="1.4" strokeDasharray="3 5">
      <path d="M505 203 Q378 262 246 333" />
      <path d="M580 222 Q430 292 283 370" />
      <path d="M635 250 Q488 322 339 398" />
      <path d="M690 277 Q545 350 394 425" />
    </g>
    {v.d.cracks && (
      <g clipPath={u("Clip")} fill="none" stroke="#6E4726" strokeOpacity=".55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M320 292 l18 6 l10 -8 l16 10 M356 326 l14 -6 l12 10 l20 -4 M420 246 l10 12 l18 -2 l8 10 M478 300 l16 4 l6 14 l18 2 M540 276 l12 10 l20 -6 M446 348 l18 -4 l10 10 M300 276 l12 8 l-4 12 M580 300 l-10 14 l14 8 M400 300 l8 12 l-10 10" />
      </g>
    )}
    {v.d.irr && (
      <g clipPath={u("Clip")}>
        <ellipse className={k("wet")} cx="468" cy="296" rx="140" ry="70" fill="#3FA3B0" opacity=".32" />
      </g>
    )}
    {v.d.hl && (
      <polygon className={k("glow")} points={v.parcelPts} fill="none" stroke="#FFF6D0" strokeWidth="5" strokeLinejoin="round" filter={u("Soft")} />
    )}
    <path d={v.ditch} fill="none" stroke="#6B4A2E" strokeWidth="16" strokeLinecap="round" />
    <path d={v.ditch} fill="none" stroke={v.c.water} strokeWidth={v.c.ww} strokeLinecap="round" />
    <path className={k("flow")} d={v.ditch} fill="none" stroke="#D8F3F7" strokeWidth="2" strokeLinecap="round" />
    <g>
      <ellipse cx="424" cy="174" rx="18" ry="5" fill="#5A3A1E" opacity=".25" />
      <rect x="408" y="112" width="30" height="62" rx="4" fill={u("Silo")} />
      <path d="M408 113 A 15 13 0 0 1 438 113 Z" fill="#C9C1B3" />
      <ellipse cx="418" cy="106" rx="4" ry="2.5" fill="#FFFFFF" opacity=".6" />
      <path d="M408 132 h30 M408 152 h30" stroke="#8F8779" strokeWidth="1.3" />
      <rect x="413" y="116" width="4" height="54" rx="2" fill="#FFFFFF" opacity=".35" />
    </g>
    <g>
      <polygon points="334,202 368,219 414,196 380,179" fill="#5A3A1E" opacity=".22" />
      <polygon points="332,164 349,148 389,128 372,144" fill="#7A5444" />
      <polygon points="366,215 406,195 406,161 366,181" fill="#94402A" />
      <polygon points="332,198 366,215 366,181 349,148 332,164" fill={u("Barn")} />
      <polygon points="366,181 349,148 389,128 406,161" fill="#5E4034" />
      <path d="M366 181 L349 148 L389 128 L406 161 Z M349 148 L332 164" fill="none" stroke="#3E2A20" strokeWidth="2" strokeLinejoin="round" />
      <path d="M352 154 L392 134" stroke="#FFFFFF" strokeOpacity=".25" strokeWidth="2" strokeLinecap="round" />
      <polygon points="342,203 357,210 357,188 342,181" fill="#7A2E18" stroke="#F3E6CF" strokeWidth="2" strokeLinejoin="round" />
      <path d="M342 203 L357 188 M342 181 L357 210" stroke="#F3E6CF" strokeWidth="1.5" />
      <circle cx="349" cy="166" r="3.5" fill="#F3E6CF" />
      <polygon points="380,196 392,190 392,181 380,187" fill={u("Glass")} stroke="#F3E6CF" strokeWidth="1.5" />
    </g>
    <path d={v.fencePosts} stroke="#8A5A34" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M100 301 L298 400 M100 306 L298 405" stroke="#B07C4E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {v.d.gate && (
      <g>
        <circle className={k("glow")} cx="590" cy="362" r="80" fill={u("Spot")} opacity=".6" />
        <g transform="rotate(-26.6 633 346)">
          <ellipse className={k("rise")} cx="633" cy="346" rx="54" ry="16" fill="#4FB3BF" />
        </g>
        <g transform="rotate(-26.6 626 342)">
          <ellipse cx="626" cy="342" rx="18" ry="4" fill="#E9FBFF" opacity=".65" />
        </g>
        <g transform="translate(583 373)">
          <rect x="-17" y="-24" width="5" height="27" rx="2" fill="#6B4226" />
          <rect x="12" y="-24" width="5" height="27" rx="2" fill="#6B4226" />
          <rect x="-14" y="-18" width="28" height="18" rx="3" fill="#8A5A34" />
          <path d="M-14 -12 h28 M-14 -6 h28" stroke="#6B4226" strokeWidth="1.5" />
          <rect x="-12" y="-17" width="24" height="3" rx="1.5" fill="#F3D9A8" opacity=".7" />
        </g>
      </g>
    )}
    {v.d.corn && (
      <g fill="none" strokeLinecap="round">
        <g className={k("sw0")}>
          <path d={v.corn.s0} stroke={v.c.stem} strokeWidth="1.8" />
          <path d={v.corn.l0} stroke={v.c.leaf} strokeWidth="2.2" />
          <path d={v.corn.t0} stroke={v.c.tassel} strokeWidth="1.4" />
        </g>
        <g className={k("sw1")}>
          <path d={v.corn.s1} stroke={v.c.stem} strokeWidth="1.8" />
          <path d={v.corn.l1} stroke={v.c.leaf} strokeWidth="2.2" />
          <path d={v.corn.t1} stroke={v.c.tassel} strokeWidth="1.4" />
        </g>
        <g className={k("sw2")}>
          <path d={v.corn.s2} stroke={v.c.stem} strokeWidth="1.8" />
          <path d={v.corn.l2} stroke={v.c.leaf} strokeWidth="2.2" />
          <path d={v.corn.t2} stroke={v.c.tassel} strokeWidth="1.4" />
        </g>
      </g>
    )}
    {v.d.cover && (
      <g fill="none" strokeLinecap="round">
        <path d={v.cover.stub} stroke="#7E6238" strokeWidth="1.6" />
        <path className={k("sw1")} d={v.cover.sprout} stroke="#7FB04A" strokeWidth="2.2" />
      </g>
    )}
    {v.d.dew && (
      <g>
        {v.dew.map((p, n) => (
          <g key={n} transform={`translate(${p.x} ${p.y})`}>
            <ellipse className={k(n ? "ripple late" : "ripple")} cx="4.5" cy="10.6" rx="3.5" ry="1.2" fill="none" stroke="#E9FBFF" strokeWidth=".9" />
            <g className={k(n ? "dew late" : "dew")}>
              <path d="M0 -2.8 C -1.2 -1.2 -1.8 -0.4 -1.8 0.4 A 1.8 1.8 0 0 0 1.8 0.4 C 1.8 -0.4 1.2 -1.2 0 -2.8 Z" fill="#E9FBFF" stroke="#7CC6D6" strokeWidth=".7" />
              <circle cx="-0.6" cy="-0.2" r=".5" fill="#FFFFFF" />
            </g>
          </g>
        ))}
      </g>
    )}
    {v.d.particles && (
      <g fill="#7CC6D6" stroke="#FFFFFF" strokeWidth="1">
        <g transform="translate(443 227)">
          <circle className={k("drop")} r="3.4" />
          <circle className={k("drop d2")} r="2.6" />
        </g>
        <g transform="translate(387 255)">
          <circle className={k("drop d1")} r="3.4" />
          <circle className={k("drop d3")} r="2.6" />
        </g>
        <g transform="translate(332 283)">
          <circle className={k("drop d3")} r="3" />
          <circle className={k("drop d1")} r="2.4" />
        </g>
        <g transform="translate(287 305)">
          <circle className={k("drop")} r="3" />
          <circle className={k("drop d2")} r="2.4" />
        </g>
      </g>
    )}
    <g>
      <g transform="translate(240 350)">
        <ellipse cx="0" cy="0" rx="14" ry="4" fill="#5A3A1E" opacity=".25" />
        <rect x="-13" y="-19" width="18" height="19" rx="7" fill={u("GHay")} />
        <circle cx="5" cy="-9.5" r="9.5" fill="#EFCB6C" />
        <path d="M5 -9.5 m-5 0 a5 5 0 1 1 5 5 a3 3 0 1 1 -3 -3" stroke="#C49536" strokeWidth="1.4" fill="none" />
        <rect x="-10" y="-17" width="10" height="3" rx="1.5" fill="#FFFFFF" opacity=".35" />
      </g>
      <g transform="translate(266 364)">
        <ellipse cx="0" cy="0" rx="14" ry="4" fill="#5A3A1E" opacity=".25" />
        <rect x="-13" y="-19" width="18" height="19" rx="7" fill={u("GHay")} />
        <circle cx="5" cy="-9.5" r="9.5" fill="#EFCB6C" />
        <path d="M5 -9.5 m-5 0 a5 5 0 1 1 5 5 a3 3 0 1 1 -3 -3" stroke="#C49536" strokeWidth="1.4" fill="none" />
      </g>
      <g transform="translate(250 340)">
        <ellipse cx="0" cy="0" rx="10" ry="3" fill="#5A3A1E" opacity=".18" />
      </g>
    </g>
    <g>
      <g transform="translate(262 232)">
        <ellipse rx="12" ry="3.5" fill="#5A3A1E" opacity=".25" />
        <rect x="-2.5" y="-15" width="5" height="15" rx="2.5" fill="#7A5230" />
        <circle cx="-7" cy="-20" r="8" fill={u("Tree")} />
        <circle cx="7" cy="-21" r="8" fill={u("Tree")} />
        <circle cy="-27" r="11" fill={u("Tree")} />
        <circle cx="-4" cy="-31" r="3.5" fill="#FFFFFF" opacity=".28" />
      </g>
      <g transform="translate(298 212)">
        <ellipse rx="12" ry="3.5" fill="#5A3A1E" opacity=".25" />
        <rect x="-2.5" y="-16" width="5" height="16" rx="2.5" fill="#7A5230" />
        <circle cx="-8" cy="-22" r="9" fill={u("Tree")} />
        <circle cx="8" cy="-23" r="9" fill={u("Tree")} />
        <circle cy="-30" r="13" fill={u("Tree")} />
        <circle cx="-5" cy="-35" r="4" fill="#FFFFFF" opacity=".28" />
      </g>
      <g transform="translate(176 300)">
        <ellipse rx="12" ry="3.5" fill="#5A3A1E" opacity=".25" />
        <rect x="-2.5" y="-15" width="5" height="15" rx="2.5" fill="#7A5230" />
        <circle cx="-7" cy="-21" r="8" fill={u("Tree")} />
        <circle cx="7" cy="-22" r="8" fill={u("Tree")} />
        <circle cy="-28" r="12" fill={u("Tree")} />
        <circle cx="-4" cy="-32" r="3.5" fill="#FFFFFF" opacity=".28" />
      </g>
      <g transform="translate(214 280)">
        <ellipse rx="9" ry="3" fill="#5A3A1E" opacity=".25" />
        <rect x="-2" y="-12" width="4" height="12" rx="2" fill="#7A5230" />
        <circle cy="-20" r="9" fill={u("Tree")} />
        <circle cx="-3" cy="-23" r="3" fill="#FFFFFF" opacity=".28" />
      </g>
      <g transform="translate(706 350)">
        <ellipse rx="12" ry="3.5" fill="#5A3A1E" opacity=".25" />
        <rect x="-2.5" y="-16" width="5" height="16" rx="2.5" fill="#7A5230" />
        <circle cx="-8" cy="-22" r="8" fill={u("Tree")} />
        <circle cx="8" cy="-23" r="8" fill={u("Tree")} />
        <circle cy="-29" r="12" fill={u("Tree")} />
        <circle cx="-4" cy="-33" r="3.5" fill="#FFFFFF" opacity=".28" />
      </g>
      <g transform="translate(756 322)">
        <ellipse rx="12" ry="3.5" fill="#5A3A1E" opacity=".25" />
        <rect x="-2.5" y="-14" width="5" height="14" rx="2.5" fill="#7A5230" />
        <circle cx="-7" cy="-20" r="7" fill={u("Tree")} />
        <circle cx="7" cy="-21" r="7" fill={u("Tree")} />
        <circle cy="-26" r="11" fill={u("Tree")} />
        <circle cx="-4" cy="-30" r="3.5" fill="#FFFFFF" opacity=".28" />
      </g>
    </g>
    {v.d.marker && (
      <g>
        <ellipse className={k("pulse")} cx="583" cy="373" rx="24" ry="12" fill="none" stroke="#0E6E73" strokeWidth="3" />
        <ellipse className={k("pulse pulse2")} cx="583" cy="373" rx="24" ry="12" fill="none" stroke="#0E6E73" strokeWidth="3" />
        <g transform="translate(583 350)">
          <g className={k("bob")}>
            <path d="M0 0 C -4 -10, -14 -16, -14 -28 A 14 14 0 1 1 14 -28 C 14 -16, 4 -10, 0 0 Z" fill="#0E6E73" stroke="#FFFFFF" strokeWidth="2.5" />
            <path d="M0 -38 C -4 -32, -6 -29, -6 -26 A 6 6 0 0 0 6 -26 C 6 -29, 4 -32, 0 -38 Z" fill="#FFFFFF" />
          </g>
        </g>
      </g>
    )}
    {v.d.gate && (
      <g transform="translate(652 374) scale(-1 1)">
        <ellipse rx="34" ry="7" fill="#5A3A1E" opacity=".28" />
        <rect x="-30" y="-12" width="60" height="14" rx="7" fill="#3B2F25" />
        <circle cx="-20" cy="-5" r="4" fill="#8C7A66" />
        <circle cx="0" cy="-5" r="4" fill="#8C7A66" />
        <circle cx="20" cy="-5" r="4" fill="#8C7A66" />
        <rect x="-24" y="-33" width="40" height="23" rx="8" fill={u("GYellow")} />
        <rect x="-19" y="-30" width="22" height="5" rx="2.5" fill="#FFFFFF" opacity=".4" />
        <rect x="-20" y="-54" width="22" height="22" rx="7" fill={u("GYellow")} />
        <rect x="-16" y="-50" width="14" height="12" rx="4" fill={u("Glass")} />
        <path d="M-13 -40 l6 -8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity=".7" />
        <g className={k("dig")}>
          <path d="M12 -26 L 34 -50 L 54 -28" stroke="#C98425" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M14 -28 L 34 -50" stroke="#F8D57A" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 -30 l 11 3 l -3 10 l -11 -3 z" fill="#4A3A2C" />
        </g>
      </g>
    )}
    <g transform={`translate(${v.tr.x} ${v.tr.y}) scale(.72)`}>
      <g className={k(v.tr.cls)}>
        <g className={k("rumble")}>
          <ellipse cx="-8" rx="52" ry="9" fill="#5A3A1E" opacity=".28" />
          {v.tr.seed && (
            <g>
              <path d="M-50 -18 h-10" stroke="#3B2F25" strokeWidth="3" />
              <rect x="-100" y="-36" width="44" height="24" rx="7" fill={u("GOlive")} />
              <path d="M-96 -36 l6 -11 h32 l6 11 z" fill="#B6C26E" />
              <rect x="-94" y="-32" width="24" height="4" rx="2" fill="#FFFFFF" opacity=".35" />
              <circle cx="-88" cy="-9" r="8" fill={u("Tyre")} />
              <circle cx="-66" cy="-9" r="8" fill={u("Tyre")} />
              <g fill="#F1D27A">
                <circle className={k("seed")} cx="-92" cy="-12" r="2" />
                <circle className={k("seed d1")} cx="-78" cy="-12" r="2" />
                <circle className={k("seed d2")} cx="-64" cy="-12" r="2" />
              </g>
            </g>
          )}
          <rect x="-32" y="-28" width="68" height="9" rx="4.5" fill="#6B2E1A" />
          <path d="M-8 -50 h36 q10 0 10 10 v13 q0 8 -8 8 h-38 z" fill={u("GRed")} />
          <path d="M-2 -46 h28" stroke="#FFFFFF" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" />
          <path d="M10 -42 C 8 -38, 7 -36, 7 -34 A 3 3 0 0 0 13 -34 C 13 -36, 12 -38, 10 -42 Z" fill="#FFFFFF" opacity=".85" />
          <rect x="35" y="-46" width="5" height="17" rx="2.5" fill="#6B2E1A" />
          <circle cx="38" cy="-47" r="3.6" fill="#FFF6C8" stroke="#6B2E1A" strokeWidth="1.2" />
          <rect x="18" y="-70" width="5" height="22" rx="2.5" fill="#3B2F25" />
          <rect x="16" y="-72" width="9" height="4" rx="2" fill="#3B2F25" />
          <circle className={k("puff")} cx="21" cy="-78" r="5" fill="#F4EADB" />
          <circle className={k("puff puff2")} cx="21" cy="-78" r="5" fill="#F4EADB" />
          <path d="M-42 -50 v-30 q0 -9 9 -9 h24 q9 0 9 9 v30 z" fill={u("GRed")} />
          <rect x="-37" y="-83" width="27" height="24" rx="6" fill={u("Glass")} />
          {v.tr.driver && (
            <g>
              <circle cx="-24" cy="-67" r="6.5" fill={u("Skin")} />
              <ellipse cx="-24" cy="-73" rx="9" ry="2.6" fill={u("Hat")} />
              <rect x="-29" y="-79" width="10" height="6" rx="3" fill={u("Hat")} />
            </g>
          )}
          <path d="M-33 -64 l10 -15 M-26 -62 l6 -9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity=".65" />
          <rect x="-46" y="-96" width="46" height="9" rx="4.5" fill="#FFF1D6" />
          <rect x="-42" y="-94" width="24" height="3" rx="1.5" fill="#FFFFFF" opacity=".8" />
          <circle cx="28" cy="-13" r="13" fill={u("Tyre")} />
          <circle cx="28" cy="-13" r="10" fill="none" stroke="#14100C" strokeWidth="2.5" strokeDasharray="3 3" />
          <circle cx="28" cy="-13" r="6" fill={u("GYellow")} />
          <circle cx="28" cy="-13" r="2.4" fill="#8A5A1A" />
          <circle cx="-20" cy="-22" r="22" fill={u("Tyre")} />
          <circle cx="-20" cy="-22" r="18" fill="none" stroke="#14100C" strokeWidth="3.5" strokeDasharray="4 4" />
          <circle cx="-20" cy="-22" r="11" fill={u("GYellow")} />
          <circle cx="-20" cy="-22" r="4" fill="#8A5A1A" />
          <circle cx="-24" cy="-26" r="3" fill="#FFF1C8" opacity=".75" />
          <path d="M-46 -24 a 26 26 0 0 1 52 0" fill="none" stroke="#C8553A" strokeWidth="7" strokeLinecap="round" />
          <path d="M-40 -34 a 22 22 0 0 1 14 -12" fill="none" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </g>
    </g>
    {v.d.irr && (
      <g>
        <rect x="466" y="268" width="4" height="30" rx="2" fill="#5B4D3E" />
        <g transform="translate(468 266) scale(1 0.55)">
          <g className={k("spin")} fill="none" stroke="#DDF5F9" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round">
            <path d="M0 0 Q 50 -70 110 -8" />
            <path d="M0 0 Q 50 -70 110 -8" transform="rotate(90)" />
            <path d="M0 0 Q 50 -70 110 -8" transform="rotate(180)" />
            <path d="M0 0 Q 50 -70 110 -8" transform="rotate(270)" />
          </g>
        </g>
        <circle cx="468" cy="266" r="6" fill="#0E6E73" stroke="#FFFFFF" strokeWidth="2" />
      </g>
    )}
    <g transform={`translate(${v.dog.x} ${v.dog.y}) scale(1.05)`}>
      <ellipse rx="13" ry="3.5" fill="#5A3A1E" opacity=".25" />
      <g className={k("breathe")}>
        <rect x="-7" y="-7" width="4" height="7" rx="2" fill="#B57437" />
        <rect x="4" y="-7" width="4" height="7" rx="2" fill="#B57437" />
        <path className={k("wag")} d="M-9 -11 q -7 -3 -8 -11" stroke="#C98A4B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <ellipse cx="0" cy="-11" rx="11" ry="7" fill={u("Fur")} />
        <ellipse cx="-2" cy="-9" rx="6" ry="3.5" fill="#F3D3AE" />
        <circle cx="10" cy="-19" r="7.5" fill={u("Fur")} />
        <ellipse cx="6" cy="-22" rx="3" ry="5.5" transform="rotate(20 6 -22)" fill="#8A5A34" />
        <ellipse cx="15.5" cy="-16.5" rx="4.5" ry="3.2" fill="#F3D3AE" />
        <circle cx="19.5" cy="-17.5" r="1.8" fill="#2A2118" />
        <circle cx="11.5" cy="-21" r="1.4" fill="#2A2118" />
        <circle cx="11.9" cy="-21.4" r=".5" fill="#FFFFFF" />
        <path d="M14 -13.5 q 2 2.5 4 0" stroke="#E06A6A" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M3 -14 h7" stroke="#0E6E73" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </g>
    <g transform={`translate(${v.f.x} ${v.f.y}) scale(.86)`}>
      <ellipse rx="18" ry="5" fill="#5A3A1E" opacity=".28" />
      <g className={k(v.f.cls)}>
        <ellipse cx="-6.5" cy="-3" rx="6.5" ry="4" fill="#4A3A2C" />
        <ellipse cx="6.5" cy="-3" rx="6.5" ry="4" fill="#4A3A2C" />
        <ellipse cx="-8" cy="-4.5" rx="2.5" ry="1.2" fill="#FFFFFF" opacity=".3" />
        <rect x="-10" y="-17" width="8" height="14" rx="4" fill="#1E5A60" />
        <rect x="2" y="-17" width="8" height="14" rx="4" fill="#1E5A60" />
        <path d="M-15 -13 C -17 -35, -10 -45, 0 -45 C 10 -45, 17 -35, 15 -13 C 11 -7, -11 -7, -15 -13 Z" fill={u("Shirt")} />
        <path d="M-6 -45 l6 4 l6 -4" stroke="#A9432A" strokeWidth="1.2" fill="none" opacity=".6" />
        <path d="M-13.5 -15 C -14.5 -25, -12 -31, -8 -33 L 8 -33 C 12 -31, 14.5 -25, 13.5 -15 C 9 -9.5, -9 -9.5, -13.5 -15 Z" fill={u("Over")} />
        <path d="M-7 -33 L -9 -44 M7 -33 L 9 -44" stroke="#2B7880" strokeWidth="3" strokeLinecap="round" />
        <circle cx="-7" cy="-32" r="1.7" fill="#F3D9A8" />
        <circle cx="7" cy="-32" r="1.7" fill="#F3D9A8" />
        <rect x="-4.5" y="-29" width="9" height="6.5" rx="2" fill="#2B7880" />
        <ellipse cx="-9" cy="-26" rx="2.5" ry="6" fill="#FFFFFF" opacity=".22" />
        {v.f.down && (
          <g>
            <path d="M-13 -37 Q -21 -27 -19 -17" fill="none" stroke="#D9693F" strokeWidth="7" strokeLinecap="round" />
            <circle cx="-19" cy="-15.5" r="3.8" fill={u("Skin")} />
            <path d="M13 -37 Q 21 -27 19 -17" fill="none" stroke="#D9693F" strokeWidth="7" strokeLinecap="round" />
            <circle cx="19" cy="-15.5" r="3.8" fill={u("Skin")} />
          </g>
        )}
        {v.f.wipe && (
          <g>
            <path d="M-13 -37 Q -21 -27 -19 -17" fill="none" stroke="#D9693F" strokeWidth="7" strokeLinecap="round" />
            <circle cx="-19" cy="-15.5" r="3.8" fill={u("Skin")} />
          </g>
        )}
        {v.f.cheer && (
          <g>
            <path d="M-13 -37 Q -25 -47 -22 -61" fill="none" stroke="#D9693F" strokeWidth="7" strokeLinecap="round" />
            <circle cx="-22" cy="-63" r="3.8" fill={u("Skin")} />
            <path d="M13 -37 Q 25 -47 22 -61" fill="none" stroke="#D9693F" strokeWidth="7" strokeLinecap="round" />
            <circle cx="22" cy="-63" r="3.8" fill={u("Skin")} />
          </g>
        )}
        <circle cx="-13.5" cy="-57" r="3.6" fill="#EBAE86" />
        <circle cx="13.5" cy="-57" r="3.6" fill="#EBAE86" />
        <circle cy="-58" r="14" fill={u("Skin")} />
        <ellipse cx="-6" cy="-64" rx="4" ry="2.5" fill="#FFFFFF" opacity=".35" />
        <ellipse cx="-7.5" cy="-52.5" rx="3.2" ry="2.1" fill="#F08A72" opacity=".55" />
        <ellipse cx="7.5" cy="-52.5" rx="3.2" ry="2.1" fill="#F08A72" opacity=".55" />
        <ellipse cx="-5" cy={v.f.eyeY} rx="1.9" ry="2.5" fill="#2A2118" />
        <ellipse cx="5" cy={v.f.eyeY} rx="1.9" ry="2.5" fill="#2A2118" />
        <circle cx="-4.4" cy={v.f.glintY} r=".8" fill="#FFFFFF" />
        <circle cx="5.6" cy={v.f.glintY} r=".8" fill="#FFFFFF" />
        <path d={v.f.brows} stroke="#6E4726" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <ellipse cx="0" cy="-54.5" rx="2.8" ry="2.3" fill="#E38F68" />
        <path d="M-7 -50.5 q 3.5 -3.5 7 -0.5 q 3.5 -3 7 0.5 q -3.5 2.5 -7 0.8 q -3.5 1.7 -7 -0.8 z" fill="#8A5A34" />
        <path d={v.f.mouth} fill="none" stroke="#7A3B2A" strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cy="-66" rx="21" ry="5" fill="#B5802A" opacity=".55" />
        <ellipse cy="-68" rx="23" ry="6" fill={u("Hat")} />
        <path d="M-12 -69 C -12 -82, 12 -82, 12 -69 Z" fill={u("Hat")} />
        <rect x="-12" y="-72.5" width="24" height="3.5" rx="1.5" fill="#B4532A" />
        <path d="M-17 -67 h6 M-5 -64.5 h6 M8 -66.5 h7" stroke="#C08A2C" strokeWidth="1" strokeLinecap="round" opacity=".7" />
        <ellipse cx="-5" cy="-78" rx="3.5" ry="1.6" fill="#FFFFFF" opacity=".45" />
        {v.f.wipe && (
          <g>
            <g className={k("wipe")}>
              <path d="M13 -37 Q 26 -49 11 -62" fill="none" stroke="#D9693F" strokeWidth="7" strokeLinecap="round" />
              <circle cx="10.5" cy="-63" r="3.8" fill={u("Skin")} />
            </g>
            <path className={k("sweat")} d="M-16 -66 C -18.5 -61.5, -19.5 -59, -16 -57.5 C -12.5 -59, -13.5 -61.5, -16 -66 Z" fill="#9ED8E4" stroke="#FFFFFF" strokeWidth=".8" />
          </g>
        )}
      </g>
    </g>
    {v.d.heat && (
      <g fill="none" stroke="#FFF1D6" strokeWidth="2.2" strokeLinecap="round">
        <path className={k("shimmer")} d="M300 236 q 20 -8 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0" />
        <path className={k("shimmer d1")} d="M340 272 q 20 -8 40 0 t 40 0 t 40 0 t 40 0 t 40 0" />
        <path className={k("shimmer d2")} d="M380 204 q 20 -8 40 0 t 40 0 t 40 0 t 40 0" />
      </g>
    )}
    {v.d.gust && (
      <g fill="none" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round">
        <path className={k("gust")} d="M180 250 q 70 -26 140 -6 t 140 -4" />
        <path className={k("gust d2")} d="M330 330 q 70 -26 140 -6 t 140 -4" />
      </g>
    )}
    {v.d.twinkle && (
      <g fill="#FFFFFF">
        <g transform="translate(380 250)">
          <path className={k("twinkle")} d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" />
        </g>
        <g transform="translate(470 228)">
          <path className={k("twinkle d1")} d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" />
        </g>
        <g transform="translate(522 300)">
          <path className={k("twinkle d2")} d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" />
        </g>
        <g transform="translate(418 322)">
          <path className={k("twinkle d3")} d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" />
        </g>
        <g transform="translate(590 266)">
          <path className={k("twinkle d1")} d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" />
        </g>
        <g transform="translate(330 298)">
          <path className={k("twinkle d2")} d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" />
        </g>
      </g>
    )}
    {labels && (
      <g style={{ fontFamily: "var(--font-figtree), Figtree, sans-serif" }} fontSize="13" fontWeight="700">
        <rect x="470" y="198" width="168" height="28" rx="14" fill="#FFFDF8" fillOpacity=".95" stroke="#E6D6BC" />
        <text x="554" y="217" textAnchor="middle" fill="#2A2118">{areaLabel}</text>
        {showDitch && (
          <g>
            <rect x="650" y="244" width="138" height="26" rx="13" fill="#FFFDF8" fillOpacity=".95" stroke="#E6D6BC" />
            <text x="719" y="262" textAnchor="middle" fill="#2A2118">Rów melioracyjny</text>
          </g>
        )}
        {slopeLabel && (
          <g>
            <path d="M394 277 L488 324 M488 324 l -6.6 -10 M488 324 l -12 0.7" stroke="#FFFDF8" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".85" />
            <path d="M394 277 L488 324 M488 324 l -6.6 -10 M488 324 l -12 0.7" stroke="#2A2118" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <rect x="296" y="248" width="108" height="26" rx="13" fill="#2A2118" />
            <text x="350" y="266" textAnchor="middle" fill="#FFFDF8">{slopeLabel}</text>
          </g>
        )}
        {v.d.markLabel && (
          <g>
            <rect x="606" y="318" width="178" height="28" rx="14" fill="#0E6E73" />
            <text x="695" y="337" textAnchor="middle" fill="#FFFFFF">Tu warto zatrzymać wodę</text>
          </g>
        )}
        {v.d.gateLabel && (
          <g>
            <rect x="606" y="402" width="186" height="28" rx="14" fill="#0E6E73" />
            <text x="699" y="421" textAnchor="middle" fill="#FFFFFF">{gateText}</text>
          </g>
        )}
      </g>
    )}
    <rect x="0" y="0" width="900" height="640" fill={u("Warm")} pointerEvents="none" />
    </>
  )
}
