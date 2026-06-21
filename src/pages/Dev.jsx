import React, { useState } from 'react';
import { useVocab } from '../context/VocabContext';
import { Shield, RefreshCw, AlertTriangle, CheckCircle, Activity, ArrowLeft, Clock, Image, Save, Key, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dev = () => {
  const { providerStatus, resetCooldowns } = useVocab();

  // Local storage API keys state (falling back to env variables for display)
  const [pexelsKey, setPexelsKey] = useState(localStorage.getItem('memeng_pexels_key') || import.meta.env.VITE_PEXELS_API_KEY || '');
  const [pixabayKey, setPixabayKey] = useState(localStorage.getItem('memeng_pixabay_key') || import.meta.env.VITE_PIXABAY_API_KEY || '');
  const [hfKey, setHfKey] = useState(localStorage.getItem('memeng_huggingface_key') || import.meta.env.VITE_HUGGINGFACE_API_KEY || '');
  const [falKey, setFalKey] = useState(localStorage.getItem('memeng_fal_key') || import.meta.env.VITE_FAL_API_KEY || '');
  
  const [pexelsTestStatus, setPexelsTestStatus] = useState('');
  const [pixabayTestStatus, setPixabayTestStatus] = useState('');
  const [hfTestStatus, setHfTestStatus] = useState('');
  const [falTestStatus, setFalTestStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const getStatusDetails = (name, data) => {
    const isRL = data.status === 'rate_limited';
    const hasError = data.status === 'error';
    const isHealthy = data.status === 'healthy';

    let color = '#a78bfa'; // default / healthy
    let bg = 'rgba(167, 139, 250, 0.02)';
    let border = 'rgba(255, 255, 255, 0.07)';
    let text = 'Ready / Healthy';

    if (isRL) {
      color = '#f59e0b';
      bg = 'rgba(245, 158, 11, 0.04)';
      border = 'rgba(245, 158, 11, 0.2)';
      
      const secondsLeft = data.retryAfter ? Math.max(0, Math.ceil((data.retryAfter - Date.now()) / 1000)) : 0;
      text = `Rate Limited (${secondsLeft}s remaining)`;
    } else if (hasError) {
      color = '#ef4444';
      bg = 'rgba(239, 68, 68, 0.04)';
      border = 'rgba(239, 68, 68, 0.2)';
      text = 'Error';
    } else if (isHealthy) {
      color = '#10b981';
      bg = 'rgba(16, 185, 129, 0.04)';
      border = 'rgba(16, 185, 129, 0.2)';
      text = 'Ready / Healthy';
    }

    return { color, bg, border, text };
  };

  const handleSaveKeys = () => {
    localStorage.setItem('memeng_pexels_key', pexelsKey.trim());
    localStorage.setItem('memeng_pixabay_key', pixabayKey.trim());
    localStorage.setItem('memeng_huggingface_key', hfKey.trim());
    localStorage.setItem('memeng_fal_key', falKey.trim());
    setSaveStatus('Keys saved successfully! 🎉');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const testPexelsKey = async () => {
    if (!pexelsKey) {
      setPexelsTestStatus('⚠️ Please enter a key first.');
      return;
    }
    setPexelsTestStatus('⏳ Testing...');
    try {
      const res = await fetch('https://api.pexels.com/v1/search?query=scenic&per_page=1', {
        headers: { Authorization: pexelsKey.trim() }
      });
      if (res.ok) {
        setPexelsTestStatus('✅ Connection successful!');
      } else {
        setPexelsTestStatus(`❌ Error: HTTP ${res.status}`);
      }
    } catch (e) {
      setPexelsTestStatus(`❌ Request failed: ${e.message}`);
    }
  };

  const testPixabayKey = async () => {
    if (!pixabayKey) {
      setPixabayTestStatus('⚠️ Please enter a key first.');
      return;
    }
    setPixabayTestStatus('⏳ Testing...');
    try {
      const res = await fetch(`https://pixabay.com/api/?key=${pixabayKey.trim()}&q=nature&per_page=3`);
      if (res.ok) {
        const data = await res.json();
        if (data.hits) {
          setPixabayTestStatus('✅ Connection successful!');
        } else {
          setPixabayTestStatus('❌ Failed: Key invalid');
        }
      } else {
        setPixabayTestStatus(`❌ Error: HTTP ${res.status}`);
      }
    } catch (e) {
      setPixabayTestStatus(`❌ Request failed: ${e.message}`);
    }
  };

  const testHfKey = async () => {
    if (!hfKey) {
      setHfTestStatus('⚠️ Please enter a key first.');
      return;
    }
    setHfTestStatus('⏳ Testing...');
    try {
      const res = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: 'test connection' })
      });
      if (res.ok) {
        setHfTestStatus('✅ Connection successful!');
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || `HTTP ${res.status}`;
        setHfTestStatus(`❌ Error: ${errMsg}`);
      }
    } catch (e) {
      setHfTestStatus(`❌ Request failed: ${e.message}`);
    }
  };

  const testFalKey = async () => {
    if (!falKey) {
      setFalTestStatus('⚠️ Please enter a key first.');
      return;
    }
    setFalTestStatus('⏳ Testing...');
    try {
      const res = await fetch('https://api.fluxapi.ai/api/v1/flux/kontext/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${falKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: 'test connection',
          aspectRatio: '1:1',
          model: 'flux-kontext-pro'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 200) {
          setFalTestStatus('✅ Connection successful!');
        } else {
          setFalTestStatus(`❌ Error: ${data.msg || 'Invalid API Key'}`);
        }
      } else {
        setFalTestStatus(`❌ Error: HTTP ${res.status}`);
      }
    } catch (e) {
      setFalTestStatus(`❌ Request failed: ${e.message}`);
    }
  };

  return (
    <div 
      className="scrollable-content"
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        boxSizing: 'border-box', 
        paddingTop: '75px', 
        paddingBottom: '25px', 
        height: '100%', 
        alignItems: 'center',
        overflowY: 'auto'
      }}
    >
      <div style={{ maxWidth: '650px', width: '100%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none', width: 'fit-content' }}>
          <ArrowLeft size={12} />
          <span>Back to Home</span>
        </Link>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', margin: 0 }}>Visual Context API Keys</h3>
          </div>
          
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            To get highly accurate, professional stock photo definitions (instead of noisy Openverse/Flickr images), register for free developer keys. They are instant and require no credit cards.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e2e8f0' }}>Pexels API Key</label>
                <a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer" style={{ color: '#06b6d4', fontSize: '0.65rem', textDecoration: 'underline' }}>Get Free Key (25k/mo)</a>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="password" 
                  value={pexelsKey}
                  onChange={(e) => setPexelsKey(e.target.value)}
                  placeholder="Paste Pexels API Key here..."
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.6rem',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace'
                  }}
                />
                <button 
                  onClick={testPexelsKey}
                  className="glass-button animate-scale"
                  style={{ borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.7rem', minHeight: '32px' }}
                >
                  Test
                </button>
              </div>
              {pexelsTestStatus && (
                <span style={{ fontSize: '0.65rem', color: pexelsTestStatus.includes('✅') ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {pexelsTestStatus}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e2e8f0' }}>Pixabay API Key</label>
                <a href="https://pixabay.com/api/docs/" target="_blank" rel="noreferrer" style={{ color: '#06b6d4', fontSize: '0.65rem', textDecoration: 'underline' }}>Get Free Key (5k/hr)</a>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="password" 
                  value={pixabayKey}
                  onChange={(e) => setPixabayKey(e.target.value)}
                  placeholder="Paste Pixabay API Key here..."
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.6rem',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace'
                  }}
                />
                <button 
                  onClick={testPixabayKey}
                  className="glass-button animate-scale"
                  style={{ borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.7rem', minHeight: '32px' }}
                >
                  Test
                </button>
              </div>
              {pixabayTestStatus && (
                <span style={{ fontSize: '0.65rem', color: pixabayTestStatus.includes('✅') ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {pixabayTestStatus}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e2e8f0' }}>HuggingFace API Key (Flux AI)</label>
                <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" style={{ color: '#06b6d4', fontSize: '0.65rem', textDecoration: 'underline' }}>Get Free Key (100% Free)</a>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="password" 
                  value={hfKey}
                  onChange={(e) => setHfKey(e.target.value)}
                  placeholder="Paste HuggingFace User Access Token (hf_...) here..."
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.6rem',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace'
                  }}
                />
                <button 
                  onClick={testHfKey}
                  className="glass-button animate-scale"
                  style={{ borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.7rem', minHeight: '32px' }}
                >
                  Test
                </button>
              </div>
              {hfTestStatus && (
                <span style={{ fontSize: '0.65rem', color: hfTestStatus.includes('✅') ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {hfTestStatus}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e2e8f0' }}>FluxAPI.ai API Key (Flux.1 Kontext Pro)</label>
                <a href="https://fluxapi.ai/api-key" target="_blank" rel="noreferrer" style={{ color: '#06b6d4', fontSize: '0.65rem', textDecoration: 'underline' }}>Get FluxAPI.ai Key</a>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="password" 
                  value={falKey}
                  onChange={(e) => setFalKey(e.target.value)}
                  placeholder="Paste FluxAPI.ai API Key here..."
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.6rem',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace'
                  }}
                />
                <button 
                  onClick={testFalKey}
                  className="glass-button animate-scale"
                  style={{ borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.7rem', minHeight: '32px' }}
                >
                  Test
                </button>
              </div>
              {falTestStatus && (
                <span style={{ fontSize: '0.65rem', color: falTestStatus.includes('✅') ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {falTestStatus}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
              {saveStatus}
            </span>
            <button 
              onClick={handleSaveKeys}
              className="glass-button primary animate-scale"
              style={{ borderRadius: '10px', padding: '0.4rem 1rem', fontSize: '0.75rem', gap: '0.3rem', minHeight: '32px' }}
            >
              <Save size={12} />
              <span>Save Keys</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--accent-hover)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', margin: 0 }}>AI Health Status</h3>
          </div>
          
          <button 
            onClick={resetCooldowns}
            className="glass-button animate-scale"
            style={{ borderRadius: '10px', padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.3rem', minHeight: '30px' }}
          >
            <RefreshCw size={11} />
            <span>Reset Cooldowns</span>
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Tracks translation rate-limit cooldowns. When a provider hits a rate limit, it enters a 60-second cooldown and queries automatically fall back.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Object.keys(providerStatus).map(name => {
            const data = providerStatus[name];
            const details = getStatusDetails(name, data);
            
            return (
              <div 
                key={name}
                className="glass-panel"
                style={{ 
                  padding: '0.8rem 1.25rem', 
                  background: details.bg, 
                  borderColor: details.border,
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: details.color, boxShadow: `0 0 8px ${details.color}` }} />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'white' }}>{name}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: details.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {details.text}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '0.4rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    <span>Last Used:</span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
                      {data.lastUsed ? new Date(data.lastUsed).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>

                  {data.lastError && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.25rem' }}>
                       <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#ef4444', fontWeight: 800 }}>Last Error:</span>
                       <pre style={{ 
                         margin: 0, 
                         fontSize: '0.65rem', 
                         background: 'rgba(0,0,0,0.2)', 
                         padding: '0.4rem 0.6rem', 
                         borderRadius: '6px', 
                         color: 'rgba(255,255,255,0.7)',
                         whiteSpace: 'pre-wrap',
                         fontFamily: 'monospace',
                         lineHeight: 1.3
                       }}>
                         {data.lastError}
                       </pre>
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default Dev;
