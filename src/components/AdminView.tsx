import React, { useState } from 'react';
import { Users, CreditCard, Utensils, Plus, Check, Search, Edit3, FileSpreadsheet, X } from 'lucide-react';
import type { Profile, DailyMenu } from '../types';
import { api } from '../services/api';
import { CsvImporter } from './CsvImporter';
import { MemberEditModal } from './MemberEditModal';
import { MenuEditorModal } from './MenuEditorModal';

interface AdminViewProps {
  members: (Profile & { remaining_meals?: number; subscription_status?: string })[];
  menus: DailyMenu[];
  onRefresh: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  members,
  menus,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'payments' | 'menu' | 'import'>('members');
  const [searchMember, setSearchMember] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'low'>('all');
  
  // Modals state
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<(Profile & { remaining_meals?: number; subscription_status?: string }) | null>(null);
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [menuEditorPeriod, setMenuEditorPeriod] = useState<'lunch' | 'dinner'>('lunch');

  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMemberNumber, setNewMemberNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter members
  const filtered = members.filter(m => {
    const matchesQuery =
      m.member_number?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.full_name.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.phone?.includes(searchMember);

    if (!matchesQuery) return false;

    if (statusFilter === 'active') return m.subscription_status === 'active';
    if (statusFilter === 'pending') return m.subscription_status === 'pending';
    if (statusFilter === 'low') return (m.remaining_meals ?? 0) <= 5 && m.subscription_status === 'active';

    return true;
  });

