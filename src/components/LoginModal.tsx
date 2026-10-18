import { useState } from 'react';
import { Lock, Mail, User, ArrowRight, RefreshCw, AlertCircle, X, KeyRound, Sparkles, QrCode, ChefHat, Shield } from 'lucide-react';
import { loginWithEmailOrIdAndPin, registerNewMember } from '../lib/auth';
import type { Profile } from '../types';
import { DEMO_MEMBER, DEMO_RECEPTIONIST, DEMO_ADMIN } from '../lib/demoData';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (profile: Profile) => void;
  allowClose?: boolean;
  embedded?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  allowClose = true,
  embedded = false
}) => {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  
  // Sign In fields
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');

  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Sign In (Email or Member Number + PIN)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const profile = await loginWithEmailOrIdAndPin(identifier, pin);
      onLoginSuccess(profile);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMsg(err.message || 'Invalid Email or PIN.');
    } finally {
      setLoading(false);
    }
  };

  // Handle New Member Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const profile = await registerNewMember(regFullName, regEmail, regPin);
      onLoginSuccess(profile);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const cardContent = (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: 'var(--radius-xl)',
      width: '100%',
      maxWidth: '430px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: 'var(--shadow-modal)',
      border: '1px solid var(--color-hairline)',
      animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* 1-Click Interactive Demo Sandbox Strip */}
      <div style={{
        padding: '14px 16px',
        backgroundColor: 'var(--color-canvas-soft)',
        borderBottom: '1px solid var(--color-hairline)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="var(--color-primary)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Explore Live Demo
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>No login needed</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          <button
            type="button"
            onClick={() => onLoginSuccess(DEMO_MEMBER)}
            className="btn btn-secondary"
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-hairline)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '14px' }}>🎓</span>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '11px' }}>Student</span>
            <span style={{ fontSize: '9px', color: 'var(--color-ink-mute)' }}>QR & Menu</span>
          </button>
          <button
            type="button"
            onClick={() => onLoginSuccess(DEMO_RECEPTIONIST)}
            className="btn btn-secondary"
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-hairline)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '14px' }}>⚡</span>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '11px' }}>Frontdesk</span>
            <span style={{ fontSize: '9px', color: 'var(--color-ink-mute)' }}>Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => onLoginSuccess(DEMO_ADMIN)}
            className="btn btn-secondary"
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-hairline)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '14px' }}>👑</span>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '11px' }}>Owner</span>
            <span style={{ fontSize: '9px', color: 'var(--color-ink-mute)' }}>Headcount</span>
          </button>
        </div>
      </div>

      {/* Top Bar with Segmented Pill Tabs & optional Close Button */}
      <div style={{
        padding: '14px 16px 0',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          display: 'flex',
          flex: 1,
          backgroundColor: 'var(--color-canvas-soft)',
          padding: '3px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--color-hairline)'
        }}>
          <button
            type="button"
            onClick={() => { setTab('signin'); setErrorMsg(null); }}
            className="btn btn-pill"
            style={{
              flex: 1,
              backgroundColor: tab === 'signin' ? '#ffffff' : 'transparent',
              color: tab === 'signin' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
              boxShadow: tab === 'signin' ? 'var(--shadow-level-1)' : 'none',
              fontSize: '12px',
              fontWeight: tab === 'signin' ? 600 : 400,
              padding: '7px'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(null); }}
            className="btn btn-pill"
            style={{
              flex: 1,
              backgroundColor: tab === 'register' ? '#ffffff' : 'transparent',
              color: tab === 'register' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
              boxShadow: tab === 'register' ? 'var(--shadow-level-1)' : 'none',
              fontSize: '12px',
              fontWeight: tab === 'register' ? 600 : 400,
              padding: '7px'
            }}
          >
            New Member
          </button>
        </div>

        {allowClose && onClose && !embedded && (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-pill"
            style={{
              padding: '6px',
              color: 'var(--color-ink-mute)',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Content Form Body */}
      <div style={{ padding: '16px 20px 24px' }}>
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '10px 12px',
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '14px',
            fontSize: '13px',
            color: 'var(--color-error)'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Email or Member ID */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>
                Email Address or Member ID
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--color-hairline-input)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 10px',
                backgroundColor: '#ffffff'
              }}>
                <input
                  type="text"
                  placeholder="e.g. tanishk@gmail.com or M-101"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoFocus
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '8px 2px',
                    color: 'var(--color-ink)',
                    backgroundColor: 'transparent'
                  }}
                />
                <Mail size={16} color="var(--color-ink-mute)" />
              </div>
            </div>

            {/* Secret PIN / Access Code */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>
                  Secret PIN / Access Code
                </label>
                <span className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>4-digit PIN</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--color-hairline-input)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 10px',
                backgroundColor: '#ffffff'
              }}>
                <input
                  type="password"
                  placeholder="4 to 6 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  maxLength={8}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '8px 2px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.15em',
                    color: 'var(--color-ink)',
                    backgroundColor: 'transparent'
                  }}
                />
                <Lock size={16} color="var(--color-ink-mute)" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !identifier.trim() || !pin.trim()}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                marginTop: '4px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Signing In...
                </>
              ) : (
                <>
                  Access Meal Pass <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>
                Full Name
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--color-hairline-input)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 10px',
                backgroundColor: '#ffffff'
              }}>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  required
                  autoFocus
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '8px 2px',
                    color: 'var(--color-ink)',
                    backgroundColor: 'transparent'
                  }}
                />
                <User size={16} color="var(--color-ink-mute)" />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>
                Email Address
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--color-hairline-input)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 10px',
                backgroundColor: '#ffffff'
              }}>
                <input
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '8px 2px',
                    color: 'var(--color-ink)',
                    backgroundColor: 'transparent'
                  }}
                />
                <Mail size={16} color="var(--color-ink-mute)" />
              </div>
            </div>

            {/* Create Secret PIN */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>
                  Create Secret PIN
                </label>
                <span className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>4-6 digits</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--color-hairline-input)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 10px',
                backgroundColor: '#ffffff'
              }}>
                <input
                  type="password"
                  placeholder="e.g. 1234 or 2026"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value)}
                  required
                  maxLength={6}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '8px 2px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.15em',
                    color: 'var(--color-ink)',
                    backgroundColor: 'transparent'
                  }}
                />
                <KeyRound size={16} color="var(--color-ink-mute)" />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-ink-mute)', marginTop: '3px' }}>
                Use this PIN to login without SMS.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !regFullName.trim() || !regEmail.trim() || regPin.length < 4}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                marginTop: '4px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Creating Pass...
                </>
              ) : (
                <>
                  Create Account & Get Pass <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div style={{
        maxWidth: '1180px',
        margin: '0 auto',
        padding: '36px 20px 64px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '40px',
        alignItems: 'center'
      }}>
        {/* Left Column: Product Story, Why We Built It, Value Pillars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(83, 58, 253, 0.08)',
              border: '1px solid rgba(83, 58, 253, 0.2)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-primary)',
              marginBottom: '14px'
            }}>
              <Sparkles size={13} />
              <span>Modern Mess & Dining Hall Operating System</span>
            </div>
            <h1 style={{
              fontSize: '38px',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.8px',
              color: 'var(--color-ink)'
            }}>
              Digitize Your Mess.<br />
              <span style={{ color: 'var(--color-primary)' }}>Stop Kitchen Food Waste.</span>
            </h1>
            <p style={{
              fontSize: '15px',
              color: 'var(--color-ink-mute)',
              lineHeight: 1.6,
              marginTop: '12px',
              maxWidth: '500px'
            }}>
              Thali.com replaces lost paper meal cards with instant QR dining passes, real-time kitchen headcount forecasting, and an auditable ledger for 400+ members.
            </p>
          </div>

          {/* 3 High Impact Feature Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <QrCode size={19} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  1-Second QR Dining Pass
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '2px', lineHeight: 1.4 }}>
                  Students present their dynamic QR pass or scan the counter standee. Anti-duplicate policy stops double-dipping.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <ChefHat size={19} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  Kitchen Headcount & Leave RSVP
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '2px', lineHeight: 1.4 }}>
                  Students mark "Going out / Skip" before cutoff. Kitchen cooks exact plates, saving ₹15k–₹30k in wasted groceries monthly.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <Shield size={19} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  Strict RBAC & Financial Ledger
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '2px', lineHeight: 1.4 }}>
                  Automated subscription expiry, UPI and Cash payment reconciliation, and granular staff vs. owner permissions.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Demo Launch Callout */}
          <div style={{
            padding: '16px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-hairline)',
            boxShadow: 'var(--shadow-level-1)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Instant Sandbox Mode
            </span>
            <p style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 500, marginTop: '2px', marginBottom: '10px' }}>
              Want to test the app right now without an account?
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onLoginSuccess(DEMO_MEMBER)}
                className="btn btn-primary btn-pill"
                style={{ fontSize: '12px', padding: '6px 14px', gap: '6px' }}
              >
                <span>🎓</span> Try as Student
              </button>
              <button
                type="button"
                onClick={() => onLoginSuccess(DEMO_RECEPTIONIST)}
                className="btn btn-secondary btn-pill"
                style={{ fontSize: '12px', padding: '6px 14px', gap: '6px' }}
              >
                <span>⚡</span> Frontdesk Scanner
              </button>
              <button
                type="button"
                onClick={() => onLoginSuccess(DEMO_ADMIN)}
                className="btn btn-secondary btn-pill"
                style={{ fontSize: '12px', padding: '6px 14px', gap: '6px' }}
              >
                <span>👑</span> Mess Owner
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In / Registration Card */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 37, 61, 0.45)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      {cardContent}
    </div>
  );
};
