import React, { useState } from 'react';
import { X, Save, Plus, Minus, Trash2 } from 'lucide-react';
import type { Profile, MealPlanType } from '../types';
import { MEAL_PLAN_CONFIG } from '../types';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';

interface MemberEditModalProps {
  member: Profile & { remaining_meals?: number; subscription_status?: string };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MemberEditModal: React.FC<MemberEditModalProps> = ({
  member,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [fullName, setFullName] = useState(member.full_name);
  const [phone, setPhone] = useState(member.phone || '');
  const [status, setStatus] = useState(member.status);
  const [mealPlanType, setMealPlanType] = useState<MealPlanType>(member.meal_plan_type || 'lunch_dinner');
  
  // Balance adjustment state
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentBalance = member.remaining_meals ?? 0;
  const simulatedNewBalance = currentBalance + adjustDelta;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Update Profile fields if changed
      if (
        fullName !== member.full_name ||
        phone !== (member.phone || '') ||
        status !== member.status ||
        mealPlanType !== member.meal_plan_type
      ) {
        const ok = await api.updateMemberProfile(member.id, {
          full_name: fullName,
          phone,
          status,
          meal_plan_type: mealPlanType
        });
        if (!ok) throw new Error('Could not update profile details');
      }

      // 2. Apply balance adjustment if delta !== 0
      if (adjustDelta !== 0) {
        if (!adjustReason.trim()) {
          setErrorMsg('Please specify an audit reason for adjusting the meal balance.');
          setIsSubmitting(false);
          return;
        }

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('member_id', member.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (sub?.id) {
          await api.adjustMemberBalance(member.id, sub.id, adjustDelta, adjustReason);
        } else {
          const { data: anySub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('member_id', member.id)
            .limit(1)
            .single();

          if (anySub?.id) {
            await api.adjustMemberBalance(member.id, anySub.id, adjustDelta, adjustReason);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving member changes:', err);
      setErrorMsg(err.message || 'Failed to update member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${member.full_name} (${member.member_number})?\n\nThis will remove their profile and release phone number (${member.phone || 'N/A'}) for future registrations.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const res = await api.deleteMember(member.id);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || 'Failed to delete member.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred while deleting member.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 37, 61, 0.45)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 140,
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '22px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-modal)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="eyebrow">Member Record</span>
              <span className="tnum" style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'var(--color-canvas-soft)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid var(--color-hairline)'
              }}>
                {member.member_number}
              </span>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px' }}>Edit & Adjust Member</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-pill"
            style={{ padding: '6px', border: 'none', color: 'var(--color-ink-mute)' }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
            fontSize: '13px'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Profile Details */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '4px' }}>
              Full Name:
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '4px' }}>
                Phone Number:
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10 digit mobile"
                className="form-input"
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '4px' }}>
                Account Status:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="form-input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived / Left</option>
              </select>
            </div>
          </div>

          {/* 2-Meal Subscription Plan Selector */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '6px' }}>
              Subscribed 2-Meal Slot:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {(Object.keys(MEAL_PLAN_CONFIG) as MealPlanType[]).map((key) => {
                const plan = MEAL_PLAN_CONFIG[key];
                const isSelected = mealPlanType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMealPlanType(key)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
                      backgroundColor: isSelected ? '#f5f3ff' : 'var(--color-canvas-soft)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{
                      fontWeight: 600,
                      fontSize: '11px',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-ink)'
                    }}>
                      {plan.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
                      {plan.timeSlotsText}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meal Balance Adjustment Section */}
          <div style={{
            backgroundColor: 'var(--color-canvas-soft)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-hairline)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>
                Meal Balance Adjustment
              </span>
              <span className="tnum" style={{ fontSize: '12px', color: 'var(--color-ink-mute)' }}>
                Current: <strong style={{ color: 'var(--color-ink)' }}>{currentBalance} meals</strong>
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setAdjustDelta(prev => prev + 1)}
                className="btn btn-secondary btn-pill"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                <Plus size={11} /> +1 Meal
              </button>
              <button
                type="button"
                onClick={() => setAdjustDelta(prev => prev + 5)}
                className="btn btn-secondary btn-pill"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                <Plus size={11} /> +5 Meals
              </button>
              <button
                type="button"
                onClick={() => setAdjustDelta(prev => prev - 1)}
                className="btn btn-secondary btn-pill"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                <Minus size={11} /> -1 Meal
              </button>
              {adjustDelta !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAdjustDelta(0);
                    setAdjustReason('');
                  }}
                  className="btn btn-outline btn-pill"
                  style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--color-error)' }}
                >
                  Reset
                </button>
              )}
            </div>

            {adjustDelta !== 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Simulated New Balance:</span>
                  <strong className="tnum" style={{ color: simulatedNewBalance < 0 ? 'var(--color-error)' : 'var(--color-success)', fontSize: '14px' }}>
                    {simulatedNewBalance} meals ({adjustDelta > 0 ? `+${adjustDelta}` : adjustDelta})
                  </strong>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Audit Reason (e.g. Cash rollover, guest pass adjustment)"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '12px' }}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={isDeleting || isSubmitting}
              onClick={handleDelete}
              className="btn btn-outline btn-pill"
              style={{
                color: 'var(--color-error)',
                borderColor: 'var(--color-error-border)',
                gap: '5px',
                fontSize: '12px'
              }}
            >
              <Trash2 size={13} /> {isDeleting ? 'Deleting...' : 'Delete Member'}
            </button>

            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-pill"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="btn btn-primary"
                style={{ gap: '6px' }}
              >
                <Save size={14} /> {isSubmitting ? 'Saving...' : 'Save & Update'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
