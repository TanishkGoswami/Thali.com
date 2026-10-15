import { useState } from 'react';
import { Phone, CheckCircle2, AlertCircle, X, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { sendPaymentVerificationOtp, verifyPaymentPhoneAndActivate } from '../lib/auth';
import type { Profile } from '../types';
import confetti from 'canvas-confetti';

interface PaymentActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Profile & { remaining_meals?: number; subscription_status?: string };
  onSuccess: () => void;
}

export const PaymentActivationModal: React.FC<PaymentActivationModalProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess
}) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phone, setPhone] = useState(member.phone || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Send Fast2SMS OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPaymentVerificationOtp(clean);
      if (res.isSimulated && res.devCode) {
        setSimulatedCode(res.devCode);
      } else {
        setSimulatedCode(null);
      }
      setStep('otp');
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setErrorMsg(err.message || 'Failed to send OTP SMS.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP & Activate 54 Meals
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (otp.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit OTP code received on your phone.');
      return;
    }

    setLoading(true);
    try {
      await verifyPaymentPhoneAndActivate(member.id, phone, otp);
      setStep('success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Activation error:', err);
      setErrorMsg(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

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
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        width: '100%',
        maxWidth: '460px',
        boxShadow: 'var(--shadow-elevation)',
        border: '1px solid var(--color-hairline)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 18px',
          borderBottom: '1px solid var(--color-hairline)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--color-ink)'
              }}>
                Activate Monthly Pass
              </span>
              <span className="badge" style={{ backgroundColor: 'var(--color-moss)', color: '#FFFFFF', fontSize: '11px' }}>
                ₹2,800 • 54 Meals
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-ash)', marginTop: '4px' }}>
              Verify your official phone number via SMS to activate your meal quota
            </p>
          </div>

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

          {step === 'phone' && (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-canvas)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--color-stone)',
                lineHeight: 1.4
              }}>
                ℹ️ <strong>One-Time Phone Verification:</strong> We send an OTP SMS only once during subscription activation so the mess has your verified contact for renewals.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                  Mobile Phone Number
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1.5px solid var(--color-hairline)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2px 12px',
                  backgroundColor: '#FFFFFF'
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                      color: 'var(--color-ink)'
                    }}
                  />
                  <Phone size={18} color="var(--color-ash)" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.replace(/\D/g, '').length < 10}
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
                  gap: '8px'
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Sending SMS OTP...
                  </>
                ) : (
                  <>
                    Send OTP to Phone <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {simulatedCode && (
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(212, 160, 23, 0.1)',
                  border: '1px solid rgba(212, 160, 23, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-ink)' }}>
                    ⚡ <strong>OTP Code:</strong> <strong>{simulatedCode}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(simulatedCode)}
                    className="btn btn-pill"
                    style={{
                      backgroundColor: 'var(--color-gold)',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      padding: '3px 8px'
                    }}
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                  Enter 6-Digit OTP received on +91 {phone.replace(/\D/g, '').slice(-10)}
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

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-stone)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Change Number
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Resend OTP
                </button>
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
                    <RefreshCw size={16} className="animate-spin" /> Verifying & Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Verify Phone & Activate Plan
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '24px 8px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(74, 93, 79, 0.12)',
                color: 'var(--color-moss)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <ShieldCheck size={36} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--color-ink)', marginBottom: '8px' }}>
                Plan Successfully Activated!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-ash)', marginBottom: '16px' }}>
                Phone verified & 54 Meals granted for 30 days. Your digital QR pass is now ready to scan!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
