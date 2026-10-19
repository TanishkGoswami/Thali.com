import React from 'react';
import { QrCode, Shield, User, LogIn, Send } from 'lucide-react';
import type { Role, Profile, MealPeriod } from '../types';

interface NavbarProps {
  currentUser: Profile | null;
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  activeMealPeriod?: MealPeriod;
  onMealPeriodChange?: (period: MealPeriod) => void;
  onOpenLogin: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentRole,
  onRoleChange,
  onOpenLogin,
  onOpenProfile
}) => {

  // Derive user initials for clean avatar circle
  const initials = currentUser?.full_name
    ? currentUser.full_name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header style={{
      backgroundColor: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-hairline)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      transition: 'all var(--transition-fast)'
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '8px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {/* Top Row: Brand on Left, Desktop Switcher in Center, Profile Capsule on Right */}
        <div className="navbar-top-row">
          {/* Brand Logo & Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <img
              src="/logo.png"
              alt="Thali.com"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                objectFit: 'contain',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(247, 76, 32, 0.25)'
              }}
            />
            <span style={{
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '-0.3px',
              color: 'var(--color-ink)'
            }}>
              Thali<span style={{ color: 'var(--color-primary)' }}>.com</span>
            </span>
          </div>

          {/* Desktop Center: Supervisor RBAC Switcher (Only visible for Owner Admin on Desktop) */}
          {currentUser && currentUser.role === 'owner_admin' && (
            <div className="navbar-switcher-desktop scroll-pills-x" style={{
              alignItems: 'center',
              gap: '2px',
              backgroundColor: 'var(--color-canvas-soft)',
              padding: '3px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-hairline)'
            }}>
              <button
                type="button"
                onClick={() => onRoleChange('owner_admin')}
                className="btn btn-pill"
                style={{
                  backgroundColor: currentRole === 'owner_admin' ? '#ffffff' : 'transparent',
                  color: currentRole === 'owner_admin' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                  boxShadow: currentRole === 'owner_admin' ? 'var(--shadow-level-1)' : 'none',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: currentRole === 'owner_admin' ? 500 : 400
                }}
              >
                <Shield size={13} color={currentRole === 'owner_admin' ? 'var(--color-primary)' : 'currentColor'} />
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => onRoleChange('receptionist')}
                className="btn btn-pill"
                style={{
                  backgroundColor: currentRole === 'receptionist' ? '#ffffff' : 'transparent',
                  color: currentRole === 'receptionist' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                  boxShadow: currentRole === 'receptionist' ? 'var(--shadow-level-1)' : 'none',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: currentRole === 'receptionist' ? 500 : 400
                }}
              >
                <QrCode size={13} color={currentRole === 'receptionist' ? 'var(--color-primary)' : 'currentColor'} />
                Scanner
              </button>
              <button
                type="button"
                onClick={() => onRoleChange('member')}
                className="btn btn-pill"
                style={{
                  backgroundColor: currentRole === 'member' ? '#ffffff' : 'transparent',
                  color: currentRole === 'member' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                  boxShadow: currentRole === 'member' ? 'var(--shadow-level-1)' : 'none',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: currentRole === 'member' ? 500 : 400
                }}
              >
                <User size={13} color={currentRole === 'member' ? 'var(--color-primary)' : 'currentColor'} />
                Pass
              </button>
            </div>
          )}

          {/* Right Section: Clean User Profile Capsule & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {currentUser ? (
              <button
                type="button"
                onClick={onOpenProfile}
                title="View & Edit Profile"
                className="btn-pill"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '3px 10px 3px 4px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--color-hairline)',
                  boxShadow: 'var(--shadow-level-1)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary-border)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-level-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-hairline)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-level-1)';
                }}
              >
                {/* User Avatar Initials */}
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #533afd 0%, #4434d4 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  {initials}
                </div>

                {/* User Information with smooth text-overflow ellipsis */}
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <div
                    className="user-name-truncate"
                    title={currentUser.full_name}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      lineHeight: 1.2
                    }}
                  >
                    {currentUser.full_name}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--color-ink-mute)',
                    lineHeight: 1.1
                  }}>
                    {currentUser.role === 'owner_admin' ? (
                      <span style={{ color: '#9b6829', fontWeight: 500 }}>Admin</span>
                    ) : currentUser.role === 'receptionist' ? (
                      <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Staff</span>
                    ) : (
                      <span className="tnum">{currentUser.member_number}</span>
                    )}
                  </div>
                </div>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <a
                  href="https://t.me/ThaliMessBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    gap: '5px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-pill)',
                    textDecoration: 'none'
                  }}
                  title="Open Thali Mess Assistant on Telegram"
                >
                  <Send size={13} color="#229ED9" />
                  <span className="nav-bot-label">@ThaliMessBot</span>
                </a>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="btn btn-primary"
                  style={{
                    gap: '5px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-pill)'
                  }}
                >
                  <LogIn size={13} />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Row 2 (Only visible for Owner Admin on screens <= 768px) */}
        {currentUser && currentUser.role === 'owner_admin' && (
          <div className="navbar-switcher-mobile">
            <div className="scroll-pills-x" style={{
              alignItems: 'center',
              gap: '2px',
              backgroundColor: 'var(--color-canvas-soft)',
              padding: '3px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-hairline)'
            }}>
              <button
                type="button"
                onClick={() => onRoleChange('owner_admin')}
                className="btn btn-pill"
                style={{
                  backgroundColor: currentRole === 'owner_admin' ? '#ffffff' : 'transparent',
                  color: currentRole === 'owner_admin' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                  boxShadow: currentRole === 'owner_admin' ? 'var(--shadow-level-1)' : 'none',
                  gap: '5px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: currentRole === 'owner_admin' ? 500 : 400
                }}
              >
                <Shield size={12} color={currentRole === 'owner_admin' ? 'var(--color-primary)' : 'currentColor'} />
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => onRoleChange('receptionist')}
                className="btn btn-pill"
                style={{
                  backgroundColor: currentRole === 'receptionist' ? '#ffffff' : 'transparent',
                  color: currentRole === 'receptionist' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                  boxShadow: currentRole === 'receptionist' ? 'var(--shadow-level-1)' : 'none',
                  gap: '5px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: currentRole === 'receptionist' ? 500 : 400
                }}
              >
                <QrCode size={12} color={currentRole === 'receptionist' ? 'var(--color-primary)' : 'currentColor'} />
                Scanner
              </button>
              <button
                type="button"
                onClick={() => onRoleChange('member')}
                className="btn btn-pill"
                style={{
                  backgroundColor: currentRole === 'member' ? '#ffffff' : 'transparent',
                  color: currentRole === 'member' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                  boxShadow: currentRole === 'member' ? 'var(--shadow-level-1)' : 'none',
                  gap: '5px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: currentRole === 'member' ? 500 : 400
                }}
              >
                <User size={12} color={currentRole === 'member' ? 'var(--color-primary)' : 'currentColor'} />
                Pass
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
