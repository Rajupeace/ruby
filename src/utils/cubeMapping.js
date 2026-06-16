export const COLORS = {
  white: '#ffffff',
  yellow: '#ffdd00',
  red: '#ff0000',
  orange: '#ff8c00',
  green: '#00cc00',
  blue: '#0066ff',
  default: '#2a2a2a'
};


// Standard face-to-color mapping for center pieces
export const FACE_COLORS = {
  U: 'white',
  D: 'yellow',
  L: 'orange',
  R: 'red',
  F: 'green',
  B: 'blue'
};

export const INITIAL_CUBE_STATE = {
  U: Array(9).fill('default').map((_, i) => i === 4 ? FACE_COLORS.U : 'default'),
  D: Array(9).fill('default').map((_, i) => i === 4 ? FACE_COLORS.D : 'default'),
  L: Array(9).fill('default').map((_, i) => i === 4 ? FACE_COLORS.L : 'default'),
  R: Array(9).fill('default').map((_, i) => i === 4 ? FACE_COLORS.R : 'default'),
  F: Array(9).fill('default').map((_, i) => i === 4 ? FACE_COLORS.F : 'default'),
  B: Array(9).fill('default').map((_, i) => i === 4 ? FACE_COLORS.B : 'default')
};

export const DEMO_CUBE_STATE = {
  F: ['green', 'orange', 'white', 'orange', 'green', 'blue', 'yellow', 'yellow', 'red'],
  R: ['red', 'white', 'yellow', 'red', 'red', 'white', 'yellow', 'yellow', 'orange'],
  U: ['yellow', 'blue', 'blue', 'blue', 'white', 'red', 'red', 'green', 'blue'],
  D: ['orange', 'orange', 'green', 'green', 'yellow', 'red', 'white', 'blue', 'green'],
  L: ['red', 'orange', 'white', 'yellow', 'orange', 'white', 'blue', 'red', 'green'],
  B: ['orange', 'white', 'blue', 'green', 'blue', 'green', 'white', 'yellow', 'orange']
};

// Map from 3D coordinates (x, y, z in [-1, 0, 1]) to 2D array index (0-8)
export const getFaceIndex = (face, x, y, z) => {
  if (face === 'U') return (x + 1) + (z + 1) * 3;
  if (face === 'D') return (x + 1) + (1 - z) * 3;
  if (face === 'F') return (x + 1) + (1 - y) * 3;
  if (face === 'B') return (1 - x) + (1 - y) * 3;
  if (face === 'L') return (z + 1) + (1 - y) * 3;
  if (face === 'R') return (1 - z) + (1 - y) * 3;
  return -1;
};
