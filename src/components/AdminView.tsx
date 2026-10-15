import React, { useState } from 'react';
import { Users, CreditCard, Utensils, Plus, Search, Edit3, FileSpreadsheet, X, QrCode, Trash2, Camera, Printer, CheckCircle2, ChefHat, RefreshCw } from 'lucide-react';

import type { Profile, DailyMenu, MealPeriod } from '../types';
import { MEAL_PLAN_CONFIG } from '../types';
import { api } from '../services/api';
import { CsvImporter } from './CsvImporter';
import { MemberEditModal } from './MemberEditModal';
import { MenuEditorModal } from './MenuEditorModal';
import { CounterQrModal } from './CounterQrModal';
import { CameraScannerModal } from './CameraScannerModal';
import { AdminPaymentApprovalModal } from './AdminPaymentApprovalModal';
import { KitchenHeadcountCard } from './KitchenHeadcountCard';

interface AdminViewProps {
  members: (Profile & { remaining_meals?: number; subscription_status?: string; payment_method?: 'cash' | 'upi_direct' })[];
  menus: DailyMenu[];
  onRefresh: () => void;
  activeMealPeriod?: MealPeriod;
}

export const AdminView: React.FC<AdminViewProps> = ({
  members,
  menus,
  onRefresh,
  activeMealPeriod = 'lunch'
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'headcount' | 'payments' | 'menu' | 'import'>('members');
  const [searchMember, setSearchMember] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'low'>('all');
  
  // Modals state
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<(Profile & { remaining_meals?: number; subscription_status?: string }) | null>(null);
  const [selectedMemberForApproval, setSelectedMemberForApproval] = useState<(Profile & { remaining_meals?: number; subscription_status?: string; payment_method?: 'cash' | 'upi_direct' }) | null>(null);
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [menuEditorPeriod, setMenuEditorPeriod] = useState<MealPeriod>('lunch');
  const [showCounterStandee, setShowCounterStandee] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(false);

  const handleAdminRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      setRefreshToast(true);
      setTimeout(() => setRefreshToast(false), 2500);
    } catch (e) {
      console.error('Admin refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

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

      {/* Prominent Mess Counter Standee Banner Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0d253d 0%, #163659 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: 'var(--shadow-level-2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#93c5fd',
            flexShrink: 0
          }}>
            <QrCode size={24} />
          </div>
          <div>
            <h3 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600 }}>
              Official Mess Counter Standee QR
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginTop: '2px' }}>
              Print this QR code to stick at your mess dining counter so students can scan and deduct their meal.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleAdminRefresh}
            className="btn btn-pill"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              color: '#ffffff',
              fontWeight: 500,
              padding: '10px 16px',
              fontSize: '13px',
              gap: '6px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer'
            }}
            title="Refresh all member records, live headcounts and pending queues"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : refreshToast ? '✓ Synced!' : 'Refresh Data'}
          </button>

          <button
            type="button"
            onClick={() => setShowCounterStandee(true)}
            className="btn"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              fontWeight: 600,
              padding: '10px 18px',
              fontSize: '13px',
              borderRadius: 'var(--radius-pill)',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(83, 58, 253, 0.35)'
            }}
          >
            <Printer size={15} /> Open & Print Standee QR
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
          onClick={() => setActiveTab('headcount')}
          className="btn btn-pill"
          style={{
            backgroundColor: activeTab === 'headcount' ? '#ffffff' : 'transparent',
            color: activeTab === 'headcount' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: activeTab === 'headcount' ? 'var(--shadow-level-1)' : 'none',
            fontSize: '12px',
            fontWeight: activeTab === 'headcount' ? 500 : 400
          }}
        >
          <ChefHat size={13} /> Kitchen Headcount
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

      {/* Tab: Kitchen Headcount */}
      {activeTab === 'headcount' && (
        <KitchenHeadcountCard />
      )}

      {/* Tab 1: Members Directory Quick Headcount Notice */}
      {activeTab === 'members' && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChefHat size={18} color="#2563eb" />
            <div>
              <strong style={{ fontSize: '13px', color: '#1e40af' }}>Kitchen Headcount & Leave Tracker:</strong>
              <span style={{ fontSize: '12px', color: '#3b82f6', marginLeft: '6px' }}>
                Check how many students will eat Breakfast, Lunch, or Dinner today & tomorrow.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('headcount')}
            className="btn btn-pill"
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 12px'
            }}
          >
            Open Kitchen Counts →
          </button>
        </div>
      )}

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

          {/* Desktop Table View (visible on screens >= 769px) */}
          <div className="table-responsive table-desktop-view">
            <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-hairline)', color: 'var(--color-ink-mute)' }}>
                  <th style={{ width: '16%', minWidth: '100px', maxWidth: '120px', padding: '10px 12px', fontWeight: 500 }}>Member #</th>
                  <th style={{ width: '22%', minWidth: '130px', maxWidth: '170px', padding: '10px 12px', fontWeight: 500 }}>Full Name</th>
                  <th style={{ width: '15%', minWidth: '110px', padding: '10px 12px', fontWeight: 500 }}>Phone</th>
                  <th style={{ width: '12%', minWidth: '90px', padding: '10px 12px', fontWeight: 500 }}>Meals Left</th>
                  <th style={{ width: '17%', minWidth: '130px', padding: '10px 12px', fontWeight: 500 }}>Status</th>
                  <th style={{ width: '18%', minWidth: '185px', padding: '10px 12px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid var(--color-hairline)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-canvas-soft)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <span
                        className="tnum truncate-text"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color: 'var(--color-ink)',
                          display: 'block',
                          maxWidth: '120px'
                        }}
                        title={m.member_number}
                      >
                        {m.member_number}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <span
                        className="truncate-text"
                        style={{
                          fontWeight: 500,
                          color: 'var(--color-ink)',
                          display: 'block',
                          maxWidth: '160px'
                        }}
                        title={m.full_name}
                      >
                        {m.full_name}
                      </span>
                    </td>
                    <td className="tnum" style={{ padding: '10px 12px', color: 'var(--color-ink-mute)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {m.phone ? `+91 ${m.phone}` : '—'}
                    </td>
                    <td className="tnum" style={{ padding: '10px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: (m.remaining_meals ?? 0) <= 5 ? 'var(--color-error)' : 'var(--color-ink)' }}>
                        {m.remaining_meals ?? 0}
                      </strong> <span style={{ color: 'var(--color-ink-mute-2)', fontSize: '11px' }}>/ 54</span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                        {m.subscription_status === 'pending' ? (
                          <span className="badge badge-pending" style={{ fontSize: '10px', padding: '2px 8px' }}>
                            Payment Pending
                          </span>
                        ) : !m.phone_verified ? (
                          <span className="badge badge-indigo" style={{ fontSize: '10px', padding: '2px 8px' }}>
                            {m.payment_method === 'cash' ? '💵 Cash' : '📱 Online'} • OTP Pending
                          </span>
                        ) : (
                          <span className="badge badge-active" style={{ fontSize: '10px', padding: '2px 8px' }}>
                            ● Active ({m.payment_method === 'cash' ? 'Cash' : 'Online'})
                          </span>
                        )}
                        {m.meal_plan_type && MEAL_PLAN_CONFIG[m.meal_plan_type] && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 500,
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-pill)',
                              ...MEAL_PLAN_CONFIG[m.meal_plan_type].badgeStyle
                            }}
                            title={MEAL_PLAN_CONFIG[m.meal_plan_type].name}
                          >
                            🍱 {MEAL_PLAN_CONFIG[m.meal_plan_type].shortLabel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {m.subscription_status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => setSelectedMemberForApproval(m)}
                            className="btn btn-primary btn-pill"
                            style={{ fontSize: '11px', padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Approve payment (Cash or Online) & activate pass"
                          >
                            <CheckCircle2 size={12} /> Mark Paid
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedMemberForEdit(m)}
                          className="btn btn-secondary btn-pill"
                          style={{ fontSize: '11px', padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
                            padding: '3px 9px',
                            color: 'var(--color-error)',
                            borderColor: 'var(--color-error-border)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
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

          {/* Mobile Card-Based List View (visible on screens <= 768px) */}
          <div className="cards-mobile-view">
            {filtered.map(m => (
              <div
                key={m.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px',
                  boxShadow: 'var(--shadow-level-1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Mobile Card Row 1: Member #, Truncated Name, and Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                    <span
                      className="tnum badge badge-indigo"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        padding: '2px 8px',
                        fontWeight: 600,
                        flexShrink: 0
                      }}
                      title={m.member_number}
                    >
                      #{m.member_number}
                    </span>

                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                        whiteSpace: 'normal'
                      }}
                      title={m.full_name}
                    >
                      {m.full_name}
                    </span>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    {m.subscription_status === 'pending' ? (
                      <span className="badge badge-pending" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        Pending
                      </span>
                    ) : !m.phone_verified ? (
                      <span className="badge badge-indigo" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {m.payment_method === 'cash' ? '💵 Cash' : '📱 Online'} • OTP
                      </span>
                    ) : (
                      <span className="badge badge-active" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        ● Active ({m.payment_method === 'cash' ? 'Cash' : 'Online'})
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Card Row 2: Phone & Meals Remaining Quota */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  backgroundColor: 'var(--color-canvas-soft)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-ink-secondary)' }}>
                    <span style={{ color: 'var(--color-ink-mute)', fontSize: '11px' }}>Phone:</span>
                    <span className="tnum" style={{ fontWeight: 500, color: 'var(--color-ink)' }}>
                      {m.phone ? `+91 ${m.phone}` : '—'}
                    </span>
                  </div>

                  <div className="tnum" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: 'var(--color-ink-mute)', fontSize: '11px' }}>Meals:</span>
                    <strong style={{ color: (m.remaining_meals ?? 0) <= 5 ? 'var(--color-error)' : 'var(--color-ink)' }}>
                      {m.remaining_meals ?? 0}
                    </strong>
                    <span style={{ color: 'var(--color-ink-mute-2)', fontSize: '10px' }}>/ 54</span>
                  </div>
                </div>

                {/* Mobile Card Row 2.5: 2-Meal Plan Badge */}
                {m.meal_plan_type && MEAL_PLAN_CONFIG[m.meal_plan_type] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        ...MEAL_PLAN_CONFIG[m.meal_plan_type].badgeStyle
                      }}
                    >
                      🍱 {MEAL_PLAN_CONFIG[m.meal_plan_type].name} ({MEAL_PLAN_CONFIG[m.meal_plan_type].shortLabel})
                    </span>
                  </div>
                )}

                {/* Mobile Card Row 3: Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {m.subscription_status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => setSelectedMemberForApproval(m)}
                      className="btn btn-primary btn-pill"
                      style={{
                        flex: '1 1 100%',
                        fontSize: '12px',
                        padding: '6px 10px',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <CheckCircle2 size={13} /> Approve & Mark Paid (₹2,800)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedMemberForEdit(m)}
                    className="btn btn-secondary btn-pill"
                    style={{
                      flex: 1,
                      fontSize: '11px',
                      padding: '5px 8px',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Edit3 size={11} /> Edit Details
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === m.id}
                    onClick={() => handleDeleteMember(m)}
                    className="btn btn-outline btn-pill"
                    style={{
                      flex: 1,
                      fontSize: '11px',
                      padding: '5px 8px',
                      color: 'var(--color-error)',
                      borderColor: 'var(--color-error-border)',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={11} /> {deletingId === m.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty Search State */}
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: '24px', color: 'var(--color-ink-mute)', fontSize: '13px' }}>
              No members found matching "{searchMember}".
            </p>
          )}
        </div>
      )}

      {/* Tab 2: Payment Approvals */}
      {activeTab === 'payments' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-primary)' }}>Payment Verification Queue</span>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px', color: 'var(--color-ink)' }}>
                Pending Subscriptions ({members.filter(m => m.subscription_status === 'pending').length})
              </h2>
              <p style={{ color: 'var(--color-ink-mute)', fontSize: '12px', marginTop: '2px' }}>
                Subscriptions remain unusable until verified by an authorized mess owner. Choose Cash or Online to activate.
              </p>
            </div>
            {members.filter(m => m.subscription_status === 'pending').length > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '11px', fontWeight: 600 }}>
                Action Required
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {members.filter(m => m.subscription_status === 'pending').map(m => (
              <div
                key={m.id}
                className="pending-subscription-card"
              >
                <div className="pending-card-info">
                  {/* Top Row: Full Member # and Status Pill */}
                  <div className="pending-card-header-mobile">
                    <span
                      className="tnum badge badge-indigo"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: '11px',
                        padding: '2px 8px',
                        letterSpacing: '0.04em'
                      }}
                    >
                      #{m.member_number}
                    </span>
                    <span className="badge badge-pending" style={{ fontSize: '10px', fontWeight: 500 }}>
                      ⏳ Payment Pending
                    </span>
                  </div>

                  {/* Full Member Name (No 2-letter truncation!) */}
                  <div className="pending-card-name" style={{ marginTop: '4px' }}>
                    {m.full_name}
                  </div>

                  {/* Contact and Plan Info */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
                    {m.phone && (
                      <span className="tnum" style={{ color: 'var(--color-ink-secondary)', fontWeight: 500 }}>
                        📞 +91 {m.phone}
                      </span>
                    )}
                    {m.phone && <span>•</span>}
                    <span className="tnum" style={{ color: 'var(--color-ink-secondary)' }}>
                      Monthly Mess Thali (54 Meals) • <strong style={{ color: 'var(--color-ink)' }}>₹2,800</strong>
                    </span>
                  </div>

                  {/* 2-Meal Plan Badge */}
                  {m.meal_plan_type && MEAL_PLAN_CONFIG[m.meal_plan_type] && (
                    <div style={{ marginTop: '4px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          ...MEAL_PLAN_CONFIG[m.meal_plan_type].badgeStyle
                        }}
                      >
                        🍱 Plan: {MEAL_PLAN_CONFIG[m.meal_plan_type].name} ({MEAL_PLAN_CONFIG[m.meal_plan_type].shortLabel})
                      </span>
                    </div>
                  )}
                </div>

                {/* Primary Action Button: Full-width on mobile */}
                <button
                  type="button"
                  onClick={() => setSelectedMemberForApproval(m)}
                  className="btn btn-primary btn-pill pending-card-btn"
                >
                  <CheckCircle2 size={14} /> Approve & Mark Paid (₹2,800)
                </button>
              </div>
            ))}

            {members.filter(m => m.subscription_status === 'pending').length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '36px 20px',
                backgroundColor: 'var(--color-canvas-soft)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--color-hairline)'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success-bg)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px'
                }}>
                  <CheckCircle2 size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>All Payments Verified!</h4>
                <p style={{ color: 'var(--color-ink-mute)', fontSize: '12px', marginTop: '2px' }}>
                  No pending payments awaiting verification in the queue.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Daily Menus */}
      {activeTab === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="menus-header-row">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-primary)' }}>Kitchen Publishing</span>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px', color: 'var(--color-ink)' }}>
                Today's Dining Menus
              </h2>
              <p style={{ color: 'var(--color-ink-mute)', fontSize: '12px', marginTop: '2px' }}>
                Publish and edit dishes served for breakfast, lunch, and dinner.
              </p>
            </div>

            {/* Menu Creation Action Pills (Touch-scrollable on mobile) */}
            <div className="menu-action-pills scroll-pills-x">
              <button
                type="button"
                onClick={() => {
                  setMenuEditorPeriod('breakfast');
                  setShowMenuEditor(true);
                }}
                className="btn btn-secondary btn-pill"
                style={{ fontSize: '12px', padding: '6px 12px', gap: '5px' }}
              >
                <span>🌅</span> + Breakfast Menu
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuEditorPeriod('lunch');
                  setShowMenuEditor(true);
                }}
                className="btn btn-secondary btn-pill"
                style={{ fontSize: '12px', padding: '6px 12px', gap: '5px' }}
              >
                <span>☀️</span> + Lunch Menu
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuEditorPeriod('dinner');
                  setShowMenuEditor(true);
                }}
                className="btn btn-primary btn-pill"
                style={{ fontSize: '12px', padding: '6px 12px', gap: '5px' }}
              >
                <span>🌙</span> + Dinner Menu
              </button>
            </div>
          </div>

          {/* Menus Responsive Grid */}
          <div className="menu-card-container">
            {menus.map(menu => {
              const isBreakfast = menu.meal_period === 'breakfast';
              const isLunch = menu.meal_period === 'lunch';
              const periodIcon = isBreakfast ? '🌅' : isLunch ? '☀️' : '🌙';
              const periodTitle = isBreakfast ? 'Breakfast Menu' : isLunch ? 'Lunch Menu' : 'Dinner Menu';
              const accentColor = isBreakfast ? '#059669' : isLunch ? '#2563eb' : '#533afd';

              return (
                <div
                  key={menu.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '16px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    backgroundColor: accentColor
                  }} />

                  <div>
                    {/* Header: Title, published badge, Edit button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '18px' }}>{periodIcon}</span>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>
                          {periodTitle}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-active" style={{ fontSize: '10px', padding: '2px 7px' }}>
                          ● {menu.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuEditorPeriod(menu.meal_period);
                            setShowMenuEditor(true);
                          }}
                          className="btn btn-secondary btn-pill"
                          style={{ fontSize: '11px', padding: '3px 9px', gap: '4px' }}
                          title={`Edit ${menu.meal_period} menu`}
                        >
                          <Edit3 size={11} /> Edit
                        </button>
                      </div>
                    </div>

                    {/* Subtitle / Notes */}
                    <p style={{ color: 'var(--color-ink-mute)', fontSize: '12px', marginBottom: '12px', lineHeight: 1.4 }}>
                      <strong style={{ color: 'var(--color-ink)' }}>{menu.title}</strong>
                      {menu.notes && <span> — {menu.notes}</span>}
                    </p>

                    {/* Dish Items List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {menu.items && menu.items.length > 0 ? (
                        menu.items.map(item => (
                          <div
                            key={item.id}
                            className="dish-item-row"
                          >
                            <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>
                              {item.name}
                            </span>
                            <span className="dish-category-pill">
                              {item.category}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', fontStyle: 'italic', padding: '8px 0' }}>
                          No dishes added yet. Click Edit to add today's items.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* Admin Payment Approval & Member Activation Modal */}
      {selectedMemberForApproval && (
        <AdminPaymentApprovalModal
          isOpen={Boolean(selectedMemberForApproval)}
          onClose={() => setSelectedMemberForApproval(null)}
          member={selectedMemberForApproval}
          onSuccess={onRefresh}
        />
      )}

    </div>
  );
};
