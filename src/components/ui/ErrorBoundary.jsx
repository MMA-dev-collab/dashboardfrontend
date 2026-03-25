import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, retryIn: 0 };
    this._timer = null;
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
    this.startRetryCountdown();
  }

  startRetryCountdown() {
    this.setState({ retryIn: 30 });
    this._timer = setInterval(() => {
      this.setState((prev) => {
        if (prev.retryIn <= 1) {
          clearInterval(this._timer);
          return { hasError: false, retryIn: 0 };
        }
        return { retryIn: prev.retryIn - 1 };
      });
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this._timer);
  }

  handleRetry = () => {
    clearInterval(this._timer);
    this.setState({ hasError: false, retryIn: 0 });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '300px', gap: '1rem',
          color: 'var(--text-secondary)', textAlign: 'center'
        }}>
          <span style={{ fontSize: '2.5rem' }}>⚠️</span>
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>Could not load sessions</p>
          {this.state.retryIn > 0 ? (
            <p style={{ fontSize: '0.85rem' }}>Retrying in {this.state.retryIn}s…</p>
          ) : null}
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px',
              background: 'var(--accent)', color: '#fff',
              border: 'none', cursor: 'pointer', fontWeight: 600
            }}
          >
            Retry Now
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
