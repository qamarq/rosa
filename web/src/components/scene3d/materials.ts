import * as THREE from "three"

export type TimeUniforms = { uTime: { value: number }; uGustStart: { value: number } }

export function setUniform(uniform: { value: number }, value: number) {
  uniform.value = value
}

export function setOpacity(material: THREE.Material, value: number) {
  material.opacity = value
}

export function createTimeUniforms(): TimeUniforms {
  return { uTime: { value: 0 }, uGustStart: { value: -100 } }
}

type Patch = {
  uniforms?: Record<string, { value: unknown }>
  vertexHead?: string
  vertexBody?: string
  fragmentHead?: string
  fragmentColor?: string
}

export function patchMaterial<M extends THREE.Material>(material: M, key: string, patch: Patch): M {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, patch.uniforms ?? {})
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${patch.vertexHead ?? ""}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${patch.vertexBody ?? ""}`)
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${patch.fragmentHead ?? ""}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${patch.fragmentColor ?? ""}`)
  }
  material.customProgramCacheKey = () => key
  return material
}

export function createPlantMaterial(time: TimeUniforms, grow: { value: number }, depth = false) {
  const material = depth ? new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }) : new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 })
  return patchMaterial(material, "rosa-plant-" + depth, {
    uniforms: { ...time, uGrow: grow },
    vertexHead: "uniform float uTime;\nuniform float uGustStart;\nuniform float uGrow;",
    vertexBody: `
      vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      float d = length(ip.xz) * 0.11;
      float g = clamp(uGrow * 1.7 - d, 0.0, 1.0);
      float pop = 1.0 + sin(g * 3.14159) * 0.12;
      transformed *= g * pop;
      float h = max(position.y, 0.0);
      float sway = sin(uTime * 1.6 + ip.x * 0.8 + ip.z * 0.35) * 0.04;
      float front = -12.0 + (uTime - uGustStart) * 16.0;
      float gust = exp(-pow((ip.x * 0.8 + ip.z * 0.6 - front) / 2.2, 2.0)) * 0.16;
      transformed.x += (sway + gust) * h;
      transformed.z += (sway * 0.35 + gust * 0.4) * h;
      transformed.y -= gust * 0.25 * h * h;
    `,
  })
}

export function createFlowMaterial(time: TimeUniforms, color: string, highlight: boolean) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.18,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  return patchMaterial(material, "rosa-flow-" + highlight, {
    uniforms: time,
    vertexHead: "attribute float aFlow;\nattribute float aAcross;\nvarying float vFlow;\nvarying float vAcross;",
    vertexBody: "vFlow = aFlow;\nvAcross = aAcross;",
    fragmentHead: "uniform float uTime;\nvarying float vFlow;\nvarying float vAcross;",
    fragmentColor: `
      float wave = sin(vFlow * 26.0 - uTime * 3.2 + sin(vFlow * 7.0) * 1.5);
      float streak = smoothstep(0.72, 0.98, wave) * (1.0 - abs(vAcross) * 0.8);
      float edge = smoothstep(0.55, 1.0, abs(vAcross));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.97, 1.0), streak * ${highlight ? "0.55" : "0.4"});
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.62, edge);
    `,
  })
}

export function createPondMaterial(time: TimeUniforms) {
  const material = new THREE.MeshStandardMaterial({
    color: "#3FA3B0",
    roughness: 0.12,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  return patchMaterial(material, "rosa-pond", {
    uniforms: time,
    vertexHead: "varying vec2 vWorldXZ;",
    vertexBody: "vWorldXZ = (modelMatrix * vec4(transformed, 1.0)).xz;",
    fragmentHead: "uniform float uTime;\nvarying vec2 vWorldXZ;",
    fragmentColor: `
      float r1 = sin(vWorldXZ.x * 9.0 + uTime * 1.3) * sin(vWorldXZ.y * 7.0 - uTime * 1.1);
      float r2 = sin((vWorldXZ.x + vWorldXZ.y) * 13.0 - uTime * 1.9);
      float glint = smoothstep(0.55, 1.0, r1 * 0.6 + r2 * 0.4);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.98, 1.0), glint * 0.45);
    `,
  })
}

export function createOutlineMaterial(progress: { value: number }, glow: { value: number }, color: string, soft: boolean) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    blending: soft ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
  return patchMaterial(material, "rosa-outline-" + soft, {
    uniforms: { uProgress: progress, uGlow: glow },
    vertexHead: "attribute float aAlong;\nattribute float aAcross;\nvarying float vAlong;\nvarying float vAcross;",
    vertexBody: "vAlong = aAlong;\nvAcross = aAcross;",
    fragmentHead: "uniform float uProgress;\nuniform float uGlow;\nvarying float vAlong;\nvarying float vAcross;",
    fragmentColor: soft
      ? `
      if (vAlong > uProgress) discard;
      float fall = pow(1.0 - abs(vAcross), 2.2);
      diffuseColor.a *= fall * uGlow;
    `
      : `
      if (vAlong > uProgress) discard;
      float core = 1.0 - smoothstep(0.55, 1.0, abs(vAcross));
      diffuseColor.a *= core;
    `,
  })
}
