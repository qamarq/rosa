"use client"

import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { Vec3, WorldContext } from "../contract"
import { buildFlowPaths, rng } from "./layout"
import type { Layout, P } from "./layout"
import { easeOutCubic, fract, span, useActorFrame } from "./motion"
import { setUniform, useSoftPoints } from "./points"

const FLOW_STEPS = 12

export function WaterFlow({ ctx, layout, count }: { ctx: WorldContext; layout: Layout; count: number }) {
  const paths = useMemo(() => buildFlowPaths(ctx, layout, count, FLOW_STEPS), [ctx, layout, count])
  const meta = useMemo(() => {
    const r = rng(5)
    const life = new Float32Array(count)
    const phase = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      life[i] = 2.5 + r() * 1.5
      phase[i] = r()
    }
    return { life, phase }
  }, [count])
  const sp = useSoftPoints(count, "#5DB7C4", "round", 0.85)
  const size = layout.k * 0.42

  useActorFrame((t) => {
    for (let i = 0; i < count; i++) {
      const f = fract(t / meta.life[i] + meta.phase[i])
      const x = f * FLOW_STEPS
      const j = Math.min(FLOW_STEPS - 1, Math.floor(x))
      const u = x - j
      const o = (i * (FLOW_STEPS + 1) + j) * 3
      sp.set(
        i,
        paths[o] + (paths[o + 3] - paths[o]) * u,
        paths[o + 1] + (paths[o + 4] - paths[o + 1]) * u,
        paths[o + 2] + (paths[o + 5] - paths[o + 2]) * u,
        size,
        f < 0.12 ? f / 0.12 : f > 0.88 ? (1 - f) / 0.12 : 1,
      )
    }
    sp.commit()
  })

  return <primitive object={sp.points} />
}

export function Rain({ ctx, layout, count }: { ctx: WorldContext; layout: Layout; count: number }) {
  const base = useMemo(() => {
    const r = rng(23)
    const [x0, y0, x1, y1] = layout.bbox
    const padX = (x1 - x0) * 0.15
    const padY = (y1 - y0) * 0.15
    const ground = new Float32Array(count * 3)
    const phase = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const w = ctx.toWorld(x0 - padX + (x1 - x0 + 2 * padX) * r(), y0 - padY + (y1 - y0 + 2 * padY) * r())
      ground[i * 3] = w[0]
      ground[i * 3 + 1] = w[1]
      ground[i * 3 + 2] = w[2]
      phase[i] = r()
    }
    return { ground, phase }
  }, [ctx, layout, count])
  const sp = useSoftPoints(count, "#6FB9C9", "streak", 0.75)
  const height = layout.k * 16
  const size = layout.k * 1.3

  useActorFrame((t) => {
    for (let i = 0; i < count; i++) {
      const f = fract(t / 0.9 + base.phase[i])
      const a = f < 0.1 ? f / 0.1 : f > 0.94 ? (1 - f) / 0.06 : 1
      sp.set(i, base.ground[i * 3], base.ground[i * 3 + 1] + height * (1 - f), base.ground[i * 3 + 2], size, a)
    }
    sp.commit()
  })

  return <primitive object={sp.points} />
}

export function Dust({ ctx, layout, count, focus }: { ctx: WorldContext; layout: Layout; count: number; focus: P }) {
  const base = useMemo(() => {
    const r = rng(31)
    const ground = new Float32Array(count * 3)
    const phase = new Float32Array(count)
    const life = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const near = i < count * 0.3
      const a = r() * Math.PI * 2
      const d = (3 + r() * 4) * layout.toy
      const p: P = near ? [focus[0] + Math.cos(a) * d, focus[1] + Math.sin(a) * d] : layout.randomInside(r)
      const w = ctx.toWorld(p[0], p[1])
      ground[i * 3] = w[0]
      ground[i * 3 + 1] = w[1]
      ground[i * 3 + 2] = w[2]
      phase[i] = r()
      life[i] = 2.6 + r() * 1.2
    }
    return { ground, phase, life }
  }, [ctx, layout, count, focus])
  const sp = useSoftPoints(count, "#D9C38E", "puff", 0.6)
  const k = layout.k

  useActorFrame((t) => {
    for (let i = 0; i < count; i++) {
      const f = fract(t / base.life[i] + base.phase[i])
      sp.set(
        i,
        base.ground[i * 3] + f * k * 1.2,
        base.ground[i * 3 + 1] + k * (0.3 + f * 1.4),
        base.ground[i * 3 + 2],
        k * (0.8 + f * 2.2),
        Math.sin(f * Math.PI) * 0.8,
      )
    }
    sp.commit()
  })

  return <primitive object={sp.points} />
}

