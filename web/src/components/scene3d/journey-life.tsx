"use client"

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { Farmer } from "./actors/characters"
import { getKit } from "./actors/kit"
import { TractorModel, newRig, type Rig } from "./actors/machines"
import { ClockContext, type ActorClock } from "./actors/motion"
import { Part } from "./actors/part"
import { setOpacity } from "./materials"

export type LifeState = { pinAt: number | null; phase: string; polandFade: number }

const GROUND = 1.22
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const fract = (v: number) => v - Math.floor(v)
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

type XZ = [number, number]

function facing(group: THREE.Object3D, camera: THREE.Camera, world: THREE.Vector3) {
  group.getWorldPosition(world)
  group.rotation.y = Math.atan2(camera.position.x - world.x, camera.position.z - world.z)
}

function Walker({ pin, from, tool, delay, life }: { pin: XZ; from: XZ; tool: "binoculars" | "glass"; delay: number; life: () => LifeState | null }) {
  const root = useRef<THREE.Group>(null)
  const prop = useRef<THREE.Group>(null)
  const world = useMemo(() => new THREE.Vector3(), [])
  const dx = pin[0] - from[0]
  const dz = pin[1] - from[1]
  const dist = Math.hypot(dx, dz)
  const stop = Math.max(0, dist - 1.5)

  useFrame(({ clock, camera }) => {
    const s = life()
    const g = root.current
    if (!s || !g || s.pinAt === null) return
    const t = clock.elapsedTime - s.pinAt - delay
    const walked = Math.min(stop, Math.max(0, t) * 0.75)
    const moving = t > 0 && walked < stop
    const k = walked / dist
    g.position.set(from[0] + dx * k, GROUND + (moving ? Math.abs(Math.sin(t * 7)) * 0.09 : 0), from[1] + dz * k)
    g.scale.setScalar(0.55 * Math.min(1, Math.max(0, t + delay) / 0.4))
    if (prop.current) {
      facing(prop.current, camera, world)
      prop.current.rotation.z = moving ? 0 : Math.sin(clock.elapsedTime * 1.3) * 0.12
    }
  })

  return (
    <group ref={root} scale={0}>
      <Farmer position={[0, 0, 0]} scale={1} worried={false} wipe={false} happyAt={null} />
      <group ref={prop}>
        {tool === "binoculars" ? (
          <group position={[0, 1.47, 0.34]}>
            <Part g="cyl" m="ink" p={[-0.08, 0, 0]} s={[0.065, 0.16, 0.065]} r={[Math.PI / 2, 0, 0]} />
            <Part g="cyl" m="ink" p={[0.08, 0, 0]} s={[0.065, 0.16, 0.065]} r={[Math.PI / 2, 0, 0]} />
            <Part g="sphere" m="glass" p={[-0.08, 0, 0.09]} s={0.05} />
            <Part g="sphere" m="glass" p={[0.08, 0, 0.09]} s={0.05} />
          </group>
        ) : (
          <group position={[0.42, 1.0, 0.22]} rotation={[0, 0, -0.5]}>
            <Part g="torus" m="woodDark" s={0.17} />
            <Part g="disc" m="glass" s={[0.16, 0.16, 0.02]} />
            <Part g="cyl" m="wood" p={[0, -0.3, 0]} s={[0.035, 0.26, 0.035]} />
          </group>
        )}
      </group>
    </group>
  )
}

function RoadTractor({ pin, life }: { pin: XZ; life: () => LifeState | null }) {
  const root = useRef<THREE.Group>(null)
  const rig = useRef<Rig>({ ...newRig(), moving: true })
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        (
          [
            [-8, 3.4],
            [-4, 4.2],
            [-0.5, 3.2],
            [3, 3.9],
            [7, 3],
          ] as XZ[]
        ).map(([x, z]) => new THREE.Vector3(pin[0] + x, GROUND + 0.02, pin[1] + z)),
      ),
    [pin],
  )
  const road = useMemo(() => {
    const g = new THREE.TubeGeometry(curve, 60, 0.22, 6, false)
    g.scale(1, 0.12, 1)
    g.translate(0, GROUND * 0.88, 0)
    return g
  }, [curve])
  useEffect(() => () => road.dispose(), [road])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const tan = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock }, dt) => {
    const s = life()
    const g = root.current
    if (!s || !g || s.pinAt === null) return
    const u = fract((clock.elapsedTime - s.pinAt) / 26 + 0.1)
    const back = u > 0.5
    const v = back ? 1 - (u - 0.5) * 2 : u * 2
    curve.getPointAt(v, pos)
    curve.getTangentAt(v, tan)
    if (back) tan.negate()
    g.position.copy(pos)
    g.rotation.y = Math.atan2(-tan.z, tan.x)
    rig.current.roll += Math.min(dt, 0.1) * 3
  })

  return (
    <>
      <mesh geometry={road} material={getKit().mat.sand} />
      <group ref={root} scale={0.3}>
        <TractorModel rig={rig} />
      </group>
    </>
  )
}

