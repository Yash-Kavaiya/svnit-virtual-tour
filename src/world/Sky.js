import * as THREE from 'three';
import { TIME_PRESETS } from './TimeOfDay.js';

const VERT = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(wp.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vWorldDir;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform float uTime;
  uniform float uCloudCover;
  uniform float uCloudLight;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(h, 0.8));
    float sd = max(dot(dir, normalize(uSunDir)), 0.0);
    float sun = pow(sd, 800.0);
    float glow = pow(sd, 6.0) * 0.25;
    col += uSunColor * (sun * 6.0 + glow) * clamp(uSunIntensity, 0.2, 3.0);

    // scattered cumulus on a flat layer: project the view ray onto it
    if (dir.y > 0.01) {
      vec2 uv = dir.xz / (dir.y + 0.12) * 1.6 + vec2(uTime * 0.004, uTime * 0.0015);
      float n = fbm(uv);
      float cover = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.28, n);
      // self-shadowed base, sun-lit tops, silver rim toward the sun
      float thick = fbm(uv * 1.9 + 4.0);
      vec3 lit = mix(vec3(0.72, 0.74, 0.78), vec3(1.0), thick) * mix(vec3(1.0), uSunColor, 0.35);
      lit = lit * uCloudLight + uSunColor * pow(sd, 12.0) * 0.4 * uCloudLight;
      float fade = smoothstep(0.02, 0.22, dir.y); // melt into the horizon haze
      col = mix(col, lit, cover * fade * 0.92);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

// cloud coverage (0..1) and brightness per time-of-day preset
const CLOUDS = {
  dawn: { cover: 0.42, light: 0.95 },
  noon: { cover: 0.38, light: 1.0 },
  dusk: { cover: 0.45, light: 0.85 },
  night: { cover: 0.3, light: 0.12 },
};

export function createSky(scene) {
  const geo = new THREE.SphereGeometry(2000, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uHorizon: { value: new THREE.Color(TIME_PRESETS.noon.skyHorizon) },
      uZenith: { value: new THREE.Color(TIME_PRESETS.noon.skyZenith) },
      uSunDir: { value: new THREE.Vector3(...TIME_PRESETS.noon.sunDir) },
      uSunColor: { value: new THREE.Color(TIME_PRESETS.noon.sunColor) },
      uSunIntensity: { value: TIME_PRESETS.noon.sunIntensity },
      uTime: { value: 0 },
      uCloudCover: { value: CLOUDS.noon.cover },
      uCloudLight: { value: CLOUDS.noon.light },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  scene.add(mesh);

  // Starfield
  const starCount = 1400;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const v = new THREE.Vector3()
      .randomDirection()
      .multiplyScalar(1900);
    if (v.y < 0) v.y = -v.y;
    positions.set([v.x, v.y, v.z], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({
    color: '#ffffff',
    size: 3.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -999;
  scene.add(stars);

  function setPreset(name) {
    const p = TIME_PRESETS[name] ?? TIME_PRESETS.noon;
    mat.uniforms.uHorizon.value.set(p.skyHorizon);
    mat.uniforms.uZenith.value.set(p.skyZenith);
    mat.uniforms.uSunDir.value.set(...p.sunDir);
    mat.uniforms.uSunColor.value.set(p.sunColor);
    mat.uniforms.uSunIntensity.value = p.sunIntensity;
    starMat.opacity = p.starOpacity;
    const c = CLOUDS[name] ?? CLOUDS.noon;
    mat.uniforms.uCloudCover.value = c.cover;
    mat.uniforms.uCloudLight.value = c.light;
  }

  function update(dt) {
    mat.uniforms.uTime.value += dt;
  }

  function dispose() {
    geo.dispose();
    mat.dispose();
    starGeo.dispose();
    starMat.dispose();
    scene.remove(mesh);
    scene.remove(stars);
  }

  return { mesh, stars, setPreset, update, dispose };
}