export function Dew({ ctx, layout, count }: { ctx: WorldContext; layout: Layout; count: number }) {
  const base = useMemo(() => {
    const r = rng(41)
    const p = new Float32Array(count * 3)
    const phase = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const q = layout.randomInside(r)
      const w = ctx.toWorld(q[0], q[1])
      p[i * 3] = w[0]
      p[i * 3 + 1] = w[1] + layout.k * 0.35
      p[i * 3 + 2] = w[2]
      phase[i] = r()
    }
    return { p, phase }
  }, [ctx, layout, count])
  const sp = useSoftPoints(count, "#FFFFFF", "sparkle", 1)
  const k = layout.k

  useActorFrame((t, _s, _dt, animate) => {
    for (let i = 0; i < count; i++) {
      const s = Math.max(0, Math.sin((t / 2.8 + base.phase[i]) * Math.PI * 2))
      const tw = animate ? Math.pow(s, 5) : base.phase[i] > 0.78 ? 0.9 : 0
      sp.set(i, base.p[i * 3], base.p[i * 3 + 1], base.p[i * 3 + 2], k * (0.6 + 0.9 * tw), tw)
    }
    sp.commit()
  })

  return <primitive object={sp.points} />
}

const planeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const shimmerFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float a = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float base = fract(0.1 + fi * 0.33 + uTime * 0.16);
    float y = 0.1 + base * 0.8 + 0.05 * sin(vUv.x * 16.0 + uTime * 2.6 + fi * 2.1);
    a += (1.0 - smoothstep(0.0, 0.03, abs(vUv.y - y))) * sin(base * 3.14159);
  }
  a *= smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`

const glowFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uAlpha;
uniform float uCoreSize;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float halo = exp(-d * d * 3.5) * (1.0 - smoothstep(0.85, 1.0, d));
  float core = uCoreSize > 0.0 ? 1.0 - smoothstep(uCoreSize - 0.03, uCoreSize, d) : 0.0;
  vec3 col = mix(uColor, uCore, core);
  float a = max(halo * 0.75, core) * uAlpha;
  if (a < 0.005) discard;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`

const quad = new THREE.PlaneGeometry(1, 1)

function faceCamera(mesh: THREE.Object3D) {
  mesh.onBeforeRender = (_r, _s, camera) => {
    mesh.quaternion.copy(camera.quaternion)
    mesh.updateMatrixWorld()
  }
}

export function Shimmer({ ctx, layout, count = 4 }: { ctx: WorldContext; layout: Layout; count?: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color("#FFF1D6") }, uOpacity: { value: 0.55 } },
        vertexShader: planeVertex,
        fragmentShader: shimmerFragment,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  const spots = useMemo(() => {
    const r = rng(53)
    const out: Vec3[] = []
    for (let i = 0; i < count; i++) {
      const q = layout.randomInside(r)
      const w = ctx.toWorld(q[0], q[1])
      out.push([w[0], w[1] + layout.k * (2 + r() * 1.5), w[2]])
    }
    return out
  }, [ctx, layout, count])
  const group = useRef<THREE.Group>(null)

  useLayoutEffect(() => {
    group.current?.children.forEach(faceCamera)
  }, [spots])

  useActorFrame((t) => {
    setUniform(material, "uTime", t)
  })

  return (
    <group ref={group}>
      {spots.map((p, i) => (
        <mesh key={i} geometry={quad} material={material} position={p} scale={[layout.k * 14, layout.k * 4.5, 1]} renderOrder={4} />
      ))}
    </group>
  )
}

function useGlowMaterial(color: string, core: string, coreSize: number, depthTest: boolean) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uCore: { value: new THREE.Color(core) },
          uAlpha: { value: 1 },
          uCoreSize: { value: coreSize },
        },
        vertexShader: planeVertex,
        fragmentShader: glowFragment,
        transparent: true,
        depthWrite: false,
        depthTest,
      }),
    [color, core, coreSize, depthTest],
  )
  useEffect(() => () => material.dispose(), [material])
  return material
}

const tmpV = new THREE.Vector3()
const tmpR = new THREE.Vector3()
const tmpU = new THREE.Vector3()

