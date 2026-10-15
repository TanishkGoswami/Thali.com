import { useState } from 'react';
import { Lock, Mail, User, ArrowRight, RefreshCw, AlertCircle, X, KeyRound } from 'lucide-react';
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

  // Handle Quick Test Login (for instant testing)
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
      backgroundColor: '#FFFFFF',
      borderRadius: 'var(--radius-xl)',
      width: '100%',
      maxWidth: '440px',
      boxShadow: 'var(--shadow-elevation)',
      border: '1px solid var(--color-hairline)',
      overflow: 'hidden',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px 24px 16px',
        borderBottom: '1px solid var(--color-hairline)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '26px',
              fontWeight: 500,
              color: 'var(--color-ink)'
            }}>
              Thali<span style={{ color: 'var(--color-gold)' }}>.com</span>
            </span>
            <span className="badge" style={{ backgroundColor: 'var(--color-surface)', fontSize: '11px' }}>
              Mess Portal
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-ash)', marginTop: '4px' }}>
            {tab === 'signin'
              ? 'Sign in with your Email & secret Access PIN'
              : 'Register for a digital meal pass & 54-meal quota'}
          </p>
        </div>

        {allowClose && onClose && !embedded && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ash)',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-hairline)',
        backgroundColor: 'var(--color-canvas)'
      }}>
        <button
          type="button"
          onClick={() => { setTab('signin'); setErrorMsg(null); }}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: tab === 'signin' ? '#FFFFFF' : 'transparent',
            fontWeight: 600,
            fontSize: '13px',
            color: tab === 'signin' ? 'var(--color-ink)' : 'var(--color-ash)',
            borderBottom: tab === 'signin' ? '2px solid var(--color-stone)' : 'none',
            cursor: 'pointer'
          }}
        >
          Sign In (Everyday Access)
        </button>
        <button
          type="button"
          onClick={() => { setTab('register'); setErrorMsg(null); }}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: tab === 'register' ? '#FFFFFF' : 'transparent',
            fontWeight: 600,
            fontSize: '13px',
            color: tab === 'register' ? 'var(--color-ink)' : 'var(--color-ash)',
            borderBottom: tab === 'register' ? '2px solid var(--color-stone)' : 'none',
            cursor: 'pointer'
          }}
        >
          New Member Sign-Up
        </button>
      </div>

      {/* Content Body */}
      <div style={{ padding: '24px' }}>
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            backgroundColor: 'rgba(217, 83, 79, 0.08)',
            border: '1px solid rgba(217, 83, 79, 0.3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '18px',
            fontSize: '13px',
            color: '#d9534f'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email or Member ID */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Email Address or Member ID
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--color-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '2px 12px',
                backgroundColor: '#FFFFFF'
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
                    padding: '10px 4px',
                    fontSize: '14px',
                    color: 'var(--color-ink)'
                  }}
                />
                <Mail size={18} color="var(--color-ash)" />
              </div>
            </div>

            {/* Secret PIN / Access Code */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  Secret PIN / Access Code
                </label>
                <span style={{ fontSize: '11px', color: 'var(--color-ash)' }}>Default: 1234</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--color-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '2px 12px',
                backgroundColor: '#FFFFFF'
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
                    padding: '10px 4px',
                    fontSize: '16px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.2em',
                    color: 'var(--color-ink)'
                  }}
                />
                <Lock size={18} color="var(--color-ash)" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !identifier.trim() || !pin.trim()}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 600,
                marginTop: '6px',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Signing In...
                </>
              ) : (
                <>
                  Access Meal Pass <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Full Name
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--color-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '2px 12px',
                backgroundColor: '#FFFFFF'
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
                    padding: '10px 4px',
                    fontSize: '14px',
                    color: 'var(--color-ink)'
                  }}
                />
                <User size={18} color="var(--color-ash)" />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Email Address (used for everyday login)
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--color-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '2px 12px',
                backgroundColor: '#FFFFFF'
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
                    padding: '10px 4px',
                    fontSize: '14px',
                    color: 'var(--color-ink)'
                  }}
                />
                <Mail size={18} color="var(--color-ash)" />
              </div>
            </div>

            {/* Create PIN */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Create 4-Digit Secret PIN
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--color-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '2px 12px',
                backgroundColor: '#FFFFFF'
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
                    padding: '10px 4px',
                    fontSize: '16px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.2em',
                    color: 'var(--color-ink)'
                  }}
                />
                <KeyRound size={18} color="var(--color-ash)" />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-ash)', marginTop: '4px' }}>
                You will use this PIN with your email to log in every day without needing an SMS.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !regFullName.trim() || !regEmail.trim() || regPin.length < 4}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 600,
                marginTop: '6px',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Creating Pass...
                </>
              ) : (
                <>
                  Create Account & Get Pass <ArrowRight size={16} />
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
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ash)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Staff & Pre-Seeded Quick Access
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickTestLogin('REC-01')}
              disabled={loading}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-hairline)',
                backgroundColor: 'var(--color-canvas)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' }}>Ramesh Patel</div>
              <div style={{ fontSize: '10px', color: 'var(--color-ash)' }}>Receptionist • PIN: 1234</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickTestLogin('ADMIN-01')}
              disabled={loading}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-hairline)',
                backgroundColor: 'var(--color-canvas)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' }}>Mess Owner</div>
              <div style={{ fontSize: '10px', color: 'var(--color-gold)' }}>Admin Console • PIN: 1234</div>
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
      backgroundColor: 'rgba(17, 19, 18, 0.75)',
      backdropFilter: 'blur(8px)',
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
