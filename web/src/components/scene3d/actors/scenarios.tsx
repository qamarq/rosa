"use client"

import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { Vec3, WorldContext } from "../contract"
import { WaterRibbon, Glow, Spray, WetDisc } from "./effects"
import { COLORS, getKit } from "./kit"
import { buildTrack, rng, sampleTrack, yawX } from "./layout"
import type { Layout, P, TrackSample } from "./layout"
import { ExcavatorModel, GateModel, Marker, newRig, SprinklerModel, TractorModel } from "./machines"
import { angleLerp, easeInOutCubic, lerp, span, springOut, useActorFrame } from "./motion"

export const ZASTAWKA = { drive0: 0.5, drive1: 2.0, dig: 2.0, digLen: 0.9, gate: 3.8, rise: 3.9, riseLen: 1.6, happy: 5.6 }
export const NAWADNIANIE = { appear: 0.2, spray: 0.8, grow: 4, happy: 5.0 }
export const MIEDZYPLON_START = 0.4

export function miedzyplonPass(length: number, unit: number) {
  return Math.max(10, Math.min(16, length / (unit * 7)))
}

function digPose(u: number, out: { boom: number; stick: number; bucket: number }) {
  if (u < 0.45) {
    const p = easeInOutCubic(u / 0.45)
    out.boom = lerp(0.75, 0.08, p)
    out.stick = lerp(-1.9, -1.1, p)
    out.bucket = lerp(-0.4, 0.25, p)
  } else if (u < 0.6) {
    const p = easeInOutCubic((u - 0.45) / 0.15)
    out.boom = 0.08
    out.stick = lerp(-1.1, -1.3, p)
    out.bucket = lerp(0.25, -1.5, p)
  } else {
    const p = easeInOutCubic((u - 0.6) / 0.4)
    out.boom = lerp(0.08, 0.75, p)
    out.stick = lerp(-1.3, -1.9, p)
    out.bucket = lerp(-1.5, -0.4, p)
  }
}

const offset = (p: P, a: P, da: number, b: P, db: number): P => [p[0] + a[0] * da + b[0] * db, p[1] + a[1] * da + b[1] * db]

export function Zastawka({ ctx, layout }: { ctx: WorldContext; layout: Layout }) {
  const { gate, toy, k, km, tm } = layout
  const track = useMemo(() => buildTrack(ctx, [gate.start, gate.approach], toy * 0.5), [ctx, gate, toy])
  const faceYaw = useMemo(() => yawX(ctx, gate.approach, [-gate.side[0], -gate.side[1]]), [ctx, gate])
  const gateYaw = useMemo(() => yawX(ctx, gate.pos, gate.along), [ctx, gate])
  const gateWorld = useMemo(() => ctx.toWorld(gate.pos[0], gate.pos[1]), [ctx, gate])
  const glowAt = useMemo((): Vec3 => [gateWorld[0], gateWorld[1] + k * 1.2, gateWorld[2]], [gateWorld, k])
  const mounds = useMemo(
    () =>
      [
        offset(gate.pos, gate.side, 1.5 * tm, gate.along, 1.4 * tm),
        offset(gate.pos, gate.side, 1.8 * tm, gate.along, -1.2 * tm),
      ].map((p) => ctx.toWorld(p[0], p[1])),
    [ctx, gate, tm],
  )
  const rig = useRef(newRig())
  const exc = useRef<THREE.Group>(null)
  const moundRefs = useRef<(THREE.Mesh | null)[]>([])
  const sample = useRef<TrackSample>({ x: 0, y: 0, z: 0, yaw: 0 })

  useActorFrame((t) => {
    const g = exc.current
    if (!g) return
    const T = ZASTAWKA
    const drive = easeInOutCubic(span(t, T.drive0, T.drive1))
    const s = sampleTrack(track, drive * track.length, sample.current)
    g.position.set(s.x, s.y, s.z)
    g.rotation.y = angleLerp(s.yaw, faceYaw, span(t, T.drive1 - 0.6, T.drive1))
    const r = rig.current
    r.moving = t > T.drive0 && t < T.drive1
    const digT = t - T.dig
    if (digT >= 0 && digT < T.digLen * 2) {
      digPose((digT % T.digLen) / T.digLen, r)
    } else {
      r.boom = 0.75
      r.stick = -1.9
      r.bucket = -0.4
    }
    moundRefs.current.forEach((m, i) => {
      if (!m) return
      const at = T.dig + T.digLen * (i + 0.62)
      const sc = springOut(span(t, at, at + 0.7))
      m.visible = sc > 0.01
      m.scale.set(0.5 * sc * km, 0.32 * sc * km, 0.42 * sc * km)
    })
  })

  const kit = getKit()
  return (
    <group>
      <group position={gateWorld} scale={km}>
        <Marker showAt={0} hideAt={ZASTAWKA.gate - 0.2} />
      </group>
      <group ref={exc} scale={km}>
        <ExcavatorModel rig={rig} />
      </group>
      <group position={gateWorld} rotation={[0, gateYaw, 0]} scale={km}>
        <GateModel appearAt={ZASTAWKA.gate} />
      </group>
      {mounds.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            moundRefs.current[i] = el
          }}
          geometry={kit.geo.sphere}
          material={kit.mat.dirt}
          position={p}
          scale={0.001}
          visible={false}
        />
      ))}
      <WaterRibbon ctx={ctx} points={gate.ribbon} halfWidth={Math.max(toy * 0.85, tm * 0.75)} k={k} riseAt={ZASTAWKA.rise} duration={ZASTAWKA.riseLen} />
      <Glow position={glowAt} size={k * 9} startAt={ZASTAWKA.rise} />
    </group>
  )
}