export function SunGlow({ target }: { target: Vec3 }) {
  const material = useGlowMaterial("#F6B444", "#FFE1A6", 0.2, false)
  const mesh = useRef<THREE.Mesh>(null)

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    m.onBeforeRender = (_r, _s, camera) => {
      const cam = camera as THREE.PerspectiveCamera
      const dist = Math.max(1e-3, tmpV.set(target[0], target[1], target[2]).distanceTo(cam.position)) * 1.4
      const e = cam.matrixWorld.elements
      tmpR.set(e[0], e[1], e[2]).normalize()
      tmpU.set(e[4], e[5], e[6]).normalize()
      const forward = tmpV.set(-e[8], -e[9], -e[10]).normalize()
      const halfH = cam.isPerspectiveCamera ? dist * Math.tan(((cam.fov || 50) * Math.PI) / 360) : 1
      const aspect = cam.isPerspectiveCamera ? cam.aspect || 1 : 1
      m.position.copy(cam.position).addScaledVector(forward, dist).addScaledVector(tmpR, halfH * aspect * 0.72).addScaledVector(tmpU, halfH * 0.66)
      m.quaternion.copy(cam.quaternion)
      m.scale.setScalar(halfH * 0.9)
      m.updateMatrixWorld()
    }
  }, [target])

  return <mesh ref={mesh} geometry={quad} material={material} frustumCulled={false} renderOrder={10} />
}

export function Glow({ position, size, startAt, color = "#E9FBFF" }: { position: Vec3; size: number; startAt: number; color?: string }) {
  const material = useGlowMaterial(color, color, 0, true)
  const mesh = useRef<THREE.Mesh>(null)
  useLayoutEffect(() => {
    if (mesh.current) faceCamera(mesh.current)
  }, [])
  useActorFrame((t, _s, _dt, animate) => {
    const on = span(t, startAt, startAt + 0.8)
    setUniform(material, "uAlpha", on * (animate ? 0.55 + 0.25 * Math.sin(t * 2.4) : 0.7))
  })
  return <mesh ref={mesh} geometry={quad} material={material} position={position} scale={size} renderOrder={5} />
}

const surfaceVertex = /* glsl */ `
attribute vec2 aUV;
varying vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const surfaceFragment = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
uniform float uGrow;
uniform vec3 uColor;
uniform vec3 uLight;
varying vec2 vUV;
void main() {
  vec3 col;
  float a;
#if DISC
  float r = vUV.x;
  float inside = 1.0 - smoothstep(uGrow - 0.05, uGrow, r);
  float ripple = 0.5 + 0.5 * sin(r * 30.0 - uTime * 3.2);
  col = mix(uColor, uLight, ripple * 0.22 + smoothstep(uGrow - 0.12, uGrow - 0.02, r) * 0.5);
  a = inside * (0.34 + 0.1 * ripple) * uAlpha;
#else
  float across = 1.0 - smoothstep(0.55, 1.0, abs(vUV.y));
  float ends = smoothstep(0.0, 0.14, vUV.x) * smoothstep(1.0, 0.86, vUV.x);
  float stripe = smoothstep(0.82, 1.0, sin(vUV.x * 30.0 - uTime * 2.6 + vUV.y * 1.7));
  col = mix(uColor, uLight, stripe * 0.35 + (1.0 - across) * 0.25);
  a = across * ends * uAlpha * 0.94;
#endif
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`

function useSurfaceMaterial(disc: boolean) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAlpha: { value: 1 },
          uGrow: { value: 1 },
          uColor: { value: new THREE.Color("#3FA3B0") },
          uLight: { value: new THREE.Color("#D8F3F7") },
        },
        defines: { DISC: disc ? 1 : 0 },
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
    [disc],
  )
  useEffect(() => () => material.dispose(), [material])
  return material
}

function useDisposable<T extends { dispose: () => void }>(value: T): T {
  useEffect(() => () => value.dispose(), [value])
  return value
}

