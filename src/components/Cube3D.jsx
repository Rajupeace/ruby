import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';
import { COLORS, getFaceIndex } from '../utils/cubeMapping';

const get2DCubeStateFrom3D = (cubies) => {
  const newState = {
    U: Array(9).fill('default'),
    D: Array(9).fill('default'),
    L: Array(9).fill('default'),
    R: Array(9).fill('default'),
    F: Array(9).fill('default'),
    B: Array(9).fill('default')
  };

  const localAxes = [
    { dir: new THREE.Vector3(1, 0, 0), idx: 0 },
    { dir: new THREE.Vector3(-1, 0, 0), idx: 1 },
    { dir: new THREE.Vector3(0, 1, 0), idx: 2 },
    { dir: new THREE.Vector3(0, -1, 0), idx: 3 },
    { dir: new THREE.Vector3(0, 0, 1), idx: 4 },
    { dir: new THREE.Vector3(0, 0, -1), idx: 5 }
  ];

  const worldDirections = {
    R: new THREE.Vector3(1, 0, 0),
    L: new THREE.Vector3(-1, 0, 0),
    U: new THREE.Vector3(0, 1, 0),
    D: new THREE.Vector3(0, -1, 0),
    F: new THREE.Vector3(0, 0, 1),
    B: new THREE.Vector3(0, 0, -1)
  };

  cubies.forEach(mesh => {
    const x = Math.round(mesh.position.x);
    const y = Math.round(mesh.position.y);
    const z = Math.round(mesh.position.z);

    const facesToCheck = [];
    if (x === 1) facesToCheck.push({ faceName: 'R', targetVec: worldDirections.R });
    if (x === -1) facesToCheck.push({ faceName: 'L', targetVec: worldDirections.L });
    if (y === 1) facesToCheck.push({ faceName: 'U', targetVec: worldDirections.U });
    if (y === -1) facesToCheck.push({ faceName: 'D', targetVec: worldDirections.D });
    if (z === 1) facesToCheck.push({ faceName: 'F', targetVec: worldDirections.F });
    if (z === -1) facesToCheck.push({ faceName: 'B', targetVec: worldDirections.B });

    facesToCheck.forEach(({ faceName, targetVec }) => {
      let maxDot = -Infinity;
      let bestLocalIdx = 0;

      localAxes.forEach(axis => {
        const worldDir = axis.dir.clone().applyQuaternion(mesh.quaternion);
        const dot = worldDir.dot(targetVec);
        if (dot > maxDot) {
          maxDot = dot;
          bestLocalIdx = axis.idx;
        }
      });

      let colorName = 'default';
      mesh.children.forEach(child => {
        if (child.userData && child.userData.axisIdx === bestLocalIdx) {
          colorName = child.userData.colorName;
        }
      });

      const gridIdx = getFaceIndex(faceName, x, y, z);
      if (gridIdx >= 0 && gridIdx < 9) {
        newState[faceName][gridIdx] = colorName;
      }
    });
  });

  return newState;
};