function Stork({ pin, life }: { pin: XZ; life: () => LifeState | null }) {
  const root = useRef<THREE.Group>(null)
  const wingL = useRef<THREE.Group>(null)
  const wingR = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const s = life()
    const g = root.current
    if (!s || !g) return
    const t = clock.elapsedTime
    const a = t * 0.32
    g.position.set(pin[0] + Math.cos(a) * 7.5, GROUND + 5.2 + Math.sin(t * 0.9) * 0.3, pin[1] + Math.sin(a) * 5)
    g.rotation.set(0, Math.atan2(-Math.sin(a) * 7.5, Math.cos(a) * 5), 0)
    const flap = Math.sin(t * 5.5) * 0.5
    if (wingL.current) wingL.current.rotation.z = flap
    if (wingR.current) wingR.current.rotation.z = -flap
  })
  return (
    <group ref={root} scale={0.55}>
      <Part g="sphere" m="white" s={[0.22, 0.2, 0.55]} />
      <Part g="sphere" m="white" p={[0, 0.12, 0.62]} s={0.13} />
      <Part g="cone" m="hub" p={[0, 0.1, 0.9]} s={[0.04, 0.32, 0.04]} r={[Math.PI / 2, 0, 0]} />
      <Part g="cyl" m="hubDark" p={[0.06, -0.12, -0.6]} s={[0.02, 0.4, 0.02]} r={[1.2, 0, 0]} />
      <Part g="cyl" m="hubDark" p={[-0.06, -0.12, -0.6]} s={[0.02, 0.4, 0.02]} r={[1.2, 0, 0]} />
      <group ref={wingL} position={[0.15, 0.08, 0]}>
        <Part g="rbox" m="white" p={[0.5, 0, 0]} s={[0.9, 0.05, 0.38]} />
        <Part g="rbox" m="ink" p={[1.02, 0, -0.04]} s={[0.22, 0.055, 0.32]} />
      </group>
      <group ref={wingR} position={[-0.15, 0.08, 0]}>
        <Part g="rbox" m="white" p={[-0.5, 0, 0]} s={[0.9, 0.05, 0.38]} />
        <Part g="rbox" m="ink" p={[-1.02, 0, -0.04]} s={[0.22, 0.055, 0.32]} />
      </group>
    </group>
  )
}

function Station({ at }: { at: XZ }) {
  const cups = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (cups.current) cups.current.rotation.y = clock.elapsedTime * 3
  })
  return (
    <group position={[at[0], GROUND, at[1]]} scale={0.55}>
      <Part g="cyl" m="pole" p={[0, 0.9, 0]} s={[0.05, 1.8, 0.05]} />
      <Part g="rbox" m="white" p={[0, 0.7, 0.12]} s={[0.36, 0.42, 0.22]} />
      <Part g="rbox" m="teal" p={[0, 0.78, 0.235]} s={[0.22, 0.08, 0.02]} />
      <group ref={cups} position={[0, 1.85, 0]}>
        {[0, 1, 2].map((i) => (
          <Part key={i} g="sphere" m="cream" p={[Math.cos((i * Math.PI * 2) / 3) * 0.28, 0, Math.sin((i * Math.PI * 2) / 3) * 0.28]} s={0.09} />
        ))}
      </group>
      <Part g="cone" m="white" p={[0, 2.05, 0]} s={[0.05, 0.2, 0.05]} />
    </group>
  )
}

const SATS = [
  { r: 5.5, h: 8.5, speed: 0.22, phase: 0, tilt: 0.25 },
  { r: 8.5, h: 10.5, speed: -0.15, phase: 2.1, tilt: -0.3 },
  { r: 11, h: 12.5, speed: 0.1, phase: 4.2, tilt: 0.15 },
]

function satPosition(i: number, t: number, pin: XZ, out: THREE.Vector3) {
  const o = SATS[i]
  const a = o.phase + t * o.speed
  return out.set(pin[0] + Math.cos(a) * o.r, GROUND + o.h + Math.sin(a) * o.r * o.tilt, pin[1] + Math.sin(a) * o.r * 0.7)
}

