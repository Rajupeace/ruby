import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import SidebarUI from './components/SidebarUI';
import Cube3D from './components/Cube3D';
import CameraScanner from './components/CameraScanner';
import SolverHUD from './components/SolverHUD';
import { INITIAL_CUBE_STATE, DEMO_CUBE_STATE } from './utils/cubeMapping';
import { solveCubeLocal } from './utils/solver';
import './index.css';

function App() {
  const [cubeState, setCubeState] = useState(INITIAL_CUBE_STATE);
  const [selectedColor, setSelectedColor] = useState('white');
  const [scanningFace, setScanningFace] = useState(null);
  
  const [isSolving, setIsSolving] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [solveError, setSolveError] = useState('');
  const [moveSequence, setMoveSequence] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);

  const handleStickerClick = (face, idx) => {
    if (isSolving || idx === 4) return;
    setCubeState(prev => {
      const newFace = [...prev[face]];
      newFace[idx] = selectedColor;
      return { ...prev, [face]: newFace };
    });
  };

  const handleReset = () => {
    setCubeState(INITIAL_CUBE_STATE);
    setSolveError('');
    setIsSolving(false);
    setMoveSequence([]);
    setAnimationDone(false);
  };

  const handleLoadDemo = () => {
    setCubeState(DEMO_CUBE_STATE);
    setSolveError('');
    setIsSolving(false);
    setMoveSequence([]);
    setAnimationDone(false);
  };

  const handleScanCapture = (face, colors) => {
    setCubeState(prev => ({ ...prev, [face]: colors }));
    setScanningFace(null);
  };

  const handleSolve = async () => {
    setSolveError('');
    setAnimationDone(false);
    
    try {
      const solution = await solveCubeLocal(cubeState);
      if (solution.error) {
        setSolveError(solution.error);
        return;
      }
      
      if (solution.moves.length === 0) {
        setSolveError(solution.message || 'Cube is already solved!');
        return;
      }

      setMoveSequence(solution.moves);
      setCurrentMoveIndex(0);
      setIsSolving(true);
      setIsAutoPlay(true);
    } catch (err) {
      setSolveError('Solver crashed: ' + err.message);
    }
  };

  const handleMoveComplete = useCallback(() => {
    setAnimationDone(true);
    if (isAutoPlay) {
      if (currentMoveIndex < moveSequence.length - 1) {
        setTimeout(() => {
          setAnimationDone(false);
          setCurrentMoveIndex(prev => prev + 1);
        }, 800); // 800ms delay between moves to match the slower 0.79s animation and make steps clear
      } else if (currentMoveIndex === moveSequence.length - 1) {
        // Last move completed, transition to final solved HUD state after 800ms
        setTimeout(() => {
          setAnimationDone(false);
          setCurrentMoveIndex(moveSequence.length);
          setCubeState(INITIAL_CUBE_STATE); // Persist solved state in React
        }, 800);
      }
    }
  }, [isAutoPlay, currentMoveIndex, moveSequence.length]);

  const handleNextMove = () => {
    if (currentMoveIndex < moveSequence.length - 1) {
      setAnimationDone(false);
      setCurrentMoveIndex(prev => prev + 1);
    } else if (currentMoveIndex === moveSequence.length - 1) {
      setAnimationDone(false);
      setCurrentMoveIndex(moveSequence.length);
      setCubeState(INITIAL_CUBE_STATE);
    }
  };

  const handleToggleAutoPlay = () => {
    const newAutoPlay = !isAutoPlay;
    setIsAutoPlay(newAutoPlay);
    if (newAutoPlay && animationDone && currentMoveIndex < moveSequence.length - 1) {
      setAnimationDone(false);
      setCurrentMoveIndex(prev => prev + 1);
    } else if (newAutoPlay && animationDone && currentMoveIndex === moveSequence.length - 1) {
      setAnimationDone(false);
      setCurrentMoveIndex(moveSequence.length);
      setCubeState(INITIAL_CUBE_STATE);
    }
  };

  const handleStopSolving = () => {
    if (currentMoveIndex >= moveSequence.length) {
      setCubeState(INITIAL_CUBE_STATE);
    }
    setIsSolving(false);
    setMoveSequence([]);
    setAnimationDone(false);
  };

  return (
    <>
      <SidebarUI
        cubeState={cubeState}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        onStickerClick={handleStickerClick}
        onScanClick={(face) => setScanningFace(face)}
        onSolve={handleSolve}
        onReset={handleReset}
        onLoadDemo={handleLoadDemo}
        solveError={solveError}
        isSolving={isSolving}
      />
      <div className="canvas-container">
        <Canvas camera={{ position: [5, 5, 7], fov: 40 }} gl={{ antialias: true }} dpr={[1, 2]}>
          <color attach="background" args={['#0b0c10']} />
          <ambientLight intensity={0.85} />
          <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={2.2} castShadow />
          <spotLight position={[-8, 10, -5]} angle={0.4} penumbra={0.5} intensity={0.5} color="#e4efff" />
          <Environment preset="city" />
          <ContactShadows resolution={512} scale={20} blur={2.5} opacity={0.4} far={10} color="#000000" position={[0, -2.5, 0]} />
          <Cube3D 
            key={isSolving ? "solving" : JSON.stringify(cubeState)}
            initialState={cubeState} 
            moveSequence={moveSequence}
            currentMoveIndex={currentMoveIndex}
            isSolving={isSolving}
            onMoveComplete={handleMoveComplete}
          />
          <OrbitControls 
            makeDefault 
            enablePan={false} 
            enableDamping={true} 
            dampingFactor={0.05} 
            rotateSpeed={0.8}
            autoRotate={!isSolving}
            autoRotateSpeed={1.2}
            minDistance={5}
            maxDistance={15}
          />
        </Canvas>
        
        {isSolving && (
          <SolverHUD
            moveSequence={moveSequence}
            currentMoveIndex={currentMoveIndex}
            isAutoPlay={isAutoPlay}
            animationDone={animationDone}
            onNext={handleNextMove}
            onToggleAutoPlay={handleToggleAutoPlay}
            onStop={handleStopSolving}
            onRestart={handleReset}
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
