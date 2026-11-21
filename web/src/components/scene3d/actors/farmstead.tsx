"use client"

import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { Vec3 } from "../contract"
import { COLORS } from "./kit"
import { Blob, Part } from "./part"
import { useActorFrame } from "./motion"

function barnBodyGeometry() {
  const s = new THREE.Shape()
  s.moveTo(-3, 0)
  s.lineTo(3, 0)
  s.lineTo(3, 3.6)
  s.lineTo(1.9, 5.0)
  s.lineTo(0, 5.7)
  s.lineTo(-1.9, 5.0)
  s.lineTo(-3, 3.6)
  s.closePath()
  return new THREE.ExtrudeGeometry(s, { depth: 8, bevelEnabled: false }).translate(0, 0, -4)
}

const roofSlab = (a: [number, number], b: [number, number], side: 1 | -1) => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  const nx = -dy / len
  const ny = dx / len
  const flip = side === 1 ? 1 : -1
  return {
    p: [(a[0] + b[0]) / 2 + nx * 0.12 * flip, (a[1] + b[1]) / 2 + ny * 0.12 * flip, 0] as Vec3,
    s: [len + 0.35, 0.24, 8.7] as Vec3,
    r: [0, 0, Math.atan2(dy, dx)] as Vec3,
  }
}

const ROOF = [
  roofSlab([-3.15, 3.45], [-1.9, 5.0], 1),
  roofSlab([-1.9, 5.0], [0, 5.7], 1),
  roofSlab([1.9, 5.0], [0, 5.7], -1),
  roofSlab([3.15, 3.45], [1.9, 5.0], -1),
]

export function Barn() {
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: COLORS.barnRed, roughness: 0.62 }), [])
  const geometry = useMemo(() => barnBodyGeometry(), [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  return (
    <group>
      <Blob r={5.4} sx={0.85} />
      <Part g="rbox" m="stone" p={[0, 0.1, 0]} s={[6.3, 0.35, 8.3]} />
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {ROOF.map((r, i) => (
        <Part key={i} g="rbox" m="barnRoof" p={r.p} s={r.s} r={r.r} />
      ))}
      {[-3, 3].map((x) =>
        [-4, 4].map((z) => <Part key={`${x}${z}`} g="rbox" m="trim" p={[x, 1.85, z]} s={[0.22, 3.6, 0.22]} />),
      )}
      <Part g="rbox" m="door" p={[0, 1.25, 4.02]} s={[2.2, 2.5, 0.12]} />
      <Part g="rbox" m="trim" p={[0, 2.55, 4.08]} s={[2.5, 0.18, 0.14]} />
      <Part g="rbox" m="trim" p={[-1.15, 1.25, 4.08]} s={[0.16, 2.5, 0.14]} />
      <Part g="rbox" m="trim" p={[1.15, 1.25, 4.08]} s={[0.16, 2.5, 0.14]} />
      <Part g="rbox" m="trim" p={[0, 1.25, 4.1]} s={[3.1, 0.14, 0.1]} r={[0, 0, 0.85]} />
      <Part g="rbox" m="trim" p={[0, 1.25, 4.1]} s={[3.1, 0.14, 0.1]} r={[0, 0, -0.85]} />
      <Part g="disc" m="trim" p={[0, 4.2, 4.02]} s={[0.55, 0.55, 0.12]} />
      <Part g="disc" m="glass" p={[0, 4.2, 4.06]} s={[0.4, 0.4, 0.1]} />
      <Part g="rbox" m="trim" p={[3.02, 2.1, 1.6]} s={[0.1, 1.2, 1.3]} />
      <Part g="rbox" m="glass" p={[3.06, 2.1, 1.6]} s={[0.06, 0.9, 1.0]} />
      <Part g="rbox" m="trim" p={[3.02, 2.1, -1.6]} s={[0.1, 1.2, 1.3]} />
      <Part g="rbox" m="glass" p={[3.06, 2.1, -1.6]} s={[0.06, 0.9, 1.0]} />
    </group>
  )
}

export function Silo() {
  return (
    <group>
      <Blob r={1.7} />
      <Part g="cyl" m="silo" p={[0, 3.1, 0]} s={[1.25, 6.2, 1.25]} />
      <Part g="hemi" m="siloRoof" p={[0, 6.2, 0]} s={[1.3, 1.0, 1.3]} />
      <Part g="sphere" m="siloRoof" p={[0, 7.25, 0]} s={0.16} />
      {[1.6, 3.2, 4.8].map((y) => (
        <Part key={y} g="torus" m="siloBand" p={[0, y, 0]} s={[1.26, 1.26, 0.5]} r={[Math.PI / 2, 0, 0]} />
      ))}
      <Part g="rbox" m="siloBand" p={[0, 3.1, 1.28]} s={[0.28, 6.0, 0.06]} />
    </group>
  )
}

export function Tree({ seed, dry }: { seed: number; dry: boolean }) {
  const crown = useRef<THREE.Group>(null)
  useActorFrame((t, _s, _dt, animate) => {
    if (!crown.current) return
    crown.current.rotation.z = animate ? Math.sin(t * 1.6 + seed * 0.8) * 0.04 : 0
    crown.current.rotation.x = animate ? Math.sin(t * 1.1 + seed) * 0.025 : 0
  })
  const main = dry ? "leafLight" : "leaf"
  return (
    <group>
      <Blob r={1.5} />
      <Part g="cyl" m="trunk" p={[0, 0.9, 0]} s={[0.24, 1.8, 0.24]} />
      <group ref={crown} position={[0, 1.4, 0]}>
        <Part g="sphere" m={main} p={[0, 1.35, 0]} s={1.15} />
        <Part g="sphere" m="leafDark" p={[-0.75, 0.8, 0.25]} s={0.82} />
        <Part g="sphere" m="leafDark" p={[0.75, 0.85, -0.15]} s={0.85} />
        <Part g="sphere" m="leafLight" p={[-0.35, 1.9, 0.6]} s={0.3} />
      </group>
    </group>
  )
}
