import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';
import { COLORS, getFaceIndex } from '../utils/cubeMapping';

const createCubieGroup = (x, y, z, initialState) => {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // Base cubie body (dark textured charcoal black plastic)
  const bodyGeo = new RoundedBoxGeometry(0.96, 0.96, 0.96, 4, 0.08);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x111215, // Real plastic dark charcoal color
    roughness: 0.45,
    metalness: 0.1
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(bodyMesh);

  // Helper to add a smaller vinyl sticker on the outer faces
  const addSticker = (px, py, pz, rx, ry, rz, colorName) => {
    const colStr = COLORS[colorName];
    if (!colStr || colStr === COLORS.default) return;

    // Thin rounded box with safe bevel radius (0.008 < 0.02 / 2) to prevent normal/shading glitches
    const stickerGeo = new RoundedBoxGeometry(0.78, 0.78, 0.02, 3, 0.008);
    const stickerMat = new THREE.MeshStandardMaterial({
      color: colStr,
      roughness: 0.85, // Matte vinyl sticker texture to eliminate glares and environment reflections
      metalness: 0.0,
      emissive: colStr,
      emissiveIntensity: 0.15 // Emissive intensity boosted to ensure color stays true and solid in all angles
    });
    
    const stickerMesh = new THREE.Mesh(stickerGeo, stickerMat);
    stickerMesh.position.set(px, py, pz);
    stickerMesh.rotation.set(rx, ry, rz);
    group.add(stickerMesh);
  };

  // Add stickers to outer faces offset by 0.49 (half of 0.96 body plus half of 0.02 sticker thickness)
  // This aligns them perfectly on the surface with realistic black borders!
  if (x === 1)  addSticker(0.49, 0, 0, 0, Math.PI / 2, 0, initialState.R[getFaceIndex('R', x, y, z)]);
  if (x === -1) addSticker(-0.49, 0, 0, 0, -Math.PI / 2, 0, initialState.L[getFaceIndex('L', x, y, z)]);
  if (y === 1)  addSticker(0, 0.49, 0, -Math.PI / 2, 0, 0, initialState.U[getFaceIndex('U', x, y, z)]);
  if (y === -1) addSticker(0, -0.49, 0, Math.PI / 2, 0, 0, initialState.D[getFaceIndex('D', x, y, z)]);
  if (z === 1)  addSticker(0, 0, 0.49, 0, 0, 0, initialState.F[getFaceIndex('F', x, y, z)]);
  if (z === -1) addSticker(0, 0, -0.49, 0, Math.PI, 0, initialState.B[getFaceIndex('B', x, y, z)]);

  return group;
};

