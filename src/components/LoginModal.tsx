import { useState } from 'react';
import { Lock, Mail, User, ArrowRight, RefreshCw, AlertCircle, X, KeyRound, Utensils } from 'lucide-react';
import { loginWithEmailOrIdAndPin, registerNewMember, getTestProfileByNumber, saveLocalSession } from '../lib/auth';
import type { Profile } from '../types';

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

  // Handle Quick Test Login (for instant evaluation)
  const handleQuickTestLogin = async (memberNumber: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const profile = await getTestProfileByNumber(memberNumber);
      if (profile) {
        saveLocalSession(profile.id);
        onLoginSuccess(profile);
        if (onClose) onClose();
      } else {
        setErrorMsg(`Test account ${memberNumber} not found.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading test account.');
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
      boxShadow: 'var(--shadow-modal)',
      border: '1px solid var(--color-hairline)',
      overflow: 'hidden',
      animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '28px 24px 20px',
        borderBottom: '1px solid var(--color-hairline)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              backgroundColor: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Utensils size={15} />
            </div>
            <span style={{
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '-0.4px',
              color: 'var(--color-ink)'
            }}>
              Thali<span style={{ color: 'var(--color-primary)' }}>.com</span>
            </span>
            </div>
        
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
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Segmented Pill Tabs */}
      <div style={{
        padding: '12px 24px 0',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          display: 'flex',
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
              fontSize: '13px',
              fontWeight: tab === 'signin' ? 500 : 400
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
              fontSize: '13px',
              fontWeight: tab === 'register' ? 500 : 400
            }}
          >
            New Member
          </button>
        </div>
      </div>

      {/* Content Form Body */}
      <div style={{ padding: '20px 24px 28px' }}>
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '10px 12px',
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--color-error)'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email or Member ID */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px' }}>
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
                    fontSize: '14px',
                    color: 'var(--color-ink)',
                    backgroundColor: 'transparent'
                  }}
                />
                <Mail size={16} color="var(--color-ink-mute)" />
              </div>
            </div>

            {/* Secret PIN / Access Code */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>
                  Secret PIN / Access Code
                </label>
                <span className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>Default: 1234</span>
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
                    fontSize: '15px',
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
                marginTop: '6px',
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
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px' }}>
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
                  placeholder="e.g. Tanishk Goswami"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  required
                  autoFocus
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '8px 2px',
                    fontSize: '14px',
                    color: 'var(--color-ink)',
                    backgroundColor: 'transparent'
                  }}
                />
                <User size={16} color="var(--color-ink-mute)" />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px' }}>
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
                  placeholder="e.g. tanishk@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '8px 2px',
                    fontSize: '14px',
                    color: 'var(--color-ink)',
                    backgroundColor: 'transparent'
                  }}
                />
                <Mail size={16} color="var(--color-ink-mute)" />
              </div>
            </div>

            {/* Create PIN */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px' }}>
                Create 4-Digit Secret PIN
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
                    fontSize: '15px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.15em',
                    color: 'var(--color-ink)',
                    backgroundColor: 'transparent'
                  }}
                />
                <KeyRound size={16} color="var(--color-ink-mute)" />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-ink-mute)', marginTop: '4px' }}>
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
                marginTop: '6px',
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

        {/* Staff & Pre-Seeded Accounts */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-hairline)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <span className="eyebrow" style={{ fontSize: '10px' }}>
              Quick Evaluation Access
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickTestLogin('REC-01')}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'left',
                display: 'block'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)' }}>Ramesh Patel</div>
              <div className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>Reception Staff • 1234</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickTestLogin('ADMIN-01')}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'left',
                display: 'block'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)' }}>Mess Owner</div>
              <div className="tnum" style={{ fontSize: '11px', color: 'var(--color-primary)' }}>Admin Console • 1234</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        padding: '32px 16px'
      }}>
        {cardContent}
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
