import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Lock, Undo2 } from 'lucide-react';
import type { MealPeriod, MealSkip, MealPlanType } from '../types';
import { MEAL_CUTOFF_CONFIG, isMealCutoffPassed, MEAL_PLAN_CONFIG, getLocalDateString } from '../types';
import { api } from '../services/api';

interface MealSkipCardProps {
  memberId: string;
  mealPlanType?: MealPlanType;
  skips: MealSkip[];
  onRefreshSkips: () => void;
}

export const MealSkipCard: React.FC<MealSkipCardProps> = ({
  memberId,
  mealPlanType = 'lunch_dinner',
  skips,
  onRefreshSkips
}) => {
  const [selectedDateOffset, setSelectedDateOffset] = useState<0 | 1>(0); // 0 = Today, 1 = Tomorrow
  const [loadingPeriod, setLoadingPeriod] = useState<MealPeriod | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Compute Target Dates (YYYY-MM-DD in local time) reliably without UTC offset shifts
  const today = new Date();
  const targetDateObj = new Date(today);
  targetDateObj.setDate(today.getDate() + selectedDateOffset);
  const targetDateStr = getLocalDateString(targetDateObj);

  const tomorrowObj = new Date(today);
  tomorrowObj.setDate(today.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrowObj);
  const tomorrowSkipsForMember = skips.filter(s => s.service_date === tomorrowStr);

  const formattedDateTitle = selectedDateOffset === 0
    ? `Today (${today.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })})`
    : `Tomorrow (${targetDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })})`;

  const planConfig = MEAL_PLAN_CONFIG[mealPlanType];


  const isPeriodInPlan = (period: MealPeriod): boolean => {
    if (mealPlanType === 'any_two') return true;
    if (Array.isArray(planConfig.allowedPeriods)) {
      return planConfig.allowedPeriods.includes(period);
    }
    return true;
  };

  const handleToggleSkip = async (period: MealPeriod, currentSkipped: boolean) => {
    setLoadingPeriod(period);
    setFeedbackMsg(null);

    try {
      const res = await api.toggleMealSkip({
        memberId,
        serviceDate: targetDateStr,
        mealPeriod: period,
        skip: !currentSkipped,
        reason: !currentSkipped ? 'Marked Not Coming via Mobile App' : undefined
      });

      if (res.success) {
        setFeedbackMsg({ text: res.message || 'Updated successfully', type: 'success' });
        onRefreshSkips();
      } else {
        setFeedbackMsg({ text: res.message || 'Could not update skip status.', type: 'error' });
      }
    } catch (err: any) {
      console.error('Error toggling meal skip:', err);
      setFeedbackMsg({ text: err?.message || 'Network error.', type: 'error' });
    } finally {
      setLoadingPeriod(null);
    }
  };

  const periods: { period: MealPeriod; title: string; icon: string }[] = [
    { period: 'breakfast', title: 'Breakfast', icon: '🌅' },
    { period: 'lunch', title: 'Lunch', icon: '☀️' },
    { period: 'dinner', title: 'Dinner', icon: '🌙' }
  ];

  return (
    <div className="card" style={{ padding: '16px 14px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)' }}>
      {/* Header with Title */}
      <div style={{
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-hairline)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="eyebrow" style={{ color: 'var(--color-primary)' }}>Kitchen Headcount & Leave</span>
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)', marginTop: '2px' }}>
          Going Out? Skip a Meal
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
          Planning for: <strong style={{ color: 'var(--color-ink)' }}>{formattedDateTitle}</strong>. Mark before cutoff to help kitchen cook exact plates.
        </p>
      </div>

      {/* 100% Full-Width Segmented Day Switcher (Mobile Native App Style: Zero Overflow) */}
      <div style={{
        marginTop: '12px',
        marginBottom: '14px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px',
        backgroundColor: 'var(--color-canvas-soft)',
        padding: '3px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--color-hairline)'
      }}>
        <button
          type="button"
          onClick={() => { setSelectedDateOffset(0); setFeedbackMsg(null); }}
          className="btn btn-pill"
          style={{
            width: '100%',
            backgroundColor: selectedDateOffset === 0 ? '#ffffff' : 'transparent',
            color: selectedDateOffset === 0 ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: selectedDateOffset === 0 ? 'var(--shadow-level-1)' : 'none',
            fontSize: '12px',
            fontWeight: selectedDateOffset === 0 ? 600 : 500,
            padding: '7px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1px',
            lineHeight: 1.1
          }}
        >
          <span>Today</span>
          <span style={{ fontSize: '10px', opacity: selectedDateOffset === 0 ? 0.8 : 0.6 }}>
            {today.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setSelectedDateOffset(1); setFeedbackMsg(null); }}
          className="btn btn-pill"
          style={{
            width: '100%',
            backgroundColor: selectedDateOffset === 1 ? '#ffffff' : 'transparent',
            color: selectedDateOffset === 1 ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: selectedDateOffset === 1 ? 'var(--shadow-level-1)' : 'none',
            fontSize: '12px',
            fontWeight: selectedDateOffset === 1 ? 600 : 500,
            padding: '7px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1px',
            lineHeight: 1.1
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>Tomorrow</span>
            {tomorrowSkipsForMember.length > 0 && (
              <span style={{
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-pill)',
                padding: '0px 5px',
                fontSize: '9px',
                fontWeight: 700
              }}>
                🚫 {tomorrowSkipsForMember.length} Skipped
              </span>
            )}
          </div>
          <span style={{ fontSize: '10px', opacity: selectedDateOffset === 1 ? 0.8 : 0.6 }}>
            {tomorrowObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </button>
      </div>


      {/* Feedback Banner */}
      {feedbackMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          backgroundColor: feedbackMsg.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
          border: `1px solid ${feedbackMsg.type === 'success' ? 'var(--color-success-border)' : 'var(--color-error-border)'}`,
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          color: feedbackMsg.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
          marginBottom: '14px'
        }}>
          {feedbackMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 3 Meals Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {periods.map(({ period, title, icon }) => {
          const inPlan = isPeriodInPlan(period);
          const cutoff = MEAL_CUTOFF_CONFIG[period];
          const cutoffPassed = isMealCutoffPassed(targetDateStr, period);
          const isSkipped = skips.some(s => s.service_date === targetDateStr && s.meal_period === period);
          const isLoading = loadingPeriod === period;

          return (
            <div
              key={period}
              style={{
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isSkipped ? '#fed7aa' : 'var(--color-hairline)'}`,
                backgroundColor: isSkipped ? '#fffbeb' : '#ffffff',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all var(--transition-fast)',
                boxShadow: isSkipped ? '0 2px 8px rgba(245, 158, 11, 0.12)' : 'var(--shadow-level-1)'
              }}
            >
              <div>
                {/* Card Title & Icon */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {title}
                    </h4>
                  </div>

                  {/* Status Badge */}
                  {!inPlan ? (
                    <span className="badge" style={{ fontSize: '10px', backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                      Not in Plan
                    </span>
                  ) : isSkipped ? (
                    <span className="badge badge-warning" style={{ fontSize: '10px', fontWeight: 600 }}>
                      🚫 Not Coming
                    </span>
                  ) : (
                    <span className="badge badge-active" style={{ fontSize: '10px' }}>
                      ● Eating / Coming
                    </span>
                  )}
                </div>

                {/* Cut-off info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  color: cutoffPassed ? '#b45309' : 'var(--color-ink-mute)',
                  marginTop: '10px',
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: cutoffPassed ? 'rgba(245, 158, 11, 0.1)' : 'var(--color-canvas-soft)'
                }}>
                  {cutoffPassed ? <Lock size={12} color="#b45309" /> : <Clock size={12} />}
                  <span>
                    Cut-off: <strong>{cutoff.timeStr}</strong> {cutoffPassed ? '(Locked)' : ''}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--color-hairline)' }}>
                {!inPlan ? (
                  <div style={{ fontSize: '11px', color: 'var(--color-ink-mute-2)', textAlign: 'center' }}>
                    Slot outside your 2-meal pass
                  </div>
                ) : cutoffPassed ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: '#9ca3af',
                    padding: '6px'
                  }}>
                    <Lock size={12} />
                    <span>Cut-off passed ({cutoff.timeStr})</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleToggleSkip(period, isSkipped)}
                    className="btn btn-pill"
                    style={{
                      width: '100%',
                      fontSize: '12px',
                      padding: '7px 12px',
                      justifyContent: 'center',
                      gap: '6px',
                      fontWeight: 600,
                      backgroundColor: isSkipped ? '#ffffff' : '#fff7ed',
                      borderColor: isSkipped ? 'var(--color-hairline)' : '#fed7aa',
                      color: isSkipped ? 'var(--color-success)' : '#c2410c'
                    }}
                  >
                    {isSkipped ? (
                      <>
                        <Undo2 size={13} /> Cancel Skip (I'm Coming)
                      </>
                    ) : (
                      <>
                        <XCircle size={13} /> Mark Not Coming
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
