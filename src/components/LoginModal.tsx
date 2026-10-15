import React, { useState, useEffect } from 'react';
import { Phone, ArrowRight, RefreshCw, AlertCircle, X, User, Mail, CheckCircle2 } from 'lucide-react';
import { sendPhoneOtp, verifyPhoneOtp, getTestProfileByNumber, saveLocalSession } from '../lib/auth';
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
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPhoneOtp(clean, fullName, email);
      if (res.isSimulated && res.devCode) {
        setSimulatedCode(res.devCode);
      } else {
        setSimulatedCode(null);
      }
      setStep('otp');
      setResendCooldown(30);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setErrorMsg(err.message || 'Failed to send OTP. Please check the number.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (otp.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit OTP code received on your phone.');
      return;
    }

    setLoading(true);
    try {
      const { profile } = await verifyPhoneOtp(phoneNumber, otp, fullName, email);
      onLoginSuccess(profile);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setErrorMsg(err.message || 'Invalid or expired OTP. Please check and try again.');
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
        setErrorMsg(`Test account ${memberNumber} not found in database.`);
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
      maxWidth: '460px',
      boxShadow: embedded ? 'var(--shadow-elevation)' : 'var(--shadow-elevation)',
      border: '1px solid var(--color-hairline)',
      overflow: 'hidden',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Header */}
      <div style={{
        padding: '28px 24px 20px',
        borderBottom: '1px solid var(--color-hairline)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 500,
              color: 'var(--color-ink)'
            }}>
              Thali<span style={{ color: 'var(--color-gold)' }}>.com</span>
            </span>
            <span className="badge" style={{ backgroundColor: 'var(--color-surface)', fontSize: '11px' }}>
              Member Access
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-ash)', marginTop: '4px' }}>
            {step === 'phone'
              ? 'Sign in or register with your mobile phone number'
              : `Enter 6-digit verification code sent to +91 ${phoneNumber.replace(/\D/g, '').slice(-10)}`}
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

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Mobile Phone Number */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Mobile Phone Number <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--color-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '2px 12px',
                backgroundColor: '#FFFFFF',
                transition: 'border-color 0.15s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  paddingRight: '10px',
                  borderRight: '1px solid var(--color-hairline)',
                  color: 'var(--color-stone)',
                  fontSize: '14px',
                  fontWeight: 600
                }}>
                  <span>🇮🇳</span> +91
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  autoFocus
                  maxLength={14}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '10px 12px',
                    fontSize: '16px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-ink)',
                    letterSpacing: '0.04em'
                  }}
                />
                <Phone size={18} color="var(--color-ash)" />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Your Full Name <span style={{ fontWeight: 400, color: 'var(--color-ash)' }}>(for digital pass)</span>
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
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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

            {/* Email Address (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Email Address <span style={{ fontWeight: 400, color: 'var(--color-ash)' }}>(Optional - for invoices & updates)</span>
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
                  placeholder="e.g. name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

            <button
              type="submit"
              disabled={loading || phoneNumber.replace(/\D/g, '').length < 10}
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
                  <RefreshCw size={16} className="animate-spin" /> Sending SMS OTP...
                </>
              ) : (
                <>
                  Send Verification Code <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {simulatedCode && (
              <div style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(212, 160, 23, 0.1)',
                border: '1px solid rgba(212, 160, 23, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ fontSize: '13px', color: 'var(--color-ink)' }}>
                  ⚡ <strong>Verification OTP:</strong> <strong>{simulatedCode}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(simulatedCode)}
                  className="btn btn-pill"
                  style={{
                    backgroundColor: 'var(--color-gold)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    cursor: 'pointer'
                  }}
                >
                  Auto-fill {simulatedCode}
                </button>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Enter 6-Digit OTP Received on Mobile
              </label>
              <input
                type="text"
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '24px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.4em',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--color-hairline)',
                  outline: 'none',
                  color: 'var(--color-ink)',
                  backgroundColor: '#FAFAF8'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-stone)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textDecoration: 'underline'
                }}
              >
                Change Mobile Number
              </button>

              {resendCooldown > 0 ? (
                <span style={{ color: 'var(--color-ash)' }}>Resend in {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Resend SMS
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Verify & Access Meal Pass
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick Staff Accounts */}
        <div style={{
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid var(--color-hairline)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ash)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Staff & Pre-Seeded Accounts
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
              Quick Login
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
              <div style={{ fontSize: '10px', color: 'var(--color-ash)' }}>Receptionist Scanner</div>
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
              <div style={{ fontSize: '10px', color: 'var(--color-gold)' }}>Full Admin Console</div>
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
