"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { SceneMode } from "@/lib/types"
import { focusOf, type World } from "./world"

export type CameraState = { zoom: number; rotation: number; topView: boolean }

export const FLY_IN_S = 1.8
const BASE_AZ = -0.38
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

type Pose = { az: number; el: number; dist: number; target: THREE.Vector3 }

export function CameraRig({ world, mode, camera, tilt, animate }: { world: World; mode: SceneMode; camera: CameraState; tilt: number; animate: boolean }) {
  const { camera: cam, size, invalidate } = useThree()
  const pose = useRef<Pose | null>(null)
  const start = useRef<{ pose: Pose; t: number } | null>(null)

  const focus = useMemo(() => {
    const f = focusOf(world, mode)
    const [x, y, z] = world.toWorld(f.point[0], f.point[1])
    return { target: new THREE.Vector3(x, y, z), radius: f.radiusM * world.metersToWorld }
  }, [world, mode])

  useEffect(() => {
    invalidate()
  }, [focus, camera.zoom, camera.rotation, camera.topView, tilt, invalidate])

  useFrame(({ clock, scene }, delta) => {
    const persp = cam as THREE.PerspectiveCamera
    const vHalf = THREE.MathUtils.degToRad(persp.fov / 2)
    const hHalf = Math.atan(Math.tan(vHalf) * (size.width / Math.max(size.height, 1)))
    const fit = focus.radius / Math.sin(Math.min(vHalf, hHalf))
    const desired: Pose = {
      az: BASE_AZ + THREE.MathUtils.degToRad(camera.rotation),
      el: THREE.MathUtils.degToRad(THREE.MathUtils.clamp((camera.topView ? 82 : 40) + tilt, 16, 86)),
      dist: fit / camera.zoom,
      target: focus.target,
    }

    if (!pose.current) {
      if (animate) {
        const from: Pose = { az: desired.az - 0.9, el: THREE.MathUtils.degToRad(84), dist: desired.dist * 2.3, target: new THREE.Vector3(0, 0, 0) }
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