type Tufts = { pos: Float32Array; reveal: Float32Array; count: number; color: Float32Array }

function buildTufts(ctx: WorldContext, layout: Layout, cap: number, lag: number): Tufts {
  const { rows, toy } = layout
  const r = rng(71)
  let total = 0
  for (const row of rows) total += Math.hypot(row.b[0] - row.a[0], row.b[1] - row.a[1])
  const width = rows.length > 1 ? Math.hypot(rows[1].a[0] - rows[0].b[0], rows[1].a[1] - rows[0].b[1]) : 5 * toy
  const lanes = Math.max(1, Math.min(4, Math.floor(width / (1.6 * toy))))
  const laneGap = width / lanes
  const spacing = Math.max(1.4 * toy, (total * lanes) / cap)
  const pos: number[] = []
  const reveal: number[] = []
  const color: number[] = []
  const palette = [COLORS.cover, COLORS.leaf, COLORS.leafLight, COLORS.leafDark].map((c) => new THREE.Color(c))
  for (const row of rows) {
    const len = Math.hypot(row.b[0] - row.a[0], row.b[1] - row.a[1])
    if (len <= 0) continue
    const ux = (row.b[0] - row.a[0]) / len
    const uy = (row.b[1] - row.a[1]) / len
    for (let s = spacing * 0.5; s < len; s += spacing) {
      for (let l = 0; l < lanes; l++) {
        if (pos.length / 3 >= cap) break
        const off = (l - (lanes - 1) / 2) * laneGap + (r() - 0.5) * laneGap * 0.4
        const along = s + (r() - 0.5) * spacing * 0.5
        const x = row.a[0] + ux * along - uy * off
        const y = row.a[1] + uy * along + ux * off
        if (!ctx.insideParcel(x, y)) continue
        const w = ctx.toWorld(x, y)
        pos.push(w[0], w[1], w[2])
        reveal.push(row.startCum + along + lag)
        const c = palette[Math.floor(r() * palette.length)]
        color.push(c.r, c.g, c.b)
      }
    }
  }
  return { pos: new Float32Array(pos), reveal: new Float32Array(reveal), count: reveal.length, color: new Float32Array(color) }
}

const dummy = new THREE.Object3D()

