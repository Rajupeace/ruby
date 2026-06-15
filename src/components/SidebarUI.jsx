import React from 'react';
import { Palette, Play, RotateCcw, Camera, Lock } from 'lucide-react';
import { COLORS } from '../utils/cubeMapping';

const faces = ['U', 'L', 'F', 'R', 'B', 'D'];
const faceLabels = {
  U: 'UP', L: 'LEFT', F: 'FRONT', R: 'RIGHT', B: 'BACK', D: 'DOWN'
};

const SidebarUI = ({
  cubeState,
  selectedColor,
  setSelectedColor,
  onStickerClick,
  onScanClick,
  onSolve,
  onReset,
  onLoadDemo,
  solveError,
  isSolving
}) => {
  return (
    <div className="sidebar">
      <div>
        <h1 className="title">Rubik AI</h1>
      </div>

      <div>
        <h2 className="section-title">
          <Palette size={16} /> Select Color
        </h2>
        <div className="palette">
          {Object.entries(COLORS).map(([name, hex]) => {
            if (name === 'default') return null;
            return (
              <div
                key={name}
                className={`p-color ${selectedColor === name ? 'active' : ''}`}
                style={{ background: hex }}
                onClick={() => setSelectedColor(name)}
                title={name}
              />
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="section-title">Map Faces</h2>
        <div className="map-layout">
          {faces.map((face) => (
            <div key={face} id={`f-${face}`} className="face-grid">
              <div className="face-label">{faceLabels[face]}</div>
              {cubeState[face].map((colorName, idx) => (
                <div
                  key={`${face}-${idx}`}
                  className="sticker"
                  style={{ 
                    background: COLORS[colorName] || COLORS.default,
                    cursor: idx === 4 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => {
                    if (idx !== 4) onStickerClick(face, idx);
                  }}
                >
                   {idx === 4 && <Lock size={10} color="rgba(0,0,0,0.5)" />}
                </div>
              ))}
              <button className="scan-btn" onClick={() => onScanClick(face)} style={{ gridColumn: 'span 3' }}>
                <Camera size={12} style={{ display: 'inline', marginRight: '4px' }} /> Scan
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {solveError && <div style={{ color: '#ff3333', fontSize: '0.8rem', textAlign: 'center', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '8px', lineHeight: '1.4' }}>{solveError}</div>}
        <button className="btn btn-primary" onClick={onSolve}>
          <Play size={20} /> Start AI Solver
        </button>
        <button className="btn btn-secondary" onClick={onLoadDemo}>
          Load Demo Scramble
        </button>
        <button className="btn btn-secondary" onClick={onReset} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
          <RotateCcw size={16} /> Reset Cube
        </button>
      </div>
    </div>
  );
};

export default SidebarUI;
