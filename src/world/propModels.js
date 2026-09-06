import * as THREE from 'three';

export function lampPost() {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#3a3f45', roughness: 0.6, metalness: 0.3 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.2, 8), poleMat);
  pole.position.y = 2.6;
  pole.castShadow = true;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), poleMat);
  arm.rotation.z = Math.PI / 2.4;
  arm.position.set(0.45, 5.0, 0);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.22, 0.34),
    new THREE.MeshStandardMaterial({ color: '#2b2f34', roughness: 0.5 }),
  );
  head.position.set(0.95, 4.9, 0);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#fff2cf', emissive: '#ffdf9c', emissiveIntensity: 0 }),
  );
  lamp.position.set(0.95, 4.78, 0);
  lamp.name = 'lamp-bulb';
  g.add(pole, arm, head, lamp);
  return g;
}

export function bench() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: '#444', roughness: 0.6, metalness: 0.3 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), wood);
  seat.position.y = 0.45;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), wood);
  back.position.set(0, 0.72, -0.22);
  for (const sx of [-0.75, 0.75]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.45), metal);
    leg.position.set(sx, 0.22, 0);
    g.add(leg);
  }
  seat.castShadow = true;
  g.add(seat, back);
  return g;
}

export function bin() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.2, 0.8, 10),
    new THREE.MeshStandardMaterial({ color: '#2f6a3a', roughness: 0.8 }),
  );
  body.position.y = 0.4;
  body.castShadow = true;
  g.add(body);
  return g;
}

export function bollard() {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: '#c9c2b3', roughness: 0.9 }),
  );
}

export function busStop() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#4a5560', roughness: 0.5, metalness: 0.3 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 1.8), metal);
  roof.position.y = 2.5;
  roof.castShadow = true;
  for (const sx of [-1.8, 1.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), metal);
    post.position.set(sx, 1.25, -0.8);
    g.add(post);
  }
  const b = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 0.35), new THREE.MeshStandardMaterial({ color: '#7a6a52' }));
  b.position.set(0, 0.5, -0.7);
  g.add(roof, b);
  return g;
}
