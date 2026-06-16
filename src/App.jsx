import React, { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import SidebarUI from './components/SidebarUI';
import Cube3D from './components/Cube3D';
import CameraScanner from './components/CameraScanner';
import SolverHUD from './components/SolverHUD';
import { INITIAL_CUBE_STATE, DEMO_CUBE_STATE } from './utils/cubeMapping';
import { solveCubeLocal } from './utils/solver';
import confetti from 'canvas-confetti';
import './index.css';

function App() {
  const [cubeState, setCubeState] = useState(INITIAL_CUBE_STATE);
  const [selectedColor, setSelectedColor] = useState('white');
  const [scanningFace, setScanningFace] = useState(null);
  
  const [isSolving, setIsSolving] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const [solveError, setSolveError] = useState('');
  const [moveSequence, setMoveSequence] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [scrambledState, setScrambledState] = useState(null);
  const [cubeStateHistory, setCubeStateHistory] = useState([]);
  const [solveStartTime, setSolveStartTime] = useState(null);
  const [solveEndTime, setSolveEndTime] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [focusedFace, setFocusedFace] = useState(null);

  // --- Color Filling ---
  const handleStickerClick = (face, idx) => {
    if (isSolving || idx === 4) return;
    setCubeState(prev => {
      const newFace = [...prev[face]];
      newFace[idx] = selectedColor;
      return { ...prev, [face]: newFace };
    });
    setForceRender(prev => prev + 1);
  };

  const handleClearFace = (face) => {
    if (isSolving) return;
    setCubeState(prev => {
      const newState = { ...prev };
      newState[face] = Array(9).fill('default');
      newState[face][4] = prev[face][4];
      return newState;
    });
    setForceRender(prev => prev + 1);
  };

  const handleReset = () => {
    setCubeState(INITIAL_CUBE_STATE);
    setSolveError('');
    setIsSolving(false);
    setIsSidebarOpen(true);
    setMoveSequence([]);
    setCurrentMoveIndex(0);
    setAnimationDone(false);
    setScrambledState(null);
    setCubeStateHistory([]);
    setSolveStartTime(null);
    setSolveEndTime(null);
    setSkipAnimation(false);
    setForceRender(prev => prev + 1);
  };

  const handleLoadDemo = () => {
    setCubeState(DEMO_CUBE_STATE);
    setSolveError('');
    setIsSolving(false);
    setMoveSequence([]);
    setCurrentMoveIndex(0);
    setAnimationDone(false);
    setForceRender(prev => prev + 1);
  };

  const handleScanCapture = (face, colors) => {
    setCubeState(prev => ({ ...prev, [face]: colors }));
    setScanningFace(null);
    setForceRender(prev => prev + 1);
  };

  // --- Solving ---
  const handleSolve = async (skipPreview = false, stateToSolve = cubeState) => {
    if (isSolving) return;
    setSolveError('');
    if (!skipPreview) {
      setShowPreview(true);
    }
    setFocusedFace(null);
    setAnimationDone(false);
    setSkipAnimation(false);
    
    try {
      const solution = await solveCubeLocal(stateToSolve);
      if (solution.error) {
        setSolveError(solution.error);
        return;
      }
      
      if (solution.moves.length === 0) {
        setSolveError(solution.message || 'Cube is already solved!');
        return;
      }

      setScrambledState(JSON.parse(JSON.stringify(stateToSolve)));
      
      const startSolving = () => {
        setShowPreview(false);
        setIsSidebarOpen(false);
        setMoveSequence(solution.moves);
        setCurrentMoveIndex(0);
        setIsSolving(true);
        setIsAutoPlay(true);
        setSkipAnimation(false);
        setCubeStateHistory([JSON.parse(JSON.stringify(stateToSolve))]);
        setSolveStartTime(Date.now());
        setSolveEndTime(null);
      };

      if (skipPreview) {
        startSolving();
      } else {
        setShowPreview(true);
        setTimeout(startSolving, 1500);
      }
    } catch (err) {
      setSolveError('Solver crashed: ' + err.message);
    }
  };

  // --- Move Complete Callback ---
  const handleMoveComplete = useCallback((new3DState, completedIndex) => {
    const idx = completedIndex !== undefined ? completedIndex : currentMoveIndex;
    
    if (idx === currentMoveIndex) {
      setAnimationDone(true);
    }
    setCubeState(new3DState);
    
    setCubeStateHistory(prev => {
      const newHistory = [...prev];
      newHistory[idx + 1] = JSON.parse(JSON.stringify(new3DState));
      return newHistory;
    });

    if (idx >= moveSequence.length - 1) {
      setSolveEndTime(Date.now());
      
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ff0000', '#00cc00', '#0066ff', '#ffdd00', '#ff8c00', '#ffffff'],
        disableForReducedMotion: true
      });
      // NO auto-restart loop — user clicks Restart manually
    }
  }, [currentMoveIndex, moveSequence.length]);

  // --- Auto-play Loop ---
  useEffect(() => {
    let timeoutId;
    if (isSolving && isAutoPlay && animationDone && currentMoveIndex < moveSequence.length - 1) {
      const delay = playbackSpeed === 1 ? 1200 : playbackSpeed === 2 ? 600 : playbackSpeed === 4 ? 300 : 2000;
      timeoutId = setTimeout(() => {
        setSkipAnimation(false);
        setAnimationDone(false);
        setCurrentMoveIndex(prev => prev + 1);
      }, delay);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSolving, isAutoPlay, animationDone, currentMoveIndex, moveSequence.length, playbackSpeed]);

  // --- Navigation Controls ---
  const handleNextMove = () => {
    if (currentMoveIndex < moveSequence.length - 1) {
      setSkipAnimation(false);
      setAnimationDone(false);
      setCurrentMoveIndex(prev => prev + 1);
    }
  };

  const handlePreviousMove = () => {
    if (currentMoveIndex > 0 && cubeStateHistory[currentMoveIndex - 1]) {
      const newIndex = currentMoveIndex - 1;
      setSkipAnimation(true);
      setAnimationDone(true);
      setCubeState(JSON.parse(JSON.stringify(cubeStateHistory[newIndex])));
      setCurrentMoveIndex(newIndex);
      setForceRender(prev => prev + 1);
    }
  };

  const handleToggleAutoPlay = () => {
    const newAutoPlay = !isAutoPlay;
    setIsAutoPlay(newAutoPlay);
    if (newAutoPlay) {
      setSkipAnimation(false);
      if (animationDone && currentMoveIndex < moveSequence.length - 1) {
        setAnimationDone(false);
        setCurrentMoveIndex(prev => prev + 1);
      }
    }
  };

  const handleStopSolving = () => {
    setIsSolving(false);
    setIsSidebarOpen(true);
    setIsAutoPlay(true);
    setSkipAnimation(false);
    setAnimationDone(false);
    setMoveSequence([]);
    setCurrentMoveIndex(0);
    setCubeStateHistory([]);
    setSolveStartTime(null);
    setSolveEndTime(null);
    setFocusedFace(null);
    
    if (scrambledState) {
      setCubeState(JSON.parse(JSON.stringify(scrambledState)));
      setForceRender(prev => prev + 1);
    } else {
      setCubeState(INITIAL_CUBE_STATE);
      setForceRender(prev => prev + 1);
    }
    setSolveError('');
  };

  const handleRestart = () => {
    if (scrambledState) {
      const resetState = JSON.parse(JSON.stringify(scrambledState));
      
      // Full reset all solving state
      setIsSolving(false);
      setIsAutoPlay(true);
      setSkipAnimation(false);
      setAnimationDone(false);
      setMoveSequence([]);
      setCurrentMoveIndex(0);
      setCubeStateHistory([]);
      setSolveStartTime(null);
      setSolveEndTime(null);
      setSolveError('');
      setShowPreview(false);
      setCubeState(resetState);
      setFocusedFace(null);
      
      // Force the 3D cube to fully rebuild with scrambled colors
      setForceRender(prev => prev + 1);
      
      // Start solving again after React has rebuilt the cube
      setTimeout(() => {
        handleSolve(true, resetState);
      }, 300);
    } else {
      handleSolve(false, cubeState);
    }
  };

  return (
    <>
      <SidebarUI
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        cubeState={cubeState}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        onStickerClick={handleStickerClick}
        onScanClick={(face) => setScanningFace(face)}
        onFaceSelect={(face) => setFocusedFace(face)}
        onSolve={handleSolve}
        onReset={handleReset}
        onLoadDemo={handleLoadDemo}
        onClearFace={handleClearFace}
        onRestart={handleRestart}
        solveError={solveError}
        isSolving={isSolving}
        hasScrambledState={!!scrambledState}
      />
      <div className="canvas-container">
        <Canvas camera={{ position: [6, 5, 8], fov: window.innerWidth < 768 ? 65 : 45 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
          <color attach="background" args={['#1a2238']} />
          <ambientLight intensity={1.0} />
          <directionalLight position={[5, 10, 7]} intensity={1.0} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <ContactShadows resolution={512} scale={15} blur={3} opacity={0.3} far={12} color="#000000" position={[0, -2.5, 0]} />
          <Cube3D 
            key={`cube-${forceRender}`}
            cubeState={cubeState}
            moveSequence={moveSequence}
            currentMoveIndex={currentMoveIndex}
            isSolving={isSolving}
            playbackSpeed={playbackSpeed}
            onMoveComplete={handleMoveComplete}
            rebuildKey={forceRender}
            skipAnimation={skipAnimation}
            focusedFace={focusedFace}
          />
          <OrbitControls 
            makeDefault 
            enablePan={true} 
            enableDamping={true} 
            dampingFactor={0.05} 
            rotateSpeed={0.8}
            autoRotate={false}
            minDistance={4}
            maxDistance={25}
            target={[0, 0, 0]}
          />
        </Canvas>
        
        {showPreview && (
          <div className="preview-overlay">
            <div className="preview-message">
              <h2>🎯 Starting Solve...</h2>
              <p>Analyzing cube configuration</p>
            </div>
          </div>
        )}
        
        {(isSolving || (scrambledState && moveSequence.length > 0)) && (
          <SolverHUD
            moveSequence={moveSequence}
            currentMoveIndex={currentMoveIndex}
            isAutoPlay={isAutoPlay}
            animationDone={animationDone}
            playbackSpeed={playbackSpeed}
            solveStartTime={solveStartTime}
            solveEndTime={solveEndTime}
            isSolving={isSolving}
            onNext={handleNextMove}
            onPrevious={handlePreviousMove}
            onToggleAutoPlay={handleToggleAutoPlay}
            onStop={handleStopSolving}
            onRestart={handleRestart}
            onSpeedChange={() => setPlaybackSpeed(s => s === 1 ? 2 : s === 2 ? 4 : s === 4 ? 0.5 : 1)}
          />
        )}
      </div>

      {scanningFace && (
        <CameraScanner
          currentFaceToCapture={scanningFace}
          onCapture={handleScanCapture}
          onClose={() => setScanningFace(null)}
        />
      )}
    </>
  );
}

export default App;
