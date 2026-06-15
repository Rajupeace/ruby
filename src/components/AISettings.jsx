import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';

const AISettings = () => {
  const [apiKey, setApiKey] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('gemini_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 50 }}>
      <button className="scan-btn" onClick={() => setIsOpen(!isOpen)}>
        <Settings size={16} style={{ verticalAlign: 'middle', marginRight: 5 }} /> AI Settings
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 40, right: 0,
          background: 'rgba(11, 12, 16, 0.95)',
          padding: '20px', borderRadius: '12px',
          border: '1px solid var(--accent)',
          width: '300px', backdropFilter: 'blur(10px)',
          boxShadow: '0 5px 20px rgba(0,0,0,0.5)'
        }}>
          <h3 style={{ marginTop: 0, color: 'var(--accent)', fontSize: '1rem' }}>Gemini API Key</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            Enter your key to enable AI explanations for solving rules.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            style={{
              width: '100%', padding: '10px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)',
              color: 'white', borderRadius: '8px', marginBottom: '10px'
            }}
          />
          <button className="btn btn-primary" onClick={handleSave} style={{ padding: '8px' }}>
            <Save size={16} /> Save Key
          </button>
        </div>
      )}
    </div>
  );
};

export default AISettings;
