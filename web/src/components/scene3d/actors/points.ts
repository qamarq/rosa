import { useEffect, useMemo } from "react"
import * as THREE from "three"

export type PointShape = "round" | "streak" | "sparkle" | "puff"

const SHAPES: Record<PointShape, number> = { round: 0, streak: 1, sparkle: 2, puff: 3 }

const vertexShader = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
uniform float uPx;
uniform float uPersp;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = mix(1.0, max(-mv.z, 0.0001), uPersp);
  gl_PointSize = aAlpha <= 0.001 ? 0.0 : clamp(aSize * uPx / dist, 0.0, 256.0);
  vAlpha = aAlpha;
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  vec3 col = uColor;
  float a;
#if SHAPE == 0
  a = 1.0 - smoothstep(0.72, 1.0, d);
  col = mix(col, vec3(1.0), (1.0 - smoothstep(0.0, 0.45, length(c - vec2(-0.14, -0.14)) * 2.0)) * 0.7);
#elif SHAPE == 1
  a = (1.0 - smoothstep(0.05, 0.14, abs(c.x))) * (1.0 - smoothstep(0.3, 0.5, abs(c.y)));
#elif SHAPE == 2
  float cross = max(1.0 - smoothstep(0.02, 0.09, abs(c.x)), 1.0 - smoothstep(0.02, 0.09, abs(c.y)));
  a = max(cross * (1.0 - smoothstep(0.1, 1.0, d)), 1.0 - smoothstep(0.0, 0.3, d));
#else
  a = exp(-d * d * 2.6) * (1.0 - smoothstep(0.8, 1.0, d));
#endif
  a *= vAlpha * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`

const bufferSize = new THREE.Vector2()

export type SoftPoints = {
  points: THREE.Points
  pos: Float32Array
  size: Float32Array
  alpha: Float32Array
  count: number
  set: (i: number, x: number, y: number, z: number, size: number, alpha: number) => void
  commit: () => void
}

function createSoftPoints(count: number, color: string, shape: PointShape, opacity: number, additive: boolean): SoftPoints & { dispose: () => void } {
  const geometry = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const alpha = new Float32Array(count)
  const pa = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)
  const sa = new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage)
  const aa = new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute("position", pa)
  geometry.setAttribute("aSize", sa)
  geometry.setAttribute("aAlpha", aa)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uPx: { value: 500 },
      uPersp: { value: 1 },
    },
    defines: { SHAPE: SHAPES[shape] },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = 3
  points.onBeforeRender = (renderer, _scene, camera) => {
    renderer.getDrawingBufferSize(bufferSize)
    const persp = (camera as THREE.PerspectiveCamera).isPerspectiveCamera
    material.uniforms.uPersp.value = persp ? 1 : 0
    material.uniforms.uPx.value = bufferSize.y * 0.5 * camera.projectionMatrix.elements[5]
  }
  return {
    points,
    pos,
    size,
    alpha,
    count,
    set: (i, x, y, z, s, a) => {
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      size[i] = s
      alpha[i] = a
    },
    commit: () => {
      pa.needsUpdate = true
      sa.needsUpdate = true
      aa.needsUpdate = true
    },
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}

export function setUniform(material: THREE.ShaderMaterial, name: string, value: number) {
  material.uniforms[name].value = value
}

export function useSoftPoints(count: number, color: string, shape: PointShape, opacity = 1, additive = false): SoftPoints {
  const sp = useMemo(() => createSoftPoints(count, color, shape, opacity, additive), [count, color, shape, opacity, additive])
  useEffect(() => () => sp.dispose(), [sp])
  return sp
}
