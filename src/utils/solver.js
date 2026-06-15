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

    console.log('[Solver] State string:', stateString);

    const solverFn = await getSolverFunction();
    const rawSolution = solverFn(stateString);
    
    console.log('[Solver] Raw solution:', rawSolution);
    
    if (!rawSolution || rawSolution.trim() === '') {
      return { moves: [], message: 'Cube is already solved!' };
    }

    const moves = rawSolution.split(' ').filter(m => m.trim().length > 0).map(m => {
      let normalized = m.replace(/prime/gi, "'");
      return normalized;
    });

    console.log('[Solver] Parsed moves:', moves);
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

export const getMoveDescription = (move) => {
  if (!move) return { face: '?', direction: '', explain: '' };
  
  const face = move[0];
  const isPrime = move.includes("'");
  const isDouble = move.includes("2");
  
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
  
  const explain = `${emoji} Rotate the ${faceName} face ${direction}`;
  
  return { face: faceName, direction, explain };
};

// Analyze where we are in the Fridrich method based on move index vs total
export const getPhaseDescription = (moveIndex, totalMoves) => {
  const progress = moveIndex / totalMoves;
  if (progress < 0.15) return { phase: 'Cross', desc: 'Building the white cross on top', color: '#45f3ff' };
  if (progress < 0.45) return { phase: 'F2L', desc: 'First Two Layers — corners & edges', color: '#ff8800' };
  if (progress < 0.70) return { phase: 'OLL', desc: 'Orient Last Layer — making top yellow', color: '#ffd500' };
  return { phase: 'PLL', desc: 'Permute Last Layer — final arrangement!', color: '#00ff88' };
};
