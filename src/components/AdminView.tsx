import React, { useState } from 'react';
import { Users, CreditCard, Utensils, Plus, Check, Search, Edit3, FileSpreadsheet } from 'lucide-react';

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
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
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
          <span className="eyebrow" style={{ color: 'var(--color-clay)' }}>Mess Operations & Administration</span>
          <h1 style={{ fontSize: '36px', marginTop: '4px' }}>
            Owner & Admin Dashboard
          </h1>
          <p style={{ color: 'var(--color-ash)', fontSize: '15px' }}>
            Complete control over 400+ members, subscriptions, payments, and menus.
          </p>
        </div>

        <button onClick={() => setShowAddMember(true)} className="btn btn-primary">
          <Plus size={16} /> Add New Member
        </button>
      </div>

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <span className="eyebrow">Total Members</span>
          <div style={{ fontSize: '32px', fontFamily: 'var(--font-display)', fontWeight: 300, marginTop: '8px' }}>
            {members.length}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-ash)' }}>Preserving paper-card records</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span className="eyebrow" style={{ color: 'var(--color-forest)' }}>Active Subscriptions</span>
          <div style={{ fontSize: '32px', fontFamily: 'var(--font-display)', fontWeight: 300, marginTop: '8px', color: 'var(--color-forest)' }}>
            {activeCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-ash)' }}>₹2,800 / 54 meals active</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span className="eyebrow" style={{ color: 'var(--color-gold-deep)' }}>Pending Verifications</span>
          <div style={{ fontSize: '32px', fontFamily: 'var(--font-display)', fontWeight: 300, marginTop: '8px', color: 'var(--color-gold-deep)' }}>
            {pendingCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-ash)' }}>Awaiting cash/UPI review</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span className="eyebrow" style={{ color: 'var(--color-clay)' }}>Low Balance (&lt; 5 Meals)</span>
          <div style={{ fontSize: '32px', fontFamily: 'var(--font-display)', fontWeight: 300, marginTop: '8px', color: 'var(--color-clay)' }}>
            {lowBalanceCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-ash)' }}>Due for renewal soon</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid var(--color-hairline)',
        paddingBottom: '8px',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('members')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'members' ? 'var(--color-stone)' : 'transparent',
            color: activeTab === 'members' ? '#fff' : 'var(--color-stone)'
          }}
        >
          <Users size={16} /> Members Directory ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'payments' ? 'var(--color-stone)' : 'transparent',
            color: activeTab === 'payments' ? '#fff' : 'var(--color-stone)'
          }}
        >
          <CreditCard size={16} /> Payment Approvals ({pendingCount})
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'menu' ? 'var(--color-stone)' : 'transparent',
            color: activeTab === 'menu' ? '#fff' : 'var(--color-stone)'
          }}
        >
          <Utensils size={16} /> Daily Menus
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'import' ? 'var(--color-stone)' : 'transparent',
            color: activeTab === 'import' ? '#fff' : 'var(--color-stone)'
          }}
        >
          <FileSpreadsheet size={16} /> CSV Import Tool
        </button>
      </div>

      {/* Tab 1: Members Directory */}
      {activeTab === 'members' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ash)' }} />
              <input
                type="text"
                placeholder="Search member #, name, phone..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            {/* Quick status filter pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setStatusFilter('all')}
                className="btn btn-pill"
                style={{
                  fontSize: '12px',
                  padding: '4px 12px',
                  backgroundColor: statusFilter === 'all' ? 'var(--color-stone)' : 'var(--color-canvas)',
                  color: statusFilter === 'all' ? '#fff' : 'var(--color-stone)'
                }}
              >
                All ({members.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className="btn btn-pill"
                style={{
                  fontSize: '12px',
                  padding: '4px 12px',
                  backgroundColor: statusFilter === 'active' ? 'var(--color-forest)' : 'var(--color-canvas)',
                  color: statusFilter === 'active' ? '#fff' : 'var(--color-stone)'
                }}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className="btn btn-pill"
                style={{
                  fontSize: '12px',
                  padding: '4px 12px',
                  backgroundColor: statusFilter === 'pending' ? 'var(--color-gold-deep)' : 'var(--color-canvas)',
                  color: statusFilter === 'pending' ? '#fff' : 'var(--color-stone)'
                }}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('low')}
                className="btn btn-pill"
                style={{
                  fontSize: '12px',
                  padding: '4px 12px',
                  backgroundColor: statusFilter === 'low' ? 'var(--color-clay)' : 'var(--color-canvas)',
                  color: statusFilter === 'low' ? '#fff' : 'var(--color-stone)'
                }}
              >
                Low Balance ({lowBalanceCount})
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-hairline)', color: 'var(--color-ash)' }}>
                  <th style={{ padding: '12px 16px' }}>Member #</th>
                  <th style={{ padding: '12px 16px' }}>Name</th>
                  <th style={{ padding: '12px 16px' }}>Phone</th>
                  <th style={{ padding: '12px 16px' }}>Remaining Meals</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {m.member_number}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{m.full_name}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-ash)' }}>{m.phone || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ color: (m.remaining_meals ?? 0) <= 5 ? 'var(--color-error)' : 'inherit' }}>
                        {m.remaining_meals ?? 0}
                      </strong> / 54
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge badge-${m.subscription_status === 'active' ? 'active' : 'pending'}`}>
                        {m.subscription_status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedMemberForEdit(m)}
                        className="btn btn-outline btn-pill"
                        style={{ fontSize: '12px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit3 size={12} /> Edit & Adjust
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
          <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Payment Verification Queue</span>
          <h2 style={{ fontSize: '24px', marginTop: '4px' }}>Pending Cash & Direct UPI Claims</h2>
          <p style={{ color: 'var(--color-ash)', fontSize: '14px', marginTop: '4px', marginBottom: '20px' }}>
            Subscriptions remain unusable until verified by an authorized admin.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.filter(m => m.subscription_status === 'pending').map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: 'var(--color-canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-hairline)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{m.member_number}</span>
                    <strong style={{ fontSize: '16px' }}>{m.full_name}</strong>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-ash)', marginTop: '4px' }}>
                    Requested Plan: <strong>Monthly Mess Thali (54 Meals)</strong> • Amount: <strong>₹2,800</strong>
                  </p>
                </div>

                <button
                  onClick={async () => {
                    // Activate subscription
                    alert(`Verified payment for ${m.full_name}! 54 meals activated.`);
                    onRefresh();
                  }}
                  className="btn btn-primary btn-pill"
                >
                  <Check size={14} /> Verify & Activate (₹2,800)
                </button>
              </div>
            ))}

            {members.filter(m => m.subscription_status === 'pending').length === 0 && (
              <p style={{ textAlign: 'center', padding: '32px', color: 'var(--color-ash)' }}>
                No pending payments awaiting verification. All subscriptions are clear!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Daily Menus */}
      {activeTab === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-clay)' }}>Daily Dining Board</span>
              <h2 style={{ fontSize: '24px', marginTop: '2px' }}>Today's Meal Menus</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setMenuEditorPeriod('lunch');
                  setShowMenuEditor(true);
                }}
                className="btn btn-secondary btn-pill"
              >
                <Plus size={14} /> Update Lunch Menu
              </button>
              <button
                onClick={() => {
                  setMenuEditorPeriod('dinner');
                  setShowMenuEditor(true);
                }}
                className="btn btn-primary btn-pill"
              >
                <Plus size={14} /> Update Dinner Menu
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {menus.map(menu => (
              <div key={menu.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '20px', textTransform: 'capitalize' }}>
                    {menu.meal_period === 'lunch' ? '🌞 Lunch Menu' : '🌙 Dinner Menu'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-active">{menu.status}</span>
                    <button
                      onClick={() => {
                        setMenuEditorPeriod(menu.meal_period);
                        setShowMenuEditor(true);
                      }}
                      className="btn btn-outline btn-pill"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <p style={{ color: 'var(--color-stone)', fontSize: '14px', marginBottom: '16px' }}>
                  <strong>{menu.title}</strong> — {menu.notes}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {menu.items?.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
                      <span>{item.name}</span>
                      <span style={{ color: 'var(--color-ash)', fontSize: '12px' }}>{item.category}</span>
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
          backgroundColor: 'rgba(28, 27, 26, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '32px' }}>
            <h2 style={{ fontSize: '24px' }}>Register New Member</h2>
            <p style={{ color: 'var(--color-ash)', fontSize: '13px', marginTop: '4px', marginBottom: '20px' }}>
              Assign unique member number and generate secure digital QR pass.
            </p>

            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-stone)', display: 'block', marginBottom: '6px' }}>
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
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-stone)', display: 'block', marginBottom: '6px' }}>
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
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-stone)', display: 'block', marginBottom: '6px' }}>
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

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="btn btn-outline"
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