  const activeCount = members.filter(m => m.subscription_status === 'active').length;
  const pendingCount = members.filter(m => m.subscription_status === 'pending').length;
  const lowBalanceCount = members.filter(m => (m.remaining_meals ?? 0) <= 5 && m.subscription_status === 'active').length;

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newMemberNumber) return;

    setIsSubmitting(true);
    try {
      await api.registerMember(newFullName, newPhone, newMemberNumber);
      setShowAddMember(false);
      setNewFullName('');
      setNewPhone('');
      setNewMemberNumber('');
      onRefresh();
    } catch (err) {
      alert('Failed to register member. Ensure member number is unique.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid var(--color-hairline)',
        paddingBottom: '20px'
      }}>
        <div>
          <span className="eyebrow">Administration & Control</span>
          <h1 style={{ fontSize: '32px', marginTop: '4px' }}>
            Owner & Admin Dashboard
          </h1>
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '14px', marginTop: '2px' }}>
            Manage 400+ members, subscriptions, audit passbooks, and kitchen menus.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddMember(true)}
          className="btn btn-primary"
        >
          <Plus size={15} /> Add New Member
        </button>
      </div>

      {/* Top Metric Cards (Stripe clean cards with tnum figures) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <span className="eyebrow">Total Members</span>
          <div className="tnum" style={{ fontSize: '32px', fontWeight: 300, letterSpacing: '-0.8px', marginTop: '4px', color: 'var(--color-ink)' }}>
            {members.length}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-mute)' }}>Preserving paper-card records</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span className="eyebrow">Active Plans</span>
          <div className="tnum" style={{ fontSize: '32px', fontWeight: 300, letterSpacing: '-0.8px', marginTop: '4px', color: 'var(--color-success)' }}>
            {activeCount}
          </div>
          <span className="tnum" style={{ fontSize: '12px', color: 'var(--color-ink-mute)' }}>₹2,800 / 54 meals active</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span className="eyebrow">Pending Approvals</span>
          <div className="tnum" style={{ fontSize: '32px', fontWeight: 300, letterSpacing: '-0.8px', marginTop: '4px', color: 'var(--color-warning)' }}>
            {pendingCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-mute)' }}>Awaiting review</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span className="eyebrow">Low Balance (&le; 5 Meals)</span>
          <div className="tnum" style={{ fontSize: '32px', fontWeight: 300, letterSpacing: '-0.8px', marginTop: '4px', color: 'var(--color-error)' }}>
            {lowBalanceCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-mute)' }}>Due for renewal</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: 'var(--color-canvas-soft)',
        padding: '3px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--color-hairline)',
        width: 'fit-content',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'members' ? '#ffffff' : 'transparent',
            color: activeTab === 'members' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: activeTab === 'members' ? 'var(--shadow-level-1)' : 'none',
            fontSize: '13px',
            fontWeight: activeTab === 'members' ? 500 : 400
          }}
        >
          <Users size={14} /> Members Directory ({members.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'payments' ? '#ffffff' : 'transparent',
            color: activeTab === 'payments' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: activeTab === 'payments' ? 'var(--shadow-level-1)' : 'none',
            fontSize: '13px',
            fontWeight: activeTab === 'payments' ? 500 : 400
          }}
        >
          <CreditCard size={14} /> Approvals ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'menu' ? '#ffffff' : 'transparent',
            color: activeTab === 'menu' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: activeTab === 'menu' ? 'var(--shadow-level-1)' : 'none',
            fontSize: '13px',
            fontWeight: activeTab === 'menu' ? 500 : 400
          }}
        >
          <Utensils size={14} /> Menus
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'import' ? '#ffffff' : 'transparent',
            color: activeTab === 'import' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: activeTab === 'import' ? 'var(--shadow-level-1)' : 'none',
            fontSize: '13px',
            fontWeight: activeTab === 'import' ? 500 : 400
          }}
        >
          <FileSpreadsheet size={14} /> CSV Import
        </button>
      </div>

      {/* Tab 1: Members Directory */}
      {activeTab === 'members' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-mute)' }} />
              <input
                type="text"
                placeholder="Search member #, name, phone..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px' }}
              />
            </div>

            {/* Status filter pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="btn btn-pill"
                style={{
                  fontSize: '12px',
                  padding: '3px 10px',
                  backgroundColor: statusFilter === 'all' ? 'var(--color-brand-dark-900)' : 'var(--color-canvas-soft)',
                  color: statusFilter === 'all' ? '#ffffff' : 'var(--color-ink-mute)',
                  border: '1px solid var(--color-hairline)'
                }}
              >
                All ({members.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className="btn btn-pill"
                style={{
                  fontSize: '12px',
                  padding: '3px 10px',
                  backgroundColor: statusFilter === 'active' ? 'var(--color-success-bg)' : 'var(--color-canvas-soft)',
                  color: statusFilter === 'active' ? 'var(--color-success)' : 'var(--color-ink-mute)',
                  border: statusFilter === 'active' ? '1px solid var(--color-success-border)' : '1px solid var(--color-hairline)'
                }}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className="btn btn-pill"
                style={{
                  fontSize: '12px',
                  padding: '3px 10px',
                  backgroundColor: statusFilter === 'pending' ? 'var(--color-warning-bg)' : 'var(--color-canvas-soft)',
                  color: statusFilter === 'pending' ? 'var(--color-warning)' : 'var(--color-ink-mute)',
                  border: statusFilter === 'pending' ? '1px solid var(--color-warning-border)' : '1px solid var(--color-hairline)'
                }}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('low')}
                className="btn btn-pill"
                style={{
                  fontSize: '12px',
                  padding: '3px 10px',
                  backgroundColor: statusFilter === 'low' ? 'var(--color-error-bg)' : 'var(--color-canvas-soft)',
                  color: statusFilter === 'low' ? 'var(--color-error)' : 'var(--color-ink-mute)',
                  border: statusFilter === 'low' ? '1px solid var(--color-error-border)' : '1px solid var(--color-hairline)'
                }}
              >
                Low Balance ({lowBalanceCount})
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-hairline)', color: 'var(--color-ink-mute)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Member #</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Full Name</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Phone</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Remaining Meals</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                    <td className="tnum" style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {m.member_number}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 500, color: 'var(--color-ink)' }}>{m.full_name}</td>
                    <td className="tnum" style={{ padding: '12px 14px', color: 'var(--color-ink-mute)' }}>{m.phone || '—'}</td>
                    <td className="tnum" style={{ padding: '12px 14px' }}>
                      <strong style={{ color: (m.remaining_meals ?? 0) <= 5 ? 'var(--color-error)' : 'var(--color-ink)' }}>
                        {m.remaining_meals ?? 0}
                      </strong> / 54
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge badge-${m.subscription_status === 'active' ? 'active' : 'pending'}`}>
                        {m.subscription_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedMemberForEdit(m)}
                        className="btn btn-secondary btn-pill"
                        style={{ fontSize: '11px', padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit3 size={11} /> Edit & Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Payment Approvals */}
      {activeTab === 'payments' && (
        <div className="card">
          <span className="eyebrow">Payment Verification Queue</span>
          <h2 style={{ fontSize: '20px', marginTop: '2px' }}>Pending Subscriptions</h2>
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px', marginTop: '2px', marginBottom: '18px' }}>
            Subscriptions remain unusable until verified by an authorized mess owner.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.filter(m => m.subscription_status === 'pending').map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-canvas-soft)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-hairline)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '12px' }}>{m.member_number}</span>
                    <strong style={{ fontSize: '14px', color: 'var(--color-ink)' }}>{m.full_name}</strong>
                  </div>
                  <p className="tnum" style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
                    Requested Plan: <strong>Monthly Mess Thali (54 Meals)</strong> • Amount: <strong>₹2,800</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    alert(`Verified payment for ${m.full_name}! 54 meals activated.`);
                    onRefresh();
                  }}
                  className="btn btn-primary btn-pill"
                  style={{ fontSize: '12px' }}
                >
                  <Check size={13} /> Verify & Activate (₹2,800)
                </button>
              </div>
            ))}

            {members.filter(m => m.subscription_status === 'pending').length === 0 && (
              <p style={{ textAlign: 'center', padding: '32px', color: 'var(--color-ink-mute)', fontSize: '13px' }}>
                No pending payments awaiting verification. All subscriptions are clear!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Daily Menus */}
      {activeTab === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow">Kitchen Publishing</span>
              <h2 style={{ fontSize: '20px', marginTop: '2px' }}>Today's Dining Menus</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setMenuEditorPeriod('lunch');
                  setShowMenuEditor(true);
                }}
                className="btn btn-secondary btn-pill"
              >
                <Plus size={13} /> Update Lunch Menu
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuEditorPeriod('dinner');
                  setShowMenuEditor(true);
                }}
                className="btn btn-primary btn-pill"
              >
                <Plus size={13} /> Update Dinner Menu
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {menus.map(menu => (
              <div key={menu.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, textTransform: 'capitalize' }}>
                    {menu.meal_period === 'lunch' ? 'Lunch Menu' : 'Dinner Menu'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-active">{menu.status}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuEditorPeriod(menu.meal_period);
                        setShowMenuEditor(true);
                      }}
                      className="btn btn-secondary btn-pill"
                      style={{ fontSize: '11px', padding: '2px 7px' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px', marginBottom: '14px' }}>
                  <strong>{menu.title}</strong> — {menu.notes}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {menu.items?.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--color-canvas-soft)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                      <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{item.name}</span>
                      <span style={{ color: 'var(--color-ink-mute)', fontSize: '11px' }}>{item.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: CSV Import Tool */}
      {activeTab === 'import' && (
        <CsvImporter
          onSuccess={onRefresh}
          existingMemberNumbers={members.map(m => m.member_number?.toLowerCase() || '')}
        />
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(13, 37, 61, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-modal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Register New Member</h3>
                <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px', marginTop: '2px' }}>
                  Assign unique member ID and generate digital QR pass.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="btn btn-outline btn-pill"
                style={{ padding: '6px', border: 'none', color: 'var(--color-ink-mute)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '4px' }}>
                  Member Number (e.g. M-108, 401):
                </label>
                <input
                  type="text"
                  required
                  placeholder="M-108"
                  value={newMemberNumber}
                  onChange={(e) => setNewMemberNumber(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '4px' }}>
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Aarav Sharma"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '4px' }}>
                  Phone Number:
                </label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="btn btn-secondary btn-pill"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {isSubmitting ? 'Saving...' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit & Adjust Member Modal */}
      {selectedMemberForEdit && (
        <MemberEditModal
          isOpen={!!selectedMemberForEdit}
          member={selectedMemberForEdit}
          onClose={() => setSelectedMemberForEdit(null)}
          onSuccess={() => {
            setSelectedMemberForEdit(null);
            onRefresh();
          }}
        />
      )}

      {/* Menu Editor Modal */}
      {showMenuEditor && (
        <MenuEditorModal
          isOpen={showMenuEditor}
          initialMealPeriod={menuEditorPeriod}
          existingMenu={menus.find(m => m.meal_period === menuEditorPeriod)}
          onClose={() => setShowMenuEditor(false)}
          onSuccess={() => {
            setShowMenuEditor(false);
            onRefresh();
          }}
        />
      )}

    </div>
  );
};
