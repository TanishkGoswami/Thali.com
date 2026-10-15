import React, { useEffect, useState } from 'react';
import { ChefHat, RefreshCw, Users, UserX, CheckCircle2, Clock, Check } from 'lucide-react';
import type { DailyHeadcount, MealPeriod, MealSkip } from '../types';
import { MEAL_CUTOFF_CONFIG, isMealCutoffPassed, getLocalDateString } from '../types';
import { api } from '../services/api';

export const KitchenHeadcountCard: React.FC = () => {
  const [dateOffset, setDateOffset] = useState<0 | 1>(0); // 0 = Today, 1 = Tomorrow
  const [headcount, setHeadcount] = useState<DailyHeadcount | null>(null);
  const [skippedMembers, setSkippedMembers] = useState<(MealSkip & { member_name?: string; member_number?: string })[]>([]);
  const [tomorrowSkipsCount, setTomorrowSkipsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Compute local dates reliably without UTC offset shifts
  const todayObj = new Date();
  const tomorrowObj = new Date(todayObj);
  tomorrowObj.setDate(todayObj.getDate() + 1);

  const todayStr = getLocalDateString(todayObj);
  const tomorrowStr = getLocalDateString(tomorrowObj);
  const targetDateStr = dateOffset === 0 ? todayStr : tomorrowStr;

  const todayFormatted = todayObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const tomorrowFormatted = tomorrowObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const loadHeadcount = async () => {
    setLoading(true);
    try {
      const [data, skips, tmrwSkips] = await Promise.all([
        api.getDailyHeadcount(targetDateStr),
        api.getDailySkippedMembers(targetDateStr),
        api.getDailySkippedMembers(tomorrowStr)
      ]);
      setHeadcount(data);
      setSkippedMembers(skips);
      setTomorrowSkipsCount(tmrwSkips.length);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2500);
    } catch (e) {
      console.error('Error loading kitchen headcount:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeadcount();
  }, [dateOffset]);

  const periods: { period: MealPeriod; title: string; icon: string; accentColor: string; bgAccent: string }[] = [
    { period: 'breakfast', title: 'Breakfast', icon: '🌅', accentColor: '#059669', bgAccent: '#ecfdf5' },
    { period: 'lunch', title: 'Lunch', icon: '☀️', accentColor: '#2563eb', bgAccent: '#eff6ff' },
    { period: 'dinner', title: 'Dinner', icon: '🌙', accentColor: '#7c3aed', bgAccent: '#f5f3ff' }
  ];

  return (
    <div className="card" style={{ padding: '16px 14px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)' }}>
      {/* App-Style Header: Title on Left, Refresh on Right in ONE Compact Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-hairline)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-primary-bg)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ChefHat size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span className="eyebrow" style={{ color: 'var(--color-primary)', fontSize: '10px', display: 'block', lineHeight: 1 }}>
              Kitchen Intelligence
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)', marginTop: '2px', lineHeight: 1.2 }}>
              Kitchen Headcount
            </h3>
          </div>
        </div>

        {/* Top-Right Compact Refresh Button */}
        <button
          type="button"
          disabled={loading}
          onClick={loadHeadcount}
          className="btn btn-secondary btn-pill"
          style={{
            fontSize: '11px',
            padding: '5px 10px',
            gap: '4px',
            flexShrink: 0,
            backgroundColor: refreshSuccess ? 'var(--color-success-bg)' : '#ffffff',
            borderColor: refreshSuccess ? 'var(--color-success-border)' : 'var(--color-hairline)',
            color: refreshSuccess ? 'var(--color-success)' : 'var(--color-ink)'
          }}
          title="Refresh headcount data"
        >
          {refreshSuccess ? <Check size={12} /> : <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />}
          <span>{loading ? '...' : refreshSuccess ? 'Synced' : 'Refresh'}</span>
        </button>
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
        {/* Today Tab */}
        <button
          type="button"
          onClick={() => setDateOffset(0)}
          className="btn btn-pill"
          style={{
            width: '100%',
            backgroundColor: dateOffset === 0 ? '#ffffff' : 'transparent',
            color: dateOffset === 0 ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: dateOffset === 0 ? 'var(--shadow-level-1)' : 'none',
            fontSize: '12px',
            fontWeight: dateOffset === 0 ? 600 : 500,
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
          <span style={{ fontSize: '10px', opacity: dateOffset === 0 ? 0.8 : 0.6 }}>{todayFormatted}</span>
        </button>

        {/* Tomorrow Tab */}
        <button
          type="button"
          onClick={() => setDateOffset(1)}
          className="btn btn-pill"
          style={{
            width: '100%',
            backgroundColor: dateOffset === 1 ? '#ffffff' : 'transparent',
            color: dateOffset === 1 ? 'var(--color-ink)' : 'var(--color-ink-mute)',
            boxShadow: dateOffset === 1 ? 'var(--shadow-level-1)' : 'none',
            fontSize: '12px',
            fontWeight: dateOffset === 1 ? 600 : 500,
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
            {tomorrowSkipsCount > 0 && (
              <span style={{
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-pill)',
                padding: '0px 5px',
                fontSize: '9px',
                fontWeight: 700
              }}>
                {tomorrowSkipsCount} Skips
              </span>
            )}
          </div>
          <span style={{ fontSize: '10px', opacity: dateOffset === 1 ? 0.8 : 0.6 }}>{tomorrowFormatted}</span>
        </button>
      </div>

      {/* Target Date Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: 'var(--color-ink-mute)',
        marginBottom: '12px',
        padding: '0 2px'
      }}>
        <span>Target: <strong style={{ color: 'var(--color-ink)' }}>{dateOffset === 0 ? `Today (${todayFormatted})` : `Tomorrow (${tomorrowFormatted})`}</strong></span>
        <span>{dateOffset === 0 ? 'Live service today' : 'Advance kitchen prep'}</span>
      </div>

      {/* 3 Meal Sessions: Compact, App-Style Stack on Mobile / Responsive Grid on Desktop */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {periods.map(({ period, title, icon, accentColor, bgAccent }) => {
          const stats = headcount ? headcount[period] : { enrolled: 0, skipped: 0, consumed: 0 };
          const expectedToCook = Math.max(0, (stats?.enrolled ?? 0) - (stats?.skipped ?? 0));
          const cutoff = MEAL_CUTOFF_CONFIG[period];
          const isPassed = isMealCutoffPassed(targetDateStr, period);

          return (
            <div
              key={period}
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-hairline)',
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Left Accent Color Indicator Bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '4px',
                backgroundColor: accentColor
              }} />

              {/* Session Top Row: Meal Title & Cutoff Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>{icon}</span>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {title}
                  </h4>
                </div>

                <span className="badge" style={{
                  fontSize: '10px',
                  padding: '2px 7px',
                  backgroundColor: isPassed ? 'rgba(107, 114, 128, 0.08)' : 'rgba(5, 150, 105, 0.1)',
                  color: isPassed ? '#6b7280' : '#059669',
                  border: '1px solid currentColor'
                }}>
                  {isPassed ? '● Slot Locked' : '● Cutoff Open'}
                </span>
              </div>

              {/* Main Metric Row: Plates to Cook on Left + 3 Micro-Metrics on Right */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: bgAccent,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                gap: '8px'
              }}>
                {/* Big Metric: Expected Plates to Cook */}
                <div>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-mute)', fontWeight: 700 }}>
                    PLATES TO COOK
                  </div>
                  <div className="tnum" style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: accentColor,
                    lineHeight: 1.1,
                    marginTop: '2px'
                  }}>
                    {expectedToCook}
                  </div>
                </div>

                {/* 3 Metric Pills */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {/* Enrolled */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px',
                    textAlign: 'center',
                    minWidth: '52px'
                  }}>
                    <div style={{ fontSize: '9px', color: 'var(--color-ink-mute)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <Users size={9} /> Total
                    </div>
                    <div className="tnum" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {stats?.enrolled ?? 0}
                    </div>
                  </div>

                  {/* Skipped */}
                  <div style={{
                    backgroundColor: (stats?.skipped ?? 0) > 0 ? '#fef3c7' : '#ffffff',
                    border: `1px solid ${(stats?.skipped ?? 0) > 0 ? '#fde68a' : 'var(--color-hairline)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px',
                    textAlign: 'center',
                    minWidth: '52px'
                  }}>
                    <div style={{ fontSize: '9px', color: (stats?.skipped ?? 0) > 0 ? '#b45309' : 'var(--color-ink-mute)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <UserX size={9} /> Skips
                    </div>
                    <div className="tnum" style={{ fontSize: '13px', fontWeight: 700, color: (stats?.skipped ?? 0) > 0 ? '#b45309' : 'var(--color-ink)' }}>
                      {stats?.skipped ?? 0}
                    </div>
                  </div>

                  {/* Eaten */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px',
                    textAlign: 'center',
                    minWidth: '52px'
                  }}>
                    <div style={{ fontSize: '9px', color: 'var(--color-ink-mute)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <CheckCircle2 size={9} /> Eaten
                    </div>
                    <div className="tnum" style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                      {stats?.consumed ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cutoff Deadline Footer */}
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'var(--color-ink-mute)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} />
                  <span>Cut-off:</span>
                  <strong style={{ color: 'var(--color-ink)' }}>{cutoff.timeStr}</strong>
                </div>
                <span>{dateOffset === 0 ? 'Today' : 'Tomorrow'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Member Skips Audit Table / List */}
      <div style={{
        marginTop: '14px',
        padding: '12px 14px',
        backgroundColor: 'var(--color-canvas-soft)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-hairline)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserX size={15} color="#b45309" />
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
              Skipped Members ({dateOffset === 0 ? 'Today' : 'Tomorrow'})
            </h4>
          </div>

          <span className="badge" style={{
            backgroundColor: skippedMembers.length > 0 ? '#fef3c7' : '#e5e7eb',
            color: skippedMembers.length > 0 ? '#b45309' : '#6b7280',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 7px'
          }}>
            {skippedMembers.length} {skippedMembers.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {skippedMembers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {skippedMembers.map((s) => {
              const isBreakfast = s.meal_period === 'breakfast';
              const isLunch = s.meal_period === 'lunch';
              const periodIcon = isBreakfast ? '🌅' : isLunch ? '☀️' : '🌙';
              const periodBadgeClass = isBreakfast ? 'badge-active' : isLunch ? 'badge-indigo' : 'badge-primary';

              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #fed7aa',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span
                      className="tnum badge badge-indigo"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: '10px',
                        padding: '2px 6px',
                        flexShrink: 0
                      }}
                    >
                      #{s.member_number || 'N/A'}
                    </span>
                    <strong style={{ fontSize: '13px', color: 'var(--color-ink)', wordBreak: 'break-word' }}>
                      {s.member_name}
                    </strong>
                  </div>

                  <span className={`badge ${periodBadgeClass}`} style={{ fontSize: '10px', padding: '2px 6px', textTransform: 'capitalize', flexShrink: 0 }}>
                    {periodIcon} {s.meal_period}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '12px 8px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--color-hairline)',
            color: 'var(--color-ink-mute)',
            fontSize: '11px'
          }}>
            ✓ No leaves marked for {dateOffset === 0 ? 'today' : 'tomorrow'}. 100% attendance expected.
          </div>
        )}
      </div>
    </div>
  );
};