function discGeometry(ctx: WorldContext, centre: P, radius: number, lift: number) {
  const rings = 14
  const segs = 56
  const pos: number[] = []
  const uv: number[] = []
  const index: number[] = []
  const c = ctx.toWorld(centre[0], centre[1])
  pos.push(c[0], c[1] + lift, c[2])
  uv.push(0, 0)
  for (let r = 1; r <= rings; r++) {
    const rr = r / rings
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2
      const w = ctx.toWorld(centre[0] + Math.cos(a) * radius * rr, centre[1] + Math.sin(a) * radius * rr)
      pos.push(w[0], w[1] + lift, w[2])
      uv.push(rr, s / segs)
    }
  }
  for (let s = 0; s < segs; s++) index.push(0, 1 + s, 1 + ((s + 1) % segs))
  for (let r = 1; r < rings; r++) {
    const a0 = 1 + (r - 1) * segs
    const b0 = 1 + r * segs
    for (let s = 0; s < segs; s++) {
      const s1 = (s + 1) % segs
      index.push(a0 + s, b0 + s, b0 + s1, a0 + s, b0 + s1, a0 + s1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("aUV", new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(index)
  g.computeBoundingSphere()
  return g
}

function ribbonGeometry(ctx: WorldContext, points: P[], halfWidth: number) {
  const pos: number[] = []
  const uv: number[] = []
  const index: number[] = []
  const n = points.length
  let total = 0
  const cum = [0]
  for (let i = 1; i < n; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    cum.push(total)
  }
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)]
    const b = points[Math.min(n - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    const nx = -dy / l
    const ny = dx / l
    for (const side of [-1, 1]) {
      const w = ctx.toWorld(points[i][0] + nx * halfWidth * side, points[i][1] + ny * halfWidth * side)
      pos.push(w[0], w[1], w[2])
      uv.push(total > 0 ? cum[i] / total : 0, side)
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("aUV", new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(index)
  g.computeBoundingSphere()
  return g
}

export function WetDisc({ ctx, centre, radius, lift, startAt, duration }: { ctx: WorldContext; centre: P; radius: number; lift: number; startAt: number; duration: number }) {
  const material = useSurfaceMaterial(true)
  const geometry = useDisposable(useMemo(() => discGeometry(ctx, centre, radius, lift), [ctx, centre, radius, lift]))

  useActorFrame((t) => {
    setUniform(material, "uTime", t)
    setUniform(material, "uGrow", 0.02 + easeOutCubic(span(t, startAt, startAt + duration)))
    setUniform(material, "uAlpha", span(t, startAt, startAt + 0.4))
  })

  return <mesh geometry={geometry} material={material} renderOrder={2} />
}

export function WaterRibbon({ ctx, points, halfWidth, k, riseAt, duration }: { ctx: WorldContext; points: P[]; halfWidth: number; k: number; riseAt: number; duration: number }) {
  const material = useSurfaceMaterial(false)
  const mesh = useRef<THREE.Mesh>(null)
  const geometry = useDisposable(useMemo(() => ribbonGeometry(ctx, points, halfWidth), [ctx, points, halfWidth]))

  useActorFrame((t) => {
    const p = easeOutCubic(span(t, riseAt, riseAt + duration))
    setUniform(material, "uTime", t)
    setUniform(material, "uAlpha", Math.min(1, 0.15 + p * 1.2))
    if (mesh.current) mesh.current.position.y = k * (-0.35 + 0.75 * p)
  })

  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={2} />
}

export function Spray({ ctx, centre, radius, height, k, count, startAt }: { ctx: WorldContext; centre: P; radius: number; height: number; k: number; count: number; startAt: number }) {
  const frame = useMemo(() => {
    const c = ctx.toWorld(centre[0], centre[1])
    const e = ctx.toWorld(centre[0] + 1, centre[1])
    const n = ctx.toWorld(centre[0], centre[1] + 1)
    const ex = [e[0] - c[0], e[2] - c[2]]
    const nx = [n[0] - c[0], n[2] - c[2]]
    const r = rng(61)
    const phase = new Float32Array(count)
    const jit = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      phase[i] = r()
      jit[i] = r()
    }
    return { c, ex, nx, phase, jit }
  }, [ctx, centre, count])
  const sp = useSoftPoints(count, "#8FD3E0", "round", 0.9)

  useActorFrame((t) => {
    const on = span(t, startAt, startAt + 0.6)
    const reach = radius * (0.25 + 0.75 * easeOutCubic(span(t, startAt, startAt + 3.5)))
    const spin = t * 1.7
    const { c, ex, nx } = frame
    for (let i = 0; i < count; i++) {
      const f = fract(t / 1.15 + frame.phase[i])
      const jet = (i % 4) * (Math.PI / 2)
      const a = jet + spin - f * 0.6 + (frame.jit[i] - 0.5) * 0.25
      const r = reach * f * (0.7 + 0.3 * frame.jit[i])
      const cx = Math.cos(a) * r
      const cy = Math.sin(a) * r
      sp.set(
        i,
        c[0] + ex[0] * cx + nx[0] * cy,
        c[1] + height * (1 - f) + 4 * height * 0.55 * f * (1 - f),
        c[2] + ex[1] * cx + nx[1] * cy,
        k * (0.32 + 0.2 * frame.jit[i]),
        on * (f > 0.85 ? (1 - f) / 0.15 : 1),
      )
    }
    sp.commit()
  })

  return <primitive object={sp.points} />
}
