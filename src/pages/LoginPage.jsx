import React, { useState } from 'react';
import { 
  Receipt, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Loader2
} from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid email or password.');
      }

      // Store authenticated user session
      localStorage.setItem('jazlan_auth_user', JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem('jazlan_auth_token', data.token);
      }

      if (onLogin) {
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        {/* TOP ACCENT LINE */}
        <div className="login-card-accent" />

        <div className="login-card-body">
          {/* BRAND HEADER */}
          <div className="login-brand-header">
            <div className="login-brand-icon-box">
              <Receipt size={28} color="#ffffff" strokeWidth={2.2} />
            </div>
            <h1 className="login-brand-title">JAZLAN</h1>
            <p className="login-brand-subtitle">Steels & Accounts Terminal</p>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="login-error-alert" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* EMAIL FIELD */}
            <div className="login-input-group">
              <label htmlFor="login-email" className="login-label">
                Email Address
              </label>
              <div className="login-input-wrapper">
                <Mail size={18} className="login-input-icon" />
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoFocus
                  className="login-input"
                />
              </div>
            </div>

            {/* PASSWORD FIELD */}
            <div className="login-input-group">
              <label htmlFor="login-password" className="login-label">
                Password
              </label>
              <div className="login-input-wrapper">
                <Lock size={18} className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="login-input"
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              id="btn-login-submit"
              disabled={loading}
              className="btn-login-submit"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* FOOTER */}
          <div className="login-card-footer">
            <ShieldCheck size={14} style={{ color: '#10b981' }} />
            <span>Secured Terminal · Role-Based Access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
