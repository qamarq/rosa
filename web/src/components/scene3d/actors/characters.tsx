"use client"

import { useRef } from "react"
import type * as THREE from "three"
import type { Vec3 } from "../contract"
import { Blob, Part } from "./part"
import { breath, fract, hopInto, HOP_DURATION, useActorFrame } from "./motion"
import type { Hop } from "./motion"

type CharacterProps = {
  position: Vec3
  scale: number
  worried: boolean
  wipe: boolean
  happyAt: number | null
}

export function Farmer({ position, scale, worried, wipe, happyAt }: CharacterProps) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const smile = useRef<THREE.Mesh>(null)
  const frown = useRef<THREE.Mesh>(null)
  const browL = useRef<THREE.Mesh>(null)
  const browR = useRef<THREE.Mesh>(null)
  const sweat = useRef<THREE.Mesh>(null)
  const hop = useRef<Hop>({ lift: 0, sy: 1 })

  useActorFrame((t, state, _dt, animate) => {
    const g = root.current
    const b = body.current
    const l = armL.current
    const r = armR.current
    if (!g || !b || !l || !r) return
    const cam = state.camera.position
    g.rotation.y = Math.atan2(cam.x - g.position.x, cam.z - g.position.z)
    const since = happyAt === null ? -1 : t - happyAt
    const happy = happyAt !== null && since >= 0
    let sy = animate ? breath(t) : 1
    let lift = 0
    if (happy && animate) {
      const h = hopInto(hop.current, since < HOP_DURATION ? since : since - HOP_DURATION - 0.15)
      if (since < HOP_DURATION * 2 + 0.15) {
        sy = h.sy
        lift = h.lift * 0.32
      }
    }
    b.scale.set(2 - sy, sy, 2 - sy)
    b.position.y = lift
    const cheer = happy && (!animate || since < 3.6)
    const wiping = wipe && !happy
    const sway = animate ? Math.sin(t * 1.7) * 0.05 : 0
    l.rotation.set(0, 0, cheer ? -2.55 : -0.14 - sway)
    if (cheer) {
      r.rotation.set(0, 0, 2.55)
    } else if (wiping) {
      const u = animate ? fract(t / 1.6) : 0.4
      const up = Math.sin(Math.min(1, u / 0.85) * Math.PI)
      r.rotation.set(-2.55 * Math.min(1, up * 1.4), 0, 0.14 - (0.5 + 0.2 * Math.sin(u * Math.PI * 4)) * up)
    } else {
      r.rotation.set(0, 0, 0.14 + sway)
    }
    const showFrown = worried && !happy
    if (smile.current) smile.current.visible = !showFrown
    if (frown.current) frown.current.visible = showFrown
    if (browL.current) browL.current.rotation.z = showFrown ? 0.38 : 0
    if (browR.current) browR.current.rotation.z = showFrown ? -0.38 : 0
    if (sweat.current) {
      const u = animate ? fract(t / 1.6 + 0.3) : 0.2
      sweat.current.visible = wiping
      sweat.current.position.y = 1.56 - u * 0.4
      const s = 0.6 + 0.4 * (1 - u)
      sweat.current.scale.set(0.035 * s, 0.055 * s, 0.035 * s)
    }
  })

  return (
    <group ref={root} position={position} scale={scale}>
      <Blob r={0.48} />
      <group ref={body}>
        <Part g="sphere" m="boot" p={[-0.13, 0.07, 0.05]} s={[0.13, 0.08, 0.19]} />
        <Part g="sphere" m="boot" p={[0.13, 0.07, 0.05]} s={[0.13, 0.08, 0.19]} />
        <Part g="limb" m="overallsDark" p={[-0.13, 0.56, 0]} s={[0.17, 0.23, 0.17]} />
        <Part g="limb" m="overallsDark" p={[0.13, 0.56, 0]} s={[0.17, 0.23, 0.17]} />
        <Part g="sphere" m="shirt" p={[0, 0.93, 0]} s={[0.31, 0.38, 0.26]} />
        <Part g="sphere" m="overalls" p={[0, 0.72, 0]} s={[0.33, 0.27, 0.28]} />
        <Part g="rbox" m="overalls" p={[0, 0.9, 0.17]} s={[0.36, 0.28, 0.16]} />
        <Part g="rbox" m="strap" p={[0, 0.89, 0.255]} s={[0.15, 0.1, 0.03]} />
        <Part g="rbox" m="strap" p={[-0.13, 1.08, 0.15]} s={[0.055, 0.28, 0.05]} r={[-0.45, 0, 0]} />
        <Part g="rbox" m="strap" p={[0.13, 1.08, 0.15]} s={[0.055, 0.28, 0.05]} r={[-0.45, 0, 0]} />
        <Part g="sphere" m="button" p={[-0.13, 0.99, 0.25]} s={0.028} />
        <Part g="sphere" m="button" p={[0.13, 0.99, 0.25]} s={0.028} />
        <group ref={armL} position={[-0.29, 1.12, 0]}>
          <Part g="limb" m="sleeve" s={[0.14, 0.25, 0.14]} />
          <Part g="sphere" m="skin" p={[0, -0.53, 0]} s={0.075} />
        </group>
        <group ref={armR} position={[0.29, 1.12, 0]}>
          <Part g="limb" m="sleeve" s={[0.14, 0.25, 0.14]} />
          <Part g="sphere" m="skin" p={[0, -0.53, 0]} s={0.075} />
        </group>
        <Part g="sphere" m="skinDark" p={[-0.28, 1.44, 0]} s={0.07} />
        <Part g="sphere" m="skinDark" p={[0.28, 1.44, 0]} s={0.07} />
        <Part g="sphere" m="skin" p={[0, 1.45, 0]} s={[0.29, 0.28, 0.27]} />
        <Part g="sphere" m="ink" p={[-0.1, 1.5, 0.245]} s={[0.034, 0.048, 0.03]} />
        <Part g="sphere" m="ink" p={[0.1, 1.5, 0.245]} s={[0.034, 0.048, 0.03]} />
        <Part g="sphere" m="white" p={[-0.09, 1.515, 0.272]} s={0.011} />
        <Part g="sphere" m="white" p={[0.11, 1.515, 0.272]} s={0.011} />
        <Part ref={browL} g="rbox" m="brow" p={[-0.1, 1.575, 0.25]} s={[0.09, 0.022, 0.02]} />
        <Part ref={browR} g="rbox" m="brow" p={[0.1, 1.575, 0.25]} s={[0.09, 0.022, 0.02]} />
        <Part g="sphere" m="blush" p={[-0.165, 1.41, 0.215]} s={[0.055, 0.035, 0.02]} />
        <Part g="sphere" m="blush" p={[0.165, 1.41, 0.215]} s={[0.055, 0.035, 0.02]} />
        <Part g="sphere" m="beard" p={[0, 1.25, 0.13]} s={[0.21, 0.13, 0.16]} />
        <Part g="sphere" m="beard" p={[-0.065, 1.385, 0.255]} s={[0.075, 0.035, 0.035]} r={[0, 0, 0.3]} />
        <Part g="sphere" m="beard" p={[0.065, 1.385, 0.255]} s={[0.075, 0.035, 0.035]} r={[0, 0, -0.3]} />
        <Part g="sphere" m="nose" p={[0, 1.43, 0.28]} s={0.05} />
        <Part ref={smile} g="arc" m="mouth" p={[0, 1.36, 0.27]} s={0.045} r={[0, 0, Math.PI]} />
        <Part ref={frown} g="arc" m="mouth" p={[0, 1.33, 0.27]} s={0.04} visible={false} />
        <Part g="cyl" m="hat" p={[0, 1.67, 0]} s={[0.5, 0.035, 0.5]} />
        <Part g="sphere" m="hat" p={[0, 1.7, 0]} s={[0.27, 0.2, 0.27]} />
        <Part g="cyl" m="hatBand" p={[0, 1.73, 0]} s={[0.275, 0.05, 0.275]} />
        <Part ref={sweat} g="sphere" m="waterLight" p={[-0.3, 1.56, 0.18]} s={[0.035, 0.055, 0.035]} visible={false} />
      </group>
    </group>
  )
}

