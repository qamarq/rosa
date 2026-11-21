"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { SceneMode } from "@/lib/types"
import { focusOf, islandRadiusM, type World } from "./world"

export type CameraState = { zoom: number; rotation: number; topView: boolean }

export const FLY_IN_S = 1.8
export const BASE_AZ = -0.38
export const DEFAULT_CAMERA: CameraState = { zoom: 1, rotation: 0, topView: false }
const FILL_W = 0.62
const FILL_H = 0.56
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export type Pose = { az: number; el: number; dist: number; target: THREE.Vector3 }

export type Framing = {
  world: World
  target: THREE.Vector3
  radius: number
  parcel: boolean
  ring: (readonly [number, number])[]
  island: { target: THREE.Vector3; radius: number }
}

export function useFraming(world: World, mode: SceneMode): Framing {
  return useMemo(() => makeFraming(world, mode), [world, mode])
}

export function makeFraming(world: World, mode: SceneMode): Framing {
  {
    const f = focusOf(world, mode)
    const [x, y, z] = world.toWorld(f.point[0], f.point[1])
    const s = world.metersToWorld
    return {
      world,
      target: new THREE.Vector3(x, y, z),
      radius: f.radiusM * s,
      parcel: !!f.parcel,
      ring: world.parcelOuterRing.map(([px, py]) => [px * s, -py * s] as const),
      island: { target: new THREE.Vector3(0, world.relief * 0.4, 0), radius: islandRadiusM(world) * s },
    }
  }
}

export function fitDistances(fovDeg: number, width: number, height: number) {
  const vHalf = THREE.MathUtils.degToRad(fovDeg / 2)
  const hHalf = Math.atan(Math.tan(vHalf) * (width / Math.max(height, 1)))
  return { vHalf, hHalf, sphere: (r: number) => r / Math.sin(Math.min(vHalf, hHalf)) }
}

export function computePose(framing: Framing, camera: CameraState, tilt: number, fovDeg: number, width: number, height: number): Pose {
  const { vHalf, hHalf, sphere } = fitDistances(fovDeg, width, height)
  const az = BASE_AZ + THREE.MathUtils.degToRad(camera.rotation)
  const el = THREE.MathUtils.degToRad(THREE.MathUtils.clamp((camera.topView ? 82 : 40) + tilt, 16, 86))
  const islandDist = sphere(framing.island.radius)
  let dist = sphere(framing.radius)
  let target = framing.target
  if (framing.parcel && framing.ring.length > 2) {
    const rx = Math.cos(az)
    const rz = -Math.sin(az)
    let minU = Infinity
    let maxU = -Infinity
    let minV = Infinity
    let maxV = -Infinity
    for (const [x, z] of framing.ring) {
      const u = x * rx + z * rz
      const v = -x * rz + z * rx
      minU = Math.min(minU, u)
      maxU = Math.max(maxU, u)
      minV = Math.min(minV, v)
      maxV = Math.max(maxV, v)
    }
    const cu = (minU + maxU) / 2
    const cv = (minV + maxV) / 2
    const cx = cu * rx - cv * rz
    const cz = cu * rz + cv * rx
    const s = framing.world.metersToWorld
    target = new THREE.Vector3(cx, framing.world.heightAt(cx / s, -cz / s), cz)
    dist = Math.max((maxU - minU) / 2 / FILL_W / Math.tan(hHalf), ((maxV - minV) * Math.sin(el)) / 2 / FILL_H / Math.tan(vHalf), 2.5)
  }
  if (camera.zoom < 1 && framing.parcel) {
    const k = THREE.MathUtils.clamp((1 - camera.zoom) / 0.15, 0, 1)
    dist = THREE.MathUtils.lerp(dist, Math.max(dist, islandDist), k)
    target = target.clone().lerp(framing.island.target, k)
  } else {
    dist /= camera.zoom
  }
  return { az, el, dist, target }
}

export function lerpPose(out: Pose, a: Pose, b: Pose, k: number) {
  out.az = THREE.MathUtils.lerp(a.az, b.az, k)
  out.el = THREE.MathUtils.lerp(a.el, b.el, k)
  out.dist = THREE.MathUtils.lerp(a.dist, b.dist, k)
  out.target.lerpVectors(a.target, b.target, k)
  return out
}

export const clonePose = (p: Pose): Pose => ({ az: p.az, el: p.el, dist: p.dist, target: p.target.clone() })

export function applyPose(cam: THREE.Camera, scene: THREE.Scene, p: Pose) {
  cam.position.set(
    p.target.x + p.dist * Math.cos(p.el) * Math.sin(p.az),
    p.target.y + p.dist * Math.sin(p.el),
    p.target.z + p.dist * Math.cos(p.el) * Math.cos(p.az),
  )
  cam.lookAt(p.target)
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.near = p.dist * 1.05
    scene.fog.far = p.dist * 2.6 + 14
  }
}

export type ViewRect = { x: number; y: number; w: number; h: number; r: number }

export function applyViewRect(cam: THREE.Camera, rect: ViewRect, vw: number, vh: number, frame: HTMLElement | null) {
  const persp = cam as THREE.PerspectiveCamera
  persp.aspect = rect.w / rect.h
  persp.setViewOffset(rect.w, rect.h, -rect.x, -rect.y, vw, vh)
  persp.updateProjectionMatrix()
  if (frame) frame.style.clipPath = `inset(${rect.y}px ${vw - rect.x - rect.w}px ${vh - rect.y - rect.h}px ${rect.x}px round ${rect.r}px)`
}

export function CameraRig({
  world,
  mode,
  camera,
  tilt,
  animate,
  intro = true,
}: {
  world: World
  mode: SceneMode
  camera: CameraState
  tilt: number
  animate: boolean
  intro?: boolean
}) {
  const { camera: cam, size, invalidate } = useThree()
  const pose = useRef<Pose | null>(null)
  const start = useRef<{ pose: Pose; t: number } | null>(null)
  const framing = useFraming(world, mode)

  useEffect(() => {
    invalidate()
  }, [framing, camera.zoom, camera.rotation, camera.topView, tilt, invalidate])

  useFrame(({ clock, scene }, delta) => {
    const fov = (cam as THREE.PerspectiveCamera).fov
    const desired = computePose(framing, camera, tilt, fov, size.width, size.height)

    if (!pose.current) {
      if (animate && intro) {
        const islandDist = fitDistances(fov, size.width, size.height).sphere(framing.island.radius)
        const from: Pose = { az: desired.az - 0.9, el: THREE.MathUtils.degToRad(84), dist: Math.max(islandDist * 1.25, desired.dist * 2.3), target: new THREE.Vector3(0, 0, 0) }
        start.current = { pose: from, t: clock.elapsedTime }
        pose.current = clonePose(from)
      } else {
        pose.current = clonePose(desired)
      }
    }
    const p = pose.current
    const fly = start.current
    if (animate && fly && clock.elapsedTime - fly.t < FLY_IN_S) {
      lerpPose(p, fly.pose, desired, easeInOutCubic(Math.min(1, (clock.elapsedTime - fly.t) / FLY_IN_S)))
    } else if (animate) {
      const a = 1 - Math.exp(-Math.min(delta, 0.1) * 4.2)
      p.az += (desired.az - p.az) * a
      p.el += (desired.el - p.el) * a
      p.dist += (desired.dist - p.dist) * a
      p.target.lerp(desired.target, a)
    } else {
      lerpPose(p, desired, desired, 1)
    }
    applyPose(cam, scene, p)
  })

  return null
}