const Cube3D = ({ initialState, moveSequence, currentMoveIndex, isSolving, onMoveComplete }) => {
  const { scene } = useThree();
  const pivotRef = useRef(new THREE.Group());
  const cubiesRef = useRef([]);
  const ringRef = useRef(null);
  
  const animatingRef = useRef(false);
  const targetRotationRef = useRef(0);
  const currentRotationRef = useRef(0);
  const axisRef = useRef(new THREE.Vector3());

  // Initialize the 27 meshes
  useEffect(() => {
    scene.add(pivotRef.current);
    
    // Telekinetic energy ring
    const ringGeo = new THREE.TorusGeometry(1.6, 0.03, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringRef.current = ringMesh;
    pivotRef.current.add(ringMesh);

    // Cleanup old cubies
    cubiesRef.current.forEach(c => scene.remove(c));
    cubiesRef.current = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubieGroup = createCubieGroup(x, y, z, initialState);
          scene.add(cubieGroup);
          cubiesRef.current.push(cubieGroup);
        }
      }
    }

    return () => {
      scene.remove(pivotRef.current);
      cubiesRef.current.forEach(c => scene.remove(c));
    };
  }, [initialState, scene]);

  useEffect(() => {
    if (!isSolving || moveSequence.length === 0 || currentMoveIndex >= moveSequence.length) return;
    
    const move = moveSequence[currentMoveIndex];
    if (!move) return;

    const isPrime = move.includes("'");
    const isDouble = move.includes("2");
    const face = move[0];

    let axis = new THREE.Vector3();
    let angle = (isPrime ? Math.PI / 2 : -Math.PI / 2) * (isDouble ? 2 : 1); 
    let condition = (p) => false;

    // Standard turns
    if (face === 'R') { axis.set(1, 0, 0); condition = p => Math.round(p.x) === 1; }
    if (face === 'L') { axis.set(1, 0, 0); condition = p => Math.round(p.x) === -1; angle *= -1; }
    if (face === 'U') { axis.set(0, 1, 0); condition = p => Math.round(p.y) === 1; }
    if (face === 'D') { axis.set(0, 1, 0); condition = p => Math.round(p.y) === -1; angle *= -1; }
    if (face === 'F') { axis.set(0, 0, 1); condition = p => Math.round(p.z) === 1; }
    if (face === 'B') { axis.set(0, 0, 1); condition = p => Math.round(p.z) === -1; angle *= -1; }

    // Wide turns (two layers)
    if (face === 'r') { axis.set(1, 0, 0); condition = p => Math.round(p.x) >= 0; }
    if (face === 'l') { axis.set(1, 0, 0); condition = p => Math.round(p.x) <= 0; angle *= -1; }
    if (face === 'u') { axis.set(0, 1, 0); condition = p => Math.round(p.y) >= 0; }
    if (face === 'd') { axis.set(0, 1, 0); condition = p => Math.round(p.y) <= 0; angle *= -1; }
    if (face === 'f') { axis.set(0, 0, 1); condition = p => Math.round(p.z) >= 0; }
    if (face === 'b') { axis.set(0, 0, 1); condition = p => Math.round(p.z) <= 0; angle *= -1; }

    // Slice turns
    if (face === 'M') { axis.set(1, 0, 0); condition = p => Math.round(p.x) === 0; angle *= -1; } 
    if (face === 'E') { axis.set(0, 1, 0); condition = p => Math.round(p.y) === 0; angle *= -1; } 
    if (face === 'S') { axis.set(0, 0, 1); condition = p => Math.round(p.z) === 0; } 

    axisRef.current = axis;
    targetRotationRef.current = angle;
    currentRotationRef.current = 0;

    pivotRef.current.rotation.set(0,0,0);
    pivotRef.current.updateMatrixWorld();

    // Orient ring to match rotation axis
    if (ringRef.current) {
      ringRef.current.rotation.set(
        axis.y ? Math.PI/2 : 0,
        axis.x ? Math.PI/2 : 0,
        0
      );
      ringRef.current.material.opacity = 0.8;
      ringRef.current.scale.set(1, 1, 1);
    }

    cubiesRef.current.forEach(cubie => {
      const pos = new THREE.Vector3();
      cubie.getWorldPosition(pos);
      if (condition(pos)) {
         pivotRef.current.attach(cubie);
      }
    });

    animatingRef.current = true;

  }, [currentMoveIndex, isSolving, moveSequence]);

  const easeOutBack = (x) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };

  useFrame((state, delta) => {
    if (!animatingRef.current) return;

    // Slower move speed (0.79s per rotation) so the user can easily follow
    currentRotationRef.current += delta / 0.79;
    let progress = Math.min(currentRotationRef.current, 1);
    
    let easedProgress = easeOutBack(progress);
    let currentAngle = targetRotationRef.current * easedProgress;

    if (axisRef.current.x) pivotRef.current.rotation.x = currentAngle;
    if (axisRef.current.y) pivotRef.current.rotation.y = currentAngle;
    if (axisRef.current.z) pivotRef.current.rotation.z = currentAngle;
    
    // Animate energy ring
    if (ringRef.current) {
       ringRef.current.material.opacity = (1 - progress) * 0.8;
       ringRef.current.scale.setScalar(1 + progress * 0.2);
    }

    if (progress >= 1) {
      animatingRef.current = false;
      pivotRef.current.updateMatrixWorld();
      
      const children = [...pivotRef.current.children];
      children.forEach(child => {
         if (child === ringRef.current) return; // Keep ring in pivot
         scene.attach(child);
         
         // Precise grid coordinate snap
         child.position.x = Math.round(child.position.x);
         child.position.y = Math.round(child.position.y);
         child.position.z = Math.round(child.position.z);
         
         // Robust alignment snapping using direction vectors to prevent Euler/gimbal glitch flips
         child.updateMatrix();
         const elements = child.matrix.elements;
         
         const xVec = new THREE.Vector3(elements[0], elements[1], elements[2]);
         const yVec = new THREE.Vector3(elements[4], elements[5], elements[6]);
         
         const snapToPrimaryAxis = (v) => {
           const absX = Math.abs(v.x);
           const absY = Math.abs(v.y);
           const absZ = Math.abs(v.z);
           const max = Math.max(absX, absY, absZ);
           if (max === absX) return new THREE.Vector3(Math.sign(v.x), 0, 0);
           if (max === absY) return new THREE.Vector3(0, Math.sign(v.y), 0);
           return new THREE.Vector3(0, 0, Math.sign(v.z));
         };
         
         const snapX = snapToPrimaryAxis(xVec);
         let snapY = snapToPrimaryAxis(yVec);
         
         // Ensure Y is orthogonal to X if they snap to the same axis due to noise
         if (snapY.dot(snapX) !== 0) {
           const absX = Math.abs(yVec.x);
           const absY = Math.abs(yVec.y);
           const absZ = Math.abs(yVec.z);
           const avail = {
             x: snapX.x === 0,
             y: snapX.y === 0,
             z: snapX.z === 0
           };
           let maxVal = -1;
           let chosenAxis = 'y';
           if (avail.x && absX > maxVal) { maxVal = absX; chosenAxis = 'x'; }
           if (avail.y && absY > maxVal) { maxVal = absY; chosenAxis = 'y'; }
           if (avail.z && absZ > maxVal) { maxVal = absZ; chosenAxis = 'z'; }
           snapY.set(0, 0, 0);
           snapY[chosenAxis] = Math.sign(yVec[chosenAxis]);
         }
         
         const snapZ = new THREE.Vector3().crossVectors(snapX, snapY);
         
         const rotMatrix = new THREE.Matrix4();
         rotMatrix.makeBasis(snapX, snapY, snapZ);
         child.quaternion.setFromRotationMatrix(rotMatrix);
         
         child.updateMatrix();
      });
      
      pivotRef.current.rotation.set(0,0,0);
      onMoveComplete();
    }
  });

  return null;
};

export default Cube3D;
