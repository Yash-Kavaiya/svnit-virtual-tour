import * as THREE from 'three';

// Low-poly tree/plant geometries for instancing. Each returns
// { trunk: {geometry, material}, canopy: {geometry, material} } or similar,
// designed so an InstancedMesh per part can render hundreds cheaply.

const trunkMat = () => new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 1 });
const leafMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });

export function neem() {
  return {
    trunk: { geometry: new THREE.CylinderGeometry(0.22, 0.32, 3.4, 6), material: trunkMat() },
    canopy: {
      geometry: new THREE.IcosahedronGeometry(2.7, 1),
      material: leafMat('#4a6a34'),
      offsetY: 4.6,
      scale: [1.3, 1.0, 1.3],
    },
  };
}

export function gulmohar() {
  return {
    trunk: { geometry: new THREE.CylinderGeometry(0.2, 0.3, 3.0, 6), material: trunkMat() },
    canopy: {
      geometry: new THREE.IcosahedronGeometry(3.0, 1),
      material: leafMat('#5f7a3a'),
      offsetY: 3.8,
      scale: [1.5, 0.7, 1.5],
    },
  };
}

export function ashoka() {
  return {
    trunk: { geometry: new THREE.CylinderGeometry(0.16, 0.22, 1.6, 6), material: trunkMat() },
    canopy: {
      geometry: new THREE.ConeGeometry(1.0, 6.5, 7),
      material: leafMat('#3c5a2c'),
      offsetY: 4.6,
      scale: [1, 1, 1],
    },
  };
}

export function palm() {
  const group = { fronds: [], trunk: null };
  return {
    trunk: { geometry: new THREE.CylinderGeometry(0.18, 0.28, 6.5, 6), material: trunkMat() },
    canopy: {
      geometry: new THREE.IcosahedronGeometry(1.7, 0),
      material: leafMat('#5a7a3e'),
      offsetY: 7.0,
      scale: [1.7, 0.5, 1.7],
    },
    _group: group,
  };
}

export function hedgeSegment() {
  return {
    geometry: new THREE.BoxGeometry(2, 1.1, 0.9),
    material: leafMat('#41602f'),
  };
}

export const SPECIES = { neem, gulmohar, ashoka, palm };
