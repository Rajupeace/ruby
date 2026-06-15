import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Check } from 'lucide-react';
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
  
  // White detection: low saturation and mid-to-high lightness, OR extremely high light (glare)
  if (l > 75 && s < 25) return 'white';
  if (l > 85) return 'white';
  if (s < 12 && l > 50) return 'white';

  // Too dark/black detection
  if (l < 15) return 'default';

  // Color Hue Ranges (0-360)
  if (h < 12 || h >= 335) return 'red';
  if (h >= 12 && h < 40) return 'orange';
  if (h >= 40 && h < 66) return 'yellow';
  if (h >= 66 && h < 160) return 'green';
  if (h >= 160 && h < 265) return 'blue';
  
  return 'default';
};

const CameraScanner = ({ onCapture, onClose, currentFaceToCapture }) => {
  const webcamRef = useRef(null);
  const [capturedColors, setCapturedColors] = useState(null);
  const [error, setError] = useState('');

  // 9 positions for the 3x3 grid
  const gridPositions = [
    { x: 0.2, y: 0.2 }, { x: 0.5, y: 0.2 }, { x: 0.8, y: 0.2 },
    { x: 0.2, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.5 },
    { x: 0.2, y: 0.8 }, { x: 0.5, y: 0.8 }, { x: 0.8, y: 0.8 },
  ];

  const capture = useCallback(() => {
    setError('');
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // Mirror the canvas draw horizontally so it matches the mirrored webcam view
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Restore default transform

      const newColors = gridPositions.map(pos => {
        const px = Math.floor(pos.x * canvas.width);
        const py = Math.floor(pos.y * canvas.height);
        
        // Sample a 15x15 area for stable average color reading (filters out sensor noise)
        const size = 15;
        const half = Math.floor(size / 2);
        const imgData = ctx.getImageData(px - half, py - half, size, size).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < imgData.length; i += 4) {
          r += imgData[i];
          g += imgData[i + 1];
          b += imgData[i + 2];
        }
        const pixels = size * size;
        return identifyColorHSL(r / pixels, g / pixels, b / pixels);
      });

      // Verification: Does the scanned center match the face we are trying to capture?
      const expectedCenter = FACE_COLORS[currentFaceToCapture];
      if (newColors[4] !== expectedCenter && newColors[4] !== 'default') {
         setError(`Warning: The center color should be ${expectedCenter}, but the camera detected ${newColors[4]}. Are you scanning the wrong face?`);
      }
      
      // Force the center piece to be correct to guarantee cube validity
      newColors[4] = expectedCenter;
      setCapturedColors(newColors);
    };
  }, [webcamRef, currentFaceToCapture]);

  const handleConfirm = () => {
    onCapture(currentFaceToCapture, capturedColors);
  };

  const handleStickerCorrect = (idx) => {
    if (idx === 4) return; // Center locked
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
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <div className="scanner-header">
          <h3>Scan Face {currentFaceToCapture}</h3>
          <button onClick={onClose} className="icon-btn"><X size={20}/></button>
        </div>

        {error && <div style={{ color: '#ffcc00', fontSize: '0.8rem', padding: '10px', background: 'rgba(255,200,0,0.1)', borderRadius: '8px', marginBottom: '10px', lineHeight: '1.4' }}>{error}</div>}

        {!capturedColors ? (
          <div className="webcam-container" style={{ position: 'relative' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "environment" }}
              className="webcam-view"
            />
            {/* Draw targeting crosshairs overlay */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {gridPositions.map((pos, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                  width: '12px', height: '12px',
                  border: '2px solid rgba(0, 255, 0, 0.8)',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 5px rgba(0,0,0,0.8)'
                }}>
                  {/* Inner dot */}
                  <div style={{ width: '2px', height: '2px', background: 'rgba(0, 255, 0, 0.8)', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderRadius: '50%' }} />
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={capture} style={{ marginTop: '15px' }}>
              <Camera size={18} /> Capture Colors
            </button>
          </div>
        ) : (
          <div className="preview-container">
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Tap stickers to manually correct any misread colors. Center piece is locked to {FACE_COLORS[currentFaceToCapture]}.</p>
            <div className="face-grid large-preview">
              {capturedColors.map((color, idx) => (
                <div
                  key={idx}
                  className="sticker"
                  style={{ background: COLORS[color], cursor: idx === 4 ? 'not-allowed' : 'pointer', display: 'flex' }}
                  onClick={() => handleStickerCorrect(idx)}
                >
                  {idx === 4 && <div style={{ width: '8px', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', margin: 'auto' }}/>}
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