// Maps 2D screen drags on a 3D face into standard Rubik's cube notation
const calculateSliceMove = (faceName, cubiePos, deltaX, deltaY, group, camera, width, height) => {
  // 1. Get cube's local axes in world space
  const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(group.quaternion);
  const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion);
  const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion);

  // 2. Project local axes to 2D screen vectors
  const project = (vec3) => {
    const v = vec3.clone().project(camera);
    return new THREE.Vector2(v.x * width / 2, v.y * height / 2);
  };
  
  const center2D = project(new THREE.Vector3(0, 0, 0));
  const screenX = project(localX).sub(center2D).normalize();
  const screenY = project(localY).sub(center2D).normalize();
  const screenZ = project(localZ).sub(center2D).normalize();

  // 3. User's 2D drag vector (Invert Y since screen Y goes down but 3D goes up)
  const drag2D = new THREE.Vector2(deltaX, -deltaY).normalize();

  // 4. Find which local axis the drag most closely aligns with
  let validAxes = [];
  let N = new THREE.Vector3();
  if (faceName === 'R' || faceName === 'L') {
    validAxes = [{ name: 'Y', vec: screenY }, { name: 'Z', vec: screenZ }];
    N.set(faceName === 'R' ? 1 : -1, 0, 0);
  } else if (faceName === 'U' || faceName === 'D') {
    validAxes = [{ name: 'X', vec: screenX }, { name: 'Z', vec: screenZ }];
    N.set(0, faceName === 'U' ? 1 : -1, 0);
  } else {
    validAxes = [{ name: 'X', vec: screenX }, { name: 'Y', vec: screenY }];
    N.set(0, 0, faceName === 'F' ? 1 : -1);
  }

  let bestAxis = null;
  let maxDot = -1;
  let sign = 1;

  validAxes.forEach(ax => {
    const dot = drag2D.dot(ax.vec);
    if (Math.abs(dot) > maxDot) {
      maxDot = Math.abs(dot);
      bestAxis = ax;
      sign = dot > 0 ? 1 : -1;
    }
  });

  if (!bestAxis || maxDot < 0.5) return null; // Diagonal/Ambiguous drag

  // 5. Calculate Rotation Axis using Cross Product: A = D x N
  const localD = new THREE.Vector3();
  if (bestAxis.name === 'X') localD.set(sign, 0, 0);
  if (bestAxis.name === 'Y') localD.set(0, sign, 0);
  if (bestAxis.name === 'Z') localD.set(0, 0, sign);

  const localA = new THREE.Vector3().crossVectors(N, localD);

  // 6. Map the rotation vector to a standard Rubik's cube move
  // Our rotVec signatures from standard notation:
  const getMoveSignature = (moveStr) => {
    let face = moveStr[0];
    let isPrime = moveStr.includes("'");
    let angle = isPrime ? 1 : -1;
    let axis = new THREE.Vector3();
    let sCoord = 0;
    let sAxis = '';

    if (face === 'R') { axis.set(1, 0, 0); sCoord = 1; sAxis = 'x'; }
    else if (face === 'L') { axis.set(1, 0, 0); sCoord = -1; sAxis = 'x'; angle *= -1; }
    else if (face === 'U') { axis.set(0, 1, 0); sCoord = 1; sAxis = 'y'; angle *= -1; }
    else if (face === 'D') { axis.set(0, 1, 0); sCoord = -1; sAxis = 'y'; }
    else if (face === 'F') { axis.set(0, 0, 1); sCoord = 1; sAxis = 'z'; angle *= -1; }
    else if (face === 'B') { axis.set(0, 0, 1); sCoord = -1; sAxis = 'z'; }
    else if (face === 'M') { axis.set(1, 0, 0); sCoord = 0; sAxis = 'x'; angle *= -1; }
    else if (face === 'E') { axis.set(0, 1, 0); sCoord = 0; sAxis = 'y'; }
    else if (face === 'S') { axis.set(0, 0, 1); sCoord = 0; sAxis = 'z'; angle *= -1; }
    
    return { move: moveStr, rotVec: axis.multiplyScalar(angle), sCoord, sAxis };
  };

  const allMoves = ['R',"R'",'L',"L'",'U',"U'",'D',"D'",'F',"F'",'B',"B'",'M',"M'",'E',"E'",'S',"S'"];
  const signatures = allMoves.map(getMoveSignature);

  // Find the matching move!
  const match = signatures.find(m => {
    return Math.round(cubiePos[m.sAxis]) === m.sCoord && 
           Math.round(m.rotVec.x) === Math.round(localA.x) &&
           Math.round(m.rotVec.y) === Math.round(localA.y) &&
           Math.round(m.rotVec.z) === Math.round(localA.z);
  });

  return match ? match.move : null;
};

