import { useState } from 'react';
import { Phone, CheckCircle2, AlertCircle, X, RefreshCw, ArrowRight, ShieldCheck, Utensils, Clock } from 'lucide-react';
import { sendPaymentVerificationOtp, verifyPaymentPhoneAndActivate } from '../lib/auth';
import type { Profile, MealPlanType } from '../types';
import { MEAL_PLAN_CONFIG } from '../types';
import confetti from 'canvas-confetti';

interface PaymentActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Profile & { remaining_meals?: number; subscription_status?: string; payment_method?: 'cash' | 'upi_direct' };
  onSuccess: () => void;
}

export const PaymentActivationModal: React.FC<PaymentActivationModalProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess
}) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlanType>(member.meal_plan_type || 'lunch_dinner');
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

    if (member.subscription_status !== 'active') {
      setErrorMsg('Payment not verified by Mess Admin. Please pay ₹2,800 at the counter first. Admin will activate your pass to unlock OTP verification.');
      return;
    }

    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPaymentVerificationOtp(clean, member.id);
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
      await verifyPaymentPhoneAndActivate(member.id, phone, otp, selectedMealPlan);
      setStep('success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
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
      backgroundColor: 'rgba(13, 37, 61, 0.45)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        width: '100%',
        maxWidth: '440px',
        boxShadow: 'var(--shadow-modal)',
        border: '1px solid var(--color-hairline)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
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
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' }}>
                Activate Monthly Pass
              </h3>
              <span className="badge badge-active tnum" style={{ fontSize: '11px' }}>
                ₹2,800 • 54 Meals
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '4px' }}>
              Verify mobile number once to authorize your digital pass
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-pill"
            style={{
              padding: '6px',
              border: 'none',
              color: 'var(--color-ink-mute)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
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

          {step === 'phone' && (
            member.subscription_status !== 'active' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-md)',
                  color: '#92400e',
                  fontSize: '13px',
                  lineHeight: 1.5
                }}>
                  <strong>🔒 Payment Required Before OTP:</strong>
                  <p style={{ marginTop: '6px' }}>
                    Aapki monthly mess fee (₹2,800) pending hai. Kripya mess counter par jakar <strong>Cash ya UPI (Online)</strong> se payment karein. Admin dwara payment confirm karne ke baad hi OTP verification unlock hoga.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary btn-pill"
                  style={{ width: '100%', padding: '10px' }}
                >
                  Close & Pay at Mess Counter
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-success-bg)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-success-border)',
                  fontSize: '13px',
                  color: 'var(--color-success)',
                  lineHeight: 1.45,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Payment Confirmed ({member.payment_method === 'cash' ? '💵 Cash' : '📱 Online / UPI'}):</strong> Select your 2-meal daily timing & verify phone via OTP.
                  </div>
                </div>

                {/* Step 1: 2-Meal Timing Selection */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      1. Choose 2-Meal Timings / भोजन समय चुनें: <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 500 }}>
                      2 Meals / Day
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {(Object.keys(MEAL_PLAN_CONFIG) as MealPlanType[]).map((key) => {
                      const plan = MEAL_PLAN_CONFIG[key];
                      const isSelected = selectedMealPlan === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedMealPlan(key)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: '10px',
                            borderRadius: 'var(--radius-md)',
                            border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
                            backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600,
                            fontSize: '12px',
                            color: isSelected ? 'var(--color-primary)' : 'var(--color-ink)'
                          }}>
                            <Utensils size={12} /> {plan.hindiName}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: isSelected ? 'var(--color-ink)' : 'var(--color-ink-secondary)', marginTop: '2px' }}>
                            {plan.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--color-ink-mute)', marginTop: '4px' }}>
                            <Clock size={10} />
                            <span className="truncate-text" style={{ maxWidth: '140px' }}>{plan.timeSlotsText}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: 'var(--color-ink-mute)',
                    backgroundColor: 'var(--color-canvas-soft)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-hairline)'
                  }}>
                    ℹ️ <strong>Rule:</strong> Aapka subscription strictly chune gaye 2 sessions me hi chalega. Dusre slot me QR scan nahi hoga.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '6px' }}>
                    2. Mobile Phone Number for OTP: <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-hairline-input)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 10px',
                  backgroundColor: '#ffffff'
                }}>
                  <div className="tnum" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    paddingRight: '8px',
                    borderRight: '1px solid var(--color-hairline)',
                    color: 'var(--color-ink-mute)',
                    fontSize: '13px',
                    fontWeight: 500
                  }}>
                    +91
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
                      padding: '8px 10px',
                      fontSize: '15px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-ink)',
                      backgroundColor: 'transparent'
                    }}
                  />
                  <Phone size={16} color="var(--color-ink-mute)" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.replace(/\D/g, '').length < 10}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Sending SMS OTP...
                  </>
                ) : (
                  <>
                    Send OTP to Phone <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          ))}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {simulatedCode && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-warning-bg)',
                  border: '1px solid var(--color-warning-border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div className="tnum" style={{ fontSize: '12px', color: 'var(--color-ink)' }}>
                    OTP Code: <strong>{simulatedCode}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(simulatedCode)}
                    className="btn btn-pill"
                    style={{
                      backgroundColor: 'var(--color-warning)',
                      color: '#ffffff',
                      fontSize: '11px',
                      padding: '2px 8px'
                    }}
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px' }}>
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
                    padding: '12px 16px',
                    fontSize: '22px',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.3em',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-hairline-input)',
                    outline: 'none',
                    color: 'var(--color-ink)',
                    backgroundColor: 'var(--color-canvas-soft)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-ink-mute)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Change Number
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 500 }}
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
                  padding: '10px',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '6px'
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Verify Phone & Activate Plan
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '24px 8px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '6px' }}>
                Pass Activated!
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginBottom: '16px' }}>
                Phone verified & 54 Meals granted for 30 days. Your digital QR pass is ready to scan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
