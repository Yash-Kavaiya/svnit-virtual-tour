import * as THREE from 'three';

// Low-poly tree/plant geometries for instancing. Each returns
// { trunk: {geometry, material}, canopy: {geometry, material, offsetY, scale} }.

const trunkMat = () => new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 1 });
const leafMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });

export function neem() {
  return {
    trunk: { geometry: new THREE.CylinderGeometry(0.28, 0.42, 4.2, 6), material: trunkMat() },
    canopy: {
      geometry: new THREE.IcosahedronGeometry(3.2, 1),
      material: leafMat('#4a6a34'),
      offsetY: 5.6,
      scale: [1.25, 1.05, 1.25],
    },
  };
}

export function gulmohar() {
  return {
    trunk: { geometry: new THREE.CylinderGeometry(0.3, 0.44, 4.0, 6), material: trunkMat() },
    canopy: {
      geometry: new THREE.IcosahedronGeometry(3.4, 1),
      material: leafMat('#5f7a3a'),
      offsetY: 5.2,
      scale: [1.35, 0.85, 1.35],
    },
  };
}

export function ashoka() {
  return {
    trunk: { geometry: new THREE.CylinderGeometry(0.2, 0.28, 1.4, 6), material: trunkMat() },
    canopy: {
      geometry: new THREE.ConeGeometry(1.35, 8.0, 8),
      material: leafMat('#3c5a2c'),
      offsetY: 4.8,
      scale: [1, 1, 1],
    },
  };
}

export function palm() {
  return {
    trunk: { geometry: new THREE.CylinderGeometry(0.22, 0.34, 8.5, 6), material: trunkMat() },
    canopy: {
      geometry: new THREE.IcosahedronGeometry(2.1, 0),
      material: leafMat('#5a7a3e'),
      offsetY: 9.0,
      scale: [1.9, 0.55, 1.9],
    },
  };
}

export function hedgeSegment() {
  return {
    geometry: new THREE.BoxGeometry(2, 1.1, 0.9),
    material: leafMat('#41602f'),
  };
}

export const SPECIES = { neem, gulmohar, ashoka, palm };
