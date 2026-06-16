/**
 * Rubik's Cube Solver Utility
 * Uses rubiks-cube-solver library with bulletproof Vite compatibility.
 * Built-in smart move explanations — NO API key required.
 */

// ─── Bulletproof solver import ───────────────────────────────────────────────
let _solverFn = null;

async function getSolverFunction() {
  if (_solverFn) return _solverFn;

  try {
    const mod = await import('rubiks-cube-solver');
    
    if (typeof mod.default === 'function') {
      _solverFn = mod.default;
      return _solverFn;
    }
    if (mod.default && typeof mod.default.default === 'function') {
      _solverFn = mod.default.default;
      return _solverFn;
    }
    if (typeof mod === 'function') {
      _solverFn = mod;
      return _solverFn;
    }

    const SolverClass = mod.Solver || mod.default?.Solver;
    const RubiksCubeClass = mod.RubiksCube || mod.default?.RubiksCube;
    if (SolverClass && RubiksCubeClass) {
      _solverFn = (stateString) => {
        const cube = new RubiksCubeClass(stateString);
        const solver = new SolverClass(cube);
        solver.solve();
        return solver.getMoves().join(' ');
      };
      return _solverFn;
    }

    for (const key of Object.keys(mod)) {
      if (typeof mod[key] === 'function' && key !== 'default') {
        try {
          const testResult = mod[key]('fffffffffrrrrrrrrruuuuuuuuudddddddddlllllllllbbbbbbbbb');
          if (typeof testResult === 'string' || testResult === '') {
            _solverFn = mod[key];
            return _solverFn;
          }
        } catch (e) { /* not the right fn */ }
      }
    }

    throw new Error('Could not find solver function. Keys: ' + Object.keys(mod).join(', '));
  } catch (err) {
    console.error('Failed to load rubiks-cube-solver:', err);
    throw err;
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────
export const validateCubeState = (cubeState) => {
  const colorCounts = {};
  for (const face of ['U', 'D', 'L', 'R', 'F', 'B']) {
    for (let i = 0; i < 9; i++) {
      const c = cubeState[face][i];
      if (c === 'default') return { error: `Missing color at face ${face}, position ${i + 1}.` };
      colorCounts[c] = (colorCounts[c] || 0) + 1;
    }
  }

  const expectedColors = ['white', 'yellow', 'red', 'orange', 'green', 'blue'];
  for (const c of expectedColors) {
    if (colorCounts[c] !== 9) {
      return { error: `Invalid Cube: You have ${colorCounts[c] || 0} ${c} stickers instead of exactly 9.` };
    }
  }

  const colorToFace = {
    [cubeState.F[4]]: 'f',
    [cubeState.R[4]]: 'r',
    [cubeState.U[4]]: 'u',
    [cubeState.D[4]]: 'd',
    [cubeState.L[4]]: 'l',
    [cubeState.B[4]]: 'b',
  };

  const uniqueColors = Object.keys(colorToFace);
  if (uniqueColors.length !== 6 || uniqueColors.includes('default')) {
    return { error: 'All 6 center pieces must have a unique color.' };
  }

  // Check for impossible pieces (opposite colors on same piece, or duplicate colors)
  const opposites = [
    [cubeState.U[4], cubeState.D[4]],
    [cubeState.L[4], cubeState.R[4]],
    [cubeState.F[4], cubeState.B[4]]
  ];

  const isInvalidPair = (c1, c2) => {
    if (c1 === c2) return true; // Duplicate colors on same piece
    for (const [op1, op2] of opposites) {
      if ((c1 === op1 && c2 === op2) || (c1 === op2 && c2 === op1)) return true;
    }
    return false;
  };

  // 12 Edges
  const edges = [
    { name: 'Top-Front', colors: [cubeState.U[7], cubeState.F[1]] },
    { name: 'Top-Right', colors: [cubeState.U[5], cubeState.R[1]] },
    { name: 'Top-Back', colors: [cubeState.U[1], cubeState.B[1]] },
    { name: 'Top-Left', colors: [cubeState.U[3], cubeState.L[1]] },
    { name: 'Bottom-Front', colors: [cubeState.D[1], cubeState.F[7]] },
    { name: 'Bottom-Right', colors: [cubeState.D[5], cubeState.R[7]] },
    { name: 'Bottom-Back', colors: [cubeState.D[7], cubeState.B[7]] },
    { name: 'Bottom-Left', colors: [cubeState.D[3], cubeState.L[7]] },
    { name: 'Front-Right', colors: [cubeState.F[5], cubeState.R[3]] },
    { name: 'Front-Left', colors: [cubeState.F[3], cubeState.L[5]] },
    { name: 'Back-Left', colors: [cubeState.B[5], cubeState.L[3]] },
    { name: 'Back-Right', colors: [cubeState.B[3], cubeState.R[5]] }
  ];

  for (const edge of edges) {
    if (isInvalidPair(edge.colors[0], edge.colors[1])) {
      return { error: `Invalid Cube: The ${edge.name} edge has impossible colors (${edge.colors[0]} and ${edge.colors[1]}). Check your scan or manual color entry.` };
    }
  }

  // 8 Corners
  const corners = [
    { name: 'Top-Front-Right', colors: [cubeState.U[8], cubeState.F[2], cubeState.R[0]] },
    { name: 'Top-Front-Left', colors: [cubeState.U[6], cubeState.F[0], cubeState.L[2]] },
    { name: 'Top-Back-Left', colors: [cubeState.U[0], cubeState.B[2], cubeState.L[0]] },
    { name: 'Top-Back-Right', colors: [cubeState.U[2], cubeState.B[0], cubeState.R[2]] },
    { name: 'Bottom-Front-Right', colors: [cubeState.D[2], cubeState.F[8], cubeState.R[6]] },
    { name: 'Bottom-Front-Left', colors: [cubeState.D[0], cubeState.F[6], cubeState.L[8]] },
    { name: 'Bottom-Back-Left', colors: [cubeState.D[6], cubeState.B[8], cubeState.L[6]] },
    { name: 'Bottom-Back-Right', colors: [cubeState.D[8], cubeState.B[6], cubeState.R[8]] }
  ];

  for (const corner of corners) {
    const c = corner.colors;
    if (isInvalidPair(c[0], c[1]) || isInvalidPair(c[1], c[2]) || isInvalidPair(c[0], c[2])) {
      return { error: `Invalid Cube: The ${corner.name} corner has impossible colors (${c[0]}, ${c[1]}, ${c[2]}). Check your scan or manual color entry.` };
    }
  }

  return { valid: true, colorToFace };
};

// ─── Solve ───────────────────────────────────────────────────────────────────
export const solveCubeLocal = async (cubeState) => {
  try {
    const validation = validateCubeState(cubeState);
    if (validation.error) throw new Error(validation.error);

    const { colorToFace } = validation;
    const order = ['F', 'R', 'U', 'D', 'L', 'B'];
    let stateString = '';

    for (const face of order) {
      for (let i = 0; i < 9; i++) {
        const colorName = cubeState[face][i];
        stateString += colorToFace[colorName];
      }
    }



    const solverFn = await getSolverFunction();
    const rawSolution = solverFn(stateString);
    
    // The library returns false or empty string for invalid/solved cubes.
    // Let's verify if it's ACTUALLY solved.
    const isSolved = stateString === 'fffffffffrrrrrrrrruuuuuuuuudddddddddlllllllllbbbbbbbbb' ||
                     stateString === 'uuuuuuuuuurrrrrrrrrfffffffffdddddddddlllllllllbbbbbbbbb'; // some solvers use URFDLB

    if (!rawSolution || (typeof rawSolution === 'string' && rawSolution.trim() === '')) {
      if (isSolved) {
        return { moves: [], message: 'Cube is already solved!' };
      } else {
        throw new Error("Invalid or Impossible Cube State! Please ensure you scanned the colors EXACTLY according to the 'How to hold' instructions. An impossible edge or corner piece was detected.");
      }
    }

    if (typeof rawSolution !== 'string') {
        throw new Error("Invalid or Impossible Cube State! Please ensure you scanned the colors EXACTLY according to the 'How to hold' instructions.");
    }

    const moves = rawSolution.split(' ').filter(m => m.trim().length > 0).map(m => {
      let normalized = m.replace(/prime/gi, "'");
      return normalized;
    });

    return { moves };
  } catch (err) {
    console.error('[Solver] Error:', err);
    return { error: err.message };
  }
};

// ─── Built-In Move Descriptions (NO API KEY NEEDED) ─────────────────────────

const FACE_NAMES = {
  'R': 'Right', 'L': 'Left', 'U': 'Up (Top)',
  'D': 'Down (Bottom)', 'F': 'Front', 'B': 'Back',
  'r': 'Right (wide)', 'l': 'Left (wide)', 'u': 'Up (wide)',
  'd': 'Down (wide)', 'f': 'Front (wide)', 'b': 'Back (wide)',
  'M': 'Middle (↕)', 'E': 'Equator (↔)', 'S': 'Standing (↗)',
};

const MOVE_EXPLANATIONS = {
  'R': { explain: 'Rotate right face clockwise - Hold cube with right face toward you, turn it away', tip: 'Use your right hand to turn the right face away from you' },
  "R'": { explain: 'Rotate right face counter-clockwise - Hold cube with right face toward you, turn it toward you', tip: 'Use your right hand to turn the right face toward you' },
  'R2': { explain: 'Rotate right face 180° - Double turn of right face', tip: 'Quick double turn with your right hand' },
  'L': { explain: 'Rotate left face clockwise - Hold cube with left face toward you, turn it toward you', tip: 'Use your left hand to turn the left face toward you' },
  "L'": { explain: 'Rotate left face counter-clockwise - Hold cube with left face toward you, turn it away', tip: 'Use your left hand to turn the left face away from you' },
  'L2': { explain: 'Rotate left face 180° - Double turn of left face', tip: 'Quick double turn with your left hand' },
  'U': { explain: 'Rotate top face clockwise - Turn the top layer to the left', tip: 'Use your right hand to turn the top face clockwise (away from you)' },
  "U'": { explain: 'Rotate top face counter-clockwise - Turn the top layer to the right', tip: 'Use your right hand to turn the top face counter-clockwise (toward you)' },
  'U2': { explain: 'Rotate top face 180° - Double turn of top face', tip: 'Quick double turn of the top face' },
  'D': { explain: 'Rotate bottom face clockwise - Turn the bottom layer to the right', tip: 'Use your right hand to turn the bottom face clockwise' },
  "D'": { explain: 'Rotate bottom face counter-clockwise - Turn the bottom layer to the left', tip: 'Use your right hand to turn the bottom face counter-clockwise' },
  'D2': { explain: 'Rotate bottom face 180° - Double turn of bottom face', tip: 'Quick double turn of the bottom face' },
  'F': { explain: 'Rotate front face clockwise - Turn the front face to the right', tip: 'Use your right hand to turn the front face clockwise' },
  "F'": { explain: 'Rotate front face counter-clockwise - Turn the front face to the left', tip: 'Use your right hand to turn the front face counter-clockwise' },
  'F2': { explain: 'Rotate front face 180° - Double turn of front face', tip: 'Quick double turn of the front face' },
  'B': { explain: 'Rotate back face clockwise - Turn the back face to the left (from front view)', tip: 'Use your left hand to turn the back face' },
  "B'": { explain: 'Rotate back face counter-clockwise - Turn the back face to the right (from front view)', tip: 'Use your left hand to turn the back face opposite direction' },
  'B2': { explain: 'Rotate back face 180° - Double turn of back face', tip: 'Quick double turn of the back face' },
};

export const getMoveDescription = (move, phaseName = '') => {
  if (!move) return { face: '?', direction: '', explain: '', tip: '' };
  
  const face = move[0];
  const isPrime = move.includes("'");
  const isDouble = move.includes("2");
  
  let baseExplain = '';
  let baseTip = '';
  const moveKey = move;
  
  if (MOVE_EXPLANATIONS[moveKey]) {
    baseExplain = MOVE_EXPLANATIONS[moveKey].explain;
    baseTip = MOVE_EXPLANATIONS[moveKey].tip;
  } else {
    // Fallback to generic explanation
    const faceName = FACE_NAMES[face] || face;
    let direction = isPrime ? 'Counter-Clockwise' : 'Clockwise';
    if (isDouble) direction = '180° (Half Turn)';

    let emoji = '👉';
    if (face === 'U' || face === 'u') emoji = '☝️';
    if (face === 'D' || face === 'd') emoji = '👇';
    if (face === 'L' || face === 'l') emoji = '👈';
    if (face === 'R' || face === 'r') emoji = '👉';
    if (face === 'F' || face === 'f') emoji = '🖐️';
    if (face === 'B' || face === 'b') emoji = '✋';
    if (face === 'M') emoji = '🔄';
    if (face === 'E') emoji = '🔄';
    if (face === 'S') emoji = '🔄';
    
    baseExplain = `${emoji} Rotate the ${faceName} face ${direction}`;
    baseTip = 'Use appropriate hand to rotate this face';
  }

  // Dynamic Phase Explanation Injection
  let dynamicExplain = baseExplain;
  if (phaseName === 'Cross') {
    dynamicExplain = `${baseExplain.split(' - ')[0]} - Moving edge piece to form the white cross`;
  } else if (phaseName === 'F2L') {
    dynamicExplain = `${baseExplain.split(' - ')[0]} - Inserting/Pairing F2L corner-edge pair`;
  } else if (phaseName === 'OLL') {
    dynamicExplain = `${baseExplain.split(' - ')[0]} - Executing OLL algorithm to orient yellow face`;
  } else if (phaseName === 'PLL') {
    dynamicExplain = `${baseExplain.split(' - ')[0]} - Executing PLL algorithm to position final pieces`;
  }

  return { 
    face: FACE_NAMES[face] || face, 
    direction: isPrime ? 'Counter-Clockwise' : isDouble ? '180°' : 'Clockwise', 
    explain: dynamicExplain, 
    tip: baseTip 
  };
};

// Analyze where we are in the Fridrich method based on move index vs total
export const getPhaseDescription = (moveIndex, totalMoves) => {
  const progress = moveIndex / totalMoves;
  if (progress < 0.15) return { 
    phase: 'Cross', 
    desc: 'Building the white cross on top - positioning edge pieces', 
    color: '#45f3ff',
    tip: 'Focus on getting the white edges to match the center colors'
  };
  if (progress < 0.45) return { 
    phase: 'F2L', 
    desc: 'First Two Layers — inserting corner-edge pairs together', 
    color: '#ff8800',
    tip: 'Pair corners with edges and insert them into their slots'
  };
  if (progress < 0.70) return { 
    phase: 'OLL', 
    desc: 'Orient Last Layer — making the entire top face yellow', 
    color: '#ffd500',
    tip: 'Use algorithms to orient all yellow stickers to face up'
  };
  return { 
    phase: 'PLL', 
    desc: 'Permute Last Layer — final arrangement of pieces!', 
    color: '#00ff88',
    tip: 'Move pieces to their final solved positions'
  };
};
