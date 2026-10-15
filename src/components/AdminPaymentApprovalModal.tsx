import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Banknote, Smartphone, ShieldCheck, Loader2 } from 'lucide-react';
import type { Profile } from '../types';
import { api } from '../services/api';

interface AdminPaymentApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: (Profile & { remaining_meals?: number; subscription_status?: string }) | null;
  onSuccess: () => void;
}

export const AdminPaymentApprovalModal: React.FC<AdminPaymentApprovalModalProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi_direct'>('cash');
  const [referenceNotes, setReferenceNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.approveMemberPayment({
        memberId: member.id,
        paymentMethod,
        amountPaise: 280000,
        referenceNotes: referenceNotes.trim() || undefined
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || 'Failed to approve payment.');
      }
    } catch (err: any) {
      console.error('Error approving payment:', err);
      setErrorMsg(err.message || 'Error approving payment.');
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
      zIndex: 150,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        width: '100%',
        maxWidth: '460px',
        boxShadow: 'var(--shadow-modal)',
        border: '1px solid var(--color-hairline)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--color-hairline)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="eyebrow" style={{ color: 'var(--color-primary)' }}>Admin Action</span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '2px' }}>
              Approve Payment & Activate Member
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
              Mark monthly pass as received to unlock member's phone verification
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

        {/* Form Body */}
        <form onSubmit={handleConfirm} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              backgroundColor: 'var(--color-error-bg)',
              border: '1px solid var(--color-error-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              color: 'var(--color-error)'
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Member Details Capsule */}
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--color-canvas-soft)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-hairline)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span className="tnum badge badge-indigo truncate-text" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', maxWidth: '100px', display: 'block' }} title={member.member_number}>
                  {member.member_number}
                </span>
                <strong className="truncate-text" style={{ fontSize: '14px', color: 'var(--color-ink)', maxWidth: '180px', display: 'inline-block' }} title={member.full_name}>
                  {member.full_name}
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '4px' }}>
                {member.phone ? `Phone: +91 ${member.phone}` : 'No phone linked yet'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="tnum" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-success)' }}>
                ₹2,800
              </div>
              <span className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>
                54 Meals / 30 Days
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '8px' }}>
              Select Payment Mode Received: <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Cash Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${paymentMethod === 'cash' ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
                  backgroundColor: paymentMethod === 'cash' ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: paymentMethod === 'cash' ? 'var(--color-primary)' : 'var(--color-ink)'
                }}>
                  <Banknote size={16} /> Cash (Counter)
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)', marginTop: '4px' }}>
                  Cash received at mess desk
                </span>
              </button>

              {/* Online / UPI Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('upi_direct')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${paymentMethod === 'upi_direct' ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
                  backgroundColor: paymentMethod === 'upi_direct' ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: paymentMethod === 'upi_direct' ? 'var(--color-primary)' : 'var(--color-ink)'
                }}>
                  <Smartphone size={16} /> Online / UPI
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)', marginTop: '4px' }}>
                  GPay / PhonePe / Paytm / QR
                </span>
              </button>
            </div>
          </div>

          {/* Reference Notes (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>
              Reference / Notes (Optional)
            </label>
            <input
              type="text"
              value={referenceNotes}
              onChange={(e) => setReferenceNotes(e.target.value)}
              placeholder={paymentMethod === 'cash' ? 'e.g. Counter Cash Box 1' : 'e.g. UPI Ref #409823...'}
              className="form-input"
              style={{ fontSize: '13px' }}
            />
          </div>

          {/* Cost Protection Notice */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '10px 12px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            color: '#1e40af',
            lineHeight: 1.4
          }}>
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#2563eb' }} />
            <div>
              <strong>SMS OTP Protection:</strong> Once activated, this member will be authorized to request 1 SMS OTP to verify their phone number. Zero SMS will be wasted on unpaid accounts.
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="btn btn-outline btn-pill"
              style={{ fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-pill"
              style={{
                fontSize: '13px',
                padding: '8px 18px',
                gap: '6px'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Activating...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} /> Confirm & Activate (₹2,800)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
