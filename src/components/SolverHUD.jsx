import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Square, RotateCcw, FastForward, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { getMoveDescription, getPhaseDescription } from '../utils/solver';

// Visual rotation diagram — shows a mini face with rotation arrow
const RotationDiagram = ({ move }) => {
  if (!move) return null;
  
  const face = move[0];
  const isPrime = move.includes("'");
  const isDouble = move.includes("2");
  
  // Face colors for the diagram
  const faceColors = {
    'R': '#ff0000', 'L': '#ff8c00', 'U': '#ffffff', 
    'D': '#ffdd00', 'F': '#00cc00', 'B': '#0066ff',
    'r': '#ff0000', 'l': '#ff8c00', 'u': '#ffffff',
    'd': '#ffdd00', 'f': '#00cc00', 'b': '#0066ff',
    'M': '#888', 'E': '#888', 'S': '#888',
    'x': '#aaa', 'y': '#aaa', 'z': '#aaa'
  };
  
  const faceLabels = {
    'R': 'RIGHT', 'L': 'LEFT', 'U': 'TOP', 'D': 'BOTTOM', 'F': 'FRONT', 'B': 'BACK',
    'r': 'RIGHT+', 'l': 'LEFT+', 'u': 'TOP+', 'd': 'BOTTOM+', 'f': 'FRONT+', 'b': 'BACK+',
    'M': 'MIDDLE', 'E': 'EQUATOR', 'S': 'STANDING',
    'x': 'X-AXIS', 'y': 'Y-AXIS', 'z': 'Z-AXIS'
  };

  const color = faceColors[face] || '#888';
  const label = faceLabels[face] || face;
  const direction = isPrime ? 'CCW' : 'CW';
  const arrowRotation = isPrime ? 'scaleX(-1)' : '';
  
  return (
    <div className="rotation-diagram">
      <div className="rotation-face" style={{ borderColor: color }}>
        {/* 3x3 mini grid */}
        <div className="mini-grid">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="mini-cell" style={{ 
              background: i === 4 ? color : 'rgba(255,255,255,0.08)',
              border: `1px solid ${i === 4 ? 'transparent' : 'rgba(255,255,255,0.06)'}`
            }} />
          ))}
        </div>
        {/* Rotation arrow overlay */}
        <div className="rotation-arrow" style={{ transform: arrowRotation }}>
          <svg viewBox="0 0 60 60" width="48" height="48">
            <path 
              d="M30 8 A22 22 0 1 1 8 30" 
              fill="none" 
              stroke={color} 
              strokeWidth="3" 
              strokeLinecap="round"
              opacity="0.9"
            />
            <polygon 
              points="4,24 12,24 8,32" 
              fill={color}
              opacity="0.9"
            />
            {isDouble && (
              <>
                <path 
                  d="M30 14 A16 16 0 1 1 14 30" 
                  fill="none" 
                  stroke={color} 
                  strokeWidth="2" 
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </>
            )}
          </svg>
        </div>
      </div>
      <div className="rotation-labels">
        <span className="rotation-face-label" style={{ color }}>{label}</span>
        <span className="rotation-dir-label">
          {isDouble ? '180°' : direction} {isPrime ? '↺' : '↻'}
        </span>
      </div>
    </div>
  );
};

