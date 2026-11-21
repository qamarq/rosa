"use client"

import { useEffect, useMemo, useRef } from "react"
import type { RefObject } from "react"
import * as THREE from "three"
import { COLORS, getKit } from "./kit"
import { Blob, Part } from "./part"
import { fract, span, springOut, useActorFrame } from "./motion"

export type Rig = { roll: number; moving: boolean; seeding: boolean; boom: number; stick: number; bucket: number }

export const newRig = (): Rig => ({ roll: 0, moving: false, seeding: false, boom: 0.75, stick: -1.9, bucket: -0.4 })

function Wheel({ r, hubRef }: { r: number; hubRef: (el: THREE.Group | null) => void }) {
  return (
    <group ref={hubRef} scale={r}>
      <Part g="tyre" m="tyre" />
      <Part g="disc" m="hub" s={[0.52, 0.52, 0.46]} />
      <Part g="rbox" m="hubDark" s={[0.85, 0.12, 0.5]} />
      <Part g="sphere" m="hubDark" s={[0.14, 0.14, 0.3]} />
    </group>
  )
}

export function TractorModel({ rig, seeder = false }: { rig: RefObject<Rig>; seeder?: boolean }) {
  const wheels = useRef<(THREE.Group | null)[]>([])
  const body = useRef<THREE.Group>(null)
  const puffs = useRef<(THREE.Mesh | null)[]>([])
  const seeds = useRef<(THREE.Mesh | null)[]>([])

  useActorFrame((t, _s, _dt, animate) => {
    const r = rig.current
    wheels.current.forEach((w, i) => {
      if (w) w.rotation.z = -r.roll * (i < 2 ? 1 : 1.63)
    })
    if (body.current) body.current.position.y = animate && r.moving ? Math.abs(Math.sin(t * 22)) * 0.025 : 0
    puffs.current.forEach((p, i) => {
      if (!p) return
      const u = animate ? fract(t / 1.1 + i * 0.5) : 0.35 + i * 0.3
      p.position.set(0.86 - u * 0.5, 2.3 + u * 0.9, 0.28)
      p.scale.setScalar(0.08 + 0.26 * Math.sin(u * Math.PI))
    })
    seeds.current.forEach((s, i) => {
      if (!s) return
      s.visible = r.seeding
      const u = animate ? fract(t * 2.2 + i / 3) : i / 3
      s.position.set(-2.45 + i * 0.25, 0.5 - u * 0.42, (i - 1) * 0.45)
    })
  })

  return (
    <group>
      <Blob r={1.2} sx={seeder ? 2.2 : 1.5} />
      <group ref={body}>
        <Part g="rbox" m="redDark" p={[0.15, 0.78, 0]} s={[2.3, 0.32, 0.9]} />
        <Part g="rbox" m="red" p={[0.68, 1.18, 0]} s={[1.35, 0.72, 0.86]} />
        <Part g="rbox" m="white" p={[0.6, 1.53, 0]} s={[1.0, 0.06, 0.5]} />
        <Part g="rbox" m="redDark" p={[1.35, 1.12, 0]} s={[0.1, 0.52, 0.62]} />
        <Part g="sphere" m="lamp" p={[1.36, 1.33, 0.3]} s={0.09} />
        <Part g="sphere" m="lamp" p={[1.36, 1.33, -0.3]} s={0.09} />
        <Part g="rbox" m="red" p={[-0.45, 1.38, 0]} s={[1.05, 0.95, 1.02]} />
        <Part g="rbox" m="glass" p={[-0.45, 2.2, 0]} s={[0.92, 0.75, 0.96]} />
        <Part g="rbox" m="cream" p={[-0.45, 2.64, 0]} s={[1.25, 0.14, 1.18]} />
        <Part g="sphere" m="skin" p={[-0.5, 2.18, 0]} s={0.2} />
        <Part g="cyl" m="hat" p={[-0.5, 2.36, 0]} s={[0.3, 0.03, 0.3]} />
        <Part g="sphere" m="hat" p={[-0.5, 2.38, 0]} s={[0.16, 0.11, 0.16]} />
        <Part g="cyl" m="exhaust" p={[0.86, 1.85, 0.28]} s={[0.065, 0.85, 0.065]} />
        <Part g="cyl" m="exhaust" p={[0.86, 2.28, 0.28]} s={[0.1, 0.06, 0.1]} />
        <Part g="arc" m="red" p={[-0.55, 0.64, 0.66]} s={[0.76, 0.76, 1.3]} />
        <Part g="arc" m="red" p={[-0.55, 0.64, -0.66]} s={[0.76, 0.76, 1.3]} />
        {[0, 1].map((i) => (
          <mesh
            key={i}
            ref={(el) => {
              puffs.current[i] = el
            }}
            geometry={getKit().geo.sphere}
            material={getKit().mat.cream}
          />
        ))}
      </group>
      <group position={[-0.55, 0.64, 0.66]}>
        <Wheel r={0.64} hubRef={(el) => {
            wheels.current[0] = el
          }} />
      </group>
      <group position={[-0.55, 0.64, -0.66]}>
        <Wheel r={0.64} hubRef={(el) => {
            wheels.current[1] = el
          }} />
      </group>
      <group position={[0.95, 0.39, 0.52]}>
        <Wheel r={0.39} hubRef={(el) => {
            wheels.current[2] = el
          }} />
      </group>
      <group position={[0.95, 0.39, -0.52]}>
        <Wheel r={0.39} hubRef={(el) => {
            wheels.current[3] = el
          }} />
      </group>
      {seeder && (
        <group>
          <Part g="rbox" m="exhaust" p={[-1.5, 0.62, 0]} s={[0.9, 0.09, 0.09]} />
          <Part g="rbox" m="olive" p={[-2.45, 1.0, 0]} s={[1.05, 0.62, 1.7]} />
          <Part g="rbox" m="oliveLight" p={[-2.45, 1.37, 0]} s={[1.15, 0.14, 1.8]} />
          <Part g="rbox" m="white" p={[-2.3, 1.12, 0.86]} s={[0.6, 0.1, 0.02]} />
          <Part g="rbox" m="exhaust" p={[-2.45, 0.58, 0]} s={[0.22, 0.14, 2.1]} />
          <group position={[-2.45, 0.27, 0.98]} scale={0.27}>
            <Part g="tyre" m="tyre" />
            <Part g="disc" m="hub" s={[0.52, 0.52, 0.46]} />
          </group>
          <group position={[-2.45, 0.27, -0.98]} scale={0.27}>
            <Part g="tyre" m="tyre" />
            <Part g="disc" m="hub" s={[0.52, 0.52, 0.46]} />
          </group>
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              ref={(el) => {
                seeds.current[i] = el
              }}
              geometry={getKit().geo.sphere}
              material={getKit().mat.seed}
              scale={0.06}
            />
          ))}
        </group>
      )}
    </group>
  )
}