export function Miedzyplon({ ctx, layout, quality }: { ctx: WorldContext; layout: Layout; quality: "high" | "low" }) {
  const { toy, k, km, tm } = layout
  const track = useMemo(() => buildTrack(ctx, layout.path, toy * 0.6), [ctx, layout, toy])
  const pass = miedzyplonPass(track.length, toy)
  const speed = track.length / pass
  const tufts = useMemo(() => buildTufts(ctx, layout, quality === "high" ? 900 : 320, 2.8 * tm), [ctx, layout, quality, tm])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.7 }), [])
  useEffect(() => () => material.dispose(), [material])
  const inst = useRef<THREE.InstancedMesh>(null)
  const rig = useRef(newRig())
  const tractor = useRef<THREE.Group>(null)
  const sample = useRef<TrackSample>({ x: 0, y: 0, z: 0, yaw: 0 })
  const grown = useRef(false)

  useLayoutEffect(() => {
    const m = inst.current
    if (!m) return
    const c = new THREE.Color()
    for (let i = 0; i < tufts.count; i++) {
      m.setColorAt(i, c.setRGB(tufts.color[i * 3], tufts.color[i * 3 + 1], tufts.color[i * 3 + 2]))
      dummy.position.set(tufts.pos[i * 3], tufts.pos[i * 3 + 1], tufts.pos[i * 3 + 2])
      dummy.scale.setScalar(0.0001)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.instanceMatrix.needsUpdate = true
    grown.current = false
  }, [tufts])

  useActorFrame((t) => {
    const g = tractor.current
    if (!g) return
    const tt = Math.max(0, t - MIEDZYPLON_START)
    const cyc = tt / pass
    const leg = Math.floor(cyc)
    const f = cyc - leg
    const forward = leg % 2 === 0
    const s = sampleTrack(track, (forward ? f : 1 - f) * track.length, sample.current)
    g.position.set(s.x, s.y, s.z)
    g.rotation.y = forward ? s.yaw : s.yaw + Math.PI
    const r = rig.current
    r.moving = true
    r.seeding = leg === 0
    r.roll = (tt * speed) / (tm * 0.64)
    const m = inst.current
    if (!m || grown.current) return
    const done = MIEDZYPLON_START + (tufts.reveal[tufts.count - 1] ?? 0) / speed + 1
    for (let i = 0; i < tufts.count; i++) {
      const at = MIEDZYPLON_START + tufts.reveal[i] / speed
      const sc = springOut(span(t, at, at + 0.9))
      dummy.position.set(tufts.pos[i * 3], tufts.pos[i * 3 + 1] + k * 0.1, tufts.pos[i * 3 + 2])
      const g = Math.max(0.0001, sc)
      dummy.scale.set(k * 0.42 * g, k * 0.3 * g, k * 0.42 * g)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    if (t > done) grown.current = true
  })

  return (
    <group>
      <group ref={tractor} scale={km}>
        <TractorModel rig={rig} seeder />
      </group>
      {tufts.count > 0 && (
        <instancedMesh key={tufts.count} ref={inst} args={[getKit().geo.sphere, material, tufts.count]} frustumCulled={false} castShadow={quality === "high"} />
      )}
    </group>
  )
}

export function Nawadnianie({ ctx, layout, quality }: { ctx: WorldContext; layout: Layout; quality: "high" | "low" }) {
  const { sprinkler, wetR, k, km } = layout
  const at = useMemo(() => ctx.toWorld(sprinkler[0], sprinkler[1]), [ctx, sprinkler])
  const N = NAWADNIANIE
  return (
    <group>
      <group position={at} scale={km}>
        <SprinklerModel appearAt={N.appear} spinFrom={N.spray} />
      </group>
      <WetDisc ctx={ctx} centre={sprinkler} radius={wetR} lift={k * 0.06} startAt={N.spray} duration={N.grow} />
      <Spray ctx={ctx} centre={sprinkler} radius={wetR} height={km * 1.6} k={k} count={quality === "high" ? 260 : 110} startAt={N.spray} />
    </group>
  )
}

export function ParkedTractor({ position, yaw, scale }: { position: Vec3; yaw: number; scale: number }) {
  const rig = useRef(newRig())
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <TractorModel rig={rig} />
    </group>
  )
}
