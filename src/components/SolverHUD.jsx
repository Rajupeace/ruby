import React from 'react';
import { Play, Pause, SkipForward, Square, ChevronRight } from 'lucide-react';
import { getMoveDescription, getPhaseDescription } from '../utils/solver';

const SolverHUD = ({ moveSequence, currentMoveIndex, isAutoPlay, animationDone, onNext, onToggleAutoPlay, onStop, onRestart }) => {
  const isFinished = currentMoveIndex >= moveSequence.length;
  const currentMove = moveSequence[currentMoveIndex];
  const moveInfo = getMoveDescription(currentMove);
  const phase = getPhaseDescription(currentMoveIndex, moveSequence.length);
  const progress = ((currentMoveIndex + 1) / moveSequence.length) * 100;

  return (
    <div className="solver-hud">
      {/* Phase badge */}
      <div className="phase-badge" style={{ borderColor: phase.color, color: phase.color }}>
        {phase.phase}
      </div>
      <div className="phase-desc">{phase.desc}</div>

      {/* Progress bar */}
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%`, background: phase.color }} />
      </div>

      {/* Current move display */}
      <div className="move-text" style={{ color: isFinished ? '#00ff88' : '#45f3ff' }}>
        {isFinished ? '✅ SOLVED!' : currentMove}
      </div>

      {/* Move explanation */}
      {!isFinished && (
        <div className="move-explain">
          {moveInfo.explain}
        </div>
      )}

      {/* Move counter */}
      <div className="move-desc">
        {isFinished
          ? `Completed all ${moveSequence.length} moves!`
          : `Step ${currentMoveIndex + 1} of ${moveSequence.length}`}
      </div>

      {/* Controls */}
      {!isFinished ? (
        <div className="hud-controls">
          <button className="hud-btn" onClick={onToggleAutoPlay} title={isAutoPlay ? 'Pause' : 'Auto-Play'}>
            {isAutoPlay ? <Pause size={18} /> : <Play size={18} />}
            <span>{isAutoPlay ? 'Pause' : 'Play'}</span>
          </button>
          
          {!isAutoPlay && (
            <button 
              className="hud-btn hud-btn-accent" 
              onClick={onNext} 
              disabled={!animationDone}
              title="Next Move"
            >
              <SkipForward size={18} />
              <span>Next</span>
            </button>
          )}

          <button className="hud-btn hud-btn-danger" onClick={onStop} title="Stop Solving">
            <Square size={16} />
            <span>Stop</span>
          </button>
        </div>
      ) : (
        <div className="hud-controls">
          <button className="hud-btn hud-btn-accent" onClick={onRestart} title="Restart and Reset Cube">
            <span>Restart</span>
          </button>
          <button className="hud-btn" onClick={onStop} title="Close Solver HUD">
            <span>Done</span>
          </button>
        </div>
      )}

      {/* Move sequence preview */}
      {!isFinished && (
        <div className="move-sequence-strip">
          {moveSequence.slice(Math.max(0, currentMoveIndex - 2), currentMoveIndex + 5).map((m, i) => {
            const actualIndex = Math.max(0, currentMoveIndex - 2) + i;
            const isCurrent = actualIndex === currentMoveIndex;
            const isPast = actualIndex < currentMoveIndex;
            return (
              <span 
                key={actualIndex} 
                className={`seq-move ${isCurrent ? 'seq-current' : ''} ${isPast ? 'seq-past' : ''}`}
              >
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
