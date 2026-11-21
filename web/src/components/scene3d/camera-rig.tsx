"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { SceneMode } from "@/lib/types"
import { focusOf, islandRadiusM, type World } from "./world"

export type CameraState = { zoom: number; rotation: number; topView: boolean }

export const FLY_IN_S = 1.8
const BASE_AZ = -0.38
const FILL_W = 0.62
const FILL_H = 0.56
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

type Pose = { az: number; el: number; dist: number; target: THREE.Vector3 }

export function CameraRig({ world, mode, camera, tilt, animate }: { world: World; mode: SceneMode; camera: CameraState; tilt: number; animate: boolean }) {
  const { camera: cam, size, invalidate } = useThree()
  const pose = useRef<Pose | null>(null)
  const start = useRef<{ pose: Pose; t: number } | null>(null)

  const focus = useMemo(() => {
    const f = focusOf(world, mode)
    const [x, y, z] = world.toWorld(f.point[0], f.point[1])
    return { target: new THREE.Vector3(x, y, z), radius: f.radiusM * world.metersToWorld, parcel: !!f.parcel }
  }, [world, mode])
  const ring = useMemo(() => world.parcelOuterRing.map(([x, y]) => [x * world.metersToWorld, -y * world.metersToWorld] as const), [world])
  const island = useMemo(() => ({ target: new THREE.Vector3(0, world.relief * 0.4, 0), radius: islandRadiusM(world) * world.metersToWorld }), [world])

  useEffect(() => {
    invalidate()
  }, [focus, camera.zoom, camera.rotation, camera.topView, tilt, invalidate])

  useFrame(({ clock, scene }, delta) => {
    const persp = cam as THREE.PerspectiveCamera
    const vHalf = THREE.MathUtils.degToRad(persp.fov / 2)
    const hHalf = Math.atan(Math.tan(vHalf) * (size.width / Math.max(size.height, 1)))
    const az = BASE_AZ + THREE.MathUtils.degToRad(camera.rotation)
    const el = THREE.MathUtils.degToRad(THREE.MathUtils.clamp((camera.topView ? 82 : 40) + tilt, 16, 86))
    const islandDist = island.radius / Math.sin(Math.min(vHalf, hHalf))
    let dist = focus.radius / Math.sin(Math.min(vHalf, hHalf))
    let target = focus.target
    if (focus.parcel && ring.length > 2) {
      const rx = Math.cos(az)
      const rz = -Math.sin(az)
      let minU = Infinity
      let maxU = -Infinity
      let minV = Infinity
      let maxV = -Infinity
      for (const [x, z] of ring) {
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
      const s = world.metersToWorld
      target = new THREE.Vector3(cx, world.heightAt(cx / s, -cz / s), cz)
      dist = Math.max((maxU - minU) / 2 / FILL_W / Math.tan(hHalf), ((maxV - minV) * Math.sin(el)) / 2 / FILL_H / Math.tan(vHalf), 2.5)
    }
    if (camera.zoom < 1 && focus.parcel) {
      const k = THREE.MathUtils.clamp((1 - camera.zoom) / 0.15, 0, 1)
      dist = THREE.MathUtils.lerp(dist, Math.max(dist, islandDist), k)
      target = target.clone().lerp(island.target, k)
    } else {
      dist /= camera.zoom
    }
    const desired: Pose = { az, el, dist, target }

    if (!pose.current) {
      if (animate) {
        const from: Pose = { az: desired.az - 0.9, el: THREE.MathUtils.degToRad(84), dist: Math.max(islandDist * 1.25, desired.dist * 2.3), target: new THREE.Vector3(0, 0, 0) }
        start.current = { pose: from, t: clock.elapsedTime }
        pose.current = { ...from, target: from.target.clone() }
      } else {
        pose.current = { ...desired, target: desired.target.clone() }
      }
    }
    const p = pose.current
    const fly = start.current
    if (animate && fly && clock.elapsedTime - fly.t < FLY_IN_S) {
      const k = easeInOutCubic(Math.min(1, (clock.elapsedTime - fly.t) / FLY_IN_S))
      p.az = THREE.MathUtils.lerp(fly.pose.az, desired.az, k)
      p.el = THREE.MathUtils.lerp(fly.pose.el, desired.el, k)
      p.dist = THREE.MathUtils.lerp(fly.pose.dist, desired.dist, k)
      p.target.lerpVectors(fly.pose.target, desired.target, k)
    } else if (animate) {
      const a = 1 - Math.exp(-Math.min(delta, 0.1) * 4.2)
      p.az += (desired.az - p.az) * a
      p.el += (desired.el - p.el) * a
      p.dist += (desired.dist - p.dist) * a
      p.target.lerp(desired.target, a)
    } else {
      p.az = desired.az
      p.el = desired.el
      p.dist = desired.dist
      p.target.copy(desired.target)
    }

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
  })

  return null
}
