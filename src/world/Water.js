import * as THREE from 'three';

const VERT = /* glsl */ `
  varying vec3 vWorld;
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 p = position;
    float w = sin(p.x * 0.35 + uTime * 1.4) * 0.06 + cos(p.y * 0.4 - uTime * 1.1) * 0.05;
    p.z += w;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vWorld;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSky;
  void main() {
    float ripple = sin(vWorld.x * 1.6 + uTime * 2.0) * 0.5 + 0.5;
    ripple *= sin(vWorld.z * 1.9 - uTime * 1.7) * 0.5 + 0.5;
    vec3 col = mix(uDeep, uShallow, ripple * 0.5 + 0.3);
    col = mix(col, uSky, 0.18 + 0.12 * ripple);
    float edge = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
    gl_FragColor = vec4(col + ripple * 0.05, 0.86);
  }
`;

function shapeFromRing(ring) {
  const s = new THREE.Shape();
  ring.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z)));
  s.closePath();
  return s;
}

export function createWater(campus, _registry) {
  const group = new THREE.Group();
  group.name = 'water';
  const mats = [];

  for (const body of campus.water ?? []) {
    if (!body.polygon || body.polygon.length < 3) continue;
    const geo = new THREE.ShapeGeometry(shapeFromRing(body.polygon));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uShallow: { value: new THREE.Color('#7fb8b0') },
        uDeep: { value: new THREE.Color('#274d54') },
        uSky: { value: new THREE.Color('#a9c9e0') },
      },
    });
    mats.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.12;
    group.add(mesh);

    // simple stone rim
    const rim = new THREE.Mesh(
      new THREE.ShapeGeometry(shapeFromRing(body.polygon)),
      new THREE.MeshStandardMaterial({ color: '#8a8378', roughness: 1 }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.06;
    rim.scale.setScalar(1.06);
    group.add(rim);
  }

  return {
    group,
    update(dt) {
      for (const m of mats) m.uniforms.uTime.value += dt;
    },
    dispose() {
      group.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
    },
  };
}
