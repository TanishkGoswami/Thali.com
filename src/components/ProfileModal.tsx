import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Save,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import type { Profile } from '../types';
import { api } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile & { remaining_meals?: number; subscription_status?: string; expires_at?: string };
  onLogout: () => void;
  onUpdateSuccess: (updated?: Partial<Profile>) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onUpdateSuccess
}) => {
  const [fullName, setFullName] = useState(currentUser.full_name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [pinCode, setPinCode] = useState((currentUser as any).pin_code || '');
  const [showPin, setShowPin] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const initials = currentUser.full_name
    ? currentUser.full_name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      setSaving(false);
      return;
    }

    if (pinCode && pinCode.length !== 4) {
      setErrorMsg('PIN must be exactly 4 digits.');
      setSaving(false);
      return;
    }

    try {
      const ok = await api.updateMemberProfile(currentUser.id, {
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() ? phone.replace(/\D/g, '').slice(-10) : undefined,
        pin_code: pinCode.trim()
      });

      if (ok) {
        setSuccessMsg('Profile updated successfully!');
        onUpdateSuccess({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() ? phone.replace(/\D/g, '').slice(-10) : undefined,
          pin_code: pinCode.trim()
        });
        setTimeout(() => {
          setSuccessMsg(null);
        }, 2500);
      } else {
        setErrorMsg('Failed to update profile details.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutClick = () => {
    onClose();
    onLogout();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 37, 61, 0.55)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 160,
      padding: '16px'
    }}>
      <div className="card animate-fade-in" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '24px',
        boxShadow: 'var(--shadow-modal)',
        position: 'relative',
        maxHeight: '94vh',
        overflowY: 'auto'
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline btn-pill"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '6px',
            border: 'none',
            color: 'var(--color-ink-mute)'
          }}
          title="Close profile"
        >
          <X size={18} />
        </button>

        {/* User Identity Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #533afd 0%, #4434d4 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(83, 58, 253, 0.25)',
            flexShrink: 0
          }}>
            {initials}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.2 }}>
                {currentUser.full_name}
              </h2>
              <span className="badge badge-indigo tnum" style={{ fontSize: '10px', padding: '1px 6px' }}>
                {currentUser.member_number}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
              {currentUser.role === 'owner_admin' ? (
                <strong style={{ color: '#9b6829' }}>Mess Owner / Admin</strong>
              ) : currentUser.role === 'receptionist' ? (
                <strong style={{ color: 'var(--color-primary)' }}>Frontdesk Operator</strong>
              ) : (
                <span>Member • Active Dining Pass</span>
              )}
            </p>
          </div>
        </div>

        {/* Feedback alerts */}
        {successMsg && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-success)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Member Account Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>
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
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 2px',
                  fontSize: '13px',
                  color: 'var(--color-ink)',
                  backgroundColor: 'transparent'
                }}
              />
              <User size={15} color="var(--color-ink-mute)" />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>
              Email Address (For Instant Login)
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. name@gmail.com"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 2px',
                  fontSize: '13px',
                  color: 'var(--color-ink)',
                  backgroundColor: 'transparent'
                }}
              />
              <Mail size={15} color="var(--color-ink-mute)" />
            </div>
          </div>

          {/* Mobile Phone Number */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>
              Phone Number
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--color-hairline-input)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 10px',
              backgroundColor: '#ffffff'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginRight: '4px' }}>+91</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                maxLength={10}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 2px',
                  fontSize: '13px',
                  color: 'var(--color-ink)',
                  backgroundColor: 'transparent'
                }}
              />
              <Phone size={15} color="var(--color-ink-mute)" />
            </div>
          </div>

          {/* Secret 4-Digit PIN */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>
              Secret Login PIN (4 Digits)
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
                type={showPin ? 'text' : 'password'}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4-digit access code"
                maxLength={4}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 2px',
                  fontSize: '14px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                  color: 'var(--color-ink)',
                  backgroundColor: 'transparent'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-ink-mute)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)', marginTop: '2px', display: 'block' }}>
              Used to sign in quickly without needing SMS OTP every day.
            </span>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              marginTop: '6px',
              gap: '6px',
              borderRadius: 'var(--radius-pill)'
            }}
          >
            <Save size={14} /> {saving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>

        {/* Hairline Divider */}
        <div style={{ height: '1px', backgroundColor: 'var(--color-hairline)', margin: '20px 0 16px' }} />

        {/* Logout Action Area */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block' }}>
              Account Session
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>
              Sign out from this browser session
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogoutClick}
            className="btn btn-outline btn-pill"
            style={{
              color: 'var(--color-error)',
              borderColor: 'var(--color-error-border)',
              backgroundColor: 'var(--color-error-bg)',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 14px'
            }}
          >
            <LogOut size={13} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};
