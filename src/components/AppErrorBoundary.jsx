import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('App screen crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#07080a', color: '#f8fafc', padding: '1.5rem', textAlign: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0 }}>This screen needs a refresh.</h1>
            <p style={{ color: '#94a3b8', margin: '0.65rem 0 1rem' }}>Your saved words are still safe.</p>
            <button type="button" onClick={() => window.location.reload()} style={{ border: 0, borderRadius: '10px', padding: '0.72rem 1rem', background: '#facc15', color: '#111827', fontWeight: 800, cursor: 'pointer' }}>
              Reload Mem-eng
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}