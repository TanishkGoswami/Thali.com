import React, { useState } from 'react';
import { Utensils, QrCode, Shield, User, LogOut, LogIn } from 'lucide-react';
import type { Role, Profile } from '../types';

interface NavbarProps {
  currentUser: Profile | null;
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  activeMealPeriod?: 'lunch' | 'dinner';
  onMealPeriodChange?: (period: 'lunch' | 'dinner') => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentRole,
  onRoleChange,
  onOpenLogin,
  onLogout
}) => {
  const [logoutHovered, setLogoutHovered] = useState(false);

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
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Brand Logo & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #533afd 0%, #4434d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(83, 58, 253, 0.25)',
            flexShrink: 0
          }}>
            <Utensils size={16} strokeWidth={2.2} />
          </div>
          <span style={{
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '-0.3px',
            color: 'var(--color-ink)'
          }}>
            Thali<span style={{ color: 'var(--color-primary)' }}>.com</span>
          </span>
        </div>

        {/* Center: Supervisor RBAC Switcher (Only visible for Owner Admin) */}
        {currentUser && currentUser.role === 'owner_admin' && (
          <div className="scroll-pills-x" style={{
            alignItems: 'center',
            gap: '2px',
            backgroundColor: 'var(--color-canvas-soft)',
            padding: '3px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-hairline)',
            order: 2,
            margin: '0 auto'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, order: 3 }}>
          {currentUser ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '3px 4px 3px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-hairline)',
              boxShadow: 'var(--shadow-level-1)',
              maxWidth: '100%'
            }}>
              {/* User Avatar Initials */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f0effe 0%, #e0e7ff 100%)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid #dcd8fe',
                flexShrink: 0
              }}>
                {initials}
              </div>

              {/* User Information with overflow protection */}
              <div style={{
                textAlign: 'left',
                maxWidth: '110px',
                overflow: 'hidden'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {currentUser.full_name}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--color-ink-mute)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
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

              {/* Hairline Divider */}
              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--color-hairline)' }} />

              {/* Sleek Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                onMouseEnter={() => setLogoutHovered(true)}
                onMouseLeave={() => setLogoutHovered(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: logoutHovered ? 'var(--color-error-bg)' : 'transparent',
                  color: logoutHovered ? 'var(--color-error)' : 'var(--color-ink-mute)',
                  border: logoutHovered ? '1px solid var(--color-error-border)' : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 500,
                  transition: 'all var(--transition-fast)'
                }}
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="btn btn-primary"
              style={{
                gap: '6px',
                padding: '6px 14px',
                fontSize: '13px'
              }}
            >
              <LogIn size={13} /> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
