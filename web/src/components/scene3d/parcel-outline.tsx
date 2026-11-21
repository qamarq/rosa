"use client"

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import { createOutlineMaterial, setUniform } from "./materials"
import { ribbon } from "./water"
import { densify, type World } from "./world"

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

export function ParcelOutline({ world, animate, revealAt }: { world: World; animate: boolean; revealAt: number }) {
  const geometries = useMemo(() => {
    const stepM = (world.halfM * 2) / 260
    const out = []
    for (const ring of world.scene.parcel) {
      if (ring.length < 3) continue
      const closed = densify([...ring, ring[0]], stepM)
      const core = ribbon(world, closed, 0.075, 0.06)
      const glow = ribbon(world, closed, 0.55, 0.05)
      if (core && glow) out.push({ core: core.geometry, glow: glow.geometry })
    }
    return out
  }, [world])

  const inner = useMemo(() => {
    const stepM = (world.halfM * 2) / 260
    return (world.scene.parts ?? [])
      .filter((ring) => ring.length >= 3)
      .map((ring) => ribbon(world, densify([...ring, ring[0]], stepM), 0.035, 0.055)?.geometry)
      .filter((g) => !!g)
  }, [world])

  const uniforms = useMemo(() => ({ progress: { value: animate ? 0 : 1 }, glow: { value: animate ? 0 : 0.6 } }), [animate])
  const materials = useMemo(
    () => ({
      core: createOutlineMaterial(uniforms.progress, uniforms.glow, "#FFFDF8", false),
      glow: createOutlineMaterial(uniforms.progress, uniforms.glow, "#FFE7A0", true),
    }),
    [uniforms],
  )

  const innerMaterial = useMemo(() => {
    const m = createOutlineMaterial(uniforms.progress, uniforms.glow, "#FFFDF8", false)
    m.opacity = 0.35
    return m
  }, [uniforms])

  useEffect(() => () => inner.forEach((g) => g.dispose()), [inner])
  useEffect(() => () => innerMaterial.dispose(), [innerMaterial])

  useEffect(
    () => () => {
      geometries.forEach((g) => {
        g.core.dispose()
        g.glow.dispose()
      })
    },
    [geometries],
  )
  useEffect(
    () => () => {
      materials.core.dispose()
      materials.glow.dispose()
    },
    [materials],
  )

  useFrame(({ clock }) => {
    if (!animate) return
    const t = clock.elapsedTime - revealAt
    setUniform(uniforms.progress, t <= 0 ? 0 : easeOutQuart(Math.min(1, t / 0.8)) * 1.001)
    const g = t - 0.8
    const bloom = g <= 0 ? 0 : g < 0.2 ? g / 0.2 : g < 0.4 ? 1 - ((g - 0.2) / 0.2) * 0.4 : 0.6 + Math.sin(clock.elapsedTime * 1.4) * 0.08
    setUniform(uniforms.glow, bloom)
  })

  return (
    <group>
      {inner.map((g, i) => (
        <mesh key={"inner" + i} geometry={g} material={innerMaterial} renderOrder={2} />
      ))}
      {geometries.map((g, i) => (
        <group key={i}>
          <mesh geometry={g.glow} material={materials.glow} renderOrder={3} />
          <mesh geometry={g.core} material={materials.core} renderOrder={4} />
        </group>
      ))}
    </group>
  )
}
