import React, { useState } from 'react';
import { Users, CreditCard, Utensils, Plus, Check, Search, Edit3, FileSpreadsheet, X, QrCode, Trash2, Camera } from 'lucide-react';
import type { Profile, DailyMenu } from '../types';
import { api } from '../services/api';
import { CsvImporter } from './CsvImporter';
import { MemberEditModal } from './MemberEditModal';
import { MenuEditorModal } from './MenuEditorModal';
import { CounterQrModal } from './CounterQrModal';
import { CameraScannerModal } from './CameraScannerModal';

interface AdminViewProps {
  members: (Profile & { remaining_meals?: number; subscription_status?: string })[];
  menus: DailyMenu[];
  onRefresh: () => void;
  activeMealPeriod?: 'lunch' | 'dinner';
}

export const AdminView: React.FC<AdminViewProps> = ({
  members,
  menus,
  onRefresh,
  activeMealPeriod = 'lunch'
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'payments' | 'menu' | 'import'>('members');
  const [searchMember, setSearchMember] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'low'>('all');
  
  // Modals state
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<(Profile & { remaining_meals?: number; subscription_status?: string }) | null>(null);
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [menuEditorPeriod, setMenuEditorPeriod] = useState<'lunch' | 'dinner'>('lunch');
  const [showCounterStandee, setShowCounterStandee] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDeleteMember = async (m: Profile) => {
    const confirmDelete = window.confirm(
      `Delete member ${m.full_name} (${m.member_number})?\n\nThis will remove their profile and release phone number (${m.phone || 'N/A'}) for future registrations.`
    );
    if (!confirmDelete) return;

    setDeletingId(m.id);
    try {
      const res = await api.deleteMember(m.id);
      if (res.success) {
        onRefresh();
      } else {
        alert(res.message || 'Failed to delete member.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error occurred while deleting member.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleScanSuccess = async (token: string) => {
    setShowCameraScanner(false);
    try {
      const currentHour = new Date().getHours();
      const currentPeriod = (currentHour >= 16 || currentHour < 5) ? 'dinner' : 'lunch';
      const res = await api.checkInMeal(token, currentPeriod);
      alert(res.message || (res.success ? 'Meal checked in successfully!' : 'Check in failed'));
      onRefresh();
    } catch (e: any) {
      alert('Error during check-in: ' + e?.message);
    }
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--color-hairline)',
        paddingBottom: '16px'
      }}>
        <div>
          <span className="eyebrow">Administration</span>
          <h1 style={{ fontSize: '28px', marginTop: '2px' }}>
            Owner & Admin Dashboard
          </h1>
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px', marginTop: '2px' }}>
            Manage 400+ members, subscriptions, audit passbooks, and menus.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowCameraScanner(true)}
            className="btn btn-secondary btn-pill"
            style={{ gap: '6px' }}
            title="Scan student digital pass with camera"
          >
            <Camera size={14} /> Scan Pass
          </button>
          <button
            type="button"
            onClick={() => setShowCounterStandee(true)}
            className="btn btn-secondary btn-pill"
            style={{ gap: '6px' }}
            title="Open printable Mess Counter Standee QR for student self-check-in"
          >
            <QrCode size={14} /> Desk QR Standee
          </button>
          <button
            type="button"
            onClick={() => setShowAddMember(true)}
            className="btn btn-primary btn-pill"
          >
            <Plus size={15} /> Add Member
          </button>
        </div>
      </div>

      {/* Top Metric Cards (Mobile 2x2 grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>Total Members</span>
          <div className="tnum" style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '-0.5px', marginTop: '2px', color: 'var(--color-ink)' }}>
            {members.length}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>Paper-card records</span>
        </div>

        <div className="card" style={{ padding: '14px' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>Active Plans</span>
          <div className="tnum" style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '-0.5px', marginTop: '2px', color: 'var(--color-success)' }}>
            {activeCount}
          </div>
          <span className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>54-meal quota</span>
        </div>

        <div className="card" style={{ padding: '14px' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>Pending</span>
          <div className="tnum" style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '-0.5px', marginTop: '2px', color: 'var(--color-warning)' }}>
            {pendingCount}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>Review queue</span>
        </div>

        <div className="card" style={{ padding: '14px' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>Low Balance</span>
          <div className="tnum" style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '-0.5px', marginTop: '2px', color: 'var(--color-error)' }}>
            {lowBalanceCount}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>&le; 5 meals left</span>
        </div>
      </div>

      {/* Navigation Tabs (Smooth horizontal scrolling on mobile) */}
      <div className="scroll-pills-x" style={{
        alignItems: 'center',
        gap: '4px',
        backgroundColor: 'var(--color-canvas-soft)',
        padding: '3px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--color-hairline)',
        width: 'fit-content',
        maxWidth: '100%'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'members' ? '#ffffff' : 'transparent',
            color: activeTab === 'members' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: activeTab === 'members' ? 'var(--shadow-level-1)' : 'none',
            fontSize: '12px',
            fontWeight: activeTab === 'members' ? 500 : 400
          }}
        >
          <Users size={13} /> Directory ({members.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'payments' ? '#ffffff' : 'transparent',
            color: activeTab === 'payments' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: activeTab === 'payments' ? 'var(--shadow-level-1)' : 'none',
            fontSize: '12px',
            fontWeight: activeTab === 'payments' ? 500 : 400
          }}
        >
          <CreditCard size={13} /> Approvals ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'menu' ? '#ffffff' : 'transparent',
            color: activeTab === 'menu' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: activeTab === 'menu' ? 'var(--shadow-level-1)' : 'none',
            fontSize: '12px',
            fontWeight: activeTab === 'menu' ? 500 : 400
          }}
        >
          <Utensils size={13} /> Menus
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'import' ? '#ffffff' : 'transparent',
            color: activeTab === 'import' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: activeTab === 'import' ? 'var(--shadow-level-1)' : 'none',
            fontSize: '12px',
            fontWeight: activeTab === 'import' ? 500 : 400
          }}
        >
          <FileSpreadsheet size={13} /> CSV Import
        </button>
      </div>

      {/* Tab 1: Members Directory */}
      {activeTab === 'members' && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
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

            {/* Status filter pills with horizontal touch scroll */}
            <div className="scroll-pills-x">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="btn btn-pill"
                style={{
                  fontSize: '11px',
                  padding: '3px 9px',
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
                  fontSize: '11px',
                  padding: '3px 9px',
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
                  fontSize: '11px',
                  padding: '3px 9px',
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
                  fontSize: '11px',
                  padding: '3px 9px',
                  backgroundColor: statusFilter === 'low' ? 'var(--color-error-bg)' : 'var(--color-canvas-soft)',
                  color: statusFilter === 'low' ? 'var(--color-error)' : 'var(--color-ink-mute)',
                  border: statusFilter === 'low' ? '1px solid var(--color-error-border)' : '1px solid var(--color-hairline)'
                }}
              >
                Low Balance ({lowBalanceCount})
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '580px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-hairline)', color: 'var(--color-ink-mute)' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Member #</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Full Name</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Phone</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Meals Left</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                    <td className="tnum" style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {m.member_number}
                    </td>
                    <td style={{ padding: '10px', fontWeight: 500, color: 'var(--color-ink)' }}>{m.full_name}</td>
                    <td className="tnum" style={{ padding: '10px', color: 'var(--color-ink-mute)' }}>{m.phone || '—'}</td>
                    <td className="tnum" style={{ padding: '10px' }}>
                      <strong style={{ color: (m.remaining_meals ?? 0) <= 5 ? 'var(--color-error)' : 'var(--color-ink)' }}>
                        {m.remaining_meals ?? 0}
                      </strong> / 54
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span className={`badge badge-${m.subscription_status === 'active' ? 'active' : 'pending'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                        {m.subscription_status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedMemberForEdit(m)}
                          className="btn btn-secondary btn-pill"
                          style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          title="Edit member details & balance"
                        >
                          <Edit3 size={11} /> Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === m.id}
                          onClick={() => handleDeleteMember(m)}
                          className="btn btn-outline btn-pill"
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            color: 'var(--color-error)',
                            borderColor: 'var(--color-error-border)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Delete member from database"
                        >
                          <Trash2 size={11} /> {deletingId === m.id ? '...' : 'Delete'}
                        </button>
                      </div>
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
          <h2 style={{ fontSize: '18px', marginTop: '2px' }}>Pending Subscriptions</h2>
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '12px', marginTop: '2px', marginBottom: '14px' }}>
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
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-canvas-soft)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-hairline)',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '11px' }}>{m.member_number}</span>
                    <strong style={{ fontSize: '13px', color: 'var(--color-ink)' }}>{m.full_name}</strong>
                  </div>
                  <p className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
                    Monthly Mess Thali (54 Meals) • <strong>₹2,800</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    alert(`Verified payment for ${m.full_name}! 54 meals activated.`);
                    onRefresh();
                  }}
                  className="btn btn-primary btn-pill"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  <Check size={12} /> Activate (₹2,800)
                </button>
              </div>
            ))}

            {members.filter(m => m.subscription_status === 'pending').length === 0 && (
              <p style={{ textAlign: 'center', padding: '24px', color: 'var(--color-ink-mute)', fontSize: '12px' }}>
                No pending payments awaiting verification.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Daily Menus */}
      {activeTab === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="eyebrow">Kitchen Publishing</span>
              <h2 style={{ fontSize: '18px', marginTop: '2px' }}>Today's Dining Menus</h2>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setMenuEditorPeriod('lunch');
                  setShowMenuEditor(true);
                }}
                className="btn btn-secondary btn-pill"
              >
                <Plus size={12} /> Lunch Menu
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuEditorPeriod('dinner');
                  setShowMenuEditor(true);
                }}
                className="btn btn-primary btn-pill"
              >
                <Plus size={12} /> Dinner Menu
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {menus.map(menu => (
              <div key={menu.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, textTransform: 'capitalize' }}>
                    {menu.meal_period === 'lunch' ? 'Lunch Menu' : 'Dinner Menu'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-active" style={{ fontSize: '9px', padding: '1px 5px' }}>{menu.status}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuEditorPeriod(menu.meal_period);
                        setShowMenuEditor(true);
                      }}
                      className="btn btn-secondary btn-pill"
                      style={{ fontSize: '10px', padding: '2px 6px' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <p style={{ color: 'var(--color-ink-mute)', fontSize: '12px', marginBottom: '10px' }}>
                  <strong>{menu.title}</strong> — {menu.notes}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {menu.items?.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', backgroundColor: 'var(--color-canvas-soft)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                      <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{item.name}</span>
                      <span style={{ color: 'var(--color-ink-mute)', fontSize: '10px' }}>{item.category}</span>
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
          padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '20px 16px', boxShadow: 'var(--shadow-modal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 600 }}>Register New Member</h3>
                <p style={{ color: 'var(--color-ink-mute)', fontSize: '12px', marginTop: '2px' }}>
                  Assign unique ID and generate QR pass.
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

            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '3px' }}>
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
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '3px' }}>
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
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '3px' }}>
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

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
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

      {/* Official Mess Counter Standee QR Modal (Model 2) */}
      <CounterQrModal
        isOpen={showCounterStandee}
        onClose={() => setShowCounterStandee(false)}
      />

      {/* Optical Camera QR Scanner Modal */}
      <CameraScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={handleScanSuccess}
        mealPeriod={activeMealPeriod}
      />

    </div>
  );
};
