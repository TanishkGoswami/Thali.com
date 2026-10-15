import React from 'react';
import { Utensils, QrCode, Shield, User, LogOut, LogIn, Sun, Moon } from 'lucide-react';
import type { Role, Profile } from '../types';

interface NavbarProps {
  currentUser: Profile | null;
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  activeMealPeriod: 'lunch' | 'dinner';
  onMealPeriodChange: (period: 'lunch' | 'dinner') => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentRole,
  onRoleChange,
  activeMealPeriod,
  onMealPeriodChange,
  onOpenLogin,
  onLogout
}) => {
  return (
    <header style={{
      backgroundColor: 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-hairline)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      transition: 'background-color var(--transition-fast)'
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand Logo & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(83, 58, 253, 0.28)'
          }}>
            <Utensils size={18} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '-0.4px',
              color: 'var(--color-ink)'
            }}>
              Thali<span style={{ color: 'var(--color-primary)' }}>.com</span>
            </span>
            <span className="badge badge-indigo" style={{ fontSize: '10px', padding: '2px 7px' }}>
              Mess Pass
            </span>
          </div>
        </div>

        {/* Center: Meal Session Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          backgroundColor: 'var(--color-canvas-soft)',
          padding: '3px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--color-hairline)'
        }}>
          <button
            type="button"
            onClick={() => onMealPeriodChange('lunch')}
            className="btn btn-pill"
            style={{
              backgroundColor: activeMealPeriod === 'lunch' ? '#ffffff' : 'transparent',
              color: activeMealPeriod === 'lunch' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
              boxShadow: activeMealPeriod === 'lunch' ? 'var(--shadow-level-1)' : 'none',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: activeMealPeriod === 'lunch' ? 500 : 400
            }}
          >
            <Sun size={13} color={activeMealPeriod === 'lunch' ? '#ea580c' : 'currentColor'} />
            Lunch Session
          </button>
          <button
            type="button"
            onClick={() => onMealPeriodChange('dinner')}
            className="btn btn-pill"
            style={{
              backgroundColor: activeMealPeriod === 'dinner' ? '#ffffff' : 'transparent',
              color: activeMealPeriod === 'dinner' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
              boxShadow: activeMealPeriod === 'dinner' ? 'var(--shadow-level-1)' : 'none',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: activeMealPeriod === 'dinner' ? 500 : 400
            }}
          >
            <Moon size={13} color={activeMealPeriod === 'dinner' ? '#6366f1' : 'currentColor'} />
            Dinner Session
          </button>
        </div>

        {/* Right Section: User & Strict RBAC Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser ? (
            <>
              {/* If user is owner_admin, allow supervising views */}
              {currentUser.role === 'owner_admin' && (
                <div style={{
                  display: 'flex',
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
                    <Shield size={12} /> Admin
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
                    <QrCode size={12} /> Scanner
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
                    <User size={12} /> Pass
                  </button>
                </div>
              )}

              {/* Minimal User Profile Capsule */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '3px 4px 3px 10px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: '#ffffff',
                border: '1px solid var(--color-hairline)',
                boxShadow: 'var(--shadow-level-1)'
              }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>
                    {currentUser.full_name}
                  </div>
                  <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    {currentUser.role === 'owner_admin' ? (
                      <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Admin Console</span>
                    ) : currentUser.role === 'receptionist' ? (
                      <span style={{ color: 'var(--color-ink-mute)', fontWeight: 500 }}>Reception Staff</span>
                    ) : (
                      <span className="tnum" style={{ color: 'var(--color-ink-mute)', fontWeight: 500 }}>
                        {currentUser.member_number}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out of account"
                  className="btn btn-outline btn-pill"
                  style={{
                    padding: '5px',
                    borderRadius: 'var(--radius-pill)',
                    color: 'var(--color-ink-mute)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--color-hairline)'
                  }}
                >
                  <LogOut size={13} />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="btn btn-primary"
              style={{
                gap: '6px',
                padding: '7px 16px',
                fontSize: '13px'
              }}
            >
              <LogIn size={14} /> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
