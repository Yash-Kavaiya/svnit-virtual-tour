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
  void main() {
    float h = clamp(vWorldDir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(h, 0.8));
    float sun = pow(max(dot(normalize(vWorldDir), normalize(uSunDir)), 0.0), 800.0);
    float glow = pow(max(dot(normalize(vWorldDir), normalize(uSunDir)), 0.0), 6.0) * 0.25;
    col += uSunColor * (sun * 6.0 + glow) * clamp(uSunIntensity, 0.2, 3.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

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
  }

  function dispose() {
    geo.dispose();
    mat.dispose();
    starGeo.dispose();
    starMat.dispose();
    scene.remove(mesh);
    scene.remove(stars);
  }

  return { mesh, stars, setPreset, dispose };
}
