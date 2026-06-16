import React, { useState, useMemo } from 'react';
import { Palette, Play, RotateCcw, Camera, Lock, ChevronDown, ChevronUp, ScanFace, AlertTriangle } from 'lucide-react';
import { COLORS } from '../utils/cubeMapping';

const faces = ['U', 'L', 'F', 'R', 'B', 'D'];
const faceLabels = {
  U: '↑ UP', L: '← LEFT', F: '⊙ FRONT', R: '→ RIGHT', B: '⊗ BACK', D: '↓ DOWN'
};

const SidebarUI = ({
  cubeState,
  selectedColor,
  setSelectedColor,
  onStickerClick,
  onScanClick,
  onFaceSelect,
  onSolve,
  onReset,
  onLoadDemo,
  onClearFace,
  onRestart,
  solveError,
  isSolving,
  hasScrambledState,
  isSidebarOpen,
  setIsSidebarOpen
}) => {
  const [openFace, setOpenFace] = useState(null);

  // Real-time validation: count colors and show warnings
  const colorWarnings = useMemo(() => {
    const warnings = [];
    const colorCounts = {};
    let hasDefault = false;

    for (const face of ['U', 'D', 'L', 'R', 'F', 'B']) {
      for (let i = 0; i < 9; i++) {
        const c = cubeState[face][i];
        if (c === 'default') {
          hasDefault = true;
        } else {
          colorCounts[c] = (colorCounts[c] || 0) + 1;
        }
      }
    }

    if (hasDefault) {
      warnings.push({ type: 'info', msg: 'Fill all 54 stickers before solving.' });
    }

    const expectedColors = ['white', 'yellow', 'red', 'orange', 'green', 'blue'];
    for (const c of expectedColors) {
      const count = colorCounts[c] || 0;
      if (count > 9) {
        warnings.push({ type: 'error', msg: `Too many ${c.toUpperCase()}: ${count}/9 — remove ${count - 9}` });
      } else if (count > 0 && count < 9 && !hasDefault) {
        warnings.push({ type: 'error', msg: `Not enough ${c.toUpperCase()}: ${count}/9 — need ${9 - count} more` });
      }
    }

    return warnings;
  }, [cubeState]);

  // Count filled stickers per face
  const faceFilledCount = (face) => {
    return cubeState[face].filter(c => c !== 'default').length;
  };

  return (
    <div className={`sidebar-container ${isSidebarOpen ? 'open' : 'closed'}`}>
      <button 
        className="sidebar-toggle-btn" 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
      >
        {isSidebarOpen ? <ChevronDown size={20} style={{ transform: 'rotate(90deg)' }} /> : <ChevronUp size={20} style={{ transform: 'rotate(90deg)' }} />}
      </button>

      <div className="sidebar">
        {/* Fixed Header */}
      <div style={{ padding: '30px 30px 20px', flexShrink: 0, borderBottom: '1px solid var(--panel-border)' }}>
        <h1 className="title">Rubik AI</h1>
      </div>

      {/* Scrollable Content */}
      <div style={{ padding: '20px 30px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
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

        {/* Live Warnings */}
        {colorWarnings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {colorWarnings.map((w, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, lineHeight: '1.3',
                background: w.type === 'error' ? 'rgba(255, 50, 50, 0.12)' : 'rgba(255, 200, 0, 0.1)',
                color: w.type === 'error' ? '#ff5555' : '#ffcc00',
                border: `1px solid ${w.type === 'error' ? 'rgba(255, 50, 50, 0.25)' : 'rgba(255, 200, 0, 0.2)'}`,
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                {w.msg}
              </div>
            ))}
          </div>
        )}

        <div>
          <h2 className="section-title"><ScanFace size={16} /> Map Faces</h2>
          <div className="faces-accordion" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {faces.map((face) => {
              const filled = faceFilledCount(face);
              const isComplete = filled === 9;
              return (
                <div key={face} className="face-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div 
                    className="face-card-header" 
                    onClick={() => {
                      const newFace = openFace === face ? null : face;
                      setOpenFace(newFace);
                      if (onFaceSelect) onFaceSelect(newFace);
                    }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', cursor: 'pointer', background: openFace === face ? 'rgba(255,255,255,0.08)' : 'transparent', transition: 'background 0.2s' }}
                  >
                    <span style={{ fontWeight: 600, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: COLORS[cubeState[face][4]] }} />
                      {faceLabels[face]} FACE
                      <span style={{ fontSize: '0.7rem', color: isComplete ? '#00e676' : 'var(--text-muted)', marginLeft: '4px' }}>
                        {filled}/9
                      </span>
                    </span>
                    {openFace === face ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  
                  {openFace === face && (
                    <div className="face-card-content" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', borderTop: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)' }}>
                      {(() => {
                        const getAdjacentLabels = (f) => {
                          switch(f) {
                            case 'U': return { top: 'BACK', bottom: 'FRONT', left: 'LEFT', right: 'RIGHT' };
                            case 'D': return { top: 'FRONT', bottom: 'BACK', left: 'LEFT', right: 'RIGHT' };
                            case 'F': return { top: 'UP', bottom: 'DOWN', left: 'LEFT', right: 'RIGHT' };
                            case 'B': return { top: 'UP', bottom: 'DOWN', left: 'RIGHT', right: 'LEFT' };
                            case 'L': return { top: 'UP', bottom: 'DOWN', left: 'BACK', right: 'FRONT' };
                            case 'R': return { top: 'UP', bottom: 'DOWN', left: 'FRONT', right: 'BACK' };
                            default: return { top: '', bottom: '', left: '', right: '' };
                          }
                        };
                        const adj = getAdjacentLabels(face);
                        
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1.5px' }}>{adj.top}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1.5px', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{adj.left}</div>
                              <div className="face-grid" style={{ width: '130px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                {cubeState[face].map((colorName, idx) => (
                                  <div
                                    key={`${face}-${idx}`}
                                    className="sticker"
                                    style={{ 
                                      width: '38px', height: '38px',
                                      background: COLORS[colorName] || COLORS.default,
                                      cursor: idx === 4 ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '4px',
                                      border: idx === 4 ? '2px solid rgba(0,0,0,0.2)' : 'none'
                                    }}
                                    onClick={() => {
                                      if (idx !== 4) onStickerClick(face, idx);
                                    }}
                                  >
                                     {idx === 4 && <Lock size={16} color="rgba(0,0,0,0.5)" />}
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1.5px', writingMode: 'vertical-rl' }}>{adj.right}</div>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1.5px' }}>{adj.bottom}</div>
                          </div>
                        );
                      })()}
                      
                      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ flex: 1, padding: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                          onClick={(e) => { e.stopPropagation(); onClearFace(face); }}
                        >
                          <RotateCcw size={14} /> Clear
                        </button>
                        <div 
                          className="camera-div" 
                          onClick={() => onScanClick(face)}
                          style={{ 
                            flex: 2, padding: '10px', 
                            background: 'linear-gradient(135deg, rgba(69, 243, 255, 0.1), rgba(0, 153, 255, 0.1))', 
                            border: '1px solid rgba(69, 243, 255, 0.3)', 
                            borderRadius: '8px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(69, 243, 255, 0.2), rgba(0, 153, 255, 0.2))'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(69, 243, 255, 0.1), rgba(0, 153, 255, 0.1))'}
                        >
                          <Camera size={16} /> Scan
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div style={{ padding: '20px 30px 30px', flexShrink: 0, borderTop: '1px solid var(--panel-border)', background: 'rgba(26, 34, 56, 0.8)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {solveError && <div style={{ color: '#ff5555', fontSize: '0.8rem', textAlign: 'center', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '8px', lineHeight: '1.4', border: '1px solid rgba(255,50,50,0.25)' }}>{solveError}</div>}
        <button className="btn btn-primary" onClick={onSolve} disabled={isSolving}>
          <Play size={20} /> {isSolving ? 'Solving...' : 'Start AI Solver'}
        </button>
        {hasScrambledState && (
          <button className="btn btn-secondary" onClick={onRestart} disabled={isSolving} style={{ background: 'linear-gradient(135deg, rgba(69, 243, 255, 0.15), rgba(0, 153, 255, 0.15))', border: '1px solid rgba(69, 243, 255, 0.3)', color: 'var(--accent)' }}>
            <RotateCcw size={16} /> Restart Solve
          </button>
        )}
        <button className="btn btn-secondary" onClick={onLoadDemo} disabled={isSolving}>
          Load Demo Scramble
        </button>
        <button className="btn btn-secondary" onClick={onReset} disabled={isSolving} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
          <RotateCcw size={16} /> Reset Cube
        </button>
      </div>
      </div>
    </div>
  );
};

export default SidebarUI;
