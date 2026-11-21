"use client"

import { useContext } from "react"
import type { Ref } from "react"
import type * as THREE from "three"
import type { Vec3 } from "../contract"
import { getKit } from "./kit"
import type { GeoName, MatName } from "./kit"
import { ShadowContext } from "./motion"

type PartProps = {
  g: GeoName
  m: MatName
  p?: Vec3
  s?: number | Vec3
  r?: Vec3
  ref?: Ref<THREE.Mesh>
  visible?: boolean
}

export function Part({ g, m, p, s, r, ref, visible }: PartProps) {
  const { geo, mat } = getKit()
  const shadows = useContext(ShadowContext)
  return (
    <mesh
      ref={ref}
      geometry={geo[g]}
      material={mat[m]}
      position={p}
      scale={s}
      rotation={r}
      visible={visible}
      castShadow={shadows && m !== "glass"}
    />
  )
}

export function Blob({ r = 1, sx = 1 }: { r?: number; sx?: number }) {
  const { geo, mat } = getKit()
  return <mesh geometry={geo.circle} material={mat.shadow} position={[0, 0.03, 0]} scale={[r * sx, 1, r]} renderOrder={1} />
}