const Cube3D = ({ cubeState, moveSequence, currentMoveIndex, isSolving, playbackSpeed = 1, onMoveComplete, rebuildKey, skipAnimation, focusedFace, onApplyMove }) => {
  const groupRef = useRef();
  const cubiesRef = useRef([]);
  const pivotRef = useRef(new THREE.Group());
  const highlightGroupRef = useRef(new THREE.Group());
  const { scene, gl, camera } = useThree();
  // Slice Drag State
  const sliceDragState = useRef({
    active: false,
    faceName: null,
    cubiePos: null,
    startX: 0,
    startY: 0
  });

  // Custom drag rotation with Kinetic Momentum Easing
  const dragState = useRef({
    isDragging: false,
    previousPosition: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 }
  });

  useEffect(() => {
    const onPointerDown = (e) => {
      dragState.current.isDragging = true;
      dragState.current.previousPosition = { x: e.clientX, y: e.clientY };
      dragState.current.velocity = { x: 0, y: 0 }; // Instantly stop momentum when touched
    };

    const onPointerMove = (e) => {
      if (sliceDragState.current.active) return; // Wait for pointerup to calculate slice swipe
      if (!dragState.current.isDragging) return;
      
      const deltaX = e.clientX - dragState.current.previousPosition.x;
      const deltaY = e.clientY - dragState.current.previousPosition.y;
      
      dragState.current.previousPosition = { x: e.clientX, y: e.clientY };
      
      // Update instantaneous velocity for momentum tracking
      dragState.current.velocity.x = deltaX;
      dragState.current.velocity.y = deltaY;
    };

    const onPointerUp = (e) => {
      dragState.current.isDragging = false;
      
      if (sliceDragState.current.active) {
        const state = sliceDragState.current;
        const deltaX = e.clientX - state.startX;
        const deltaY = e.clientY - state.startY;
        
        if (Math.hypot(deltaX, deltaY) > 30) {
          const move = calculateSliceMove(state.faceName, state.cubiePos, deltaX, deltaY, groupRef.current, camera, window.innerWidth, window.innerHeight);
          if (move && onApplyMove) {
            onApplyMove(move);
          }
        }
        sliceDragState.current.active = false;
      }
    };

    const dom = gl.domElement;
    // Passive false needed to allow preventing default if necessary, but pointer events are usually fine
    dom.style.touchAction = 'none'; // Prevent browser scrolling while dragging cube
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl]);
  
  // Initial camera setup
  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Animation state
  const targetRotationRef = useRef(0);
  const progressRef = useRef(0);
  const axisRef = useRef(new THREE.Vector3());
  const animatingRef = useRef(false);
  const animatingMoveIndexRef = useRef(-1);



  // Build the 27 cubies from cubeState
  useEffect(() => {
    groupRef.current.add(pivotRef.current);

    // Cleanup old cubies
    cubiesRef.current.forEach(c => groupRef.current.remove(c));
    cubiesRef.current = [];

    // Remove old highlight group
    if (highlightGroupRef.current) {
      groupRef.current.remove(highlightGroupRef.current);
    }
    highlightGroupRef.current = new THREE.Group();
    highlightGroupRef.current.visible = false;
    groupRef.current.add(highlightGroupRef.current);

    const cubeSize = 0.96;
    const geo = new RoundedBoxGeometry(cubeSize, cubeSize, cubeSize, 4, 0.06);
    const baseMat = new THREE.MeshBasicMaterial({ color: '#1a1a1a' });

    const stickerSize = 0.84;
    const stickerGeo = new RoundedBoxGeometry(stickerSize, stickerSize, 0.02, 2, 0.04);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const mesh = new THREE.Mesh(geo, baseMat);
          mesh.position.set(x, y, z);
          
          const addSticker = (dir, faceName, axisIdx) => {
            const gridIdx = getFaceIndex(faceName, x, y, z);
            if (gridIdx < 0 || gridIdx > 8) return;
            
            const colorName = cubeState[faceName][gridIdx];
            if (colorName && colorName !== 'default') {
              const stickerMat = new THREE.MeshBasicMaterial({ color: COLORS[colorName] });
              const sticker = new THREE.Mesh(stickerGeo, stickerMat);
              
              const offset = cubeSize / 2 + 0.005; 
              sticker.position.copy(dir).multiplyScalar(offset);
              
              const target = sticker.position.clone().add(dir);
              sticker.lookAt(target);
              
              sticker.userData = { colorName, axisIdx, faceName, x, y, z };
              
              // Handle sticker click to initiate slice drag
              sticker.onPointerDown = (e) => {
                e.stopPropagation(); // Prevent global cube rotation
                
                sliceDragState.current.active = true;
                sliceDragState.current.faceName = faceName;
                sliceDragState.current.cubiePos = { x, y, z };
                sliceDragState.current.startX = e.clientX;
                sliceDragState.current.startY = e.clientY;
                
                // Stop any momentum
                dragState.current.velocity = { x: 0, y: 0 };
              };
              
              mesh.add(sticker);
            }
          };

          if (x === 1) addSticker(new THREE.Vector3(1, 0, 0), 'R', 0);
          if (x === -1) addSticker(new THREE.Vector3(-1, 0, 0), 'L', 1);
          if (y === 1) addSticker(new THREE.Vector3(0, 1, 0), 'U', 2);
          if (y === -1) addSticker(new THREE.Vector3(0, -1, 0), 'D', 3);
          if (z === 1) addSticker(new THREE.Vector3(0, 0, 1), 'F', 4);
          if (z === -1) addSticker(new THREE.Vector3(0, 0, -1), 'B', 5);
          
          groupRef.current.add(mesh);
          cubiesRef.current.push(mesh);
        }
      }
    }
    
    animatingRef.current = false;
    animatingMoveIndexRef.current = -1;
    progressRef.current = 0;
    
    return () => {
      cubiesRef.current.forEach(c => groupRef.current.remove(c));
      cubiesRef.current = [];
      if (highlightGroupRef.current) groupRef.current.remove(highlightGroupRef.current);
      groupRef.current.remove(pivotRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebuildKey]);

  // Apply a move instantly (no animation) for catch-up
  const applyMoveInstantly = (mIndex) => {
    const move = moveSequence[mIndex];
    if (!move) return;

    let face = move[0];
    const isPrime = move.includes("'");
    const isDouble = move.includes("2");

    let angle = (Math.PI / 2) * (isPrime ? 1 : -1);
    if (isDouble) angle *= 2;

    let axis = new THREE.Vector3();
    let condition = () => false;

    if (face === 'R') { axis.set(1, 0, 0); condition = p => Math.round(p.x) === 1; }
    else if (face === 'L') { axis.set(1, 0, 0); condition = p => Math.round(p.x) === -1; angle *= -1; }
    else if (face === 'U') { axis.set(0, 1, 0); condition = p => Math.round(p.y) === 1; angle *= -1; }
    else if (face === 'D') { axis.set(0, 1, 0); condition = p => Math.round(p.y) === -1; }
    else if (face === 'F') { axis.set(0, 0, 1); condition = p => Math.round(p.z) === 1; angle *= -1; }
    else if (face === 'B') { axis.set(0, 0, 1); condition = p => Math.round(p.z) === -1; }
    else if (face === 'M') { axis.set(1, 0, 0); condition = p => Math.round(p.x) === 0; angle *= -1; }
    else if (face === 'E') { axis.set(0, 1, 0); condition = p => Math.round(p.y) === 0; }
    else if (face === 'S') { axis.set(0, 0, 1); condition = p => Math.round(p.z) === 0; angle *= -1; }
    else if (face === 'r') { axis.set(1, 0, 0); condition = p => Math.round(p.x) >= 0; }
    else if (face === 'l') { axis.set(1, 0, 0); condition = p => Math.round(p.x) <= 0; angle *= -1; }
    else if (face === 'u') { axis.set(0, 1, 0); condition = p => Math.round(p.y) >= 0; angle *= -1; }
    else if (face === 'd') { axis.set(0, 1, 0); condition = p => Math.round(p.y) <= 0; }
    else if (face === 'f') { axis.set(0, 0, 1); condition = p => Math.round(p.z) >= 0; angle *= -1; }
    else if (face === 'b') { axis.set(0, 0, 1); condition = p => Math.round(p.z) <= 0; }
    else if (face === 'x') { axis.set(1, 0, 0); condition = () => true; }
    else if (face === 'y') { axis.set(0, 1, 0); condition = () => true; angle *= -1; }
    else if (face === 'z') { axis.set(0, 0, 1); condition = () => true; angle *= -1; }

    const piecesToRotate = [];
    cubiesRef.current.forEach(child => {
      if (condition(child.position)) piecesToRotate.push(child);
    });

    piecesToRotate.forEach(child => pivotRef.current.add(child));

    pivotRef.current.rotation.set(
      axis.x ? angle : 0,
      axis.y ? angle : 0,
      axis.z ? angle : 0
    );
    pivotRef.current.updateMatrixWorld();

    const childrenList = [...pivotRef.current.children];
    childrenList.forEach(child => {
      groupRef.current.attach(child);
      child.position.x = Math.round(child.position.x);
      child.position.y = Math.round(child.position.y);
      child.position.z = Math.round(child.position.z);
      child.scale.set(1, 1, 1);

      const mat = new THREE.Matrix4().makeRotationFromQuaternion(child.quaternion);
      const e = mat.elements;
      e[0] = Math.round(e[0]); e[1] = Math.round(e[1]); e[2] = Math.round(e[2]);
      e[4] = Math.round(e[4]); e[5] = Math.round(e[5]); e[6] = Math.round(e[6]);
      e[8] = Math.round(e[8]); e[9] = Math.round(e[9]); e[10] = Math.round(e[10]);
      child.quaternion.setFromRotationMatrix(mat);
    });
    pivotRef.current.rotation.set(0, 0, 0);
  };

  // Start a move animation when currentMoveIndex changes
  useEffect(() => {
    if (moveSequence.length === 0 || currentMoveIndex >= moveSequence.length) return;
    
    // If skipAnimation is true, we already rebuilt the cube from history — do NOT animate
    if (skipAnimation) {
      animatingMoveIndexRef.current = currentMoveIndex;
      return;
    }

    // If currently animating, snap to finish instantly
    if (animatingRef.current) {
      pivotRef.current.rotation.set(
        axisRef.current.x ? targetRotationRef.current : 0,
        axisRef.current.y ? targetRotationRef.current : 0,
        axisRef.current.z ? targetRotationRef.current : 0
      );
      pivotRef.current.updateMatrixWorld();
      
      const children = [...pivotRef.current.children];
      children.forEach(child => {
        groupRef.current.attach(child);
        child.position.x = Math.round(child.position.x);
        child.position.y = Math.round(child.position.y);
        child.position.z = Math.round(child.position.z);
        child.scale.set(1, 1, 1); 
        
        const mat = new THREE.Matrix4().makeRotationFromQuaternion(child.quaternion);
        const e = mat.elements;
        e[0] = Math.round(e[0]); e[1] = Math.round(e[1]); e[2] = Math.round(e[2]);
        e[4] = Math.round(e[4]); e[5] = Math.round(e[5]); e[6] = Math.round(e[6]);
        e[8] = Math.round(e[8]); e[9] = Math.round(e[9]); e[10] = Math.round(e[10]);
        child.quaternion.setFromRotationMatrix(mat);
      });
      pivotRef.current.rotation.set(0, 0, 0);
      animatingRef.current = false;
      
      const updated2DState = get2DCubeStateFrom3D(cubiesRef.current);
      onMoveComplete(updated2DState, animatingMoveIndexRef.current);
    }

    // Catch up any skipped moves
    let nextIdx = (animatingMoveIndexRef.current >= 0 && animatingMoveIndexRef.current < currentMoveIndex) 
      ? animatingMoveIndexRef.current + 1 
      : currentMoveIndex;
    
    while (nextIdx < currentMoveIndex) {
      applyMoveInstantly(nextIdx);
      const updated2DState = get2DCubeStateFrom3D(cubiesRef.current);
      onMoveComplete(updated2DState, nextIdx);
      nextIdx++;
    }

    // Now set up the animated move for currentMoveIndex
    const move = moveSequence[currentMoveIndex];
    if (!move) return;

    const isPrime = move.includes("'");
    const isDouble = move.includes("2");
    const face = move[0];

    let axis = new THREE.Vector3();
    let angle = (isPrime ? Math.PI / 2 : -Math.PI / 2) * (isDouble ? 2 : 1); 
    let condition = () => false;

    if (face === 'R') { axis.set(1, 0, 0); condition = p => Math.round(p.x) === 1; }
    if (face === 'L') { axis.set(1, 0, 0); condition = p => Math.round(p.x) === -1; angle *= -1; }
    if (face === 'U') { axis.set(0, 1, 0); condition = p => Math.round(p.y) === 1; }
    if (face === 'D') { axis.set(0, 1, 0); condition = p => Math.round(p.y) === -1; angle *= -1; }
    if (face === 'F') { axis.set(0, 0, 1); condition = p => Math.round(p.z) === 1; }
    if (face === 'B') { axis.set(0, 0, 1); condition = p => Math.round(p.z) === -1; angle *= -1; }
    if (face === 'r') { axis.set(1, 0, 0); condition = p => Math.round(p.x) >= 0; }
    if (face === 'l') { axis.set(1, 0, 0); condition = p => Math.round(p.x) <= 0; angle *= -1; }
    if (face === 'u') { axis.set(0, 1, 0); condition = p => Math.round(p.y) >= 0; }
    if (face === 'd') { axis.set(0, 1, 0); condition = p => Math.round(p.y) <= 0; angle *= -1; }
    if (face === 'f') { axis.set(0, 0, 1); condition = p => Math.round(p.z) >= 0; }
    if (face === 'b') { axis.set(0, 0, 1); condition = p => Math.round(p.z) <= 0; angle *= -1; }
    if (face === 'M') { axis.set(1, 0, 0); condition = p => Math.round(p.x) === 0; angle *= -1; } 
    if (face === 'E') { axis.set(0, 1, 0); condition = p => Math.round(p.y) === 0; angle *= -1; } 
    if (face === 'S') { axis.set(0, 0, 1); condition = p => Math.round(p.z) === 0; } 

    axisRef.current = axis;
    targetRotationRef.current = angle;

    pivotRef.current.rotation.set(0, 0, 0);
    pivotRef.current.updateMatrixWorld();

    // Attach matching cubies to pivot
    cubiesRef.current.forEach(cubie => {
      const pos = new THREE.Vector3();
      cubie.getWorldPosition(pos);
      if (condition(pos)) {
        pivotRef.current.attach(cubie);
      }
    });

    // Highlight the rotating face
    if (highlightGroupRef.current) {
      while (highlightGroupRef.current.children.length > 0) {
        highlightGroupRef.current.remove(highlightGroupRef.current.children[0]);
      }
      
      const highlightGeo = new THREE.BoxGeometry(3.1, 3.1, 0.15);
      const edges = new THREE.EdgesGeometry(highlightGeo);
      const highlightMat = new THREE.LineBasicMaterial({ 
        color: 0x45f3ff, 
        transparent: true, 
        opacity: 1,
        linewidth: 2 
      });
      const outline = new THREE.LineSegments(edges, highlightMat);
      
      if (face === 'R' || face === 'r') { outline.position.set(1.1, 0, 0); outline.rotation.y = Math.PI / 2; }
      else if (face === 'L' || face === 'l') { outline.position.set(-1.1, 0, 0); outline.rotation.y = Math.PI / 2; }
      else if (face === 'U' || face === 'u') { outline.position.set(0, 1.1, 0); outline.rotation.x = Math.PI / 2; }
      else if (face === 'D' || face === 'd') { outline.position.set(0, -1.1, 0); outline.rotation.x = Math.PI / 2; }
      else if (face === 'F' || face === 'f') { outline.position.set(0, 0, 1.1); }
      else if (face === 'B' || face === 'b') { outline.position.set(0, 0, -1.1); }
      else { outline.position.set(0, 0, 0); }

      highlightGroupRef.current.add(outline);
      highlightGroupRef.current.visible = true;
    }
    
    // Start the animation
    animatingMoveIndexRef.current = currentMoveIndex;
    animatingRef.current = true;
    progressRef.current = 0; // RESET progress for new animation
  }, [currentMoveIndex, moveSequence, isSolving]);

  // Smooth easing
  const easeInOutCubic = (x) => {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };

  // Animation frame loop
  useFrame((state, delta) => {
    // 1. Handle Drag and Kinetic Momentum Physics
    const dState = dragState.current;
    if (dState.isDragging || Math.abs(dState.velocity.x) > 0.01 || Math.abs(dState.velocity.y) > 0.01) {
      if (groupRef.current) {
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());

        const rotationSpeed = 0.008;
        groupRef.current.rotateOnWorldAxis(up, dState.velocity.x * rotationSpeed);
        groupRef.current.rotateOnWorldAxis(right, dState.velocity.y * rotationSpeed);
      }
      
      // If user let go, smoothly dampen the velocity to simulate physical momentum friction
      if (!dState.isDragging) {
        dState.velocity.x *= 0.92;
        dState.velocity.y *= 0.92;
      }
    }

    // 2. Handle Solver Slice Animations
    if (!animatingRef.current) return;

    // Advance progress (0.8s base duration, adjusted by playback speed)
    progressRef.current += delta / (0.8 / playbackSpeed);
    let progress = Math.min(progressRef.current, 1);
    
    let easedProgress = easeInOutCubic(progress);
    let currentAngle = targetRotationRef.current * easedProgress;

    if (axisRef.current.x) pivotRef.current.rotation.x = currentAngle;
    if (axisRef.current.y) pivotRef.current.rotation.y = currentAngle;
    if (axisRef.current.z) pivotRef.current.rotation.z = currentAngle;
    
    // Subtle scale pulse during animation (no wobble)
    pivotRef.current.children.forEach(child => {
      if (child.isMesh) {
        const scale = 1 + Math.sin(progress * Math.PI) * 0.03;
        child.scale.set(scale, scale, scale);
      }
    });
    
    // Pulse highlight opacity
    if (highlightGroupRef.current && highlightGroupRef.current.children.length > 0) {
      const outline = highlightGroupRef.current.children[0];
      if (outline && outline.material) {
        outline.material.opacity = 1 - progress * 0.5;
      }
    }

    if (progress >= 1) {
      // Animation complete
      animatingRef.current = false;
      pivotRef.current.updateMatrixWorld();
      
      const children = [...pivotRef.current.children];
      children.forEach(child => {
        groupRef.current.attach(child);
        child.position.x = Math.round(child.position.x);
        child.position.y = Math.round(child.position.y);
        child.position.z = Math.round(child.position.z);
        child.scale.set(1, 1, 1);
        
        const mat = new THREE.Matrix4().makeRotationFromQuaternion(child.quaternion);
        const e = mat.elements;
        e[0] = Math.round(e[0]); e[1] = Math.round(e[1]); e[2] = Math.round(e[2]);
        e[4] = Math.round(e[4]); e[5] = Math.round(e[5]); e[6] = Math.round(e[6]);
        e[8] = Math.round(e[8]); e[9] = Math.round(e[9]); e[10] = Math.round(e[10]);
        child.quaternion.setFromRotationMatrix(mat);
      });
      
      pivotRef.current.rotation.set(0, 0, 0);

      // Hide highlight
      if (highlightGroupRef.current) {
        highlightGroupRef.current.visible = false;
      }

      const updated2DState = get2DCubeStateFrom3D(cubiesRef.current);
      onMoveComplete(updated2DState, animatingMoveIndexRef.current);
    }
  });

  // --- Auto-rotate cube to present focused face ---
  const targetCubeQuatRef = useRef(null);
  
  useEffect(() => {
    if (!focusedFace) {
      targetCubeQuatRef.current = null;
      return;
    }
    
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    switch(focusedFace) {
      case 'F': euler.set(0, 0, 0); break;
      case 'R': euler.set(0, -Math.PI / 2, 0); break;
      case 'B': euler.set(0, Math.PI, 0); break;
      case 'L': euler.set(0, Math.PI / 2, 0); break;
      case 'U': euler.set(Math.PI / 2, 0, 0); break;
      case 'D': euler.set(-Math.PI / 2, 0, 0); break;
      default: targetCubeQuatRef.current = null; return;
    }
    targetCubeQuatRef.current = new THREE.Quaternion().setFromEuler(euler);
  }, [focusedFace]);

  useFrame((state, delta) => {
    // Smoothly rotate the cube if a face is focused and we aren't solving
    if (targetCubeQuatRef.current && !isSolving && groupRef.current) {
      groupRef.current.quaternion.slerp(targetCubeQuatRef.current, 0.1);
      
      // Stop forcing the rotation once it arrives, giving control back to the user
      if (groupRef.current.quaternion.angleTo(targetCubeQuatRef.current) < 0.05) {
        targetCubeQuatRef.current = null;
      }
    }
  });

  // Listen for user interactions to immediately cancel any auto-rotation
  useEffect(() => {
    const cancelAutoMove = () => { targetCubeQuatRef.current = null; };
    window.addEventListener('pointerdown', cancelAutoMove);
    window.addEventListener('touchstart', cancelAutoMove);
    return () => {
      window.removeEventListener('pointerdown', cancelAutoMove);
      window.removeEventListener('touchstart', cancelAutoMove);
    };
  }, []);

  return <group ref={groupRef} />;
};

export default Cube3D;