export function Dog({ position, scale, happyAt }: Pick<CharacterProps, "position" | "scale" | "happyAt">) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const wag = useRef<THREE.Group>(null)
  const hop = useRef<Hop>({ lift: 0, sy: 1 })

  useActorFrame((t, state, _dt, animate) => {
    const g = root.current
    const b = body.current
    if (!g || !b) return
    const cam = state.camera.position
    g.rotation.y = Math.atan2(-(cam.z - g.position.z), cam.x - g.position.x) + 0.85
    let sy = animate ? breath(t, 0.7) : 1
    let lift = 0
    if (happyAt !== null && animate) {
      const h = hopInto(hop.current, t - happyAt - 0.2)
      sy = h.lift > 0 || h.sy !== 1 ? h.sy : sy
      lift = h.lift * 0.22
    }
    b.scale.set(2 - sy, sy, 2 - sy)
    b.position.y = lift
    if (wag.current) wag.current.rotation.y = animate ? Math.sin(t * (happyAt !== null && t > happyAt ? 16 : 9)) * 0.5 : 0.3
  })

  return (
    <group ref={root} position={position} scale={scale}>
      <Blob r={0.42} sx={1.2} />
      <group ref={body}>
        <Part g="limb" m="fur" p={[0.2, 0.26, 0.11]} s={[0.09, 0.11, 0.09]} />
        <Part g="limb" m="fur" p={[0.2, 0.26, -0.11]} s={[0.09, 0.11, 0.09]} />
        <Part g="limb" m="fur" p={[-0.2, 0.26, 0.11]} s={[0.09, 0.11, 0.09]} />
        <Part g="limb" m="fur" p={[-0.2, 0.26, -0.11]} s={[0.09, 0.11, 0.09]} />
        <Part g="sphere" m="fur" p={[0, 0.36, 0]} s={[0.34, 0.19, 0.19]} />
        <Part g="sphere" m="furLight" p={[0.02, 0.3, 0]} s={[0.24, 0.12, 0.15]} />
        <group ref={wag} position={[-0.3, 0.42, 0]}>
          <group rotation={[0, 0, -2.3]}>
            <Part g="limb" m="fur" s={[0.065, 0.13, 0.065]} />
          </group>
        </group>
        <Part g="torus" m="collar" p={[0.25, 0.48, 0]} s={[0.13, 0.13, 0.25]} r={[0, Math.PI / 2, 0.5]} />
        <Part g="sphere" m="fur" p={[0.34, 0.6, 0]} s={0.18} />
        <Part g="sphere" m="furLight" p={[0.5, 0.55, 0]} s={[0.12, 0.08, 0.09]} />
        <Part g="sphere" m="ink" p={[0.615, 0.575, 0]} s={0.035} />
        <Part g="sphere" m="tongue" p={[0.52, 0.48, 0]} s={[0.04, 0.02, 0.035]} />
        <Part g="sphere" m="ink" p={[0.46, 0.65, 0.09]} s={0.026} />
        <Part g="sphere" m="ink" p={[0.46, 0.65, -0.09]} s={0.026} />
        <Part g="sphere" m="furDark" p={[0.27, 0.62, 0.16]} s={[0.06, 0.13, 0.04]} r={[0.35, 0, 0.2]} />
        <Part g="sphere" m="furDark" p={[0.27, 0.62, -0.16]} s={[0.06, 0.13, 0.04]} r={[-0.35, 0, 0.2]} />
      </group>
    </group>
  )
}
