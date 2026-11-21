import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"

export const COLORS = {
  ink: "#2A2118",
  white: "#FFFDF8",
  cream: "#F7E9D0",
  skin: "#F6C39C",
  skinDark: "#E9A77F",
  blush: "#F08A72",
  nose: "#E38F68",
  beard: "#8A5A34",
  brow: "#6E4726",
  mouth: "#7A3B2A",
  hat: "#EFC562",
  hatBand: "#B4532A",
  shirt: "#E27A4A",
  sleeve: "#D9693F",
  overalls: "#2F7FA8",
  overallsDark: "#1F5675",
  strap: "#2A6E93",
  button: "#F3D9A8",
  boot: "#4A3A2C",
  fur: "#D69552",
  furLight: "#F3D3AE",
  furDark: "#8A5A34",
  collar: "#0E6E73",
  tongue: "#E06A6A",
  red: "#D4553A",
  redDark: "#8E3420",
  tyre: "#2A211A",
  hub: "#F2B53A",
  hubDark: "#8A5A1A",
  exhaust: "#3B2F25",
  lamp: "#FFF6C8",
  olive: "#8E9A4A",
  oliveLight: "#B6C26E",
  yellow: "#EDB443",
  yellowDark: "#C98425",
  track: "#3B2F25",
  roller: "#8C7A66",
  bucket: "#4A3A2C",
  barnRed: "#C4573A",
  barnRoof: "#8B8580",
  trim: "#F3E6CF",
  door: "#7A2E18",
  stone: "#B9A58A",
  silo: "#E6E3DC",
  siloRoof: "#C9C1B3",
  siloBand: "#8F8779",
  trunk: "#7A5230",
  leaf: "#7DAF46",
  leafDark: "#6E9B3A",
  leafLight: "#9DB25C",
  wood: "#8A5A34",
  woodDark: "#6B4226",
  woodLight: "#F3D9A8",
  teal: "#0E6E73",
  water: "#3FA3B0",
  waterLight: "#9ED8E4",
  seed: "#F1D27A",
  dirt: "#8A5A34",
  pole: "#5B4D3E",
  cover: "#7FB04A",
  sand: "#D9C38E",
  glass: "#CBEEF3",
  shadow: "#5A3A1E",
} as const

export type MatName = keyof typeof COLORS
export type GeoName =
  | "sphere"
  | "hemi"
  | "cyl"
  | "cone"
  | "limb"
  | "rbox"
  | "torus"
  | "arc"
  | "tyre"
  | "disc"
  | "circle"

type Kit = { geo: Record<GeoName, THREE.BufferGeometry>; mat: Record<MatName, THREE.Material> }

let kit: Kit | null = null

function createKit(): Kit {
  const geo: Record<GeoName, THREE.BufferGeometry> = {
    sphere: new THREE.SphereGeometry(1, 22, 16),
    hemi: new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 22),
    cone: new THREE.ConeGeometry(1, 1, 18),
    limb: new THREE.CapsuleGeometry(0.5, 1, 5, 12).translate(0, -1, 0),
    rbox: new RoundedBoxGeometry(1, 1, 1, 3, 0.2),
    torus: new THREE.TorusGeometry(1, 0.12, 10, 32),
    arc: new THREE.TorusGeometry(1, 0.22, 8, 16, Math.PI),
    tyre: new THREE.TorusGeometry(0.72, 0.28, 12, 26),
    disc: new THREE.CylinderGeometry(1, 1, 1, 22).rotateX(Math.PI / 2),
    circle: new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2),
  }
  const mat = {} as Record<MatName, THREE.Material>
  for (const name of Object.keys(COLORS) as MatName[]) {
    mat[name] = new THREE.MeshStandardMaterial({ color: COLORS[name], roughness: 0.58, metalness: 0 })
  }
  mat.glass = new THREE.MeshStandardMaterial({ color: COLORS.glass, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.78 })
  mat.silo = new THREE.MeshStandardMaterial({ color: COLORS.silo, roughness: 0.3, metalness: 0.2 })
  mat.siloRoof = new THREE.MeshStandardMaterial({ color: COLORS.siloRoof, roughness: 0.28, metalness: 0.25 })
  mat.water = new THREE.MeshStandardMaterial({ color: COLORS.water, roughness: 0.15, emissive: "#16606a", emissiveIntensity: 0.35 })
  mat.teal = new THREE.MeshStandardMaterial({ color: COLORS.teal, roughness: 0.35, emissive: COLORS.teal, emissiveIntensity: 0.45 })
  mat.lamp = new THREE.MeshStandardMaterial({ color: COLORS.lamp, emissive: COLORS.lamp, emissiveIntensity: 0.6 })
  mat.shadow = new THREE.MeshBasicMaterial({
    color: COLORS.shadow,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  return { geo, mat }
}

export function getKit(): Kit {
  if (!kit) kit = createKit()
  return kit
}