export function ExcavatorModel({ rig }: { rig: RefObject<Rig> }) {
  const boom = useRef<THREE.Group>(null)
  const stick = useRef<THREE.Group>(null)
  const bucket = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)

  useActorFrame((t, _s, _dt, animate) => {
    const r = rig.current
    if (boom.current) boom.current.rotation.z = r.boom
    if (stick.current) stick.current.rotation.z = r.stick
    if (bucket.current) bucket.current.rotation.z = r.bucket
    if (body.current) body.current.position.y = animate && r.moving ? Math.abs(Math.sin(t * 18)) * 0.03 : 0
  })

  return (
    <group>
      <Blob r={1.4} sx={1.3} />
      {[0.62, -0.62].map((z) => (
        <group key={z}>
          <Part g="rbox" m="track" p={[0, 0.3, z]} s={[2.4, 0.56, 0.5]} />
          {[-0.75, 0, 0.75].map((x) => (
            <Part key={x} g="disc" m="roller" p={[x, 0.3, z + Math.sign(z) * 0.26]} s={[0.17, 0.17, 0.04]} />
          ))}
        </group>
      ))}
      <group ref={body}>
        <Part g="cyl" m="exhaust" p={[0, 0.66, 0]} s={[0.55, 0.18, 0.55]} />
        <Part g="rbox" m="yellow" p={[-0.2, 1.05, 0]} s={[1.75, 0.72, 1.38]} />
        <Part g="rbox" m="yellowDark" p={[-1.05, 1.08, 0]} s={[0.5, 0.66, 1.38]} />
        <Part g="rbox" m="white" p={[-0.3, 1.43, 0.3]} s={[1.0, 0.05, 0.4]} />
        <Part g="rbox" m="yellow" p={[0.25, 1.82, -0.3]} s={[0.82, 0.9, 0.72]} />
        <Part g="rbox" m="glass" p={[0.33, 1.88, -0.3]} s={[0.66, 0.6, 0.76]} />
        <Part g="rbox" m="yellowDark" p={[0.25, 2.3, -0.3]} s={[0.92, 0.1, 0.82]} />
        <Part g="cyl" m="exhaust" p={[-0.75, 1.7, 0.45]} s={[0.06, 0.55, 0.06]} />
        <group ref={boom} position={[0.55, 1.25, 0.3]} rotation={[0, 0, 0.75]}>
          <Part g="rbox" m="yellow" p={[0.95, 0, 0]} s={[1.95, 0.27, 0.27]} />
          <Part g="rbox" m="white" p={[0.9, 0.13, 0]} s={[1.3, 0.03, 0.12]} />
          <group ref={stick} position={[1.9, 0, 0]} rotation={[0, 0, -1.9]}>
            <Part g="sphere" m="exhaust" s={0.16} />
            <Part g="rbox" m="yellowDark" p={[0.65, 0, 0]} s={[1.35, 0.2, 0.2]} />
            <group ref={bucket} position={[1.3, 0, 0]} rotation={[0, 0, -0.4]}>
              <Part g="rbox" m="bucket" p={[0.12, -0.16, 0]} s={[0.46, 0.4, 0.46]} />
              <Part g="cone" m="roller" p={[0.34, -0.36, 0.12]} s={[0.05, 0.12, 0.05]} r={[0, 0, Math.PI]} />
              <Part g="cone" m="roller" p={[0.34, -0.36, -0.12]} s={[0.05, 0.12, 0.05]} r={[0, 0, Math.PI]} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

export function SprinklerModel({ appearAt, spinFrom }: { appearAt: number; spinFrom: number }) {
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)

  useActorFrame((t) => {
    if (root.current) {
      const s = Math.max(0.001, springOut(span(t, appearAt, appearAt + 0.9)))
      root.current.scale.set(s, s, s)
    }
    if (head.current) head.current.rotation.y = t > spinFrom ? (t - spinFrom) * 1.7 : 0
  })

  return (
    <group ref={root}>
      <Blob r={0.6} />
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return <Part key={i} g="limb" m="pole" p={[0, 0.55, 0]} s={[0.06, 0.3, 0.06]} r={[Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]} />
      })}
      <Part g="cyl" m="pole" p={[0, 0.95, 0]} s={[0.06, 1.0, 0.06]} />
      <Part g="sphere" m="teal" p={[0, 1.5, 0]} s={0.17} />
      <Part g="torus" m="white" p={[0, 1.5, 0]} s={[0.17, 0.17, 0.3]} r={[Math.PI / 2, 0, 0]} />
      <group ref={head} position={[0, 1.6, 0]}>
        <Part g="rbox" m="pole" s={[0.75, 0.05, 0.05]} />
        <Part g="sphere" m="teal" p={[0.38, 0.03, 0]} s={0.06} />
        <Part g="sphere" m="teal" p={[-0.38, 0.03, 0]} s={0.06} />
      </group>
    </group>
  )
}

