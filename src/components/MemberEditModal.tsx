import React, { useState } from 'react';
import { X, Save, Plus, Minus } from 'lucide-react';

import type { Profile } from '../types';
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
  
  // Balance adjustment state
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      if (fullName !== member.full_name || phone !== (member.phone || '') || status !== member.status) {
        const ok = await api.updateMemberProfile(member.id, {
          full_name: fullName,
          phone,
          status
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

        // We need the subscription ID. In our schema, we can look it up or let adjustMemberBalance handle it
        // Let's fetch active subscription or query it
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
          // If no active subscription, look for any subscription
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(28, 27, 26, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 140,
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        backgroundColor: '#ffffff',
        boxShadow: 'var(--shadow-modal)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="eyebrow" style={{ color: 'var(--color-clay)' }}>Member Record</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: 'var(--color-canvas)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid var(--color-hairline)'
              }}>
                {member.member_number}
              </span>
            </div>
            <h3 style={{ fontSize: '24px', marginTop: '2px' }}>Edit & Adjust Member</h3>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-pill" style={{ padding: '8px' }}>
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fff4f2',
            border: '1px solid #f1cfc4',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            fontSize: '13px'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Profile Details */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-stone)', display: 'block', marginBottom: '4px' }}>
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
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-stone)', display: 'block', marginBottom: '4px' }}>
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
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-stone)', display: 'block', marginBottom: '4px' }}>
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

          {/* Meal Balance Adjustment Section */}
          <div style={{
            backgroundColor: 'var(--color-canvas)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-hairline)',
            marginTop: '4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                Meal Balance Adjustment
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-ash)' }}>
                Current: <strong style={{ color: 'var(--color-ink)' }}>{currentBalance} meals</strong>
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setAdjustDelta(prev => prev + 1)}
                className="btn btn-outline btn-pill"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <Plus size={12} /> +1 Meal
              </button>
              <button
                type="button"
                onClick={() => setAdjustDelta(prev => prev + 5)}
                className="btn btn-outline btn-pill"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <Plus size={12} /> +5 Meals
              </button>
              <button
                type="button"
                onClick={() => setAdjustDelta(prev => prev - 1)}
                className="btn btn-outline btn-pill"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <Minus size={12} /> -1 Meal
              </button>
              {adjustDelta !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAdjustDelta(0);
                    setAdjustReason('');
                  }}
                  className="btn btn-outline btn-pill"
                  style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--color-error)' }}
                >
                  Reset
                </button>
              )}
            </div>

            {adjustDelta !== 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Simulated New Balance:</span>
                  <strong style={{ color: simulatedNewBalance < 0 ? 'var(--color-error)' : 'var(--color-forest)', fontSize: '15px' }}>
                    {simulatedNewBalance} meals ({adjustDelta > 0 ? `+${adjustDelta}` : adjustDelta})
                  </strong>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Audit Reason (e.g. Rollover from cash register, Guest lunch)"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '12px' }}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Save size={16} /> {isSubmitting ? 'Saving...' : 'Save & Update'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
