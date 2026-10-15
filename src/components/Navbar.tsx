import { Utensils, QrCode, Shield, User, LogOut, LogIn } from 'lucide-react';
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
      backgroundColor: 'var(--color-canvas)',
      borderBottom: '1px solid var(--color-hairline)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(10px)',
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-stone)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: 'var(--shadow-subtle)'
          }}>
            <Utensils size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '24px',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)'
              }}>
                Thali<span style={{ color: 'var(--color-gold)' }}>.com</span>
              </span>
              <span className="badge" style={{ backgroundColor: '#fff', border: '1px solid var(--color-hairline)', fontSize: '10px' }}>
                Mess System
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-ash)', marginTop: '-2px' }}>
              400+ Members • Pure Veg Mess
            </p>
          </div>
        </div>

        {/* Center: Meal Session Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--color-surface)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--color-hairline)'
        }}>
          <button
            onClick={() => onMealPeriodChange('lunch')}
            className="btn btn-pill"
            style={{
              backgroundColor: activeMealPeriod === 'lunch' ? 'var(--color-stone)' : 'transparent',
              color: activeMealPeriod === 'lunch' ? '#fff' : 'var(--color-ink)',
              padding: '6px 14px',
              fontSize: '13px'
            }}
          >
            🌞 Lunch Service
          </button>
          <button
            onClick={() => onMealPeriodChange('dinner')}
            className="btn btn-pill"
            style={{
              backgroundColor: activeMealPeriod === 'dinner' ? 'var(--color-stone)' : 'transparent',
              color: activeMealPeriod === 'dinner' ? '#fff' : 'var(--color-ink)',
              padding: '6px 14px',
              fontSize: '13px'
            }}
          >
            🌙 Dinner Service
          </button>
        </div>

        {/* Right Section: User & Strict RBAC Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser ? (
            <>
              {/* If user is owner_admin, allow supervising views */}
              {currentUser.role === 'owner_admin' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--color-surface)',
                  padding: '3px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--color-hairline)'
                }}>
                  <button
                    onClick={() => onRoleChange('owner_admin')}
                    className="btn btn-pill"
                    style={{
                      backgroundColor: currentRole === 'owner_admin' ? 'var(--color-stone)' : 'transparent',
                      color: currentRole === 'owner_admin' ? '#fff' : 'var(--color-ink)',
                      gap: '5px',
                      padding: '5px 10px',
                      fontSize: '12px'
                    }}
                  >
                    <Shield size={13} /> Admin
                  </button>
                  <button
                    onClick={() => onRoleChange('receptionist')}
                    className="btn btn-pill"
                    style={{
                      backgroundColor: currentRole === 'receptionist' ? 'var(--color-stone)' : 'transparent',
                      color: currentRole === 'receptionist' ? '#fff' : 'var(--color-ink)',
                      gap: '5px',
                      padding: '5px 10px',
                      fontSize: '12px'
                    }}
                  >
                    <QrCode size={13} /> Scanner
                  </button>
                  <button
                    onClick={() => onRoleChange('member')}
                    className="btn btn-pill"
                    style={{
                      backgroundColor: currentRole === 'member' ? 'var(--color-stone)' : 'transparent',
                      color: currentRole === 'member' ? '#fff' : 'var(--color-ink)',
                      gap: '5px',
                      padding: '5px 10px',
                      fontSize: '12px'
                    }}
                  >
                    <User size={13} /> Pass
                  </button>
                </div>
              )}

              {/* User Profile Capsule */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 6px 4px 12px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-hairline)',
                boxShadow: 'var(--shadow-subtle)'
              }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {currentUser.full_name}
                  </div>
                  <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    {currentUser.role === 'owner_admin' ? (
                      <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>👑 Owner Admin</span>
                    ) : currentUser.role === 'receptionist' ? (
                      <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Staff Reception</span>
                    ) : (
                      <span style={{ color: 'var(--color-moss)', fontWeight: 600 }}>Member • {currentUser.member_number}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  title="Sign out or switch user"
                  className="btn"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-hairline)',
                    padding: '6px',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    color: 'var(--color-ash)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onOpenLogin}
              className="btn btn-primary"
              style={{
                gap: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-full)'
              }}
            >
              <LogIn size={15} /> Sign In with Phone
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