export function GateModel({ appearAt }: { appearAt: number }) {
  const root = useRef<THREE.Group>(null)
  useActorFrame((t) => {
    if (!root.current) return
    const s = springOut(span(t, appearAt, appearAt + 0.8))
    root.current.visible = s > 0.001
    root.current.scale.set(1, Math.max(0.001, s), 1)
  })
  return (
    <group ref={root}>
      <Part g="cyl" m="woodDark" p={[0, 0.55, 1.0]} s={[0.12, 1.5, 0.12]} />
      <Part g="cyl" m="woodDark" p={[0, 0.55, -1.0]} s={[0.12, 1.5, 0.12]} />
      <Part g="rbox" m="wood" p={[0, 0.5, 0]} s={[0.2, 0.95, 1.95]} />
      <Part g="rbox" m="woodDark" p={[0.01, 0.36, 0]} s={[0.22, 0.05, 1.9]} />
      <Part g="rbox" m="woodDark" p={[0.01, 0.66, 0]} s={[0.22, 0.05, 1.9]} />
      <Part g="rbox" m="woodLight" p={[0, 1.0, 0]} s={[0.24, 0.08, 1.85]} />
      <Part g="cyl" m="exhaust" p={[0, 1.2, 0]} s={[0.04, 0.4, 0.04]} />
      <Part g="torus" m="red" p={[0, 1.42, 0]} s={[0.22, 0.22, 0.3]} r={[Math.PI / 2, 0, 0]} />
    </group>
  )
}

export function Marker({ showAt, hideAt }: { showAt: number; hideAt: number }) {
  const root = useRef<THREE.Group>(null)
  const pin = useRef<THREE.Group>(null)
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const materials = useMemo(
    () => [0, 1].map(() => new THREE.MeshBasicMaterial({ color: COLORS.teal, transparent: true, depthWrite: false })),
    [],
  )
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials])

  useActorFrame((t, _s, _dt, animate) => {
    const g = root.current
    if (!g) return
    const on = springOut(span(t, showAt, showAt + 0.6)) * (1 - span(t, hideAt, hideAt + 0.4))
    g.visible = on > 0.01
    g.scale.setScalar(Math.max(0.001, on))
    if (pin.current) pin.current.position.y = animate ? Math.sin(t * 3) * 0.15 : 0
    rings.current.forEach((r, i) => {
      if (!r) return
      const u = animate ? fract(t / 1.6 + i * 0.5) : 0.3 + i * 0.3
      r.scale.set(0.6 + u * 1.6, 0.6 + u * 1.6, 1)
      materials[i].opacity = (1 - u) * 0.8
    })
  })

  return (
    <group ref={root}>
      {materials.map((m, i) => (
        <mesh
          key={i}
          ref={(el) => {
            rings.current[i] = el
          }}
          geometry={getKit().geo.torus}
          material={m}
          position={[0, 0.08, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      ))}
      <group ref={pin}>
        <Part g="sphere" m="teal" p={[0, 3.2, 0]} s={0.62} />
        <Part g="cone" m="teal" p={[0, 2.35, 0]} s={[0.5, 1.1, 0.5]} r={[Math.PI, 0, 0]} />
        <Part g="sphere" m="white" p={[0, 3.25, 0]} s={0.3} />
      </group>
    </group>
  )
}
