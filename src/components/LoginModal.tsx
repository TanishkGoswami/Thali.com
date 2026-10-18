import React, { useState } from 'react';
import { Lock, Mail, User, ArrowRight, RefreshCw, AlertCircle, X, Sparkles, QrCode, ChefHat, Shield, Send, ChevronRight } from 'lucide-react';
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
  // Mode: 'sandbox' (1-click demo personas) vs 'auth' (real credentials)
  const [activeMode, setActiveMode] = useState<'sandbox' | 'auth'>(embedded ? 'sandbox' : 'auth');
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  
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
      borderRadius: '20px',
      width: '100%',
      maxWidth: '440px',
      boxShadow: '0 20px 48px -12px rgba(13, 37, 61, 0.12), 0 0 0 1px var(--color-hairline)',
      overflow: 'hidden',
      animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Top Segmented Mode Switcher */}
      <div style={{
        padding: '16px 18px 0',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--color-hairline)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
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
              onClick={() => { setActiveMode('sandbox'); setErrorMsg(null); }}
              className="btn btn-pill"
              style={{
                flex: 1,
                backgroundColor: activeMode === 'sandbox' ? '#ffffff' : 'transparent',
                color: activeMode === 'sandbox' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: activeMode === 'sandbox' ? 'var(--shadow-level-1)' : 'none',
                fontSize: '12px',
                fontWeight: activeMode === 'sandbox' ? 600 : 500,
                padding: '6px 10px',
                gap: '5px'
              }}
            >
              <Sparkles size={13} color="var(--color-primary)" />
              <span>Interactive Demo</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveMode('auth'); setErrorMsg(null); }}
              className="btn btn-pill"
              style={{
                flex: 1,
                backgroundColor: activeMode === 'auth' ? '#ffffff' : 'transparent',
                color: activeMode === 'auth' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: activeMode === 'auth' ? 'var(--shadow-level-1)' : 'none',
                fontSize: '12px',
                fontWeight: activeMode === 'auth' ? 600 : 500,
                padding: '6px 10px',
                gap: '5px'
              }}
            >
              <Lock size={13} />
              <span>Sign In</span>
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
                marginLeft: '8px',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: 1-Click Interactive Demo Sandbox Hub */}
      {activeMode === 'sandbox' ? (
        <div style={{ padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.3px' }}>
              Instant Sandbox Experience
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '3px', lineHeight: 1.4 }}>
              Select a persona below to explore live features with real demo data — no password required:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Student Persona Card */}
            <button
              type="button"
              onClick={() => onLoginSuccess(DEMO_MEMBER)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--color-hairline)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 76, 37, 0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-hairline)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-subdued)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0
              }}>
                🎓
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    Student / Diner
                  </span>
                  <span className="badge" style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-canvas-soft)', color: 'var(--color-ink-mute)', border: '1px solid var(--color-hairline)' }}>
                    M-101
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', lineHeight: 1.3, margin: 0 }}>
                  Live dynamic QR pass, daily mess menus, and meal skip RSVP.
                </p>
              </div>
              <ChevronRight size={16} color="var(--color-ink-mute)" />
            </button>

            {/* Frontdesk Scanner Persona Card */}
            <button
              type="button"
              onClick={() => onLoginSuccess(DEMO_RECEPTIONIST)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--color-hairline)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 76, 37, 0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-hairline)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0
              }}>
                ⚡
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    Counter Scanner Terminal
                  </span>
                  <span className="badge" style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: '#e6fffa', color: '#047857', border: '1px solid #b2f5ea' }}>
                    Staff
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', lineHeight: 1.3, margin: 0 }}>
                  High-speed QR camera scanner, instant verification, and live diner counter.
                </p>
              </div>
              <ChevronRight size={16} color="var(--color-ink-mute)" />
            </button>

            {/* Mess Owner Persona Card */}
            <button
              type="button"
              onClick={() => onLoginSuccess(DEMO_ADMIN)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--color-hairline)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 76, 37, 0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-hairline)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0
              }}>
                👑
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    Mess Owner & Admin
                  </span>
                  <span className="badge" style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' }}>
                    Supervisor
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', lineHeight: 1.3, margin: 0 }}>
                  Kitchen headcount forecast, member dues ledger, and plan subscriptions.
                </p>
              </div>
              <ChevronRight size={16} color="var(--color-ink-mute)" />
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '6px',
            borderTop: '1px solid var(--color-hairline)'
          }}>
            <button
              type="button"
              onClick={() => setActiveMode('auth')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Have a registered account? Sign In <ArrowRight size={12} />
            </button>
          </div>
        </div>
      ) : (
        /* Mode 2: Member & Staff Sign In / Registration */
        <div style={{ padding: '20px 22px 24px' }}>
          {/* Sub-tab switcher: Sign In vs New Member */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--color-canvas-soft)',
            padding: '3px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-hairline)',
            marginBottom: '16px'
          }}>
            <button
              type="button"
              onClick={() => { setAuthTab('signin'); setErrorMsg(null); }}
              className="btn btn-pill"
              style={{
                flex: 1,
                backgroundColor: authTab === 'signin' ? '#ffffff' : 'transparent',
                color: authTab === 'signin' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: authTab === 'signin' ? 'var(--shadow-level-1)' : 'none',
                fontSize: '12px',
                fontWeight: authTab === 'signin' ? 600 : 400,
                padding: '6px'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthTab('register'); setErrorMsg(null); }}
              className="btn btn-pill"
              style={{
                flex: 1,
                backgroundColor: authTab === 'register' ? '#ffffff' : 'transparent',
                color: authTab === 'register' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: authTab === 'register' ? 'var(--shadow-level-1)' : 'none',
                fontSize: '12px',
                fontWeight: authTab === 'register' ? 600 : 400,
                padding: '6px'
              }}
            >
              New Member
            </button>
          </div>

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

          {authTab === 'signin' ? (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '5px' }}>
                  Email Address or Member ID
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-hairline-input)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 12px',
                  backgroundColor: '#ffffff'
                }}>
                  <input
                    type="text"
                    placeholder="e.g. M-112 or tanishk@gmail.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      padding: '8px 0',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      backgroundColor: 'transparent'
                    }}
                  />
                  <Mail size={16} color="var(--color-ink-mute)" />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    Secret PIN / Access Code
                  </label>
                  <span className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>4-digit PIN</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-hairline-input)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 12px',
                  backgroundColor: '#ffffff'
                }}>
                  <input
                    type="password"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    maxLength={8}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      padding: '8px 0',
                      fontSize: '15px',
                      letterSpacing: '0.15em',
                      color: 'var(--color-ink)',
                      backgroundColor: 'transparent'
                    }}
                  />
                  <Lock size={16} color="var(--color-ink-mute)" />
                </div>
              </div>

              <div style={{
                fontSize: '11px',
                color: 'var(--color-ink-mute)',
                backgroundColor: 'var(--color-canvas-soft)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>💡</span>
                <span>Demo account PIN is <strong>1234</strong></span>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier.trim() || !pin.trim()}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
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
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '5px' }}>
                  Full Name
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-hairline-input)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 12px',
                  backgroundColor: '#ffffff'
                }}>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      padding: '8px 0',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      backgroundColor: 'transparent'
                    }}
                  />
                  <User size={16} color="var(--color-ink-mute)" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '5px' }}>
                  Email Address
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-hairline-input)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 12px',
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
                      padding: '8px 0',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      backgroundColor: 'transparent'
                    }}
                  />
                  <Mail size={16} color="var(--color-ink-mute)" />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    Create 4-Digit Secret PIN
                  </label>
                  <span className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>Used to sign in</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-hairline-input)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 12px',
                  backgroundColor: '#ffffff'
                }}>
                  <input
                    type="password"
                    placeholder="••••"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    required
                    maxLength={8}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      padding: '8px 0',
                      fontSize: '15px',
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
                disabled={loading || !regFullName.trim() || !regEmail.trim() || !regPin.trim()}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
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

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-hairline)'
          }}>
            <button
              type="button"
              onClick={() => setActiveMode('sandbox')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-ink-mute)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Want to test without an account?</span>
              <strong style={{ color: 'var(--color-primary)' }}>Try Interactive Demo</strong>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div style={{
        maxWidth: '1180px',
        margin: '0 auto',
        padding: '48px 20px 80px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '48px',
        alignItems: 'center'
      }}>
        {/* Left Column: Authoritative Product Narrative */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-primary-subdued)',
              border: '1px solid var(--color-primary-border)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-primary)',
              marginBottom: '16px'
            }}>
              <Sparkles size={13} />
              <span>Modern Dining Hall & Mess Automation</span>
            </div>
            
            <h1 style={{
              fontSize: 'clamp(32px, 4vw, 46px)',
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: '-1.2px',
              color: 'var(--color-ink)',
              margin: 0
            }}>
              Digitize Your Dining Hall.<br />
              <span style={{ color: 'var(--color-primary)' }}>Stop Kitchen Food Waste.</span>
            </h1>

            <p style={{
              fontSize: '16px',
              color: 'var(--color-ink-mute)',
              lineHeight: 1.6,
              marginTop: '16px',
              maxWidth: '520px'
            }}>
              Thali.com replaces lost paper coupons with dynamic anti-duplicate QR passes, live Telegram meal RSVPs, and automated kitchen headcount forecasting — trusted by hostels, PGs, and corporate mess halls.
            </p>
          </div>

          {/* 3 High-Impact Feature Bento Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'flex',
              gap: '14px',
              padding: '14px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-level-1)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-subdued)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <QrCode size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                  1-Second QR Dining Pass
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '3px', lineHeight: 1.4, margin: 0 }}>
                  Students present their auto-refreshing QR pass. Anti-duplicate policy stops screenshot sharing and double dipping.
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '14px',
              padding: '14px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-level-1)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ChefHat size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                  Kitchen Headcount & Leave RSVP
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '3px', lineHeight: 1.4, margin: 0 }}>
                  Students tap "Skip / Attend" on Telegram before daily cutoff. Kitchen cooks exact portions, saving ₹15k–₹30k in wasted groceries monthly.
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '14px',
              padding: '14px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-level-1)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#f5f3ff',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Shield size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                  Strict RBAC & Financial Ledger
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '3px', lineHeight: 1.4, margin: 0 }}>
                  Automated subscription validity, cash & UPI reconciliation, tamper-proof meal countdown audits, and separated staff vs. owner permissions.
                </p>
              </div>
            </div>
          </div>

          {/* Connected Telegram Bot Callout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Send size={16} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0369a1' }}>
                  Telegram Bot Active: @ThaliMessBot
                </div>
                <div style={{ fontSize: '11px', color: '#0284c7' }}>
                  Students check menus & mark attendance directly from Telegram
                </div>
              </div>
            </div>
            <a
              href="https://t.me/ThaliMessBot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-pill"
              style={{
                fontSize: '12px',
                padding: '5px 12px',
                backgroundColor: '#ffffff',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Open Bot →
            </a>
          </div>
        </div>

        {/* Right Column: Unified Interactive Card */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {cardContent}
        </div>
      </div>
    );
  }

  // Popup Modal Mode (for switching persona or logging in while in demo)
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 37, 61, 0.45)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
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