const SolverHUD = ({ moveSequence, currentMoveIndex, isAutoPlay, animationDone, playbackSpeed, solveStartTime, solveEndTime, isSolving, onNext, onPrevious, onToggleAutoPlay, onStop, onRestart, onSpeedChange }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const reqRef = useRef();

  const isFinished = currentMoveIndex >= moveSequence.length - 1 && animationDone && solveEndTime !== null;
  const isStopped = !isSolving && moveSequence.length > 0;
  const currentMove = moveSequence[currentMoveIndex];
  const phase = getPhaseDescription(currentMoveIndex, moveSequence.length);
  const moveInfo = getMoveDescription(currentMove, phase.phase);
  const progress = ((currentMoveIndex + 1) / moveSequence.length) * 100;

  // Timer — stops when solving stops or ends
  useEffect(() => {
    const updateTimer = () => {
      if (solveStartTime) {
        if (solveEndTime) {
          setElapsedTime((solveEndTime - solveStartTime) / 1000);
        } else if (isSolving) {
          setElapsedTime((Date.now() - solveStartTime) / 1000);
          reqRef.current = requestAnimationFrame(updateTimer);
        }
      } else {
        setElapsedTime(0);
      }
    };

    reqRef.current = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(reqRef.current);
  }, [solveStartTime, solveEndTime, isSolving]);
  
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="solver-hud">
      {/* Timer */}
      <div className="timer-display">
        <Clock size={14} />
        <span>{formatTime(elapsedTime)}</span>
      </div>

      {/* Phase badge */}
      <div className="phase-badge" style={{ borderColor: phase.color, color: phase.color }}>
        {phase.phase}
      </div>
      <div className="phase-desc">{phase.desc}</div>

      {/* Progress bar */}
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%`, background: phase.color }} />
      </div>

      {/* Move + Visual Diagram side by side */}
      {!isFinished ? (
        <div className="move-visual-row">
          <RotationDiagram move={currentMove} />
          <div className="move-text-col">
            <div className="move-text" style={{ color: '#45f3ff' }}>
              {currentMove}
            </div>
            <div className="move-desc-inline">
              Step {currentMoveIndex + 1} of {moveSequence.length}
            </div>
          </div>
        </div>
      ) : (
        <div className="move-text" style={{ color: '#00ff88' }}>
          ✅ SOLVED!
        </div>
      )}

      {/* Collapsible step explanation card */}
      {!isFinished && (
        <div className={`step-details-card ${showDetails ? 'open' : ''}`}>
          <div 
            className="step-details-header" 
            onClick={() => setShowDetails(!showDetails)}
          >
            <span>{showDetails ? '📖 Step Details' : '📘 Step Details'}</span>
            <div className="toggle-icon">
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>
          {showDetails && (
            <div className="step-details-body">
              <div className="move-explain">{moveInfo.explain}</div>
              {moveInfo.tip && (
                <div className="move-tip">💡 {moveInfo.tip}</div>
              )}
              {phase.tip && (
                <div className="phase-tip" style={{ color: phase.color }}>
                  🎯 {phase.tip}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Move counter for finished/stopped */}
      {(isFinished || isStopped) && (
        <div className="move-desc">
          {isFinished
            ? `Completed all ${moveSequence.length} moves!`
            : `Stopped at step ${currentMoveIndex + 1} of ${moveSequence.length}`}
        </div>
      )}

      {/* Controls */}
      {isFinished || isStopped ? (
        <div className="hud-controls">
          <button className="hud-btn hud-btn-accent" onClick={onRestart} title="Restart Solving">
            <RotateCcw size={16} />
            <span>Restart</span>
          </button>
          {isStopped && (
            <button className="hud-btn" onClick={onStop} title="Reset">
              <Square size={16} />
              <span>Reset</span>
            </button>
          )}
        </div>
      ) : (
        <div className="hud-controls">
          <button className="hud-btn" onClick={onPrevious} disabled={currentMoveIndex === 0} title="Previous Move">
            <SkipBack size={18} />
          </button>
          <button className="hud-btn" onClick={onToggleAutoPlay} title={isAutoPlay ? 'Pause' : 'Play'}>
            {isAutoPlay ? <Pause size={18} /> : <Play size={18} />}
            <span>{isAutoPlay ? 'Pause' : 'Play'}</span>
          </button>
          <button className="hud-btn hud-btn-accent" onClick={onNext} disabled={currentMoveIndex >= moveSequence.length - 1} title="Next Move">
            <SkipForward size={18} />
          </button>
          <button className="hud-btn" onClick={onSpeedChange} title="Change Speed">
            <FastForward size={16} />
            <span>{playbackSpeed}x</span>
          </button>
          <button className="hud-btn hud-btn-danger" onClick={onStop} title="Stop Solving">
            <Square size={16} />
          </button>
        </div>
      )}

      {/* Move sequence strip */}
      {!isFinished && (
        <div className="move-sequence-strip">
          {moveSequence.slice(Math.max(0, currentMoveIndex - 2), currentMoveIndex + 5).map((m, i) => {
            const actualIndex = Math.max(0, currentMoveIndex - 2) + i;
            const isCurrent = actualIndex === currentMoveIndex;
            const isPast = actualIndex < currentMoveIndex;
            return (
              <span key={actualIndex} className={`seq-move ${isCurrent ? 'seq-current' : ''} ${isPast ? 'seq-past' : ''}`}>
                {m}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SolverHUD;
