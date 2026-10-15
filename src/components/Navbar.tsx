import React from 'react';
import { Utensils, QrCode, Shield, User } from 'lucide-react';
import type { Role } from '../types';

interface NavbarProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  activeMealPeriod: 'lunch' | 'dinner';
  onMealPeriodChange: (period: 'lunch' | 'dinner') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  activeMealPeriod,
  onMealPeriodChange
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

        {/* Right: Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ash)', textTransform: 'uppercase' }}>
            Switch View:
          </span>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--color-surface)',
            padding: '4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-hairline)'
          }}>
            <button
              onClick={() => onRoleChange('member')}
              className="btn btn-pill"
              style={{
                backgroundColor: currentRole === 'member' ? 'var(--color-primary)' : 'transparent',
                color: currentRole === 'member' ? '#fff' : 'var(--color-stone)',
                gap: '6px',
                padding: '6px 12px'
              }}
            >
              <User size={14} /> Member
            </button>
            <button
              onClick={() => onRoleChange('receptionist')}
              className="btn btn-pill"
              style={{
                backgroundColor: currentRole === 'receptionist' ? 'var(--color-primary)' : 'transparent',
                color: currentRole === 'receptionist' ? '#fff' : 'var(--color-stone)',
                gap: '6px',
                padding: '6px 12px'
              }}
            >
              <QrCode size={14} /> Receptionist
            </button>
            <button
              onClick={() => onRoleChange('owner_admin')}
              className="btn btn-pill"
              style={{
                backgroundColor: currentRole === 'owner_admin' ? 'var(--color-primary)' : 'transparent',
                color: currentRole === 'owner_admin' ? '#fff' : 'var(--color-stone)',
                gap: '6px',
                padding: '6px 12px'
              }}
            >
              <Shield size={14} /> Admin
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