function Satellites({ pin, life }: { pin: XZ; life: () => LifeState | null }) {
  const sats = useRef<(THREE.Group | null)[]>([])
  const beam = useRef<THREE.Mesh>(null)
  const spot = useRef<THREE.Mesh>(null)
  const beamMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#3FA3B0", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }),
    [],
  )
  const spotMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#3FA3B0", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), [])
  const beamGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 28, 1, true), [])
  useEffect(
    () => () => {
      beamMat.dispose()
      spotMat.dispose()
      beamGeo.dispose()
    },
    [beamMat, spotMat, beamGeo],
  )
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), target: new THREE.Vector3(), axis: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), [])

  useFrame(({ clock }) => {
    const s = life()
    if (!s) return
    const t = clock.elapsedTime
    sats.current.forEach((g, i) => {
      if (!g) return
      satPosition(i, t, pin, g.position)
      g.rotation.set(0.3, -(SATS[i].phase + t * SATS[i].speed), Math.sin(t + i) * 0.1)
    })
    const holding = s.pinAt !== null && (s.phase === "hover" || s.phase === "search" || s.phase === "fly")
    const strength = s.pinAt === null ? 0 : (s.phase === "hover" ? 1 : 0.55) * smooth(0, 0.8, t - s.pinAt)
    const b = beam.current
    if (b) {
      b.visible = holding && strength > 0.01
      satPosition(0, t, pin, tmp.p)
      tmp.target.set(pin[0] + Math.sin(t * 0.9) * 0.9, GROUND + 0.05, pin[1] + Math.cos(t * 0.7) * 0.6)
      tmp.axis.subVectors(tmp.p, tmp.target)
      const len = tmp.axis.length()
      b.position.copy(tmp.target).addScaledVector(tmp.axis, 0.5)
      b.quaternion.setFromUnitVectors(tmp.up, tmp.axis.normalize())
      b.scale.set(1.5, len, 1.5)
      setOpacity(beamMat, 0.07 * strength * (0.8 + 0.2 * Math.sin(t * 3)))
      if (spot.current) {
        spot.current.visible = b.visible
        spot.current.position.copy(tmp.target)
        setOpacity(spotMat, 0.16 * strength * (0.75 + 0.25 * Math.sin(t * 4)))
      }
    }
  })

  return (
    <>
      {SATS.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            sats.current[i] = el
          }}
          scale={0.7}
        >
          <Part g="rbox" m="pole" s={[0.5, 0.62, 0.5]} />
          <Part g="rbox" m="water" p={[-0.8, 0, 0]} s={[0.95, 0.05, 0.5]} />
          <Part g="rbox" m="water" p={[0.8, 0, 0]} s={[0.95, 0.05, 0.5]} />
          <Part g="sphere" m="lamp" p={[0, -0.42, 0]} s={0.1} />
        </group>
      ))}
      <mesh ref={beam} geometry={beamGeo} material={beamMat} renderOrder={6} visible={false} />
      <mesh ref={spot} material={spotMat} renderOrder={6} visible={false} scale={[1.5, 1, 1.5]}>
        <circleGeometry args={[1, 32]} />
      </mesh>
    </>
  )
}

const STATIONS: XZ[] = [
  [-3.6, -2.2],
  [3.4, -1.6],
  [0.6, -4.2],
]

function Pings({ pin, life }: { pin: XZ; life: () => LifeState | null }) {
  const count = 6
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const mats = useMemo(
    () => Array.from({ length: count }, () => new THREE.MeshBasicMaterial({ color: "#3FA3B0", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })),
    [],
  )
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats])
  const tmp = useMemo(() => ({ src: new THREE.Vector3(), dst: new THREE.Vector3() }), [])

  useFrame(({ clock, camera }) => {
    const s = life()
    if (!s) return
    const t = clock.elapsedTime
    const on = s.pinAt === null ? 0 : smooth(0.3, 1.2, t - s.pinAt) * (s.phase === "trace" || s.phase === "sources" ? 0 : 1)
    refs.current.forEach((m, i) => {
      if (!m) return
      const u = fract(t / 1.8 + i / count)
      if (i < 3) satPosition(i, t - u * 1.8, pin, tmp.src)
      else tmp.src.set(pin[0] + STATIONS[i - 3][0], GROUND + 1.15, pin[1] + STATIONS[i - 3][1])
      tmp.dst.set(pin[0], GROUND + 1.2, pin[1])
      const e = u * u
      m.position.lerpVectors(tmp.src, tmp.dst, e)
      m.lookAt(camera.position)
      m.scale.setScalar(0.18 + 0.22 * Math.sin(u * Math.PI))
      m.visible = on > 0.01
      setOpacity(mats[i], on * Math.sin(u * Math.PI) * 0.9)
    })
  })

  return (
    <>
      {mats.map((mat, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          material={mat}
          renderOrder={7}
          visible={false}
        >
          <ringGeometry args={[0.7, 1, 28]} />
        </mesh>
      ))}
    </>
  )
}

export function JourneyLife({ pin, life, animate }: { pin: XZ | null; life: () => LifeState | null; animate: boolean }) {
  const clock = useRef<ActorClock>({ t: 0, animate })
  const root = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const c = clock.current
    if (c.animate) c.t += Math.min(dt, 0.1)
    const s = life()
    if (root.current) root.current.visible = !!s && s.polandFade < 0.08
  }, -1)
  if (!pin) return null
  return (
    <ClockContext.Provider value={clock}>
      <group ref={root}>
        <Satellites pin={pin} life={life} />
        {STATIONS.map((p, i) => (
          <Station key={i} at={[pin[0] + p[0], pin[1] + p[1]]} />
        ))}
        <Pings pin={pin} life={life} />
        <Walker pin={pin} from={[pin[0] - 5.2, pin[1] + 3.4]} tool="binoculars" delay={0.2} life={life} />
        <Walker pin={pin} from={[pin[0] + 4.6, pin[1] + 3.8]} tool="glass" delay={0.6} life={life} />
        <RoadTractor pin={pin} life={life} />
        <Stork pin={pin} life={life} />
      </group>
    </ClockContext.Provider>
  )
}
