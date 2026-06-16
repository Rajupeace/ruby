import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Check, RefreshCcw } from 'lucide-react';
import { COLORS, FACE_COLORS } from '../utils/cubeMapping';

const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
};

const identifyColorHSL = (r, g, b) => {
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // STRICT thresholds to prevent colour mixing
  if (l < 12) return 'default'; // Too dark
  
  // White: very low saturation only
  if (s < 20 && l > 55) return 'white';
  if (l > 90 && s < 35) return 'white';

  // Need minimum saturation to be a color
  if (s < 20) return 'default';

  // Yellow: bright, warm hue, HIGH lightness
  if (h >= 45 && h < 70 && l > 40) return 'yellow';
  
  // Orange: warm hue, MEDIUM lightness (darker than yellow)
  if (h >= 15 && h < 45 && l > 25) return 'orange';
  
  // Red: very low or very high hue
  if ((h < 15 || h > 340) && s > 30) return 'red';
  
  // Green: cool hue  
  if (h >= 70 && h < 165) return 'green';
  
  // Blue: cool hue
  if (h >= 165 && h < 260) return 'blue';
  
  // Magenta/purple range -> red (webcam often shifts red)
  if (h >= 260 && h <= 340 && s > 30) return 'red';
  
  return 'default';
};

const CameraScanner = ({ onCapture, onClose, currentFaceToCapture }) => {
  const webcamRef = useRef(null);
  const [capturedColors, setCapturedColors] = useState(null);
  const [liveColors, setLiveColors] = useState(Array(9).fill('default'));
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const loopRef = useRef(null);
  const canvasRef = useRef(null); // Reuse canvas for performance

  const handleUserMediaError = useCallback((err) => {
    console.error("Webcam media error:", err);
    setError("Failed to access camera. Please check your browser permissions.");
  }, []);

  const gridPositions = [
    { x: 0.25, y: 0.25 }, { x: 0.5, y: 0.25 }, { x: 0.75, y: 0.25 },
    { x: 0.25, y: 0.5 },  { x: 0.5, y: 0.5 },  { x: 0.75, y: 0.5 },
    { x: 0.25, y: 0.75 }, { x: 0.5, y: 0.75 }, { x: 0.75, y: 0.75 },
  ];

  // Real-time color scanning loop with reusable canvas
  const scanRealTime = useCallback(() => {
    if (!webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) {
      loopRef.current = requestAnimationFrame(scanRealTime);
      return;
    }

    const video = webcamRef.current.video;
    
    // Reuse canvas instead of creating new one every frame
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (ctx && canvas.width > 0) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const newColors = gridPositions.map(pos => {
        const px = Math.floor(pos.x * canvas.width);
        const py = Math.floor(pos.y * canvas.height);
        
        // Sample a larger 20x20 area for much better stability
        const size = 20;
        const startX = Math.max(0, px - size / 2);
        const startY = Math.max(0, py - size / 2);
        const imgData = ctx.getImageData(startX, startY, size, size).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < imgData.length; i += 4) {
          r += imgData[i];
          g += imgData[i + 1];
          b += imgData[i + 2];
        }
        const pixels = size * size;
        return identifyColorHSL(r / pixels, g / pixels, b / pixels);
      });
      setLiveColors(newColors);
    }
    
    loopRef.current = requestAnimationFrame(scanRealTime);
  }, []);

  useEffect(() => {
    if (!capturedColors) {
      loopRef.current = requestAnimationFrame(scanRealTime);
    }
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [capturedColors, scanRealTime]);

  const capture = useCallback(() => {
    setError('');
    const newColors = [...liveColors];
    const expectedCenter = FACE_COLORS[currentFaceToCapture];
    
    if (newColors[4] !== expectedCenter && newColors[4] !== 'default') {
       setError(`Warning: The center color should be ${expectedCenter}, but we detected ${newColors[4]}. Make sure you are scanning the ${expectedCenter.toUpperCase()} center face.`);
    }
    
    newColors[4] = expectedCenter; // Force center
    setCapturedColors(newColors);
  }, [liveColors, currentFaceToCapture]);

  const handleConfirm = () => {
    onCapture(currentFaceToCapture, capturedColors);
  };

  const handleStickerCorrect = (idx) => {
    if (idx === 4) return;
    setCapturedColors(prev => {
      const colors = ['white', 'yellow', 'red', 'orange', 'green', 'blue'];
      const curIdx = colors.indexOf(prev[idx]);
      const nextColor = colors[(curIdx + 1) % colors.length];
      const nextArr = [...prev];
      nextArr[idx] = nextColor;
      return nextArr;
    });
  };

  return (
    <div className="camera-overlay">
      <div className="camera-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="scanner-header" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${COLORS[FACE_COLORS[currentFaceToCapture]]}`, paddingBottom: '10px', marginBottom: '15px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: COLORS[FACE_COLORS[currentFaceToCapture]], boxShadow: `0 0 10px ${COLORS[FACE_COLORS[currentFaceToCapture]]}` }} />
            Scan Face {currentFaceToCapture} ({FACE_COLORS[currentFaceToCapture].toUpperCase()})
          </h3>
          <button onClick={onClose} className="icon-btn" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20}/></button>
        </div>

        {error && <div style={{ color: '#ffcc00', fontSize: '0.8rem', padding: '10px', background: 'rgba(255,200,0,0.1)', borderRadius: '8px', marginBottom: '10px', lineHeight: '1.4', maxWidth: '300px' }}>{error}</div>}

        {!capturedColors ? (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="webcam-container" style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: `3px solid ${COLORS[FACE_COLORS[currentFaceToCapture]]}`, width: '100%', maxWidth: '300px', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode, aspectRatio: 1 }}
                onUserMediaError={handleUserMediaError}
                className="webcam-view"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                className="icon-btn flip-camera-btn"
                onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                title="Flip Camera"
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '8px', color: 'white', cursor: 'pointer', zIndex: 10, display: 'flex' }}
              >
                <RefreshCcw size={18} />
              </button>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {gridPositions.map((pos, i) => {
                  const isCenter = i === 4;
                  const expectedColorName = FACE_COLORS[currentFaceToCapture];
                  const liveColor = liveColors[i] || 'default';
                  const expectedHex = COLORS[expectedColorName];
                  const borderColor = isCenter ? expectedHex : 'rgba(255, 255, 255, 0.5)';
                  
                  return (
                    <div key={i} style={{
                      position: 'absolute',
                      left: `${pos.x * 100}%`,
                      top: `${pos.y * 100}%`,
                      width: '30px', height: '30px',
                      border: `2px solid ${borderColor}`,
                      borderRadius: '4px',
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 0 5px rgba(0,0,0,0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.2)'
                    }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '2px', background: COLORS[liveColor], boxShadow: 'inset 0 0 4px rgba(0,0,0,0.5)' }} />
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="live-preview-sidebar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Live Preview</h4>
              <div className="face-grid large-preview" style={{ width: '100px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                {liveColors.map((color, idx) => (
                  <div
                    key={idx}
                    className="sticker"
                    style={{ width: '26px', height: '26px', background: COLORS[color], borderRadius: '3px' }}
                  >
                    {idx === 4 && <div style={{ width: '8px', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', margin: '9px auto' }}/>}
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={capture} style={{ padding: '10px 20px', fontSize: '0.9rem', background: `linear-gradient(135deg, ${COLORS[FACE_COLORS[currentFaceToCapture]]}, #222)` }}>
                <Camera size={16} /> Capture
              </button>
            </div>
          </div>
        ) : (
          <div className="preview-container">
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Tap stickers to manually correct any misread colors. Center piece is locked to {FACE_COLORS[currentFaceToCapture]}.</p>
            <div className="face-grid large-preview" style={{ margin: '20px auto', width: '120px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {capturedColors.map((color, idx) => (
                <div
                  key={idx}
                  className="sticker"
                  style={{ width: '36px', height: '36px', background: COLORS[color], cursor: idx === 4 ? 'not-allowed' : 'pointer', display: 'flex' }}
                  onClick={() => handleStickerCorrect(idx)}
                >
                  {idx === 4 && <div style={{ width: '12px', height: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', margin: 'auto' }}/>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setCapturedColors(null)}>Retake</button>
              <button className="btn btn-primary" onClick={handleConfirm}><Check size={18} /> Confirm</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraScanner;
